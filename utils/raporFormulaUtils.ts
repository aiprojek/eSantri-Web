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
        syntax: '=SUM(D6:D15)',
        description: 'Ketik lalu blok/seret sel nilai di tabel (misal D6:D15 atau $A, $B)',
        category: 'formula'
    },
    {
        token: '=RATA2',
        insertText: '=RATA2(',
        label: 'Rata-rata Nilai (RATA2)',
        syntax: '=RATA2(D6:D15)',
        description: 'Ketik lalu blok/seret sel nilai di tabel untuk rata-rata otomatis',
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
        syntax: '=MAX(D6:D15)',
        description: 'Mengambil nilai tertinggi dari blok sel atau daftar variabel',
        category: 'formula'
    },
    {
        token: '=MIN',
        insertText: '=MIN(',
        label: 'Nilai Terendah (MIN)',
        syntax: '=MIN(D6:D15)',
        description: 'Mengambil nilai terendah dari blok sel atau daftar variabel',
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
        label: 'Gabung Teks & Variabel (CONCAT)',
        syntax: '=CONCAT("Semester ", $SEMESTER)',
        description: 'Menggabungkan kata & variabel dengan tetap menjaga spasi di dalam tanda kutip (" ")',
        category: 'formula'
    },
    {
        token: '=CONCAT_SPASI',
        insertText: '=CONCAT_SPASI(',
        label: 'Gabung Otomatis Berspasi',
        syntax: '=CONCAT_SPASI("Marhalah", $JENJANG)',
        description: 'Menggabungkan beberapa teks/variabel dan otomatis memberi 1 spasi antar kata',
        category: 'formula'
    },
    {
        token: '=UPPER',
        insertText: '=UPPER(',
        label: 'Huruf Besar Semua (UPPER)',
        syntax: '=UPPER($NAMA)',
        description: 'Mengubah seluruh huruf menjadi KAPITAL / HURUF BESAR',
        category: 'formula'
    },
    {
        token: '=LOWER',
        insertText: '=LOWER(',
        label: 'Huruf Kecil Semua (LOWER)',
        syntax: '=LOWER($TEKS)',
        description: 'Mengubah seluruh huruf menjadi huruf kecil',
        category: 'formula'
    },
    {
        token: '=PROPER',
        insertText: '=PROPER(',
        label: 'Kapital Awal Kata / Judul (PROPER)',
        syntax: '=PROPER($NAMA)',
        description: 'Mengubah huruf pertama setiap kata menjadi Kapital (Ahmad Fauzan)',
        category: 'formula'
    },
    {
        token: '=TAHUN_AJAR',
        insertText: '=TAHUN_AJAR()',
        label: 'Tahun Ajaran (Sesuai Master)',
        syntax: '=TAHUN_AJAR()',
        description: 'Otomatis Masehi atau Gabungan jika tampilan Hijriah diaktifkan di Data Master',
        category: 'formula'
    },
    {
        token: '=TAHUN_AJAR_MASEHI',
        insertText: '=TAHUN_AJAR_MASEHI()',
        label: 'Tahun Ajaran Masehi',
        syntax: '=TAHUN_AJAR_MASEHI()',
        description: 'Menampilkan tahun ajaran Masehi aktif (misal 2026/2027)',
        category: 'formula'
    },
    {
        token: '=TAHUN_AJAR_HIJRIAH',
        insertText: '=TAHUN_AJAR_HIJRIAH()',
        label: 'Tahun Ajaran Hijriah',
        syntax: '=TAHUN_AJAR_HIJRIAH()',
        description: 'Menampilkan tahun ajaran Hijriah aktif (misal 1448/1449 H)',
        category: 'formula'
    },
    {
        token: '=TAHUN_AJAR_GABUNGAN',
        insertText: '=TAHUN_AJAR_GABUNGAN()',
        label: 'Tahun Ajaran Hijriah & Masehi',
        syntax: '=TAHUN_AJAR_GABUNGAN()',
        description: 'Menampilkan gabungan Hijriah & Masehi (misal 1448/1449 H / 2026/2027 M)',
        category: 'formula'
    },
    {
        token: '=SEMESTER',
        insertText: '=SEMESTER()',
        label: 'Semester Aktif',
        syntax: '=SEMESTER()',
        description: 'Memanggil semester aktif berjalan (Ganjil / Genap)',
        category: 'formula'
    }
];

export type TextTransformMode = 'none' | 'uppercase' | 'lowercase' | 'capitalize' | 'sentence';

export interface FormulaEvalMeta {
    rank?: number;
    tahunAjaran?: string;          // otomatis (mengikuti hijriEnabled di Data Master)
    tahunAjaranMasehi?: string;    // khusus Masehi (misal "2026/2027")
    tahunAjaranHijriah?: string;   // khusus Hijriah (misal "1448/1449 H")
    tahunAjaranGabungan?: string;  // khusus Gabungan (misal "1448/1449 H / 2026/2027 M")
    semester?: string;
}

/**
 * Mengubah teks menjadi Kapital Setiap Kata (Title Case / Proper Case) termasuk bila sumbernya HURUF BESAR SEMUA
 */
export function toTitleCase(input: string): string {
    if (!input) return '';
    return input
        .toLowerCase()
        .replace(/(^|[\s\-/'".()[\]]+)([a-zà-ÿ])/g, (_m, sep: string, ch: string) => `${sep}${ch.toUpperCase()}`);
}

/**
 * Mengubah teks menjadi Kapital Awal Kalimat (Sentence case)
 */
export function toSentenceCase(input: string): string {
    if (!input) return '';
    return input
        .toLowerCase()
        .replace(/(^\s*|[.!?]\s+|\n\s*)([a-zà-ÿ])/g, (_m, sep: string, ch: string) => `${sep}${ch.toUpperCase()}`);
}

/**
 * Menerapkan format huruf sel (UPPERCASE, lowercase, Title Case, Sentence case) secara konsisten di kanvas, preview, dan cetak PDF
 */
export function applyCellTextTransform(text: string, mode?: TextTransformMode): string {
    if (!text || !mode || mode === 'none') return text;
    if (mode === 'uppercase') return text.toUpperCase();
    if (mode === 'lowercase') return text.toLowerCase();
    if (mode === 'capitalize') return toTitleCase(text);
    if (mode === 'sentence') return toSentenceCase(text);
    return text;
}

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

function isSingleQuotedLiteral(str: string): boolean {
    const t = str.trim();
    if (t.length < 2) return false;
    const quote = t[0];
    if (quote !== '"' && quote !== "'") return false;
    for (let i = 1; i < t.length; i++) {
        if (t[i] === quote && t[i - 1] !== '\\') {
            return i === t.length - 1;
        }
    }
    return false;
}

function unquote(str: string): string {
    const t = str.trim();
    if (isSingleQuotedLiteral(t)) {
        const q = t[0];
        const inner = t.slice(1, -1);
        return q === '"'
            ? inner.replace(/\\"/g, '"').replace(/\\\\/g, '\\')
            : inner.replace(/\\'/g, "'").replace(/\\\\/g, '\\');
    }
    // Pertahankan spasi asli pada string yang sudah dievaluasi/di-unquote sebelumnya (misal "Semester " atau " ")
    return str;
}

function joinTextArgsSmart(evalArgs: string[]): string {
    const parts = evalArgs.map(unquote);
    if (parts.length === 0) return '';
    if (parts.length === 1) return parts[0];
    return parts.reduce((acc, part, idx) => {
        if (idx === 0) return part;
        if (!acc) return part;
        if (!part) return acc;
        return (/\s$/.test(acc) || /^\s/.test(part)) ? (acc + part) : `${acc} ${part}`;
    }, '');
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

function evaluateCondition(condExpr: string, meta?: FormulaEvalMeta): boolean {
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
                const leftRaw = evaluateFormulaNode(condExpr.slice(0, i), meta);
                const rightRaw = evaluateFormulaNode(condExpr.slice(i + op.length), meta);
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

    const val = unquote(evaluateFormulaNode(condExpr, meta)).trim().toLowerCase();
    return Boolean(val && val !== '0' && val !== 'false' && val !== '-');
}

function evaluateFormulaNode(expr: string, meta?: FormulaEvalMeta): string {
    const trimmed = expr.trim();
    if (!trimmed) return '';

    // String literal murni
    if (isSingleQuotedLiteral(trimmed)) {
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
            return ampParts.map(p => unquote(evaluateFormulaNode(p, meta))).join('');
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
                    const cond = evaluateCondition(rawArgs[0], meta);
                    if (cond) return unquote(evaluateFormulaNode(rawArgs[1], meta));
                    return rawArgs[2] !== undefined ? unquote(evaluateFormulaNode(rawArgs[2], meta)) : '';
                }
                return '-';
            }

            const evalArgs = rawArgs.map(a => evaluateFormulaNode(a, meta));

            if (fnName === 'CONCAT' || fnName === 'CONCATENATE' || fnName === 'GABUNG') {
                return evalArgs.map(unquote).join('');
            }
            if (fnName === 'CONCAT_SPASI' || fnName === 'GABUNG_SPASI' || fnName === 'TEXTJOIN_SPASI') {
                return evalArgs.map(a => unquote(a).trim()).filter(Boolean).join(' ');
            }
            if (fnName === 'UPPER' || fnName === 'BESAR' || fnName === 'KAPITAL') {
                return joinTextArgsSmart(evalArgs).toUpperCase();
            }
            if (fnName === 'LOWER' || fnName === 'KECIL') {
                return joinTextArgsSmart(evalArgs).toLowerCase();
            }
            if (fnName === 'PROPER' || fnName === 'JUDUL' || fnName === 'TITLE' || fnName === 'CAPITALIZE') {
                return toTitleCase(joinTextArgsSmart(evalArgs));
            }
            if (fnName === 'SENTENCE' || fnName === 'KALIMAT') {
                return toSentenceCase(joinTextArgsSmart(evalArgs));
            }
            if (fnName === 'TRIM') {
                return joinTextArgsSmart(evalArgs).replace(/\s+/g, ' ').trim();
            }
            if (fnName === 'TAHUN_AJAR' || fnName === 'TAHUN_AJARAN' || fnName === 'TAHUNAJAR' || fnName === 'TAHUNAJARAN' || fnName === 'TAPEL' || fnName === 'TAHUN_PELAJARAN') {
                const modeArg = evalArgs[0] !== undefined ? unquote(evalArgs[0]).trim().toLowerCase() : '';
                const masehiVal = meta?.tahunAjaranMasehi || meta?.tahunAjaran || '-';
                const hijriVal = meta?.tahunAjaranHijriah || '-';
                const gabunganVal = meta?.tahunAjaranGabungan || (hijriVal !== '-' ? `${hijriVal} / ${masehiVal} M` : masehiVal);

                if (modeArg === 'masehi' || modeArg === 'm') {
                    return modeArg === 'm' && masehiVal !== '-' && !/\bM$/i.test(masehiVal) ? `${masehiVal} M` : masehiVal;
                }
                if (modeArg === 'hijriah' || modeArg === 'hijriyah' || modeArg === 'hijri' || modeArg === 'h') {
                    return hijriVal;
                }
                if (modeArg === 'lengkap' || modeArg === 'gabungan' || modeArg === 'hijriah_masehi' || modeArg === 'hm') {
                    return gabunganVal;
                }
                if (modeArg === 'masehi_hijriah' || modeArg === 'mh' || modeArg === 'masehi_dulu') {
                    const mWithSuffix = masehiVal !== '-' && !/\bM$/i.test(masehiVal) ? `${masehiVal} M` : masehiVal;
                    return hijriVal !== '-' ? `${mWithSuffix} / ${hijriVal}` : masehiVal;
                }
                return meta?.tahunAjaran || masehiVal;
            }
            if (fnName === 'TAHUN_AJAR_MASEHI' || fnName === 'TAHUN_AJARAN_MASEHI' || fnName === 'TAPEL_MASEHI') {
                const modeArg = evalArgs[0] !== undefined ? unquote(evalArgs[0]).trim().toLowerCase() : '';
                const masehiVal = meta?.tahunAjaranMasehi || meta?.tahunAjaran || '-';
                if (masehiVal === '-') return '-';
                if (modeArg === 'm' || modeArg === 'lengkap') {
                    return /\bM$/i.test(masehiVal) ? masehiVal : `${masehiVal} M`;
                }
                if (modeArg === 'arab') {
                    return `${angkaKeArab(masehiVal.replace(/\s*M$/i, ''))} م`;
                }
                return masehiVal;
            }
            if (fnName === 'TAHUN_AJAR_HIJRIAH' || fnName === 'TAHUN_AJARAN_HIJRIAH' || fnName === 'TAHUN_AJAR_HIJRIYAH' || fnName === 'TAHUN_AJARAN_HIJRIYAH' || fnName === 'TAPEL_HIJRIAH') {
                const modeArg = evalArgs[0] !== undefined ? unquote(evalArgs[0]).trim().toLowerCase() : '';
                const hijriVal = meta?.tahunAjaranHijriah || '-';
                if (hijriVal === '-') return '-';
                if (modeArg === 'angka' || modeArg === 'tanpa_h' || modeArg === 'polos') {
                    return hijriVal.replace(/\s*H$/i, '').trim();
                }
                if (modeArg === 'arab') {
                    return `${angkaKeArab(hijriVal.replace(/\s*H$/i, '').trim())} هـ`;
                }
                return hijriVal;
            }
            if (fnName === 'TAHUN_AJAR_GABUNGAN' || fnName === 'TAHUN_AJAR_LENGKAP' || fnName === 'TAHUN_AJARAN_GABUNGAN' || fnName === 'TAHUN_AJARAN_LENGKAP' || fnName === 'TAPEL_GABUNGAN') {
                const modeArg = evalArgs[0] !== undefined ? unquote(evalArgs[0]).trim().toLowerCase() : '';
                const masehiVal = meta?.tahunAjaranMasehi || meta?.tahunAjaran || '-';
                const hijriVal = meta?.tahunAjaranHijriah || '-';
                const gabunganVal = meta?.tahunAjaranGabungan || (hijriVal !== '-' ? `${hijriVal} / ${masehiVal} M` : masehiVal);
                if (modeArg === 'masehi_dulu' || modeArg === 'masehi_hijriah' || modeArg === 'mh') {
                    const mWithSuffix = masehiVal !== '-' && !/\bM$/i.test(masehiVal) ? `${masehiVal} M` : masehiVal;
                    return hijriVal !== '-' ? `${mWithSuffix} / ${hijriVal}` : masehiVal;
                }
                if (modeArg === 'arab') {
                    const hClean = hijriVal.replace(/\s*H$/i, '').trim();
                    const mClean = masehiVal.replace(/\s*M$/i, '').trim();
                    return `${angkaKeArab(hClean)} هـ / ${angkaKeArab(mClean)} م`;
                }
                return gabunganVal;
            }
            if (fnName === 'SEMESTER') {
                const modeArg = evalArgs[0] !== undefined ? unquote(evalArgs[0]).trim().toLowerCase() : '';
                const semStr = meta?.semester || 'Ganjil';
                if (modeArg === 'angka' || modeArg === 'nomor') {
                    return semStr === 'Genap' ? '2' : '1';
                }
                if (modeArg === 'romawi') {
                    return semStr === 'Genap' ? 'II' : 'I';
                }
                return semStr;
            }
            if (fnName === 'SEMESTER_ANGKA') {
                return (meta?.semester || 'Ganjil') === 'Genap' ? '2' : '1';
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
                return meta?.rank && meta.rank > 0 ? String(meta.rank) : '-';
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

const KNOWN_FORMULA_CALL_REGEX = /^(?:SUM|JUMLAH|TOTAL|RATA2|AVERAGE|AVG|RERATA|MAX|MIN|ROUND|BULAT|IF|JIKA|TERBILANG|ARAB|ANGKA_ARAB|PREDIKAT|HURUF|TAQDIR|RANK|PERINGKAT|CONCAT|CONCATENATE|GABUNG|CONCAT_SPASI|GABUNG_SPASI|TEXTJOIN_SPASI|UPPER|BESAR|KAPITAL|LOWER|KECIL|PROPER|JUDUL|TITLE|CAPITALIZE|SENTENCE|KALIMAT|TRIM|TAHUN_AJAR|TAHUN_AJARAN|TAHUNAJAR|TAHUNAJARAN|TAPEL|TAHUN_PELAJARAN|TAHUN_AJAR_MASEHI|TAHUN_AJARAN_MASEHI|TAPEL_MASEHI|TAHUN_AJAR_HIJRIAH|TAHUN_AJARAN_HIJRIAH|TAHUN_AJAR_HIJRIYAH|TAHUN_AJARAN_HIJRIYAH|TAPEL_HIJRIAH|TAHUN_AJAR_GABUNGAN|TAHUN_AJAR_LENGKAP|TAHUN_AJARAN_GABUNGAN|TAHUN_AJARAN_LENGKAP|TAPEL_GABUNGAN|SEMESTER|SEMESTER_ANGKA)\s*\([\s\S]*\)$/i;

/**
 * Mengecek apakah string teks sel merupakan ekspresi rumus rapor
 */
export function isRaporFormulaExpression(rawText: string): boolean {
    const trimmed = (rawText || '').trim();
    if (!trimmed) return false;
    if (trimmed.startsWith('=')) return true;
    return KNOWN_FORMULA_CALL_REGEX.test(trimmed);
}

/**
 * Mengevaluasi rumus sel rapor setelah seluruh placeholder $TAG disubstitusi.
 * Mendukung penulisan dengan awalan '=' (misal '=RATA2(80, 90)') maupun fungsi langsung pada sel bertipe formula ('RATA2(80, 90)').
 */
export function evaluateRaporFormula(resolvedText: string, rankOrMeta?: number | FormulaEvalMeta): string {
    const trimmed = resolvedText.trim();
    if (!trimmed) return '';

    const meta: FormulaEvalMeta | undefined = typeof rankOrMeta === 'number'
        ? { rank: rankOrMeta }
        : rankOrMeta;

    const isExplicitFormula = trimmed.startsWith('=');
    const body = isExplicitFormula ? trimmed.slice(1).trim() : trimmed;

    // Jika diawali '=' atau cocok dengan pola fungsi rumus standar rapor
    const isKnownFunctionCall = KNOWN_FORMULA_CALL_REGEX.test(body);

    if (!isExplicitFormula && !isKnownFunctionCall) {
        return resolvedText;
    }

    // Jika masih ada variabel $BELUM_DIISI yang tersisa di dalam rumus, bersihkan secara sadar-kutip agar tidak merusak string literal atau SUM/RATA2
    let sanitizedBody = '';
    let inQ: '"' | "'" | null = null;
    let idx = 0;
    while (idx < body.length) {
        const ch = body[idx];
        if (inQ) {
            if (ch === inQ && body[idx - 1] !== '\\') {
                inQ = null;
                sanitizedBody += ch;
                idx++;
                continue;
            }
            if (ch === '$') {
                const m = body.slice(idx).match(/^\$[A-Za-z0-9_]+/);
                if (m) {
                    idx += m[0].length;
                    continue;
                }
            }
            sanitizedBody += ch;
            idx++;
            continue;
        }
        if (ch === '"' || ch === "'") {
            inQ = ch;
            sanitizedBody += ch;
            idx++;
            continue;
        }
        if (ch === '$') {
            const m = body.slice(idx).match(/^\$[A-Za-z0-9_]+/);
            if (m) {
                sanitizedBody += '""';
                idx += m[0].length;
                continue;
            }
        }
        sanitizedBody += ch;
        idx++;
    }
    return evaluateFormulaNode(sanitizedBody, meta);
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

/**
 * Konversi indeks kolom 0-based menjadi huruf kolom Excel (0 -> A, 25 -> Z, 26 -> AA)
 */
export function colIndexToExcelLetters(colIndex: number): string {
    let name = '';
    let num = colIndex;
    while (num >= 0) {
        name = String.fromCharCode((num % 26) + 65) + name;
        num = Math.floor(num / 26) - 1;
    }
    return name;
}

/**
 * Konversi huruf kolom Excel (A, B, ..., Z, AA) menjadi indeks kolom 0-based
 */
export function excelLettersToColIndex(letters: string): number {
    const clean = letters.trim().toUpperCase();
    if (!/^[A-Z]{1,3}$/.test(clean)) return -1;
    let idx = 0;
    for (let i = 0; i < clean.length; i++) {
        idx = idx * 26 + (clean.charCodeAt(i) - 64);
    }
    return idx - 1;
}

/**
 * Format koordinat baris & kolom 0-based ke alamat Excel (misal r=5, c=3 -> "D6")
 */
export function formatExcelCellCoord(r: number, c: number): string {
    return `${colIndexToExcelLetters(c)}${r + 1}`;
}

/**
 * Mem-parsing koordinat sel tunggal Excel seperti "D6" atau "$D$6" menjadi { r, c } 0-based.
 * Secara bawaan menolak awalan satu '$' tanpa '$' kedua (seperti "$UH1" atau "$A1") agar tidak bentrok dengan kode variabel input ($KEY).
 */
export function parseExcelCellCoord(
    token: string,
    allowSingleLeadingDollar: boolean = false
): { r: number; c: number } | null {
    const t = token.trim();
    const match = allowSingleLeadingDollar
        ? t.match(/^\$?([A-Za-z]{1,2})\$?([1-9]\d{0,2})$/)
        : t.match(/^(?:\$([A-Za-z]{1,2})\$([1-9]\d{0,2})|([A-Za-z]{1,2})([1-9]\d{0,2}))$/);
    if (!match) return null;
    const colLetters = (match[1] || match[3] || '').toUpperCase();
    const rowStr = match[2] || match[4] || '';
    const c = excelLettersToColIndex(colLetters);
    const r = parseInt(rowStr, 10) - 1;
    if (c < 0 || r < 0) return null;
    return { r, c };
}

/**
 * Mem-parsing rentang sel Excel seperti "D6:D15" atau "$D$6:$D$15" menjadi batas baris & kolom 0-based
 */
export function parseExcelRangeCoord(
    token: string
): { rMin: number; rMax: number; cMin: number; cMax: number } | null {
    const parts = token.trim().split(/\s*:\s*/);
    if (parts.length !== 2) return null;
    const start = parseExcelCellCoord(parts[0], true);
    const end = parseExcelCellCoord(parts[1], true);
    if (!start || !end) return null;
    return {
        rMin: Math.min(start.r, end.r),
        rMax: Math.max(start.r, end.r),
        cMin: Math.min(start.c, end.c),
        cMax: Math.max(start.c, end.c)
    };
}

/**
 * Mengecek apakah posisi kursor di dalam rumus sedang siap menerima klik/blok sel dari tabel (seperti Point Mode di Excel)
 */
export function isFormulaReadyForCellPick(
    textBeforeCaret: string,
    fullText: string,
    isFormulaCellType: boolean = false
): boolean {
    const trimmedFull = fullText.trimStart();
    const startsAsFormula = trimmedFull.startsWith('=') || isFormulaCellType;
    if (!startsAsFormula) return false;

    // Pastikan kursor tidak sedang berada di dalam tanda kutip teks ("..." atau '...')
    let inQuote: '"' | "'" | null = null;
    for (let i = 0; i < textBeforeCaret.length; i++) {
        const ch = textBeforeCaret[i];
        if (inQuote) {
            if (ch === inQuote && textBeforeCaret[i - 1] !== '\\') inQuote = null;
        } else if (ch === '"' || ch === "'") {
            inQuote = ch;
        }
    }
    if (inQuote) return false;

    const trimmedBefore = textBeforeCaret.trimEnd();
    if (!trimmedBefore) {
        return isFormulaCellType && fullText.trim() === '';
    }

    const lastCh = trimmedBefore[trimmedBefore.length - 1];
    return ['=', '(', ',', ';', '+', '-', '*', '/', '&', '>', '<'].includes(lastCh);
}

/**
 * Menutup kurung buka '(' yang belum ditutup pada akhir penulisan rumus (misal '=SUM(D6:D15' -> '=SUM(D6:D15)')
 */
export function autoCloseFormulaParens(draft: string): string {
    const trimmed = draft.trim();
    if (!trimmed) return draft;
    if (!trimmed.startsWith('=') && !isRaporFormulaExpression(trimmed)) return draft;

    let openCount = 0;
    let inQuote: '"' | "'" | null = null;
    for (let i = 0; i < draft.length; i++) {
        const ch = draft[i];
        if (inQuote) {
            if (ch === inQuote && draft[i - 1] !== '\\') inQuote = null;
            continue;
        }
        if (ch === '"' || ch === "'") {
            inQuote = ch;
            continue;
        }
        if (ch === '(') openCount++;
        else if (ch === ')') openCount = Math.max(0, openCount - 1);
    }

    if (openCount > 0) {
        return draft.trimEnd() + ')'.repeat(openCount);
    }
    return draft;
}

/**
 * Mengekstrak daftar koordinat sel ("r:c") yang sedang direferensikan di dalam rumus (baik rentang D6:D15, sel tunggal D6, maupun $KEY)
 * untuk memberikan highlight warna bergaris putus-putus ala Excel pada kanvas desainer.
 */
export function extractFormulaReferencedCoords(
    formulaText: string,
    sheetCells?: { key?: string; hidden?: boolean; row: number; col: number }[][]
): Set<string> {
    const result = new Set<string>();
    if (!formulaText || !sheetCells || sheetCells.length === 0) return result;
    const trimmed = formulaText.trim();
    if (!trimmed.startsWith('=') && !isRaporFormulaExpression(trimmed)) return result;

    const rowCount = sheetCells.length;
    const colCount = sheetCells[0]?.length || 0;

    // Peta $KEY -> koordinat sel pada sheet aktif
    const keyMap = new Map<string, { r: number; c: number }[]>();
    for (let r = 0; r < rowCount; r++) {
        const row = sheetCells[r] || [];
        for (let c = 0; c < row.length; c++) {
            const cell = row[c];
            if (cell && !cell.hidden && cell.key) {
                const k = `$${cell.key.trim().toUpperCase()}`;
                const arr = keyMap.get(k) || [];
                arr.push({ r, c });
                keyMap.set(k, arr);
            }
        }
    }

    // Buang bagian string dalam tanda kutip agar tidak salah mendeteksi teks biasa
    let stripped = '';
    let inQuote: '"' | "'" | null = null;
    for (let i = 0; i < trimmed.length; i++) {
        const ch = trimmed[i];
        if (inQuote) {
            if (ch === inQuote && trimmed[i - 1] !== '\\') inQuote = null;
            stripped += ' ';
            continue;
        }
        if (ch === '"' || ch === "'") {
            inQuote = ch;
            stripped += ' ';
            continue;
        }
        stripped += ch;
    }

    // 1. Rentang Excel seperti D6:D15
    const rangeRegex = /(\$?[A-Za-z]{1,2}\$?[1-9]\d{0,2}\s*:\s*\$?[A-Za-z]{1,2}\$?[1-9]\d{0,2})(?![A-Za-z0-9_])/g;
    stripped = stripped.replace(rangeRegex, (full) => {
        const rng = parseExcelRangeCoord(full);
        if (rng) {
            const rEnd = Math.min(rowCount - 1, rng.rMax);
            const cEnd = Math.min(colCount - 1, rng.cMax);
            for (let r = Math.max(0, rng.rMin); r <= rEnd; r++) {
                for (let c = Math.max(0, rng.cMin); c <= cEnd; c++) {
                    result.add(`${r}:${c}`);
                }
            }
        }
        return ' '.repeat(full.length);
    });

    // 2. Variabel $KEY pada sheet
    const tagRegex = /\$[A-Za-z0-9_]+/g;
    stripped = stripped.replace(tagRegex, (tok) => {
        const coords = keyMap.get(tok.toUpperCase());
        if (coords) {
            coords.forEach(({ r, c }) => result.add(`${r}:${c}`));
            return ' '.repeat(tok.length);
        }
        // Biarkan format $C$6 diproses pada tahap koordinat tunggal
        if (/^\$[A-Za-z]{1,2}\$[1-9]\d{0,2}$/.test(tok)) {
            return tok;
        }
        return ' '.repeat(tok.length);
    });

    // 3. Koordinat sel tunggal seperti D6 atau $D$6 (bukan nama fungsi yang diikuti '(')
    const singleRegex = /(?:^|[^A-Za-z0-9_$])(\$[A-Za-z]{1,2}\$[1-9]\d{0,2}|[A-Za-z]{1,2}[1-9]\d{0,2})(?![A-Za-z0-9_(])/g;
    let m: RegExpExecArray | null;
    while ((m = singleRegex.exec(stripped)) !== null) {
        const coord = parseExcelCellCoord(m[1], false);
        if (coord && coord.r >= 0 && coord.r < rowCount && coord.c >= 0 && coord.c < colCount) {
            result.add(`${coord.r}:${coord.c}`);
        }
    }

    return result;
}
