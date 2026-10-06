import React, { useState, useMemo, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { useAppContext } from '../../AppContext';
import { useSantriContext } from '../../contexts/SantriContext';
import { useFinanceContext } from '../../contexts/FinanceContext';
import { ProdukKoperasi, CartItem, TransaksiKoperasi, Santri, PendingOrder } from '../../types';
import { formatRupiah } from '../../utils/formatters';
import {
    getKoperasiSettings,
    printThermalReceipt,
    getThermalPrinterStatus,
    subscribePrinterStatus,
    connectBluetoothPrinter,
    generateKoperasiId
} from './Shared';

// Modular Components
import { ProductGrid } from './pos/ProductGrid';
import { CartSidebar } from './pos/CartSidebar';
import { CheckoutModal } from './pos/CheckoutModal';
import { VariantModal } from './pos/VariantModal';
import { PendingOrdersModal } from './pos/PendingOrdersModal';

export const PosInterface: React.FC = () => {
    const { showToast, showConfirmation, currentUser, settings: pondokSettings } = useAppContext();
    const { santriList } = useSantriContext();
    const { saldoSantriList, transaksiSaldoList } = useFinanceContext();
    
    // Live Data (Filtered for active records)
    const products = useLiveQuery(() => db.produkKoperasi.filter(p => !p.deleted).toArray(), [], []);
    const discounts = useLiveQuery(() => db.diskon.filter(d => !d.deleted && !!d.aktif).toArray(), [], []);
    const pendingOrders = useLiveQuery(() => db.pendingOrders.filter(o => !o.deleted).toArray(), [], []);
    const warehouses = useLiveQuery(() => db.warehouses.filter(w => !w.deleted).toArray(), [], []);

    // Active Warehouse / Outlet state
    const [selectedWarehouseId, setSelectedWarehouseId] = useState<number | undefined>(undefined);
    const [printerStatus, setPrinterStatus] = useState(() => getThermalPrinterStatus());
    const koperasiSettings = useMemo(() => getKoperasiSettings(pondokSettings), [pondokSettings]);

    useEffect(() => {
        return subscribePrinterStatus(() => {
            setPrinterStatus(getThermalPrinterStatus());
        });
    }, []);

    useEffect(() => {
        if (warehouses.length > 0 && !selectedWarehouseId) {
            const def = warehouses.find(w => w.isDefault) || warehouses[0];
            setSelectedWarehouseId(def.id);
        }
    }, [warehouses, selectedWarehouseId]);

    // Cart State
    const [cart, setCart] = useState<CartItem[]>([]);
    
    // Modals State
    const [variantModalProduct, setVariantModalProduct] = useState<ProdukKoperasi | null>(null);
    const [isPendingModalOpen, setIsPendingModalOpen] = useState(false);
    const [isHoldModalOpen, setIsHoldModalOpen] = useState(false);
    const [holdCustomerName, setHoldCustomerName] = useState('');
    const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
    const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);
    const [lastTransaction, setLastTransaction] = useState<TransaksiKoperasi | null>(null);
    
    // Temporary Customer Info for Recalled Orders
    const [recalledCustomer, setRecalledCustomer] = useState<{ type: 'Santri'|'Guru'|'Umum', name: string }>({ type: 'Santri', name: '' });

    // --- CART LOGIC ---

    const calculateItemPrice = (product: ProdukKoperasi, qty: number, variantIndex?: number): { price: number, isGrosir: boolean } => {
        let basePrice = product.hargaJual;
        if (product.hasVarian && variantIndex !== undefined && product.varian?.[variantIndex]?.harga) {
            basePrice = product.varian[variantIndex].harga!;
        }

        // Check Grosir
        if (product.grosir && product.grosir.length > 0) {
            const sortedTiers = [...product.grosir].sort((a, b) => b.minQty - a.minQty);
            const matchedTier = sortedTiers.find(t => qty >= t.minQty);
            if (matchedTier) {
                return { price: matchedTier.harga, isGrosir: true };
            }
        }

        return { price: basePrice, isGrosir: false };
    };

    const handleProductClick = (product: ProdukKoperasi) => {
        if (product.stok <= 0) {
            showToast('Stok produk habis!', 'error');
            return;
        }
        if (product.hasVarian && product.varian && product.varian.length > 0) {
            setVariantModalProduct(product);
        } else {
            addToCart(product);
        }
    };

    const addToCart = (product: ProdukKoperasi, variantIndex?: number) => {
        const variant = variantIndex !== undefined && product.varian ? product.varian[variantIndex] : undefined;
        const availableStock = variant ? variant.stok : product.stok;
        const itemName = variant ? `${product.nama} (${variant.nama})` : product.nama;
        const variantName = variant ? variant.nama : undefined;

        if (availableStock <= 0) {
            showToast('Stok varian habis!', 'error');
            return;
        }

        setCart(prev => {
            const existingIdx = prev.findIndex(item => item.produkId === product.id && item.varian === variantName);
            
            if (existingIdx > -1) {
                const currentQty = prev[existingIdx].qty;
                if (currentQty + 1 > availableStock) {
                    showToast('Stok tidak mencukupi!', 'error');
                    return prev;
                }
                const newQty = currentQty + 1;
                const { price, isGrosir } = calculateItemPrice(product, newQty, variantIndex);
                
                const updated = [...prev];
                updated[existingIdx] = {
                    ...updated[existingIdx],
                    qty: newQty,
                    harga: price,
                    subtotal: newQty * price,
                    isGrosirApplied: isGrosir,
                    stokTersedia: availableStock
                };
                return updated;
            } else {
                const { price, isGrosir } = calculateItemPrice(product, 1, variantIndex);
                return [...prev, {
                    produkId: product.id,
                    nama: itemName,
                    harga: price,
                    hargaAsli: product.hargaJual,
                    qty: 1,
                    subtotal: price,
                    stokTersedia: availableStock,
                    varian: variantName,
                    isGrosirApplied: isGrosir
                }];
            }
        });
        setVariantModalProduct(null);
    };

    const updateCartQty = (idx: number, delta: number) => {
        setCart(prev => {
            const item = prev[idx];
            const product = products.find(p => p.id === item.produkId);
            if (!product) return prev;

            const newQty = item.qty + delta;
            if (newQty <= 0) return prev.filter((_, i) => i !== idx);
            
            const variantIndex = product.varian?.findIndex(v => v.nama === item.varian);
            const maxStock = (variantIndex !== undefined && variantIndex > -1 && product.varian)
                ? product.varian[variantIndex].stok
                : item.stokTersedia;

            if (newQty > maxStock) {
                showToast('Mencapai batas stok tersedia.', 'info');
                return prev;
            }

            const { price, isGrosir } = calculateItemPrice(product, newQty, variantIndex !== -1 ? variantIndex : undefined);

            const updated = [...prev];
            updated[idx] = { 
                ...item, 
                qty: newQty, 
                harga: price, 
                subtotal: newQty * price,
                isGrosirApplied: isGrosir 
            };
            return updated;
        });
    };

    const subTotal = useMemo(() => cart.reduce((acc, item) => acc + item.subtotal, 0), [cart]);

    // --- PENDING ORDER LOGIC ---
    const handleHoldOrder = () => {
        if (cart.length === 0) return;
        setHoldCustomerName(recalledCustomer.name || 'Pelanggan');
        setIsHoldModalOpen(true);
    };

    const handleConfirmHoldOrder = async (e: React.FormEvent) => {
        e.preventDefault();
        const name = holdCustomerName.trim();
        if (!name) {
            showToast('Masukkan nama pelanggan atau catatan pesanan.', 'error');
            return;
        }

        await db.pendingOrders.put({
            id: generateKoperasiId(),
            customerName: name,
            timestamp: new Date().toISOString(),
            items: cart,
            customerType: recalledCustomer.type,
            deleted: false,
            lastModified: Date.now()
        } as PendingOrder);
        setCart([]);
        setRecalledCustomer({ type: 'Santri', name: '' });
        setIsHoldModalOpen(false);
        setHoldCustomerName('');
        showToast('Pesanan disimpan ke daftar tunggu.', 'info');
    };

    const executeRecallOrder = async (order: PendingOrder) => {
        setCart(order.items);
        setRecalledCustomer({ 
            type: order.customerType || 'Umum', 
            name: order.customerName 
        });
        await db.pendingOrders.put({ ...order, deleted: true, lastModified: Date.now() });
        setIsPendingModalOpen(false);
        showToast('Pesanan dikembalikan ke keranjang.', 'success');
    };

    const handleRecallOrder = async (order: PendingOrder) => {
        if (cart.length > 0) {
            showConfirmation(
                'Timpa Keranjang Saat Ini?',
                'Keranjang belanja saat ini tidak kosong. Timpa dengan pesanan yang disimpan?',
                () => executeRecallOrder(order),
                { confirmText: 'Ya, Timpa Keranjang', confirmColor: 'blue' }
            );
            return;
        }
        await executeRecallOrder(order);
    };

    const handleDeletePendingOrder = async (id: number) => {
        const order = pendingOrders.find(o => o.id === id);
        if (order) {
            await db.pendingOrders.put({ ...order, deleted: true, lastModified: Date.now() });
        }
    };

    // --- CHECKOUT PROCESS ---
    const handleProcessCheckout = async (checkoutData: {
        buyerType: 'Santri' | 'Guru' | 'Umum';
        selectedSantri: Santri | null;
        manualBuyerName: string;
        paymentMethod: 'Tunai' | 'Tabungan' | 'Non-Tunai' | 'Hutang';
        cashReceived: number;
        changeToBalance: boolean;
        paymentNote: string;
        selectedDiskonId: number | '';
        finalTotal: number;
        discountAmount: number;
        changeAmount: number;
        overrideLimitHarian?: boolean;
    }) => {
        const { buyerType, selectedSantri, manualBuyerName, paymentMethod, cashReceived, changeToBalance, paymentNote, selectedDiskonId, finalTotal, discountAmount, changeAmount, overrideLimitHarian } = checkoutData;
        const selectedDiskon = discounts.find(d => d.id === Number(selectedDiskonId));

        try {
            let newTrans: TransaksiKoperasi | null = null;
            const statusTransaksi = paymentMethod === 'Hutang' ? 'Belum Lunas' : 'Lunas';
            const sisaTagihan = paymentMethod === 'Hutang' ? (finalTotal - cashReceived) : 0;
            const now = Date.now();
            const nowIso = new Date().toISOString();

            await (db as any).transaction('rw', [db.produkKoperasi, db.transaksiKoperasi, db.riwayatStok, db.saldoSantri, db.transaksiSaldo, db.keuanganKoperasi, db.pembayaranHutang], async () => {
                // Validate daily spending limit for Tabungan
                if (paymentMethod === 'Tabungan' && selectedSantri && !overrideLimitHarian) {
                    const currentSaldo = await db.saldoSantri.get(selectedSantri.id);
                    if (currentSaldo?.limitHarian && currentSaldo.limitHarian > 0) {
                        const todayStr = new Date().toDateString();
                        const usedToday = transaksiSaldoList
                            .filter(t => !t.deleted && t.santriId === selectedSantri.id && t.jenis === 'Penarikan' && new Date(t.tanggal).toDateString() === todayStr)
                            .reduce((sum, t) => sum + t.jumlah, 0);
                        if (usedToday + finalTotal > currentSaldo.limitHarian) {
                            throw new Error(`Melebihi Limit Jajan Harian (Rp ${currentSaldo.limitHarian.toLocaleString('id-ID')}).`);
                        }
                    }
                }

                // 1. Create Transaction Record
                const transId = generateKoperasiId();
                const transData: TransaksiKoperasi = {
                    id: transId,
                    tanggal: nowIso,
                    tipePembeli: buyerType,
                    pembeliId: buyerType === 'Santri' ? selectedSantri?.id : undefined,
                    namaPembeli: buyerType === 'Santri' ? selectedSantri!.namaLengkap : manualBuyerName,
                    metodePembayaran: paymentMethod,
                    catatanPembayaran: paymentNote,
                    warehouseId: selectedWarehouseId,
                    items: cart,
                    totalBelanja: subTotal,
                    diskonId: selectedDiskon?.id,
                    diskonNama: selectedDiskon?.nama,
                    potonganDiskon: discountAmount,
                    totalFinal: finalTotal,
                    bayar: paymentMethod === 'Tunai' || paymentMethod === 'Hutang' ? cashReceived : finalTotal,
                    kembali: changeAmount,
                    kembalianMasukSaldo: changeToBalance,
                    statusTransaksi: statusTransaksi,
                    sisaTagihan: sisaTagihan,
                    kasir: currentUser?.fullName || 'Kasir',
                    deleted: false,
                    lastModified: now
                };
                await db.transaksiKoperasi.put(transData);
                newTrans = transData;

                // 2. If Hutang & has Down Payment (DP), record initial payment
                if (paymentMethod === 'Hutang' && cashReceived > 0) {
                    await db.pembayaranHutang.put({
                        id: generateKoperasiId(),
                        transaksiId: transId,
                        tanggal: nowIso,
                        jumlah: cashReceived,
                        metode: 'Tunai',
                        operator: currentUser?.fullName || 'Kasir',
                        catatan: 'Uang Muka (DP) saat transaksi',
                        deleted: false,
                        lastModified: now
                    } as any);
                }

                // 3. Deduct Stock (Total, Variant, and Active Warehouse) & Calculate Cost/Profit
                let totalProfit = 0;

                for (const item of cart) {
                    const prod = await db.produkKoperasi.get(item.produkId);
                    if (!prod) throw new Error(`Produk ${item.nama} tidak ditemukan.`);
                    if (prod.stok < item.qty) throw new Error(`Stok ${prod.nama} berubah, tidak mencukupi.`);
                    
                    let updatedVarian = prod.varian ? [...prod.varian] : undefined;
                    let newStok = prod.stok - item.qty;

                    if (item.varian && prod.hasVarian && updatedVarian) {
                        const vIdx = updatedVarian.findIndex(v => v.nama === item.varian);
                        if (vIdx > -1) {
                            if (updatedVarian[vIdx].stok < item.qty) {
                                throw new Error(`Stok varian ${item.varian} pada ${prod.nama} tidak mencukupi.`);
                            }
                            updatedVarian[vIdx] = {
                                ...updatedVarian[vIdx],
                                stok: updatedVarian[vIdx].stok - item.qty
                            };
                            newStok = updatedVarian.reduce((sum, v) => sum + v.stok, 0);
                        }
                    }

                    let updatedWarehouseStocks = prod.warehouseStocks ? { ...prod.warehouseStocks } : undefined;
                    if (selectedWarehouseId && updatedWarehouseStocks && updatedWarehouseStocks[selectedWarehouseId] !== undefined) {
                        updatedWarehouseStocks[selectedWarehouseId] = Math.max(0, updatedWarehouseStocks[selectedWarehouseId] - item.qty);
                    }

                    await db.produkKoperasi.put({
                        ...prod,
                        stok: newStok,
                        varian: updatedVarian,
                        warehouseStocks: updatedWarehouseStocks,
                        lastModified: now
                    });

                    // Calculate Profit per item
                    const itemCost = prod.hargaBeli * item.qty;
                    const itemRevenue = item.subtotal;
                    totalProfit += (itemRevenue - itemCost);

                    // Log Stock
                    await db.riwayatStok.put({
                        id: generateKoperasiId(),
                        produkId: prod.id,
                        warehouseId: selectedWarehouseId,
                        tanggal: nowIso,
                        tipe: 'Penjualan',
                        jumlah: item.qty,
                        stokAwal: prod.stok,
                        stokAkhir: newStok,
                        keterangan: `Penjualan #${transId} (${item.varian || 'Reguler'})`,
                        operator: currentUser?.fullName || 'Kasir',
                        varian: item.varian,
                        deleted: false,
                        lastModified: now
                    });
                }

                // Adjust profit by discount
                totalProfit -= discountAmount;

                // 4. Handle Santri Balance (Deduction OR Change Deposit)
                if (buyerType === 'Santri' && selectedSantri) {
                    const currentSaldo = await db.saldoSantri.get(selectedSantri.id);
                    let balance = currentSaldo ? currentSaldo.saldo : 0;

                    if (paymentMethod === 'Tabungan') {
                        if (balance < finalTotal) throw new Error('Saldo santri tidak cukup.');
                        const newBalance = balance - finalTotal;
                        await db.saldoSantri.put({
                            santriId: selectedSantri.id,
                            saldo: newBalance,
                            limitHarian: currentSaldo?.limitHarian,
                            lastModified: now
                        });
                        await db.transaksiSaldo.put({
                            id: generateKoperasiId(),
                            santriId: selectedSantri.id,
                            tanggal: nowIso,
                            jenis: 'Penarikan',
                            jumlah: finalTotal,
                            saldoSetelah: newBalance,
                            keterangan: `Belanja Koperasi #${transId}`,
                            operator: currentUser?.fullName || 'Kasir',
                            deleted: false,
                            lastModified: now
                        } as any);
                        balance = newBalance;
                    }

                    if (paymentMethod === 'Tunai' && changeToBalance && changeAmount > 0) {
                        const newBalance = balance + changeAmount;
                        await db.saldoSantri.put({
                            santriId: selectedSantri.id,
                            saldo: newBalance,
                            limitHarian: currentSaldo?.limitHarian,
                            lastModified: now
                        });
                        await db.transaksiSaldo.put({
                            id: generateKoperasiId(),
                            santriId: selectedSantri.id,
                            tanggal: nowIso,
                            jenis: 'Deposit',
                            jumlah: changeAmount,
                            saldoSetelah: newBalance,
                            keterangan: `Kembalian Belanja #${transId}`,
                            operator: currentUser?.fullName || 'Kasir',
                            deleted: false,
                            lastModified: now
                        } as any);
                    }
                }

                // 5. Record Income to Keuangan Koperasi
                if (statusTransaksi === 'Lunas') {
                    await db.keuanganKoperasi.put({
                        id: generateKoperasiId(),
                        tanggal: nowIso,
                        jenis: 'Pemasukan',
                        kategori: 'Penjualan',
                        deskripsi: `Penjualan POS #${transId} - ${transData.namaPembeli} (${paymentMethod})`,
                        jumlah: finalTotal,
                        laba: totalProfit,
                        metode: paymentMethod === 'Tabungan' ? 'Non-Tunai (Tabungan)' : paymentMethod === 'Non-Tunai' ? 'Transfer' : 'Tunai',
                        transaksiId: transId,
                        operator: currentUser?.fullName || 'Kasir',
                        deleted: false,
                        lastModified: now
                    } as any);
                } else if (paymentMethod === 'Hutang' && cashReceived > 0) {
                    const ratio = cashReceived / finalTotal;
                    const proportionalProfit = Math.round(totalProfit * ratio);

                    await db.keuanganKoperasi.put({
                        id: generateKoperasiId(),
                        tanggal: nowIso,
                        jenis: 'Pemasukan',
                        kategori: 'Penjualan (DP Hutang)',
                        deskripsi: `DP Nota #${transId} - ${transData.namaPembeli}`,
                        jumlah: cashReceived,
                        laba: proportionalProfit,
                        metode: 'Tunai',
                        transaksiId: transId,
                        operator: currentUser?.fullName || 'Kasir',
                        deleted: false,
                        lastModified: now
                    } as any);
                }
            });

            showToast('Transaksi berhasil!', 'success');
            setCart([]);
            setIsCheckoutOpen(false);
            setRecalledCustomer({ type: 'Santri', name: '' });
            
            if (newTrans) {
                setLastTransaction(newTrans);
                const settings = getKoperasiSettings(pondokSettings);
                if (settings.autoPrint) {
                    setTimeout(() => {
                        printThermalReceipt(newTrans!, pondokSettings, showToast);
                    }, 300);
                }
            }

        } catch (e: any) {
            showToast(e.message || 'Transaksi gagal.', 'error');
        }
    };

    const handlePrintReceipt = () => {
        if (!lastTransaction) return;
        printThermalReceipt(lastTransaction, pondokSettings, showToast);
    };

    const handleQuickConnectBt = async () => {
        try {
            const name = await connectBluetoothPrinter();
            showToast(`Printer Bluetooth terhubung: ${name}`, 'success');
        } catch (err: any) {
            if (err?.name !== 'NotFoundError') {
                showToast(err.message || 'Gagal menghubungkan printer Bluetooth.', 'error');
            }
        }
    };

    const totalCartItems = useMemo(() => cart.reduce((acc, item) => acc + item.qty, 0), [cart]);

    return (
        <div className="flex flex-col h-[calc(100vh-175px)] min-h-[520px] gap-3 relative">
            <div className="bg-white px-3.5 py-2 rounded-xl shadow-2xs border border-slate-200 flex flex-wrap items-center justify-between text-xs shrink-0 gap-2">
                <div className="flex items-center gap-2 min-w-0">
                    <i className="bi bi-shop text-teal-600 text-sm"></i>
                    <span className="text-slate-600 font-medium">Outlet:</span>
                    {warehouses.length > 0 ? (
                        <select
                            value={selectedWarehouseId || ''}
                            onChange={e => setSelectedWarehouseId(Number(e.target.value))}
                            className="border border-teal-200 rounded-lg px-2.5 py-1 min-h-[34px] font-bold text-teal-800 bg-teal-50 focus:ring-teal-500"
                        >
                            {warehouses.map(w => (
                                <option key={w.id} value={w.id}>{w.nama} ({w.kode})</option>
                            ))}
                        </select>
                    ) : (
                        <span className="font-bold text-slate-700">Koperasi Utama</span>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    {koperasiSettings.printerMethod === 'bluetooth' ? (
                        <button
                            type="button"
                            onClick={handleQuickConnectBt}
                            className={`min-h-[34px] px-2.5 py-1 rounded-lg border font-bold flex items-center gap-1.5 transition-colors ${
                                printerStatus.btConnected
                                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                    : 'bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100'
                            }`}
                            title="Klik untuk menghubungkan / ganti Printer Thermal Bluetooth"
                        >
                            <i className="bi bi-bluetooth"></i>
                            <span className="truncate max-w-[140px]">
                                {printerStatus.btConnected ? printerStatus.btDeviceName : 'Hubungkan Printer BT'}
                            </span>
                        </button>
                    ) : (
                        <span className="text-[11px] text-slate-500 flex items-center gap-1 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
                            <i className="bi bi-printer text-teal-600"></i>
                            <span>
                                {koperasiSettings.printerMethod === 'rawbt'
                                    ? 'Printer: RawBT'
                                    : koperasiSettings.printerMethod === 'usb'
                                    ? 'Printer: USB'
                                    : `Struk ${koperasiSettings.paperSize}`}
                            </span>
                        </span>
                    )}
                </div>
            </div>

            <div className="flex flex-col lg:flex-row flex-grow gap-4 min-h-0">
                <div className="flex-grow h-full min-w-0">
                    <ProductGrid 
                        products={products}
                        cart={cart}
                        onProductClick={handleProductClick} 
                        onPendingClick={() => setIsPendingModalOpen(true)}
                        pendingCount={pendingOrders.length}
                    />
                </div>

                {/* Desktop Cart Sidebar */}
                <div className="hidden lg:block h-full shrink-0">
                    <CartSidebar 
                        cart={cart} 
                        subTotal={subTotal} 
                        onUpdateQty={updateCartQty} 
                        onClear={() => setCart([])} 
                        onHold={handleHoldOrder} 
                        onCheckout={() => setIsCheckoutOpen(true)} 
                    />
                </div>
            </div>

            {/* Mobile & Tablet Sticky Bottom Cart Bar (< lg) */}
            <div className="lg:hidden shrink-0 bg-white border border-slate-200 rounded-xl p-3 shadow-md flex items-center justify-between gap-3">
                <button
                    type="button"
                    onClick={() => setIsMobileCartOpen(true)}
                    className="flex items-center gap-3 text-left flex-grow min-w-0 py-1"
                >
                    <div className="relative w-11 h-11 rounded-xl bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center shrink-0">
                        <i className="bi bi-cart4 text-xl"></i>
                        {totalCartItems > 0 && (
                            <span className="absolute -top-1.5 -right-1.5 bg-teal-600 text-white text-[11px] font-bold tabular-nums rounded-full min-w-[22px] h-[22px] px-1 flex items-center justify-center border-2 border-white">
                                {totalCartItems}
                            </span>
                        )}
                    </div>
                    <div className="min-w-0">
                        <div className="text-xs text-slate-500 flex items-center gap-1">
                            <span>Total Belanja</span>
                            <span className="text-teal-600 font-semibold">· Detail &uarr;</span>
                        </div>
                        <div className="text-lg font-bold text-slate-900 tabular-nums truncate">
                            {formatRupiah(subTotal)}
                        </div>
                    </div>
                </button>
                <div className="flex items-center gap-2 shrink-0">
                    {cart.length > 0 && (
                        <button
                            type="button"
                            onClick={handleHoldOrder}
                            className="min-h-[44px] px-3 rounded-xl bg-amber-100 text-amber-800 font-bold text-xs flex items-center justify-center"
                            title="Simpan Pesanan"
                        >
                            <i className="bi bi-pause-circle-fill text-base"></i>
                        </button>
                    )}
                    <button
                        type="button"
                        disabled={cart.length === 0}
                        onClick={() => setIsCheckoutOpen(true)}
                        className="min-h-[44px] px-5 rounded-xl bg-teal-600 text-white font-bold text-sm hover:bg-teal-700 active:scale-95 transition-all disabled:opacity-50 flex items-center gap-2 whitespace-nowrap shadow-xs"
                    >
                        <i className="bi bi-wallet2"></i>
                        <span>Bayar</span>
                    </button>
                </div>
            </div>

            {/* Mobile & Tablet Cart Bottom Sheet Drawer */}
            {isMobileCartOpen && (
                <div className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-xs z-[75] flex flex-col justify-end">
                    <div className="w-full h-[82vh] bg-white rounded-t-2xl overflow-hidden flex flex-col animate-fade-in-up">
                        <div className="w-10 h-1.5 bg-slate-300 rounded-full mx-auto my-2 shrink-0" />
                        <div className="flex-grow min-h-0">
                            <CartSidebar
                                cart={cart}
                                subTotal={subTotal}
                                onUpdateQty={updateCartQty}
                                onClear={() => { setCart([]); setIsMobileCartOpen(false); }}
                                onHold={() => { setIsMobileCartOpen(false); handleHoldOrder(); }}
                                onCheckout={() => { setIsMobileCartOpen(false); setIsCheckoutOpen(true); }}
                                onCloseMobile={() => setIsMobileCartOpen(false)}
                            />
                        </div>
                    </div>
                </div>
            )}

            <VariantModal 
                product={variantModalProduct} 
                onClose={() => setVariantModalProduct(null)} 
                onSelect={addToCart} 
            />

            <PendingOrdersModal 
                isOpen={isPendingModalOpen} 
                onClose={() => setIsPendingModalOpen(false)} 
                orders={pendingOrders} 
                onRecall={handleRecallOrder} 
                onDelete={handleDeletePendingOrder} 
            />

            {/* Hold Order Modal */}
            {isHoldModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[80] flex justify-center items-end sm:items-center p-0 sm:p-4">
                    <div className="bg-white rounded-t-2xl sm:rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                            <h3 className="font-bold text-slate-800 text-sm sm:text-base flex items-center gap-2">
                                <i className="bi bi-pause-circle-fill text-amber-500"></i> Tahan Pesanan (Hold Order)
                            </h3>
                            <button onClick={() => setIsHoldModalOpen(false)} className="w-8 h-8 rounded-lg text-slate-400 hover:bg-slate-200 flex items-center justify-center">
                                <i className="bi bi-x-lg"></i>
                            </button>
                        </div>
                        <form onSubmit={handleConfirmHoldOrder} className="p-4 sm:p-5 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">Nama Pelanggan / Catatan Antrean</label>
                                <input
                                    type="text"
                                    value={holdCustomerName}
                                    onChange={e => setHoldCustomerName(e.target.value)}
                                    placeholder="Contoh: Ahmad / Ambil Uang di Kamar"
                                    className="w-full border border-slate-300 rounded-xl p-3 text-sm min-h-[44px] focus:ring-2 focus:ring-teal-500"
                                    autoFocus
                                    required
                                />
                            </div>
                            <div className="flex gap-2 justify-end pt-2">
                                <button type="button" onClick={() => setIsHoldModalOpen(false)} className="px-4 py-2.5 min-h-[42px] border border-slate-300 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100">
                                    Batal
                                </button>
                                <button type="submit" className="px-5 py-2.5 min-h-[42px] bg-amber-600 text-white rounded-xl text-xs font-bold hover:bg-amber-700 shadow-xs flex items-center gap-1.5">
                                    <i className="bi bi-bookmark-check-fill"></i> Simpan ke Daftar Tunggu
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <CheckoutModal 
                isOpen={isCheckoutOpen} 
                onClose={() => setIsCheckoutOpen(false)} 
                subTotal={subTotal} 
                santriList={santriList} 
                saldoSantriList={saldoSantriList} 
                discounts={discounts} 
                onProcessCheckout={handleProcessCheckout}
                initialBuyerType={recalledCustomer.type}
                initialBuyerName={recalledCustomer.name}
            />

            {/* Success Modal */}
            {lastTransaction && (
                <div className="fixed inset-0 bg-black bg-opacity-70 z-[80] flex justify-center items-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 text-center animate-bounce-in">
                        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">
                            <i className="bi bi-check-lg"></i>
                        </div>
                        <h3 className="text-xl font-bold text-gray-800 mb-1">Transaksi Berhasil!</h3>
                        <p className="text-sm text-gray-500 mb-4">
                            {lastTransaction.metodePembayaran === 'Hutang' 
                                ? `Dicatat sebagai Hutang. Sisa: Rp ${(lastTransaction.sisaTagihan || 0).toLocaleString('id-ID')}` 
                                : `Kembalian: Rp ${(lastTransaction.kembali || 0).toLocaleString('id-ID')}`
                            }
                        </p>
                        
                        <div className="space-y-2">
                            <button onClick={handlePrintReceipt} className="w-full py-2.5 bg-gray-800 text-white rounded-lg font-bold text-sm hover:bg-gray-900 flex items-center justify-center gap-2">
                                <i className="bi bi-printer"></i> Cetak Struk (Lagi)
                            </button>
                            <button onClick={() => setLastTransaction(null)} className="w-full py-2.5 bg-teal-600 text-white rounded-lg font-bold text-sm hover:bg-teal-700">
                                Transaksi Baru
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
