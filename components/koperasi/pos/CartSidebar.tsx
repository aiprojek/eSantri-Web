import React from 'react';
import { CartItem } from '../../../types';
import { formatRupiah } from '../../../utils/formatters';

interface CartSidebarProps {
    cart: CartItem[];
    subTotal: number;
    onUpdateQty: (index: number, delta: number) => void;
    onClear: () => void;
    onHold: () => void;
    onCheckout: () => void;
    onCloseMobile?: () => void;
}

export const CartSidebar: React.FC<CartSidebarProps> = ({
    cart,
    subTotal,
    onUpdateQty,
    onClear,
    onHold,
    onCheckout,
    onCloseMobile
}) => {
    const totalItems = cart.reduce((acc, item) => acc + item.qty, 0);

    return (
        <div className="w-full lg:w-96 bg-white rounded-t-2xl lg:rounded-xl shadow-xs border border-slate-200 flex flex-col h-full overflow-hidden">
            {/* Header */}
            <div className="p-3.5 sm:p-4 border-b border-slate-200 bg-slate-50 font-bold text-slate-800 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-2">
                    <i className="bi bi-cart4 text-teal-600 text-lg"></i>
                    <span>Keranjang</span>
                    {totalItems > 0 && (
                        <span className="text-xs font-semibold text-slate-500 tabular-nums">
                            ({totalItems} item)
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <button 
                        type="button"
                        onClick={onHold} 
                        disabled={cart.length === 0} 
                        className="text-xs bg-amber-100 text-amber-800 px-2.5 py-1.5 min-h-[36px] rounded-lg hover:bg-amber-200 transition-colors disabled:opacity-40 font-semibold flex items-center gap-1 whitespace-nowrap" 
                        title="Simpan Sementara"
                    >
                        <i className="bi bi-pause-circle-fill"></i> Simpan
                    </button>
                    <button 
                        type="button"
                        onClick={onClear} 
                        disabled={cart.length === 0}
                        className="text-xs text-red-600 hover:bg-red-50 px-2.5 py-1.5 min-h-[36px] rounded-lg transition-colors disabled:opacity-40 font-semibold whitespace-nowrap"
                    >
                        Kosongkan
                    </button>
                    {onCloseMobile && (
                        <button
                            type="button"
                            onClick={onCloseMobile}
                            className="lg:hidden w-9 h-9 rounded-lg bg-slate-200/70 text-slate-700 flex items-center justify-center hover:bg-slate-300"
                            aria-label="Tutup Keranjang"
                        >
                            <i className="bi bi-x-lg"></i>
                        </button>
                    )}
                </div>
            </div>
            
            {/* Cart Items List */}
            <div className="flex-grow overflow-y-auto p-3 space-y-2 bg-slate-50/50 custom-scrollbar">
                {cart.map((item, idx) => (
                    <div
                        key={idx}
                        className={`flex justify-between items-center p-2.5 bg-white rounded-xl border border-slate-200 transition-shadow ${
                            item.isGrosirApplied ? 'border-l-4 border-l-emerald-500' : ''
                        }`}
                    >
                        <div className="flex-grow min-w-0 pr-2">
                            <div className="text-sm font-semibold text-slate-800 truncate" title={item.nama}>
                                {item.nama}
                            </div>
                            <div className="text-xs text-slate-500 flex gap-1.5 items-center tabular-nums mt-0.5">
                                {item.isGrosirApplied && (
                                    <span className="text-emerald-700 font-bold">Grosir ·</span>
                                )}
                                <span>{formatRupiah(item.harga)}</span>
                                {item.isGrosirApplied && item.hargaAsli && (
                                    <span className="line-through opacity-60 text-[11px]">{formatRupiah(item.hargaAsli)}</span>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                            <button
                                type="button"
                                onClick={() => onUpdateQty(idx, -1)}
                                className="w-9 h-9 bg-slate-100 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-200 active:scale-95 flex items-center justify-center font-bold text-base"
                                aria-label="Kurangi jumlah"
                            >
                                -
                            </button>
                            <span className="text-sm font-bold w-7 text-center tabular-nums">{item.qty}</span>
                            <button
                                type="button"
                                onClick={() => onUpdateQty(idx, 1)}
                                className="w-9 h-9 bg-teal-600 border border-teal-600 rounded-lg text-white hover:bg-teal-700 active:scale-95 flex items-center justify-center font-bold text-base"
                                aria-label="Tambah jumlah"
                            >
                                +
                            </button>
                        </div>
                        <div className="text-sm font-bold text-slate-800 w-24 text-right tabular-nums shrink-0 pl-2">
                            {formatRupiah(item.subtotal)}
                        </div>
                    </div>
                ))}
                {cart.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full py-12 text-slate-400">
                        <i className="bi bi-cart-x text-5xl mb-2 opacity-40"></i>
                        <p className="text-sm font-medium">Keranjang masih kosong</p>
                        <p className="text-xs text-slate-400 mt-1">Ketuk produk di daftar untuk menambahkan</p>
                    </div>
                )}
            </div>

            {/* Footer Checkout CTA */}
            <div className="p-4 border-t border-slate-200 bg-white shrink-0">
                <div className="flex justify-between items-center mb-3">
                    <span className="text-slate-600 font-medium text-sm">Total Belanja</span>
                    <span className="text-2xl font-bold text-teal-700 tabular-nums">{formatRupiah(subTotal)}</span>
                </div>
                <button 
                    type="button"
                    onClick={onCheckout} 
                    disabled={cart.length === 0} 
                    className="w-full min-h-[48px] py-3 bg-teal-600 text-white font-bold rounded-xl hover:bg-teal-700 active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm"
                >
                    <i className="bi bi-wallet2"></i>
                    <span>BAYAR SEKARANG</span>
                </button>
            </div>
        </div>
    );
};
