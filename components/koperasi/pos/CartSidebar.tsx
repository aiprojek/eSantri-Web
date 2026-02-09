
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
}

export const CartSidebar: React.FC<CartSidebarProps> = ({ cart, subTotal, onUpdateQty, onClear, onHold, onCheckout }) => {
    return (
        <div className="w-full lg:w-96 bg-white rounded-lg shadow border flex flex-col h-full">
            <div className="p-4 border-b bg-gray-50 font-bold text-gray-700 flex justify-between items-center shadow-sm z-10 shrink-0">
                <span><i className="bi bi-cart4 mr-2"></i> Keranjang</span>
                <div className="flex gap-2">
                    <button 
                        onClick={onHold} 
                        disabled={cart.length === 0} 
                        className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded hover:bg-orange-200 transition-colors disabled:opacity-50" 
                        title="Simpan Sementara"
                    >
                        <i className="bi bi-pause-circle-fill"></i> Simpan
                    </button>
                    <button 
                        onClick={onClear} 
                        disabled={cart.length === 0}
                        className="text-xs text-red-500 hover:text-red-700 hover:underline disabled:opacity-50"
                    >
                        Kosongkan
                    </button>
                </div>
            </div>
            
            <div className="flex-grow overflow-y-auto p-2 space-y-2 bg-gray-50/50 custom-scrollbar">
                {cart.map((item, idx) => (
                    <div key={idx} className={`flex justify-between items-center p-2 bg-white rounded border hover:shadow-sm transition-shadow ${item.isGrosirApplied ? 'border-l-4 border-l-green-500' : ''}`}>
                        <div className="flex-grow min-w-0 pr-2">
                            <div className="text-sm font-medium truncate" title={item.nama}>{item.nama}</div>
                            <div className="text-xs text-gray-500 flex gap-2 items-center">
                                {item.isGrosirApplied ? <span className="text-green-600 font-bold text-[10px] uppercase">Grosir</span> : ''}
                                <span>{formatRupiah(item.harga)}</span>
                                {item.isGrosirApplied && item.hargaAsli && <span className="line-through opacity-60 text-[10px]">{formatRupiah(item.hargaAsli)}</span>}
                            </div>
                        </div>
                        <div className="flex items-center gap-1">
                            <button onClick={() => onUpdateQty(idx, -1)} className="w-7 h-7 bg-gray-100 border rounded text-gray-600 hover:bg-gray-200 flex items-center justify-center">-</button>
                            <span className="text-sm font-bold w-6 text-center">{item.qty}</span>
                            <button onClick={() => onUpdateQty(idx, 1)} className="w-7 h-7 bg-teal-600 border border-teal-600 rounded text-white hover:bg-teal-700 flex items-center justify-center">+</button>
                        </div>
                        <div className="text-sm font-bold text-gray-800 w-20 text-right">{formatRupiah(item.subtotal)}</div>
                    </div>
                ))}
                {cart.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400 opacity-50">
                        <i className="bi bi-cart-x text-5xl mb-3"></i>
                        <p className="text-sm font-medium">Keranjang kosong</p>
                    </div>
                )}
            </div>

            <div className="p-4 border-t bg-white shadow-[0_-5px_10px_rgba(0,0,0,0.05)] z-10 shrink-0">
                <div className="flex justify-between items-center mb-4">
                    <span className="text-gray-600 font-medium">Total Belanja</span>
                    <span className="text-2xl font-bold text-teal-700">{formatRupiah(subTotal)}</span>
                </div>
                <button 
                    onClick={onCheckout} 
                    disabled={cart.length === 0} 
                    className="w-full py-3 bg-gradient-to-r from-teal-600 to-green-600 text-white font-bold rounded-xl hover:shadow-lg transition-all transform hover:-translate-y-1 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
                >
                    <i className="bi bi-wallet2"></i>
                    BAYAR SEKARANG
                </button>
            </div>
        </div>
    );
};
