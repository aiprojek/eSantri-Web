
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
        <div className="fixed inset-x-4 top-24 z-[100] w-auto max-w-sm rounded-2xl border-l-4 border-yellow-500 bg-white p-4 shadow-2xl animate-slide-in-right md:left-auto md:right-5 md:inset-x-auto md:w-full" role="dialog">
            <div className="flex justify-between items-start">
                <div className="flex items-start gap-3">
                    <div className="mt-1 rounded-full bg-yellow-100 p-2 text-yellow-600">
                        <i className="bi bi-hdd-network text-xl"></i>
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-800">{title}</h3>
                        <p className="text-sm text-gray-600 mt-1">{message}</p>
                        <p className="text-[10px] text-teal-600 mt-2 italic flex items-center gap-1">
                            <i className="bi bi-cloud-check"></i> Meskipun Sinkronisasi Cloud aktif, backup manual tetap disarankan untuk arsip fisik.
                        </p>
                    </div>
                </div>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                    <i className="bi bi-x-lg"></i>
                </button>
            </div>
            <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button 
                    onClick={onClose}
                    className="w-full px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 sm:w-auto"
                >
                    Nanti Saja
                </button>
                <button 
                    onClick={() => { onBackup(); onClose(); }}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-yellow-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-yellow-600 sm:w-auto"
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
