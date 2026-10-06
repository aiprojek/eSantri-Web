import React from 'react';
import { PendingOrder } from '../../../types';

interface PendingOrdersModalProps {
    isOpen: boolean;
    onClose: () => void;
    orders: PendingOrder[];
    onRecall: (order: PendingOrder) => void;
    onDelete: (id: number) => void;
}

export const PendingOrdersModal: React.FC<PendingOrdersModalProps> = ({ isOpen, onClose, orders, onRecall, onDelete }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/65 backdrop-blur-xs z-[80] flex justify-center items-end sm:items-center p-0 sm:p-4">
            <div className="bg-white rounded-t-2xl sm:rounded-xl shadow-2xl w-full max-w-md max-h-[85vh] flex flex-col overflow-hidden">
                <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50 shrink-0">
                    <h3 className="font-bold text-slate-800">Daftar Pesanan Disimpan ({orders.length})</h3>
                    <button onClick={onClose} className="w-9 h-9 rounded-lg hover:bg-slate-200 flex items-center justify-center text-slate-500">
                        <i className="bi bi-x-lg"></i>
                    </button>
                </div>
                <div className="flex-grow overflow-y-auto p-4 space-y-3">
                    {orders.map(order => (
                        <div key={order.id} className="border border-slate-200 p-3.5 rounded-xl hover:shadow-xs transition-shadow bg-white">
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <div className="font-bold text-slate-800">{order.customerName}</div>
                                    <div className="text-xs text-slate-500 tabular-nums">{new Date(order.timestamp).toLocaleString('id-ID')}</div>
                                </div>
                                <button 
                                    onClick={() => onDelete(order.id)} 
                                    className="w-9 h-9 rounded-lg text-red-500 hover:bg-red-50 flex items-center justify-center"
                                    title="Hapus Pesanan"
                                >
                                    <i className="bi bi-trash"></i>
                                </button>
                            </div>
                            <div className="text-xs text-slate-600 mb-3 line-clamp-2 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                                {order.items.map(i => `${i.nama} (${i.qty})`).join(', ')}
                            </div>
                            <button 
                                onClick={() => onRecall(order)} 
                                className="w-full min-h-[42px] bg-teal-600 text-white py-2.5 rounded-xl text-xs sm:text-sm font-bold hover:bg-teal-700 flex items-center justify-center gap-2 active:scale-[0.99]"
                            >
                                <i className="bi bi-arrow-return-left"></i> Lanjutkan Pesanan Ini
                            </button>
                        </div>
                    ))}
                    {orders.length === 0 && (
                        <div className="text-center py-10 text-slate-400">
                            <i className="bi bi-basket text-4xl mb-2 block opacity-40"></i>
                            <p className="text-sm">Tidak ada pesanan yang ditahan.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
