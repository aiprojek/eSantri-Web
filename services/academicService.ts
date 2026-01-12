
import { Santri, PondokSettings, RaporRecord, NilaiMapel, RaporTemplate, GridCell } from '../types';
import { db } from '../db';

// --- HELPER: CONVERT EXCEL SYNTAX TO JS ---
const convertFormulaToJs = (expression: string): string => {
    let js = expression;
    // Replace $KEY with function call
    js = js.replace(/\$([a-zA-Z0-9_]+)\b/g, "getValue('$1', rowId)");
    
    // Functions
    js = js.replace(/RATA2\(/g, 'average(');
    js = js.replace(/AVERAGE\(/g, 'average(');
    js = js.replace(/SUM\(/g, 'sum(');
    js = js.replace(/MIN\(/g, 'Math.min(');
    js = js.replace(/MAX\(/g, 'Math.max(');
    // Logic Functions
    js = js.replace(/IF\(/g, 'excelIf(');
    js = js.replace(/AND\(/g, 'excelAnd(');
    js = js.replace(/OR\(/g, 'excelOr(');
    
    // Note: RANK is handled globally, but if user puts it in row formula by mistake, we prevent crash
    js = js.replace(/RANK\(/g, '0 * ('); 

    return js;
};

interface GeneratorConfig {
    rombelId: number;
    semester: 'Ganjil' | 'Genap';
    tahunAjaran: string;
    template: RaporTemplate;
    submissionMethod?: 'whatsapp' | 'google_sheet' | 'hybrid';
    googleScriptUrl?: string;
    waDestination?: string; // NEW: Destination phone number
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
    const rombel = settings.rombel.find(r => r.id === config.rombelId);
    if (!rombel) throw new Error("Rombel tidak ditemukan");
    
    const targetSantri = santriList
        .filter(s => s.rombelId === config.rombelId && s.status === 'Aktif')
        .sort((a, b) => a.namaLengkap.localeCompare(b.namaLengkap));

    const { cells, rowCount, colCount } = config.template;

    // 1. Identify "Leaf" Columns for Body Generation
    const bodyColumns: GridCell[] = [];
    const uniqueKeys = new Set<string>();
    const formulaCells: GridCell[] = [];
    const rankConfigs: RankConfig[] = [];

    // Search from bottom up for the last non-hidden data/input/formula/dropdown cell in each column
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
            if (defCell.key) uniqueKeys.add(defCell.key);
            
            if (defCell.type === 'formula' && defCell.value) {
                // Check if it's a RANK formula
                const rankMatch = defCell.value.match(/RANK\(\$([A-Z0-9_]+)(?:,\s*(\d+))?\)/i);
                if (rankMatch) {
                    // It's a Rank Formula!
                    // rankMatch[1] is the source Variable Key (e.g. TOTAL)
                    // rankMatch[2] is optional limit
                    // We don't add it to standard formulaCells
                    rankConfigs.push({
                        targetKey: defCell.key || `RANK_COL_${c}`, // Need a key to target the input
                        sourceKey: rankMatch[1],
                        limit: rankMatch[2] ? parseInt(rankMatch[2], 10) : 0
                    });
                    // Ensure the cell has a key so we can target it
                    if(!defCell.key) defCell.key = `RANK_COL_${c}`;
                } else {
                    // Standard Row Formula
                    formulaCells.push(defCell);
                }
            }
        } else {
            // Default placeholder if not found, assume standard borders if undefined in legacy
            bodyColumns.push({ 
                id: `placeholder_${c}`, row: 0, col: c, value: '', type: 'label', width: 100,
                borders: { top: true, bottom: true, left: true, right: true }
            });
        }
    }

    // Generate Formula Scripts (Row-Local)
    const formulaScripts = formulaCells.map(c => {
        const jsExpression = convertFormulaToJs(c.value || '');
        return `
        try {
            const val = ${jsExpression};
            const field = document.getElementById('val_' + rowId + '_${c.key}');
            if(field) {
                // If result is string (from IF), don't format as number
                if (typeof val === 'string') {
                     field.value = val;
                } else {
                     field.value = isNaN(val) ? val : Number(val).toFixed(2).replace(/[.,]00$/, "");
                }
            }
        } catch(e) {}
        `;
    }).join('\n');

    // --- HELPER: REPLACE STATIC PLACEHOLDERS IN HEADER (KOP) ---
    const replaceHeaderPlaceholders = (text: string) => {
        let res = text;
        res = res.replace(/\$NAMA_YAYASAN/g, settings.namaYayasan);
        res = res.replace(/\$NAMA_PONPES/g, settings.namaPonpes);
        res = res.replace(/\$ALAMAT_PONDOK/g, settings.alamat);
        res = res.replace(/\$ROMBEL/g, rombel.nama);
        const kelas = settings.kelas.find(k => k.id === rombel.kelasId);
        res = res.replace(/\$KELAS/g, kelas?.nama || '');
        res = res.replace(/\$SEMESTER/g, config.semester);
        res = res.replace(/\$TAHUN_AJAR/g, config.tahunAjaran);

        if (res.includes('$WALI_KELAS')) {
            const wali = settings.tenagaPengajar.find(t => t.id === rombel.waliKelasId);
            res = res.replace(/\$WALI_KELAS/g, wali ? wali.nama : '...................');
        }
        if (res.includes('$MUDIR')) {
            const jenjang = settings.jenjang.find(j => j.id === kelas?.jenjangId);
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

    // --- BORDER HELPER ---
    const getBorderStyle = (cell: GridCell) => {
        // Fallback for legacy templates (no borders prop) -> All borders active
        const b = cell.borders || { top: true, right: true, bottom: true, left: true };
        let style = '';
        if (b.top) style += 'border-top: 1px solid black; ';
        if (b.right) style += 'border-right: 1px solid black; ';
        if (b.bottom) style += 'border-bottom: 1px solid black; ';
        if (b.left) style += 'border-left: 1px solid black; ';
        return style;
    };


    // 2. Generate Header HTML (The Grid)
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
                <th 
                    rowspan="${cell.rowSpan || 1}" 
                    colspan="${cell.colSpan || 1}"
                    class="p-2 text-xs font-bold uppercase align-middle ${bgClass} ${alignClass}"
                    style="${widthStyle} ${borderStyle}"
                >
                    ${processedValue}
                    ${cell.key ? `<br/><span class="text-[9px] font-normal opacity-60">$${cell.key}</span>` : ''}
                </th>
            `;
        }).join('');
        
        // Sticky Index Column (Fixed Border)
        const indexHeader = rIndex === 0 ? `<th rowspan="${rowCount}" class="p-2 bg-gray-200 w-10" style="border: 1px solid black;">No</th>` : '';

        return `<tr>${indexHeader}${rowCells}</tr>`;
    }).join('');


    // 3. Generate Body Rows
    const tbodyHtml = targetSantri.map((s, index) => {
        const rowCells = bodyColumns.map(col => {
            const fieldId = `val_${s.id}_${col.key || 'null'}`;
            const borderStyle = getBorderStyle(col);

            if (col.type === 'data') {
                let val = '';
                // Dynamic Student Data
                if (col.value === '$NAMA') val = s.namaLengkap;
                else if (col.value === '$NIS') val = s.nis;
                else if (col.value === '$NISN') val = s.nisn || '-';
                else if (col.value === '$KELAS') val = settings.kelas.find(k=>k.id===s.kelasId)?.nama || '';
                else if (col.value === '$ROMBEL') val = rombel.nama;
                else val = replaceHeaderPlaceholders(col.value);
                
                return `<td class="p-2 bg-gray-50 text-sm text-gray-800 whitespace-nowrap" style="${borderStyle}">${val}</td>`;
            }

            if (col.type === 'input') {
                return `
                <td class="p-1" style="${borderStyle}">
                    <input 
                        type="text" 
                        id="${fieldId}"
                        name="${fieldId}" 
                        oninput="calculateRow(${s.id})"
                        class="w-full h-full p-1.5 text-center bg-white focus:bg-blue-50 outline-none transition-colors rounded text-sm font-medium focus:ring-2 focus:ring-blue-300"
                    >
                </td>`;
            }

            if (col.type === 'dropdown') {
                const optionsHtml = col.options ? col.options.map(opt => `<option value="${opt}">${opt}</option>`).join('') : '';
                return `
                <td class="p-1 bg-orange-50" style="${borderStyle}">
                    <select 
                        id="${fieldId}"
                        name="${fieldId}"
                        onchange="calculateRow(${s.id})"
                        class="w-full h-full p-1 text-center bg-transparent outline-none text-sm cursor-pointer"
                    >
                        <option value="">- Pilih -</option>
                        ${optionsHtml}
                    </select>
                </td>`;
            }

            if (col.type === 'formula') {
                // If it's a RANK column, we still render input but maybe readonly or special class
                const isRank = col.value && col.value.includes('RANK(');
                return `
                <td class="p-1 bg-yellow-50" style="${borderStyle}">
                    <input 
                        type="text" 
                        id="${fieldId}"
                        name="${fieldId}" 
                        readonly
                        tabindex="-1"
                        class="w-full h-full p-1.5 text-center bg-transparent outline-none font-bold text-gray-700"
                        value="-"
                    >
                </td>`;
            }

            // Empty label column in body
            return `<td class="p-1 bg-gray-100" style="${borderStyle}"></td>`;
        }).join('');

        return `
        <tr class="hover:bg-gray-50">
            <td class="p-2 text-center bg-gray-100 text-xs" style="border: 1px solid black;">${index + 1}</td>
            ${rowCells}
        </tr>`;
    }).join('');

    const inputKeysToSave = bodyColumns
        .filter(c => c.key && (c.type === 'input' || c.type === 'formula' || c.type === 'dropdown'))
        .map(c => c.key);

    const submissionMethod = config.submissionMethod || 'whatsapp';
    const scriptUrl = config.googleScriptUrl || '';
    const waDest = config.waDestination ? config.waDestination.replace(/^0/, '62').replace(/[^0-9]/g, '') : '';

    // Create santri ID to Name Map for the HTML Script
    const santriMap = targetSantri.reduce((acc, s) => {
        acc[s.id] = s.namaLengkap;
        return acc;
    }, {} as Record<number, string>);
    const santriMapJson = JSON.stringify(santriMap);


    // --- Dynamic Submission Script ---
    let submissionScript = '';

    if (submissionMethod === 'whatsapp') {
        submissionScript = `
            const jsonString = JSON.stringify(payload);
            const encoded = btoa(unescape(encodeURIComponent(jsonString)));
            
            let message = "*Setoran Data Rapor (Grid V2)*\\n";
            message += "Rombel: ${rombel.nama}\\n";
            message += "Template: ${config.template.name}\\n\\n";
            message += "*KODE DATA:*\\n";
            message += "RAPOR_V2_START\\n" + encoded + "\\nRAPOR_V2_END\\n\\n";
            
            // Use configured number or open chat picker if empty
            const waUrl = "${waDest}" ? 'https://wa.me/${waDest}?text=' : 'https://wa.me/?text=';
            
            window.open(waUrl + encodeURIComponent(message), '_blank');
            btn.disabled = false;
            btn.innerHTML = originalText;
        `;
    } else {
        // Shared Logic for Google Sheet & Hybrid
        submissionScript = `
            // Google Sheet / Hybrid Logic
            const scriptUrl = "${scriptUrl}";
            const waDest = "${waDest}";
            
            // Try Uploading
            fetch(scriptUrl, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            }).then(() => {
                 ${submissionMethod === 'google_sheet' ? `
                    alert('Data Berhasil Dikirim ke Google Sheet!');
                    btn.disabled = false;
                    btn.innerHTML = originalText;
                 ` : `
                    // Hybrid Success: Open WA with success note
                    const jsonString = JSON.stringify(payload);
                    const encoded = btoa(unescape(encodeURIComponent(jsonString)));
                    let message = "*Setoran Data Rapor (Hybrid)*\\n";
                    message += "Rombel: ${rombel.nama}\\n";
                    message += "Status: ✅ Terupload ke Cloud\\n\\n";
                    message += "*BACKUP DATA:*\\nRAPOR_V2_START\\n" + encoded + "\\nRAPOR_V2_END";
                    
                    const waUrl = waDest ? 'https://wa.me/' + waDest + '?text=' : 'https://wa.me/?text=';
                    window.open(waUrl + encodeURIComponent(message), '_blank');
                    btn.disabled = false;
                    btn.innerHTML = originalText;
                 `}
            }).catch(err => {
                 ${submissionMethod === 'google_sheet' ? `
                    alert('Gagal Mengirim ke Google Sheet: ' + err);
                    btn.disabled = false;
                    btn.innerHTML = originalText;
                 ` : `
                    // Hybrid Error: Open WA with error note
                    const jsonString = JSON.stringify(payload);
                    const encoded = btoa(unescape(encodeURIComponent(jsonString)));
                    let message = "*Setoran Data Rapor (Hybrid)*\\n";
                    message += "Rombel: ${rombel.nama}\\n";
                    message += "Status: ⚠️ Gagal Upload Cloud (Cek Koneksi)\\n\\n";
                    message += "*DATA:*\\nRAPOR_V2_START\\n" + encoded + "\\nRAPOR_V2_END";
                    
                    const waUrl = waDest ? 'https://wa.me/' + waDest + '?text=' : 'https://wa.me/?text=';
                    window.open(waUrl + encodeURIComponent(message), '_blank');
                    btn.disabled = false;
                    btn.innerHTML = originalText;
                 `}
            });
        `;
    }

    const santriIdsArray = targetSantri.map(s => s.id);
    const rankConfigsJson = JSON.stringify(rankConfigs);

    const htmlContent = `
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Input Nilai - ${rombel.nama}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
    <style>
        input[type=number]::-webkit-inner-spin-button, 
        input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        .sticky-header th { position: sticky; top: 0; z-index: 20; }
        /* Reset any conflicting styles */
        th, td { box-sizing: border-box; }
    </style>
    <script>
        const santriIds = [${santriIdsArray.join(',')}];
        const santriNames = ${santriMapJson};
        const rankConfigs = ${rankConfigsJson};

        function getValue(key, rowId) {
            const el = document.getElementById('val_' + rowId + '_' + key);
            if (!el) return 0;
            // Attempt to read as string if it contains text, otherwise number
            const val = el.value;
            if (val === '') return 0;
            // If it looks like a number, parse it
            if (!isNaN(parseFloat(val)) && isFinite(val)) return parseFloat(val);
            return val;
        }
        function average(...args) {
            const validArgs = args.filter(a => typeof a === 'number' && !isNaN(a));
            if (validArgs.length === 0) return 0;
            const sum = validArgs.reduce((a, b) => a + b, 0);
            return sum / validArgs.length;
        }
        function sum(...args) {
             return args.reduce((a, b) => a + (typeof b === 'number' && !isNaN(b) ? b : 0), 0);
        }
        function excelIf(condition, trueVal, falseVal) {
            return condition ? trueVal : falseVal;
        }
        function excelAnd(...args) {
            return args.every(Boolean);
        }
        function excelOr(...args) {
            return args.some(Boolean);
        }
        
        function calculateRanks() {
            if (rankConfigs.length === 0) return;

            rankConfigs.forEach(cfg => {
                // 1. Collect all values
                const values = santriIds.map(id => {
                    const el = document.getElementById('val_' + id + '_' + cfg.sourceKey);
                    const val = el ? parseFloat(el.value) || 0 : 0;
                    return { id, val };
                });

                // 2. Sort Descending
                // Clone to not mess up indices if mapped differently
                const sorted = [...values].sort((a,b) => b.val - a.val);

                // 3. Assign Ranks
                // We map ID -> Rank
                const rankMap = {};
                sorted.forEach((item, index) => {
                    rankMap[item.id] = index + 1;
                });

                // 4. Update UI
                santriIds.forEach(id => {
                    const targetEl = document.getElementById('val_' + id + '_' + cfg.targetKey);
                    if(targetEl) {
                        const rank = rankMap[id];
                        if (cfg.limit > 0 && rank > cfg.limit) {
                           targetEl.value = ""; // Hide if outside limit
                        } else {
                           targetEl.value = rank;
                        }
                    }
                });
            });
        }

        function calculateRow(rowId) {
            ${formulaScripts}
            
            // Recalculate ranks globally after any row update
            // Debounce could be added for performance if needed, but 30-40 rows is fine.
            calculateRanks();
        }

        function submitData() {
            // Ensure final calculation before submit
            santriIds.forEach(id => calculateRow(id)); 
            
            const btn = document.getElementById('submit-btn');
            const originalText = btn.innerHTML;
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Memproses...';

            try {
                const inputKeys = ${JSON.stringify(inputKeysToSave)};
                
                const records = [];
                santriIds.forEach(sid => {
                    const santriRecord = { 
                        santriId: sid, 
                        santriName: santriNames[sid] || "", 
                        data: {} 
                    };
                    inputKeys.forEach(key => {
                        const el = document.getElementById('val_' + sid + '_' + key);
                        if(el) santriRecord.data[key] = el.value;
                    });
                    records.push(santriRecord);
                });

                const payload = {
                    meta: {
                        rombelId: ${config.rombelId},
                        rombelName: "${rombel.nama}",
                        templateName: "${config.template.name}",
                        tahunAjaran: "${config.tahunAjaran}",
                        semester: "${config.semester}",
                        templateId: "${config.template.id}",
                        timestamp: new Date().toISOString()
                    },
                    records: records
                };

                ${submissionScript}

            } catch (e) {
                alert("Error: " + e.message);
                btn.disabled = false;
                btn.innerHTML = originalText;
            }
        }
    </script>
</head>
<body class="bg-gray-100 min-h-screen p-4">
    <div class="max-w-[98%] mx-auto bg-white shadow-xl rounded-xl border overflow-hidden flex flex-col h-[90vh]">
        <div class="bg-teal-700 p-4 text-white flex justify-between items-center shrink-0">
            <div>
                <h1 class="text-xl font-bold">${config.template.name}</h1>
                <p class="text-xs opacity-80">${settings.namaPonpes} | ${rombel.nama}</p>
            </div>
            <button onclick="submitData()" id="submit-btn" class="bg-white text-teal-700 px-4 py-2 rounded font-bold text-sm hover:bg-teal-50">
                <i class="fab fa-paper-plane"></i> Kirim Nilai
            </button>
        </div>
        <div class="flex-grow overflow-auto">
            <table class="w-full text-sm border-collapse">
                <thead class="sticky-header">
                    ${theadHtml}
                </thead>
                <tbody class="divide-y">
                    ${tbodyHtml}
                </tbody>
            </table>
        </div>
    </div>
</body>
</html>`;

    return htmlContent;
};

// NEW: Function to Fetch Rapor Data from Google Script (GET)
export const fetchRaporFromCloud = async (scriptUrl: string): Promise<any[]> => {
    try {
        const response = await fetch(scriptUrl);
        if (!response.ok) throw new Error("Gagal mengambil data dari Google Sheet");
        
        const rawData = await response.json();
        // Assuming rawData is array of { Timestamp, RombelID, TemplateID, SantriID, DataJSON ... }
        if (!Array.isArray(rawData)) throw new Error("Format data tidak valid");
        
        return rawData;
    } catch (e) {
        console.error("Fetch Cloud Error:", e);
        throw e;
    }
};

export const parseRaporDataV2 = async (
    encryptedString: string,
    settings: PondokSettings
): Promise<{ successCount: number; errors: string[] }> => {
    try {
        const decoded = decodeURIComponent(escape(atob(encryptedString.trim())));
        const data = JSON.parse(decoded);
        
        // Handle single payload or array (from cloud multiple rows)
        // If data has meta & records, it's a single submission payload
        // If data is array of objects with DataJSON property, it's from Cloud Fetch

        let successCount = 0;
        const errors: string[] = [];

        // Scenario 1: Standard Single Payload (from WA or direct JSON)
        if (data.meta && data.records) {
             await processSinglePayload(data, settings, successCount, errors);
             return { successCount: data.records.length, errors }; // Approximate success count
        } 
        
        // Scenario 2: Array from Cloud Fetch
        // Each item in array is a row from Google Sheet containing specific santri data
        if (Array.isArray(data)) {
            for (const row of data) {
                try {
                     if (!row.DataJSON) continue;
                     const santriData = JSON.parse(row.DataJSON); // {"KEY": "VAL", ...}
                     const payload = {
                         meta: {
                             rombelId: parseInt(row.RombelID),
                             tahunAjaran: row.TahunAjaran,
                             semester: row.Semester,
                             templateId: row.TemplateID
                         },
                         records: [{
                             santriId: parseInt(row.SantriID),
                             data: santriData
                         }]
                     };
                     await processSinglePayload(payload, settings, successCount, errors);
                     successCount++;
                } catch(err) {
                    errors.push(`Gagal proses baris cloud: ${(err as Error).message}`);
                }
            }
            return { successCount, errors };
        }

        throw new Error("Format data tidak dikenali.");

    } catch (e) {
        throw new Error("Gagal memproses data: " + (e as Error).message);
    }
};

const processSinglePayload = async (data: any, settings: PondokSettings, successCount: number, errors: string[]) => {
    const template = settings.raporTemplates?.find(t => t.id === data.meta.templateId);
    if (!template) throw new Error(`Template dengan ID ${data.meta.templateId} tidak ditemukan di sistem.`);

    const { rombelId, tahunAjaran, semester } = data.meta;

    for (const rec of data.records) {
        const santri = await db.santri.get(rec.santriId);
        if (!santri) continue;

        const existing = await db.raporRecords.where({
            santriId: rec.santriId,
            tahunAjaran: tahunAjaran,
            semester: semester
        }).first();

        let nilai: NilaiMapel[] = existing ? [...existing.nilai] : [];
        let customData: Record<string, any> = existing && existing.customData ? JSON.parse(existing.customData) : {};

        // Map incoming data based on KEYS
        Object.keys(rec.data).forEach(key => {
            const value = rec.data[key];
            customData[key] = value;
        });

        const recordToSave: Omit<RaporRecord, 'id'> = {
            santriId: rec.santriId,
            tahunAjaran,
            semester,
            jenjangId: santri.jenjangId,
            kelasId: santri.kelasId,
            rombelId: rombelId,
            nilai: nilai,
            sakit: existing ? existing.sakit : 0,
            izin: existing ? existing.izin : 0,
            alpha: existing ? existing.alpha : 0,
            kepribadian: existing ? existing.kepribadian : [],
            ekstrakurikuler: existing ? existing.ekstrakurikuler : [],
            catatanWaliKelas: existing ? existing.catatanWaliKelas : '',
            keputusan: existing ? existing.keputusan : '',
            tanggalRapor: new Date().toISOString(),
            customData: JSON.stringify(customData)
        };

        if (existing) {
            await db.raporRecords.put({ ...recordToSave, id: existing.id });
        } else {
            await db.raporRecords.add(recordToSave as RaporRecord);
        }
    }
}