
import React, { useState, useMemo } from 'react';
import { useLiveQuery } from "dexie-react-hooks";
import { useForm } from 'react-hook-form';
import { db } from '../../db';
import { useAppContext } from '../../AppContext';
import { Supplier } from '../../types';

export const SupplierManager: React.FC = () => {
    const { showToast, showConfirmation } = useAppContext();
    const suppliers = useLiveQuery(() => db.suppliers.toArray(), []) || [];
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const { register, handleSubmit, reset } = useForm<Supplier>();

    const filteredSuppliers = useMemo(() => {
        return suppliers.filter(s => s.nama.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [suppliers, searchTerm]);

    const openModal = (supplier: Supplier | null) => {
        setEditingSupplier(supplier);
        reset(supplier || { nama: '', kontak: '', alamat: '', keterangan: '' });
        setIsModalOpen(true);
    };

    const onSubmit = async (data: Supplier) => {
        try {
            const supplierData = {
                ...data,
                category: typeof data.kategori === 'string' ? (data.kategori as string).split(',').map(c => c.trim()) : data.kategori,
                lastModified: Date.now()
            };

            if (editingSupplier) {
                await db.suppliers.update(editingSupplier.id, supplierData);
                showToast('Vendor diperbarui', 'success');
            } else {
                await db.suppliers.add({ ...supplierData, id: Date.now() });
                showToast('Vendor ditambahkan', 'success');
            }
            setIsModalOpen(false);
        } catch (e) {
            showToast('Gagal menyimpan vendor', 'error');
        }
    };

    const handleDelete = (id: number) => {
        showConfirmation('Hapus Vendor?', 'Data vendor akan dihapus.', async () => {
            await db.suppliers.delete(id);
            showToast('Vendor dihapus', 'success');
        }, { confirmColor: 'red' });
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow-md h-full flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-xl font-bold text-gray-800">Vendor Management (Pemasok)</h2>
                    <p className="text-sm text-gray-500">Kelola daftar vendor dan kategori barang yang dipasok</p>
                </div>
                <button 
                    onClick={() => openModal(null)}
                    className="bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-teal-700 flex items-center gap-2"
                >
                    <i className="bi bi-person-plus-fill"></i> Tambah Vendor
                </button>
            </div>

            <div className="mb-4 relative">
                <input 
                    type="text" 
                    placeholder="Cari Vendor atau Kategori..." 
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm"
                />
                <i className="bi bi-search absolute left-3 top-2.5 text-gray-400"></i>
            </div>

            <div className="flex-grow overflow-auto border rounded-lg">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-600 sticky top-0">
                        <tr>
                            <th className="p-3">Nama Vendor</th>
                            <th className="p-3">Kontak & Telepon</th>
                            <th className="p-3">Kategori Pasokan</th>
                            <th className="p-3">Status</th>
                            <th className="p-3 text-center">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {filteredSuppliers.map(s => (
                            <tr key={s.id} className="hover:bg-gray-50">
                                <td className="p-3">
                                    <div className="font-bold text-gray-800">{s.nama}</div>
                                    <div className="text-[10px] text-gray-400 uppercase font-mono">{s.npwp || 'NPWP Tidak Ada'}</div>
                                </td>
                                <td className="p-3">
                                    <div className="text-sm text-gray-700">{s.kontak || '-'}</div>
                                    <div className="text-xs text-teal-600">{s.telepon || s.email || ''}</div>
                                </td>
                                <td className="p-3">
                                    <div className="flex flex-wrap gap-1">
                                        {Array.isArray(s.kategori) ? s.kategori.map((c, i) => (
                                            <span key={i} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-[10px]">{c}</span>
                                        )) : <span className="text-gray-400 italic text-xs">Semua</span>}
                                    </div>
                                </td>
                                <td className="p-3">
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${s.status === 'Aktif' || !s.status ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                        {s.status || 'Aktif'}
                                    </span>
                                </td>
                                <td className="p-3 text-center">
                                    <div className="flex justify-center gap-2">
                                        <button onClick={() => openModal(s)} className="text-blue-600 hover:text-blue-800 p-2"><i className="bi bi-pencil-square"></i></button>
                                        <button onClick={() => handleDelete(s.id)} className="text-red-600 hover:text-red-800 p-2"><i className="bi bi-trash"></i></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {filteredSuppliers.length === 0 && (
                            <tr><td colSpan={5} className="p-10 text-center text-gray-400">Belum ada data vendor.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-60 z-[80] flex justify-center items-center p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
                        <div className="p-4 border-b flex justify-between items-center bg-gray-50 rounded-t-lg">
                            <h3 className="font-bold text-gray-800">{editingSupplier ? 'Edit Vendor' : 'Tambah Vendor'}</h3>
                            <button onClick={() => setIsModalOpen(false)}><i className="bi bi-x-lg"></i></button>
                        </div>
                        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label className="block text-xs font-bold text-gray-700 mb-1">Nama Vendor / Perusahaan *</label>
                                    <input {...register('nama', { required: true })} className="w-full border rounded p-2 text-sm" placeholder="PT. Sumber Makmur Jaya" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">Nama Kontak</label>
                                    <input {...register('kontak')} className="w-full border rounded p-2 text-sm" placeholder="Bp. Ahmad" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">Telepon / WhatsApp</label>
                                    <input {...register('telepon')} className="w-full border rounded p-2 text-sm" placeholder="0812..." />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">NPWP</label>
                                    <input {...register('npwp')} className="w-full border rounded p-2 text-sm" placeholder="00.000.000.0-000.000" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">Status</label>
                                    <select {...register('status')} className="w-full border rounded p-2 text-sm">
                                        <option value="Aktif">Aktif</option>
                                        <option value="Non-Aktif">Non-Aktif</option>
                                    </select>
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-xs font-bold text-gray-700 mb-1">Kategori Barang (Pisahkan dengan koma)</label>
                                    <input {...register('kategori')} className="w-full border rounded p-2 text-sm" placeholder="Sembako, Sabun, Alat Tulis" />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-xs font-bold text-gray-700 mb-1">Alamat Lengkap</label>
                                    <textarea {...register('alamat')} className="w-full border rounded p-2 text-sm" rows={2} placeholder="Alamat lengkap..."></textarea>
                                </div>
                            </div>
                            <div className="pt-4 flex justify-end gap-2">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border rounded text-sm hover:bg-gray-100">Batal</button>
                                <button type="submit" className="px-6 py-2 bg-teal-600 text-white rounded text-sm font-bold hover:bg-teal-700">Simpan Data Vendor</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
