import React, { useState } from 'react';
import { PondokSettings, PortalAnnouncementPost, PortalConfig, PortalContact } from '../../../types';
import { useAppContext } from '../../../AppContext';
import { SectionCard } from '../../common/SectionCard';
import {
    encodePortalKey,
    fetchPortalPublicInfoFromGas,
    getPortalGasScriptV2
} from '../../../services/portalGasService';
import { downloadStandalonePortalHtml } from '../../../utils/portalStandaloneGenerator';

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

const normalizeAnnouncementPosts = (config: PortalConfig): PortalAnnouncementPost[] => {
    const posts = (config.announcementPosts || []).filter(Boolean);
    if (posts.length > 0) return posts as PortalAnnouncementPost[];
    if (config.announcement?.trim()) {
        return [{
            id: 'legacy-announcement',
            title: 'Pengumuman',
            content: config.announcement.trim(),
            publishedAt: new Date().toISOString(),
            isPublished: true
        }];
    }
    return [];
};

const PortalPreview: React.FC<{ config: PortalConfig; settings: PondokSettings }> = ({ config, settings }) => {
    const [view, setView] = useState<'login' | 'dashboard'>('login');
    const theme = THEMES.find(t => t.id === config.theme) || THEMES[0];
    const announcementPosts = normalizeAnnouncementPosts(config).filter(post => post.isPublished);
    const featureItems = [
        config.showFinance ? { label: 'Keuangan', icon: 'bi-cash-stack' } : null,
        config.showAcademic ? { label: 'Akademik & Kamar', icon: 'bi-mortarboard' } : null,
        config.showAttendance ? { label: 'Presensi', icon: 'bi-calendar-check' } : null,
        config.showTahfizh ? { label: 'Tahfizh', icon: 'bi-book' } : null,
        config.showHealth ? { label: 'Kesehatan', icon: 'bi-heart-pulse' } : null,
        config.showLibrary ? { label: 'Perpustakaan', icon: 'bi-journal-bookmark' } : null,
    ].filter(Boolean) as Array<{ label: string; icon: string }>;

    return (
        <div className="sticky top-6 flex flex-col items-center">
            <div className="mb-4 flex gap-2 rounded-lg bg-gray-100 p-1">
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

            <div className="w-[300px] overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-50 via-cyan-50 to-teal-100 p-3 shadow-2xl">
                <div className="custom-scrollbar h-[580px] overflow-y-auto rounded-2xl border border-teal-100 bg-white p-4">
                    {view === 'login' && (
                        <div className="text-center">
                            <div className="mb-4 flex flex-col items-center">
                                {settings.logoPonpesUrl ? (
                                    <img src={settings.logoPonpesUrl} alt="Logo" className="w-16 h-16 rounded-2xl mb-3 shadow-sm border border-gray-100 object-contain p-1" referrerPolicy="no-referrer" />
                                ) : (
                                    <div className={`w-16 h-16 rounded-2xl ${theme.color} flex items-center justify-center text-white text-2xl font-bold mb-3`}>
                                        {settings.namaPonpes?.charAt(0) || 'E'}
                                    </div>
                                )}
                                <h1 className="text-sm font-bold text-slate-900">{settings.namaPonpes || 'eSantri Pondok'}</h1>
                                <div className="mb-1 mt-1 text-[10px] font-bold uppercase tracking-widest text-amber-600 flex items-center gap-1">
                                    <i className="bi bi-shield-lock-fill"></i> Portal Wali Santri
                                </div>
                                <p className="text-[10px] text-slate-500">{config.welcomeMessage}</p>
                            </div>

                            <div className="space-y-3 text-left">
                                <div>
                                    <label className="mb-1 block text-[9px] font-bold uppercase tracking-wide text-slate-500">NIS / ID Santri</label>
                                    <div className="w-full h-8 bg-slate-50 border border-gray-200 rounded-md px-2 flex items-center text-[10px] text-slate-400">2024001</div>
                                </div>
                                <div>
                                    <label className="mb-1 block text-[9px] font-bold uppercase tracking-wide text-slate-500">Tanggal Lahir</label>
                                    <div className="w-full h-8 bg-slate-50 border border-gray-200 rounded-md px-2 flex items-center text-[10px] text-slate-400">31/12/2011</div>
                                    <p className="mt-1 text-[9px] text-slate-400">Verifikasi Server-Side Login (Aman)</p>
                                </div>
                                <button className={`w-full rounded-lg py-2 text-xs font-bold text-white shadow-sm ${theme.color}`}>
                                    Masuk Portal Wali
                                </button>
                            </div>

                            <div className="mt-5 border-t border-slate-100 pt-3">
                                <p className="mb-2 text-[9px] text-center text-slate-400">Butuh bantuan? Hubungi kami:</p>
                                <div className="flex flex-wrap justify-center gap-1.5">
                                    {config.contacts.map(c => (
                                        <div key={c.id} className={`flex items-center gap-1 rounded-full border px-2 py-1 text-[9px] ${theme.light} ${theme.text} ${theme.border}`}>
                                            <i className={`bi ${c.icon}`}></i>
                                            <span>{c.label || 'Kontak'}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {view === 'dashboard' && (
                        <div className="text-left">
                            <div className={`rounded-xl ${theme.color} p-3 text-white`}>
                                <p className="text-[9px] font-semibold text-white/80">Aktif • Sinkron Hari Ini</p>
                                <p className="text-sm font-bold">Ahmad Fauzi</p>
                                <p className="mt-0.5 text-[9px] text-white/90">NIS: 2024001 • Wali: Bpk. Fauzan</p>
                                <div className="mt-1.5 flex flex-wrap gap-1">
                                    <span className="rounded bg-black/20 px-1.5 py-0.5 text-[8px]">MTs / Kelas 8A</span>
                                    <span className="rounded bg-black/20 px-1.5 py-0.5 text-[8px]">Kamar Al-Farabi</span>
                                </div>
                            </div>

                            <div className="mt-3 grid grid-cols-2 gap-2">
                                <div className="rounded-lg border border-slate-100 bg-slate-50 p-2">
                                    <p className="text-[8px] uppercase text-slate-500 font-bold">Total Tunggakan</p>
                                    <p className="text-[11px] font-extrabold text-emerald-600">Rp 0 (Lunas)</p>
                                </div>
                                <div className="rounded-lg border border-slate-100 bg-slate-50 p-2">
                                    <p className="text-[8px] uppercase text-slate-500 font-bold">Saldo Tabungan</p>
                                    <p className="text-[11px] font-extrabold text-teal-700">Rp 350.000</p>
                                </div>
                                <div className="rounded-lg border border-slate-100 bg-slate-50 p-2">
                                    <p className="text-[8px] uppercase text-slate-500 font-bold">Presensi (30 Hr)</p>
                                    <p className="text-[10px] font-extrabold text-slate-800">28H / 1I / 0A</p>
                                </div>
                                <div className="rounded-lg border border-slate-100 bg-slate-50 p-2">
                                    <p className="text-[8px] uppercase text-slate-500 font-bold">Capaian Tahfizh</p>
                                    <p className="text-[11px] font-extrabold text-indigo-700">5 Juz</p>
                                </div>
                            </div>

                            {announcementPosts.length > 0 && (
                                <div className={`relative mt-3 overflow-hidden rounded-lg border p-2 ${theme.border} ${theme.light}`}>
                                    <div className={`absolute left-0 top-0 h-full w-1 ${theme.color}`}></div>
                                    <h3 className={`mb-1 pl-2 text-[10px] font-bold ${theme.text}`}>
                                        <i className="bi bi-megaphone mr-1"></i>Pengumuman
                                    </h3>
                                    <div className="space-y-1 pl-2">
                                        {announcementPosts.slice(0, 2).map(post => (
                                            <div key={post.id} className="rounded-md bg-white/70 px-2 py-1">
                                                <p className="line-clamp-1 text-[9px] font-semibold text-slate-800">{post.title}</p>
                                                <p className="line-clamp-2 text-[9px] text-slate-600">{post.content}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="mt-3 rounded-lg border border-slate-100 bg-slate-50 p-1.5">
                                <div className="flex gap-1 overflow-x-auto">
                                    {featureItems.map((item, idx) => (
                                        <div key={item.label} className={`shrink-0 rounded-md px-2 py-1 text-[9px] font-semibold ${idx === 0 ? `${theme.color} text-white` : 'border border-slate-200 bg-white text-slate-600'}`}>
                                            <i className={`bi ${item.icon} mr-1`}></i>
                                            {item.label}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="mt-2.5 rounded-lg border border-slate-200 bg-white p-2.5 shadow-2xs space-y-1.5">
                                <p className="text-[9px] font-bold text-slate-700">Riwayat Pembayaran Terakhir</p>
                                <div className="flex justify-between text-[9px] bg-slate-50 p-1.5 rounded border border-slate-100">
                                    <span>SPP Syahriyah Oktober</span>
                                    <span className="font-bold text-emerald-700">Rp 450.000</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <p className="mt-3 text-[10px] italic text-gray-400">* Preview diselaraskan dengan tampilan portal live & HTML mandiri</p>
        </div>
    );
};

export const TabPortal: React.FC<TabPortalProps> = ({ localSettings, setLocalSettings, onSaveSettings }) => {
    const { showToast, settings } = useAppContext();
    const [showScriptHelper, setShowScriptHelper] = useState(false);
    const [showCloudflareGuide, setShowCloudflareGuide] = useState(false);
    const [editingPostId, setEditingPostId] = useState<string | null>(null);
    const [isTestingConnection, setIsTestingConnection] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState<{
        ok: boolean;
        message: string;
        isLegacy?: boolean;
        syncedAt?: string;
    } | null>(null);

    const tenantId = (localSettings.portalConfig?.portalId || 'default-portal').trim();

    const portalConfig: PortalConfig = localSettings.portalConfig || {
        enabled: localSettings.cloudSyncConfig?.portalEnabled || false,
        provider: 'gas',
        portalId: 'default-portal',
        gasEndpoint: '',
        gasApiKey: '',
        theme: 'teal',
        showFinance: true,
        showAcademic: true,
        showAttendance: true,
        showTahfizh: true,
        showHealth: true,
        showLibrary: true,
        welcomeMessage: 'Selamat Datang di Portal Wali Santri',
        announcement: '',
        announcementPosts: [],
        contacts: [],
        customLinks: [],
        baseUrl: '',
        standalonePublicUrl: '',
        useStandaloneUrlAsPrimary: false
    };
    const announcementPosts = normalizeAnnouncementPosts(portalConfig);

    const effectiveBaseUrl = (portalConfig.baseUrl || window.location.origin).replace(/\/+$/, '');
    const cipherKey = portalConfig.gasEndpoint
        ? encodePortalKey(portalConfig.gasEndpoint, tenantId, portalConfig.gasApiKey || '')
        : '';

    const encryptedInternalPortalUrl = (tenantId && cipherKey)
        ? `${effectiveBaseUrl}/portal/${encodeURIComponent(tenantId)}?k=${encodeURIComponent(cipherKey)}`
        : '';

    const activeShareableUrl = (portalConfig.useStandaloneUrlAsPrimary && portalConfig.standalonePublicUrl?.trim())
        ? portalConfig.standalonePublicUrl.trim()
        : encryptedInternalPortalUrl;

    const qrCodeUrl = activeShareableUrl
        ? `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(activeShareableUrl)}`
        : '';

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

    const handleTestGasConnection = async () => {
        if (!portalConfig.gasEndpoint?.trim()) {
            showToast('Masukkan URL Web App GAS terlebih dahulu.', 'error');
            return;
        }
        setIsTestingConnection(true);
        setConnectionStatus(null);
        try {
            const res = await fetchPortalPublicInfoFromGas(
                portalConfig.gasEndpoint.trim(),
                tenantId,
                portalConfig.gasApiKey?.trim() || ''
            );
            if (res.isLegacyGas) {
                setConnectionStatus({
                    ok: true,
                    isLegacy: true,
                    syncedAt: res.syncedAt,
                    message: 'Terhubung ke GAS, tetapi masih menggunakan Script versi lama (v1). Segera perbarui kode Google Apps Script ke v2.0 agar data seluruh santri terlindungi dengan Server-Side Login!'
                });
                showToast('Koneksi berhasil, namun Script GAS perlu diupdate ke v2.0.', 'info');
            } else {
                setConnectionStatus({
                    ok: true,
                    isLegacy: false,
                    syncedAt: res.syncedAt,
                    message: 'Koneksi GAS v2.0 Aktif & Aman! Proteksi Server-Side Login berjalan normal (data santri tidak diekspos secara massal).'
                });
                showToast('Koneksi GAS v2.0 berhasil & aman!', 'success');
            }
        } catch (err) {
            setConnectionStatus({
                ok: false,
                message: (err as Error)?.message || 'Gagal menghubungi endpoint GAS. Pastikan sudah klik "Sinkronkan Sekarang" minimal satu kali.'
            });
            showToast('Gagal menguji koneksi GAS.', 'error');
        } finally {
            setIsTestingConnection(false);
        }
    };

    const handleDownloadStandaloneHtml = () => {
        try {
            if (!portalConfig.gasEndpoint?.trim()) {
                showToast('Isi URL Web App GAS terlebih dahulu sebelum mengunduh file HTML mandiri.', 'error');
                return;
            }
            downloadStandalonePortalHtml(localSettings);
            showToast('File index.html Portal Wali (terenkripsi) berhasil diunduh! Siap di-upload ke Cloudflare Pages / Netlify.', 'success');
        } catch (err) {
            showToast((err as Error)?.message || 'Gagal membuat file HTML mandiri.', 'error');
        }
    };

    const handleAddContact = () => {
        const newContact: PortalContact = {
            id: Date.now().toString(),
            label: 'Admin Keuangan',
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

    const handleAddAnnouncementPost = () => {
        const id = Date.now().toString();
        const newPost: PortalAnnouncementPost = {
            id,
            title: '',
            content: '',
            publishedAt: new Date().toISOString(),
            isPublished: true
        };
        const updatedPosts = [...announcementPosts, newPost];
        updatePortalConfig({ announcementPosts: updatedPosts, announcement: '' });
        setEditingPostId(id);
    };

    const handleUpdateAnnouncementPost = (id: string, updates: Partial<PortalAnnouncementPost>) => {
        const updatedPosts = announcementPosts.map(post => post.id === id ? { ...post, ...updates } : post);
        updatePortalConfig({ announcementPosts: updatedPosts, announcement: '' });
    };

    const handleRemoveAnnouncementPost = (id: string) => {
        const updatedPosts = announcementPosts.filter(post => post.id !== id);
        updatePortalConfig({ announcementPosts: updatedPosts, announcement: '' });
        if (editingPostId === id) setEditingPostId(null);
    };

    const handleSavePortalSettings = async () => {
        try {
            const dataToSave = { ...localSettings };

            if (!dataToSave.cloudSyncConfig.dropboxAppKey && settings.cloudSyncConfig.dropboxAppKey) {
                dataToSave.cloudSyncConfig.dropboxAppKey = settings.cloudSyncConfig.dropboxAppKey;
            }
            if (!dataToSave.cloudSyncConfig.dropboxAppSecret && settings.cloudSyncConfig.dropboxAppSecret) {
                dataToSave.cloudSyncConfig.dropboxAppSecret = settings.cloudSyncConfig.dropboxAppSecret;
            }
            if (!dataToSave.cloudSyncConfig.webdavPassword && settings.cloudSyncConfig.webdavPassword) {
                dataToSave.cloudSyncConfig.webdavPassword = settings.cloudSyncConfig.webdavPassword;
            }

            await onSaveSettings(dataToSave);
            showToast('Pengaturan portal berhasil disimpan.', 'success');
        } catch (error) {
            showToast(`Gagal menyimpan pengaturan portal: ${(error as Error).message}`, 'error');
        }
    };

    const portalGasScript = getPortalGasScriptV2(tenantId || 'ponpes-alikhlas');

    return (
        <div className="flex flex-col items-start gap-6 lg:flex-row">
            <div className="flex-1 w-full min-w-0 space-y-6">
                <SectionCard
                    title="Pengaturan Portal Wali Santri"
                    description="Konfigurasi tampilan, enkripsi keamanan, generator file HTML mandiri (Cloudflare Pages), dan akses publik wali santri."
                    contentClassName="space-y-6 p-6"
                >
                    <div className="flex items-center justify-between border-b border-app-border pb-4">
                        <div>
                            <div className="text-sm font-bold text-slate-800">Status Layanan Portal Wali Santri</div>
                            <div className="text-xs text-slate-500">Aktifkan untuk mengizinkan wali santri memantau perkembangan & keuangan santri.</div>
                        </div>
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
                        <div className="space-y-4">
                            {/* OPSI 1: GENERATOR HTML MANDIRI (CLOUDFLARE PAGES / NETLIFY) */}
                            <div className="rounded-2xl border-2 border-teal-500/80 bg-gradient-to-br from-teal-50/90 via-white to-cyan-50/70 p-5 shadow-sm">
                                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                    <div className="space-y-2 flex-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="inline-flex items-center gap-1 rounded-full bg-teal-600 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-white">
                                                <i className="bi bi-shield-lock-fill"></i> Direkomendasikan &bull; Seperti PSB
                                            </span>
                                            <h3 className="text-sm font-extrabold text-teal-950 uppercase tracking-wide">
                                                Generator File HTML Mandiri (Hosting Gratis Cloudflare / Netlify)
                                            </h3>
                                        </div>
                                        <p className="text-xs text-slate-600 leading-relaxed">
                                            Solusi agar link Portal Wali <strong>pendek, elegan, dan 100% menyembunyikan URL Google Apps Script</strong>. Unduh file <code>index.html</code> mandiri yang sudah menyematkan <em>Encrypted Vault Key</em>, lalu upload gratis ke <strong>Cloudflare Pages</strong> atau <strong>Netlify Drop</strong>.
                                        </p>
                                        <div className="flex flex-wrap items-center gap-2 pt-1">
                                            <button
                                                type="button"
                                                onClick={handleDownloadStandaloneHtml}
                                                disabled={!portalConfig.gasEndpoint}
                                                className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-xs font-extrabold text-white shadow-sm hover:bg-teal-700 disabled:opacity-50 transition-all"
                                            >
                                                <i className="bi bi-file-earmark-code-fill text-sm"></i>
                                                Download File Portal Mandiri (index.html)
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setShowCloudflareGuide(prev => !prev)}
                                                className="inline-flex items-center gap-1.5 rounded-xl border border-teal-300 bg-white px-3.5 py-2.5 text-xs font-bold text-teal-800 hover:bg-teal-50 transition-colors"
                                            >
                                                <i className="bi bi-cloud-upload"></i>
                                                {showCloudflareGuide ? 'Tutup Panduan Hosting Gratis' : 'Cara Upload ke Cloudflare Pages (Gratis)'}
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {showCloudflareGuide && (
                                    <div className="mt-4 rounded-xl border border-teal-200 bg-white p-4 text-xs text-slate-700 space-y-2.5">
                                        <h4 className="font-extrabold text-teal-900 flex items-center gap-1.5">
                                            <i className="bi bi-lightning-charge-fill text-amber-500"></i>
                                            Langkah Mudah Hosting Portal Wali di Cloudflare Pages (Cukup Sekali Upload!):
                                        </h4>
                                        <ol className="list-decimal pl-5 space-y-1.5 text-slate-600">
                                            <li>
                                                Pastikan Anda sudah mengisi <strong>Portal ID</strong> dan <strong>URL Web App GAS</strong> di bawah, lalu klik tombol <strong>Download File Portal Mandiri (index.html)</strong> di atas.
                                            </li>
                                            <li>
                                                Buka dashboard <a href="https://dash.cloudflare.com/" target="_blank" rel="noreferrer" className="text-teal-700 font-bold underline">Cloudflare Workers &amp; Pages</a> (atau <a href="https://app.netlify.com/drop" target="_blank" rel="noreferrer" className="text-teal-700 font-bold underline">Netlify Drop</a>).
                                            </li>
                                            <li>
                                                Pilih <strong>Create Application &rarr; Pages &rarr; Direct Upload (Upload Assets)</strong>, beri nama proyek misalnya <code>portal-alikhlas</code>, lalu tarik file <code>index.html</code> (atau masukkan ke dalam folder lalu upload) dan klik <strong>Deploy Site</strong>.
                                            </li>
                                            <li>
                                                Anda akan mendapatkan alamat pendek permanen seperti <code>https://portal-alikhlas.pages.dev</code>. Tempelkan alamat tersebut pada kolom <strong>URL Publik Hosting Mandiri</strong> di bawah agar QR Code otomatis mengarah ke alamat pendek tersebut!
                                            </li>
                                            <li className="text-teal-800 font-semibold">
                                                <i className="bi bi-check2-circle mr-1"></i>
                                                Keunggulan: Anda <strong>TIDAK PERLU</strong> meng-upload ulang file HTML saat memperbarui tagihan/absensi/pengumuman, karena file HTML mandiri otomatis menarik data terbaru dari GAS secara terenkripsi!
                                            </li>
                                        </ol>
                                    </div>
                                )}

                                <div className="mt-4 pt-3 border-t border-teal-200/70 grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                                    <div className="md:col-span-8">
                                        <label className="mb-1 block text-[11px] font-bold text-teal-900">
                                            URL Publik Hosting Mandiri (Opsional — Isi setelah di-upload ke Cloudflare/Netlify)
                                        </label>
                                        <input
                                            type="url"
                                            value={portalConfig.standalonePublicUrl || ''}
                                            onChange={(e) => updatePortalConfig({
                                                standalonePublicUrl: e.target.value,
                                                useStandaloneUrlAsPrimary: Boolean(e.target.value.trim())
                                            })}
                                            placeholder="Contoh: https://portal-pondok.pages.dev"
                                            className="app-input w-full p-2 text-xs bg-white"
                                        />
                                    </div>
                                    <div className="md:col-span-4">
                                        <label className="flex items-center gap-2 cursor-pointer rounded-xl border border-teal-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700">
                                            <input
                                                type="checkbox"
                                                checked={Boolean(portalConfig.useStandaloneUrlAsPrimary && portalConfig.standalonePublicUrl)}
                                                disabled={!portalConfig.standalonePublicUrl?.trim()}
                                                onChange={(e) => updatePortalConfig({ useStandaloneUrlAsPrimary: e.target.checked })}
                                                className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500"
                                            />
                                            <span>Jadikan Link Utama & QR</span>
                                        </label>
                                    </div>
                                </div>
                            </div>

                            {/* OPSI 2: LINK PORTAL TERENKRIPSI & QR CODE */}
                            <div className="rounded-2xl border border-blue-200 bg-blue-50/70 p-4">
                                <div className="flex flex-col gap-6 md:flex-row md:items-start">
                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-2 mb-1.5">
                                            <i className="bi bi-link-45deg text-blue-600 text-xl"></i>
                                            <h3 className="text-sm font-bold text-blue-900 uppercase tracking-wider">
                                                Tautan & QR Code Portal Wali Santri
                                            </h3>
                                            <span className="rounded-full bg-blue-100 border border-blue-200 px-2.5 py-0.5 text-[10px] font-bold text-blue-800">
                                                {portalConfig.useStandaloneUrlAsPrimary && portalConfig.standalonePublicUrl?.trim()
                                                    ? 'Mode Hosting Mandiri (Cloudflare/Custom)'
                                                    : 'Mode Kunci Terenkripsi (?k=ep2_...)'}
                                            </span>
                                        </div>
                                        <p className="text-xs text-blue-800 mb-3">
                                            Bagikan tautan atau QR Code ini kepada Wali Santri. Alamat Google Apps Script sudah dienkripsi sehingga aman dari inspeksi URL biasa.
                                        </p>

                                        {activeShareableUrl ? (
                                            <div className="space-y-3">
                                                <div className="flex min-w-0 flex-col gap-2 md:flex-row md:items-center">
                                                    <div className="min-w-0 flex-1 overflow-hidden rounded-xl border border-blue-300 bg-white">
                                                        <div className="overflow-x-auto p-2.5 font-mono text-xs text-blue-950 whitespace-nowrap">
                                                            {activeShareableUrl}
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-2 shrink-0">
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                navigator.clipboard.writeText(activeShareableUrl);
                                                                showToast('Link portal berhasil disalin!', 'success');
                                                            }}
                                                            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-blue-700"
                                                        >
                                                            <i className="bi bi-clipboard"></i> Salin Link
                                                        </button>
                                                        <a
                                                            href={activeShareableUrl}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-blue-300 bg-white px-3.5 py-2.5 text-xs font-bold text-blue-700 hover:bg-blue-50"
                                                        >
                                                            <i className="bi bi-box-arrow-up-right"></i> Buka
                                                        </a>
                                                    </div>
                                                </div>
                                                <p className="text-[11px] text-blue-700">
                                                    <i className="bi bi-shield-check mr-1"></i>
                                                    URL GAS tidak lagi ditampilkan secara telanjang (plain-text) di URL, melainkan disandikan dengan <code>?k=ep2_...</code> atau disimpan di dalam file HTML mandiri.
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="text-xs text-red-600 font-medium bg-red-50 p-3 rounded-xl border border-red-200">
                                                <i className="bi bi-exclamation-circle mr-1.5"></i>
                                                Tautan belum tersedia. Isi <strong>Portal ID</strong> dan <strong>URL Web App GAS</strong> pada bagian di bawah terlebih dahulu.
                                            </div>
                                        )}
                                    </div>

                                    {activeShareableUrl && (
                                        <div className="shrink-0 flex flex-col items-center gap-2 bg-white p-3 rounded-xl border border-blue-200 shadow-xs">
                                            <img
                                                src={qrCodeUrl}
                                                alt="QR Code Portal"
                                                className="w-32 h-32"
                                                referrerPolicy="no-referrer"
                                            />
                                            <span className="text-[10px] font-bold text-slate-600 uppercase">Scan QR Wali Santri</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    <div className={`space-y-8 ${!portalConfig.enabled ? 'opacity-50 pointer-events-none' : ''}`}>
                        {/* KONEKSI GOOGLE SHEETS + GAS V2 */}
                        <section className="rounded-xl border border-app-border bg-app-subtle p-4">
                            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                                <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-700">
                                    <i className="bi bi-database-gear text-teal-600"></i> Koneksi Google Sheets + GAS (Proteksi Server-Side v2.0)
                                </h3>
                                <span className="rounded-full bg-emerald-100 text-emerald-800 px-2.5 py-0.5 text-[10px] font-extrabold">
                                    Anti-Bulk Leak v2.0
                                </span>
                            </div>

                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <div>
                                    <label className="mb-1 block text-xs font-medium text-slate-600">Portal ID (Identitas Unik Pondok)</label>
                                    <input
                                        type="text"
                                        value={portalConfig.portalId || ''}
                                        onChange={(e) => updatePortalConfig({ portalId: e.target.value })}
                                        className="app-input"
                                        placeholder="contoh: ponpes-alikhlas"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-xs font-medium text-slate-600">Token Rahasia API GAS (Opsional)</label>
                                    <input
                                        type="text"
                                        value={portalConfig.gasApiKey || ''}
                                        onChange={(e) => updatePortalConfig({ gasApiKey: e.target.value })}
                                        className="app-input"
                                        placeholder="Kosongkan atau isi sama dengan API_TOKEN di GAS"
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="mb-1 block text-xs font-medium text-slate-600">URL Web App Google Apps Script (/exec)</label>
                                    <div className="flex flex-col sm:flex-row gap-2">
                                        <input
                                            type="url"
                                            value={portalConfig.gasEndpoint || ''}
                                            onChange={(e) => updatePortalConfig({ gasEndpoint: e.target.value })}
                                            className="app-input flex-1"
                                            placeholder="https://script.google.com/macros/s/.../exec"
                                        />
                                        <button
                                            type="button"
                                            onClick={handleTestGasConnection}
                                            disabled={isTestingConnection || !portalConfig.gasEndpoint}
                                            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-teal-600 bg-white px-4 py-2 text-xs font-bold text-teal-700 hover:bg-teal-50 disabled:opacity-50 shrink-0"
                                        >
                                            {isTestingConnection ? (
                                                <>
                                                    <i className="bi bi-arrow-repeat animate-spin"></i> Menguji...
                                                </>
                                            ) : (
                                                <>
                                                    <i className="bi bi-shield-check"></i> Tes Koneksi &amp; Keamanan GAS
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {connectionStatus && (
                                <div className={`mt-3 rounded-xl border p-3 text-xs flex items-start gap-2.5 ${
                                    !connectionStatus.ok
                                        ? 'border-red-200 bg-red-50 text-red-800'
                                        : connectionStatus.isLegacy
                                        ? 'border-amber-300 bg-amber-50 text-amber-900'
                                        : 'border-emerald-200 bg-emerald-50 text-emerald-900'
                                }`}>
                                    <i className={`bi text-base mt-0.5 ${
                                        !connectionStatus.ok
                                            ? 'bi-x-circle-fill text-red-600'
                                            : connectionStatus.isLegacy
                                            ? 'bi-exclamation-triangle-fill text-amber-600'
                                            : 'bi-patch-check-fill text-emerald-600'
                                    }`}></i>
                                    <div className="space-y-1">
                                        <p className="font-bold">{connectionStatus.message}</p>
                                        {connectionStatus.syncedAt && (
                                            <p className="text-[11px] opacity-80">Data terakhir disinkronkan: {new Date(connectionStatus.syncedAt).toLocaleString('id-ID')}</p>
                                        )}
                                    </div>
                                </div>
                            )}

                            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                                <p className="text-xs text-slate-500">
                                    <strong>Penting:</strong> Gunakan <strong>Kode GAS v2.0</strong> di bawah agar data seluruh santri tidak bisa diintip jika seseorang membuka URL GAS secara langsung.
                                </p>
                                <button
                                    type="button"
                                    onClick={() => setShowScriptHelper((prev) => !prev)}
                                    className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-100"
                                >
                                    <i className="bi bi-code-slash"></i>
                                    {showScriptHelper ? 'Sembunyikan Kode GAS v2.0' : 'Lihat & Salin Kode GAS v2.0 (Aman)'}
                                </button>
                            </div>

                            {showScriptHelper && (
                                <div className="mt-3 rounded-xl border border-blue-200 bg-white p-4">
                                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                                        <p className="text-xs text-slate-700">
                                            Tempel kode <strong>v2.0</strong> ini ke <strong>Google Sheets &rarr; Extensions &rarr; Apps Script</strong>, lalu pilih <strong>Deploy &rarr; New deployment (atau Manage deployments &rarr; Edit &rarr; New version)</strong> sebagai <strong>Web App (Anyone)</strong>.
                                        </p>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                navigator.clipboard.writeText(portalGasScript);
                                                showToast('Kode Google Apps Script v2.0 berhasil disalin!', 'success');
                                            }}
                                            className="rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-blue-700 shrink-0"
                                        >
                                            <i className="bi bi-clipboard mr-1"></i> Salin Kode GAS v2.0
                                        </button>
                                    </div>
                                    <textarea
                                        readOnly
                                        value={portalGasScript}
                                        className="h-64 w-full rounded-lg border border-slate-200 bg-slate-900 p-3 font-mono text-[11px] leading-relaxed text-emerald-300"
                                    />
                                </div>
                            )}
                        </section>

                        {/* KONFIGURASI DOMAIN INTERNAL (FALLBACK) */}
                        <section className="rounded-xl border border-app-border bg-app-subtle p-4">
                            <h3 className="mb-2 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-700">
                                <i className="bi bi-globe text-teal-600"></i> Domain Aplikasi eSantri (Jika Tidak Memakai HTML Mandiri)
                            </h3>
                            <div className="space-y-2">
                                <p className="text-xs text-slate-600">
                                    Jika Anda tidak menggunakan file HTML mandiri di Cloudflare Pages dan menjalankan eSantri dari <strong>Desktop (Tauri)</strong>, isi alamat web eSantri Anda di sini.
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
                                            type="button"
                                            onClick={() => updatePortalConfig({ baseUrl: '' })}
                                            className="text-xs font-medium text-red-600 hover:text-red-700 px-2"
                                        >
                                            Reset
                                        </button>
                                    )}
                                </div>
                            </div>
                        </section>

                        {/* TEMA */}
                        <section>
                            <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-4 flex items-center gap-2">
                                <i className="bi bi-palette text-teal-600"></i> Tema Visual Portal &amp; File HTML Mandiri
                            </h3>
                            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
                                {THEMES.map((t) => (
                                    <button
                                        key={t.id}
                                        type="button"
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
                                <i className="bi bi-eye text-teal-600"></i> Modul yang Ditampilkan ke Wali Santri
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                {[
                                    { id: 'showFinance', label: 'Keuangan, Rincian Tagihan & Tabungan', icon: 'bi-cash-stack' },
                                    { id: 'showAcademic', label: 'Akademik, Kamar Asrama & Rapor', icon: 'bi-mortarboard' },
                                    { id: 'showAttendance', label: 'Presensi Harian & Rekap 30 Hari', icon: 'bi-calendar-check' },
                                    { id: 'showTahfizh', label: 'Tahfizh & Riwayat Setoran', icon: 'bi-book' },
                                    { id: 'showHealth', label: 'Rekam Kesehatan & Poskestren', icon: 'bi-heart-pulse' },
                                    { id: 'showLibrary', label: 'Pinjaman Buku Perpustakaan', icon: 'bi-journal-bookmark' },
                                ].map((item) => (
                                    <label key={item.id} className="flex cursor-pointer items-center justify-between rounded-lg border border-app-border bg-app-subtle p-3 transition-all hover:bg-white hover:shadow-sm">
                                        <div className="flex items-center gap-3">
                                            <i className={`bi ${item.icon} text-slate-500`}></i>
                                            <span className="text-xs font-semibold text-slate-700">{item.label}</span>
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
                            <div className="mb-4 flex items-center justify-between">
                                <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-700">
                                    <i className="bi bi-megaphone text-teal-600"></i> Informasi &amp; Pengumuman Pondok
                                </h3>
                                <button
                                    type="button"
                                    onClick={handleAddAnnouncementPost}
                                    className="inline-flex items-center gap-1 rounded-lg bg-teal-50 px-3 py-1.5 text-xs font-bold text-teal-600 hover:bg-teal-100"
                                >
                                    <i className="bi bi-plus-lg"></i> Tambah Pengumuman
                                </button>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <label className="mb-1 block text-xs font-medium text-slate-600">Pesan Sambutan Halaman Login</label>
                                    <input
                                        type="text"
                                        value={portalConfig.welcomeMessage}
                                        onChange={(e) => updatePortalConfig({ welcomeMessage: e.target.value })}
                                        className="app-input w-full p-2.5 text-sm"
                                        placeholder="Contoh: Selamat Datang di Portal Wali Santri"
                                    />
                                </div>
                                <div>
                                    <label className="mb-2 block text-xs font-medium text-slate-600">Daftar Pengumuman Resmi Pondok</label>
                                    <div className="space-y-3">
                                        {announcementPosts.length === 0 && (
                                            <p className="rounded-lg border border-dashed border-app-border bg-app-subtle py-4 text-center text-xs italic text-slate-400">
                                                Belum ada pengumuman. Klik Tambah Pengumuman untuk membuat informasi baru bagi wali santri.
                                            </p>
                                        )}
                                        {announcementPosts.map((post) => (
                                            <div key={post.id} className="rounded-lg border border-app-border bg-app-subtle p-3">
                                                <div className="mb-2 flex items-center justify-between gap-2">
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleUpdateAnnouncementPost(post.id, { isPublished: !post.isPublished })}
                                                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${post.isPublished ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}
                                                        >
                                                            {post.isPublished ? 'Tayang' : 'Draft'}
                                                        </button>
                                                        <span className="text-[10px] text-slate-500">
                                                            {new Date(post.publishedAt).toLocaleDateString('id-ID')}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <button
                                                            type="button"
                                                            onClick={() => setEditingPostId(editingPostId === post.id ? null : post.id)}
                                                            className="rounded-md px-2 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-50"
                                                        >
                                                            {editingPostId === post.id ? 'Tutup' : 'Edit'}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRemoveAnnouncementPost(post.id)}
                                                            className="rounded-md px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
                                                        >
                                                            Hapus
                                                        </button>
                                                    </div>
                                                </div>
                                                {editingPostId === post.id ? (
                                                    <div className="space-y-2">
                                                        <input
                                                            type="text"
                                                            value={post.title}
                                                            onChange={(e) => handleUpdateAnnouncementPost(post.id, { title: e.target.value })}
                                                            className="app-input w-full p-2 text-sm"
                                                            placeholder="Judul pengumuman"
                                                        />
                                                        <textarea
                                                            value={post.content}
                                                            onChange={(e) => handleUpdateAnnouncementPost(post.id, { content: e.target.value })}
                                                            rows={3}
                                                            className="app-input w-full p-2 text-sm"
                                                            placeholder="Isi pengumuman..."
                                                        />
                                                    </div>
                                                ) : (
                                                    <div className="space-y-1">
                                                        <p className="text-sm font-semibold text-slate-800">{post.title || 'Tanpa Judul'}</p>
                                                        <p className="text-xs text-slate-600 whitespace-pre-wrap">{post.content || '-'}</p>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* KONTAK PENTING */}
                        <section>
                            <div className="flex justify-between items-center mb-4">
                                <div>
                                    <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-700">
                                        <i className="bi bi-person-lines-fill text-teal-600"></i> Kontak Penting &amp; Konfirmasi WA Bendahara
                                    </h3>
                                    <p className="text-[11px] text-slate-500">Kontak dengan ikon WhatsApp akan otomatis digunakan sebagai tujuan tombol "Konfirmasi Pembayaran via WA" di tab Keuangan.</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleAddContact}
                                    className="inline-flex items-center gap-1 rounded-lg bg-teal-50 px-3 py-1.5 text-xs font-bold text-teal-600 hover:bg-teal-100 shrink-0"
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
                                                placeholder="Nomor WA (0812...) / Email / Link"
                                                className="app-input p-2 text-sm"
                                            />
                                        </div>
                                        <button
                                            type="button"
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
                                    <i className="bi bi-link-45deg text-teal-600"></i> Tautan Eksternal Pondok
                                </h3>
                                <button
                                    type="button"
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
                                            type="button"
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
                            type="button"
                            onClick={() => { void handleSavePortalSettings(); }}
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
