
import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../AppContext';
import { panduanData } from '../../data/content';

const PanduanLangkah: React.FC<{ number: number; title: string; children: React.ReactNode; isLast?: boolean; color?: string }> = ({ number, title, children, isLast = false, color = 'teal' }) => {
    const colorClasses: Record<string, string> = {
        teal: 'border-teal-500 bg-teal-50 text-teal-600',
        blue: 'border-blue-500 bg-blue-50 text-blue-600',
        orange: 'border-orange-500 bg-orange-50 text-orange-600',
        purple: 'border-purple-500 bg-purple-50 text-purple-600',
        red: 'border-red-500 bg-red-50 text-red-600',
        green: 'border-green-500 bg-green-50 text-green-600',
        indigo: 'border-indigo-500 bg-indigo-50 text-indigo-600',
        gray: 'border-gray-500 bg-gray-50 text-gray-600',
        black: 'border-gray-800 bg-gray-100 text-gray-800',
    };
    
    const lineColors: Record<string, string> = {
        teal: 'bg-teal-300',
        blue: 'bg-blue-300',
        orange: 'bg-orange-300',
        purple: 'bg-purple-300',
        red: 'bg-red-300',
        green: 'bg-green-300',
        indigo: 'bg-indigo-300',
        gray: 'bg-gray-300',
        black: 'bg-gray-400',
    };

    const activeClass = colorClasses[color] || colorClasses.teal;
    const activeLine = lineColors[color] || lineColors.teal;

    return (
        <div className="flex items-start">
            <div className="flex flex-col items-center mr-4 h-full">
                <div className={`flex items-center justify-center w-8 h-8 md:w-10 md:h-10 border-2 rounded-full font-bold text-sm md:text-base flex-shrink-0 ${activeClass}`}>
                    {number}
                </div>
                {!isLast && <div className={`w-0.5 h-full ${activeLine} my-1`}></div>}
            </div>
            <div className="pb-8 w-full text-left">
                <h3 className="mb-2 text-base md:text-lg font-bold text-gray-800 flex items-center">{title}</h3>
                <div className="text-gray-600 space-y-3 text-sm leading-relaxed">{children}</div>
            </div>
        </div>
    );
};

export const TabPanduan: React.FC = () => {
    const { showConfirmation, onDeleteSampleData, showToast } = useAppContext();
    const [sampleDataDeleted, setSampleDataDeleted] = useState(false);

    useEffect(() => {
        const deleted = localStorage.getItem('eSantriSampleDataDeleted') === 'true';
        setSampleDataDeleted(deleted);
    }, []);

    const handleDeleteSampleData = () => {
        showConfirmation(
            'Hapus Semua Data Sampel?',
            'PERHATIAN: Tindakan ini akan MENGHAPUS SEMUA data santri, keuangan, dan kas yang ada saat ini. Data pengaturan akan tetap tersimpan.',
            async () => {
                try {
                    await onDeleteSampleData();
                    localStorage.setItem('eSantriSampleDataDeleted', 'true');
                    setSampleDataDeleted(true);
                    showToast('Data sampel berhasil dihapus. Aplikasi akan dimuat ulang.', 'success');
                    setTimeout(() => window.location.reload(), 2000);
                } catch (error) {
                    showToast('Gagal menghapus data sampel.', 'error');
                }
            },
            { confirmText: 'Ya, Hapus Data Sampel', confirmColor: 'red' }
        );
    };

    const getColorClass = (color: string) => {
         const map: Record<string, string> = {
            purple: 'bg-purple-600',
            gray: 'bg-gray-800',
            teal: 'bg-teal-600',
            indigo: 'bg-indigo-600',
            blue: 'bg-blue-600',
            orange: 'bg-orange-500',
            green: 'bg-green-600',
         };
         return map[color] || 'bg-teal-600';
    };

    // Helper untuk menghitung nomor urut langkah secara kumulatif
    let cumulativeStepCount = 0;

    return (
        <div className="space-y-8 text-left">
            {/* --- HERO SECTION --- */}
            <div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Panduan Penggunaan Lengkap</h2>
                <p className="text-gray-600">
                    Dokumentasi teknis penggunaan eSantri Web. Pelajari cara mengelola data santri, keuangan, akademik, absensi, dan fitur lanjutan lainnya.
                </p>
            </div>

            {/* --- SAMPLE DATA WARNING --- */}
            {!sampleDataDeleted && (
                <div className="p-4 rounded-lg border-l-4 border-red-500 bg-red-50 text-red-800 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div>
                        <h4 className="font-bold flex items-center gap-2"><i className="bi bi-exclamation-triangle-fill"></i> Data Sampel Terdeteksi</h4>
                        <p className="mt-1 text-sm">Aplikasi ini berisi data dummy untuk demonstrasi. Hapus data ini sebelum mulai input data asli.</p>
                    </div>
                    <button onClick={handleDeleteSampleData} className="px-4 py-2 text-sm font-bold text-white bg-red-600 rounded hover:bg-red-700 whitespace-nowrap">Hapus Data Sampel</button>
                </div>
            )}

            {/* --- DYNAMIC SECTIONS FROM CONTENT DATA --- */}
            {panduanData.map(section => {
                // Simpan nomor awal untuk seksi ini
                const startNumber = cumulativeStepCount;
                // Tambahkan jumlah langkah di seksi ini ke kumulatif global
                cumulativeStepCount += section.steps.length;

                return (
                    <div key={section.id} id={section.id} className={`bg-white p-6 rounded-lg border shadow-sm ${section.containerClass || ''}`}>
                        <div className="flex items-center gap-3 mb-6 border-b pb-4">
                            <span className={`${getColorClass(section.badgeColor)} text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm`}>
                                {section.badge}
                            </span>
                            <h2 className="text-lg font-bold text-gray-800">{section.title}</h2>
                        </div>
                        
                        {/* Optional Info Box for SOP */}
                        {section.id === 'sop' && (
                            <div className="bg-yellow-50 p-3 rounded border border-yellow-200 text-sm mb-6 text-yellow-900">
                                <i className="bi bi-info-circle-fill mr-2"></i>
                                <strong>PENTING:</strong> Aplikasi ini <em>Offline-First</em>. Data tidak berubah secara real-time (seperti Google Docs). Anda harus mengikuti SOP ini agar data antar komputer sinkron.
                            </div>
                        )}
                        {/* Optional Info Box for Akademik */}
                        {section.id === 'akademik' && (
                            <div className="bg-indigo-50 p-3 rounded mb-4 text-sm text-indigo-900 border border-indigo-200">
                                <p><strong>Konsep Unik:</strong> Admin mendesain rapor, Guru mengisi nilai lewat file HTML (bisa di HP/Offline), lalu Guru mengirim nilai kembali ke Admin via WhatsApp.</p>
                            </div>
                        )}
                         {/* Optional Info Box for Absensi */}
                         {section.id === 'absensi' && (
                            <div className="bg-teal-50 p-3 rounded mb-4 text-sm text-teal-900 border border-teal-200 flex items-start gap-2">
                                <i className="bi bi-cloud-check-fill mt-1 text-lg"></i>
                                <div>
                                    <strong>Rekomendasi Optimal:</strong> Gunakan fitur ini bersama <strong>Sync Cloud</strong> aktif.
                                    Ini memungkinkan Guru/Musyrif menggunakan <em>perangkat masing-masing</em> untuk mengabsen (tidak harus di komputer Admin), sehingga pekerjaan tidak menumpuk di satu admin (Admin Sentris).
                                </div>
                            </div>
                        )}

                        {section.steps.map((step, idx) => (
                            <PanduanLangkah 
                                key={idx}
                                number={startNumber + idx + 1}
                                title={step.title} 
                                color={step.color || section.badgeColor}
                                isLast={idx === section.steps.length - 1}
                            >
                                {step.content}
                            </PanduanLangkah>
                        ))}
                    </div>
                );
            })}
        </div>
    );
};
