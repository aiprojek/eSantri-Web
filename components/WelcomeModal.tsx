import React, { useState } from 'react';
import { useAppContext } from '../AppContext';

interface WelcomeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onGoToGuide: () => void;
}

const WelcomeModal: React.FC<WelcomeModalProps> = ({ isOpen, onClose, onGoToGuide }) => {
    const { isSampleDataDetected, onDeleteSampleData, showToast } = useAppContext();
    const [isDeleting, setIsDeleting] = useState(false);
    const [sampleDeleted, setSampleDeleted] = useState(false);
    const [showConfirmDelete, setShowConfirmDelete] = useState(false);

    if (!isOpen) return null;

    const handleConfirmDelete = async () => {
        try {
            setIsDeleting(true);
            await onDeleteSampleData();
            setSampleDeleted(true);
            setShowConfirmDelete(false);
            showToast('Data sampel berhasil dibersihkan! Aplikasi kini siap digunakan.', 'success');
        } catch (error) {
            console.error('Failed to delete sample data:', error);
            showToast('Gagal menghapus data sampel.', 'error');
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div 
            className="fixed inset-0 bg-black/65 backdrop-blur-xs z-[150] flex justify-center items-center p-3 sm:p-4 animate-fade-in" 
            style={{ zIndex: 150 }}
            aria-modal="true" 
            role="dialog"
        >
            <style>{`
                @keyframes slowPulseGlow {
                    0%, 100% {
                        box-shadow: 0 0 0 0 rgba(13, 148, 136, 0.45);
                        transform: scale(1);
                    }
                    50% {
                        box-shadow: 0 0 0 6px rgba(13, 148, 136, 0);
                        transform: scale(1.015);
                    }
                }
                .animate-slow-pulse-glow {
                    animation: slowPulseGlow 2.4s ease-in-out infinite;
                }
            `}</style>

            <div 
                className="bg-white rounded-2xl shadow-2xl w-full max-w-lg sm:max-w-xl overflow-hidden border border-slate-200 flex flex-col max-h-[92vh] relative" 
                role="document"
            >
                <div className="p-5 sm:p-6 text-center overflow-y-auto app-scrollbar">
                    <div className="mx-auto flex items-center justify-center h-13 w-13 sm:h-15 sm:w-15 rounded-2xl bg-teal-50 text-teal-600 border border-teal-100 mb-3 shadow-xs">
                        <i className="bi bi-rocket-takeoff text-2xl sm:text-3xl"></i>
                    </div>
                    <h3 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Selamat Datang di eSantri Web!</h3>
                    <p className="text-xs sm:text-sm text-slate-600 mt-1 leading-relaxed">
                        Sistem Informasi Manajemen Pondok Pesantren offline-first dengan integrasi multi-admin, sinkronisasi cloud, dan cetak laporan standar.
                    </p>

                    {/* Indikator: Data Sampel Sudah Dihapus */}
                    {sampleDeleted ? (
                        <div className="mt-4 text-left rounded-xl border border-emerald-300 bg-emerald-50/95 p-3 sm:p-3.5 text-xs text-emerald-950 shadow-xs animate-fade-in">
                            <div className="flex items-start gap-2.5">
                                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-200/80 text-emerald-800 font-bold mt-0.5">
                                    <i className="bi bi-check-lg text-sm"></i>
                                </div>
                                <div className="space-y-0.5">
                                    <span className="font-bold text-emerald-950 block text-xs sm:text-sm">
                                        Data Sampel Sudah Dihapus
                                    </span>
                                    <p className="text-emerald-800 leading-relaxed text-[11px] sm:text-xs">
                                        Database aplikasi kini dalam kondisi bersih tanpa data simulasi. Silakan baca panduan pengguna untuk memahami alur sistem atau langsung mulai mengisi data riil santri pondok Anda.
                                    </p>
                                </div>
                            </div>
                        </div>
                    ) : isSampleDataDetected ? (
                        /* Banner: Deteksi Data Sampel */
                        <div className="mt-4 text-left rounded-xl border border-amber-200 bg-amber-50/90 p-3 sm:p-3.5 text-xs text-amber-900 shadow-xs">
                            <div className="flex items-start gap-2.5">
                                <i className="bi bi-exclamation-triangle-fill text-amber-600 text-base mt-0.5 shrink-0"></i>
                                <div className="space-y-1 flex-1">
                                    <span className="font-bold text-amber-950 block">Data Simulasi/Sampel Aktif</span>
                                    <p className="text-amber-800 leading-relaxed text-[11px] sm:text-xs">
                                        Aplikasi saat ini memuat data contoh (santri simulasi, tagihan, & mutaba'ah) untuk eksplorasi. Anda dapat mengosongkannya sekarang.
                                    </p>
                                    <div className="pt-1.5 flex flex-wrap items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirmDelete(true)}
                                            disabled={isDeleting}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold transition-colors shadow-xs disabled:opacity-50 text-xs"
                                        >
                                            <i className="bi bi-trash3"></i>
                                            <span>Bersihkan Data Sampel</span>
                                        </button>
                                        <span className="text-amber-700 text-[11px] italic">
                                            (Klik untuk mengosongkan data simulasi)
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : null}

                    {/* Klausul Perjanjian & Lisensi Pengguna */}
                    <div className="mt-4 text-left rounded-xl border border-slate-200 bg-slate-50/95 p-3 sm:p-3.5 text-xs text-slate-700 shadow-xs">
                        <div className="flex items-start gap-2.5">
                            <i className="bi bi-shield-lock-fill text-teal-800 text-base mt-0.5 shrink-0"></i>
                            <div className="space-y-1.5 leading-relaxed flex-1">
                                <div className="flex items-center justify-between gap-2">
                                    <span className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
                                        Perjanjian &amp; Lisensi Pengguna
                                    </span>
                                    <a 
                                        href="https://opensource.org/license/gpl-3.0" 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 font-bold text-teal-700 hover:text-teal-900 hover:underline text-[11px]"
                                        title="Buka Lisensi GNU General Public License v3.0"
                                    >
                                        <span>Lisensi GPL-3.0</span>
                                        <i className="bi bi-box-arrow-up-right text-[10px]"></i>
                                    </a>
                                </div>
                                <p className="text-slate-600 text-[11px] leading-relaxed">
                                    Dengan menggunakan aplikasi ini, Anda menyatakan menyetujui seluruh ketentuan lisensi sumber terbuka (<strong className="text-slate-800 font-semibold">GPL-3.0</strong>) dan perjanjian pengguna. Segala bentuk pelanggaran terhadap lisensi dan amanah ini akan <strong className="text-slate-950 font-bold">ditanggung oleh pengguna (jika tidak di dunia maka di akhirat)</strong>.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Modal: Compact & Non-wrapping */}
                <div className="px-4 py-3 sm:px-6 sm:py-3 bg-slate-50 border-t border-slate-200 flex flex-row items-center justify-end gap-2 shrink-0">
                    <button
                        onClick={onClose}
                        type="button"
                        className="px-3.5 py-2 inline-flex items-center justify-center rounded-xl border border-slate-300 shadow-2xs bg-white text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
                    >
                        <i className="bi bi-arrow-right-circle mr-1 text-slate-400"></i>
                        <span>Gunakan Langsung</span>
                    </button>
                    <button
                        onClick={onGoToGuide}
                        type="button"
                        className="px-3.5 sm:px-4 py-2 inline-flex items-center justify-center rounded-xl border border-teal-600 bg-teal-700 hover:bg-teal-800 text-xs font-bold text-white transition-all shadow-sm animate-slow-pulse-glow whitespace-nowrap shrink-0 gap-1.5"
                        title="Sangat disarankan membaca panduan agar dapat mengoperasikan sistem secara optimal"
                    >
                        <i className="bi bi-book-half text-teal-200 text-xs"></i>
                        <span>Baca Panduan Pengguna</span>
                        <span className="px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider bg-amber-400 text-teal-950 rounded leading-none">
                            Penting
                        </span>
                    </button>
                </div>

                {/* Modal Konfirmasi Hapus Data Sampel (Ditampilkan di Atas Modal Selamat Datang) */}
                {showConfirmDelete && (
                    <div 
                        className="absolute inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in"
                        style={{ zIndex: 160 }}
                        onClick={() => !isDeleting && setShowConfirmDelete(false)}
                    >
                        <div 
                            className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5 border border-slate-200 text-center animate-scale-up" 
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600 border border-red-100 shadow-2xs">
                                <i className="bi bi-trash3-fill text-xl"></i>
                            </div>
                            <h4 className="text-base font-bold text-slate-900">Hapus Seluruh Data Sampel?</h4>
                            <p className="mt-1.5 text-xs text-slate-600 leading-relaxed text-left sm:text-center">
                                Seluruh data santri simulasi, tagihan, kas, absensi, dan mutaba'ah contoh akan dikosongkan agar database aplikasi bersih dan siap diisi data pondok Anda.
                            </p>
                            <div className="mt-5 flex items-center justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmDelete(false)}
                                    disabled={isDeleting}
                                    className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition-colors disabled:opacity-50"
                                >
                                    Batal
                                </button>
                                <button
                                    type="button"
                                    onClick={handleConfirmDelete}
                                    disabled={isDeleting}
                                    className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl inline-flex items-center gap-1.5 transition-colors shadow-xs disabled:opacity-50"
                                >
                                    {isDeleting ? (
                                        <>
                                            <i className="bi bi-hourglass-split animate-spin"></i>
                                            <span>Membersihkan...</span>
                                        </>
                                    ) : (
                                        <>
                                            <i className="bi bi-trash3"></i>
                                            <span>Ya, Bersihkan Data</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default WelcomeModal;
