import { RaporTemplate, RaporSheet, Santri, RaporRecord, PondokSettings } from '../types';
import { extractTemplateKeys, ExtractedTemplateKey, getTemplateSheets } from './raporExcelService';
export { getTemplateSheets };
import { loadXLSX } from '../utils/lazyClientLibs';
import { formatDate } from '../utils/formatters';

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

/**
 * Checks if a template key represents a subject grade rather than attendance/notes
 */
export const isSubjectGradeKey = (key: string): boolean => {
    const k = key.trim().toLowerCase();
    const excluded = [
        'sakit', 'izin', 'alpha', 'alpa', 'total_absen', 'absen', 'kehadiran',
        'catatan', 'catatan_wali', 'catatan_wali_kelas', 'catatanwalikelas',
        'keputusan', 'kenaikan', 'kelulusan', 'tanggal', 'tempat',
        's', 'i', 'a'
    ];
    return !excluded.includes(k);
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
 * Build consolidated Leger data with calculations, rankings, and completion stats
 */
export const buildRombelLegerData = (params: {
    template?: RaporTemplate | null;
    santriList: Santri[];
    records: RaporRecord[];
    targetSheetId?: string;
}): RombelLegerData => {
    const { template = null, santriList, records, targetSheetId = 'all' } = params;

    const availableSheets = getTemplateSheets(template);
    const allKeys = extractTemplateKeys(template, targetSheetId);
    const gradeKeys = allKeys.filter(k => isSubjectGradeKey(k.key));
    const nonGradeKeys = allKeys.filter(k => !isSubjectGradeKey(k.key));

    const recordBySantri = new Map<number, RaporRecord>();
    records.forEach(r => recordBySantri.set(r.santriId, r));

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
                const num = Number(rawVal);
                if (!isNaN(num)) {
                    numericGrades[k.key] = num;
                    totalNilai += num;
                    numericCount += 1;
                }
            }
        });

        const rataRata = numericCount > 0 ? Math.round((totalNilai / numericCount) * 100) / 100 : 0;
        const rataRataFormatted = rataRata > 0 ? rataRata.toFixed(2) : '-';
        const predikat = calculatePredikat(rataRata);

        // Attendance resolution
        const findVal = (...kList: string[]): number | undefined => {
            for (const key of kList) {
                if (customData[key] !== undefined && customData[key] !== '') {
                    const n = Number(customData[key]);
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
            const average = Math.round((sum / scores.length) * 100) / 100;
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
        ? Math.round((studentsWithAvg.reduce((acc, s) => acc + s.rataRata, 0) / studentsWithAvg.length) * 100) / 100
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

    return {
        template,
        availableSheets,
        activeSheetId: targetSheetId,
        gradeKeys,
        nonGradeKeys,
        allKeys,
        students,
        subjectStats,
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
    tahunAjaran: string;
    semester: string;
    settings?: PondokSettings | null;
    waliName?: string;
}): Promise<string> => {
    const { rombelData, rombelName, tahunAjaran, semester, settings, waliName = 'Wali Kelas' } = params;
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
            row.totalNilai > 0 ? row.totalNilai : '',
            row.rataRata > 0 ? row.rataRata : '',
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
        ...rombelData.gradeKeys.map(k => rombelData.subjectStats[k.key]?.average || ''),
        '',
        rombelData.classAverage || '',
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
    const kotaPondok = settings?.tempatRaporDefault || 'Pesantren';
    sheetData.push(['', '', '', '', '', '', '', '', '', '', '', '', `${kotaPondok}, ${tanggalCetak}`]);
    sheetData.push(['', '', '', 'Mengetahui,', '', '', '', '', '', '', '', '', 'Wali Kelas,']);
    sheetData.push(['', '', '', 'Kepala Madrasah / Mudir,', '', '', '', '', '', '', '', '', '']);
    sheetData.push([]);
    sheetData.push([]);
    sheetData.push([]);
    sheetData.push(['', '', '', `(${settings?.namaMudir || '.........................'})`, '', '', '', '', '', '', '', '', `(${waliName})`]);

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
