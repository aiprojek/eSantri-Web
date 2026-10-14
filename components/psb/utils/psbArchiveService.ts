import { PsbArchiveRecord, Pendaftar, PondokSettings, PsbConfig } from '../../../types';

const STORAGE_KEY = 'esantri_psb_historical_archives';

/**
 * Mendapatkan seluruh daftar arsip historis PSB dari penyimpanan lokal
 */
export const getPsbArchives = (): PsbArchiveRecord[] => {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return getDefaultSampleArchives();
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : getDefaultSampleArchives();
    } catch {
        return getDefaultSampleArchives();
    }
};

/**
 * Menyimpan atau memperbarui arsip laporan/pengumuman PSB
 */
export const savePsbArchive = (record: PsbArchiveRecord): void => {
    try {
        const current = getPsbArchives();
        const existingIdx = current.findIndex(a => a.id === record.id);
        let updated: PsbArchiveRecord[];
        if (existingIdx >= 0) {
            updated = [...current];
            updated[existingIdx] = record;
        } else {
            updated = [record, ...current];
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
        console.error('Gagal menyimpan arsip PSB:', e);
    }
};

/**
 * Menghapus data arsip PSB berdasarkan ID
 */
export const deletePsbArchive = (id: string): void => {
    try {
        const current = getPsbArchives();
        const updated = current.filter(a => a.id !== id);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
        console.error('Gagal menghapus arsip PSB:', e);
    }
};

/**
 * Default sample archives untuk perbandingan tahun sebelumnya jika data masih kosong
 */
function getDefaultSampleArchives(): PsbArchiveRecord[] {
    const curYear = new Date().getFullYear();
    const prevYear1 = `${curYear - 1}/${curYear}`;
    const prevYear2 = `${curYear - 2}/${curYear - 1}`;

    return [
        {
            id: `psb-arch-${curYear - 1}`,
            type: 'laporan-rekapitulasi',
            tahunAjaran: prevYear1,
            nomorSurat: `084/SK-PSB/PST/VII/${curYear - 1}`,
            tanggalArsip: `${curYear - 1}-07-10`,
            totalPendaftar: 148,
            diterima: 120,
            cadangan: 16,
            ditolak: 12,
            summaryByJenjang: [
                { name: 'MTs', count: 78, l: 42, p: 36 },
                { name: 'MA', count: 52, l: 28, p: 24 },
                { name: 'SMK', count: 18, l: 11, p: 7 }
            ],
            summaryByJalur: [
                { name: 'Reguler', count: 104 },
                { name: 'Prestasi', count: 32 },
                { name: 'Beasiswa Yatim/Tahfizh', count: 12 }
            ],
            adminName: 'Ust. H. Ahmad Fauzi, M.Pd',
            pimpinanName: 'KH. Abdullah Faqih, Lc',
            catatan: 'Arsip resmi rekapitulasi PSB Tahun Ajaran sebelumnya.'
        },
        {
            id: `psb-arch-${curYear - 2}`,
            type: 'laporan-rekapitulasi',
            tahunAjaran: prevYear2,
            nomorSurat: `072/SK-PSB/PST/VII/${curYear - 2}`,
            tanggalArsip: `${curYear - 2}-07-12`,
            totalPendaftar: 124,
            diterima: 98,
            cadangan: 14,
            ditolak: 12,
            summaryByJenjang: [
                { name: 'MTs', count: 64, l: 34, p: 30 },
                { name: 'MA', count: 42, l: 22, p: 20 },
                { name: 'SMK', count: 18, l: 10, p: 8 }
            ],
            summaryByJalur: [
                { name: 'Reguler', count: 88 },
                { name: 'Prestasi', count: 26 },
                { name: 'Beasiswa Yatim/Tahfizh', count: 10 }
            ],
            adminName: 'Ust. H. Ahmad Fauzi, M.Pd',
            pimpinanName: 'KH. Abdullah Faqih, Lc',
            catatan: 'Arsip rekapitulasi PSB 2 tahun lalu untuk tolok ukur pertumbuhan santri.'
        }
    ];
}

export interface YearComparisonStat {
    year: string;
    isCurrent: boolean;
    totalPendaftar: number;
    diterima: number;
    cadangan: number;
    ditolak: number;
    persenDiterima: number;
    growthPercent: number | null; // % pertumbuhan vs tahun sebelumnya
    laki: number;
    perempuan: number;
    perJenjang: { name: string; count: number }[];
}

/**
 * Menghitung komparasi analitik tren pendaftaran antara tahun sekarang dan tahun-tahun sebelumnya
 */
export const calculateMultiYearComparison = (
    currentList: Pendaftar[],
    currentConfig: PsbConfig,
    settings: PondokSettings,
    archives: PsbArchiveRecord[]
): {
    yearsComparison: YearComparisonStat[];
    trendChartData: { period: string; tahunIni: number; tahunLalu: number }[];
    totalGrowthRate: number | null;
} => {
    const curYearLabel = currentConfig.tahunAjaranAktif || `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`;
    
    // 1. Data Tahun Sekarang (Aktif)
    const currentTotal = currentList.length;
    const currentDiterima = currentList.filter(p => p.status === 'Diterima').length;
    const currentCadangan = currentList.filter(p => p.status === 'Cadangan').length;
    const currentDitolak = currentList.filter(p => p.status === 'Ditolak').length;
    const currentLaki = currentList.filter(p => p.jenisKelamin === 'Laki-laki').length;
    const currentPerempuan = currentList.filter(p => p.jenisKelamin === 'Perempuan').length;

    const currentJenjangMap = settings.jenjang.map(j => {
        const count = currentList.filter(p => p.jenjangId === j.id).length;
        return { name: j.nama, count };
    });

    const currentStat: YearComparisonStat = {
        year: curYearLabel,
        isCurrent: true,
        totalPendaftar: currentTotal,
        diterima: currentDiterima,
        cadangan: currentCadangan,
        ditolak: currentDitolak,
        persenDiterima: currentTotal > 0 ? Math.round((currentDiterima / currentTotal) * 100) : 0,
        growthPercent: null,
        laki: currentLaki,
        perempuan: currentPerempuan,
        perJenjang: currentJenjangMap
    };

    // 2. Data dari arsip tahun-tahun sebelumnya
    const archiveStats: YearComparisonStat[] = archives
        .filter(a => a.tahunAjaran !== curYearLabel)
        .map(a => {
            const l = a.summaryByJenjang.reduce((acc, curr) => acc + (curr.l || 0), 0);
            const p = a.summaryByJenjang.reduce((acc, curr) => acc + (curr.p || 0), 0);
            return {
                year: a.tahunAjaran,
                isCurrent: false,
                totalPendaftar: a.totalPendaftar,
                diterima: a.diterima,
                cadangan: a.cadangan,
                ditolak: a.ditolak,
                persenDiterima: a.totalPendaftar > 0 ? Math.round((a.diterima / a.totalPendaftar) * 100) : 0,
                growthPercent: null,
                laki: l,
                perempuan: p,
                perJenjang: a.summaryByJenjang.map(j => ({ name: j.name, count: j.count }))
            };
        });

    // Gabungkan (Urutkan dari terlama ke terbaru)
    const combined = [...archiveStats.reverse(), currentStat];

    // Hitung persentase pertumbuhan per tahun
    for (let i = 1; i < combined.length; i++) {
        const prev = combined[i - 1].totalPendaftar;
        const curr = combined[i].totalPendaftar;
        if (prev > 0) {
            combined[i].growthPercent = Math.round(((curr - prev) / prev) * 100);
        } else {
            combined[i].growthPercent = null;
        }
    }

    // Hitung pertumbuhan tahun aktif vs tahun tepat sebelumnya
    const prevYearStat = archiveStats.length > 0 ? archiveStats[0] : null;
    const totalGrowthRate = (prevYearStat && prevYearStat.totalPendaftar > 0)
        ? Math.round(((currentTotal - prevYearStat.totalPendaftar) / prevYearStat.totalPendaftar) * 100)
        : null;

    // 3. Pola Data Grafik Perbandingan Bulanan / Periode (Januari - Juli)
    // Bulan-bulan aktif masa pendaftaran
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul'];
    const trendChartData = months.map((m, idx) => {
        // Hitung santri tahun ini pada bulan tersebut
        const countThisYear = currentList.filter(p => {
            if (!p.tanggalDaftar) return false;
            const d = new Date(p.tanggalDaftar);
            return d.getMonth() === idx;
        }).length;

        // Perkiraan pola distribusi tahun lalu
        const prevTotal = prevYearStat?.totalPendaftar || 120;
        const weights = [0.08, 0.12, 0.22, 0.28, 0.16, 0.10, 0.04];
        const countLastYear = Math.round(prevTotal * weights[idx]);

        return {
            period: m,
            tahunIni: countThisYear,
            tahunLalu: countLastYear
        };
    });

    return {
        yearsComparison: combined.reverse(), // Terbaru paling atas
        trendChartData,
        totalGrowthRate
    };
};
