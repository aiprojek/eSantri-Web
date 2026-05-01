
import React, { useState, useMemo, useEffect } from 'react';
import { useLiveQuery } from "dexie-react-hooks";
import { useForm } from 'react-hook-form';
import { db } from '../db';
import { useAppContext } from '../AppContext';
import { useSantriContext } from '../contexts/SantriContext';
import { BukuTamu as BukuTamuType } from '../types';
import { PageHeader } from './common/PageHeader';
import { SectionCard } from './common/SectionCard';
import { EmptyState } from './common/EmptyState';
import { HeaderTabs } from './common/HeaderTabs';

interface BukuTamuModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: Omit<BukuTamuType, 'id'>) => Promise<void>;
}

const BukuTamuModal: React.FC<BukuTamuModalProps> = ({ isOpen, onClose, onSave }) => {
    const { santriList } = useSantriContext();
    const { currentUser, showAlert } = useAppContext();
    const { register, handleSubmit, reset, watch, setValue } = useForm<BukuTamuType>();
    
    const [searchSantri, setSearchSantri] = useState('');
    const [selectedSantriId, setSelectedSantriId] = useState<number | null>(null);
    const watchKategori = watch('kategori', 'Wali Santri');

    useEffect(() => {
        if (watchKategori !== 'Wali Santri') {
            setSelectedSantriId(null);
            setSearchSantri('');
        }
    }, [watchKategori]);

    const filteredSantri = useMemo(() => {
        if (!searchSantri) return [];
        return santriList
            .filter(
                (s) =>
                    s.status === 'Aktif' &&
                    (s.namaLengkap.toLowerCase().includes(searchSantri.toLowerCase()) || s.nis.includes(searchSantri))
            )
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

    const onSubmit = async (data: BukuTamuType) => {
        if (watchKategori === 'Wali Santri' && !selectedSantriId) {
            showAlert('Santri Belum Dipilih', 'Untuk kategori Wali Santri, pilih dulu santri yang dikunjungi.');
            return;
        }

        const now = new Date();
        const finalData = {
            ...data,
            santriId: watchKategori === 'Wali Santri' ? selectedSantriId || undefined : undefined,
            tanggal: now.toISOString().split('T')[0],
            jamMasuk: now.toISOString(),
            status: 'Bertamu',
            petugas: currentUser?.fullName || 'Petugas'
        } as BukuTamuType; // Cast to bypass optional fields

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

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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

    const todayGuestCount = useMemo(() => {
        const today = new Date().toISOString().split('T')[0];
        return records.filter((r) => r.tanggal === today).length;
    }, [records]);

    const historyGuests = useMemo(() => {
        return records.filter(r => r.status === 'Selesai' && 
            (r.namaTamu.toLowerCase().includes(searchTerm.toLowerCase()) || 
             r.platNomor?.toLowerCase().includes(searchTerm.toLowerCase()))
        ).sort((a,b) => new Date(b.jamMasuk).getTime() - new Date(a.jamMasuk).getTime()).slice(0, 50);
    }, [records, searchTerm]);

    const canWrite = currentUser?.role === 'admin' || currentUser?.permissions?.bukutamu === 'write';

    const handleAddGuest = async (data: Omit<BukuTamuType, 'id'>) => {
        if (!canWrite) return;
        await db.bukuTamu.add({ ...data, lastModified: Date.now() } as BukuTamuType);
        showToast('Tamu berhasil check-in', 'success');
    };

    const handleCheckOut = (guest: BukuTamuType) => {
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
            <PageHeader
                eyebrow="Administrasi"
                title="Buku Tamu & Keamanan"
                description="Pantau kunjungan tamu aktif dan riwayat keluar-masuk untuk mendukung keamanan pondok."
                actions={canWrite ? (
                    <button onClick={() => setIsModalOpen(true)} className="app-button-primary px-6 py-3 text-sm">
                        <i className="bi bi-person-plus-fill"></i> Check-In Baru
                    </button>
                ) : undefined}
                tabs={
                    <HeaderTabs
                        value={activeTab}
                        onChange={setActiveTab}
                        tabs={[
                            { value: 'active', label: 'Tamu Aktif (Di Dalam)', mobileLabel: 'Tamu Aktif', badge: <span className="rounded-full bg-white/20 px-1.5 py-0.5 text-[10px] font-bold text-current">{activeGuests.length}</span> },
                            { value: 'history', label: 'Riwayat Kunjungan' },
                        ]}
                    />
                }
            />

            {/* SOP Security Widget */}
            <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded-r-lg shadow-sm">
                <h4 className="text-sm font-bold text-yellow-800 mb-1"><i className="bi bi-exclamation-circle-fill"></i> SOP Keamanan</h4>
                <ul className="text-xs text-yellow-700 list-disc pl-4 space-y-0.5">
                    <li>Setiap tamu wajib meninggalkan identitas (KTP/SIM) di pos keamanan.</li>
                    <li>Pastikan tamu mengenakan kartu identitas tamu selama di lingkungan pondok.</li>
                    <li>Periksa barang bawaan tamu jika mencurigakan.</li>
                </ul>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-xl border border-teal-100 bg-teal-50 px-4 py-3">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-teal-700">Tamu Aktif</div>
                    <div className="text-2xl font-black text-teal-900">{activeGuests.length}</div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-600">Kunjungan Hari Ini</div>
                    <div className="text-2xl font-black text-slate-800">{todayGuestCount}</div>
                </div>
                <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-blue-700">Riwayat Tersimpan</div>
                    <div className="text-2xl font-black text-blue-900">{records.length}</div>
                </div>
            </div>

            <SectionCard title="Aktivitas Tamu" description="Buka daftar tamu aktif atau riwayat kunjungan dari satu panel yang lebih konsisten." contentClassName="p-6">
                <div>
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
                                <div className="col-span-full"><EmptyState icon="bi-building-check" title="Tidak ada tamu aktif" description="Belum ada tamu yang sedang berada di lingkungan pondok saat ini." /></div>
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
                                    className="app-input w-full p-2.5 text-sm"
                                />
                            </div>
                            <div className="hidden md:block app-table-shell overflow-x-auto">
                                <table className="app-table text-sm text-left">
                                    <thead className="text-xs uppercase">
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
                                        {historyGuests.length === 0 && <tr><td colSpan={7} className="p-4"><EmptyState icon="bi-clock-history" title="Belum ada riwayat tamu" description="Riwayat check-in dan check-out akan tampil di sini." /></td></tr>}
                                    </tbody>
                                </table>
                            </div>
                            <div className="space-y-3 md:hidden">
                                {historyGuests.map((g) => (
                                    <article key={g.id} className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 shadow-sm">
                                        <div className="mb-2 flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <p className="text-xs font-semibold text-slate-500">{new Date(g.tanggal).toLocaleDateString('id-ID')}</p>
                                                <h4 className="truncate text-sm font-bold text-slate-800">{g.namaTamu}</h4>
                                            </div>
                                            <span className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-bold text-slate-700">{g.kategori}</span>
                                        </div>
                                        <p className="text-xs text-slate-600">{g.keperluan} {g.santriId ? '(Wali Santri)' : ''}</p>
                                        {g.platNomor && (
                                            <p className="mt-1 text-xs font-mono text-slate-500">{g.platNomor}</p>
                                        )}
                                        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                                            <div className="rounded-lg border border-green-200 bg-green-50 px-2 py-1.5 text-green-700">
                                                Masuk: {new Date(g.jamMasuk).toLocaleTimeString('id-ID', {hour:'2-digit', minute:'2-digit'})}
                                            </div>
                                            <div className="rounded-lg border border-red-200 bg-red-50 px-2 py-1.5 text-red-700">
                                                Keluar: {g.jamKeluar ? new Date(g.jamKeluar).toLocaleTimeString('id-ID', {hour:'2-digit', minute:'2-digit'}) : '-'}
                                            </div>
                                        </div>
                                        <p className="mt-2 text-[11px] text-slate-500">Petugas: {g.petugas}</p>
                                    </article>
                                ))}
                                {historyGuests.length === 0 && (
                                    <EmptyState icon="bi-clock-history" title="Belum ada riwayat tamu" description="Riwayat check-in dan check-out akan tampil di sini." />
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </SectionCard>

            <BukuTamuModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleAddGuest} />
        </div>
    );
};

export default BukuTamu;
