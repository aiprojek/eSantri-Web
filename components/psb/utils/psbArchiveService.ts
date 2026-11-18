import { PsbArchiveRecord, Pendaftar, PondokSettings, PsbConfig } from '../../../types';
import { matchesPsbTahunAjaran } from './psbUtils';

export const PSB_ARCHIVE_STORAGE_KEY = 'esantri_psb_historical_archives';

const isLegacyAutoSeededSample = (a: PsbArchiveRecord): boolean => {
    if (!a || !a.id) return false;
    return (
        /^psb-arch-\d{4}$/.test(a.id) &&
        (a.totalPendaftar === 148 || a.totalPendaftar === 124) &&
        a.adminName === 'Ust. H. Ahmad Fauzi, M.Pd'
    );
};

/**
 * Mendapatkan seluruh daftar arsip historis PSB.
 * Memprioritaskan `config.archives` (tersimpan di Dexie settings -> backup JSON & cloud sync)
 * dengan migrasi aman dari localStorage bila ada entri riil lama.
 */
export const getPsbArchives = (config?: PsbConfig): PsbArchiveRecord[] => {
    if (config && Array.isArray(config.archives)) {
        return config.archives.filter(a => !isLegacyAutoSeededSample(a));
    }
    try {
        const raw = localStorage.getItem(PSB_ARCHIVE_STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed.filter((a: PsbArchiveRecord) => !isLegacyAutoSeededSample(a));
    } catch {
        return [];
    }
};

/**
 * Menyimpan atau memperbarui arsip laporan/pengumuman PSB ke `PsbConfig.archives` dan localStorage.
 */
export const savePsbArchive = async (
    record: PsbArchiveRecord,
    config?: PsbConfig,
    onSaveConfig?: (updated: PsbConfig) => Promise<void> | void
): Promise<PsbArchiveRecord[]> => {
    const current = getPsbArchives(config);
    const existingIdx = current.findIndex(a => a.id === record.id);
    let updated: PsbArchiveRecord[];
    if (existingIdx >= 0) {
        updated = [...current];
        updated[existingIdx] = record;
    } else {
        updated = [record, ...current];
    }

    try {
        localStorage.setItem(PSB_ARCHIVE_STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
        console.error('Gagal menyalin arsip PSB ke localStorage:', e);
    }

    if (config && onSaveConfig) {
        await onSaveConfig({ ...config, archives: updated });
    }
    return updated;
};

/**
 * Menghapus data arsip PSB berdasarkan ID dari `PsbConfig.archives` dan localStorage.
 */
export const deletePsbArchive = async (
    id: string,
    config?: PsbConfig,
    onSaveConfig?: (updated: PsbConfig) => Promise<void> | void
): Promise<PsbArchiveRecord[]> => {
    const current = getPsbArchives(config);
    const updated = current.filter(a => a.id !== id);

    try {
        localStorage.setItem(PSB_ARCHIVE_STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
        console.error('Gagal memperbarui localStorage arsip PSB:', e);
    }

    if (config && onSaveConfig) {
        await onSaveConfig({ ...config, archives: updated });
    }
    return updated;
};

export interface YearComparisonStat {
    year: string;
    isCurrent: boolean;
    totalPendaftar: number;
    diterima: number;
    cadangan: number;
    ditolak: number;
    persenDiterima: number;
    growthPercent: number | null;
    laki: number;
    perempuan: number;
    perJenjang: { name: string; count: number }[];
}

/**
 * Menghitung komparasi analitik tren pendaftaran antara tahun aktif dan arsip tahun sebelumnya
 * berdasarkan data riil (tanpa angka fiktif).
 */
export const calculateMultiYearComparison = (
    allPendaftar: Pendaftar[],
    currentConfig: PsbConfig,
    settings: PondokSettings,
    archives: PsbArchiveRecord[]
): {
    yearsComparison: YearComparisonStat[];
    trendChartData: { period: string; tahunIni: number; tahunLalu: number }[];
    totalGrowthRate: number | null;
    prevYearLabel: string | null;
} => {
    const curYearLabel = (currentConfig.tahunAjaranAktif || `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`).trim();
    const currentList = allPendaftar.filter(p => matchesPsbTahunAjaran(p, curYearLabel, curYearLabel));

    // 1. Data Tahun Sekarang (Aktif)
    const currentTotal = currentList.length;
    const currentDiterima = currentList.filter(p => p.status === 'Diterima').length;
    const currentCadangan = currentList.filter(p => p.status === 'Cadangan').length;
    const currentDitolak = currentList.filter(p => p.status === 'Ditolak').length;
    const currentLaki = currentList.filter(p => p.jenisKelamin === 'Laki-laki').length;
    const currentPerempuan = currentList.filter(p => p.jenisKelamin === 'Perempuan').length;

    const currentJenjangMap = settings.jenjang.map(j => ({
        name: j.nama,
        count: currentList.filter(p => p.jenjangId === j.id).length
    }));

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

    // 2. Data dari arsip tahun-tahun sebelumnya (deduplikasi per tahunAjaran, ambil yang terbaru)
    const seenYears = new Set<string>([curYearLabel]);
    const archiveStats: YearComparisonStat[] = [];
    for (const a of archives) {
        const y = (a.tahunAjaran || '').trim();
        if (!y || seenYears.has(y)) continue;
        seenYears.add(y);
        const l = a.summaryByJenjang.reduce((acc, curr) => acc + (curr.l || 0), 0);
        const p = a.summaryByJenjang.reduce((acc, curr) => acc + (curr.p || 0), 0);
        archiveStats.push({
            year: y,
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
        });
    }

    // Gabungkan & urutkan dari tahun terlama ke terbaru untuk menghitung pertumbuhan
    const sortedArchivesAsc = [...archiveStats].sort((a, b) => a.year.localeCompare(b.year));
    const combined = [...sortedArchivesAsc, currentStat];

    for (let i = 1; i < combined.length; i++) {
        const prev = combined[i - 1].totalPendaftar;
        const curr = combined[i].totalPendaftar;
        combined[i].growthPercent = prev > 0 ? Math.round(((curr - prev) / prev) * 100) : null;
    }

    const prevYearStat = sortedArchivesAsc.length > 0 ? sortedArchivesAsc[sortedArchivesAsc.length - 1] : null;
    const totalGrowthRate = (prevYearStat && prevYearStat.totalPendaftar > 0)
        ? Math.round(((currentTotal - prevYearStat.totalPendaftar) / prevYearStat.totalPendaftar) * 100)
        : null;

    // 3. Data Grafik Bulanan Riil (Januari - Desember / periode aktif pendaftaran)
    const prevYearRawList = prevYearStat
        ? allPendaftar.filter(p => matchesPsbTahunAjaran(p, prevYearStat.year, curYearLabel))
        : [];

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    const trendChartData = months.map((m, idx) => {
        const countThisYear = currentList.filter(p => {
            if (!p.tanggalDaftar) return false;
            const d = new Date(p.tanggalDaftar);
            return !isNaN(d.getTime()) && d.getMonth() === idx;
        }).length;

        const countLastYear = prevYearRawList.filter(p => {
            if (!p.tanggalDaftar) return false;
            const d = new Date(p.tanggalDaftar);
            return !isNaN(d.getTime()) && d.getMonth() === idx;
        }).length;

        return {
            period: m,
            tahunIni: countThisYear,
            tahunLalu: countLastYear
        };
    });

    return {
        yearsComparison: combined.reverse(),
        trendChartData,
        totalGrowthRate,
        prevYearLabel: prevYearStat?.year || null
    };
};
