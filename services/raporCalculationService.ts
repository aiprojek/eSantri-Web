import { RaporTemplate, RaporSheet, Santri, RaporRecord, PondokSettings, MataPelajaran, RaporInputMode } from '../types';
import { extractTemplateKeys, ExtractedTemplateKey, getTemplateSheets } from './raporExcelService';
export { getTemplateSheets };
import { loadXLSX } from '../utils/lazyClientLibs';
import { formatDate, resolveTempatRapor } from '../utils/formatters';
import { normalizeSubjectKeyForAvg, findMapelInMasterPool, computeDefaultKkmForPool } from '../utils/raporFormulaUtils';
import { resolveMudirAamInfo } from '../utils/raporPlaceholderResolver';

export interface PredikatResult {
    predikat: string;
    predikatHuruf: 'A' | 'B' | 'C' | 'D' | 'E';
    deskripsi: string;
}

/**
 * Standard grade conversion based on pesantren / academic scale
 */
export const calculatePredikat = (score: number): PredikatResult => {
    if (score >= 90) {
        return { predikat: 'Mumtaz', predikatHuruf: 'A', deskripsi: 'Sangat Baik' };
    }
    if (score >= 80) {
        return { predikat: 'Jayyid Jiddan', predikatHuruf: 'B', deskripsi: 'Baik' };
    }
    if (score >= 70) {
        return { predikat: 'Jayyid', predikatHuruf: 'C', deskripsi: 'Cukup' };
    }
    if (score >= 60) {
        return { predikat: 'Maqbul', predikatHuruf: 'D', deskripsi: 'Kurang' };
    }
    return { predikat: 'Rasib', predikatHuruf: 'E', deskripsi: 'Perlu Bimbingan Khusus' };
};

export interface RaporInputClassification {
    kind: 'score' | 'attendance' | 'note' | 'short_text' | 'dropdown';
    isNumericScore: boolean;
    isLongText: boolean;
    isAttendanceCount: boolean;
    kkm: number;
}

const NOTE_WORD_TOKENS = new Set([
    'CATATAN',
    'CATATANWALIKELAS',
    'DESKRIPSI',
    'NARASI',
    'KOMENTAR',
    'SARAN',
    'NASEHAT',
    'NASIHAT',
    'PESAN',
    'KESIMPULAN',
    'KEPUTUSAN'
]);

const ATTENDANCE_WORD_TOKENS = new Set([
    'SAKIT',
    'IZIN',
    'IJIN',
    'ALPHA',
    'ALPA',
    'ABSEN',
    'ABSENSI',
    'KEHADIRAN',
    'HADIR',
    'TERLAMBAT',
    'TELAT'
]);

const SHORT_TEXT_WORD_TOKENS = new Set([
    'PREDIKAT',
    'TAQDIR',
    'KELULUSAN',
    'KENAIKAN',
    'TEMPAT',
    'TANGGAL'
]);

/**
 * Klasifikasi terpadu kolom input rapor agar Mata Pelajaran seperti Akhlak, Akidah Akhlak,
 * Sikap, Adab, atau Tahfizh tetap terdeteksi sebagai Input Nilai Angka (0-100 + KKM)
 * dan tidak pernah berubah menjadi kolom Teks/Catatan kecuali memang kolom Catatan/Deskripsi
 * atau diatur manual melalui inputMode = 'text'.
 */
export const classifyRaporInputField = (params: {
    key: string;
    label?: string;
    type?: string;
    inputMode?: RaporInputMode;
    mataPelajaran?: MataPelajaran[];
    jenjangId?: number;
}): RaporInputClassification => {
    const { key, label = '', type, inputMode, mataPelajaran = [], jenjangId } = params;

    if (type === 'dropdown') {
        return {
            kind: 'dropdown',
            isNumericScore: false,
            isLongText: false,
            isAttendanceCount: false,
            kkm: 70
        };
    }

    const normAlnum = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]+/g, '');
    const tokenize = (s: string) => s.toUpperCase().split(/[^A-Z0-9]+/).filter(Boolean);

    const upperKey = (key || '').trim().toUpperCase().replace(/[\s-]+/g, '_');
    const upperLabel = (label || '').trim().toUpperCase();
    const keyTokens = tokenize(upperKey);
    const labelTokens = tokenize(upperLabel);

    const mapelPool = jenjangId
        ? mataPelajaran.filter(mp => !mp.jenjangId || mp.jenjangId === jenjangId)
        : mataPelajaran;

    const nKey = normAlnum(upperKey);
    const nLabel = normAlnum(upperLabel);
    const strippedKey = normAlnum(upperKey.replace(/^(?:NILAI|ANGKA|SKOR|MAPEL)_+/, '').replace(/_+(?:UH\d*|PTS|PAS|PAT|UTS|UAS|HARIAN|UJIAN|PRAKTEK|PRAKTIK|TEORI)$/, ''));

    const matchedMapel =
        findMapelInMasterPool([label, key].filter(Boolean), mataPelajaran, jenjangId) ||
        mapelPool.find(mp => {
            const nKode = mp.kodeMapel ? normAlnum(mp.kodeMapel) : '';
            const nNama = normAlnum(mp.nama || '');
            if (nKode && (nKey === nKode || strippedKey === nKode || (nKode.length >= 3 && keyTokens.includes(nKode)))) {
                return true;
            }
            if (nNama && (nKey === nNama || strippedKey === nNama || (nLabel.length >= 3 && nLabel === nNama))) {
                return true;
            }
            return false;
        });

    const defaultJenjangKkm = computeDefaultKkmForPool(mataPelajaran, jenjangId);
    const resolvedKkm = matchedMapel?.kkm ?? defaultJenjangKkm;

    // 1. Prioritaskan pilihan manual eksplisit dari Desainer Rapor
    if (inputMode === 'number') {
        return {
            kind: 'score',
            isNumericScore: true,
            isLongText: false,
            isAttendanceCount: false,
            kkm: resolvedKkm
        };
    }
    if (inputMode === 'text' || type === 'text') {
        return {
            kind: 'note',
            isNumericScore: false,
            isLongText: true,
            isAttendanceCount: false,
            kkm: resolvedKkm
        };
    }

    // 2. Jika diawali NILAI_ / ANGKA_ / SKOR_ secara eksplisit (selain NILAI_HURUF), pastikan berupa nilai angka
    const hasExplicitScorePrefix = /^(?:NILAI|ANGKA|SKOR)(?:_|$)/.test(upperKey) && !keyTokens.includes('HURUF') && !keyTokens.includes('PREDIKAT') && !keyTokens.includes('DESKRIPSI') && !keyTokens.includes('CATATAN');
    if (hasExplicitScorePrefix) {
        return {
            kind: 'score',
            isNumericScore: true,
            isLongText: false,
            isAttendanceCount: false,
            kkm: resolvedKkm
        };
    }

    // 3. Cek apakah benar-benar kolom Catatan / Deskripsi / Narasi / Keputusan
    const isGenericGeneratedKey = /^(?:INPUT|KOLOM|COL|FIELD|VAR|TEXT|SEL)_\d+$/.test(upperKey);
    const hasNoteTokenInKey =
        keyTokens.some(t => NOTE_WORD_TOKENS.has(t)) ||
        upperKey === 'KETERANGAN' ||
        upperKey.startsWith('KETERANGAN_') ||
        upperKey === 'CAPAIAN_KOMPETENSI' ||
        upperKey.startsWith('CAPAIAN_') ||
        upperKey.endsWith('_DESKRIPSI') ||
        upperKey.endsWith('_CATATAN');

    const hasNoteTokenInLabelWhenGeneric =
        isGenericGeneratedKey &&
        (labelTokens.some(t => NOTE_WORD_TOKENS.has(t)) || upperLabel.startsWith('CATATAN ') || upperLabel.startsWith('DESKRIPSI '));

    if (hasNoteTokenInKey || hasNoteTokenInLabelWhenGeneric) {
        return {
            kind: 'note',
            isNumericScore: false,
            isLongText: true,
            isAttendanceCount: false,
            kkm: resolvedKkm
        };
    }

    // 4. Jika cocok dengan Mata Pelajaran terdaftar di Data Master (misal Akhlak, Sikap, Tahfizh, Fiqih, dll) -> pasti Nilai Angka
    if (matchedMapel) {
        return {
            kind: 'score',
            isNumericScore: true,
            isLongText: false,
            isAttendanceCount: false,
            kkm: resolvedKkm
        };
    }

    // 5. Cek kolom Presensi / Kehadiran (angka jumlah hari, bukan nilai 0-100 ber-KKM)
    if (
        keyTokens.some(t => ATTENDANCE_WORD_TOKENS.has(t)) ||
        upperKey === 'S' ||
        upperKey === 'I' ||
        upperKey === 'A' ||
        upperKey === 'TOTAL_ABSEN'
    ) {
        return {
            kind: 'attendance',
            isNumericScore: false,
            isLongText: false,
            isAttendanceCount: true,
            kkm: 70
        };
    }

    // 6. Cek kolom teks pendek khusus (misal Predikat manual, Nama Surah, Nilai Huruf)
    if (
        keyTokens.some(t => SHORT_TEXT_WORD_TOKENS.has(t)) ||
        upperKey === 'HURUF' ||
        upperKey === 'NILAI_HURUF' ||
        upperKey === 'NAMA_SURAH' ||
        upperKey === 'SURAH_TERAKHIR' ||
        upperKey === 'JUZ_TERAKHIR'
    ) {
        return {
            kind: 'short_text',
            isNumericScore: false,
            isLongText: false,
            isAttendanceCount: false,
            kkm: 70
        };
    }

    // 7. Default semua sel bertipe 'input' (termasuk $AKHLAK, $ADAB, $SIKAP, $TAHFIZH, $UH1, dll) adalah Nilai Angka
    return {
        kind: 'score',
        isNumericScore: true,
        isLongText: false,
        isAttendanceCount: false,
        kkm: resolvedKkm
    };
};

/**
 * Checks if a template key represents a subject grade rather than attendance/notes
 */
export const isSubjectGradeKey = (
    key: string,
    inputMode?: RaporInputMode,
    label?: string,
    type?: string
): boolean => {
    return classifyRaporInputField({ key, label, type, inputMode }).isNumericScore;
};

export interface StudentLegerRow {
    santri: Santri;
    record: RaporRecord | null;
    grades: Record<string, string>;
    numericGrades: Record<string, number>;
    totalNilai: number;
    rataRata: number;
    rataRataFormatted: string;
    predikat: PredikatResult;
    ranking: number;
    rankingKelas?: number;
    rankingJenjang?: number;
    rankingGlobal?: number;
    totalSantriKelas?: number;
    totalSantriJenjang?: number;
    sakit: number;
    izin: number;
    alpha: number;
    totalAbsen: number;
    catatanWali: string;
    keputusan: string;
    completenessStatus: 'Lengkap' | 'Sebagian' | 'Kosong';
    missingKeys: string[];
    filledCount: number;
    totalKeys: number;
    percentComplete: number;
}

export interface SubjectStat {
    key: string;
    label: string;
    average: number;
    highest: number;
    lowest: number;
    count: number;
}

export interface RombelLegerData {
    template: RaporTemplate | null;
    availableSheets: RaporSheet[];
    activeSheetId: string;
    gradeKeys: ExtractedTemplateKey[];
    nonGradeKeys: ExtractedTemplateKey[];
    allKeys: ExtractedTemplateKey[];
    students: StudentLegerRow[];
    subjectStats: Record<string, SubjectStat>;
    classAverages: Record<string, number>;
    classAverage: number;
    classHighest: number;
    classLowest: number;
    totalStudents: number;
    completeCount: number;
    incompleteCount: number;
    emptyCount: number;
    overallCompletionRate: number;
}

/**
 * Menghitung rata-rata nilai per kode variabel ($KEY) dan rata-rata umum kelas dari sekumpulan RaporRecord rombel
 */
export const computeClassAveragesFromRecords = (
    records: RaporRecord[],
    template?: RaporTemplate | null
): { classAverages: Record<string, number>; classOverallAverage: number } => {
    const accum = new Map<string, { sum: number; count: number }>();
    const studentAvgs: number[] = [];

    const templateKeyMap = new Map<string, ExtractedTemplateKey>();
    if (template) {
        extractTemplateKeys(template, 'all').forEach(k => {
            templateKeyMap.set(normalizeSubjectKeyForAvg(k.key), k);
        });
    }

    for (const rec of records) {
        if (!rec?.customData) continue;
        let parsed: Record<string, any> = {};
        try {
            parsed = typeof rec.customData === 'string' ? JSON.parse(rec.customData) : rec.customData;
        } catch {
            parsed = {};
        }

        let sSum = 0;
        let sCount = 0;

        for (const [rawKey, rawVal] of Object.entries(parsed)) {
            if (!rawKey || rawVal === undefined || rawVal === null) continue;
            const strVal = String(rawVal).trim();
            if (strVal === '' || strVal === '-') continue;
            const num = Number(strVal.replace(',', '.'));
            if (isNaN(num) || !isFinite(num)) continue;

            const normKey = normalizeSubjectKeyForAvg(rawKey);
            if (!normKey) continue;

            const cur = accum.get(normKey) || { sum: 0, count: 0 };
            cur.sum += num;
            cur.count += 1;
            accum.set(normKey, cur);

            const tplMeta = templateKeyMap.get(normKey);
            if (isSubjectGradeKey(rawKey, tplMeta?.inputMode, tplMeta?.label, tplMeta?.type)) {
                sSum += num;
                sCount += 1;
            }
        }

        if (sCount > 0) {
            studentAvgs.push(Math.round(((sSum / sCount) + Number.EPSILON) * 10000) / 10000);
        }
    }

    const classAverages: Record<string, number> = {};
    for (const [normKey, stat] of accum.entries()) {
        if (stat.count > 0) {
            classAverages[normKey] = Math.round(((stat.sum / stat.count) + Number.EPSILON) * 10000) / 10000;
        }
    }

    if (template) {
        const allKeys = extractTemplateKeys(template, 'all');
        for (const item of allKeys) {
            const normK = normalizeSubjectKeyForAvg(item.key);
            const avg = classAverages[normK];
            if (avg !== undefined && item.label) {
                const labelKey = item.label.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');
                if (labelKey && classAverages[labelKey] === undefined) {
                    classAverages[labelKey] = avg;
                }
            }
        }
    }

    const classOverallAverage = studentAvgs.length > 0
        ? Math.round(((studentAvgs.reduce((a, b) => a + b, 0) / studentAvgs.length) + Number.EPSILON) * 10000) / 10000
        : 0;

    return { classAverages, classOverallAverage };
};

/**
 * Build consolidated Leger data with calculations, rankings, and completion stats
 */
export const buildRombelLegerData = (params: {
    template?: RaporTemplate | null;
    santriList: Santri[];
    records: RaporRecord[];
    targetSheetId?: string;
    decimalPlaces?: 0 | 1 | 2 | 3;
}): RombelLegerData => {
    const { template = null, santriList, records, targetSheetId = 'all', decimalPlaces = 2 } = params;
    const decFactor = Math.pow(10, decimalPlaces);

    const availableSheets = getTemplateSheets(template);
    const allKeys = extractTemplateKeys(template, targetSheetId);
    const gradeKeys = allKeys.filter(k => isSubjectGradeKey(k.key, k.inputMode, k.label, k.type));
    const nonGradeKeys = allKeys.filter(k => !isSubjectGradeKey(k.key, k.inputMode, k.label, k.type));

    const recordBySantri = new Map<number, RaporRecord>();
    records.forEach(r => {
        if (!r.deleted) recordBySantri.set(r.santriId, r);
    });

    // 1. Initial pass: parse values per student
    const studentRows: Array<Omit<StudentLegerRow, 'ranking'>> = santriList.map(santri => {
        const record = recordBySantri.get(santri.id) || null;
        let customData: Record<string, string> = {};

        if (record?.customData) {
            try {
                customData = JSON.parse(record.customData);
            } catch {
                customData = {};
            }
        }

        const numericGrades: Record<string, number> = {};
        let totalNilai = 0;
        let numericCount = 0;

        gradeKeys.forEach(k => {
            const rawVal = customData[k.key];
            if (rawVal !== undefined && rawVal !== null && String(rawVal).trim() !== '') {
                const num = Number(String(rawVal).trim().replace(',', '.'));
                if (!isNaN(num)) {
                    numericGrades[k.key] = num;
                    totalNilai += num;
                    numericCount += 1;
                }
            }
        });

        const rawAvg = numericCount > 0 ? totalNilai / numericCount : 0;
        const rataRata = numericCount > 0 ? Math.round((rawAvg + Number.EPSILON) * 10000) / 10000 : 0;
        const roundedForDisplay = numericCount > 0 ? Math.round((rawAvg + Number.EPSILON) * decFactor) / decFactor : 0;
        const rataRataFormatted = numericCount > 0 && rataRata > 0 ? roundedForDisplay.toFixed(decimalPlaces) : '-';
        const predikat = calculatePredikat(rataRata);

        // Attendance resolution
        const findVal = (...kList: string[]): number | undefined => {
            for (const key of kList) {
                if (customData[key] !== undefined && String(customData[key]).trim() !== '') {
                    const n = Number(String(customData[key]).trim().replace(',', '.'));
                    if (!isNaN(n)) return n;
                }
            }
            return undefined;
        };

        const sakit = record?.sakit ?? (findVal('SAKIT', 'sakit', 'S', 'ABSENSI_SAKIT') ?? 0);
        const izin = record?.izin ?? (findVal('IZIN', 'izin', 'I', 'ABSENSI_IZIN') ?? 0);
        const alpha = record?.alpha ?? (findVal('ALPHA', 'alpha', 'ALPA', 'alpa', 'A', 'ABSENSI_ALPHA') ?? 0);
        const totalAbsen = sakit + izin + alpha;

        // Notes & decision
        const findText = (...kList: string[]): string => {
            for (const key of kList) {
                if (customData[key] && String(customData[key]).trim() !== '') {
                    return String(customData[key]).trim();
                }
            }
            return '';
        };

        const catatanWali = record?.catatanWaliKelas || findText('CATATAN_WALI_KELAS', 'catatanWaliKelas', 'CATATAN_WALI', 'catatan_wali');
        const keputusan = record?.keputusan || findText('KEPUTUSAN', 'keputusan');

        // Completeness check across all template keys
        const missingKeys: string[] = [];
        let filledCount = 0;

        allKeys.forEach(k => {
            const v = customData[k.key];
            if (v !== undefined && v !== null && String(v).trim() !== '') {
                filledCount += 1;
            } else {
                missingKeys.push(k.label || k.key);
            }
        });

        const totalKeys = allKeys.length;
        const percentComplete = totalKeys > 0 ? Math.round((filledCount / totalKeys) * 100) : 0;

        let completenessStatus: 'Lengkap' | 'Sebagian' | 'Kosong' = 'Kosong';
        if (record && filledCount > 0) {
            if (filledCount >= totalKeys && totalKeys > 0) {
                completenessStatus = 'Lengkap';
            } else {
                completenessStatus = 'Sebagian';
            }
        }

        return {
            santri,
            record,
            grades: customData,
            numericGrades,
            totalNilai,
            rataRata,
            rataRataFormatted,
            predikat,
            sakit,
            izin,
            alpha,
            totalAbsen,
            catatanWali,
            keputusan,
            completenessStatus,
            missingKeys,
            filledCount,
            totalKeys,
            percentComplete
        };
    });

    // 2. Assign standard rankings (ranked by total score descending; tied scores get the same rank)
    // Only rank students who have at least one grade filled; others get rank 0 / unranked
    const studentsWithScores = studentRows
        .filter(s => s.totalNilai > 0)
        .sort((a, b) => b.totalNilai - a.totalNilai);

    const rankMap = new Map<number, number>();
    let currentRank = 1;
    for (let i = 0; i < studentsWithScores.length; i++) {
        if (i > 0 && studentsWithScores[i].totalNilai < studentsWithScores[i - 1].totalNilai) {
            currentRank = i + 1;
        }
        rankMap.set(studentsWithScores[i].santri.id, currentRank);
    }

    const students: StudentLegerRow[] = studentRows.map(row => ({
        ...row,
        ranking: rankMap.get(row.santri.id) || (row.totalNilai > 0 ? 1 : 0)
    }));

    // 3. Subject Stats (Highest, Lowest, Average per subject)
    const subjectStats: Record<string, SubjectStat> = {};
    gradeKeys.forEach(k => {
        const scores = students
            .map(s => s.numericGrades[k.key])
            .filter((v): v is number => typeof v === 'number' && !isNaN(v));

        if (scores.length > 0) {
            const sum = scores.reduce((acc, v) => acc + v, 0);
            const average = Math.round(((sum / scores.length) + Number.EPSILON) * decFactor) / decFactor;
            const highest = Math.max(...scores);
            const lowest = Math.min(...scores);
            subjectStats[k.key] = {
                key: k.key,
                label: k.label,
                average,
                highest,
                lowest,
                count: scores.length
            };
        } else {
            subjectStats[k.key] = {
                key: k.key,
                label: k.label,
                average: 0,
                highest: 0,
                lowest: 0,
                count: 0
            };
        }
    });

    // 4. Class summary
    const studentsWithAvg = students.filter(s => s.rataRata > 0);
    const classAverage = studentsWithAvg.length > 0
        ? Math.round(((studentsWithAvg.reduce((acc, s) => acc + s.rataRata, 0) / studentsWithAvg.length) + Number.EPSILON) * decFactor) / decFactor
        : 0;

    const classHighest = studentsWithAvg.length > 0 ? Math.max(...studentsWithAvg.map(s => s.totalNilai)) : 0;
    const classLowest = studentsWithAvg.length > 0 ? Math.min(...studentsWithAvg.map(s => s.totalNilai)) : 0;

    const completeCount = students.filter(s => s.completenessStatus === 'Lengkap').length;
    const incompleteCount = students.filter(s => s.completenessStatus === 'Sebagian').length;
    const emptyCount = students.filter(s => s.completenessStatus === 'Kosong').length;

    const totalStudents = students.length;
    const overallCompletionRate = totalStudents > 0
        ? Math.round((completeCount / totalStudents) * 100)
        : 0;

    const { classAverages: rawClassAverages } = computeClassAveragesFromRecords(records, template);
    for (const [k, stat] of Object.entries(subjectStats)) {
        if (stat.count > 0 && rawClassAverages[normalizeSubjectKeyForAvg(k)] === undefined) {
            rawClassAverages[normalizeSubjectKeyForAvg(k)] = stat.average;
        }
    }

    return {
        template,
        availableSheets,
        activeSheetId: targetSheetId,
        gradeKeys,
        nonGradeKeys,
        allKeys,
        students,
        subjectStats,
        classAverages: rawClassAverages,
        classAverage,
        classHighest,
        classLowest,
        totalStudents,
        completeCount,
        incompleteCount,
        emptyCount,
        overallCompletionRate
    };
};

/**
 * Generate and download Master Grade Ledger in Excel (.xlsx) format
 */
export const exportLegerToExcel = async (params: {
    rombelData: RombelLegerData;
    rombelName: string;
    jenjangName?: string;
    kelasName?: string;
    tahunAjaran: string;
    semester: string;
    settings?: PondokSettings | null;
    waliName?: string;
    decimalPlaces?: 0 | 1 | 2 | 3;
}): Promise<string> => {
    const { rombelData, rombelName, jenjangName, kelasName, tahunAjaran, semester, settings, waliName = 'Wali Kelas', decimalPlaces = 2 } = params;
    const decFactor = Math.pow(10, decimalPlaces);
    const XLSX = await loadXLSX();

    const wb = XLSX.utils.book_new();

    // Prepare table headers
    const mainHeaders = [
        'No',
        'NIS',
        'NISN',
        'Nama Santri',
        'Jenis Kelamin',
        ...rombelData.gradeKeys.map(k => k.label || k.key),
        'Total Nilai',
        'Rata-Rata',
        'Predikat',
        'Peringkat',
        'Sakit (S)',
        'Izin (I)',
        'Alpha (A)',
        'Total Absen',
        'Catatan Wali Kelas',
        'Keputusan'
    ];

    const sheetData: any[][] = [];

    // Header Meta Rows
    sheetData.push([settings?.namaPonpes ? settings.namaPonpes.toUpperCase() : 'LEMBAGA PENDIDIKAN PESANTREN']);
    sheetData.push(['LEGER NILAI HASIL BELAJAR SANTRI (REKAPITULASI RAPOR)']);
    sheetData.push([
        `Marhalah / Jenjang: ${jenjangName || '-'}`,
        '',
        `Kelas: ${kelasName || '-'}`,
        '',
        `Rombongan Belajar: ${rombelName}`,
        '',
        `Tahun Ajaran: ${tahunAjaran}`,
        '',
        `Semester: ${semester}`,
        '',
        `Wali Kelas: ${waliName}`
    ]);
    sheetData.push([]); // blank row

    // Table Headers
    sheetData.push(mainHeaders);

    // Rows for each student
    rombelData.students.forEach((row, idx) => {
        const studentRow = [
            idx + 1,
            row.santri.nis || '',
            row.santri.nisn || '-',
            row.santri.namaLengkap,
            row.santri.jenisKelamin || '-',
            ...rombelData.gradeKeys.map(k => row.numericGrades[k.key] ?? (row.grades[k.key] || '')),
            row.totalNilai > 0 ? Number((Math.round((row.totalNilai + Number.EPSILON) * decFactor) / decFactor).toFixed(decimalPlaces)) : '',
            row.rataRata > 0 ? Number((Math.round((row.rataRata + Number.EPSILON) * decFactor) / decFactor).toFixed(decimalPlaces)) : '',
            row.rataRata > 0 ? row.predikat.predikat : '',
            row.ranking > 0 ? row.ranking : '',
            row.sakit,
            row.izin,
            row.alpha,
            row.totalAbsen,
            row.catatanWali || '',
            row.keputusan || ''
        ];
        sheetData.push(studentRow);
    });

    // Statistical Summary Rows
    sheetData.push([]); // blank row

    // Class Average
    const avgRow = [
        '',
        '',
        '',
        'RATA-RATA KELAS',
        '',
        ...rombelData.gradeKeys.map(k => {
            const avg = rombelData.subjectStats[k.key]?.average;
            return avg ? Number((Math.round((avg + Number.EPSILON) * decFactor) / decFactor).toFixed(decimalPlaces)) : '';
        }),
        '',
        rombelData.classAverage
            ? Number((Math.round((rombelData.classAverage + Number.EPSILON) * decFactor) / decFactor).toFixed(decimalPlaces))
            : '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        ''
    ];
    sheetData.push(avgRow);

    // Highest Grade
    const maxRow = [
        '',
        '',
        '',
        'NILAI TERTINGGI',
        '',
        ...rombelData.gradeKeys.map(k => rombelData.subjectStats[k.key]?.highest || ''),
        rombelData.classHighest || '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        ''
    ];
    sheetData.push(maxRow);

    // Lowest Grade
    const minRow = [
        '',
        '',
        '',
        'NILAI TERENDAH',
        '',
        ...rombelData.gradeKeys.map(k => rombelData.subjectStats[k.key]?.lowest || ''),
        rombelData.classLowest || '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        ''
    ];
    sheetData.push(minRow);

    // Signatures footer
    sheetData.push([]);
    sheetData.push([]);
    const tanggalCetak = formatDate(new Date());
    const kotaPondok = resolveTempatRapor(settings, 'Pesantren');
    const hasConfiguredMudir = Boolean(
        (settings?.mudirAamId !== undefined && settings?.mudirAamId !== null) ||
        (settings?.namaMudir && settings.namaMudir.trim()) ||
        (Array.isArray(settings?.tenagaPengajar) && settings.tenagaPengajar.some(tp =>
            Array.isArray(tp.riwayatJabatan) &&
            tp.riwayatJabatan.some(rj => !rj.tanggalSelesai && (rj.jabatan || '').toLowerCase().includes('mudir'))
        ))
    );
    const mudirDisplay = hasConfiguredMudir ? resolveMudirAamInfo(settings).nama : '.........................';

    sheetData.push(['', '', '', '', '', '', '', '', '', '', '', '', `${kotaPondok}, ${tanggalCetak}`]);
    sheetData.push(['', '', '', 'Mengetahui,', '', '', '', '', '', '', '', '', 'Wali Kelas,']);
    sheetData.push(['', '', '', 'Kepala Madrasah / Mudir,', '', '', '', '', '', '', '', '', '']);
    sheetData.push([]);
    sheetData.push([]);
    sheetData.push([]);
    sheetData.push(['', '', '', `(${mudirDisplay})`, '', '', '', '', '', '', '', '', `(${waliName})`]);

    const ws = XLSX.utils.aoa_to_sheet(sheetData);

    // Calculate column widths
    const colWidths = mainHeaders.map((header, colIdx) => {
        if (colIdx === 0) return { wch: 5 }; // No
        if (colIdx === 1) return { wch: 14 }; // NIS
        if (colIdx === 2) return { wch: 14 }; // NISN
        if (colIdx === 3) return { wch: 28 }; // Nama
        if (colIdx === 4) return { wch: 14 }; // Jenis Kelamin
        const headerLen = header.length;
        return { wch: Math.max(headerLen + 3, 10) };
    });
    ws['!cols'] = colWidths;

    const activeSheetObj = rombelData.availableSheets?.find(s => s.id === rombelData.activeSheetId);
    const sheetTitle = activeSheetObj ? activeSheetObj.name.substring(0, 31).replace(/[\\/?*[\]:]/g, '_') : 'Leger Nilai';
    XLSX.utils.book_append_sheet(wb, ws, sheetTitle);

    const cleanRombel = rombelName.replace(/[^a-zA-Z0-9]/g, '_');
    const cleanTahun = tahunAjaran.replace(/[^a-zA-Z0-9]/g, '_');
    const sheetSuffix = activeSheetObj ? `_${activeSheetObj.name.replace(/[^a-zA-Z0-9]/g, '_')}` : '';
    const fileName = `Leger_Nilai_${cleanRombel}${sheetSuffix}_${cleanTahun}_${semester}.xlsx`;

    XLSX.writeFile(wb, fileName);
    return fileName;
};
