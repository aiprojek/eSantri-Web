import React from 'react';
import { ProdukKoperasi } from '../../../types';
import { formatRupiah } from '../../../utils/formatters';

interface VariantModalProps {
    product: ProdukKoperasi | null;
    onClose: () => void;
    onSelect: (product: ProdukKoperasi, variantIndex: number) => void;
}

export const VariantModal: React.FC<VariantModalProps> = ({ product, onClose, onSelect }) => {
    if (!product) return null;

    return (
        <div className="fixed inset-0 bg-black/65 backdrop-blur-xs z-[80] flex justify-center items-end sm:items-center p-0 sm:p-4">
            <div className="bg-white rounded-t-2xl sm:rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in-up">
                <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                    <div>
                        <span className="text-[11px] font-bold uppercase text-teal-600 block">Pilih Varian</span>
                        <h3 className="font-bold text-base sm:text-lg text-slate-800">{product.nama}</h3>
                    </div>
                    <button onClick={onClose} className="w-9 h-9 rounded-lg hover:bg-slate-200 flex items-center justify-center text-slate-500">
                        <i className="bi bi-x-lg"></i>
                    </button>
                </div>
                <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[70vh] overflow-y-auto">
                    {product.varian?.map((v, i) => {
                        const isOut = v.stok <= 0;
                        return (
                            <button 
                                key={i} 
                                disabled={isOut}
                                onClick={() => onSelect(product, i)} 
                                className={`border p-3.5 min-h-[60px] rounded-xl text-left transition-all flex flex-col justify-between ${
                                    isOut
                                        ? 'bg-slate-100 border-slate-200 opacity-50 cursor-not-allowed'
                                        : 'bg-white border-slate-200 hover:bg-teal-50 hover:border-teal-500 active:scale-[0.98]'
                                }`}
                            >
                                <div className="font-bold text-sm text-slate-800">{v.nama}</div>
                                <div className="text-xs text-slate-500 flex justify-between items-center mt-1.5 pt-1.5 border-t border-slate-100 w-full">
                                    <span className="font-bold text-teal-700 tabular-nums">{formatRupiah(v.harga || product.hargaJual)}</span>
                                    <span className={`tabular-nums ${isOut ? 'text-red-600 font-bold' : 'text-slate-500'}`}>
                                        {isOut ? 'Habis' : `Stok: ${v.stok}`}
                                    </span>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
