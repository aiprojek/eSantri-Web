import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useForm } from 'react-hook-form';
import { db } from '../../db';
import { useAppContext } from '../../AppContext';
import { Warehouse, StockTransfer } from '../../types';
import { generateKoperasiId } from './Shared';

export const WarehouseManager: React.FC = () => {
    const { showToast, showConfirmation, currentUser } = useAppContext();
    const warehouses = useLiveQuery(() => db.warehouses.filter(w => !w.deleted).toArray(), [], []);
    const products = useLiveQuery(() => db.produkKoperasi.filter(p => !p.deleted).toArray(), [], []);
    const transfers = useLiveQuery(() => db.stockTransfers.filter(t => !t.deleted).reverse().toArray(), [], []);
    
    const [subTab, setSubTab] = useState<'list' | 'transfers'>('list');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
    const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(null);
    
    const { register, handleSubmit, reset, setValue } = useForm<Warehouse>();
    const { register: regTransfer, handleSubmit: handleTransferSubmit, reset: resetTransfer } = useForm<StockTransfer>();

    const openModal = (warehouse: Warehouse | null = null) => {
        setEditingWarehouse(warehouse);
        if (warehouse) {
            setValue('nama', warehouse.nama);
            setValue('kode', warehouse.kode);
            setValue('lokasi', warehouse.lokasi);
            setValue('penanggungJawab', warehouse.penanggungJawab);
            setValue('keterangan', warehouse.keterangan);
            setValue('isDefault', warehouse.isDefault);
        } else {
            reset({ nama: '', kode: '', lokasi: '', penanggungJawab: '', keterangan: '', isDefault: warehouses.length === 0 });
        }
        setIsModalOpen(true);
    };

    const onSubmit = async (data: Warehouse) => {
        try {
            const now = Date.now();
            if (data.isDefault) {
                const others = await db.warehouses.filter(w => !w.deleted && !!w.isDefault).toArray();
                for (const other of others) {
                    await db.warehouses.put({ ...other, isDefault: false, lastModified: now });
                }
            }

            if (editingWarehouse) {
                await db.warehouses.put({ ...editingWarehouse, ...data, lastModified: now });
                showToast('Data gudang diperbarui.', 'success');
            } else {
                await db.warehouses.put({ ...data, id: generateKoperasiId(), deleted: false, lastModified: now });
                showToast('Gudang baru ditambahkan.', 'success');
            }
            setIsModalOpen(false);
        } catch (e) {
            showToast('Gagal menyimpan gudang.', 'error');
        }
    };

    const handleSyncDefaultWarehouseStock = async () => {
        const defWarehouse = warehouses.find(w => w.isDefault) || warehouses[0];
        if (!defWarehouse) {
            showToast('Buat minimal 1 Gudang terlebih dahulu.', 'error');
            return;
        }
        const now = Date.now();
        let syncedCount = 0;
        await (db as any).transaction('rw', db.produkKoperasi, async () => {
            for (const p of products) {
                const currentWhStocks = p.warehouseStocks ? { ...p.warehouseStocks } : {};
                const allocatedSum = Object.values(currentWhStocks).reduce((acc, v) => acc + (Number(v) || 0), 0);
                if (p.stok > allocatedSum) {
                    const diff = p.stok - allocatedSum;
                    currentWhStocks[defWarehouse.id] = (currentWhStocks[defWarehouse.id] || 0) + diff;
                    await db.produkKoperasi.put({
                        ...p,
                        warehouseStocks: currentWhStocks,
                        lastModified: now
                    });
                    syncedCount++;
                }
            }
        });
        if (syncedCount > 0) {
            showToast(`${syncedCount} produk berhasil dialokasikan ke ${defWarehouse.nama}.`, 'success');
        } else {
            showToast('Seluruh stok produk sudah teralokasi dengan benar ke gudang.', 'info');
        }
    };

    const onTransferSubmit = async (data: StockTransfer) => {
        const prod = products.find(p => p.id === Number(data.produkId));
        if (!prod) return;

        const fromId = Number(data.dariWarehouseId);
        const toId = Number(data.keWarehouseId);
        const qty = Number(data.qty);

        if (fromId === toId) {
            showToast('Gudang asal dan tujuan tidak boleh sama.', 'error');
            return;
        }

        const currentFromStock = prod.warehouseStocks?.[fromId] || 0;
        if (currentFromStock < qty) {
            showToast(`Stok di gudang asal tidak mencukupi (Tersedia: ${currentFromStock}). Klik "Alokasikan Stok ke Gudang Default" jika stok belum teralokasi.`, 'error');
            return;
        }

        try {
            const now = Date.now();
            await (db as any).transaction('rw', [db.produkKoperasi, db.stockTransfers, db.riwayatStok], async () => {
                // 1. Update Product Warehouse Stocks
                const updatedStocks = { ...(prod.warehouseStocks || {}) };
                updatedStocks[fromId] = (updatedStocks[fromId] || 0) - qty;
                updatedStocks[toId] = (updatedStocks[toId] || 0) + qty;

                await db.produkKoperasi.put({
                    ...prod,
                    warehouseStocks: updatedStocks,
                    lastModified: now
                });

                // 2. Record Transfer
                await db.stockTransfers.put({
                    ...data,
                    id: generateKoperasiId(),
                    produkId: Number(data.produkId),
                    dariWarehouseId: fromId,
                    keWarehouseId: toId,
                    qty: qty,
                    tanggal: new Date(data.tanggal).toISOString(),
                    operator: currentUser?.fullName || 'Admin',
                    deleted: false,
                    lastModified: now
                });

                // 3. Log History (2 entries: out and in)
                const fromWh = warehouses.find(w => w.id === fromId)?.nama || 'Gudang';
                const toWh = warehouses.find(w => w.id === toId)?.nama || 'Gudang';

                await db.riwayatStok.put({
                    id: generateKoperasiId(),
                    produkId: prod.id,
                    warehouseId: fromId,
                    tanggal: new Date().toISOString(),
                    tipe: 'Transfer',
                    jumlah: -qty,
                    stokAwal: currentFromStock,
                    stokAkhir: updatedStocks[fromId],
                    keterangan: `Transfer Keluar ke ${toWh}: ${data.keterangan || ''}`,
                    operator: currentUser?.fullName || 'Admin',
                    deleted: false,
                    lastModified: now
                });

                await db.riwayatStok.put({
                    id: generateKoperasiId(),
                    produkId: prod.id,
                    warehouseId: toId,
                    tanggal: new Date().toISOString(),
                    tipe: 'Transfer',
                    jumlah: qty,
                    stokAwal: (prod.warehouseStocks?.[toId] || 0),
                    stokAkhir: updatedStocks[toId],
                    keterangan: `Transfer Masuk dari ${fromWh}: ${data.keterangan || ''}`,
                    operator: currentUser?.fullName || 'Admin',
                    deleted: false,
                    lastModified: now
                });
            });

            showToast('Transfer stok berhasil!', 'success');
            setIsTransferModalOpen(false);
            resetTransfer();
        } catch (e) {
            showToast('Gagal memproses transfer stok.', 'error');
        }
    };

    const handleDelete = (w: Warehouse) => {
        if (w.isDefault) {
            showToast('Gudang utama tidak bisa dihapus.', 'error');
            return;
        }
        showConfirmation('Hapus Gudang?', `Yakin ingin menghapus "${w.nama}"?`, async () => {
            await db.warehouses.put({ ...w, deleted: true, lastModified: Date.now() });
            showToast('Gudang dihapus.', 'info');
        }, { confirmColor: 'red' });
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3 border-b border-slate-200 pb-3">
                <div className="flex gap-4 overflow-x-auto scrollbar-none">
                    <button onClick={() => setSubTab('list')} className={`pb-2 text-xs sm:text-sm font-bold border-b-2 whitespace-nowrap transition-colors ${subTab === 'list' ? 'border-teal-600 text-teal-600' : 'border-transparent text-slate-500'}`}>Daftar Gudang / Lokasi</button>
                    <button onClick={() => setSubTab('transfers')} className={`pb-2 text-xs sm:text-sm font-bold border-b-2 whitespace-nowrap transition-colors ${subTab === 'transfers' ? 'border-teal-600 text-teal-600' : 'border-transparent text-slate-500'}`}>Riwayat Transfer Stok</button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 md:flex md:flex-wrap gap-2">
                    {warehouses.length > 0 && (
                        <button
                            onClick={handleSyncDefaultWarehouseStock}
                            className="min-h-[40px] bg-blue-50 text-blue-700 border border-blue-200 px-3 py-2 rounded-lg text-xs font-bold hover:bg-blue-100 flex items-center justify-center gap-1.5"
                            title="Alokasikan stok produk yang belum memiliki lokasi gudang ke Gudang Default"
                        >
                            <i className="bi bi-arrow-repeat"></i> Alokasikan Stok Default
                        </button>
                    )}
                    <button onClick={() => { resetTransfer({ tanggal: new Date().toISOString().slice(0, 16) }); setIsTransferModalOpen(true); }} className="min-h-[40px] bg-orange-500 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-orange-600 flex items-center justify-center gap-2 shadow-2xs">
                        <i className="bi bi-arrow-left-right"></i> Transfer Antar Gudang
                    </button>
                    <button onClick={() => openModal()} className="min-h-[40px] bg-teal-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-teal-700 flex items-center justify-center gap-2 shadow-2xs">
                        <i className="bi bi-plus-lg"></i> Tambah Gudang
                    </button>
                </div>
            </div>

            {subTab === 'list' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {warehouses.map(w => {
                        const itemInWh = products.filter(p => (p.warehouseStocks?.[w.id] || 0) > 0).length;
                        const totalQtyInWh = products.reduce((acc, p) => acc + (p.warehouseStocks?.[w.id] || 0), 0);

                        return (
                            <div key={w.id} className={`bg-white rounded-xl shadow-sm border p-5 flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden ${w.isDefault ? 'ring-2 ring-teal-500' : ''}`}>
                                {w.isDefault && <div className="bg-teal-500 text-white text-[9px] font-bold px-3 py-0.5 absolute top-0 right-0 rounded-bl-lg uppercase">Utama (Default)</div>}
                                <div>
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className="w-10 h-10 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center font-bold text-lg border border-teal-100">
                                            {w.kode}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-gray-800">{w.nama}</h4>
                                            <p className="text-xs text-gray-500">{w.lokasi || 'Lokasi belum diatur'}</p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 my-4 bg-gray-50 p-3 rounded-lg border border-gray-100 text-center">
                                        <div>
                                            <div className="text-[10px] text-gray-400 uppercase font-bold">Jenis Produk</div>
                                            <div className="text-lg font-bold text-gray-700">{itemInWh} Item</div>
                                        </div>
                                        <div className="border-l">
                                            <div className="text-[10px] text-gray-400 uppercase font-bold">Total Stok</div>
                                            <div className="text-lg font-bold text-teal-600">{totalQtyInWh} Unit</div>
                                        </div>
                                    </div>
                                    <div className="text-xs text-gray-600 space-y-1">
                                        <div><span className="text-gray-400">PJ:</span> {w.penanggungJawab || '-'}</div>
                                        {w.keterangan && <div className="text-gray-400 italic mt-2">"{w.keterangan}"</div>}
                                    </div>
                                </div>
                                <div className="flex justify-end gap-2 mt-4 pt-3 border-t">
                                    <button onClick={() => openModal(w)} className="text-blue-600 hover:bg-blue-50 px-3 py-1 rounded text-xs font-bold border border-blue-200">Edit</button>
                                    {!w.isDefault && <button onClick={() => handleDelete(w)} className="text-red-600 hover:bg-red-50 px-3 py-1 rounded text-xs font-bold border border-red-200">Hapus</button>}
                                </div>
                            </div>
                        );
                    })}
                    {warehouses.length === 0 && (
                        <div className="col-span-full py-12 text-center text-gray-400 bg-white rounded-xl border border-dashed">
                            <i className="bi bi-building-exclamation text-4xl mb-2 block"></i>
                            <p>Belum ada data gudang. Silakan tambah gudang utama.</p>
                        </div>
                    )}
                </div>
            )}

            {subTab === 'transfers' && (
                <>
                    <div className="hidden md:block bg-white rounded-xl shadow-xs border border-slate-200 overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-600 text-xs border-b border-slate-200">
                                <tr>
                                    <th className="p-3">Tanggal</th>
                                    <th className="p-3">Produk</th>
                                    <th className="p-3">Dari Gudang</th>
                                    <th className="p-3">Ke Gudang</th>
                                    <th className="p-3 text-center">Jumlah</th>
                                    <th className="p-3">Keterangan</th>
                                    <th className="p-3">Operator</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {transfers.map(t => {
                                    const prod = products.find(p => p.id === t.produkId);
                                    const fromWh = warehouses.find(w => w.id === t.dariWarehouseId);
                                    const toWh = warehouses.find(w => w.id === t.keWarehouseId);
                                    return (
                                        <tr key={t.id} className="hover:bg-slate-50">
                                            <td className="p-3 text-xs text-slate-500 tabular-nums">{new Date(t.tanggal).toLocaleString('id-ID')}</td>
                                            <td className="p-3 font-bold text-slate-800">{prod?.nama || 'Produk Terhapus'}</td>
                                            <td className="p-3"><span className="bg-red-50 text-red-700 px-2 py-0.5 rounded text-xs border border-red-100">{fromWh?.nama || '-'}</span></td>
                                            <td className="p-3"><span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded text-xs border border-emerald-100">{toWh?.nama || '-'}</span></td>
                                            <td className="p-3 text-center font-bold text-teal-600 tabular-nums">{t.qty}</td>
                                            <td className="p-3 text-xs text-slate-500">{t.keterangan || '-'}</td>
                                            <td className="p-3 text-xs text-slate-400">{t.operator}</td>
                                        </tr>
                                    );
                                })}
                                {transfers.length === 0 && (
                                    <tr><td colSpan={7} className="p-8 text-center text-slate-400">Belum ada riwayat transfer stok.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="md:hidden space-y-3">
                        {transfers.map(t => {
                            const prod = products.find(p => p.id === t.produkId);
                            const fromWh = warehouses.find(w => w.id === t.dariWarehouseId);
                            const toWh = warehouses.find(w => w.id === t.keWarehouseId);
                            return (
                                <div key={t.id} className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs space-y-2">
                                    <div className="flex justify-between items-start gap-2">
                                        <div>
                                            <div className="font-bold text-slate-800 text-sm">{prod?.nama || 'Produk Terhapus'}</div>
                                            <div className="text-[11px] text-slate-500 tabular-nums">{new Date(t.tanggal).toLocaleString('id-ID')}</div>
                                        </div>
                                        <span className="px-2.5 py-1 rounded-lg bg-teal-50 text-teal-700 font-bold text-xs tabular-nums border border-teal-200">
                                            {t.qty} Unit
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs pt-1">
                                        <span className="bg-red-50 text-red-700 px-2 py-0.5 rounded border border-red-100 truncate">{fromWh?.nama || '-'}</span>
                                        <i className="bi bi-arrow-right text-slate-400"></i>
                                        <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-100 truncate">{toWh?.nama || '-'}</span>
                                    </div>
                                    {(t.keterangan || t.operator) && (
                                        <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-100 flex justify-between">
                                            <span>{t.keterangan || '-'}</span>
                                            <span>Oleh: {t.operator}</span>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                        {transfers.length === 0 && (
                            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-sm text-slate-400">
                                Belum ada riwayat transfer stok.
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* Warehouse Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-60 z-[80] flex justify-center items-center p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
                        <div className="p-4 border-b flex justify-between items-center bg-gray-50 rounded-t-lg">
                            <h3 className="font-bold text-gray-800">{editingWarehouse ? 'Edit Gudang' : 'Tambah Gudang Baru'}</h3>
                            <button onClick={() => setIsModalOpen(false)}><i className="bi bi-x-lg"></i></button>
                        </div>
                        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
                            <div className="grid grid-cols-3 gap-4">
                                <div className="col-span-1">
                                    <label className="block text-xs font-bold text-gray-700 mb-1">Kode *</label>
                                    <input {...register('kode', { required: true })} className="w-full border rounded p-2 text-sm uppercase" placeholder="GD01" />
                                </div>
                                <div className="col-span-2 flex items-end pb-2">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="checkbox" {...register('isDefault')} className="rounded text-teal-600" />
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
