
import React, { useState, useMemo } from 'react';
import { useAppContext } from '../../AppContext';
import { useSantriContext } from '../../contexts/SantriContext';
import { Santri } from '../../types';
import { TahfizhDetailModal } from './TahfizhDetailModal';

export const TahfizhHistory: React.FC = () => {
    const { settings } = useAppContext();
    const { santriList, tahfizhList } = useSantriContext();
    
    // Filters
    const [search, setSearch] = useState('');
    const [jenjangId, setJenjangId] = useState<number>(0);
    const [kelasId, setKelasId] = useState<number>(0);
    const [rombelId, setRombelId] = useState<number>(0);

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

    return (
        <div className="w-full">
            {/* Filter Section */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-6 sticky top-16 z-30">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="lg:col-span-1">
                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Cari Santri</label>
                        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Nama / NIS..." className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-teal-500 focus:border-teal-500" />
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Jenjang</label>
                        <select value={jenjangId} onChange={e => { setJenjangId(Number(e.target.value)); setKelasId(0); setRombelId(0); }} className="w-full border border-gray-300 rounded-lg p-2 text-sm bg-gray-50">
                            <option value={0}>Semua Jenjang</option>
                            {settings.jenjang.map(j => <option key={j.id} value={j.id}>{j.nama}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Kelas</label>
                        <select value={kelasId} onChange={e => { setKelasId(Number(e.target.value)); setRombelId(0); }} disabled={!jenjangId} className="w-full border border-gray-300 rounded-lg p-2 text-sm bg-gray-50 disabled:bg-gray-100">
                            <option value={0}>Semua Kelas</option>
                            {availableKelas.map(k => <option key={k.id} value={k.id}>{k.nama}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Rombel</label>
                        <select value={rombelId} onChange={e => setRombelId(Number(e.target.value))} disabled={!kelasId} className="w-full border border-gray-300 rounded-lg p-2 text-sm bg-gray-50 disabled:bg-gray-100">
                            <option value={0}>Semua Rombel</option>
                            {availableRombel.map(r => <option key={r.id} value={r.id}>{r.nama}</option>)}
                        </select>
                    </div>
                </div>
            </div>

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
