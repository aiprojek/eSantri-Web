import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../../AppContext';
import { useSantriContext } from '../../../contexts/SantriContext';
import { JurnalMengajarRecord } from '../../../types';

interface JurnalMengajarModalProps {
    isOpen: boolean;
    onClose: () => void;
    rombelId: number;
    tanggal: string; // YYYY-MM-DD
}

export const JurnalMengajarModal: React.FC<JurnalMengajarModalProps> = ({ isOpen, onClose, rombelId, tanggal }) => {
    const { settings, showToast, currentUser, showConfirmation } = useAppContext();
    const { jurnalMengajarList, onSaveJurnalMengajar, onDeleteJurnalMengajar } = useSantriContext();
    
    const canWrite = currentUser?.role === 'admin' || currentUser?.permissions?.akademik === 'write';

    // Form state
    const [guruId, setGuruId] = useState<number>(0);
    const [mataPelajaranId, setMataPelajaranId] = useState<number>(0);
    const [jamPelajaranIds, setJamPelajaranIds] = useState<number[]>([]);
    const [kompetensiMateri, setKompetensiMateri] = useState('');
    const [catatanKejadian, setCatatanKejadian] = useState('');

    const recordsToday = jurnalMengajarList.filter(j => j.rombelId === rombelId && j.tanggal === tanggal).sort((a,b) => (a.jamPelajaranIds?.[0] || 0) - (b.jamPelajaranIds?.[0] || 0));

    // Reset form when modal opens
    useEffect(() => {
        if(isOpen) {
            setGuruId(0);
            setMataPelajaranId(0);
            setJamPelajaranIds([]);
            setKompetensiMateri('');
            setCatatanKejadian('');
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const rombel = settings.rombel.find(r => r.id === rombelId);
    
    // Mapping helpers
    const getGuruName = (id: number) => settings.tenagaPengajar.find(t => t.id === id)?.nama || 'Unknown';
    const getMapelName = (id: number) => settings.mataPelajaran.find(m => m.id === id)?.nama || 'Unknown';

    const handleToggleJam = (jam: number) => {
        setJamPelajaranIds(prev => 
            prev.includes(jam) ? prev.filter(j => j !== jam) : [...prev, jam].sort((a,b)=>a-b)
        );
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if(!canWrite) return;
        
        if(!guruId) return showToast('Pilih guru pengajar', 'error');
        if(!mataPelajaranId) return showToast('Pilih mata pelajaran', 'error');
        if(!kompetensiMateri.trim()) return showToast('Isi materi / kompetensi dasar', 'error');

        const record: JurnalMengajarRecord = {
            id: Date.now() + Math.random(),
            tanggal,
            rombelId,
            guruId,
            mataPelajaranId,
            jamPelajaranIds,
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

    return (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm animate-fade-in" onClick={onClose}>
            <div className="bg-white w-full max-w-xl h-full shadow-2xl flex flex-col animate-slide-in-right" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b bg-teal-600 text-white shrink-0">
                    <div>
                        <h2 className="text-xl font-bold flex items-center gap-2"><i className="bi bi-journal-text"></i> Jurnal Mengajar</h2>
                        <p className="text-teal-100 text-sm mt-1">{rombel?.nama} • {new Date(tanggal).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'})}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full transition-colors text-white">
                        <i className="bi bi-x-lg text-xl"></i>
                    </button>
                </div>

                <div className="flex-grow overflow-y-auto p-6 bg-gray-50 custom-scrollbar space-y-6">
                    
                    {/* Daftar Jurnal Hari Ini */}
                    {recordsToday.length > 0 && (
                        <div className="space-y-3">
                            <h3 className="font-bold text-gray-700 text-sm uppercase tracking-wider mb-2">Jurnal Masuk Hari Ini</h3>
                            {recordsToday.map(r => (
                                <div key={r.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm relative group overflow-hidden">
                                     <div className="absolute top-0 left-0 w-1 h-full bg-teal-500"></div>
                                     <div className="flex justify-between items-start">
                                         <div>
                                            <div className="flex flex-wrap items-center gap-2 mb-1">
                                                <span className="font-bold text-gray-800">{getMapelName(r.mataPelajaranId)}</span>
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
                                <i className="bi bi-plus-circle-fill"></i> Tambah Entri Baru
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
                                    <label className="block text-xs font-bold text-gray-700 mb-1.5">Mata Pelajaran <span className="text-red-500">*</span></label>
                                    <select required value={mataPelajaranId} onChange={e => setMataPelajaranId(Number(e.target.value))} className="w-full text-sm p-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none">
                                        <option value={0}>-- Pilih Mapel --</option>
                                        {settings.mataPelajaran.map(m => <option key={m.id} value={m.id}>{m.nama}</option>)}
                                    </select>
                                </div>
                                
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1.5">Jam Pelajaran Ke / Sesi</label>
                                    <div className="flex flex-wrap gap-2">
                                        {[1,2,3,4,5,6,7,8,9,10].map(jam => (
                                            <button 
                                                key={jam} type="button" 
                                                onClick={() => handleToggleJam(jam)}
                                                className={`w-10 h-10 rounded-lg text-sm font-bold border transition-all ${jamPelajaranIds.includes(jam) ? 'bg-indigo-600 text-white border-indigo-700 shadow-sm' : 'bg-white text-gray-600 hover:bg-indigo-50 border-gray-200'}`}
                                            >
                                                {jam}
                                            </button>
                                        ))}
                                    </div>
                                    <p className="text-[10px] text-gray-500 mt-1.5">Bisa lebih dari satu jam jika jam kosong (dobel).</p>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1.5">Kompetensi Dasar / Materi yang Disampaikan <span className="text-red-500">*</span></label>
                                    <textarea required rows={3} value={kompetensiMateri} onChange={e => setKompetensiMateri(e.target.value)} placeholder="Misal: Bab 1 - Thoharoh (Halaman 5-10)..." className="w-full text-sm p-3 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none resize-none"></textarea>
                                </div>
                                
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1.5">Catatan Kejadian di Kelas (Opsional)</label>
                                    <textarea rows={2} value={catatanKejadian} onChange={e => setCatatanKejadian(e.target.value)} placeholder="Misal: Siswa sebagian besar belum hafal, 2 orang tidur..." className="w-full text-sm p-3 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 outline-none resize-none"></textarea>
                                </div>

                                <button type="submit" disabled={!guruId || !mataPelajaranId || !kompetensiMateri.trim()} className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-3 rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed">
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
