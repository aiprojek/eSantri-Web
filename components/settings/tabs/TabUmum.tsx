
import React, { useRef, useState, useEffect } from 'react';
import { PondokSettings, TenagaPengajar, Jenjang } from '../../../types';
import { compressImage } from '../../../utils/imageOptimizer';

interface TabUmumProps {
    localSettings: PondokSettings;
    handleInputChange: <K extends keyof PondokSettings>(key: K, value: PondokSettings[K]) => void;
    activeTeachers: TenagaPengajar[];
}

const LogoUploader: React.FC<{
    label: string;
    logoUrl?: string;
    onLogoChange: (url: string) => void;
}> = ({ label, logoUrl, onLogoChange }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setIsProcessing(true);
            try {
                // Logo mungkin butuh resolusi sedikit lebih baik dari pas foto, tapi tetap dikompres
                // Max width 500px cukup untuk kop surat
                const compressedBase64 = await compressImage(file, 500, 0.8);
                onLogoChange(compressedBase64);
            } catch (error) {
                console.error("Gagal kompres logo:", error);
                alert("Gagal memproses gambar.");
            } finally {
                setIsProcessing(false);
                if(fileInputRef.current) fileInputRef.current.value = '';
            }
        }
    };

    return (
        <div>
            <label className="block mb-1 text-sm font-medium text-gray-700">{label}</label>
            <div className="flex items-center gap-4">
                <img 
                    src={logoUrl || 'https://placehold.co/100x100/e2e8f0/334155?text=Logo'} 
                    alt={label} 
                    className={`w-20 h-20 object-contain rounded-md border bg-gray-100 p-1 ${isProcessing ? 'opacity-50' : ''}`}
                />
                <div className="flex-grow space-y-2">
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">URL Logo (atau Upload)</label>
                        <input
                            type="text"
                            placeholder="https://example.com/logo.png"
                            value={logoUrl?.startsWith('data:') ? '(Gambar Terupload)' : logoUrl || ''}
                            onChange={(e) => onLogoChange(e.target.value)}
                            disabled={logoUrl?.startsWith('data:')}
                            className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2.5 disabled:text-gray-500"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <input
                            type="file"
                            accept="image/*"
                            ref={fileInputRef}
                            onChange={handleFileUpload}
                            className="hidden"
                        />
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isProcessing}
                            className="text-sm text-white bg-gray-600 hover:bg-gray-700 font-medium px-4 py-2 rounded-md disabled:bg-gray-400 flex items-center gap-2"
                        >
                            {isProcessing ? '...' : 'Upload'}
                        </button>
                        {logoUrl && (
                             <button
                                type="button"
                                onClick={() => onLogoChange('')}
                                className="text-sm text-red-700 hover:text-red-900 font-medium px-4 py-2 rounded-md bg-red-100"
                            >
                                Hapus
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export const TabUmum: React.FC<TabUmumProps> = ({ localSettings, handleInputChange, activeTeachers }) => {
    // --- PWA & Offline State ---
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [isOfflineReady, setIsOfflineReady] = useState(false);
    const [isDownloadingAssets, setIsDownloadingAssets] = useState(false);
    const [downloadProgress, setDownloadProgress] = useState(0);
    
    useEffect(() => {
        // PWA Install Event Listener
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
        });

        // Check Offline Readiness
        checkOfflineStatus();
    }, []);

    const checkOfflineStatus = async () => {
        if ('caches' in window) {
            try {
                // We check if the main cache exists
                const cacheNames = await caches.keys();
                const mainCacheName = cacheNames.find(name => name.includes('esantri-web-hybrid'));
                
                if (mainCacheName) {
                    const cache = await caches.open(mainCacheName);
                    // Check a few critical dependencies to assume readiness
                    const react = await cache.match('https://esm.sh/react@18.3.1');
                    const dexie = await cache.match('https://esm.sh/dexie@3.2.4');
                    const tailwind = await cache.match('https://cdn.tailwindcss.com');
                    
                    if (react && dexie && tailwind) {
                        setIsOfflineReady(true);
                    } else {
                        setIsOfflineReady(false);
                    }
                }
            } catch (e) {
                console.error("Cache check failed", e);
            }
        }
    };

    const handleInstallClick = async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            setDeferredPrompt(null);
        }
    };

    const handleDownloadAssets = async () => {
        setIsDownloadingAssets(true);
        setDownloadProgress(0);
        try {
            const cacheName = 'esantri-web-hybrid-v2.3'; // Must match sw.js
            const cache = await caches.open(cacheName);
            
            // Comprehensive list of dependencies to ensure offline functionality in Hybrid Mode
            const urls = [
                '/',
                '/index.html',
                '/manifest.json',
                'https://cdn.tailwindcss.com',
                'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css',
                'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/fonts/bootstrap-icons.woff2?524846017b983fc8ded9325d94ed40f3',
                // ESM Libraries
                'https://esm.sh/react@18.3.1',
                'https://esm.sh/react-dom@18.3.1',
                'https://esm.sh/react-dom@18.3.1/client',
                'https://esm.sh/dexie@3.2.4',
                'https://esm.sh/dexie-react-hooks@1.1.7?external=react,dexie',
                'https://esm.sh/react-hook-form@7.51.5?external=react',
                'https://esm.sh/date-fns@^4.1.0',
                'https://esm.sh/html2canvas@1.4.1',
                'https://esm.sh/jspdf@2.5.1',
                'https://esm.sh/jspdf-autotable@3.8.2',
                'https://esm.sh/xlsx@0.18.5',
                'https://esm.sh/webdav@5.7.1',
                'https://esm.sh/react-virtuoso@^4.18.1?external=react,react-dom'
            ];

            const total = urls.length;
            let count = 0;

            // Fetch one by one to update progress
            for (const url of urls) {
                try {
                    await cache.add(url);
                } catch (err) {
                    console.warn(`Failed to cache ${url}`, err);
                }
                count++;
                setDownloadProgress(Math.round((count / total) * 100));
            }

            setIsOfflineReady(true);
            alert("Semua aset berhasil diunduh! Aplikasi siap berjalan offline sepenuhnya.");
        } catch (error) {
            console.error("Download assets failed", error);
            alert("Gagal mengunduh aset. Pastikan internet lancar.");
        } finally {
            setIsDownloadingAssets(false);
            setDownloadProgress(0);
        }
    };

    const handleJenjangHariLiburChange = (jenjangId: number, dayIndex: number) => {
        const updatedJenjang = localSettings.jenjang.map(j => {
            if (j.id === jenjangId) {
                const currentDays = j.hariLibur || [];
                let newDays;
                if (currentDays.includes(dayIndex)) {
                    newDays = currentDays.filter(d => d !== dayIndex);
                } else {
                    newDays = [...currentDays, dayIndex];
                }
                return { ...j, hariLibur: newDays };
            }
            return j;
        });
        handleInputChange('jenjang', updatedJenjang);
    };

    const daysOfWeek = [
        { val: 1, label: 'Senin' },
        { val: 2, label: 'Selasa' },
        { val: 3, label: 'Rabu' },
        { val: 4, label: 'Kamis' },
        { val: 5, label: 'Jumat' },
        { val: 6, label: 'Sabtu' },
        { val: 0, label: 'Ahad' },
    ];

    return (
        <div className="space-y-6">
            
            {/* STATUS APLIKASI (PWA & OFFLINE) */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg shadow-sm border border-blue-100 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl shadow-sm ${isOfflineReady ? 'bg-green-100 text-green-600' : 'bg-gray-200 text-gray-500'}`}>
                        <i className={`bi ${isOfflineReady ? 'bi-wifi-off' : 'bi-cloud-download'}`}></i>
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-800 text-lg">Status Aplikasi</h3>
                        <div className="flex items-center gap-2 mt-1">
                            {isOfflineReady ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                                    <i className="bi bi-check-circle-fill"></i> Siap Offline
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-200">
                                    <i className="bi bi-exclamation-circle-fill"></i> Belum Cache Penuh
                                </span>
                            )}
                        </div>
                    </div>
                </div>
                
                <div className="flex flex-col items-end gap-2">
                    <div className="flex gap-3">
                        {!isOfflineReady && (
                            <button 
                                onClick={handleDownloadAssets} 
                                disabled={isDownloadingAssets}
                                className="px-4 py-2 bg-white border border-blue-300 text-blue-700 rounded-lg text-sm font-bold shadow-sm hover:bg-blue-50 flex items-center gap-2"
                            >
                                {isDownloadingAssets ? <span className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full"></span> : <i className="bi bi-download"></i>}
                                {isDownloadingAssets ? `Mengunduh ${downloadProgress}%` : 'Unduh Aset Offline'}
                            </button>
                        )}
                        
                        {deferredPrompt && (
                            <button 
                                onClick={handleInstallClick} 
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold shadow-md hover:bg-blue-700 flex items-center gap-2 animate-bounce-subtle"
                            >
                                <i className="bi bi-phone"></i> Install Aplikasi (PWA)
                            </button>
                        )}
                    </div>
                    {!isOfflineReady && !isDownloadingAssets && (
                        <p className="text-[10px] text-gray-500 italic max-w-xs text-right">
                            *Klik unduh agar aplikasi bisa dibuka tanpa internet sama sekali (Mode Pesawat).
                        </p>
                    )}
                </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
                <h2 className="text-xl font-bold text-gray-700 mb-4 border-b pb-2">Informasi Umum</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block mb-1 text-sm font-medium text-gray-700">Nama Yayasan</label>
                        <input type="text" value={localSettings.namaYayasan} onChange={(e) => handleInputChange('namaYayasan', e.target.value)} className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-teal-500 focus:border-teal-500 block w-full p-2.5" />
                    </div>
                     <div>
                        <label className="block mb-1 text-sm font-medium text-gray-700">Nama Ponpes</label>
                        <input type="text" value={localSettings.namaPonpes} onChange={(e) => handleInputChange('namaPonpes', e.target.value)} className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-teal-500 focus:border-teal-500 block w-full p-2.5" />
                    </div>
                    <div>
                        <label className="block mb-1 text-sm font-medium text-gray-700">Mudir Aam</label>
                        <select value={localSettings.mudirAamId || ''} onChange={(e) => handleInputChange('mudirAamId', e.target.value ? parseInt(e.target.value) : undefined)} className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-teal-500 focus:border-teal-500 block w-full p-2.5">
                             <option value="">-- Pilih Mudir Aam --</option>
                             {activeTeachers.map(t => <option key={t.id} value={t.id}>{t.nama}</option>)}
                        </select>
                    </div>
                     <div>
                        <label className="block mb-1 text-sm font-medium text-gray-700">NSPP</label>
                        <input type="text" value={localSettings.nspp} onChange={(e) => handleInputChange('nspp', e.target.value)} className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-teal-500 focus:border-teal-500 block w-full p-2.5" />
                    </div>
                    <div>
                        <label className="block mb-1 text-sm font-medium text-gray-700">NPSN</label>
                        <input type="text" value={localSettings.npsn} onChange={(e) => handleInputChange('npsn', e.target.value)} className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-teal-500 focus:border-teal-500 block w-full p-2.5" />
                    </div>
                    <div>
                        <label className="block mb-1 text-sm font-medium text-gray-700">Telepon</label>
                        <input type="tel" value={localSettings.telepon} onChange={(e) => handleInputChange('telepon', e.target.value)} className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-teal-500 focus:border-teal-500 block w-full p-2.5" />
                    </div>
                     <div>
                        <label className="block mb-1 text-sm font-medium text-gray-700">Website</label>
                        <input type="url" value={localSettings.website} onChange={(e) => handleInputChange('website', e.target.value)} className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-teal-500 focus:border-teal-500 block w-full p-2.5" />
                    </div>
                     <div>
                        <label className="block mb-1 text-sm font-medium text-gray-700">Email</label>
                        <input type="email" value={localSettings.email} onChange={(e) => handleInputChange('email', e.target.value)} className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-teal-500 focus:border-teal-500 block w-full p-2.5" />
                    </div>
                    <div className="md:col-span-2">
                        <label className="block mb-1 text-sm font-medium text-gray-700">Alamat</label>
                        <textarea value={localSettings.alamat} onChange={(e) => handleInputChange('alamat', e.target.value)} rows={2} className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-teal-500 focus:border-teal-500 block w-full p-2.5"></textarea>
                    </div>

                    <div className="md:col-span-2 bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                        <div className="flex flex-col md:flex-row justify-between gap-6">
                            <div className="flex-1">
                                 <label className="block mb-2 text-sm font-bold text-yellow-800">Hari Libur Mingguan (KBM)</label>
                                 <p className="text-xs text-yellow-700 mb-3">Tentukan hari libur untuk setiap jenjang pendidikan.</p>
                                 {localSettings.jenjang.length > 0 ? (
                                    <div className="space-y-4">
                                        {localSettings.jenjang.map(j => (
                                            <div key={j.id} className="border-b border-yellow-200 pb-3 last:border-0 last:pb-0">
                                                <h4 className="text-sm font-semibold text-yellow-900 mb-2">{j.nama}</h4>
                                                <div className="flex flex-wrap gap-2">
                                                    {daysOfWeek.map(day => (
                                                        <label key={day.val} className="flex items-center gap-1.5 cursor-pointer bg-white px-2 py-1 rounded border border-yellow-300 hover:bg-yellow-100 transition-colors">
                                                            <input 
                                                                type="checkbox" 
                                                                checked={(j.hariLibur || []).includes(day.val)} 
                                                                onChange={() => handleJenjangHariLiburChange(j.id, day.val)}
                                                                className="w-3.5 h-3.5 text-teal-600 rounded focus:ring-teal-500"
                                                            />
                                                            <span className="text-xs font-medium text-gray-700">{day.label}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-xs text-red-600 italic">Belum ada data jenjang.</p>
                                )}
                            </div>
                            
                            <div className="w-full md:w-1/3 border-l md:border-l-yellow-200 pl-0 md:pl-6">
                                 <label className="block mb-2 text-sm font-bold text-yellow-800">Koreksi Tanggal Hijriah</label>
                                 <p className="text-xs text-yellow-700 mb-3">Gunakan opsi ini jika tanggal Hijriah di aplikasi berbeda 1-2 hari dengan ketetapan pemerintah.</p>
                                 <select 
                                    value={localSettings.hijriAdjustment || 0}
                                    onChange={(e) => handleInputChange('hijriAdjustment', parseInt(e.target.value))}
                                    className="bg-white border border-yellow-400 text-gray-800 text-sm rounded-lg focus:ring-yellow-500 focus:border-yellow-500 block w-full p-2.5"
                                >
                                    <option value="-2">-2 Hari (Mundur 2 hari)</option>
                                    <option value="-1">-1 Hari (Mundur 1 hari)</option>
                                    <option value="0">0 Hari (Sesuai Browser)</option>
                                    <option value="1">+1 Hari (Maju 1 hari)</option>
                                    <option value="2">+2 Hari (Maju 2 hari)</option>
                                </select>
                                 <div className="mt-2 text-xs bg-white p-2 rounded border border-yellow-300 text-gray-600">
                                     <strong>Contoh:</strong> Jika browser menampilkan <em>1 Ramadhan</em>, tetapi pemerintah menetapkan sudah <em>2 Ramadhan</em>, pilih <strong>+1 Hari</strong>.
                                 </div>
                            </div>
                        </div>
                    </div>

                    <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t mt-6">
                        <LogoUploader 
                            label="Logo Yayasan"
                            logoUrl={localSettings.logoYayasanUrl}
                            onLogoChange={(url) => handleInputChange('logoYayasanUrl', url)}
                        />
                        <LogoUploader 
                            label="Logo Pondok Pesantren"
                            logoUrl={localSettings.logoPonpesUrl}
                            onLogoChange={(url) => handleInputChange('logoPonpesUrl', url)}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};
