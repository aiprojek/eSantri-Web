


import { Santri, PondokSettings, RaporRecord, NilaiMapel, RaporTemplate, GridCell } from '../types';
import { db } from '../db';
import { getStandaloneDocumentStyles } from '../utils/standaloneStyles';

// --- HELPER: CONVERT EXCEL SYNTAX TO JS ---
const convertFormulaToJs = (expression: string): string => {
    let js = expression.trim();
    if (js.startsWith('=')) {
        js = js.substring(1).trim();
    }
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
    
    // Text Functions
    js = js.replace(/TERBILANG\(/g, 'terbilang(');
    
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
    const standaloneStyles = getStandaloneDocumentStyles();
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

    // 1. Extract ALL interactive cells (input, formula, dropdown) from the template
    const interactiveCells: GridCell[] = [];
    const formulaCells: GridCell[] = [];
    const rankConfigs: RankConfig[] = [];

    for (let r = 0; r < rowCount; r++) {
        for (let c = 0; c < colCount; c++) {
            const cell = cells[r][c];
            if (!cell.hidden && cell.key && (cell.type === 'input' || cell.type === 'formula' || cell.type === 'dropdown')) {
                // Prevent duplicates if the user accidentally used the same key twice
                if (!interactiveCells.find(ic => ic.key === cell.key)) {
                    interactiveCells.push(cell);
                    
                    if (cell.type === 'formula' && cell.value) {
                        const rankMatch = cell.value.match(/RANK\(\$([A-Z0-9_]+)(?:,\s*(\d+))?\)/i);
                        if (rankMatch) {
                            rankConfigs.push({
                                targetKey: cell.key, 
                                sourceKey: rankMatch[1],
                                limit: rankMatch[2] ? parseInt(rankMatch[2], 10) : 0
                            });
                        } else {
                            formulaCells.push(cell);
                        }
                    }
                }
            }
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

    // --- Generate Ledger Header ---
    const theadHtml = `
        <tr class="sticky-header">
            <th class="p-2 bg-gray-200 w-10 border border-black text-xs font-bold text-center sticky left-0 z-30">No</th>
            <th class="p-2 bg-gray-200 border border-black text-xs font-bold text-left min-w-[180px] sticky left-10 z-30 shadow-[2px_0_5px_rgba(0,0,0,0.1)]">Nama Santri</th>
            <th class="p-2 bg-gray-200 border border-black text-xs font-bold text-center">NIS</th>
            ${interactiveCells.map(cell => {
                let bgClass = "bg-gray-100 text-gray-700";
                if (cell.type === 'input') bgClass = "bg-blue-100 text-blue-800";
                else if (cell.type === 'formula') bgClass = "bg-yellow-100 text-yellow-800";
                else if (cell.type === 'dropdown') bgClass = "bg-orange-100 text-orange-800";
                
                return `
                <th class="p-2 border border-black text-xs font-bold text-center ${bgClass}">
                    ${cell.key}
                    <br/><span class="text-[9px] font-normal opacity-60">${cell.type.toUpperCase()}</span>
                </th>
                `;
            }).join('')}
        </tr>
    `;

    // --- Generate Ledger Body ---
    let tbodyHtml = "";
    let currentRombelId = -1;
    
    targetSantri.forEach((s, index) => {
        const shortName = (s.namaLengkap || '').trim().split(/\s+/)[0] || s.namaLengkap;
        // Add Separator Row if Rombel changes (only in "All Rombels" mode)
        if (config.rombelId === 0 && s.rombelId !== currentRombelId) {
            currentRombelId = s.rombelId;
            const rombelName = settings.rombel.find(r => r.id === s.rombelId)?.nama || "Tanpa Rombel";
            tbodyHtml += `
                <tr class="bg-teal-600 text-white font-bold rombel-sep">
                    <td colspan="${interactiveCells.length + 3}" class="p-2 text-xs border border-black sticky left-0 z-20">
                        <i class="bi bi-people-fill mr-2"></i> ROMBEL: ${rombelName}
                    </td>
                </tr>
            `;
        }

        const rowCells = interactiveCells.map(col => {
            const fieldId = `val_${s.id}_${col.key}`;
            const commonFocusAttr = `data-santri="${shortName}" data-mapel="${col.key}" onfocus="showCellHint(this)"`;
            
            if (col.type === 'input') {
                return `<td class="p-1 border border-black"><input type="text" id="${fieldId}" name="${fieldId}" ${commonFocusAttr} oninput="calculateRow(${s.id})" class="w-full h-full p-1.5 text-center bg-white focus:bg-blue-50 outline-none transition-colors rounded text-sm font-medium focus:ring-2 focus:ring-blue-300"></td>`;
            }
            if (col.type === 'dropdown') {
                const optionsHtml = col.options ? col.options.map(opt => `<option value="${opt}">${opt}</option>`).join('') : '';
                return `<td class="p-1 border border-black bg-orange-50"><select id="${fieldId}" name="${fieldId}" ${commonFocusAttr} onchange="calculateRow(${s.id})" class="w-full h-full p-1 text-center bg-transparent outline-none text-sm cursor-pointer"><option value="">-</option>${optionsHtml}</select></td>`;
            }
            if (col.type === 'formula') {
                return `<td class="p-1 border border-black bg-yellow-50"><input type="text" id="${fieldId}" name="${fieldId}" ${commonFocusAttr} readonly tabindex="-1" class="w-full h-full p-1.5 text-center bg-transparent outline-none font-bold text-gray-700" value="-"></td>`;
            }
            return `<td class="p-1 border border-black bg-gray-100"></td>`;
        }).join('');

        tbodyHtml += `
        <tr class="hover:bg-gray-50">
            <td class="p-2 text-center bg-gray-100 text-xs border border-black sticky left-0 z-10">${index + 1}</td>
            <td class="p-2 bg-white text-sm text-gray-800 font-bold whitespace-nowrap border border-black sticky left-10 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.05)]" title="${s.namaLengkap}">${shortName}</td>
            <td class="p-2 bg-gray-50 text-xs text-gray-600 text-center border border-black">${s.nis}</td>
            ${rowCells}
        </tr>`;
    });

    const inputKeysToSave = interactiveCells.map(c => c.key);
    const scriptUrl = config.googleScriptUrl || '';
    const waDest = config.waDestination ? config.waDestination.replace(/^0/, '62').replace(/[^0-9]/g, '') : '';
    const santriMap = targetSantri.reduce((acc, s) => { acc[s.id] = s.namaLengkap; return acc; }, {} as Record<number, string>);
    const rankConfigsJson = JSON.stringify(rankConfigs);
    const localStorageKey = `esantri_leger_${config.template.id}_${config.tahunAjaran}_${config.semester}_${config.rombelId || config.jenjangId || 0}`;

    // --- Dynamic Submission Script ---
    let submissionScript = '';
    if (config.submissionMethod === 'whatsapp') {
        submissionScript = `
            const jsonString = JSON.stringify(payload);
            const encoded = btoa(unescape(encodeURIComponent(jsonString)));
            let message = "*Setoran Data Rapor (Grid V2)*\\nKelas: ${contextName}\\nTemplate: ${config.template.name}\\n\\n*KODE DATA:*\\nRAPOR_V2_START\\n" + encoded + "\\nRAPOR_V2_END";
            
            navigator.clipboard.writeText(message).then(() => {
                alert("Data berhasil disalin ke clipboard! Silakan paste (tempel) di chat WhatsApp.");
                const waUrl = "${waDest}" ? 'https://wa.me/${waDest}' : 'https://wa.me/';
                window.open(waUrl, '_blank');
                btn.disabled = false; btn.innerHTML = originalText;
            }).catch(err => {
                // Fallback if clipboard fails
                const waUrl = "${waDest}" ? 'https://wa.me/${waDest}?text=' : 'https://wa.me/?text=';
                window.open(waUrl + encodeURIComponent(message), '_blank');
                btn.disabled = false; btn.innerHTML = originalText;
            });
        `;
    } else {
        submissionScript = `
            fetch("${scriptUrl}", { 
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify(payload) 
            })
            .then((res) => {
                 if (!res.ok) throw new Error('HTTP ' + res.status);
                 ${config.submissionMethod === 'google_sheet' ? `alert('Data Berhasil Terkirim!\\n\\nCatatan: Jika data tidak muncul di Spreadsheet, pastikan Anda sudah memberikan izin (Authorize) dan memilih "Anyone" saat Deploy.'); btn.disabled = false; btn.innerHTML = originalText;` : `
                    const jsonString = JSON.stringify(payload);
                    const encoded = btoa(unescape(encodeURIComponent(jsonString)));
                    let message = "*Setoran Data Rapor (Hybrid)*\\nKelas: ${contextName}\\nStatus: ✅ Terupload ke Cloud\\n\\n*BACKUP DATA:*\\nRAPOR_V2_START\\n" + encoded + "\\nRAPOR_V2_END";
                    navigator.clipboard.writeText(message).then(() => {
                        alert("Data berhasil dikirim ke Cloud & disalin ke clipboard! Silakan paste (tempel) di chat WhatsApp sebagai backup.");
                        window.open(("${waDest}" ? 'https://wa.me/${waDest}' : 'https://wa.me/'), '_blank');
                        btn.disabled = false; btn.innerHTML = originalText;
                    }).catch(err => {
                        window.open(("${waDest}" ? 'https://wa.me/${waDest}?text=' : 'https://wa.me/?text=') + encodeURIComponent(message), '_blank');
                        btn.disabled = false; btn.innerHTML = originalText;
                    });
                 `}
            }).catch(err => { 
                alert('Gagal mengirim ke Cloud. Pastikan URL Script benar dan Anda terhubung internet.\\n\\nError: ' + err); 
                btn.disabled = false; btn.innerHTML = originalText; 
            });
        `;
    }

    return `<!DOCTYPE html><html lang="id"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Input Nilai - ${contextName}</title><style>${standaloneStyles}input[type=number]::-webkit-inner-spin-button,input[type=number]::-webkit-outer-spin-button{-webkit-appearance:none;margin:0}.sticky-header th{position:sticky;top:0;z-index:40;height:36px}.rombel-sep td{position:sticky;top:36px;z-index:35}th,td{box-sizing:border-box}@media (max-width: 768px){.sticky.left-10{position:static!important;left:auto!important;z-index:auto!important;box-shadow:none!important}.sticky-header th:nth-child(2),tbody td:nth-child(2){min-width:96px!important;max-width:96px!important;padding-left:6px!important;padding-right:6px!important;font-size:12px!important}}</style><script>
        const santriIds = [${targetSantri.map(s=>s.id).join(',')}]; const santriNames = ${JSON.stringify(santriMap)}; const rankConfigs = ${rankConfigsJson};
        const storageKey = "${localStorageKey}";
        function getValue(key, rowId) { const el = document.getElementById('val_' + rowId + '_' + key); if (!el) return 0; const val = el.value; if (val === '') return 0; if (!isNaN(parseFloat(val)) && isFinite(val)) return parseFloat(val); return val; }
        function average(...args) { const validArgs = args.filter(a => typeof a === 'number' && !isNaN(a)); if (validArgs.length === 0) return 0; return validArgs.reduce((a,b)=>a+b,0)/validArgs.length; }
        function terbilang(n) { if (isNaN(n) || n === '') return ''; var num = Math.round(n); var words = ["nol", "satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "delapan", "sembilan", "sepuluh", "sebelas"]; if (num < 0) return "minus " + terbilang(-num); if (num < 12) return words[num]; if (num < 20) return terbilang(num - 10) + " belas"; if (num < 100) return terbilang(Math.floor(num / 10)) + " puluh" + (num % 10 === 0 ? "" : " " + terbilang(num % 10)); if (num < 200) return "seratus" + (num % 100 === 0 ? "" : " " + terbilang(num % 100)); if (num < 1000) return terbilang(Math.floor(num / 100)) + " ratus" + (num % 100 === 0 ? "" : " " + terbilang(num % 100)); return num.toString(); }
        function sum(...args) { return args.reduce((a, b) => a + (typeof b === 'number' && !isNaN(b) ? b : 0), 0); }
        function excelIf(c, t, f) { return c ? t : f; } function excelAnd(...args) { return args.every(Boolean); } function excelOr(...args) { return args.some(Boolean); }
        function calculateRanks() { if (rankConfigs.length === 0) return; rankConfigs.forEach(cfg => { const values = santriIds.map(id => { const el = document.getElementById('val_' + id + '_' + cfg.sourceKey); return { id, val: el ? parseFloat(el.value) || 0 : 0 }; }); const sorted = [...values].sort((a,b) => b.val - a.val); const rankMap = {}; sorted.forEach((item, index) => { rankMap[item.id] = index + 1; }); santriIds.forEach(id => { const targetEl = document.getElementById('val_' + id + '_' + cfg.targetKey); if(targetEl) { const rank = rankMap[id]; targetEl.value = (cfg.limit > 0 && rank > cfg.limit) ? "" : rank; } }); }); }
        function calculateRow(rowId) { ${formulaScripts} calculateRanks(); }
        function saveDraft() { try { const inputKeys = ${JSON.stringify(inputKeysToSave)}; const draft = { updatedAt: new Date().toISOString(), records: {} }; santriIds.forEach(sid => { const row = {}; inputKeys.forEach(key => { const el = document.getElementById('val_' + sid + '_' + key); if (el && el.value !== '') row[key] = el.value; }); draft.records[sid] = row; }); localStorage.setItem(storageKey, JSON.stringify(draft)); alert('Draft nilai disimpan di perangkat ini.'); } catch (e) { alert('Gagal menyimpan draft: ' + e.message); } }
        function loadDraft() { try { const raw = localStorage.getItem(storageKey); if (!raw) return; const draft = JSON.parse(raw); Object.entries(draft.records || {}).forEach(([sid, row]) => { Object.entries(row || {}).forEach(([key, val]) => { const el = document.getElementById('val_' + sid + '_' + key); if (el) el.value = String(val ?? ''); }); }); santriIds.forEach(id => calculateRow(id)); } catch (e) { console.warn('Draft tidak dapat dimuat', e); } }
        function clearDraft() { localStorage.removeItem(storageKey); }
        function showCellHint(el) { const hint = document.getElementById('cell-hint'); if (!hint || !el) return; const mapel = el.getAttribute('data-mapel') || '-'; const santri = el.getAttribute('data-santri') || '-'; hint.textContent = 'Kolom nilai ' + mapel + ' - ' + santri; }
        function submitData() { santriIds.forEach(id => calculateRow(id)); const btn = document.getElementById('submit-btn'); const originalText = btn.innerHTML; btn.disabled = true; btn.innerHTML = '<span class="inline-block animate-spin mr-2">↻</span>Memproses...'; try { const inputKeys = ${JSON.stringify(inputKeysToSave)}; const records = []; santriIds.forEach(sid => { const santriRecord = { santriId: sid, santriName: santriNames[sid] || "", data: {} }; inputKeys.forEach(key => { const el = document.getElementById('val_' + sid + '_' + key); if(el) { const val = el.value; if (val !== "" && val !== null) santriRecord.data[key] = val; } }); records.push(santriRecord); }); const payload = { meta: { rombelId: ${config.rombelId}, rombelName: "${contextName}", templateName: "${config.template.name}", tahunAjaran: "${config.tahunAjaran}", semester: "${config.semester}", templateId: "${config.template.id}", timestamp: new Date().toISOString() }, records: records }; ${submissionScript} } catch (e) { alert("Error: " + e.message); btn.disabled = false; btn.innerHTML = originalText; } }
        window.addEventListener('DOMContentLoaded', loadDraft);
    </script></head><body class="bg-gray-100 min-h-screen p-4"><div class="max-w-[98%] mx-auto bg-white shadow-xl rounded-xl border overflow-hidden flex flex-col h-[90vh]"><div class="bg-teal-700 p-4 text-white shrink-0"><div class="flex flex-col md:flex-row md:justify-between md:items-center gap-3"><div><h1 class="text-xl font-bold">${config.template.name}</h1><p class="text-xs opacity-80">${settings.namaPonpes} | ${contextName}</p><p class="text-xs opacity-80">Tahun Ajaran: ${config.tahunAjaran} • Semester: ${config.semester}</p></div><div class="flex gap-2 w-full md:w-auto"><button onclick="saveDraft()" class="flex-1 md:flex-none bg-white/15 border border-white/30 text-white px-3 py-2 rounded font-bold text-sm hover:bg-white/25">Simpan Draft</button><button onclick="submitData()" id="submit-btn" class="flex-1 md:flex-none bg-white text-teal-700 px-4 py-2 rounded font-bold text-sm hover:bg-teal-50">Kirim Nilai</button></div></div><div id="cell-hint" class="mt-2 text-xs font-semibold text-teal-50/95">Fokus ke kolom nilai untuk melihat konteks santri/mapel.</div></div><div class="flex-grow overflow-auto"><table class="w-full text-sm border-collapse"><thead class="sticky-header">${theadHtml}</thead><tbody class="divide-y">${tbodyHtml}</tbody></table></div><div class="px-4 py-2 text-center text-[11px] text-gray-500 border-t border-gray-200">dibuat dengan aplikasi eSantri Web by AI Projek | aiprojek01.my.id</div></div></body></html>`;
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
                let targetRombelId = payload.meta.rombelId;
                if (targetRombelId === 0) {
                     const s = await db.santri.get(rec.santriId);
                     if (s) targetRombelId = s.rombelId;
                }

                const existing = await db.raporRecords.where({ santriId: rec.santriId, tahunAjaran: payload.meta.tahunAjaran, semester: payload.meta.semester }).first();
                let customData: any = existing && existing.customData ? JSON.parse(existing.customData) : {};
                
                // Smart Merge: Only update if the incoming value is not empty
                Object.keys(rec.data).forEach(key => {
                    const val = rec.data[key];
                    if (val !== "" && val !== null && val !== undefined) {
                        customData[key] = val;
                    }
                });

                const recordToSave = { santriId: rec.santriId, tahunAjaran: payload.meta.tahunAjaran, semester: payload.meta.semester, rombelId: targetRombelId, jenjangId: 0, kelasId: 0, nilai: existing ? existing.nilai : [], sakit: existing ? existing.sakit : 0, izin: existing ? existing.izin : 0, alpha: existing ? existing.alpha : 0, kepribadian: existing ? existing.kepribadian : [], ekstrakurikuler: existing ? existing.ekstrakurikuler : [], catatanWaliKelas: existing ? existing.catatanWaliKelas : '', keputusan: existing ? existing.keputusan : '', tanggalRapor: new Date().toISOString(), customData: JSON.stringify(customData) };
                if (existing) await db.raporRecords.put({ ...recordToSave, id: existing.id } as RaporRecord); else await db.raporRecords.add(recordToSave as unknown as RaporRecord);
                successCount++;
             }
        };
        if (data.meta && data.records) await processPayload(data);
        else if (Array.isArray(data)) { for (const row of data) { if (!row.DataJSON) continue; try { await processPayload({ meta: { rombelId: parseInt(row.RombelID), tahunAjaran: row.TahunAjaran, semester: row.Semester, templateId: row.TemplateID }, records: [{ santriId: parseInt(row.SantriID), data: JSON.parse(row.DataJSON) }] }); } catch(err: any) { errors.push(err.message); } } }
        else throw new Error("Format data tidak dikenali.");
        return { successCount, errors };
    } catch (e) { throw new Error("Gagal memproses data: " + (e as Error).message); }
};
