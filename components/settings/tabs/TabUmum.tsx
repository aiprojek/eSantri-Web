
import React, { useRef, useState, useEffect } from 'react';
import { AiConfig, PondokSettings, PondokCustomInfoField, TenagaPengajar, Jenjang } from '../../../types';
import { compressImage } from '../../../utils/imageOptimizer';
import { SectionCard } from '../../common/SectionCard';
import { formatCustomFieldTag, getKopIdentityLines } from '../../common/PrintHeader';
import { useAppContext } from '../../../AppContext';
import { APP_VERSION } from '../../../version';

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
            <label className="mb-1 block text-sm font-medium text-slate-700">{label}</label>
            <div className="flex items-center gap-4">
                <img 
                    src={logoUrl || 'https://placehold.co/100x100/e2e8f0/334155?text=Logo'} 
                    alt={label} 
                    className={`h-20 w-20 rounded-md border border-app-border bg-slate-100 object-contain p-1 ${isProcessing ? 'opacity-50' : ''}`}
                />
                <div className="flex-grow space-y-2">
                    <div>
                        <label className="mb-1 block text-xs font-medium text-slate-600">URL Logo (atau Upload)</label>
                        <input
                            type="text"
                            placeholder="https://example.com/logo.png"
                            value={logoUrl?.startsWith('data:') ? '(Gambar Terupload)' : logoUrl || ''}
                            onChange={(e) => onLogoChange(e.target.value)}
                            disabled={logoUrl?.startsWith('data:')}
                            className="app-input block w-full p-2.5 text-sm disabled:text-slate-500"
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
                            className="inline-flex items-center gap-2 rounded-md bg-slate-600 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:bg-slate-400"
                        >
                            {isProcessing ? '...' : 'Upload'}
                        </button>
                        {logoUrl && (
                             <button
                                type="button"
                                onClick={() => onLogoChange('')}
                                className="rounded-md bg-red-100 px-4 py-2 text-sm font-medium text-red-700 hover:text-red-900"
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
    const { showToast } = useAppContext();
    // --- PWA & Offline State ---
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [isOfflineReady, setIsOfflineReady] = useState(false);
    const [isDownloadingAssets, setIsDownloadingAssets] = useState(false);
    const [downloadProgress, setDownloadProgress] = useState(0);
    const [aiTestStatus, setAiTestStatus] = useState<{ provider: 'openai' | 'gemini' | null; ok: boolean; message: string } | null>(null);
    const [isTestingOpenAI, setIsTestingOpenAI] = useState(false);
    const [isTestingGemini, setIsTestingGemini] = useState(false);
    const [isTestingOpenRouter, setIsTestingOpenRouter] = useState(false);
    const [isLoadingOpenRouterModels, setIsLoadingOpenRouterModels] = useState(false);
    const [openRouterModelQuery, setOpenRouterModelQuery] = useState('');
    const [openRouterModels, setOpenRouterModels] = useState<Array<{ id: string; isFree: boolean }>>([]);
    const [showApiKeys, setShowApiKeys] = useState<{ openai: boolean; gemini: boolean; openrouter: boolean }>({
        openai: false,
        gemini: false,
        openrouter: false
    });
    
    const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);

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
                const cacheNames = await caches.keys();
                const mainCacheName = cacheNames.find(name => name.startsWith('esantri-cache') || name.includes('esantri-web-local'));
                
                if (mainCacheName) {
                    const cache = await caches.open(mainCacheName);
                    const manifest = await cache.match('/manifest.json');
                    const icon = await cache.match('/icon.svg');
                    
                    if (manifest && icon) {
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

    const handleCheckUpdate = async () => {
        setIsCheckingUpdate(true);
        try {
            if ('serviceWorker' in navigator) {
                const reg = await navigator.serviceWorker.getRegistration();
                if (reg) {
                    await reg.update();
                }
            }
            const res = await fetch(`/version.json?t=${Date.now()}`, { cache: 'no-store' });
            if (res.ok) {
                const data = await res.json();
                if (data && data.version && data.version !== APP_VERSION && data.version !== '1.0.0-dev') {
                    showToast(`Versi baru (${data.version}) tersedia! Memperbarui cache aplikasi...`, 'info');
                    if ('caches' in window) {
                        const keys = await caches.keys();
                        await Promise.all(keys.map(k => caches.delete(k)));
                    }
                    setTimeout(() => window.location.reload(), 1200);
                    return;
                }
            }
            showToast("Aplikasi sudah menggunakan versi build terbaru.", "success");
        } catch (e) {
            showToast("Gagal memeriksa pembaruan. Pastikan perangkat terhubung internet.", "error");
        } finally {
            setIsCheckingUpdate(false);
        }
    };

    const handleDownloadAssets = async () => {
        setIsDownloadingAssets(true);
        setDownloadProgress(0);
        try {
            const cacheNames = await caches.keys();
            const cacheName = cacheNames.find(name => name.startsWith('esantri-cache')) || 'esantri-cache-local';
            const cache = await caches.open(cacheName);
            
            const baseUrls = [
                '/',
                '/index.html',
                '/manifest.json',
                '/icon.svg',
                '/icon.png',
                '/logo.svg',
                '/sw.js'
            ];

            // Auto-discover loaded scripts, stylesheets and icons in DOM
            const docScripts = Array.from(document.querySelectorAll('script[src]')).map(el => (el as HTMLScriptElement).src);
            const docStyles = Array.from(document.querySelectorAll('link[rel="stylesheet"]')).map(el => (el as HTMLLinkElement).href);
            const docIcons = Array.from(document.querySelectorAll('link[rel*="icon"]')).map(el => (el as HTMLLinkElement).href);

            const allUrls = Array.from(new Set([...baseUrls, ...docScripts, ...docStyles, ...docIcons])).filter(Boolean);

            const total = allUrls.length;
            let count = 0;

            // Fetch one by one to update progress
            for (const url of allUrls) {
                try {
                    await cache.add(url);
                } catch (err) {
                    console.warn(`Failed to cache ${url}`, err);
                }
                count++;
                setDownloadProgress(Math.round((count / total) * 100));
            }

            setIsOfflineReady(true);
            showToast("Semua aset aplikasi berhasil diunduh. Aplikasi kini siap digunakan secara offline penuh.", "success");
        } catch (error) {
            console.error("Download assets failed", error);
            showToast("Gagal mengunduh aset offline. Pastikan koneksi internet stabil.", "error");
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

    const aiConfig: AiConfig = {
        provider: localSettings.aiConfig?.provider || 'pollinations',
        preferByok: localSettings.aiConfig?.preferByok || false,
        openaiApiKey: localSettings.aiConfig?.openaiApiKey || '',
        openaiModel: localSettings.aiConfig?.openaiModel || 'gpt-4.1-mini',
        openaiImageModel: localSettings.aiConfig?.openaiImageModel || 'gpt-image-1',
        geminiApiKey: localSettings.aiConfig?.geminiApiKey || '',
        geminiModel: localSettings.aiConfig?.geminiModel || 'gemini-2.5-flash',
        enablePosterImageGeneration: localSettings.aiConfig?.enablePosterImageGeneration ?? true,
        openaiLastTestAt: localSettings.aiConfig?.openaiLastTestAt || '',
        openaiLastTestOk: localSettings.aiConfig?.openaiLastTestOk,
        geminiLastTestAt: localSettings.aiConfig?.geminiLastTestAt || '',
        geminiLastTestOk: localSettings.aiConfig?.geminiLastTestOk,
        openrouterApiKey: localSettings.aiConfig?.openrouterApiKey || '',
        openrouterModel: localSettings.aiConfig?.openrouterModel || 'openai/gpt-4.1-mini',
        openrouterAutoFreeFallback: localSettings.aiConfig?.openrouterAutoFreeFallback ?? true,
        openrouterFreeModelPool: localSettings.aiConfig?.openrouterFreeModelPool || [],
        openrouterLastTestAt: localSettings.aiConfig?.openrouterLastTestAt || '',
        openrouterLastTestOk: localSettings.aiConfig?.openrouterLastTestOk
    };

    const handleAiConfigChange = (patch: Partial<AiConfig>) => {
        handleInputChange('aiConfig', {
            ...aiConfig,
            ...patch
        });
    };

    const testOpenAIConnection = async () => {
        if (!aiConfig.openaiApiKey) {
            showToast('API key OpenAI belum diisi.', 'error');
            return;
        }
        setIsTestingOpenAI(true);
        try {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${aiConfig.openaiApiKey}`
                },
                body: JSON.stringify({
                    model: aiConfig.openaiModel || 'gpt-4.1-mini',
                    messages: [{ role: 'user', content: 'Balas singkat: OK' }],
                    temperature: 0
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const now = new Date().toISOString();
            handleAiConfigChange({ openaiLastTestAt: now, openaiLastTestOk: true });
            setAiTestStatus({ provider: 'openai', ok: true, message: 'Koneksi OpenAI berhasil.' });
            showToast('Koneksi OpenAI berhasil.', 'success');
        } catch (error) {
            const now = new Date().toISOString();
            handleAiConfigChange({ openaiLastTestAt: now, openaiLastTestOk: false });
            setAiTestStatus({ provider: 'openai', ok: false, message: 'Koneksi OpenAI gagal.' });
            showToast('Koneksi OpenAI gagal. Periksa API key/model.', 'error');
        } finally {
            setIsTestingOpenAI(false);
        }
    };

    const testGeminiConnection = async () => {
        if (!aiConfig.geminiApiKey) {
            showToast('API key Gemini belum diisi.', 'error');
            return;
        }
        setIsTestingGemini(true);
        try {
            const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(aiConfig.geminiModel || 'gemini-2.5-flash')}:generateContent?key=${encodeURIComponent(aiConfig.geminiApiKey)}`;
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: 'Balas singkat: OK' }] }]
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const now = new Date().toISOString();
            handleAiConfigChange({ geminiLastTestAt: now, geminiLastTestOk: true });
            setAiTestStatus({ provider: 'gemini', ok: true, message: 'Koneksi Gemini berhasil.' });
            showToast('Koneksi Gemini berhasil.', 'success');
        } catch (error) {
            const now = new Date().toISOString();
            handleAiConfigChange({ geminiLastTestAt: now, geminiLastTestOk: false });
            setAiTestStatus({ provider: 'gemini', ok: false, message: 'Koneksi Gemini gagal.' });
            showToast('Koneksi Gemini gagal. Periksa API key/model.', 'error');
        } finally {
            setIsTestingGemini(false);
        }
    };

    const testOpenRouterConnection = async () => {
        if (!aiConfig.openrouterApiKey) {
            showToast('API key OpenRouter belum diisi.', 'error');
            return;
        }
        setIsTestingOpenRouter(true);
        try {
            const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${aiConfig.openrouterApiKey}`
                },
                body: JSON.stringify({
                    model: aiConfig.openrouterModel || 'openai/gpt-4.1-mini',
                    messages: [{ role: 'user', content: 'Balas singkat: OK' }],
                    temperature: 0
                })
            });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const now = new Date().toISOString();
            handleAiConfigChange({ openrouterLastTestAt: now, openrouterLastTestOk: true });
            setAiTestStatus({ provider: null, ok: true, message: 'Koneksi OpenRouter berhasil.' });
            showToast('Koneksi OpenRouter berhasil.', 'success');
        } catch (error) {
            const now = new Date().toISOString();
            handleAiConfigChange({ openrouterLastTestAt: now, openrouterLastTestOk: false });
            setAiTestStatus({ provider: null, ok: false, message: 'Koneksi OpenRouter gagal.' });
            showToast('Koneksi OpenRouter gagal. Periksa API key/model.', 'error');
        } finally {
            setIsTestingOpenRouter(false);
        }
    };

    const fetchOpenRouterModels = async () => {
        if (!aiConfig.openrouterApiKey) {
            showToast('Isi API key OpenRouter dulu sebelum ambil daftar model.', 'error');
            return;
        }
        setIsLoadingOpenRouterModels(true);
        try {
            const response = await fetch('https://openrouter.ai/api/v1/models', {
                headers: {
                    Authorization: `Bearer ${aiConfig.openrouterApiKey}`
                }
            });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
            const models = (data?.data || []).map((item: any) => {
                const pricing = item?.pricing || {};
                const promptPrice = Number(pricing.prompt ?? 0);
                const completionPrice = Number(pricing.completion ?? 0);
                const isFreeByPrice = promptPrice === 0 && completionPrice === 0;
                const isFreeByName = String(item?.id || '').includes(':free');
                return {
                    id: String(item?.id || ''),
                    isFree: isFreeByPrice || isFreeByName
                };
            }).filter((m: any) => Boolean(m.id));

            const freePool = models.filter((m: any) => m.isFree).map((m: any) => m.id);
            setOpenRouterModels(models);
            handleAiConfigChange({ openrouterFreeModelPool: freePool });
            showToast(`Berhasil memuat ${models.length} model OpenRouter (${freePool.length} gratis).`, 'success');
        } catch (error) {
            showToast('Gagal mengambil daftar model OpenRouter.', 'error');
        } finally {
            setIsLoadingOpenRouterModels(false);
        }
    };

    return (
        <div className="space-y-6">
            
            {/* STATUS APLIKASI (PWA & OFFLINE) */}
            <SectionCard
                title="Status Aplikasi"
                description="Pantau kesiapan offline, unduh aset inti, dan install aplikasi sebagai PWA bila diperlukan."
                contentClassName="p-6"
            >
            <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
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
                    <div className="flex flex-wrap gap-2 justify-end">
                        <button 
                            type="button"
                            onClick={handleCheckUpdate} 
                            disabled={isCheckingUpdate}
                            className="px-3.5 py-2 bg-slate-50 border border-slate-300 text-slate-700 rounded-lg text-sm font-semibold shadow-sm hover:bg-slate-100 flex items-center gap-2 transition-colors disabled:opacity-60"
                            title="Periksa apakah ada pembaruan versi baru tanpa menghapus data santri"
                        >
                            <i className={`bi bi-arrow-clockwise ${isCheckingUpdate ? 'animate-spin text-teal-600' : 'text-slate-500'}`}></i>
                            {isCheckingUpdate ? 'Memeriksa...' : 'Cek Pembaruan'}
                        </button>

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
            </SectionCard>

            <SectionCard
                title="Informasi Umum"
                description="Atur identitas yayasan, pondok pesantren, kontak utama, dan hari libur mingguan per jenjang."
                contentClassName="space-y-6 p-6"
            >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">Nama Yayasan</label>
                        <input type="text" value={localSettings.namaYayasan} onChange={(e) => handleInputChange('namaYayasan', e.target.value)} className="app-input block w-full p-2.5 text-sm" />
                    </div>
                     <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">Nama Ponpes</label>
                        <input type="text" value={localSettings.namaPonpes} onChange={(e) => handleInputChange('namaPonpes', e.target.value)} className="app-input block w-full p-2.5 text-sm" />
                    </div>
                    <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">Mudir Aam</label>
                        <select value={localSettings.mudirAamId || ''} onChange={(e) => handleInputChange('mudirAamId', e.target.value ? parseInt(e.target.value) : undefined)} className="app-select block w-full p-2.5 text-sm">
                             <option value="">-- Pilih Mudir Aam --</option>
                             {activeTeachers.map(t => <option key={t.id} value={t.id}>{t.nama}</option>)}
                        </select>
                    </div>
                     <div>
                        <div className="mb-1 flex items-center justify-between">
                            <label className="block text-sm font-medium text-slate-700">NSPP</label>
                            <label className="inline-flex items-center gap-1.5 cursor-pointer text-xs font-medium text-slate-600 hover:text-teal-700 select-none">
                                <input
                                    type="checkbox"
                                    checked={localSettings.showNsppInKop !== false}
                                    onChange={(e) => handleInputChange('showNsppInKop', e.target.checked)}
                                    className="h-3.5 w-3.5 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                                />
                                <span>Tampil di Kop</span>
                            </label>
                        </div>
                        <input type="text" value={localSettings.nspp} onChange={(e) => handleInputChange('nspp', e.target.value)} className="app-input block w-full p-2.5 text-sm" placeholder="cth: 510033020001" />
                    </div>
                    <div>
                        <div className="mb-1 flex items-center justify-between">
                            <label className="block text-sm font-medium text-slate-700">NPSN</label>
                            <label className="inline-flex items-center gap-1.5 cursor-pointer text-xs font-medium text-slate-600 hover:text-teal-700 select-none">
                                <input
                                    type="checkbox"
                                    checked={localSettings.showNpsnInKop !== false}
                                    onChange={(e) => handleInputChange('showNpsnInKop', e.target.checked)}
                                    className="h-3.5 w-3.5 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                                />
                                <span>Tampil di Kop</span>
                            </label>
                        </div>
                        <input type="text" value={localSettings.npsn} onChange={(e) => handleInputChange('npsn', e.target.value)} className="app-input block w-full p-2.5 text-sm" placeholder="cth: 69900001" />
                    </div>
                    <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">Telepon</label>
                        <input type="tel" value={localSettings.telepon} onChange={(e) => handleInputChange('telepon', e.target.value)} className="app-input block w-full p-2.5 text-sm" />
                    </div>
                     <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">Website</label>
                        <input type="url" value={localSettings.website} onChange={(e) => handleInputChange('website', e.target.value)} className="app-input block w-full p-2.5 text-sm" />
                    </div>
                     <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
                        <input type="email" value={localSettings.email} onChange={(e) => handleInputChange('email', e.target.value)} className="app-input block w-full p-2.5 text-sm" />
                    </div>
                    <div className="md:col-span-2">
                        <label className="mb-1 block text-sm font-medium text-slate-700">Alamat</label>
                        <textarea value={localSettings.alamat} onChange={(e) => handleInputChange('alamat', e.target.value)} rows={2} className="app-input block w-full p-2.5 text-sm"></textarea>
                    </div>

                    {/* DATA & IDENTITAS TAMBAHAN FLEKSIBEL (NOMOR IJOB, SK, AKREDITASI, DLL) */}
                    <div className="md:col-span-2 rounded-xl border border-teal-200 bg-teal-50/40 p-4 space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div>
                                <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                    <i className="bi bi-card-checklist text-teal-600"></i>
                                    Data & Nomor Identitas Tambahan (Fleksibel)
                                </h4>
                                <p className="text-xs text-slate-600 mt-0.5">
                                    Tambahkan data legalitas atau atribut lembaga sesuai kebutuhan (misal: <strong>Nomor IJOB</strong>, <strong>SK Kemenag</strong>, <strong>Akreditasi</strong>, <strong>NPWP</strong>) dan atur apakah ditampilkan di <strong>Kop Surat / Dokumen</strong>.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    const current = localSettings.customInfoFields || [];
                                    const nextField: PondokCustomInfoField = {
                                        id: `custom_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                                        label: '',
                                        value: '',
                                        showInKop: true
                                    };
                                    handleInputChange('customInfoFields', [...current, nextField]);
                                }}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-3.5 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-teal-700 transition-colors shrink-0"
                            >
                                <i className="bi bi-plus-lg"></i> Tambah Field Baru
                            </button>
                        </div>

                        {/* Quick-Add Presets */}
                        <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-[11px] font-semibold text-slate-500 mr-1">Tambah Cepat:</span>
                            {[
                                { label: 'No. IJOB', placeholder: 'Kw.11.5/5/PP.00.7/1234/2023' },
                                { label: 'SK Kemenag', placeholder: 'Nomor SK Izin Operasional Kemenag' },
                                { label: 'SK Kemenkumham', placeholder: 'AHU-0012345.AH.01.04.Tahun 2022' },
                                { label: 'Akreditasi', placeholder: 'Terakreditasi A' },
                                { label: 'NSM / NSDT', placeholder: '311233020001' },
                                { label: 'NPWP', placeholder: '01.234.567.8-901.000' },
                            ].map((preset) => {
                                const alreadyExists = (localSettings.customInfoFields || []).some(
                                    (f) => f.label.trim().toLowerCase() === preset.label.toLowerCase()
                                );
                                return (
                                    <button
                                        key={preset.label}
                                        type="button"
                                        disabled={alreadyExists}
                                        onClick={() => {
                                            const current = localSettings.customInfoFields || [];
                                            handleInputChange('customInfoFields', [
                                                ...current,
                                                {
                                                    id: `custom_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                                                    label: preset.label,
                                                    value: '',
                                                    showInKop: true
                                                }
                                            ]);
                                        }}
                                        className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-all ${
                                            alreadyExists
                                                ? 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed'
                                                : 'border-teal-200 bg-white text-teal-800 hover:bg-teal-600 hover:text-white hover:border-teal-600 shadow-2xs'
                                        }`}
                                    >
                                        <i className={`bi ${alreadyExists ? 'bi-check2' : 'bi-plus'}`}></i>
                                        {preset.label}
                                    </button>
                                );
                            })}
                        </div>

                        {/* List of Custom Fields */}
                        {(localSettings.customInfoFields || []).length > 0 ? (
                            <div className="space-y-2.5">
                                {(localSettings.customInfoFields || []).map((field, index) => {
                                    const list = localSettings.customInfoFields || [];
                                    const varTag = formatCustomFieldTag(field.label);
                                    return (
                                        <div
                                            key={field.id || index}
                                            className="flex flex-col md:flex-row items-stretch md:items-center gap-2.5 rounded-xl border border-slate-200 bg-white p-3 shadow-2xs"
                                        >
                                            <div className="w-full md:w-1/3">
                                                <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                                                    Nama Field / Label
                                                </label>
                                                <input
                                                    type="text"
                                                    value={field.label}
                                                    placeholder="cth: No. IJOB / SK Kemenag"
                                                    onChange={(e) => {
                                                        const updated = [...list];
                                                        updated[index] = { ...updated[index], label: e.target.value };
                                                        handleInputChange('customInfoFields', updated);
                                                    }}
                                                    className="app-input block w-full p-2 text-xs font-semibold"
                                                />
                                            </div>
                                            <div className="w-full md:flex-1">
                                                <div className="flex items-center justify-between mb-1">
                                                    <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                                                        Isi / Nomor Data
                                                    </label>
                                                    {field.label.trim() && (
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                navigator.clipboard?.writeText(varTag);
                                                                showToast(`Tag variabel ${varTag} disalin! Bisa dipakai di Surat & Rapor.`, 'info');
                                                            }}
                                                            title="Klik untuk menyalin tag variabel (dapat dipakai di template Surat Menyurat & Rapor)"
                                                            className="text-[10px] font-mono text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 px-1.5 py-0.2 rounded flex items-center gap-1"
                                                        >
                                                            <i className="bi bi-braces"></i> {varTag}
                                                        </button>
                                                    )}
                                                </div>
                                                <input
                                                    type="text"
                                                    value={field.value}
                                                    placeholder="Masukkan nomor atau informasi..."
                                                    onChange={(e) => {
                                                        const updated = [...list];
                                                        updated[index] = { ...updated[index], value: e.target.value };
                                                        handleInputChange('customInfoFields', updated);
                                                    }}
                                                    className="app-input block w-full p-2 text-xs"
                                                />
                                            </div>
                                            <div className="flex items-center justify-between md:justify-end gap-2 pt-1 md:pt-4 shrink-0">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const updated = [...list];
                                                        updated[index] = { ...updated[index], showInKop: !updated[index].showInKop };
                                                        handleInputChange('customInfoFields', updated);
                                                    }}
                                                    className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition-all ${
                                                        field.showInKop
                                                            ? 'border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                                                            : 'border-slate-200 bg-slate-100 text-slate-500 hover:bg-slate-200'
                                                    }`}
                                                    title={field.showInKop ? 'Field ini DITAMPILKAN pada Kop Surat & Dokumen Resmi' : 'Field ini DISEMBUNYIKAN dari Kop Surat (hanya disimpan sebagai data/variabel)'}
                                                >
                                                    <i className={`bi ${field.showInKop ? 'bi-eye-fill text-emerald-600' : 'bi-eye-slash text-slate-400'}`}></i>
                                                    <span>{field.showInKop ? 'Tampil di Kop' : 'Disembunyikan'}</span>
                                                </button>

                                                <div className="flex items-center gap-1">
                                                    <button
                                                        type="button"
                                                        disabled={index === 0}
                                                        onClick={() => {
                                                            if (index === 0) return;
                                                            const updated = [...list];
                                                            const temp = updated[index - 1];
                                                            updated[index - 1] = updated[index];
                                                            updated[index] = temp;
                                                            handleInputChange('customInfoFields', updated);
                                                        }}
                                                        className="rounded-lg border border-slate-200 bg-white p-2 text-xs text-slate-600 hover:bg-slate-100 disabled:opacity-40"
                                                        title="Geser ke Atas"
                                                    >
                                                        <i className="bi bi-arrow-up"></i>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        disabled={index === list.length - 1}
                                                        onClick={() => {
                                                            if (index === list.length - 1) return;
                                                            const updated = [...list];
                                                            const temp = updated[index + 1];
                                                            updated[index + 1] = updated[index];
                                                            updated[index] = temp;
                                                            handleInputChange('customInfoFields', updated);
                                                        }}
                                                        className="rounded-lg border border-slate-200 bg-white p-2 text-xs text-slate-600 hover:bg-slate-100 disabled:opacity-40"
                                                        title="Geser ke Bawah"
                                                    >
                                                        <i className="bi bi-arrow-down"></i>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const updated = list.filter((_, idx) => idx !== index);
                                                            handleInputChange('customInfoFields', updated);
                                                        }}
                                                        className="rounded-lg border border-rose-200 bg-rose-50 p-2 text-xs text-rose-600 hover:bg-rose-100"
                                                        title="Hapus Field"
                                                    >
                                                        <i className="bi bi-trash"></i>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="rounded-xl border border-dashed border-teal-300 bg-white/70 p-4 text-center text-xs text-slate-500">
                                Belum ada field tambahan. Klik <strong>"+ Tambah Field Baru"</strong> atau pilih tombol tambah cepat di atas (misal: <strong>No. IJOB</strong>).
                            </div>
                        )}

                        {/* Live Preview Kop Surat */}
                        <div className="rounded-xl border border-slate-300 bg-white p-4 shadow-2xs">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700 flex items-center gap-1.5">
                                    <i className="bi bi-printer"></i> Pratinjau Langsung Kop Surat Resmi
                                </span>
                                <span className="text-[10px] text-slate-400">
                                    Otomatis diterapkan ke Surat Menyurat, Rapor, Laporan & Kwitansi
                                </span>
                            </div>
                            <div className="border border-slate-200 rounded-lg p-3 bg-slate-50/50">
                                <div className="flex items-center justify-between gap-3 text-black">
                                    <div className="w-12 h-12 flex items-center justify-center shrink-0">
                                        {localSettings.logoYayasanUrl ? (
                                            <img src={localSettings.logoYayasanUrl} alt="Logo Yayasan" className="max-h-full max-w-full object-contain" />
                                        ) : (
                                            <div className="w-10 h-10 rounded border border-dashed border-slate-300 flex items-center justify-center text-[9px] text-slate-400">Logo</div>
                                        )}
                                    </div>
                                    <div className="text-center flex-1 px-2">
                                        {localSettings.namaYayasan && (
                                            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-700 leading-tight">
                                                {localSettings.namaYayasan}
                                            </p>
                                        )}
                                        <p className="text-sm font-extrabold uppercase text-slate-900 leading-tight">
                                            {localSettings.namaPonpes || 'Nama Pondok Pesantren'}
                                        </p>
                                        {getKopIdentityLines(localSettings).length > 0 && (
                                            <p className="text-[11px] font-semibold text-teal-800 mt-0.5">
                                                {getKopIdentityLines(localSettings).join(' | ')}
                                            </p>
                                        )}
                                        <p className="text-[10px] text-slate-600 mt-0.5 leading-snug">
                                            {localSettings.alamat || 'Alamat Pondok Pesantren'}
                                        </p>
                                        <p className="text-[10px] text-slate-500 leading-snug">
                                            {[
                                                localSettings.telepon?.trim() ? `Telp: ${localSettings.telepon.trim()}` : '',
                                                localSettings.email?.trim() ? `Email: ${localSettings.email.trim()}` : '',
                                                localSettings.website?.trim() ? `Website: ${localSettings.website.trim()}` : '',
                                            ].filter(Boolean).join(' | ')}
                                        </p>
                                    </div>
                                    <div className="w-12 h-12 flex items-center justify-center shrink-0">
                                        {localSettings.logoPonpesUrl ? (
                                            <img src={localSettings.logoPonpesUrl} alt="Logo Ponpes" className="max-h-full max-w-full object-contain" />
                                        ) : (
                                            <div className="w-10 h-10 rounded border border-dashed border-slate-300 flex items-center justify-center text-[9px] text-slate-400">Logo</div>
                                        )}
                                    </div>
                                </div>
                                <hr className="mt-2 border-t-2 border-slate-800" />
                            </div>
                        </div>
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

                    <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t mt-6">
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
                        <LogoUploader 
                            label="Stempel Resmi Pondok"
                            logoUrl={localSettings.stempelPonpesUrl}
                            onLogoChange={(url) => handleInputChange('stempelPonpesUrl', url)}
                        />
                    </div>
                </div>
            </SectionCard>

            <SectionCard
                title="AI Assistant (BYOK)"
                description="Pengaturan AI dibuat ringkas: pilih provider aktif, isi kredensial yang diperlukan, lalu uji koneksi."
                contentClassName="space-y-4 p-6"
            >
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">Provider Aktif</label>
                        <select
                            value={aiConfig.provider}
                            onChange={(e) => handleAiConfigChange({ provider: e.target.value as AiConfig['provider'] })}
                            className="app-select block w-full p-2.5 text-sm"
                        >
                            <option value="pollinations">Pollinations (Gratis)</option>
                            <option value="openai">OpenAI (BYOK)</option>
                            <option value="gemini">Gemini (BYOK)</option>
                            <option value="openrouter">OpenRouter (BYOK)</option>
                        </select>
                    </div>
                    <label className="inline-flex items-start gap-2 rounded-xl border border-app-border bg-app-subtle px-3 py-2 text-sm text-slate-700">
                        <input
                            type="checkbox"
                            className="mt-0.5"
                            checked={aiConfig.preferByok}
                            onChange={(e) => handleAiConfigChange({ preferByok: e.target.checked })}
                        />
                        <span>
                            <span className="font-semibold">Prioritaskan BYOK</span>
                            <span className="mt-1 block text-xs text-slate-500">Jika gagal, sistem fallback ke mode gratis.</span>
                        </span>
                    </label>
                </div>

                {aiConfig.provider === 'openai' && (
                    <div className="rounded-xl border border-app-border bg-white p-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                                <span>OpenAI API Key</span>
                                {aiConfig.openaiApiKey ? (
                                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">Tersimpan</span>
                                ) : (
                                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">Belum Diisi</span>
                                )}
                            </div>
                            {aiConfig.openaiApiKey && (
                                <button
                                    type="button"
                                    onClick={() => handleAiConfigChange({ openaiApiKey: '' })}
                                    className="text-xs text-red-600 hover:text-red-700 font-medium"
                                >
                                    Hapus Key
                                </button>
                            )}
                        </div>
                        <div className="relative">
                            <input
                                type={showApiKeys.openai ? 'text' : 'password'}
                                value={aiConfig.openaiApiKey || ''}
                                onChange={(e) => handleAiConfigChange({ openaiApiKey: e.target.value })}
                                className="app-input block w-full p-2.5 pr-10 text-sm font-mono"
                                placeholder="OpenAI API key (sk-...)"
                            />
                            <button
                                type="button"
                                onClick={() => setShowApiKeys(prev => ({ ...prev, openai: !prev.openai }))}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                title={showApiKeys.openai ? 'Sembunyikan API Key' : 'Tampilkan API Key'}
                            >
                                <i className={`bi ${showApiKeys.openai ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                            </button>
                        </div>
                        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                            <input
                                type="text"
                                value={aiConfig.openaiModel || 'gpt-4.1-mini'}
                                onChange={(e) => handleAiConfigChange({ openaiModel: e.target.value })}
                                className="app-input block w-full p-2.5 text-sm"
                                placeholder="Model teks"
                            />
                            <input
                                type="text"
                                value={aiConfig.openaiImageModel || 'gpt-image-1'}
                                onChange={(e) => handleAiConfigChange({ openaiImageModel: e.target.value })}
                                className="app-input block w-full p-2.5 text-sm"
                                placeholder="Model gambar"
                            />
                        </div>
                        <button type="button" onClick={testOpenAIConnection} disabled={isTestingOpenAI} className="app-button-secondary w-full py-2 text-sm disabled:opacity-60">
                            {isTestingOpenAI ? 'Menguji OpenAI...' : 'Uji Koneksi OpenAI'}
                        </button>
                    </div>
                )}

                {aiConfig.provider === 'gemini' && (
                    <div className="rounded-xl border border-app-border bg-white p-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                                <span>Gemini API Key</span>
                                {aiConfig.geminiApiKey ? (
                                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">Tersimpan</span>
                                ) : (
                                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">Belum Diisi</span>
                                )}
                            </div>
                            {aiConfig.geminiApiKey && (
                                <button
                                    type="button"
                                    onClick={() => handleAiConfigChange({ geminiApiKey: '' })}
                                    className="text-xs text-red-600 hover:text-red-700 font-medium"
                                >
                                    Hapus Key
                                </button>
                            )}
                        </div>
                        <div className="relative">
                            <input
                                type={showApiKeys.gemini ? 'text' : 'password'}
                                value={aiConfig.geminiApiKey || ''}
                                onChange={(e) => handleAiConfigChange({ geminiApiKey: e.target.value })}
                                className="app-input block w-full p-2.5 pr-10 text-sm font-mono"
                                placeholder="Gemini API key (AIza...)"
                            />
                            <button
                                type="button"
                                onClick={() => setShowApiKeys(prev => ({ ...prev, gemini: !prev.gemini }))}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                title={showApiKeys.gemini ? 'Sembunyikan API Key' : 'Tampilkan API Key'}
                            >
                                <i className={`bi ${showApiKeys.gemini ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                            </button>
                        </div>
                        <input
                            type="text"
                            value={aiConfig.geminiModel || 'gemini-2.5-flash'}
                            onChange={(e) => handleAiConfigChange({ geminiModel: e.target.value })}
                            className="app-input block w-full p-2.5 text-sm"
                            placeholder="Model teks"
                        />
                        <button type="button" onClick={testGeminiConnection} disabled={isTestingGemini} className="app-button-secondary w-full py-2 text-sm disabled:opacity-60">
                            {isTestingGemini ? 'Menguji Gemini...' : 'Uji Koneksi Gemini'}
                        </button>
                    </div>
                )}

                {aiConfig.provider === 'openrouter' && (
                    <div className="rounded-xl border border-app-border bg-white p-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                                <span>OpenRouter API Key</span>
                                {aiConfig.openrouterApiKey ? (
                                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">Tersimpan</span>
                                ) : (
                                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">Belum Diisi</span>
                                )}
                            </div>
                            {aiConfig.openrouterApiKey && (
                                <button
                                    type="button"
                                    onClick={() => handleAiConfigChange({ openrouterApiKey: '' })}
                                    className="text-xs text-red-600 hover:text-red-700 font-medium"
                                >
                                    Hapus Key
                                </button>
                            )}
                        </div>
                        <div className="relative">
                            <input
                                type={showApiKeys.openrouter ? 'text' : 'password'}
                                value={aiConfig.openrouterApiKey || ''}
                                onChange={(e) => handleAiConfigChange({ openrouterApiKey: e.target.value })}
                                className="app-input block w-full p-2.5 pr-10 text-sm font-mono"
                                placeholder="OpenRouter API key (sk-or-v1-...)"
                            />
                            <button
                                type="button"
                                onClick={() => setShowApiKeys(prev => ({ ...prev, openrouter: !prev.openrouter }))}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                title={showApiKeys.openrouter ? 'Sembunyikan API Key' : 'Tampilkan API Key'}
                            >
                                <i className={`bi ${showApiKeys.openrouter ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                            </button>
                        </div>
                        <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                            <input
                                type="text"
                                value={aiConfig.openrouterModel || 'openai/gpt-4.1-mini'}
                                onChange={(e) => handleAiConfigChange({ openrouterModel: e.target.value })}
                                className="app-input md:col-span-2 block w-full p-2.5 text-sm"
                                placeholder="Model aktif OpenRouter"
                            />
                            <button type="button" onClick={fetchOpenRouterModels} disabled={isLoadingOpenRouterModels} className="app-button-secondary py-2 text-xs disabled:opacity-60">
                                {isLoadingOpenRouterModels ? 'Memuat...' : 'Refresh Model'}
                            </button>
                        </div>

                        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                            <input
                                type="text"
                                value={openRouterModelQuery}
                                onChange={(e) => setOpenRouterModelQuery(e.target.value)}
                                className="app-input block w-full p-2.5 text-sm"
                                placeholder="Cari model (mis. :free)"
                            />
                            <label className="inline-flex items-center gap-2 rounded-lg border border-app-border px-3 py-2 text-xs text-slate-700">
                                <input
                                    type="checkbox"
                                    checked={aiConfig.openrouterAutoFreeFallback ?? true}
                                    onChange={(e) => handleAiConfigChange({ openrouterAutoFreeFallback: e.target.checked })}
                                />
                                Auto fallback ke model gratis
                            </label>
                        </div>

                        {openRouterModels.length > 0 && (
                            <div className="max-h-44 overflow-y-auto rounded-lg border border-app-border bg-app-subtle p-2 text-xs">
                                {openRouterModels
                                    .filter((m) => m.id.toLowerCase().includes(openRouterModelQuery.toLowerCase()))
                                    .slice(0, 80)
                                    .map((m) => (
                                        <button
                                            key={m.id}
                                            type="button"
                                            onClick={() => handleAiConfigChange({ openrouterModel: m.id })}
                                            className={`mb-1 flex w-full items-center justify-between rounded px-2 py-1 text-left ${
                                                (aiConfig.openrouterModel || '') === m.id
                                                    ? 'bg-teal-100 text-teal-800'
                                                    : 'hover:bg-slate-100 text-slate-700'
                                            }`}
                                        >
                                            <span className="truncate">{m.id}</span>
                                            {m.isFree && <span className="ml-2 shrink-0 rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-semibold text-green-700">FREE</span>}
                                        </button>
                                    ))}
                            </div>
                        )}

                        <div className="rounded-lg border border-app-border bg-app-subtle px-3 py-2 text-xs text-slate-600">
                            Free pool tersimpan: <span className="font-semibold">{(aiConfig.openrouterFreeModelPool || []).length}</span> model
                        </div>

                        <button type="button" onClick={testOpenRouterConnection} disabled={isTestingOpenRouter} className="app-button-secondary w-full py-2 text-sm disabled:opacity-60">
                            {isTestingOpenRouter ? 'Menguji OpenRouter...' : 'Uji Koneksi OpenRouter'}
                        </button>
                    </div>
                )}

                {aiConfig.provider === 'pollinations' && (
                    <div className="rounded-xl border border-app-border bg-app-subtle px-4 py-3 text-xs text-slate-600">
                        Mode gratis aktif. Tidak butuh API key. Jika provider mengirim notice/limit, sistem akan memberi notifikasi error terkontrol.
                    </div>
                )}

                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                    <div className="rounded-xl border border-app-border bg-white px-4 py-3 text-xs">
                        <div className="font-semibold text-slate-700">OpenAI</div>
                        <div className={`mt-1 inline-flex rounded-full px-2 py-0.5 font-semibold ${aiConfig.openaiLastTestOk === true ? 'bg-green-100 text-green-700' : aiConfig.openaiLastTestOk === false ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'}`}>
                            {aiConfig.openaiLastTestOk === true ? 'Sehat' : aiConfig.openaiLastTestOk === false ? 'Gagal' : 'Belum Dites'}
                        </div>
                    </div>
                    <div className="rounded-xl border border-app-border bg-white px-4 py-3 text-xs">
                        <div className="font-semibold text-slate-700">Gemini</div>
                        <div className={`mt-1 inline-flex rounded-full px-2 py-0.5 font-semibold ${aiConfig.geminiLastTestOk === true ? 'bg-green-100 text-green-700' : aiConfig.geminiLastTestOk === false ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'}`}>
                            {aiConfig.geminiLastTestOk === true ? 'Sehat' : aiConfig.geminiLastTestOk === false ? 'Gagal' : 'Belum Dites'}
                        </div>
                    </div>
                    <div className="rounded-xl border border-app-border bg-white px-4 py-3 text-xs">
                        <div className="font-semibold text-slate-700">OpenRouter</div>
                        <div className={`mt-1 inline-flex rounded-full px-2 py-0.5 font-semibold ${aiConfig.openrouterLastTestOk === true ? 'bg-green-100 text-green-700' : aiConfig.openrouterLastTestOk === false ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'}`}>
                            {aiConfig.openrouterLastTestOk === true ? 'Sehat' : aiConfig.openrouterLastTestOk === false ? 'Gagal' : 'Belum Dites'}
                        </div>
                    </div>
                </div>

                {aiTestStatus && (
                    <div className={`rounded-xl border px-4 py-3 text-sm ${aiTestStatus.ok ? 'border-green-200 bg-green-50 text-green-700' : 'border-red-200 bg-red-50 text-red-700'}`}>
                        {aiTestStatus.message}
                    </div>
                )}

                <label className="inline-flex items-start gap-2 text-sm text-slate-700">
                    <input
                        type="checkbox"
                        className="mt-0.5"
                        checked={aiConfig.enablePosterImageGeneration ?? true}
                        onChange={(e) => handleAiConfigChange({ enablePosterImageGeneration: e.target.checked })}
                    />
                    <span>
                        <span className="font-semibold">Aktifkan Generate Desain Poster langsung di aplikasi</span>
                        <span className="mt-1 block text-xs text-slate-500">
                            OpenAI BYOK mendukung hasil gambar langsung. Provider lain memakai fallback image generator.
                        </span>
                    </span>
                </label>
            </SectionCard>
        </div>
    );
};
