import React, { useState, useMemo, useRef, useEffect } from 'react';
import { ProdukKoperasi, CartItem } from '../../../types';
import { formatRupiah } from '../../../utils/formatters';

interface ProductGridProps {
    products: ProdukKoperasi[];
    cart?: CartItem[];
    onProductClick: (product: ProdukKoperasi) => void;
    onPendingClick: () => void;
    pendingCount: number;
}

export const ProductGrid: React.FC<ProductGridProps> = ({ products, cart = [], onProductClick, onPendingClick, pendingCount }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('Semua');
    const barcodeInputRef = useRef<HTMLInputElement>(null);

    // Auto focus on mount only on desktop so mobile virtual keyboard doesn't pop up unexpectedly
    useEffect(() => {
        if (window.innerWidth >= 1024 && barcodeInputRef.current) {
            barcodeInputRef.current.focus();
        }
    }, []);

    const categories = useMemo(() => {
        const set = new Set<string>();
        products.forEach(p => {
            if (p.kategori?.trim()) set.add(p.kategori.trim());
        });
        return ['Semua', ...Array.from(set).sort()];
    }, [products]);

    const cartQtyByProduct = useMemo(() => {
        const map = new Map<number, number>();
        cart.forEach(item => {
            map.set(item.produkId, (map.get(item.produkId) || 0) + item.qty);
        });
        return map;
    }, [cart]);

    const filteredProducts = useMemo(() => {
        return products.filter(p => {
            const matchCat = selectedCategory === 'Semua' || p.kategori === selectedCategory;
            if (!matchCat) return false;
            if (!searchQuery) return true;
            const lower = searchQuery.toLowerCase();
            return p.nama.toLowerCase().includes(lower) || p.barcode?.toLowerCase() === lower;
        });
    }, [products, searchQuery, selectedCategory]);

    const handleBarcodeScan = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const barcode = searchQuery.trim();
            if (!barcode) return;
            const product = products.find(p => p.barcode === barcode);
            if (product) {
                onProductClick(product);
                setSearchQuery('');
            }
        }
    };

    return (
        <div className="flex flex-col h-full bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
            {/* Search & Pending Bar */}
            <div className="p-3 sm:p-4 border-b border-slate-200 bg-slate-50/70 space-y-2.5 shrink-0">
                <div className="flex gap-2.5 items-center">
                    <div className="relative flex-grow">
                        <input 
                            ref={barcodeInputRef} 
                            type="text" 
                            placeholder="Scan Barcode / Cari Nama Barang..." 
                            value={searchQuery} 
                            onChange={e => setSearchQuery(e.target.value)} 
                            onKeyDown={handleBarcodeScan} 
                            className="w-full pl-10 pr-9 py-2.5 min-h-[44px] border border-slate-300 bg-white rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors" 
                        />
                        <i className="bi bi-upc-scan absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-lg"></i>
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={() => setSearchQuery('')}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center text-slate-400 hover:text-slate-600"
                            >
                                <i className="bi bi-x-circle-fill"></i>
                            </button>
                        )}
                    </div>
                    {pendingCount > 0 && (
                        <button 
                            onClick={onPendingClick} 
                            className="bg-amber-500 text-white px-3.5 min-h-[44px] rounded-xl font-bold text-sm shadow-xs hover:bg-amber-600 relative transition-transform active:scale-95 shrink-0 flex items-center gap-1.5"
                            title="Pesanan Disimpan"
                        >
                            <i className="bi bi-basket text-base"></i>
                            <span className="hidden sm:inline text-xs">Tunggu</span>
                            <span className="bg-red-600 text-white text-[11px] tabular-nums rounded-full min-w-[20px] h-5 px-1 flex items-center justify-center border border-white">
                                {pendingCount}
                            </span>
                        </button>
                    )}
                </div>

                {/* Touch-Friendly Category Filter Rail */}
                {categories.length > 1 && (
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
                        {categories.map(cat => {
                            const active = selectedCategory === cat;
                            return (
                                <button
                                    key={cat}
                                    type="button"
                                    onClick={() => setSelectedCategory(cat)}
                                    className={`px-3 py-1.5 min-h-[36px] rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                                        active
                                            ? 'bg-teal-600 text-white shadow-2xs'
                                            : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                                    }`}
                                >
                                    {cat}
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>
            
            {/* Product Grid */}
            <div className="flex-grow overflow-y-auto p-3 sm:p-4 bg-slate-50/50 custom-scrollbar">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-4 gap-2.5 sm:gap-3">
                    {filteredProducts.map(p => {
                        const isLowStock = p.stok <= (p.minStok || 5);
                        const isOutOfStock = p.stok <= 0;
                        const inCartQty = cartQtyByProduct.get(p.id) || 0;

                        return (
                            <button
                                type="button"
                                key={p.id} 
                                onClick={() => onProductClick(p)} 
                                className={`text-left bg-white p-3 rounded-xl border transition-all active:scale-[0.98] flex flex-col justify-between min-h-[112px] relative overflow-hidden group ${
                                    inCartQty > 0
                                        ? 'border-teal-600 ring-2 ring-teal-500/20 bg-teal-50/10'
                                        : isOutOfStock
                                        ? 'border-slate-200 opacity-60'
                                        : isLowStock
                                        ? 'border-red-200 hover:border-teal-500'
                                        : 'border-slate-200 hover:border-teal-500 hover:shadow-sm'
                                }`}
                            >
                                <div>
                                    <div className="flex items-start justify-between gap-1.5 mb-1">
                                        <span className="text-[11px] text-slate-500 truncate">
                                            {p.kategori}
                                            {p.hasVarian ? ' · Varian' : ''}
                                        </span>
                                        {inCartQty > 0 && (
                                            <span className="bg-teal-600 text-white text-[11px] font-bold tabular-nums px-1.5 py-0.5 rounded-md shrink-0">
                                                {inCartQty}x
                                            </span>
                                        )}
                                    </div>
                                    <div className="font-semibold text-sm text-slate-800 line-clamp-2 leading-snug group-hover:text-teal-700">
                                        {p.nama}
                                    </div>
                                </div>

                                <div className="flex justify-between items-end border-t border-slate-100 pt-2 mt-2.5 w-full">
                                    <div className="text-teal-700 font-bold text-sm tabular-nums">
                                        {formatRupiah(p.hargaJual)}
                                    </div>
                                    <div className={`text-[11px] tabular-nums font-medium ${
                                        isOutOfStock ? 'text-red-600 font-bold' : isLowStock ? 'text-amber-700 font-semibold' : 'text-slate-500'
                                    }`}>
                                        {isOutOfStock ? 'Habis' : `Stok ${p.stok}`}
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                    {filteredProducts.length === 0 && (
                        <div className="col-span-full text-center py-12 text-slate-400 flex flex-col items-center">
                            <i className="bi bi-search text-3xl mb-2 opacity-50"></i>
                            <p className="text-sm">Produk tidak ditemukan.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
