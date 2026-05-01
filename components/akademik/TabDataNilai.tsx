
import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../AppContext';
import { useSantriContext } from '../../contexts/SantriContext';
import { RaporRecord } from '../../types';
import { db } from '../../db';
import { MobileFilterDrawer } from '../common/MobileFilterDrawer';
import { useAcademicPeriodFilter } from '../../hooks/useAcademicPeriodFilter';
import { formatAcademicYearDisplay } from '../../utils/academicYear';

export const TabDataNilai: React.FC = () => {
    const { settings, showConfirmation, showToast, currentUser } = useAppContext();
    const { santriList } = useSantriContext();
    const canWrite = currentUser?.role === 'admin' || currentUser?.permissions?.akademik === 'write';
    const {
        filterTahun,
        setFilterTahun,
        filterSemester,
        setFilterSemester,
        availableYears,
        defaultAcademicYear
    } = useAcademicPeriodFilter(settings);

    const [filterRombel, setFilterRombel] = useState('');
    const [archiveRecords, setArchiveRecords] = useState<RaporRecord[]>([]);
    const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);

    useEffect(() => {
        const fetchRecords = async () => {
            const currentYearFilter = filterTahun || availableYears[0] || defaultAcademicYear;
            let filtered = await db.raporRecords
                .where('[tahunAjaran+semester]')
                .equals([currentYearFilter, filterSemester])
                .toArray();
            
            if (filterRombel) {
                filtered = filtered.filter(r => r.rombelId === parseInt(filterRombel));
            }
            setArchiveRecords(filtered);
        };
        fetchRecords();
    }, [filterTahun, filterSemester, filterRombel, defaultAcademicYear, availableYears]);

    const handleDeleteRecord = (id: number) => {
        showConfirmation('Hapus Data Rapor?', 'Data nilai santri ini akan dihapus dari arsip.', async () => {
            await db.raporRecords.delete(id);
            
            // Refresh data lokal
            setArchiveRecords(prev => prev.filter(p => p.id !== id));

            showToast('Data rapor dihapus.', 'success');
        }, { confirmColor: 'red' });
    }

    return (
        <div className="space-y-6">
            <div className="bg-yellow-50 p-4 border-l-4 border-yellow-500 text-yellow-800 rounded-r-lg mb-4 text-sm">
                <i className="bi bi-exclamation-circle-fill mr-2"></i>
                Halaman ini khusus untuk <strong>Manajemen Data Mentah (Arsip)</strong>. Gunakan tab <strong>"5. Cetak Rapor"</strong> untuk mencetak rapor siswa.
            </div>

            {/* Filter & Actions Bar */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4">
                {/* Mobile Filter Trigger */}
                <div className="md:hidden">
                    <button 
                        onClick={() => setIsFilterDrawerOpen(true)}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-teal-50 text-teal-700 border border-teal-200 rounded-xl font-bold text-sm shadow-sm"
                    >
                        <i className="bi bi-funnel-fill"></i>
                        <span>Filter</span>
                    </button>
                </div>

                {/* Desktop View Filter Bar */}
                <div className="hidden md:flex flex-wrap gap-4 items-end flex-grow">
                    <div className="flex-1 min-w-[140px]">
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5 tracking-widest pl-1">Tahun Ajaran</label>
                        {availableYears.length > 0 ? (
                            <select value={filterTahun} onChange={e => setFilterTahun(e.target.value)} className="w-full border rounded-lg p-2.5 text-sm font-bold bg-gray-50 focus:bg-white focus:ring-2 focus:ring-teal-500 transition-all font-bold">
                                {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                        ) : (
                            <select value={filterTahun} onChange={e => setFilterTahun(e.target.value)} className="w-full border rounded-lg p-2.5 text-sm font-bold bg-gray-50 focus:bg-white focus:ring-2 focus:ring-teal-500 transition-all font-bold">
                                <option value={defaultAcademicYear}>{defaultAcademicYear}</option>
                            </select>
                        )}
                    </div>
                    <div className="flex-1 min-w-[140px]">
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5 tracking-widest pl-1">Semester</label>
                        <select value={filterSemester} onChange={e => setFilterSemester(e.target.value as any)} className="w-full border rounded-lg p-2.5 text-sm font-bold bg-gray-50 focus:bg-white focus:ring-2 focus:ring-teal-500 transition-all font-bold">
                            <option value="Ganjil">Ganjil</option>
                            <option value="Genap">Genap</option>
                        </select>
                    </div>
                    <div className="flex-[2] min-w-[180px]">
                        <label className="block text-[10px] font-bold text-teal-600 uppercase mb-1.5 tracking-widest pl-1">Rombongan Belajar</label>
                        <select value={filterRombel} onChange={e => setFilterRombel(e.target.value)} className="w-full border-2 border-teal-100 rounded-lg p-2.5 text-sm font-black bg-teal-50 focus:bg-white focus:ring-2 focus:ring-teal-500 transition-all">
                            <option value="">Semua Rombel</option>
                            {settings.rombel.map(r => (
                                <option key={r.id} value={r.id}>{r.nama}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex items-center bg-gray-50 px-4 py-2.5 rounded-xl border border-gray-100 ml-auto whitespace-nowrap shadow-inner">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mr-2">Total:</span>
                        <span className="text-sm font-black text-gray-700">{archiveRecords.length} Data</span>
                    </div>
                </div>
            </div>

            <MobileFilterDrawer 
                isOpen={isFilterDrawerOpen} 
                onClose={() => setIsFilterDrawerOpen(false)}
                title="Filter Data Nilai"
            >
                <div className="space-y-6">
                    <div className="grid grid-cols-1 gap-4">
                        <div className="bg-gray-50 p-6 rounded-[2rem] border border-gray-100">
                           <label className="block text-xs font-black text-gray-400 uppercase mb-3 tracking-widest ml-1">Pilih Tahun Ajaran</label>
                           <div className="flex flex-wrap gap-2">
                               {availableYears.length > 0 ? availableYears.map(y => (
                                   <button 
                                       key={y}
                                       onClick={() => setFilterTahun(y)}
                                       className={`px-4 py-2 rounded-xl text-sm font-bold transition-all border ${filterTahun === y ? 'bg-teal-600 text-white border-teal-600 shadow-md' : 'bg-white text-gray-600 border-gray-200'}`}
                                   >
                                       {y}
                                   </button>
                               )) : (
                                   <button
                                       onClick={() => setFilterTahun(defaultAcademicYear)}
                                       className={`px-4 py-2 rounded-xl text-sm font-bold transition-all border ${filterTahun === defaultAcademicYear ? 'bg-teal-600 text-white border-teal-600 shadow-md' : 'bg-white text-gray-600 border-gray-200'}`}
                                   >
                                       {defaultAcademicYear}
                                   </button>
                               )}
                           </div>
                        </div>

                        <div className="bg-gray-50 p-6 rounded-[2rem] border border-gray-100">
                            <label className="block text-xs font-black text-gray-400 uppercase mb-3 tracking-widest ml-1">Semester</label>
                            <div className="flex gap-3">
                                {(['Ganjil', 'Genap'] as const).map(s => (
                                    <button 
                                        key={s}
                                        onClick={() => setFilterSemester(s)}
                                        className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all border ${filterSemester === s ? 'bg-teal-600 text-white border-teal-600 shadow-md' : 'bg-white text-gray-600 border-gray-200'}`}
                                    >
                                        {s}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="bg-teal-50/50 p-6 rounded-[2rem] border-2 border-teal-100">
                        <label className="block text-xs font-black text-teal-700 uppercase mb-3 tracking-widest ml-1">Pilih Rombongan Belajar</label>
                        <select 
                            value={filterRombel} 
                            onChange={e => setFilterRombel(e.target.value)}
                            className="w-full border-2 border-white rounded-2xl p-4 text-base font-black bg-white shadow-xl shadow-teal-900/5 focus:border-teal-500 outline-none"
                        >
                            <option value="">Semua Rombongan Belajar</option>
                            {settings.rombel.map(r => (
                                <option key={r.id} value={r.id}>{r.nama}</option>
                            ))}
                        </select>
                    </div>

                    <div className="p-6 bg-gray-900 rounded-[2rem] text-center">
                        <div className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-1">Ditemukan</div>
                        <div className="text-3xl font-black text-white">{archiveRecords.length} <span className="text-sm text-gray-400 font-bold uppercase tracking-widest ml-1">Archive</span></div>
                    </div>
                </div>
            </MobileFilterDrawer>

            {/* Data Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-gray-50 px-6 py-3 border-b border-gray-200 flex justify-between items-center">
                    <h4 className="text-xs font-black text-gray-500 uppercase tracking-widest pl-1">Arsip Nilai Rapor</h4>
                    <span className="text-[10px] font-bold text-teal-600 bg-teal-50 px-2 py-1 rounded-lg border border-teal-100">{archiveRecords.length} Santri</span>
                </div>
                <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
                    <table className="w-full text-sm text-left border-collapse min-w-[600px]">
                        <thead>
                            <tr className="bg-white text-[10px] font-black text-gray-400 uppercase border-b border-gray-100 tracking-widest">
                                <th className="p-6 text-center w-20">No</th>
                                <th className="p-6">Identitas Santri</th>
                                <th className="p-6">Rombel</th>
                                <th className="p-6 text-center">Tgl Input</th>
                                <th className="p-6 text-center">Kelola</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {archiveRecords.length > 0 ? (
                                archiveRecords.map((rec, idx) => {
                                    const santri = santriList.find(s => s.id === rec.santriId);
                                    const rombelName = settings.rombel.find(r => r.id === rec.rombelId)?.nama || '-';
                                    return (
                                        <tr key={rec.id} className="hover:bg-teal-50/30 transition-colors group">
                                            <td className="p-6 text-center font-mono text-xs text-gray-400">{idx + 1}</td>
                                            <td className="p-6">
                                                <div className="font-black text-gray-800 leading-none mb-1">{santri ? santri.namaLengkap : `Unknown`}</div>
                                                <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{santri?.nis || 'N/A'}</div>
                                            </td>
                                            <td className="p-6">
                                                <span className="text-[10px] font-black text-teal-700 bg-teal-50 px-2 py-1 rounded-lg border border-teal-100 uppercase tracking-tight">{rombelName}</span>
                                            </td>
                                            <td className="p-6 text-center text-[10px] font-bold text-gray-500">{new Date(rec.tanggalRapor).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                                            <td className="p-6 text-center">
                                                <div className="flex justify-center">
                                                    {canWrite && (
                                                        <button 
                                                            onClick={() => handleDeleteRecord(rec.id)} 
                                                            className="w-10 h-10 flex items-center justify-center text-red-400 bg-red-50 hover:bg-red-600 hover:text-white rounded-xl transition-all border border-red-100 shadow-sm active:scale-95" 
                                                            title="Hapus Data"
                                                        >
                                                            <i className="bi bi-trash-fill text-lg"></i>
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan={5} className="p-20 text-center text-gray-400 italic">
                                        <div className="flex flex-col items-center">
                                            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4 border border-dashed border-gray-200">
                                                <i className="bi bi-inbox text-3xl opacity-20 text-gray-400"></i>
                                            </div>
                                            <p className="text-sm font-bold tracking-tight">Belum ada data rapor</p>
                                            <p className="text-[10px] mt-1 uppercase tracking-widest text-gray-300">Periode {formatAcademicYearDisplay(settings, filterTahun)} ({filterSemester})</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
