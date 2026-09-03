import React, { useState, useEffect, useMemo } from 'react';
import { useAppContext } from '../../../AppContext';
import { useSantriContext } from '../../../contexts/SantriContext';
import { JurnalMengajarRecord } from '../../../types';
import { db } from '../../../db';
import { useLiveQuery } from 'dexie-react-hooks';

interface JurnalMengajarModalProps {
    isOpen: boolean;
    onClose: () => void;
    rombelId?: number;
    tanggal?: string; // YYYY-MM-DD
}

export const JurnalMengajarModal: React.FC<JurnalMengajarModalProps> = ({ 
    isOpen, 
    onClose, 
    rombelId: propRombelId, 
    tanggal: propTanggal 
}) => {
    const { settings, showToast, currentUser, showConfirmation } = useAppContext();
    const { jurnalMengajarList, onSaveJurnalMengajar, onDeleteJurnalMengajar } = useSantriContext();
    
    const canWrite = currentUser?.role === 'admin' || currentUser?.permissions?.akademik === 'write' || currentUser?.permissions?.absensi === 'write';

    // Rombel and Tanggal selection state
    const [selectedRombelId, setSelectedRombelId] = useState<number>(propRombelId || (settings.rombel[0]?.id ?? 0));
    const [selectedTanggal, setSelectedTanggal] = useState<string>(propTanggal || new Date().toISOString().split('T')[0]);

    // Form state
    const [guruId, setGuruId] = useState<number>(0);
    const [mataPelajaranId, setMataPelajaranId] = useState<number>(0);
    const [jamPelajaranIds, setJamPelajaranIds] = useState<number[]>([]);
    const [sesiEkstra, setSesiEkstra] = useState<{ kegiatan: string; materi: string; waktuMulai: string; waktuSelesai: string }[]>([]);
    const [kompetensiMateri, setKompetensiMateri] = useState('');
    const [catatanKejadian, setCatatanKejadian] = useState('');

    // Update active rombel/tanggal when props change
    useEffect(() => {
        if (isOpen) {
            if (propRombelId) setSelectedRombelId(propRombelId);
            else if (!selectedRombelId && settings.rombel.length > 0) setSelectedRombelId(settings.rombel[0].id);
            
            if (propTanggal) setSelectedTanggal(propTanggal);
            else if (!selectedTanggal) setSelectedTanggal(new Date().toISOString().split('T')[0]);

            setGuruId(0);
            setMataPelajaranId(0);
            setJamPelajaranIds([]);
            setSesiEkstra([]);
            setKompetensiMateri('');
            setCatatanKejadian('');
        }
    }, [isOpen, propRombelId, propTanggal, settings.rombel]);

    const recordsToday = useMemo(() => {
        return jurnalMengajarList
            .filter(j => j.rombelId === selectedRombelId && j.tanggal === selectedTanggal)
            .sort((a,b) => (a.jamPelajaranIds?.[0] || 0) - (b.jamPelajaranIds?.[0] || 0));
    }, [jurnalMengajarList, selectedRombelId, selectedTanggal]);

    const jadwalList = useLiveQuery(() => db.jadwalPelajaran.toArray(), []) || [];

    const rombel = useMemo(() => settings.rombel.find(r => r.id === selectedRombelId), [settings.rombel, selectedRombelId]);
    const kelas = useMemo(() => rombel ? settings.kelas.find(k => k.id === rombel.kelasId) : undefined, [settings.kelas, rombel]);
    const jenjangId = kelas?.jenjangId;

    const filteredMapel = useMemo(() => {
        if (!jenjangId) return settings.mataPelajaran;
        return settings.mataPelajaran.filter(m => m.jenjangId === jenjangId);
    }, [settings.mataPelajaran, jenjangId]);

    const jamPilihan = useMemo(() => {
        if (!jenjangId) return [1, 2, 3, 4, 5, 6, 7, 8];
        const jamConfig = (settings.jamPelajaran || []).filter(j => j.jenjangId === jenjangId && j.jenis === 'KBM');
        const maxFromConfig = jamConfig.length ? Math.max(...jamConfig.map(j => j.urutan || j.id || 0)) : 0;
        const maxFromJadwal = jadwalList
            .filter(j => j.rombelId === selectedRombelId)
            .reduce((max, j) => Math.max(max, j.jamKe || 0), 0);
        const totalJam = Math.max(maxFromConfig, maxFromJadwal, 1);
        return Array.from({ length: totalJam }, (_, i) => i + 1);
    }, [settings.jamPelajaran, jadwalList, jenjangId, selectedRombelId]);

    useEffect(() => {
        if (!mataPelajaranId) return;
        if (!filteredMapel.some(m => m.id === mataPelajaranId)) {
            setMataPelajaranId(0);
        }
    }, [filteredMapel, mataPelajaranId]);
    
    // Mapping helpers
    const getGuruName = (id: number) => settings.tenagaPengajar.find(t => t.id === id)?.nama || 'Unknown';
    const getMapelName = (id?: number) => id ? (settings.mataPelajaran.find(m => m.id === id)?.nama || 'Unknown') : 'Kegiatan Non-Mapel';

    const handleToggleJam = (jam: number) => {
        setJamPelajaranIds(prev => 
            prev.includes(jam) ? prev.filter(j => j !== jam) : [...prev, jam].sort((a,b)=>a-b)
        );
    };

    const handleAddSesiEkstra = () => {
        setSesiEkstra(prev => [...prev, { kegiatan: '', materi: '', waktuMulai: '', waktuSelesai: '' }]);
    };

    const handleUpdateSesiEkstra = (index: number, field: 'kegiatan' | 'materi' | 'waktuMulai' | 'waktuSelesai', value: string) => {
        setSesiEkstra(prev => prev.map((item, idx) => (idx === index ? { ...item, [field]: value } : item)));
    };

    const handleRemoveSesiEkstra = (index: number) => {
        setSesiEkstra(prev => prev.filter((_, idx) => idx !== index));
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if(!canWrite) return;
        
        if(!selectedRombelId) return showToast('Pilih rombel kelas terlebih dahulu', 'error');
        if(!selectedTanggal) return showToast('Pilih tanggal pembelajaran', 'error');
        if(!guruId) return showToast('Pilih guru pengajar', 'error');

        const validSesiEkstra = sesiEkstra
            .filter(s => s.kegiatan.trim() || s.materi.trim() || (s.waktuMulai && s.waktuSelesai))
            .map(s => ({ kegiatan: s.kegiatan.trim(), materi: s.materi.trim(), waktuMulai: s.waktuMulai, waktuSelesai: s.waktuSelesai }));
        
        if(!mataPelajaranId && validSesiEkstra.length === 0) {
            return showToast('Pilih mapel atau isi minimal 1 sesi ekstra', 'error');
        }
        if(!kompetensiMateri.trim()) return showToast('Isi materi / kompetensi dasar', 'error');
        
        const tipeEntri: 'kbm' | 'ekstra' | 'campuran' =
            mataPelajaranId && validSesiEkstra.length > 0 ? 'campuran' : mataPelajaranId ? 'kbm' : 'ekstra';

        const record: JurnalMengajarRecord = {
            id: Date.now() + Math.random(),
            tanggal: selectedTanggal,
            rombelId: selectedRombelId,
            guruId,
            mataPelajaranId: mataPelajaranId || undefined,
            tipeEntri,
            jamPelajaranIds,
            sesiEkstra: validSesiEkstra,
            kompetensiMateri,
            catatanKejadian,
            recordedBy: currentUser?.username || 'Staff'
        };

        try {
            await onSaveJurnalMengajar(record);
            showToast('Jurnal mengajar berhasil ditambahkan', 'success');
            // reset form partial
            setMataPelajaranId(0);
            setJamPelajaranIds([]);
            setSesiEkstra([]);
            setKompetensiMateri('');
            setCatatanKejadian('');
        } catch (error) {
            showToast('Gagal menyimpan jurnal', 'error');
        }
    };

    const handleDelete = async (id: number) => {
        if(!canWrite) return;
        showConfirmation(
            'Hapus Entri Jurnal?',
            'Entri jurnal ini akan dihapus permanen.',
            async () => {
                try {
                    await onDeleteJurnalMengajar(id);
                    showToast('Entri dihapus', 'info');
                } catch(e) {
                    showToast('Gagal menghapus entri', 'error');
                }
            },
            { confirmText: 'Hapus', confirmColor: 'red' }
        );
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm animate-fade-in" onClick={onClose}>
            <div className="bg-white w-full max-w-xl h-full shadow-2xl flex flex-col animate-slide-in-right" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b bg-teal-600 text-white shrink-0">
                    <div>
                        <h2 className="text-xl font-bold flex items-center gap-2"><i className="bi bi-journal-text"></i> Jurnal Mengajar</h2>
                        <p className="text-teal-100 text-sm mt-1">
                            {rombel?.nama || 'Pilih Rombel'} • {selectedTanggal ? new Date(selectedTanggal).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'}) : ''}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full transition-colors text-white">
                        <i className="bi bi-x-lg text-xl"></i>
                    </button>
                </div>

                <div className="flex-grow overflow-y-auto p-6 bg-gray-50 custom-scrollbar space-y-6">
                    
                    {/* Header Selectors for Target Rombel & Tanggal */}
                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Target Rombel</label>
                            <select 
                                value={selectedRombelId} 
                                onChange={e => setSelectedRombelId(Number(e.target.value))}
                                className="w-full text-sm font-semibold p-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                            >
                                <option value={0}>-- Pilih Rombel --</option>
                                {settings.rombel.map(r => {
                                    const k = settings.kelas.find(kl => kl.id === r.kelasId);
                                    const j = settings.jenjang.find(jn => jn.id === k?.jenjangId);
                                    return (
                                        <option key={r.id} value={r.id}>
                                            {r.nama} ({k?.nama || '-'} • {j?.nama || '-'})
                                        </option>
                                    );
                                })}
                            </select>
                        </div>
                        <div>
                            <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Tanggal KBM</label>
                            <input 
                                type="date" 
                                value={selectedTanggal} 
                                onChange={e => setSelectedTanggal(e.target.value)}
                                className="w-full text-sm font-semibold p-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                            />
                        </div>
                    </div>

                    {/* Daftar Jurnal Masuk Hari Ini */}
                    {recordsToday.length > 0 && (
                        <div className="space-y-3">
                            <h3 className="font-bold text-gray-700 text-sm uppercase tracking-wider mb-2">Jurnal Masuk ({recordsToday.length})</h3>
                            {recordsToday.map(r => (
                                <div key={r.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm relative group overflow-hidden">
                                     <div className="absolute top-0 left-0 w-1 h-full bg-teal-500"></div>
                                     <div className="flex justify-between items-start">
                                         <div>
                                            <div className="flex flex-wrap items-center gap-2 mb-1">
                                                <span className="font-bold text-gray-800">{getMapelName(r.mataPelajaranId)}</span>
                                                <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${r.tipeEntri === 'ekstra' ? 'bg-purple-50 text-purple-700 border-purple-200' : r.tipeEntri === 'campuran' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-teal-50 text-teal-700 border-teal-200'}`}>
                                                    {(r.tipeEntri || 'kbm').toUpperCase()}
                                                </span>
                                                {r.jamPelajaranIds && r.jamPelajaranIds.length > 0 && (
                                                    <span className="text-xs bg-indigo-50 text-indigo-700 font-medium px-2 py-0.5 rounded border border-indigo-100 shrink-0">Jam ke-{r.jamPelajaranIds.join(', ')}</span>
                                                )}
                                            </div>
                                            <p className="text-xs text-gray-600 font-medium flex items-center gap-1.5 mb-3"><i className="bi bi-person-fill text-gray-400"></i> {getGuruName(r.guruId)}</p>
                                            
                                            <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-100 mb-2">
                                                <p className="text-xs font-bold text-gray-500 uppercase mb-1">Materi / KD:</p>
                                                <p className="text-sm text-gray-800 break-words">{r.kompetensiMateri}</p>
                                            </div>
                                            
                                            {r.catatanKejadian && (
                                                 <div className="bg-yellow-50/50 p-2.5 rounded-lg border border-yellow-100">
                                                     <p className="text-[10px] font-bold text-yellow-700 uppercase mb-0.5">Catatan Kelas:</p>
                                                     <p className="text-xs text-yellow-900 break-words">{r.catatanKejadian}</p>
                                                 </div>
                                            )}
                                            {r.sesiEkstra && r.sesiEkstra.length > 0 && (
                                                <div className="mt-2 bg-indigo-50/60 p-2.5 rounded-lg border border-indigo-100">
                                                    <p className="text-[10px] font-bold text-indigo-700 uppercase mb-1">Sesi Ekstra</p>
                                                    <div className="space-y-1">
                                                        {r.sesiEkstra.map((s, idx) => (
                                                            <p key={`${r.id}-extra-${idx}`} className="text-xs text-indigo-900">
                                                                {s.kegiatan || 'Kegiatan Ekstra'} ({s.waktuMulai || '--:--'} - {s.waktuSelesai || '--:--'})
                                                                {s.materi ? ` • Materi: ${s.materi}` : ''}
                                                            </p>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                         </div>
                                         {canWrite && (
                                            <button onClick={() => handleDelete(r.id)} className="text-red-400 hover:text-red-600 p-1.5 opacity-0 group-hover:opacity-100 transition-opacity rounded-md hover:bg-red-50 bg-white" title="Hapus Entri">
                                                <i className="bi bi-trash"></i>
                                            </button>
                                         )}
                                     </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Form Input Baru */}
                    {canWrite && (
                        <div className="bg-white p-5 rounded-xl border border-teal-200 shadow-sm relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-teal-50 rounded-bl-full -z-0"></div>
                            
                            <h3 className="font-bold text-teal-800 text-sm uppercase tracking-wider mb-4 relative z-10 flex items-center gap-2">
                                <i className="bi bi-plus-circle-fill"></i> Tambah Entri Jurnal
                            </h3>
                            
                            <form onSubmit={handleSave} className="space-y-4 relative z-10">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1.5">Guru Pengajar <span className="text-red-500">*</span></label>
                                    <select required value={guruId} onChange={e => setGuruId(Number(e.target.value))} className="w-full text-sm p-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none">
                                        <option value={0}>-- Pilih Guru --</option>
                                        {settings.tenagaPengajar.map(t => <option key={t.id} value={t.id}>{t.nama}</option>)}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1.5">Mata Pelajaran (Opsional jika hanya sesi ekstra)</label>
                                    <select value={mataPelajaranId} onChange={e => setMataPelajaranId(Number(e.target.value))} className="w-full text-sm p-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none">
                                        <option value={0}>-- Tidak memilih mapel (khusus ekstra/non-mapel) --</option>
                                        {filteredMapel.map(m => <option key={m.id} value={m.id}>{m.nama}</option>)}
                                    </select>
                                </div>
                                
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1.5">Jam Pelajaran Ke / Sesi</label>
                                    <div className="flex flex-wrap gap-2">
                                        {jamPilihan.map(jam => (
                                            <button 
                                                key={jam} type="button" 
                                                onClick={() => handleToggleJam(jam)}
                                                className={`w-10 h-10 rounded-lg text-sm font-bold border transition-all ${jamPelajaranIds.includes(jam) ? 'bg-indigo-600 text-white border-indigo-700 shadow-sm' : 'bg-white text-gray-600 hover:bg-indigo-50 border-gray-200'}`}
                                            >
                                                {jam}
                                            </button>
                                        ))}
                                    </div>
                                    <p className="text-[10px] text-gray-500 mt-1.5">
                                        Jam mengikuti konfigurasi jadwal marhalah/rombel. Bisa pilih lebih dari satu jika jam dobel.
                                    </p>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1.5">Kompetensi Dasar / Materi yang Disampaikan <span className="text-red-500">*</span></label>
                                    <textarea required rows={3} value={kompetensiMateri} onChange={e => setKompetensiMateri(e.target.value)} placeholder="Misal: Bab 1 - Thoharoh (Halaman 5-10)..." className="w-full text-sm p-3 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none resize-none"></textarea>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <label className="block text-xs font-bold text-gray-700">Sesi Ekstra (Opsional)</label>
                                        <button type="button" onClick={handleAddSesiEkstra} className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg px-2.5 py-1.5 hover:bg-indigo-100">
                                            <i className="bi bi-plus-circle mr-1"></i>Tambah Ekstra
                                        </button>
                                    </div>
                                    {sesiEkstra.length > 0 && sesiEkstra.map((sesi, idx) => (
                                        <div key={`extra-${idx}`} className="rounded-lg border border-indigo-100 bg-indigo-50/40 p-3">
                                            <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                                                <input
                                                    type="text"
                                                    value={sesi.kegiatan}
                                                    onChange={e => handleUpdateSesiEkstra(idx, 'kegiatan', e.target.value)}
                                                    placeholder="Kegiatan / Mapel Ekstra"
                                                    className="text-sm p-2.5 bg-white border border-gray-300 rounded-lg"
                                                />
                                                <input
                                                    type="text"
                                                    value={sesi.materi}
                                                    onChange={e => handleUpdateSesiEkstra(idx, 'materi', e.target.value)}
                                                    placeholder="Materi yang disampaikan"
                                                    className="text-sm p-2.5 bg-white border border-gray-300 rounded-lg"
                                                />
                                                <input
                                                    type="time"
                                                    value={sesi.waktuMulai}
                                                    onChange={e => handleUpdateSesiEkstra(idx, 'waktuMulai', e.target.value)}
                                                    className="text-sm p-2.5 bg-white border border-gray-300 rounded-lg"
                                                />
                                                <div className="flex gap-2">
                                                    <input
                                                        type="time"
                                                        value={sesi.waktuSelesai}
                                                        onChange={e => handleUpdateSesiEkstra(idx, 'waktuSelesai', e.target.value)}
                                                        className="flex-1 text-sm p-2.5 bg-white border border-gray-300 rounded-lg"
                                                    />
                                                    <button type="button" onClick={() => handleRemoveSesiEkstra(idx)} className="px-2.5 py-2 text-red-600 hover:bg-red-50 rounded border border-red-200">
                                                        <i className="bi bi-trash"></i>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1.5">Catatan Kejadian di Kelas (Opsional)</label>
                                    <textarea rows={2} value={catatanKejadian} onChange={e => setCatatanKejadian(e.target.value)} placeholder="Misal: Siswa sebagian besar belum hafal, 2 orang tidur..." className="w-full text-sm p-3 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 outline-none resize-none"></textarea>
                                </div>

                                <button type="submit" disabled={!guruId || !kompetensiMateri.trim() || (!mataPelajaranId && sesiEkstra.length === 0)} className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-3 rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed">
                                    Simpan Jurnal
                                </button>
                            </form>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
