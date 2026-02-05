
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useLiveQuery } from "dexie-react-hooks";
import { db } from '../../db';
import { useAppContext } from '../../AppContext';
import { useSantriContext } from '../../contexts/SantriContext';
import { useFinanceContext } from '../../contexts/FinanceContext';
import { ProdukKoperasi, TransaksiKoperasi, CartItem, RiwayatStok, PendingOrder, Diskon } from '../../types';
import { formatRupiah } from '../../utils/formatters';
import { printToPdfNative } from '../../utils/pdfGenerator';
import { StrukPreview, KoperasiSettings, DEFAULT_KOP_SETTINGS } from './Shared';

export const PosInterface: React.FC = () => {
    const { showToast, showAlert, currentUser, settings } = useAppContext();
    const { santriList } = useSantriContext();
    const { saldoSantriList, onAddTransaksiSaldo, onAddTransaksiKas } = useFinanceContext();
    
    const products = useLiveQuery(() => db.produkKoperasi.filter(p => !p.deleted && p.stok > 0).toArray(), []) || [];
    const pendingOrders = useLiveQuery(() => db.pendingOrders.toArray(), []) || []; 
    const activeDiscounts = useLiveQuery(() => db.diskon.filter(d => d.aktif).toArray(), []) || [];

    const [cart, setCart] = useState<CartItem[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
    
    // Variant Selection State
    const [variantModalProduct, setVariantModalProduct] = useState<ProdukKoperasi | null>(null);

    const [mobilePosTab, setMobilePosTab] = useState<'products' | 'cart'>('products');
    
    // Checkout State
    const [customerType, setCustomerType] = useState<'Santri' | 'Umum' | 'Guru'>('Santri');
    const [selectedSantriId, setSelectedSantriId] = useState<number | null>(null);
    const [cashReceived, setCashReceived] = useState(0); // Only for Tunai
    const [buyerName, setBuyerName] = useState('');
    const [buyerPhone, setBuyerPhone] = useState(''); // New for Hutang Umum
    const [saveChangeToBalance, setSaveChangeToBalance] = useState(false);
    const [selectedDiskonId, setSelectedDiskonId] = useState<number | null>(null);
    const [paymentMethod, setPaymentMethod] = useState<'Tunai' | 'Tabungan' | 'Non-Tunai' | 'Hutang'>('Tunai');
    const [paymentRef, setPaymentRef] = useState(''); // For Non-Tunai Ref or Hutang Note

    const [lastTransaction, setLastTransaction] = useState<TransaksiKoperasi | null>(null);

    const [filterJenjang, setFilterJenjang] = useState<number>(0);
    const [filterKelas, setFilterKelas] = useState<number>(0);
    const [filterRombel, setFilterRombel] = useState<number>(0);
    const [santriSearchTerm, setSantriSearchTerm] = useState('');
    
    const [isPendingModalOpen, setIsPendingModalOpen] = useState(false);
    const barcodeInputRef = useRef<HTMLInputElement>(null);
    const [kopSettings, setKopSettings] = useState<KoperasiSettings>(DEFAULT_KOP_SETTINGS);

    const resetCheckoutState = () => {
        setCashReceived(0);
        setBuyerName('');
        setBuyerPhone('');
        setSaveChangeToBalance(false);
        setSelectedSantriId(null);
        setSantriSearchTerm('');
        setSelectedDiskonId(null);
        setPaymentMethod('Tunai');
        setPaymentRef('');
    };

    useEffect(() => {
        const saved = localStorage.getItem('esantri_koperasi_settings');
        if (saved) setKopSettings(JSON.parse(saved));
        if (!isCheckoutOpen && barcodeInputRef.current) {
            barcodeInputRef.current.focus();
        }
    }, [isCheckoutOpen, cart]);

    const filteredProducts = useMemo(() => {
        if (!searchQuery) return products;
        const lower = searchQuery.toLowerCase();
        return products.filter(p => p.nama.toLowerCase().includes(lower) || p.barcode?.toLowerCase() === lower);
    }, [products, searchQuery]);

    const handleBarcodeScan = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const barcode = searchQuery.trim();
            if (!barcode) return;
            const product = products.find(p => p.barcode === barcode);
            if (product) {
                if (product.hasVarian) {
                    setVariantModalProduct(product);
                } else {
                    addToCart(product);
                }
                setSearchQuery('');
            }
        }
    };

    const handleProductClick = (product: ProdukKoperasi) => {
        if (product.hasVarian) {
            setVariantModalProduct(product);
        } else {
            addToCart(product);
        }
    };

    const addToCart = (product: ProdukKoperasi, variantIndex: number = -1) => {
        let price = product.hargaJual;
        let name = product.nama;
        let variantName: string | undefined;
        let stockAvailable = product.stok;

        if (variantIndex >= 0 && product.varian) {
            const v = product.varian[variantIndex];
            if (v) {
                price = v.harga || price;
                name = `${product.nama} (${v.nama})`;
                variantName = v.nama;
                stockAvailable = v.stok;
            }
        }

        setCart(prev => {
            const existingIdx = prev.findIndex(i => i.produkId === product.id && i.varian === variantName);
            
            if (existingIdx >= 0) {
                const existing = prev[existingIdx];
                if (existing.qty >= stockAvailable) {
                    showToast('Stok habis', 'error');
                    return prev;
                }
                const newCart = [...prev];
                const newQty = existing.qty + 1;
                
                // Wholesale Logic Check (Only if no variant, usually wholesale is for bulk items)
                let newPrice = existing.harga;
                let isGrosir = false;
                if (!variantName && product.grosir && product.grosir.length > 0) {
                     const applicableTier = product.grosir
                        .filter(t => newQty >= t.minQty)
                        .sort((a,b) => b.minQty - a.minQty)[0]; // Highest matching tier
                     
                     if (applicableTier) {
                         newPrice = applicableTier.harga;
                         isGrosir = true;
                     }
                }

                newCart[existingIdx] = { 
                    ...existing, 
                    qty: newQty, 
                    harga: newPrice, 
                    subtotal: newQty * newPrice,
                    isGrosirApplied: isGrosir
                };
                return newCart;
            }
            
            // New Item
            return [...prev, { 
                produkId: product.id, 
                nama: name, 
                harga: price, 
                hargaAsli: price,
                qty: 1, 
                subtotal: price, 
                stokTersedia: stockAvailable, 
                varian: variantName 
            }];
        });
        showToast(`+1 ${name}`, 'success');
        setVariantModalProduct(null);
    };

    const updateQty = (idx: number, delta: number) => {
        setCart(prev => {
            const newCart = [...prev];
            const item = newCart[idx];
            const newQty = item.qty + delta;
            
            if (newQty <= 0) return prev.filter((_, i) => i !== idx);
            if (newQty > item.stokTersedia) {
                showToast('Stok tidak mencukupi', 'error');
                return prev;
            }

            // Re-check Wholesale Logic
            let newPrice = item.hargaAsli || item.harga;
            let isGrosir = false;
            const product = products.find(p => p.id === item.produkId);
            
            if (product && !item.varian && product.grosir && product.grosir.length > 0) {
                 const applicableTier = product.grosir
                    .filter(t => newQty >= t.minQty)
                    .sort((a,b) => b.minQty - a.minQty)[0];
                 
                 if (applicableTier) {
                     newPrice = applicableTier.harga;
                     isGrosir = true;
                 }
            }

            newCart[idx] = { 
                ...item, 
                qty: newQty, 
                harga: newPrice,
                subtotal: newQty * newPrice,
                isGrosirApplied: isGrosir
            };
            return newCart;
        });
    };

    const subTotal = cart.reduce((sum, item) => sum + item.subtotal, 0);
    
    // Discount Calculation
    const discountAmount = useMemo(() => {
        if (!selectedDiskonId) return 0;
        const disc = activeDiscounts.find(d => d.id === selectedDiskonId);
        if (!disc) return 0;
        if (disc.tipe === 'Nominal') return Math.min(disc.nilai, subTotal);
        return Math.floor(subTotal * (disc.nilai / 100));
    }, [selectedDiskonId, subTotal, activeDiscounts]);

    const finalTotal = Math.max(0, subTotal - discountAmount);

    // Filter Santri Logic
    const filteredSantriList = useMemo(() => {
        return santriList.filter(s => {
            if (s.status !== 'Aktif') return false;
            if (filterJenjang && s.jenjangId !== filterJenjang) return false;
            if (filterKelas && s.kelasId !== filterKelas) return false;
            if (filterRombel && s.rombelId !== filterRombel) return false;
            if (santriSearchTerm) {
                const lower = santriSearchTerm.toLowerCase();
                return s.namaLengkap.toLowerCase().includes(lower) || s.nis.includes(lower);
            }
            return true;
        }).slice(0, 20);
    }, [santriList, filterJenjang, filterKelas, filterRombel, santriSearchTerm]);

    // Checkout Handling
    const handleCheckout = async () => {
        if (cart.length === 0) return;
        try {
            const itemsCopy = [...cart];
            const timestamp = new Date().toISOString();
            let finalBayar = 0;
            let finalKembali = 0;
            let transaction: TransaksiKoperasi;
            
            let buyerLabel = customerType === 'Santri' ? (santriList.find(s=>s.id===selectedSantriId)?.namaLengkap || 'Santri') : (buyerName || 'Umum');
            if (customerType === 'Umum' && paymentMethod === 'Hutang') {
                if(!buyerName) throw new Error("Nama pembeli wajib diisi untuk hutang.");
                if(!buyerPhone) throw new Error("Nomor HP wajib diisi untuk hutang.");
                buyerLabel = `${buyerName} (${buyerPhone})`;
            }

            if (customerType === 'Santri' && paymentMethod === 'Tabungan') {
                if (!selectedSantriId) throw new Error("Pilih santri terlebih dahulu.");
                const saldo = saldoSantriList.find(s => s.santriId === selectedSantriId)?.saldo || 0;
                
                if (saldo < finalTotal) throw new Error(`Saldo tidak cukup. Saldo: ${formatRupiah(saldo)}`);
                await onAddTransaksiSaldo({ santriId: selectedSantriId, jenis: 'Penarikan', jumlah: finalTotal, keterangan: `Belanja Koperasi` });
                finalBayar = finalTotal; finalKembali = 0;
            } else if (paymentMethod === 'Hutang') {
                // Logic Hutang
                if (customerType === 'Santri' && !selectedSantriId) throw new Error("Pilih santri terlebih dahulu.");
                
                // Hutang does NOT add to Cashflow immediately
                finalBayar = 0;
                finalKembali = 0;
            } else {
                // Tunai or Non-Tunai (Bank Transfer/QRIS)
                if (paymentMethod === 'Tunai') {
                     if (cashReceived < finalTotal) throw new Error("Uang tunai kurang.");
                     finalBayar = cashReceived; 
                     finalKembali = cashReceived - finalTotal;
                     await onAddTransaksiKas({ jenis: 'Pemasukan', kategori: 'Penjualan Koperasi', deskripsi: `Penjualan Tunai ${buyerLabel}`, jumlah: finalTotal, penanggungJawab: currentUser?.fullName || 'Kasir' });
                } else {
                     // Non-Tunai
                     finalBayar = finalTotal; 
                     finalKembali = 0;
                     await onAddTransaksiKas({ jenis: 'Pemasukan', kategori: 'Penjualan Koperasi (Non-Tunai)', deskripsi: `Penjualan ${paymentMethod} ${buyerLabel} Ref:${paymentRef}`, jumlah: finalTotal, penanggungJawab: currentUser?.fullName || 'Kasir' });
                }

                if (customerType === 'Santri' && selectedSantriId && saveChangeToBalance && finalKembali > 0) {
                    await onAddTransaksiSaldo({ santriId: selectedSantriId, jenis: 'Deposit', jumlah: finalKembali, keterangan: 'Kembalian Belanja' });
                }
            }

            const discountObj = activeDiscounts.find(d => d.id === selectedDiskonId);
            const isHutang = paymentMethod === 'Hutang';

            transaction = { 
                id: Date.now(), 
                tanggal: timestamp, 
                tipePembeli: customerType, 
                pembeliId: selectedSantriId || undefined, 
                namaPembeli: buyerLabel, 
                metodePembayaran: paymentMethod, 
                catatanPembayaran: paymentRef,
                items: itemsCopy, 
                totalBelanja: subTotal, 
                diskonId: selectedDiskonId || undefined,
                diskonNama: discountObj?.nama,
                potonganDiskon: discountAmount,
                totalFinal: finalTotal,
                
                bayar: isHutang ? 0 : finalBayar, 
                kembali: isHutang ? 0 : finalKembali, 
                kembalianMasukSaldo: saveChangeToBalance && finalKembali > 0, 
                
                // Debt Logic
                statusTransaksi: isHutang ? 'Belum Lunas' : 'Lunas',
                sisaTagihan: isHutang ? finalTotal : 0,

                kasir: currentUser?.fullName || 'Admin', 
                lastModified: Date.now() 
            };

            await (db as any).transaction('rw', db.produkKoperasi, db.riwayatStok, db.transaksiKoperasi, async () => {
                 await db.transaksiKoperasi.add(transaction);
                 for (const item of itemsCopy) {
                    const product = await db.produkKoperasi.get(item.produkId);
                    if (product) {
                        // Reduce Global Stock
                        const newStok = product.stok - item.qty;
                        
                        // Reduce Variant Stock if applicable
                        let updatedVarian = product.varian;
                        if (item.varian && updatedVarian) {
                             updatedVarian = updatedVarian.map(v => v.nama === item.varian ? { ...v, stok: v.stok - item.qty } : v);
                        }

                        await db.produkKoperasi.update(item.produkId, { stok: newStok, varian: updatedVarian, lastModified: Date.now() });
                        
                        await db.riwayatStok.add({ 
                            produkId: product.id, 
                            tanggal: timestamp, 
                            tipe: 'Penjualan', 
                            jumlah: item.qty, 
                            stokAwal: product.stok, 
                            stokAkhir: newStok, 
                            keterangan: `Trx #${transaction.id} ${item.varian ? `(${item.varian})` : ''}`, 
                            operator: currentUser?.fullName || 'System',
                            varian: item.varian 
                        } as RiwayatStok);
                    }
                }
            });

            setLastTransaction(transaction); setCart([]); setIsCheckoutOpen(false); resetCheckoutState(); setMobilePosTab('products');
            
            setTimeout(() => {
                printToPdfNative('receipt-print-area', `Struk_${transaction.id}`);
            }, 500);

        } catch (e: any) { showAlert('Gagal Transaksi', e.message); }
    };

    // ... (Hold Cart and other helper functions remain same) ...
    const handleHoldCart = async () => {
        if (cart.length === 0) return;
        let customerName = buyerName;
        if(customerType === 'Santri') customerName = santriList.find(s => s.id === selectedSantriId)?.namaLengkap || 'Santri';
        const order: PendingOrder = { id: Date.now(), customerName: customerName || 'Pelanggan', timestamp: new Date().toISOString(), items: cart, customerType };
        await db.pendingOrders.add(order);
        setCart([]); resetCheckoutState(); showToast('Pesanan disimpan sementara.', 'info');
    };
    const handleDeletePending = async (id: number) => { await db.pendingOrders.delete(id); showToast('Pesanan pending dihapus.', 'info'); };
    const handleRecallOrder = async (order: PendingOrder) => { setCart(order.items); if(order.customerType) setCustomerType(order.customerType); await db.pendingOrders.delete(order.id); setIsPendingModalOpen(false); showToast('Pesanan dikembalikan ke keranjang.', 'success'); };

    
    return (
        <div className="flex flex-col h-[calc(100vh-140px)] gap-4">
             {/* Mobile Tabs */}
             <div className="lg:hidden flex bg-white rounded-lg shadow-sm border p-1 shrink-0 mb-1">
                <button onClick={() => setMobilePosTab('products')} className={`flex-1 py-2 text-sm font-medium rounded-md ${mobilePosTab === 'products' ? 'bg-teal-100 text-teal-700' : 'text-gray-500'}`}>Katalog</button>
                <button onClick={() => setMobilePosTab('cart')} className={`flex-1 py-2 text-sm font-medium rounded-md relative ${mobilePosTab === 'cart' ? 'bg-teal-100 text-teal-700' : 'text-gray-500'}`}>Keranjang {cart.length > 0 && <span className="absolute top-1 right-2 bg-red-500 text-white text-[10px] px-1.5 rounded-full">{cart.length}</span>}</button>
            </div>

            <div className="flex flex-grow overflow-hidden gap-4">
                {/* Product List */}
                <div className={`${mobilePosTab === 'products' ? 'flex' : 'hidden'} lg:flex flex-grow flex-col bg-white rounded-lg shadow border overflow-hidden`}>
                     <div className="p-4 border-b bg-gray-50 flex gap-4 shrink-0 items-center">
                        <div className="relative flex-grow">
                            <input ref={barcodeInputRef} type="text" placeholder="Scan Barcode / Cari Nama..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} onKeyDown={handleBarcodeScan} className="w-full pl-10 p-3 border-2 border-gray-300 rounded-lg text-sm focus:ring-teal-500 focus:border-teal-500 shadow-sm" autoFocus />
                            <i className="bi bi-upc-scan absolute left-3 top-3.5 text-gray-400 text-lg"></i>
                        </div>
                        {pendingOrders.length > 0 && (
                            <button onClick={() => setIsPendingModalOpen(true)} className="bg-orange-500 text-white px-4 py-2.5 rounded-lg font-bold text-sm shadow hover:bg-orange-600 animate-pulse relative">
                                <i className="bi bi-basket"></i>
                                <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] rounded-full w-5 h-5 flex items-center justify-center border border-white">{pendingOrders.length}</span>
                            </button>
                        )}
                    </div>
                    <div className="flex-grow overflow-y-auto p-4 bg-gray-100">
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                            {filteredProducts.map(p => {
                                const isLowStock = p.stok <= (p.minStok || 5);
                                return (
                                <div key={p.id} onClick={() => handleProductClick(p)} className={`bg-white p-3 rounded-lg border hover:shadow-lg hover:border-teal-400 cursor-pointer flex flex-col justify-between h-full transition-all active:scale-95 group relative overflow-hidden ${isLowStock ? 'ring-2 ring-red-200' : ''}`}>
                                    {isLowStock && <div className="absolute top-0 right-0 bg-red-500 text-white text-[9px] px-2 py-0.5 rounded-bl-lg font-bold">Stok {p.stok}</div>}
                                    {p.hasVarian && <div className="absolute top-0 left-0 bg-blue-500 text-white text-[9px] px-2 py-0.5 rounded-br-lg font-bold">Varian</div>}
                                    
                                    <div><div className="font-bold text-sm text-gray-800 line-clamp-2 leading-tight mb-1 group-hover:text-teal-700">{p.nama}</div><div className="text-[10px] text-gray-500 mb-2">{p.kategori}</div></div>
                                    <div className="flex justify-between items-end border-t pt-2 mt-1"><div className="text-teal-600 font-bold text-sm">{formatRupiah(p.hargaJual)}</div><div className={`text-[10px] px-1.5 rounded ${p.stok > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{p.stok}</div></div>
                                </div>
                            )})}
                            {filteredProducts.length === 0 && <div className="col-span-full text-center py-10 text-gray-400">Produk tidak ditemukan.</div>}
                        </div>
                    </div>
                </div>

                {/* Cart Section */}
                <div className={`${mobilePosTab === 'cart' ? 'flex' : 'hidden'} lg:flex w-full lg:w-96 bg-white rounded-lg shadow border flex-col h-full`}>
                     <div className="p-4 border-b bg-gray-50 font-bold text-gray-700 flex justify-between items-center shadow-sm z-10 shrink-0">
                         <span><i className="bi bi-cart4 mr-2"></i> Keranjang</span>
                         <div className="flex gap-2">
                             <button onClick={handleHoldCart} disabled={cart.length === 0} className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded hover:bg-orange-200" title="Simpan Sementara"><i className="bi bi-pause-circle-fill"></i> Simpan</button>
                             <button onClick={() => setCart([])} className="text-xs text-red-500 hover:underline">Kosongkan</button>
                         </div>
                     </div>
                     <div className="flex-grow overflow-y-auto p-2 space-y-2 bg-gray-50/50">
                        {cart.map((item, idx) => (
                            <div key={idx} className={`flex justify-between items-center p-2 bg-white rounded border hover:shadow-sm ${item.isGrosirApplied ? 'border-l-4 border-l-green-500' : ''}`}>
                                <div className="flex-grow min-w-0 pr-2">
                                    <div className="text-sm font-medium truncate">{item.nama}</div>
                                    <div className="text-xs text-gray-500 flex gap-2">
                                        {item.isGrosirApplied ? <span className="text-green-600 font-bold">Grosir</span> : ''}
                                        <span>{formatRupiah(item.harga)}</span>
                                        {item.isGrosirApplied && item.hargaAsli && <span className="line-through opacity-60">{formatRupiah(item.hargaAsli)}</span>}
                                    </div>
                                </div>
                                <div className="flex items-center gap-1"><button onClick={() => updateQty(idx, -1)} className="w-6 h-6 bg-gray-100 border rounded text-gray-600 hover:bg-gray-200">-</button><span className="text-sm font-bold w-6 text-center">{item.qty}</span><button onClick={() => updateQty(idx, 1)} className="w-6 h-6 bg-teal-600 border border-teal-600 rounded text-white hover:bg-teal-700">+</button></div>
                                <div className="text-sm font-bold text-gray-800 w-20 text-right">{formatRupiah(item.subtotal)}</div>
                            </div>
                        ))}
                         {cart.length === 0 && <div className="flex flex-col items-center justify-center h-full text-gray-400 opacity-50"><i className="bi bi-cart-x text-4xl mb-2"></i><p className="text-sm">Keranjang kosong</p></div>}
                     </div>
                     <div className="p-4 border-t bg-white shadow-[0_-5px_10px_rgba(0,0,0,0.05)] z-10 shrink-0"><div className="flex justify-between items-center mb-4"><span className="text-gray-600 font-medium">Total Belanja</span><span className="text-2xl font-bold text-teal-700">{formatRupiah(subTotal)}</span></div><button onClick={() => setIsCheckoutOpen(true)} disabled={cart.length === 0} className="w-full py-3 bg-gradient-to-r from-teal-600 to-green-600 text-white font-bold rounded-xl hover:shadow-lg transition-all transform hover:-translate-y-1 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none">BAYAR SEKARANG</button></div>
                </div>
            </div>

             {/* VARIANT MODAL */}
             {variantModalProduct && (
                 <div className="fixed inset-0 bg-black bg-opacity-70 z-[80] flex justify-center items-center p-4">
                     <div className="bg-white rounded-lg shadow-xl w-full max-w-sm">
                         <div className="p-4 border-b flex justify-between items-center">
                             <h3 className="font-bold text-lg">{variantModalProduct.nama}</h3>
                             <button onClick={() => setVariantModalProduct(null)}><i className="bi bi-x-lg"></i></button>
                         </div>
                         <div className="p-4 grid grid-cols-2 gap-3">
                             {variantModalProduct.varian?.map((v, i) => (
                                 <button key={i} onClick={() => addToCart(variantModalProduct, i)} className="border p-3 rounded-lg hover:bg-teal-50 hover:border-teal-300 text-left">
                                     <div className="font-bold text-sm">{v.nama}</div>
                                     <div className="text-xs text-gray-500 flex justify-between mt-1">
                                         <span>{formatRupiah(v.harga || variantModalProduct.hargaJual)}</span>
                                         <span>Stok: {v.stok}</span>
                                     </div>
                                 </button>
                             ))}
                         </div>
                     </div>
                 </div>
             )}
            
            {/* PENDING ORDERS MODAL */}
            {isPendingModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-70 z-[80] flex justify-center items-center p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[80vh] flex flex-col">
                        <div className="p-4 border-b flex justify-between items-center">
                            <h3 className="font-bold text-gray-800">Daftar Pesanan Disimpan</h3>
                            <button onClick={() => setIsPendingModalOpen(false)}><i className="bi bi-x-lg"></i></button>
                        </div>
                        <div className="flex-grow overflow-y-auto p-4 space-y-3">
                            {pendingOrders.map(order => (
                                <div key={order.id} className="border p-3 rounded-lg hover:shadow-md transition-shadow bg-gray-50">
                                    <div className="flex justify-between items-start mb-2">
                                        <div><div className="font-bold text-gray-800">{order.customerName}</div><div className="text-xs text-gray-500">{new Date(order.timestamp).toLocaleString()}</div></div>
                                        <button onClick={() => handleDeletePending(order.id)} className="text-red-500 hover:text-red-700"><i className="bi bi-trash"></i></button>
                                    </div>
                                    <div className="text-sm text-gray-600 mb-3 line-clamp-2">{order.items.map(i => `${i.nama} (${i.qty})`).join(', ')}</div>
                                    <button onClick={() => handleRecallOrder(order)} className="w-full bg-blue-600 text-white py-1.5 rounded text-sm font-bold hover:bg-blue-700">Buka Pesanan</button>
                                </div>
                            ))}
                            {pendingOrders.length === 0 && <p className="text-center text-gray-500 py-4">Tidak ada pesanan disimpan.</p>}
                        </div>
                    </div>
                </div>
            )}

            {/* CHECKOUT MODAL */}
             {isCheckoutOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-70 z-[80] flex justify-center items-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden animate-fade-in-down">
                        <div className="p-4 border-b bg-teal-700 text-white flex justify-between items-center shrink-0">
                            <h3 className="font-bold text-lg"><i className="bi bi-wallet2 mr-2"></i> Checkout & Pembayaran</h3>
                            <button onClick={() => setIsCheckoutOpen(false)}><i className="bi bi-x-lg text-lg"></i></button>
                        </div>
                        <div className="flex flex-col lg:flex-row flex-grow overflow-hidden">
                             <div className="w-full lg:w-1/2 p-5 border-r bg-gray-50 flex flex-col overflow-hidden">
                                <div className="mb-4"><label className="block text-xs font-bold text-gray-500 uppercase mb-2">Tipe Pelanggan</label><div className="flex p-1 bg-gray-200 rounded-lg">{(['Santri', 'Guru', 'Umum'] as const).map(type => (<button key={type} onClick={() => { setCustomerType(type); resetCheckoutState(); }} className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${customerType === type ? 'bg-white shadow text-teal-700' : 'text-gray-500 hover:text-gray-700'}`}>{type}</button>))}</div></div>
                                {customerType === 'Santri' ? (
                                    <div className="flex flex-col flex-grow min-h-0">
                                        <div className="grid grid-cols-3 gap-2 mb-2"><select onChange={e => {setFilterJenjang(Number(e.target.value)); setFilterKelas(0); setFilterRombel(0);}} className="border rounded p-1 text-xs"><option value={0}>Semua Jenjang</option>{settings.jenjang.map(j => <option key={j.id} value={j.id}>{j.nama}</option>)}</select><select onChange={e => setFilterKelas(Number(e.target.value))} className="border rounded p-1 text-xs"><option value={0}>Semua Kelas</option>{settings.kelas.filter(k => !filterJenjang || k.jenjangId === filterJenjang).map(k => <option key={k.id} value={k.id}>{k.nama}</option>)}</select><select onChange={e => setFilterRombel(Number(e.target.value))} className="border rounded p-1 text-xs"><option value={0}>Semua Rombel</option>{settings.rombel.filter(r => !filterKelas || r.kelasId === filterKelas).map(r => <option key={r.id} value={r.id}>{r.nama}</option>)}</select></div>
                                        <div className="relative mb-2"><input type="text" value={santriSearchTerm} onChange={e => setSantriSearchTerm(e.target.value)} className="w-full border rounded p-2 pl-8 text-sm" placeholder="Cari Nama Santri..." /><i className="bi bi-search absolute left-2.5 top-2.5 text-gray-400"></i></div>
                                        <div className="flex-grow overflow-y-auto border rounded bg-white">
                                            {filteredSantriList.map(s => (<div key={s.id} onClick={() => setSelectedSantriId(s.id)} className={`p-2 border-b cursor-pointer hover:bg-teal-50 flex justify-between items-center ${selectedSantriId === s.id ? 'bg-teal-100' : ''}`}><div><div className="font-bold text-sm text-gray-800">{s.namaLengkap}</div><div className="text-xs text-gray-500">{settings.rombel.find(r=>r.id===s.rombelId)?.nama}</div></div>{selectedSantriId === s.id && <i className="bi bi-check-circle-fill text-teal-600"></i>}</div>))}
                                        </div>
                                        {selectedSantriId && <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">Saldo Santri: <strong>{formatRupiah(saldoSantriList.find(s => s.santriId === selectedSantriId)?.saldo || 0)}</strong></div>}
                                    </div>
                                ) : (
                                    <div>
                                        <label className="block text-xs font-bold text-gray-600 mb-1">Nama Pembeli</label>
                                        <input type="text" value={buyerName} onChange={e => setBuyerName(e.target.value)} className="w-full border rounded p-2 text-sm mb-2" placeholder="Nama..." />
                                        {paymentMethod === 'Hutang' && (
                                            <>
                                                <label className="block text-xs font-bold text-red-600 mb-1">No. HP (Wajib untuk Hutang)</label>
                                                <input type="text" value={buyerPhone} onChange={e => setBuyerPhone(e.target.value)} className="w-full border rounded p-2 text-sm border-red-200" placeholder="08..." />
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>
                            <div className="w-full lg:w-1/2 p-5 flex flex-col bg-white">
                                <div className="text-center mb-6">
                                    <div className="text-gray-500 text-xs uppercase mb-1">Total Belanja</div>
                                    <div className="text-3xl font-bold text-gray-800">{formatRupiah(subTotal)}</div>
                                </div>
                                
                                {/* Discount Selector */}
                                <div className="mb-4">
                                    <label className="block text-xs font-bold text-gray-600 mb-1">Diskon / Voucher</label>
                                    <select value={selectedDiskonId || ''} onChange={e => setSelectedDiskonId(Number(e.target.value) || null)} className="w-full border rounded p-2 text-sm bg-yellow-50 focus:ring-yellow-500">
                                        <option value="">- Tidak Ada -</option>
                                        {activeDiscounts.map(d => (
                                            <option key={d.id} value={d.id}>{d.nama} ({d.tipe === 'Nominal' ? formatRupiah(d.nilai) : `${d.nilai}%`})</option>
                                        ))}
                                    </select>
                                    {discountAmount > 0 && <div className="text-right text-sm text-green-600 font-bold mt-1">- {formatRupiah(discountAmount)}</div>}
                                </div>

                                <div className="border-t border-b py-3 mb-4 flex justify-between items-center bg-gray-50 px-2 rounded">
                                    <span className="font-bold text-gray-700">Total Akhir:</span>
                                    <span className="text-2xl font-bold text-teal-700">{formatRupiah(finalTotal)}</span>
                                </div>

                                {/* Payment Method */}
                                <div className="mb-4">
                                    <label className="block text-xs font-bold text-gray-600 mb-2">Metode Pembayaran</label>
                                    <div className="grid grid-cols-4 gap-2">
                                        <button onClick={() => setPaymentMethod('Tunai')} className={`py-2 text-xs font-bold rounded border ${paymentMethod === 'Tunai' ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-600'}`}>Tunai</button>
                                        <button onClick={() => setPaymentMethod('Non-Tunai')} className={`py-2 text-xs font-bold rounded border ${paymentMethod === 'Non-Tunai' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600'}`}>Qris/Trf</button>
                                        <button onClick={() => setPaymentMethod('Tabungan')} disabled={customerType !== 'Santri'} className={`py-2 text-xs font-bold rounded border ${paymentMethod === 'Tabungan' ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-gray-600 disabled:bg-gray-100 disabled:text-gray-300'}`}>Tabungan</button>
                                        <button onClick={() => setPaymentMethod('Hutang')} className={`py-2 text-xs font-bold rounded border ${paymentMethod === 'Hutang' ? 'bg-red-600 text-white border-red-600' : 'bg-white text-gray-600'}`}>Hutang</button>
                                    </div>
                                </div>

                                {paymentMethod === 'Tunai' && (
                                    <div className="mb-4"><label className="block text-xs font-bold text-gray-600 mb-1">Uang Diterima</label><input type="number" value={cashReceived || ''} onChange={e => setCashReceived(Number(e.target.value))} className="w-full border-2 border-gray-300 rounded-lg p-3 text-xl font-bold text-gray-800 focus:border-teal-500 focus:outline-none" placeholder="0" />
                                        <div className="grid grid-cols-4 gap-2 mt-2">
                                            {[10000, 20000, 50000, 100000].map(amt => (<button key={amt} onClick={() => setCashReceived(amt)} className="bg-gray-100 hover:bg-gray-200 border rounded py-1 text-xs font-medium text-gray-700">{amt/1000}k</button>))}
                                            <button onClick={() => setCashReceived(finalTotal)} className="col-span-4 bg-blue-50 text-blue-700 border border-blue-200 py-1 text-xs font-bold rounded hover:bg-blue-100">Uang Pas</button>
                                        </div>
                                    </div>
                                )}
                                
                                {(paymentMethod === 'Non-Tunai' || paymentMethod === 'Hutang') && (
                                     <div className="mb-4"><label className="block text-xs font-bold text-gray-600 mb-1">{paymentMethod === 'Hutang' ? 'Catatan Kasbon' : 'Ref / Nama Bank'}</label><input type="text" value={paymentRef} onChange={e => setPaymentRef(e.target.value)} className="w-full border rounded-lg p-2 text-sm" placeholder={paymentMethod === 'Hutang' ? 'Janji bayar tgl...' : 'BCA / Mandiri'} /></div>
                                )}

                                {paymentMethod === 'Tunai' && (
                                    <div className="bg-gray-50 p-4 rounded-lg border mb-4"><div className="flex justify-between items-center text-sm"><span className="text-gray-600">Kembalian:</span><span className={`font-bold text-lg ${cashReceived >= finalTotal ? 'text-green-600' : 'text-red-500'}`}>{formatRupiah(Math.max(0, cashReceived - finalTotal))}</span></div>
                                        {customerType === 'Santri' && cashReceived > finalTotal && (<div className="mt-3 pt-3 border-t border-gray-200"><label className="flex items-center cursor-pointer gap-2 select-none"><input type="checkbox" checked={saveChangeToBalance} onChange={e => setSaveChangeToBalance(e.target.checked)} className="w-5 h-5 text-teal-600 rounded focus:ring-teal-500"/><span className="text-sm font-medium text-teal-800">Simpan kembalian ke Tabungan?</span></label></div>)}
                                    </div>
                                )}

                                <div className="mt-auto"><button onClick={handleCheckout} className="w-full py-4 bg-teal-600 text-white font-bold rounded-xl shadow-lg hover:bg-teal-700 text-lg flex justify-center items-center gap-2"><i className="bi bi-printer-fill"></i> PROSES & CETAK</button></div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            
            <div className="hidden print:block">
                <div id="receipt-print-area">
                    {lastTransaction && <StrukPreview transaksi={lastTransaction} settings={kopSettings} />}
                </div>
            </div>
        </div>
    );
}
