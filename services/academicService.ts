


import { Santri, PondokSettings, RaporRecord, NilaiMapel, RaporTemplate, GridCell, RaporInputMode, MataPelajaran } from '../types';
import { db } from '../db';
import { getTemplateSheets } from './raporExcelService';
import { classifyRaporInputField } from './raporCalculationService';
import { getDefaultAcademicYear } from '../utils/academicYear';
import {
    parseExcelCellCoord,
    parseExcelRangeCoord,
    inspectSheetRowKkm,
    findMapelInMasterPool,
    computeDefaultKkmForPool,
    buildMasterKkmLookupMap,
    extractMapelLookupCandidates
} from '../utils/raporFormulaUtils';
import {
    RaporCloudProvider,
    getRaporCloudProviderMeta,
    fetchRaporFromCloudAdapter,
    pushRaporPayloadToCloudAdapter,
    buildStandaloneCloudHelperJs,
    obfuscateSecretToCodeArray
} from './raporCloudService';

// --- HELPER: FILTER NON-MEANINGFUL LABELS (SKIP NUMBERS, KKM, BULLETS, FORMULAS) ---
const isMeaningfulCellLabel = (raw?: string): boolean => {
    if (!raw) return false;
    const t = raw.trim();
    if (!t || t.startsWith('$') || t.startsWith('=')) return false;
    if (/^(?:[+-]?[0-9٠-٩]+(?:[.,][0-9٠-٩]+)?%?|[0-9٠-٩]{1,3}[.)\-]|[IVXLCDM]{1,4}[.)]|[.:\-/#()]+)$/i.test(t)) {
        return false;
    }
    return /[A-Za-z\u0600-\u06FF]/.test(t);
};

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
interface ExpandFormulaContext {
    mataPelajaran?: MataPelajaran[];
    preferredJenjangId?: number;
    formulaRow?: number;
    formulaCol?: number;
}

const expandSheetFormulaCoords = (
    rawExpr: string,
    sheetCells: GridCell[][],
    depth = 0,
    ctx?: ExpandFormulaContext
): string => {
    let body = (rawExpr || '').trim();
    if (body.startsWith('=')) body = body.substring(1).trim();
    if (!body || depth > 6 || !sheetCells || sheetCells.length === 0) return body;

    const maxRows = sheetCells.length;
    const maxCols = sheetCells.reduce((m, r) => Math.max(m, r ? r.length : 0), 0);
    const mataPelajaran = ctx?.mataPelajaran || [];
    const preferredJenjangId = ctx?.preferredJenjangId;
    const defaultKkm = computeDefaultKkmForPool(mataPelajaran, preferredJenjangId);

    // Collect defined $KEY names so column-locked cell refs like $D6 are never confused with $KEY variables
    const definedKeysUpper = new Set<string>();
    for (let r = 0; r < maxRows; r++) {
        const rowArr = sheetCells[r];
        if (!rowArr) continue;
        for (let c = 0; c < rowArr.length; c++) {
            const k = rowArr[c]?.key?.trim();
            if (k) definedKeysUpper.add(k.toUpperCase());
        }
    }

    const parseSheetCellCoordSmart = (token: string): { r: number; c: number } | null => {
        const trimmed = (token || '').trim();
        if (!trimmed) return null;
        if (trimmed.startsWith('$') && !trimmed.slice(1).includes('$')) {
            const rawKey = trimmed.slice(1).toUpperCase();
            if (definedKeysUpper.has(rawKey)) return null;
            return parseExcelCellCoord(trimmed, true);
        }
        return parseExcelCellCoord(trimmed, false);
    };

    const resolveDynamicKkmToken = (r: number, c: number, explicitSlug?: string): string => {
        if (explicitSlug) {
            const matched = findMapelInMasterPool(explicitSlug, mataPelajaran, preferredJenjangId);
            const fallbackVal = matched && typeof matched.kkm === 'number' && isFinite(matched.kkm) ? matched.kkm : defaultKkm;
            return `KKM(${JSON.stringify(explicitSlug)}, ${fallbackVal})`;
        }
        const rowInfo = inspectSheetRowKkm({
            sheetCells,
            row: r,
            col: c,
            mataPelajaran,
            preferredJenjangId
        });
        const query = rowInfo.detectedLabel || rowInfo.detectedInputKey || '';
        const fallbackVal = rowInfo.kkmValue ?? rowInfo.defaultKkm;
        return `KKM(${JSON.stringify(query)}, ${fallbackVal})`;
    };

    const cellToExprToken = (r: number, c: number, forRange = false): string | null => {
        const master = resolveMasterGridCell(sheetCells, r, c);
        if (!master) return forRange ? null : 'null';

        const rawVal = (master.value ?? '').trim();
        // Resolve $KKM / $MAPEL_KKM / $KKM_STANDAR / $KKM_<MAPEL> cells before treating as generic text/variable
        if (/^\$(?:KKM|MAPEL_KKM|KKM_STANDAR)$/i.test(rawVal)) {
            return resolveDynamicKkmToken(master.row ?? r, master.col ?? c);
        }
        const kkmSlugMatch = rawVal.match(/^\$KKM_([A-Za-z0-9_]+)$/i);
        if (kkmSlugMatch && !/^STANDAR$/i.test(kkmSlugMatch[1])) {
            return resolveDynamicKkmToken(master.row ?? r, master.col ?? c, kkmSlugMatch[1]);
        }

        const trimmedKey = master.key?.trim();
        if (trimmedKey && (master.type === 'input' || master.type === 'dropdown' || master.type === 'formula')) {
            return `$${trimmedKey}`;
        }

        if (master.type === 'formula' && master.value) {
            const inner = expandSheetFormulaCoords(master.value, sheetCells, depth + 1, {
                mataPelajaran,
                preferredJenjangId,
                formulaRow: master.row ?? r,
                formulaCol: master.col ?? c
            });
            return inner ? `(${inner})` : 'null';
        }

        if (!rawVal) return forRange ? null : 'null';
        if (/^\$[A-Za-z0-9_]+$/.test(rawVal)) return rawVal;

        const normalizedNum = rawVal.replace(',', '.');
        if (/^-?\d+(\.\d+)?$/.test(normalizedNum)) {
            return normalizedNum;
        }

        return forRange ? null : JSON.stringify(rawVal);
    };

    // Split outside string literals so quoted text is untouched
    const segments = body.split(/("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/g);
    let reassembled = segments.map((seg, idx) => {
        if (idx % 2 === 1) return seg; // quoted string literal

        let processed = seg;

        // 0a. Pre-resolve =KKM(...) / NILAI_KKM(...) / STANDAR_KKM(...) when referencing a cell coord or $KEY
        processed = processed.replace(/\b(?:KKM|NILAI_KKM|STANDAR_KKM)\s*\(([^()]*)\)/gi, (_full, rawArgs: string) => {
            const parts = rawArgs.split(/[;,]/).map(s => s.trim()).filter(Boolean);
            if (parts.length === 0) {
                return resolveDynamicKkmToken(ctx?.formulaRow ?? 0, ctx?.formulaCol ?? 0);
            }
            const firstArg = parts[0];
            const explicitFallback = parts[1];
            const coord = parseSheetCellCoordSmart(firstArg);
            if (coord && coord.r < maxRows && coord.c < maxCols) {
                const targetCell = resolveMasterGridCell(sheetCells, coord.r, coord.c);
                const rowInfo = inspectSheetRowKkm({
                    sheetCells,
                    row: targetCell?.row ?? coord.r,
                    col: targetCell?.col ?? coord.c,
                    mataPelajaran,
                    preferredJenjangId
                });
                let subjectQuery = '';
                if (targetCell && targetCell.type === 'label' && isMeaningfulCellLabel(targetCell.value)) {
                    subjectQuery = targetCell.value.trim();
                } else {
                    subjectQuery = rowInfo.detectedLabel || targetCell?.key?.trim() || rowInfo.detectedInputKey || '';
                }
                const matched = subjectQuery ? findMapelInMasterPool(subjectQuery, mataPelajaran, preferredJenjangId) : undefined;
                const fb = explicitFallback || String(matched?.kkm ?? rowInfo.kkmValue ?? defaultKkm);
                return `KKM(${JSON.stringify(subjectQuery)}, ${fb})`;
            }
            if (/^\$[A-Za-z0-9_]+$/.test(firstArg)) {
                const keyName = firstArg.slice(1);
                const matched = findMapelInMasterPool(keyName, mataPelajaran, preferredJenjangId);
                const fb = explicitFallback || String(matched?.kkm ?? defaultKkm);
                return `KKM(${JSON.stringify(keyName)}, ${fb})`;
            }
            return explicitFallback ? `KKM(${firstArg}, ${explicitFallback})` : `KKM(${firstArg}, ${defaultKkm})`;
        });

        // 0b. Pre-resolve =RATA2_KELAS(...) / RERATA_KELAS(...) / AVERAGE_KELAS(...) / NRK(...) to column key string, range, or 0-arg overall
        processed = processed.replace(/\b(?:RATA2_KELAS|RERATA_KELAS|RATA_KELAS|AVERAGE_KELAS|AVG_KELAS|AVG_CLASS|NRK)\s*\(([^()]*)\)/gi, (_full, rawArgs: string) => {
            const parts = rawArgs.split(/[;,]/).map(s => s.trim()).filter(Boolean);
            const firstArg = parts[0] || '';
            const decArg = parts[1];
            const withDec = (keyExpr: string) => (decArg !== undefined && decArg !== '' ? `RATA2_KELAS(${keyExpr}, ${decArg})` : `RATA2_KELAS(${keyExpr})`);
            if (!firstArg) return withDec('"__OVERALL__"');

            const range = parseExcelRangeCoord(firstArg);
            if (range) {
                const rangeCalls: string[] = [];
                const seenRangeKeys = new Set<string>();
                for (let r = range.rMin; r <= Math.min(range.rMax, maxRows - 1); r++) {
                    for (let c = range.cMin; c <= Math.min(range.cMax, maxCols - 1); c++) {
                        const targetCell = resolveMasterGridCell(sheetCells, r, c);
                        const kName = targetCell?.key?.trim();
                        if (kName && !seenRangeKeys.has(kName)) {
                            seenRangeKeys.add(kName);
                            rangeCalls.push(`RATA2_KELAS(${JSON.stringify(kName)})`);
                        }
                    }
                }
                if (rangeCalls.length === 0) return 'null';
                const avgExpr = `AVERAGE(${rangeCalls.join(', ')})`;
                return decArg !== undefined && decArg !== '' ? `ROUND(${avgExpr}, ${decArg})` : avgExpr;
            }

            const coord = parseSheetCellCoordSmart(firstArg);
            if (coord && coord.r < maxRows && coord.c < maxCols) {
                const targetCell = resolveMasterGridCell(sheetCells, coord.r, coord.c);
                const keyName = targetCell?.key?.trim();
                if (keyName) return withDec(JSON.stringify(keyName));
                return 'null';
            }
            if (/^\$(?:RATA_RATA_KELAS|RERATA_KELAS|RATA2_KELAS)$/i.test(firstArg)) {
                return withDec('"__OVERALL__"');
            }
            if (/^\$[A-Za-z0-9_]+$/.test(firstArg)) {
                return withDec(JSON.stringify(firstArg.slice(1)));
            }
            return decArg !== undefined && decArg !== '' ? `RATA2_KELAS(${firstArg}, ${decArg})` : `RATA2_KELAS(${firstArg})`;
        });

        // 0c. Inline $KKM / $KKM_<MAPEL> & $RATA_RATA_KELAS tags written directly inside a formula expression
        processed = processed.replace(/\$(?:KKM|MAPEL_KKM|KKM_STANDAR)\b/gi, () =>
            resolveDynamicKkmToken(ctx?.formulaRow ?? 0, ctx?.formulaCol ?? 0)
        );
        processed = processed.replace(/\$KKM_([A-Za-z0-9_]+)\b/gi, (_m, slug: string) =>
            resolveDynamicKkmToken(ctx?.formulaRow ?? 0, ctx?.formulaCol ?? 0, slug)
        );
        processed = processed.replace(/\$(?:RATA_RATA_KELAS|RERATA_KELAS|RATA2_KELAS)\b/gi, 'RATA2_KELAS("__OVERALL__")');

        // 1. Expand range coordinates like D6:D15 or $D$6:$D$15
        processed = processed.replace(/\$?[A-Za-z]{1,2}\$?\d{1,3}\s*:\s*\$?[A-Za-z]{1,2}\$?\d{1,3}/g, (match) => {
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
            return tokens.length > 0 ? tokens.join(', ') : 'null';
        });

        // 2. Expand single cell coordinates like D6, $D$6, $D6, D$6
        processed = processed.replace(/(?<![A-Za-z0-9_$])(\$?[A-Za-z]{1,2}\$?\d{1,3})(?![A-Za-z0-9_(])/g, (match) => {
            const coord = parseSheetCellCoordSmart(match);
            if (!coord) return match;
            if (coord.r >= maxRows || coord.c >= maxCols) return match;
            return cellToExprToken(coord.r, coord.c, false) ?? 'null';
        });

        return processed;
    }).join('');

    // Second pass for KKM("Literal Subject") where string literal was originally in odd segment
    reassembled = reassembled.replace(/\b(?:KKM|NILAI_KKM|STANDAR_KKM)\s*\(\s*("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')\s*\)/gi, (_m, lit: string) => {
        const unquoted = lit.slice(1, -1);
        const matched = findMapelInMasterPool(unquoted, mataPelajaran, preferredJenjangId);
        const fb = matched?.kkm ?? defaultKkm;
        return `KKM(${lit}, ${fb})`;
    });

    return reassembled;
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

// --- HELPER: REWRITE EXCEL COMPARISON & CONCAT OPERATORS SAFELY ---
const rewriteExcelOperatorsRecursive = (expr: string): string => {
    const trimmed = expr.trim();
    if (!trimmed) return trimmed;

    // 1. Recursively rewrite inside balanced parentheses (...)
    let withParensRewritten = '';
    let i = 0;
    let quote: '"' | "'" | null = null;
    while (i < trimmed.length) {
        const ch = trimmed[i];
        if (quote) {
            withParensRewritten += ch;
            if (ch === quote && trimmed[i - 1] !== '\\') quote = null;
            i++;
            continue;
        }
        if (ch === '"' || ch === "'") {
            quote = ch;
            withParensRewritten += ch;
            i++;
            continue;
        }
        if (ch === '(') {
            let depth = 0;
            let iq: '"' | "'" | null = null;
            let closeIdx = -1;
            for (let j = i; j < trimmed.length; j++) {
                const jc = trimmed[j];
                if (iq) {
                    if (jc === iq && trimmed[j - 1] !== '\\') iq = null;
                    continue;
                }
                if (jc === '"' || jc === "'") {
                    iq = jc;
                    continue;
                }
                if (jc === '(') depth++;
                else if (jc === ')') {
                    depth--;
                    if (depth === 0) {
                        closeIdx = j;
                        break;
                    }
                }
            }
            if (closeIdx !== -1) {
                const innerRaw = trimmed.slice(i + 1, closeIdx);
                if (innerRaw.trim() === '') {
                    withParensRewritten += '()';
                } else {
                    const innerArgs = splitTopLevelArgs(innerRaw).map(a => rewriteExcelOperatorsRecursive(a));
                    withParensRewritten += `(${innerArgs.join(', ')})`;
                }
                i = closeIdx + 1;
                continue;
            }
        }
        withParensRewritten += ch;
        i++;
    }

    // 2. Rewrite top-level relational operators (>=, <=, <>, !=, ==, =, >, <) into excelCmp(lhs, op, rhs)
    const relOps = ['>=', '<=', '<>', '!=', '==', '=', '>', '<'] as const;
    for (const op of relOps) {
        let q: '"' | "'" | null = null;
        let d = 0;
        for (let k = 0; k <= withParensRewritten.length - op.length; k++) {
            const c = withParensRewritten[k];
            if (q) {
                if (c === q && withParensRewritten[k - 1] !== '\\') q = null;
                continue;
            }
            if (c === '"' || c === "'") { q = c; continue; }
            if (c === '(') { d++; continue; }
            if (c === ')') { d = Math.max(0, d - 1); continue; }
            if (d === 0 && withParensRewritten.slice(k, k + op.length) === op) {
                if (op === '=' && (withParensRewritten[k - 1] === '>' || withParensRewritten[k - 1] === '<' || withParensRewritten[k - 1] === '!' || withParensRewritten[k + 1] === '=')) {
                    continue;
                }
                if ((op === '>' || op === '<') && (withParensRewritten[k + 1] === '=' || withParensRewritten[k + 1] === '>' || withParensRewritten[k - 1] === '<')) {
                    continue;
                }
                const lhs = rewriteExcelOperatorsRecursive(withParensRewritten.slice(0, k));
                const rhs = rewriteExcelOperatorsRecursive(withParensRewritten.slice(k + op.length));
                return `excelCmp(${lhs}, '${op}', ${rhs})`;
            }
        }
    }

    // 3. Rewrite top-level Excel string concatenation '&' into excelConcat(...)
    const concatParts: string[] = [];
    let curPart = '';
    let cq: '"' | "'" | null = null;
    let cd = 0;
    for (let k = 0; k < withParensRewritten.length; k++) {
        const c = withParensRewritten[k];
        if (cq) {
            curPart += c;
            if (c === cq && withParensRewritten[k - 1] !== '\\') cq = null;
            continue;
        }
        if (c === '"' || c === "'") { cq = c; curPart += c; continue; }
        if (c === '(') { cd++; curPart += c; continue; }
        if (c === ')') { cd = Math.max(0, cd - 1); curPart += c; continue; }
        if (cd === 0 && c === '&' && withParensRewritten[k - 1] !== '&' && withParensRewritten[k + 1] !== '&') {
            concatParts.push(curPart.trim());
            curPart = '';
            continue;
        }
        curPart += c;
    }
    if (concatParts.length > 0) {
        concatParts.push(curPart.trim());
        return `excelConcat(${concatParts.map(p => rewriteExcelOperatorsRecursive(p)).join(', ')})`;
    }

    return withParensRewritten;
};

// --- HELPER: CONVERT EXCEL SYNTAX TO JS ---
const convertFormulaToJs = (expression: string): string => {
    let raw = (expression || '').trim();
    if (raw.startsWith('=')) {
        raw = raw.substring(1).trim();
    }

    const prewritten = rewriteExcelOperatorsRecursive(raw);
    const segments = prewritten.split(/("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/g);
    return segments.map((seg, idx) => {
        if (idx % 2 === 1) return seg; // preserve string literals

        let js = seg;
        // Support Indonesian semicolon argument separator
        js = js.replace(/;/g, ',');

        // Replace $KEY with function call
        js = js.replace(/\$([a-zA-Z0-9_]+)\b/g, "getValue('$1', rowId)");

        // Excel Boolean Constants
        js = js.replace(/\b(?:TRUE|BENAR)\b/gi, 'true');
        js = js.replace(/\b(?:FALSE|SALAH)\b/gi, 'false');

        // Class Cohort Average & KKM Functions (must run before generic RATA2/AVERAGE; handle 0-arg calls safely)
        js = js.replace(/\b(?:RATA2_KELAS|RERATA_KELAS|RATA_KELAS|AVERAGE_KELAS|AVG_KELAS|AVG_CLASS|NRK)\s*\(\s*\)/gi, "rata2Kelas(rowId, '__OVERALL__')");
        js = js.replace(/\b(?:RATA2_KELAS|RERATA_KELAS|RATA_KELAS|AVERAGE_KELAS|AVG_KELAS|AVG_CLASS|NRK)\s*\(/gi, 'rata2Kelas(rowId, ');
        js = js.replace(/\b(?:KKM|NILAI_KKM|STANDAR_KKM)\s*\(\s*\)/gi, "excelKkm(rowId, '')");
        js = js.replace(/\b(?:KKM|NILAI_KKM|STANDAR_KKM)\s*\(/gi, 'excelKkm(rowId, ');

        // Conditional & Blank-Check Aggregation Functions (must run before generic COUNT/AVERAGE/SUM)
        js = js.replace(/\b(?:ISBLANK|KOSONG)\s*\(/gi, 'excelIsBlank(');
        js = js.replace(/\b(?:COUNTBLANK|HITUNG_KOSONG)\s*\(/gi, 'excelCountBlank(');
        js = js.replace(/\b(?:COUNTA|HITUNG_ISI)\s*\(/gi, 'excelCountA(');
        js = js.replace(/\b(?:AVERAGEIF|RATA2_JIKA|RERATA_JIKA)\s*\(/gi, 'excelAverageIf(');
        js = js.replace(/\b(?:SUMIF|JUMLAH_JIKA|TOTAL_JIKA)\s*\(/gi, 'excelSumIf(');
        js = js.replace(/\b(?:COUNTIF|HITUNG_JIKA)\s*\(/gi, 'excelCountIf(');
        js = js.replace(/\b(?:COUNT|HITUNG)\s*\(/gi, 'excelCount(');

        // Numeric, Math & Aggregation Functions
        js = js.replace(/\b(?:RATA2|AVERAGE|AVG|RERATA)\s*\(/gi, 'average(');
        js = js.replace(/\b(?:SUM|JUMLAH|TOTAL)\s*\(/gi, 'sum(');
        js = js.replace(/\bMIN\s*\(/gi, 'excelMin(');
        js = js.replace(/\bMAX\s*\(/gi, 'excelMax(');
        js = js.replace(/\bABS\s*\(/gi, 'excelAbs(');
        js = js.replace(/\b(?:MOD|SISA)\s*\(/gi, 'excelMod(');
        js = js.replace(/\b(?:POWER|PANGKAT)\s*\(/gi, 'excelPower(');
        js = js.replace(/\b(?:SQRT|AKAR)\s*\(/gi, 'excelSqrt(');

        // Rounding & Precision Functions
        js = js.replace(/\b(?:ROUNDUP|BULAT_ATAS)\s*\(/gi, 'excelRoundUp(');
        js = js.replace(/\b(?:ROUNDDOWN|BULAT_BAWAH)\s*\(/gi, 'excelRoundDown(');
        js = js.replace(/\b(?:ROUND|BULAT)\s*\(/gi, 'excelRound(');
        js = js.replace(/\bTRUNC\s*\(/gi, 'excelTrunc(');
        js = js.replace(/\bINT\s*\(/gi, 'excelInt(');
        js = js.replace(/\b(?:FIXED|DESIMAL)\s*\(/gi, 'excelFixed(');

        // Logic Functions (IFERROR & IFS before IF)
        js = js.replace(/\b(?:IFERROR|JIKA_ERROR)\s*\(/gi, 'excelIfError(');
        js = js.replace(/\bIFS\s*\(/gi, 'excelIfs(');
        js = js.replace(/\b(?:IF|JIKA)\s*\(/gi, 'excelIf(');
        js = js.replace(/\b(?:AND|DAN)\s*\(/gi, 'excelAnd(');
        js = js.replace(/\b(?:OR|ATAU)\s*\(/gi, 'excelOr(');
        js = js.replace(/\b(?:NOT|TIDAK|BUKAN)\s*\(/gi, 'excelNot(');

        // Predikat, Terbilang, Arabic & Text Functions
        js = js.replace(/\b(?:PREDIKAT|HURUF|TAQDIR)\s*\(/gi, 'excelPredikat(');
        js = js.replace(/\bTERBILANG\s*\(/gi, 'terbilang(');
        js = js.replace(/\b(?:ARAB|ANGKA_ARAB)\s*\(/gi, 'angkaKeArab(');
        js = js.replace(/\b(?:CONCAT_SPASI|GABUNG_SPASI|TEXTJOIN_SPASI)\s*\(/gi, 'excelConcatSpasi(');
        js = js.replace(/\b(?:CONCATENATE|CONCAT|GABUNG)\s*\(/gi, 'excelConcat(');
        js = js.replace(/\b(?:UPPER|BESAR|KAPITAL)\s*\(/gi, 'excelUpper(');
        js = js.replace(/\b(?:LOWER|KECIL)\s*\(/gi, 'excelLower(');
        js = js.replace(/\b(?:PROPER|JUDUL|TITLE|CAPITALIZE)\s*\(/gi, 'excelProper(');
        js = js.replace(/\b(?:SENTENCE|KALIMAT)\s*\(/gi, 'excelSentence(');
        js = js.replace(/\b(?:TRIM|RAPIKAN)\s*\(/gi, 'excelTrim(');
        js = js.replace(/\b(?:LEN|PANJANG)\s*\(/gi, 'excelLen(');
        js = js.replace(/\b(?:LEFT|KIRI)\s*\(/gi, 'excelLeft(');
        js = js.replace(/\b(?:RIGHT|KANAN)\s*\(/gi, 'excelRight(');
        js = js.replace(/\b(?:MID|TENGAH)\s*\(/gi, 'excelMid(');

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
    backendProvider?: RaporCloudProvider;
    googleScriptUrl?: string;
    apiKey?: string;
    waDestination?: string; 
    rankingScope?: 'rombel' | 'kelas' | 'jenjang' | 'global';
    tabMode?: 'per_rombel' | 'per_jenjang' | 'per_file';
    allowedKeys?: string[]; // Optional: subset of input/dropdown $KEYs (e.g. per-subject / per-teacher form)
    scopeTitle?: string; // Optional: display label for subject/teacher scope
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
    defaultRankingScope: 'rombel' | 'kelas' | 'jenjang' | 'global' = 'rombel',
    targetJenjangId?: number
): CompiledTemplateSchema => {
    const allSheets = getTemplateSheets(template);
    const targetSheets = sheetId && sheetId !== 'all'
        ? allSheets.filter(s => s.id === sheetId)
        : allSheets;

    const effectiveJenjangId = targetJenjangId || template.jenjangId;
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
                        const meaningfulLeftSingleRow = [...rowCells]
                            .reverse()
                            .find(ch => ch && !ch.hidden && ch.col < cell.col && ch.type === 'label' && (ch.rowSpan || 1) === 1 && isMeaningfulCellLabel(ch.value));
                        const meaningfulLeftAny = meaningfulLeftSingleRow || [...rowCells]
                            .reverse()
                            .find(ch => ch && !ch.hidden && ch.col < cell.col && ch.type === 'label' && isMeaningfulCellLabel(ch.value));
                        const meaningfulRightRtl = meaningfulLeftAny || rowCells
                            .find(ch => ch && !ch.hidden && ch.col > cell.col && ch.type === 'label' && (ch.rowSpan || 1) === 1 && isMeaningfulCellLabel(ch.value));

                        if (meaningfulRightRtl) {
                            label = meaningfulRightRtl.value.trim();
                        } else if (cell.type !== 'formula' && isMeaningfulCellLabel(cell.value)) {
                            label = cell.value.trim();
                        }

                        const expandedFormula = cell.type === 'formula' && cell.value
                            ? expandSheetFormulaCoords(cell.value, sheet.cells, 0, {
                                  mataPelajaran: settings.mataPelajaran || [],
                                  preferredJenjangId: effectiveJenjangId,
                                  formulaRow: r,
                                  formulaCol: c
                              })
                            : cell.value;

                        const classification = cell.type !== 'formula'
                            ? classifyRaporInputField({
                                key: trimmedKey,
                                label: label || trimmedKey,
                                type: cell.type,
                                inputMode: cell.inputMode,
                                mataPelajaran: settings.mataPelajaran || [],
                                jenjangId: effectiveJenjangId
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

    // Resolve effective Jenjang ID from Rombel -> Kelas -> Jenjang or config fallback
    const resolvedConfigJenjangId = (() => {
        if (config.rombelId && config.rombelId > 0) {
            const rObj = settings.rombel.find(r => Number(r.id) === Number(config.rombelId));
            const kObj = rObj ? settings.kelas.find(k => Number(k.id) === Number(rObj.kelasId)) : undefined;
            if (kObj?.jenjangId) return Number(kObj.jenjangId);
        }
        if (config.kelasId && config.kelasId > 0) {
            const kObj = settings.kelas.find(k => Number(k.id) === Number(config.kelasId));
            if (kObj?.jenjangId) return Number(kObj.jenjangId);
        }
        if (config.jenjangId && config.jenjangId > 0) return Number(config.jenjangId);
        return config.template.jenjangId ? Number(config.template.jenjangId) : undefined;
    })();

    // 3. Extract sheets and interactive cells via shared compiler
    const compiledSchema = compileTemplateInteractiveSchema(
        config.template,
        settings,
        config.sheetId || 'all',
        defaultRankingScope,
        resolvedConfigJenjangId
    );
    const allowedKeySet = config.allowedKeys && config.allowedKeys.length > 0
        ? new Set(config.allowedKeys.map(k => k.trim()).filter(Boolean))
        : null;
    const rankTargetKeySet = new Set(compiledSchema.rankConfigs.map(rc => rc.targetKey));

    const interactiveCells = allowedKeySet
        ? compiledSchema.interactiveCells.filter(cell => {
              if (allowedKeySet.has(cell.key)) return true;
              if (cell.type !== 'formula') return false;
              if (rankTargetKeySet.has(cell.key)) return false;
              const expr = cell.formulaJs || '';
              const refMatches = Array.from(expr.matchAll(/getValue\('([^']+)'/g)).map(m => m[1]);
              if (refMatches.length === 0) return false;
              return refMatches.every(rk => allowedKeySet.has(rk));
          })
        : compiledSchema.interactiveCells;

    const keptKeySet = new Set(interactiveCells.map(c => c.key));
    const formulaCells = compiledSchema.formulaCells.filter(fc => keptKeySet.has(fc.key));
    const rankConfigs = compiledSchema.rankConfigs.filter(rc => keptKeySet.has(rc.targetKey));
    const activeSheetIdsInCells = new Set(interactiveCells.map(c => c.sheetId));
    const targetSheets = allowedKeySet
        ? compiledSchema.sheets.filter(s => activeSheetIdsInCells.has(s.id))
        : compiledSchema.sheets;
    const hasClassAvgFormula = formulaCells.some(fc => (fc.formulaJs || '').includes('rata2Kelas('));

    // Build Jenjang-aware KKM dictionary for standalone HTML runtime
    const kkmLookupByJenjang: Record<string, Record<string, number>> = {};
    const kkmDefaultByJenjang: Record<string, number> = {};
    (settings.jenjang || []).forEach(j => {
        kkmLookupByJenjang[String(j.id)] = buildMasterKkmLookupMap(settings.mataPelajaran || [], Number(j.id));
        kkmDefaultByJenjang[String(j.id)] = computeDefaultKkmForPool(settings.mataPelajaran || [], Number(j.id));
    });
    const kkmLookupGlobal = buildMasterKkmLookupMap(settings.mataPelajaran || [], resolvedConfigJenjangId);
    const kkmDefaultGlobal = computeDefaultKkmForPool(settings.mataPelajaran || [], resolvedConfigJenjangId);

    const formulaScripts = formulaCells.map(c => {
        const jsExpression = c.formulaJs || convertFormulaToJs(c.formulaValue || '');
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

    const escHtml = (val: unknown): string =>
        String(val ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');

    // --- Generate Ledger Header ---
    const showMultiSheetBadges = targetSheets.length > 1;
    const theadHtml = `
        <tr class="sticky-header">
            <th class="p-2.5 bg-slate-100 border border-slate-300 text-xs font-bold text-center sticky left-0 sticky-corner w-12 text-slate-700">No</th>
            <th class="p-2.5 bg-slate-100 border border-slate-300 text-xs font-bold text-left min-w-[200px] sticky left-12 sticky-corner shadow-[2px_0_5px_rgba(0,0,0,0.06)] text-slate-800">Nama Santri</th>
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
                const kkmBadgeHtml = cell.isNumericScore && cell.kkm
                    ? `<span class="text-[8px] font-bold px-1 py-0.5 rounded bg-teal-50 text-teal-800 border border-teal-200">KKM ${escHtml(cell.kkm)}</span>`
                    : '';
                
                const quickDashBtnHtml = cell.type === 'input'
                    ? `<button type="button" onclick="fillColumnEmptyWithDash(${escHtml(JSON.stringify(cell.key))}, ${escHtml(JSON.stringify(cell.label))})" class="mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-200/75 hover:bg-amber-100 text-slate-600 hover:text-amber-900 border border-slate-300/80 text-[8px] font-bold transition-colors cursor-pointer" title="Isi tanda '-' (belum diajarkan) ke seluruh sel yang masih kosong pada kolom ini">Isi &quot;-&quot; Kosong</button>`
                    : '';
                
                return `
                <th data-sheet="${escHtml(cell.sheetId)}" class="table-col-cell p-2 border border-slate-300 text-xs font-bold text-center min-w-[130px] ${headerBg}">
                    <div class="font-bold text-slate-800 leading-tight mb-1 text-[11px]">${escHtml(cell.label)}</div>
                    <div class="flex items-center justify-center gap-1 flex-wrap">
                        <span class="font-mono text-[9px] text-slate-500 font-semibold bg-white/80 px-1 py-0.5 rounded border border-slate-200">${escHtml(cell.key)}</span>
                        <span class="text-[8px] font-black uppercase px-1 py-0.5 rounded border ${badgeClass}">${escHtml(cell.type)}</span>
                        ${kkmBadgeHtml}
                    </div>
                    ${quickDashBtnHtml}
                    ${showMultiSheetBadges ? `<div class="text-[8px] text-slate-400 font-normal mt-0.5 truncate max-w-[120px] mx-auto">${escHtml(cell.sheetName)}</div>` : ''}
                </th>
                `;
            }).join('')}
        </tr>
    `;

    // --- Generate Ledger Table Body & Cards Body ---
    let tbodyHtml = "";
    let cardsHtml = "";
    
    targetSantri.forEach((s, index) => {
        const shortName = (s.namaLengkap || '').trim().split(/\s+/)[0] || s.namaLengkap;
        const rombelObj = settings.rombel.find(r => Number(r.id) === Number(s.rombelId));
        const rombelName = rombelObj?.nama || "Tanpa Rombel";
        const kelasObj = settings.kelas.find(k => Number(k.id) === Number(s.kelasId)) || (rombelObj ? settings.kelas.find(k => Number(k.id) === Number(rombelObj.kelasId)) : null);
        const kelasName = kelasObj?.nama || "";
        const effectiveKelasId = Number(s.kelasId || (rombelObj ? rombelObj.kelasId : 0) || 0);
        const effectiveRombelId = Number(s.rombelId || 0);
        const groupKey = effectiveRombelId > 0 ? `r_${effectiveRombelId}` : `k_${effectiveKelasId}`;

        const rowCells = interactiveCells.map(col => {
            const fieldId = `val_${s.id}_${col.key}`;
            const safeColKeyAttr = escHtml(JSON.stringify(col.key));
            const commonFocusAttr = `data-santri="${escHtml(shortName)}" data-mapel="${escHtml(`${col.label} (${col.key})`)}" onfocus="showCellHint(this)"`;
            
            if (col.type === 'input') {
                return `
                <td data-sheet="${escHtml(col.sheetId)}" class="table-col-cell p-0.5 border border-slate-300 bg-white">
                    <input type="text" id="${escHtml(fieldId)}" name="${escHtml(fieldId)}" ${commonFocusAttr} oninput="syncFromTable(${s.id}, ${safeColKeyAttr}, this.value)" class="w-full h-full p-1.5 text-center text-xs font-semibold text-slate-800 bg-transparent focus:bg-blue-50 focus:ring-2 focus:ring-blue-400 outline-none rounded transition-colors" placeholder="-">
                </td>`;
            }
            if (col.type === 'dropdown') {
                const optionsHtml = col.options ? col.options.map(opt => `<option value="${escHtml(opt)}">${escHtml(opt)}</option>`).join('') : '';
                return `
                <td data-sheet="${escHtml(col.sheetId)}" class="table-col-cell p-0.5 border border-slate-300 bg-emerald-50/30">
                    <select id="${escHtml(fieldId)}" name="${escHtml(fieldId)}" ${commonFocusAttr} onchange="syncFromTable(${s.id}, ${safeColKeyAttr}, this.value)" class="w-full h-full p-1 text-center text-xs font-semibold text-emerald-950 bg-transparent focus:bg-emerald-100 outline-none rounded cursor-pointer">
                        <option value="">-</option>
                        ${optionsHtml}
                    </select>
                </td>`;
            }
            if (col.type === 'formula') {
                return `
                <td data-sheet="${escHtml(col.sheetId)}" class="table-col-cell p-0.5 border border-slate-300 bg-amber-50/50">
                    <input type="text" id="${escHtml(fieldId)}" name="${escHtml(fieldId)}" ${commonFocusAttr} readonly tabindex="-1" class="w-full h-full p-1.5 text-center text-xs font-bold text-amber-950 bg-transparent outline-none cursor-default" value="-">
                </td>`;
            }
            return `<td data-sheet="${escHtml(col.sheetId)}" class="table-col-cell p-1 border border-slate-300 bg-slate-50"></td>`;
        }).join('');

        tbodyHtml += `
        <tr id="row_santri_${s.id}" data-group="${escHtml(groupKey)}" class="hover:bg-slate-50 transition-colors">
            <td class="row-num-cell p-2 text-center bg-slate-50 text-xs font-medium text-slate-500 border border-slate-300 sticky left-0 z-20 w-12 tabular-nums">${index + 1}</td>
            <td class="p-2 bg-white text-xs font-bold text-slate-900 whitespace-nowrap border border-slate-300 sticky left-12 z-20 shadow-[2px_0_5px_rgba(0,0,0,0.05)]" title="${escHtml(s.namaLengkap)}">
                <div class="leading-tight">${escHtml(s.namaLengkap)}</div>
                <div class="text-[10px] text-slate-400 font-normal md:hidden">${escHtml(rombelName !== 'Tanpa Rombel' ? rombelName : kelasName)}</div>
            </td>
            <td class="p-2 bg-slate-50/70 text-xs font-mono text-slate-600 text-center border border-slate-300">${escHtml(s.nis || '-')}</td>
            ${rowCells}
        </tr>`;

        // Card items
        const cardFields = interactiveCells.map(col => {
            const cardFieldId = `card_val_${s.id}_${col.key}`;
            const safeColKeyAttr = escHtml(JSON.stringify(col.key));
            let typeBadge = '<span class="text-[9px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-bold border border-blue-200">INPUT</span>';
            if (col.type === 'dropdown') typeBadge = '<span class="text-[9px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold border border-emerald-200">PILIHAN</span>';
            if (col.type === 'formula') typeBadge = '<span class="text-[9px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold border border-amber-200">RUMUS</span>';

            let inputWidget = '';
            if (col.type === 'input') {
                inputWidget = `<input type="text" id="${escHtml(cardFieldId)}" oninput="syncFromCard(${s.id}, ${safeColKeyAttr}, this.value)" placeholder="Ketik nilai..." class="w-full border-2 border-slate-200 rounded-xl p-3 text-base font-bold text-slate-800 focus:border-teal-500 focus:bg-teal-50/20 outline-none transition-all shadow-sm">`;
            } else if (col.type === 'dropdown') {
                const optionsHtml = col.options ? col.options.map(opt => `<option value="${escHtml(opt)}">${escHtml(opt)}</option>`).join('') : '';
                inputWidget = `<select id="${escHtml(cardFieldId)}" onchange="syncFromCard(${s.id}, ${safeColKeyAttr}, this.value)" class="w-full border-2 border-emerald-200 bg-emerald-50/40 rounded-xl p-3 text-base font-bold text-emerald-950 focus:border-emerald-500 outline-none shadow-sm"><option value="">-- Pilih Nilai --</option>${optionsHtml}</select>`;
            } else if (col.type === 'formula') {
                inputWidget = `<input type="text" id="${escHtml(cardFieldId)}" readonly tabindex="-1" value="-" class="w-full border-2 border-amber-200 bg-amber-50 rounded-xl p-3 text-base font-black text-amber-950 text-center outline-none shadow-sm">`;
            }

            return `
            <div data-sheet="${escHtml(col.sheetId)}" class="card-field-item bg-slate-50/80 p-3.5 rounded-xl border border-slate-200 flex flex-col gap-2 transition-all">
                <div class="flex justify-between items-start gap-2">
                    <div>
                        <label class="text-xs font-bold text-slate-800 leading-snug block">${escHtml(col.label)}</label>
                        <div class="flex items-center gap-1.5 mt-0.5 flex-wrap">
                            <span class="font-mono text-[9px] text-slate-400 font-semibold">${escHtml(col.key)}</span>
                            ${col.isNumericScore && col.kkm ? `<span class="text-[9px] text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200 font-bold">KKM ${escHtml(col.kkm)}</span>` : ''}
                            ${showMultiSheetBadges ? `<span class="text-[9px] text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-100">${escHtml(col.sheetName)}</span>` : ''}
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
                        <h3 class="text-base md:text-lg font-black text-slate-900 leading-tight">${escHtml(s.namaLengkap)}</h3>
                        <p class="text-xs text-slate-500">NIS: <span class="font-mono font-bold text-slate-700">${escHtml(s.nis || '-')}</span> • ${escHtml(rombelName)}</p>
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
    const numericInputKeysServer = interactiveCells.filter(c => c.type !== 'formula' && c.isNumericScore).map(c => c.key);
    const colKeyAliasMapServer: Record<string, string> = {};
    interactiveCells.forEach(c => {
        if (!c.key) return;
        colKeyAliasMapServer[c.key] = c.key;
        colKeyAliasMapServer[c.key.toUpperCase()] = c.key;
        extractMapelLookupCandidates(c.key).forEach(cand => {
            if (cand && !colKeyAliasMapServer[cand]) colKeyAliasMapServer[cand] = c.key;
        });
        if (c.label) {
            extractMapelLookupCandidates(c.label).forEach(cand => {
                if (cand && !colKeyAliasMapServer[cand]) colKeyAliasMapServer[cand] = c.key;
            });
        }
    });
    const columnLabelsMap: Record<string, string> = {};
    interactiveCells.forEach(c => {
        columnLabelsMap[c.key] = c.label || c.key;
    });
    const effectiveTabMode = config.tabMode || 'per_rombel';
    const backendProvider: RaporCloudProvider = config.backendProvider || settings.raporCloudConfig?.backendProvider || 'gas';
    const cloudApiKey = (config.apiKey ?? settings.raporCloudConfig?.apiKey ?? '').trim();
    const providerMeta = getRaporCloudProviderMeta(backendProvider);
    const scriptUrl = (config.googleScriptUrl || '').trim();
    const waDest = config.waDestination ? config.waDestination.replace(/^0/, '62').replace(/[^0-9]/g, '') : '';
    const santriMetaArray = targetSantri.map(s => {
        const rombelObj = settings.rombel.find(r => Number(r.id) === Number(s.rombelId));
        const kelasObj = settings.kelas.find(k => Number(k.id) === Number(s.kelasId)) || (rombelObj ? settings.kelas.find(k => Number(k.id) === Number(rombelObj.kelasId)) : null);
        const jenjangIdResolved = s.jenjangId || (kelasObj ? kelasObj.jenjangId : 0);
        const jenjangObj = settings.jenjang.find(j => Number(j.id) === Number(jenjangIdResolved));
        const effRombelId = Number(s.rombelId || 0);
        const effKelasId = Number(s.kelasId || (kelasObj ? kelasObj.id : 0) || 0);
        const groupKey = effRombelId > 0 ? `r_${effRombelId}` : `k_${effKelasId}`;
        const groupLabel = effRombelId > 0 ? (rombelObj?.nama || `Rombel #${effRombelId}`) : (kelasObj?.nama || 'Tanpa Kelas');
        return {
            id: s.id,
            nama: s.namaLengkap,
            nis: s.nis || '',
            rombelId: effRombelId,
            rombelName: rombelObj?.nama || 'Tanpa Rombel',
            kelasId: effKelasId,
            kelasName: kelasObj?.nama || 'Tanpa Kelas',
            jenjangId: jenjangIdResolved,
            jenjangName: jenjangObj?.nama || '',
            groupKey,
            groupLabel
        };
    });
    const rankConfigsScript = `[${rankConfigs.map(rc => `{
        targetKey: ${JSON.stringify(rc.targetKey)},
        evalSource: function(rowId) {
            try {
                const v = (${rc.sourceJs});
                if (v === null || v === undefined) return null;
                const sv = String(v).trim();
                if (sv === '' || sv === '-') return null;
                if (typeof v === 'number') return (!isNaN(v) && isFinite(v)) ? v : null;
                const n = Number(sv.replace(',', '.'));
                return (!isNaN(n) && isFinite(n)) ? n : null;
            } catch(e) { return null; }
        },
        limit: ${rc.limit},
        scope: ${JSON.stringify(rc.scope)}
    }`).join(',')}]`;
    const rangeKeyPart = config.kelasRange ? `range_${config.kelasRange.kelasIds.join('_')}` : (config.kelasId || config.jenjangId || 0);
    const scopeStorageSuffix = allowedKeySet ? `_sub_${Array.from(allowedKeySet).sort().slice(0, 4).join('_')}_${allowedKeySet.size}` : '';
    const localStorageKey = `esantri_leger_${config.template.id}_${config.tahunAjaran}_${config.semester}_${config.rombelId || rangeKeyPart}${scopeStorageSuffix}`;

    // Extract unique kelas & class/rombel groups for filter
    const uniqueKelasMap = new Map<number, string>();
    const uniqueGroupsMap = new Map<string, { groupKey: string; label: string; kelasId: number; kelasName: string; rombelId: number; count: number }>();
    santriMetaArray.forEach(s => {
        if (s.kelasId && s.kelasName) uniqueKelasMap.set(s.kelasId, s.kelasName);
        const existingGrp = uniqueGroupsMap.get(s.groupKey);
        if (existingGrp) {
            existingGrp.count += 1;
        } else {
            uniqueGroupsMap.set(s.groupKey, {
                groupKey: s.groupKey,
                label: s.groupLabel,
                kelasId: s.kelasId,
                kelasName: s.kelasName || 'Tanpa Kelas',
                rombelId: s.rombelId,
                count: 1
            });
        }
    });

    const uniqueKelasOptions = Array.from(uniqueKelasMap.entries()).map(([id, nama]) => `<option value="${id}">${escHtml(nama)}</option>`).join('');
    const uniqueGroupOptions = Array.from(uniqueGroupsMap.values()).map(g => `<option value="${escHtml(g.groupKey)}">${escHtml(g.label)}${g.kelasName && g.label !== g.kelasName ? ` (${escHtml(g.kelasName)})` : ''} — ${g.count} santri</option>`).join('');

    const hasMultipleClasses = uniqueKelasMap.size > 1 || uniqueGroupsMap.size > 1;

    let sharedFilterToolbarHtml = '';
    if (hasMultipleClasses) {
        sharedFilterToolbarHtml = `
        <div class="bg-white p-3.5 rounded-2xl border border-teal-100 shadow-sm mb-3">
            <div class="flex flex-wrap items-center justify-between gap-2 mb-2.5 pb-2 border-b border-slate-100">
                <span class="text-xs font-black text-teal-900 flex items-center gap-1.5">
                    <span class="w-2 h-2 rounded-full bg-teal-500"></span> Filter Kelas, Rombel &amp; Santri
                </span>
                <span id="filter-scope-hint" class="text-[11px] text-teal-700 font-semibold bg-teal-50 px-2.5 py-0.5 rounded-lg border border-teal-100">
                    Mode Tabel PC menampilkan 1 kelas aktif agar ringan &amp; fokus
                </span>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-12 gap-2.5 items-end">
                <div class="md:col-span-3">
                    <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Tingkat Kelas</label>
                    <select id="filter-kelas" onchange="onKelasFilterChange(this.value)" class="w-full border border-slate-300 rounded-xl p-2 text-xs font-bold text-slate-800 bg-slate-50 focus:bg-white focus:border-teal-500 outline-none">
                        <option value="0">Semua Tingkat Kelas (${uniqueKelasMap.size})</option>
                        ${uniqueKelasOptions}
                    </select>
                </div>
                <div class="md:col-span-5">
                    <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Rombel / Kelas Aktif</label>
                    <div class="flex items-center gap-1.5">
                        <button type="button" id="btn-prev-group" onclick="stepActiveGroup(-1)" class="px-2.5 py-2 rounded-xl border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold disabled:opacity-40 cursor-pointer shrink-0" title="Kelas / Rombel Sebelumnya">
                            <i class="bi bi-chevron-left"></i>
                        </button>
                        <select id="filter-rombel" onchange="onGroupFilterChange(this.value)" class="flex-1 min-w-0 border border-slate-300 rounded-xl p-2 text-xs font-bold text-slate-800 bg-slate-50 focus:bg-white focus:border-teal-500 outline-none">
                            ${uniqueGroupOptions}
                        </select>
                        <button type="button" id="btn-next-group" onclick="stepActiveGroup(1)" class="px-2.5 py-2 rounded-xl border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold disabled:opacity-40 cursor-pointer shrink-0" title="Kelas / Rombel Berikutnya">
                            <i class="bi bi-chevron-right"></i>
                        </button>
                    </div>
                </div>
                <div class="md:col-span-4">
                    <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Cari Santri</label>
                    <div class="relative">
                        <input type="text" id="filter-search-input" oninput="onSearchChange(this.value)" placeholder="Ketik nama santri atau NIS..." class="w-full border border-slate-300 rounded-xl p-2 pr-7 text-xs font-bold text-slate-800 bg-slate-50 focus:bg-white focus:border-teal-500 outline-none">
                    </div>
                </div>
            </div>
        </div>`;
    } else {
        sharedFilterToolbarHtml = `
        <div class="bg-white p-2.5 rounded-2xl border border-teal-100 shadow-sm mb-3 flex flex-col sm:flex-row sm:items-center gap-2">
            <div class="text-xs font-bold text-teal-900 px-2 py-1 bg-teal-50 border border-teal-100 rounded-xl whitespace-nowrap">
                <i class="bi bi-people-fill mr-1 text-teal-700"></i> ${escHtml(contextName)} (${targetSantri.length} Santri)
            </div>
            <div class="flex items-center gap-2 flex-1 min-w-0">
                <span class="text-xs text-teal-700 font-bold whitespace-nowrap pl-1"><i class="bi bi-search"></i></span>
                <input type="text" id="filter-search-input" oninput="onSearchChange(this.value)" placeholder="Ketik nama santri atau NIS..." class="w-full border border-slate-200 rounded-xl p-2 text-xs font-bold text-slate-800 bg-slate-50 focus:bg-white focus:border-teal-500 outline-none">
            </div>
        </div>`;
    }

    // Navigasi Sheet Filter Tabs jika multi-sheet (rendered ONCE in shared toolbar, no duplicate IDs)
    let sheetTabsToolbarHtml = '';
    if (targetSheets.length > 1) {
        sheetTabsToolbarHtml = `
        <div class="sheet-tabs-container flex items-center gap-1.5 overflow-x-auto pb-1 mb-3">
            <span class="text-xs font-bold text-slate-600 mr-1 whitespace-nowrap flex items-center gap-1">
                <i class="bi bi-layers"></i> Lembar:
            </span>
            <button type="button" onclick="filterBySheet('all')" data-sheet-btn="all" class="sheet-filter-btn active px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all bg-teal-700 text-white shadow-xs cursor-pointer">
                Semua Lembar (${interactiveCells.length})
            </button>
            ${targetSheets.map(s => {
                const count = interactiveCells.filter(c => c.sheetId === s.id).length;
                const safeSheetIdAttr = escHtml(JSON.stringify(s.id));
                return `
                <button type="button" onclick="filterBySheet(${safeSheetIdAttr})" data-sheet-btn="${escHtml(s.id)}" class="sheet-filter-btn px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 cursor-pointer">
                    ${escHtml(s.name)} (${count})
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
            let message = "*Setoran Data Rapor (Grid V2)*\\nKelas: " + ${JSON.stringify(contextName)} + "\\nTemplate: " + ${JSON.stringify(config.template.name)} + "\\n\\n*KODE DATA:*\\nRAPOR_V2_START\\n" + encoded + "\\nRAPOR_V2_END";
            
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(message).then(() => {
                    const waUrl = ${JSON.stringify(waDest)} ? 'https://wa.me/${waDest}' : 'https://wa.me/';
                    showFormToast("Kode nilai berhasil disalin ke Clipboard! Silakan tempel (Paste) pada chat WhatsApp.", "success", waUrl);
                    const a = document.createElement('a'); a.href = waUrl; a.target = '_blank'; a.rel = 'noopener noreferrer'; a.click();
                    btn.disabled = false; btn.innerHTML = originalText;
                }).catch(() => {
                    const waUrl = (${JSON.stringify(waDest)} ? 'https://wa.me/${waDest}?text=' : 'https://wa.me/?text=') + encodeURIComponent(message);
                    showFormToast("Membuka WhatsApp untuk pengiriman data nilai...", "info", waUrl);
                    const a = document.createElement('a'); a.href = waUrl; a.target = '_blank'; a.rel = 'noopener noreferrer'; a.click();
                    btn.disabled = false; btn.innerHTML = originalText;
                });
            } else {
                const waUrl = (${JSON.stringify(waDest)} ? 'https://wa.me/${waDest}?text=' : 'https://wa.me/?text=') + encodeURIComponent(message);
                showFormToast("Membuka WhatsApp untuk pengiriman data nilai...", "info", waUrl);
                const a = document.createElement('a'); a.href = waUrl; a.target = '_blank'; a.rel = 'noopener noreferrer'; a.click();
                btn.disabled = false; btn.innerHTML = originalText;
            }
        `;
    } else {
        submissionScript = `
            pushCloudPayloadUniversal(${JSON.stringify(scriptUrl)}, payload)
            .then(() => {
                 records.forEach(r => {
                     if (Array.isArray(r.clearedKeys) && loadedBaselineBySantri[r.santriId]) {
                         r.clearedKeys.forEach(ck => { delete loadedBaselineBySantri[r.santriId][ck]; });
                     }
                     Object.entries(r.data || {}).forEach(([dk, dv]) => {
                         if (inputOnlySet.has(dk)) markLoadedBaseline(r.santriId, dk, dv);
                     });
                 });
                 ${config.submissionMethod === 'google_sheet' ? `showFormToast('Data nilai berhasil dikirim ke ${providerMeta.storageLabel}!', 'success'); btn.disabled = false; btn.innerHTML = originalText;` : `
                    const jsonString = JSON.stringify(payload);
                    const encoded = btoa(unescape(encodeURIComponent(jsonString)));
                    let message = "*Setoran Data Rapor (Hybrid)*\\nKelas: " + ${JSON.stringify(contextName)} + "\\nStatus: Terupload ke ${providerMeta.storageLabel}\\n\\n*BACKUP DATA:*\\nRAPOR_V2_START\\n" + encoded + "\\nRAPOR_V2_END";
                    if (navigator.clipboard && navigator.clipboard.writeText) {
                        navigator.clipboard.writeText(message).then(() => {
                            const waUrl = ${JSON.stringify(waDest)} ? 'https://wa.me/${waDest}' : 'https://wa.me/';
                            showFormToast("Terkirim ke ${providerMeta.storageLabel} & disalin ke Clipboard! Tempel di WA sebagai cadangan.", "success", waUrl);
                            const a = document.createElement('a'); a.href = waUrl; a.target = '_blank'; a.rel = 'noopener noreferrer'; a.click();
                            btn.disabled = false; btn.innerHTML = originalText;
                        }).catch(() => {
                            const waUrl = (${JSON.stringify(waDest)} ? 'https://wa.me/${waDest}?text=' : 'https://wa.me/?text=') + encodeURIComponent(message);
                            showFormToast("Terkirim ke ${providerMeta.storageLabel}! Klik tombol WhatsApp jika belum terbuka.", "success", waUrl);
                            const a = document.createElement('a'); a.href = waUrl; a.target = '_blank'; a.rel = 'noopener noreferrer'; a.click();
                            btn.disabled = false; btn.innerHTML = originalText;
                        });
                    } else {
                        const waUrl = (${JSON.stringify(waDest)} ? 'https://wa.me/${waDest}?text=' : 'https://wa.me/?text=') + encodeURIComponent(message);
                        showFormToast("Terkirim ke ${providerMeta.storageLabel}! Membuka WhatsApp...", "success", waUrl);
                        const a = document.createElement('a'); a.href = waUrl; a.target = '_blank'; a.rel = 'noopener noreferrer'; a.click();
                        btn.disabled = false; btn.innerHTML = originalText;
                    }
                 `}
            }).catch(err => { 
                showFormToast('Gagal mengirim ke Cloud (${providerMeta.shortName}). Cek Endpoint/API Key & internet aktif (' + (err && err.message ? err.message : err) + ')', 'error'); 
                btn.disabled = false; btn.innerHTML = originalText; 
            });
        `;
    }

    return `<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Formulir Input Nilai - ${escHtml(contextName)}</title>
    
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
            padding: 10px;
        }
        input, select, button, textarea {
            font-family: inherit;
        }
        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button {
            -webkit-appearance: none;
            margin: 0;
        }
        .hidden { display: none; }
        .sticky-header th {
            position: sticky;
            top: 0;
            z-index: 30;
            vertical-align: middle;
        }
        .sticky-corner {
            z-index: 50 !important;
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
        const allGroupsList = ${JSON.stringify(Array.from(uniqueGroupsMap.values()))};
        const hasMultipleClasses = ${hasMultipleClasses ? 'true' : 'false'};
        const santriById = new Map(santriList.map(s => [Number(s.id), s]));
        const santriIds = santriList.map(s => s.id);
        const rankConfigs = ${rankConfigsScript};
        const defaultRankingScope = ${JSON.stringify(defaultRankingScope)};
        const hasClassAvgFormula = ${hasClassAvgFormula ? 'true' : 'false'};
        const kkmLookupByJenjang = ${JSON.stringify(kkmLookupByJenjang)};
        const kkmLookupGlobal = ${JSON.stringify(kkmLookupGlobal)};
        const kkmDefaultByJenjang = ${JSON.stringify(kkmDefaultByJenjang)};
        const kkmDefaultGlobal = ${kkmDefaultGlobal};
        const numericInputKeys = ${JSON.stringify(numericInputKeysServer)};
        const colKeyAliasMap = ${JSON.stringify(colKeyAliasMapServer)};
        const storageKey = ${JSON.stringify(localStorageKey)};
        let currentViewMode = (window.innerWidth < 768) ? 'card' : 'table';
        let currentActiveSheet = 'all';
        let toastTimer = null;
        const loadedBaselineBySantri = {};
        ${buildStandaloneCloudHelperJs({
            providerVar: backendProvider,
            urlExpr: JSON.stringify(scriptUrl),
            apiKeyBytesJson: JSON.stringify(obfuscateSecretToCodeArray(cloudApiKey))
        })}
        function escHtmlJs(v) {
            return String(v ?? '')
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');
        }
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

        function excelIsBlank(v) {
            return v === null || v === undefined || String(v).trim() === '' || String(v).trim() === '-';
        }
        function getValue(key, rowId) { 
            const el = document.getElementById('val_' + rowId + '_' + key) || document.getElementById('card_val_' + rowId + '_' + key); 
            if (!el) return null; 
            const raw = String(el.value ?? '').trim(); 
            if (raw === '' || raw === '-') return null; 
            const normalized = raw.indexOf(',') !== -1 && raw.indexOf('.') === -1 ? raw.replace(',', '.') : raw;
            if (!isNaN(Number(normalized)) && normalized !== '') return Number(normalized); 
            return raw; 
        }
        function average(...args) { const validArgs = args.filter(a => typeof a === 'number' && !isNaN(a)); if (validArgs.length === 0) return null; return validArgs.reduce((a,b)=>a+b,0)/validArgs.length; }
        function sum(...args) { const validArgs = args.filter(a => typeof a === 'number' && !isNaN(a)); if (validArgs.length === 0) return null; return validArgs.reduce((a, b) => a + b, 0); }
        function excelMin(...args) { const valid = args.filter(a => typeof a === 'number' && !isNaN(a)); return valid.length === 0 ? null : Math.min(...valid); }
        function excelMax(...args) { const valid = args.filter(a => typeof a === 'number' && !isNaN(a)); return valid.length === 0 ? null : Math.max(...valid); }
        function excelAbs(num) { if (excelIsBlank(num)) return null; const n = Number(num); return isFinite(n) ? Math.abs(n) : null; }
        function excelInt(num) { if (excelIsBlank(num)) return null; const n = Number(num); return isFinite(n) ? Math.floor(n) : null; }
        function excelTrunc(num, digits = 0) {
            if (excelIsBlank(num)) return null;
            const n = Number(num);
            const d = Math.max(0, Math.min(10, Math.trunc(Number(digits) || 0)));
            if (!isFinite(n)) return null;
            const factor = Math.pow(10, d);
            return Math.trunc(n * factor) / factor;
        }
        function excelMod(num, divisor) {
            if (excelIsBlank(num) || excelIsBlank(divisor)) return null;
            const n = Number(num);
            const d = Number(divisor);
            if (!isFinite(n) || !isFinite(d) || d === 0) return null;
            return n - d * Math.floor(n / d);
        }
        function excelPower(base, exp) {
            if (excelIsBlank(base) || excelIsBlank(exp)) return null;
            const b = Number(base);
            const e = Number(exp);
            if (!isFinite(b) || !isFinite(e)) return null;
            const res = Math.pow(b, e);
            return isFinite(res) ? res : null;
        }
        function excelSqrt(num) {
            if (excelIsBlank(num)) return null;
            const n = Number(num);
            if (!isFinite(n) || n < 0) return null;
            return Math.sqrt(n);
        }
        function excelRound(num, digits = 0) {
            if (excelIsBlank(num)) return null;
            const n = Number(num);
            const d = Math.max(0, Math.min(10, Math.trunc(Number(digits) || 0)));
            if (!isFinite(n)) return null;
            const factor = Math.pow(10, d);
            const rounded = Math.floor(Math.abs(n) * factor + 0.5 + 1e-12) / factor;
            return n < 0 ? -rounded : rounded;
        }
        function excelRoundUp(num, digits = 0) {
            if (excelIsBlank(num)) return null;
            const n = Number(num);
            const d = Math.max(0, Math.min(10, Math.trunc(Number(digits) || 0)));
            if (!isFinite(n)) return null;
            const factor = Math.pow(10, d);
            const ceiled = Math.ceil(Math.abs(n) * factor - 1e-12) / factor;
            return n < 0 ? -ceiled : ceiled;
        }
        function excelRoundDown(num, digits = 0) {
            if (excelIsBlank(num)) return null;
            const n = Number(num);
            const d = Math.max(0, Math.min(10, Math.trunc(Number(digits) || 0)));
            if (!isFinite(n)) return null;
            const factor = Math.pow(10, d);
            const floored = Math.floor(Math.abs(n) * factor + 1e-12) / factor;
            return n < 0 ? -floored : floored;
        }
        function excelFixed(num, digits = 2) {
            if (excelIsBlank(num)) return '-';
            const n = Number(num);
            const d = Math.max(0, Math.min(6, Math.trunc(Number(digits ?? 2))));
            if (!isFinite(n)) return '-';
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
            if (excelIsBlank(score)) return '-';
            const n = Number(String(score).replace(',', '.'));
            if (isNaN(n) || !isFinite(n)) return '-';
            const m = String(mode || 'huruf').toLowerCase().trim();
            const tier = n >= 90 ? 0 : n >= 80 ? 1 : n >= 70 ? 2 : n >= 60 ? 3 : 4;
            if (m === 'indo' || m === 'indonesia' || m === 'deskripsi') {
                return ['Sangat Baik', 'Baik', 'Cukup', 'Kurang', 'Sangat Kurang'][tier];
            }
            if (m === 'taqdir' || m === 'arab_latin' || m === 'latin' || m === 'pesantren') {
                return ['Mumtaz', 'Jayyid Jiddan', 'Jayyid', 'Maqbul', 'Rasib'][tier];
            }
            if (m === 'arab' || m === 'arab_script') {
                return ['ممتاز', 'جيد جدا', 'جيد', 'مقبول', 'راسب'][tier];
            }
            return ['A', 'B', 'C', 'D', 'E'][tier];
        }
        function angkaKeArab(val) {
            if (excelIsBlank(val)) return '-';
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
        function terbilang(n) {
            if (excelIsBlank(n)) return '-';
            const parsed = Number(String(n).replace(',', '.'));
            if (isNaN(parsed) || !isFinite(parsed)) return '-';
            var num = Math.round(parsed);
            var words = ["Nol", "Satu", "Dua", "Tiga", "Empat", "Lima", "Enam", "Tujuh", "Delapan", "Sembilan", "Sepuluh", "Sebelas"];
            if (num < 0) return "Minus " + terbilang(-num);
            if (num < 12) return words[num];
            if (num < 20) return terbilang(num - 10) + " Belas";
            if (num < 100) return terbilang(Math.floor(num / 10)) + " Puluh" + (num % 10 === 0 ? "" : " " + terbilang(num % 10));
            if (num < 200) return "Seratus" + (num % 100 === 0 ? "" : " " + terbilang(num % 100));
            if (num < 1000) return terbilang(Math.floor(num / 100)) + " Ratus" + (num % 100 === 0 ? "" : " " + terbilang(num % 100));
            return num.toString();
        }
        function excelCmp(lhs, op, rhs) {
            const lEmpty = excelIsBlank(lhs);
            const rEmpty = excelIsBlank(rhs);
            const lStr = lEmpty ? '' : String(lhs).trim();
            const rStr = rEmpty ? '' : String(rhs).trim();
            const lNum = !lEmpty ? Number(lStr.replace(',', '.')) : NaN;
            const rNum = !rEmpty ? Number(rStr.replace(',', '.')) : NaN;
            const lIsNum = !lEmpty && !isNaN(lNum) && isFinite(lNum);
            const rIsNum = !rEmpty && !isNaN(rNum) && isFinite(rNum);
            if (lIsNum && rIsNum) {
                if (op === '>=') return lNum >= rNum;
                if (op === '<=') return lNum <= rNum;
                if (op === '>') return lNum > rNum;
                if (op === '<') return lNum < rNum;
                if (op === '!=' || op === '<>') return Math.abs(lNum - rNum) > 1e-9;
                return Math.abs(lNum - rNum) <= 1e-9;
            }
            if ((op === '>=' || op === '<=' || op === '>' || op === '<') && ((lIsNum && rEmpty) || (rIsNum && lEmpty))) {
                return null;
            }
            if (lEmpty && rEmpty) {
                return (op === '!=' || op === '<>') ? false : true;
            }
            if (lEmpty !== rEmpty) {
                return (op === '!=' || op === '<>') ? true : false;
            }
            const lLow = lStr.toLowerCase();
            const rLow = rStr.toLowerCase();
            if (op === '!=' || op === '<>') return lLow !== rLow;
            if (op === '>') return lLow.localeCompare(rLow) > 0;
            if (op === '<') return lLow.localeCompare(rLow) < 0;
            if (op === '>=') return lLow.localeCompare(rLow) >= 0;
            if (op === '<=') return lLow.localeCompare(rLow) <= 0;
            return lLow === rLow;
        }
        function excelIf(c, t, f) {
            if (c === null) return (f === '' || f === '-') ? f : '-';
            return c ? t : (f !== undefined ? f : '');
        }
        function excelIfs(...args) {
            for (let i = 0; i + 1 < args.length; i += 2) {
                if (args[i] === null) return '-';
                if (args[i]) return args[i + 1];
            }
            return '-';
        }
        function excelIfError(val, fallback = '-') {
            if (val === null || val === undefined || val === '' || val === '-' || (typeof val === 'number' && (!isFinite(val) || isNaN(val)))) return fallback;
            return val;
        }
        function excelAnd(...args) {
            if (args.some(a => a === false)) return false;
            if (args.some(a => a === null)) return null;
            return args.every(Boolean);
        }
        function excelOr(...args) {
            if (args.some(a => a === true)) return true;
            if (args.some(a => a === null)) return null;
            return args.some(Boolean);
        }
        function excelNot(v) {
            if (v === null) return null;
            return !Boolean(v);
        }
        function excelConcat(...args) { return args.map(a => (a === null || a === undefined) ? '' : String(a)).join(''); }
        function excelConcatSpasi(...args) { return args.map(a => (a === null || a === undefined) ? '' : String(a).trim()).filter(Boolean).join(' '); }
        function excelUpper(v) { return String(v ?? '').toUpperCase(); }
        function excelLower(v) { return String(v ?? '').toLowerCase(); }
        function excelProper(v) {
            return String(v ?? '').toLowerCase().replace(/(?:^|\\s|[-'/])\\S/g, ch => ch.toUpperCase());
        }
        function excelSentence(v) {
            const s = String(v ?? '').trim();
            if (!s) return '';
            return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
        }
        function excelTrim(v) {
            return String(v ?? '').replace(/\\s+/g, ' ').trim();
        }
        function excelLen(v) {
            return excelIsBlank(v) ? 0 : String(v).length;
        }
        function excelLeft(v, count = 1) {
            if (excelIsBlank(v)) return '';
            const n = Math.max(0, Math.trunc(Number(count) || 0));
            return String(v).slice(0, n);
        }
        function excelRight(v, count = 1) {
            if (excelIsBlank(v)) return '';
            const s = String(v);
            const n = Math.max(0, Math.trunc(Number(count) || 0));
            return n === 0 ? '' : s.slice(-n);
        }
        function excelMid(v, start = 1, count = 1) {
            if (excelIsBlank(v)) return '';
            const s = String(v);
            const st = Math.max(1, Math.trunc(Number(start) || 1)) - 1;
            const len = Math.max(0, Math.trunc(Number(count) || 0));
            return s.slice(st, st + len);
        }
        function matchExcelCriteria(val, criteria) {
            const crit = String(criteria ?? '').trim();
            const m = crit.match(/^(>=|<=|!=|<>|>|<|=)\\s*(.*)$/);
            const op = m ? m[1] : '=';
            const rhsRaw = m ? m[2].trim().replace(/^["']|["']$/g, '') : crit.replace(/^["']|["']$/g, '');
            const valEmpty = excelIsBlank(val);
            const rhsEmpty = rhsRaw === '' || rhsRaw === '-';
            const lhsNum = !valEmpty ? (typeof val === 'number' ? val : Number(String(val).replace(',', '.'))) : NaN;
            const rhsNum = !rhsEmpty ? Number(rhsRaw.replace(',', '.')) : NaN;
            const lhsIsNum = !valEmpty && !isNaN(lhsNum) && isFinite(lhsNum);
            const rhsIsNum = !rhsEmpty && !isNaN(rhsNum) && isFinite(rhsNum);
            if (lhsIsNum && rhsIsNum) {
                if (op === '>') return lhsNum > rhsNum;
                if (op === '>=') return lhsNum >= rhsNum;
                if (op === '<') return lhsNum < rhsNum;
                if (op === '<=') return lhsNum <= rhsNum;
                if (op === '!=' || op === '<>') return Math.abs(lhsNum - rhsNum) > 1e-9;
                return Math.abs(lhsNum - rhsNum) <= 1e-9;
            }
            if ((op === '>' || op === '>=' || op === '<' || op === '<=') && rhsIsNum && !lhsIsNum) {
                return false;
            }
            if (valEmpty && rhsEmpty) return (op === '!=' || op === '<>') ? false : true;
            if (valEmpty !== rhsEmpty) return (op === '!=' || op === '<>') ? true : false;
            const lhsStr = String(val ?? '').trim().toLowerCase();
            const rhsStr = rhsRaw.trim().toLowerCase();
            if (op === '!=' || op === '<>') return lhsStr !== rhsStr;
            return lhsStr === rhsStr;
        }
        function excelCount(...args) {
            return args.filter(a => typeof a === 'number' && !isNaN(a)).length;
        }
        function excelCountA(...args) {
            return args.filter(a => !excelIsBlank(a)).length;
        }
        function excelCountBlank(...args) {
            return args.filter(a => excelIsBlank(a)).length;
        }
        function excelCountIf(...args) {
            if (args.length < 2) return 0;
            const criteria = args[args.length - 1];
            return args.slice(0, -1).filter(v => matchExcelCriteria(v, criteria)).length;
        }
        function excelSumIf(...args) {
            if (args.length < 2) return null;
            const criteria = args[args.length - 1];
            const matched = args.slice(0, -1).filter(v => typeof v === 'number' && !isNaN(v) && matchExcelCriteria(v, criteria));
            if (matched.length === 0) return null;
            return matched.reduce((a, b) => a + b, 0);
        }
        function excelAverageIf(...args) {
            if (args.length < 2) return null;
            const criteria = args[args.length - 1];
            const matched = args.slice(0, -1).filter(v => typeof v === 'number' && !isNaN(v) && matchExcelCriteria(v, criteria));
            if (matched.length === 0) return null;
            return matched.reduce((a, b) => a + b, 0) / matched.length;
        }
        function normMapelKeyJs(raw) {
            return String(raw ?? '')
                .trim()
                .replace(/^\\$+/g, '')
                .replace(/^KKM_+/i, '')
                .replace(/^[0-9٠-٩]{1,2}\\s*[.)\\-:]\\s*/, '')
                .replace(/['’‘\\u0060]/g, '')
                .toUpperCase()
                .replace(/[^A-Z0-9\\u0600-\\u06FF]+/g, '_')
                .replace(/^_+|_+$/g, '');
        }
        function excelKkm(rowId, subjectOrKey, fallbackVal) {
            const sMeta = santriById.get(Number(rowId));
            const jKey = sMeta && sMeta.jenjangId ? String(sMeta.jenjangId) : '';
            const jDict = (jKey && kkmLookupByJenjang[jKey]) ? kkmLookupByJenjang[jKey] : null;
            const q = normMapelKeyJs(subjectOrKey);
            if (q) {
                if (jDict && jDict[q] !== undefined) return jDict[q];
                if (kkmLookupGlobal[q] !== undefined) return kkmLookupGlobal[q];
            }
            const fbNum = Number(fallbackVal);
            if (!isNaN(fbNum) && fbNum > 0) return fbNum;
            if (jKey && kkmDefaultByJenjang[jKey]) return kkmDefaultByJenjang[jKey];
            return kkmDefaultGlobal || 70;
        }
        function rata2Kelas(rowId, colKey, decimals) {
            const rawKey = String(colKey ?? '').trim().replace(/^\\$+/g, '');
            const key = (!rawKey || rawKey === '__OVERALL__')
                ? rawKey
                : (colKeyAliasMap[rawKey] || colKeyAliasMap[rawKey.toUpperCase()] || colKeyAliasMap[normMapelKeyJs(rawKey)] || rawKey);
            const sMeta = santriById.get(Number(rowId));
            const targetRombel = sMeta ? Number(sMeta.rombelId || 0) : 0;
            const cohort = targetRombel > 0 ? santriList.filter(s => Number(s.rombelId) === targetRombel) : santriList;

            let rawAvg = null;
            if (!key || key === '__OVERALL__') {
                const studentAvgs = [];
                cohort.forEach(s => {
                    const sNums = [];
                    numericInputKeys.forEach(nk => {
                        const el = document.getElementById('val_' + s.id + '_' + nk) || document.getElementById('card_val_' + s.id + '_' + nk);
                        if (!el) return;
                        const raw = String(el.value ?? '').trim();
                        if (raw === '' || raw === '-') return;
                        const num = Number(raw.replace(',', '.'));
                        if (!isNaN(num) && isFinite(num)) sNums.push(num);
                    });
                    if (sNums.length > 0) {
                        studentAvgs.push(sNums.reduce((a, b) => a + b, 0) / sNums.length);
                    }
                });
                if (studentAvgs.length > 0) {
                    rawAvg = studentAvgs.reduce((a, b) => a + b, 0) / studentAvgs.length;
                }
            } else {
                const vals = [];
                cohort.forEach(s => {
                    const el = document.getElementById('val_' + s.id + '_' + key) || document.getElementById('card_val_' + s.id + '_' + key);
                    if (!el) return;
                    const raw = String(el.value ?? '').trim();
                    if (raw === '' || raw === '-') return;
                    const num = Number(raw.replace(',', '.'));
                    if (!isNaN(num) && isFinite(num)) vals.push(num);
                });
                if (vals.length > 0) {
                    rawAvg = vals.reduce((a, b) => a + b, 0) / vals.length;
                }
            }

            if (rawAvg === null) return null;
            if (decimals !== undefined && decimals !== null && String(decimals).trim() !== '' && !isNaN(Number(decimals))) {
                return excelRound(rawAvg, Number(decimals));
            }
            return rawAvg;
        }

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
                    const rawVal = typeof cfg.evalSource === 'function' ? cfg.evalSource(s.id) : null;
                    const hasScore = rawVal !== null && rawVal !== undefined && rawVal !== '' && rawVal !== '-' && !isNaN(Number(rawVal));
                    groups[gKey].push({ id: s.id, val: hasScore ? Number(rawVal) : null, hasScore });
                });

                Object.values(groups).forEach(studentGroup => {
                    const scoredOnly = studentGroup.filter(item => item.hasScore).sort((a,b) => b.val - a.val);
                    const rankMap = {};
                    scoredOnly.forEach((item, index) => {
                        if (index > 0 && Math.abs(item.val - scoredOnly[index - 1].val) < 1e-9) {
                            rankMap[item.id] = rankMap[scoredOnly[index - 1].id];
                        } else {
                            rankMap[item.id] = index + 1;
                        }
                    });
                    studentGroup.forEach(item => {
                        const targetEl = document.getElementById('val_' + item.id + '_' + cfg.targetKey);
                        const cardTargetEl = document.getElementById('card_val_' + item.id + '_' + cfg.targetKey);
                        const rk = rankMap[item.id];
                        const rankVal = !rk ? "-" : ((cfg.limit > 0 && rk > cfg.limit) ? "-" : rk);
                        if (targetEl) targetEl.value = rankVal;
                        if (cardTargetEl) cardTargetEl.value = rankVal;
                    });
                });
            }); 
        }

        function runRowFormulasOnce(rowId) {
            ${formulaScripts}
        }

        function calculateRow(rowId, skipCohortPropagation = false) { 
            // 2-pass evaluation so chained formula cells (e.g. RATA_RATA -> PREDIKAT) stay synchronized
            runRowFormulasOnce(rowId);
            runRowFormulasOnce(rowId);
            if (hasClassAvgFormula && !skipCohortPropagation) {
                const sMeta = santriById.get(Number(rowId));
                const rId = sMeta ? Number(sMeta.rombelId || 0) : 0;
                santriList.forEach(peer => {
                    if (peer.id !== rowId && (rId === 0 || Number(peer.rombelId) === rId)) {
                        runRowFormulasOnce(peer.id);
                        runRowFormulasOnce(peer.id);
                    }
                });
            }
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
            currentViewMode = (mode === 'card') ? 'card' : 'table';
            const tableView = document.getElementById('table-view-container');
            const cardView = document.getElementById('card-view-container');
            const btnTable = document.getElementById('btn-mode-table');
            const btnCard = document.getElementById('btn-mode-card');
            if (currentViewMode === 'table') {
                if (tableView) tableView.style.display = 'block';
                if (cardView) cardView.style.display = 'none';
                if (btnTable) { btnTable.className = 'bg-white text-teal-900 font-black px-3.5 py-1.5 rounded-lg text-xs shadow-sm cursor-pointer'; }
                if (btnCard) { btnCard.className = 'text-white font-semibold px-3.5 py-1.5 rounded-lg text-xs hover:bg-white/15 cursor-pointer'; }
            } else {
                if (tableView) tableView.style.display = 'none';
                if (cardView) cardView.style.display = 'block';
                if (btnCard) { btnCard.className = 'bg-white text-teal-900 font-black px-3.5 py-1.5 rounded-lg text-xs shadow-sm cursor-pointer'; }
                if (btnTable) { btnTable.className = 'text-white font-semibold px-3.5 py-1.5 rounded-lg text-xs hover:bg-white/15 cursor-pointer'; }
            }
            applyCardFilter();
        }

        function filterBySheet(sheetId) {
            currentActiveSheet = sheetId;
            document.querySelectorAll('.sheet-filter-btn').forEach(btn => {
                const isTarget = btn.getAttribute('data-sheet-btn') === sheetId;
                btn.className = isTarget
                    ? 'sheet-filter-btn active px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all bg-teal-700 text-white shadow-xs cursor-pointer'
                    : 'sheet-filter-btn px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 cursor-pointer';
            });

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
        let activeFilterGroupKey = (allGroupsList.length > 0 ? allGroupsList[0].groupKey : '');
        let searchQuery = "";

        function getAvailableGroupsForKelas() {
            if (activeFilterKelasId > 0) {
                return allGroupsList.filter(g => Number(g.kelasId) === Number(activeFilterKelasId));
            }
            return allGroupsList;
        }

        function syncGroupNavigationControls(availableGroups) {
            const rombelSelect = document.getElementById('filter-rombel');
            const prevGrpBtn = document.getElementById('btn-prev-group');
            const nextGrpBtn = document.getElementById('btn-next-group');
            const hintEl = document.getElementById('filter-scope-hint');

            if (hintEl) {
                hintEl.textContent = currentViewMode === 'table'
                    ? 'Menampilkan 1 tabel kelas aktif agar efisien'
                    : 'Pilih rombel atau tampilkan semua di Form Kartu';
            }

            if (rombelSelect) {
                let optionsHtml = '';
                if (currentViewMode === 'card' && availableGroups.length > 1) {
                    const totalInKelas = availableGroups.reduce((acc, g) => acc + (g.count || 0), 0);
                    optionsHtml += '<option value="ALL">Semua Rombel (' + totalInKelas + ' santri)</option>';
                }
                optionsHtml += availableGroups.map(g => {
                    const suffix = g.kelasName && g.label !== g.kelasName ? ' (' + g.kelasName + ')' : '';
                    return '<option value="' + escHtmlJs(g.groupKey) + '">' + escHtmlJs(g.label + suffix) + ' — ' + g.count + ' santri</option>';
                }).join('');

                rombelSelect.innerHTML = optionsHtml || '<option value="">Tidak ada kelas</option>';

                if (currentViewMode === 'table') {
                    // Pada mode Tabel PC, paksa selalu aktif tepat 1 kelas/rombel agar fokus dan efisien
                    if (!activeFilterGroupKey || activeFilterGroupKey === 'ALL' || !availableGroups.some(g => g.groupKey === activeFilterGroupKey)) {
                        activeFilterGroupKey = availableGroups.length > 0 ? availableGroups[0].groupKey : '';
                    }
                } else {
                    if (!activeFilterGroupKey) {
                        activeFilterGroupKey = availableGroups.length > 1 ? 'ALL' : (availableGroups[0] ? availableGroups[0].groupKey : '');
                    } else if (activeFilterGroupKey !== 'ALL' && !availableGroups.some(g => g.groupKey === activeFilterGroupKey)) {
                        activeFilterGroupKey = availableGroups.length > 0 ? availableGroups[0].groupKey : '';
                    }
                }
                if (activeFilterGroupKey) {
                    rombelSelect.value = activeFilterGroupKey;
                }
            }

            const activeIdx = availableGroups.findIndex(g => g.groupKey === activeFilterGroupKey);
            if (prevGrpBtn) {
                prevGrpBtn.disabled = (availableGroups.length <= 1 || activeIdx <= 0);
            }
            if (nextGrpBtn) {
                nextGrpBtn.disabled = (availableGroups.length <= 1 || activeIdx === -1 || activeIdx >= availableGroups.length - 1);
            }

            // Update Active Class Banner di atas Tabel PC
            const activeTitleEl = document.getElementById('table-active-class-title');
            const activeSubEl = document.getElementById('table-active-class-sub');
            const activeBadgeEl = document.getElementById('table-active-class-badge');
            const activeGrp = availableGroups.find(g => g.groupKey === activeFilterGroupKey) || availableGroups[0];
            if (activeTitleEl) {
                activeTitleEl.textContent = activeGrp ? activeGrp.label : 'Kelas Aktif';
            }
            if (activeSubEl) {
                activeSubEl.textContent = activeGrp && activeGrp.kelasName && activeGrp.label !== activeGrp.kelasName
                    ? 'Tingkat: ' + activeGrp.kelasName
                    : 'Tabel Nilai Kelas Aktif';
            }
            if (activeBadgeEl && availableGroups.length > 0) {
                const pos = Math.max(0, availableGroups.findIndex(g => g.groupKey === (activeGrp ? activeGrp.groupKey : '')));
                activeBadgeEl.textContent = 'Kelas ' + (pos + 1) + ' dari ' + availableGroups.length;
            }
        }

        function applyCardFilter() {
            const availableGroups = getAvailableGroupsForKelas();
            syncGroupNavigationControls(availableGroups);

            filteredSantriList = santriList.filter(s => {
                if (activeFilterKelasId > 0 && Number(s.kelasId) !== Number(activeFilterKelasId)) return false;
                if (currentViewMode === 'table') {
                    if (activeFilterGroupKey && s.groupKey !== activeFilterGroupKey) return false;
                } else {
                    if (activeFilterGroupKey && activeFilterGroupKey !== 'ALL' && s.groupKey !== activeFilterGroupKey) return false;
                }
                if (searchQuery.trim() !== '') {
                    const q = searchQuery.toLowerCase().trim();
                    const matchName = (s.nama || '').toLowerCase().includes(q);
                    const matchNis = (s.nis || '').toLowerCase().includes(q);
                    if (!matchName && !matchNis) return false;
                }
                return true;
            });

            // Rebuild jump selector
            const jumpSel = document.getElementById('card-jump-select');
            if (jumpSel) {
                if (filteredSantriList.length === 0) {
                    jumpSel.innerHTML = '<option value="-1">⚠️ Tidak ada santri yang cocok</option>';
                } else {
                    jumpSel.innerHTML = filteredSantriList.map((s, idx) => 
                        '<option value="' + idx + '">' + (idx + 1) + '. ' + escHtmlJs(s.nama) + ' (' + escHtmlJs(s.rombelName) + ')</option>'
                    ).join('');
                }
            }

            // Filter Table View rows (strictly 1 active class/rombel on PC) + re-number visible rows cleanly
            const matchedSet = new Set(filteredSantriList.map(fs => fs.id));
            let visibleCounter = 0;
            santriList.forEach(s => {
                const rowEl = document.getElementById('row_santri_' + s.id);
                if (rowEl) {
                    const isMatch = matchedSet.has(s.id);
                    rowEl.style.display = isMatch ? '' : 'none';
                    if (isMatch) {
                        visibleCounter++;
                        const numCell = rowEl.querySelector('.row-num-cell');
                        if (numCell) numCell.textContent = String(visibleCounter);
                    }
                }
            });

            const tableCountEl = document.getElementById('table-visible-count');
            if (tableCountEl) {
                tableCountEl.textContent = visibleCounter + ' Santri Ditampilkan';
            }
            const tableEmptyEl = document.getElementById('table-empty-state');
            const tableScrollEl = document.getElementById('table-scroll-wrapper');
            if (tableEmptyEl && tableScrollEl) {
                if (visibleCounter === 0) {
                    tableEmptyEl.style.display = 'block';
                    tableScrollEl.style.display = 'none';
                } else {
                    tableEmptyEl.style.display = 'none';
                    tableScrollEl.style.display = 'block';
                }
            }

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
            const avail = getAvailableGroupsForKelas();
            activeFilterGroupKey = (currentViewMode === 'card' && avail.length > 1)
                ? 'ALL'
                : (avail.length > 0 ? avail[0].groupKey : '');
            applyCardFilter();
        }

        function onGroupFilterChange(val) {
            activeFilterGroupKey = val || '';
            applyCardFilter();
        }

        function stepActiveGroup(delta) {
            const avail = getAvailableGroupsForKelas();
            if (avail.length === 0) return;
            const curIdx = avail.findIndex(g => g.groupKey === activeFilterGroupKey);
            const baseIdx = curIdx === -1 ? 0 : curIdx;
            const nextIdx = Math.max(0, Math.min(avail.length - 1, baseIdx + delta));
            activeFilterGroupKey = avail[nextIdx].groupKey;
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

        function saveDraft(silent = false) { 
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
                if (!silent) {
                    showFormToast('Draft nilai berhasil disimpan di perangkat ini.', 'success'); 
                }
            } catch (e) {
                if (!silent) showFormToast('Gagal menyimpan draft: ' + e.message, 'error');
            } 
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
                santriIds.forEach(id => calculateRow(id, true));
                if (hasClassAvgFormula) santriIds.forEach(id => runRowFormulasOnce(id));
                calculateRanks(); 
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
                        rombelName: ${JSON.stringify(contextName)},
                        templateName: ${JSON.stringify(config.template.name)},
                        tahunAjaran: ${JSON.stringify(config.tahunAjaran)},
                        semester: ${JSON.stringify(config.semester)},
                        templateId: ${JSON.stringify(config.template.id)},
                        exportedAt: new Date().toISOString()
                    },
                    records
                };
                const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = ${JSON.stringify(`backup-nilai-${contextName.replace(/[^a-zA-Z0-9]/g, '-')}.json`)};
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
            const mapel = escHtmlJs(el.getAttribute('data-mapel') || '-'); 
            const santri = escHtmlJs(el.getAttribute('data-santri') || '-'); 
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
                const targetTahun = ${JSON.stringify(config.tahunAjaran)};
                const targetSemester = ${JSON.stringify(config.semester)};
                const targetTemplateId = ${JSON.stringify(config.template.id)};
                const rawRows = await fetchCloudRowsUniversal(url, {
                    tahunAjaran: targetTahun,
                    semester: targetSemester,
                    templateId: targetTemplateId
                });
                const rows = [...rawRows].sort((a, b) => {
                    const ta = a && a.Timestamp ? new Date(a.Timestamp).getTime() : 0;
                    const tb = b && b.Timestamp ? new Date(b.Timestamp).getTime() : 0;
                    if (isNaN(ta) || isNaN(tb)) return 0;
                    return ta - tb;
                });
                const inputOnlySet = new Set(${JSON.stringify(inputOnlyKeys)});
                const touchedStudents = new Set();

                rows.forEach(item => {
                    if (item.TahunAjaran && String(item.TahunAjaran) !== targetTahun) return;
                    if (item.Semester && String(item.Semester).toLowerCase() !== targetSemester.toLowerCase()) return;
                    if (item.TemplateID && String(item.TemplateID) !== targetTemplateId) return;
                    const sid = Number(item.SantriID);
                    if (!sid || !santriIds.includes(sid)) return;
                    let parsed = {};
                    try {
                        parsed = typeof item.DataJSON === 'string' ? JSON.parse(item.DataJSON) : (item.DataJSON || {});
                    } catch(err) { parsed = {}; }
                    let touched = false;
                    if (parsed.__cleared && typeof parsed.__cleared === 'object') {
                        Object.keys(parsed.__cleared).forEach(ck => {
                            if (!inputOnlySet.has(ck)) return;
                            const el = document.getElementById('val_' + sid + '_' + ck);
                            const cardEl = document.getElementById('card_val_' + sid + '_' + ck);
                            if (el) el.value = '';
                            if (cardEl) cardEl.value = '';
                            if (loadedBaselineBySantri[sid]) delete loadedBaselineBySantri[sid][ck];
                            touched = true;
                        });
                    }
                    Object.entries(parsed).forEach(([k, val]) => {
                        if (k === '__cleared' || !inputOnlySet.has(k)) return;
                        if (val === '' || val === null || val === undefined) return;
                        const el = document.getElementById('val_' + sid + '_' + k);
                        const cardEl = document.getElementById('card_val_' + sid + '_' + k);
                        const strVal = String(val);
                        if (el) el.value = strVal;
                        if (cardEl) cardEl.value = strVal;
                        markLoadedBaseline(sid, k, strVal);
                        touched = true;
                    });
                    if (touched) touchedStudents.add(sid);
                });

                santriIds.forEach(id => calculateRow(id, true));
                if (hasClassAvgFormula) santriIds.forEach(id => runRowFormulasOnce(id));
                calculateRanks();
                const appliedCount = touchedStudents.size;
                if (appliedCount > 0) {
                    showFormToast('Berhasil memuat nilai terbaru dari ${providerMeta.name} untuk ' + appliedCount + ' santri.', 'success');
                } else {
                    showFormToast('Belum ada nilai tersimpan di ${providerMeta.name} untuk periode & template ini.', 'info');
                }
            } catch (err) {
                showFormToast('Gagal memuat dari ${providerMeta.name}: ' + (err && err.message ? err.message : err), 'error');
            } finally {
                if (btn) {
                    btn.disabled = false;
                    btn.innerHTML = origHtml;
                }
            }
        }

        function fillColumnEmptyWithDash(key, label) {
            let filled = 0;
            santriList.forEach(s => {
                const tr = document.getElementById('row_santri_' + s.id);
                if (tr && tr.style.display === 'none') return;
                const el = document.getElementById('val_' + s.id + '_' + key);
                const cardEl = document.getElementById('card_val_' + s.id + '_' + key);
                const cur = el ? String(el.value ?? '').trim() : (cardEl ? String(cardEl.value ?? '').trim() : '');
                if (cur === '') {
                    if (el) el.value = '-';
                    if (cardEl) cardEl.value = '-';
                    calculateRow(s.id, true);
                    filled++;
                }
            });
            if (filled > 0) {
                if (hasClassAvgFormula) santriIds.forEach(id => runRowFormulasOnce(id));
                calculateRanks();
                saveDraft(true);
                showFormToast(filled + ' sel kosong pada kolom "' + label + '" diisi tanda "-" (belum diajarkan).', 'success');
            } else {
                showFormToast('Seluruh sel santri pada kelas aktif untuk kolom "' + label + '" sudah terisi.', 'info');
            }
        }

        function closeOutOfScaleModal() {
            const modal = document.getElementById('out-of-scale-modal');
            if (modal) modal.style.display = 'none';
        }

        function submitData(forceOutOfScale = false) { 
            santriIds.forEach(id => calculateRow(id)); 
            const btn = document.getElementById('submit-btn'); 
            const originalText = btn.innerHTML; 
            btn.disabled = true; 
            btn.innerHTML = '<span class="inline-block animate-spin mr-2">↻</span>Memproses...'; 
            try { 
                const inputKeys = ${JSON.stringify(inputKeysToSave)}; 
                const inputOnlySet = new Set(${JSON.stringify(inputOnlyKeys)});
                const numericSet = new Set(numericInputKeys || []);
                const columnLabels = ${JSON.stringify(columnLabelsMap)};
                const outOfScaleWarnings = [];
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
                        if (numericSet.has(key) && val !== '' && val !== '-') {
                            const num = Number(val.replace(',', '.'));
                            if (!isNaN(num) && (num < 0 || num > 100)) {
                                outOfScaleWarnings.push({
                                    santriName: s.nama,
                                    label: columnLabels[key] || key,
                                    val: val
                                });
                            }
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
                if (outOfScaleWarnings.length > 0 && !forceOutOfScale) {
                    btn.disabled = false;
                    btn.innerHTML = originalText;
                    const modal = document.getElementById('out-of-scale-modal');
                    const listBox = document.getElementById('out-of-scale-list');
                    if (modal && listBox) {
                        listBox.innerHTML = outOfScaleWarnings.slice(0, 12).map(w =>
                            '<div class="flex items-center justify-between gap-2 py-1.5 px-2.5 rounded-lg bg-amber-50 border border-amber-200 text-xs">' +
                            '<span class="font-bold text-slate-800 truncate">' + escHtmlJs(w.santriName) + ' <span class="font-normal text-slate-500">(' + escHtmlJs(w.label) + ')</span></span>' +
                            '<span class="font-mono font-black text-rose-600 shrink-0">' + escHtmlJs(w.val) + '</span>' +
                            '</div>'
                        ).join('') + (outOfScaleWarnings.length > 12 ? '<div class="text-[11px] text-slate-500 text-center pt-1">...dan ' + (outOfScaleWarnings.length - 12) + ' nilai lainnya di luar rentang 0–100.</div>' : '');
                        modal.style.display = 'flex';
                        return;
                    }
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
                        <h1 class="text-lg md:text-xl font-black tracking-tight">${escHtml(config.template.name)}</h1>
                        <span class="text-[11px] bg-white/20 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">${escHtml(config.semester)}</span>
                        <span class="text-[11px] bg-teal-900/80 border border-white/20 px-2 py-0.5 rounded-full font-semibold">T.A. ${escHtml(config.tahunAjaran)}</span>
                    </div>
                    <p class="text-xs text-teal-100/90 mt-1 font-medium">
                        <i class="bi bi-building mr-1"></i> ${escHtml(settings.namaPonpes)} &nbsp;|&nbsp; <i class="bi bi-people mr-1"></i> ${escHtml(contextName)}
                    </p>
                    <p class="text-[11px] text-teal-200/80 mt-0.5">
                        <i class="bi bi-trophy mr-1"></i> Cakupan Ranking: <b class="uppercase">${escHtml(defaultRankingScope)}</b>
                        &nbsp;•&nbsp; <i class="bi bi-person-check mr-1"></i> <b>${targetSantri.length}</b> Santri Aktif
                        &nbsp;•&nbsp; <i class="bi bi-input-cursor-text mr-1"></i> <b>${interactiveCells.length}</b> Kolom Nilai
                        ${config.scopeTitle ? `&nbsp;•&nbsp; <span class="bg-amber-400/20 text-amber-200 border border-amber-300/40 px-2 py-0.5 rounded-md font-bold"><i class="bi bi-journal-bookmark-fill mr-1"></i>${escHtml(config.scopeTitle)}</span>` : ''}
                    </p>
                </div>
                
                <div class="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
                    <!-- Switch View Mode -->
                    <div class="bg-teal-900/90 p-1 rounded-xl flex items-center border border-white/20 shadow-inner">
                        <button id="btn-mode-table" onclick="setViewMode('table')" class="bg-white text-teal-900 font-black px-3.5 py-1.5 rounded-lg text-xs shadow-sm transition-all cursor-pointer">
                            <i class="bi bi-table mr-1"></i> Tabel Leger
                        </button>
                        <button id="btn-mode-card" onclick="setViewMode('card')" class="text-white font-semibold px-3.5 py-1.5 rounded-lg text-xs hover:bg-white/15 transition-all cursor-pointer">
                            <i class="bi bi-card-text mr-1"></i> Form Kartu
                        </button>
                    </div>

                    ${scriptUrl && config.submissionMethod !== 'whatsapp' ? `
                    <button id="cloud-pull-btn" onclick="loadFromCloudGas()" class="bg-white/15 border border-white/30 text-white px-3 py-2 rounded-xl font-bold text-xs hover:bg-white/25 transition-all flex items-center gap-1.5 cursor-pointer" title="Tarik data nilai terakhir dari ${escHtml(providerMeta.name)}">
                        <i class="bi bi-cloud-arrow-down"></i> Muat Cloud (${escHtml(providerMeta.shortName)})
                    </button>
                    ` : ''}

                    <!-- Draft & Action Buttons -->
                    <button onclick="saveDraft()" class="bg-white/15 border border-white/30 text-white px-3 py-2 rounded-xl font-bold text-xs hover:bg-white/25 transition-all flex items-center gap-1.5 cursor-pointer">
                        <i class="bi bi-save"></i> Simpan Draft
                    </button>
                    <button onclick="downloadBackupJson()" class="bg-white/15 border border-white/30 text-white px-3 py-2 rounded-xl font-bold text-xs hover:bg-white/25 transition-all flex items-center gap-1.5 cursor-pointer" title="Download file JSON cadangan">
                        <i class="bi bi-download"></i> Backup
                    </button>
                    <button onclick="submitData()" id="submit-btn" class="bg-amber-400 hover:bg-amber-300 text-teal-950 px-4 py-2 rounded-xl font-black text-xs shadow-md transition-all flex items-center gap-2 active:scale-95 cursor-pointer">
                        <i class="bi bi-send-fill"></i> Kirim Nilai
                    </button>
                </div>
            </div>

            <!-- Hint helper bar -->
            <div class="mt-3 pt-2 border-t border-teal-700/60 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-1 text-[11px] text-teal-100">
                <div id="cell-hint" class="font-medium hidden md:block">
                    <i class="bi bi-info-circle mr-1"></i> Klik atau fokus ke salah satu kotak nilai untuk melihat nama santri dan mata pelajaran.
                </div>
                <div class="text-teal-100/95 bg-teal-950/35 px-2.5 py-1 rounded-lg border border-teal-700/50">
                    <i class="bi bi-lightbulb-fill text-amber-300 mr-1"></i> <strong>Mapel belum diajarkan:</strong> isi tanda <code class="px-1 bg-teal-900 rounded text-amber-200 font-bold">-</code> (terhitung Lengkap 100% &amp; tidak membagi rata-rata). Kosongkan jika belum dinilai; jangan isi <code class="px-1 bg-teal-900 rounded text-rose-200 font-bold">0</code> kecuali nilai murni nol.
                </div>
            </div>
        </div>

        <!-- SHARED FILTER & SHEET TABS WORKSPACE BAR (Aktif di PC Tabel & HP Kartu) -->
        <div class="px-3 pt-3 md:px-4 md:pt-3.5 bg-slate-50 border-b border-slate-200/80 shrink-0">
            ${sharedFilterToolbarHtml}
            ${sheetTabsToolbarHtml}
        </div>
        
        <!-- TABLE VIEW (1 Tabel Kelas Aktif per Filter) -->
        <div id="table-view-container" class="flex-grow overflow-auto p-3 md:p-4 bg-slate-50 space-y-2.5">
            <div id="table-active-class-bar" class="bg-teal-700 text-white px-3.5 py-2.5 rounded-xl shadow-xs flex flex-wrap items-center justify-between gap-2">
                <div class="flex items-center gap-2.5 min-w-0">
                    <div class="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
                        <i class="bi bi-people-fill text-sm"></i>
                    </div>
                    <div class="min-w-0">
                        <div class="flex items-center gap-2 flex-wrap">
                            <span id="table-active-class-title" class="text-xs sm:text-sm font-black truncate">${escHtml(contextName)}</span>
                            <span id="table-active-class-badge" class="text-[10px] font-bold bg-white/20 px-2 py-0.5 rounded-md whitespace-nowrap">1 Kelas Aktif</span>
                        </div>
                        <div id="table-active-class-sub" class="text-[11px] text-teal-100/90">Tabel Nilai Kelas Aktif</div>
                    </div>
                </div>
                <div class="flex items-center gap-2 shrink-0">
                    <span id="table-visible-count" class="text-[11px] font-bold bg-teal-900/60 border border-white/15 px-2.5 py-1 rounded-lg tabular-nums">
                        ${targetSantri.length} Santri Ditampilkan
                    </span>
                </div>
            </div>

            <div id="table-empty-state" style="display: none;" class="bg-white p-8 rounded-2xl border-2 border-dashed border-slate-300 text-center text-slate-500">
                <div class="text-2xl mb-1.5">🔍</div>
                <h4 class="font-bold text-slate-800 text-sm mb-1">Tidak ada santri yang cocok</h4>
                <p class="text-xs text-slate-500">Ubah kata kunci pencarian atau pilih Rombel lain pada filter di atas.</p>
            </div>

            <div id="table-scroll-wrapper" class="border border-slate-300 rounded-xl overflow-auto max-h-[68vh] shadow-xs bg-white">
                <table class="w-full text-sm border-collapse">
                    <thead class="sticky-header">${theadHtml}</thead>
                    <tbody class="divide-y divide-slate-200">${tbodyHtml}</tbody>
                </table>
            </div>
        </div>

        <!-- CARD / FORM VIEW (Mobile Friendly) -->
        <div id="card-view-container" class="flex-grow overflow-auto p-3 md:p-5 bg-slate-50/70" style="display: none;">
            <!-- Stepper Navigation Bar -->
            <div class="max-w-3xl mx-auto bg-white p-3 rounded-2xl border border-slate-200 shadow-sm mb-4 flex flex-wrap items-center justify-between gap-3 sticky top-0 z-20">
                <div class="flex items-center gap-2">
                    <button id="card-btn-prev" onclick="prevCard()" class="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs disabled:opacity-40 transition-colors flex items-center gap-1 cursor-pointer">
                        <i class="bi bi-chevron-left"></i> Sebelumnya
                    </button>
                    <span id="card-progress-text" class="text-xs font-black text-teal-900 bg-teal-50 px-3 py-2 rounded-xl border border-teal-200">1 / ${targetSantri.length}</span>
                    <button id="card-btn-next" onclick="nextCard()" class="px-3.5 py-2 bg-teal-700 hover:bg-teal-800 text-white font-bold rounded-xl text-xs disabled:opacity-40 transition-colors flex items-center gap-1 cursor-pointer">
                        Berikutnya <i class="bi bi-chevron-right"></i>
                    </button>
                </div>
                <div class="flex-grow max-w-xs">
                    <select id="card-jump-select" onchange="showFilteredCard(parseInt(this.value))" class="w-full border border-slate-200 rounded-xl p-2 text-xs font-bold bg-slate-50 focus:bg-white focus:border-teal-500 outline-none">
                        ${targetSantri.map((s, idx) => `<option value="${idx}">${idx + 1}. ${escHtml(s.namaLengkap)} (${escHtml(s.nis || '-')})</option>`).join('')}
                    </select>
                </div>
            </div>

            <div class="max-w-3xl mx-auto">
                <!-- Empty state if filter doesn't match -->
                <div id="card-empty-state" style="display: none;" class="bg-white p-8 rounded-2xl border-2 border-dashed border-slate-300 text-center text-slate-500">
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

    <!-- OUT-OF-SCALE SCORE WARNING MODAL -->
    <div id="out-of-scale-modal" style="display: none;" class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs items-center justify-center p-4">
        <div class="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-amber-200">
            <div class="flex items-start gap-3 pb-3 border-b border-slate-100">
                <div class="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-black shrink-0">!</div>
                <div>
                    <h3 class="text-sm font-black text-slate-900">Periksa Nilai di Luar Skala 0–100</h3>
                    <p class="text-xs text-slate-500 mt-0.5">Ditemukan angka di bawah 0 atau di atas 100 (kemungkinan salah ketik seperti 850). Periksa sebelum mengirim:</p>
                </div>
            </div>
            <div id="out-of-scale-list" class="my-3.5 max-h-52 overflow-y-auto space-y-1.5 pr-1"></div>
            <div class="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button type="button" onclick="closeOutOfScaleModal()" class="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700">
                    Perbaiki Dulu
                </button>
                <button type="button" onclick="closeOutOfScaleModal(); submitData(true);" class="px-4 py-2 rounded-xl text-xs font-black bg-amber-500 hover:bg-amber-600 text-white shadow-xs">
                    Tetap Kirim Nilai
                </button>
            </div>
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
    filterOptions?: ParseRaporFilterOptions,
    cloudOptions?: {
        backendProvider?: RaporCloudProvider;
        apiKey?: string;
    }
): Promise<any[]> => {
    try {
        return await fetchRaporFromCloudAdapter(
            {
                endpointUrl: scriptUrl,
                backendProvider: cloudOptions?.backendProvider || 'gas',
                apiKey: cloudOptions?.apiKey
            },
            filterOptions
        );
    } catch (e) {
        console.error('Fetch Cloud Error:', e);
        throw e;
    }
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
    dryRun?: boolean;
    conflictMode?: 'overwrite' | 'fill_empty_only';
}

export interface RaporSyncConflictItem {
    santriId: number;
    santriName: string;
    rombelName: string;
    key: string;
    oldValue: string;
    newValue: string;
}

export interface RaporSyncStats {
    uniqueStudentsUpdated: number;
    newRecordsCount: number;
    mergedRecordsCount: number;
    fieldsMergedCount: number;
    newFieldsCount: number;
    overwrittenFieldsCount: number;
    conflicts: RaporSyncConflictItem[];
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
    let newFieldsCount = 0;
    let overwrittenFieldsCount = 0;
    const conflicts: RaporSyncConflictItem[] = [];
    let skippedLockedCount = 0;
    let skippedOutOfScopeCount = 0;

    const isDryRun = Boolean(filterOptions?.dryRun);
    const conflictMode = filterOptions?.conflictMode || 'overwrite';

    const allowedRombelSet =
        filterOptions?.allowedRombelIds && filterOptions.allowedRombelIds.length > 0
            ? new Set(filterOptions.allowedRombelIds.map(id => Number(id)))
            : null;

    // Preload seluruh santri sekali saja untuk kecepatan tinggi pada ratusan baris GAS
    const allSantri = await db.santri.toArray();
    const santriLookup = new Map<number, Santri>();
    allSantri.forEach(s => santriLookup.set(Number(s.id), s));

    // Cache raporRecords per periode agar multi-template di periode sama selalu menggabungkan ke record aktif terbaru
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
            const sid = Number(r.santriId);
            const existingInMap = rMap.get(sid);
            if (
                !existingInMap ||
                (existingInMap.deleted && !r.deleted) ||
                (!r.deleted && (r.lastModified || 0) >= (existingInMap.lastModified || 0))
            ) {
                rMap.set(sid, r);
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

            const activeAcademicYear = getDefaultAcademicYear(settings);
            const isHistoricalPeriod = Boolean(activeAcademicYear && metaTahun !== activeAcademicYear);
            const recRombelId = Number(rec.rombelId) || Number(payload.meta?.rombelId) || 0;
            // Untuk tahun ajaran aktif, prioritaskan rombel aktif santri saat ini.
            // Untuk periode arsip (historis), prioritaskan snapshot rombel pada payload/record agar data alumni/kenaikan kelas tidak tertimpa kelas baru.
            const targetRombelId = isHistoricalPeriod
                ? (recRombelId || existing?.rombelId || (santriObj && !santriObj.deleted && santriObj.rombelId ? Number(santriObj.rombelId) : 0) || 0)
                : ((santriObj && !santriObj.deleted && santriObj.rombelId ? Number(santriObj.rombelId) : 0) || recRombelId || existing?.rombelId || 0);

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
            const resolvedSantriName = santriObj?.namaLengkap || String(rec.santriName || `Santri #${santriIdNum}`);
            const resolvedRombelName = rombelObj?.nama || String(rec.rombelName || (targetRombelId ? `Rombel #${targetRombelId}` : '-'));
            const targetKelasId = isHistoricalPeriod
                ? (rombelObj?.kelasId || existing?.kelasId || santriObj?.kelasId || 0)
                : (rombelObj?.kelasId || santriObj?.kelasId || existing?.kelasId || 0);
            const kelasObj = settings.kelas.find(k => Number(k.id) === Number(targetKelasId));
            const targetJenjangId = isHistoricalPeriod
                ? (kelasObj?.jenjangId || existing?.jenjangId || santriObj?.jenjangId || 0)
                : (kelasObj?.jenjangId || santriObj?.jenjangId || existing?.jenjangId || 0);

            let customData: Record<string, any> = {};
            if (existing && !existing.deleted && existing.customData) {
                try {
                    customData = JSON.parse(existing.customData);
                } catch {
                    customData = {};
                }
            }

            let mergedInThisRecord = 0;
            const clearedUpperSet = new Set<string>();
            if (Array.isArray(rec.clearedKeys) && rec.clearedKeys.length > 0) {
                rec.clearedKeys.forEach((ck: string) => {
                    const cleanCk = String(ck || '').trim();
                    if (!cleanCk) return;
                    if (Object.prototype.hasOwnProperty.call(customData, cleanCk)) {
                        const prevVal = String(customData[cleanCk] ?? '').trim();
                        if (prevVal !== '') {
                            conflicts.push({
                                santriId: santriIdNum,
                                santriName: resolvedSantriName,
                                rombelName: resolvedRombelName,
                                key: cleanCk,
                                oldValue: prevVal,
                                newValue: '(Dikosongkan)'
                            });
                            if (conflictMode === 'fill_empty_only') {
                                return;
                            }
                            overwrittenFieldsCount++;
                        }
                        clearedUpperSet.add(cleanCk.toUpperCase());
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
                        const incomingStr = String(val).trim();
                        const prevVal =
                            customData[key] !== undefined && customData[key] !== null
                                ? String(customData[key]).trim()
                                : '';
                        if (prevVal === '') {
                            customData[key] = String(val);
                            clearedUpperSet.delete(key.trim().toUpperCase());
                            mergedInThisRecord++;
                            newFieldsCount++;
                        } else if (prevVal !== incomingStr) {
                            conflicts.push({
                                santriId: santriIdNum,
                                santriName: resolvedSantriName,
                                rombelName: resolvedRombelName,
                                key,
                                oldValue: prevVal,
                                newValue: incomingStr
                            });
                            if (conflictMode === 'overwrite') {
                                customData[key] = String(val);
                                clearedUpperSet.delete(key.trim().toUpperCase());
                                mergedInThisRecord++;
                                overwrittenFieldsCount++;
                            }
                        }
                    }
                });
            }

            if (mergedInThisRecord === 0 && clearedUpperSet.size === 0 && existing && !existing.deleted) {
                continue;
            }
            if (mergedInThisRecord === 0 && clearedUpperSet.size === 0 && (!existing || existing.deleted) && Object.keys(customData).length === 0) {
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
                if (keys.some(k => clearedUpperSet.has(k.toUpperCase()))) {
                    return 0;
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
                if (keys.some(k => clearedUpperSet.has(k.toUpperCase()))) {
                    return '';
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
                if (!isDryRun) {
                    await db.raporRecords.put(updatedRec);
                }
                periodMap.set(santriIdNum, updatedRec);
                if (existing.deleted) newRecordsCount++;
                else mergedRecordsCount++;
            } else {
                const newId = isDryRun ? -santriIdNum : await db.raporRecords.add(recordToSave as RaporRecord);
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

            // Fallback two-way: jika ada kolom ekstra langsung pada objek row (misal [KEY]), ikut gabungkan atau deteksi pengosongan sel
            const dataJsonPresentKeys = new Set(
                Object.keys(parsedRowData || {}).filter(
                    k => k !== '__cleared' && parsedRowData[k] !== '' && parsedRowData[k] !== null && parsedRowData[k] !== undefined
                )
            );
            Object.keys(row).forEach(colName => {
                if (RESERVED_CLOUD_ROW_KEYS.has(colName)) return;
                const val = row[colName];
                const bracketMatch = colName.match(/\[([^\]]+)\]\s*$/);
                const extractedKey = bracketMatch ? bracketMatch[1].trim() : colName.trim();
                if (!extractedKey) return;
                if (val === '' || val === null || val === undefined) {
                    if (dataJsonPresentKeys.has(extractedKey)) {
                        delete parsedRowData[extractedKey];
                        parsedRowData.__cleared = parsedRowData.__cleared || {};
                        parsedRowData.__cleared[extractedKey] = true;
                    }
                    return;
                }
                parsedRowData[extractedKey] = val;
                if (parsedRowData.__cleared && parsedRowData.__cleared[extractedKey]) {
                    delete parsedRowData.__cleared[extractedKey];
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
        newFieldsCount,
        overwrittenFieldsCount,
        conflicts,
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
            if (rawCur !== '') {
                dataObj[key] = rawCur;
            } else if (rawPrev !== '' && rawCur === '') {
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

    return await pushRaporPayloadToCloudAdapter(
        {
            endpointUrl: cleanUrl,
            backendProvider: params.settings.raporCloudConfig?.backendProvider || 'gas',
            apiKey: params.settings.raporCloudConfig?.apiKey
        },
        payload
    );
};

/**
 * Menghapus baris rapor santri pada Cloud Backend aktif (GAS / D1 / Supabase / R2) ketika arsip rapor santri dihapus di aplikasi.
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

    const provider = params.settings.raporCloudConfig?.backendProvider || 'gas';
    const apiKey = params.settings.raporCloudConfig?.apiKey;

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

        await pushRaporPayloadToCloudAdapter(
            {
                endpointUrl: cleanUrl,
                backendProvider: provider,
                apiKey
            },
            payload
        );
    }
};
