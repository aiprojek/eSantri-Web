
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useLiveQuery } from "dexie-react-hooks";
import { useForm } from 'react-hook-form';
import { db } from '../../db';
import { useAppContext } from '../../AppContext';
import { ProdukKoperasi, RiwayatStok, GrosirTier, VarianProduk } from '../../types';
import { formatRupiah, formatDateTime } from '../../utils/formatters';
import { BulkProductEditor } from './modals/BulkProductEditor';
import { generateKoperasiId } from './Shared';

export const ProductManager: React.FC = () => {
    const { showToast, showConfirmation, currentUser } = useAppContext();
    const products = useLiveQuery(() => db.produkKoperasi.filter(p => !p.deleted).toArray(), []) || [];
    const suppliers = useLiveQuery(() => db.suppliers.filter(s => !s.deleted).toArray(), []) || [];
    const warehouses = useLiveQuery(() => db.warehouses.filter(w => !w.deleted).toArray(), []) || [];
    const history = useLiveQuery(() => db.riwayatStok.orderBy('tanggal').reverse().filter(r => !r.deleted).limit(200).toArray(), []) || [];
    
    // Tab State
    const [activeTab, setActiveTab] = useState<'manage' | 'log'>('manage');

    // Modal States
    const [isProductModalOpen, setIsProductModalOpen] = useState(false);
    const [modalTab, setModalTab] = useState<'info' | 'varian' | 'grosir' | 'stok_gudang'>('info');
    
    const [isStockModalOpen, setIsStockModalOpen] = useState(false);
    const [isBulkEditorOpen, setIsBulkEditorOpen] = useState(false);
    const [stockActionType, setStockActionType] = useState<'Masuk' | 'Koreksi'>('Masuk'); 
    
    // NEW: Stock Opname State
    const [isOpnameModalOpen, setIsOpnameModalOpen] = useState(false);
    const [opnameData, setOpnameData] = useState<Record<number, number>>({});
    const [opnameSearch, setOpnameSearch] = useState('');
    
    const [editingProduct, setEditingProduct] = useState<ProdukKoperasi | null>(null);
    
    // Complex State for Modal
    const [tempVarian, setTempVarian] = useState<VarianProduk[]>([]);
    const [tempGrosir, setTempGrosir] = useState<GrosirTier[]>([]);
    
    const { register, handleSubmit, reset, setValue, watch } = useForm<ProdukKoperasi>();

    // Stock Form State
    const [selectedStockProduct, setSelectedStockProduct] = useState<ProdukKoperasi | null>(null);
    const [selectedWarehouseId, setSelectedWarehouseId] = useState<number | ''>('');
    const [selectedStockVarian, setSelectedStockVarian] = useState<string>('');
    const [recordKulakanExpense, setRecordKulakanExpense] = useState<boolean>(true);
    const [stockSearchTerm, setStockSearchTerm] = useState('');
    const [stockQty, setStockQty] = useState<number>(1);
    const [stockNotes, setStockNotes] = useState('');

    // CSV Input Ref
    const fileInputRef = useRef<HTMLInputElement>(null);

    // --- Search Logic ---
    const [searchTerm, setSearchTerm] = useState('');
    const [filterLowStock, setFilterLowStock] = useState(false);
    
    const filteredProducts = useMemo(() => {
        let result = products;
        if (filterLowStock) {
            result = result.filter(p => p.stok <= (p.minStok || 5));
        }
        if (searchTerm) {
            const lower = searchTerm.toLowerCase();
            result = result.filter(p => 
                p.nama.toLowerCase().includes(lower) || 
                p.barcode?.toLowerCase().includes(lower) || 
                p.kategori.toLowerCase().includes(lower)
            );
        }
        return result;
    }, [products, searchTerm, filterLowStock]);

    const filteredStockProducts = useMemo(() => {
        if (!stockSearchTerm) return [];
        const lower = stockSearchTerm.toLowerCase();
        return products.filter(p => p.nama.toLowerCase().includes(lower) || p.barcode?.toLowerCase() === lower).slice(0, 5);
    }, [products, stockSearchTerm]);

    // Product Map for History View (ID -> Name)
    const productMap = useMemo(() => {
        const map = new Map<number, string>();
        products.forEach(p => map.set(p.id, p.nama));
        return map;
    }, [products]);

    // --- Handlers ---

    const handleOpenStockModal = (type: 'Masuk' | 'Koreksi') => {
        setStockActionType(type);
        setSelectedStockProduct(null);
        setSelectedStockVarian('');
        setRecordKulakanExpense(type === 'Masuk');
        const defWh = warehouses.find(w => w.isDefault) || warehouses[0];
        setSelectedWarehouseId(defWh ? defWh.id : '');
        setStockSearchTerm('');
        setStockQty(1);
        setStockNotes('');
        setIsStockModalOpen(true);
    };

    const handleSelectProductForStock = (p: ProdukKoperasi) => {
        setSelectedStockProduct(p);
        setSelectedStockVarian(p.hasVarian && p.varian && p.varian.length > 0 ? p.varian[0].nama : '');
        setStockSearchTerm(''); 
    };

    const handleSaveStockAction = async () => {
        if (!selectedStockProduct || stockQty <= 0) {
            showToast('Pilih produk dan masukkan jumlah yang valid.', 'error');
            return;
        }

        try {
            const whId = selectedWarehouseId ? Number(selectedWarehouseId) : undefined;
            if (warehouses.length > 0 && !whId) {
                showToast('Pilih gudang tujuan.', 'error');
                return;
            }

            let newTotalStock = selectedStockProduct.stok;
            const newWarehouseStocks = { ...(selectedStockProduct.warehouseStocks || {}) };
            let updatedVarian = selectedStockProduct.varian ? [...selectedStockProduct.varian] : undefined;

            if (stockActionType === 'Masuk') {
                if (selectedStockProduct.hasVarian && updatedVarian && selectedStockVarian) {
                    const vIdx = updatedVarian.findIndex(v => v.nama === selectedStockVarian);
                    if (vIdx > -1) {
                        updatedVarian[vIdx] = { ...updatedVarian[vIdx], stok: updatedVarian[vIdx].stok + stockQty };
                        newTotalStock = updatedVarian.reduce((sum, v) => sum + v.stok, 0);
                    } else {
                        newTotalStock += stockQty;
                    }
                } else {
                    newTotalStock += stockQty;
                }
                if (whId) {
                    newWarehouseStocks[whId] = (newWarehouseStocks[whId] || 0) + stockQty;
                }
            } else {
                if (selectedStockProduct.stok < stockQty) {
                    showToast('Stok total tidak cukup untuk dikurangi.', 'error');
                    return;
                }
                if (whId && newWarehouseStocks[whId] !== undefined && newWarehouseStocks[whId] < stockQty) {
                    showToast('Stok gudang terpilih tidak cukup untuk dikurangi.', 'error');
                    return;
                }
                if (selectedStockProduct.hasVarian && updatedVarian && selectedStockVarian) {
                    const vIdx = updatedVarian.findIndex(v => v.nama === selectedStockVarian);
                    if (vIdx > -1) {
                        if (updatedVarian[vIdx].stok < stockQty) {
                            showToast(`Stok varian ${selectedStockVarian} tidak mencukupi.`, 'error');
                            return;
                        }
                        updatedVarian[vIdx] = { ...updatedVarian[vIdx], stok: updatedVarian[vIdx].stok - stockQty };
                        newTotalStock = updatedVarian.reduce((sum, v) => sum + v.stok, 0);
                    } else {
                        newTotalStock -= stockQty;
                    }
                } else {
                    newTotalStock -= stockQty;
                }
                if (whId) {
                    newWarehouseStocks[whId] = Math.max(0, (newWarehouseStocks[whId] || 0) - stockQty);
                }
            }

            const now = Date.now();
            const nowIso = new Date().toISOString();

            await (db as any).transaction('rw', [db.produkKoperasi, db.riwayatStok, db.keuanganKoperasi], async () => {
                await db.produkKoperasi.put({
                    ...selectedStockProduct,
                    stok: newTotalStock,
                    varian: updatedVarian,
                    warehouseStocks: newWarehouseStocks,
                    lastModified: now
                });
                await db.riwayatStok.put({
                    id: generateKoperasiId(),
                    produkId: selectedStockProduct.id,
                    warehouseId: whId,
                    tanggal: nowIso,
                    tipe: stockActionType,
                    jumlah: stockQty,
                    stokAwal: selectedStockProduct.stok,
                    stokAkhir: newTotalStock,
                    keterangan: stockNotes || (stockActionType === 'Masuk' ? 'Restock Barang' : 'Barang Rusak/Hilang'),
                    operator: currentUser?.fullName || currentUser?.username || 'Admin',
                    varian: selectedStockVarian || undefined,
                    deleted: false,
                    lastModified: now
                } as RiwayatStok);

                if (stockActionType === 'Masuk' && recordKulakanExpense && selectedStockProduct.hargaBeli > 0) {
                    const totalCost = stockQty * selectedStockProduct.hargaBeli;
                    await db.keuanganKoperasi.put({
                        id: generateKoperasiId(),
                        tanggal: nowIso,
                        jenis: 'Pengeluaran',
                        kategori: 'Kulakan / Beli Stok',
                        deskripsi: `Restock ${selectedStockProduct.nama} (${stockQty} ${selectedStockProduct.satuan})${stockNotes ? ' - ' + stockNotes : ''}`,
                        jumlah: totalCost,
                        metode: 'Tunai',
                        operator: currentUser?.fullName || currentUser?.username || 'Admin',
                        deleted: false,
                        lastModified: now
                    } as any);
                }
            });

            showToast(`Stok ${selectedStockProduct.nama} berhasil ${stockActionType === 'Masuk' ? 'ditambahkan' : 'dikurangi'}.`, 'success');
            setIsStockModalOpen(false);
        } catch (e) {
            showToast('Gagal update stok.', 'error');
        }
    };

    const onSubmitProduct = async (data: ProdukKoperasi) => {
        try {
            if (!data.nama?.trim()) {
                showToast('Nama produk wajib diisi.', 'error');
                return;
            }
            if (!data.kategori?.trim()) {
                showToast('Kategori wajib diisi.', 'error');
                return;
            }

            const hargaBeli = Math.max(0, Number(data.hargaBeli) || 0);
            const hargaJual = Math.max(0, Number(data.hargaJual) || 0);
            const minStok = Math.max(0, Number(data.minStok) || 5);

            const hasVarian = tempVarian.length > 0;
            const sanitizedVarian = tempVarian.map(v => ({
                ...v,
                nama: (v.nama || '').trim(),
                harga: Math.max(0, Number(v.harga) || 0),
                stok: Math.max(0, Number(v.stok) || 0)
            })).filter(v => v.nama);
            const sanitizedGrosir = tempGrosir
                .map(g => ({
                    minQty: Math.max(1, Number(g.minQty) || 1),
                    harga: Math.max(0, Number(g.harga) || 0)
                }))
                .filter(g => g.harga > 0)
                .sort((a, b) => a.minQty - b.minQty);
            
            // Calculate total stock from warehouses if available
            const totalWhStock = data.warehouseStocks 
                ? Object.values(data.warehouseStocks).reduce((sum, q) => sum + (Number(q) || 0), 0)
                : 0;

            // Priority: Varian > Warehouse Stocks > Manual Input
            const totalStok = hasVarian 
                ? sanitizedVarian.reduce((sum, v) => sum + (Number(v.stok) || 0), 0) 
                : Math.max(0, (totalWhStock || Number(data.stok) || 0));

            const defWh = warehouses.find(w => w.isDefault) || warehouses[0];
            let computedWarehouseStocks = data.warehouseStocks ? { ...data.warehouseStocks } : {};
            if (defWh && totalWhStock === 0 && totalStok > 0) {
                computedWarehouseStocks = { [defWh.id]: totalStok };
            }

            const finalData = { 
                ...data, 
                nama: data.nama.trim(),
                kategori: data.kategori.trim(),
                hargaBeli,
                hargaJual,
                stok: totalStok,
                minStok,
                hasVarian,
                varian: sanitizedVarian,
                grosir: sanitizedGrosir,
                warehouseStocks: computedWarehouseStocks
            };

            const now = Date.now();
            if (editingProduct) {
                await db.produkKoperasi.put({ ...editingProduct, ...finalData, id: editingProduct.id, lastModified: now });
                showToast('Produk diperbarui.', 'success');
            } else {
                const id = generateKoperasiId();
                await db.produkKoperasi.put({ ...finalData, id, deleted: false, lastModified: now });
                if (totalStok > 0) {
                    await db.riwayatStok.put({
                        id: generateKoperasiId(),
                        produkId: id,
                        warehouseId: defWh?.id,
                        tanggal: new Date().toISOString(),
                        tipe: 'Masuk',
                        jumlah: totalStok,
                        stokAwal: 0,
                        stokAkhir: totalStok,
                        keterangan: 'Stok Awal Produk Baru',
                        operator: currentUser?.fullName || currentUser?.username || 'Admin',
                        deleted: false,
                        lastModified: now
                    } as RiwayatStok);
                }
                showToast('Produk ditambahkan.', 'success');
            }
            setIsProductModalOpen(false);
        } catch (e) {
            showToast('Gagal menyimpan.', 'error');
        }
    };

    const handleDelete = (id: number) => {
        showConfirmation('Hapus Produk?', 'Produk akan dihapus permanen.', async () => {
            await db.produkKoperasi.put({ ...products.find(p => p.id === id)!, deleted: true, lastModified: Date.now() });
            showToast('Produk dihapus.', 'success');
        }, { confirmColor: 'red' });
    };

    const openProductModal = (product: ProdukKoperasi | null) => {
        setEditingProduct(product);
        setModalTab('info');
        setTempVarian(product?.varian || []);
        setTempGrosir(product?.grosir || []);
        
        reset(product || { nama: '', kategori: 'Makanan', hargaBeli: 0, hargaJual: 0, stok: 0, satuan: 'pcs', barcode: '', minStok: 5 });
        setIsProductModalOpen(true);
    };

    // --- Variant & Grosir Helpers ---
    const addVarian = () => setTempVarian([...tempVarian, { nama: '', harga: 0, stok: 0 }]);
    const updateVarian = (idx: number, field: keyof VarianProduk, val: any) => {
        const newV = [...tempVarian];
        newV[idx] = { ...newV[idx], [field]: val };
        setTempVarian(newV);
    };
    const removeVarian = (idx: number) => setTempVarian(tempVarian.filter((_, i) => i !== idx));

    const addGrosir = () => setTempGrosir([...tempGrosir, { minQty: 2, harga: 0 }]);
    const updateGrosir = (idx: number, field: keyof GrosirTier, val: number) => {
        const newG = [...tempGrosir];
        newG[idx] = { ...newG[idx], [field]: val };
        setTempGrosir(newG);
    };
    const removeGrosir = (idx: number) => setTempGrosir(tempGrosir.filter((_, i) => i !== idx));

    // --- Stock Opname Handlers ---
    const handleOpnameChange = (id: number, val: number) => {
        setOpnameData(prev => ({ ...prev, [id]: val }));
    };

    const handleSaveOpname = async () => {
        const updates: any[] = [];
        const logs: any[] = [];
        const now = Date.now();
        const timestamp = new Date().toISOString();
        const defWh = warehouses.find(w => w.isDefault) || warehouses[0];

        Object.keys(opnameData).forEach(idStr => {
            const id = Number(idStr);
            const fisik = opnameData[id];
            const product = products.find(p => p.id === id);
            
            if (product && product.stok !== fisik) {
                const diff = fisik - product.stok;
                const updatedWhStocks = product.warehouseStocks ? { ...product.warehouseStocks } : {};
                if (defWh && updatedWhStocks[defWh.id] !== undefined) {
                    updatedWhStocks[defWh.id] = Math.max(0, updatedWhStocks[defWh.id] + diff);
                }
                updates.push(db.produkKoperasi.put({
                    ...product,
                    stok: fisik,
                    warehouseStocks: updatedWhStocks,
                    lastModified: now
                }));
                logs.push({
                    id: generateKoperasiId(),
                    produkId: id,
                    warehouseId: defWh?.id,
                    tanggal: timestamp,
                    tipe: 'Koreksi',
                    jumlah: Math.abs(diff),
                    stokAwal: product.stok,
                    stokAkhir: fisik,
                    keterangan: `Stok Opname (Selisih ${diff > 0 ? '+' : ''}${diff})`,
                    operator: currentUser?.fullName || currentUser?.username || 'Admin',
                    deleted: false,
                    lastModified: now
                });
            }
        });

        if (updates.length > 0) {
            await Promise.all([...updates, db.riwayatStok.bulkPut(logs)]);
            showToast(`${updates.length} produk disesuaikan.`, 'success');
            setIsOpnameModalOpen(false);
            setOpnameData({});
        } else {
            showToast('Tidak ada perbedaan stok untuk disimpan.', 'info');
        }
    };

    // --- Bulk & CSV Logic ---
    const handleBulkSave = async (newProducts: Omit<ProdukKoperasi, 'id'>[]) => {
        try {
            const timestamp = Date.now();
            const defWh = warehouses.find(w => w.isDefault) || warehouses[0];
            const productsToAdd: ProdukKoperasi[] = newProducts.map((p) => ({
                ...p,
                minStok: p.minStok || 5,
                id: generateKoperasiId(),
                warehouseStocks: defWh && p.stok > 0 ? { [defWh.id]: p.stok } : {},
                deleted: false,
                lastModified: timestamp
            }));

            await db.produkKoperasi.bulkPut(productsToAdd);
            
            // Log initial stock for items with stock > 0
            const stockLogs = productsToAdd.filter(p => p.stok > 0).map(p => ({
                id: generateKoperasiId(),
                produkId: p.id,
                warehouseId: defWh?.id,
                tanggal: new Date().toISOString(),
                tipe: 'Masuk' as const,
                jumlah: p.stok,
                stokAwal: 0,
                stokAkhir: p.stok,
                keterangan: 'Stok Awal (Bulk Add)',
                operator: currentUser?.fullName || currentUser?.username || 'Admin',
                deleted: false,
                lastModified: timestamp
            }));

            if (stockLogs.length > 0) {
                await db.riwayatStok.bulkPut(stockLogs as any);
            }

            showToast(`${productsToAdd.length} produk berhasil ditambahkan.`, 'success');
        } catch (e) {
            console.error(e);
            showToast('Gagal menyimpan data massal.', 'error');
        }
    };

    const downloadTemplate = () => { /* ... existing ... */ };
    const handleImportCSV = (event: React.ChangeEvent<HTMLInputElement>) => { /* ... existing ... */ };

    return (
        <div className="bg-white p-4 md:p-6 rounded-lg shadow-md h-full flex flex-col">
            {/* ... Existing Tab Navigation & Search Bar ... */}
             <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 shrink-0 gap-3 border-b pb-4">
                <div className="flex gap-2 md:gap-4 w-full md:w-auto overflow-x-auto">
                    <button 
                        onClick={() => setActiveTab('manage')} 
                        className={`text-xs md:text-sm font-bold pb-2 border-b-2 px-2 transition-colors whitespace-nowrap ${activeTab === 'manage' ? 'border-teal-600 text-teal-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        Manajemen Produk
                    </button>
                    <button 
                        onClick={() => setActiveTab('log')} 
                        className={`text-xs md:text-sm font-bold pb-2 border-b-2 px-2 transition-colors whitespace-nowrap ${activeTab === 'log' ? 'border-teal-600 text-teal-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        Log Riwayat Stok
                    </button>
                </div>
                {activeTab === 'manage' && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 w-full md:w-auto">
                         <button onClick={() => { setOpnameData({}); setIsOpnameModalOpen(true); }} className="bg-purple-50 text-purple-600 border border-purple-200 px-3 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 hover:bg-purple-100">
                            <i className="bi bi-clipboard-check"></i> Stok Opname
                        </button>
                        <button onClick={() => handleOpenStockModal('Koreksi')} className="bg-red-50 text-red-600 border border-red-200 px-3 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 hover:bg-red-100">
                            <i className="bi bi-trash"></i> Barang Rusak
                        </button>
                        <button onClick={() => handleOpenStockModal('Masuk')} className="bg-green-50 text-green-600 border border-green-200 px-3 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 hover:bg-green-100">
                            <i className="bi bi-box-arrow-in-down"></i> Stok Masuk
                        </button>
                    </div>
                )}
            </div>

            {activeTab === 'manage' ? (
                <>
                     <div className="flex flex-col gap-3 mb-4">
                        <div className="flex flex-wrap gap-2">
                            <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-teal-50 text-teal-700 border border-teal-200">
                                Total Produk: {products.length}
                            </span>
                            <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-red-50 text-red-700 border border-red-200">
                                Stok Menipis: {products.filter(p => p.stok <= (p.minStok || 5)).length}
                            </span>
                        </div>
                        <div className="relative w-full">
                             <input type="text" placeholder="Cari Produk..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-9 p-2 border rounded-lg text-sm" />
                             <i className="bi bi-search absolute left-3 top-2.5 text-gray-400"></i>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                             <button onClick={() => setFilterLowStock(!filterLowStock)} className={`px-3 py-2 rounded-lg border text-xs font-bold flex items-center justify-center gap-2 whitespace-nowrap ${filterLowStock ? 'bg-red-100 border-red-300 text-red-700' : 'bg-white text-gray-600'}`}>
                                <i className="bi bi-exclamation-triangle"></i> Stok Menipis
                             </button>
                            <button onClick={() => setIsBulkEditorOpen(true)} className="bg-teal-50 text-teal-700 border border-teal-200 px-3 py-2 rounded-lg text-xs font-bold hover:bg-teal-100 flex items-center justify-center gap-2">
                                <i className="bi bi-table"></i> Tambah Massal
                            </button>
                            <button onClick={() => openProductModal(null)} className="bg-teal-600 text-white px-3 py-2 rounded-lg text-xs font-bold hover:bg-teal-700 flex items-center justify-center gap-2">
                                <i className="bi bi-plus-lg"></i> Tambah Baru
                            </button>
                            <button
                                onClick={() => {
                                    setSearchTerm('');
                                    setFilterLowStock(false);
                                }}
                                className="bg-white text-gray-700 border border-gray-300 px-3 py-2 rounded-lg text-xs font-bold hover:bg-gray-50 flex items-center justify-center gap-2"
                            >
                                <i className="bi bi-arrow-counterclockwise"></i> Reset Filter
                            </button>
                        </div>
                    </div>

                    <div className="hidden md:block flex-grow overflow-auto border rounded-lg">
                        <table className="w-full text-sm text-left relative">
                            <thead className="bg-gray-50 text-gray-600 sticky top-0 z-10">
                                <tr>
                                    <th className="p-3">Nama Produk</th>
                                    <th className="p-3">Kategori</th>
                                    <th className="p-3 text-right">H. Beli</th>
                                    <th className="p-3 text-right">H. Jual</th>
                                    <th className="p-3 text-center">Stok</th>
                                    <th className="p-3 text-center">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {filteredProducts.map(p => {
                                    const isLow = p.stok <= (p.minStok || 5);
                                    return (
                                        <tr key={p.id} className={isLow ? 'bg-red-50 hover:bg-red-100' : 'hover:bg-gray-50'}>
                                            <td className="p-3 font-medium">
                                                {p.nama} 
                                                {p.hasVarian && <span className="ml-2 px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 text-[9px] font-bold">Varian</span>}
                                                {p.grosir && p.grosir.length > 0 && <span className="ml-1 px-1.5 py-0.5 rounded bg-orange-100 text-orange-700 text-[9px] font-bold">Grosir</span>}
                                                {p.barcode && <div className="text-[10px] text-gray-500 font-mono"><i className="bi bi-upc-scan"></i> {p.barcode}</div>}
                                                {isLow && <span className="text-[9px] bg-red-200 text-red-800 px-1 rounded ml-1 font-bold">Stok Rendah</span>}
                                            </td>
                                            <td className="p-3">{p.kategori}</td>
                                            <td className="p-3 text-right text-gray-500">{formatRupiah(p.hargaBeli)}</td>
                                            <td className="p-3 text-right font-bold text-green-700">{formatRupiah(p.hargaJual)}</td>
                                            <td className="p-3 text-center">
                                                <div className={`font-bold ${isLow ? 'text-red-600' : 'text-gray-800'}`}>{p.stok} {p.satuan}</div>
                                                <div className="text-[9px] text-gray-400">Min: {p.minStok || 5}</div>
                                            </td>
                                            <td className="p-3 text-center">
                                                <div className="flex justify-center gap-1.5">
                                                    <button
                                                        onClick={() => {
                                                            handleOpenStockModal('Masuk');
                                                            handleSelectProductForStock(p);
                                                        }}
                                                        className="px-2 py-1 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold hover:bg-emerald-100"
                                                        title="Tambah Stok Cepat"
                                                    >
                                                        +Stok
                                                    </button>
                                                    <button onClick={() => openProductModal(p)} className="w-8 h-8 rounded border border-blue-200 text-blue-600 hover:bg-blue-50 inline-flex items-center justify-center"><i className="bi bi-pencil-square"></i></button>
                                                    <button onClick={() => handleDelete(p.id)} className="w-8 h-8 rounded border border-red-200 text-red-600 hover:bg-red-50 inline-flex items-center justify-center"><i className="bi bi-trash"></i></button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {filteredProducts.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-gray-400">Tidak ada produk ditemukan.</td></tr>}
                            </tbody>
                        </table>
                    </div>

                    <div className="md:hidden flex-grow overflow-auto space-y-3">
                        {filteredProducts.map(p => {
                            const isLow = p.stok <= (p.minStok || 5);
                            return (
                                <div key={p.id} className={`border rounded-xl p-3.5 shadow-2xs ${isLow ? 'bg-red-50/40 border-red-200' : 'bg-white border-slate-200'}`}>
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                            <div className="font-bold text-sm text-slate-800">{p.nama}</div>
                                            <div className="text-xs text-slate-500">{p.kategori} {p.barcode ? `· ${p.barcode}` : ''}</div>
                                        </div>
                                        <div className="flex gap-1.5 shrink-0">
                                            <button
                                                onClick={() => {
                                                    handleOpenStockModal('Masuk');
                                                    handleSelectProductForStock(p);
                                                }}
                                                className="min-h-[36px] px-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold flex items-center gap-1"
                                            >
                                                <i className="bi bi-plus-circle"></i> Stok
                                            </button>
                                            <button onClick={() => openProductModal(p)} className="w-9 h-9 rounded-lg border border-slate-200 text-blue-600 hover:bg-blue-50 flex items-center justify-center" aria-label="Edit Produk"><i className="bi bi-pencil-square"></i></button>
                                            <button onClick={() => handleDelete(p.id)} className="w-9 h-9 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 flex items-center justify-center" aria-label="Hapus Produk"><i className="bi bi-trash"></i></button>
                                        </div>
                                    </div>
                                    <div className="mt-2 flex flex-wrap gap-1.5">
                                        {p.hasVarian && <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-700 text-[10px] font-bold">Varian</span>}
                                        {p.grosir && p.grosir.length > 0 && <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold">Grosir</span>}
                                        {isLow && <span className="px-2 py-0.5 rounded bg-red-200 text-red-800 text-[10px] font-bold">Stok Menipis</span>}
                                    </div>
                                    <div className="mt-2.5 grid grid-cols-3 gap-2 text-xs">
                                        <div className="rounded-lg bg-slate-50 border border-slate-200 p-2">
                                            <div className="text-[10px] text-slate-500">H. Beli</div>
                                            <div className="font-semibold text-slate-700 tabular-nums">{formatRupiah(p.hargaBeli)}</div>
                                        </div>
                                        <div className="rounded-lg bg-teal-50 border border-teal-200 p-2">
                                            <div className="text-[10px] text-teal-700">H. Jual</div>
                                            <div className="font-bold text-teal-900 tabular-nums">{formatRupiah(p.hargaJual)}</div>
                                        </div>
                                        <div className={`rounded-lg border p-2 ${isLow ? 'bg-red-100/60 border-red-300' : 'bg-slate-50 border-slate-200'}`}>
                                            <div className="text-[10px] text-slate-500">Stok (Min {p.minStok || 5})</div>
                                            <div className={`font-bold tabular-nums ${isLow ? 'text-red-700' : 'text-slate-800'}`}>{p.stok} {p.satuan}</div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        {filteredProducts.length === 0 && (
                            <div className="border rounded-xl p-6 text-center text-sm text-slate-400">Tidak ada produk ditemukan.</div>
                        )}
                    </div>
                </>
            ) : (
                <div className="hidden md:block flex-grow overflow-auto border rounded-lg">
                    {/* Log Table - Same as before */}
                    <table className="w-full text-sm text-left">
                         <thead className="bg-gray-50 text-gray-600 sticky top-0 z-10">
                            <tr>
                                <th className="p-3">Waktu</th>
                                <th className="p-3">Produk</th>
                                <th className="p-3 text-center">Tipe</th>
                                <th className="p-3 text-right">Jumlah</th>
                                <th className="p-3 text-center">Stok Akhir</th>
                                <th className="p-3">Keterangan</th>
                                <th className="p-3">Oleh</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {history.map(h => (
                                <tr key={h.id} className="hover:bg-gray-50">
                                    <td className="p-3 text-gray-500 text-xs">{formatDateTime(h.tanggal)}</td>
                                    <td className="p-3 font-medium">{productMap.get(h.produkId) || 'Produk Terhapus'}</td>
                                    <td className="p-3 text-center">
                                        <span className={`px-2 py-0.5 rounded text-xs border ${
                                            h.tipe === 'Masuk' ? 'bg-green-50 text-green-700 border-green-200' :
                                            h.tipe === 'Penjualan' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                            h.tipe === 'Koreksi' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                                            'bg-gray-100'
                                        }`}>
                                            {h.tipe}
                                        </span>
                                    </td>
                                    <td className="p-3 text-right font-mono font-bold">
                                        {h.tipe === 'Masuk' ? '+' : '-'}{h.jumlah}
                                    </td>
                                    <td className="p-3 text-center text-gray-500">{h.stokAkhir}</td>
                                    <td className="p-3 text-xs text-gray-600 truncate max-w-xs" title={h.keterangan}>{h.keterangan || '-'}</td>
                                    <td className="p-3 text-xs text-gray-500">{h.operator}</td>
                                </tr>
                            ))}
                            {history.length === 0 && <tr><td colSpan={7} className="p-6 text-center text-gray-400">Belum ada riwayat stok.</td></tr>}
                        </tbody>
                    </table>
                </div>
            )}

            {activeTab === 'log' && (
                <div className="md:hidden flex-grow overflow-auto space-y-3">
                    {history.map(h => (
                        <div key={h.id} className="border rounded-lg p-3 bg-white">
                            <div className="flex items-start justify-between gap-2">
                                <div>
                                    <div className="font-semibold text-sm text-gray-800">{productMap.get(h.produkId) || 'Produk Terhapus'}</div>
                                    <div className="text-[11px] text-gray-500">{formatDateTime(h.tanggal)}</div>
                                </div>
                                <span className={`px-2 py-0.5 rounded text-[10px] border ${
                                    h.tipe === 'Masuk' ? 'bg-green-50 text-green-700 border-green-200' :
                                    h.tipe === 'Penjualan' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                    h.tipe === 'Koreksi' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                                    'bg-gray-100'
                                }`}>
                                    {h.tipe}
                                </span>
                            </div>
                            <div className="mt-2 text-xs text-gray-700">
                                <div>Jumlah: <span className="font-bold">{h.tipe === 'Masuk' ? '+' : '-'}{h.jumlah}</span></div>
                                <div>Stok Akhir: <span className="font-medium">{h.stokAkhir}</span></div>
                                <div className="truncate">Catatan: {h.keterangan || '-'}</div>
                                <div>Oleh: {h.operator}</div>
                            </div>
                        </div>
                    ))}
                    {history.length === 0 && (
                        <div className="border rounded-lg p-6 text-center text-sm text-gray-400">Belum ada riwayat stok.</div>
                    )}
                </div>
            )}

            {/* MODAL EDIT PRODUK - TABBED */}
            {isProductModalOpen && (
                <div className="fixed inset-0 bg-black/65 backdrop-blur-xs z-[70] flex justify-center items-end sm:items-center p-0 sm:p-4">
                    <div className="bg-white rounded-t-2xl sm:rounded-xl shadow-2xl w-full max-w-2xl h-[92vh] sm:h-[90vh] flex flex-col overflow-hidden">
                        <div className="p-4 border-b flex justify-between items-center bg-slate-50 shrink-0">
                            <h3 className="font-bold text-slate-800">{editingProduct ? 'Edit Produk' : 'Tambah Produk'}</h3>
                            <button onClick={() => setIsProductModalOpen(false)} className="w-9 h-9 rounded-lg hover:bg-slate-200 flex items-center justify-center"><i className="bi bi-x-lg"></i></button>
                        </div>

                        {/* Modal Tabs */}
                        <div className="flex border-b overflow-x-auto scrollbar-none shrink-0">
                            <button onClick={() => setModalTab('info')} className={`flex-1 py-3 px-3 text-xs sm:text-sm font-bold whitespace-nowrap ${modalTab === 'info' ? 'border-b-2 border-teal-600 text-teal-700 bg-teal-50/60' : 'text-slate-500 hover:bg-slate-50'}`}>Info Dasar</button>
                            <button onClick={() => setModalTab('varian')} className={`flex-1 py-3 px-3 text-xs sm:text-sm font-bold whitespace-nowrap ${modalTab === 'varian' ? 'border-b-2 border-teal-600 text-teal-700 bg-teal-50/60' : 'text-slate-500 hover:bg-slate-50'}`}>Varian ({tempVarian.length})</button>
                            <button onClick={() => setModalTab('grosir')} className={`flex-1 py-3 px-3 text-xs sm:text-sm font-bold whitespace-nowrap ${modalTab === 'grosir' ? 'border-b-2 border-teal-600 text-teal-700 bg-teal-50/60' : 'text-slate-500 hover:bg-slate-50'}`}>Grosir ({tempGrosir.length})</button>
                            <button onClick={() => setModalTab('stok_gudang')} className={`flex-1 py-3 px-3 text-xs sm:text-sm font-bold whitespace-nowrap ${modalTab === 'stok_gudang' ? 'border-b-2 border-teal-600 text-teal-700 bg-teal-50/60' : 'text-slate-500 hover:bg-slate-50'}`}>Stok Gudang</button>
                        </div>

                        <form onSubmit={handleSubmit(onSubmitProduct)} className="flex-grow overflow-y-auto p-4 sm:p-6">
                            
                            {modalTab === 'info' && (
                                <div className="space-y-4">
                                    <div><label className="block text-xs font-bold mb-1">Nama Produk</label><input {...register('nama', {required:true})} className="w-full border rounded p-2 text-sm" placeholder="Contoh: Roti O" /></div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div><label className="block text-xs font-bold mb-1">Kategori</label><input list="cats" {...register('kategori')} className="w-full border rounded p-2 text-sm" /><datalist id="cats"><option value="Makanan"/><option value="Minuman"/><option value="Alat Tulis"/><option value="Kitab"/><option value="Seragam"/></datalist></div>
                                        <div><label className="block text-xs font-bold mb-1">Supplier</label>
                                            <select {...register('supplierId', { valueAsNumber: true })} className="w-full border rounded p-2 text-sm bg-white">
                                                <option value="">-- Tanpa Supplier --</option>
                                                {suppliers.map(s => <option key={s.id} value={s.id}>{s.nama}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                    <div><label className="block text-xs font-bold mb-1">Barcode</label><input {...register('barcode')} className="w-full border rounded p-2 text-sm" placeholder="Scan..." /></div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div><label className="block text-xs font-bold mb-1">Harga Beli</label><input type="number" {...register('hargaBeli', {valueAsNumber:true})} className="w-full border rounded p-2 text-sm" /></div>
                                        <div><label className="block text-xs font-bold mb-1">Harga Jual (Umum)</label><input type="number" {...register('hargaJual', {valueAsNumber:true})} className="w-full border rounded p-2 text-sm font-bold" /></div>
                                    </div>
                                    
                                    {tempVarian.length === 0 ? (
                                        <div className="grid grid-cols-3 gap-4">
                                            <div><label className="block text-xs font-bold mb-1">Stok Awal</label><input type="number" {...register('stok', {valueAsNumber:true})} className="w-full border rounded p-2 text-sm" /></div>
                                            <div><label className="block text-xs font-bold mb-1 text-red-600">Min. Stok</label><input type="number" {...register('minStok', {valueAsNumber:true})} className="w-full border rounded p-2 text-sm border-red-200" placeholder="5" /></div>
                                            <div><label className="block text-xs font-bold mb-1">Satuan</label><input {...register('satuan')} className="w-full border rounded p-2 text-sm" placeholder="pcs" /></div>
                                        </div>
                                    ) : (
                                        <div className="bg-blue-50 p-3 rounded text-xs text-blue-800 border border-blue-200">
                                            <i className="bi bi-info-circle-fill mr-2"></i> Stok dikelola melalui tab Varian. Total stok: <strong>{tempVarian.reduce((s,v)=>s+(Number(v.stok)||0),0)}</strong>
                                        </div>
                                    )}
                                </div>
                            )}

                            {modalTab === 'varian' && (
                                <div>
                                    <div className="flex justify-between items-center mb-3">
                                        <h4 className="text-sm font-bold">Daftar Varian Produk</h4>
                                        <button type="button" onClick={addVarian} className="min-h-[36px] text-xs bg-emerald-600 text-white px-3 py-1.5 rounded-lg font-bold hover:bg-emerald-700">+ Tambah Varian</button>
                                    </div>
                                    {tempVarian.length === 0 && <p className="text-sm text-gray-400 italic text-center py-4">Belum ada varian (Contoh: Rasa Coklat, Ukuran L). Produk menggunakan stok & harga utama.</p>}
                                    <div className="space-y-2.5">
                                        {tempVarian.map((v, idx) => (
                                            <div key={idx} className="grid grid-cols-12 sm:flex gap-2 items-center bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                                                <input type="text" value={v.nama} onChange={e => updateVarian(idx, 'nama', e.target.value)} placeholder="Nama Varian (Coklat)" className="col-span-12 sm:flex-grow border rounded-lg p-2 text-sm bg-white" />
                                                <input type="number" value={v.harga} onChange={e => updateVarian(idx, 'harga', parseInt(e.target.value))} placeholder="Harga" className="col-span-6 sm:w-28 border rounded-lg p-2 text-sm bg-white" title="Harga Jual Varian" />
                                                <input type="number" value={v.stok} onChange={e => updateVarian(idx, 'stok', parseInt(e.target.value))} placeholder="Stok" className="col-span-4 sm:w-20 border rounded-lg p-2 text-sm bg-white" title="Stok Varian" />
                                                <button type="button" onClick={() => removeVarian(idx)} className="col-span-2 sm:w-9 h-9 text-red-500 hover:bg-red-100 rounded-lg flex items-center justify-center"><i className="bi bi-trash"></i></button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {modalTab === 'grosir' && (
                                <div>
                                    <div className="flex justify-between items-center mb-3">
                                        <h4 className="text-sm font-bold">Aturan Harga Grosir</h4>
                                        <button type="button" onClick={addGrosir} className="min-h-[36px] text-xs bg-orange-500 text-white px-3 py-1.5 rounded-lg font-bold hover:bg-orange-600">+ Tambah Aturan</button>
                                    </div>
                                    <p className="text-xs text-gray-500 mb-3">Harga grosir berlaku jika pembelian mencapai jumlah minimal tertentu.</p>
                                    <div className="space-y-2.5">
                                        {tempGrosir.map((g, idx) => (
                                            <div key={idx} className="grid grid-cols-12 sm:flex gap-2 items-center bg-orange-50 p-2.5 rounded-xl border border-orange-100">
                                                <div className="col-span-5 sm:w-auto flex items-center gap-1.5">
                                                    <span className="text-xs text-gray-600 whitespace-nowrap">Min Qty:</span>
                                                    <input type="number" value={g.minQty} onChange={e => updateGrosir(idx, 'minQty', parseInt(e.target.value))} className="w-full sm:w-20 border rounded-lg p-2 text-sm bg-white" />
                                                </div>
                                                <div className="col-span-5 sm:flex-grow flex items-center gap-1.5">
                                                    <span className="text-xs text-gray-600 whitespace-nowrap">Harga:</span>
                                                    <input type="number" value={g.harga} onChange={e => updateGrosir(idx, 'harga', parseInt(e.target.value))} className="w-full border rounded-lg p-2 text-sm font-bold bg-white" />
                                                </div>
                                                <button type="button" onClick={() => removeGrosir(idx)} className="col-span-2 sm:w-9 h-9 text-red-500 hover:bg-red-100 rounded-lg flex items-center justify-center"><i className="bi bi-trash"></i></button>
                                            </div>
                                        ))}
                                        {tempGrosir.length === 0 && <p className="text-sm text-gray-400 italic text-center py-4">Tidak ada aturan grosir.</p>}
                                    </div>
                                </div>
                            )}

                            {modalTab === 'stok_gudang' && (
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center mb-2">
                                        <h4 className="text-sm font-bold">Sebaran Stok di Gudang</h4>
                                        <p className="text-[10px] text-gray-500 italic">* Masukkan jumlah stok fisik saat ini</p>
                                    </div>
                                    <div className="border rounded-lg overflow-hidden">
                                        <table className="w-full text-sm">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th className="p-2 text-left">Nama Gudang</th>
                                                    <th className="p-2 text-right">Qty</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y">
                                                {warehouses.map(w => (
                                                    <tr key={w.id}>
                                                        <td className="p-2 font-medium">{w.nama} <span className="text-[10px] text-gray-400">({w.kode})</span></td>
                                                        <td className="p-2 text-right">
                                                            <input 
                                                                type="number" 
                                                                className="w-20 border rounded p-1 text-right"
                                                                defaultValue={watch('warehouseStocks')?.[w.id] || 0}
                                                                onChange={(e) => {
                                                                    const val = parseInt(e.target.value) || 0;
                                                                    const current = watch('warehouseStocks') || {};
                                                                    setValue('warehouseStocks', { ...current, [w.id]: val });
                                                                }}
                                                            />
                                                        </td>
                                                    </tr>
                                                ))}
                                                {warehouses.length === 0 && <tr><td colSpan={2} className="p-4 text-center text-gray-400 italic">Belum ada gudang yang terdaftar.</td></tr>}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </form>
                        
                        <div className="p-4 border-t bg-gray-50 flex justify-end gap-2 rounded-b-lg">
                            <button type="button" onClick={() => setIsProductModalOpen(false)} className="px-4 py-2 border rounded text-sm bg-white hover:bg-gray-100">Batal</button>
                            <button type="button" onClick={handleSubmit(onSubmitProduct)} className="px-6 py-2 bg-teal-600 text-white rounded text-sm font-bold hover:bg-teal-700">Simpan Produk</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Other Modals (Stock, Opname, Bulk) remain same... */}
            {isStockModalOpen && (
                 <div className="fixed inset-0 bg-black bg-opacity-60 z-[70] flex justify-center items-center p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-md animate-fade-in-down">
                        <div className={`p-4 border-b rounded-t-lg text-white flex justify-between items-center ${stockActionType === 'Masuk' ? 'bg-green-600' : 'bg-red-600'}`}>
                            <h3 className="font-bold flex items-center gap-2">
                                <i className={`bi ${stockActionType === 'Masuk' ? 'bi-box-arrow-in-down' : 'bi-trash'}`}></i> 
                                {stockActionType === 'Masuk' ? 'Input Stok Masuk' : 'Lapor Barang Rusak/Hilang'}
                            </h3>
                            <button onClick={() => setIsStockModalOpen(false)}><i className="bi bi-x-lg"></i></button>
                        </div>
                        <div className="p-5 space-y-4">
                            {!selectedStockProduct ? (
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1">Cari Produk</label>
                                    <input 
                                        type="text" 
                                        autoFocus
                                        value={stockSearchTerm} 
                                        onChange={e => setStockSearchTerm(e.target.value)} 
                                        className="w-full border rounded p-2 text-sm" 
                                        placeholder="Ketik nama atau scan barcode..."
                                    />
                                    {filteredStockProducts.length > 0 && (
                                        <div className="border rounded mt-1 max-h-40 overflow-y-auto bg-white shadow-lg absolute w-[calc(100%-2.5rem)] z-10">
                                            {filteredStockProducts.map(p => (
                                                <div key={p.id} onClick={() => handleSelectProductForStock(p)} className="p-2 hover:bg-gray-100 cursor-pointer border-b text-sm">
                                                    <div className="font-bold">{p.nama}</div>
                                                    <div className="text-xs text-gray-500">Stok: {p.stok} | H.Beli: {formatRupiah(p.hargaBeli)}</div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="bg-gray-50 p-3 rounded border flex justify-between items-center">
                                    <div>
                                        <div className="font-bold text-gray-800">{selectedStockProduct.nama}</div>
                                        <div className="text-xs text-gray-500">Stok Saat Ini: {selectedStockProduct.stok} {selectedStockProduct.satuan}</div>
                                        {selectedStockProduct.hasVarian && <div className="text-[10px] text-red-500">*Produk ini memiliki varian. Stok akan ditambahkan ke total (tanpa spesifik varian).</div>}
                                    </div>
                                    <button onClick={() => setSelectedStockProduct(null)} className="text-red-500 text-xs hover:underline">Ganti</button>
                                </div>
                            )}

                            {selectedStockProduct && (
                                <>
                                    {warehouses.length > 0 && (
                                        <div>
                                            <label className="block text-xs font-bold text-gray-600 mb-1">Gudang Tujuan *</label>
                                            <select 
                                                value={selectedWarehouseId} 
                                                onChange={e => setSelectedWarehouseId(Number(e.target.value))} 
                                                className="w-full border rounded p-2 text-sm bg-white"
                                            >
                                                <option value="">-- Pilih Gudang --</option>
                                                {warehouses.map(w => (
                                                    <option key={w.id} value={w.id}>
                                                        {w.nama} (Stok: {selectedStockProduct.warehouseStocks?.[w.id] || 0})
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                    {selectedStockProduct.hasVarian && selectedStockProduct.varian && selectedStockProduct.varian.length > 0 && (
                                        <div>
                                            <label className="block text-xs font-bold text-gray-600 mb-1">Pilih Varian Produk *</label>
                                            <select
                                                value={selectedStockVarian}
                                                onChange={e => setSelectedStockVarian(e.target.value)}
                                                className="w-full border rounded p-2 text-sm bg-white font-medium"
                                            >
                                                {selectedStockProduct.varian.map((v, idx) => (
                                                    <option key={idx} value={v.nama}>
                                                        {v.nama} (Stok: {v.stok})
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                    <div>
                                        <label className="block text-xs font-bold text-gray-600 mb-1">Jumlah {stockActionType} *</label>
                                        <div className="flex items-center gap-2">
                                            <input 
                                                type="number" 
                                                autoFocus
                                                value={stockQty} 
                                                onChange={e => setStockQty(parseInt(e.target.value) || 0)} 
                                                className="w-full border rounded p-2 text-lg font-bold text-center" 
                                                min={1} 
                                            />
                                            <span className="text-sm text-gray-500">{selectedStockProduct.satuan}</span>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-600 mb-1">Keterangan / Sumber</label>
                                        <input 
                                            type="text" 
                                            value={stockNotes} 
                                            onChange={e => setStockNotes(e.target.value)} 
                                            className="w-full border rounded p-2 text-sm" 
                                            placeholder={stockActionType === 'Masuk' ? "cth: Kulakan Pasar Besar" : "cth: Kedaluwarsa, Dimakan Tikus"} 
                                        />
                                    </div>
                                    {stockActionType === 'Masuk' && selectedStockProduct.hargaBeli > 0 && (
                                        <div className="pt-1">
                                            <label className="flex items-center gap-2 cursor-pointer bg-green-50 p-2.5 rounded border border-green-200 text-xs text-green-900">
                                                <input
                                                    type="checkbox"
                                                    checked={recordKulakanExpense}
                                                    onChange={e => setRecordKulakanExpense(e.target.checked)}
                                                    className="rounded text-green-600"
                                                />
                                                <span>
                                                    Catat otomatis sebagai <strong>Pengeluaran Kulakan</strong> di Keuangan Koperasi ({formatRupiah(stockQty * selectedStockProduct.hargaBeli)})
                                                </span>
                                            </label>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                        <div className="p-4 border-t flex justify-end gap-2">
                             <button onClick={() => setIsStockModalOpen(false)} className="px-4 py-2 border rounded text-sm">Batal</button>
                             <button 
                                onClick={handleSaveStockAction} 
                                disabled={!selectedStockProduct || stockQty <= 0} 
                                className={`px-4 py-2 text-white rounded text-sm font-bold ${stockActionType === 'Masuk' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'} disabled:bg-gray-300`}
                             >
                                Simpan {stockActionType}
                             </button>
                        </div>
                    </div>
                </div>
            )}
            
             {/* STOCK OPNAME MODAL (NEW) */}
             {isOpnameModalOpen && (
                 <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-[80] flex justify-center items-end sm:items-center p-0 sm:p-4">
                    <div className="bg-white rounded-t-2xl sm:rounded-xl shadow-2xl w-full max-w-4xl h-[92vh] sm:h-[90vh] flex flex-col overflow-hidden">
                        <div className="p-4 border-b flex justify-between items-center bg-purple-50 shrink-0">
                            <h3 className="font-bold text-base sm:text-lg text-purple-900 flex items-center gap-2"><i className="bi bi-clipboard-check"></i> Formulir Stok Opname</h3>
                            <button onClick={() => setIsOpnameModalOpen(false)} className="w-9 h-9 rounded-lg hover:bg-purple-100 flex items-center justify-center"><i className="bi bi-x-lg text-slate-500"></i></button>
                        </div>
                        <div className="p-3 sm:p-4 bg-amber-50 text-xs sm:text-sm text-amber-900 border-b border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shrink-0">
                            <div>
                                <strong>Instruksi:</strong> Isi kolom "Fisik" sesuai jumlah nyata di rak. Selisih otomatis tercatat sebagai "Koreksi".
                            </div>
                            <div className="relative w-full sm:w-64 shrink-0">
                                <input
                                    type="text"
                                    value={opnameSearch}
                                    onChange={e => setOpnameSearch(e.target.value)}
                                    placeholder="Cari produk saat opname..."
                                    className="w-full pl-8 pr-3 py-1.5 min-h-[38px] bg-white border border-amber-300 rounded-lg text-xs sm:text-sm"
                                />
                                <i className="bi bi-search absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
                            </div>
                        </div>
                        <div className="flex-grow overflow-auto p-0">
                            <table className="w-full text-xs sm:text-sm text-left">
                                <thead className="bg-slate-100 text-slate-600 sticky top-0 z-10">
                                    <tr>
                                        <th className="p-2.5 sm:p-3">Nama Produk</th>
                                        <th className="p-2.5 sm:p-3 text-center">Sistem</th>
                                        <th className="p-2.5 sm:p-3 text-center w-28 sm:w-32">Stok Fisik</th>
                                        <th className="p-2.5 sm:p-3 text-center">Selisih</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {[...products]
                                        .filter(p => !opnameSearch || p.nama.toLowerCase().includes(opnameSearch.toLowerCase()) || p.kategori.toLowerCase().includes(opnameSearch.toLowerCase()))
                                        .sort((a,b) => a.nama.localeCompare(b.nama))
                                        .map(p => {
                                        const fisik = opnameData[p.id] !== undefined ? opnameData[p.id] : p.stok;
                                        const diff = fisik - p.stok;
                                        const isChanged = diff !== 0;
                                        return (
                                            <tr key={p.id} className={`hover:bg-slate-50 ${isChanged ? 'bg-amber-50/70' : ''}`}>
                                                <td className="p-2.5 sm:p-3 font-medium text-slate-800">
                                                    {p.nama}
                                                    {p.hasVarian && <span className="text-[10px] text-blue-600 ml-1 block sm:inline">(Total Varian)</span>}
                                                </td>
                                                <td className="p-2.5 sm:p-3 text-center text-slate-500 tabular-nums">{p.stok}</td>
                                                <td className="p-2 text-center">
                                                    <input 
                                                        type="number" 
                                                        className={`w-20 sm:w-24 min-h-[38px] text-center border rounded-lg p-1.5 font-bold tabular-nums ${isChanged ? 'border-purple-500 bg-white ring-1 ring-purple-300' : 'border-slate-300'}`}
                                                        value={opnameData[p.id] ?? ''} 
                                                        placeholder={p.stok.toString()}
                                                        onChange={(e) => handleOpnameChange(p.id, parseInt(e.target.value) || 0)}
                                                    />
                                                </td>
                                                <td className={`p-2.5 sm:p-3 text-center font-bold tabular-nums ${diff < 0 ? 'text-red-600' : diff > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                                                    {diff > 0 ? `+${diff}` : diff}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                        <div className="p-3.5 sm:p-4 border-t flex justify-end gap-2 bg-slate-50 shrink-0">
                            <button onClick={() => setIsOpnameModalOpen(false)} className="min-h-[42px] px-4 py-2 border border-slate-300 bg-white rounded-xl text-slate-700 hover:bg-slate-100 text-xs sm:text-sm font-semibold">Batal</button>
                            <button onClick={handleSaveOpname} className="min-h-[42px] px-5 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 font-bold text-xs sm:text-sm shadow-xs">Simpan Penyesuaian</button>
                        </div>
                    </div>
                </div>
            )}

            <BulkProductEditor 
                isOpen={isBulkEditorOpen} 
                onClose={() => setIsBulkEditorOpen(false)} 
                onSave={handleBulkSave} 
            />
        </div>
    );
};
