
import React, { useEffect, useState } from 'react';
import { PondokSettings, PortalConfig, PortalContact } from '../../../types';
import { useAppContext } from '../../../AppContext';
import { useFirebase } from '../../../contexts/FirebaseContext';
import { SectionCard } from '../../common/SectionCard';

interface TabPortalProps {
    localSettings: PondokSettings;
    setLocalSettings: React.Dispatch<React.SetStateAction<PondokSettings>>;
    onSaveSettings: (settings: PondokSettings) => Promise<void>;
}

const THEMES = [
    { id: 'teal', color: 'bg-teal-600', hover: 'hover:bg-teal-700', text: 'text-teal-600', light: 'bg-teal-50', border: 'border-teal-200', label: 'Teal' },
    { id: 'blue', color: 'bg-blue-600', hover: 'hover:bg-blue-700', text: 'text-blue-600', light: 'bg-blue-50', border: 'border-blue-200', label: 'Blue' },
    { id: 'indigo', color: 'bg-indigo-600', hover: 'hover:bg-indigo-700', text: 'text-indigo-600', light: 'bg-indigo-50', border: 'border-indigo-200', label: 'Indigo' },
    { id: 'slate', color: 'bg-slate-700', hover: 'hover:bg-slate-800', text: 'text-slate-700', light: 'bg-slate-50', border: 'border-slate-200', label: 'Slate' },
    { id: 'rose', color: 'bg-rose-600', hover: 'hover:bg-rose-700', text: 'text-rose-600', light: 'bg-rose-50', border: 'border-rose-200', label: 'Rose' },
    { id: 'emerald', color: 'bg-emerald-600', hover: 'hover:bg-emerald-700', text: 'text-emerald-600', light: 'bg-emerald-50', border: 'border-emerald-200', label: 'Emerald' },
    { id: 'cyan', color: 'bg-cyan-600', hover: 'hover:bg-cyan-700', text: 'text-cyan-600', light: 'bg-cyan-50', border: 'border-cyan-200', label: 'Cyan' },
] as const;

const ICONS = [
    'bi-whatsapp', 'bi-telephone', 'bi-envelope', 'bi-globe', 'bi-instagram', 
    'bi-facebook', 'bi-twitter-x', 'bi-youtube', 'bi-telegram', 'bi-geo-alt'
];

const PortalPreview: React.FC<{ config: PortalConfig; settings: PondokSettings }> = ({ config, settings }) => {
    const [view, setView] = useState<'login' | 'dashboard'>('login');
    const theme = THEMES.find(t => t.id === config.theme) || THEMES[0];

    return (
        <div className="flex flex-col items-center sticky top-6">
            <div className="flex gap-2 mb-4 bg-gray-100 p-1 rounded-lg">
                <button 
                    onClick={() => setView('login')}
                    className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${view === 'login' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    Login
                </button>
                <button 
                    onClick={() => setView('dashboard')}
                    className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${view === 'dashboard' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    Dashboard
                </button>
            </div>

            <div className="w-[280px] h-[560px] bg-white rounded-[3rem] border-[8px] border-gray-800 shadow-2xl overflow-hidden relative flex flex-col">
                {/* Notch */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-gray-800 rounded-b-2xl z-20"></div>
                
                <div className="flex-1 overflow-y-auto bg-gray-50 custom-scrollbar">
                    {view === 'login' ? (
                        <div className="min-h-full flex flex-col p-6 pt-12">
                            <div className="flex flex-col items-center mb-8">
                                {settings.logoPonpesUrl ? (
                                    <img src={settings.logoPonpesUrl} alt="Logo" className="w-16 h-16 rounded-full mb-3 shadow-sm border border-gray-100" referrerPolicy="no-referrer" />
                                ) : (
                                    <div className={`w-16 h-16 rounded-full ${theme.color} flex items-center justify-center text-white text-2xl font-bold mb-3`}>
                                        {settings.namaPonpes?.charAt(0) || 'E'}
                                    </div>
                                )}
                                <h1 className="text-sm font-bold text-gray-800 text-center">{settings.namaPonpes || 'eSantri Pondok'}</h1>
                                <p className="text-[10px] text-gray-500 text-center mt-1">{config.welcomeMessage}</p>
                            </div>

                            <div className="space-y-3">
                                <div>
                                    <label className="block text-[9px] font-bold text-gray-400 uppercase mb-1">NIS / ID Santri</label>
                                    <div className="w-full h-8 bg-white border border-gray-200 rounded-md"></div>
                                </div>
                                <div>
                                    <label className="block text-[9px] font-bold text-gray-400 uppercase mb-1">Tanggal Lahir</label>
                                    <div className="w-full h-8 bg-white border border-gray-200 rounded-md"></div>
                                </div>
                                <button className={`w-full py-2 rounded-md text-white text-xs font-bold shadow-sm ${theme.color}`}>
                                    Masuk Portal
                                </button>
                            </div>

                            <div className="mt-auto pt-8">
                                <p className="text-[9px] text-center text-gray-400 mb-3">Butuh bantuan? Hubungi kami:</p>
                                <div className="flex flex-wrap justify-center gap-2">
                                    {config.contacts.map(c => (
                                        <div key={c.id} className={`w-6 h-6 rounded-full ${theme.light} ${theme.text} flex items-center justify-center text-xs border ${theme.border}`}>
                                            <i className={`bi ${c.icon}`}></i>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="min-h-full flex flex-col">
                            <div className={`${theme.color} p-6 pt-10 text-white`}>
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-lg font-bold">
                                        S
                                    </div>
                                    <div>
                                        <h2 className="text-xs font-bold">Ahmad Santri</h2>
                                        <p className="text-[9px] opacity-80">NIS: 2024001 • Kelas 7A</p>
                                    </div>
                                </div>
                            </div>

                            <div className="p-4 -mt-4 bg-gray-50 rounded-t-2xl flex-1 space-y-4">
                                {config.announcement && (
                                    <div className={`p-3 rounded-xl border ${theme.border} ${theme.light} relative overflow-hidden`}>
                                        <div className={`absolute top-0 left-0 w-1 h-full ${theme.color}`}></div>
                                        <h3 className={`text-[10px] font-bold ${theme.text} mb-1 flex items-center gap-1`}>
                                            <i className="bi bi-megaphone"></i> Pengumuman
                                        </h3>
                                        <p className="text-[9px] text-gray-700 line-clamp-2">{config.announcement}</p>
                                    </div>
                                )}

                                <div className="grid grid-cols-3 gap-2">
                                    {[
                                        { id: 'showFinance', label: 'Keuangan', icon: 'bi-cash-stack' },
                                        { id: 'showAcademic', label: 'Akademik', icon: 'bi-mortarboard' },
                                        { id: 'showAttendance', label: 'Presensi', icon: 'bi-calendar-check' },
                                        { id: 'showTahfizh', label: 'Tahfizh', icon: 'bi-book' },
                                        { id: 'showHealth', label: 'Kesehatan', icon: 'bi-heart-pulse' },
                                        { id: 'showLibrary', label: 'Perpus', icon: 'bi-journal-bookmark' },
                                    ].filter(item => (config as any)[item.id]).map(item => (
                                        <div key={item.id} className="bg-white p-2 rounded-xl border border-gray-100 shadow-sm flex flex-col items-center gap-1">
                                            <div className={`w-8 h-8 rounded-lg ${theme.light} ${theme.text} flex items-center justify-center text-sm`}>
                                                <i className={`bi ${item.icon}`}></i>
                                            </div>
                                            <span className="text-[8px] font-bold text-gray-600">{item.label}</span>
                                        </div>
                                    ))}
                                </div>

                                <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                                    <h3 className="text-[10px] font-bold text-gray-800 mb-2">Link Penting</h3>
                                    <div className="space-y-2">
                                        {config.customLinks.map((l, i) => (
                                            <div key={i} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg border border-gray-100">
                                                <span className="text-[9px] font-medium text-gray-700">{l.label || 'Link Kustom'}</span>
                                                <i className="bi bi-chevron-right text-[8px] text-gray-400"></i>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Home Indicator */}
                <div className="h-6 bg-white flex items-center justify-center">
                    <div className="w-20 h-1 bg-gray-200 rounded-full"></div>
                </div>
            </div>
            
            <p className="mt-4 text-[10px] text-gray-400 italic">* Preview tampilan di layar HP</p>
        </div>
    );
};

export const TabPortal: React.FC<TabPortalProps> = ({ localSettings, setLocalSettings, onSaveSettings }) => {
    const { showToast } = useAppContext();
    const { fbUser, initializeAuthState } = useFirebase();

    useEffect(() => {
        if (localSettings.cloudSyncConfig?.provider === 'firebase' || localSettings.cloudSyncConfig?.portalEnabled) {
            void initializeAuthState();
        }
    }, [initializeAuthState, localSettings.cloudSyncConfig?.portalEnabled, localSettings.cloudSyncConfig?.provider]);
    
    // Get Tenant ID for URL
    const tenantId = localSettings.cloudSyncConfig?.firebasePairedTenantId || fbUser?.uid;
    
    const portalConfig: PortalConfig = localSettings.portalConfig || {
        enabled: localSettings.cloudSyncConfig?.portalEnabled || false,
        theme: 'teal',
        showFinance: true,
        showAcademic: true,
        showAttendance: true,
        showTahfizh: true,
        showHealth: true,
        showLibrary: true,
        welcomeMessage: 'Selamat Datang di Portal Wali Santri',
        announcement: '',
        contacts: [],
        customLinks: [],
        baseUrl: ''
    };

    const effectiveBaseUrl = portalConfig.baseUrl || window.location.origin;
    const portalUrl = tenantId ? `${effectiveBaseUrl}/portal/${tenantId}` : '';
    const qrCodeUrl = portalUrl ? `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(portalUrl)}` : '';

    // Suggested Firebase Hosting URL
    const firebaseProjectId = localSettings.cloudSyncConfig?.firebaseProjectId;
    const suggestedFirebaseUrl = firebaseProjectId ? `https://${firebaseProjectId}.web.app` : '';

    const handleUseSuggestedUrl = () => {
        if (suggestedFirebaseUrl) {
            updatePortalConfig({ baseUrl: suggestedFirebaseUrl });
            showToast('Menggunakan domain Firebase Hosting!', 'success');
        }
    };

    const updatePortalConfig = (updates: Partial<PortalConfig>) => {
        const newConfig = { ...portalConfig, ...updates };
        setLocalSettings(prev => ({
            ...prev,
            portalConfig: newConfig,
            cloudSyncConfig: {
                ...prev.cloudSyncConfig,
                portalEnabled: newConfig.enabled
            }
        }));
    };

    const handleAddContact = () => {
        const newContact: PortalContact = {
            id: Date.now().toString(),
            label: 'Admin',
            value: '',
            icon: 'bi-whatsapp'
        };
        updatePortalConfig({ contacts: [...portalConfig.contacts, newContact] });
    };

    const handleUpdateContact = (id: string, updates: Partial<PortalContact>) => {
        updatePortalConfig({
            contacts: portalConfig.contacts.map(c => c.id === id ? { ...c, ...updates } : c)
        });
    };

    const handleRemoveContact = (id: string) => {
        updatePortalConfig({
            contacts: portalConfig.contacts.filter(c => c.id !== id)
        });
    };

    const handleAddLink = () => {
        updatePortalConfig({
            customLinks: [...portalConfig.customLinks, { label: '', url: '' }]
        });
    };

    const handleUpdateLink = (index: number, updates: { label?: string; url?: string }) => {
        const newLinks = [...portalConfig.customLinks];
        newLinks[index] = { ...newLinks[index], ...updates };
        updatePortalConfig({ customLinks: newLinks });
    };

    const handleRemoveLink = (index: number) => {
        updatePortalConfig({
            customLinks: portalConfig.customLinks.filter((_, i) => i !== index)
        });
    };

    return (
        <div className="flex flex-col items-start gap-6 lg:flex-row">
            <div className="flex-1 w-full space-y-6">
                <SectionCard
                    title="Pengaturan Portal Wali Santri"
                    description="Konfigurasi tampilan, fitur, alamat portal, dan akses publik untuk wali santri."
                    contentClassName="space-y-6 p-6"
                >
                    <div className="flex items-center justify-between border-b border-app-border pb-4">
                        <div className="text-sm text-slate-600">Portal publik untuk wali santri</div>
                        <label className="inline-flex items-center cursor-pointer">
                            <input 
                                type="checkbox" 
                                checked={portalConfig.enabled} 
                                onChange={(e) => updatePortalConfig({ enabled: e.target.checked })}
                                className="sr-only peer"
                            />
                            <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-teal-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
                            <span className="ms-3 text-sm font-semibold text-slate-900">Aktifkan Portal</span>
                        </label>
                    </div>

                    {!portalConfig.enabled && (
                        <div className="mb-6 flex items-start gap-3 rounded-xl border border-yellow-200 bg-yellow-50 p-4">
                            <i className="bi bi-exclamation-triangle text-yellow-600 text-xl"></i>
                            <div>
                                <p className="text-sm text-yellow-800 font-medium">Portal Sedang Non-Aktif</p>
                                <p className="text-xs text-yellow-700">Wali santri tidak akan bisa mengakses data melalui web portal sampai fitur ini diaktifkan.</p>
                            </div>
                        </div>
                    )}

                    {portalConfig.enabled && (
                        <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 p-4">
                            <div className="flex flex-col md:flex-row gap-6">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                        <i className="bi bi-link-45deg text-blue-600 text-xl"></i>
                                        <h3 className="text-sm font-bold text-blue-800 uppercase tracking-wider">URL Portal Wali Santri</h3>
                                    </div>
                                    <p className="text-xs text-blue-700 mb-3">Bagikan link ini kepada wali santri agar mereka bisa mengakses portal.</p>
                                    
                                    {portalUrl ? (
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-2">
                                                <div className="flex-1 truncate rounded border border-blue-300 bg-white p-2 font-mono text-sm text-blue-900">
                                                    {portalUrl}
                                                </div>
                                                <button 
                                                    onClick={() => {
                                                        navigator.clipboard.writeText(portalUrl);
                                                        showToast('Link portal disalin!', 'success');
                                                    }}
                                                    className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                                                >
                                                    <i className="bi bi-clipboard"></i> Salin
                                                </button>
                                            </div>
                                            <p className="text-[10px] text-blue-500 italic">
                                                * Link ini menggunakan {portalConfig.baseUrl ? 'Domain Kustom' : 'Domain Saat Ini'}. 
                                                {window.location.hostname === 'localhost' && !portalConfig.baseUrl && ' (Localhost tidak bisa diakses dari luar jaringan)'}
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="text-xs text-red-600 font-medium bg-red-50 p-2 rounded border border-red-100">
                                            <i className="bi bi-exclamation-circle mr-1"></i> 
                                            Link belum tersedia. Pastikan Anda sudah terhubung ke Cloud Sync (Firebase) untuk mendapatkan Tenant ID.
                                        </div>
                                    )}
                                </div>

                                {portalUrl && (
                                    <div className="flex flex-col items-center gap-2 bg-white p-3 rounded-lg border border-blue-200 shadow-sm">
                                        <img 
                                            src={qrCodeUrl} 
                                            alt="QR Code Portal" 
                                            className="w-32 h-32"
                                            referrerPolicy="no-referrer"
                                        />
                                        <span className="text-[10px] font-bold text-gray-500 uppercase">Scan QR Code</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    <div className={`space-y-8 ${!portalConfig.enabled ? 'opacity-50 pointer-events-none' : ''}`}>
                        {/* KONFIGURASI DOMAIN */}
                        <section className="rounded-xl border border-app-border bg-app-subtle p-4">
                            <h3 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-700">
                                <i className="bi bi-globe text-teal-600"></i> Domain / URL Web Portal
                            </h3>
                            <div className="space-y-3">
                                <p className="text-xs text-slate-600">
                                    Jika Anda menggunakan versi <strong>Desktop (Tauri)</strong> atau <strong>Android</strong>, Anda harus menghosting versi web aplikasi ini (misal di Vercel/Netlify) dan memasukkan URL-nya di sini agar link yang dibagikan ke wali santri valid.
                                </p>
                                <div className="flex gap-2">
                                    <input 
                                        type="url" 
                                        value={portalConfig.baseUrl || ''}
                                        onChange={(e) => updatePortalConfig({ baseUrl: e.target.value })}
                                        placeholder="https://esantri-pondok-anda.vercel.app"
                                        className="app-input flex-1 p-2 text-sm"
                                    />
                                    {portalConfig.baseUrl && (
                                        <button 
                                            onClick={() => updatePortalConfig({ baseUrl: '' })}
                                            className="text-xs font-medium text-red-600 hover:text-red-700"
                                        >
                                            Reset
                                        </button>
                                    )}
                                </div>
                                {suggestedFirebaseUrl && portalConfig.baseUrl !== suggestedFirebaseUrl && (
                                    <div className="mt-2 p-2 bg-teal-50 border border-teal-100 rounded-lg flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <i className="bi bi-magic text-teal-600"></i>
                                            <span className="text-[10px] text-teal-800 font-medium">Saran: Gunakan Firebase Hosting Anda</span>
                                        </div>
                                        <button 
                                            onClick={handleUseSuggestedUrl}
                                            className="text-[10px] bg-teal-600 text-white px-2 py-1 rounded font-bold hover:bg-teal-700 transition-colors"
                                        >
                                            Gunakan Link Rekomendasi
                                        </button>
                                    </div>
                                )}
                                <p className="text-[10px] text-slate-500">
                                    * Kosongkan untuk menggunakan domain saat ini secara otomatis.
                                </p>
                            </div>
                        </section>

                        {/* TEMA */}
                        <section>
                            <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-4 flex items-center gap-2">
                                <i className="bi bi-palette text-teal-600"></i> Tema Visual
                            </h3>
                            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
                                {THEMES.map((t) => (
                                    <button
                                        key={t.id}
                                        onClick={() => updatePortalConfig({ theme: t.id as any })}
                                        className={`flex flex-col items-center gap-2 p-2 rounded-lg border-2 transition-all ${
                                            portalConfig.theme === t.id ? 'border-teal-500 bg-teal-50' : 'border-transparent hover:bg-gray-50'
                                        }`}
                                    >
                                        <div className={`w-10 h-10 rounded-full ${t.color} shadow-sm border border-white`}></div>
                                        <span className="text-[10px] font-medium text-gray-600">{t.label}</span>
                                    </button>
                                ))}
                            </div>
                        </section>

                        {/* VISIBILITAS DATA */}
                        <section>
                            <h3 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-700">
                                <i className="bi bi-eye text-teal-600"></i> Visibilitas Data
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                {[
                                    { id: 'showFinance', label: 'Keuangan & Tagihan', icon: 'bi-cash-stack' },
                                    { id: 'showAcademic', label: 'Akademik & Rapor', icon: 'bi-mortarboard' },
                                    { id: 'showAttendance', label: 'Presensi / Absensi', icon: 'bi-calendar-check' },
                                    { id: 'showTahfizh', label: 'Tahfizh & Al-Qur\'an', icon: 'bi-book' },
                                    { id: 'showHealth', label: 'Kesehatan Santri', icon: 'bi-heart-pulse' },
                                    { id: 'showLibrary', label: 'Perpustakaan', icon: 'bi-journal-bookmark' },
                                ].map((item) => (
                                    <label key={item.id} className="flex cursor-pointer items-center justify-between rounded-lg border border-app-border bg-app-subtle p-3 transition-all hover:bg-white hover:shadow-sm">
                                        <div className="flex items-center gap-3">
                                            <i className={`bi ${item.icon} text-slate-500`}></i>
                                            <span className="text-sm font-medium text-slate-700">{item.label}</span>
                                        </div>
                                        <input 
                                            type="checkbox" 
                                            checked={(portalConfig as any)[item.id]} 
                                            onChange={(e) => updatePortalConfig({ [item.id]: e.target.checked })}
                                            className="w-4 h-4 text-teal-600 bg-gray-100 border-gray-300 rounded focus:ring-teal-500"
                                        />
                                    </label>
                                ))}
                            </div>
                        </section>

                        {/* INFORMASI & PENGUMUMAN */}
                        <section>
                            <h3 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-700">
                                <i className="bi bi-megaphone text-teal-600"></i> Informasi & Pengumuman
                            </h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="mb-1 block text-xs font-medium text-slate-600">Pesan Selamat Datang</label>
                                    <input 
                                        type="text" 
                                        value={portalConfig.welcomeMessage}
                                        onChange={(e) => updatePortalConfig({ welcomeMessage: e.target.value })}
                                        className="app-input w-full p-2.5 text-sm"
                                        placeholder="Contoh: Selamat Datang di Portal Wali Santri"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-xs font-medium text-slate-600">Pengumuman Penting (Muncul di Dashboard Portal)</label>
                                    <textarea 
                                        value={portalConfig.announcement}
                                        onChange={(e) => updatePortalConfig({ announcement: e.target.value })}
                                        rows={3}
                                        className="app-input w-full p-2.5 text-sm"
                                        placeholder="Tulis pengumuman atau informasi penting untuk wali santri..."
                                    />
                                </div>
                            </div>
                        </section>

                        {/* KONTAK PENTING */}
                        <section>
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-700">
                                    <i className="bi bi-person-lines-fill text-teal-600"></i> Kontak Penting
                                </h3>
                                <button 
                                    onClick={handleAddContact}
                                    className="inline-flex items-center gap-1 rounded-lg bg-teal-50 px-3 py-1.5 text-xs font-bold text-teal-600 hover:bg-teal-100"
                                >
                                    <i className="bi bi-plus-lg"></i> Tambah Kontak
                                </button>
                            </div>
                            <div className="space-y-3">
                                {portalConfig.contacts.length === 0 && (
                                    <p className="rounded-lg border border-dashed border-app-border bg-app-subtle py-4 text-center text-xs italic text-slate-400">Belum ada kontak yang ditambahkan.</p>
                                )}
                                {portalConfig.contacts.map((contact) => (
                                    <div key={contact.id} className="flex flex-col gap-3 rounded-lg border border-app-border bg-app-subtle p-3 sm:flex-row">
                                        <div className="flex-shrink-0">
                                            <select 
                                                value={contact.icon}
                                                onChange={(e) => handleUpdateContact(contact.id, { icon: e.target.value })}
                                                className="app-select p-2 text-sm"
                                            >
                                                {ICONS.map(icon => (
                                                    <option key={icon} value={icon}>{icon.replace('bi-', '')}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            <input 
                                                type="text" 
                                                value={contact.label}
                                                onChange={(e) => handleUpdateContact(contact.id, { label: e.target.value })}
                                                placeholder="Label (misal: Admin Keuangan)"
                                                className="app-input p-2 text-sm"
                                            />
                                            <input 
                                                type="text" 
                                                value={contact.value}
                                                onChange={(e) => handleUpdateContact(contact.id, { value: e.target.value })}
                                                placeholder="Nomor HP / Email / Link"
                                                className="app-input p-2 text-sm"
                                            />
                                        </div>
                                        <button 
                                            onClick={() => handleRemoveContact(contact.id)}
                                            className="text-red-500 hover:text-red-700 p-2"
                                        >
                                            <i className="bi bi-trash"></i>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* LINK KUSTOM */}
                        <section>
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-700">
                                    <i className="bi bi-link-45deg text-teal-600"></i> Link Eksternal Kustom
                                </h3>
                                <button 
                                    onClick={handleAddLink}
                                    className="inline-flex items-center gap-1 rounded-lg bg-teal-50 px-3 py-1.5 text-xs font-bold text-teal-600 hover:bg-teal-100"
                                >
                                    <i className="bi bi-plus-lg"></i> Tambah Link
                                </button>
                            </div>
                            <div className="space-y-3">
                                {portalConfig.customLinks.length === 0 && (
                                    <p className="rounded-lg border border-dashed border-app-border bg-app-subtle py-4 text-center text-xs italic text-slate-400">Belum ada link kustom.</p>
                                )}
                                {portalConfig.customLinks.map((link, idx) => (
                                    <div key={idx} className="flex gap-3 rounded-lg border border-app-border bg-app-subtle p-3">
                                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            <input 
                                                type="text" 
                                                value={link.label}
                                                onChange={(e) => handleUpdateLink(idx, { label: e.target.value })}
                                                placeholder="Nama Link (misal: Website Yayasan)"
                                                className="app-input p-2 text-sm"
                                            />
                                            <input 
                                                type="text" 
                                                value={link.url}
                                                onChange={(e) => handleUpdateLink(idx, { url: e.target.value })}
                                                placeholder="URL (https://...)"
                                                className="app-input p-2 text-sm"
                                            />
                                        </div>
                                        <button 
                                            onClick={() => handleRemoveLink(idx)}
                                            className="text-red-500 hover:text-red-700 p-2"
                                        >
                                            <i className="bi bi-trash"></i>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </section>
                    </div>

                    <div className="mt-8 flex justify-end border-t border-app-border pt-6">
                        <button
                            onClick={() => onSaveSettings(localSettings)}
                            className="app-button-primary inline-flex items-center gap-2 px-8 py-2.5"
                        >
                            <i className="bi bi-save"></i> Simpan Pengaturan Portal
                        </button>
                    </div>
                </SectionCard>
            </div>

            {/* PREVIEW PANEL */}
            <div className="w-full lg:w-[320px] shrink-0">
                <PortalPreview config={portalConfig} settings={localSettings} />
            </div>
        </div>
    );
};
