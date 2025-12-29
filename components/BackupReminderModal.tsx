
import React from 'react';

interface BackupReminderModalProps {
    isOpen: boolean;
    onClose: () => void;
    onBackup: () => void;
    reason: 'periodic' | 'action';
}

export const BackupReminderModal: React.FC<BackupReminderModalProps> = ({ isOpen, onClose, onBackup, reason }) => {
    if (!isOpen) return null;

    const title = reason === 'action' 
        ? 'Perubahan Data Besar Terdeteksi' 
        : 'Waktunya Backup Rutin';
    
    const message = reason === 'action'
        ? 'Anda baru saja melakukan perubahan data yang signifikan (seperti generate tagihan). Sangat disarankan untuk mencadangkan data sekarang agar tidak hilang.'
        : 'Sudah waktunya untuk melakukan backup rutin data Anda untuk keamanan.';

    return (
        <div className="fixed top-24 right-5 z-[100] max-w-sm w-full bg-white rounded-lg shadow-2xl border-l-4 border-yellow-500 animate-slide-in-right p-4" role="dialog">
            <div className="flex justify-between items-start">
                <div className="flex items-start gap-3">
                    <div className="bg-yellow-100 text-yellow-600 rounded-full p-2 mt-1">
                        <i className="bi bi-hdd-network text-xl"></i>
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-800">{title}</h3>
                        <p className="text-sm text-gray-600 mt-1">{message}</p>
                    </div>
                </div>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                    <i className="bi bi-x-lg"></i>
                </button>
            </div>
            <div className="mt-4 flex justify-end gap-2">
                <button 
                    onClick={onClose}
                    className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 font-medium"
                >
                    Nanti Saja
                </button>
                <button 
                    onClick={() => { onBackup(); onClose(); }}
                    className="px-4 py-1.5 bg-yellow-500 text-white rounded-md text-sm font-medium hover:bg-yellow-600 shadow-sm flex items-center gap-2"
                >
                    <i className="bi bi-download"></i> Backup Sekarang
                </button>
            </div>
            <style>{`
                @keyframes slide-in-right {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                .animate-slide-in-right {
                    animation: slide-in-right 0.4s ease-out forwards;
                }
            `}</style>
        </div>
    );
};
