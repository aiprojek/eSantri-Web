
import React, { useState, useMemo } from 'react';
import { useAppContext } from '../../AppContext';
import { useSantriContext } from '../../contexts/SantriContext';
import { JurnalMengajarRecord } from '../../types';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { MobileFilterDrawer } from '../common/MobileFilterDrawer';

export const TabJurnalMengajar: React.FC = () => {
    const { settings, showConfirmation, showToast, currentUser } = useAppContext();
    const { jurnalMengajarList, onDeleteJurnalMengajar } = useSantriContext();
    
    const [filterDate, setFilterDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [filterRombelId, setFilterRombelId] = useState<number>(0);
    const [filterGuruId, setFilterGuruId] = useState<number>(0);
    const [searchTerm, setSearchTerm] = useState('');
    const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);

    const canDelete = currentUser?.role === 'admin' || currentUser?.permissions?.akademik === 'write';

    const filteredJournals = useMemo(() => {
        return jurnalMengajarList.filter(j => {
            const matchDate = filterDate ? j.tanggal === filterDate : true;
            const matchRombel = filterRombelId ? j.rombelId === filterRombelId : true;
            const matchGuru = filterGuruId ? j.guruId === filterGuruId : true;
            const matchSearch = searchTerm ? 
                j.kompetensiMateri.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (j.catatanKejadian?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
                : true;
            return matchDate && matchRombel && matchGuru && matchSearch;
        }).sort((a, b) => b.tanggal.localeCompare(a.tanggal) || (a.jamPelajaranIds?.[0] ?? 0) - (b.jamPelajaranIds?.[0] ?? 0));
    }, [jurnalMengajarList, filterDate, filterRombelId, filterGuruId, searchTerm]);

    const handleDelete = (record: JurnalMengajarRecord) => {
        if (!canDelete) return;
        showConfirmation(
            'Hapus Jurnal Mengajar',
            'Apakah Anda yakin ingin menghapus catatan jurnal mengajar ini?',
            async () => {
                try {
                    await onDeleteJurnalMengajar(record.id);
                    showToast('Jurnal mengajar berhasil dihapus.', 'success');
                } catch (error) {
                    showToast('Gagal menghapus jurnal mengajar.', 'error');
                }
            }
        );
    };

    const getGuruName = (id: number) => settings.tenagaPengajar.find(t => t.id === id)?.nama ?? 'Tidak Diketahui';
    const getMapelName = (id: number) => settings.mataPelajaran.find(m => m.id === id)?.nama ?? 'Tidak Diketahui';
    const getRombelName = (id: number) => settings.rombel.find(r => r.id === id)?.nama ?? 'Tidak Diketahui';

    return (
        <div className="animate-fade-in space-y-6">
            <div className="bg-teal-50 border border-teal-100 p-4 rounded-xl flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h2 className="text-xl font-bold text-teal-800 flex items-center gap-2">
                        <i className="bi bi-journal-text"></i> Monitoring Jurnal Mengajar
                    </h2>
                    <p className="text-sm text-teal-600">Lihat dan awasi kegiatan belajar mengajar harian.</p>
                </div>
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                {/* Mobile Filter Trigger */}
                <div className="md:hidden">
                    <button 
                        onClick={() => setIsFilterDrawerOpen(true)}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-teal-50 text-teal-700 border border-teal-200 rounded-xl font-bold text-sm shadow-sm"
                    >
                        <i className="bi bi-funnel-fill"></i>
                        <span>Filter</span>
                    </button>
                    
                    <div className="mt-3 relative">
                        <i className="bi bi-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
                        <input 
                            type="text" 
                            placeholder="Cari materi atau kejadian..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-teal-500 focus:border-teal-500"
                        />
                    </div>
                </div>

                {/* Desktop Filter View */}
                <div className="hidden md:grid md:grid-cols-4 lg:grid-cols-5 gap-4">
                    <div className="md:col-span-1">
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5 tracking-widest pl-1">Tanggal</label>
                        <input 
                            type="date" 
                            value={filterDate} 
                            onChange={e => setFilterDate(e.target.value)}
                            className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-bold focus:bg-white focus:ring-2 focus:ring-teal-500 transition-all font-bold"
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5 tracking-widest pl-1">Rombel</label>
                        <select 
                            value={filterRombelId} 
                            onChange={e => setFilterRombelId(Number(e.target.value))}
                            className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-bold focus:bg-white focus:ring-2 focus:ring-teal-500 transition-all font-bold"
                        >
                            <option value={0}>Semua Rombel</option>
                            {settings.rombel.map(r => <option key={r.id} value={r.id}>{r.nama}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5 tracking-widest pl-1">Tenaga Pengajar</label>
                        <select 
                            value={filterGuruId} 
                            onChange={e => setFilterGuruId(Number(e.target.value))}
                            className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-bold focus:bg-white focus:ring-2 focus:ring-teal-500 transition-all font-bold"
                        >
                            <option value={0}>Semua Guru</option>
                            {settings.tenagaPengajar.map(t => <option key={t.id} value={t.id}>{t.nama}</option>)}
                        </select>
                    </div>
                    <div className="md:col-span-1 lg:col-span-2">
                        <label className="block text-[10px] font-bold text-teal-600 uppercase mb-1.5 tracking-widest pl-1">Cari Kompetensi / Materi</label>
                        <div className="relative">
                            <i className="bi bi-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
                            <input 
                                type="text" 
                                placeholder="Cari materi..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-teal-50/20 border-2 border-teal-100/50 rounded-lg text-sm font-bold focus:bg-white focus:ring-2 focus:ring-teal-500 transition-all"
                            />
                        </div>
                    </div>
                </div>
            </div>

            <MobileFilterDrawer 
                isOpen={isFilterDrawerOpen} 
                onClose={() => setIsFilterDrawerOpen(false)}
                title="Filter Jurnal Mengajar"
            >
                <div className="space-y-6">
                    <div className="bg-gray-50 p-6 rounded-[2rem] border border-gray-100">
                        <label className="block text-xs font-black text-gray-400 uppercase mb-3 tracking-widest ml-1">Pilih Tanggal</label>
                        <input 
                            type="date" 
                            value={filterDate} 
                            onChange={e => setFilterDate(e.target.value)}
                            className="w-full border-2 border-white rounded-2xl p-4 text-lg font-black bg-white shadow-xl shadow-gray-900/5 focus:border-teal-500 outline-none"
                        />
                    </div>

                    <div className="bg-gray-50 p-6 rounded-[2rem] border border-gray-100 space-y-4">
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5 tracking-widest ml-1">Pilih Rombongan Belajar</label>
                            <select 
                                value={filterRombelId} 
                                onChange={e => setFilterRombelId(Number(e.target.value))}
                                className="w-full border-2 border-white rounded-2xl p-4 text-base font-bold shadow-sm focus:border-teal-500 outline-none"
                            >
                                <option value={0}>Semua Rombel</option>
                                {settings.rombel.map(r => <option key={r.id} value={r.id}>{r.nama}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5 tracking-widest ml-1">Pilih Tenaga Pengajar</label>
                            <select 
                                value={filterGuruId} 
                                onChange={e => setFilterGuruId(Number(e.target.value))}
                                className="w-full border-2 border-white rounded-2xl p-4 text-base font-bold shadow-sm focus:border-teal-500 outline-none"
                            >
                                <option value={0}>Semua Guru</option>
                                {settings.tenagaPengajar.map(t => <option key={t.id} value={t.id}>{t.nama}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="p-6 bg-gray-900 rounded-[2rem] text-center">
                        <div className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-1">Ditemukan</div>
                        <div className="text-3xl font-black text-white">{filteredJournals.length} <span className="text-sm text-gray-400 font-bold uppercase tracking-widest ml-1">Records</span></div>
                    </div>
                </div>
            </MobileFilterDrawer>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase w-32">Waktu / Rombel</th>
                                <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase">Mata Pelajaran & Guru</th>
                                <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase">Kompetensi / Materi</th>
                                <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase">Kejadian / Catatan</th>
                                {canDelete && <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase w-16 text-center">Aksi</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredJournals.length > 0 ? filteredJournals.map(record => (
                                <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-4 py-4 align-top">
                                        <div className="text-sm font-bold text-gray-900">{format(new Date(record.tanggal), 'dd MMM yyyy', { locale: id })}</div>
                                        <div className="text-[10px] text-teal-600 font-bold uppercase mt-1">Rombel: {getRombelName(record.rombelId)}</div>
                                        <div className="flex gap-1 mt-1">
                                            {record.jamPelajaranIds?.map(jam => (
                                                <span key={jam} className="px-1.5 py-0.5 bg-gray-100 text-gray-600 text-[10px] rounded border border-gray-200">Jam {jam}</span>
                                            ))}
                                        </div>
                                    </td>
                                    <td className="px-4 py-4 align-top">
                                        <div className="text-sm font-bold text-gray-800">{getMapelName(record.mataPelajaranId)}</div>
                                        <div className="text-xs text-gray-500 mt-1 flex items-center gap-1.5">
                                            <i className="bi bi-person-circle"></i> {getGuruName(record.guruId)}
                                        </div>
                                    </td>
                                    <td className="px-4 py-4 align-top">
                                        <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{record.kompetensiMateri}</div>
                                    </td>
                                    <td className="px-4 py-4 align-top">
                                        {record.catatanKejadian ? (
                                            <div className="text-xs text-gray-600 italic bg-yellow-50 p-2 rounded border border-yellow-100">
                                                {record.catatanKejadian}
                                            </div>
                                        ) : (
                                            <span className="text-xs text-gray-400">Tidak ada catatan.</span>
                                        )}
                                    </td>
                                    {canDelete && (
                                        <td className="px-4 py-4 align-top text-center">
                                            <button 
                                                onClick={() => handleDelete(record)}
                                                className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                title="Hapus Jurnal"
                                            >
                                                <i className="bi bi-trash"></i>
                                            </button>
                                        </td>
                                    )}
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={canDelete ? 5 : 4} className="px-4 py-12 text-center text-gray-400 italic">
                                        <i className="bi bi-journal-x text-4xl mb-2 block opacity-20"></i>
                                        Tidak ada catatan jurnal mengajar ditemukan untuk filter tersebut.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            
            <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex items-start gap-4">
                <i className="bi bi-lightbulb text-blue-500 text-xl"></i>
                <div className="text-sm text-blue-700">
                    <p className="font-bold mb-1">Tips Monitoring:</p>
                    <p>Gunakan Jurnal Mengajar untuk memantau progres kurikulum secara real-time. Anda juga dapat mendiskusikan catatan kejadian khusus dengan guru terkait melalui menu Pesan atau saat evaluasi mingguan.</p>
                </div>
            </div>
        </div>
    );
};
