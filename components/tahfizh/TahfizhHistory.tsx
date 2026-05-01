
import React, { useState, useMemo } from 'react';
import { useAppContext } from '../../AppContext';
import { useSantriContext } from '../../contexts/SantriContext';
import { Santri } from '../../types';
import { TahfizhDetailModal } from './TahfizhDetailModal';
import { MobileFilterDrawer } from '../common/MobileFilterDrawer';

export const TahfizhHistory: React.FC = () => {
    const { settings, showToast } = useAppContext();
    const { santriList, tahfizhList } = useSantriContext();
    
    // Filters
    const [search, setSearch] = useState('');
    const [jenjangId, setJenjangId] = useState<number>(0);
    const [kelasId, setKelasId] = useState<number>(0);
    const [rombelId, setRombelId] = useState<number>(0);
    const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);

    // Modal State
    const [selectedSantri, setSelectedSantri] = useState<Santri | null>(null);

    // Derived Data
    const availableKelas = useMemo(() => jenjangId ? settings.kelas.filter(k => k.jenjangId === jenjangId) : [], [jenjangId, settings.kelas]);
    const availableRombel = useMemo(() => kelasId ? settings.rombel.filter(r => r.kelasId === kelasId) : [], [kelasId, settings.rombel]);

    // Grouping Records by Santri
    const santriRecordsMap = useMemo(() => {
        const map = new Map<number, typeof tahfizhList>();
        tahfizhList.forEach(rec => {
            if (!map.has(rec.santriId)) map.set(rec.santriId, []);
            map.get(rec.santriId)?.push(rec);
        });
        return map;
    }, [tahfizhList]);

    const filteredSantri = useMemo(() => {
        return santriList.filter(s => {
            if (s.status !== 'Aktif') return false;
            
            const matchSearch = s.namaLengkap.toLowerCase().includes(search.toLowerCase()) || s.nis.includes(search);
            const matchJenjang = !jenjangId || s.jenjangId === jenjangId;
            const matchKelas = !kelasId || s.kelasId === kelasId;
            const matchRombel = !rombelId || s.rombelId === rombelId;

            return matchSearch && matchJenjang && matchKelas && matchRombel;
        }).sort((a,b) => a.namaLengkap.localeCompare(b.namaLengkap));
    }, [santriList, search, jenjangId, kelasId, rombelId]);

    const filteredSantriIds = useMemo(() => new Set(filteredSantri.map(s => s.id)), [filteredSantri]);
    const filteredRecords = useMemo(
        () => tahfizhList.filter(record => filteredSantriIds.has(record.santriId)),
        [tahfizhList, filteredSantriIds]
    );

    const getLatestRecord = (santriId: number) => {
        const records = santriRecordsMap.get(santriId);
        if (!records || records.length === 0) return null;
        // Sort by date desc
        return records.reduce((latest, current) => {
            const latestDate = new Date(latest.tanggal).getTime();
            const currentDate = new Date(current.tanggal).getTime();
            return currentDate > latestDate ? current : latest;
        });
    };

    const triggerCsvDownload = (filename: string, rows: string[][]) => {
        const csv = rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        URL.revokeObjectURL(url);
    };

    const handleExportByRombel = () => {
        if (filteredRecords.length === 0) {
            showToast('Tidak ada data untuk diekspor.', 'info');
            return;
        }
        const rows = new Map<number, { rombel: string; total: number; ziyadah: number; murojaah: number; tasmi: number }>();
        filteredRecords.forEach(record => {
            const santri = santriList.find(s => s.id === record.santriId);
            const rombelIdFromSantri = santri?.rombelId || 0;
            const rombelName = settings.rombel.find(r => r.id === rombelIdFromSantri)?.nama || 'Tanpa Rombel';
            if (!rows.has(rombelIdFromSantri)) {
                rows.set(rombelIdFromSantri, { rombel: rombelName, total: 0, ziyadah: 0, murojaah: 0, tasmi: 0 });
            }
            const entry = rows.get(rombelIdFromSantri)!;
            entry.total += 1;
            if (record.tipe === 'Ziyadah') entry.ziyadah += 1;
            if (record.tipe === 'Murojaah') entry.murojaah += 1;
            if (record.tipe === "Tasmi'") entry.tasmi += 1;
        });

        const csvRows: string[][] = [['Rombel', 'Total Setoran', 'Ziyadah', 'Murojaah', "Tasmi'"]];
        Array.from(rows.values())
            .sort((a, b) => a.rombel.localeCompare(b.rombel))
            .forEach(item => csvRows.push([item.rombel, item.total, item.ziyadah, item.murojaah, item.tasmi].map(String)));
        triggerCsvDownload(`rekap-tahfizh-per-rombel-${new Date().toISOString().slice(0, 10)}.csv`, csvRows);
        showToast('Rekap tahfizh per rombel berhasil diekspor.', 'success');
    };

    const handleExportByMuhaffizh = () => {
        if (filteredRecords.length === 0) {
            showToast('Tidak ada data untuk diekspor.', 'info');
            return;
        }
        const rows = new Map<number, { nama: string; total: number; ziyadah: number; murojaah: number; tasmi: number }>();
        filteredRecords.forEach(record => {
            const muhaffizhId = record.muhaffizhId || 0;
            const muhaffizhName = settings.tenagaPengajar.find(t => t.id === muhaffizhId)?.nama || 'Tidak Diisi';
            if (!rows.has(muhaffizhId)) {
                rows.set(muhaffizhId, { nama: muhaffizhName, total: 0, ziyadah: 0, murojaah: 0, tasmi: 0 });
            }
            const entry = rows.get(muhaffizhId)!;
            entry.total += 1;
            if (record.tipe === 'Ziyadah') entry.ziyadah += 1;
            if (record.tipe === 'Murojaah') entry.murojaah += 1;
            if (record.tipe === "Tasmi'") entry.tasmi += 1;
        });

        const csvRows: string[][] = [['Muhaffizh', 'Total Setoran', 'Ziyadah', 'Murojaah', "Tasmi'"]];
        Array.from(rows.values())
            .sort((a, b) => a.nama.localeCompare(b.nama))
            .forEach(item => csvRows.push([item.nama, item.total, item.ziyadah, item.murojaah, item.tasmi].map(String)));
        triggerCsvDownload(`rekap-tahfizh-per-muhaffizh-${new Date().toISOString().slice(0, 10)}.csv`, csvRows);
        showToast('Rekap tahfizh per muhaffizh berhasil diekspor.', 'success');
    };

    return (
        <div className="w-full">
            {/* Filter Section */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-6 sticky top-16 z-30">
                {/* Mobile Filter Trigger */}
                <div className="md:hidden flex flex-col gap-2">
                    <button 
                        onClick={() => setIsFilterDrawerOpen(true)}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-teal-50 text-teal-700 border border-teal-200 rounded-xl font-bold text-sm shadow-sm"
                    >
                        <i className="bi bi-funnel-fill"></i>
                        <span>Filter</span>
                    </button>
                    <div className="relative">
                        <i className="bi bi-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
                        <input 
                            type="text" 
                            placeholder="Cari santri..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-teal-500"
                        />
                    </div>
                </div>

                {/* Desktop Filter View */}
                <div className="hidden md:grid md:grid-cols-4 gap-4">
                    <div className="md:col-span-1">
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5 tracking-widest pl-1">Cari Santri</label>
                        <div className="relative">
                            <i className="bi bi-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
                            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Nama / NIS..." className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-bold focus:bg-white focus:ring-2 focus:ring-teal-500 transition-all" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5 tracking-widest pl-1">Jenjang</label>
                        <select value={jenjangId} onChange={e => { setJenjangId(Number(e.target.value)); setKelasId(0); setRombelId(0); }} className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-bold focus:bg-white focus:ring-2 focus:ring-teal-500 transition-all">
                            <option value={0}>Semua Jenjang</option>
                            {settings.jenjang.map(j => <option key={j.id} value={j.id}>{j.nama}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5 tracking-widest pl-1">Kelas</label>
                        <select value={kelasId} onChange={e => { setKelasId(Number(e.target.value)); setRombelId(0); }} disabled={!jenjangId} className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-bold focus:bg-white focus:ring-2 focus:ring-teal-500 transition-all disabled:bg-gray-100 disabled:text-gray-400">
                            <option value={0}>Semua Kelas</option>
                            {availableKelas.map(k => <option key={k.id} value={k.id}>{k.nama}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5 tracking-widest pl-1">Rombel</label>
                        <select value={rombelId} onChange={e => setRombelId(Number(e.target.value))} disabled={!kelasId} className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-bold focus:bg-white focus:ring-2 focus:ring-teal-500 transition-all disabled:bg-gray-100 disabled:text-gray-400">
                            <option value={0}>Semua Rombel</option>
                            {availableRombel.map(r => <option key={r.id} value={r.id}>{r.nama}</option>)}
                        </select>
                    </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                    <button
                        onClick={handleExportByRombel}
                        className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-100"
                    >
                        <i className="bi bi-filetype-csv"></i> Ekspor Rekap Rombel
                    </button>
                    <button
                        onClick={handleExportByMuhaffizh}
                        className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-100"
                    >
                        <i className="bi bi-filetype-csv"></i> Ekspor Rekap Muhaffizh
                    </button>
                </div>
            </div>

            <MobileFilterDrawer 
                isOpen={isFilterDrawerOpen} 
                onClose={() => setIsFilterDrawerOpen(false)}
                title="Filter Data Tahfizh"
            >
                <div className="space-y-6">
                    <div className="bg-gray-50 p-6 rounded-[2rem] border border-gray-100 space-y-4">
                        <div>
                            <label className="block text-xs font-black text-gray-400 uppercase mb-2 tracking-widest ml-1">Pilih Jenjang</label>
                            <select 
                                value={jenjangId} 
                                onChange={e => { setJenjangId(Number(e.target.value)); setKelasId(0); setRombelId(0); }}
                                className="w-full border-2 border-white rounded-2xl p-4 text-base font-bold shadow-sm focus:border-teal-500 outline-none"
                            >
                                <option value={0}>Semua Jenjang</option>
                                {settings.jenjang.map(j => <option key={j.id} value={j.id}>{j.nama}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-black text-gray-400 uppercase mb-2 tracking-widest ml-1">Pilih Kelas</label>
                            <select 
                                value={kelasId} 
                                onChange={e => { setKelasId(Number(e.target.value)); setRombelId(0); }}
                                disabled={!jenjangId}
                                className="w-full border-2 border-white rounded-2xl p-4 text-base font-bold shadow-sm focus:border-teal-500 outline-none disabled:opacity-50"
                            >
                                <option value={0}>Semua Kelas</option>
                                {availableKelas.map(k => <option key={k.id} value={k.id}>{k.nama}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-black text-gray-400 uppercase mb-2 tracking-widest ml-1">Pilih Rombel</label>
                            <select 
                                value={rombelId} 
                                onChange={e => setRombelId(Number(e.target.value))}
                                disabled={!kelasId}
                                className="w-full border-2 border-white rounded-2xl p-4 text-base font-bold shadow-sm focus:border-teal-500 outline-none disabled:opacity-50"
                            >
                                <option value={0}>Semua Rombel</option>
                                {availableRombel.map(r => <option key={r.id} value={r.id}>{r.nama}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="p-6 bg-gray-900 rounded-[2rem] text-center">
                        <div className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-1">Ditemukan</div>
                        <div className="text-3xl font-black text-white">{filteredSantri.length} <span className="text-sm text-gray-400 font-bold uppercase tracking-widest ml-1">Santri</span></div>
                    </div>
                </div>
            </MobileFilterDrawer>

            {/* Grid List Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 pb-20">
                {filteredSantri.map(santri => {
                    const latest = getLatestRecord(santri.id);
                    const totalSetoran = santriRecordsMap.get(santri.id)?.length || 0;
                    
                    return (
                        <div key={santri.id} onClick={() => setSelectedSantri(santri)} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-teal-300 transition-all cursor-pointer flex flex-col justify-between h-full group relative overflow-hidden">
                            {/* Accent Bar */}
                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-gray-200 group-hover:bg-teal-500 transition-colors"></div>
                            
                            <div className="flex items-start gap-4 pl-2">
                                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 font-bold text-lg shrink-0 overflow-hidden border">
                                    {santri.fotoUrl && !santri.fotoUrl.includes('text=Foto') ? (
                                        <img src={santri.fotoUrl} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        santri.namaLengkap.charAt(0)
                                    )}
                                </div>
                                
                                <div className="flex-grow min-w-0">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h4 className="font-bold text-gray-800 truncate pr-2 leading-tight">{santri.namaLengkap}</h4>
                                            <p className="text-xs text-gray-500">{settings.rombel.find(r => r.id === santri.rombelId)?.nama}</p>
                                        </div>
                                        <div className="text-center bg-gray-50 px-2 py-1 rounded-lg border">
                                            <span className="block text-sm font-bold text-teal-600 leading-none">{totalSetoran}</span>
                                            <span className="text-[8px] text-gray-400 uppercase tracking-wide">Kali</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-4 pl-2 pt-3 border-t border-gray-100">
                                {latest ? (
                                    <div>
                                        <div className="flex items-center justify-between mb-1">
                                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${latest.tipe === 'Ziyadah' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                                                {latest.tipe}
                                            </span>
                                            <span className="text-[10px] text-gray-400">
                                                {new Date(latest.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                                            </span>
                                        </div>
                                        <p className="text-sm font-medium text-gray-700 truncate">
                                            Juz {latest.juz} • QS. {latest.surah}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            Ayat {latest.ayatAwal} - {latest.ayatAkhir} <span className="mx-1">•</span> {latest.predikat}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-center h-16 text-gray-400 text-xs italic bg-gray-50 rounded-lg border border-dashed">
                                        Belum ada riwayat hafalan
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {filteredSantri.length === 0 && (
                <div className="text-center py-16 text-gray-400 bg-white rounded-xl border border-dashed">
                    <i className="bi bi-search text-4xl mb-3 block opacity-50"></i>
                    <p>Tidak ada data santri yang cocok dengan filter.</p>
                </div>
            )}

            {selectedSantri && (
                <TahfizhDetailModal 
                    isOpen={!!selectedSantri} 
                    onClose={() => setSelectedSantri(null)} 
                    santri={selectedSantri} 
                    records={santriRecordsMap.get(selectedSantri.id) || []} 
                />
            )}
        </div>
    );
};
