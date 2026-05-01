
import React, { useState, useEffect, useMemo } from 'react';
import { useAppContext } from '../../AppContext';
import { panduanData, PanduanSectionData } from '../../data/panduan';

const PANDUAN_ORDER: string[] = [
    'setup',
    'datamaster',
    'santri',
    'tahfizh',
    'absensi',
    'kesehatan',
    'bk',
    'bukutamu',
    'akademik',
    'perpustakaan',
    'kalender',
    'finance',
    'asrama',
    'koperasi',
    'laporan_lanjutan',
    'portal',
    'whatsapp',
    'cloud',
    'firebase',
    'admin',
    'offline',
    'maintenance',
    'fitur',
    'jurnal_mengajar',
    'cetak_kartu',
    'koperasi_pro',
];

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
        yellow: 'border-yellow-500 bg-yellow-50 text-yellow-600',
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
        yellow: 'bg-yellow-300',
    };

    const activeClass = colorClasses[color] || colorClasses.teal;
    const activeLine = lineColors[color] || lineColors.teal;

    return (
        <div className="flex items-start group">
            <div className="flex flex-col items-center mr-4 h-full min-h-[80px]">
                <div className={`flex items-center justify-center w-8 h-8 md:w-10 md:h-10 border-2 rounded-full font-bold text-sm md:text-base flex-shrink-0 transition-transform group-hover:scale-110 ${activeClass}`}>
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

export const TabPanduan: React.FC<{ initialSection?: string | null }> = ({ initialSection }) => {
    const { showConfirmation, onDeleteSampleData, showToast } = useAppContext();
    const [sampleDataDeleted, setSampleDataDeleted] = useState(false);
    const orderedPanduanData = useMemo<PanduanSectionData[]>(() => [
        ...PANDUAN_ORDER
            .map((id) => panduanData.find((item) => item.id === id))
            .filter((item): item is PanduanSectionData => Boolean(item)),
        ...panduanData.filter((item) => !PANDUAN_ORDER.includes(item.id)),
    ], []);
    const [activeSectionId, setActiveSectionId] = useState<string>(orderedPanduanData[0]?.id || 'setup');

    const handleTocClick = (id: string) => {
        setActiveSectionId(id);
    };

    useEffect(() => {
        if (initialSection && orderedPanduanData.some(s => s.id === initialSection)) {
            setActiveSectionId(initialSection);
        }
    }, [initialSection, orderedPanduanData]);

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
            red: 'bg-red-600',
            yellow: 'bg-yellow-500',
         };
         return map[color] || 'bg-teal-600';
    };

    const activeSection = orderedPanduanData.find(s => s.id === activeSectionId) || orderedPanduanData[0];
    if (!activeSection) {
        return null;
    }

    return (
        <div className="text-left">
            {/* --- HERO SECTION --- */}
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Panduan Penggunaan Lengkap</h2>
                <p className="text-gray-600">
                    Dokumentasi teknis penggunaan eSantri Web. Pelajari cara mengelola data santri, keuangan, akademik, absensi, dan fitur lanjutan lainnya.
                </p>
            </div>

            {/* --- SAMPLE DATA WARNING --- */}
            {!sampleDataDeleted && (
                <div className="p-4 mb-8 rounded-lg border-l-4 border-red-500 bg-red-50 text-red-800 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-bounce-subtle">
                    <div>
                        <h4 className="font-bold flex items-center gap-2"><i className="bi bi-exclamation-triangle-fill"></i> Data Sampel Terdeteksi</h4>
                        <p className="mt-1 text-sm">Aplikasi ini berisi data dummy untuk demonstrasi. Hapus data ini sebelum mulai input data asli.</p>
                    </div>
                    <button onClick={handleDeleteSampleData} className="px-4 py-2 text-sm font-bold text-white bg-red-600 rounded hover:bg-red-700 whitespace-nowrap shadow-sm">Hapus Data Sampel</button>
                </div>
            )}

            {/* --- MOBILE DROPDOWN --- */}
            <div className="block lg:hidden mb-6">
                <label htmlFor="panduan-selector" className="block text-sm font-semibold text-gray-700 mb-2">Pilih Topik Panduan:</label>
                <div className="relative">
                    <select 
                        id="panduan-selector"
                        value={activeSectionId}
                        onChange={(e) => setActiveSectionId(e.target.value)}
                        className="w-full pl-4 pr-10 py-3 bg-white border border-gray-300 rounded-xl shadow-sm appearance-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 font-medium text-gray-700"
                    >
                        {orderedPanduanData.map(s => (
                            <option key={s.id} value={s.id}>{s.title}</option>
                        ))}
                    </select>
                    <div className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none text-gray-400">
                        <i className="bi bi-chevron-down"></i>
                    </div>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-8 items-start">
                
                {/* --- TABLE OF CONTENTS (Sticky Sidebar) --- */}
                <nav className="hidden lg:block w-full lg:w-64 lg:sticky lg:top-4 bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden shrink-0 order-1 lg:order-1">
                    <div className="p-4 bg-gray-50 border-b border-gray-200">
                        <h3 className="font-bold text-gray-700 text-sm uppercase tracking-wide">Daftar Isi</h3>
                    </div>
                    <ul className="max-h-[300px] lg:max-h-[calc(100vh-200px)] overflow-y-auto custom-scrollbar">
                        {orderedPanduanData.map(section => (
                            <li key={section.id}>
                                <button 
                                    onClick={() => handleTocClick(section.id)}
                                    className={`w-full text-left px-4 py-2.5 text-sm border-l-4 transition-all hover:bg-gray-50 flex items-center justify-between group ${activeSectionId === section.id ? `border-${section.badgeColor}-500 bg-${section.badgeColor}-50 text-gray-900 font-semibold` : 'border-transparent text-gray-500'}`}
                                >
                                    <span>{section.title}</span>
                                    {activeSectionId === section.id && <i className={`bi bi-chevron-right text-${section.badgeColor}-500`}></i>}
                                </button>
                            </li>
                        ))}
                    </ul>
                </nav>

                {/* --- CONTENT (Selected Section Only) --- */}
                <div className="flex-1 order-2 lg:order-2 w-full animate-fade-in">
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden transition-all duration-300">
                        {/* Section Header */}
                        <div className="p-6 bg-gray-50 border-b border-gray-100 flex items-center gap-4">
                            <span className={`${getColorClass(activeSection.badgeColor)} text-white w-12 h-12 rounded-xl flex items-center justify-center font-bold text-xl shadow-lg transform -rotate-3 transition-transform hover:rotate-0`}>
                                {typeof activeSection.badge === 'number' ? activeSection.badge : (
                                    activeSection.badge === 'NEW' ? <i className="bi bi-stars"></i> : <i className="bi bi-info-lg"></i>
                                )}
                            </span>
                            <div>
                                <h2 className="text-xl md:text-2xl font-black text-gray-800 tracking-tight">{activeSection.title}</h2>
                                <p className="text-sm text-gray-500 font-medium">Langkah-langkah panduan detail</p>
                            </div>
                        </div>

                        {/* Section Body */}
                        <div className="p-6 md:p-8">
                            {/* Optional Info Boxes */}
                            {activeSection.id === 'sop' && (
                                <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-200 text-sm mb-8 text-yellow-900 flex gap-3 items-start shadow-sm border-l-4">
                                    <i className="bi bi-info-circle-fill text-xl text-yellow-500"></i>
                                    <div>
                                        <strong className="block mb-1">INFO SINKRONISASI:</strong> 
                                        Jika menggunakan <strong>Dropbox/WebDAV</strong>, aplikasi ini bersifat <em>Offline-First</em> (perlu kirim/terima manual). 
                                        Namun jika menggunakan <strong>Firebase</strong>, data akan berubah secara <strong>Real-Time</strong> otomatis.
                                    </div>
                                </div>
                            )}
                            
                            {activeSection.id === 'absensi' && (
                                <div className="bg-teal-50 p-4 rounded-xl mb-8 text-sm text-teal-900 border border-teal-200 flex items-start gap-3 shadow-sm border-l-4">
                                    <i className="bi bi-cloud-check-fill text-xl text-teal-500"></i>
                                    <div>
                                        <strong className="block mb-1">REKOMENDASI OPTIMAL:</strong> 
                                        Gunakan fitur ini bersama <strong>Sync Cloud</strong> aktif.
                                        Ini memungkinkan Guru/Musyrif menggunakan <em>perangkat masing-masing</em> untuk mengabsen (tidak harus di komputer Admin).
                                    </div>
                                </div>
                            )}

                            {activeSection.id === 'whatsapp' && (
                                <div className="bg-green-50 p-4 rounded-xl mb-8 text-sm text-green-900 border border-green-200 flex items-start gap-3 shadow-sm border-l-4">
                                    <i className="bi bi-shield-check text-xl text-green-500"></i>
                                    <div>
                                        <strong className="block mb-1">KEAMANAN NOMOR:</strong> 
                                        Kami menggunakan metode <strong>Redirect Resmi</strong>. 
                                        Aplikasi tidak meminta scan QR (pairing) yang berisiko pencurian session atau blokir spam. 
                                        Nomor Anda tetap aman karena pesan dikirim melalui kendali WhatsApp Web/Desktop Anda sendiri.
                                    </div>
                                </div>
                            )}

                            {/* Steps */}
                            <div className="space-y-2">
                                {activeSection.steps.map((step, idx) => (
                                    <PanduanLangkah 
                                        key={idx}
                                        number={idx + 1}
                                        title={step.title} 
                                        color={(step as any).color || activeSection.badgeColor}
                                        isLast={idx === activeSection.steps.length - 1}
                                    >
                                        {step.content}
                                    </PanduanLangkah>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
