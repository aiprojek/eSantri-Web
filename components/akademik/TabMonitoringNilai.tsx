
import React, { useState, useEffect, useMemo } from 'react';
import { useAppContext } from '../../AppContext';
import { db } from '../../db';

export const TabMonitoringNilai: React.FC = () => {
    const { settings, santriList } = useAppContext();
    
    // Default Filter State
    const [filterTahun, setFilterTahun] = useState('2024/2025');
    const [filterSemester, setFilterSemester] = useState<'Ganjil' | 'Genap'>('Ganjil');
    const [availableYears, setAvailableYears] = useState<string[]>([]);
    
    // Stats State
    const [stats, setStats] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // Fetch Years on Mount
    useEffect(() => {
        const fetchYears = async () => {
            const all = await db.raporRecords.toArray();
            const uniqueYears: string[] = Array.from(new Set(all.map(r => r.tahunAjaran))).sort().reverse() as string[];
            setAvailableYears(uniqueYears);
            if (uniqueYears.length > 0 && !uniqueYears.includes(filterTahun)) {
                setFilterTahun(uniqueYears[0]);
            }
        };
        fetchYears();
    }, []);

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
            <div className="flex flex-col md:flex-row justify-between items-center bg-white p-4 rounded-lg border shadow-sm gap-4">
                <div>
                    <h2 className="text-lg font-bold text-gray-800">Monitoring Pengumpulan Nilai</h2>
                    <p className="text-xs text-gray-500">Pantau progres pengisian rapor oleh wali kelas/guru.</p>
                </div>
                <div className="flex gap-3">
                    <div>
                        <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase">Tahun Ajaran</label>
                        {availableYears.length > 0 ? (
                            <select value={filterTahun} onChange={e => setFilterTahun(e.target.value)} className="border rounded p-2 text-sm bg-gray-50 font-medium">
                                {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                        ) : <input type="text" value={filterTahun} onChange={e => setFilterTahun(e.target.value)} className="border rounded p-2 text-sm w-32" />}
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase">Semester</label>
                        <select value={filterSemester} onChange={e => setFilterSemester(e.target.value as any)} className="border rounded p-2 text-sm bg-gray-50 font-medium">
                            <option value="Ganjil">Ganjil</option><option value="Genap">Genap</option>
                        </select>
                    </div>
                </div>
            </div>

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

                                <div className="flex items-center gap-2 pt-2 border-t border-gray-200/50 mt-2">
                                    <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-gray-500 border text-xs">
                                        <i className="bi bi-person-fill"></i>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-gray-500 uppercase font-bold">Wali Kelas</p>
                                        <p className="text-xs font-semibold text-gray-800 truncate max-w-[150px]">{rombel.wali}</p>
                                    </div>
                                </div>

                                {rombel.lastUpdate && (
                                    <div className="absolute bottom-2 right-3 text-[9px] text-gray-400">
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
        </div>
    );
};
