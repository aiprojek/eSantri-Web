import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useForm } from 'react-hook-form';
import { db } from '../../db';
import { useAppContext } from '../../AppContext';
import { Supplier } from '../../types';
import { exportToExcel } from '../../utils/exportUtils';
import { generateKoperasiId } from './Shared';

export const SupplierManager: React.FC = () => {
    const { showToast, showConfirmation } = useAppContext();
    const suppliers = useLiveQuery(() => db.suppliers.filter(s => !s.deleted).toArray(), [], []);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
    const [search, setSearch] = useState('');

    const { register, handleSubmit, reset, setValue } = useForm<Supplier>();

    const filteredSuppliers = useMemo(() => {
        return suppliers.filter(s => 
            s.nama.toLowerCase().includes(search.toLowerCase()) || 
            s.kontak?.toLowerCase().includes(search.toLowerCase()) ||
            s.telepon?.includes(search)
        );
    }, [suppliers, search]);

    const openModal = (supplier: Supplier | null = null) => {
        setEditingSupplier(supplier);
        if (supplier) {
            setValue('nama', supplier.nama);
            setValue('kontak', supplier.kontak);
            setValue('telepon', supplier.telepon);
            setValue('email', supplier.email);
            setValue('alamat', supplier.alamat);
            setValue('npwp', supplier.npwp);
            setValue('status', supplier.status || 'Aktif');
            setValue('keterangan', supplier.keterangan);
        } else {
            reset({ nama: '', kontak: '', telepon: '', email: '', alamat: '', npwp: '', status: 'Aktif', keterangan: '' });
        }
        setIsModalOpen(true);
    };

    const onSubmit = async (data: Supplier) => {
        try {
            const now = Date.now();
            if (editingSupplier) {
                await db.suppliers.put({ ...editingSupplier, ...data, lastModified: now });
                showToast('Data supplier diperbarui.', 'success');
            } else {
                await db.suppliers.put({ ...data, id: generateKoperasiId(), deleted: false, lastModified: now });
                showToast('Supplier baru ditambahkan.', 'success');
            }
            setIsModalOpen(false);
        } catch (e) {
            showToast('Gagal menyimpan supplier.', 'error');
        }
    };

    const handleDelete = (supplier: Supplier) => {
        showConfirmation('Hapus Supplier?', `Yakin ingin menghapus "${supplier.nama}"?`, async () => {
            await db.suppliers.put({ ...supplier, deleted: true, lastModified: Date.now() });
            showToast('Supplier dihapus.', 'info');
        }, { confirmColor: 'red' });
    };

    const handleExport = () => {
        const data = filteredSuppliers.map(s => ({
            'Nama Perusahaan/Toko': s.nama,
            'Nama Kontak': s.kontak || '-',
            'Telepon/WA': s.telepon || '-',
            'Email': s.email || '-',
            'Alamat': s.alamat || '-',
            'NPWP': s.npwp || '-',
            'Status': s.status || 'Aktif',
            'Keterangan': s.keterangan || '-'
        }));
        exportToExcel(data, 'Data_Supplier_Koperasi');
    };

    return (
        <div className="space-y-6">
            <div className="bg-white p-4 rounded-lg shadow border flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="relative w-full md:w-80">
                    <input 
                        type="text" 
                        placeholder="Cari Supplier / Kontak / Telp..." 
                        value={search} 
                        onChange={e => setSearch(e.target.value)} 
                        className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm" 
                    />
                    <i className="bi bi-search absolute left-3 top-2.5 text-gray-400"></i>
                </div>
                <div className="flex gap-2 w-full md:w-auto justify-end">
                    <button onClick={handleExport} className="bg-green-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-green-700 flex items-center gap-2">
                        <i className="bi bi-file-earmark-excel"></i> Export
                    </button>
                    <button onClick={() => openModal()} className="bg-teal-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-teal-700 flex items-center gap-2 shadow-sm">
                        <i className="bi bi-plus-lg"></i> Tambah Supplier
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredSuppliers.map(s => (
                    <div key={s.id} className="bg-white rounded-xl shadow-sm border p-5 flex flex-col justify-between hover:shadow-md transition-shadow">
                        <div>
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <h4 className="font-bold text-gray-800 text-lg leading-tight">{s.nama}</h4>
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${s.status === 'Non-Aktif' ? 'bg-gray-100 text-gray-500' : 'bg-green-100 text-green-700'}`}>{s.status || 'Aktif'}</span>
                                </div>
                                <div className="flex gap-1">
                                    <button onClick={() => openModal(s)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"><i className="bi bi-pencil-square"></i></button>
                                    <button onClick={() => handleDelete(s)} className="p-1.5 text-red-600 hover:bg-red-50 rounded"><i className="bi bi-trash"></i></button>
                                </div>
                            </div>
                            <div className="space-y-1.5 text-xs text-gray-600 mt-4">
                                <div className="flex items-center gap-2"><i className="bi bi-person-badge text-gray-400 w-4"></i> <span>{s.kontak || 'Tanpa Nama Kontak'}</span></div>
                                <div className="flex items-center gap-2"><i className="bi bi-whatsapp text-green-500 w-4"></i> 
                                    {s.telepon ? (
                                        <a href={`https://wa.me/${s.telepon.replace(/[^0-9]/g, '')}`} target="_blank" rel="noreferrer" className="text-teal-600 hover:underline font-medium">{s.telepon}</a>
                                    ) : <span>-</span>}
                                </div>
                                <div className="flex items-center gap-2"><i className="bi bi-envelope text-gray-400 w-4"></i> <span>{s.email || '-'}</span></div>
                                <div className="flex items-start gap-2"><i className="bi bi-geo-alt text-gray-400 w-4 mt-0.5"></i> <span className="flex-1">{s.alamat || '-'}</span></div>
                            </div>
                        </div>
                        {s.keterangan && (
                            <div className="mt-4 pt-3 border-t text-[11px] text-gray-400 italic">
                                "{s.keterangan}"
                            </div>
                        )}
                    </div>
                ))}
                {filteredSuppliers.length === 0 && (
                    <div className="col-span-full py-12 text-center text-gray-400 bg-white rounded-xl border border-dashed">
                        <i className="bi bi-truck text-4xl mb-2 block"></i>
                        <p>Belum ada data supplier ditemukan.</p>
                    </div>
                )}
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-60 z-[80] flex justify-center items-center p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
                        <div className="p-4 border-b flex justify-between items-center bg-gray-50 rounded-t-lg">
                            <h3 className="font-bold text-gray-800">{editingSupplier ? 'Edit Supplier' : 'Tambah Supplier Baru'}</h3>
                            <button onClick={() => setIsModalOpen(false)}><i className="bi bi-x-lg"></i></button>
                        </div>
                        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-bold text-gray-700 mb-1">Nama Perusahaan / Toko *</label>
                                    <input {...register('nama', { required: true })} className="w-full border rounded p-2 text-sm" placeholder="PT. Sumber Pangan / Toko Berkah" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">Nama Sales / Kontak</label>
                                    <input {...register('kontak')} className="w-full border rounded p-2 text-sm" placeholder="Bpk. Hendra" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">No. Telepon / WA</label>
                                    <input {...register('telepon')} className="w-full border rounded p-2 text-sm" placeholder="08123456789" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">Email</label>
                                    <input type="email" {...register('email')} className="w-full border rounded p-2 text-sm" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">Status</label>
                                    <select {...register('status')} className="w-full border rounded p-2 text-sm">
                                        <option value="Aktif">Aktif</option>
                                        <option value="Non-Aktif">Non-Aktif</option>
                                    </select>
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-bold text-gray-700 mb-1">Alamat Lengkap</label>
                                    <textarea {...register('alamat')} className="w-full border rounded p-2 text-sm" rows={2}></textarea>
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-bold text-gray-700 mb-1">Catatan / Produk Utama</label>
                                    <textarea {...register('keterangan')} className="w-full border rounded p-2 text-sm" rows={2} placeholder="Misal: Supplier khusus sembako dan minyak goreng, kirim tiap hari Selasa."></textarea>
                                </div>
                            </div>
                            <div className="pt-4 border-t flex justify-end gap-2">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border rounded text-sm hover:bg-gray-100">Batal</button>
                                <button type="submit" className="px-6 py-2 bg-teal-600 text-white rounded text-sm font-bold hover:bg-teal-700">Simpan</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
