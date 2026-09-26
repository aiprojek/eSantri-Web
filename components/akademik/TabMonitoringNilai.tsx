
import React, { useState, useEffect, useMemo } from 'react';
import { useAppContext } from '../../AppContext';
import { useSantriContext } from '../../contexts/SantriContext';
import { db } from '../../db';
import { MobileFilterDrawer } from '../common/MobileFilterDrawer';
import { useAcademicPeriodFilter } from '../../hooks/useAcademicPeriodFilter';
import { formatAcademicYearDisplay } from '../../utils/academicYear';

export interface TabMonitoringNilaiProps {
    onNavigateToTab?: (tab: string, rombelId?: number) => void;
}

export const TabMonitoringNilai: React.FC<TabMonitoringNilaiProps> = ({ onNavigateToTab }) => {
    const { settings } = useAppContext();
    const { santriList } = useSantriContext();
    const {
        filterTahun,
        setFilterTahun,
        filterSemester,
        setFilterSemester,
        availableYears,
        defaultAcademicYear
    } = useAcademicPeriodFilter(settings);
    
    const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
    const [selectedAuditRombel, setSelectedAuditRombel] = useState<any | null>(null);
    const [auditStudents, setAuditStudents] = useState<any[]>([]);
    const [isAuditLoading, setIsAuditLoading] = useState(false);
    
    // Stats State
    const [stats, setStats] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // Calculate Stats when filter changes
    useEffect(() => {
        const calculateStats = async () => {
            setIsLoading(true);
            try {
                // 1. Get all records for current period
                const records = await db.raporRecords
                    .where({ tahunAjaran: filterTahun, semester: filterSemester })
                    .toArray();
                
                // Map records by Santri ID for fast lookup
                const recordMap = new Set(records.map(r => r.santriId));

                // 2. Iterate Rombels to build stats
                const rombelStats = settings.rombel.map(rombel => {
                    const kelas = settings.kelas.find(k => k.id === rombel.kelasId);
                    const jenjang = settings.jenjang.find(j => j.id === kelas?.jenjangId);
                    const wali = settings.tenagaPengajar.find(t => t.id === rombel.waliKelasId);

                    // Get Active Santri in this Rombel
                    const santriInRombel = santriList.filter(s => s.rombelId === rombel.id && s.status === 'Aktif');
                    const totalSantri = santriInRombel.length;

                    // Count how many have records
                    const submittedCount = santriInRombel.filter(s => recordMap.has(s.id)).length;
                    
                    const percent = totalSantri > 0 ? Math.round((submittedCount / totalSantri) * 100) : 0;
                    
                    let status: 'Lengkap' | 'Sebagian' | 'Kosong' = 'Kosong';
                    if (totalSantri > 0) {
                        if (submittedCount === totalSantri) status = 'Lengkap';
                        else if (submittedCount > 0) status = 'Sebagian';
                    }

                    // Last update in this rombel (optional visualization)
                    const rombelRecords = records.filter(r => r.rombelId === rombel.id);
                    const lastUpdate = rombelRecords.length > 0 
                        ? new Date(Math.max(...rombelRecords.map(r => new Date(r.lastModified || r.tanggalRapor).getTime())))
                        : null;

                    return {
                        id: rombel.id,
                        nama: rombel.nama,
                        jenjang: jenjang?.nama,
                        kelas: kelas?.nama,
                        wali: wali?.nama || 'Belum Ditentukan',
                        totalSantri,
                        submittedCount,
                        percent,
                        status,
                        lastUpdate
                    };
                });
                
                setStats(rombelStats);
            } finally {
                setIsLoading(false);
            }
        };

        calculateStats();
    }, [filterTahun, filterSemester, settings, santriList]);

    // Audit specific rombel students
    useEffect(() => {
        const loadRombelAudit = async () => {
            if (!selectedAuditRombel) {
                setAuditStudents([]);
                return;
            }
            setIsAuditLoading(true);
            try {
                const currentYear = filterTahun || availableYears[0] || defaultAcademicYear;
                const recs = await db.raporRecords
                    .where('[tahunAjaran+semester]')
                    .equals([currentYear, filterSemester])
                    .toArray();

                const rombelRecs = recs.filter(r => r.rombelId === selectedAuditRombel.id);
                const recMap = new Map<number, any>();
                rombelRecs.forEach(r => recMap.set(r.santriId, r));

                const students = santriList
                    .filter(s => s.rombelId === selectedAuditRombel.id && s.status === 'Aktif')
                    .sort((a, b) => a.namaLengkap.localeCompare(b.namaLengkap))
                    .map(s => {
                        const rec = recMap.get(s.id);
                        let filledCount = 0;
                        let customData: Record<string, any> = {};
                        if (rec?.customData) {
                            try {
                                customData = JSON.parse(rec.customData);
                                filledCount = Object.keys(customData).filter(k => customData[k] !== undefined && customData[k] !== '').length;
                            } catch {}
                        }
                        return {
                            santri: s,
                            record: rec || null,
                            isSubmitted: !!rec,
                            filledCount,
                            lastModified: rec?.lastModified || rec?.tanggalRapor || null
                        };
                    });

                setAuditStudents(students);
            } finally {
                setIsAuditLoading(false);
            }
        };

        loadRombelAudit();
    }, [selectedAuditRombel, filterTahun, filterSemester, santriList, defaultAcademicYear, availableYears]);

    // Summary Totals
    const summary = useMemo(() => {
        const totalRombel = stats.length;
        const lengkap = stats.filter(s => s.status === 'Lengkap').length;
        const kosong = stats.filter(s => s.status === 'Kosong' && s.totalSantri > 0).length;
        const sebagian = stats.filter(s => s.status === 'Sebagian').length;
        return { totalRombel, lengkap, kosong, sebagian };
    }, [stats]);

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header & Filter */}
            <div className="bg-white p-4 sm:p-6 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h2 className="text-xl font-black text-gray-800">Monitoring Pengumpulan</h2>
                        <p className="text-sm text-gray-500 font-medium">Pantau progres pengisian rapor oleh wali kelas.</p>
                    </div>

                    {/* Mobile Filter */}
                    <div className="md:hidden w-full">
                        <button 
                            onClick={() => setIsFilterDrawerOpen(true)}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-teal-50 text-teal-700 border border-teal-200 rounded-xl font-bold text-sm shadow-sm"
                        >
                            <i className="bi bi-funnel-fill"></i>
                            <span>Filter</span>
                        </button>
                    </div>

                    {/* Desktop Filter */}
                    <div className="hidden md:flex gap-4">
                        <div className="min-w-[140px]">
                            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5 tracking-widest pl-1">Tahun Ajaran</label>
                            {availableYears.length > 0 ? (
                                <select value={filterTahun} onChange={e => setFilterTahun(e.target.value)} className="w-full border-2 border-gray-100 rounded-xl px-4 py-2 text-sm font-bold bg-gray-50/50 focus:bg-white focus:border-teal-500 transition-all outline-none">
                                    {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                                </select>
                            ) : (
                                <select value={filterTahun} onChange={e => setFilterTahun(e.target.value)} className="w-full border-2 border-gray-100 rounded-xl px-4 py-2 text-sm font-bold bg-gray-50/50 focus:bg-white focus:border-teal-500 transition-all outline-none">
                                    <option value={defaultAcademicYear}>{defaultAcademicYear}</option>
                                </select>
                            )}
                        </div>
                        <div className="min-w-[120px]">
                            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5 tracking-widest pl-1">Semester</label>
                            <select value={filterSemester} onChange={e => setFilterSemester(e.target.value as any)} className="w-full border-2 border-gray-100 rounded-xl px-4 py-2 text-sm font-bold bg-gray-50/50 focus:bg-white focus:border-teal-500 transition-all outline-none">
                                <option value="Ganjil">Ganjil</option>
                                <option value="Genap">Genap</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            <MobileFilterDrawer 
                isOpen={isFilterDrawerOpen} 
                onClose={() => setIsFilterDrawerOpen(false)}
                title="Filter Monitoring"
            >
                <div className="space-y-6">
                    <div className="bg-gray-50 p-6 rounded-[2rem] border border-gray-100 space-y-4">
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5 tracking-widest ml-1">Pilih Tahun Ajaran</label>
                            {availableYears.length > 0 ? (
                                <select value={filterTahun} onChange={e => setFilterTahun(e.target.value)} className="w-full border-2 border-white rounded-2xl p-4 text-base font-black shadow-sm focus:border-teal-500 outline-none">
                                    {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                                </select>
                            ) : (
                                <select value={filterTahun} onChange={e => setFilterTahun(e.target.value)} className="w-full border-2 border-white rounded-2xl p-4 text-base font-black shadow-sm focus:border-teal-500 outline-none bg-white">
                                    <option value={defaultAcademicYear}>{defaultAcademicYear}</option>
                                </select>
                            )}
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5 tracking-widest ml-1">Pilih Semester</label>
                            <select value={filterSemester} onChange={e => setFilterSemester(e.target.value as any)} className="w-full border-2 border-white rounded-2xl p-4 text-base font-black shadow-sm focus:border-teal-500 outline-none">
                                <option value="Ganjil">Ganjil</option>
                                <option value="Genap">Genap</option>
                            </select>
                        </div>
                    </div>

                    <div className="p-6 bg-teal-600 rounded-[2rem] text-center shadow-xl shadow-teal-200">
                        <div className="text-[10px] font-black text-teal-100 uppercase tracking-[0.2em] mb-1">Status Pantauan</div>
                        <div className="text-3xl font-black text-white">{formatAcademicYearDisplay(settings, filterTahun)} - {filterSemester}</div>
                    </div>
                </div>
            </MobileFilterDrawer>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-lg border-l-4 border-blue-500 shadow-sm">
                    <div className="text-xs text-gray-500 font-bold uppercase">Total Rombel</div>
                    <div className="text-2xl font-bold text-gray-800">{summary.totalRombel}</div>
                </div>
                <div className="bg-white p-4 rounded-lg border-l-4 border-green-500 shadow-sm">
                    <div className="text-xs text-gray-500 font-bold uppercase">Data Lengkap</div>
                    <div className="text-2xl font-bold text-green-600">{summary.lengkap}</div>
                </div>
                <div className="bg-white p-4 rounded-lg border-l-4 border-yellow-500 shadow-sm">
                    <div className="text-xs text-gray-500 font-bold uppercase">Proses Input</div>
                    <div className="text-2xl font-bold text-yellow-600">{summary.sebagian}</div>
                </div>
                <div className="bg-white p-4 rounded-lg border-l-4 border-red-500 shadow-sm">
                    <div className="text-xs text-gray-500 font-bold uppercase">Belum Ada Data</div>
                    <div className="text-2xl font-bold text-red-600">{summary.kosong}</div>
                </div>
            </div>

            {/* Main Grid */}
            {isLoading ? (
                <div className="p-8 text-center text-gray-500"><i className="bi bi-arrow-repeat animate-spin text-2xl"></i><p className="mt-2">Memuat data audit...</p></div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {stats.map(rombel => {
                        let statusColor = 'bg-gray-100 border-gray-300';
                        let textColor = 'text-gray-500';
                        let progressBarColor = 'bg-gray-300';
                        let icon = 'bi-dash-circle';

                        if (rombel.status === 'Lengkap') {
                            statusColor = 'bg-green-50 border-green-200';
                            textColor = 'text-green-700';
                            progressBarColor = 'bg-green-500';
                            icon = 'bi-check-circle-fill';
                        } else if (rombel.status === 'Sebagian') {
                            statusColor = 'bg-yellow-50 border-yellow-200';
                            textColor = 'text-yellow-700';
                            progressBarColor = 'bg-yellow-500';
                            icon = 'bi-exclamation-circle-fill';
                        } else if (rombel.status === 'Kosong' && rombel.totalSantri > 0) {
                            statusColor = 'bg-red-50 border-red-200';
                            textColor = 'text-red-700';
                            progressBarColor = 'bg-red-500';
                            icon = 'bi-x-circle-fill';
                        }

                        return (
                            <div key={rombel.id} className={`border rounded-lg p-4 relative overflow-hidden transition-all hover:shadow-md ${statusColor}`}>
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <h4 className="font-bold text-gray-800 text-lg">{rombel.nama}</h4>
                                        <p className="text-xs text-gray-600">{rombel.jenjang}</p>
                                    </div>
                                    <div className={`text-xl ${textColor}`}><i className={`bi ${icon}`}></i></div>
                                </div>
                                
                                <div className="mb-3">
                                    <div className="flex justify-between text-xs mb-1 font-medium text-gray-700">
                                        <span>Progres: {rombel.submittedCount} / {rombel.totalSantri} Santri</span>
                                        <span>{rombel.percent}%</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                                        <div className={`h-2.5 rounded-full transition-all duration-1000 ${progressBarColor}`} style={{ width: `${rombel.percent}%` }}></div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between pt-3 border-t border-gray-200/50 mt-3">
                                    <div className="flex items-center gap-2">
                                        <div className="w-7 h-7 rounded-full bg-white flex items-center justify-center text-gray-500 border text-xs">
                                            <i className="bi bi-person-fill"></i>
                                        </div>
                                        <div>
                                            <p className="text-[9px] text-gray-400 uppercase font-bold">Wali Kelas</p>
                                            <p className="text-xs font-semibold text-gray-800 truncate max-w-[130px]">{rombel.wali}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <button
                                            onClick={() => setSelectedAuditRombel(rombel)}
                                            className="px-2 py-1 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 text-[11px] font-bold rounded-lg shadow-2xs transition-all"
                                            title="Audit Kelengkapan Santri"
                                        >
                                            <i className="bi bi-list-check mr-1"></i>Audit
                                        </button>
                                        {onNavigateToTab && (
                                            <button
                                                onClick={() => onNavigateToTab('leger', rombel.id)}
                                                className="px-2 py-1 bg-teal-600 hover:bg-teal-700 text-white text-[11px] font-bold rounded-lg shadow-2xs transition-all"
                                                title="Buka Leger Nilai"
                                            >
                                                <i className="bi bi-table mr-1"></i>Leger
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {rombel.lastUpdate && (
                                    <div className="mt-2 text-[9px] text-gray-400 text-right">
                                        Update: {rombel.lastUpdate.toLocaleDateString()}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
            
            {!isLoading && stats.length === 0 && (
                <div className="p-8 text-center bg-gray-50 border rounded-lg text-gray-500">
                    Belum ada data rombel yang dikonfigurasi. Silakan atur di Data Master.
                </div>
            )}

            {/* Audit Kelengkapan Modal */}
            {selectedAuditRombel && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
                    <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95 max-h-[85vh] flex flex-col">
                        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                            <div>
                                <h3 className="text-base font-bold text-slate-900">
                                    Audit Kelengkapan Rapor: {selectedAuditRombel.nama}
                                </h3>
                                <p className="text-xs text-slate-500">
                                    {selectedAuditRombel.jenjang} • Wali Kelas: {selectedAuditRombel.wali} • {filterTahun || defaultAcademicYear} ({filterSemester})
                                </p>
                            </div>
                            <button
                                onClick={() => setSelectedAuditRombel(null)}
                                className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center"
                            >
                                <i className="bi bi-x-lg"></i>
                            </button>
                        </div>

                        <div className="py-3 px-1 flex-1 overflow-y-auto">
                            {isAuditLoading ? (
                                <div className="p-12 text-center text-slate-500">
                                    <div className="w-7 h-7 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                                    <p className="mt-2 text-xs font-semibold">Memeriksa data santri...</p>
                                </div>
                            ) : auditStudents.length === 0 ? (
                                <div className="p-8 text-center text-slate-400 text-xs">
                                    Tidak ada santri aktif di rombel ini.
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between px-3 py-1.5 bg-slate-50 rounded-lg text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                        <span>Santri ({auditStudents.length})</span>
                                        <span>Status Nilai</span>
                                    </div>
                                    {auditStudents.map((item, idx) => (
                                        <div
                                            key={item.santri.id}
                                            className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors"
                                        >
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-semibold text-slate-400 w-5">{idx + 1}.</span>
                                                    <span className="text-xs font-bold text-slate-800">{item.santri.namaLengkap}</span>
                                                </div>
                                                <div className="text-[10px] text-slate-400 pl-7 font-mono">
                                                    NIS: {item.santri.nis || '-'}
                                                </div>
                                            </div>

                                            <div>
                                                {item.isSubmitted && item.filledCount > 0 ? (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                        <i className="bi bi-check-circle-fill"></i>
                                                        <span>Terisi ({item.filledCount} field)</span>
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                                        <i className="bi bi-x-circle-fill"></i>
                                                        <span>Belum Ada Data</span>
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                            <button
                                onClick={() => setSelectedAuditRombel(null)}
                                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                            >
                                Tutup
                            </button>
                            <div className="flex items-center gap-2">
                                {onNavigateToTab && (
                                    <>
                                        <button
                                            onClick={() => {
                                                const rId = selectedAuditRombel.id;
                                                setSelectedAuditRombel(null);
                                                onNavigateToTab('input_wali', rId);
                                            }}
                                            className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
                                        >
                                            <i className="bi bi-pencil-square mr-1.5"></i>Input Nilai
                                        </button>
                                        <button
                                            onClick={() => {
                                                const rId = selectedAuditRombel.id;
                                                setSelectedAuditRombel(null);
                                                onNavigateToTab('leger', rId);
                                            }}
                                            className="px-4 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-xs transition-all"
                                        >
                                            <i className="bi bi-table mr-1.5"></i>Buka Leger Nilai
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
