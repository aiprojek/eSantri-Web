import React, { useState } from 'react';
import { PondokSettings, PortalConfig, PortalContact, PortalAnnouncementPost } from '../../types';
import { useAppContext } from '../../AppContext';
import { SectionCard } from '../common/SectionCard';
import {
    encodePortalKey,
    getPortalGasScriptV2,
    syncPortalBridgeToGas,
} from '../../services/portalGasService';
import { downloadStandalonePortalHtml } from '../../utils/portalStandaloneGenerator';

interface TabPortalProps {
    localSettings: PondokSettings;
    setLocalSettings: React.Dispatch<React.SetStateAction<PondokSettings>>;
    onSaveSettings?: (newSettings: PondokSettings) => Promise<void>;
}

const DEFAULT_PORTAL_CONFIG: PortalConfig = {
    enabled: false,
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
    useStandaloneUrl: false,
};

export const TabPortal: React.FC<TabPortalProps> = ({
    localSettings,
    setLocalSettings,
    onSaveSettings,
}) => {
    const { showToast, settings } = useAppContext();
    const [showGasScriptModal, setShowGasScriptModal] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [showApiKey, setShowApiKey] = useState(false);

    // State form pengumuman baru
    const [newPostTitle, setNewPostTitle] = useState('');
    const [newPostContent, setNewPostContent] = useState('');

    const portalConfig: PortalConfig = {
        ...DEFAULT_PORTAL_CONFIG,
        ...(localSettings.portalConfig || {}),
    };

    const handlePortalConfigChange = <K extends keyof PortalConfig>(
        key: K,
        value: PortalConfig[K]
    ) => {
        setLocalSettings((prev) => ({
            ...prev,
            portalConfig: {
                ...DEFAULT_PORTAL_CONFIG,
                ...(prev.portalConfig || {}),
                [key]: value,
            },
        }));
    };

    const encryptedKey =
        portalConfig.gasEndpoint?.trim() && portalConfig.portalId?.trim()
            ? encodePortalKey(
                  portalConfig.gasEndpoint.trim(),
                  portalConfig.portalId.trim(),
                  portalConfig.gasApiKey?.trim() || ''
              )
            : '';

    const originUrl = (portalConfig.baseUrl?.trim() || window.location.origin).replace(/\/+$/, '');
    const encryptedPortalLink = encryptedKey
        ? `${originUrl}/?portal=true&k=${encodeURIComponent(encryptedKey)}`
        : `${originUrl}/?portal=true`;

    const standaloneUrl = (portalConfig as any).standalonePublicUrl?.trim() || '';
    const activeShareUrl = standaloneUrl || encryptedPortalLink;

    const handleCopyText = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        showToast(`${label} berhasil disalin!`, 'success');
    };

    const handleDownloadStandalone = () => {
        try {
            if (!portalConfig.gasEndpoint?.trim()) {
                showToast('Isi URL Web App Google Apps Script terlebih dahulu.', 'error');
                return;
            }
            downloadStandalonePortalHtml(localSettings);
            showToast('File index.html Portal Wali (Terenkripsi) berhasil diunduh!', 'success');
        } catch (err) {
            showToast((err as Error)?.message || 'Gagal membuat file HTML mandiri.', 'error');
        }
    };

    const handleSyncNow = async () => {
        if (!portalConfig.gasEndpoint?.trim()) {
            showToast('Isi URL Web App GAS terlebih dahulu.', 'error');
            return;
        }
        setIsSyncing(true);
        try {
            const res = await syncPortalBridgeToGas(localSettings);
            const updatedPortal: any = {
                ...portalConfig,
                lastSyncedAt: res.syncedAt,
                lastSyncedCount: res.santriCount,
                lastPayloadSize: res.payloadSize,
            };
            const nextSettings: PondokSettings = {
                ...localSettings,
                portalConfig: updatedPortal,
            };
            setLocalSettings(nextSettings);
            if (onSaveSettings) {
                const dataToSave = { ...nextSettings };
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
            }
            showToast(`Berhasil sinkronisasi ${res.santriCount} data santri ke Portal Wali!`, 'success');
        } catch (err) {
            showToast((err as Error)?.message || 'Gagal sinkronisasi ke GAS.', 'error');
        } finally {
            setIsSyncing(false);
        }
    };

    const handleSaveConfiguration = async () => {
        if (!onSaveSettings) return;
        setIsSaving(true);
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
            showToast('Pengaturan Portal Wali berhasil disimpan!', 'success');
        } catch (err) {
            showToast('Gagal menyimpan pengaturan Portal Wali.', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    // Pengumuman Pondok (Multi-Post)
    const posts: PortalAnnouncementPost[] = Array.isArray(portalConfig.announcementPosts)
        ? portalConfig.announcementPosts
        : [];

    const handleAddAnnouncementPost = () => {
        if (!newPostTitle.trim() || !newPostContent.trim()) {
            showToast('Judul dan isi pengumuman wajib diisi.', 'error');
            return;
        }
        const newPost: PortalAnnouncementPost = {
            id: `post-${Date.now()}`,
            title: newPostTitle.trim(),
            content: newPostContent.trim(),
            publishedAt: new Date().toISOString().split('T')[0],
            isPublished: true,
        };
        handlePortalConfigChange('announcementPosts', [newPost, ...posts]);
        setNewPostTitle('');
        setNewPostContent('');
        showToast('Pengumuman ditambahkan. Klik Simpan & Sinkronkan untuk menayangkan.', 'info');
    };

    const handleTogglePostPublish = (id: string) => {
        handlePortalConfigChange(
            'announcementPosts',
            posts.map((p) => (p.id === id ? { ...p, isPublished: !p.isPublished } : p))
        );
    };

    const handleDeletePost = (id: string) => {
        handlePortalConfigChange(
            'announcementPosts',
            posts.filter((p) => p.id !== id)
        );
    };

    // Kontak & Rekening
    const contacts: PortalContact[] = Array.isArray(portalConfig.contacts) ? portalConfig.contacts : [];

    const handleAddContact = (preset?: Partial<PortalContact>) => {
        const next: PortalContact = {
            id: `cnt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            label: preset?.label || 'WA Bendahara / Konfirmasi SPP',
            value: preset?.value || '081234567890',
            icon: preset?.icon || 'bi-whatsapp',
        };
        handlePortalConfigChange('contacts', [...contacts, next]);
    };

    const handleUpdateContact = (id: string, field: keyof PortalContact, val: string) => {
        handlePortalConfigChange(
            'contacts',
            contacts.map((c) => (c.id === id ? { ...c, [field]: val } : c))
        );
    };

    const handleRemoveContact = (id: string) => {
        handlePortalConfigChange(
            'contacts',
            contacts.filter((c) => c.id !== id)
        );
    };

    // Custom Links (Tautan Penting / Brosur / QRIS)
    const customLinks = Array.isArray(portalConfig.customLinks) ? portalConfig.customLinks : [];

    const handleAddCustomLink = () => {
        handlePortalConfigChange('customLinks', [
            ...customLinks,
            { label: 'Brosur / Info Pondok', url: 'https://' },
        ]);
    };

    const handleUpdateCustomLink = (idx: number, field: 'label' | 'url', val: string) => {
        handlePortalConfigChange(
            'customLinks',
            customLinks.map((item, i) => (i === idx ? { ...item, [field]: val } : item))
        );
    };

    const handleRemoveCustomLink = (idx: number) => {
        handlePortalConfigChange(
            'customLinks',
            customLinks.filter((_, i) => i !== idx)
        );
    };

    const gasScriptV2 = getPortalGasScriptV2(portalConfig.portalId || 'ponpes-alikhlas');

    return (
        <div className="space-y-6">
            {/* 1. Koneksi Jembatan Google Apps Script (GAS v2.0) & Keamanan Link */}
            <SectionCard
                title="Koneksi Jembatan Cloud (Google Apps Script v2.0) & Keamanan Tautan"
                description="Hubungkan eSantri dengan Google Spreadsheet menggunakan skrip v2.0 (Server-Side Auth) agar URL GAS tidak dapat diintip dan data seluruh santri terlindungi."
                contentClassName="p-6 space-y-6"
            >
                <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-teal-200 bg-teal-50/70 p-4">
                    <label className="inline-flex items-center gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={portalConfig.enabled}
                            onChange={(e) => handlePortalConfigChange('enabled', e.target.checked)}
                            className="h-5 w-5 rounded border-teal-300 text-teal-600 focus:ring-teal-500"
                        />
                        <div>
                            <span className="text-sm font-bold text-teal-950 block">
                                Aktifkan Layanan Portal Wali Santri
                            </span>
                            <span className="text-xs text-teal-800">
                                Wali santri dapat login menggunakan NIS &amp; Tanggal Lahir untuk memantau perkembangan putra/putrinya.
                            </span>
                        </div>
                    </label>

                    <button
                        type="button"
                        onClick={() => setShowGasScriptModal(true)}
                        className="inline-flex items-center gap-2 rounded-xl bg-teal-700 px-4 py-2 text-xs font-bold text-white hover:bg-teal-800 transition-colors shadow-2xs"
                    >
                        <i className="bi bi-file-earmark-code"></i>
                        Lihat &amp; Salin Kode Script GAS v2.0 (Aman)
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                            Portal ID Unik Pondok
                        </label>
                        <input
                            type="text"
                            value={portalConfig.portalId || ''}
                            onChange={(e) => handlePortalConfigChange('portalId', e.target.value)}
                            placeholder="Contoh: ponpes-alikhlas"
                            className="app-input block w-full p-2.5 text-sm font-mono"
                        />
                        <p className="text-[11px] text-slate-500 mt-1">
                            Samakan dengan <code>PORTAL_ID_DEFAULT</code> di kode Google Apps Script.
                        </p>
                    </div>

                    <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                            URL Web App Google Apps Script (Endpoint <code>/exec</code>)
                        </label>
                        <input
                            type="url"
                            value={portalConfig.gasEndpoint || ''}
                            onChange={(e) => handlePortalConfigChange('gasEndpoint', e.target.value)}
                            placeholder="https://script.google.com/macros/s/AKfycb.../exec"
                            className="app-input block w-full p-2.5 text-sm font-mono"
                        />
                        <p className="text-[11px] text-slate-500 mt-1">
                            URL ini akan dienkripsi otomatis (Vault Key <code>ep2_...</code>) sehingga tidak terekspos di tautan wali santri.
                        </p>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                            Token Rahasia API GAS (Opsional)
                        </label>
                        <div className="relative">
                            <input
                                type={showApiKey ? 'text' : 'password'}
                                value={portalConfig.gasApiKey || ''}
                                onChange={(e) => handlePortalConfigChange('gasApiKey', e.target.value)}
                                placeholder="Kosongkan jika tidak memakai token"
                                className="app-input block w-full p-2.5 pr-9 text-sm font-mono"
                            />
                            <button
                                type="button"
                                onClick={() => setShowApiKey((prev) => !prev)}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                                <i className={`bi ${showApiKey ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                            URL Publik Mandiri (Cloudflare Pages / Custom Domain)
                        </label>
                        <input
                            type="url"
                            value={(portalConfig as any).standalonePublicUrl || ''}
                            onChange={(e) =>
                                handlePortalConfigChange('standalonePublicUrl' as any, e.target.value as any)
                            }
                            placeholder="Contoh: https://wali.ponpes-alikhlas.pages.dev"
                            className="app-input block w-full p-2.5 text-sm"
                        />
                        <p className="text-[11px] text-slate-500 mt-1">
                            Jika diisi, tombol Salin Link &amp; WA akan memprioritaskan domain pendek ini.
                        </p>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                            Tema Warna Portal Wali
                        </label>
                        <select
                            value={portalConfig.theme || 'teal'}
                            onChange={(e) => handlePortalConfigChange('theme', e.target.value as any)}
                            className="app-select block w-full p-2.5 text-sm"
                        >
                            <option value="teal">Teal Emerald (Khas Pesantren)</option>
                            <option value="emerald">Hijau Zamrud</option>
                            <option value="blue">Biru Akademik</option>
                            <option value="indigo">Indigo Modern</option>
                            <option value="cyan">Cyan Segar</option>
                            <option value="slate">Slate Formal</option>
                            <option value="rose">Maroon / Rose</option>
                        </select>
                    </div>
                </div>

                {/* Opsi Distribusi Portal: File HTML Mandiri (Cloudflare) vs Tautan Terenkripsi */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-2">
                    <div className="rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50/80 to-teal-50/50 p-4 flex flex-col justify-between space-y-3">
                        <div>
                            <div className="flex items-center justify-between">
                                <span className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-emerald-800">
                                    <i className="bi bi-cloud-check-fill text-emerald-600"></i>
                                    Opsi 1 (Rekomendasi): File HTML Mandiri (Cloudflare / Netlify)
                                </span>
                                <span className="rounded-full bg-emerald-200/80 px-2 py-0.5 text-[10px] font-bold text-emerald-950">
                                    Paling Aman &amp; Pendek
                                </span>
                            </div>
                            <p className="text-xs text-emerald-900 mt-1.5 leading-relaxed">
                                Unduh file <code>index.html</code> yang sudah berisi kode aplikasi Portal Wali + kredensial GAS yang dienkripsi (XOR Cipher + Base64). Upload 1 kali ke <strong>Cloudflare Pages</strong> atau <strong>Netlify Drop</strong> gratis untuk mendapatkan domain pendek resmi pondok.
                            </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 pt-1">
                            <button
                                type="button"
                                onClick={handleDownloadStandalone}
                                className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2 text-xs font-bold transition-colors shadow-2xs"
                            >
                                <i className="bi bi-download"></i>
                                Download File index.html Mandiri
                            </button>
                        </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 flex flex-col justify-between space-y-3">
                        <div>
                            <div className="flex items-center justify-between">
                                <span className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-slate-700">
                                    <i className="bi bi-link-45deg text-teal-600 text-base"></i>
                                    Opsi 2: Tautan Portal Terenkripsi (Parameter ?k=ep2_...)
                                </span>
                                <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                                    Tanpa Hosting Tambahan
                                </span>
                            </div>
                            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                                Tautan langsung yang menyamarkan URL GAS menjadi parameter pendek <code>?k=ep2_...</code>:
                            </p>
                            <div className="mt-2 flex items-center gap-2">
                                <input
                                    type="text"
                                    readOnly
                                    value={activeShareUrl}
                                    className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-mono text-slate-700"
                                />
                                <button
                                    type="button"
                                    onClick={() => handleCopyText(activeShareUrl, 'Tautan Portal Wali')}
                                    className="shrink-0 rounded-lg bg-slate-800 hover:bg-slate-900 text-white px-3 py-1.5 text-xs font-semibold"
                                >
                                    <i className="bi bi-clipboard mr-1"></i> Salin
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </SectionCard>

            {/* 2. Hak Akses Modul Tampilan Wali Santri */}
            <SectionCard
                title="Hak Akses Informasi & Modul Dasbor Wali Santri"
                description="Pilih modul informasi apa saja yang ditampilkan kepada wali santri setelah login."
                contentClassName="p-6 space-y-4"
            >
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                    {[
                        {
                            key: 'showFinance' as const,
                            label: 'Keuangan, SPP & Tabungan',
                            desc: 'Menampilkan tunggakan tagihan, riwayat pembayaran, saldo tabungan, dan tombol konfirmasi WA.',
                            icon: 'bi-wallet2 text-emerald-600',
                        },
                        {
                            key: 'showAcademic' as const,
                            label: 'Akademik, Rapor & Pembinaan',
                            desc: 'Menampilkan nilai rapor terakhir, predikat mata pelajaran, prestasi, dan catatan pembinaan.',
                            icon: 'bi-mortarboard-fill text-blue-600',
                        },
                        {
                            key: 'showAttendance' as const,
                            label: 'Presensi Kehadiran',
                            desc: 'Menampilkan status kehadiran hari ini serta rekap hadir, izin, sakit, dan alpha bulan berjalan.',
                            icon: 'bi-calendar2-check-fill text-teal-600',
                        },
                        {
                            key: 'showTahfizh' as const,
                            label: 'Capaian Tahfizh Al-Qur’an',
                            desc: 'Menampilkan progress bar target juz, total hafalan, dan riwayat setoran Ziyadah/Murojaah.',
                            icon: 'bi-journal-bookmark-fill text-amber-600',
                        },
                        {
                            key: 'showHealth' as const,
                            label: 'Rekam Kesehatan Poskestren',
                            desc: 'Menampilkan riwayat pemeriksaan kesehatan santri, keluhan, suhu tubuh, dan tindakan medis.',
                            icon: 'bi-heart-pulse-fill text-rose-600',
                        },
                        {
                            key: 'showLibrary' as const,
                            label: 'Peminjaman Buku Perpustakaan',
                            desc: 'Menampilkan daftar buku perpustakaan yang sedang dipinjam beserta batas tanggal pengembalian.',
                            icon: 'bi-book-half text-indigo-600',
                        },
                    ].map((mod) => (
                        <label
                            key={mod.key}
                            className={`flex items-start gap-3 rounded-xl border p-3.5 cursor-pointer transition-all ${
                                portalConfig[mod.key]
                                    ? 'border-teal-300 bg-teal-50/40 shadow-2xs'
                                    : 'border-slate-200 bg-white opacity-75'
                            }`}
                        >
                            <input
                                type="checkbox"
                                checked={Boolean(portalConfig[mod.key])}
                                onChange={(e) => handlePortalConfigChange(mod.key, e.target.checked)}
                                className="mt-1 h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                            />
                            <div>
                                <div className="flex items-center gap-1.5 text-sm font-bold text-slate-800">
                                    <i className={`bi ${mod.icon}`}></i>
                                    <span>{mod.label}</span>
                                </div>
                                <p className="text-xs text-slate-500 mt-1 leading-relaxed">{mod.desc}</p>
                            </div>
                        </label>
                    ))}
                </div>
            </SectionCard>

            {/* 3. Papan Pengumuman Pondok & Pesan Sambutan */}
            <SectionCard
                title="Papan Pengumuman Pondok & Pesan Sambutan"
                description="Kelola pesan sambutan dan daftar pengumuman resmi yang tampil di halaman login serta dasbor wali santri."
                contentClassName="p-6 space-y-5"
            >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                            Judul / Sapaan Sambutan Portal
                        </label>
                        <input
                            type="text"
                            value={portalConfig.welcomeMessage || ''}
                            onChange={(e) => handlePortalConfigChange('welcomeMessage', e.target.value)}
                            placeholder="Selamat Datang di Portal Wali Santri"
                            className="app-input block w-full p-2.5 text-sm"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                            Pengumuman Singkat (Highlight Banner)
                        </label>
                        <input
                            type="text"
                            value={portalConfig.announcement || ''}
                            onChange={(e) => handlePortalConfigChange('announcement', e.target.value)}
                            placeholder="Contoh: Pembayaran SPP bulan ini paling lambat tanggal 10."
                            className="app-input block w-full p-2.5 text-sm"
                        />
                    </div>
                </div>

                {/* Form Tambah Pengumuman Multi-Post */}
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                        <i className="bi bi-megaphone-fill text-teal-600"></i>
                        Tambah Pengumuman Baru ke Papan Informasi
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <input
                            type="text"
                            value={newPostTitle}
                            onChange={(e) => setNewPostTitle(e.target.value)}
                            placeholder="Judul Pengumuman (mis. Jadwal Libur Ramadhan)"
                            className="app-input p-2.5 text-sm"
                        />
                        <input
                            type="text"
                            value={newPostContent}
                            onChange={(e) => setNewPostContent(e.target.value)}
                            placeholder="Isi pengumuman lengkap untuk wali santri..."
                            className="app-input md:col-span-2 p-2.5 text-sm"
                        />
                    </div>
                    <div className="flex justify-end">
                        <button
                            type="button"
                            onClick={handleAddAnnouncementPost}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 text-xs font-bold transition-colors"
                        >
                            <i className="bi bi-plus-circle"></i> Tambah Pengumuman
                        </button>
                    </div>
                </div>

                {posts.length > 0 && (
                    <div className="space-y-2.5">
                        {posts.map((post) => (
                            <div
                                key={post.id}
                                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3.5"
                            >
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-sm text-slate-800">{post.title}</span>
                                        <span
                                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                                post.isPublished
                                                    ? 'bg-emerald-100 text-emerald-800'
                                                    : 'bg-slate-100 text-slate-500'
                                            }`}
                                        >
                                            {post.isPublished ? 'Tayang' : 'Draft'}
                                        </span>
                                        <span className="text-[11px] text-slate-400">{post.publishedAt}</span>
                                    </div>
                                    <p className="text-xs text-slate-600 mt-1">{post.content}</p>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <button
                                        type="button"
                                        onClick={() => handleTogglePostPublish(post.id)}
                                        className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                                    >
                                        {post.isPublished ? 'Sembunyikan' : 'Tayangkan'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleDeletePost(post.id)}
                                        className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-100"
                                    >
                                        <i className="bi bi-trash3"></i>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </SectionCard>

            {/* 4. Kontak Layanan Wali, Nomor WA Konfirmasi SPP, & Rekening Pembayaran */}
            <SectionCard
                title="Kontak Layanan Wali Santri, WA Bendahara & Rekening Pondok"
                description="Tambahkan nomor WhatsApp Admin/Bendahara (otomatis terhubung ke tombol Konfirmasi Pembayaran SPP) serta nomor rekening pondok."
                contentClassName="p-6 space-y-6"
            >
                <div className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <h4 className="text-sm font-bold text-slate-800">Daftar Kontak &amp; Rekening Pembayaran</h4>
                        <div className="flex flex-wrap gap-2">
                            <button
                                type="button"
                                onClick={() =>
                                    handleAddContact({
                                        label: 'WA Bendahara (Konfirmasi SPP)',
                                        value: '081234567890',
                                        icon: 'bi-whatsapp',
                                    })
                                }
                                className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100"
                            >
                                + WA Bendahara
                            </button>
                            <button
                                type="button"
                                onClick={() =>
                                    handleAddContact({
                                        label: 'Rekening BSI Pondok',
                                        value: '7123456789 a.n. Yayasan Pesantren',
                                        icon: 'bi-bank',
                                    })
                                }
                                className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-800 hover:bg-blue-100"
                            >
                                + Rekening Bank
                            </button>
                        </div>
                    </div>

                    {contacts.length === 0 && (
                        <p className="text-xs text-slate-400 italic">
                            Belum ada kontak atau nomor rekening yang ditambahkan.
                        </p>
                    )}

                    <div className="space-y-2.5">
                        {contacts.map((cnt) => (
                            <div
                                key={cnt.id}
                                className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center rounded-xl border border-slate-200 bg-slate-50 p-3"
                            >
                                <div className="sm:col-span-3">
                                    <select
                                        value={cnt.icon || 'bi-whatsapp'}
                                        onChange={(e) => handleUpdateContact(cnt.id, 'icon', e.target.value)}
                                        className="app-select w-full p-2 text-xs"
                                    >
                                        <option value="bi-whatsapp">WhatsApp Layanan</option>
                                        <option value="bi-bank">Rekening Bank</option>
                                        <option value="bi-telephone-fill">Telepon Kantor</option>
                                        <option value="bi-envelope-fill">Email Resmi</option>
                                    </select>
                                </div>
                                <div className="sm:col-span-4">
                                    <input
                                        type="text"
                                        value={cnt.label}
                                        onChange={(e) => handleUpdateContact(cnt.id, 'label', e.target.value)}
                                        placeholder="Label (mis. WA Bendahara / Rek BSI)"
                                        className="app-input w-full p-2 text-xs"
                                    />
                                </div>
                                <div className="sm:col-span-4">
                                    <input
                                        type="text"
                                        value={cnt.value}
                                        onChange={(e) => handleUpdateContact(cnt.id, 'value', e.target.value)}
                                        placeholder="Nomor WA / Nomor Rekening"
                                        className="app-input w-full p-2 text-xs font-mono"
                                    />
                                </div>
                                <div className="sm:col-span-1 flex justify-end">
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveContact(cnt.id)}
                                        className="rounded-lg bg-red-50 p-2 text-red-600 hover:bg-red-100"
                                    >
                                        <i className="bi bi-trash3"></i>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Custom Links */}
                <div className="space-y-3 border-t pt-4">
                    <div className="flex items-center justify-between">
                        <h4 className="text-sm font-bold text-slate-800">
                            Tautan Eksternal (Brosur, Kalender Akademik PDF, QRIS, dll.)
                        </h4>
                        <button
                            type="button"
                            onClick={handleAddCustomLink}
                            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
                        >
                            + Tambah Tautan
                        </button>
                    </div>
                    {customLinks.map((lnk, idx) => (
                        <div key={idx} className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center">
                            <input
                                type="text"
                                value={lnk.label}
                                onChange={(e) => handleUpdateCustomLink(idx, 'label', e.target.value)}
                                placeholder="Nama Tautan"
                                className="app-input sm:col-span-5 p-2 text-xs"
                            />
                            <input
                                type="url"
                                value={lnk.url}
                                onChange={(e) => handleUpdateCustomLink(idx, 'url', e.target.value)}
                                placeholder="https://..."
                                className="app-input sm:col-span-6 p-2 text-xs font-mono"
                            />
                            <button
                                type="button"
                                onClick={() => handleRemoveCustomLink(idx)}
                                className="sm:col-span-1 rounded-lg bg-red-50 p-2 text-red-600 hover:bg-red-100"
                            >
                                <i className="bi bi-trash3"></i>
                            </button>
                        </div>
                    ))}
                </div>

                {/* Action Bar Simpan & Sinkron */}
                <div className="flex flex-wrap items-center justify-end gap-3 border-t pt-4">
                    {onSaveSettings && (
                        <button
                            type="button"
                            onClick={handleSaveConfiguration}
                            disabled={isSaving}
                            className="rounded-xl border border-teal-600 bg-white px-5 py-2.5 text-xs font-bold text-teal-800 hover:bg-teal-50 disabled:opacity-50"
                        >
                            <i className="bi bi-save mr-1.5"></i>
                            {isSaving ? 'Menyimpan...' : 'Simpan Pengaturan Portal'}
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={handleSyncNow}
                        disabled={isSyncing}
                        className="app-button-primary px-5 py-2.5 text-xs font-bold disabled:opacity-50"
                    >
                        <i className={`bi ${isSyncing ? 'bi-arrow-repeat animate-spin' : 'bi-cloud-arrow-up-fill'} mr-1.5`}></i>
                        {isSyncing ? 'Menyinkronkan...' : 'Simpan & Sinkronkan ke GAS Sekarang'}
                    </button>
                </div>
            </SectionCard>

            {/* Modal Kode Google Apps Script v2.0 */}
            {showGasScriptModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
                    <div className="flex max-h-[90vh] w-full max-w-4xl flex-col rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
                        <div className="flex items-center justify-between border-b bg-slate-50 px-6 py-4">
                            <div>
                                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                                    <i className="bi bi-shield-lock-fill text-teal-600"></i>
                                    Kode Google Apps Script Portal Wali v2.0 (Server-Side Auth)
                                </h3>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Salin kode di bawah ini ke editor <strong>Extensions &gt; Apps Script</strong> di Google Spreadsheet Anda, lalu klik <strong>Deploy &gt; New deployment (Web app, Anyone)</strong>.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowGasScriptModal(false)}
                                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-600"
                            >
                                <i className="bi bi-x-lg"></i>
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 space-y-4">
                            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-900 space-y-1">
                                <div className="font-bold">Keunggulan Keamanan Script v2.0:</div>
                                <ul className="list-disc pl-5 space-y-0.5">
                                    <li>
                                        Endpoint publik (<code>getPortalPublicInfo</code>) hanya mengirimkan nama pondok &amp; pengumuman (<strong>0% data santri</strong>).
                                    </li>
                                    <li>
                                        Verifikasi login NIS &amp; Tanggal Lahir dilakukan langsung di server Google (<code>action=loginSantri</code>) dan hanya mengembalikan 1 santri yang cocok.
                                    </li>
                                </ul>
                            </div>
                            <pre className="max-h-96 overflow-auto rounded-xl bg-slate-900 p-4 text-xs text-emerald-300 font-mono leading-relaxed">
                                {gasScriptV2}
                            </pre>
                        </div>
                        <div className="flex items-center justify-end gap-3 border-t bg-slate-50 px-6 py-3.5">
                            <button
                                type="button"
                                onClick={() => handleCopyText(gasScriptV2, 'Kode Script GAS v2.0')}
                                className="app-button-primary px-4 py-2 text-xs font-bold"
                            >
                                <i className="bi bi-clipboard-check mr-1.5"></i>
                                Salin Seluruh Kode Script v2.0
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowGasScriptModal(false)}
                                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                            >
                                Tutup
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
