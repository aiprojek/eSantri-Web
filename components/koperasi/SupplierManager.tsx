
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
            if (editingSupplier) {
                await db.suppliers.update(editingSupplier.id, { ...data, lastModified: Date.now() });
                showToast('Supplier diperbarui', 'success');
            } else {
                await db.suppliers.add({ ...data, id: Date.now(), lastModified: Date.now() });
                showToast('Supplier ditambahkan', 'success');
            }
            setIsModalOpen(false);
        } catch (e) {
            showToast('Gagal menyimpan supplier', 'error');
        }
    };

    const handleDelete = (id: number) => {
        showConfirmation('Hapus Supplier?', 'Data supplier akan dihapus.', async () => {
            await db.suppliers.delete(id);
            showToast('Supplier dihapus', 'success');
        }, { confirmColor: 'red' });
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow-md h-full flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-xl font-bold text-gray-800">Manajemen Supplier</h2>
                    <p className="text-sm text-gray-500">Daftar pemasok barang koperasi</p>
                </div>
                <button 
                    onClick={() => openModal(null)}
                    className="bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-teal-700 flex items-center gap-2"
                >
                    <i className="bi bi-plus-lg"></i> Tambah Supplier
                </button>
            </div>

            <div className="mb-4 relative">
                <input 
                    type="text" 
                    placeholder="Cari Supplier..." 
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
                            <th className="p-3">Nama Supplier</th>
                            <th className="p-3">Kontak</th>
                            <th className="p-3">Alamat</th>
                            <th className="p-3">Keterangan</th>
                            <th className="p-3 text-center">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {filteredSuppliers.map(s => (
                            <tr key={s.id} className="hover:bg-gray-50">
                                <td className="p-3 font-bold text-gray-800">{s.nama}</td>
                                <td className="p-3 text-gray-600">{s.kontak || '-'}</td>
                                <td className="p-3 text-gray-600 truncate max-w-xs">{s.alamat || '-'}</td>
                                <td className="p-3 text-gray-500 italic">{s.keterangan || '-'}</td>
                                <td className="p-3 text-center">
                                    <div className="flex justify-center gap-2">
                                        <button onClick={() => openModal(s)} className="text-blue-600 hover:text-blue-800"><i className="bi bi-pencil-square"></i></button>
                                        <button onClick={() => handleDelete(s.id)} className="text-red-600 hover:text-red-800"><i className="bi bi-trash"></i></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {filteredSuppliers.length === 0 && (
                            <tr><td colSpan={5} className="p-10 text-center text-gray-400">Belum ada data supplier.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-60 z-[80] flex justify-center items-center p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
                        <div className="p-4 border-b flex justify-between items-center bg-gray-50 rounded-t-lg">
                            <h3 className="font-bold text-gray-800">{editingSupplier ? 'Edit Supplier' : 'Tambah Supplier'}</h3>
                            <button onClick={() => setIsModalOpen(false)}><i className="bi bi-x-lg"></i></button>
                        </div>
                        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">Nama Supplier *</label>
                                <input {...register('nama', { required: true })} className="w-full border rounded p-2 text-sm" placeholder="Contoh: PT. Sumber Makmur" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">Kontak / No. HP</label>
                                <input {...register('kontak')} className="w-full border rounded p-2 text-sm" placeholder="0812..." />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">Alamat</label>
                                <textarea {...register('alamat')} className="w-full border rounded p-2 text-sm" rows={2} placeholder="Alamat lengkap..."></textarea>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">Keterangan</label>
                                <input {...register('keterangan')} className="w-full border rounded p-2 text-sm" placeholder="Catatan tambahan..." />
                            </div>
                            <div className="pt-4 flex justify-end gap-2">
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
