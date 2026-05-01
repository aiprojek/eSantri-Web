
import React, { useState, useMemo } from 'react';
import { useLiveQuery } from "dexie-react-hooks";
import { useForm } from 'react-hook-form';
import { db } from '../../db';
import { useAppContext } from '../../AppContext';
import { Warehouse, StockTransfer, ProdukKoperasi } from '../../types';

export const WarehouseManager: React.FC = () => {
    const { showToast, showConfirmation } = useAppContext();
    const warehouses = useLiveQuery(() => db.warehouses.toArray(), []) || [];
    const products = useLiveQuery(() => db.produkKoperasi.toArray(), []) || [];
    const transfers = useLiveQuery(() => db.stockTransfers.orderBy('tanggal').reverse().limit(50).toArray(), []) || [];
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
    const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(null);
    const [activeView, setActiveView] = useState<'list' | 'transfers'>('list');

    const { register, handleSubmit, reset } = useForm<Warehouse>();
    const { register: regTransfer, handleSubmit: handleTransferSubmit, reset: resetTransfer } = useForm<StockTransfer>();

    const onSubmit = async (data: Warehouse) => {
        try {
            if (editingWarehouse) {
                await db.warehouses.update(editingWarehouse.id, { ...data, lastModified: Date.now() });
                showToast('Gudang diperbarui', 'success');
            } else {
                await db.warehouses.add({ ...data, id: Date.now(), lastModified: Date.now() });
                showToast('Gudang ditambahkan', 'success');
            }
            setIsModalOpen(false);
        } catch (e) {
            showToast('Gagal menyimpan gudang', 'error');
        }
    };

    const onTransferSubmit = async (data: StockTransfer) => {
        try {
            const product = products.find(p => p.id === Number(data.produkId));
            if (!product) throw new Error('Produk tidak ditemukan');

            const qty = Number(data.qty);
            const fromWhId = Number(data.dariWarehouseId);
            const toWhId = Number(data.keWarehouseId);

            if (fromWhId === toWhId) {
                showToast('Gudang asal dan tujuan tidak boleh sama', 'error');
                return;
            }

            // Check stock in source warehouse
            const currentFromStock = (product.warehouseStocks?.[fromWhId] || 0);
            if (currentFromStock < qty) {
                showToast('Stok di gudang asal tidak mencukupi', 'error');
                return;
            }

            // Update product stocks
            const newWarehouseStocks = { ...(product.warehouseStocks || {}) };
            newWarehouseStocks[fromWhId] = (newWarehouseStocks[fromWhId] || 0) - qty;
            newWarehouseStocks[toWhId] = (newWarehouseStocks[toWhId] || 0) + qty;

            await db.produkKoperasi.update(product.id, { 
                warehouseStocks: newWarehouseStocks,
                lastModified: Date.now()
            });

            // Log transfer
            await db.stockTransfers.add({
                ...data,
                id: Date.now(),
                produkId: Number(data.produkId),
                dariWarehouseId: fromWhId,
                keWarehouseId: toWhId,
                qty: qty,
                operator: 'Admin', // Static for now
                lastModified: Date.now()
            });

            showToast('Transfer stok berhasil', 'success');
            setIsTransferModalOpen(false);
            resetTransfer();
        } catch (e) {
            showToast('Gagal melakukan transfer', 'error');
        }
    };

    const handleDelete = (id: number) => {
        showConfirmation('Hapus Gudang?', 'Data gudang akan dihapus. Stok di gudang ini mungkin hilang dari perhitungan per gudang.', async () => {
            await db.warehouses.delete(id);
            showToast('Gudang dihapus', 'success');
        }, { confirmColor: 'red' });
    };

    return (
        <div className="bg-white p-4 md:p-6 rounded-lg shadow-md h-full flex flex-col">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <div>
                    <h2 className="text-xl font-bold text-gray-800">Multi-Warehouse (Manajemen Gudang)</h2>
                    <p className="text-sm text-gray-500">Kelola stok di berbagai lokasi penyimpanan</p>
                </div>
                <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                    <button 
                        onClick={() => setActiveView(activeView === 'list' ? 'transfers' : 'list')}
                        className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-bold hover:bg-gray-200 flex items-center gap-2 flex-grow sm:flex-grow-0 justify-center"
                    >
                        <i className={`bi ${activeView === 'list' ? 'bi-arrow-left-right' : 'bi-list-ul'}`}></i> 
                        {activeView === 'list' ? 'Riwayat' : 'Daftar'}
                    </button>
                    <button 
                        onClick={() => setIsTransferModalOpen(true)}
                        className="bg-orange-500 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-orange-600 flex items-center gap-2 flex-grow sm:flex-grow-0 justify-center"
                    >
                        <i className="bi bi-shuffle"></i> Transfer
                    </button>
                    <button 
                        onClick={() => { setEditingWarehouse(null); reset({ nama: '', kode: '', isDefault: false }); setIsModalOpen(true); }}
                        className="bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-teal-700 flex items-center gap-2 flex-grow sm:flex-grow-0 justify-center"
                    >
                        <i className="bi bi-plus-lg"></i> Tambah
                    </button>
                </div>
            </div>

            {activeView === 'list' ? (
                <div className="flex-grow overflow-auto border rounded-lg">
                    <table className="hidden md:table w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-600 sticky top-0">
                            <tr>
                                <th className="p-3">Kode</th>
                                <th className="p-3">Nama Gudang</th>
                                <th className="p-3">Lokasi</th>
                                <th className="p-3">PJ / Pengelola</th>
                                <th className="p-3 text-center">Default</th>
                                <th className="p-3 text-center">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {warehouses.map(w => (
                                <tr key={w.id} className="hover:bg-gray-50">
                                    <td className="p-3 font-mono text-teal-600 font-bold">{w.kode}</td>
                                    <td className="p-3 font-bold text-gray-800">{w.nama}</td>
                                    <td className="p-3 text-gray-600">{w.lokasi || '-'}</td>
                                    <td className="p-3 text-gray-600">{w.penanggungJawab || '-'}</td>
                                    <td className="p-3 text-center">
                                        {w.isDefault ? <span className="text-green-600"><i className="bi bi-check-circle-fill"></i></span> : '-'}
                                    </td>
                                    <td className="p-3 text-center">
                                        <div className="flex justify-center gap-2">
                                            <button onClick={() => { setEditingWarehouse(w); reset(w); setIsModalOpen(true); }} className="text-blue-600 hover:text-blue-800"><i className="bi bi-pencil-square"></i></button>
                                            {!w.isDefault && <button onClick={() => handleDelete(w.id)} className="text-red-600 hover:text-red-800"><i className="bi bi-trash"></i></button>}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {warehouses.length === 0 && (
                                <tr><td colSpan={6} className="p-10 text-center text-gray-400">Belum ada data gudang.</td></tr>
                            )}
                        </tbody>
                    </table>
                    <div className="md:hidden p-3 space-y-3">
                        {warehouses.map(w => (
                            <div key={w.id} className="border rounded-lg p-3 bg-white">
                                <div className="flex items-start justify-between gap-2">
                                    <div>
                                        <div className="font-mono text-xs text-teal-700 font-bold">{w.kode}</div>
                                        <div className="font-semibold text-sm text-gray-800">{w.nama}</div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {w.isDefault && <span className="text-green-600 text-xs"><i className="bi bi-check-circle-fill"></i> Default</span>}
                                        <button onClick={() => { setEditingWarehouse(w); reset(w); setIsModalOpen(true); }} className="text-blue-600 hover:text-blue-800"><i className="bi bi-pencil-square"></i></button>
                                        {!w.isDefault && <button onClick={() => handleDelete(w.id)} className="text-red-600 hover:text-red-800"><i className="bi bi-trash"></i></button>}
                                    </div>
                                </div>
                                <div className="mt-2 text-xs text-gray-600">
                                    <div>Lokasi: {w.lokasi || '-'}</div>
                                    <div>PJ: {w.penanggungJawab || '-'}</div>
                                </div>
                            </div>
                        ))}
                        {warehouses.length === 0 && (
                            <div className="p-6 text-center text-sm text-gray-400 border rounded-lg">Belum ada data gudang.</div>
                        )}
                    </div>
                </div>
            ) : (
                <div className="flex-grow overflow-auto border rounded-lg">
                    <table className="hidden md:table w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-600 sticky top-0">
                            <tr>
                                <th className="p-3">Tanggal</th>
                                <th className="p-3">Produk</th>
                                <th className="p-3">Dari</th>
                                <th className="p-3">Ke</th>
                                <th className="p-3 text-right">Qty</th>
                                <th className="p-3">Keterangan</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {transfers.map(t => (
                                <tr key={t.id} className="hover:bg-gray-50 text-xs">
                                    <td className="p-3">{new Date(t.tanggal).toLocaleString()}</td>
                                    <td className="p-3 font-bold">{products.find(p => p.id === t.produkId)?.nama || 'Produk Dihapus'}</td>
                                    <td className="p-3 text-red-600">{warehouses.find(w => w.id === t.dariWarehouseId)?.nama || 'N/A'}</td>
                                    <td className="p-3 text-green-600">{warehouses.find(w => w.id === t.keWarehouseId)?.nama || 'N/A'}</td>
                                    <td className="p-3 text-right font-mono font-bold">{t.qty}</td>
                                    <td className="p-3 text-gray-500 italic">{t.keterangan || '-'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <div className="md:hidden p-3 space-y-3">
                        {transfers.map(t => (
                            <div key={t.id} className="border rounded-lg p-3 bg-white">
                                <div className="text-xs text-gray-500">{new Date(t.tanggal).toLocaleString()}</div>
                                <div className="mt-1 font-semibold text-sm text-gray-800">{products.find(p => p.id === t.produkId)?.nama || 'Produk Dihapus'}</div>
                                <div className="mt-2 text-xs">
                                    <div><span className="text-red-600 font-medium">Dari:</span> {warehouses.find(w => w.id === t.dariWarehouseId)?.nama || 'N/A'}</div>
                                    <div><span className="text-green-600 font-medium">Ke:</span> {warehouses.find(w => w.id === t.keWarehouseId)?.nama || 'N/A'}</div>
                                    <div>Qty: <span className="font-mono font-bold">{t.qty}</span></div>
                                </div>
                                <div className="mt-2 text-xs text-gray-500 italic">{t.keterangan || '-'}</div>
                            </div>
                        ))}
                        {transfers.length === 0 && (
                            <div className="p-6 text-center text-sm text-gray-400 border rounded-lg">Belum ada riwayat transfer.</div>
                        )}
                    </div>
                </div>
            )}

            {/* Warehouse Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-60 z-[80] flex justify-center items-center p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
                        <div className="p-4 border-b flex justify-between items-center bg-gray-50 rounded-t-lg">
                            <h3 className="font-bold text-gray-800">{editingWarehouse ? 'Edit Gudang' : 'Tambah Gudang'}</h3>
                            <button onClick={() => setIsModalOpen(false)}><i className="bi bi-x-lg"></i></button>
                        </div>
                        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">Kode Gudang *</label>
                                    <input {...register('kode', { required: true })} className="w-full border rounded p-2 text-sm uppercase" placeholder="G01" />
                                </div>
                                <div className="flex items-end pb-2">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="checkbox" {...register('isDefault')} className="rounded border-gray-300 text-teal-600" />
                                        <span className="text-xs font-bold text-gray-700">Set Jadi Default</span>
                                    </label>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">Nama Gudang *</label>
                                <input {...register('nama', { required: true })} className="w-full border rounded p-2 text-sm" placeholder="Gudang Utama" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">Lokasi</label>
                                <input {...register('lokasi')} className="w-full border rounded p-2 text-sm" placeholder="Lantai 1, Samping Kantin" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">Penanggung Jawab</label>
                                <input {...register('penanggungJawab')} className="w-full border rounded p-2 text-sm" placeholder="Ust. Zainal" />
                            </div>
                            <div className="pt-4 flex justify-end gap-2">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border rounded text-sm hover:bg-gray-100">Batal</button>
                                <button type="submit" className="px-6 py-2 bg-teal-600 text-white rounded text-sm font-bold hover:bg-teal-700">Simpan</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Transfer Modal */}
            {isTransferModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-60 z-[80] flex justify-center items-center p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
                        <div className="p-4 border-b flex justify-between items-center bg-orange-50 rounded-t-lg">
                            <h3 className="font-bold text-gray-800">Transfer Stok Antar Gudang</h3>
                            <button onClick={() => setIsTransferModalOpen(false)}><i className="bi bi-x-lg"></i></button>
                        </div>
                        <form onSubmit={handleTransferSubmit(onTransferSubmit)} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">Pilih Produk *</label>
                                <select {...regTransfer('produkId', { required: true })} className="w-full border rounded p-2 text-sm">
                                    <option value="">-- Pilih Produk --</option>
                                    {products.map(p => (
                                        <option key={p.id} value={p.id}>{p.nama} (Total: {p.stok})</option>
                                    ))}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">Dari Gudang *</label>
                                    <select {...regTransfer('dariWarehouseId', { required: true })} className="w-full border rounded p-2 text-sm">
                                        <option value="">-- Asal --</option>
                                        {warehouses.map(w => <option key={w.id} value={w.id}>{w.nama}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">Ke Gudang *</label>
                                    <select {...regTransfer('keWarehouseId', { required: true })} className="w-full border rounded p-2 text-sm">
                                        <option value="">-- Tujuan --</option>
                                        {warehouses.map(w => <option key={w.id} value={w.id}>{w.nama}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">Jumlah (Qty) *</label>
                                <input type="number" {...regTransfer('qty', { required: true })} className="w-full border rounded p-2 text-sm" min="1" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">Tanggal</label>
                                <input type="datetime-local" {...regTransfer('tanggal', { required: true })} defaultValue={new Date().toISOString().slice(0, 16)} className="w-full border rounded p-2 text-sm" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">Keterangan</label>
                                <input {...regTransfer('keterangan')} className="w-full border rounded p-2 text-sm" placeholder="Tukar stok, pengiriman baru, dll" />
                            </div>
                            <div className="pt-4 flex justify-end gap-2">
                                <button type="button" onClick={() => setIsTransferModalOpen(false)} className="px-4 py-2 border rounded text-sm hover:bg-gray-100">Batal</button>
                                <button type="submit" className="px-6 py-2 bg-orange-500 text-white rounded text-sm font-bold hover:bg-orange-600">Proses Transfer</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
