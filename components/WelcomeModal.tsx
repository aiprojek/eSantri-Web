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
    const [sampleDeleted, setSampleDeleted] = useState(false);

    if (!isOpen) return null;

    const handleDeleteSample = () => {
        showConfirmation(
            'Hapus Seluruh Data Sampel?',
            'Tindakan ini akan mengosongkan seluruh data santri simulasi, tagihan contoh, kas, absensi, dan mutaba\'ah agar aplikasi bersih dan siap diisi data riil pondok pesantren Anda. Apakah Anda yakin?',
            async () => {
                try {
                    setIsDeleting(true);
                    await onDeleteSampleData();
                    setSampleDeleted(true);
                    showToast('Data sampel berhasil dibersihkan! Aplikasi kini siap digunakan.', 'success');
                    // Tidak memanggil onClose() agar user kembali ke modal selamat datang dengan indikator status bersih
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[150] flex justify-center items-center p-3 sm:p-4 animate-fade-in" aria-modal="true" role="dialog">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 transform transition-all flex flex-col max-h-[92vh]" role="document">
                <div className="p-5 sm:p-7 text-center overflow-y-auto app-scrollbar">
                    <div className="mx-auto flex items-center justify-center h-14 w-14 sm:h-16 sm:w-16 rounded-2xl bg-teal-50 text-teal-600 border border-teal-100 mb-4 shadow-sm">
                        <i className="bi bi-rocket-takeoff text-2xl sm:text-3xl"></i>
                    </div>
                    <h3 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Selamat Datang di eSantri Web!</h3>
                    <p className="text-xs sm:text-sm text-slate-600 mt-1.5 leading-relaxed">
                        Sistem Informasi Manajemen Pondok Pesantren offline-first dengan integrasi multi-admin, sinkronisasi cloud, dan cetak laporan standar.
                    </p>

                    {/* Indikator Data Sampel Sudah Dihapus */}
                    {sampleDeleted ? (
                        <div className="mt-4 text-left rounded-xl border border-emerald-200 bg-emerald-50/90 p-3.5 text-xs text-emerald-900 shadow-sm animate-fade-in">
                            <div className="flex items-start gap-3">
                                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 font-bold mt-0.5">
                                    <i className="bi bi-check-lg text-base"></i>
                                </div>
                                <div className="space-y-0.5">
                                    <span className="font-bold text-emerald-950 block text-xs sm:text-sm">
                                        Data Sampel Sudah Dihapus
                                    </span>
                                    <p className="text-emerald-800 leading-relaxed text-[11px] sm:text-xs">
                                        Database aplikasi kini dalam kondisi bersih tanpa data simulasi. Silakan baca panduan pengguna untuk memahami alur sistem atau langsung mulai input data santri pondok Anda.
                                    </p>
                                </div>
                            </div>
                        </div>
                    ) : isSampleDataDetected ? (
                        /* Banner Deteksi Data Sampel */
                        <div className="mt-4 text-left rounded-xl border border-amber-200 bg-amber-50/90 p-3.5 text-xs text-amber-900 shadow-sm">
                            <div className="flex items-start gap-2.5">
                                <i className="bi bi-exclamation-triangle-fill text-amber-600 text-base mt-0.5 shrink-0"></i>
                                <div className="space-y-1">
                                    <span className="font-semibold text-amber-950 block">Data Simulasi/Sampel Aktif</span>
                                    <p className="text-amber-800 leading-normal text-[11px] sm:text-xs">
                                        Aplikasi saat ini memuat data contoh (Pondok Pesantren Al-Ikhlas, santri simulasi, tagihan, & mutaba'ah) untuk keperluan eksplorasi fitur.
                                    </p>
                                    <div className="pt-2 flex flex-wrap items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={handleDeleteSample}
                                            disabled={isDeleting}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 text-white font-medium hover:bg-amber-700 transition-colors shadow-sm disabled:opacity-50 text-xs"
                                        >
                                            <i className="bi bi-trash3"></i>
                                            <span>{isDeleting ? 'Membersihkan...' : 'Bersihkan Data Sampel'}</span>
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
                    <div className="mt-4 text-left rounded-xl border border-slate-200 bg-slate-50/90 p-3.5 text-xs text-slate-700 shadow-sm">
                        <div className="flex items-start gap-2.5">
                            <i className="bi bi-shield-lock-fill text-slate-700 text-base mt-0.5 shrink-0"></i>
                            <div className="space-y-1.5 leading-relaxed">
                                <div className="flex items-center justify-between gap-2">
                                    <span className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
                                        Perjanjian & Lisensi Pengguna
                                    </span>
                                    <a 
                                        href="https://opensource.org/license/gpl-3.0" 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 font-semibold text-teal-700 hover:text-teal-800 hover:underline text-[11px]"
                                        title="Buka Lisensi GNU General Public License v3.0"
                                    >
                                        <span>Lisensi GPL-3.0</span>
                                        <i className="bi bi-box-arrow-up-right text-[10px]"></i>
                                    </a>
                                </div>
                                <p className="text-slate-600 text-[11px] leading-relaxed">
                                    Dengan menggunakan aplikasi ini, pengguna menyatakan menyetujui seluruh ketentuan lisensi sumber terbuka (<strong className="text-slate-800 font-semibold">GPL-3.0</strong>) dan perjanjian pengguna. Segala bentuk pelanggaran terhadap lisensi dan amanah ini akan <strong className="text-slate-900 font-semibold">ditanggung penuh oleh pengguna.</strong>.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="px-5 py-3.5 sm:px-6 sm:py-4 bg-slate-50 border-t border-slate-100 flex flex-col-reverse sm:flex-row sm:justify-end sm:items-center gap-2.5">
                    <button
                        onClick={onClose}
                        type="button"
                        className="w-full sm:w-auto inline-flex items-center justify-center rounded-xl border border-slate-200 shadow-sm px-4 py-2.5 bg-white text-xs sm:text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                        <i className="bi bi-arrow-right-circle mr-2 text-slate-500"></i>
                        Langsung Gunakan Aplikasi
                    </button>
                    <button
                        onClick={onGoToGuide}
                        type="button"
                        className="relative w-full sm:w-auto inline-flex items-center justify-center rounded-xl border border-teal-500/30 px-4 sm:px-5 py-2.5 bg-teal-600 text-xs sm:text-sm font-bold text-white hover:bg-teal-700 transition-all shadow-md shadow-teal-700/25 ring-2 ring-teal-400/80 ring-offset-1 animate-pulse hover:animate-none"
                        title="Sangat disarankan membaca panduan agar dapat mengoperasikan sistem dengan optimal"
                    >
                        <i className="bi bi-book-half mr-2 text-sm sm:text-base"></i>
                        <span>Baca Panduan Pengguna</span>
                        <span className="ml-2 px-1.5 py-0.5 text-[9px] sm:text-[10px] uppercase font-extrabold tracking-wider bg-amber-300 text-slate-900 rounded shadow-xs">
                            Penting
                        </span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default WelcomeModal;
