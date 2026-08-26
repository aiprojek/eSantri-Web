import { QURAN_DATA, getSurahsInJuz } from '../data/quran';
import { TahfizhRecord } from '../types';

export interface SmartScoreResult {
    score: number; // 0 - 100
    predikat: 'Sangat Lancar' | 'Lancar' | 'Kurang Lancar' | 'Belum Lulus';
    predikatArabic: string; // 'Mumtaz (Istimewa)' | 'Jayyid Jiddan (Amat Baik)' | 'Jayyid (Baik)' | 'Maqbul (Cukup)' | 'Rosib (Perlu Mengulang)'
    predikatShort: string; // 'Mumtaz' | 'J. Jiddan' | 'Jayyid' | 'Maqbul' | 'Rosib'
    surahCategoryText: string; // 'Surat Sangat Pendek' | 'Surat Pendek' | 'Surat Menengah' | 'Surat Panjang' | 'Surat Sangat Panjang'
    penaltiTeguran: number;
    penaltiSalah: number;
    penaltiText: string;
    totalAyatDisetor: number;
    explanation: string;
}

export interface TahfizhSmartScoreParams {
    totalSurahAyat?: number;
    totalAyatSurah?: number;
    ayatAwal?: number;
    ayatAkhir?: number;
    ayatDisetor?: number;
    surahNumber?: number;
    surahName?: string;
    jumlahTeguran?: number;
    jumlahKesalahan?: number;
    kategoriKesalahan?: { tajwid?: number; makhraj?: number; kelancaran?: number; terlewat?: number };
}

/**
 * Helper untuk mendapatkan predikat lengkap dan singkat dari nilai angka (0-100)
 */
export function getScorePredikat(score: number | null | undefined): {
    predikat: 'Sangat Lancar' | 'Lancar' | 'Kurang Lancar' | 'Belum Lulus';
    predikatArabic: string;
    predikatShort: string;
} {
    if (score === null || score === undefined || isNaN(score)) {
        return {
            predikat: 'Lancar',
            predikatArabic: '-',
            predikatShort: '-'
        };
    }

    if (score >= 93) {
        return {
            predikat: 'Sangat Lancar',
            predikatArabic: 'Mumtaz (Istimewa)',
            predikatShort: 'Mumtaz'
        };
    } else if (score >= 82) {
        return {
            predikat: 'Lancar',
            predikatArabic: 'Jayyid Jiddan (Amat Baik)',
            predikatShort: 'J. Jiddan'
        };
    } else if (score >= 70) {
        return {
            predikat: 'Lancar',
            predikatArabic: 'Jayyid (Baik)',
            predikatShort: 'Jayyid'
        };
    } else if (score >= 60) {
        return {
            predikat: 'Kurang Lancar',
            predikatArabic: 'Maqbul (Cukup)',
            predikatShort: 'Maqbul'
        };
    } else {
        return {
            predikat: 'Belum Lulus',
            predikatArabic: 'Rosib (Mengulang)',
            predikatShort: 'Rosib'
        };
    }
}

/**
 * Hitung estimasi rekomendasi nilai tahfizh berkeadilan:
 * - Membedakan secara proporsional antara Surat Sangat Pendek (3-7 ayat), Surat Pendek (8-20 ayat),
 *   Surat Menengah (21-50 ayat), Surat Panjang Menengah (51-110 ayat), dan Surat Sangat Panjang (>110 ayat).
 * - Menghitung densitas kesalahan & teguran berdasarkan potongan ayat yang disetor vs total ayat surat.
 */
export function calculateTahfizhSmartScore(
    paramsOrTotalAyat: number | TahfizhSmartScoreParams,
    ayatDisetorParam?: number,
    jumlahTeguranParam?: number,
    jumlahKesalahanParam?: number,
    _kategoriParam?: { tajwid?: number; makhraj?: number; kelancaran?: number; terlewat?: number }
): SmartScoreResult {
    let totalAyatSurah = 10;
    let ayatDisetor = 10;
    let jumlahTeguran = 0;
    let jumlahKesalahan = 0;
    let surahName = '';

    if (typeof paramsOrTotalAyat === 'object' && paramsOrTotalAyat !== null) {
        totalAyatSurah = paramsOrTotalAyat.totalSurahAyat || paramsOrTotalAyat.totalAyatSurah || 10;
        if (paramsOrTotalAyat.ayatDisetor !== undefined) {
            ayatDisetor = paramsOrTotalAyat.ayatDisetor;
        } else if (paramsOrTotalAyat.ayatAwal !== undefined && paramsOrTotalAyat.ayatAkhir !== undefined) {
            ayatDisetor = Math.max(1, paramsOrTotalAyat.ayatAkhir - paramsOrTotalAyat.ayatAwal + 1);
        } else {
            ayatDisetor = totalAyatSurah;
        }
        jumlahTeguran = paramsOrTotalAyat.jumlahTeguran || 0;
        jumlahKesalahan = paramsOrTotalAyat.jumlahKesalahan || 0;
        surahName = paramsOrTotalAyat.surahName || '';
    } else {
        totalAyatSurah = paramsOrTotalAyat || 10;
        ayatDisetor = ayatDisetorParam !== undefined ? ayatDisetorParam : totalAyatSurah;
        jumlahTeguran = jumlahTeguranParam || 0;
        jumlahKesalahan = jumlahKesalahanParam || 0;
    }

    const totalAyat = Math.max(1, ayatDisetor || totalAyatSurah || 10);
    
    // Klasifikasi kategori panjang surat & potongan ayat disetor
    let weightTeguran = 1.5;
    let weightSalah = 3.5;
    let surahCategoryText = 'Surat Menengah';

    if (totalAyat <= 7) {
        // Surat sangat pendek (misal QS. Al-Kautsar 3 ayat, Al-Ikhlas 4 ayat, An-Nas 6 ayat, Al-Falaq 5 ayat)
        // 1 kesalahan di 3-5 ayat berdampak besar pada integritas hafalan surat
        weightTeguran = 4.0;
        weightSalah = 8.0;
        surahCategoryText = 'Surat Sangat Pendek (3-7 ayat)';
    } else if (totalAyat <= 20) {
        // Surat pendek (misal QS. At-Tin 8 ayat, Al-Insyirah 8 ayat, Ad-Dhuha 11 ayat, Al-Bayyinah 8 ayat, Al-Alaq 19 ayat)
        weightTeguran = 2.5;
        weightSalah = 5.5;
        surahCategoryText = 'Surat Pendek (8-20 ayat)';
    } else if (totalAyat <= 50) {
        // Surat menengah (misal QS. An-Naba 40 ayat, An-Naziat 46 ayat, Abasa 42 ayat, Al-Mulk 30 ayat, Al-Qiyamah 40 ayat)
        weightTeguran = 1.8;
        weightSalah = 3.8;
        surahCategoryText = 'Surat Menengah (21-50 ayat)';
    } else if (totalAyat <= 110) {
        // Surat panjang menengah (misal QS. Yasin 83 ayat, Al-Waqiah 96 ayat, Ar-Rahman 78 ayat, Al-Kahf 110 ayat, Al-Mulk full)
        weightTeguran = 1.0;
        weightSalah = 2.4;
        surahCategoryText = 'Surat Panjang (51-110 ayat)';
    } else {
        // Surat sangat panjang (misal QS. Al-Baqarah 286 ayat, Ali Imran 200 ayat, An-Nisa 176 ayat, Al-A'raf 206 ayat)
        weightTeguran = 0.6;
        weightSalah = 1.5;
        surahCategoryText = 'Surat Sangat Panjang (>110 ayat)';
    }

    const penaltiTeguran = Math.round(jumlahTeguran * weightTeguran * 10) / 10;
    const penaltiSalah = Math.round(jumlahKesalahan * weightSalah * 10) / 10;
    
    const rawScore = 100 - penaltiTeguran - penaltiSalah;
    const score = Math.max(30, Math.min(100, Math.round(rawScore)));

    const { predikat, predikatArabic, predikatShort } = getScorePredikat(score);

    const penaltyDetails: string[] = [];
    if (penaltiTeguran > 0) penaltyDetails.push(`-${penaltiTeguran} poin teguran (${jumlahTeguran}x)`);
    if (penaltiSalah > 0) penaltyDetails.push(`-${penaltiSalah} poin kesalahan (${jumlahKesalahan}x)`);
    const penaltiText = penaltyDetails.join(', ');

    let explanation = '';
    const surahContext = surahName ? ` pada QS. ${surahName}` : '';
    if (jumlahTeguran === 0 && jumlahKesalahan === 0) {
        explanation = `Rekomendasi ${score} (${predikatShort} / ${predikatArabic}) — Kategori ${surahCategoryText}, setoran hafalan ${totalAyat} ayat${surahContext} selesai mutqin tanpa teguran maupun kesalahan.`;
    } else {
        const detailParts: string[] = [];
        if (jumlahTeguran > 0) detailParts.push(`${jumlahTeguran}x teguran (-${penaltiTeguran} poin)`);
        if (jumlahKesalahan > 0) detailParts.push(`${jumlahKesalahan}x kesalahan (-${penaltiSalah} poin)`);
        explanation = `Rekomendasi ${score} (${predikatShort}) dihitung proporsional untuk ${surahCategoryText} (${totalAyat} ayat disetor${surahContext}) dengan bobot ${detailParts.join(' dan ')}.`;
    }

    return {
        score,
        predikat,
        predikatArabic,
        predikatShort,
        surahCategoryText,
        penaltiTeguran,
        penaltiSalah,
        penaltiText,
        totalAyatDisetor: totalAyat,
        explanation
    };
}

/**
 * Helper untuk menghitung nilai dan metrik evaluasi per surat dari kumpulan record tahfizh
 */
export interface SurahEvaluationSummary {
    surahNumber: number;
    surahName: string;
    totalAyat: number;
    totalTeguran: number;
    totalKesalahan: number;
    hasRecord: boolean;
    nilai: number | null; // null jika belum ada record
    status: 'Mutqin' | 'Ziyadah' | 'Murojaah' | 'Belum';
    recordCount: number;
}

export function getSurahEvaluationSummary(
    surahNumber: number,
    records: TahfizhRecord[]
): SurahEvaluationSummary {
    const surahData = QURAN_DATA.find(s => s.number === surahNumber);
    const surahName = surahData?.name || `Surah ${surahNumber}`;
    const totalAyat = surahData?.ayat || 0;

    const cleanSurahName = surahName.toLowerCase().replace(/['-`\s]/g, '');
    const surahRecords = records.filter(r => {
        const rName = (r.surah || '').toLowerCase().replace(/['-`\s]/g, '');
        return rName === cleanSurahName || rName.includes(cleanSurahName) || cleanSurahName.includes(rName);
    });

    if (surahRecords.length === 0) {
        return {
            surahNumber,
            surahName,
            totalAyat,
            totalTeguran: 0,
            totalKesalahan: 0,
            hasRecord: false,
            nilai: null,
            status: 'Belum',
            recordCount: 0
        };
    }

    const totalTeguran = surahRecords.reduce((sum, r) => sum + (r.jumlahTeguran || 0), 0);
    const totalKesalahan = surahRecords.reduce((sum, r) => sum + (r.jumlahKesalahan || 0), 0);

    const isMutqin = surahRecords.some(r => r.tipe === 'Ujian Hafalan' && r.predikat !== 'Belum Lulus');
    const isZiyadah = surahRecords.some(r => r.tipe === 'Ziyadah');
    const isMurojaah = surahRecords.some(r => r.tipe === 'Murojaah' || r.tipe === "Tasmi'");

    let status: 'Mutqin' | 'Ziyadah' | 'Murojaah' | 'Belum' = 'Belum';
    if (isMutqin) status = 'Mutqin';
    else if (isZiyadah) status = 'Ziyadah';
    else if (isMurojaah) status = 'Murojaah';

    // Cari nilai rata-rata dari records
    const scores: number[] = [];
    surahRecords.forEach(r => {
        if (typeof r.nilaiAngka === 'number' && !isNaN(r.nilaiAngka)) {
            scores.push(r.nilaiAngka);
        } else {
            // Estimasi nilai dari teguran & kesalahan atau predikat jika nilaiAngka tidak tersimpan manual
            const teg = r.jumlahTeguran || 0;
            const err = r.jumlahKesalahan || 0;
            if (teg > 0 || err > 0) {
                const est = calculateTahfizhSmartScore(totalAyat, (r.ayatAkhir - r.ayatAwal + 1), teg, err);
                scores.push(est.score);
            } else if (r.predikat === 'Sangat Lancar') {
                scores.push(95);
            } else if (r.predikat === 'Lancar') {
                scores.push(85);
            } else if (r.predikat === 'Kurang Lancar') {
                scores.push(72);
            } else if (r.predikat === 'Belum Lulus') {
                scores.push(55);
            }
        }
    });

    const nilai = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;

    return {
        surahNumber,
        surahName,
        totalAyat,
        totalTeguran,
        totalKesalahan,
        hasRecord: true,
        nilai,
        status,
        recordCount: surahRecords.length
    };
}

/**
 * Helper untuk menghitung nilai dan metrik evaluasi per Juz (1-30)
 * Sesuai instruksi: "untuk nilai juz maka diambil dari nilai rata-rata nilai suratnya."
 */
export interface JuzEvaluationSummary {
    juz: number;
    totalTeguran: number;
    totalKesalahan: number;
    hasRecord: boolean;
    nilai: number | null; // Rata-rata nilai surat-surat di juz tersebut
    status: 'Mutqin' | 'Ziyadah' | 'Murojaah' | 'Belum';
    surahEvaluations: SurahEvaluationSummary[];
}

export function getJuzEvaluationSummary(
    juzNumber: number,
    records: TahfizhRecord[]
): JuzEvaluationSummary {
    const surahsInThisJuz = getSurahsInJuz(juzNumber);
    const surahSummaries = surahsInThisJuz.map(s => getSurahEvaluationSummary(s.number, records));

    // Cek juga records yang juz-nya sama secara langsung
    const directJuzRecords = records.filter(r => r.juz === juzNumber);
    
    const hasAnyRecord = directJuzRecords.length > 0 || surahSummaries.some(s => s.hasRecord);

    if (!hasAnyRecord) {
        return {
            juz: juzNumber,
            totalTeguran: 0,
            totalKesalahan: 0,
            hasRecord: false,
            nilai: null,
            status: 'Belum',
            surahEvaluations: surahSummaries
        };
    }

    // Total teguran & kesalahan dari direct records atau surah summaries
    const totalTeguran = directJuzRecords.reduce((sum, r) => sum + (r.jumlahTeguran || 0), 0) +
        surahSummaries.filter(s => !directJuzRecords.some(r => r.surah === s.surahName))
            .reduce((sum, s) => sum + s.totalTeguran, 0);

    const totalKesalahan = directJuzRecords.reduce((sum, r) => sum + (r.jumlahKesalahan || 0), 0) +
        surahSummaries.filter(s => !directJuzRecords.some(r => r.surah === s.surahName))
            .reduce((sum, s) => sum + s.totalKesalahan, 0);

    // Status Mutqin / Ziyadah / Murojaah
    const isMutqin = directJuzRecords.some(r => r.tipe === 'Ujian Hafalan' && r.predikat !== 'Belum Lulus') ||
        (surahSummaries.length > 0 && surahSummaries.every(s => s.status === 'Mutqin'));
    const isZiyadah = directJuzRecords.some(r => r.tipe === 'Ziyadah') || surahSummaries.some(s => s.status === 'Ziyadah');
    const isMurojaah = directJuzRecords.some(r => r.tipe === 'Murojaah' || r.tipe === "Tasmi'") || surahSummaries.some(s => s.status === 'Murojaah');

    let status: 'Mutqin' | 'Ziyadah' | 'Murojaah' | 'Belum' = 'Belum';
    if (isMutqin) status = 'Mutqin';
    else if (isZiyadah) status = 'Ziyadah';
    else if (isMurojaah) status = 'Murojaah';

    // "nah untuk nilai juz maka diambil dari nilai rata-rata nilai suratnya."
    const activeSurahScores = surahSummaries
        .map(s => s.nilai)
        .filter((n): n is number => n !== null && typeof n === 'number' && !isNaN(n));

    let nilai: number | null = null;
    if (activeSurahScores.length > 0) {
        nilai = Math.round(activeSurahScores.reduce((a, b) => a + b, 0) / activeSurahScores.length);
    } else {
        // Fallback ke direct records jika ada nilaiAngka
        const directScores = directJuzRecords
            .map(r => r.nilaiAngka)
            .filter((n): n is number => typeof n === 'number' && !isNaN(n));
        if (directScores.length > 0) {
            nilai = Math.round(directScores.reduce((a, b) => a + b, 0) / directScores.length);
        }
    }

    return {
        juz: juzNumber,
        totalTeguran,
        totalKesalahan,
        hasRecord: true,
        nilai,
        status,
        surahEvaluations: surahSummaries
    };
}
