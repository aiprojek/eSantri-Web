
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
        <div className="fixed inset-0 bg-black bg-opacity-70 z-[80] flex justify-center items-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[80vh] flex flex-col animate-fade-in-down">
                <div className="p-4 border-b flex justify-between items-center bg-gray-50 rounded-t-lg">
                    <h3 className="font-bold text-gray-800">Daftar Pesanan Disimpan</h3>
                    <button onClick={onClose}><i className="bi bi-x-lg text-gray-500"></i></button>
                </div>
                <div className="flex-grow overflow-y-auto p-4 space-y-3">
                    {orders.map(order => (
                        <div key={order.id} className="border p-3 rounded-lg hover:shadow-md transition-shadow bg-white relative group">
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <div className="font-bold text-gray-800">{order.customerName}</div>
                                    <div className="text-xs text-gray-500">{new Date(order.timestamp).toLocaleString('id-ID')}</div>
                                </div>
                                <button 
                                    onClick={() => onDelete(order.id)} 
                                    className="text-red-400 hover:text-red-600 p-1"
                                    title="Hapus Permanen"
                                >
                                    <i className="bi bi-trash"></i>
                                </button>
                            </div>
                            <div className="text-sm text-gray-600 mb-3 line-clamp-2 bg-gray-50 p-2 rounded">
                                {order.items.map(i => `${i.nama} (${i.qty})`).join(', ')}
                            </div>
                            <button 
                                onClick={() => onRecall(order)} 
                                className="w-full bg-blue-600 text-white py-2 rounded text-sm font-bold hover:bg-blue-700 flex items-center justify-center gap-2"
                            >
                                <i className="bi bi-arrow-return-left"></i> Buka Pesanan
                            </button>
                        </div>
                    ))}
                    {orders.length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                            <i className="bi bi-basket text-4xl mb-2 block opacity-30"></i>
                            <p>Tidak ada pesanan disimpan.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
