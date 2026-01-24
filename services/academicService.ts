
import { Santri, PondokSettings, RaporRecord, NilaiMapel, RaporTemplate, GridCell } from '../types';
import { db } from '../db';

// --- HELPER: CONVERT EXCEL SYNTAX TO JS ---
const convertFormulaToJs = (expression: string): string => {
    let js = expression;
    // Replace $KEY with function call
    js = js.replace(/\$([a-zA-Z0-9_]+)\b/g, "getValue('$1', rowId)");
    
    // Functions mappings
    js = js.replace(/RATA2\(/g, 'average(');
    js = js.replace(/AVERAGE\(/g, 'average(');
    js = js.replace(/SUM\(/g, 'sum(');
    js = js.replace(/MIN\(/g, 'Math.min(');
    js = js.replace(/MAX\(/g, 'Math.max(');
    // Logic Functions
    js = js.replace(/IF\(/g, 'excelIf(');
    js = js.replace(/AND\(/g, 'excelAnd(');
    js = js.replace(/OR\(/g, 'excelOr(');
    
    // Prevent Rank crash in row context
    js = js.replace(/RANK\(/g, '0 * ('); 

    return js;
};

interface GeneratorConfig {
    rombelId: number; // 0 means ALL rombels in jenjang
    jenjangId?: number; // Required if rombelId is 0
    semester: 'Ganjil' | 'Genap';
    tahunAjaran: string;
    template: RaporTemplate;
    submissionMethod?: 'whatsapp' | 'google_sheet' | 'hybrid';
    googleScriptUrl?: string;
    waDestination?: string; 
}

interface RankConfig {
    targetKey: string;
    sourceKey: string;
    limit: number;
}

export const generateRaporFormHtml = (
    santriList: Santri[],
    settings: PondokSettings,
    config: GeneratorConfig
): string => {
    let targetSantri: Santri[] = [];
    let contextName = "";
    
    // Logic untuk Single Rombel vs Multi Rombel (1 Jenjang)
    if (config.rombelId > 0) {
        const rombel = settings.rombel.find(r => r.id === config.rombelId);
        if (!rombel) throw new Error("Rombel tidak ditemukan");
        targetSantri = santriList
            .filter(s => s.rombelId === config.rombelId && s.status === 'Aktif')
            .sort((a, b) => a.namaLengkap.localeCompare(b.namaLengkap));
        contextName = rombel.nama;
    } else if (config.jenjangId) {
        const jenjang = settings.jenjang.find(j => j.id === config.jenjangId);
        if (!jenjang) throw new Error("Jenjang tidak ditemukan");
        targetSantri = santriList
            .filter(s => s.jenjangId === config.jenjangId && s.status === 'Aktif')
            .sort((a, b) => {
                // Sort by Rombel Name first, then Student Name
                const rA = settings.rombel.find(r => r.id === a.rombelId)?.nama || '';
                const rB = settings.rombel.find(r => r.id === b.rombelId)?.nama || '';
                return rA.localeCompare(rB) || a.namaLengkap.localeCompare(b.namaLengkap);
            });
        contextName = `${jenjang.nama} (Gabungan)`;
    } else {
        throw new Error("Target Rombel atau Jenjang harus dipilih.");
    }

    const { cells, rowCount, colCount } = config.template;

    // 1. Identify Body Columns and Formulas
    const bodyColumns: GridCell[] = [];
    const formulaCells: GridCell[] = [];
    const rankConfigs: RankConfig[] = [];

    for(let c = 0; c < colCount; c++) {
        let defCell: GridCell | null = null;
        for(let r = rowCount - 1; r >= 0; r--) {
            const cell = cells[r][c];
            if (!cell.hidden && (cell.type === 'input' || cell.type === 'data' || cell.type === 'formula' || cell.type === 'dropdown')) {
                defCell = cell;
                break;
            }
        }
        
        if (defCell) {
            bodyColumns.push(defCell);
            
            if (defCell.type === 'formula' && defCell.value) {
                const rankMatch = defCell.value.match(/RANK\(\$([A-Z0-9_]+)(?:,\s*(\d+))?\)/i);
                if (rankMatch) {
                    rankConfigs.push({
                        targetKey: defCell.key || `RANK_COL_${c}`, 
                        sourceKey: rankMatch[1],
                        limit: rankMatch[2] ? parseInt(rankMatch[2], 10) : 0
                    });
                    if(!defCell.key) defCell.key = `RANK_COL_${c}`;
                } else {
                    formulaCells.push(defCell);
                }
            }
        } else {
            bodyColumns.push({ 
                id: `placeholder_${c}`, row: 0, col: c, value: '', type: 'label', width: 100,
                borders: { top: true, bottom: true, left: true, right: true }
            });
        }
    }

    const formulaScripts = formulaCells.map(c => {
        const jsExpression = convertFormulaToJs(c.value || '');
        return `
        try {
            const val = ${jsExpression};
            const field = document.getElementById('val_' + rowId + '_${c.key}');
            if(field) {
                if (typeof val === 'string') {
                     field.value = val;
                } else {
                     field.value = isNaN(val) ? val : Number(val).toFixed(2).replace(/[.,]00$/, "");
                }
            }
        } catch(e) {}
        `;
    }).join('\n');

    // Header Placeholders (Static context only)
    const replaceHeaderPlaceholders = (text: string) => {
        let res = text;
        res = res.replace(/\$NAMA_YAYASAN/g, settings.namaYayasan);
        res = res.replace(/\$NAMA_PONPES/g, settings.namaPonpes);
        res = res.replace(/\$ALAMAT_PONDOK/g, settings.alamat);
        res = res.replace(/\$SEMESTER/g, config.semester);
        res = res.replace(/\$TAHUN_AJAR/g, config.tahunAjaran);
        
        // Static context specific
        if (config.rombelId > 0) {
            const rombel = settings.rombel.find(r => r.id === config.rombelId);
            const kelas = rombel ? settings.kelas.find(k => k.id === rombel.kelasId) : undefined;
            const wali = rombel ? settings.tenagaPengajar.find(t => t.id === rombel.waliKelasId) : undefined;
            
            res = res.replace(/\$ROMBEL/g, rombel?.nama || '');
            res = res.replace(/\$KELAS/g, kelas?.nama || '');
            res = res.replace(/\$WALI_KELAS/g, wali ? wali.nama : '...................');
        } else {
             // Bulk context placeholders
            res = res.replace(/\$ROMBEL/g, "Semua Rombel");
            res = res.replace(/\$KELAS/g, "Semua Kelas");
            res = res.replace(/\$WALI_KELAS/g, "...................");
        }

        if (res.includes('$MUDIR')) {
            // Find mudir based on jenjang (if available in context)
            let jenjangId = config.jenjangId;
            if (!jenjangId && config.rombelId > 0) {
                 const r = settings.rombel.find(i => i.id === config.rombelId);
                 const k = r ? settings.kelas.find(i => i.id === r.kelasId) : undefined;
                 jenjangId = k?.jenjangId;
            }
            const jenjang = settings.jenjang.find(j => j.id === jenjangId);
            const mudir = settings.tenagaPengajar.find(t => t.id === jenjang?.mudirId);
            res = res.replace(/\$MUDIR/g, mudir ? mudir.nama : '...................');
        }

        res = res.replace(/\$MAPEL_NAME_(\d+)/g, (match, id) => {
            const mapel = settings.mataPelajaran.find(m => m.id === parseInt(id));
            return mapel ? mapel.nama : '[Mapel Tidak Ditemukan]';
        });
        if (res.includes('$LOGO')) {
            if (settings.logoPonpesUrl) {
                return `<img src="${settings.logoPonpesUrl}" style="height: 60px; width: auto; object-fit: contain;" />`;
            } else {
                return `[LOGO]`;
            }
        }
        return res;
    };

    const getBorderStyle = (cell: GridCell) => {
        const b = cell.borders || { top: true, right: true, bottom: true, left: true };
        let style = '';
        if (b.top) style += 'border-top: 1px solid black; ';
        if (b.right) style += 'border-right: 1px solid black; ';
        if (b.bottom) style += 'border-bottom: 1px solid black; ';
        if (b.left) style += 'border-left: 1px solid black; ';
        return style;
    };

    const theadHtml = cells.map((row, rIndex) => {
        const rowCells = row.map(cell => {
            if (cell.hidden) return ''; 
            
            let bgClass = "bg-gray-100 text-gray-700";
            if (cell.type === 'input') bgClass = "bg-blue-50 text-blue-800";
            else if (cell.type === 'formula') bgClass = "bg-yellow-50 text-yellow-800";
            else if (cell.type === 'dropdown') bgClass = "bg-orange-50 text-orange-800";
            else if (cell.type === 'data') bgClass = "bg-gray-200 text-gray-800";

            const alignClass = cell.align === 'left' ? 'text-left' : cell.align === 'right' ? 'text-right' : 'text-center';
            const widthStyle = cell.width ? `width: ${cell.width}px;` : '';
            const borderStyle = getBorderStyle(cell);
            const processedValue = replaceHeaderPlaceholders(cell.value);

            return `
                <th rowspan="${cell.rowSpan || 1}" colspan="${cell.colSpan || 1}"
                    class="p-2 text-xs font-bold uppercase align-middle ${bgClass} ${alignClass}"
                    style="${widthStyle} ${borderStyle}">
                    ${processedValue}
                    ${cell.key ? `<br/><span class="text-[9px] font-normal opacity-60">$${cell.key}</span>` : ''}
                </th>
            `;
        }).join('');
        const indexHeader = rIndex === 0 ? `<th rowspan="${rowCount}" class="p-2 bg-gray-200 w-10" style="border: 1px solid black;">No</th>` : '';
        return `<tr>${indexHeader}${rowCells}</tr>`;
    }).join('');

    const tbodyHtml = targetSantri.map((s, index) => {
        // Dynamic lookups for each student (Crucial for Multi-Class generation)
        const sRombel = settings.rombel.find(r => r.id === s.rombelId);
        const sKelas = sRombel ? settings.kelas.find(k => k.id === sRombel.kelasId) : undefined;
        
        const rowCells = bodyColumns.map(col => {
            const fieldId = `val_${s.id}_${col.key || 'null'}`;
            const borderStyle = getBorderStyle(col);

            if (col.type === 'data') {
                let val = '';
                if (col.value === '$NAMA') val = s.namaLengkap;
                else if (col.value === '$NIS') val = s.nis;
                else if (col.value === '$NISN') val = s.nisn || '-';
                else if (col.value === '$KELAS') val = sKelas?.nama || '';
                else if (col.value === '$ROMBEL') val = sRombel?.nama || '';
                else val = replaceHeaderPlaceholders(col.value);
                return `<td class="p-2 bg-gray-50 text-sm text-gray-800 whitespace-nowrap" style="${borderStyle}">${val}</td>`;
            }
            if (col.type === 'input') {
                return `<td class="p-1" style="${borderStyle}"><input type="text" id="${fieldId}" name="${fieldId}" oninput="calculateRow(${s.id})" class="w-full h-full p-1.5 text-center bg-white focus:bg-blue-50 outline-none transition-colors rounded text-sm font-medium focus:ring-2 focus:ring-blue-300"></td>`;
            }
            if (col.type === 'dropdown') {
                const optionsHtml = col.options ? col.options.map(opt => `<option value="${opt}">${opt}</option>`).join('') : '';
                return `<td class="p-1 bg-orange-50" style="${borderStyle}"><select id="${fieldId}" name="${fieldId}" onchange="calculateRow(${s.id})" class="w-full h-full p-1 text-center bg-transparent outline-none text-sm cursor-pointer"><option value="">-</option>${optionsHtml}</select></td>`;
            }
            if (col.type === 'formula') {
                return `<td class="p-1 bg-yellow-50" style="${borderStyle}"><input type="text" id="${fieldId}" name="${fieldId}" readonly tabindex="-1" class="w-full h-full p-1.5 text-center bg-transparent outline-none font-bold text-gray-700" value="-"></td>`;
            }
            return `<td class="p-1 bg-gray-100" style="${borderStyle}"></td>`;
        }).join('');

        return `<tr class="hover:bg-gray-50"><td class="p-2 text-center bg-gray-100 text-xs" style="border: 1px solid black;">${index + 1}</td>${rowCells}</tr>`;
    }).join('');

    const inputKeysToSave = bodyColumns.filter(c => c.key && (c.type === 'input' || c.type === 'formula' || c.type === 'dropdown')).map(c => c.key);
    const scriptUrl = config.googleScriptUrl || '';
    const waDest = config.waDestination ? config.waDestination.replace(/^0/, '62').replace(/[^0-9]/g, '') : '';
    const santriMap = targetSantri.reduce((acc, s) => { acc[s.id] = s.namaLengkap; return acc; }, {} as Record<number, string>);
    const rankConfigsJson = JSON.stringify(rankConfigs);

    // --- Dynamic Submission Script ---
    let submissionScript = '';
    if (config.submissionMethod === 'whatsapp') {
        submissionScript = `
            const jsonString = JSON.stringify(payload);
            const encoded = btoa(unescape(encodeURIComponent(jsonString)));
            let message = "*Setoran Data Rapor (Grid V2)*\\nKelas: ${contextName}\\nTemplate: ${config.template.name}\\n\\n*KODE DATA:*\\nRAPOR_V2_START\\n" + encoded + "\\nRAPOR_V2_END";
            const waUrl = "${waDest}" ? 'https://wa.me/${waDest}?text=' : 'https://wa.me/?text=';
            window.open(waUrl + encodeURIComponent(message), '_blank');
            btn.disabled = false; btn.innerHTML = originalText;
        `;
    } else {
        submissionScript = `
            fetch("${scriptUrl}", { method: 'POST', mode: 'no-cors', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload) })
            .then(() => {
                 ${config.submissionMethod === 'google_sheet' ? `alert('Data Berhasil Dikirim ke Google Sheet!'); btn.disabled = false; btn.innerHTML = originalText;` : `
                    const jsonString = JSON.stringify(payload);
                    const encoded = btoa(unescape(encodeURIComponent(jsonString)));
                    let message = "*Setoran Data Rapor (Hybrid)*\\nKelas: ${contextName}\\nStatus: ✅ Terupload ke Cloud\\n\\n*BACKUP DATA:*\\nRAPOR_V2_START\\n" + encoded + "\\nRAPOR_V2_END";
                    window.open(("${waDest}" ? 'https://wa.me/${waDest}?text=' : 'https://wa.me/?text=') + encodeURIComponent(message), '_blank');
                    btn.disabled = false; btn.innerHTML = originalText;
                 `}
            }).catch(err => { alert('Error: ' + err); btn.disabled = false; btn.innerHTML = originalText; });
        `;
    }

    return `<!DOCTYPE html><html lang="id"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Input Nilai - ${contextName}</title><script src="https://cdn.tailwindcss.com"></script><link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet"><style>input[type=number]::-webkit-inner-spin-button,input[type=number]::-webkit-outer-spin-button{-webkit-appearance:none;margin:0}.sticky-header th{position:sticky;top:0;z-index:20}th,td{box-sizing:border-box}</style><script>
        const santriIds = [${targetSantri.map(s=>s.id).join(',')}]; const santriNames = ${JSON.stringify(santriMap)}; const rankConfigs = ${rankConfigsJson};
        function getValue(key, rowId) { const el = document.getElementById('val_' + rowId + '_' + key); if (!el) return 0; const val = el.value; if (val === '') return 0; if (!isNaN(parseFloat(val)) && isFinite(val)) return parseFloat(val); return val; }
        function average(...args) { const validArgs = args.filter(a => typeof a === 'number' && !isNaN(a)); if (validArgs.length === 0) return 0; return validArgs.reduce((a,b)=>a+b,0)/validArgs.length; }
        function sum(...args) { return args.reduce((a, b) => a + (typeof b === 'number' && !isNaN(b) ? b : 0), 0); }
        function excelIf(c, t, f) { return c ? t : f; } function excelAnd(...args) { return args.every(Boolean); } function excelOr(...args) { return args.some(Boolean); }
        function calculateRanks() { if (rankConfigs.length === 0) return; rankConfigs.forEach(cfg => { const values = santriIds.map(id => { const el = document.getElementById('val_' + id + '_' + cfg.sourceKey); return { id, val: el ? parseFloat(el.value) || 0 : 0 }; }); const sorted = [...values].sort((a,b) => b.val - a.val); const rankMap = {}; sorted.forEach((item, index) => { rankMap[item.id] = index + 1; }); santriIds.forEach(id => { const targetEl = document.getElementById('val_' + id + '_' + cfg.targetKey); if(targetEl) { const rank = rankMap[id]; targetEl.value = (cfg.limit > 0 && rank > cfg.limit) ? "" : rank; } }); }); }
        function calculateRow(rowId) { ${formulaScripts} calculateRanks(); }
        function submitData() { santriIds.forEach(id => calculateRow(id)); const btn = document.getElementById('submit-btn'); const originalText = btn.innerHTML; btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Memproses...'; try { const inputKeys = ${JSON.stringify(inputKeysToSave)}; const records = []; santriIds.forEach(sid => { const santriRecord = { santriId: sid, santriName: santriNames[sid] || "", data: {} }; inputKeys.forEach(key => { const el = document.getElementById('val_' + sid + '_' + key); if(el) santriRecord.data[key] = el.value; }); records.push(santriRecord); }); const payload = { meta: { rombelId: ${config.rombelId}, rombelName: "${contextName}", templateName: "${config.template.name}", tahunAjaran: "${config.tahunAjaran}", semester: "${config.semester}", templateId: "${config.template.id}", timestamp: new Date().toISOString() }, records: records }; ${submissionScript} } catch (e) { alert("Error: " + e.message); btn.disabled = false; btn.innerHTML = originalText; } }
    </script></head><body class="bg-gray-100 min-h-screen p-4"><div class="max-w-[98%] mx-auto bg-white shadow-xl rounded-xl border overflow-hidden flex flex-col h-[90vh]"><div class="bg-teal-700 p-4 text-white flex justify-between items-center shrink-0"><div><h1 class="text-xl font-bold">${config.template.name}</h1><p class="text-xs opacity-80">${settings.namaPonpes} | ${contextName}</p></div><button onclick="submitData()" id="submit-btn" class="bg-white text-teal-700 px-4 py-2 rounded font-bold text-sm hover:bg-teal-50"><i class="fab fa-paper-plane"></i> Kirim Nilai</button></div><div class="flex-grow overflow-auto"><table class="w-full text-sm border-collapse"><thead class="sticky-header">${theadHtml}</thead><tbody class="divide-y">${tbodyHtml}</tbody></table></div></div></body></html>`;
};

export const fetchRaporFromCloud = async (scriptUrl: string): Promise<any[]> => {
    try {
        const response = await fetch(scriptUrl);
        if (!response.ok) throw new Error("Gagal mengambil data dari Google Sheet");
        const rawData = await response.json();
        if (!Array.isArray(rawData)) throw new Error("Format data tidak valid");
        return rawData;
    } catch (e) { console.error("Fetch Cloud Error:", e); throw e; }
};

export const parseRaporDataV2 = async (encryptedString: string, settings: PondokSettings): Promise<{ successCount: number; errors: string[] }> => {
    try {
        const decoded = decodeURIComponent(escape(atob(encryptedString.trim())));
        const data = JSON.parse(decoded);
        let successCount = 0; const errors: string[] = [];
        const processPayload = async (payload: any) => {
             const template = settings.raporTemplates?.find(t => t.id === payload.meta.templateId);
             if (!template) { errors.push(`Template ID ${payload.meta.templateId} tidak ditemukan.`); return; }
             for (const rec of payload.records) {
                // If using 'All Classes' mode, records might have different rombelIds internally (not passed in simple payload)
                // But for standard V2 payload, we assume meta.rombelId is correct OR we might need to fetch santri to check correct rombel.
                // However, raporRecords stores snapshot. If we have santriId, we can save it.
                // For 'All Classes' mode (rombelId=0 in meta), we should ideally look up the santri's current rombel
                // to store it correctly in the record.
                let targetRombelId = payload.meta.rombelId;
                if (targetRombelId === 0) {
                     const s = await db.santri.get(rec.santriId);
                     if (s) targetRombelId = s.rombelId;
                }

                const existing = await db.raporRecords.where({ santriId: rec.santriId, tahunAjaran: payload.meta.tahunAjaran, semester: payload.meta.semester }).first();
                let customData: any = existing && existing.customData ? JSON.parse(existing.customData) : {};
                Object.keys(rec.data).forEach(key => customData[key] = rec.data[key]);
                const recordToSave = { santriId: rec.santriId, tahunAjaran: payload.meta.tahunAjaran, semester: payload.meta.semester, rombelId: targetRombelId, jenjangId: 0, kelasId: 0, nilai: existing ? existing.nilai : [], sakit: existing ? existing.sakit : 0, izin: existing ? existing.izin : 0, alpha: existing ? existing.alpha : 0, kepribadian: existing ? existing.kepribadian : [], ekstrakurikuler: existing ? existing.ekstrakurikuler : [], catatanWaliKelas: existing ? existing.catatanWaliKelas : '', keputusan: existing ? existing.keputusan : '', tanggalRapor: new Date().toISOString(), customData: JSON.stringify(customData) };
                if (existing) await db.raporRecords.put({ ...recordToSave, id: existing.id } as RaporRecord); else await db.raporRecords.add(recordToSave as RaporRecord);
                successCount++;
             }
        };
        if (data.meta && data.records) await processPayload(data);
        else if (Array.isArray(data)) { for (const row of data) { if (!row.DataJSON) continue; try { await processPayload({ meta: { rombelId: parseInt(row.RombelID), tahunAjaran: row.TahunAjaran, semester: row.Semester, templateId: row.TemplateID }, records: [{ santriId: parseInt(row.SantriID), data: JSON.parse(row.DataJSON) }] }); } catch(err: any) { errors.push(err.message); } } }
        else throw new Error("Format data tidak dikenali.");
        return { successCount, errors };
    } catch (e) { throw new Error("Gagal memproses data: " + (e as Error).message); }
};
