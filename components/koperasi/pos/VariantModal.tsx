
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
        <div className="fixed inset-0 bg-black bg-opacity-70 z-[80] flex justify-center items-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-sm animate-fade-in-down">
                <div className="p-4 border-b flex justify-between items-center">
                    <h3 className="font-bold text-lg text-gray-800">{product.nama}</h3>
                    <button onClick={onClose}><i className="bi bi-x-lg text-gray-500"></i></button>
                </div>
                <div className="p-4 grid grid-cols-2 gap-3">
                    {product.varian?.map((v, i) => (
                        <button 
                            key={i} 
                            onClick={() => onSelect(product, i)} 
                            className="border p-3 rounded-lg hover:bg-teal-50 hover:border-teal-500 text-left transition-all group"
                        >
                            <div className="font-bold text-sm text-gray-800 group-hover:text-teal-700">{v.nama}</div>
                            <div className="text-xs text-gray-500 flex justify-between mt-1">
                                <span>{formatRupiah(v.harga || product.hargaJual)}</span>
                                <span className={v.stok <= 0 ? 'text-red-500 font-bold' : ''}>
                                    Stok: {v.stok}
                                </span>
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};
