import React, { useMemo, useState, useEffect } from 'react';
import { Pendaftar, PsbConfig, PondokSettings, PendaftarStatus } from '../../types';
import { PrintHeader } from '../common/PrintHeader';
import { SectionCard } from '../common/SectionCard';
import { EmptyState } from '../common/EmptyState';
import { PsbDashboardReportModal } from './modals/PsbDashboardReportModal';
import { PsbArchiveHistoryModal } from './modals/PsbArchiveHistoryModal';
import { getPsbArchives, calculateMultiYearComparison, YearComparisonStat } from './utils/psbArchiveService';
import {
    ResponsiveContainer,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend
} from 'recharts';

interface PsbDashboardProps {
    pendaftarList: Pendaftar[];
    config: PsbConfig;
    settings: PondokSettings;
    onSaveConfig?: (newConfig: PsbConfig) => void;
}

export const PsbDashboard: React.FC<PsbDashboardProps> = ({ pendaftarList, config, settings, onSaveConfig }) => {
    const totalPendaftar = pendaftarList.length;
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
    const [archiveRefreshKey, setArchiveRefreshKey] = useState(0);

    // Ambil data arsip historis
    const archives = useMemo(() => {
        return getPsbArchives();
    }, [archiveRefreshKey]);

    // Hitung komparasi antar tahun
    const { yearsComparison, trendChartData, totalGrowthRate } = useMemo(() => {
        return calculateMultiYearComparison(pendaftarList, config, settings, archives);
    }, [pendaftarList, config, settings, archives]);

    // Data tahun pembanding utama (tahun sebelum tahun aktif)
    const prevYearStat = useMemo<YearComparisonStat | null>(() => {
        const prev = yearsComparison.find(y => !y.isCurrent);
        return prev || null;
    }, [yearsComparison]);

    // Selector tahun pembanding spesifik
    const [selectedCompareYear, setSelectedCompareYear] = useState<string>('');
    useEffect(() => {
        if (!selectedCompareYear && prevYearStat) {
            setSelectedCompareYear(prevYearStat.year);
        }
    }, [prevYearStat, selectedCompareYear]);

    const activeCompareStat = useMemo(() => {
        if (!selectedCompareYear) return prevYearStat;
        return yearsComparison.find(y => y.year === selectedCompareYear) || prevYearStat;
    }, [selectedCompareYear, yearsComparison, prevYearStat]);

    // Status seleksi
    const statusStats = useMemo(() => {
        const counts: Record<PendaftarStatus, number> = {
            'Baru': 0,
            'Verifikasi Berkas': 0,
            'Ujian Masuk': 0,
            'Cadangan': 0,
            'Diterima': 0,
            'Ditolak': 0
        };
        pendaftarList.forEach(p => {
            if (counts[p.status] !== undefined) {
                counts[p.status]++;
            }
        });
        return counts;
    }, [pendaftarList]);

    // Distribusi Jenjang
    const statsByJenjang = useMemo(() => {
        return settings.jenjang.map(j => {
            const pendaftarInJenjang = pendaftarList.filter(p => p.jenjangId === j.id);
            const l = pendaftarInJenjang.filter(p => p.jenisKelamin === 'Laki-laki').length;
            const p = pendaftarInJenjang.filter(p => p.jenisKelamin === 'Perempuan').length;
            const total = pendaftarInJenjang.length;

            // Cari data jenjang di tahun pembanding
            const prevJenjang = activeCompareStat?.perJenjang.find(pj => pj.name.toLowerCase() === j.nama.toLowerCase());
            const prevCount = prevJenjang ? prevJenjang.count : 0;
            const growth = prevCount > 0 ? Math.round(((total - prevCount) / prevCount) * 100) : null;

            return { 
                id: j.id, 
                name: j.nama, 
                total, 
                l, 
                p, 
                prevCount,
                growth,
                percentL: total > 0 ? (l / total) * 100 : 0,
                percentP: total > 0 ? (p / total) * 100 : 0
            };
        });
    }, [settings.jenjang, pendaftarList, activeCompareStat]);

    // Tren Harian 7 Hari Terakhir
    const dailyTrend = useMemo(() => {
        const days = [];
        const today = new Date();
        for (let i = 6; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(today.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            const count = pendaftarList.filter(p => p.tanggalDaftar && p.tanggalDaftar.startsWith(dateStr)).length;
            days.push({ date: d.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric' }), count });
        }
        return days;
    }, [pendaftarList]);

    const maxDaily = Math.max(...dailyTrend.map(d => d.count), 1);
    const todayStr = new Date().toISOString().split('T')[0];
    const pendaftarHariIni = pendaftarList.filter(p => p.tanggalDaftar && p.tanggalDaftar.startsWith(todayStr)).length;

    // Persentase Penerimaan
    const acceptanceRate = totalPendaftar > 0 ? Math.round((statusStats.Diterima / totalPendaftar) * 100) : 0;
    const prevAcceptanceRate = activeCompareStat?.persenDiterima || 0;
    const rateDiff = acceptanceRate - prevAcceptanceRate;

    // Capaian Kuota
    const targetKuota = config.targetKuota || 0;
    const kuotaProgress = targetKuota > 0 ? Math.min(Math.round((totalPendaftar / targetKuota) * 100), 100) : null;

    const curYearLabel = config.tahunAjaranAktif || `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`;

    return (
        <div className="space-y-6">
            {/* Header Section disesuaikan dengan menu lain */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2 no-print">
                <div>
                    <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-teal-50 text-teal-700 border border-teal-200">
                            <i className="bi bi-clock-history"></i> Komparasi Aktif: {curYearLabel} vs {activeCompareStat?.year || 'Tahun Lalu'}
                        </span>
                    </div>
                    <h2 className="text-xl font-black tracking-tight text-app-text mt-1">Dashboard & Tren Pendaftaran PSB</h2>
                    <p className="text-sm app-text-muted">Pantau laju pertumbuhan pendaftar, komparasi antar-tahun ajaran, dan status seleksi santri.</p>
                </div>
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                    <button
                        type="button"
                        onClick={() => setIsArchiveModalOpen(true)}
                        className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-2xs"
                        title="Buka arsip surat pengumuman & laporan rekapitulasi tahun-tahun sebelumnya"
                    >
                        <i className="bi bi-archive-fill text-amber-500"></i>
                        <span>Arsip & Dokumen PSB</span>
                        <span className="px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-700 text-[10px] font-mono">
                            {archives.length}
                        </span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setIsReportModalOpen(true)}
                        className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 transition-colors shadow-2xs"
                        title="Cetak tabel laporan rekapitulasi data dashboard dalam format PDF rapi"
                    >
                        <i className="bi bi-file-earmark-bar-graph-fill text-teal-300"></i>
                        <span>Cetak Laporan (PDF)</span>
                    </button>
                </div>
            </div>

            {/* Print Header for Native Printing */}
            <div className="hidden print:block mb-8">
                <PrintHeader settings={settings} title="LAPORAN DASHBOARD PENERIMAAN SANTRI BARU" />
                <p className="text-center text-sm">Dicetak pada: {new Date().toLocaleDateString('id-ID', { dateStyle: 'full' })}</p>
            </div>

            {/* Grid 4 Kartu Metrik Utama & Komparasi Pertumbuhan */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. Total Pendaftar & Pertumbuhan */}
                <div className="app-panel-elevated rounded-panel p-5 border-l-4 border-l-teal-500 flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider app-text-muted">Total Pendaftar</span>
                        <div className="w-10 h-10 rounded-2xl bg-teal-50 dark:bg-teal-900/40 text-teal-600 dark:text-teal-400 flex items-center justify-center">
                            <i className="bi bi-people-fill text-lg"></i>
                        </div>
                    </div>
                    <div className="mt-2">
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-black text-app-text">{totalPendaftar}</span>
                            <span className="text-xs font-semibold app-text-muted">Santri</span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-2 text-xs">
                            {totalGrowthRate !== null ? (
                                <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full font-bold text-[10px] ${
                                    totalGrowthRate >= 0
                                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300'
                                        : 'bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-300'
                                }`}>
                                    <i className={`bi ${totalGrowthRate >= 0 ? 'bi-graph-up-arrow' : 'bi-graph-down-arrow'}`}></i>
                                    {totalGrowthRate >= 0 ? `+${totalGrowthRate}%` : `${totalGrowthRate}%`}
                                </span>
                            ) : (
                                <span className="text-[11px] text-slate-400">Tahun Pertama</span>
                            )}
                            <span className="text-[11px] app-text-muted truncate">
                                vs {activeCompareStat ? `${activeCompareStat.totalPendaftar} (TA ${activeCompareStat.year})` : 'Data lalu'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* 2. Pendaftar Baru Hari Ini */}
                <div className="app-panel-elevated rounded-panel p-5 border-l-4 border-l-blue-500 flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider app-text-muted">Pendaftar Hari Ini</span>
                        <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                            <i className="bi bi-person-plus-fill text-lg"></i>
                        </div>
                    </div>
                    <div className="mt-2">
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-black text-app-text">{pendaftarHariIni}</span>
                            <span className="text-xs font-semibold app-text-muted">Masuk</span>
                        </div>
                        <p className="mt-2 text-xs app-text-muted flex items-center gap-1">
                            <i className="bi bi-calendar-event text-blue-500"></i>
                            {new Date().toLocaleDateString('id-ID', { dateStyle: 'medium' })}
                        </p>
                    </div>
                </div>

                {/* 3. Lolos Seleksi & Rasio Kelulusan */}
                <div className="app-panel-elevated rounded-panel p-5 border-l-4 border-l-emerald-500 flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider app-text-muted">Santri Diterima</span>
                        <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                            <i className="bi bi-check-circle-fill text-lg"></i>
                        </div>
                    </div>
                    <div className="mt-2">
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-black text-emerald-600 dark:text-emerald-400">{statusStats.Diterima}</span>
                            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">({acceptanceRate}%)</span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-2 text-xs">
                            <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full font-bold text-[10px] ${
                                rateDiff >= 0
                                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30'
                                    : 'bg-amber-50 text-amber-700 dark:bg-amber-900/30'
                            }`}>
                                <i className={`bi ${rateDiff >= 0 ? 'bi-arrow-up-right' : 'bi-arrow-down-right'}`}></i>
                                {rateDiff >= 0 ? `+${rateDiff}%` : `${rateDiff}%`}
                            </span>
                            <span className="text-[11px] app-text-muted truncate">
                                vs {activeCompareStat?.persenDiterima || 0}% lolos lalu
                            </span>
                        </div>
                    </div>
                </div>

                {/* 4. Target Kuota / Kapasitas Pondok */}
                <div className="app-panel-elevated rounded-panel p-5 border-l-4 border-l-amber-500 flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider app-text-muted">Target Kuota Penerimaan</span>
                        <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                            <i className="bi bi-bullseye text-lg"></i>
                        </div>
                    </div>
                    <div className="mt-2">
                        <div className="flex items-baseline justify-between">
                            <span className="text-2xl font-black text-app-text">
                                {totalPendaftar} <span className="text-sm font-normal text-slate-400">/ {targetKuota > 0 ? targetKuota : 'Tak Terbatas'}</span>
                            </span>
                            {kuotaProgress !== null && (
                                <span className="text-xs font-bold text-amber-700 dark:text-amber-400">{kuotaProgress}%</span>
                            )}
                        </div>
                        {targetKuota > 0 ? (
                            <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full mt-2.5 overflow-hidden">
                                <div
                                    className="bg-amber-500 h-full rounded-full transition-all duration-500"
                                    style={{ width: `${kuotaProgress}%` }}
                                ></div>
                            </div>
                        ) : (
                            <p className="mt-2 text-xs app-text-muted">Atur kuota di menu Desain Formulir</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Section Grafik Komparasi Tren Pendaftaran Antar-Tahun */}
            <SectionCard
                title="Lacak Tren & Komparasi Laju Pendaftaran Antar-Tahun"
                description={`Grafik perbandingan volume pendaftar per periode antara Tahun Sekarang (${curYearLabel}) dan Tahun Pembanding.`}
                actions={
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-500">Bandingkan Dengan:</span>
                        <select
                            value={selectedCompareYear}
                            onChange={(e) => setSelectedCompareYear(e.target.value)}
                            className="text-xs font-bold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-1.5 outline-none text-slate-800 dark:text-slate-200"
                        >
                            {yearsComparison.filter(y => !y.isCurrent).map(y => (
                                <option key={y.year} value={y.year}>
                                    TA {y.year} ({y.totalPendaftar} santri)
                                </option>
                            ))}
                            {yearsComparison.filter(y => !y.isCurrent).length === 0 && (
                                <option value="">Belum ada arsip pembanding</option>
                            )}
                        </select>
                    </div>
                }
                contentClassName="p-6"
            >
                <div className="w-full h-72 sm:h-80">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={trendChartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorTahunIni" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#0d9488" stopOpacity={0.4} />
                                    <stop offset="95%" stopColor="#0d9488" stopOpacity={0.0} />
                                </linearGradient>
                                <linearGradient id="colorTahunLalu" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis
                                dataKey="period"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fontSize: 12, fill: '#64748b' }}
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fontSize: 12, fill: '#64748b' }}
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: '#0f172a',
                                    borderRadius: '12px',
                                    border: 'none',
                                    color: '#fff',
                                    fontSize: '12px',
                                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                                }}
                                formatter={(value: any, name: any) => [
                                    `${value} Santri`,
                                    name === 'tahunIni' ? `Tahun Ini (${curYearLabel})` : `Tahun Pembanding (${activeCompareStat?.year || 'Lalu'})`
                                ]}
                            />
                            <Legend
                                verticalAlign="top"
                                align="right"
                                iconType="circle"
                                wrapperStyle={{ paddingBottom: '16px', fontSize: '12px' }}
                                formatter={(value) => (value === 'tahunIni' ? `Tahun Sekarang (${curYearLabel})` : `Tahun Pembanding (${activeCompareStat?.year || 'Lalu'})`)}
                            />
                            <Area
                                type="monotone"
                                dataKey="tahunIni"
                                stroke="#0d9488"
                                strokeWidth={3}
                                fillOpacity={1}
                                fill="url(#colorTahunIni)"
                                name="tahunIni"
                            />
                            <Area
                                type="monotone"
                                dataKey="tahunLalu"
                                stroke="#6366f1"
                                strokeWidth={2}
                                strokeDasharray="4 4"
                                fillOpacity={1}
                                fill="url(#colorTahunLalu)"
                                name="tahunLalu"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs app-text-muted">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5">
                            <span className="w-3 h-3 rounded-full bg-teal-600"></span>
                            <span className="font-semibold text-app-text">Tahun Sekarang ({curYearLabel})</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="w-3 h-3 rounded-full bg-indigo-500 border border-dashed border-indigo-600"></span>
                            <span>Tahun Pembanding ({activeCompareStat?.year || 'Lalu'})</span>
                        </div>
                    </div>
                    <span className="italic text-[11px]">
                        * Data tahun pembanding bersumber dari Arsip PSB atau snapshot historis pondok.
                    </span>
                </div>
            </SectionCard>

            {/* Grid 2 Kolom: Komparasi Per Jenjang & Status Seleksi */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 1. Komparasi Pendaftar per Jenjang */}
                <SectionCard
                    title="Komparasi Pendaftar per Jenjang"
                    description="Perbandingan jumlah santri dan pertumbuhan per jenjang pendidikan."
                    contentClassName="p-6"
                >
                    <div className="space-y-5">
                        {statsByJenjang.map((jenjang) => (
                            <div key={jenjang.id} className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                                <div className="flex justify-between items-end mb-2">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-base font-bold text-app-text">{jenjang.name}</span>
                                            {jenjang.growth !== null && (
                                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                                    jenjang.growth >= 0
                                                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                                                        : 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300'
                                                }`}>
                                                    {jenjang.growth >= 0 ? `+${jenjang.growth}%` : `${jenjang.growth}%`}
                                                </span>
                                            )}
                                        </div>
                                        <span className="text-xs app-text-muted">
                                            Tahun Lalu: {jenjang.prevCount} Santri
                                        </span>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-lg font-black text-app-text">{jenjang.total}</span>
                                        <span className="text-xs app-text-muted ml-1">Pendaftar</span>
                                    </div>
                                </div>

                                <div className="w-full h-4 flex rounded-full overflow-hidden bg-slate-200 dark:bg-slate-700">
                                    {jenjang.total > 0 ? (
                                        <>
                                            <div
                                                className="bg-blue-500 h-full flex items-center justify-center text-[9px] text-white font-bold"
                                                style={{ width: `${jenjang.percentL}%` }}
                                                title={`Putra: ${jenjang.l}`}
                                            >
                                                {jenjang.percentL > 15 && `${Math.round(jenjang.percentL)}%`}
                                            </div>
                                            <div
                                                className="bg-pink-500 h-full flex items-center justify-center text-[9px] text-white font-bold"
                                                style={{ width: `${jenjang.percentP}%` }}
                                                title={`Putri: ${jenjang.p}`}
                                            >
                                                {jenjang.percentP > 15 && `${Math.round(jenjang.percentP)}%`}
                                            </div>
                                        </>
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-[9px] text-slate-400">
                                            Belum ada pendaftar
                                        </div>
                                    )}
                                </div>

                                <div className="flex justify-between mt-2 text-xs">
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                                        <span className="app-text-secondary">Putra: <strong>{jenjang.l}</strong></span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-2.5 h-2.5 rounded-full bg-pink-500"></span>
                                        <span className="app-text-secondary">Putri: <strong>{jenjang.p}</strong></span>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {statsByJenjang.length === 0 && (
                            <EmptyState
                                icon="bi-diagram-3"
                                title="Jenjang belum dikonfigurasi"
                                description="Tambahkan data jenjang terlebih dahulu pada menu Pengaturan Pondok."
                            />
                        )}
                    </div>
                </SectionCard>

                {/* 2. Status Seleksi & Hasil Penerimaan */}
                <SectionCard
                    title="Status Seleksi Calon Santri"
                    description="Rincian tahapan seleksi dan hasil keputusan panitia PSB."
                    contentClassName="p-6"
                >
                    <div className="space-y-3">
                        <div className="flex justify-between items-center p-3.5 bg-blue-50/70 dark:bg-blue-950/20 rounded-xl border border-blue-200/80 dark:border-blue-900/40">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold">
                                    <i className="bi bi-clock"></i>
                                </div>
                                <div>
                                    <span className="font-bold text-xs text-blue-950 dark:text-blue-200 block">Pendaftar Baru / Belum Diseleksi</span>
                                    <span className="text-[11px] text-blue-700/80 dark:text-blue-400">Menunggu verifikasi administrasi</span>
                                </div>
                            </div>
                            <span className="text-lg font-black text-blue-900 dark:text-blue-200">{statusStats.Baru}</span>
                        </div>

                        <div className="flex justify-between items-center p-3.5 bg-amber-50/70 dark:bg-amber-950/20 rounded-xl border border-amber-200/80 dark:border-amber-900/40">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 flex items-center justify-center font-bold">
                                    <i className="bi bi-file-earmark-check"></i>
                                </div>
                                <div>
                                    <span className="font-bold text-xs text-amber-950 dark:text-amber-200 block">Verifikasi Berkas & Ujian</span>
                                    <span className="text-[11px] text-amber-700/80 dark:text-amber-400">Tahap observasi dan tes masuk</span>
                                </div>
                            </div>
                            <span className="text-lg font-black text-amber-900 dark:text-amber-200">
                                {statusStats['Verifikasi Berkas'] + statusStats['Ujian Masuk']}
                            </span>
                        </div>

                        <div className="flex justify-between items-center p-3.5 bg-emerald-50/70 dark:bg-emerald-950/20 rounded-xl border border-emerald-200/80 dark:border-emerald-900/40">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold">
                                    <i className="bi bi-award-fill"></i>
                                </div>
                                <div>
                                    <span className="font-bold text-xs text-emerald-950 dark:text-emerald-200 block">Dinyatakan Diterima (Lolos)</span>
                                    <span className="text-[11px] text-emerald-700/80 dark:text-emerald-400">Tercantum dalam SK Pengumuman</span>
                                </div>
                            </div>
                            <span className="text-lg font-black text-emerald-900 dark:text-emerald-200">{statusStats.Diterima}</span>
                        </div>

                        <div className="flex justify-between items-center p-3.5 bg-yellow-50/70 dark:bg-yellow-950/20 rounded-xl border border-yellow-200/80 dark:border-yellow-900/40">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-yellow-100 dark:bg-yellow-900/60 text-yellow-700 dark:text-yellow-300 flex items-center justify-center font-bold">
                                    <i className="bi bi-person-lines-fill"></i>
                                </div>
                                <div>
                                    <span className="font-bold text-xs text-yellow-950 dark:text-yellow-200 block">Cadangan</span>
                                    <span className="text-[11px] text-yellow-700/80 dark:text-yellow-400">Mengisi kuota santri mengundurkan diri</span>
                                </div>
                            </div>
                            <span className="text-lg font-black text-yellow-900 dark:text-yellow-200">{statusStats.Cadangan}</span>
                        </div>

                        <div className="flex justify-between items-center p-3.5 bg-rose-50/70 dark:bg-rose-950/20 rounded-xl border border-rose-200/80 dark:border-rose-900/40">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300 flex items-center justify-center font-bold">
                                    <i className="bi bi-x-circle-fill"></i>
                                </div>
                                <div>
                                    <span className="font-bold text-xs text-rose-950 dark:text-rose-200 block">Tidak Diterima / Batal</span>
                                    <span className="text-[11px] text-rose-700/80 dark:text-rose-400">Gugur administrasi atau nilai ujian</span>
                                </div>
                            </div>
                            <span className="text-lg font-black text-rose-900 dark:text-rose-200">{statusStats.Ditolak}</span>
                        </div>
                    </div>
                </SectionCard>
            </div>

            {/* Tren Harian 7 Hari Terakhir */}
            <SectionCard
                title="Aktivitas Pendaftaran Harian (7 Hari Terakhir)"
                description="Pantau ritme pendaftaran santri baru sepekan terakhir."
                contentClassName="p-6"
            >
                <div className="h-44 flex items-end justify-between gap-2 pt-4">
                    {dailyTrend.map((d, idx) => (
                        <div key={idx} className="flex flex-col items-center w-full group">
                            <div className="relative w-full flex justify-center">
                                <div
                                    className="w-3/5 sm:w-4/5 bg-teal-500 rounded-t-xl hover:bg-teal-600 transition-all cursor-pointer shadow-xs"
                                    style={{ height: `${d.count > 0 ? (d.count / maxDaily) * 120 : 4}px` }}
                                ></div>
                                <div className="absolute -top-7 bg-slate-900 text-white text-[10px] px-2 py-0.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity font-bold pointer-events-none shadow-md">
                                    {d.count} Santri
                                </div>
                            </div>
                            <span className="text-[11px] font-semibold text-slate-500 mt-2 text-center leading-tight">{d.date}</span>
                        </div>
                    ))}
                </div>
            </SectionCard>

            {/* Modal Laporan Tabel Dashboard (PDF) */}
            <PsbDashboardReportModal
                isOpen={isReportModalOpen}
                onClose={() => setIsReportModalOpen(false)}
                pendaftarList={pendaftarList}
                settings={settings}
                config={config}
                onSaveConfig={onSaveConfig}
            />

            {/* Modal Arsip & Dokumen Historis PSB */}
            <PsbArchiveHistoryModal
                isOpen={isArchiveModalOpen}
                onClose={() => setIsArchiveModalOpen(false)}
                settings={settings}
                config={config}
                onArchivesUpdated={() => setArchiveRefreshKey(prev => prev + 1)}
            />
        </div>
    );
};
