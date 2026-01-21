
import React, { useState, useMemo } from 'react';
import { useLiveQuery } from "dexie-react-hooks";
import { useForm } from 'react-hook-form';
import { db } from '../db';
import { useAppContext } from '../AppContext';
import { useSantriContext } from '../contexts/SantriContext';
import { BukuTamu } from '../types';

interface BukuTamuModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: Omit<BukuTamu, 'id'>) => Promise<void>;
}

const BukuTamuModal: React.FC<BukuTamuModalProps> = ({ isOpen, onClose, onSave }) => {
    const { santriList } = useSantriContext();
    const { currentUser } = useAppContext();
    const { register, handleSubmit, reset, watch, setValue } = useForm<BukuTamu>();
    
    const [searchSantri, setSearchSantri] = useState('');
    const [selectedSantriId, setSelectedSantriId] = useState<number | null>(null);
    const watchKategori = watch('kategori', 'Wali Santri');

    const filteredSantri = useMemo(() => {
        if (!searchSantri) return [];
        return santriList
            .filter(s => s.status === 'Aktif' && s.namaLengkap.toLowerCase().includes(searchSantri.toLowerCase()))
            .slice(0, 5);
    }, [santriList, searchSantri]);

    const handleSelectSantri = (s: any) => {
        setSelectedSantriId(s.id);
        setSearchSantri(s.namaLengkap);
        
        // Auto fill if empty
        const currentName = watch('namaTamu');
        if (!currentName) {
            const parentName = s.namaWali || s.namaAyah || s.namaIbu;
            if (parentName) setValue('namaTamu', parentName);
        }
        const currentPhone = watch('noHp');
        if (!currentPhone) {
            const parentPhone = s.teleponWali || s.teleponAyah || s.teleponIbu;
            if (parentPhone) setValue('noHp', parentPhone);
        }
    };

    const onSubmit = async (data: BukuTamu) => {
        const now = new Date();
        const finalData = {
            ...data,
            santriId: watchKategori === 'Wali Santri' ? selectedSantriId || undefined : undefined,
            tanggal: now.toISOString().split('T')[0],
            jamMasuk: now.toISOString(),
            status: 'Bertamu',
            petugas: currentUser?.fullName || 'Petugas'
        } as BukuTamu; // Cast to bypass optional fields

        await onSave(finalData);
        reset();
        setSelectedSantriId(null);
        setSearchSantri('');
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-[70] flex justify-center items-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
                <div className="p-5 border-b bg-teal-50 rounded-t-lg flex justify-between items-center">
                    <h3 className="text-lg font-bold text-teal-800"><i className="bi bi-person-rolodex mr-2"></i> Check-In Tamu</h3>
                    <button onClick={onClose}><i className="bi bi-x-lg text-gray-500"></i></button>
                </div>
                <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
                    <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">Kategori Tamu</label>
                        <select {...register('kategori')} className="w-full border rounded-lg p-2.5 text-sm bg-gray-50 focus:ring-teal-500">
                            <option value="Wali Santri">Wali Santri</option>
                            <option value="Tamu Dinas">Tamu Dinas</option>
                            <option value="Vendor/Paket">Vendor / Paket</option>
                            <option value="Alumni">Alumni</option>
                            <option value="Lainnya">Lainnya</option>
                        </select>
                    </div>

                    {watchKategori === 'Wali Santri' && (
                        <div className="relative">
                            <label className="block text-xs font-bold text-gray-600 mb-1">Cari Santri (yang dikunjungi)</label>
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
                                        <div key={s.id} onClick={() => handleSelectSantri(s)} className="p-2 hover:bg-teal-50 cursor-pointer text-sm border-b last:border-0">
                                            <div className="font-bold text-gray-800">{s.namaLengkap}</div>
                                            <div className="text-xs text-gray-500">{s.nis} - {s.namaWali}</div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-600 mb-1">Nama Tamu</label>
                            <input type="text" {...register('namaTamu', { required: true })} className="w-full border rounded-lg p-2.5 text-sm" placeholder="Nama Lengkap" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-600 mb-1">No. HP</label>
                            <input type="tel" {...register('noHp')} className="w-full border rounded-lg p-2.5 text-sm" placeholder="08..." />
                        </div>
                    </div>

                    {watchKategori !== 'Wali Santri' && (
                        <div>
                            <label className="block text-xs font-bold text-gray-600 mb-1">Bertemu Dengan</label>
                            <input type="text" {...register('bertemuDengan')} className="w-full border rounded-lg p-2.5 text-sm" placeholder="Nama Ustadz / Staff / Bagian" />
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">Keperluan</label>
                        <textarea {...register('keperluan', { required: true })} rows={2} className="w-full border rounded-lg p-2.5 text-sm" placeholder="Jenguk, Antar Paket, Rapat..."></textarea>
                    </div>

                    <div className="p-3 bg-gray-100 rounded-lg border border-gray-200">
                        <label className="block text-xs font-bold text-gray-600 mb-2"><i className="bi bi-car-front-fill mr-1"></i> Data Kendaraan (Opsional)</label>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <select {...register('kendaraan')} className="w-full border rounded p-2 text-sm">
                                    <option value="">- Jenis -</option>
                                    <option value="Motor">Motor</option>
                                    <option value="Mobil">Mobil</option>
                                    <option value="Truk/Box">Truk/Box</option>
                                    <option value="Jalan Kaki">Jalan Kaki</option>
                                </select>
                            </div>
                            <div>
                                <input type="text" {...register('platNomor')} className="w-full border rounded p-2 text-sm uppercase font-mono" placeholder="Plat Nomor" />
                            </div>
                        </div>
                    </div>

                    <button type="submit" className="w-full bg-teal-600 text-white font-bold py-3 rounded-lg shadow-md hover:bg-teal-700 transition-colors">
                        Check-In Tamu
                    </button>
                </form>
            </div>
        </div>
    );
};

const BukuTamu: React.FC = () => {
    const { currentUser, showToast, showConfirmation } = useAppContext();
    const { santriList } = useSantriContext();
    const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const records = useLiveQuery(() => db.bukuTamu.toArray(), []) || [];

    const activeGuests = useMemo(() => {
        return records.filter(r => r.status === 'Bertamu').sort((a,b) => new Date(b.jamMasuk).getTime() - new Date(a.jamMasuk).getTime());
    }, [records]);

    const historyGuests = useMemo(() => {
        return records.filter(r => r.status === 'Selesai' && 
            (r.namaTamu.toLowerCase().includes(searchTerm.toLowerCase()) || 
             r.platNomor?.toLowerCase().includes(searchTerm.toLowerCase()))
        ).sort((a,b) => new Date(b.jamMasuk).getTime() - new Date(a.jamMasuk).getTime()).slice(0, 50);
    }, [records, searchTerm]);

    const canWrite = currentUser?.role === 'admin' || currentUser?.permissions?.bukutamu === 'write';

    const handleAddGuest = async (data: Omit<BukuTamu, 'id'>) => {
        if (!canWrite) return;
        await db.bukuTamu.add({ ...data, lastModified: Date.now() } as BukuTamu);
        showToast('Tamu berhasil check-in', 'success');
    };

    const handleCheckOut = (guest: BukuTamu) => {
        if (!canWrite) return;
        showConfirmation(
            'Check-Out Tamu?',
            `Konfirmasi kepulangan tamu: ${guest.namaTamu}?`,
            async () => {
                await db.bukuTamu.update(guest.id, {
                    status: 'Selesai',
                    jamKeluar: new Date().toISOString(),
                    lastModified: Date.now()
                });
                showToast('Tamu berhasil check-out', 'success');
            },
            { confirmColor: 'blue', confirmText: 'Ya, Check-Out' }
        );
    };

    const getDuration = (startStr: string) => {
        const start = new Date(startStr);
        const now = new Date();
        const diffMs = now.getTime() - start.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const hours = Math.floor(diffMins / 60);
        const mins = diffMins % 60;
        return `${hours}j ${mins}m`;
    };

    const getSantriName = (id?: number) => {
        if (!id) return '';
        const s = santriList.find(sa => sa.id === id);
        return s ? `(Wali: ${s.namaLengkap})` : '';
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
                        <i className="bi bi-shield-check text-teal-600"></i> Buku Tamu & Keamanan
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Catat lalu lintas tamu dan wali santri untuk keamanan pondok.</p>
                </div>
                {canWrite && (
                    <button onClick={() => setIsModalOpen(true)} className="bg-teal-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-teal-700 shadow-lg flex items-center gap-2 transition-transform hover:-translate-y-1">
                        <i className="bi bi-person-plus-fill text-xl"></i> Check-In Baru
                    </button>
                )}
            </div>

            {/* SOP Security Widget */}
            <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded-r-lg shadow-sm">
                <h4 className="text-sm font-bold text-yellow-800 mb-1"><i className="bi bi-exclamation-circle-fill"></i> SOP Keamanan</h4>
                <ul className="text-xs text-yellow-700 list-disc pl-4 space-y-0.5">
                    <li>Setiap tamu wajib meninggalkan identitas (KTP/SIM) di pos keamanan.</li>
                    <li>Pastikan tamu mengenakan kartu identitas tamu selama di lingkungan pondok.</li>
                    <li>Periksa barang bawaan tamu jika mencurigakan.</li>
                </ul>
            </div>

            {/* Tabs */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="flex border-b">
                    <button 
                        onClick={() => setActiveTab('active')} 
                        className={`flex-1 py-4 text-center font-bold text-sm border-b-2 transition-colors ${activeTab === 'active' ? 'border-teal-600 text-teal-700 bg-teal-50' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full mr-2">{activeGuests.length}</span>
                        Tamu Aktif (Di Dalam)
                    </button>
                    <button 
                        onClick={() => setActiveTab('history')} 
                        className={`flex-1 py-4 text-center font-bold text-sm border-b-2 transition-colors ${activeTab === 'history' ? 'border-teal-600 text-teal-700 bg-teal-50' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        Riwayat Kunjungan
                    </button>
                </div>

                <div className="p-6">
                    {activeTab === 'active' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {activeGuests.map(guest => (
                                <div key={guest.id} className="bg-white border rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 bg-green-100 text-green-800 text-[10px] font-bold px-2 py-1 rounded-bl-lg">
                                        MASUK: {new Date(guest.jamMasuk).toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'})}
                                    </div>
                                    
                                    <div className="flex items-start gap-3 mt-2">
                                        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-xl text-gray-500 border">
                                            <i className="bi bi-person-fill"></i>
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-gray-800 text-lg leading-tight">{guest.namaTamu}</h4>
                                            <p className="text-xs text-teal-600 font-medium uppercase tracking-wide mt-0.5">{guest.kategori}</p>
                                        </div>
                                    </div>

                                    <div className="mt-3 space-y-2 text-sm text-gray-600 bg-gray-50 p-2 rounded-lg border border-gray-100">
                                        <div className="flex gap-2">
                                            <i className="bi bi-info-circle text-gray-400"></i>
                                            <span className="leading-tight">{guest.keperluan} {guest.santriId && <span className="font-semibold text-gray-800 block">{getSantriName(guest.santriId)}</span>} {guest.bertemuDengan && <span className="font-semibold block">Bertemu: {guest.bertemuDengan}</span>}</span>
                                        </div>
                                        {guest.platNomor && (
                                            <div className="flex gap-2 items-center">
                                                <i className="bi bi-car-front text-gray-400"></i>
                                                <span className="font-mono bg-white border px-1 rounded text-xs font-bold text-gray-800">{guest.platNomor}</span>
                                                <span className="text-xs text-gray-400">({guest.kendaraan})</span>
                                            </div>
                                        )}
                                        <div className="flex gap-2 items-center text-xs text-gray-500 pt-1 border-t border-gray-200">
                                            <i className="bi bi-clock-history"></i> Durasi: {getDuration(guest.jamMasuk)}
                                        </div>
                                    </div>

                                    {canWrite && (
                                        <button 
                                            onClick={() => handleCheckOut(guest)}
                                            className="w-full mt-3 bg-red-50 text-red-600 border border-red-200 py-2 rounded-lg font-bold text-sm hover:bg-red-600 hover:text-white transition-colors flex items-center justify-center gap-2"
                                        >
                                            <i className="bi bi-box-arrow-right"></i> Check-Out (Pulang)
                                        </button>
                                    )}
                                </div>
                            ))}
                            {activeGuests.length === 0 && (
                                <div className="col-span-full text-center py-12 text-gray-400 border-2 border-dashed rounded-xl bg-gray-50">
                                    <i className="bi bi-building-check text-4xl mb-2 opacity-50 block"></i>
                                    Tidak ada tamu aktif saat ini.
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'history' && (
                        <div>
                            <div className="mb-4">
                                <input 
                                    type="text" 
                                    placeholder="Cari Riwayat Nama / Plat Nomor..." 
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                    className="w-full border rounded-lg p-2.5 text-sm"
                                />
                            </div>
                            <div className="overflow-x-auto border rounded-lg">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-gray-100 text-gray-600 uppercase text-xs">
                                        <tr>
                                            <th className="px-4 py-3">Tanggal</th>
                                            <th className="px-4 py-3">Nama Tamu</th>
                                            <th className="px-4 py-3">Kategori</th>
                                            <th className="px-4 py-3">Keperluan</th>
                                            <th className="px-4 py-3">Masuk</th>
                                            <th className="px-4 py-3">Keluar</th>
                                            <th className="px-4 py-3">Petugas</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {historyGuests.map(g => (
                                            <tr key={g.id} className="hover:bg-gray-50">
                                                <td className="px-4 py-2 whitespace-nowrap text-gray-500">{new Date(g.tanggal).toLocaleDateString('id-ID')}</td>
                                                <td className="px-4 py-2 font-medium">
                                                    {g.namaTamu}
                                                    {g.platNomor && <div className="text-[10px] font-mono text-gray-500">{g.platNomor}</div>}
                                                </td>
                                                <td className="px-4 py-2"><span className="bg-gray-100 px-2 py-0.5 rounded text-xs border">{g.kategori}</span></td>
                                                <td className="px-4 py-2 text-gray-600 max-w-xs truncate" title={g.keperluan}>{g.keperluan} {g.santriId ? '(Wali Santri)' : ''}</td>
                                                <td className="px-4 py-2 text-green-700 font-mono text-xs">{new Date(g.jamMasuk).toLocaleTimeString('id-ID', {hour:'2-digit', minute:'2-digit'})}</td>
                                                <td className="px-4 py-2 text-red-700 font-mono text-xs">{g.jamKeluar ? new Date(g.jamKeluar).toLocaleTimeString('id-ID', {hour:'2-digit', minute:'2-digit'}) : '-'}</td>
                                                <td className="px-4 py-2 text-xs text-gray-500">{g.petugas}</td>
                                            </tr>
                                        ))}
                                        {historyGuests.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-gray-400">Belum ada riwayat.</td></tr>}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <BukuTamuModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleAddGuest} />
        </div>
    );
};

export default BukuTamu;
