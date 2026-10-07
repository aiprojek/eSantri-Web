import React, { useState, useEffect } from 'react';
import { PondokSettings, PortalAnnouncementPost, PsbConfig } from '../../types';
import { LoadingFallback } from '../common/LoadingFallback';
import {
    decodePortalKey,
    fetchPortalPublicInfoFromGas,
    loginPortalSantriViaGas,
    PortalSantriSummary,
    submitPortalPsbToGas
} from '../../services/portalGasService';
import { fetchPublicPortalSettings } from '../../services/firebasePortalRuntime';
import { PSB_STANDARD_FIELD_GROUPS } from '../psb/utils/psbUtils';
import { MarkdownEditor } from '../common/MarkdownEditor';

const fieldGroups = PSB_STANDARD_FIELD_GROUPS;

const PORTAL_THEMES: Record<string, {
    bgGradient: string;
    bannerGradient: string;
    btnPrimary: string;
    textPrimary: string;
    textDark: string;
    bgLight: string;
    borderLight: string;
    ringFocus: string;
}> = {
    teal: {
        bgGradient: 'from-slate-50 via-cyan-50 to-teal-100',
        bannerGradient: 'from-teal-700 to-cyan-700',
        btnPrimary: 'bg-teal-600 hover:bg-teal-700 text-white',
        textPrimary: 'text-teal-700',
        textDark: 'text-teal-900',
        bgLight: 'bg-teal-50',
        borderLight: 'border-teal-200',
        ringFocus: 'focus:ring-teal-500'
    },
    blue: {
        bgGradient: 'from-slate-50 via-blue-50 to-indigo-100',
        bannerGradient: 'from-blue-700 to-indigo-700',
        btnPrimary: 'bg-blue-600 hover:bg-blue-700 text-white',
        textPrimary: 'text-blue-700',
        textDark: 'text-blue-900',
        bgLight: 'bg-blue-50',
        borderLight: 'border-blue-200',
        ringFocus: 'focus:ring-blue-500'
    },
    indigo: {
        bgGradient: 'from-slate-50 via-indigo-50 to-violet-100',
        bannerGradient: 'from-indigo-700 to-violet-700',
        btnPrimary: 'bg-indigo-600 hover:bg-indigo-700 text-white',
        textPrimary: 'text-indigo-700',
        textDark: 'text-indigo-900',
        bgLight: 'bg-indigo-50',
        borderLight: 'border-indigo-200',
        ringFocus: 'focus:ring-indigo-500'
    },
    slate: {
        bgGradient: 'from-slate-100 via-gray-100 to-slate-200',
        bannerGradient: 'from-slate-800 to-slate-700',
        btnPrimary: 'bg-slate-700 hover:bg-slate-800 text-white',
        textPrimary: 'text-slate-700',
        textDark: 'text-slate-900',
        bgLight: 'bg-slate-100',
        borderLight: 'border-slate-300',
        ringFocus: 'focus:ring-slate-500'
    },
    rose: {
        bgGradient: 'from-slate-50 via-rose-50 to-pink-100',
        bannerGradient: 'from-rose-700 to-pink-700',
        btnPrimary: 'bg-rose-600 hover:bg-rose-700 text-white',
        textPrimary: 'text-rose-700',
        textDark: 'text-rose-900',
        bgLight: 'bg-rose-50',
        borderLight: 'border-rose-200',
        ringFocus: 'focus:ring-rose-500'
    },
    emerald: {
        bgGradient: 'from-slate-50 via-emerald-50 to-green-100',
        bannerGradient: 'from-emerald-700 to-green-700',
        btnPrimary: 'bg-emerald-600 hover:bg-emerald-700 text-white',
        textPrimary: 'text-emerald-700',
        textDark: 'text-emerald-900',
        bgLight: 'bg-emerald-50',
        borderLight: 'border-emerald-200',
        ringFocus: 'focus:ring-emerald-500'
    },
    cyan: {
        bgGradient: 'from-slate-50 via-cyan-50 to-sky-100',
        bannerGradient: 'from-cyan-700 to-sky-700',
        btnPrimary: 'bg-cyan-600 hover:bg-cyan-700 text-white',
        textPrimary: 'text-cyan-700',
        textDark: 'text-cyan-900',
        bgLight: 'bg-cyan-50',
        borderLight: 'border-cyan-200',
        ringFocus: 'focus:ring-cyan-500'
    }
};

const resolvePortalConnectionFromUrl = (fallbackTenantId: string) => {
    const url = new URL(window.location.href);
    const cipherKey = url.searchParams.get('k') || '';
    if (cipherKey) {
        const decoded = decodePortalKey(cipherKey);
        if (decoded && decoded.gasEndpoint) {
            return {
                portalId: decoded.portalId || fallbackTenantId,
                gasEndpoint: decoded.gasEndpoint,
                gasApiKey: decoded.gasApiKey || '',
                isEncrypted: true
            };
        }
    }
    const gasEndpoint = url.searchParams.get('gas') || localStorage.getItem('esantri_portal_gas_url') || '';
    const gasApiKey = url.searchParams.get('token') || localStorage.getItem('esantri_portal_gas_token') || '';
    return {
        portalId: fallbackTenantId,
        gasEndpoint,
        gasApiKey,
        isEncrypted: false
    };
};

export const PublicPortal: React.FC = () => {
    const [pathParts] = useState<string[]>(window.location.pathname.split('/').filter(p => p !== ''));
    const portalType = pathParts[0];
    const tenantId = pathParts[1] || 'default-portal';
    const templateId = pathParts[2];
    const [resolvedConn, setResolvedConn] = useState<{ portalId: string; gasEndpoint: string; gasApiKey: string; isEncrypted: boolean }>({
        portalId: tenantId,
        gasEndpoint: '',
        gasApiKey: '',
        isEncrypted: false
    });

    const [tenantSettings, setTenantSettings] = useState<PondokSettings | null>(null);
    const [legacySantriList, setLegacySantriList] = useState<PortalSantriSummary[]>([]);
    const [syncedAt, setSyncedAt] = useState<string | undefined>(undefined);
    const [isLegacyGasWarning, setIsLegacyGasWarning] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [nisInput, setNisInput] = useState('');
    const [dobInput, setDobInput] = useState('');
    const [isLoggingIn, setIsLoggingIn] = useState(false);
    const [loginNotice, setLoginNotice] = useState<string>('');
    const [loggedInSantri, setLoggedInSantri] = useState<PortalSantriSummary | null>(null);
    const [activeFeature, setActiveFeature] = useState<'keuangan' | 'akademik' | 'presensi' | 'tahfizh' | 'kesehatan' | 'perpus'>('keuangan');

    useEffect(() => {
        const fetchTenantData = async () => {
            try {
                let conn = resolvePortalConnectionFromUrl(tenantId);

                if (!conn.gasEndpoint && tenantId && tenantId !== 'default-portal') {
                    try {
                        const cloudPublic = await fetchPublicPortalSettings(tenantId);
                        const encKey = (cloudPublic?.portalConfig as any)?.encryptedKey;
                        if (encKey) {
                            const decoded = decodePortalKey(encKey);
                            if (decoded && decoded.gasEndpoint) {
                                conn = {
                                    portalId: decoded.portalId || tenantId,
                                    gasEndpoint: decoded.gasEndpoint,
                                    gasApiKey: decoded.gasApiKey || '',
                                    isEncrypted: true
                                };
                            }
                        }
                    } catch {
                        // Ignore Firebase fallback error if offline or unconfigured
                    }
                }

                setResolvedConn(conn);

                if (!conn.gasEndpoint) {
                    throw new Error('Koneksi Portal belum terkonfigurasi. Pastikan menggunakan tautan Portal Wali resmi dari pihak pondok.');
                }

                const publicBundle = await fetchPortalPublicInfoFromGas(conn.gasEndpoint, conn.portalId, conn.gasApiKey);
                if (publicBundle.settings) {
                    setTenantSettings(publicBundle.settings);
                    setSyncedAt(publicBundle.syncedAt);
                    setIsLegacyGasWarning(Boolean(publicBundle.isLegacyGas));
                    setLegacySantriList(publicBundle.legacySantriSummary || []);
                } else {
                    setError('Data profil pesantren belum ditemukan di server Portal.');
                }
            } catch (err) {
                console.error('Portal error:', err);
                setError((err as Error)?.message || 'Gagal memuat halaman portal. Pastikan koneksi internet stabil.');
            } finally {
                setLoading(false);
            }
        };
        fetchTenantData();
    }, [tenantId]);

    if (loading) return <LoadingFallback />;
    if (error) {
        return (
            <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6 text-center">
                <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full border border-slate-200">
                    <div className="text-red-500 text-5xl mb-4"><i className="bi bi-exclamation-triangle-fill"></i></div>
                    <h1 className="text-xl font-bold text-slate-800 mb-2">Tidak Dapat Memuat Portal</h1>
                    <p className="text-sm text-slate-600 mb-6">{error}</p>
                    <div className="mb-6 rounded-xl border border-slate-200 bg-slate-50 p-3 text-left">
                        <p className="text-[11px] font-bold text-slate-700 mb-1 uppercase tracking-wide">Diagnostik Koneksi</p>
                        <p className="text-xs text-slate-600"><span className="font-semibold">ID Portal:</span> {resolvedConn.portalId || '-'}</p>
                        <p className="text-xs text-slate-600 mt-0.5"><span className="font-semibold">Status Kunci:</span> {resolvedConn.isEncrypted ? 'Terenkripsi (ep2)' : (resolvedConn.gasEndpoint ? 'Parameter Standar' : 'Tidak Ditemukan')}</p>
                        <p className="text-[11px] text-slate-500 mt-2">
                            Pastikan Admin Pondok telah menekan tombol <strong>Sinkronkan Sekarang</strong> pada menu Portal Wali Santri.
                        </p>
                    </div>
                    <a href="/" className="inline-block bg-teal-600 text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-teal-700 transition-colors">Kembali ke Beranda</a>
                </div>
            </div>
        );
    }

    if (!tenantSettings) return null;
    const portalConfig = tenantSettings.portalConfig;
    const themeKey = portalConfig?.theme || 'teal';
    const theme = PORTAL_THEMES[themeKey] || PORTAL_THEMES.teal;
    const portalContacts = portalConfig?.contacts || [];

    const normalizeExternalUrl = (rawValue: string, iconHint?: string): string => {
        const v = (rawValue || '').trim();
        if (!v) return '#';
        const lower = v.toLowerCase();

        if (lower.startsWith('http://') || lower.startsWith('https://')) return v;
        if (lower.startsWith('mailto:') || lower.startsWith('tel:')) return v;

        if (lower.startsWith('wa.me/') || lower.startsWith('api.whatsapp.com/') || lower.startsWith('t.me/') || lower.startsWith('telegram.me/')) {
            return `https://${v}`;
        }

        if (v.includes('@') && !v.includes(' ')) {
            return `mailto:${v}`;
        }

        const digits = v.replace(/\D/g, '');
        if (iconHint === 'bi-whatsapp' && digits.length >= 8) {
            let phone = digits;
            if (phone.startsWith('0')) phone = `62${phone.slice(1)}`;
            return `https://wa.me/${phone}`;
        }
        if (iconHint === 'bi-telephone' && digits.length >= 8) {
            return `tel:${digits}`;
        }

        return `https://${v}`;
    };

    const announcementPosts: PortalAnnouncementPost[] = (() => {
        const posts = (portalConfig?.announcementPosts || []).filter(post => post && post.isPublished && (post.title || post.content));
        if (posts.length > 0) return posts;
        if (portalConfig?.announcement?.trim()) {
            return [{
                id: 'legacy-announcement',
                title: 'Pengumuman Pondok',
                content: portalConfig.announcement.trim(),
                publishedAt: new Date().toISOString(),
                isPublished: true
            }];
        }
        return [];
    })();

    const jenjangMap = new Map((tenantSettings.jenjang || []).map((j) => [j.id, j.nama]));
    const kelasMap = new Map((tenantSettings.kelas || []).map((k) => [k.id, k.nama]));
    const rombelMap = new Map((tenantSettings.rombel || []).map((r) => [r.id, r.nama]));

    const featureItems = (portalConfig?.showFinance !== false ? [{ key: 'keuangan', label: 'Keuangan', icon: 'bi-cash-stack' }] : [])
        .concat(portalConfig?.showAcademic !== false ? [{ key: 'akademik', label: 'Akademik & Kamar', icon: 'bi-mortarboard' }] : [])
        .concat(portalConfig?.showAttendance !== false ? [{ key: 'presensi', label: 'Presensi', icon: 'bi-calendar-check' }] : [])
        .concat(portalConfig?.showTahfizh !== false ? [{ key: 'tahfizh', label: 'Tahfizh', icon: 'bi-book' }] : [])
        .concat(portalConfig?.showHealth !== false ? [{ key: 'kesehatan', label: 'Kesehatan', icon: 'bi-heart-pulse' }] : [])
        .concat(portalConfig?.showLibrary !== false ? [{ key: 'perpus', label: 'Perpustakaan', icon: 'bi-journal-bookmark' }] : []);

    if (portalType === 'psb') {
        return <PsbPublicForm settings={tenantSettings} templateId={templateId} tenantId={resolvedConn.portalId} conn={resolvedConn} />;
    }

    const handlePortalLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        const normalizedNis = nisInput.replace(/\s+/g, '').trim();
        if (!normalizedNis || !dobInput.trim()) {
            setLoginNotice('Silakan isi NIS dan tanggal lahir santri terlebih dahulu.');
            return;
        }

        setIsLoggingIn(true);
        setLoginNotice('');
        try {
            const matched = await loginPortalSantriViaGas(
                resolvedConn.gasEndpoint,
                resolvedConn.portalId,
                normalizedNis,
                dobInput.trim(),
                resolvedConn.gasApiKey,
                legacySantriList
            );
            if (!matched) {
                setLoggedInSantri(null);
                setLoginNotice('NIS atau tanggal lahir tidak sesuai. Silakan periksa kembali.');
                return;
            }
            setLoggedInSantri(matched);
            if (featureItems.length > 0) {
                setActiveFeature(featureItems[0].key as any);
            }
        } catch (err) {
            setLoggedInSantri(null);
            setLoginNotice((err as Error)?.message || 'NIS atau tanggal lahir tidak sesuai. Silakan periksa kembali.');
        } finally {
            setIsLoggingIn(false);
        }
    };

    const formatRupiah = (n?: number) => `Rp ${Number(n || 0).toLocaleString('id-ID')}`;
    const formatDateId = (iso?: string) => {
        if (!iso) return '-';
        try {
            const d = new Date(iso);
            if (isNaN(d.getTime())) return iso;
            return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
        } catch {
            return iso;
        }
    };

    const waContact = portalContacts.find(c => c.icon === 'bi-whatsapp');

    return (
        <div className={`min-h-screen bg-gradient-to-br ${theme.bgGradient} flex items-center justify-center p-3 sm:p-6`}>
            <div className={`bg-white rounded-3xl shadow-2xl text-center w-full border ${theme.borderLight} ${loggedInSantri ? 'max-w-5xl p-4 sm:p-7' : 'max-w-lg p-6 sm:p-8'}`}>
                {!loggedInSantri && (
                    <div className="flex flex-col items-center mb-5">
                        {tenantSettings.logoPonpesUrl ? (
                            <img src={tenantSettings.logoPonpesUrl} alt="Logo" className="w-18 h-18 rounded-2xl mb-3 shadow-md border border-slate-100 object-contain bg-white p-1.5" referrerPolicy="no-referrer" />
                        ) : (
                            <div className={`w-16 h-16 rounded-2xl ${theme.btnPrimary} flex items-center justify-center text-white text-2xl font-bold mb-3 shadow-md`}>
                                {(tenantSettings.namaPonpes || 'E').charAt(0)}
                            </div>
                        )}
                        <h1 className={`text-xl sm:text-2xl font-extrabold ${theme.textDark} mb-1`}>{tenantSettings.namaPonpes}</h1>
                        <div className="text-amber-600 font-extrabold uppercase tracking-widest text-[11px] mb-2 flex items-center gap-1.5">
                            <i className="bi bi-shield-lock-fill"></i> Portal Resmi Wali Santri
                        </div>
                        <p className="text-xs text-slate-500 max-w-sm">{portalConfig?.welcomeMessage || 'Selamat Datang di Portal Informasi Akademik, Asrama & Keuangan Santri'}</p>
                        {syncedAt && (
                            <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-[10px] font-semibold text-slate-600">
                                <i className="bi bi-cloud-check-fill text-emerald-600"></i> Sinkron Terakhir: {formatDateId(syncedAt)}
                            </span>
                        )}
                    </div>
                )}

                {!loggedInSantri ? (
                    <>
                        <form onSubmit={handlePortalLogin} className="text-left mb-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Nomor Induk Santri (NIS)</label>
                                <input
                                    type="text"
                                    value={nisInput}
                                    onChange={(e) => setNisInput(e.target.value)}
                                    placeholder="Masukkan NIS Santri (contoh: 2024001)"
                                    required
                                    className={`w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 ${theme.ringFocus}`}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Tanggal Lahir Santri</label>
                                <input
                                    type="date"
                                    value={dobInput}
                                    onChange={(e) => setDobInput(e.target.value)}
                                    required
                                    className={`w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 ${theme.ringFocus}`}
                                />
                                <p className="mt-1 text-[11px] text-slate-500">
                                    Verifikasi keamanan satu pintu: data hanya dibuka untuk santri yang terautentikasi.
                                </p>
                            </div>
                            <button
                                type="submit"
                                disabled={isLoggingIn}
                                className={`w-full rounded-xl ${theme.btnPrimary} px-4 py-3 text-sm font-bold shadow-md transition-all disabled:opacity-60 flex items-center justify-center gap-2`}
                            >
                                {isLoggingIn ? (
                                    <>
                                        <i className="bi bi-arrow-repeat animate-spin"></i> Memverifikasi Data Santri...
                                    </>
                                ) : (
                                    <>
                                        <i className="bi bi-box-arrow-in-right"></i> Masuk Portal Wali
                                    </>
                                )}
                            </button>
                            {loginNotice && (
                                <div className="text-xs text-center text-red-700 bg-red-50 border border-red-200 rounded-xl px-3.5 py-2.5 font-medium">
                                    <i className="bi bi-exclamation-circle-fill mr-1.5"></i>
                                    {loginNotice}
                                </div>
                            )}
                        </form>

                        {announcementPosts.length > 0 && (
                            <div className={`text-left mb-6 rounded-2xl border ${theme.borderLight} ${theme.bgLight} p-4`}>
                                <h3 className={`mb-2.5 text-xs font-extrabold uppercase tracking-wider ${theme.textDark} flex items-center gap-1.5`}>
                                    <i className="bi bi-megaphone-fill"></i> Pengumuman Pondok
                                </h3>
                                <div className="space-y-2">
                                    {announcementPosts.slice(0, 3).map((post) => (
                                        <div key={post.id} className="rounded-xl bg-white p-3 border border-slate-200/80 shadow-xs">
                                            <div className="flex items-center justify-between gap-2 mb-1">
                                                <p className="text-xs font-bold text-slate-800">{post.title || 'Pengumuman'}</p>
                                                <span className="text-[10px] text-slate-400">{formatDateId(post.publishedAt)}</span>
                                            </div>
                                            <p className="text-xs text-slate-600 whitespace-pre-wrap leading-relaxed">{post.content}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {portalContacts.length > 0 && (
                            <div className="mt-6 border-t border-slate-100 pt-4">
                                <p className="text-[11px] text-center text-slate-500 mb-3 font-medium">Butuh bantuan? Hubungi Pengurus Pondok:</p>
                                <div className="flex flex-wrap justify-center gap-2">
                                    {portalContacts.map((c) => (
                                        <a
                                            key={c.id}
                                            href={normalizeExternalUrl(c.value || '', c.icon)}
                                            target="_blank"
                                            rel="noreferrer"
                                            className={`inline-flex items-center gap-1.5 rounded-full border ${theme.borderLight} ${theme.bgLight} px-3.5 py-1.5 text-xs font-bold ${theme.textPrimary} hover:opacity-90 transition-opacity`}
                                        >
                                            <i className={`bi ${c.icon}`}></i>
                                            <span>{c.label}</span>
                                        </a>
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="mb-2 text-left">
                        {/* HEADER PROFIL SANTRI */}
                        <div className={`rounded-2xl bg-gradient-to-r ${theme.bannerGradient} text-white p-5 sm:p-6 shadow-lg`}>
                            <div className="flex flex-wrap items-start justify-between gap-4">
                                <div>
                                    <div className="flex items-center gap-2 text-xs font-semibold text-white/80 mb-1">
                                        <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-0.5 text-[11px]">
                                            <i className="bi bi-check-circle-fill"></i> {loggedInSantri.statusSantri || 'Aktif'}
                                        </span>
                                        {syncedAt && <span>• Diperbarui {formatDateId(syncedAt)}</span>}
                                    </div>
                                    <h2 className="text-xl sm:text-2xl font-extrabold">{loggedInSantri.namaLengkap}</h2>
                                    <p className="text-xs text-white/90 mt-1">
                                        NIS: <strong>{loggedInSantri.nis}</strong> • Wali: <strong>{loggedInSantri.namaWali || '-'}</strong>
                                    </p>
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        <span className="inline-flex items-center gap-1 rounded-lg bg-black/20 px-2.5 py-1 text-[11px] font-medium">
                                            <i className="bi bi-mortarboard-fill"></i>
                                            {loggedInSantri.jenjangNama || jenjangMap.get(loggedInSantri.jenjangId) || '-'} / {loggedInSantri.kelasNama || kelasMap.get(loggedInSantri.kelasId) || '-'} / {loggedInSantri.rombelNama || rombelMap.get(loggedInSantri.rombelId) || '-'}
                                        </span>
                                        {loggedInSantri.kamarNama && (
                                            <span className="inline-flex items-center gap-1 rounded-lg bg-black/20 px-2.5 py-1 text-[11px] font-medium">
                                                <i className="bi bi-house-heart-fill"></i>
                                                Kamar: {loggedInSantri.kamarNama} {loggedInSantri.asramaNama ? `(${loggedInSantri.asramaNama})` : ''}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-white/15 hover:bg-white/25 border border-white/25 rounded-xl px-3.5 py-2 transition-colors"
                                    onClick={() => {
                                        setLoggedInSantri(null);
                                        setNisInput('');
                                        setDobInput('');
                                        setLoginNotice('');
                                    }}
                                >
                                    <i className="bi bi-box-arrow-right"></i> Keluar
                                </button>
                            </div>
                        </div>

                        {isLegacyGasWarning && (
                            <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2 text-[11px] text-amber-800 flex items-center gap-2">
                                <i className="bi bi-shield-exclamation text-amber-600 text-sm"></i>
                                <span>Info Admin: Script Google Apps Script masih menggunakan versi v1. Perbarui ke Script GAS v2 di Pengaturan Portal untuk mengaktifkan proteksi Server-Side Login.</span>
                            </div>
                        )}

                        {/* RINGKASAN 4 KARTU UTAMA */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
                            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5 shadow-xs">
                                <p className="text-[11px] font-semibold text-slate-500 uppercase">Total Tunggakan</p>
                                <p className={`text-base sm:text-lg font-extrabold mt-0.5 ${(loggedInSantri.totalTunggakan ?? loggedInSantri.tunggakanBulanIni) > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                    {formatRupiah(loggedInSantri.totalTunggakan ?? loggedInSantri.tunggakanBulanIni)}
                                </p>
                                <p className="text-[10px] text-slate-500 mt-0.5">{loggedInSantri.daftarTunggakan?.length || 0} tagihan belum lunas</p>
                            </div>
                            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5 shadow-xs">
                                <p className="text-[11px] font-semibold text-slate-500 uppercase">Saldo Tabungan</p>
                                <p className="text-base sm:text-lg font-extrabold text-teal-700 mt-0.5">
                                    {formatRupiah(loggedInSantri.saldoTabungan)}
                                </p>
                                <p className="text-[10px] text-slate-500 mt-0.5">Simpanan santri aktif</p>
                            </div>
                            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5 shadow-xs">
                                <p className="text-[11px] font-semibold text-slate-500 uppercase">Presensi Hari Ini</p>
                                <p className="text-base sm:text-lg font-extrabold text-slate-800 mt-0.5">
                                    {loggedInSantri.attendanceToday || 'Belum Absen'}
                                </p>
                                <p className="text-[10px] text-slate-500 mt-0.5">
                                    Bulan Ini: {loggedInSantri.rekapBulanIni?.hadir || 0}H / {loggedInSantri.rekapBulanIni?.izin || 0}I / {loggedInSantri.rekapBulanIni?.sakit || 0}S
                                </p>
                            </div>
                            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5 shadow-xs">
                                <p className="text-[11px] font-semibold text-slate-500 uppercase">Target &amp; Tahfizh</p>
                                <p className="text-base sm:text-lg font-extrabold text-indigo-700 mt-0.5">
                                    {loggedInSantri.targetJuz ? `Target ${loggedInSantri.targetJuz} Juz` : (loggedInSantri.tahfizhTerakhir?.surah || '-')}
                                </p>
                                <p className="text-[10px] text-slate-500 mt-0.5 truncate">
                                    {loggedInSantri.tahfizhTerakhir ? `Terakhir: ${loggedInSantri.tahfizhTerakhir.surah}` : 'Setoran Al-Qur\'an'}
                                </p>
                            </div>
                        </div>

                        {/* PENGUMUMAN PONDOK */}
                        {announcementPosts.length > 0 && (
                            <div className={`mt-4 rounded-2xl border ${theme.borderLight} ${theme.bgLight} p-4`}>
                                <h3 className={`mb-2 text-xs font-extrabold uppercase tracking-wider ${theme.textDark} flex items-center gap-1.5`}>
                                    <i className="bi bi-megaphone-fill"></i> Pengumuman Pondok
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                                    {announcementPosts.slice(0, 4).map((post) => (
                                        <div key={post.id} className="rounded-xl bg-white p-3 border border-slate-200/80 shadow-xs">
                                            <div className="flex items-center justify-between gap-2 mb-1">
                                                <p className="text-xs font-bold text-slate-800">{post.title || 'Tanpa Judul'}</p>
                                                <span className="text-[10px] text-slate-400">{formatDateId(post.publishedAt)}</span>
                                            </div>
                                            <p className="text-xs text-slate-600 whitespace-pre-wrap">{post.content}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* NAVIGASI TAB FITUR */}
                        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-2">
                            <div className="flex gap-2 overflow-x-auto pb-0.5">
                                {featureItems.map((item) => (
                                    <button
                                        key={item.key}
                                        type="button"
                                        onClick={() => setActiveFeature(item.key as typeof activeFeature)}
                                        className={`shrink-0 rounded-xl px-3.5 py-2 text-xs font-bold transition-all flex items-center gap-1.5 ${
                                            activeFeature === item.key
                                                ? `${theme.btnPrimary} shadow-xs`
                                                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                                        }`}
                                    >
                                        <i className={`bi ${item.icon}`}></i>
                                        {item.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* ISI PANEL AKTIF */}
                        <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs">
                            {activeFeature === 'keuangan' && (
                                <div className="space-y-5">
                                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                                        <div>
                                            <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-1.5">
                                                <i className="bi bi-cash-stack text-teal-600"></i> Rincian Keuangan & Tagihan Santri
                                            </h3>
                                            <p className="text-xs text-slate-500">Daftar tagihan aktif, tunggakan, dan riwayat pembayaran terakhir.</p>
                                        </div>
                                        {waContact && (
                                            <a
                                                href={`${normalizeExternalUrl(waContact.value, 'bi-whatsapp')}?text=${encodeURIComponent(`Assalamu'alaikum Admin Keuangan ${tenantSettings.namaPonpes}, saya Wali dari ${loggedInSantri.namaLengkap} (NIS: ${loggedInSantri.nis}) ingin melakukan konfirmasi pembayaran syahriyah/tagihan.`)}`}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 text-xs font-bold shadow-xs transition-colors"
                                            >
                                                <i className="bi bi-whatsapp"></i> Konfirmasi Pembayaran via WA
                                            </a>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                        <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-3">
                                            <span className="text-[11px] font-bold text-rose-700 uppercase">Total Tunggakan</span>
                                            <p className="text-lg font-extrabold text-rose-700 mt-0.5">
                                                {formatRupiah(loggedInSantri.totalTunggakan ?? loggedInSantri.tunggakanBulanIni)}
                                            </p>
                                        </div>
                                        <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3">
                                            <span className="text-[11px] font-bold text-amber-800 uppercase">Tagihan Bulan Ini</span>
                                            <p className="text-lg font-extrabold text-amber-800 mt-0.5">
                                                {formatRupiah(loggedInSantri.tunggakanBulanIni)}
                                            </p>
                                        </div>
                                        <div className="rounded-xl border border-teal-200 bg-teal-50/60 p-3">
                                            <span className="text-[11px] font-bold text-teal-800 uppercase">Saldo Tabungan</span>
                                            <p className="text-lg font-extrabold text-teal-800 mt-0.5">
                                                {formatRupiah(loggedInSantri.saldoTabungan)}
                                            </p>
                                        </div>
                                    </div>

                                    <div>
                                        <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-2">
                                            Rincian Tagihan Belum Lunas ({loggedInSantri.daftarTunggakan?.length || 0})
                                        </h4>
                                        {loggedInSantri.daftarTunggakan && loggedInSantri.daftarTunggakan.length > 0 ? (
                                            <div className="space-y-2">
                                                {loggedInSantri.daftarTunggakan.map((bill, idx) => (
                                                    <div key={idx} className="flex items-center justify-between rounded-xl border border-rose-100 bg-rose-50/30 px-3.5 py-2.5">
                                                        <div>
                                                            <p className="text-xs font-bold text-slate-800">{bill.deskripsi}</p>
                                                            <p className="text-[11px] text-slate-500">
                                                                Periode: Bulan {bill.bulan}/{bill.tahun}
                                                                {bill.sudahDicicil ? ` • Dicicil: ${formatRupiah(bill.sudahDicicil)}` : ''}
                                                            </p>
                                                        </div>
                                                        <span className="text-xs font-extrabold text-rose-600">{formatRupiah(bill.nominal)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 text-xs text-emerald-800 font-semibold flex items-center gap-2">
                                                <i className="bi bi-check-circle-fill text-emerald-600"></i>
                                                Alhamdulillah, tidak ada tunggakan tagihan saat ini.
                                            </div>
                                        )}
                                    </div>

                                    {loggedInSantri.pembayaranTerakhir && loggedInSantri.pembayaranTerakhir.length > 0 && (
                                        <div>
                                            <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-2">
                                                Riwayat Pembayaran Terakhir
                                            </h4>
                                            <div className="space-y-2">
                                                {loggedInSantri.pembayaranTerakhir.map((pay, idx) => (
                                                    <div key={idx} className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5">
                                                        <div>
                                                            <p className="text-xs font-bold text-slate-800">{pay.catatan || 'Pembayaran Tagihan'}</p>
                                                            <p className="text-[11px] text-slate-500">
                                                                {formatDateId(pay.tanggal)} {pay.metode ? `• ${pay.metode}` : ''}
                                                            </p>
                                                        </div>
                                                        <span className="text-xs font-extrabold text-emerald-700">{formatRupiah(pay.jumlah)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {loggedInSantri.mutasiTabungan && loggedInSantri.mutasiTabungan.length > 0 && (
                                        <div>
                                            <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-2">
                                                Mutasi Tabungan / Uang Saku Terakhir
                                            </h4>
                                            <div className="space-y-2">
                                                {loggedInSantri.mutasiTabungan.map((mut, idx) => (
                                                    <div key={idx} className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5">
                                                        <div>
                                                            <p className="text-xs font-bold text-slate-800">{mut.keterangan || mut.jenis}</p>
                                                            <p className="text-[11px] text-slate-500">
                                                                {formatDateId(mut.tanggal)} • {mut.jenis}
                                                            </p>
                                                        </div>
                                                        <span className={`text-xs font-extrabold ${mut.jenis === 'Deposit' ? 'text-emerald-700' : 'text-amber-700'}`}>
                                                            {mut.jenis === 'Deposit' ? '+' : '-'}{formatRupiah(mut.jumlah)}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeFeature === 'akademik' && (
                                <div className="space-y-5">
                                    <div className="border-b border-slate-100 pb-3">
                                        <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-1.5">
                                            <i className="bi bi-mortarboard text-teal-600"></i> Informasi Akademik, Kamar Asrama & Pembinaan
                                        </h3>
                                        <p className="text-xs text-slate-500">Data penempatan kelas, kamar asrama, nilai rapor terakhir, dan catatan pembinaan.</p>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                                            <span className="text-[10px] font-bold text-slate-500 uppercase">Jenjang & Kelas</span>
                                            <p className="text-xs font-bold text-slate-800 mt-1">
                                                {loggedInSantri.jenjangNama || jenjangMap.get(loggedInSantri.jenjangId) || '-'} • {loggedInSantri.kelasNama || kelasMap.get(loggedInSantri.kelasId) || '-'}
                                            </p>
                                        </div>
                                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                                            <span className="text-[10px] font-bold text-slate-500 uppercase">Rombongan Belajar</span>
                                            <p className="text-xs font-bold text-slate-800 mt-1">
                                                {loggedInSantri.rombelNama || rombelMap.get(loggedInSantri.rombelId) || '-'}
                                            </p>
                                        </div>
                                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                                            <span className="text-[10px] font-bold text-slate-500 uppercase">Asrama / Kamar</span>
                                            <p className="text-xs font-bold text-slate-800 mt-1">
                                                {loggedInSantri.kamarNama ? `${loggedInSantri.kamarNama}${loggedInSantri.asramaNama ? ` (${loggedInSantri.asramaNama})` : ''}` : 'Belum ditentukan'}
                                            </p>
                                        </div>
                                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                                            <span className="text-[10px] font-bold text-slate-500 uppercase">Wali Kelas &amp; Musyrif</span>
                                            <p className="text-xs font-bold text-slate-800 mt-1">
                                                {loggedInSantri.waliKelasNama || '-'} / {loggedInSantri.musyrifNama || '-'}
                                            </p>
                                        </div>
                                    </div>

                                    {loggedInSantri.raporTerakhir && (
                                        <div className="rounded-xl border border-teal-200 bg-teal-50/40 p-4 space-y-3">
                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                <div>
                                                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-teal-900">
                                                        Ringkasan Rapor Terakhir ({loggedInSantri.raporTerakhir.semester} - {loggedInSantri.raporTerakhir.tahunAjaran})
                                                    </h4>
                                                    {loggedInSantri.raporTerakhir.keputusan && (
                                                        <p className="text-[11px] text-teal-700 font-semibold mt-0.5">
                                                            Status: {loggedInSantri.raporTerakhir.keputusan}
                                                        </p>
                                                    )}
                                                </div>
                                                <span className="rounded-xl bg-teal-600 text-white px-3 py-1 text-xs font-extrabold">
                                                    Rata-rata: {loggedInSantri.raporTerakhir.rataRata}
                                                </span>
                                            </div>
                                            {loggedInSantri.raporTerakhir.mapel && loggedInSantri.raporTerakhir.mapel.length > 0 && (
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                    {loggedInSantri.raporTerakhir.mapel.map((mp, idx) => (
                                                        <div key={idx} className="flex items-center justify-between rounded-lg bg-white border border-slate-200 px-3 py-2">
                                                            <span className="text-xs font-semibold text-slate-700 truncate pr-2">{mp.nama}</span>
                                                            <span className="text-xs font-extrabold text-teal-700 shrink-0">
                                                                {mp.nilai} {mp.predikat ? `(${mp.predikat})` : ''}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                            {loggedInSantri.raporTerakhir.catatanWaliKelas && (
                                                <p className="text-xs text-slate-600 bg-white rounded-lg border border-slate-200 p-2.5 italic">
                                                    Catatan Wali Kelas: "{loggedInSantri.raporTerakhir.catatanWaliKelas}"
                                                </p>
                                            )}
                                        </div>
                                    )}

                                    {loggedInSantri.catatanPembinaan && loggedInSantri.catatanPembinaan.length > 0 && (
                                        <div>
                                            <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-2">
                                                Catatan Prestasi &amp; Pembinaan Santri
                                            </h4>
                                            <div className="space-y-2">
                                                {loggedInSantri.catatanPembinaan.map((cat, idx) => (
                                                    <div key={idx} className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5">
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${cat.kategori === 'Prestasi' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                                                                    {cat.kategori}
                                                                </span>
                                                                <span className="text-[11px] text-slate-400">{formatDateId(cat.tanggal)}</span>
                                                            </div>
                                                            <p className="text-xs font-bold text-slate-800 mt-1">{cat.deskripsi}</p>
                                                            {cat.tindakLanjut && (
                                                                <p className="text-[11px] text-slate-600 mt-0.5">{cat.tindakLanjut}</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeFeature === 'presensi' && (
                                <div className="space-y-4">
                                    <div className="border-b border-slate-100 pb-3">
                                        <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-1.5">
                                            <i className="bi bi-calendar-check text-teal-600"></i> Kehadiran &amp; Rekap Presensi Santri
                                        </h3>
                                        <p className="text-xs text-slate-500">Status kehadiran hari ini dan rekapitulasi bulan {loggedInSantri.rekapBulanIni?.bulanLabel || 'berjalan'}.</p>
                                    </div>
                                    <div className="rounded-xl border border-teal-200 bg-teal-50/50 p-3.5 flex items-center justify-between">
                                        <span className="text-xs font-bold text-teal-900">Status Kehadiran Hari Ini</span>
                                        <span className="rounded-lg bg-teal-600 text-white px-3 py-1 text-xs font-extrabold">
                                            {loggedInSantri.attendanceToday || 'Belum Absen'}
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-center">
                                            <p className="text-[11px] font-bold text-emerald-700 uppercase">Hadir</p>
                                            <p className="text-xl font-extrabold text-emerald-800 mt-1">{loggedInSantri.rekapBulanIni?.hadir || 0}</p>
                                        </div>
                                        <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-center">
                                            <p className="text-[11px] font-bold text-blue-700 uppercase">Izin</p>
                                            <p className="text-xl font-extrabold text-blue-800 mt-1">{loggedInSantri.rekapBulanIni?.izin || 0}</p>
                                        </div>
                                        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-center">
                                            <p className="text-[11px] font-bold text-amber-700 uppercase">Sakit</p>
                                            <p className="text-xl font-extrabold text-amber-800 mt-1">{loggedInSantri.rekapBulanIni?.sakit || 0}</p>
                                        </div>
                                        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-center">
                                            <p className="text-[11px] font-bold text-rose-700 uppercase">Alpha</p>
                                            <p className="text-xl font-extrabold text-rose-800 mt-1">{loggedInSantri.rekapBulanIni?.alpha || 0}</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeFeature === 'tahfizh' && (
                                <div className="space-y-4">
                                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                                        <div>
                                            <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-1.5">
                                                <i className="bi bi-book text-teal-600"></i> Perkembangan Tahfizh Al-Qur'an
                                            </h3>
                                            <p className="text-xs text-slate-500">Riwayat setoran hafalan (Ziyadah), muroja'ah, dan tasmi' santri.</p>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            {loggedInSantri.totalJuzHafalan !== undefined && loggedInSantri.totalJuzHafalan > 0 && (
                                                <span className="rounded-xl bg-emerald-100 text-emerald-800 px-3 py-1.5 text-xs font-extrabold">
                                                    Capaian: {loggedInSantri.totalJuzHafalan} Juz
                                                </span>
                                            )}
                                            {loggedInSantri.targetJuz !== undefined && loggedInSantri.targetJuz > 0 && (
                                                <span className="rounded-xl bg-teal-600 text-white px-3.5 py-1.5 text-xs font-extrabold">
                                                    Target: {loggedInSantri.targetJuz} Juz
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {loggedInSantri.riwayatTahfizh && loggedInSantri.riwayatTahfizh.length > 0 ? (
                                        <div className="space-y-2">
                                            {loggedInSantri.riwayatTahfizh.map((th, idx) => (
                                                <div key={idx} className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5">
                                                    <div>
                                                        <p className="text-xs font-bold text-slate-800">
                                                            {th.surah} {th.ayat ? `(Ayat ${th.ayat})` : ''} {th.juz ? `• Juz ${th.juz}` : ''}
                                                        </p>
                                                        <p className="text-[11px] text-slate-500">
                                                            {formatDateId(th.tanggal)} {th.tipe ? `• ${th.tipe}` : ''}
                                                        </p>
                                                    </div>
                                                    <span className="rounded-lg bg-teal-100 text-teal-800 px-2.5 py-1 text-xs font-bold">
                                                        {th.predikat || 'Lancar'}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : loggedInSantri.tahfizhTerakhir ? (
                                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                                            <p className="text-xs font-bold text-slate-800">
                                                {loggedInSantri.tahfizhTerakhir.surah} ({loggedInSantri.tahfizhTerakhir.ayat})
                                            </p>
                                            <p className="text-[11px] text-slate-500 mt-0.5">
                                                Predikat: {loggedInSantri.tahfizhTerakhir.predikat} • {formatDateId(loggedInSantri.tahfizhTerakhir.tanggal)}
                                            </p>
                                        </div>
                                    ) : (
                                        <p className="text-xs text-slate-500 italic py-3">Belum ada catatan setoran tahfizh.</p>
                                    )}
                                </div>
                            )}

                            {activeFeature === 'kesehatan' && (
                                <div className="space-y-4">
                                    <div className="border-b border-slate-100 pb-3">
                                        <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-1.5">
                                            <i className="bi bi-heart-pulse text-rose-600"></i> Rekam Kesehatan & Poskestren
                                        </h3>
                                        <p className="text-xs text-slate-500">Riwayat pemeriksaan kesehatan dan tindakan perawatan di Poskestren.</p>
                                    </div>
                                    {loggedInSantri.riwayatKesehatan && loggedInSantri.riwayatKesehatan.length > 0 ? (
                                        <div className="space-y-2">
                                            {loggedInSantri.riwayatKesehatan.map((kes, idx) => (
                                                <div key={idx} className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <p className="text-xs font-bold text-slate-800">
                                                            {kes.keluhan || kes.diagnosa || 'Pemeriksaan Kesehatan'}
                                                        </p>
                                                        <span className="rounded-full bg-rose-100 text-rose-800 px-2.5 py-0.5 text-[10px] font-bold">
                                                            {kes.status || 'Rawat Jalan'}
                                                        </span>
                                                    </div>
                                                    {kes.tindakan && <p className="text-xs text-slate-600 mt-1">Tindakan: {kes.tindakan}</p>}
                                                    <p className="text-[10px] text-slate-400 mt-1">{formatDateId(kes.tanggal)}</p>
                                                </div>
                                            ))}
                                        </div>
                                    ) : loggedInSantri.kesehatanTerakhir ? (
                                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                                            <p className="text-xs font-bold text-slate-800">
                                                {loggedInSantri.kesehatanTerakhir.status} {loggedInSantri.kesehatanTerakhir.diagnosa ? `- ${loggedInSantri.kesehatanTerakhir.diagnosa}` : ''}
                                            </p>
                                            <p className="text-[11px] text-slate-500 mt-0.5">{formatDateId(loggedInSantri.kesehatanTerakhir.tanggal)}</p>
                                        </div>
                                    ) : (
                                        <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 text-xs text-emerald-800 font-semibold flex items-center gap-2">
                                            <i className="bi bi-shield-check text-emerald-600"></i>
                                            Alhamdulillah, santri dalam kondisi sehat (tidak ada catatan keluhan di Poskestren).
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeFeature === 'perpus' && (
                                <div className="space-y-4">
                                    <div className="border-b border-slate-100 pb-3">
                                        <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-1.5">
                                            <i className="bi bi-journal-bookmark text-teal-600"></i> Sirkulasi Pinjaman Perpustakaan
                                        </h3>
                                        <p className="text-xs text-slate-500">Daftar buku perpustakaan pondok yang sedang dipinjam oleh santri.</p>
                                    </div>
                                    {loggedInSantri.daftarPinjamanBuku && loggedInSantri.daftarPinjamanBuku.length > 0 ? (
                                        <div className="space-y-2">
                                            {loggedInSantri.daftarPinjamanBuku.map((bk, idx) => (
                                                <div key={idx} className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5">
                                                    <div>
                                                        <p className="text-xs font-bold text-slate-800">{bk.judul} {bk.kodeBuku ? `(${bk.kodeBuku})` : ''}</p>
                                                        <p className="text-[11px] text-slate-500">
                                                            Pinjam: {formatDateId(bk.tanggalPinjam)} • Jatuh Tempo: <strong>{formatDateId(bk.tanggalKembaliSeharusnya)}</strong>
                                                        </p>
                                                    </div>
                                                    <span className="rounded-lg bg-amber-100 text-amber-800 px-2.5 py-1 text-[11px] font-bold">
                                                        Dipinjam
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-xs text-slate-500 italic py-2">
                                            Tidak ada pinjaman buku aktif saat ini ({loggedInSantri.pinjamanBukuAktif || 0} buku).
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>

                        {(portalConfig?.customLinks || []).length > 0 && (
                            <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
                                <h3 className="mb-2.5 text-xs font-extrabold uppercase tracking-wider text-slate-700">Tautan Penting Pondok</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                    {(portalConfig?.customLinks || []).map((l, i) => (
                                        <a
                                            key={i}
                                            href={normalizeExternalUrl(l.url || '')}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 px-3.5 py-2 text-xs font-semibold text-slate-700 transition-colors"
                                        >
                                            <span>{l.label || 'Tautan Eksternal'}</span>
                                            <i className="bi bi-box-arrow-up-right text-[11px] text-slate-400"></i>
                                        </a>
                                    ))}
                                </div>
                            </div>
                        )}

                        {portalContacts.length > 0 && (
                            <div className={`mt-4 rounded-2xl border ${theme.borderLight} ${theme.bgLight} p-3.5`}>
                                <p className="text-[11px] font-bold text-slate-600 mb-2">Hubungi Pengurus / Bantuan:</p>
                                <div className="flex flex-wrap gap-2">
                                    {portalContacts.map((c) => (
                                        <a
                                            key={c.id}
                                            href={normalizeExternalUrl(c.value || '', c.icon)}
                                            target="_blank"
                                            rel="noreferrer"
                                            className={`inline-flex items-center gap-1.5 rounded-full border ${theme.borderLight} bg-white px-3 py-1 text-xs font-bold ${theme.textPrimary}`}
                                        >
                                            <i className={`bi ${c.icon}`}></i>
                                            <span>{c.label}</span>
                                        </a>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                <div className="mt-6 border-t border-slate-100 pt-3 text-center text-[11px] text-slate-500">
                    dibuat dengan eSantri Web by{' '}
                    <a
                        href="https://aiprojek01.my.id"
                        target="_blank"
                        rel="noreferrer"
                        className={`font-semibold ${theme.textPrimary} underline`}
                    >
                        AI Projek
                    </a>
                </div>
            </div>
        </div>
    );
};

const PsbPublicForm: React.FC<{
    settings: PondokSettings;
    templateId?: string;
    tenantId: string;
    conn: { portalId: string; gasEndpoint: string; gasApiKey: string };
}> = ({ settings, templateId, tenantId, conn }) => {
    const config = settings.psbConfig;
    let activeConfig: PsbConfig = config;
    if (templateId && config.templates) {
        const tpl = config.templates.find(t => t.id === templateId);
        if (tpl) activeConfig = { ...config, ...tpl };
    }

    return (
        <div className="min-h-screen bg-gray-100 flex flex-col items-center py-4 sm:py-10 px-0 sm:px-4">
            <div className="w-full max-w-4xl bg-white shadow-2xl rounded-none sm:rounded-2xl overflow-hidden min-h-[90vh] flex flex-col relative border border-gray-200">
                <div className="bg-teal-900 text-white p-4 flex justify-between items-center no-print">
                    <div className="flex items-center gap-3">
                        <img
                            src={settings.logoPonpesUrl || `https://picsum.photos/seed/${settings.namaPonpes}/100/100`}
                            className="w-10 h-10 rounded-full bg-white object-contain p-1 border border-teal-700"
                            alt="Logo"
                            referrerPolicy="no-referrer"
                        />
                        <div>
                            <div className="font-bold text-sm leading-tight">{settings.namaPonpes}</div>
                            <div className="text-[10px] text-teal-300">Sistem Pendaftaran Online (PSB)</div>
                        </div>
                    </div>
                </div>
                <div className="flex-grow">
                    <PsbFormViewer settings={settings} config={activeConfig} tenantId={tenantId} conn={conn} />
                </div>
                <div className="bg-gray-50 border-t p-3 text-center text-gray-400 text-[10px] no-print">
                    &copy; {new Date().getFullYear()} eSantri Web • Didukung oleh {settings.namaPonpes}
                </div>
            </div>
        </div>
    );
};

const PsbFormViewer: React.FC<{
    settings: PondokSettings;
    config: PsbConfig;
    tenantId: string;
    conn: { portalId: string; gasEndpoint: string; gasApiKey: string };
}> = ({ settings, config, tenantId, conn }) => {
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [fields, setFields] = useState<Record<string, any>>({});

    const handleInputChange = (name: string, value: any) => {
        setFields(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setSubmitError(null);
        try {
            if (!conn.gasEndpoint) {
                throw new Error('Portal GAS URL belum tersedia.');
            }
            await submitPortalPsbToGas(conn.gasEndpoint, tenantId, {
                ...fields,
                tahunAjaranAktif: config.tahunAjaranAktif,
                targetJenjangId: config.targetJenjangId,
                submissionSource: 'portal-psb'
            }, conn.gasApiKey);
            setSubmitted(true);
        } catch (err) {
            console.error('Submission Error:', err);
            setSubmitError((err as Error)?.message || 'Terjadi kesalahan saat menyimpan data. Pastikan koneksi internet aktif.');
        } finally {
            setSubmitting(false);
        }
    };

    if (submitted) {
        return (
            <div className="p-10 text-center animate-fade-in">
                <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                    <i className="bi bi-check-lg text-5xl"></i>
                </div>
                <h2 className="text-2xl font-bold mb-2">Pendaftaran Berhasil!</h2>
                <p className="text-gray-600 mb-8 max-w-md mx-auto">Data Anda telah kami terima di database cloud. Silakan simpan halaman ini sebagai bukti pendaftaran.</p>
                <div className="bg-gray-50 border p-4 rounded-lg text-left max-w-sm mx-auto mb-8">
                    <div className="text-xs text-gray-500 uppercase font-bold tracking-widest mb-1">ID Pendaftaran</div>
                    <div className="font-mono text-lg">{Date.now()}</div>
                </div>
                <button onClick={() => window.location.reload()} className="bg-teal-600 text-white px-8 py-3 rounded-full font-bold shadow-lg hover:bg-teal-700 transition-colors">Daftar Santri Lain</button>
            </div>
        );
    }

    return (
        <div className="h-full relative overflow-y-auto no-print custom-scrollbar">
            <form onSubmit={handleSubmit} className="p-6 md:p-10 max-w-3xl mx-auto space-y-10">
                <header className="text-center mb-10 border-b pb-6">
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-teal-900 mb-2 uppercase tracking-wide">{config.tahunAjaranAktif ? 'Pendaftaran Santri Baru' : 'Formulir Pendaftaran'}</h1>
                    <div className="h-1 w-20 bg-amber-500 mx-auto rounded-full mb-4"></div>
                    <p className="text-sm text-gray-500 uppercase tracking-widest font-bold">Tahun Ajaran {config.tahunAjaranAktif || new Date().getFullYear()}</p>
                </header>
                {submitError && (
                    <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 font-medium">
                        <i className="bi bi-exclamation-triangle-fill mr-2"></i>
                        {submitError}
                    </div>
                )}
                <div className="space-y-12">
                    <div className="bg-teal-50 border border-teal-100 p-4 rounded-xl">
                        <label className="block text-xs font-bold text-teal-600 uppercase mb-2 tracking-widest">Jenjang Pendidikan Tujuan</label>
                        <div className="font-bold text-xl text-teal-900 flex items-center gap-2">
                            <i className="bi bi-mortarboard-fill"></i>
                            {settings.jenjang.find(j => j.id === config.targetJenjangId)?.nama || 'Semua Jenjang'}
                        </div>
                    </div>
                    {fieldGroups.map((group, gIdx) => {
                        const groupFields = group.fields.filter(f => config.activeFields.includes(f.key));
                        if (groupFields.length === 0) return null;
                        return (
                            <section key={gIdx} className="space-y-6">
                                <h3 className="font-bold text-lg text-gray-800 border-l-4 border-amber-500 pl-3 flex items-center justify-between">
                                    {group.title}
                                    <span className="h-px bg-gray-200 flex-1 ml-4"></span>
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                                    {groupFields.map(f => {
                                        const isRequired = (config.requiredStandardFields || []).includes(f.key);
                                        return (
                                            <div key={f.key} className={`space-y-1.5 ${f.key === 'namaLengkap' || f.key === 'alamat' || f.key === 'catatan' || f.type === 'markdown' || f.isFullWidth ? 'md:col-span-2' : ''}`}>
                                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{f.label} {isRequired && <span className="text-red-500">*</span>}</label>
                                                {f.key === 'jenisKelamin' ? (
                                                    <div className="flex gap-4 p-1">
                                                        <label className="flex items-center gap-2 cursor-pointer bg-white border px-4 py-2.5 rounded-lg flex-1 text-sm has-[:checked]:border-teal-500 has-[:checked]:bg-teal-50 transition-all">
                                                            <input required={isRequired} type="radio" name={f.key} value="Laki-laki" onChange={e => handleInputChange(f.key, e.target.value)} /> Laki-laki
                                                        </label>
                                                        <label className="flex items-center gap-2 cursor-pointer bg-white border px-4 py-2.5 rounded-lg flex-1 text-sm has-[:checked]:border-teal-500 has-[:checked]:bg-teal-50 transition-all">
                                                            <input required={isRequired} type="radio" name={f.key} value="Perempuan" onChange={e => handleInputChange(f.key, e.target.value)} /> Perempuan
                                                        </label>
                                                    </div>
                                                ) : (f.type === 'select' || (f.options && f.options.length > 0)) ? (
                                                    <select
                                                        required={isRequired}
                                                        className="w-full border border-gray-300 rounded-lg p-3 bg-white focus:ring-2 focus:ring-teal-500 outline-none text-sm transition"
                                                        onChange={e => handleInputChange(f.key, e.target.value)}
                                                    >
                                                        <option value="">-- Pilih {f.label} --</option>
                                                        {f.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                                    </select>
                                                ) : (f.type === 'markdown' || f.key === 'catatan') ? (
                                                    <MarkdownEditor
                                                        value={fields[f.key] || ''}
                                                        onChange={val => handleInputChange(f.key, val)}
                                                        placeholder="Tulis catatan atau pesan orang tua (mendukung markdown)..."
                                                        rows={3}
                                                        required={isRequired}
                                                    />
                                                ) : (f.type === 'date' || f.key.toLowerCase().includes('tanggal')) ? (
                                                    <input required={isRequired} type="date" className="w-full border border-gray-300 rounded-lg p-3 bg-white focus:ring-2 focus:ring-teal-500 outline-none text-sm transition" onChange={e => handleInputChange(f.key, e.target.value)} />
                                                ) : (f.type === 'number' || ['anakKe', 'jumlahSaudara', 'tinggiBadan', 'beratBadan', 'tahunLulusSebelumnya', 'targetJuz'].includes(f.key)) ? (
                                                    <input required={isRequired} type="number" className="w-full border border-gray-300 rounded-lg p-3 bg-white focus:ring-2 focus:ring-teal-500 outline-none text-sm transition" placeholder={f.label} onChange={e => handleInputChange(f.key, e.target.value)} />
                                                ) : (
                                                    <input required={isRequired} type="text" className="w-full border border-gray-300 rounded-lg p-3 bg-white focus:ring-2 focus:ring-teal-500 outline-none text-sm transition" placeholder={f.label} onChange={e => handleInputChange(f.key, e.target.value)} />
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </section>
                        );
                    })}
                    {(config.customFields?.length ?? 0) > 0 && (
                        <section className="space-y-6 pt-6 border-t">
                            <h3 className="font-bold text-lg text-gray-800 border-l-4 border-teal-600 pl-3">Informasi Tambahan & Berkas</h3>
                            <div className="grid grid-cols-1 gap-6">
                                {config.customFields?.map(field => (
                                    <div key={field.id} className="space-y-2">
                                        {field.type === 'section' ? (
                                            <h4 className="font-bold text-teal-700 bg-teal-50 p-3 rounded-lg border-l-4 border-teal-500 uppercase tracking-widest text-xs">{field.label}</h4>
                                        ) : field.type === 'statement' ? (
                                            <div className="text-sm text-gray-600 leading-relaxed bg-amber-50 p-4 rounded-xl border border-amber-100">{field.label}</div>
                                        ) : (
                                            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm space-y-3">
                                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">{field.label} {field.required && <span className="text-red-500 font-black">*</span>}</label>
                                                {field.type === 'paragraph' ? (
                                                    <textarea required={field.required} rows={3} className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-teal-500 outline-none" onChange={e => handleInputChange(`custom_${field.id}`, e.target.value)} />
                                                ) : field.type === 'date' ? (
                                                    <input required={field.required} type="date" className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-teal-500 outline-none bg-white text-sm" onChange={e => handleInputChange(`custom_${field.id}`, e.target.value)} />
                                                ) : field.type === 'markdown' ? (
                                                    <MarkdownEditor
                                                        value={fields[`custom_${field.id}`] || ''}
                                                        onChange={val => handleInputChange(`custom_${field.id}`, val)}
                                                        placeholder="Tulis jawaban atau catatan terformat..."
                                                        rows={3}
                                                        required={field.required}
                                                    />
                                                ) : field.type === 'number' ? (
                                                    <input required={field.required} type="number" className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-teal-500 outline-none bg-white text-sm" onChange={e => handleInputChange(`custom_${field.id}`, e.target.value)} />
                                                ) : field.type === 'select' ? (
                                                    <select
                                                        required={field.required}
                                                        className="w-full border border-gray-300 rounded-lg p-3 bg-white focus:ring-2 focus:ring-teal-500 outline-none text-sm"
                                                        onChange={e => handleInputChange(`custom_${field.id}`, e.target.value)}
                                                    >
                                                        <option value="">-- Pilih {field.label} --</option>
                                                        {field.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                                    </select>
                                                ) : field.type === 'file' ? (
                                                    <div className="relative group">
                                                        <input required={field.required} type="file" accept="image/*,application/pdf" className="w-full text-xs text-gray-500 file:mr-4 file:py-2.5 file:px-6 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-amber-100 file:text-amber-800 hover:file:bg-amber-200 transition-all cursor-pointer" onChange={e => handleInputChange(`custom_${field.id}`, e.target.files?.[0])} />
                                                        <p className="text-[10px] text-gray-400 mt-2 ml-2"><i className="bi bi-info-circle"></i> Format: PDF, JPG, Maksimal 5MB.</p>
                                                    </div>
                                                ) : field.type === 'radio' ? (
                                                    <div className="flex flex-wrap gap-3">
                                                        {field.options?.map(opt => (
                                                            <label key={opt} className="flex items-center gap-2 cursor-pointer border px-4 py-2.5 rounded-xl hover:bg-gray-50 has-[:checked]:bg-teal-50 has-[:checked]:border-teal-500 transition-all text-sm">
                                                                <input type="radio" name={`custom_${field.id}`} value={opt} required={field.required} onChange={e => handleInputChange(`custom_${field.id}`, e.target.value)} />
                                                                {opt}
                                                            </label>
                                                        ))}
                                                    </div>
                                                ) : field.type === 'checkbox' ? (
                                                    <div className="flex flex-wrap gap-3">
                                                        {field.options?.map(opt => (
                                                            <label key={opt} className="flex items-center gap-2 cursor-pointer border px-4 py-2.5 rounded-xl hover:bg-gray-50 has-[:checked]:bg-teal-50 has-[:checked]:border-teal-500 transition-all text-sm">
                                                                <input type="checkbox" name={`custom_${field.id}[]`} value={opt} onChange={e => {
                                                                    const current = (fields[`custom_${field.id}`] as string[]) || [];
                                                                    const next = e.target.checked ? [...current, opt] : current.filter(x => x !== opt);
                                                                    handleInputChange(`custom_${field.id}`, next);
                                                                }} />
                                                                {opt}
                                                            </label>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <input type="text" required={field.required} className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-teal-500 outline-none" onChange={e => handleInputChange(`custom_${field.id}`, e.target.value)} />
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}
                </div>
                <div className="pt-10 border-t mt-12">
                    <button
                        disabled={submitting}
                        type="submit"
                        className="w-full bg-teal-600 hover:bg-teal-700 disabled:bg-gray-400 text-white font-black py-5 rounded-2xl shadow-[0_6px_0_0_#0d9488] active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-3 text-xl"
                    >
                        {submitting ? (
                            <>
                                <i className="bi bi-arrow-repeat animate-spin text-2xl"></i>
                                <span>Memproses...</span>
                            </>
                        ) : (
                            <>
                                <i className="bi bi-journal-check text-2xl"></i> KIRIM FORMULIR PENDAFTARAN
                            </>
                        )}
                    </button>
                    <p className="text-[10px] text-center text-gray-400 mt-6 max-w-sm mx-auto uppercase tracking-tighter">
                        Data aman terenkripsi &bullet; Langsung terkirim ke sistem {settings.namaPonpes}
                    </p>
                    <div className="mt-6 pt-4 border-t text-center text-xs text-gray-500">
                        <div>Tahun Ajaran {config.tahunAjaranAktif || new Date().getFullYear()}</div>
                        <div className="mt-1">dibuat dengan aplikasi eSantri Web by AI Projek | aiprojek01.my.id</div>
                    </div>
                </div>
            </form>
        </div>
    );
};
