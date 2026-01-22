
import React, { useState, useMemo, useEffect } from 'react';
import { useLiveQuery } from "dexie-react-hooks";
import { useForm } from 'react-hook-form';
import { db } from '../db';
import { useAppContext } from '../AppContext';
import { useSantriContext } from '../contexts/SantriContext';
import { BkSession, Santri } from '../types';

interface BkModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: Omit<BkSession, 'id'>) => Promise<void>;
    onUpdate: (data: BkSession) => Promise<void>;
    initialData: BkSession | null;
}

const BkModal: React.FC<BkModalProps> = ({ isOpen, onClose, onSave, onUpdate, initialData }) => {
    const { santriList } = useSantriContext();
    const { currentUser } = useAppContext();
    const { register, handleSubmit, reset, watch, setValue } = useForm<BkSession>();
    
    // State for searching santri
    const [searchSantri, setSearchSantri] = useState('');
    const [selectedSantriId, setSelectedSantriId] = useState<number | null>(null);

    const filteredSantri = useMemo(() => {
        if (!searchSantri) return [];
        return santriList
            .filter(s => s.status === 'Aktif' && s.namaLengkap.toLowerCase().includes(searchSantri.toLowerCase()))
            .slice(0, 5);
    }, [santriList, searchSantri]);

    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                // Ensure default values are merged for legacy data that might miss new fields
                reset({
                    ...initialData,
                    status: initialData.status || 'Baru',
                    privasi: initialData.privasi || 'Rahasia',
                    konselor: initialData.konselor || currentUser?.fullName || '',
                    kategori: initialData.kategori || 'Lainnya'
                });
                setSelectedSantriId(initialData.santriId);
                const s = santriList.find(s => s.id === initialData.santriId);
                setSearchSantri(s ? s.namaLengkap : '');
            } else {
                reset({
                    tanggal: new Date().toISOString().split('T')[0],
                    kategori: 'Pribadi',
                    status: 'Baru',
                    privasi: 'Rahasia',
                    konselor: currentUser?.fullName || '',
                    keluhan: '',
                    penanganan: '',
                    hasil: ''
                });
                setSelectedSantriId(null);
                setSearchSantri('');
            }
        }
    }, [isOpen, initialData, reset, currentUser, santriList]);

    const onSubmit = async (data: BkSession) => {
        if (!selectedSantriId) {
            alert("Pilih santri terlebih dahulu.");
            return;
        }
        
        const finalData = { ...data, santriId: selectedSantriId };
        
        if (initialData?.id) {
            await onUpdate({ ...finalData, id: initialData.id });
        } else {
            await onSave(finalData);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-[70] flex justify-center items-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                <div className="p-5 border-b bg-indigo-50 rounded-t-lg flex justify-between items-center">
                    <h3 className="text-lg font-bold text-indigo-800 flex items-center gap-2">
                        <i className="bi bi-person-heart"></i> {initialData ? 'Edit Sesi Konseling' : 'Catat Sesi Baru'}
                    </h3>
                    <button onClick={onClose}><i className="bi bi-x-lg text-gray-500 hover:text-gray-700"></i></button>
                </div>
                
                <form onSubmit={handleSubmit(onSubmit)} className="p-6 overflow-y-auto flex-grow space-y-4">
                    {/* Santri Selection */}
                    <div className="relative">
                        <label className="block text-xs font-bold text-gray-600 mb-1">Nama Santri</label>
                        <input 
                            type="text" 
                            value={searchSantri}
                            onChange={e => { setSearchSantri(e.target.value); setSelectedSantriId(null); }}
                            className={`w-full border rounded-lg p-2.5 text-sm ${selectedSantriId ? 'bg-green-50 border-green-500' : ''}`}
                            placeholder="Ketik nama santri..."
                            autoComplete="off"
                        />
                        {selectedSantriId && <i className="bi bi-check-circle-fill text-green-600 absolute right-3 top-8"></i>}
                        {searchSantri && !selectedSantriId && filteredSantri.length > 0 && (
                            <div className="absolute z-10 w-full bg-white border shadow-lg rounded-lg mt-1 max-h-40 overflow-y-auto">
                                {filteredSantri.map(s => (
                                    <div key={s.id} onClick={() => { setSelectedSantriId(s.id); setSearchSantri(s.namaLengkap); }} className="p-2 hover:bg-indigo-50 cursor-pointer text-sm border-b last:border-0">
                                        <div className="font-bold text-gray-800">{s.namaLengkap}</div>
                                        <div className="text-xs text-gray-500">{s.nis}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-600 mb-1">Tanggal</label>
                            <input type="date" {...register('tanggal')} className="w-full border rounded-lg p-2 text-sm" />
                        </div>
                        <div>
                             <label className="block text-xs font-bold text-gray-600 mb-1">Kategori Masalah</label>
                             <select {...register('kategori')} className="w-full border rounded-lg p-2 text-sm">
                                 <option value="Pribadi">Masalah Pribadi</option>
                                 <option value="Sosial">Masalah Sosial/Teman</option>
                                 <option value="Belajar">Kesulitan Belajar</option>
                                 <option value="Keluarga">Masalah Keluarga</option>
                                 <option value="Ibadah">Ibadah/Spiritual</option>
                                 <option value="Karir">Karir/Masa Depan</option>
                                 <option value="Lainnya">Lainnya</option>
                             </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">Keluhan / Permasalahan</label>
                        <textarea {...register('keluhan', { required: true })} rows={3} className="w-full border rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500" placeholder="Ceritakan detail masalah..."></textarea>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">Penanganan / Nasihat</label>
                        <textarea {...register('penanganan')} rows={3} className="w-full border rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500" placeholder="Langkah yang diambil..."></textarea>
                    </div>
                    
                    <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">Hasil / Tindak Lanjut</label>
                        <input type="text" {...register('hasil')} className="w-full border rounded-lg p-2.5 text-sm" placeholder="Hasil sementara atau rencana selanjutnya..." />
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-2 border-t mt-2">
                        <div>
                            <label className="block text-xs font-bold text-gray-600 mb-1">Status Kasus</label>
                            <select {...register('status')} className="w-full border rounded-lg p-2 text-sm bg-gray-50">
                                <option value="Baru">Baru</option>
                                <option value="Proses">Sedang Diproses</option>
                                <option value="Pemantauan">Dalam Pemantauan</option>
                                <option value="Selesai">Selesai / Closed</option>
                            </select>
                        </div>
                        <div>
                             <label className="block text-xs font-bold text-gray-600 mb-1">Tingkat Privasi</label>
                             <select {...register('privasi')} className="w-full border rounded-lg p-2 text-sm bg-gray-50 text-red-600 font-medium">
                                 <option value="Biasa">Biasa (Internal BK)</option>
                                 <option value="Rahasia">Rahasia</option>
                                 <option value="Sangat Rahasia">Sangat Rahasia</option>
                             </select>
                        </div>
                    </div>
                     <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">Konselor</label>
                        <input type="text" {...register('konselor')} className="w-full border rounded-lg p-2.5 text-sm bg-gray-100" readOnly />
                    </div>
                </form>

                <div className="p-4 border-t bg-gray-50 flex justify-end gap-2 rounded-b-lg">
                    <button onClick={onClose} className="px-4 py-2 border rounded-lg text-gray-600 hover:bg-gray-200 text-sm">Batal</button>
                    <button onClick={handleSubmit(onSubmit)} className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium shadow-sm">Simpan Catatan</button>
                </div>
            </div>
        </div>
    );
};

// --- MAIN PAGE ---

const BK: React.FC = () => {
    const { currentUser, showToast, showConfirmation } = useAppContext();
    const { santriList } = useSantriContext();
    
    // Permission Check
    const canWrite = currentUser?.role === 'admin' || currentUser?.permissions?.bk === 'write';

    const sessions = useLiveQuery(() => db.bkSessions.filter(s => !s.deleted).reverse().sortBy('tanggal'), []) || [];
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSession, setEditingSession] = useState<BkSession | null>(null);
    const [expandedRow, setExpandedRow] = useState<number | null>(null);

    const filteredSessions = useMemo(() => {
        return sessions.filter(s => {
            const santri = santriList.find(sa => sa.id === s.santriId);
            const nameMatch = santri?.namaLengkap.toLowerCase().includes(searchTerm.toLowerCase()) || false;
            const statusMatch = !filterStatus || s.status === filterStatus;
            return nameMatch && statusMatch;
        });
    }, [sessions, santriList, searchTerm, filterStatus]);

    const handleSave = async (data: Omit<BkSession, 'id'>) => {
        if (!canWrite) return;
        await db.bkSessions.add({ ...data, lastModified: Date.now() } as BkSession);
        setIsModalOpen(false);
        showToast('Sesi BK berhasil dicatat.', 'success');
    };

    const handleUpdate = async (data: BkSession) => {
        if (!canWrite) return;
        await db.bkSessions.put({ ...data, lastModified: Date.now() });
        setIsModalOpen(false);
        showToast('Catatan diperbarui.', 'success');
    };

    const handleDelete = (id: number) => {
        if (!canWrite) return;
        showConfirmation('Hapus Catatan?', 'Data ini bersifat rahasia dan akan dihapus permanen.', async () => {
             const item = await db.bkSessions.get(id);
             if (item) {
                 await db.bkSessions.put({ ...item, deleted: true, lastModified: Date.now() });
                 showToast('Data dihapus.', 'success');
             }
        }, { confirmColor: 'red' });
    };

    const stats = useMemo(() => {
        const total = sessions.length;
        const active = sessions.filter(s => s.status !== 'Selesai').length;
        const monitoring = sessions.filter(s => s.status === 'Pemantauan').length;
        return { total, active, monitoring };
    }, [sessions]);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-end mb-2">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
                        <i className="bi bi-person-heart text-indigo-600"></i> Bimbingan & Konseling
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Catatan pembinaan mental dan konseling santri (Rahasia).</p>
                </div>
                {canWrite && (
                    <button onClick={() => { setEditingSession(null); setIsModalOpen(true); }} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-indigo-700 shadow-sm flex items-center gap-2">
                        <i className="bi bi-plus-lg"></i> Catat Sesi Baru
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-xl shadow-sm border border-indigo-100 flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold text-indigo-500 uppercase">Total Sesi</p>
                        <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
                    </div>
                    <div className="text-indigo-200 text-4xl"><i className="bi bi-journal-text"></i></div>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-yellow-100 flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold text-yellow-600 uppercase">Kasus Aktif</p>
                        <p className="text-2xl font-bold text-gray-800">{stats.active}</p>
                    </div>
                    <div className="text-yellow-200 text-4xl"><i className="bi bi-hourglass-split"></i></div>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-blue-100 flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold text-blue-500 uppercase">Dalam Pemantauan</p>
                        <p className="text-2xl font-bold text-gray-800">{stats.monitoring}</p>
                    </div>
                    <div className="text-blue-200 text-4xl"><i className="bi bi-eye"></i></div>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
                <div className="p-4 border-b bg-gray-50 flex flex-col sm:flex-row gap-4">
                    <input 
                        type="text" 
                        placeholder="Cari nama santri..." 
                        value={searchTerm} 
                        onChange={e => setSearchTerm(e.target.value)} 
                        className="flex-grow border rounded-lg p-2 text-sm focus:ring-indigo-500" 
                    />
                    <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="border rounded-lg p-2 text-sm w-48">
                        <option value="">Semua Status</option>
                        <option value="Baru">Baru</option>
                        <option value="Proses">Proses</option>
                        <option value="Pemantauan">Pemantauan</option>
                        <option value="Selesai">Selesai</option>
                    </select>
                </div>
                
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-100 text-gray-600 border-b">
                            <tr>
                                <th className="p-3 w-10"></th>
                                <th className="p-3">Tanggal</th>
                                <th className="p-3">Santri</th>
                                <th className="p-3">Kategori</th>
                                <th className="p-3">Status</th>
                                <th className="p-3">Konselor</th>
                                <th className="p-3 text-center w-20">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {filteredSessions.map(s => {
                                const santri = santriList.find(sa => sa.id === s.santriId);
                                const isExpanded = expandedRow === s.id;
                                
                                return (
                                    <React.Fragment key={s.id}>
                                        <tr className={`hover:bg-indigo-50 cursor-pointer ${isExpanded ? 'bg-indigo-50' : ''}`} onClick={() => setExpandedRow(isExpanded ? null : s.id)}>
                                            <td className="p-3 text-center text-gray-400">
                                                <i className={`bi bi-chevron-${isExpanded ? 'down' : 'right'}`}></i>
                                            </td>
                                            <td className="p-3 whitespace-nowrap text-gray-600">{new Date(s.tanggal).toLocaleDateString('id-ID')}</td>
                                            <td className="p-3 font-medium text-gray-800">
                                                {santri ? santri.namaLengkap : 'Unknown'}
                                            </td>
                                            <td className="p-3">
                                                <span className="bg-gray-200 text-gray-700 px-2 py-1 rounded text-xs">{s.kategori}</span>
                                            </td>
                                            <td className="p-3">
                                                <span className={`px-2 py-1 rounded text-xs font-bold ${
                                                    s.status === 'Selesai' ? 'bg-green-100 text-green-700' :
                                                    s.status === 'Pemantauan' ? 'bg-blue-100 text-blue-700' :
                                                    s.status === 'Proses' ? 'bg-yellow-100 text-yellow-800' :
                                                    'bg-red-100 text-red-700'
                                                }`}>
                                                    {s.status}
                                                </span>
                                            </td>
                                            <td className="p-3 text-gray-600 text-xs">{s.konselor}</td>
                                            <td className="p-3 text-center">
                                                {canWrite && (
                                                    <div className="flex justify-center gap-2">
                                                        <button onClick={(e) => { e.stopPropagation(); setEditingSession(s); setIsModalOpen(true); }} className="text-blue-600 hover:bg-blue-100 p-1.5 rounded"><i className="bi bi-pencil-square"></i></button>
                                                        <button onClick={(e) => { e.stopPropagation(); handleDelete(s.id); }} className="text-red-600 hover:bg-red-100 p-1.5 rounded"><i className="bi bi-trash"></i></button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                        {isExpanded && (
                                            <tr className="bg-indigo-50/50">
                                                <td colSpan={7} className="p-4 pl-12 border-b border-indigo-100">
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                                                        <div>
                                                            <h4 className="text-xs font-bold text-gray-500 uppercase mb-1">Keluhan / Masalah</h4>
                                                            <div className="bg-white p-3 rounded border border-gray-200 text-gray-800 min-h-[60px] whitespace-pre-wrap">{s.keluhan}</div>
                                                        </div>
                                                        <div>
                                                            <h4 className="text-xs font-bold text-gray-500 uppercase mb-1">Penanganan / Solusi</h4>
                                                            <div className="bg-white p-3 rounded border border-gray-200 text-gray-800 min-h-[60px] whitespace-pre-wrap">{s.penanganan || '-'}</div>
                                                        </div>
                                                    </div>
                                                    <div className="mt-3 flex justify-between items-center text-xs text-gray-500">
                                                        <span><strong>Hasil:</strong> {s.hasil || '-'}</span>
                                                        <span className="flex items-center gap-1">
                                                            {s.privasi === 'Sangat Rahasia' ? <i className="bi bi-shield-lock-fill text-red-500"></i> : <i className="bi bi-lock text-gray-400"></i>} 
                                                            Privasi: <strong>{s.privasi}</strong>
                                                        </span>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                );
                            })}
                            {filteredSessions.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="p-8 text-center text-gray-500">Tidak ada data sesi BK yang ditemukan.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            
            <BkModal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
                onSave={handleSave} 
                onUpdate={handleUpdate} 
                initialData={editingSession} 
            />
        </div>
    );
};

export default BK;
