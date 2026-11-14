import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { PondokSettings } from '../../types';
import { db } from '../../db';
import { THEME_PALETTES } from '../../utils/portalStandaloneGenerator';
import { isSubjectGradeKey } from '../../services/raporCalculationService';

interface PortalLivePreviewProps {
    settings: PondokSettings;
    onUpdateTheme?: (themeKey: string) => void;
    onOpenNewTab?: () => void;
    onCopyLink?: () => void;
    onClose?: () => void;
}

export const PortalLivePreview: React.FC<PortalLivePreviewProps> = ({
    settings,
    onUpdateTheme,
    onClose,
}) => {
    const [deviceView, setDeviceView] = useState<'mobile' | 'tablet' | 'desktop'>('mobile');
    const [previewMode, setPreviewMode] = useState<'login' | 'dashboard'>('login');
    const [activeTab, setActiveTab] = useState<'keuangan' | 'akademik' | 'presensi' | 'tahfizh' | 'kesehatan' | 'perpus'>('keuangan');
    const [selectedSantriId, setSelectedSantriId] = useState<number | null>(null);

    // Ambil tema aktif dan sinkronkan dengan pengaturan
    const configTheme = settings.portalConfig?.theme || 'teal';
    const [activeThemeKey, setActiveThemeKey] = useState<string>(configTheme);

    useEffect(() => {
        if (settings.portalConfig?.theme) {
            setActiveThemeKey(settings.portalConfig.theme);
        }
    }, [settings.portalConfig?.theme]);

    const handleSelectTheme = (thm: string) => {
        setActiveThemeKey(thm);
        if (onUpdateTheme) {
            onUpdateTheme(thm);
        }
    };

    const palette = THEME_PALETTES[activeThemeKey] || THEME_PALETTES.teal;

    // Ambil daftar santri aktif dari Dexie lokal
    const activeSantriList = useLiveQuery(
        async () => {
            return await db.santri.filter(s => !s.deleted && s.status === 'Aktif').toArray();
        },
        [],
        []
    );

    const activeSantri = (activeSantriList || []).find(s => s.id === selectedSantriId) || (activeSantriList && activeSantriList[0]);

    // Data tagihan, saldo, tahfizh, poskestren, dan rapor untuk santri terpilih
    const santriBills = useLiveQuery(
        async () => {
            if (!activeSantri?.id) return [];
            return await db.tagihan.where('santriId').equals(activeSantri.id).toArray();
        },
        [activeSantri?.id],
        []
    );

    const santriSaldo = useLiveQuery(
        async () => {
            if (!activeSantri?.id) return null;
            return await db.saldoSantri.get(activeSantri.id);
        },
        [activeSantri?.id],
        null
    );

    const santriMutasi = useLiveQuery(
        async () => {
            if (!activeSantri?.id) return [];
            return await db.transaksiSaldo.where('santriId').equals(activeSantri.id).reverse().limit(5).toArray();
        },
        [activeSantri?.id],
        []
    );

    const santriPembayaran = useLiveQuery(
        async () => {
            if (!activeSantri?.id) return [];
            return await db.pembayaran.where('santriId').equals(activeSantri.id).reverse().limit(5).toArray();
        },
        [activeSantri?.id],
        []
    );

    const santriTahfizh = useLiveQuery(
        async () => {
            if (!activeSantri?.id) return [];
            const list = await db.tahfizh.where('santriId').equals(activeSantri.id).filter(r => !r.deleted).reverse().toArray();
            return list.slice(0, 5);
        },
        [activeSantri?.id],
        []
    );

    const santriHealth = useLiveQuery(
        async () => {
            if (!activeSantri?.id) return [];
            const list = await db.kesehatanRecords.where('santriId').equals(activeSantri.id).filter(r => !r.deleted).reverse().toArray();
            return list.slice(0, 3);
        },
        [activeSantri?.id],
        []
    );

    const santriRapor = useLiveQuery(
        async () => {
            if (!activeSantri?.id) return null;
            const list = await db.raporRecords.where('santriId').equals(activeSantri.id).filter(r => !r.deleted).toArray();
            if (list.length === 0) return null;
            list.sort((a, b) => (b.lastModified || 0) - (a.lastModified || 0));
            return list[0];
        },
        [activeSantri?.id],
        null
    );

    const portalConfig = settings.portalConfig || {
        enabled: true,
        theme: 'teal',
        welcomeMessage: 'Selamat Datang di Portal Wali Santri',
        announcement: '',
        showFinance: true,
        showAcademic: true,
        showAttendance: true,
        showTahfizh: true,
        showHealth: true,
        showLibrary: true,
        contacts: [],
        customLinks: []
    };

    const rombelObj = settings.rombel?.find(r => r.id === activeSantri?.rombelId);
    const kelasObj = settings.kelas?.find(k => k.id === (rombelObj?.kelasId || activeSantri?.kelasId));
    const waliKelasObj = rombelObj?.waliKelasId ? settings.tenagaPengajar?.find(tp => tp.id === rombelObj.waliKelasId) : undefined;
    const unpaidBills = (santriBills || []).filter(b => !b.deleted && b.status === 'Belum Lunas');
    const totalTunggakan = unpaidBills.reduce((acc, b) => acc + (b.nominal - (b.sudahDicicil || 0)), 0);

    const formatRp = (num?: number) => 'Rp ' + Number(num || 0).toLocaleString('id-ID');

    return (
        <div className="rounded-2xl border border-slate-200 bg-slate-100/70 p-4 sm:p-6 space-y-4">
            {/* Toolbar Simulator */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white p-3 sm:p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                <div className="flex flex-wrap items-center gap-2.5">
                    <div className="flex items-center gap-1.5">
                        <span className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                            <i className="bi bi-display text-teal-600 text-sm"></i>
                            Live Preview
                        </span>
                        <span className="rounded-full bg-emerald-100 text-emerald-800 px-2 py-0.5 text-[10px] font-bold">
                            Presisi HTML
                        </span>
                    </div>

                    {/* Quick Theme Palette Selector */}
                    <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200">
                        <span className="text-[11px] font-bold text-slate-500 mr-0.5">Tema:</span>
                        {Object.entries(THEME_PALETTES).map(([key, pal]) => {
                            const isCurrent = activeThemeKey === key;
                            return (
                                <button
                                    key={key}
                                    type="button"
                                    onClick={() => handleSelectTheme(key)}
                                    title={`Tema ${key.toUpperCase()}`}
                                    className={`w-5 h-5 rounded-full transition-transform flex items-center justify-center shrink-0 ${
                                        isCurrent ? 'ring-2 ring-offset-1 ring-slate-800 scale-110 shadow-xs' : 'hover:scale-105 opacity-80'
                                    }`}
                                    style={{ backgroundColor: pal.primary }}
                                >
                                    {isCurrent && <i className="bi bi-check text-white text-[10px] font-black"></i>}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    {/* Device Selector */}
                    <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 sm:p-1">
                        <button
                            type="button"
                            onClick={() => setDeviceView('mobile')}
                            className={`px-2 py-1 sm:px-2.5 text-xs font-bold rounded-md flex items-center gap-1 transition-all ${
                                deviceView === 'mobile' ? 'bg-white text-slate-900 shadow-2xs font-extrabold' : 'text-slate-600 hover:text-slate-900'
                            }`}
                            title="Tampilan HP / Mobile (375px)"
                        >
                            <i className="bi bi-phone"></i>
                            <span className="text-[11px] sm:text-xs">HP</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setDeviceView('tablet')}
                            className={`px-2 py-1 sm:px-2.5 text-xs font-bold rounded-md flex items-center gap-1 transition-all ${
                                deviceView === 'tablet' ? 'bg-white text-slate-900 shadow-2xs font-extrabold' : 'text-slate-600 hover:text-slate-900'
                            }`}
                            title="Tampilan Tablet (720px)"
                        >
                            <i className="bi bi-tablet"></i>
                            <span className="text-[11px] sm:text-xs">Tablet</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setDeviceView('desktop')}
                            className={`px-2 py-1 sm:px-2.5 text-xs font-bold rounded-md flex items-center gap-1 transition-all ${
                                deviceView === 'desktop' ? 'bg-white text-slate-900 shadow-2xs font-extrabold' : 'text-slate-600 hover:text-slate-900'
                            }`}
                            title="Tampilan Layar Penuh (Desktop)"
                        >
                            <i className="bi bi-laptop"></i>
                            <span className="text-[11px] sm:text-xs">Desktop</span>
                        </button>
                    </div>

                    {/* Mode Selector */}
                    <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 sm:p-1">
                        <button
                            type="button"
                            onClick={() => setPreviewMode('login')}
                            className={`px-2 py-1 sm:px-2.5 text-xs font-bold rounded-md flex items-center gap-1 transition-all ${
                                previewMode === 'login' ? 'bg-teal-700 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            <i className="bi bi-box-arrow-in-right"></i>
                            <span className="text-[11px] sm:text-xs">Login</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setPreviewMode('dashboard')}
                            className={`px-2 py-1 sm:px-2.5 text-xs font-bold rounded-md flex items-center gap-1 transition-all ${
                                previewMode === 'dashboard' ? 'bg-teal-700 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            <i className="bi bi-speedometer2"></i>
                            <span className="text-[11px] sm:text-xs">Dasbor</span>
                        </button>
                    </div>

                    {/* Santri Selector untuk simulasi */}
                    {previewMode === 'dashboard' && activeSantriList && activeSantriList.length > 0 && (
                        <div className="flex items-center gap-1 max-w-[150px] sm:max-w-xs">
                            <label className="text-[10px] sm:text-[11px] font-bold text-slate-500 shrink-0">Santri:</label>
                            <select
                                value={activeSantri?.id || ''}
                                onChange={(e) => setSelectedSantriId(Number(e.target.value))}
                                className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 truncate w-full"
                            >
                                {activeSantriList.slice(0, 30).map(s => (
                                    <option key={s.id} value={s.id}>{s.namaLengkap} ({s.nis || 'No NIS'})</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <a
                        href="/?portal=true&preview=true"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-lg border border-teal-300 bg-teal-50 px-2 py-1 text-xs font-bold text-teal-800 hover:bg-teal-100 transition-colors shrink-0"
                    >
                        <i className="bi bi-box-arrow-up-right"></i>
                        <span className="hidden sm:inline">Tab Baru</span>
                    </a>

                    {onClose && (
                        <button
                            type="button"
                            onClick={onClose}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shrink-0"
                        >
                            <i className="bi bi-x-lg"></i>
                            <span className="hidden sm:inline">Tutup</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Container Simulator dengan Frame Device Responsif */}
            <div className="flex justify-center items-start overflow-x-auto py-1 sm:py-2 w-full">
                <div
                    className={`transition-all duration-300 bg-white rounded-2xl sm:rounded-3xl shadow-2xl border-2 sm:border-4 border-slate-800 overflow-hidden flex flex-col w-full ${
                        deviceView === 'mobile'
                            ? 'max-w-[375px] min-h-[580px] max-h-[820px]'
                            : deviceView === 'tablet'
                            ? 'max-w-[720px] min-h-[620px] max-h-[860px]'
                            : 'max-w-full min-h-[640px]'
                    }`}
                >
                    {/* Device Status Bar Mockup */}
                    <div className="bg-slate-900 text-white px-5 py-1.5 flex justify-between items-center text-[11px] font-mono select-none">
                        <span>09:41</span>
                        <div className="w-16 h-3 bg-slate-800 rounded-full mx-auto"></div>
                        <div className="flex items-center gap-1.5">
                            <i className="bi bi-wifi"></i>
                            <i className="bi bi-battery-full"></i>
                        </div>
                    </div>

                    {/* Screen Content dengan Style Variables CSS persis file index.html */}
                    <div
                        className="flex-1 overflow-y-auto p-4 sm:p-6 transition-colors duration-200"
                        style={{
                            '--p-color': palette.primary,
                            '--p-dark': palette.primaryDark,
                            '--p-light': palette.primaryLight,
                            '--p-border': palette.border,
                            '--p-grad-from': palette.gradientFrom,
                            '--p-grad-to': palette.gradientTo,
                            background: 'linear-gradient(135deg, #f8fafc 0%, #ecfeff 50%, var(--p-light) 100%)',
                        } as React.CSSProperties}
                    >
                        {/* MODE 1: HALAMAN LOGIN PERSIS FILE STANDALONE HTML */}
                        {previewMode === 'login' ? (
                            <div className="mx-auto w-full max-w-[440px] bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-7 shadow-xl border" style={{ borderColor: 'var(--p-border)' }}>
                                {/* Logo & Header */}
                                <div className="text-center mb-4 sm:mb-5">
                                    <div
                                        className="w-14 h-14 sm:w-16 sm:h-16 rounded-full mx-auto mb-2.5 sm:mb-3 flex items-center justify-center font-extrabold text-xl sm:text-2xl text-white shadow-md overflow-hidden"
                                        style={{ backgroundColor: 'var(--p-color)' }}
                                    >
                                        {settings.logoPonpesUrl ? (
                                            <img
                                                src={settings.logoPonpesUrl}
                                                alt="Logo"
                                                className="w-full h-full object-contain bg-white p-1"
                                            />
                                        ) : (
                                            (settings.namaPonpes || 'E').charAt(0)
                                        )}
                                    </div>
                                    <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 leading-tight break-words">
                                        {settings.namaPonpes || 'Pondok Pesantren'}
                                    </h1>
                                    <div className="text-[#d97706] font-extrabold uppercase tracking-widest text-[10px] sm:text-[11px] mt-1">
                                        PORTAL RESMI WALI SANTRI
                                    </div>
                                    <p className="text-[11px] sm:text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                                        {portalConfig.welcomeMessage || 'Selamat Datang di Portal Wali Santri'}
                                    </p>
                                </div>

                                {/* Form Login */}
                                <div className="space-y-3 mb-4 sm:mb-5 text-left">
                                    <div>
                                        <label className="block text-[10px] sm:text-[11px] font-bold text-slate-700 uppercase tracking-wide mb-1">
                                            NIS / Nomor Induk Santri
                                        </label>
                                        <input
                                            type="text"
                                            readOnly
                                            placeholder="Contoh: 2024001"
                                            value={activeSantri?.nis || '2024001'}
                                            className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 sm:px-3.5 sm:py-2.5 text-xs font-mono text-slate-700 outline-none"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[10px] sm:text-[11px] font-bold text-slate-700 uppercase tracking-wide mb-1">
                                            Tanggal Lahir Santri
                                        </label>
                                        <input
                                            type="text"
                                            readOnly
                                            value={activeSantri?.tanggalLahir || '2012-05-15'}
                                            className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 sm:px-3.5 sm:py-2.5 text-xs text-slate-700 outline-none"
                                        />
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => setPreviewMode('dashboard')}
                                        className="w-full py-2.5 sm:py-3 rounded-xl text-xs font-bold text-white shadow-md flex items-center justify-center gap-2 transition-all hover:opacity-90"
                                        style={{ backgroundColor: 'var(--p-color)' }}
                                    >
                                        <i className="bi bi-shield-lock-fill"></i>
                                        Masuk Portal Wali (Simulasi)
                                    </button>
                                </div>

                                {/* Highlight Announcement */}
                                {portalConfig.announcement && (
                                    <div
                                        className="rounded-xl p-3 mb-3 sm:mb-4 text-left text-xs space-y-1 border"
                                        style={{ background: 'var(--p-light)', borderColor: 'var(--p-border)' }}
                                    >
                                        <div className="font-bold flex items-center gap-1.5" style={{ color: 'var(--p-dark)' }}>
                                            <i className="bi bi-megaphone-fill"></i> Pengumuman Penting
                                        </div>
                                        <p className="text-slate-700 text-[11px] leading-relaxed break-words">{portalConfig.announcement}</p>
                                    </div>
                                )}

                                {/* Multi-Post Official Announcements */}
                                {portalConfig.announcementPosts && portalConfig.announcementPosts.filter(p => p.isPublished).length > 0 && (
                                    <div className="space-y-2 mb-3 sm:mb-4 text-left">
                                        <div className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                                            <i className="bi bi-bell-fill text-amber-500"></i> Papan Informasi Pondok
                                        </div>
                                        {portalConfig.announcementPosts.filter(p => p.isPublished).slice(0, 2).map(post => (
                                            <div key={post.id} className="rounded-xl border border-slate-200 bg-slate-50/50 p-2.5 text-xs">
                                                <div className="flex justify-between items-center gap-2 mb-1">
                                                    <span className="font-bold text-slate-800 truncate">{post.title}</span>
                                                    <span className="text-[10px] text-slate-400 shrink-0">{post.publishedAt}</span>
                                                </div>
                                                <p className="text-slate-600 text-[11px] leading-relaxed line-clamp-2 break-words">{post.content}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Kontak WA & Rekening Bank */}
                                {portalConfig.contacts && portalConfig.contacts.length > 0 && (
                                    <div className="border-t border-slate-100 pt-3 text-center space-y-2">
                                        <div className="text-[11px] text-slate-500 font-medium">Butuh bantuan? Hubungi layanan resmi:</div>
                                        <div className="flex flex-wrap justify-center gap-1.5 sm:gap-2">
                                            {portalConfig.contacts.map(c => (
                                                <div
                                                    key={c.id}
                                                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] sm:text-[11px] font-semibold text-slate-700 max-w-full"
                                                >
                                                    <i className={`bi ${c.icon || 'bi-whatsapp'} text-emerald-600 shrink-0`}></i>
                                                    <span className="truncate">{c.label}: {c.value}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="mt-3 pt-2.5 border-t border-slate-100 text-center text-[10px] text-slate-400">
                                    Terhubung Aman (Encrypted Bridge) • eSantri Web
                                </div>
                            </div>
                        ) : (
                            /* MODE 2: SIMULASI DASBOR WALI SANTRI LENGKAP */
                            <div className="mx-auto w-full max-w-[880px] bg-white rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 md:p-6 shadow-xl border space-y-3.5 sm:space-y-4 text-left" style={{ borderColor: 'var(--p-border)' }}>
                                {/* Hero Banner Santri - Disusun Ke Bawah dengan Rapi */}
                                <div
                                    className="rounded-2xl p-3.5 sm:p-5 text-white shadow-sm space-y-2.5"
                                    style={{ background: 'linear-gradient(135deg, var(--p-grad-from), var(--p-grad-to))' }}
                                >
                                    {/* Baris Atas: Badge Status Santri (Kiri) + Logout (Kanan) */}
                                    <div className="flex items-center justify-between gap-2 border-b border-white/15 pb-2.5">
                                        <span className="text-[10px] font-bold uppercase tracking-wider bg-white/20 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1 shrink-0">
                                            <i className="bi bi-check-circle-fill"></i> Santri Aktif
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => setPreviewMode('login')}
                                            className="rounded-xl bg-white/15 hover:bg-white/25 px-2.5 py-1 text-xs font-bold text-white transition-colors flex items-center justify-center gap-1 shrink-0"
                                        >
                                            <i className="bi bi-box-arrow-left"></i> Logout
                                        </button>
                                    </div>

                                    {/* Susunan Ke Bawah: Avatar, Nama Lengkap, NIS, dan Kelas */}
                                    <div className="flex items-start gap-3 pt-0.5">
                                        <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-white text-slate-900 font-black text-base flex items-center justify-center shrink-0 shadow-md">
                                            {activeSantri?.namaLengkap ? activeSantri.namaLengkap.slice(0, 2).toUpperCase() : 'SN'}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <h2 className="text-base sm:text-lg font-extrabold tracking-tight leading-tight break-words">
                                                {activeSantri?.namaLengkap || 'Nama Santri'}
                                            </h2>
                                            <p className="text-[11px] sm:text-xs text-white/90 mt-0.5 break-words">
                                                NIS: <span className="font-mono font-bold">{activeSantri?.nis || '-'}</span> | Wali: <strong>{activeSantri?.namaWali || activeSantri?.namaAyah || '-'}</strong>
                                            </p>
                                        </div>
                                    </div>

                                    {/* Chips Data Santri disusun rapi */}
                                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                                        <span className="inline-flex items-center gap-1 rounded-lg bg-black/20 border border-white/10 px-2.5 py-0.5 text-[10px] sm:text-[11px] font-medium max-w-full">
                                            <i className="bi bi-mortarboard-fill text-amber-300 shrink-0"></i>
                                            <span className="truncate">{kelasObj?.nama || 'Kelas -'} ({rombelObj?.nama || 'Rombel -'})</span>
                                        </span>
                                        <span className="inline-flex items-center gap-1 rounded-lg bg-black/20 border border-white/10 px-2.5 py-0.5 text-[10px] sm:text-[11px] font-medium max-w-full">
                                            <i className="bi bi-house-heart-fill text-emerald-300 shrink-0"></i>
                                            <span className="truncate">{activeSantri?.kamarId ? `Kamar #${activeSantri.kamarId}` : 'Kamar Santri'}</span>
                                        </span>
                                        {waliKelasObj?.nama && (
                                            <span className="inline-flex items-center gap-1 rounded-lg bg-black/20 border border-white/10 px-2.5 py-0.5 text-[10px] sm:text-[11px] font-medium max-w-full">
                                                <i className="bi bi-person-badge-fill text-blue-200 shrink-0"></i>
                                                <span className="truncate">Wali: {waliKelasObj.nama}</span>
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* 4 KPI Summary Cards (Strict 2x2 di ponsel) */}
                                <div className={`grid ${deviceView === 'mobile' ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-4'} gap-2 sm:gap-2.5`}>
                                    <div className="rounded-xl border p-2.5 sm:p-3 bg-white shadow-2xs min-w-0 flex flex-col justify-between" style={{ borderColor: 'var(--p-border)' }}>
                                        <div>
                                            <div className="text-[10px] uppercase font-bold text-slate-500 truncate">Tagihan SPP</div>
                                            <div className={`text-xs sm:text-sm md:text-base font-extrabold mt-0.5 truncate ${totalTunggakan > 0 ? 'text-rose-600' : 'text-emerald-600'}`} title={totalTunggakan > 0 ? formatRp(totalUnpaidBillsAmount(unpaidBills)) : 'Lunas'}>
                                                {totalTunggakan > 0 ? formatRp(totalUnpaidBillsAmount(unpaidBills)) : 'Lunas'}
                                            </div>
                                        </div>
                                        <div className="text-[10px] text-slate-400 mt-1 truncate">{unpaidBills.length} Tagihan Aktif</div>
                                    </div>

                                    <div className="rounded-xl border p-2.5 sm:p-3 bg-white shadow-2xs min-w-0 flex flex-col justify-between" style={{ borderColor: 'var(--p-border)' }}>
                                        <div>
                                            <div className="text-[10px] uppercase font-bold text-slate-500 truncate">Tabungan Santri</div>
                                            <div className="text-xs sm:text-sm md:text-base font-extrabold text-slate-800 mt-0.5 truncate" title={formatRp(santriSaldo?.saldo || 0)}>
                                                {formatRp(santriSaldo?.saldo || 0)}
                                            </div>
                                        </div>
                                        <div className="text-[10px] text-slate-400 mt-1 truncate">Saldo Uang Saku</div>
                                    </div>

                                    <div className="rounded-xl border p-2.5 sm:p-3 bg-white shadow-2xs min-w-0 flex flex-col justify-between" style={{ borderColor: 'var(--p-border)' }}>
                                        <div>
                                            <div className="text-[10px] uppercase font-bold text-slate-500 truncate">Presensi Bulan Ini</div>
                                            <div className="text-xs sm:text-sm md:text-base font-extrabold text-emerald-700 mt-0.5 truncate">
                                                Hadir Baik
                                            </div>
                                        </div>
                                        <div className="text-[10px] text-slate-400 mt-1 truncate">Kehadiran Santri</div>
                                    </div>

                                    <div className="rounded-xl border p-2.5 sm:p-3 bg-white shadow-2xs min-w-0 flex flex-col justify-between" style={{ borderColor: 'var(--p-border)' }}>
                                        <div>
                                            <div className="text-[10px] uppercase font-bold text-slate-500 truncate">Tahfizh Qur&apos;an</div>
                                            <div className="text-xs sm:text-sm md:text-base font-extrabold mt-0.5 truncate" style={{ color: 'var(--p-color)' }}>
                                                {(activeSantri as any)?.totalHafalanJuz || (santriTahfizh && santriTahfizh[0]?.juz) ? `${(activeSantri as any)?.totalHafalanJuz || santriTahfizh[0]?.juz} Juz` : 'Dalam Pembinaan'}
                                            </div>
                                        </div>
                                        <div className="text-[10px] text-slate-400 mt-1 truncate">Target: {(activeSantri as any)?.targetHafalanJuz || 30} Juz</div>
                                    </div>
                                </div>

                                {/* Tab Navigation Buttons */}
                                <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto p-1 sm:p-1.5 bg-slate-50 rounded-2xl border border-slate-200 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                                    {[
                                        { id: 'keuangan' as const, label: 'Keuangan & SPP', icon: 'bi-wallet2', show: portalConfig.showFinance !== false },
                                        { id: 'akademik' as const, label: 'Rapor & Kelas', icon: 'bi-mortarboard', show: portalConfig.showAcademic !== false },
                                        { id: 'presensi' as const, label: 'Presensi', icon: 'bi-calendar-check', show: portalConfig.showAttendance !== false },
                                        { id: 'tahfizh' as const, label: 'Tahfizh', icon: 'bi-journal-bookmark', show: portalConfig.showTahfizh !== false },
                                        { id: 'kesehatan' as const, label: 'Poskestren', icon: 'bi-heart-pulse', show: portalConfig.showHealth !== false },
                                        { id: 'perpus' as const, label: 'Perpustakaan', icon: 'bi-book', show: portalConfig.showLibrary !== false },
                                    ].filter(t => t.show).map(t => {
                                        const isTabActive = activeTab === t.id;
                                        return (
                                            <button
                                                key={t.id}
                                                type="button"
                                                onClick={() => setActiveTab(t.id)}
                                                className={`px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl text-[11px] sm:text-xs font-bold shrink-0 whitespace-nowrap transition-all flex items-center gap-1.5 ${
                                                    isTabActive ? 'text-white shadow-xs' : 'text-slate-600 hover:bg-slate-200/60'
                                                }`}
                                                style={isTabActive ? { backgroundColor: 'var(--p-color)' } : {}}
                                            >
                                                <i className={`bi ${t.icon}`}></i>
                                                <span>{t.label}</span>
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Tab Content - Gaya Konsisten Seluruh Menu */}
                                <div className="space-y-3.5 sm:space-y-4 pt-1">
                                    {/* 1. KEUANGAN */}
                                    {activeTab === 'keuangan' && (
                                        <div className="rounded-xl border border-slate-200 p-3.5 sm:p-4 bg-white space-y-3.5 shadow-2xs">
                                            {/* Header Konsisten: Pill di bawah deskripsi pada HP */}
                                            <div className={`flex ${deviceView === 'mobile' ? 'flex-col items-start gap-1.5' : 'flex-col sm:flex-row sm:items-center justify-between gap-2'} border-b border-slate-100 pb-2.5`}>
                                                <div>
                                                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                                                        <i className="bi bi-wallet2 text-teal-600"></i> Rincian Tagihan &amp; Keuangan
                                                    </h4>
                                                    <p className="text-[10px] sm:text-[11px] text-slate-500 mt-0.5">Daftar kewajiban pembayaran dan tabungan santri</p>
                                                </div>
                                                <span className={`inline-flex items-center self-start sm:self-auto text-xs font-bold px-2.5 py-1 rounded-full shrink-0 shadow-2xs mt-0.5 sm:mt-0 ${unpaidBills.length > 0 ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'}`}>
                                                    <i className={`bi mr-1 ${unpaidBills.length > 0 ? 'bi-exclamation-circle-fill' : 'bi-check-circle-fill'}`}></i>
                                                    {unpaidBills.length > 0 ? `${unpaidBills.length} Tagihan Aktif` : 'Semua Lunas'}
                                                </span>
                                            </div>

                                            {unpaidBills.length > 0 ? (
                                                <div className="space-y-2">
                                                    {unpaidBills.slice(0, 4).map(b => (
                                                        <div key={b.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                                                            <div className="min-w-0 flex-1">
                                                                <p className="font-bold text-slate-800 break-words">{b.deskripsi || `Tagihan Bulan ${b.bulan}/${b.tahun}`}</p>
                                                                <p className="text-[10px] text-slate-500">Periode: {b.bulan}/{b.tahun}</p>
                                                            </div>
                                                            <span className="font-mono font-bold text-rose-700 shrink-0 self-end sm:self-auto text-xs sm:text-sm">
                                                                {formatRp(b.nominal - (b.sudahDicicil || 0))}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 text-xs text-emerald-800 font-semibold flex items-center gap-2">
                                                    <i className="bi bi-check-circle-fill text-emerald-600"></i>
                                                    Alhamdulillah, seluruh tagihan santri telah lunas.
                                                </div>
                                            )}

                                            {/* Mutasi Tabungan */}
                                            {santriMutasi && santriMutasi.length > 0 && (
                                                <div className="pt-2 border-t border-slate-100 space-y-2">
                                                    <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-slate-600">
                                                        Mutasi Tabungan Terakhir
                                                    </h4>
                                                    <div className="space-y-1.5">
                                                        {santriMutasi.slice(0, 3).map(m => (
                                                            <div key={m.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 p-2 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                                                                <div className="min-w-0 flex-1">
                                                                    <span className="font-semibold text-slate-800 break-words block sm:inline">{m.keterangan || m.jenis}</span>
                                                                    <span className="text-[10px] text-slate-400 block sm:inline sm:ml-2">{m.tanggal}</span>
                                                                </div>
                                                                <span className={`font-mono font-bold shrink-0 self-end sm:self-auto ${m.jenis === 'Deposit' ? 'text-emerald-600' : 'text-amber-600'}`}>
                                                                    {m.jenis === 'Deposit' ? '+' : '-'}{formatRp(m.jumlah)}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* 2. RAPOR & AKADEMIK */}
                                    {activeTab === 'akademik' && (
                                        <div className="space-y-3">
                                            <div
                                                className="rounded-xl p-3.5 sm:p-4 border space-y-3 shadow-2xs"
                                                style={{ background: 'var(--p-light)', borderColor: 'var(--p-border)' }}
                                            >
                                                {/* Header Rapor: Pill Rata-rata DI BAWAH tulisan pada tampilan HP */}
                                                <div className={`flex ${deviceView === 'mobile' ? 'flex-col items-start gap-1.5' : 'flex-col sm:flex-row sm:items-center justify-between gap-2'} border-b pb-2.5`} style={{ borderColor: 'var(--p-border)' }}>
                                                    <div>
                                                        <h4 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5" style={{ color: 'var(--p-dark)' }}>
                                                            <i className="bi bi-mortarboard text-teal-700"></i> Ringkasan Rapor Semester Terakhir
                                                        </h4>
                                                        <p className="text-[10px] sm:text-[11px] text-slate-500 mt-0.5">Evaluasi capaian belajar &amp; nilai santri</p>
                                                    </div>
                                                    <span className="inline-flex items-center self-start sm:self-auto text-xs font-bold px-2.5 py-1 rounded-full text-white shrink-0 shadow-2xs mt-0.5 sm:mt-0" style={{ backgroundColor: 'var(--p-color)' }}>
                                                        Rata-rata: {(() => {
                                                            if (santriRapor?.nilai && santriRapor.nilai.length > 0) {
                                                                return (santriRapor.nilai.reduce((a, b) => a + (b.nilaiAngka || 0), 0) / santriRapor.nilai.length).toFixed(1);
                                                            }
                                                            if (santriRapor?.customData) {
                                                                try {
                                                                    const parsed = JSON.parse(santriRapor.customData);
                                                                    const scores: number[] = [];
                                                                    Object.entries(parsed).forEach(([k, raw]) => {
                                                                        if (!k || k.startsWith('_')) return;
                                                                        if (!isSubjectGradeKey(k, undefined, k, undefined, settings.mataPelajaran || [], kelasObj?.jenjangId)) return;
                                                                        const sv = String(raw ?? '').trim();
                                                                        if (!sv || sv === '-') return;
                                                                        const num = Number(sv.replace(',', '.'));
                                                                        if (!isNaN(num) && isFinite(num) && num >= 0 && num <= 100) scores.push(num);
                                                                    });
                                                                    if (scores.length > 0) {
                                                                        return (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1);
                                                                    }
                                                                } catch {}
                                                            }
                                                            return (santriRapor as any)?.rataRata || '-';
                                                        })()}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-slate-600">
                                                    Wali Kelas: <span className="font-bold text-slate-800">{waliKelasObj?.nama || 'Ustadz Pembina'}</span>
                                                </p>
                                                {(() => {
                                                    let resolvedCatatan = santriRapor?.catatanWaliKelas || '';
                                                    if (!resolvedCatatan && santriRapor?.customData) {
                                                        try {
                                                            const parsed = JSON.parse(santriRapor.customData);
                                                            resolvedCatatan = String(
                                                                parsed.CATATAN_WALI_KELAS || parsed.CATATAN_WALI || parsed.catatan_wali || parsed.CATATAN || ''
                                                            ).trim();
                                                        } catch {}
                                                    }
                                                    return resolvedCatatan && resolvedCatatan !== '-' ? (
                                                        <div className="p-2.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-700 italic break-words">
                                                            &ldquo;{resolvedCatatan}&rdquo;
                                                        </div>
                                                    ) : null;
                                                })()}
                                            </div>

                                            <div className="rounded-xl border border-slate-200 p-3.5 sm:p-4 bg-white shadow-2xs">
                                                <div className={`flex ${deviceView === 'mobile' ? 'flex-col items-start gap-1' : 'flex-col sm:flex-row sm:items-center justify-between gap-2'} mb-2.5`}>
                                                    <div>
                                                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                                                            <i className="bi bi-house-door text-teal-600"></i> Informasi Asrama &amp; Kamar
                                                        </h4>
                                                        <p className="text-[10px] sm:text-[11px] text-slate-500 mt-0.5">Penempatan gedung kamar dan status santri</p>
                                                    </div>
                                                    <span className="inline-flex items-center self-start sm:self-auto text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 shrink-0">
                                                        Aktif Mukim
                                                    </span>
                                                </div>
                                                <div className="grid grid-cols-2 gap-2 text-xs">
                                                    <div className="p-2 rounded-lg bg-slate-50 min-w-0 border border-slate-200">
                                                        <span className="text-[10px] text-slate-400 block truncate">Kamar Asrama</span>
                                                        <span className="font-bold text-slate-800 truncate block">{activeSantri?.kamarId ? `Kamar #${activeSantri.kamarId}` : 'Kamar Putra'}</span>
                                                    </div>
                                                    <div className="p-2 rounded-lg bg-slate-50 min-w-0 border border-slate-200">
                                                        <span className="text-[10px] text-slate-400 block truncate">Status Santri</span>
                                                        <span className="font-bold text-emerald-700 truncate block">Aktif Mukim</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* 3. PRESENSI (Strict 2x2 di HP) */}
                                    {activeTab === 'presensi' && (
                                        <div className="rounded-xl border border-slate-200 p-3.5 sm:p-4 bg-white space-y-3.5 shadow-2xs">
                                            {/* Header Konsisten: Pill di bawah deskripsi pada HP */}
                                            <div className={`flex ${deviceView === 'mobile' ? 'flex-col items-start gap-1.5' : 'flex-col sm:flex-row sm:items-center justify-between gap-2'} border-b border-slate-100 pb-2.5`}>
                                                <div>
                                                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                                                        <i className="bi bi-calendar-check text-teal-600"></i> Rekap Kehadiran Santri
                                                    </h4>
                                                    <p className="text-[10px] sm:text-[11px] text-slate-500 mt-0.5">Status kehadiran bulan berjalan</p>
                                                </div>
                                                <span className="inline-flex items-center self-start sm:self-auto text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 shrink-0 shadow-2xs mt-0.5 sm:mt-0">
                                                    <i className="bi bi-check-circle-fill mr-1"></i> Kehadiran Baik
                                                </span>
                                            </div>

                                            {/* 4 Kartu Absen: 2x2 strictly di HP */}
                                            <div className={`grid ${deviceView === 'mobile' ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-4'} gap-2`}>
                                                <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-center min-w-0">
                                                    <div className="text-[10px] font-bold text-emerald-800 uppercase truncate">Hadir</div>
                                                    <div className="text-base sm:text-lg font-black text-emerald-900 mt-0.5 truncate">24 Hari</div>
                                                </div>
                                                <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200 text-center min-w-0">
                                                    <div className="text-[10px] font-bold text-blue-800 uppercase truncate">Sakit</div>
                                                    <div className="text-base sm:text-lg font-black text-blue-900 mt-0.5 truncate">1 Hari</div>
                                                </div>
                                                <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-center min-w-0">
                                                    <div className="text-[10px] font-bold text-amber-800 uppercase truncate">Izin</div>
                                                    <div className="text-base sm:text-lg font-black text-amber-900 mt-0.5 truncate">0 Hari</div>
                                                </div>
                                                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-center min-w-0">
                                                    <div className="text-[10px] font-bold text-rose-800 uppercase truncate">Alpha</div>
                                                    <div className="text-base sm:text-lg font-black text-rose-900 mt-0.5 truncate">0 Hari</div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* 4. TAHFIZH */}
                                    {activeTab === 'tahfizh' && (
                                        <div className="rounded-xl border border-slate-200 p-3.5 sm:p-4 bg-white space-y-3.5 shadow-2xs">
                                            {/* Header Konsisten: Pill di bawah deskripsi pada HP */}
                                            <div className={`flex ${deviceView === 'mobile' ? 'flex-col items-start gap-1.5' : 'flex-col sm:flex-row sm:items-center justify-between gap-2'} border-b border-slate-100 pb-2.5`}>
                                                <div>
                                                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                                                        <i className="bi bi-journal-bookmark text-teal-600"></i> Setoran Tahfizh Al-Qur&apos;an
                                                    </h4>
                                                    <p className="text-[10px] sm:text-[11px] text-slate-500 mt-0.5">Riwayat setoran hafalan ziyadah &amp; muroja&apos;ah</p>
                                                </div>
                                                <span className="inline-flex items-center self-start sm:self-auto text-xs font-bold px-2.5 py-1 rounded-full bg-teal-100 text-teal-800 shrink-0 shadow-2xs mt-0.5 sm:mt-0">
                                                    Capaian: {(activeSantri as any)?.totalHafalanJuz || (santriTahfizh && santriTahfizh[0]?.juz) || 0} / {(activeSantri as any)?.targetHafalanJuz || 30} Juz
                                                </span>
                                            </div>

                                            {santriTahfizh && santriTahfizh.length > 0 ? (
                                                <div className="space-y-2">
                                                    {santriTahfizh.map(t => (
                                                        <div key={t.id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-2">
                                                            <div className="min-w-0 flex-1">
                                                                <span className="font-bold text-slate-800 break-words">{t.surah || 'Surah'} {t.ayatAwal && t.ayatAkhir ? `(Ayat ${t.ayatAwal}-${t.ayatAkhir})` : ''}</span>
                                                                <span className="text-[10px] text-slate-400 block">{t.tanggal} • {t.tipe || 'Ziyadah'}</span>
                                                            </div>
                                                            <span className="font-bold text-xs px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 shrink-0 self-start sm:self-auto">
                                                                {t.predikat || 'Mumtaz'}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs text-slate-500 italic text-center">
                                                    Belum ada riwayat setoran tahfizh baru.
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* 5. POSKESTREN / KESEHATAN */}
                                    {activeTab === 'kesehatan' && (
                                        <div className="rounded-xl border border-slate-200 p-3.5 sm:p-4 bg-white space-y-3.5 shadow-2xs">
                                            {/* Header Konsisten: Pill di bawah deskripsi pada HP */}
                                            <div className={`flex ${deviceView === 'mobile' ? 'flex-col items-start gap-1.5' : 'flex-col sm:flex-row sm:items-center justify-between gap-2'} border-b border-slate-100 pb-2.5`}>
                                                <div>
                                                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                                                        <i className="bi bi-heart-pulse text-rose-600"></i> Rekam Kesehatan Poskestren
                                                    </h4>
                                                    <p className="text-[10px] sm:text-[11px] text-slate-500 mt-0.5">Pemeriksaan dan riwayat tindakan medis pondok</p>
                                                </div>
                                                <span className="inline-flex items-center self-start sm:self-auto text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 shrink-0 shadow-2xs mt-0.5 sm:mt-0">
                                                    <i className="bi bi-shield-check mr-1"></i> Kondisi Sehat
                                                </span>
                                            </div>

                                            {santriHealth && santriHealth.length > 0 ? (
                                                <div className="space-y-2">
                                                    {santriHealth.map(h => (
                                                        <div key={h.id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs flex flex-col sm:flex-row sm:items-start justify-between gap-1.5 sm:gap-2">
                                                            <div className="min-w-0 flex-1">
                                                                <span className="font-bold text-slate-800 break-words block">{h.keluhan || h.diagnosa || 'Pemeriksaan Rutin'}</span>
                                                                <span className="text-[11px] text-slate-600 break-words mt-0.5 block">Tindakan: {h.tindakan || 'Istirahat & obat rutin'}</span>
                                                                <span className="text-[10px] text-slate-400 mt-1 block">{h.tanggal}</span>
                                                            </div>
                                                            <span className="rounded-full bg-rose-100 text-rose-800 px-2.5 py-0.5 text-[10px] font-bold shrink-0 self-start sm:self-auto">
                                                                {h.status || 'Rawat Jalan'}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 text-xs text-emerald-800 font-semibold flex items-center gap-2">
                                                    <i className="bi bi-shield-check text-emerald-600"></i>
                                                    Alhamdulillah, santri dalam kondisi sehat wal afiat.
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* 6. PERPUSTAKAAN */}
                                    {activeTab === 'perpus' && (
                                        <div className="rounded-xl border border-slate-200 p-3.5 sm:p-4 bg-white space-y-3.5 shadow-2xs">
                                            {/* Header Konsisten: Pill di bawah deskripsi pada HP */}
                                            <div className={`flex ${deviceView === 'mobile' ? 'flex-col items-start gap-1.5' : 'flex-col sm:flex-row sm:items-center justify-between gap-2'} border-b border-slate-100 pb-2.5`}>
                                                <div>
                                                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                                                        <i className="bi bi-book text-teal-600"></i> Sirkulasi Pinjaman Perpustakaan
                                                    </h4>
                                                    <p className="text-[10px] sm:text-[11px] text-slate-500 mt-0.5">Daftar buku &amp; kitab perpustakaan yang dipinjam</p>
                                                </div>
                                                <span className="inline-flex items-center self-start sm:self-auto text-xs font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 shrink-0 shadow-2xs mt-0.5 sm:mt-0">
                                                    0 Buku Aktif
                                                </span>
                                            </div>

                                            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs text-slate-500 italic text-center">
                                                Tidak ada buku atau kitab yang sedang dipinjam saat ini.
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

function totalUnpaidBillsAmount(bills: any[]): number {
    return bills.reduce((acc, b) => acc + ((b.nominal || 0) - (b.sudahDicicil || 0)), 0);
}
