import React, { useState } from 'react';
import { useAppContext } from '../AppContext';

interface WelcomeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onGoToGuide: () => void;
}

const WelcomeModal: React.FC<WelcomeModalProps> = ({ isOpen, onClose, onGoToGuide }) => {
    const { isSampleDataDetected, onDeleteSampleData, showToast, showConfirmation } = useAppContext();
    const [isDeleting, setIsDeleting] = useState(false);

    if (!isOpen) return null;

    const handleDeleteSample = () => {
        showConfirmation(
            'Hapus Seluruh Data Sampel?',
            'Tindakan ini akan mengosongkan data santri simulasi, tagihan contoh, dan catatan mutaba\'ah agar aplikasi siap diisi dengan data riil pondok Anda. Apakah Anda yakin?',
            async () => {
                try {
                    setIsDeleting(true);
                    await onDeleteSampleData();
                    showToast('Data sampel berhasil dibersihkan! Aplikasi kini siap digunakan.', 'success');
                    onClose();
                } catch (error) {
                    console.error('Failed to delete sample data:', error);
                    showToast('Gagal menghapus data sampel.', 'error');
                } finally {
                    setIsDeleting(false);
                }
            },
            { confirmText: 'Ya, Bersihkan Data', confirmColor: 'red' }
        );
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[150] flex justify-center items-center p-4 animate-fade-in" aria-modal="true" role="dialog">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 transform transition-all" role="document">
                <div className="p-6 sm:p-8 text-center">
                    <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-2xl bg-teal-50 text-teal-600 border border-teal-100 mb-5 shadow-sm">
                        <i className="bi bi-rocket-takeoff text-3xl"></i>
                    </div>
                    <h3 className="text-2xl font-bold text-slate-900 tracking-tight">Selamat Datang di eSantri Web!</h3>
                    <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                        Sistem Informasi Manajemen Pondok Pesantren offline-first dengan integrasi multi-admin dan backup cloud.
                    </p>

                    {/* Banner Deteksi Data Sampel */}
                    {isSampleDataDetected && (
                        <div className="mt-5 text-left rounded-xl border border-amber-200 bg-amber-50/80 p-4 text-xs text-amber-900 shadow-sm">
                            <div className="flex items-start gap-2.5">
                                <i className="bi bi-exclamation-triangle-fill text-amber-600 text-base mt-0.5 shrink-0"></i>
                                <div className="space-y-1">
                                    <span className="font-semibold text-amber-950 block">Data Simulasi/Sampel Aktif</span>
                                    <p className="text-amber-800 leading-normal">
                                        Aplikasi saat ini memuat data contoh (Pondok Pesantren Al-Ikhlas, santri simulasi, tagihan, & mutaba'ah) untuk keperluan eksplorasi fitur.
                                    </p>
                                    <div className="pt-2 flex flex-wrap items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={handleDeleteSample}
                                            disabled={isDeleting}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 text-white font-medium hover:bg-amber-700 transition-colors shadow-sm disabled:opacity-50"
                                        >
                                            <i className="bi bi-trash3"></i>
                                            <span>{isDeleting ? 'Membersihkan...' : 'Bersihkan Data Sampel'}</span>
                                        </button>
                                        <span className="text-amber-700 text-[11px] italic">
                                            (Hapus jika ingin langsung input data asli)
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5">
                    <button
                        onClick={onClose}
                        type="button"
                        className="w-full sm:w-auto inline-flex items-center justify-center rounded-xl border border-slate-200 shadow-sm px-4 py-2.5 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                        <i className="bi bi-arrow-right-circle mr-2 text-slate-500"></i>
                        Mulai Gunakan Aplikasi
                    </button>
                    <button
                        onClick={onGoToGuide}
                        type="button"
                        className="w-full sm:w-auto inline-flex items-center justify-center rounded-xl border border-transparent shadow-sm px-4 py-2.5 bg-teal-600 text-sm font-medium text-white hover:bg-teal-700 transition-colors"
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
