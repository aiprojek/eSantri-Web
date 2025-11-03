import React from 'react';

interface WelcomeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onGoToGuide: () => void;
}

const WelcomeModal: React.FC<WelcomeModalProps> = ({ isOpen, onClose, onGoToGuide }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-[150] flex justify-center items-center p-4" aria-modal="true" role="dialog">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg transform transition-all" role="document">
                <div className="p-8 text-center">
                    <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-teal-100 mb-5">
                        <i className="bi bi-rocket-takeoff text-4xl text-teal-600"></i>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900">Selamat Datang di eSantri Web!</h3>
                    <p className="text-base text-gray-600 mt-3 max-w-md mx-auto">
                        Sebelum memulai, kami menyarankan Anda untuk membaca panduan pengguna terlebih dahulu.
                    </p>
                </div>
                <div className="px-6 py-5 bg-gray-50 flex flex-col sm:flex-row sm:justify-end gap-3 rounded-b-lg">
                    <button
                        onClick={onClose}
                        type="button"
                        className="w-full sm:w-auto inline-flex items-center justify-center rounded-md border border-gray-300 shadow-sm px-5 py-2.5 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
                    >
                        <i className="bi bi-app-indicator mr-2"></i>
                        Mulai Gunakan Aplikasi
                    </button>
                    <button
                        onClick={onGoToGuide}
                        type="button"
                        className="w-full sm:w-auto inline-flex items-center justify-center rounded-md border border-transparent shadow-sm px-5 py-2.5 bg-teal-600 text-sm font-medium text-white hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
                    >
                        <i className="bi bi-book-half mr-2"></i>
                        Lihat Panduan Pengguna
                    </button>
                </div>
            </div>
        </div>
    );
};

export default WelcomeModal;
