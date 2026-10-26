import { MataPelajaran } from '../types';

export interface FormulaSuggestionItem {
    token: string;
    insertText: string;
    label: string;
    syntax: string;
    description: string;
    category: 'formula' | 'tag' | 'input_key';
}

export const RAPOR_FORMULA_SUGGESTIONS: FormulaSuggestionItem[] = [
    {
        token: '=SUM',
        insertText: '=SUM(',
        label: 'Penjumlahan Nilai (SUM)',
        syntax: '=SUM($A, $B, ...)',
        description: 'Menjumlahkan beberapa variabel nilai sekaligus',
        category: 'formula'
    },
    {
        token: '=RATA2',
        insertText: '=RATA2(',
        label: 'Rata-rata Nilai (RATA2)',
        syntax: '=RATA2($A, $B, ...)',
        description: 'Menghitung nilai rata-rata otomatis (2 desimal maks)',
        category: 'formula'
    },
    {
        token: '=PREDIKAT',
        insertText: '=PREDIKAT(',
        label: 'Predikat Huruf / Arab-Latin',
        syntax: '=PREDIKAT($NILAI, "huruf")',
        description: 'Otomatis A/B/C/D atau "pesantren" (Mumtaz, Jayyid Jiddan, dst)',
        category: 'formula'
    },
    {
        token: '=TERBILANG',
        insertText: '=TERBILANG(',
        label: 'Angka ke Huruf Terbilang',
        syntax: '=TERBILANG($NILAI)',
        description: 'Mengubah angka 85 menjadi "Delapan Puluh Lima"',
        category: 'formula'
    },
    {
        token: '=ARAB',
        insertText: '=ARAB(',
        label: 'Angka ke Huruf/Angka Arab',
        syntax: '=ARAB($NILAI)',
        description: 'Mengubah angka Latin 85 menjadi angka Arab ٨٥',
        category: 'formula'
    },
    {
        token: '=IF',
        insertText: '=IF(',
        label: 'Logika Kondisi (IF)',
        syntax: '=IF($NILAI>=75, "Tuntas", "Remidi")',
        description: 'Menampilkan hasil berdasarkan syarat perbandingan nilai',
        category: 'formula'
    },
    {
        token: '=MAX',
        insertText: '=MAX(',
        label: 'Nilai Tertinggi (MAX)',
        syntax: '=MAX($A, $B, ...)',
        description: 'Mengambil nilai paling tinggi dari daftar variabel',
        category: 'formula'
    },
    {
        token: '=MIN',
        insertText: '=MIN(',
        label: 'Nilai Terendah (MIN)',
        syntax: '=MIN($A, $B, ...)',
        description: 'Mengambil nilai paling rendah dari daftar variabel',
        category: 'formula'
    },
    {
        token: '=RANK',
        insertText: '=RANK($TOTAL_NILAI, "rombel")',
        label: 'Peringkat Kelas (RANK)',
        syntax: '=RANK($TOTAL_NILAI, "rombel")',
        description: 'Menampilkan peringkat santri di rombel aktif',
        category: 'formula'
    },
    {
        token: '=CONCAT',
        insertText: '=CONCAT(',
        label: 'Gabung Teks & Variabel',
        syntax: '=CONCAT("Marhalah ", $JENJANG)',
        description: 'Menggabungkan teks statis dengan variabel dinamis',
        category: 'formula'
    }
];

const SATUAN = [
    '',
    'Satu',
    'Dua',
    'Tiga',
    'Empat',
    'Lima',
    'Enam',
    'Tujuh',
    'Delapan',
    'Sembilan',
    'Sepuluh',
    'Sebelas'
];

function terbilangBulatPositif(n: number): string {
    const num = Math.floor(Math.abs(n));
    if (num === 0) return '';
    if (num < 12) return SATUAN[num];
    if (num < 20) return `${terbilangBulatPositif(num - 10)} Belas`.trim();
    if (num < 100) {
        const puluh = Math.floor(num / 10);
        const sisa = num % 10;
        return `${terbilangBulatPositif(puluh)} Puluh ${terbilangBulatPositif(sisa)}`.trim();
    }
    if (num < 200) {
        return `Seratus ${terbilangBulatPositif(num - 100)}`.trim();
    }
    if (num < 1000) {
        const ratus = Math.floor(num / 100);
        const sisa = num % 100;
        return `${terbilangBulatPositif(ratus)} Ratus ${terbilangBulatPositif(sisa)}`.trim();
    }
    if (num < 2000) {
        return `Seribu ${terbilangBulatPositif(num - 1000)}`.trim();
    }
    if (num < 1_000_000) {
        const ribu = Math.floor(num / 1000);
        const sisa = num % 1000;
        return `${terbilangBulatPositif(ribu)} Ribu ${terbilangBulatPositif(sisa)}`.trim();
    }
    if (num < 1_000_000_000) {
        const juta = Math.floor(num / 1_000_000);
        const sisa = num % 1_000_000;
        return `${terbilangBulatPositif(juta)} Juta ${terbilangBulatPositif(sisa)}`.trim();
    }
    return String(num);
}

/**
 * Mengubah angka menjadi teks Bahasa Indonesia (contoh: 85 -> "Delapan Puluh Lima", 85.5 -> "Delapan Puluh Lima Koma Lima")
 */
export function angkaKeTerbilang(input: number | string): string {
    if (input === null || input === undefined) return '-';
    const raw = String(input).trim().replace(',', '.');
    if (raw === '' || raw === '-') return '-';

    const parsed = Number(raw);
    if (isNaN(parsed)) return String(input);

    if (parsed === 0) return 'Nol';

    const isNegative = parsed < 0;
    const absStr = Math.abs(parsed).toString();
    const [intPartStr, decPartStr] = absStr.split('.');
    const intPart = parseInt(intPartStr, 10) || 0;

    let result = intPart === 0 ? 'Nol' : terbilangBulatPositif(intPart);

    if (decPartStr && decPartStr.length > 0) {
        const decWords = decPartStr
            .slice(0, 2)
            .split('')
            .map(d => (d === '0' ? 'Nol' : SATUAN[parseInt(d, 10)] || ''))
            .filter(Boolean)
            .join(' ');
        if (decWords) {
            result = `${result} Koma ${decWords}`;
        }
    }

    return isNegative ? `Minus ${result}` : result;
}

const ARABIC_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

/**
 * Mengubah angka Latin (0-9) menjadi angka Arab Timur (٠-٩)
 */
export function angkaKeArab(input: number | string): string {
    if (input === null || input === undefined) return '-';
    const raw = String(input).trim();
    if (raw === '') return '-';
    return raw.replace(/[0-9]/g, d => ARABIC_DIGITS[parseInt(d, 10)] ?? d).replace(/\./g, '٫');
}

/**
 * Konversi nilai angka ke predikat huruf (A-E) atau taqdir pesantren
 */
export function nilaiKePredikatOtomatis(nilaiInput: number | string, mode: string = 'huruf'): string {
    const raw = String(nilaiInput ?? '').trim().replace(',', '.');
    if (!raw || raw === '-') return '-';
    const n = Number(raw);
    if (isNaN(n)) return '-';

    const m = mode.toLowerCase();
    if (m === 'pesantren' || m === 'arab' || m === 'taqdir') {
        if (n >= 90) return 'Mumtaz';
        if (n >= 80) return 'Jayyid Jiddan';
        if (n >= 70) return 'Jayyid';
        if (n >= 60) return 'Maqbul';
        return 'Rasib';
    }
    if (m === 'arab_script') {
        if (n >= 90) return 'ممتاز';
        if (n >= 80) return 'جيد جدا';
        if (n >= 70) return 'جيد';
        if (n >= 60) return 'مقبول';
        return 'راسب';
    }
    if (m === 'deskripsi') {
        if (n >= 90) return 'Sangat Baik';
        if (n >= 80) return 'Baik';
        if (n >= 70) return 'Cukup';
        return 'Perlu Bimbingan';
    }
    // Default huruf A-E
    if (n >= 90) return 'A';
    if (n >= 80) return 'B';
    if (n >= 70) return 'C';
    if (n >= 60) return 'D';
    return 'E';
}

/**
 * Memecah argumen fungsi tingkat atas dengan menghormati tanda kutip dan kurung bersarang.
 * Mendukung pemisah koma (,) maupun titik koma (;) seperti Excel regional Indonesia.
 */
function splitTopLevelArgs(argsStr: string): string[] {
    const result: string[] = [];
    let current = '';
    let depth = 0;
    let inQuote: '"' | "'" | null = null;

    for (let i = 0; i < argsStr.length; i++) {
        const ch = argsStr[i];
        if (inQuote) {
            if (ch === inQuote && argsStr[i - 1] !== '\\') {
                inQuote = null;
            }
            current += ch;
            continue;
        }
        if (ch === '"' || ch === "'") {
            inQuote = ch;
            current += ch;
            continue;
        }
        if (ch === '(') {
            depth++;
            current += ch;
            continue;
        }
        if (ch === ')') {
            depth = Math.max(0, depth - 1);
            current += ch;
            continue;
        }
        if ((ch === ',' || ch === ';') && depth === 0) {
            result.push(current.trim());
            current = '';
            continue;
        }
        current += ch;
    }
    if (current.trim() !== '' || result.length > 0) {
        result.push(current.trim());
    }
    return result;
}

function unquote(str: string): string {
    const t = str.trim();
    if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
        return t.slice(1, -1);
    }
    return t;
}

function parseNumericValues(evaluatedArgs: string[]): number[] {
    const nums: number[] = [];
    for (const item of evaluatedArgs) {
        const cleaned = unquote(item).trim().replace(',', '.');
        if (cleaned !== '' && cleaned !== '-') {
            const n = Number(cleaned);
            if (!isNaN(n)) nums.push(n);
        }
    }
    return nums;
}

function formatNumberClean(n: number): string {
    if (!isFinite(n) || isNaN(n)) return '-';
    if (Number.isInteger(n)) return String(n);
    return Number(n.toFixed(2)).toString();
}

/**
 * Evaluator aritmatika aman (+, -, *, /, tanda kurung) tanpa eval()
 */
function evaluateSafeMath(expr: string): number | null {
    const s = expr.replace(/\s+/g, '');
    if (!s || !/^[0-9.+\-*/()]+$/.test(s)) return null;

    let pos = 0;

    const parseExpression = (): number => {
        let val = parseTerm();
        while (pos < s.length && (s[pos] === '+' || s[pos] === '-')) {
            const op = s[pos++];
            const right = parseTerm();
            val = op === '+' ? val + right : val - right;
        }
        return val;
    };

    const parseTerm = (): number => {
        let val = parseFactor();
        while (pos < s.length && (s[pos] === '*' || s[pos] === '/')) {
            const op = s[pos++];
            const right = parseFactor();
            val = op === '*' ? val * right : (right === 0 ? 0 : val / right);
        }
        return val;
    };

    const parseFactor = (): number => {
        if (s[pos] === '+') {
            pos++;
            return parseFactor();
        }
        if (s[pos] === '-') {
            pos++;
            return -parseFactor();
        }
        if (s[pos] === '(') {
            pos++;
            const val = parseExpression();
            if (s[pos] === ')') pos++;
            return val;
        }
        const start = pos;
        while (pos < s.length && /[0-9.]/.test(s[pos])) {
            pos++;
        }
        if (start === pos) return NaN;
        return parseFloat(s.slice(start, pos));
    };

    try {
        const res = parseExpression();
        if (pos !== s.length || isNaN(res)) return null;
        return res;
    } catch {
        return null;
    }
}

function evaluateCondition(condExpr: string, fallbackRank?: number): boolean {
    const ops = ['>=', '<=', '<>', '!=', '==', '=', '>', '<'] as const;
    let inQuote: '"' | "'" | null = null;
    let depth = 0;

    for (const op of ops) {
        for (let i = 0; i <= condExpr.length - op.length; i++) {
            const ch = condExpr[i];
            if (inQuote) {
                if (ch === inQuote && condExpr[i - 1] !== '\\') inQuote = null;
                continue;
            }
            if (ch === '"' || ch === "'") {
                inQuote = ch;
                continue;
            }
            if (ch === '(') { depth++; continue; }
            if (ch === ')') { depth = Math.max(0, depth - 1); continue; }

            if (depth === 0 && condExpr.slice(i, i + op.length) === op) {
                // Pastikan '=' tidak mencocokkan bagian dari '>=', '<=', '!=', '=='
                if (op === '=' && (condExpr[i - 1] === '>' || condExpr[i - 1] === '<' || condExpr[i - 1] === '!' || condExpr[i + 1] === '=')) {
                    continue;
                }
                const leftRaw = evaluateFormulaNode(condExpr.slice(0, i), fallbackRank);
                const rightRaw = evaluateFormulaNode(condExpr.slice(i + op.length), fallbackRank);
                const leftNum = Number(unquote(leftRaw).replace(',', '.'));
                const rightNum = Number(unquote(rightRaw).replace(',', '.'));
                const bothNum = unquote(leftRaw).trim() !== '' && unquote(rightRaw).trim() !== '' && !isNaN(leftNum) && !isNaN(rightNum);

                if (bothNum) {
                    if (op === '>=') return leftNum >= rightNum;
                    if (op === '<=') return leftNum <= rightNum;
                    if (op === '>' ) return leftNum > rightNum;
                    if (op === '<' ) return leftNum < rightNum;
                    if (op === '<>' || op === '!=') return leftNum !== rightNum;
                    return leftNum === rightNum;
                } else {
                    const lStr = unquote(leftRaw).trim().toLowerCase();
                    const rStr = unquote(rightRaw).trim().toLowerCase();
                    if (op === '<>' || op === '!=') return lStr !== rStr;
                    return lStr === rStr;
                }
            }
        }
    }

    const val = unquote(evaluateFormulaNode(condExpr, fallbackRank)).trim().toLowerCase();
    return Boolean(val && val !== '0' && val !== 'false' && val !== '-');
}

function evaluateFormulaNode(expr: string, fallbackRank?: number): string {
    const trimmed = expr.trim();
    if (!trimmed) return '';

    // String literal murni
    if ((trimmed.startsWith('"') && trimmed.endsWith('"') && !trimmed.slice(1, -1).includes('"')) ||
        (trimmed.startsWith("'") && trimmed.endsWith("'") && !trimmed.slice(1, -1).includes("'"))) {
        return unquote(trimmed);
    }

    // Operator penggabungan teks (&) pada level terluar
    {
        const ampParts: string[] = [];
        let cur = '';
        let depth = 0;
        let inQuote: '"' | "'" | null = null;
        for (let i = 0; i < trimmed.length; i++) {
            const ch = trimmed[i];
            if (inQuote) {
                if (ch === inQuote && trimmed[i - 1] !== '\\') inQuote = null;
                cur += ch;
                continue;
            }
            if (ch === '"' || ch === "'") { inQuote = ch; cur += ch; continue; }
            if (ch === '(') { depth++; cur += ch; continue; }
            if (ch === ')') { depth = Math.max(0, depth - 1); cur += ch; continue; }
            if (ch === '&' && depth === 0) {
                ampParts.push(cur);
                cur = '';
                continue;
            }
            cur += ch;
        }
        if (ampParts.length > 0) {
            ampParts.push(cur);
            return ampParts.map(p => unquote(evaluateFormulaNode(p, fallbackRank))).join('');
        }
    }

    // Pemanggilan Fungsi: FUNC_NAME(...)
    const fnMatch = trimmed.match(/^([A-Za-z0-9_]+)\s*\(([\s\S]*)\)$/);
    if (fnMatch) {
        // Pastikan kurung penutup di akhir benar-benar pasangan kurung pembuka pertama
        const openIdx = trimmed.indexOf('(');
        let depth = 0;
        let inQuote: '"' | "'" | null = null;
        let closedAtEnd = false;
        for (let i = openIdx; i < trimmed.length; i++) {
            const ch = trimmed[i];
            if (inQuote) {
                if (ch === inQuote && trimmed[i - 1] !== '\\') inQuote = null;
                continue;
            }
            if (ch === '"' || ch === "'") { inQuote = ch; continue; }
            if (ch === '(') depth++;
            else if (ch === ')') {
                depth--;
                if (depth === 0) {
                    closedAtEnd = i === trimmed.length - 1;
                    break;
                }
            }
        }

        if (closedAtEnd) {
            const fnName = fnMatch[1].toUpperCase();
            const rawInner = fnMatch[2];
            const rawArgs = splitTopLevelArgs(rawInner);

            if (fnName === 'IF' || fnName === 'JIKA') {
                if (rawArgs.length >= 2) {
                    const cond = evaluateCondition(rawArgs[0], fallbackRank);
                    if (cond) return unquote(evaluateFormulaNode(rawArgs[1], fallbackRank));
                    return rawArgs[2] !== undefined ? unquote(evaluateFormulaNode(rawArgs[2], fallbackRank)) : '';
                }
                return '-';
            }

            const evalArgs = rawArgs.map(a => evaluateFormulaNode(a, fallbackRank));

            if (fnName === 'CONCAT' || fnName === 'CONCATENATE' || fnName === 'GABUNG') {
                return evalArgs.map(unquote).join('');
            }
            if (fnName === 'SUM' || fnName === 'JUMLAH' || fnName === 'TOTAL') {
                const nums = parseNumericValues(evalArgs);
                if (nums.length === 0) return '-';
                return formatNumberClean(nums.reduce((a, b) => a + b, 0));
            }
            if (fnName === 'RATA2' || fnName === 'AVERAGE' || fnName === 'AVG' || fnName === 'RERATA') {
                const nums = parseNumericValues(evalArgs);
                if (nums.length === 0) return '-';
                return formatNumberClean(nums.reduce((a, b) => a + b, 0) / nums.length);
            }
            if (fnName === 'MAX') {
                const nums = parseNumericValues(evalArgs);
                if (nums.length === 0) return '-';
                return formatNumberClean(Math.max(...nums));
            }
            if (fnName === 'MIN') {
                const nums = parseNumericValues(evalArgs);
                if (nums.length === 0) return '-';
                return formatNumberClean(Math.min(...nums));
            }
            if (fnName === 'ROUND' || fnName === 'BULAT') {
                const nums = parseNumericValues(evalArgs);
                if (nums.length === 0) return '-';
                const digits = nums[1] !== undefined ? Math.max(0, Math.min(4, Math.floor(nums[1]))) : 0;
                return Number(nums[0].toFixed(digits)).toString();
            }
            if (fnName === 'TERBILANG') {
                const val = evalArgs[0] !== undefined ? unquote(evalArgs[0]) : '';
                return angkaKeTerbilang(val);
            }
            if (fnName === 'ARAB' || fnName === 'ANGKA_ARAB') {
                const val = evalArgs[0] !== undefined ? unquote(evalArgs[0]) : '';
                return angkaKeArab(val);
            }
            if (fnName === 'PREDIKAT' || fnName === 'HURUF' || fnName === 'TAQDIR') {
                const val = evalArgs[0] !== undefined ? unquote(evalArgs[0]) : '';
                const mode = evalArgs[1] !== undefined ? unquote(evalArgs[1]) : (fnName === 'TAQDIR' ? 'pesantren' : 'huruf');
                return nilaiKePredikatOtomatis(val, mode);
            }
            if (fnName === 'RANK' || fnName === 'PERINGKAT') {
                return fallbackRank && fallbackRank > 0 ? String(fallbackRank) : '-';
            }
        }
    }

    // Coba evaluasi ekspresi matematika jika mengandung angka/operator
    const mathVal = evaluateSafeMath(trimmed);
    if (mathVal !== null) {
        return formatNumberClean(mathVal);
    }

    return unquote(trimmed);
}

/**
 * Mengevaluasi rumus sel rapor setelah seluruh placeholder $TAG disubstitusi.
 * Mendukung penulisan dengan awalan '=' (misal '=RATA2(80, 90)') maupun fungsi langsung pada sel bertipe formula ('RATA2(80, 90)').
 */
export function evaluateRaporFormula(resolvedText: string, fallbackRank?: number): string {
    const trimmed = resolvedText.trim();
    if (!trimmed) return '';

    const isExplicitFormula = trimmed.startsWith('=');
    const body = isExplicitFormula ? trimmed.slice(1).trim() : trimmed;

    // Jika diawali '=' atau cocok dengan pola fungsi rumus standar rapor
    const isKnownFunctionCall = /^(?:SUM|JUMLAH|TOTAL|RATA2|AVERAGE|AVG|RERATA|MAX|MIN|ROUND|BULAT|IF|JIKA|TERBILANG|ARAB|ANGKA_ARAB|PREDIKAT|HURUF|TAQDIR|RANK|PERINGKAT|CONCAT|CONCATENATE|GABUNG)\s*\([\s\S]*\)$/i.test(body);

    if (!isExplicitFormula && !isKnownFunctionCall) {
        return resolvedText;
    }

    // Jika masih ada variabel $BELUM_DIISI yang tersisa di dalam rumus, anggap kosong ("") agar tidak merusak perhitungan SUM/RATA2
    const sanitizedBody = body.replace(/\$[A-Z0-9_]+/gi, '""');
    return evaluateFormulaNode(sanitizedBody, fallbackRank);
}

/**
 * Membuat kode unik variabel $KEY yang rapi dari nama Mata Pelajaran Kurikulum
 */
export function generateSubjectKeyFromName(
    mapel: Pick<MataPelajaran, 'nama' | 'kodeMapel'>,
    usedKeys: Set<string>
): string {
    const rawBase = (mapel.kodeMapel && mapel.kodeMapel.trim())
        ? mapel.kodeMapel.trim()
        : mapel.nama.trim();

    let cleaned = rawBase
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');

    if (!cleaned || /^[0-9]/.test(cleaned)) {
        cleaned = `MAPEL_${cleaned || '1'}`;
    }
    if (cleaned.length > 18) {
        cleaned = cleaned.slice(0, 18).replace(/_+$/, '');
    }

    let candidate = cleaned;
    let counter = 2;
    while (usedKeys.has(candidate)) {
        candidate = `${cleaned}_${counter}`;
        counter++;
    }
    usedKeys.add(candidate);
    return candidate;
}
