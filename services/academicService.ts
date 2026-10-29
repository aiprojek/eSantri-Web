


import { Santri, PondokSettings, RaporRecord, NilaiMapel, RaporTemplate, GridCell, RaporInputMode } from '../types';
import { db } from '../db';
import { getTemplateSheets } from './raporExcelService';
import { classifyRaporInputField } from './raporCalculationService';
import { parseExcelCellCoord, parseExcelRangeCoord } from '../utils/raporFormulaUtils';

// --- HELPER: RESOLVE MASTER CELL IN MERGED GRID ---
const resolveMasterGridCell = (cells: GridCell[][], row: number, col: number): GridCell | null => {
    const direct = cells[row]?.[col];
    if (direct && !direct.hidden) return direct;
    for (let r = 0; r <= row; r++) {
        const rowArr = cells[r];
        if (!rowArr) continue;
        for (let c = 0; c <= col; c++) {
            const candidate = rowArr[c];
            if (!candidate || candidate.hidden) continue;
            const rs = candidate.rowSpan || 1;
            const cs = candidate.colSpan || 1;
            if (r + rs > row && c + cs > col) {
                return candidate;
            }
        }
    }
    return direct || null;
};

// --- HELPER: EXPAND EXCEL CELL & RANGE COORDINATES TO $KEY / INLINE EXPRESSIONS ---
const expandSheetFormulaCoords = (rawExpr: string, sheetCells: GridCell[][], depth = 0): string => {
    let body = (rawExpr || '').trim();
    if (body.startsWith('=')) body = body.substring(1).trim();
    if (!body || depth > 6 || !sheetCells || sheetCells.length === 0) return body;

    const maxRows = sheetCells.length;
    const maxCols = sheetCells.reduce((m, r) => Math.max(m, r ? r.length : 0), 0);

    const cellToExprToken = (r: number, c: number, forRange = false): string | null => {
        const master = resolveMasterGridCell(sheetCells, r, c);
        if (!master) return forRange ? null : '0';

        const trimmedKey = master.key?.trim();
        if (trimmedKey && (master.type === 'input' || master.type === 'dropdown' || master.type === 'formula')) {
            return `$${trimmedKey}`;
        }

        if (master.type === 'formula' && master.value) {
            const inner = expandSheetFormulaCoords(master.value, sheetCells, depth + 1);
            return inner ? `(${inner})` : '0';
        }

        const rawVal = (master.value ?? '').trim();
        if (!rawVal) return forRange ? null : '0';
        if (/^\$[A-Za-z0-9_]+$/.test(rawVal)) return rawVal;

        const normalizedNum = rawVal.replace(',', '.');
        if (/^-?\d+(\.\d+)?$/.test(normalizedNum)) {
            return normalizedNum;
        }

        return forRange ? null : JSON.stringify(rawVal);
    };

    // Split outside string literals so quoted text is untouched
    const segments = body.split(/("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/g);
    return segments.map((seg, idx) => {
        if (idx % 2 === 1) return seg; // quoted string literal

        // 1. Expand range coordinates like D6:D15 or $D$6:$D$15
        let processed = seg.replace(/\$?[A-Za-z]{1,2}\$?\d{1,3}\s*:\s*\$?[A-Za-z]{1,2}\$?\d{1,3}/g, (match) => {
            const range = parseExcelRangeCoord(match);
            if (!range) return match;
            const tokens: string[] = [];
            const seenMasters = new Set<string>();
            for (let r = range.rMin; r <= Math.min(range.rMax, maxRows - 1); r++) {
                for (let c = range.cMin; c <= Math.min(range.cMax, maxCols - 1); c++) {
                    const master = resolveMasterGridCell(sheetCells, r, c);
                    if (!master) continue;
                    const mId = `${master.row}_${master.col}`;
                    if (seenMasters.has(mId)) continue;
                    seenMasters.add(mId);
                    const tok = cellToExprToken(r, c, true);
                    if (tok !== null) tokens.push(tok);
                }
            }
            return tokens.length > 0 ? tokens.join(', ') : '0';
        });

        // 2. Expand single cell coordinates like D6, $D$6, $D6, D$6
        processed = processed.replace(/(?<![A-Za-z0-9_$])(\$?[A-Za-z]{1,2}\$?\d{1,3})(?![A-Za-z0-9_(])/g, (match) => {
            const coord = parseExcelCellCoord(match);
            if (!coord) return match;
            if (coord.r >= maxRows || coord.c >= maxCols) return match;
            return cellToExprToken(coord.r, coord.c, false) ?? '0';
        });

        return processed;
    }).join('');
};

// --- HELPER: SPLIT TOP-LEVEL FORMULA ARGUMENTS ---
const splitTopLevelArgs = (inner: string): string[] => {
    const args: string[] = [];
    let current = '';
    let depth = 0;
    let quote: string | null = null;
    for (let i = 0; i < inner.length; i++) {
        const ch = inner[i];
        if (quote) {
            current += ch;
            if (ch === quote && inner[i - 1] !== '\\') quote = null;
            continue;
        }
        if (ch === '"' || ch === "'") {
            quote = ch;
            current += ch;
            continue;
        }
        if (ch === '(') { depth++; current += ch; continue; }
        if (ch === ')') { depth = Math.max(0, depth - 1); current += ch; continue; }
        if ((ch === ',' || ch === ';') && depth === 0) {
            args.push(current.trim());
            current = '';
            continue;
        }
        current += ch;
    }
    if (current.trim() !== '') args.push(current.trim());
    return args;
};

// --- HELPER: CONVERT EXCEL SYNTAX TO JS ---
const convertFormulaToJs = (expression: string): string => {
    let raw = (expression || '').trim();
    if (raw.startsWith('=')) {
        raw = raw.substring(1).trim();
    }

    const segments = raw.split(/("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/g);
    return segments.map((seg, idx) => {
        if (idx % 2 === 1) return seg; // preserve string literals

        let js = seg;
        // Support Indonesian semicolon argument separator
        js = js.replace(/;/g, ',');
        // Excel comparison operators
        js = js.replace(/<>/g, '!=');
        js = js.replace(/(?<![<>!=])=(?!=)/g, '==');
        // Excel string concatenation operator &
        js = js.replace(/(?<!&)&(?!&)/g, " + '' + ");

        // Replace $KEY with function call
        js = js.replace(/\$([a-zA-Z0-9_]+)\b/g, "getValue('$1', rowId)");

        // Numeric & Aggregation Functions
        js = js.replace(/\b(?:RATA2|AVERAGE|AVG|RERATA)\s*\(/gi, 'average(');
        js = js.replace(/\b(?:SUM|JUMLAH|TOTAL)\s*\(/gi, 'sum(');
        js = js.replace(/\bMIN\s*\(/gi, 'excelMin(');
        js = js.replace(/\bMAX\s*\(/gi, 'excelMax(');

        // Rounding & Precision Functions
        js = js.replace(/\b(?:ROUNDUP|BULAT_ATAS)\s*\(/gi, 'excelRoundUp(');
        js = js.replace(/\b(?:ROUNDDOWN|BULAT_BAWAH)\s*\(/gi, 'excelRoundDown(');
        js = js.replace(/\b(?:ROUND|BULAT)\s*\(/gi, 'excelRound(');
        js = js.replace(/\bINT\s*\(/gi, 'Math.floor(');
        js = js.replace(/\b(?:FIXED|DESIMAL)\s*\(/gi, 'excelFixed(');

        // Logic Functions
        js = js.replace(/\b(?:IF|JIKA)\s*\(/gi, 'excelIf(');
        js = js.replace(/\b(?:AND|DAN)\s*\(/gi, 'excelAnd(');
        js = js.replace(/\b(?:OR|ATAU)\s*\(/gi, 'excelOr(');
        js = js.replace(/\b(?:NOT|TIDAK)\s*\(/gi, 'excelNot(');

        // Predikat, Terbilang, Arabic & Text Functions
        js = js.replace(/\b(?:PREDIKAT|HURUF|TAQDIR)\s*\(/gi, 'excelPredikat(');
        js = js.replace(/\bTERBILANG\s*\(/gi, 'terbilang(');
        js = js.replace(/\b(?:ARAB|ANGKA_ARAB)\s*\(/gi, 'angkaKeArab(');
        js = js.replace(/\b(?:CONCATENATE|CONCAT|GABUNG)\s*\(/gi, 'excelConcat(');
        js = js.replace(/\b(?:UPPER|BESAR|KAPITAL)\s*\(/gi, 'excelUpper(');
        js = js.replace(/\b(?:LOWER|KECIL)\s*\(/gi, 'excelLower(');

        // Prevent inline nested RANK crash in row context
        js = js.replace(/\b(?:RANK|PERINGKAT)\s*\(/gi, '0 * (');

        return js;
    }).join('');
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
    tabMode?: 'per_rombel' | 'per_jenjang' | 'per_file';
}

export interface RankConfig {
    targetKey: string;
    sourceJs: string;
    limit: number;
    scope: 'rombel' | 'kelas' | 'jenjang' | 'global';
}

export interface FormInteractiveCell {
    key: string;
    label: string;
    type: 'input' | 'formula' | 'dropdown';
    inputMode?: RaporInputMode;
    options?: string[];
    sheetId: string;
    sheetName: string;
    formulaValue?: string;
    formulaJs?: string;
    decimalPlaces?: number;
    kind?: 'score' | 'attendance' | 'note' | 'short_text' | 'dropdown';
    isNumericScore?: boolean;
    isLongText?: boolean;
    isAttendanceCount?: boolean;
    kkm?: number;
    row: number;
    col: number;
}

export interface CompiledTemplateSchema {
    sheets: { id: string; name: string }[];
    interactiveCells: FormInteractiveCell[];
    formulaCells: FormInteractiveCell[];
    rankConfigs: RankConfig[];
}

export const compileTemplateInteractiveSchema = (
    template: RaporTemplate,
    settings: PondokSettings,
    sheetId: string = 'all',
    defaultRankingScope: 'rombel' | 'kelas' | 'jenjang' | 'global' = 'rombel'
): CompiledTemplateSchema => {
    const allSheets = getTemplateSheets(template);
    const targetSheets = sheetId && sheetId !== 'all'
        ? allSheets.filter(s => s.id === sheetId)
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

                        let label = trimmedKey;
                        const labelCellLeft = [...rowCells]
                            .reverse()
                            .find(ch => ch && ch.col < cell.col && ch.type === 'label' && ch.value && ch.value.trim() !== '' && !ch.value.startsWith('$'));

                        if (labelCellLeft) {
                            label = labelCellLeft.value.trim();
                        } else if (cell.value && cell.value.trim() !== '' && !cell.value.startsWith('$') && cell.type !== 'formula') {
                            label = cell.value.trim();
                        }

                        const expandedFormula = cell.type === 'formula' && cell.value
                            ? expandSheetFormulaCoords(cell.value, sheet.cells)
                            : cell.value;

                        const classification = cell.type !== 'formula'
                            ? classifyRaporInputField({
                                key: trimmedKey,
                                label: label || trimmedKey,
                                type: cell.type,
                                inputMode: cell.inputMode,
                                mataPelajaran: settings.mataPelajaran || [],
                                jenjangId: template.jenjangId
                            })
                            : undefined;

                        const formCell: FormInteractiveCell = {
                            key: trimmedKey,
                            label: label || trimmedKey,
                            type: cell.type,
                            inputMode: cell.inputMode,
                            options: cell.options,
                            sheetId: sheet.id,
                            sheetName: sheet.name || 'Lembar 1',
                            formulaValue: expandedFormula,
                            formulaJs: cell.type === 'formula' && expandedFormula ? convertFormulaToJs(expandedFormula) : undefined,
                            decimalPlaces: cell.decimalPlaces,
                            kind: classification?.kind,
                            isNumericScore: classification?.isNumericScore,
                            isLongText: classification?.isLongText,
                            isAttendanceCount: classification?.isAttendanceCount,
                            kkm: classification?.kkm,
                            row: r,
                            col: c
                        };

                        interactiveCells.push(formCell);

                        if (cell.type === 'formula' && expandedFormula) {
                            const topRankMatch = expandedFormula.trim().match(/^(?:RANK|PERINGKAT)\s*\(([\s\S]*)\)$/i);
                            if (topRankMatch) {
                                const rankArgs = splitTopLevelArgs(topRankMatch[1]);
                                const sourceExpr = rankArgs[0] || '0';
                                let scope: 'rombel' | 'kelas' | 'jenjang' | 'global' = defaultRankingScope;
                                let limit = 0;

                                const checkParam = (rawParam: string | undefined) => {
                                    if (!rawParam) return;
                                    const cleaned = rawParam.trim().replace(/^["']|["']$/g, '').trim().toLowerCase();
                                    if (!cleaned) return;
                                    if (/^\d+$/.test(cleaned)) {
                                        limit = parseInt(cleaned, 10);
                                    } else if (cleaned === 'rombel') {
                                        scope = 'rombel';
                                    } else if (cleaned === 'kelas' || cleaned === 'tingkat' || cleaned === 'paralel') {
                                        scope = 'kelas';
                                    } else if (cleaned === 'jenjang' || cleaned === 'marhalah') {
                                        scope = 'jenjang';
                                    } else if (cleaned === 'global' || cleaned === 'pondok' || cleaned === 'all') {
                                        scope = 'global';
                                    }
                                };
                                checkParam(rankArgs[1]);
                                checkParam(rankArgs[2]);

                                rankConfigs.push({
                                    targetKey: trimmedKey,
                                    sourceJs: convertFormulaToJs(sourceExpr),
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

    return {
        sheets: targetSheets.map(s => ({ id: s.id, name: s.name || 'Lembar' })),
        interactiveCells,
        formulaCells,
        rankConfigs
    };
};

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

    // 3. Extract sheets and interactive cells via shared compiler
    const compiledSchema = compileTemplateInteractiveSchema(
        config.template,
        settings,
        config.sheetId || 'all',
        defaultRankingScope
    );
    const targetSheets = compiledSchema.sheets;
    const interactiveCells = compiledSchema.interactiveCells;
    const formulaCells = compiledSchema.formulaCells;
    const rankConfigs = compiledSchema.rankConfigs;

    const formulaScripts = formulaCells.map(c => {
        const jsExpression = convertFormulaToJs(c.formulaValue || '');
        const decLiteral = c.decimalPlaces !== undefined && c.decimalPlaces !== null ? c.decimalPlaces : 'null';
        return `
        try {
            const val = ${jsExpression};
            const field = document.getElementById('val_' + rowId + '_${c.key}');
            const cardField = document.getElementById('card_val_' + rowId + '_${c.key}');
            const formatted = formatFormulaOutput(val, ${decLiteral});
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
    const inputOnlyKeys = interactiveCells.filter(c => c.type !== 'formula').map(c => c.key);
    const columnLabelsMap: Record<string, string> = {};
    interactiveCells.forEach(c => {
        columnLabelsMap[c.key] = c.label || c.key;
    });
    const effectiveTabMode = config.tabMode || 'per_rombel';
    const scriptUrl = (config.googleScriptUrl || '').trim();
    const waDest = config.waDestination ? config.waDestination.replace(/^0/, '62').replace(/[^0-9]/g, '') : '';
    const santriMetaArray = targetSantri.map(s => {
        const rombelObj = settings.rombel.find(r => Number(r.id) === Number(s.rombelId));
        const kelasObj = settings.kelas.find(k => Number(k.id) === Number(s.kelasId)) || (rombelObj ? settings.kelas.find(k => Number(k.id) === Number(rombelObj.kelasId)) : null);
        const jenjangIdResolved = s.jenjangId || (kelasObj ? kelasObj.jenjangId : 0);
        const jenjangObj = settings.jenjang.find(j => Number(j.id) === Number(jenjangIdResolved));
        return {
            id: s.id,
            nama: s.namaLengkap,
            nis: s.nis || '',
            rombelId: s.rombelId || 0,
            rombelName: rombelObj?.nama || 'Tanpa Rombel',
            kelasId: s.kelasId || (kelasObj ? kelasObj.id : 0),
            kelasName: kelasObj?.nama || 'Tanpa Kelas',
            jenjangId: jenjangIdResolved,
            jenjangName: jenjangObj?.nama || ''
        };
    });
    const rankConfigsScript = `[${rankConfigs.map(rc => `{
        targetKey: ${JSON.stringify(rc.targetKey)},
        evalSource: function(rowId) { try { const v = (${rc.sourceJs}); return typeof v === 'number' && !isNaN(v) ? v : (parseFloat(v) || 0); } catch(e) { return 0; } },
        limit: ${rc.limit},
        scope: ${JSON.stringify(rc.scope)}
    }`).join(',')}]`;
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
            
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(message).then(() => {
                    const waUrl = "${waDest}" ? 'https://wa.me/${waDest}' : 'https://wa.me/';
                    showFormToast("Kode nilai berhasil disalin ke Clipboard! Silakan tempel (Paste) pada chat WhatsApp.", "success", waUrl);
                    const a = document.createElement('a'); a.href = waUrl; a.target = '_blank'; a.rel = 'noopener noreferrer'; a.click();
                    btn.disabled = false; btn.innerHTML = originalText;
                }).catch(() => {
                    const waUrl = ("${waDest}" ? 'https://wa.me/${waDest}?text=' : 'https://wa.me/?text=') + encodeURIComponent(message);
                    showFormToast("Membuka WhatsApp untuk pengiriman data nilai...", "info", waUrl);
                    const a = document.createElement('a'); a.href = waUrl; a.target = '_blank'; a.rel = 'noopener noreferrer'; a.click();
                    btn.disabled = false; btn.innerHTML = originalText;
                });
            } else {
                const waUrl = ("${waDest}" ? 'https://wa.me/${waDest}?text=' : 'https://wa.me/?text=') + encodeURIComponent(message);
                showFormToast("Membuka WhatsApp untuk pengiriman data nilai...", "info", waUrl);
                const a = document.createElement('a'); a.href = waUrl; a.target = '_blank'; a.rel = 'noopener noreferrer'; a.click();
                btn.disabled = false; btn.innerHTML = originalText;
            }
        `;
    } else {
        submissionScript = `
            fetch("${scriptUrl}", { 
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify(payload) 
            })
            .then(async (res) => {
                 if (!res.ok) throw new Error('HTTP ' + res.status);
                 let respJson = null;
                 try {
                     const rawText = await res.text();
                     if (rawText) respJson = JSON.parse(rawText);
                 } catch (_) {}
                 if (respJson && respJson.result === 'error') {
                     throw new Error(respJson.error || 'Terjadi kendala pada Google Apps Script');
                 }
                 records.forEach(r => {
                     if (Array.isArray(r.clearedKeys) && loadedBaselineBySantri[r.santriId]) {
                         r.clearedKeys.forEach(ck => { delete loadedBaselineBySantri[r.santriId][ck]; });
                     }
                     Object.entries(r.data || {}).forEach(([dk, dv]) => {
                         if (inputOnlySet.has(dk)) markLoadedBaseline(r.santriId, dk, dv);
                     });
                 });
                 ${config.submissionMethod === 'google_sheet' ? `showFormToast('Data nilai berhasil dikirim ke Cloud Spreadsheet!', 'success'); btn.disabled = false; btn.innerHTML = originalText;` : `
                    const jsonString = JSON.stringify(payload);
                    const encoded = btoa(unescape(encodeURIComponent(jsonString)));
                    let message = "*Setoran Data Rapor (Hybrid)*\\nKelas: ${contextName}\\nStatus: Terupload ke Cloud\\n\\n*BACKUP DATA:*\\nRAPOR_V2_START\\n" + encoded + "\\nRAPOR_V2_END";
                    if (navigator.clipboard && navigator.clipboard.writeText) {
                        navigator.clipboard.writeText(message).then(() => {
                            const waUrl = "${waDest}" ? 'https://wa.me/${waDest}' : 'https://wa.me/';
                            showFormToast("Terkirim ke Cloud & disalin ke Clipboard! Silakan tempel di WhatsApp sebagai cadangan.", "success", waUrl);
                            const a = document.createElement('a'); a.href = waUrl; a.target = '_blank'; a.rel = 'noopener noreferrer'; a.click();
                            btn.disabled = false; btn.innerHTML = originalText;
                        }).catch(() => {
                            const waUrl = ("${waDest}" ? 'https://wa.me/${waDest}?text=' : 'https://wa.me/?text=') + encodeURIComponent(message);
                            showFormToast("Terkirim ke Cloud! Klik tombol WhatsApp jika belum terbuka otomatis.", "success", waUrl);
                            const a = document.createElement('a'); a.href = waUrl; a.target = '_blank'; a.rel = 'noopener noreferrer'; a.click();
                            btn.disabled = false; btn.innerHTML = originalText;
                        });
                    } else {
                        const waUrl = ("${waDest}" ? 'https://wa.me/${waDest}?text=' : 'https://wa.me/?text=') + encodeURIComponent(message);
                        showFormToast("Terkirim ke Cloud! Membuka WhatsApp...", "success", waUrl);
                        const a = document.createElement('a'); a.href = waUrl; a.target = '_blank'; a.rel = 'noopener noreferrer'; a.click();
                        btn.disabled = false; btn.innerHTML = originalText;
                    }
                 `}
            }).catch(err => { 
                showFormToast('Gagal mengirim ke Cloud. Pastikan URL Script benar & internet aktif (' + err + ')', 'error'); 
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
        const rankConfigs = ${rankConfigsScript};
        const defaultRankingScope = "${defaultRankingScope}";
        const storageKey = "${localStorageKey}";
        let currentCardIndex = 0;
        let currentActiveSheet = 'all';
        let toastTimer = null;
        const loadedBaselineBySantri = {};
        function markLoadedBaseline(sid, key, val) {
            if (val !== '' && val !== null && val !== undefined) {
                if (!loadedBaselineBySantri[sid]) loadedBaselineBySantri[sid] = {};
                loadedBaselineBySantri[sid][key] = true;
            }
        }

        function showFormToast(msg, type = 'success', actionUrl = '') {
            const box = document.getElementById('form-toast');
            const textEl = document.getElementById('form-toast-text');
            const linkEl = document.getElementById('form-toast-link');
            if (!box || !textEl) return;
            if (toastTimer) clearTimeout(toastTimer);
            textEl.textContent = msg;
            box.className = 'fixed bottom-5 right-5 z-50 max-w-md px-4 py-3 rounded-2xl shadow-2xl border text-xs font-bold flex items-center gap-3 transition-all ' +
                (type === 'error'
                    ? 'bg-rose-900 text-white border-rose-700'
                    : type === 'info'
                    ? 'bg-slate-900 text-white border-slate-700'
                    : 'bg-teal-900 text-white border-teal-700');
            if (linkEl) {
                if (actionUrl) {
                    linkEl.href = actionUrl;
                    linkEl.style.display = 'inline-flex';
                } else {
                    linkEl.style.display = 'none';
                }
            }
            box.style.display = 'flex';
            toastTimer = setTimeout(() => {
                box.style.display = 'none';
            }, actionUrl ? 9000 : 4500);
        }

        function getValue(key, rowId) { 
            const el = document.getElementById('val_' + rowId + '_' + key) || document.getElementById('card_val_' + rowId + '_' + key); 
            if (!el) return 0; 
            const raw = String(el.value ?? '').trim(); 
            if (raw === '') return 0; 
            const normalized = raw.indexOf(',') !== -1 && raw.indexOf('.') === -1 ? raw.replace(',', '.') : raw;
            if (!isNaN(Number(normalized)) && normalized !== '') return Number(normalized); 
            return raw; 
        }
        function average(...args) { const validArgs = args.filter(a => typeof a === 'number' && !isNaN(a)); if (validArgs.length === 0) return 0; return validArgs.reduce((a,b)=>a+b,0)/validArgs.length; }
        function sum(...args) { return args.reduce((a, b) => a + (typeof b === 'number' && !isNaN(b) ? b : 0), 0); }
        function excelMin(...args) { const valid = args.filter(a => typeof a === 'number' && !isNaN(a)); return valid.length === 0 ? 0 : Math.min(...valid); }
        function excelMax(...args) { const valid = args.filter(a => typeof a === 'number' && !isNaN(a)); return valid.length === 0 ? 0 : Math.max(...valid); }
        function excelRound(num, digits = 0) {
            const n = Number(num);
            const d = Math.max(0, Math.min(10, Math.trunc(Number(digits) || 0)));
            if (!isFinite(n)) return 0;
            const factor = Math.pow(10, d);
            const rounded = Math.floor(Math.abs(n) * factor + 0.5 + 1e-12) / factor;
            return n < 0 ? -rounded : rounded;
        }
        function excelRoundUp(num, digits = 0) {
            const n = Number(num);
            const d = Math.max(0, Math.min(10, Math.trunc(Number(digits) || 0)));
            if (!isFinite(n)) return 0;
            const factor = Math.pow(10, d);
            const ceiled = Math.ceil(Math.abs(n) * factor - 1e-12) / factor;
            return n < 0 ? -ceiled : ceiled;
        }
        function excelRoundDown(num, digits = 0) {
            const n = Number(num);
            const d = Math.max(0, Math.min(10, Math.trunc(Number(digits) || 0)));
            if (!isFinite(n)) return 0;
            const factor = Math.pow(10, d);
            const floored = Math.floor(Math.abs(n) * factor + 1e-12) / factor;
            return n < 0 ? -floored : floored;
        }
        function excelFixed(num, digits = 2) {
            const n = Number(num);
            const d = Math.max(0, Math.min(6, Math.trunc(Number(digits ?? 2))));
            if (!isFinite(n)) return (0).toFixed(d);
            return excelRound(n, d).toFixed(d);
        }
        function formatFormulaOutput(val, decimalPlaces) {
            if (typeof val === 'string') return val;
            if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
            const n = Number(val);
            if (val === null || val === undefined || isNaN(n) || !isFinite(n)) return '-';
            if (decimalPlaces !== null && decimalPlaces !== undefined) {
                const d = Math.max(0, Math.min(6, Number(decimalPlaces)));
                return excelRound(n, d).toFixed(d);
            }
            const r2 = excelRound(n, 2);
            return Number.isInteger(r2) ? String(r2) : String(Number(r2.toFixed(2)));
        }
        function excelPredikat(score, mode = 'huruf') {
            const n = Number(score);
            if (isNaN(n) || !isFinite(n)) return '-';
            const m = String(mode || 'huruf').toLowerCase().trim();
            const tier = n >= 90 ? 0 : n >= 80 ? 1 : n >= 70 ? 2 : n >= 60 ? 3 : 4;
            if (m === 'indo' || m === 'indonesia' || m === 'deskripsi') {
                return ['Sangat Baik', 'Baik', 'Cukup', 'Kurang', 'Sangat Kurang'][tier];
            }
            if (m === 'taqdir' || m === 'arab_latin' || m === 'latin') {
                return ['Mumtaz', 'Jayyid Jiddan', 'Jayyid', 'Maqbul', 'Rasib'][tier];
            }
            if (m === 'arab') {
                return ['ممتاز', 'جيد جدا', 'جيد', 'مقبول', 'راسب'][tier];
            }
            return ['A', 'B', 'C', 'D', 'E'][tier];
        }
        function angkaKeArab(val) {
            if (val === null || val === undefined || val === '') return '';
            const digits = ['٠','١','٢','٣','٤','٥','٦','٧','٨','٩'];
            const s = String(val);
            let out = '';
            for (let i = 0; i < s.length; i++) {
                const ch = s[i];
                const code = ch.charCodeAt(0);
                if (code >= 48 && code <= 57) {
                    out += digits[code - 48];
                } else if ((ch === '.' || ch === ',') && i > 0 && i < s.length - 1) {
                    const prev = s.charCodeAt(i - 1);
                    const next = s.charCodeAt(i + 1);
                    if (prev >= 48 && prev <= 57 && next >= 48 && next <= 57) {
                        out += '٫';
                    } else {
                        out += ch;
                    }
                } else {
                    out += ch;
                }
            }
            return out;
        }
        function terbilang(n) { if (isNaN(n) || n === '') return ''; var num = Math.round(Number(n)); var words = ["nol", "satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "delapan", "sembilan", "sepuluh", "sebelas"]; if (num < 0) return "minus " + terbilang(-num); if (num < 12) return words[num]; if (num < 20) return terbilang(num - 10) + " belas"; if (num < 100) return terbilang(Math.floor(num / 10)) + " puluh" + (num % 10 === 0 ? "" : " " + terbilang(num % 10)); if (num < 200) return "seratus" + (num % 100 === 0 ? "" : " " + terbilang(num % 100)); if (num < 1000) return terbilang(Math.floor(num / 100)) + " ratus" + (num % 100 === 0 ? "" : " " + terbilang(num % 100)); return num.toString(); }
        function excelIf(c, t, f) { return c ? t : f; }
        function excelAnd(...args) { return args.every(Boolean); }
        function excelOr(...args) { return args.some(Boolean); }
        function excelNot(v) { return !Boolean(v); }
        function excelConcat(...args) { return args.map(a => (a === null || a === undefined) ? '' : String(a)).join(''); }
        function excelUpper(v) { return String(v ?? '').toUpperCase(); }
        function excelLower(v) { return String(v ?? '').toLowerCase(); }

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
                    const val = typeof cfg.evalSource === 'function' ? cfg.evalSource(s.id) : 0;
                    groups[gKey].push({ id: s.id, val });
                });

                Object.values(groups).forEach(studentGroup => {
                    const sorted = [...studentGroup].sort((a,b) => b.val - a.val);
                    const rankMap = {};
                    sorted.forEach((item, index) => {
                        if (index > 0 && Math.abs(item.val - sorted[index - 1].val) < 1e-9) {
                            rankMap[item.id] = rankMap[sorted[index - 1].id];
                        } else {
                            rankMap[item.id] = index + 1;
                        }
                    });
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

        function runRowFormulasOnce(rowId) {
            ${formulaScripts}
        }

        function calculateRow(rowId) { 
            // 2-pass evaluation so chained formula cells (e.g. RATA_RATA -> PREDIKAT) stay synchronized
            runRowFormulasOnce(rowId);
            runRowFormulasOnce(rowId);
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
                showFormToast('Draft nilai berhasil disimpan di perangkat ini.', 'success'); 
            } catch (e) { showFormToast('Gagal menyimpan draft: ' + e.message, 'error'); } 
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
                        const strVal = String(val ?? '');
                        if (el) el.value = strVal; 
                        if (cardEl) cardEl.value = strVal; 
                        markLoadedBaseline(sid, key, strVal);
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
                showFormToast('File cadangan JSON berhasil diunduh.', 'success');
            } catch(err) {
                showFormToast('Gagal mengunduh cadangan: ' + err.message, 'error');
            }
        }

        function showCellHint(el) { 
            const hint = document.getElementById('cell-hint'); 
            if (!hint || !el) return; 
            const mapel = el.getAttribute('data-mapel') || '-'; 
            const santri = el.getAttribute('data-santri') || '-'; 
            hint.innerHTML = '<span class="opacity-75">Mapel:</span> <b>' + mapel + '</b> <span class="opacity-75 ml-2">Santri:</span> <b>' + santri + '</b>'; 
        }

        async function loadFromCloudGas() {
            const url = ${JSON.stringify(scriptUrl)};
            if (!url) return;
            const btn = document.getElementById('cloud-pull-btn');
            const origHtml = btn ? btn.innerHTML : '';
            if (btn) {
                btn.disabled = true;
                btn.innerHTML = '<span class="inline-block animate-spin mr-1">↻</span>Memuat...';
            }
            try {
                const res = await fetch(url, { method: 'GET' });
                if (!res.ok) throw new Error('HTTP ' + res.status);
                const raw = await res.json();
                const rows = Array.isArray(raw) ? raw : (raw && Array.isArray(raw.records) ? raw.records : []);
                const inputOnlySet = new Set(${JSON.stringify(inputOnlyKeys)});
                const targetTahun = ${JSON.stringify(config.tahunAjaran)};
                const targetSemester = ${JSON.stringify(config.semester)};
                const targetTemplateId = ${JSON.stringify(config.template.id)};
                let appliedCount = 0;

                rows.forEach(item => {
                    if (item.TahunAjaran && String(item.TahunAjaran) !== targetTahun) return;
                    if (item.Semester && String(item.Semester) !== targetSemester) return;
                    if (item.TemplateID && String(item.TemplateID) !== targetTemplateId) return;
                    const sid = Number(item.SantriID);
                    if (!sid || !santriIds.includes(sid)) return;
                    let parsed = {};
                    try {
                        parsed = typeof item.DataJSON === 'string' ? JSON.parse(item.DataJSON) : (item.DataJSON || {});
                    } catch(err) { parsed = {}; }
                    let touched = false;
                    Object.entries(parsed).forEach(([k, val]) => {
                        if (!inputOnlySet.has(k)) return;
                        if (val === '' || val === null || val === undefined) return;
                        const el = document.getElementById('val_' + sid + '_' + k);
                        const cardEl = document.getElementById('card_val_' + sid + '_' + k);
                        const strVal = String(val);
                        if (el) el.value = strVal;
                        if (cardEl) cardEl.value = strVal;
                        markLoadedBaseline(sid, k, strVal);
                        touched = true;
                    });
                    if (touched) appliedCount++;
                });

                santriIds.forEach(id => calculateRow(id));
                if (appliedCount > 0) {
                    showFormToast('Berhasil memuat nilai terbaru dari Cloud untuk ' + appliedCount + ' santri.', 'success');
                } else {
                    showFormToast('Belum ada nilai tersimpan di Cloud untuk periode & template ini.', 'info');
                }
            } catch (err) {
                showFormToast('Gagal memuat dari Cloud: ' + err.message, 'error');
            } finally {
                if (btn) {
                    btn.disabled = false;
                    btn.innerHTML = origHtml;
                }
            }
        }

        function submitData() { 
            santriIds.forEach(id => calculateRow(id)); 
            const btn = document.getElementById('submit-btn'); 
            const originalText = btn.innerHTML; 
            btn.disabled = true; 
            btn.innerHTML = '<span class="inline-block animate-spin mr-2">↻</span>Memproses...'; 
            try { 
                const inputKeys = ${JSON.stringify(inputKeysToSave)}; 
                const inputOnlySet = new Set(${JSON.stringify(inputOnlyKeys)});
                const columnLabels = ${JSON.stringify(columnLabelsMap)};
                const records = []; 
                santriList.forEach(s => { 
                    const baselineForSantri = loadedBaselineBySantri[s.id] || {};
                    const clearedKeys = [];
                    Array.from(inputOnlySet).forEach(key => {
                        const el = document.getElementById('val_' + s.id + '_' + key) || document.getElementById('card_val_' + s.id + '_' + key);
                        const val = el ? String(el.value ?? '').trim() : '';
                        if (val === '' && baselineForSantri[key]) {
                            clearedKeys.push(key);
                        }
                    });

                    const hasUserScore = Array.from(inputOnlySet).some(key => {
                        const el = document.getElementById('val_' + s.id + '_' + key) || document.getElementById('card_val_' + s.id + '_' + key);
                        return el && String(el.value ?? '').trim() !== '';
                    });
                    if (!hasUserScore && clearedKeys.length === 0) return;

                    const santriRecord = {
                        santriId: s.id,
                        nis: s.nis || '',
                        santriName: s.nama,
                        rombelId: s.rombelId || 0,
                        rombelName: s.rombelName || '',
                        kelasId: s.kelasId || 0,
                        kelasName: s.kelasName || '',
                        jenjangId: s.jenjangId || 0,
                        jenjangName: s.jenjangName || '',
                        data: {},
                        ...(clearedKeys.length > 0 ? { clearedKeys } : {})
                    }; 
                    if (hasUserScore) {
                        inputKeys.forEach(key => { 
                            const el = document.getElementById('val_' + s.id + '_' + key) || document.getElementById('card_val_' + s.id + '_' + key); 
                            if(el) { 
                                const val = String(el.value ?? '').trim(); 
                                if (!inputOnlySet.has(key) && val === '-') return;
                                if (val !== "" && val !== null) santriRecord.data[key] = val; 
                            } 
                        }); 
                    }
                    if (Object.keys(santriRecord.data).length > 0 || clearedKeys.length > 0) {
                        records.push(santriRecord);
                    }
                }); 
                if (records.length === 0) {
                    showFormToast("Belum ada nilai santri yang diisi untuk dikirim.", "error");
                    btn.disabled = false;
                    btn.innerHTML = originalText;
                    return;
                }
                const payload = { 
                    meta: { 
                        rombelId: ${config.rombelId}, 
                        rombelName: ${JSON.stringify(contextName)}, 
                        templateName: ${JSON.stringify(config.template.name)}, 
                        tahunAjaran: ${JSON.stringify(config.tahunAjaran)}, 
                        semester: ${JSON.stringify(config.semester)}, 
                        templateId: ${JSON.stringify(config.template.id)}, 
                        tabMode: ${JSON.stringify(effectiveTabMode)},
                        columnLabels: columnLabels,
                        timestamp: new Date().toISOString() 
                    }, 
                    records: records 
                }; 
                ${submissionScript} 
            } catch (e) { 
                showFormToast("Terjadi kesalahan: " + e.message, "error"); 
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

                    ${scriptUrl && config.submissionMethod !== 'whatsapp' ? `
                    <button id="cloud-pull-btn" onclick="loadFromCloudGas()" class="bg-white/15 border border-white/30 text-white px-3 py-2 rounded-xl font-bold text-xs hover:bg-white/25 transition-all flex items-center gap-1.5" title="Tarik data nilai terakhir yang sudah masuk di Cloud Spreadsheet">
                        <i class="bi bi-cloud-arrow-down"></i> Muat Cloud
                    </button>
                    ` : ''}

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
            <span class="font-semibold text-slate-600">dibuat dengan eSantri Web by AI Projek | aiprojek01.my.id</span>
        </div>
    </div>

    <!-- NON-BLOCKING TOAST NOTIFICATION -->
    <div id="form-toast" style="display: none;" class="fixed bottom-5 right-5 z-50 max-w-md px-4 py-3 rounded-2xl shadow-2xl border border-teal-700 bg-teal-900 text-white text-xs font-bold items-center gap-3">
        <span id="form-toast-text" class="leading-snug"></span>
        <a id="form-toast-link" href="#" target="_blank" rel="noopener noreferrer" style="display: none;" class="px-2.5 py-1 bg-emerald-400 text-teal-950 rounded-lg font-black whitespace-nowrap hover:bg-emerald-300">
            Buka WA
        </a>
    </div>
</body>
</html>`;
};

export const fetchRaporFromCloud = async (
    scriptUrl: string,
    filterOptions?: ParseRaporFilterOptions
): Promise<any[]> => {
    try {
        let targetUrl = scriptUrl.trim();
        if (filterOptions) {
            const params = new URLSearchParams();
            if (filterOptions.tahunAjaran) params.set('tahunAjaran', filterOptions.tahunAjaran);
            if (filterOptions.semester) params.set('semester', filterOptions.semester);
            if (filterOptions.templateId) params.set('templateId', filterOptions.templateId);
            if (filterOptions.rombelId) params.set('rombelId', String(filterOptions.rombelId));
            const qs = params.toString();
            if (qs) {
                targetUrl += (targetUrl.includes('?') ? '&' : '?') + qs;
            }
        }
        const response = await fetch(targetUrl, { method: 'GET' });
        if (!response.ok) throw new Error("Gagal mengambil data dari Google Sheet (HTTP " + response.status + ")");
        const rawData = await response.json();
        if (Array.isArray(rawData)) return rawData;
        if (rawData && Array.isArray(rawData.records)) return rawData.records;
        throw new Error("Format respons Google Script tidak valid.");
    } catch (e) { console.error("Fetch Cloud Error:", e); throw e; }
};

const decodeBase64Utf8 = (b64: string): string => {
    const cleaned = b64.trim().replace(/\s+/g, '');
    try {
        const binary = atob(cleaned);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return new TextDecoder('utf-8').decode(bytes);
    } catch {
        return decodeURIComponent(escape(atob(cleaned)));
    }
};

export interface ParseRaporFilterOptions {
    tahunAjaran?: string;
    semester?: 'Ganjil' | 'Genap';
    templateId?: string;
    rombelId?: number;
    allowedRombelIds?: number[];
}

export interface RaporSyncStats {
    uniqueStudentsUpdated: number;
    newRecordsCount: number;
    mergedRecordsCount: number;
    fieldsMergedCount: number;
    tabsDetected: string[];
    skippedLockedCount: number;
    skippedOutOfScopeCount: number;
}

export interface RaporCloudInspectionSummary {
    totalRows: number;
    uniqueStudents: number;
    tabs: Array<{ name: string; rowCount: number }>;
    periods: string[];
    rombels: Array<{ id: number; name: string; studentCount: number }>;
    templates: Array<{ id: string; name: string; rowCount: number }>;
    latestTimestamp: string | null;
}

const RESERVED_CLOUD_ROW_KEYS = new Set([
    'Timestamp',
    'RombelID',
    'RombelNama',
    'TemplateID',
    'TahunAjaran',
    'Semester',
    'SantriID',
    'NIS',
    'NamaSantri',
    'SheetName',
    'DataJSON'
]);

export const inspectRaporCloudSummary = (
    rows: any[],
    settings: PondokSettings
): RaporCloudInspectionSummary => {
    const safeRows = Array.isArray(rows) ? rows : [];
    const studentSet = new Set<number>();
    const tabMap = new Map<string, number>();
    const periodSet = new Set<string>();
    const rombelStudentMap = new Map<number, { name: string; students: Set<number> }>();
    const tplMap = new Map<string, number>();
    let latestTsMs = 0;
    let latestTsIso: string | null = null;

    for (const row of safeRows) {
        if (!row) continue;
        const sid = parseInt(String(row.SantriID || ''), 10);
        if (sid > 0) studentSet.add(sid);

        const sheetName = String(row.SheetName || 'Sheet Utama').trim();
        tabMap.set(sheetName, (tabMap.get(sheetName) || 0) + 1);

        const ta = String(row.TahunAjaran || '').trim();
        const sem = String(row.Semester || '').trim();
        if (ta || sem) periodSet.add([ta, sem].filter(Boolean).join(' • '));

        const rId = parseInt(String(row.RombelID || '0'), 10) || 0;
        const rombelMaster = settings.rombel.find(r => Number(r.id) === rId);
        const rName = rombelMaster?.nama || String(row.RombelNama || (rId ? `Rombel #${rId}` : 'Tanpa Rombel'));
        if (!rombelStudentMap.has(rId)) {
            rombelStudentMap.set(rId, { name: rName, students: new Set() });
        }
        if (sid > 0) rombelStudentMap.get(rId)!.students.add(sid);

        const tplId = String(row.TemplateID || '').trim();
        if (tplId) {
            tplMap.set(tplId, (tplMap.get(tplId) || 0) + 1);
        }

        if (row.Timestamp) {
            const parsedTime = new Date(row.Timestamp).getTime();
            if (!isNaN(parsedTime) && parsedTime > latestTsMs) {
                latestTsMs = parsedTime;
                latestTsIso = new Date(parsedTime).toISOString();
            }
        }
    }

    return {
        totalRows: safeRows.length,
        uniqueStudents: studentSet.size,
        tabs: Array.from(tabMap.entries()).map(([name, rowCount]) => ({ name, rowCount })),
        periods: Array.from(periodSet),
        rombels: Array.from(rombelStudentMap.entries()).map(([id, info]) => ({
            id,
            name: info.name,
            studentCount: info.students.size
        })),
        templates: Array.from(tplMap.entries()).map(([id, rowCount]) => {
            const tplObj = settings.raporTemplates?.find(t => t.id === id);
            return { id, name: tplObj?.name || id, rowCount };
        }),
        latestTimestamp: latestTsIso
    };
};

export const syncRaporStructuredData = async (
    data: any,
    settings: PondokSettings,
    filterOptions?: ParseRaporFilterOptions
): Promise<{ successCount: number; errors: string[]; stats: RaporSyncStats }> => {
    const errors: string[] = [];
    const uniqueStudentSet = new Set<number>();
    const tabsDetectedSet = new Set<string>();
    let newRecordsCount = 0;
    let mergedRecordsCount = 0;
    let fieldsMergedCount = 0;
    let skippedLockedCount = 0;
    let skippedOutOfScopeCount = 0;

    const allowedRombelSet =
        filterOptions?.allowedRombelIds && filterOptions.allowedRombelIds.length > 0
            ? new Set(filterOptions.allowedRombelIds.map(id => Number(id)))
            : null;

    // Preload seluruh santri sekali saja untuk kecepatan tinggi pada ratusan baris GAS
    const allSantri = await db.santri.toArray();
    const santriLookup = new Map<number, Santri>();
    allSantri.forEach(s => santriLookup.set(Number(s.id), s));

    // Cache raporRecords per periode agar multi-template di periode sama selalu menggabungkan ke record terbaru
    const periodRecordCache = new Map<string, Map<number, RaporRecord>>();
    const getPeriodMap = async (tahunAjaran: string, semester: string): Promise<Map<number, RaporRecord>> => {
        const pKey = `${tahunAjaran}__${semester}`;
        if (periodRecordCache.has(pKey)) return periodRecordCache.get(pKey)!;
        const recs = await db.raporRecords
            .where('[tahunAjaran+semester]')
            .equals([tahunAjaran, semester])
            .toArray();
        const rMap = new Map<number, RaporRecord>();
        recs.forEach(r => {
            const existingInMap = rMap.get(Number(r.santriId));
            if (!existingInMap || (existingInMap.deleted && !r.deleted)) {
                rMap.set(Number(r.santriId), r);
            }
        });
        periodRecordCache.set(pKey, rMap);
        return rMap;
    };

    const normalizeSem = (raw: string): 'Ganjil' | 'Genap' => {
        return String(raw || '').trim().toLowerCase() === 'genap' ? 'Genap' : 'Ganjil';
    };

    const processPayload = async (payload: any) => {
        const metaTahun = String(payload.meta?.tahunAjaran || '').trim();
        const metaSemester = normalizeSem(payload.meta?.semester || 'Ganjil');
        const metaTemplateId = String(payload.meta?.templateId || '').trim();

        if (!metaTahun) return;

        if (filterOptions?.tahunAjaran && metaTahun !== String(filterOptions.tahunAjaran).trim()) {
            return;
        }
        if (filterOptions?.semester && metaSemester.toLowerCase() !== String(filterOptions.semester).trim().toLowerCase()) {
            return;
        }
        if (filterOptions?.templateId && metaTemplateId && metaTemplateId !== String(filterOptions.templateId).trim()) {
            return;
        }

        const approvalMap = settings.raporApprovalStatus || {};
        const globalLockKey = `${metaTahun}_${metaSemester}_all`;
        const periodMap = await getPeriodMap(metaTahun, metaSemester);

        for (const rec of payload.records || []) {
            const santriIdNum = Number(rec.santriId);
            if (!santriIdNum) continue;

            const santriObj = santriLookup.get(santriIdNum);
            const existing = periodMap.get(santriIdNum);

            const recRombelId = Number(rec.rombelId) || Number(payload.meta?.rombelId) || 0;
            // Utamakan rombel aktif santri di DB lokal jika ada, atau fallback ke RombelID kiriman
            const targetRombelId =
                (santriObj && !santriObj.deleted && santriObj.rombelId ? Number(santriObj.rombelId) : 0) ||
                recRombelId ||
                existing?.rombelId ||
                0;

            if (filterOptions?.rombelId && filterOptions.rombelId > 0 && Number(targetRombelId) !== Number(filterOptions.rombelId)) {
                continue;
            }

            if (allowedRombelSet && !allowedRombelSet.has(Number(targetRombelId))) {
                skippedOutOfScopeCount++;
                continue;
            }

            const rombelLockKey = targetRombelId > 0
                ? `${metaTahun}_${metaSemester}_${targetRombelId}`
                : '';

            if (approvalMap[globalLockKey] === 'locked' || (rombelLockKey && approvalMap[rombelLockKey] === 'locked')) {
                skippedLockedCount++;
                const sName = rec.santriName || santriObj?.namaLengkap || `ID ${santriIdNum}`;
                errors.push(`Rapor terkunci: Nilai ${sName} dilewati karena rapor rombel telah disahkan/dikunci.`);
                continue;
            }

            const rombelObj = settings.rombel.find(r => Number(r.id) === Number(targetRombelId));
            const targetKelasId = santriObj?.kelasId || rombelObj?.kelasId || existing?.kelasId || 0;
            const kelasObj = settings.kelas.find(k => Number(k.id) === Number(targetKelasId));
            const targetJenjangId = santriObj?.jenjangId || kelasObj?.jenjangId || existing?.jenjangId || 0;

            let customData: Record<string, any> = {};
            if (existing && !existing.deleted && existing.customData) {
                try {
                    customData = JSON.parse(existing.customData);
                } catch {
                    customData = {};
                }
            }

            let mergedInThisRecord = 0;
            if (Array.isArray(rec.clearedKeys) && rec.clearedKeys.length > 0) {
                rec.clearedKeys.forEach((ck: string) => {
                    const cleanCk = String(ck || '').trim();
                    if (cleanCk && Object.prototype.hasOwnProperty.call(customData, cleanCk)) {
                        delete customData[cleanCk];
                        mergedInThisRecord++;
                    }
                });
            }
            if (rec.data && typeof rec.data === 'object') {
                Object.keys(rec.data).forEach(key => {
                    if (key === '__cleared') return;
                    const val = rec.data[key];
                    if (val !== '' && val !== null && val !== undefined) {
                        customData[key] = String(val);
                        mergedInThisRecord++;
                    }
                });
            }

            if (mergedInThisRecord === 0 && existing && !existing.deleted) {
                continue;
            }

            // Lookup case-insensitive untuk presensi, catatan, dan keputusan
            const upperMap: Record<string, any> = {};
            Object.keys(customData).forEach(k => {
                upperMap[k.trim().toUpperCase()] = customData[k];
            });

            const parseNumField = (keys: string[], fallback: number): number => {
                for (const k of keys) {
                    const candidate = customData[k] !== undefined ? customData[k] : upperMap[k.toUpperCase()];
                    if (candidate !== undefined && candidate !== null && String(candidate).trim() !== '') {
                        const parsed = Math.round(Number(String(candidate).replace(',', '.')));
                        if (!isNaN(parsed) && parsed >= 0) return parsed;
                    }
                }
                return fallback;
            };

            const parseStrField = (keys: string[], fallback: string): string => {
                for (const k of keys) {
                    const candidate = customData[k] !== undefined ? customData[k] : upperMap[k.toUpperCase()];
                    if (candidate !== undefined && candidate !== null && String(candidate).trim() !== '') {
                        return String(candidate);
                    }
                }
                return fallback;
            };

            const baseExisting = existing && !existing.deleted ? existing : null;

            const recordToSave: Omit<RaporRecord, 'id'> = {
                santriId: santriIdNum,
                tahunAjaran: metaTahun,
                semester: metaSemester,
                rombelId: targetRombelId,
                jenjangId: targetJenjangId,
                kelasId: targetKelasId,
                nilai: baseExisting?.nilai || [],
                sakit: parseNumField(['SAKIT', 'JML_SAKIT', 'ABSENSI_SAKIT', 'S'], baseExisting?.sakit || 0),
                izin: parseNumField(['IZIN', 'JML_IZIN', 'ABSENSI_IZIN', 'I'], baseExisting?.izin || 0),
                alpha: parseNumField(['ALPHA', 'ALPA', 'JML_ALPHA', 'ABSENSI_ALPHA', 'TANPA_KETERANGAN', 'A'], baseExisting?.alpha || 0),
                kepribadian: baseExisting?.kepribadian || [],
                ekstrakurikuler: baseExisting?.ekstrakurikuler || [],
                catatanWaliKelas: parseStrField(['CATATAN_WALI_KELAS', 'CATATAN_WALI', 'CATATAN'], baseExisting?.catatanWaliKelas || ''),
                keputusan: parseStrField(['KEPUTUSAN', 'STATUS_NAIK'], baseExisting?.keputusan || ''),
                tahfizhGanjil: baseExisting?.tahfizhGanjil,
                tahfizhGenap: baseExisting?.tahfizhGenap,
                tanggalRapor: baseExisting?.tanggalRapor || new Date().toISOString(),
                customData: JSON.stringify(customData),
                deleted: false,
                lastModified: Date.now()
            };

            if (existing) {
                const updatedRec = { ...recordToSave, id: existing.id } as RaporRecord;
                await db.raporRecords.put(updatedRec);
                periodMap.set(santriIdNum, updatedRec);
                if (existing.deleted) newRecordsCount++;
                else mergedRecordsCount++;
            } else {
                const newId = await db.raporRecords.add(recordToSave as RaporRecord);
                periodMap.set(santriIdNum, { ...recordToSave, id: Number(newId) } as RaporRecord);
                newRecordsCount++;
            }

            fieldsMergedCount += mergedInThisRecord;
            uniqueStudentSet.add(santriIdNum);
        }
    };

    if (data && data.meta && Array.isArray(data.records)) {
        await processPayload(data);
    } else if (Array.isArray(data)) {
        // Gabungkan seluruh baris GAS berdasarkan (TahunAjaran + Semester + SantriID) secara kronologis
        const groupedBatches = new Map<string, { meta: any; santriMap: Map<number, any> }>();

        // Urutkan berdasarkan Timestamp jika tersedia agar setoran terbaru selalu menang
        const sortedRows = [...data].sort((a, b) => {
            const ta = a?.Timestamp ? new Date(a.Timestamp).getTime() : 0;
            const tb = b?.Timestamp ? new Date(b.Timestamp).getTime() : 0;
            if (isNaN(ta) || isNaN(tb)) return 0;
            return ta - tb;
        });

        for (const row of sortedRows) {
            if (!row) continue;
            const santriIdNum = parseInt(String(row.SantriID || ''), 10);
            if (!santriIdNum) continue;
            const tahunAjaran = String(row.TahunAjaran || '').trim();
            const semester = String(row.Semester || '').trim();
            const templateId = String(row.TemplateID || '').trim();
            if (!tahunAjaran || !semester) continue;

            if (filterOptions?.templateId && templateId && templateId !== String(filterOptions.templateId).trim()) {
                continue;
            }

            if (row.SheetName) {
                tabsDetectedSet.add(String(row.SheetName));
            }

            let parsedRowData: Record<string, any> = {};
            if (row.DataJSON) {
                try {
                    parsedRowData = typeof row.DataJSON === 'string' ? JSON.parse(row.DataJSON) : row.DataJSON;
                } catch {
                    parsedRowData = {};
                }
            }

            // Fallback two-way: jika ada kolom ekstra langsung pada objek row (misal [KEY]), ikut gabungkan
            Object.keys(row).forEach(colName => {
                if (RESERVED_CLOUD_ROW_KEYS.has(colName)) return;
                const val = row[colName];
                if (val === '' || val === null || val === undefined) return;
                const bracketMatch = colName.match(/\[([^\]]+)\]\s*$/);
                const extractedKey = bracketMatch ? bracketMatch[1].trim() : colName.trim();
                if (extractedKey) {
                    parsedRowData[extractedKey] = val;
                }
            });

            const batchKey = `${tahunAjaran}__${normalizeSem(semester)}`;
            if (!groupedBatches.has(batchKey)) {
                groupedBatches.set(batchKey, {
                    meta: {
                        rombelId: parseInt(String(row.RombelID || '0'), 10) || 0,
                        tahunAjaran,
                        semester: normalizeSem(semester),
                        templateId: filterOptions?.templateId || ''
                    },
                    santriMap: new Map()
                });
            }

            const batch = groupedBatches.get(batchKey)!;
            const existingEntry = batch.santriMap.get(santriIdNum) || {
                santriId: santriIdNum,
                santriName: row.NamaSantri || '',
                rombelId: parseInt(String(row.RombelID || '0'), 10) || 0,
                data: {} as Record<string, any>,
                clearedSet: new Set<string>()
            };

            if (row.RombelID && parseInt(String(row.RombelID), 10) > 0) {
                existingEntry.rombelId = parseInt(String(row.RombelID), 10);
            }

            if (parsedRowData && typeof parsedRowData === 'object') {
                if (parsedRowData.__cleared && typeof parsedRowData.__cleared === 'object') {
                    Object.keys(parsedRowData.__cleared).forEach(ck => {
                        if (parsedRowData.__cleared[ck]) {
                            existingEntry.clearedSet.add(ck);
                            delete existingEntry.data[ck];
                        }
                    });
                }
                Object.keys(parsedRowData).forEach(k => {
                    if (k === '__cleared') return;
                    const v = parsedRowData[k];
                    if (v !== '' && v !== null && v !== undefined) {
                        existingEntry.data[k] = v;
                        existingEntry.clearedSet.delete(k);
                    }
                });
            }

            batch.santriMap.set(santriIdNum, existingEntry);
        }

        for (const batch of groupedBatches.values()) {
            try {
                const normalizedRecords = Array.from(batch.santriMap.values()).map(entry => ({
                    santriId: entry.santriId,
                    santriName: entry.santriName,
                    rombelId: entry.rombelId,
                    data: entry.data,
                    ...(entry.clearedSet && entry.clearedSet.size > 0
                        ? { clearedKeys: Array.from(entry.clearedSet) }
                        : {})
                }));
                await processPayload({
                    meta: batch.meta,
                    records: normalizedRecords
                });
            } catch (err: any) {
                errors.push(err.message);
            }
        }
    } else {
        throw new Error('Format data tidak dikenali.');
    }

    const stats: RaporSyncStats = {
        uniqueStudentsUpdated: uniqueStudentSet.size,
        newRecordsCount,
        mergedRecordsCount,
        fieldsMergedCount,
        tabsDetected: Array.from(tabsDetectedSet),
        skippedLockedCount,
        skippedOutOfScopeCount
    };

    return {
        successCount: uniqueStudentSet.size,
        errors,
        stats
    };
};

export const parseRaporDataV2 = async (
    encryptedString: string,
    settings: PondokSettings,
    filterOptions?: ParseRaporFilterOptions
): Promise<{ successCount: number; errors: string[]; stats?: RaporSyncStats }> => {
    try {
        const decoded = decodeBase64Utf8(encryptedString);
        const data = JSON.parse(decoded);
        return await syncRaporStructuredData(data, settings, filterOptions);
    } catch (e) {
        throw new Error('Gagal memproses data: ' + (e as Error).message);
    }
};

export interface PushRaporCloudParams {
    scriptUrl?: string;
    settings: PondokSettings;
    template: RaporTemplate;
    tahunAjaran: string;
    semester: 'Ganjil' | 'Genap';
    santriList: Santri[];
    currentGrades: Record<number, Record<string, string>>;
    previousGrades?: Record<number, Record<string, string>>;
    rombelId?: number;
    rombelName?: string;
}

/**
 * Mengirimkan (Push) nilai terbaru & koreksi/penghapusan nilai dari Leger Aplikasi kembali ke Google Apps Script (GAS),
 * sehingga Google Sheet & Portal Audit Tanpa Login selalu sinkron dua arah dengan Aplikasi.
 */
export const pushRaporGradesToCloud = async (
    params: PushRaporCloudParams
): Promise<{ pushedStudents: number; sheets: string[] }> => {
    const cleanUrl = (params.scriptUrl || params.settings.raporCloudConfig?.googleScriptUrl || '').trim();
    if (!cleanUrl) {
        return { pushedStudents: 0, sheets: [] };
    }

    const schema = compileTemplateInteractiveSchema(params.template, params.settings, 'all');
    const columnLabels: Record<string, string> = {};
    const templateKeySet = new Set<string>();

    schema.interactiveCells.forEach(cell => {
        columnLabels[cell.key] = cell.label || cell.key;
        if (cell.type !== 'formula') {
            templateKeySet.add(cell.key);
        }
    });

    // Sertakan juga atribut standar wali kelas agar ikut tersinkron
    const standardWaliLabels: Record<string, string> = {
        SAKIT: 'Sakit',
        IZIN: 'Izin',
        ALPHA: 'Alpha',
        CATATAN_WALI_KELAS: 'Catatan Wali Kelas',
        KEPUTUSAN: 'Keputusan'
    };
    Object.entries(standardWaliLabels).forEach(([k, lbl]) => {
        if (!columnLabels[k]) columnLabels[k] = lbl;
        templateKeySet.add(k);
    });

    const records: Array<{
        santriId: number;
        nis: string;
        santriName: string;
        rombelId: number;
        rombelName: string;
        kelasId: number;
        kelasName: string;
        jenjangId: number;
        jenjangName: string;
        data: Record<string, string>;
        clearedKeys?: string[];
    }> = [];

    for (const s of params.santriList) {
        const cur = params.currentGrades[s.id] || {};
        const prev = params.previousGrades?.[s.id] || {};

        const dataObj: Record<string, string> = {};
        const clearedKeys: string[] = [];

        templateKeySet.forEach(key => {
            const rawCur = cur[key] !== undefined && cur[key] !== null ? String(cur[key]).trim() : '';
            const rawPrev = prev[key] !== undefined && prev[key] !== null ? String(prev[key]).trim() : '';
            if (rawCur !== '' && rawCur !== '-') {
                dataObj[key] = rawCur;
            } else if (rawPrev !== '' && rawPrev !== '-' && rawCur === '') {
                clearedKeys.push(key);
            }
        });

        if (Object.keys(dataObj).length === 0 && clearedKeys.length === 0) continue;

        const rObj = params.settings.rombel.find(r => Number(r.id) === Number(s.rombelId));
        const kObj =
            params.settings.kelas.find(k => Number(k.id) === Number(s.kelasId)) ||
            (rObj ? params.settings.kelas.find(k => Number(k.id) === Number(rObj.kelasId)) : undefined);
        const jId = s.jenjangId || kObj?.jenjangId || 0;
        const jObj = params.settings.jenjang.find(j => Number(j.id) === Number(jId));

        records.push({
            santriId: s.id,
            nis: s.nis || '',
            santriName: s.namaLengkap,
            rombelId: s.rombelId || params.rombelId || 0,
            rombelName: rObj?.nama || params.rombelName || 'Rombel',
            kelasId: s.kelasId || kObj?.id || 0,
            kelasName: kObj?.nama || '',
            jenjangId: jId,
            jenjangName: jObj?.nama || '',
            data: dataObj,
            ...(clearedKeys.length > 0 ? { clearedKeys } : {})
        });
    }

    if (records.length === 0) {
        return { pushedStudents: 0, sheets: [] };
    }

    const payload = {
        meta: {
            rombelId: params.rombelId || 0,
            rombelName: params.rombelName || 'Rombel',
            templateId: params.template.id,
            templateName: params.template.name,
            tahunAjaran: params.tahunAjaran,
            semester: params.semester,
            tabMode: params.settings.raporCloudConfig?.tabMode || 'per_rombel',
            columnLabels,
            timestamp: new Date().toISOString()
        },
        records
    };

    const res = await fetch(cleanUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload)
    });

    if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
    }

    let respJson: any = null;
    try {
        const rawText = await res.text();
        if (rawText) respJson = JSON.parse(rawText);
    } catch {
        // non-json response fallback
    }

    if (respJson && respJson.result === 'error') {
        throw new Error(respJson.error || 'Terjadi kendala saat memperbarui Google Sheet');
    }

    return {
        pushedStudents: Number(respJson?.mergedStudents ?? records.length),
        sheets: Array.isArray(respJson?.sheets) ? respJson.sheets : []
    };
};

/**
 * Menghapus baris rapor santri pada Google Sheet (GAS) ketika arsip rapor santri dihapus di aplikasi.
 */
export const deleteRaporRecordFromCloud = async (params: {
    settings: PondokSettings;
    rec: RaporRecord;
    santri?: Santri;
    templates?: RaporTemplate[];
}): Promise<void> => {
    const cleanUrl = (params.settings.raporCloudConfig?.googleScriptUrl || '').trim();
    if (!cleanUrl) return;

    const rObj = params.settings.rombel.find(
        r => Number(r.id) === Number(params.rec.rombelId || params.santri?.rombelId || 0)
    );
    const kObj = rObj ? params.settings.kelas.find(k => Number(k.id) === Number(rObj.kelasId)) : undefined;
    const jObj = kObj ? params.settings.jenjang.find(j => Number(j.id) === Number(kObj.jenjangId)) : undefined;

    const candidateTemplates =
        params.templates && params.templates.length > 0
            ? params.templates
            : (params.settings.raporTemplates || []).filter(
                  t => !t.jenjangId || !jObj || Number(t.jenjangId) === Number(jObj.id)
              );

    for (const tpl of candidateTemplates) {
        const payload = {
            meta: {
                rombelId: rObj?.id || params.rec.rombelId || 0,
                rombelName: rObj?.nama || 'Rombel',
                templateId: tpl.id,
                templateName: tpl.name,
                tahunAjaran: params.rec.tahunAjaran,
                semester: params.rec.semester,
                tabMode: params.settings.raporCloudConfig?.tabMode || 'per_rombel',
                timestamp: new Date().toISOString()
            },
            records: [
                {
                    santriId: params.rec.santriId,
                    nis: params.santri?.nis || '',
                    santriName: params.santri?.namaLengkap || '',
                    rombelId: rObj?.id || params.rec.rombelId || 0,
                    rombelName: rObj?.nama || 'Rombel',
                    jenjangName: jObj?.nama || '',
                    deleteRecord: true
                }
            ]
        };

        await fetch(cleanUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(payload)
        });
    }
};
