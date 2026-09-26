


import { Santri, PondokSettings, RaporRecord, NilaiMapel, RaporTemplate, GridCell } from '../types';
import { db } from '../db';
import { getTemplateSheets } from './raporExcelService';

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

export interface GeneratorConfig {
    rombelId: number; // 0 means ALL rombels in jenjang / kelas
    kelasId?: number; // 0 or undefined means ALL kelas in jenjang
    jenjangId?: number; // Required if rombelId and kelasId are 0
    kelasRange?: {
        fromKelasId: number;
        toKelasId: number;
        kelasIds: number[];
        label?: string;
    };
    semester: 'Ganjil' | 'Genap';
    tahunAjaran: string;
    template: RaporTemplate;
    sheetId?: string; // Optional: specific sheet ID or 'all'
    submissionMethod?: 'whatsapp' | 'google_sheet' | 'hybrid';
    googleScriptUrl?: string;
    waDestination?: string; 
    rankingScope?: 'rombel' | 'kelas' | 'jenjang' | 'global';
}

interface RankConfig {
    targetKey: string;
    sourceKey: string;
    limit: number;
    scope: 'rombel' | 'kelas' | 'jenjang' | 'global';
}

export interface FormInteractiveCell {
    key: string;
    label: string;
    type: 'input' | 'formula' | 'dropdown';
    options?: string[];
    sheetId: string;
    sheetName: string;
    formulaValue?: string;
    row: number;
    col: number;
}

export const generateRaporFormHtml = (
    santriList: Santri[],
    settings: PondokSettings,
    config: GeneratorConfig
): string => {
    let targetSantri: Santri[] = [];
    let contextName = "";
    const defaultRankingScope = config.rankingScope || (config.rombelId > 0 ? 'rombel' : 'rombel');
    
    // 1. Clean and filter only Active and Non-Deleted santri
    const activeSantriList = santriList.filter(s => {
        if (s.deleted) return false;
        const status = (s.status || '').trim().toLowerCase();
        return status === 'aktif';
    });

    // 2. Logic filter berdasarkan Rombel > Kelas > Jenjang
    if (config.rombelId && config.rombelId > 0) {
        const rombel = settings.rombel.find(r => Number(r.id) === Number(config.rombelId));
        if (!rombel) throw new Error("Rombel tidak ditemukan");
        
        targetSantri = activeSantriList
            .filter(s => Number(s.rombelId) === Number(config.rombelId))
            .sort((a, b) => a.namaLengkap.localeCompare(b.namaLengkap));
            
        const kelas = settings.kelas.find(k => Number(k.id) === Number(rombel.kelasId));
        const jenjang = kelas ? settings.jenjang.find(j => Number(j.id) === Number(kelas.jenjangId)) : null;
        contextName = `${jenjang ? jenjang.nama + ' - ' : ''}${kelas ? kelas.nama + ' - ' : ''}${rombel.nama}`;
    } else if (config.kelasId && config.kelasId > 0) {
        const kelas = settings.kelas.find(k => Number(k.id) === Number(config.kelasId));
        if (!kelas) throw new Error("Kelas tidak ditemukan");
        
        targetSantri = activeSantriList
            .filter(s => {
                if (Number(s.kelasId) === Number(config.kelasId)) return true;
                const sRombel = settings.rombel.find(r => Number(r.id) === Number(s.rombelId));
                return sRombel && Number(sRombel.kelasId) === Number(config.kelasId);
            })
            .sort((a, b) => {
                const rA = settings.rombel.find(r => Number(r.id) === Number(a.rombelId))?.nama || '';
                const rB = settings.rombel.find(r => Number(r.id) === Number(b.rombelId))?.nama || '';
                return rA.localeCompare(rB) || a.namaLengkap.localeCompare(b.namaLengkap);
            });
            
        const jenjang = settings.jenjang.find(j => Number(j.id) === Number(kelas.jenjangId));
        contextName = `${jenjang ? jenjang.nama + ' - ' : ''}${kelas.nama} (Semua Rombel)`;
    } else if (config.kelasRange && config.kelasRange.kelasIds && config.kelasRange.kelasIds.length > 0) {
        const rangeIds = new Set(config.kelasRange.kelasIds.map(Number));
        const jenjang = config.jenjangId ? settings.jenjang.find(j => Number(j.id) === Number(config.jenjangId)) : null;

        targetSantri = activeSantriList
            .filter(s => {
                if (s.kelasId && rangeIds.has(Number(s.kelasId))) return true;
                const sRombel = settings.rombel.find(r => Number(r.id) === Number(s.rombelId));
                return sRombel && rangeIds.has(Number(sRombel.kelasId));
            })
            .sort((a, b) => {
                const aKelasId = Number(a.kelasId || settings.rombel.find(r => Number(r.id) === Number(a.rombelId))?.kelasId || 0);
                const bKelasId = Number(b.kelasId || settings.rombel.find(r => Number(r.id) === Number(b.rombelId))?.kelasId || 0);
                const aIdx = config.kelasRange!.kelasIds.indexOf(aKelasId);
                const bIdx = config.kelasRange!.kelasIds.indexOf(bKelasId);
                if (aIdx !== -1 && bIdx !== -1 && aIdx !== bIdx) return aIdx - bIdx;

                const rA = settings.rombel.find(r => Number(r.id) === Number(a.rombelId))?.nama || '';
                const rB = settings.rombel.find(r => Number(r.id) === Number(b.rombelId))?.nama || '';
                return rA.localeCompare(rB) || a.namaLengkap.localeCompare(b.namaLengkap);
            });

        const rangeLabel = config.kelasRange.label || `${config.kelasRange.kelasIds.length} Tingkat Kelas`;
        contextName = `${jenjang ? jenjang.nama + ' - ' : ''}Rentang: ${rangeLabel} (Semua Rombel)`;
    } else if (config.jenjangId && config.jenjangId > 0) {
        const jenjang = settings.jenjang.find(j => Number(j.id) === Number(config.jenjangId));
        if (!jenjang) throw new Error("Jenjang tidak ditemukan");
        
        targetSantri = activeSantriList
            .filter(s => {
                if (Number(s.jenjangId) === Number(config.jenjangId)) return true;
                const sKelas = settings.kelas.find(k => Number(k.id) === Number(s.kelasId));
                if (sKelas && Number(sKelas.jenjangId) === Number(config.jenjangId)) return true;
                const sRombel = settings.rombel.find(r => Number(r.id) === Number(s.rombelId));
                const sRombelKelas = sRombel ? settings.kelas.find(k => Number(k.id) === Number(sRombel.kelasId)) : null;
                return sRombelKelas && Number(sRombelKelas.jenjangId) === Number(config.jenjangId);
            })
            .sort((a, b) => {
                const kA = settings.kelas.find(k => Number(k.id) === Number(a.kelasId))?.nama || '';
                const kB = settings.kelas.find(k => Number(k.id) === Number(b.kelasId))?.nama || '';
                const rA = settings.rombel.find(r => Number(r.id) === Number(a.rombelId))?.nama || '';
                const rB = settings.rombel.find(r => Number(r.id) === Number(b.rombelId))?.nama || '';
                return kA.localeCompare(kB) || rA.localeCompare(rB) || a.namaLengkap.localeCompare(b.namaLengkap);
            });
            
        contextName = `${jenjang.nama} (Gabungan Seluruh Kelas)`;
    } else {
        throw new Error("Target Rombel, Kelas, Rentang Kelas, atau Jenjang harus dipilih.");
    }

    // 3. Extract sheets and interactive cells
    const allSheets = getTemplateSheets(config.template);
    const targetSheets = config.sheetId && config.sheetId !== 'all'
        ? allSheets.filter(s => s.id === config.sheetId)
        : allSheets;

    const interactiveCells: FormInteractiveCell[] = [];
    const formulaCells: FormInteractiveCell[] = [];
    const rankConfigs: RankConfig[] = [];
    const seenKeys = new Set<string>();

    targetSheets.forEach(sheet => {
        if (!sheet.cells || sheet.cells.length === 0) return;
        const rCount = sheet.rowCount || sheet.cells.length;
        const cCount = sheet.colCount || (sheet.cells[0]?.length || 0);

        for (let r = 0; r < rCount; r++) {
            const rowCells = sheet.cells[r] || [];
            for (let c = 0; c < cCount; c++) {
                const cell = rowCells[c];
                if (!cell || cell.hidden || !cell.key) continue;
                const trimmedKey = cell.key.trim();
                if (!trimmedKey) continue;

                if (cell.type === 'input' || cell.type === 'formula' || cell.type === 'dropdown') {
                    if (!seenKeys.has(trimmedKey)) {
                        seenKeys.add(trimmedKey);

                        // Find descriptive label in row before this cell, or above
                        let label = trimmedKey;
                        const labelCellLeft = [...rowCells]
                            .reverse()
                            .find(ch => ch && ch.col < cell.col && ch.type === 'label' && ch.value && ch.value.trim() !== '' && !ch.value.startsWith('$'));
                        
                        if (labelCellLeft) {
                            label = labelCellLeft.value.trim();
                        } else if (cell.value && cell.value.trim() !== '' && !cell.value.startsWith('$') && cell.type !== 'formula') {
                            label = cell.value.trim();
                        }

                        const formCell: FormInteractiveCell = {
                            key: trimmedKey,
                            label: label || trimmedKey,
                            type: cell.type,
                            options: cell.options,
                            sheetId: sheet.id,
                            sheetName: sheet.name || 'Lembar 1',
                            formulaValue: cell.value,
                            row: r,
                            col: c
                        };

                        interactiveCells.push(formCell);

                        if (cell.type === 'formula' && cell.value) {
                            const rankMatch = cell.value.match(/RANK\(\$([A-Z0-9_]+)(?:,\s*["']?([a-zA-Z0-9_]+)["']?)?(?:,\s*["']?([a-zA-Z0-9_]+)["']?)?\)/i);
                            if (rankMatch) {
                                const p1 = rankMatch[2];
                                const p2 = rankMatch[3];
                                let scope: 'rombel' | 'kelas' | 'jenjang' | 'global' = defaultRankingScope;
                                let limit = 0;

                                const checkParam = (p: string | undefined) => {
                                    if (!p) return;
                                    if (/^\d+$/.test(p)) {
                                        limit = parseInt(p, 10);
                                    } else if (['rombel', 'kelas', 'jenjang', 'global'].includes(p.toLowerCase())) {
                                        scope = p.toLowerCase() as any;
                                    }
                                };
                                checkParam(p1);
                                checkParam(p2);

                                rankConfigs.push({
                                    targetKey: trimmedKey, 
                                    sourceKey: rankMatch[1],
                                    limit,
                                    scope
                                });
                            } else {
                                formulaCells.push(formCell);
                            }
                        }
                    }
                }
            }
        }
    });

    const formulaScripts = formulaCells.map(c => {
        const jsExpression = convertFormulaToJs(c.formulaValue || '');
        return `
        try {
            const val = ${jsExpression};
            const field = document.getElementById('val_' + rowId + '_${c.key}');
            const cardField = document.getElementById('card_val_' + rowId + '_${c.key}');
            const formatted = (typeof val === 'string') ? val : (isNaN(val) ? '-' : Number(val).toFixed(2).replace(/[.,]00$/, ""));
            if(field) field.value = formatted;
            if(cardField) cardField.value = formatted;
        } catch(e) {}
        `;
    }).join('\n');

    // --- Generate Ledger Header ---
    const showMultiSheetBadges = targetSheets.length > 1;
    const theadHtml = `
        <tr class="sticky-header">
            <th class="p-2.5 bg-slate-100 border border-slate-300 text-xs font-bold text-center sticky left-0 z-30 w-12 text-slate-700">No</th>
            <th class="p-2.5 bg-slate-100 border border-slate-300 text-xs font-bold text-left min-w-[200px] sticky left-12 z-30 shadow-[2px_0_5px_rgba(0,0,0,0.06)] text-slate-800">Nama Santri</th>
            <th class="p-2.5 bg-slate-100 border border-slate-300 text-xs font-bold text-center w-24 text-slate-600">NIS</th>
            ${interactiveCells.map(cell => {
                let badgeClass = "bg-blue-100 text-blue-800 border-blue-200";
                let headerBg = "bg-slate-50";
                if (cell.type === 'input') {
                    badgeClass = "bg-blue-100 text-blue-800 border-blue-200";
                } else if (cell.type === 'formula') {
                    badgeClass = "bg-amber-100 text-amber-900 border-amber-200";
                    headerBg = "bg-amber-50/40";
                } else if (cell.type === 'dropdown') {
                    badgeClass = "bg-emerald-100 text-emerald-800 border-emerald-200";
                    headerBg = "bg-emerald-50/40";
                }
                
                return `
                <th data-sheet="${cell.sheetId}" class="table-col-cell p-2 border border-slate-300 text-xs font-bold text-center min-w-[130px] ${headerBg}">
                    <div class="font-bold text-slate-800 leading-tight mb-1 text-[11px]">${cell.label}</div>
                    <div class="flex items-center justify-center gap-1">
                        <span class="font-mono text-[9px] text-slate-500 font-semibold bg-white/80 px-1 py-0.5 rounded border border-slate-200">${cell.key}</span>
                        <span class="text-[8px] font-black uppercase px-1 py-0.5 rounded border ${badgeClass}">${cell.type}</span>
                    </div>
                    ${showMultiSheetBadges ? `<div class="text-[8px] text-slate-400 font-normal mt-0.5 truncate max-w-[120px] mx-auto">${cell.sheetName}</div>` : ''}
                </th>
                `;
            }).join('')}
        </tr>
    `;

    // --- Generate Ledger Table Body & Cards Body ---
    let tbodyHtml = "";
    let cardsHtml = "";
    let currentRombelId = -1;
    let currentKelasId = -1;
    
    targetSantri.forEach((s, index) => {
        const shortName = (s.namaLengkap || '').trim().split(/\s+/)[0] || s.namaLengkap;
        const rombelObj = settings.rombel.find(r => r.id === s.rombelId);
        const rombelName = rombelObj?.nama || "Tanpa Rombel";
        const kelasObj = settings.kelas.find(k => k.id === s.kelasId) || (rombelObj ? settings.kelas.find(k => k.id === rombelObj.kelasId) : null);
        const kelasName = kelasObj?.nama || "";

        // Add Separator Row if Rombel or Kelas changes (in "All Rombels", "Jenjang", or "Rentang Kelas" mode)
        const isMultiGroup = config.rombelId === 0 || !!config.kelasRange;
        const effectiveKelasId = s.kelasId || (rombelObj ? rombelObj.kelasId : 0);
        const groupChanged = (s.rombelId !== currentRombelId) || (effectiveKelasId !== currentKelasId);

        if (isMultiGroup && groupChanged) {
            currentRombelId = s.rombelId;
            currentKelasId = effectiveKelasId;
            tbodyHtml += `
                <tr class="bg-teal-700 text-white font-bold rombel-sep">
                    <td colspan="${interactiveCells.length + 3}" class="p-2.5 text-xs border border-teal-800 sticky left-0 z-20">
                        <span class="inline-flex items-center gap-2">
                            <i class="bi bi-people-fill"></i> ${rombelName !== "Tanpa Rombel" ? `ROMBEL: <b>${rombelName}</b>` : 'SANTRI'} ${kelasName ? `• Tingkat: <b>${kelasName}</b>` : ''}
                        </span>
                    </td>
                </tr>
            `;
        }

        const rowCells = interactiveCells.map(col => {
            const fieldId = `val_${s.id}_${col.key}`;
            const commonFocusAttr = `data-santri="${shortName}" data-mapel="${col.label} (${col.key})" onfocus="showCellHint(this)"`;
            
            if (col.type === 'input') {
                return `
                <td data-sheet="${col.sheetId}" class="table-col-cell p-0.5 border border-slate-300 bg-white">
                    <input type="text" id="${fieldId}" name="${fieldId}" ${commonFocusAttr} oninput="syncFromTable(${s.id}, '${col.key}', this.value)" class="w-full h-full p-1.5 text-center text-xs font-semibold text-slate-800 bg-transparent focus:bg-blue-50 focus:ring-2 focus:ring-blue-400 outline-none rounded transition-colors" placeholder="-">
                </td>`;
            }
            if (col.type === 'dropdown') {
                const optionsHtml = col.options ? col.options.map(opt => `<option value="${opt}">${opt}</option>`).join('') : '';
                return `
                <td data-sheet="${col.sheetId}" class="table-col-cell p-0.5 border border-slate-300 bg-emerald-50/30">
                    <select id="${fieldId}" name="${fieldId}" ${commonFocusAttr} onchange="syncFromTable(${s.id}, '${col.key}', this.value)" class="w-full h-full p-1 text-center text-xs font-semibold text-emerald-950 bg-transparent focus:bg-emerald-100 outline-none rounded cursor-pointer">
                        <option value="">-</option>
                        ${optionsHtml}
                    </select>
                </td>`;
            }
            if (col.type === 'formula') {
                return `
                <td data-sheet="${col.sheetId}" class="table-col-cell p-0.5 border border-slate-300 bg-amber-50/50">
                    <input type="text" id="${fieldId}" name="${fieldId}" ${commonFocusAttr} readonly tabindex="-1" class="w-full h-full p-1.5 text-center text-xs font-bold text-amber-950 bg-transparent outline-none cursor-default" value="-">
                </td>`;
            }
            return `<td data-sheet="${col.sheetId}" class="table-col-cell p-1 border border-slate-300 bg-slate-50"></td>`;
        }).join('');

        tbodyHtml += `
        <tr id="row_santri_${s.id}" class="hover:bg-slate-50 transition-colors">
            <td class="p-2 text-center bg-slate-50 text-xs font-medium text-slate-500 border border-slate-300 sticky left-0 z-10 w-12">${index + 1}</td>
            <td class="p-2 bg-white text-xs font-bold text-slate-900 whitespace-nowrap border border-slate-300 sticky left-12 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.05)]" title="${s.namaLengkap}">
                <div class="leading-tight">${s.namaLengkap}</div>
                <div class="text-[10px] text-slate-400 font-normal md:hidden">${rombelName}</div>
            </td>
            <td class="p-2 bg-slate-50/70 text-xs font-mono text-slate-600 text-center border border-slate-300">${s.nis || '-'}</td>
            ${rowCells}
        </tr>`;

        // Card items
        const cardFields = interactiveCells.map(col => {
            const cardFieldId = `card_val_${s.id}_${col.key}`;
            let typeBadge = '<span class="text-[9px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-bold border border-blue-200">INPUT</span>';
            if (col.type === 'dropdown') typeBadge = '<span class="text-[9px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold border border-emerald-200">PILIHAN</span>';
            if (col.type === 'formula') typeBadge = '<span class="text-[9px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold border border-amber-200">RUMUS</span>';

            let inputWidget = '';
            if (col.type === 'input') {
                inputWidget = `<input type="text" id="${cardFieldId}" oninput="syncFromCard(${s.id}, '${col.key}', this.value)" placeholder="Ketik nilai..." class="w-full border-2 border-slate-200 rounded-xl p-3 text-base font-bold text-slate-800 focus:border-teal-500 focus:bg-teal-50/20 outline-none transition-all shadow-xs">`;
            } else if (col.type === 'dropdown') {
                const optionsHtml = col.options ? col.options.map(opt => `<option value="${opt}">${opt}</option>`).join('') : '';
                inputWidget = `<select id="${cardFieldId}" onchange="syncFromCard(${s.id}, '${col.key}', this.value)" class="w-full border-2 border-emerald-200 bg-emerald-50/40 rounded-xl p-3 text-base font-bold text-emerald-950 focus:border-emerald-500 outline-none shadow-xs"><option value="">-- Pilih Nilai --</option>${optionsHtml}</select>`;
            } else if (col.type === 'formula') {
                inputWidget = `<input type="text" id="${cardFieldId}" readonly tabindex="-1" value="-" class="w-full border-2 border-amber-200 bg-amber-50 rounded-xl p-3 text-base font-black text-amber-950 text-center outline-none shadow-xs">`;
            }

            return `
            <div data-sheet="${col.sheetId}" class="card-field-item bg-slate-50/80 p-3.5 rounded-xl border border-slate-200 flex flex-col gap-2 transition-all">
                <div class="flex justify-between items-start gap-2">
                    <div>
                        <label class="text-xs font-bold text-slate-800 leading-snug block">${col.label}</label>
                        <div class="flex items-center gap-1.5 mt-0.5">
                            <span class="font-mono text-[9px] text-slate-400 font-semibold">${col.key}</span>
                            ${showMultiSheetBadges ? `<span class="text-[9px] text-teal-700 bg-teal-50 px-1.5 py-0.2 rounded border border-teal-100">${col.sheetName}</span>` : ''}
                        </div>
                    </div>
                    ${typeBadge}
                </div>
                ${inputWidget}
            </div>`;
        }).join('');

        cardsHtml += `
        <div id="card_santri_${s.id}" class="santri-card-item ${index === 0 ? 'block' : 'hidden'} bg-white rounded-2xl border-2 border-teal-100 shadow-sm p-4 md:p-6 mb-4">
            <div class="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-full bg-teal-700 text-white font-black flex items-center justify-center text-sm shadow">
                        ${index + 1}
                    </div>
                    <div>
                        <h3 class="text-base md:text-lg font-black text-slate-900 leading-tight">${s.namaLengkap}</h3>
                        <p class="text-xs text-slate-500">NIS: <span class="font-mono font-bold text-slate-700">${s.nis || '-'}</span> • ${rombelName}</p>
                    </div>
                </div>
                <div class="text-right">
                    <span class="text-[10px] font-bold uppercase tracking-wider text-teal-700 bg-teal-50 px-3 py-1 rounded-full border border-teal-200">${index + 1} dari ${targetSantri.length}</span>
                </div>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                ${cardFields}
            </div>
        </div>`;
    });

    const inputKeysToSave = interactiveCells.map(c => c.key);
    const scriptUrl = config.googleScriptUrl || '';
    const waDest = config.waDestination ? config.waDestination.replace(/^0/, '62').replace(/[^0-9]/g, '') : '';
    const santriMetaArray = targetSantri.map(s => {
        const rombelObj = settings.rombel.find(r => Number(r.id) === Number(s.rombelId));
        const kelasObj = settings.kelas.find(k => Number(k.id) === Number(s.kelasId)) || (rombelObj ? settings.kelas.find(k => Number(k.id) === Number(rombelObj.kelasId)) : null);
        return {
            id: s.id,
            nama: s.namaLengkap,
            nis: s.nis || '',
            rombelId: s.rombelId || 0,
            rombelName: rombelObj?.nama || 'Tanpa Rombel',
            kelasId: s.kelasId || (kelasObj ? kelasObj.id : 0),
            kelasName: kelasObj?.nama || 'Tanpa Kelas',
            jenjangId: s.jenjangId || 0
        };
    });
    const rankConfigsJson = JSON.stringify(rankConfigs);
    const rangeKeyPart = config.kelasRange ? `range_${config.kelasRange.kelasIds.join('_')}` : (config.kelasId || config.jenjangId || 0);
    const localStorageKey = `esantri_leger_${config.template.id}_${config.tahunAjaran}_${config.semester}_${config.rombelId || rangeKeyPart}`;

    // Extract unique kelas & rombel for filter
    const uniqueKelasMap = new Map<number, string>();
    const uniqueRombelMap = new Map<number, { nama: string, kelasId: number }>();
    santriMetaArray.forEach(s => {
        if (s.kelasId && s.kelasName) uniqueKelasMap.set(s.kelasId, s.kelasName);
        if (s.rombelId && s.rombelName) uniqueRombelMap.set(s.rombelId, { nama: s.rombelName, kelasId: s.kelasId });
    });

    const uniqueKelasOptions = Array.from(uniqueKelasMap.entries()).map(([id, nama]) => `<option value="${id}">${nama}</option>`).join('');
    const uniqueRombelOptions = Array.from(uniqueRombelMap.entries()).map(([id, r]) => `<option value="${id}">${r.nama}</option>`).join('');

    const hasMultipleClasses = uniqueKelasMap.size > 1 || uniqueRombelMap.size > 1;

    let filterToolbarHtml = '';
    if (hasMultipleClasses) {
        filterToolbarHtml = `
        <div class="max-w-3xl mx-auto bg-white p-3.5 rounded-2xl border border-teal-100 shadow-sm mb-3">
            <div class="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-slate-100">
                <span class="text-xs font-black text-teal-900 flex items-center gap-1.5">
                    <span class="w-2 h-2 rounded-full bg-teal-500"></span> Filter Rombel & Santri
                </span>
                <span class="text-[10px] text-slate-500 font-medium">Cari atau filter santri</span>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
                    <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Tingkat Kelas</label>
                    <select id="card-filter-kelas" onchange="onKelasFilterChange(this.value)" class="w-full border rounded-xl p-2 text-xs font-bold text-slate-800 bg-slate-50 focus:bg-white focus:border-teal-500 outline-none">
                        <option value="0">Semua Tingkat Kelas</option>
                        ${uniqueKelasOptions}
                    </select>
                </div>
                <div>
                    <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Rombel</label>
                    <select id="card-filter-rombel" onchange="onRombelFilterChange(this.value)" class="w-full border rounded-xl p-2 text-xs font-bold text-slate-800 bg-slate-50 focus:bg-white focus:border-teal-500 outline-none">
                        <option value="0">Semua Rombel</option>
                        ${uniqueRombelOptions}
                    </select>
                </div>
                <div>
                    <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Cari Santri</label>
                    <input type="text" id="card-search-input" oninput="onSearchChange(this.value)" placeholder="Nama / NIS..." class="w-full border rounded-xl p-2 text-xs font-bold text-slate-800 bg-slate-50 focus:bg-white focus:border-teal-500 outline-none">
                </div>
            </div>
        </div>`;
    } else {
        filterToolbarHtml = `
        <div class="max-w-3xl mx-auto bg-white p-2.5 rounded-2xl border border-teal-100 shadow-sm mb-3 flex items-center gap-2">
            <span class="text-xs text-teal-700 font-bold whitespace-nowrap pl-1">🔍 Cari:</span>
            <input type="text" id="card-search-input" oninput="onSearchChange(this.value)" placeholder="Ketik nama santri atau NIS..." class="w-full border border-slate-200 rounded-xl p-2 text-xs font-bold text-slate-800 bg-slate-50 focus:bg-white focus:border-teal-500 outline-none">
        </div>`;
    }

    // Navigasi Sheet Filter Tabs jika multi-sheet
    let sheetTabsToolbarHtml = '';
    if (targetSheets.length > 1) {
        sheetTabsToolbarHtml = `
        <div class="sheet-tabs-container max-w-3xl mx-auto flex items-center gap-1.5 overflow-x-auto pb-2 mb-3">
            <span class="text-xs font-bold text-slate-600 mr-1 whitespace-nowrap flex items-center gap-1">
                <i class="bi bi-layers"></i> Lembar:
            </span>
            <button onclick="filterBySheet('all')" id="sheet-btn-all" class="sheet-filter-btn active px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all bg-teal-700 text-white shadow-xs">
                Semua Lembar (${interactiveCells.length})
            </button>
            ${targetSheets.map(s => {
                const count = interactiveCells.filter(c => c.sheetId === s.id).length;
                return `
                <button onclick="filterBySheet('${s.id}')" id="sheet-btn-${s.id}" class="sheet-filter-btn px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all bg-white text-slate-700 border border-slate-200 hover:bg-slate-50">
                    ${s.name} (${count})
                </button>`;
            }).join('')}
        </div>`;
    }

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

    return `<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Formulir Input Nilai - ${contextName}</title>
    
    <!-- Google Fonts & Bootstrap Icons CDN -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css">

    <!-- Tailwind CSS CDN -->
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        tailwind.config = {
            theme: {
                extend: {
                    colors: {
                        teal: {
                            50: '#f0fdfa', 100: '#ccfbf1', 200: '#99f6e4', 300: '#5eead4', 400: '#2dd4bf',
                            500: '#14b8a6', 600: '#0d9488', 700: '#0f766e', 800: '#115e59', 900: '#134e4a', 950: '#042f2e'
                        }
                    },
                    fontFamily: {
                        sans: ['Plus Jakarta Sans', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif']
                    }
                }
            }
        }
    </script>

    <!-- Comprehensive Standalone CSS Fallback (Tetap Cantik & Terformat Sempurna Bahkan Saat Offline) -->
    <style>
        *, *::before, *::after { box-sizing: border-box; }
        body {
            font-family: 'Plus Jakarta Sans', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background-color: #f1f5f9;
            color: #0f172a;
            line-height: 1.5;
            margin: 0;
            padding: 12px;
        }
        input, select, button, textarea {
            font-family: inherit;
        }
        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button {
            -webkit-appearance: none;
            margin: 0;
        }
        .sticky-header th {
            position: sticky;
            top: 0;
            z-index: 40;
            height: 40px;
        }
        .rombel-sep td {
            position: sticky;
            top: 40px;
            z-index: 35;
        }
        th, td {
            box-sizing: border-box;
        }
        @media (max-width: 768px) {
            body { padding: 6px; }
            .sticky.left-12 {
                position: static !important;
                left: auto !important;
                z-index: auto !important;
                box-shadow: none !important;
            }
        }
    </style>

    <script>
        const santriList = ${JSON.stringify(santriMetaArray)};
        const santriIds = santriList.map(s => s.id);
        const rankConfigs = ${rankConfigsJson};
        const defaultRankingScope = "${defaultRankingScope}";
        const storageKey = "${localStorageKey}";
        let currentCardIndex = 0;
        let currentActiveSheet = 'all';

        function getValue(key, rowId) { 
            const el = document.getElementById('val_' + rowId + '_' + key) || document.getElementById('card_val_' + rowId + '_' + key); 
            if (!el) return 0; 
            const val = el.value; 
            if (val === '') return 0; 
            if (!isNaN(parseFloat(val)) && isFinite(val)) return parseFloat(val); 
            return val; 
        }
        function average(...args) { const validArgs = args.filter(a => typeof a === 'number' && !isNaN(a)); if (validArgs.length === 0) return 0; return validArgs.reduce((a,b)=>a+b,0)/validArgs.length; }
        function terbilang(n) { if (isNaN(n) || n === '') return ''; var num = Math.round(n); var words = ["nol", "satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "delapan", "sembilan", "sepuluh", "sebelas"]; if (num < 0) return "minus " + terbilang(-num); if (num < 12) return words[num]; if (num < 20) return terbilang(num - 10) + " belas"; if (num < 100) return terbilang(Math.floor(num / 10)) + " puluh" + (num % 10 === 0 ? "" : " " + terbilang(num % 10)); if (num < 200) return "seratus" + (num % 100 === 0 ? "" : " " + terbilang(num % 100)); if (num < 1000) return terbilang(Math.floor(num / 100)) + " ratus" + (num % 100 === 0 ? "" : " " + terbilang(num % 100)); return num.toString(); }
        function sum(...args) { return args.reduce((a, b) => a + (typeof b === 'number' && !isNaN(b) ? b : 0), 0); }
        function excelIf(c, t, f) { return c ? t : f; } function excelAnd(...args) { return args.every(Boolean); } function excelOr(...args) { return args.some(Boolean); }

        function calculateRanks() { 
            if (rankConfigs.length === 0) return; 
            rankConfigs.forEach(cfg => { 
                const scope = cfg.scope || defaultRankingScope || 'rombel';
                const groups = {};
                santriList.forEach(s => {
                    let gKey = 'all';
                    if (scope === 'rombel') gKey = 'rombel_' + s.rombelId;
                    else if (scope === 'kelas') gKey = 'kelas_' + s.kelasId;
                    else if (scope === 'jenjang') gKey = 'jenjang_' + s.jenjangId;
                    
                    if (!groups[gKey]) groups[gKey] = [];
                    const el = document.getElementById('val_' + s.id + '_' + cfg.sourceKey) || document.getElementById('card_val_' + s.id + '_' + cfg.sourceKey);
                    const val = el ? parseFloat(el.value) || 0 : 0;
                    groups[gKey].push({ id: s.id, val });
                });

                Object.values(groups).forEach(studentGroup => {
                    const sorted = [...studentGroup].sort((a,b) => b.val - a.val);
                    const rankMap = {};
                    sorted.forEach((item, index) => { rankMap[item.id] = index + 1; });
                    studentGroup.forEach(item => {
                        const targetEl = document.getElementById('val_' + item.id + '_' + cfg.targetKey);
                        const cardTargetEl = document.getElementById('card_val_' + item.id + '_' + cfg.targetKey);
                        const rankVal = (cfg.limit > 0 && rankMap[item.id] > cfg.limit) ? "" : rankMap[item.id];
                        if (targetEl) targetEl.value = rankVal;
                        if (cardTargetEl) cardTargetEl.value = rankVal;
                    });
                });
            }); 
        }

        function calculateRow(rowId) { 
            ${formulaScripts} 
            calculateRanks(); 
        }

        function syncFromTable(rowId, key, val) {
            const cardEl = document.getElementById('card_val_' + rowId + '_' + key);
            if (cardEl) cardEl.value = val;
            calculateRow(rowId);
        }

        function syncFromCard(rowId, key, val) {
            const tableEl = document.getElementById('val_' + rowId + '_' + key);
            if (tableEl) tableEl.value = val;
            calculateRow(rowId);
        }

        function setViewMode(mode) {
            const tableView = document.getElementById('table-view-container');
            const cardView = document.getElementById('card-view-container');
            const btnTable = document.getElementById('btn-mode-table');
            const btnCard = document.getElementById('btn-mode-card');
            if (mode === 'table') {
                if (tableView) tableView.style.display = 'block';
                if (cardView) cardView.style.display = 'none';
                if (btnTable) { btnTable.className = 'bg-white text-teal-900 font-black px-3.5 py-1.5 rounded-lg text-xs shadow-sm'; }
                if (btnCard) { btnCard.className = 'text-white font-semibold px-3.5 py-1.5 rounded-lg text-xs hover:bg-white/15'; }
            } else {
                if (tableView) tableView.style.display = 'none';
                if (cardView) cardView.style.display = 'block';
                if (btnCard) { btnCard.className = 'bg-white text-teal-900 font-black px-3.5 py-1.5 rounded-lg text-xs shadow-sm'; }
                if (btnTable) { btnTable.className = 'text-white font-semibold px-3.5 py-1.5 rounded-lg text-xs hover:bg-white/15'; }
            }
        }

        function filterBySheet(sheetId) {
            currentActiveSheet = sheetId;
            document.querySelectorAll('.sheet-filter-btn').forEach(btn => {
                btn.className = 'sheet-filter-btn px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all bg-white text-slate-700 border border-slate-200 hover:bg-slate-50';
            });
            const activeBtn = document.getElementById('sheet-btn-' + sheetId);
            if (activeBtn) {
                activeBtn.className = 'sheet-filter-btn active px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all bg-teal-700 text-white shadow-xs';
            }

            // In Table View: show/hide columns
            document.querySelectorAll('.table-col-cell').forEach(cell => {
                const sId = cell.getAttribute('data-sheet');
                if (sheetId === 'all' || sId === sheetId) {
                    cell.style.display = '';
                } else {
                    cell.style.display = 'none';
                }
            });

            // In Card View: show/hide field items
            document.querySelectorAll('.card-field-item').forEach(item => {
                const sId = item.getAttribute('data-sheet');
                if (sheetId === 'all' || sId === sheetId) {
                    item.style.display = '';
                } else {
                    item.style.display = 'none';
                }
            });
        }

        let filteredSantriList = [...santriList];
        let currentFilteredIndex = 0;
        let activeFilterKelasId = 0;
        let activeFilterRombelId = 0;
        let searchQuery = "";

        function applyCardFilter() {
            filteredSantriList = santriList.filter(s => {
                if (activeFilterKelasId > 0 && Number(s.kelasId) !== Number(activeFilterKelasId)) return false;
                if (activeFilterRombelId > 0 && Number(s.rombelId) !== Number(activeFilterRombelId)) return false;
                if (searchQuery.trim() !== '') {
                    const q = searchQuery.toLowerCase();
                    const matchName = (s.nama || '').toLowerCase().includes(q);
                    const matchNis = (s.nis || '').toLowerCase().includes(q);
                    if (!matchName && !matchNis) return false;
                }
                return true;
            });

            // Update Rombel options dynamically based on selected Kelas
            const rombelSelect = document.getElementById('card-filter-rombel');
            if (rombelSelect) {
                const currentVal = rombelSelect.value;
                let availableRombels = santriList;
                if (activeFilterKelasId > 0) {
                    availableRombels = availableRombels.filter(s => Number(s.kelasId) === Number(activeFilterKelasId));
                }
                const uniqueRombels = [];
                const seenRombel = new Set();
                availableRombels.forEach(s => {
                    if (s.rombelId && !seenRombel.has(s.rombelId)) {
                        seenRombel.add(s.rombelId);
                        uniqueRombels.push({ id: s.rombelId, nama: s.rombelName });
                    }
                });
                uniqueRombels.sort((a,b) => a.nama.localeCompare(b.nama));
                rombelSelect.innerHTML = '<option value="0">Semua Rombel (' + availableRombels.length + ')</option>' +
                    uniqueRombels.map(r => '<option value="' + r.id + '">' + r.nama + '</option>').join('');
                if (seenRombel.has(Number(currentVal))) {
                    rombelSelect.value = currentVal;
                } else {
                    rombelSelect.value = "0";
                    activeFilterRombelId = 0;
                }
            }

            // Rebuild jump selector
            const jumpSel = document.getElementById('card-jump-select');
            if (jumpSel) {
                if (filteredSantriList.length === 0) {
                    jumpSel.innerHTML = '<option value="-1">⚠️ Tidak ada santri yang cocok</option>';
                } else {
                    jumpSel.innerHTML = filteredSantriList.map((s, idx) => 
                        '<option value="' + idx + '">' + (idx + 1) + '. ' + s.nama + ' (' + s.rombelName + ')</option>'
                    ).join('');
                }
            }

            // Filter Table View rows too
            santriList.forEach(s => {
                const rowEl = document.getElementById('row_santri_' + s.id);
                if (rowEl) {
                    const isMatch = filteredSantriList.some(fs => fs.id === s.id);
                    rowEl.style.display = isMatch ? '' : 'none';
                }
            });

            // Show first card or empty state
            if (filteredSantriList.length > 0) {
                showFilteredCard(0);
            } else {
                santriList.forEach(s => {
                    const el = document.getElementById('card_santri_' + s.id);
                    if (el) el.style.display = 'none';
                });
                const emptyBox = document.getElementById('card-empty-state');
                if (emptyBox) emptyBox.style.display = 'block';
                const progress = document.getElementById('card-progress-text');
                if (progress) progress.innerText = '0 / 0';
                const prevBtn = document.getElementById('card-btn-prev');
                const nextBtn = document.getElementById('card-btn-next');
                if (prevBtn) prevBtn.disabled = true;
                if (nextBtn) nextBtn.disabled = true;
            }
        }

        function onKelasFilterChange(val) {
            activeFilterKelasId = parseInt(val) || 0;
            activeFilterRombelId = 0;
            applyCardFilter();
        }

        function onRombelFilterChange(val) {
            activeFilterRombelId = parseInt(val) || 0;
            applyCardFilter();
        }

        function onSearchChange(val) {
            searchQuery = val || "";
            applyCardFilter();
        }

        function showFilteredCard(idx) {
            if (idx < 0 || idx >= filteredSantriList.length) return;
            currentFilteredIndex = idx;
            const currentSantri = filteredSantriList[idx];

            const emptyBox = document.getElementById('card-empty-state');
            if (emptyBox) emptyBox.style.display = 'none';

            santriList.forEach(s => {
                const el = document.getElementById('card_santri_' + s.id);
                if (el) el.style.display = (s.id === currentSantri.id) ? 'block' : 'none';
            });

            const jumpSel = document.getElementById('card-jump-select');
            if (jumpSel) jumpSel.value = idx;

            const progress = document.getElementById('card-progress-text');
            if (progress) progress.innerText = (idx + 1) + ' / ' + filteredSantriList.length;

            const prevBtn = document.getElementById('card-btn-prev');
            const nextBtn = document.getElementById('card-btn-next');
            if (prevBtn) prevBtn.disabled = (idx === 0);
            if (nextBtn) nextBtn.disabled = (idx === filteredSantriList.length - 1);
        }

        function nextCard() { showFilteredCard(currentFilteredIndex + 1); }
        function prevCard() { showFilteredCard(currentFilteredIndex - 1); }

        function saveDraft() { 
            try { 
                const inputKeys = ${JSON.stringify(inputKeysToSave)}; 
                const draft = { updatedAt: new Date().toISOString(), records: {} }; 
                santriIds.forEach(sid => { 
                    const row = {}; 
                    inputKeys.forEach(key => { 
                        const el = document.getElementById('val_' + sid + '_' + key) || document.getElementById('card_val_' + sid + '_' + key); 
                        if (el && el.value !== '') row[key] = el.value; 
                    }); 
                    draft.records[sid] = row; 
                }); 
                localStorage.setItem(storageKey, JSON.stringify(draft)); 
                alert('✅ Draft nilai berhasil disimpan di perangkat ini!'); 
            } catch (e) { alert('Gagal menyimpan draft: ' + e.message); } 
        }

        function loadDraft() { 
            try { 
                const raw = localStorage.getItem(storageKey); 
                if (!raw) return; 
                const draft = JSON.parse(raw); 
                Object.entries(draft.records || {}).forEach(([sid, row]) => { 
                    Object.entries(row || {}).forEach(([key, val]) => { 
                        const el = document.getElementById('val_' + sid + '_' + key); 
                        const cardEl = document.getElementById('card_val_' + sid + '_' + key); 
                        if (el) el.value = String(val ?? ''); 
                        if (cardEl) cardEl.value = String(val ?? ''); 
                    }); 
                }); 
                santriIds.forEach(id => calculateRow(id)); 
            } catch (e) { console.warn('Draft tidak dapat dimuat', e); } 
        }

        function downloadBackupJson() {
            try {
                const inputKeys = ${JSON.stringify(inputKeysToSave)};
                const records = [];
                santriList.forEach(s => {
                    const santriRecord = { santriId: s.id, santriName: s.nama, data: {} };
                    inputKeys.forEach(key => {
                        const el = document.getElementById('val_' + s.id + '_' + key) || document.getElementById('card_val_' + s.id + '_' + key);
                        if (el && el.value !== "" && el.value !== null) {
                            santriRecord.data[key] = el.value;
                        }
                    });
                    records.push(santriRecord);
                });
                const payload = {
                    meta: {
                        rombelId: ${config.rombelId},
                        rombelName: "${contextName}",
                        templateName: "${config.template.name}",
                        tahunAjaran: "${config.tahunAjaran}",
                        semester: "${config.semester}",
                        templateId: "${config.template.id}",
                        exportedAt: new Date().toISOString()
                    },
                    records
                };
                const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = "backup-nilai-${contextName.replace(/[^a-zA-Z0-9]/g, '-')}.json";
                a.click();
                URL.revokeObjectURL(url);
            } catch(err) {
                alert('Gagal download backup: ' + err.message);
            }
        }

        function showCellHint(el) { 
            const hint = document.getElementById('cell-hint'); 
            if (!hint || !el) return; 
            const mapel = el.getAttribute('data-mapel') || '-'; 
            const santri = el.getAttribute('data-santri') || '-'; 
            hint.innerHTML = '<span class="opacity-75">Mapel:</span> <b>' + mapel + '</b> <span class="opacity-75 ml-2">Santri:</span> <b>' + santri + '</b>'; 
        }

        function submitData() { 
            santriIds.forEach(id => calculateRow(id)); 
            const btn = document.getElementById('submit-btn'); 
            const originalText = btn.innerHTML; 
            btn.disabled = true; 
            btn.innerHTML = '<span class="inline-block animate-spin mr-2">↻</span>Memproses...'; 
            try { 
                const inputKeys = ${JSON.stringify(inputKeysToSave)}; 
                const records = []; 
                santriList.forEach(s => { 
                    const santriRecord = { santriId: s.id, santriName: s.nama, data: {} }; 
                    inputKeys.forEach(key => { 
                        const el = document.getElementById('val_' + s.id + '_' + key) || document.getElementById('card_val_' + s.id + '_' + key); 
                        if(el) { 
                            const val = el.value; 
                            if (val !== "" && val !== null) santriRecord.data[key] = val; 
                        } 
                    }); 
                    records.push(santriRecord); 
                }); 
                const payload = { 
                    meta: { 
                        rombelId: ${config.rombelId}, 
                        rombelName: "${contextName}", 
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

        window.addEventListener('DOMContentLoaded', () => {
            loadDraft();
            if (window.innerWidth < 768) {
                setViewMode('card');
            } else {
                setViewMode('table');
            }
            applyCardFilter();
        });
    </script>
</head>
<body class="bg-slate-100 min-h-screen p-2 md:p-4">
    <div class="max-w-[99%] md:max-w-[98%] mx-auto bg-white shadow-xl rounded-2xl border border-slate-200 overflow-hidden flex flex-col min-h-[92vh]">
        <!-- TOP HEADER BAR -->
        <div class="bg-teal-800 p-4 md:p-5 text-white shrink-0">
            <div class="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                <div>
                    <div class="flex items-center gap-2.5 flex-wrap">
                        <h1 class="text-lg md:text-xl font-black tracking-tight">${config.template.name}</h1>
                        <span class="text-[11px] bg-white/20 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">${config.semester}</span>
                        <span class="text-[11px] bg-teal-900/80 border border-white/20 px-2 py-0.5 rounded-full font-semibold">T.A. ${config.tahunAjaran}</span>
                    </div>
                    <p class="text-xs text-teal-100/90 mt-1 font-medium">
                        <i class="bi bi-building mr-1"></i> ${settings.namaPonpes} &nbsp;|&nbsp; <i class="bi bi-people mr-1"></i> ${contextName}
                    </p>
                    <p class="text-[11px] text-teal-200/80 mt-0.5">
                        <i class="bi bi-trophy mr-1"></i> Cakupan Ranking: <b class="uppercase">${defaultRankingScope}</b>
                        &nbsp;•&nbsp; <i class="bi bi-person-check mr-1"></i> <b>${targetSantri.length}</b> Santri Aktif
                        &nbsp;•&nbsp; <i class="bi bi-input-cursor-text mr-1"></i> <b>${interactiveCells.length}</b> Kolom Nilai
                    </p>
                </div>
                
                <div class="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
                    <!-- Switch View Mode -->
                    <div class="bg-teal-900/90 p-1 rounded-xl flex items-center border border-white/20 shadow-inner">
                        <button id="btn-mode-table" onclick="setViewMode('table')" class="bg-white text-teal-900 font-black px-3.5 py-1.5 rounded-lg text-xs shadow-sm transition-all">
                            <i class="bi bi-table mr-1"></i> Tabel Leger
                        </button>
                        <button id="btn-mode-card" onclick="setViewMode('card')" class="text-white font-semibold px-3.5 py-1.5 rounded-lg text-xs hover:bg-white/15 transition-all">
                            <i class="bi bi-card-text mr-1"></i> Form Kartu
                        </button>
                    </div>

                    <!-- Draft & Action Buttons -->
                    <button onclick="saveDraft()" class="bg-white/15 border border-white/30 text-white px-3 py-2 rounded-xl font-bold text-xs hover:bg-white/25 transition-all flex items-center gap-1.5">
                        <i class="bi bi-save"></i> Simpan Draft
                    </button>
                    <button onclick="downloadBackupJson()" class="bg-white/15 border border-white/30 text-white px-3 py-2 rounded-xl font-bold text-xs hover:bg-white/25 transition-all flex items-center gap-1.5" title="Download file JSON cadangan">
                        <i class="bi bi-download"></i> Backup
                    </button>
                    <button onclick="submitData()" id="submit-btn" class="bg-amber-400 hover:bg-amber-300 text-teal-950 px-4 py-2 rounded-xl font-black text-xs shadow-md transition-all flex items-center gap-2 active:scale-95">
                        <i class="bi bi-send-fill"></i> Kirim Nilai
                    </button>
                </div>
            </div>

            <!-- Hint helper bar -->
            <div id="cell-hint" class="mt-3 pt-2 border-t border-teal-700/60 text-xs font-medium text-teal-100 hidden md:block">
                <i class="bi bi-info-circle mr-1"></i> Klik atau fokus ke salah satu kotak nilai untuk melihat nama santri dan mata pelajaran.
            </div>
        </div>
        
        <!-- TABLE VIEW -->
        <div id="table-view-container" class="flex-grow overflow-auto p-2 bg-slate-50">
            ${sheetTabsToolbarHtml}
            <div class="border border-slate-300 rounded-xl overflow-x-auto shadow-xs bg-white">
                <table class="w-full text-sm border-collapse">
                    <thead class="sticky-header">${theadHtml}</thead>
                    <tbody class="divide-y divide-slate-200">${tbodyHtml}</tbody>
                </table>
            </div>
        </div>

        <!-- CARD / FORM VIEW (Mobile Friendly) -->
        <div id="card-view-container" class="flex-grow overflow-auto p-3 md:p-5 bg-slate-50/70" style="display: none;">
            <!-- Filter Toolbar -->
            ${filterToolbarHtml}

            <!-- Sheet Tabs Toolbar if multi-sheet -->
            ${sheetTabsToolbarHtml}

            <!-- Stepper Navigation Bar -->
            <div class="max-w-3xl mx-auto bg-white p-3 rounded-2xl border border-slate-200 shadow-sm mb-4 flex flex-wrap items-center justify-between gap-3 sticky top-0 z-20">
                <div class="flex items-center gap-2">
                    <button id="card-btn-prev" onclick="prevCard()" class="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs disabled:opacity-40 transition-colors flex items-center gap-1">
                        <i class="bi bi-chevron-left"></i> Sebelumnya
                    </button>
                    <span id="card-progress-text" class="text-xs font-black text-teal-900 bg-teal-50 px-3 py-2 rounded-xl border border-teal-200">1 / ${targetSantri.length}</span>
                    <button id="card-btn-next" onclick="nextCard()" class="px-3.5 py-2 bg-teal-700 hover:bg-teal-800 text-white font-bold rounded-xl text-xs disabled:opacity-40 transition-colors flex items-center gap-1">
                        Berikutnya <i class="bi bi-chevron-right"></i>
                    </button>
                </div>
                <div class="flex-grow max-w-xs">
                    <select id="card-jump-select" onchange="showFilteredCard(parseInt(this.value))" class="w-full border border-slate-200 rounded-xl p-2 text-xs font-bold bg-slate-50 focus:bg-white focus:border-teal-500 outline-none">
                        ${targetSantri.map((s, idx) => `<option value="${idx}">${idx + 1}. ${s.namaLengkap} (${s.nis || '-'})</option>`).join('')}
                    </select>
                </div>
            </div>

            <div class="max-w-3xl mx-auto">
                <!-- Empty state if filter doesn't match -->
                <div id="card-empty-state" class="hidden bg-white p-8 rounded-2xl border-2 border-dashed border-slate-300 text-center text-slate-500">
                    <div class="text-3xl mb-2">🔍</div>
                    <h4 class="font-bold text-slate-800 text-sm mb-1">Tidak ada santri yang cocok</h4>
                    <p class="text-xs text-slate-500">Silakan ubah pilihan filter Kelas / Rombel atau kata kunci pencarian Anda.</p>
                </div>

                ${cardsHtml}
            </div>
        </div>

        <!-- FOOTER -->
        <div class="px-4 py-3 text-center text-[11px] text-slate-500 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-2">
            <span>eSantri Web Rapor • Offline-First Digital Ledger</span>
            <span class="font-semibold text-slate-600">Dibuat dengan eSantri Web by AI Projek</span>
        </div>
    </div>
</body>
</html>`;
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
