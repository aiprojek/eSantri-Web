
import React, { useState, useEffect, useMemo } from 'react';
import { useLiveQuery } from "dexie-react-hooks";
import { db } from '../../db';
import { useAppContext } from '../../AppContext';
import { useSantriContext } from '../../contexts/SantriContext';
import { useFinanceContext } from '../../contexts/FinanceContext';
import { ProdukKoperasi, TransaksiKoperasi, CartItem, RiwayatStok, PendingOrder } from '../../types';
import { printToPdfNative } from '../../utils/pdfGenerator';
import { StrukPreview, KoperasiSettings, DEFAULT_KOP_SETTINGS } from './Shared';

// Sub Components
import { ProductGrid } from './pos/ProductGrid';
import { CartSidebar } from './pos/CartSidebar';
import { CheckoutModal } from './pos/CheckoutModal';
import { VariantModal } from './pos/VariantModal';
import { PendingOrdersModal } from './pos/PendingOrdersModal';

export const PosInterface: React.FC = () => {
    // FIX: Menambahkan 'settings' yang sebelumnya tertinggal
    const { showToast, showAlert, currentUser, settings } = useAppContext();
    const { santriList } = useSantriContext();
    const { saldoSantriList, onAddTransaksiSaldo, onAddTransaksiKas } = useFinanceContext();
    
    // Live Queries
    const products = useLiveQuery(() => db.produkKoperasi.filter(p => !p.deleted && p.stok > 0).toArray(), []) || [];
    const pendingOrders = useLiveQuery(() => db.pendingOrders.toArray(), []) || []; 
    const activeDiscounts = useLiveQuery(() => db.diskon.filter(d => d.aktif).toArray(), []) || [];

    // State
    const [cart, setCart] = useState<CartItem[]>([]);
    const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
    const [isPendingModalOpen, setIsPendingModalOpen] = useState(false);
    const [variantModalProduct, setVariantModalProduct] = useState<ProdukKoperasi | null>(null);
    const [lastTransaction, setLastTransaction] = useState<TransaksiKoperasi | null>(null);
    const [kopSettings, setKopSettings] = useState<KoperasiSettings>(DEFAULT_KOP_SETTINGS);
    
    // Mobile Layout State
    const [mobilePosTab, setMobilePosTab] = useState<'products' | 'cart'>('products');

    useEffect(() => {
        const saved = localStorage.getItem('esantri_koperasi_settings');
        if (saved) setKopSettings(JSON.parse(saved));
    }, []);

    // --- CART LOGIC ---
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
                const newQty = existing.qty + 1;
                
                // Wholesale Logic
                let newPrice = existing.hargaAsli || existing.harga;
                let isGrosir = false;
                if (!variantName && product.grosir && product.grosir.length > 0) {
                     const applicableTier = product.grosir
                        .filter(t => newQty >= t.minQty)
                        .sort((a,b) => b.minQty - a.minQty)[0];
                     
                     if (applicableTier) {
                         newPrice = applicableTier.harga;
                         isGrosir = true;
                     }
                }

                const newCart = [...prev];
                newCart[existingIdx] = { ...existing, qty: newQty, harga: newPrice, subtotal: newQty * newPrice, isGrosirApplied: isGrosir };
                return newCart;
            }
            
            return [...prev, { 
                produkId: product.id, nama: name, harga: price, hargaAsli: price, qty: 1, subtotal: price, stokTersedia: stockAvailable, varian: variantName 
            }];
        });
        showToast(`+1 ${name}`, 'success');
        setVariantModalProduct(null);
    };

    const updateQty = (idx: number, delta: number) => {
        setCart(prev => {
            const item = prev[idx];
            const newQty = item.qty + delta;
            if (newQty <= 0) return prev.filter((_, i) => i !== idx);
            if (newQty > item.stokTersedia) {
                showToast('Stok tidak mencukupi', 'error');
                return prev;
            }

            let newPrice = item.hargaAsli || item.harga;
            let isGrosir = false;
            const product = products.find(p => p.id === item.produkId);
            
            if (product && !item.varian && product.grosir && product.grosir.length > 0) {
                 const applicableTier = product.grosir.filter(t => newQty >= t.minQty).sort((a,b) => b.minQty - a.minQty)[0];
                 if (applicableTier) { newPrice = applicableTier.harga; isGrosir = true; }
            }

            const newCart = [...prev];
            newCart[idx] = { ...item, qty: newQty, harga: newPrice, subtotal: newQty * newPrice, isGrosirApplied: isGrosir };
            return newCart;
        });
    };

    const subTotal = useMemo(() => cart.reduce((sum, item) => sum + item.subtotal, 0), [cart]);

    // --- HANDLERS ---
    const handleProductClick = (product: ProdukKoperasi) => {
        if (product.hasVarian) {
            setVariantModalProduct(product);
        } else {
            addToCart(product);
        }
    };

    const handlePendingAction = async (action: 'save' | 'recall' | 'delete', order?: PendingOrder) => {
        if (action === 'save') {
            if (cart.length === 0) return;
            const orderData: PendingOrder = { id: Date.now(), customerName: 'Pelanggan', timestamp: new Date().toISOString(), items: cart };
            await db.pendingOrders.add(orderData);
            setCart([]); showToast('Pesanan disimpan.', 'info');
        } else if (action === 'recall' && order) {
            setCart(order.items);
            await db.pendingOrders.delete(order.id);
            setIsPendingModalOpen(false);
            showToast('Pesanan dikembalikan.', 'success');
        } else if (action === 'delete' && order) {
            await db.pendingOrders.delete(order.id);
            showToast('Pesanan dihapus.', 'info');
        }
    };

    const handleTransactionSubmit = async (data: any) => {
        try {
            // Process Payments (Finance & Saldo)
            let finalBayar = 0;
            let finalKembali = 0;
            
            const buyerLabel = data.customerType === 'Santri' 
                ? (santriList.find(s => s.id === data.selectedSantriId)?.namaLengkap || 'Santri') 
                : (data.buyerName || 'Umum');
            
            if (data.customerType === 'Umum' && data.paymentMethod === 'Hutang') {
                // Label including Phone for 'Umum' debt
                // buyerLabel is handled in display logic, but name stored cleanly
            }

            if (data.customerType === 'Santri' && data.paymentMethod === 'Tabungan') {
                const saldo = saldoSantriList.find(s => s.santriId === data.selectedSantriId)?.saldo || 0;
                if (saldo < data.finalTotal) throw new Error("Saldo tidak cukup.");
                
                await onAddTransaksiSaldo({ santriId: data.selectedSantriId, jenis: 'Penarikan', jumlah: data.finalTotal, keterangan: `Belanja Koperasi` });
                finalBayar = data.finalTotal;
            } else if (data.paymentMethod === 'Hutang') {
                finalBayar = 0; 
                finalKembali = 0;
            } else {
                // Tunai / Non-Tunai
                if (data.paymentMethod === 'Tunai') {
                    finalBayar = data.cashReceived;
                    finalKembali = data.kembalian;
                    await onAddTransaksiKas({ jenis: 'Pemasukan', kategori: 'Penjualan Koperasi', deskripsi: `Penjualan Tunai ${buyerLabel}`, jumlah: data.finalTotal, penanggungJawab: currentUser?.fullName || 'Kasir' });
                } else {
                    finalBayar = data.finalTotal;
                    await onAddTransaksiKas({ jenis: 'Pemasukan', kategori: 'Penjualan Koperasi (Non-Tunai)', deskripsi: `Penjualan ${data.paymentMethod} ${buyerLabel} Ref:${data.paymentRef}`, jumlah: data.finalTotal, penanggungJawab: currentUser?.fullName || 'Kasir' });
                }

                // Auto Deposit Change
                if (data.customerType === 'Santri' && data.selectedSantriId && data.saveChangeToBalance && finalKembali > 0) {
                    await onAddTransaksiSaldo({ santriId: data.selectedSantriId, jenis: 'Deposit', jumlah: finalKembali, keterangan: 'Kembalian Belanja' });
                }
            }

            const discountObj = activeDiscounts.find(d => d.id === data.selectedDiskonId);
            const isHutang = data.paymentMethod === 'Hutang';
            const transactionName = (data.customerType === 'Umum' && isHutang) ? `${data.buyerName} (${data.buyerPhone})` : buyerLabel;

            const transaction: TransaksiKoperasi = {
                id: Date.now(),
                tanggal: new Date().toISOString(),
                tipePembeli: data.customerType,
                pembeliId: data.selectedSantriId || undefined,
                namaPembeli: transactionName,
                metodePembayaran: data.paymentMethod,
                catatanPembayaran: data.paymentRef,
                items: [...cart],
                totalBelanja: subTotal,
                diskonId: data.selectedDiskonId || undefined,
                diskonNama: discountObj?.nama,
                potonganDiskon: data.discountAmount,
                totalFinal: data.finalTotal,
                
                bayar: isHutang ? 0 : finalBayar,
                kembali: isHutang ? 0 : finalKembali,
                kembalianMasukSaldo: data.saveChangeToBalance && finalKembali > 0,
                
                statusTransaksi: isHutang ? 'Belum Lunas' : 'Lunas',
                sisaTagihan: isHutang ? data.finalTotal : 0,

                kasir: currentUser?.fullName || 'Admin',
                lastModified: Date.now()
            };

            // DB Transaction
            await (db as any).transaction('rw', db.produkKoperasi, db.riwayatStok, db.transaksiKoperasi, async () => {
                await db.transaksiKoperasi.add(transaction);
                for (const item of cart) {
                   const product = await db.produkKoperasi.get(item.produkId);
                   if (product) {
                       const newStok = product.stok - item.qty;
                       
                       let updatedVarian = product.varian;
                       if (item.varian && updatedVarian) {
                            updatedVarian = updatedVarian.map(v => v.nama === item.varian ? { ...v, stok: v.stok - item.qty } : v);
                       }

                       await db.produkKoperasi.update(item.produkId, { stok: newStok, varian: updatedVarian, lastModified: Date.now() });
                       
                       await db.riwayatStok.add({ 
                           produkId: product.id, 
                           tanggal: transaction.tanggal, 
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

           setLastTransaction(transaction);
           setCart([]);
           setIsCheckoutOpen(false);
           setMobilePosTab('products');
           
           setTimeout(() => {
               printToPdfNative('receipt-print-area', `Struk_${transaction.id}`);
           }, 500);

        } catch (e: any) {
            showAlert('Gagal Transaksi', e.message);
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-140px)] gap-4">
            {/* Mobile Tabs */}
            <div className="lg:hidden flex bg-white rounded-lg shadow-sm border p-1 shrink-0 mb-1">
                <button onClick={() => setMobilePosTab('products')} className={`flex-1 py-2 text-sm font-medium rounded-md ${mobilePosTab === 'products' ? 'bg-teal-100 text-teal-700' : 'text-gray-500'}`}>Katalog</button>
                <button onClick={() => setMobilePosTab('cart')} className={`flex-1 py-2 text-sm font-medium rounded-md relative ${mobilePosTab === 'cart' ? 'bg-teal-100 text-teal-700' : 'text-gray-500'}`}>Keranjang {cart.length > 0 && <span className="absolute top-1 right-2 bg-red-500 text-white text-[10px] px-1.5 rounded-full">{cart.length}</span>}</button>
            </div>

            <div className="flex flex-grow overflow-hidden gap-4">
                <div className={`${mobilePosTab === 'products' ? 'flex' : 'hidden'} lg:flex flex-grow flex-col h-full`}>
                    <ProductGrid 
                        products={products} 
                        onProductClick={handleProductClick} 
                        onPendingClick={() => setIsPendingModalOpen(true)}
                        pendingCount={pendingOrders.length}
                    />
                </div>
                
                <div className={`${mobilePosTab === 'cart' ? 'flex' : 'hidden'} lg:flex shrink-0 h-full`}>
                    <CartSidebar 
                        cart={cart}
                        subTotal={subTotal}
                        onUpdateQty={updateQty}
                        onClear={() => setCart([])}
                        onHold={() => handlePendingAction('save')}
                        onCheckout={() => setIsCheckoutOpen(true)}
                    />
                </div>
            </div>

            {/* Modals */}
            <VariantModal 
                product={variantModalProduct}
                onClose={() => setVariantModalProduct(null)}
                onSelect={(p, idx) => addToCart(p, idx)}
            />
            
            <PendingOrdersModal 
                isOpen={isPendingModalOpen}
                onClose={() => setIsPendingModalOpen(false)}
                orders={pendingOrders}
                onRecall={(order) => handlePendingAction('recall', order)}
                onDelete={(id) => handlePendingAction('delete', { id } as any)}
            />

            <CheckoutModal 
                isOpen={isCheckoutOpen}
                onClose={() => setIsCheckoutOpen(false)}
                totalAmount={subTotal}
                santriList={santriList}
                saldoList={saldoSantriList}
                discounts={activeDiscounts}
                settings={settings}
                onProcess={handleTransactionSubmit}
            />

            {/* Hidden Print Area */}
            <div className="hidden print:block">
                <div id="receipt-print-area">
                    {lastTransaction && <StrukPreview transaksi={lastTransaction} settings={kopSettings} />}
                </div>
            </div>
        </div>
    );
};
