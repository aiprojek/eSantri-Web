
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { ProdukKoperasi } from '../../../types';
import { formatRupiah } from '../../../utils/formatters';

interface ProductGridProps {
    products: ProdukKoperasi[];
    onProductClick: (product: ProdukKoperasi) => void;
    onPendingClick: () => void;
    pendingCount: number;
}

export const ProductGrid: React.FC<ProductGridProps> = ({ products, onProductClick, onPendingClick, pendingCount }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const barcodeInputRef = useRef<HTMLInputElement>(null);

    // Auto focus on mount
    useEffect(() => {
        if (barcodeInputRef.current) barcodeInputRef.current.focus();
    }, []);

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
            // Exact match for barcode
            const product = products.find(p => p.barcode === barcode);
            if (product) {
                onProductClick(product);
                setSearchQuery('');
            }
        }
    };

    return (
        <div className="flex flex-col h-full bg-white rounded-lg shadow border overflow-hidden">
             <div className="p-4 border-b bg-gray-50 flex gap-4 shrink-0 items-center">
                <div className="relative flex-grow">
                    <input 
                        ref={barcodeInputRef} 
                        type="text" 
                        placeholder="Scan Barcode / Cari Nama..." 
                        value={searchQuery} 
                        onChange={e => setSearchQuery(e.target.value)} 
                        onKeyDown={handleBarcodeScan} 
                        className="w-full pl-10 p-3 border-2 border-gray-300 rounded-lg text-sm focus:ring-teal-500 focus:border-teal-500 shadow-sm transition-colors" 
                        autoFocus 
                    />
                    <i className="bi bi-upc-scan absolute left-3 top-3.5 text-gray-400 text-lg"></i>
                </div>
                {pendingCount > 0 && (
                    <button 
                        onClick={onPendingClick} 
                        className="bg-orange-500 text-white px-4 py-2.5 rounded-lg font-bold text-sm shadow hover:bg-orange-600 animate-pulse relative transition-transform active:scale-95"
                        title="Pesanan Disimpan"
                    >
                        <i className="bi bi-basket"></i>
                        <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] rounded-full w-5 h-5 flex items-center justify-center border border-white">
                            {pendingCount}
                        </span>
                    </button>
                )}
            </div>
            
            <div className="flex-grow overflow-y-auto p-4 bg-gray-100 custom-scrollbar">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {filteredProducts.map(p => {
                        const isLowStock = p.stok <= (p.minStok || 5);
                        return (
                        <div 
                            key={p.id} 
                            onClick={() => onProductClick(p)} 
                            className={`bg-white p-3 rounded-lg border hover:shadow-lg hover:border-teal-400 cursor-pointer flex flex-col justify-between h-full transition-all active:scale-95 group relative overflow-hidden ${isLowStock ? 'ring-2 ring-red-200' : ''}`}
                        >
                            {isLowStock && <div className="absolute top-0 right-0 bg-red-500 text-white text-[9px] px-2 py-0.5 rounded-bl-lg font-bold">Stok {p.stok}</div>}
                            {p.hasVarian && <div className="absolute top-0 left-0 bg-blue-500 text-white text-[9px] px-2 py-0.5 rounded-br-lg font-bold">Varian</div>}
                            
                            <div>
                                <div className="font-bold text-sm text-gray-800 line-clamp-2 leading-tight mb-1 group-hover:text-teal-700">{p.nama}</div>
                                <div className="text-[10px] text-gray-500 mb-2">{p.kategori}</div>
                            </div>
                            <div className="flex justify-between items-end border-t pt-2 mt-1">
                                <div className="text-teal-600 font-bold text-sm">{formatRupiah(p.hargaJual)}</div>
                                <div className={`text-[10px] px-1.5 rounded font-medium ${p.stok > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{p.stok}</div>
                            </div>
                        </div>
                    )})}
                    {filteredProducts.length === 0 && (
                        <div className="col-span-full text-center py-10 text-gray-400 flex flex-col items-center">
                            <i className="bi bi-search text-3xl mb-2 opacity-50"></i>
                            <p>Produk tidak ditemukan.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
