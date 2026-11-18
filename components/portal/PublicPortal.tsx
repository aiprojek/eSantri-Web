import React, { useState, useEffect, useMemo } from 'react';
import { PondokSettings, PortalAnnouncementPost } from '../../types';
import { LoadingFallback } from '../common/LoadingFallback';
import {
    decodePortalKey,
    fetchPortalPublicInfoFromGas,
    loginPortalSantriViaGas,
    getLocalSantriSummary,
    PortalSantriSummary
} from '../../services/portalGasService';
import { fetchPublicPortalEntry, fetchPublicPortalSettings } from '../../services/firebasePortalRuntime';
import { db } from '../../db';
import {
    decryptPortalSantriSummary,
    deriveFirebasePortalLookupCandidates,
    derivePortalAuthHashCandidates,
    isEncryptedPortalRecord,
    isWebCryptoAvailable,
    normalizePortalDob,
    normalizePortalNis,
} from '../../services/e2eeService';

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
    const searchParams = new URLSearchParams(window.location.search);
    const hashStr = window.location.hash || '';
    const hashClean = hashStr.replace(/^#\/?/, '');
    const hashParts = hashClean.split('/').filter(p => p !== '');
    const [pathParts] = useState<string[]>(
        hashParts.length > 0 ? hashParts : window.location.pathname.split('/').filter(p => p !== '')
    );
    const isPsbParam = searchParams.get('psb') === 'true' || searchParams.has('psb') || hashStr.includes('psb=true') || pathParts[0] === 'psb';
    const portalType = isPsbParam ? 'psb' : (pathParts[0] || 'portal');
    const tenantId = searchParams.get('tenant') || pathParts[1] || 'default-portal';

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
                if (portalType === 'psb') {
                    let localPsbSettings: PondokSettings | undefined = undefined;
                    try {
                        localPsbSettings = await db.settings.toCollection().first();
                    } catch {}
                    if (!localPsbSettings && tenantId && tenantId !== 'default-portal') {
                        try {
                            const cloudPublic = await fetchPublicPortalSettings(tenantId);
                            if (cloudPublic) {
                                localPsbSettings = cloudPublic as unknown as PondokSettings;
                            }
                        } catch {}
                    }
                    setTenantSettings(
                        localPsbSettings || ({
                            namaPonpes: 'Pondok Pesantren',
                            portalConfig: { theme: 'teal', contacts: [] },
                        } as unknown as PondokSettings)
                    );
                    return;
                }

                let conn = resolvePortalConnectionFromUrl(tenantId);
                let cloudPublicDoc: any = null;

                if (!conn.gasEndpoint && tenantId && tenantId !== 'default-portal') {
                    try {
                        cloudPublicDoc = await fetchPublicPortalSettings(tenantId) as any;
                        const encKey = (cloudPublicDoc?.portalConfig as any)?.encryptedKey;
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
                        } else if (cloudPublicDoc) {
                            const metaPortalId = cloudPublicDoc?.metadata?.portalId || cloudPublicDoc?.portalConfig?.portalId;
                            if (metaPortalId) {
                                conn = {
                                    ...conn,
                                    portalId: String(metaPortalId),
                                };
                            }
                        }
                    } catch {
                        // Ignore Firebase fallback error if offline or unconfigured
                    }
                }

                setResolvedConn(conn);

                // Cek apakah database lokal tersedia (Admin / Preview Mode / Localhost)
                let localSett: PondokSettings | undefined = undefined;
                try {
                    localSett = await db.settings.toCollection().first();
                } catch {}

                // Jika ada endpoint GAS, coba ambil dari GAS
                if (conn.gasEndpoint) {
                    try {
                        const publicBundle = await fetchPortalPublicInfoFromGas(conn.gasEndpoint, conn.portalId, conn.gasApiKey);
                        const isBundleValid = publicBundle.settings && 
                            typeof publicBundle.settings === 'object' && 
                            !Array.isArray(publicBundle.settings) &&
                            ((publicBundle.settings as any).namaPonpes || (publicBundle.settings as any).psbConfig);

                        if (isBundleValid && publicBundle.settings) {
                            let finalSettings = publicBundle.settings;
                            if (localSett?.psbConfig) {
                                finalSettings = {
                                    ...publicBundle.settings,
                                    namaPonpes: localSett.namaPonpes || publicBundle.settings.namaPonpes,
                                    logoPonpesUrl: localSett.logoPonpesUrl || publicBundle.settings.logoPonpesUrl,
                                    jenjang: (localSett.jenjang && localSett.jenjang.length > 0) ? localSett.jenjang : publicBundle.settings.jenjang,
                                    psbConfig: {
                                        ...publicBundle.settings.psbConfig,
                                        ...localSett.psbConfig,
                                        templates: (localSett.psbConfig.templates && localSett.psbConfig.templates.length > 0)
                                             ? localSett.psbConfig.templates
                                             : publicBundle.settings.psbConfig?.templates
                                    }
                                };
                            }
                            setTenantSettings(finalSettings);
                            setSyncedAt(publicBundle.syncedAt);
                            setIsLegacyGasWarning(Boolean(publicBundle.isLegacyGas));
                            setLegacySantriList(publicBundle.legacySantriSummary || []);
                            return;
                        }
                    } catch (gasErr) {
                        console.warn('Gagal ambil dari GAS, mencoba fallback lokal:', gasErr);
                    }
                }

                // Jika URL menggunakan ?tenant=<firebaseUid> pada provider Firebase (termasuk dari HP wali tanpa localSett)
                if (cloudPublicDoc && (cloudPublicDoc.settings || cloudPublicDoc.namaPonpes)) {
                    const pubSettings = (cloudPublicDoc.settings || cloudPublicDoc) as PondokSettings;
                    const resolvedSettings: PondokSettings = {
                        ...pubSettings,
                        portalConfig: {
                            ...(pubSettings.portalConfig || {}),
                            ...(cloudPublicDoc.portalConfig || {}),
                            provider: pubSettings.portalConfig?.provider || cloudPublicDoc.portalConfig?.provider || 'firebase',
                        } as any,
                    };
                    setTenantSettings(resolvedSettings);
                    setSyncedAt(
                        cloudPublicDoc.metadata?.updatedAt ||
                        (typeof cloudPublicDoc.updatedAt === 'number' ? new Date(cloudPublicDoc.updatedAt).toISOString() : cloudPublicDoc.updatedAt)
                    );
                    if (Array.isArray(cloudPublicDoc.santriSummary) && cloudPublicDoc.santriSummary.length > 0) {
                        setLegacySantriList(cloudPublicDoc.santriSummary);
                    }
                    return;
                }

                // Cek provider lain jika ada setting lokal
                if (localSett) {
                    const prov = localSett.portalConfig?.provider;

                    // Provider: Firebase Firestore
                    if (prov === 'firebase') {
                        const fbId = localSett.cloudSyncConfig?.firebasePairedTenantId || (tenantId !== 'default-portal' ? tenantId : conn.portalId);
                        if (fbId) {
                            try {
                                const fbDoc = await fetchPublicPortalSettings(fbId) as any;
                                if (fbDoc && (fbDoc.settings || fbDoc.namaPonpes)) {
                                    const fbSettings = (fbDoc.settings || fbDoc) as PondokSettings;
                                    setTenantSettings(fbSettings);
                                    setSyncedAt(fbDoc.metadata?.updatedAt || localSett.portalConfig?.lastSyncedAt);
                                    if (fbDoc.metadata?.portalId) {
                                        setResolvedConn((prev) => ({ ...prev, portalId: String(fbDoc.metadata.portalId) }));
                                    }
                                    if (Array.isArray(fbDoc.santriSummary) && fbDoc.santriSummary.length > 0) {
                                        setLegacySantriList(fbDoc.santriSummary);
                                    }
                                    return;
                                }
                            } catch (fbErr) {
                                console.warn('Gagal ambil dari Firebase publicPortals:', fbErr);
                            }
                        }
                    }

                    // Provider: Cloudflare Worker
                    if (prov === 'cloudflare' && localSett.portalConfig?.cloudflareWorkerUrl) {
                        try {
                            const cfUrl = localSett.portalConfig.cloudflareWorkerUrl.replace(/\/+$/, '');
                            const cfRes = await fetch(`${cfUrl}?action=getPortalPublicInfo&portalId=${encodeURIComponent(conn.portalId)}`);
                            if (cfRes.ok) {
                                const cfData = await cfRes.json();
                                if (cfData?.settings) {
                                    setTenantSettings(cfData.settings);
                                    setSyncedAt(cfData.updatedAt || localSett.portalConfig?.lastSyncedAt);
                                    return;
                                }
                            }
                        } catch (cfErr) {
                            console.warn('Gagal ambil dari Cloudflare Worker:', cfErr);
                        }
                    }

                    // Provider: Supabase
                    if (prov === 'supabase' && localSett.portalConfig?.supabaseUrl && localSett.portalConfig?.supabaseAnonKey) {
                        try {
                            const sbUrl = localSett.portalConfig.supabaseUrl.replace(/\/+$/, '');
                            const tbl = localSett.portalConfig.supabaseTable || 'portal_data';
                            const sbRes = await fetch(`${sbUrl}/rest/v1/${tbl}?portal_id=eq.${encodeURIComponent(conn.portalId)}&select=payload,updated_at`, {
                                headers: {
                                    'apikey': localSett.portalConfig.supabaseAnonKey,
                                    'Authorization': `Bearer ${localSett.portalConfig.supabaseAnonKey}`,
                                }
                            });
                            if (sbRes.ok) {
                                const rows = await sbRes.json();
                                if (Array.isArray(rows) && rows[0]?.payload?.settings) {
                                    setTenantSettings(rows[0].payload.settings);
                                    setSyncedAt(rows[0].updated_at || rows[0].payload.metadata?.updatedAt);
                                    return;
                                }
                            }
                        } catch (sbErr) {
                            console.warn('Gagal ambil dari Supabase:', sbErr);
                        }
                    }

                    // Local fallback / Preview Mode
                    setTenantSettings(localSett);
                    setSyncedAt(localSett.portalConfig?.lastSyncedAt || new Date().toISOString());
                    return;
                }

                if (!conn.gasEndpoint) {
                    if (portalType === 'psb') {
                        throw new Error('Koneksi Pendaftaran PSB belum terhubung ke Google Apps Script (GAS). Pastikan Admin telah mengatur URL GAS di menu PSB.');
                    }
                    throw new Error('Koneksi Portal belum terkonfigurasi. Pastikan menggunakan tautan Portal Wali resmi dari pihak pondok atau aktifkan mode Pratinjau.');
                }

                if (portalType === 'psb') {
                    throw new Error('Desain formulir PSB belum disinkronkan ke Google Apps Script (GAS) atau script Code.gs belum menggunakan versi v3.0. Silakan minta Panitia menekan tombol "Sinkron ke GAS" di menu PSB.');
                }
                throw new Error('Gagal memuat konfigurasi portal dari Google Apps Script. Pastikan Admin telah menekan tombol "Sinkronkan Sekarang".');
            } catch (err) {
                console.error('Portal error:', err);
                setError((err as Error)?.message || 'Gagal memuat halaman portal. Pastikan koneksi internet stabil.');
            } finally {
                setLoading(false);
            }
        };
        fetchTenantData();
    }, [tenantId, portalType]);

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
        const tahunAjaran = tenantSettings.psbConfig?.tahunAjaranAktif || '';
        return (
            <div className={`min-h-screen bg-gradient-to-br ${theme.bgGradient} flex items-center justify-center p-4 sm:p-6`}>
                <div className="bg-white rounded-3xl shadow-xl border border-slate-200 max-w-lg w-full overflow-hidden">
                    <div className={`bg-gradient-to-r ${theme.bannerGradient} text-white p-6 flex items-center gap-4`}>
                        {tenantSettings.logoPonpesUrl ? (
                            <img
                                src={tenantSettings.logoPonpesUrl}
                                alt={tenantSettings.namaPonpes}
                                className="w-14 h-14 rounded-2xl bg-white object-contain p-1.5 shrink-0"
                                referrerPolicy="no-referrer"
                            />
                        ) : (
                            <div className="w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center shrink-0">
                                <i className="bi bi-mortarboard-fill text-2xl"></i>
                            </div>
                        )}
                        <div className="min-w-0">
                            <p className="text-[11px] uppercase tracking-widest text-white/80 font-semibold">Penerimaan Santri Baru (PSB)</p>
                            <h1 className="text-lg font-extrabold leading-tight truncate">{tenantSettings.namaPonpes || 'Pondok Pesantren'}</h1>
                            {tahunAjaran && <p className="text-xs text-white/90 mt-0.5">Tahun Ajaran {tahunAjaran}</p>}
                        </div>
                    </div>

                    <div className="p-6 space-y-4">
                        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
                            <i className="bi bi-file-earmark-code-fill text-amber-600 text-xl shrink-0 mt-0.5"></i>
                            <div className="text-xs text-amber-950 leading-relaxed space-y-1.5">
                                <p className="font-bold text-sm text-amber-900">Pendaftaran Menggunakan Formulir HTML Mandiri PSB</p>
                                <p>
                                    Tautan langsung portal PSB saat ini dinonaktifkan untuk menjaga kestabilan pengiriman data dan berkas lampiran.
                                    Silakan gunakan berkas/tautan <strong>Formulir HTML Mandiri PSB</strong> resmi yang dibagikan oleh Panitia PSB Pondok.
                                </p>
                            </div>
                        </div>

                        {portalContacts.length > 0 && (
                            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                <p className="text-xs font-bold text-slate-700 mb-2">Kontak Panitia PSB / Bantuan:</p>
                                <div className="flex flex-wrap gap-2">
                                    {portalContacts.map((c) => (
                                        <a
                                            key={c.id}
                                            href={normalizeExternalUrl(c.value || '', c.icon)}
                                            target="_blank"
                                            rel="noreferrer"
                                            className={`inline-flex items-center gap-1.5 rounded-full border ${theme.borderLight} bg-white px-3 py-1.5 text-xs font-bold ${theme.textPrimary}`}
                                        >
                                            <i className={`bi ${c.icon}`}></i>
                                            <span>{c.label}</span>
                                        </a>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="pt-2 flex flex-wrap justify-between items-center gap-2 border-t border-slate-100">
                            <a
                                href={resolvedConn.portalId && resolvedConn.portalId !== 'default-portal' ? `/?tenant=${encodeURIComponent(resolvedConn.portalId)}` : '/'}
                                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs ${theme.btnPrimary} transition-colors`}
                            >
                                <i className="bi bi-arrow-left"></i>
                                <span>Ke Portal Wali Santri</span>
                            </a>
                            <span className="text-[11px] text-slate-400">eSantri Web • PSB Resmi</span>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const handlePortalLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        const normalizedNis = nisInput.replace(/\s+/g, '').trim();
        if (!normalizedNis || !dobInput.trim()) {
            setLoginNotice('Silakan isi NIS dan tanggal lahir santri terlebih dahulu.');
            return;
        }

        const cleanNis = normalizePortalNis(normalizedNis);
        const cleanDob = normalizePortalDob(dobInput.trim());

        const matchAndDecryptCandidate = async (
            list: any[],
            portalId: string,
            authHashes: string[]
        ): Promise<PortalSantriSummary | null> => {
            if (!Array.isArray(list) || list.length === 0) return null;
            const found = list.find((s) => {
                if (isEncryptedPortalRecord(s)) {
                    return authHashes.includes(s.nis);
                }
                return normalizePortalNis(s.nis) === cleanNis && normalizePortalDob(s.tanggalLahir) === cleanDob;
            });
            if (!found) return null;
            if (isEncryptedPortalRecord(found)) {
                return await decryptPortalSantriSummary<PortalSantriSummary>(found, portalId, normalizedNis, dobInput.trim());
            }
            return found as PortalSantriSummary;
        };

        setIsLoggingIn(true);
        setLoginNotice('');
        try {
            let matched: PortalSantriSummary | null = null;
            const authHashes = isWebCryptoAvailable()
                ? await derivePortalAuthHashCandidates(resolvedConn.portalId, normalizedNis, dobInput.trim())
                : [];

            if (resolvedConn.gasEndpoint) {
                try {
                    matched = await loginPortalSantriViaGas(
                        resolvedConn.gasEndpoint,
                        resolvedConn.portalId,
                        normalizedNis,
                        dobInput.trim(),
                        resolvedConn.gasApiKey,
                        legacySantriList
                    );
                } catch (gasErr) {
                    console.warn('Login via GAS gagal, mencoba provider berikutnya:', gasErr);
                }
            }

            // Cek Cloudflare Worker jika provider cloudflare (E2EE authHash v2 -> v1 lebih dulu, lalu plaintext fallback)
            if (!matched && tenantSettings?.portalConfig?.provider === 'cloudflare' && tenantSettings.portalConfig.cloudflareWorkerUrl) {
                try {
                    const cfUrl = tenantSettings.portalConfig.cloudflareWorkerUrl.replace(/\/+$/, '');
                    const attempts: Array<{ qNis: string; qDob: string }> = [
                        ...authHashes.map((h) => ({ qNis: h, qDob: 'e2ee' })),
                        { qNis: cleanNis, qDob: cleanDob },
                    ];
                    for (const att of attempts) {
                        const cfRes = await fetch(`${cfUrl}?action=loginSantri&portalId=${encodeURIComponent(resolvedConn.portalId)}&nis=${encodeURIComponent(att.qNis)}&dob=${encodeURIComponent(att.qDob)}`);
                        if (cfRes.ok) {
                            const cfJson = await cfRes.json();
                            const candidate = cfJson?.data?.santri || cfJson?.santri;
                            if (cfJson?.success && candidate) {
                                matched = isEncryptedPortalRecord(candidate)
                                    ? await decryptPortalSantriSummary<PortalSantriSummary>(candidate, resolvedConn.portalId, normalizedNis, dobInput.trim())
                                    : candidate;
                                break;
                            }
                        }
                    }
                } catch (cfErr) {
                    console.warn('Login via Cloudflare Worker gagal:', cfErr);
                }
            }

            // Cek Supabase jika provider supabase
            if (!matched && tenantSettings?.portalConfig?.provider === 'supabase' && tenantSettings.portalConfig.supabaseUrl && tenantSettings.portalConfig.supabaseAnonKey) {
                try {
                    const sbUrl = tenantSettings.portalConfig.supabaseUrl.replace(/\/+$/, '');
                    const tbl = tenantSettings.portalConfig.supabaseTable || 'portal_data';
                    const sbRes = await fetch(`${sbUrl}/rest/v1/${tbl}?portal_id=eq.${encodeURIComponent(resolvedConn.portalId)}&select=payload`, {
                        headers: {
                            'apikey': tenantSettings.portalConfig.supabaseAnonKey,
                            'Authorization': `Bearer ${tenantSettings.portalConfig.supabaseAnonKey}`,
                        }
                    });
                    if (sbRes.ok) {
                        const rows = await sbRes.json();
                        const list: any[] = rows[0]?.payload?.santriSummary || [];
                        matched = await matchAndDecryptCandidate(list, resolvedConn.portalId, authHashes);
                    }
                } catch (sbErr) {
                    console.warn('Login via Supabase gagal:', sbErr);
                }
            }

            // Cek Firebase publicPortals/{tenantId}/entries/{entryId} (anti-enumeration), lalu fallback dokumen legacy
            if (!matched && tenantSettings?.portalConfig?.provider === 'firebase') {
                try {
                    const fbTargetId =
                        tenantId && tenantId !== 'default-portal'
                            ? tenantId
                            : (tenantSettings?.cloudSyncConfig?.firebasePairedTenantId || resolvedConn.portalId);
                    const lookupIds = await deriveFirebasePortalLookupCandidates(resolvedConn.portalId, normalizedNis, dobInput.trim());
                    const entryRec = await fetchPublicPortalEntry(fbTargetId, lookupIds);
                    if (entryRec) {
                        matched = isEncryptedPortalRecord(entryRec)
                            ? await decryptPortalSantriSummary<PortalSantriSummary>(entryRec, resolvedConn.portalId, normalizedNis, dobInput.trim())
                            : (entryRec as PortalSantriSummary);
                    } else {
                        const fbDoc = await fetchPublicPortalSettings(fbTargetId) as any;
                        const fbList: any[] = fbDoc?.santriSummary || [];
                        matched = await matchAndDecryptCandidate(fbList, resolvedConn.portalId, authHashes);
                    }
                } catch (fbErr) {
                    console.warn('Login via Firebase gagal:', fbErr);
                }
            }

            // Fallback ke legacySantriList jika ada
            if (!matched && legacySantriList && legacySantriList.length > 0) {
                matched = await matchAndDecryptCandidate(legacySantriList, resolvedConn.portalId, authHashes);
            }

            // Fallback ke database lokal untuk Mode Pratinjau / Testing Mandiri
            if (!matched) {
                matched = await getLocalSantriSummary(normalizedNis, dobInput.trim(), tenantSettings || undefined);
            }

            if (!matched) {
                setLoggedInSantri(null);
                setLoginNotice('NIS atau tanggal lahir tidak sesuai dengan data santri aktif. Silakan periksa kembali.');
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
        <div className={`min-h-screen bg-gradient-to-br ${theme.bgGradient} flex items-center justify-center p-2.5 sm:p-6`}>
            <div className={`bg-white rounded-2xl sm:rounded-3xl shadow-2xl text-center w-full border ${theme.borderLight} ${loggedInSantri ? 'max-w-5xl p-3 sm:p-6 md:p-7' : 'max-w-lg p-4 sm:p-7 md:p-8'}`}>
                {!loggedInSantri && (
                    <div className="flex flex-col items-center mb-5">
                        {tenantSettings.logoPonpesUrl ? (
                            <img src={tenantSettings.logoPonpesUrl} alt="Logo" className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl mb-3 object-contain bg-white p-1.5" referrerPolicy="no-referrer" />
                        ) : (
                            <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl ${theme.btnPrimary} flex items-center justify-center text-white text-xl sm:text-2xl font-bold mb-3 shadow-md`}>
                                {(tenantSettings.namaPonpes || 'E').charAt(0)}
                            </div>
                        )}
                        <h1 className={`text-lg sm:text-2xl font-extrabold ${theme.textDark} mb-1 break-words max-w-full px-2`}>{tenantSettings.namaPonpes}</h1>
                        <div className="text-amber-600 font-extrabold uppercase tracking-widest text-[11px] mb-2 flex items-center gap-1.5">
                            <i className="bi bi-shield-lock-fill"></i> Portal Resmi Wali Santri
                        </div>
                        <p className="text-xs text-slate-500 max-w-sm px-2">{portalConfig?.welcomeMessage || 'Selamat Datang di Portal Informasi Akademik, Asrama & Keuangan Santri'}</p>
                        {syncedAt && (
                            <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-[10px] font-semibold text-slate-600 max-w-full truncate">
                                <i className="bi bi-cloud-check-fill text-emerald-600 shrink-0"></i> <span className="truncate">Sinkron Terakhir: {formatDateId(syncedAt)}</span>
                            </span>
                        )}
                    </div>
                )}

                {!loggedInSantri ? (
                    <>
                        {!isWebCryptoAvailable() && (
                            <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-3 text-left text-xs text-amber-950">
                                <div className="font-bold flex items-center gap-1.5">
                                    <i className="bi bi-exclamation-triangle-fill text-amber-600"></i>
                                    Koneksi Non-HTTPS (Web Crypto Tidak Aktif)
                                </div>
                                <p className="mt-1 leading-relaxed text-[11px]">
                                    Jika portal pondok mengaktifkan Enkripsi E2EE, pastikan Anda membuka tautan melalui alamat aman <strong>HTTPS</strong> agar dekripsi data santri dapat berjalan di browser.
                                </p>
                            </div>
                        )}
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
                            <div className={`text-left mb-6 rounded-2xl border ${theme.borderLight} ${theme.bgLight} p-3.5 sm:p-4`}>
                                <h3 className={`mb-2.5 text-xs font-extrabold uppercase tracking-wider ${theme.textDark} flex items-center gap-1.5`}>
                                    <i className="bi bi-megaphone-fill"></i> Pengumuman Pondok
                                </h3>
                                <div className="space-y-2">
                                    {announcementPosts.slice(0, 3).map((post) => (
                                        <div key={post.id} className="rounded-xl bg-white p-3 border border-slate-200/80 shadow-xs">
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                                                <p className="text-xs font-bold text-slate-800 break-words">{post.title || 'Pengumuman'}</p>
                                                <span className="text-[10px] text-slate-400 shrink-0">{formatDateId(post.publishedAt)}</span>
                                            </div>
                                            <p className="text-xs text-slate-600 whitespace-pre-wrap leading-relaxed break-words">{post.content}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {portalContacts.length > 0 && (
                            <div className="mt-6 border-t border-slate-100 pt-4">
                                <p className="text-[11px] text-center text-slate-500 mb-3 font-medium">Butuh bantuan? Hubungi Pengurus Pondok:</p>
                                <div className="flex flex-wrap justify-center gap-1.5 sm:gap-2">
                                    {portalContacts.map((c) => (
                                        <a
                                            key={c.id}
                                            href={normalizeExternalUrl(c.value || '', c.icon)}
                                            target="_blank"
                                            rel="noreferrer"
                                            className={`inline-flex items-center gap-1.5 rounded-full border ${theme.borderLight} ${theme.bgLight} px-3 py-1.5 text-[11px] sm:text-xs font-bold ${theme.textPrimary} hover:opacity-90 transition-opacity max-w-full`}
                                        >
                                            <i className={`bi ${c.icon} shrink-0`}></i>
                                            <span className="truncate">{c.label}</span>
                                        </a>
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="mb-2 text-left">
                        {/* HEADER PROFIL SANTRI - DISUSUN KE BAWAH DENGAN RAPIH */}
                        <div className={`rounded-2xl bg-gradient-to-r ${theme.bannerGradient} text-white p-4 sm:p-5 shadow-lg`}>
                            {/* Baris Atas: Status Santri & Waktu Sinkronisasi (Kiri) + Tombol Keluar (Kanan) */}
                            <div className="flex items-center justify-between gap-2 border-b border-white/15 pb-3">
                                <div className="flex items-center gap-2 min-w-0">
                                    <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-0.5 text-[11px] font-semibold shrink-0">
                                        <i className="bi bi-check-circle-fill"></i> {loggedInSantri.statusSantri || 'Aktif'}
                                    </span>
                                    {syncedAt && (
                                        <span className="text-[11px] text-white/80 truncate">
                                            • Diperbarui {formatDateId(syncedAt)}
                                        </span>
                                    )}
                                </div>
                                <button
                                    type="button"
                                    className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-white/15 hover:bg-white/25 border border-white/25 rounded-xl px-3 py-1.5 transition-colors shrink-0"
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

                            {/* Susunan Ke Bawah: Nama Santri, NIS, Wali, dan Tag Penempatan */}
                            <div className="pt-3 space-y-2.5">
                                <div className="flex items-start gap-3">
                                    <div className="w-12 h-12 rounded-full bg-white text-slate-900 font-extrabold text-base flex items-center justify-center shrink-0 shadow-md">
                                        {(loggedInSantri.namaLengkap || 'SN').slice(0, 2).toUpperCase()}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <h2 className="text-lg sm:text-2xl font-extrabold leading-tight break-words">
                                            {loggedInSantri.namaLengkap}
                                        </h2>
                                        <p className="text-xs text-white/90 mt-1 break-words">
                                            NIS: <strong>{loggedInSantri.nis}</strong> • Wali: <strong>{loggedInSantri.namaWali || '-'}</strong>
                                        </p>
                                    </div>
                                </div>

                                {/* Chips Data Santri disusun rapih ke bawah & fleksibel membungkus */}
                                <div className="flex flex-wrap gap-1.5 sm:gap-2 pt-0.5">
                                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-black/20 border border-white/10 px-2.5 py-1 text-[11px] font-medium max-w-full">
                                        <i className="bi bi-mortarboard-fill text-amber-300 shrink-0"></i>
                                        <span className="truncate">{loggedInSantri.jenjangNama || jenjangMap.get(loggedInSantri.jenjangId) || '-'} • {loggedInSantri.kelasNama || kelasMap.get(loggedInSantri.kelasId) || '-'} • {loggedInSantri.rombelNama || rombelMap.get(loggedInSantri.rombelId) || '-'}</span>
                                    </span>
                                    {loggedInSantri.kamarNama && (
                                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-black/20 border border-white/10 px-2.5 py-1 text-[11px] font-medium max-w-full">
                                            <i className="bi bi-house-heart-fill text-emerald-300 shrink-0"></i>
                                            <span className="truncate">Kamar: {loggedInSantri.kamarNama} {loggedInSantri.asramaNama ? `(${loggedInSantri.asramaNama})` : ''}</span>
                                        </span>
                                    )}
                                    {loggedInSantri.waliKelasNama && (
                                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-black/20 border border-white/10 px-2.5 py-1 text-[11px] font-medium max-w-full">
                                            <i className="bi bi-person-badge-fill text-blue-200 shrink-0"></i>
                                            <span className="truncate">Wali Kelas: {loggedInSantri.waliKelasNama}</span>
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {isLegacyGasWarning && (
                            <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2 text-[11px] text-amber-800 flex items-center gap-2">
                                <i className="bi bi-shield-exclamation text-amber-600 text-sm shrink-0"></i>
                                <span>Info Admin: Script Google Apps Script masih menggunakan versi v1. Perbarui ke Script GAS v2 di Pengaturan Portal untuk mengaktifkan proteksi Server-Side Login.</span>
                            </div>
                        )}

                        {/* RINGKASAN 4 KARTU UTAMA (2X2 DI PONSEL & TABLET) */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 mt-4">
                            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3 sm:p-3.5 shadow-xs min-w-0 flex flex-col justify-between">
                                <div>
                                    <p className="text-[11px] font-semibold text-slate-500 uppercase truncate">Total Tunggakan</p>
                                    <p className={`text-sm sm:text-base lg:text-lg font-extrabold mt-0.5 truncate ${(loggedInSantri.totalTunggakan ?? loggedInSantri.tunggakanBulanIni) > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                        {formatRupiah(loggedInSantri.totalTunggakan ?? loggedInSantri.tunggakanBulanIni)}
                                    </p>
                                </div>
                                <p className="text-[10px] text-slate-500 mt-1 truncate">{loggedInSantri.daftarTunggakan?.length || 0} tagihan aktif</p>
                            </div>
                            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3 sm:p-3.5 shadow-xs min-w-0 flex flex-col justify-between">
                                <div>
                                    <p className="text-[11px] font-semibold text-slate-500 uppercase truncate">Saldo Tabungan</p>
                                    <p className="text-sm sm:text-base lg:text-lg font-extrabold text-teal-700 mt-0.5 truncate">
                                        {formatRupiah(loggedInSantri.saldoTabungan)}
                                    </p>
                                </div>
                                <p className="text-[10px] text-slate-500 mt-1 truncate">Simpanan santri aktif</p>
                            </div>
                            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3 sm:p-3.5 shadow-xs min-w-0 flex flex-col justify-between">
                                <div>
                                    <p className="text-[11px] font-semibold text-slate-500 uppercase truncate">Presensi Hari Ini</p>
                                    <p className="text-sm sm:text-base lg:text-lg font-extrabold text-slate-800 mt-0.5 truncate">
                                        {loggedInSantri.attendanceToday || 'Belum Absen'}
                                    </p>
                                </div>
                                <p className="text-[10px] text-slate-500 mt-1 truncate">
                                    Bulan Ini: {loggedInSantri.rekapBulanIni?.hadir || 0}H / {loggedInSantri.rekapBulanIni?.izin || 0}I / {loggedInSantri.rekapBulanIni?.sakit || 0}S
                                </p>
                            </div>
                            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3 sm:p-3.5 shadow-xs min-w-0 flex flex-col justify-between">
                                <div>
                                    <p className="text-[11px] font-semibold text-slate-500 uppercase truncate">Target &amp; Tahfizh</p>
                                    <p className="text-sm sm:text-base lg:text-lg font-extrabold text-indigo-700 mt-0.5 truncate">
                                        {loggedInSantri.targetJuz ? `Target ${loggedInSantri.targetJuz} Juz` : (loggedInSantri.tahfizhTerakhir?.surah || '-')}
                                    </p>
                                </div>
                                <p className="text-[10px] text-slate-500 mt-1 truncate">
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
                        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-1.5 sm:p-2">
                            <div className="flex gap-1.5 sm:gap-2 overflow-x-auto pb-0.5 scrollbar-none [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                                {featureItems.map((item) => (
                                    <button
                                        key={item.key}
                                        type="button"
                                        onClick={() => setActiveFeature(item.key as typeof activeFeature)}
                                        className={`shrink-0 rounded-xl px-2.5 py-1.5 sm:px-3.5 sm:py-2 text-[11px] sm:text-xs font-bold transition-all flex items-center gap-1.5 ${
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
                        <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-5 shadow-xs">
                            {activeFeature === 'keuangan' && (
                                <div className="space-y-4 sm:space-y-5">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                                        <div className="min-w-0 flex-1">
                                            <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-1.5">
                                                <i className="bi bi-cash-stack text-teal-600"></i> Rincian Keuangan &amp; Tagihan Santri
                                            </h3>
                                            <p className="text-xs text-slate-500 mt-0.5">Daftar tagihan aktif, tunggakan, dan riwayat pembayaran terakhir.</p>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto mt-0.5 sm:mt-0">
                                            <span className={`self-start sm:self-auto rounded-full px-2.5 py-1 text-xs font-bold shrink-0 shadow-2xs ${
                                                (loggedInSantri.totalTunggakan ?? loggedInSantri.tunggakanBulanIni) > 0
                                                    ? 'bg-rose-100 text-rose-800'
                                                    : 'bg-emerald-100 text-emerald-800'
                                            }`}>
                                                <i className={`bi mr-1 ${
                                                    (loggedInSantri.totalTunggakan ?? loggedInSantri.tunggakanBulanIni) > 0
                                                        ? 'bi-exclamation-circle-fill'
                                                        : 'bi-check-circle-fill'
                                                }`}></i>
                                                {(loggedInSantri.totalTunggakan ?? loggedInSantri.tunggakanBulanIni) > 0
                                                    ? `${loggedInSantri.daftarTunggakan?.length || 1} Tagihan Aktif`
                                                    : 'Semua Lunas'}
                                            </span>
                                            {waContact && (
                                                <a
                                                    href={`${normalizeExternalUrl(waContact.value, 'bi-whatsapp')}?text=${encodeURIComponent(`Assalamu'alaikum Admin Keuangan ${tenantSettings.namaPonpes}, saya Wali dari ${loggedInSantri.namaLengkap} (NIS: ${loggedInSantri.nis}) ingin melakukan konfirmasi pembayaran syahriyah/tagihan.`)}`}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="inline-flex items-center justify-center gap-1.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1 text-xs font-bold shadow-2xs transition-colors shrink-0"
                                                >
                                                    <i className="bi bi-whatsapp"></i> Konfirmasi WA
                                                </a>
                                            )}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
                                        <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-3 min-w-0">
                                            <span className="text-[11px] font-bold text-rose-700 uppercase truncate block">Total Tunggakan</span>
                                            <p className="text-base sm:text-lg font-extrabold text-rose-700 mt-0.5 truncate">
                                                {formatRupiah(loggedInSantri.totalTunggakan ?? loggedInSantri.tunggakanBulanIni)}
                                            </p>
                                        </div>
                                        <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3 min-w-0">
                                            <span className="text-[11px] font-bold text-amber-800 uppercase truncate block">Tagihan Bulan Ini</span>
                                            <p className="text-base sm:text-lg font-extrabold text-amber-800 mt-0.5 truncate">
                                                {formatRupiah(loggedInSantri.tunggakanBulanIni)}
                                            </p>
                                        </div>
                                        <div className="rounded-xl border border-teal-200 bg-teal-50/60 p-3 min-w-0">
                                            <span className="text-[11px] font-bold text-teal-800 uppercase truncate block">Saldo Tabungan</span>
                                            <p className="text-base sm:text-lg font-extrabold text-teal-800 mt-0.5 truncate">
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
                                                    <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-3 rounded-xl border border-rose-100 bg-rose-50/30 px-3.5 py-2.5">
                                                        <div className="min-w-0 flex-1">
                                                            <p className="text-xs font-bold text-slate-800 break-words">{bill.deskripsi}</p>
                                                            <p className="text-[11px] text-slate-500">
                                                                Periode: Bulan {bill.bulan}/{bill.tahun}
                                                                {bill.sudahDicicil ? ` • Dicicil: ${formatRupiah(bill.sudahDicicil)}` : ''}
                                                            </p>
                                                        </div>
                                                        <span className="text-xs sm:text-sm font-mono font-extrabold text-rose-600 shrink-0 self-end sm:self-auto sm:text-right">
                                                            {formatRupiah(bill.nominal)}
                                                        </span>
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
                                                    <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5">
                                                        <div className="min-w-0 flex-1">
                                                            <p className="text-xs font-bold text-slate-800 break-words">{pay.catatan || 'Pembayaran Tagihan'}</p>
                                                            <p className="text-[11px] text-slate-500">
                                                                {formatDateId(pay.tanggal)} {pay.metode ? `• ${pay.metode}` : ''}
                                                            </p>
                                                        </div>
                                                        <span className="text-xs sm:text-sm font-mono font-extrabold text-emerald-700 shrink-0 self-end sm:self-auto sm:text-right">
                                                            {formatRupiah(pay.jumlah)}
                                                        </span>
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
                                                    <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5">
                                                        <div className="min-w-0 flex-1">
                                                            <p className="text-xs font-bold text-slate-800 break-words">{mut.keterangan || mut.jenis}</p>
                                                            <p className="text-[11px] text-slate-500">
                                                                {formatDateId(mut.tanggal)} • {mut.jenis}
                                                            </p>
                                                        </div>
                                                        <span className={`text-xs sm:text-sm font-mono font-extrabold shrink-0 self-end sm:self-auto sm:text-right ${mut.jenis === 'Deposit' ? 'text-emerald-700' : 'text-amber-700'}`}>
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
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                                        <div className="min-w-0 flex-1">
                                            <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-1.5">
                                                <i className="bi bi-mortarboard text-teal-600"></i> Informasi Akademik, Kamar Asrama &amp; Pembinaan
                                            </h3>
                                            <p className="text-xs text-slate-500 mt-0.5">Data penempatan kelas, kamar asrama, nilai rapor terakhir, dan catatan pembinaan.</p>
                                        </div>
                                        <span className="self-start sm:self-auto rounded-full bg-emerald-100 text-emerald-800 px-2.5 py-1 text-xs font-bold shrink-0 shadow-2xs mt-0.5 sm:mt-0">
                                            <i className="bi bi-check-circle-fill mr-1"></i> {loggedInSantri.statusSantri || 'Santri Aktif Mukim'}
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
                                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 min-w-0">
                                            <span className="text-[10px] font-bold text-slate-500 uppercase truncate block">Jenjang &amp; Kelas</span>
                                            <p className="text-xs font-bold text-slate-800 mt-1 break-words">
                                                {loggedInSantri.jenjangNama || jenjangMap.get(loggedInSantri.jenjangId) || '-'} • {loggedInSantri.kelasNama || kelasMap.get(loggedInSantri.kelasId) || '-'}
                                            </p>
                                        </div>
                                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 min-w-0">
                                            <span className="text-[10px] font-bold text-slate-500 uppercase truncate block">Rombongan Belajar</span>
                                            <p className="text-xs font-bold text-slate-800 mt-1 break-words">
                                                {loggedInSantri.rombelNama || rombelMap.get(loggedInSantri.rombelId) || '-'}
                                            </p>
                                        </div>
                                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 min-w-0">
                                            <span className="text-[10px] font-bold text-slate-500 uppercase truncate block">Asrama / Kamar</span>
                                            <p className="text-xs font-bold text-slate-800 mt-1 break-words">
                                                {loggedInSantri.kamarNama ? `${loggedInSantri.kamarNama}${loggedInSantri.asramaNama ? ` (${loggedInSantri.asramaNama})` : ''}` : 'Belum ditentukan'}
                                            </p>
                                        </div>
                                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 min-w-0">
                                            <span className="text-[10px] font-bold text-slate-500 uppercase truncate block">Wali Kelas &amp; Musyrif</span>
                                            <p className="text-xs font-bold text-slate-800 mt-1 break-words">
                                                {loggedInSantri.waliKelasNama || '-'} / {loggedInSantri.musyrifNama || '-'}
                                            </p>
                                        </div>
                                    </div>

                                    {loggedInSantri.raporTerakhir && (
                                        <div className="rounded-xl border border-teal-200 bg-teal-50/40 p-3.5 sm:p-4 space-y-3 shadow-2xs">
                                            {/* Rapor Header: Rata-rata diletakkan di bawah evaluasi capaian belajar saat di HP */}
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-teal-200/60 pb-2.5">
                                                <div className="min-w-0 flex-1">
                                                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-teal-900 break-words flex items-center gap-1.5">
                                                        <i className="bi bi-mortarboard text-teal-700"></i> Ringkasan Rapor Terakhir ({loggedInSantri.raporTerakhir.semester} - {loggedInSantri.raporTerakhir.tahunAjaran})
                                                    </h4>
                                                    <p className="text-[11px] text-teal-700 font-semibold mt-0.5">
                                                        Evaluasi capaian belajar &amp; nilai santri
                                                    </p>
                                                    {loggedInSantri.raporTerakhir.keputusan && (
                                                        <p className="text-[10px] text-teal-600 mt-0.5">
                                                            Status: {loggedInSantri.raporTerakhir.keputusan}
                                                        </p>
                                                    )}
                                                </div>
                                                <span className="self-start sm:self-auto rounded-full bg-teal-600 text-white px-2.5 py-1 text-xs font-bold shrink-0 shadow-2xs mt-0.5 sm:mt-0">
                                                    Rata-rata:{' '}
                                                    {loggedInSantri.raporTerakhir.hasNumericScores === false ||
                                                    (!loggedInSantri.raporTerakhir.rataRata &&
                                                        (!loggedInSantri.raporTerakhir.mapel || loggedInSantri.raporTerakhir.mapel.length === 0))
                                                        ? '-'
                                                        : loggedInSantri.raporTerakhir.rataRata}
                                                </span>
                                            </div>
                                            {loggedInSantri.raporTerakhir.mapel && loggedInSantri.raporTerakhir.mapel.length > 0 && (
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                    {loggedInSantri.raporTerakhir.mapel.map((mp, idx) => (
                                                        <div key={idx} className="flex items-center justify-between rounded-lg bg-white border border-slate-200 px-3 py-2 min-w-0">
                                                            <span className="text-xs font-semibold text-slate-700 truncate pr-2 min-w-0 flex-1">{mp.nama}</span>
                                                            <span className="text-xs font-extrabold text-teal-700 shrink-0">
                                                                {mp.nilai} {mp.predikat ? `(${mp.predikat})` : ''}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                            {loggedInSantri.raporTerakhir.catatanWaliKelas && (
                                                <p className="text-xs text-slate-600 bg-white rounded-lg border border-slate-200 p-2.5 italic break-words">
                                                    Catatan Wali Kelas: &ldquo;{loggedInSantri.raporTerakhir.catatanWaliKelas}&rdquo;
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
                                                    <div key={idx} className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 sm:gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5">
                                                        <div className="min-w-0 flex-1">
                                                            <div className="flex flex-wrap items-center gap-2">
                                                                <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${cat.kategori === 'Prestasi' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                                                                    {cat.kategori}
                                                                </span>
                                                                <span className="text-[11px] text-slate-400">{formatDateId(cat.tanggal)}</span>
                                                            </div>
                                                            <p className="text-xs font-bold text-slate-800 mt-1 break-words">{cat.deskripsi}</p>
                                                            {cat.tindakLanjut && (
                                                                <p className="text-[11px] text-slate-600 mt-0.5 break-words">{cat.tindakLanjut}</p>
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
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                                        <div className="min-w-0 flex-1">
                                            <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-1.5">
                                                <i className="bi bi-calendar-check text-teal-600"></i> Kehadiran &amp; Rekap Presensi Santri
                                            </h3>
                                            <p className="text-xs text-slate-500 mt-0.5">Status kehadiran hari ini dan rekapitulasi bulan {loggedInSantri.rekapBulanIni?.bulanLabel || 'berjalan'}.</p>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-1.5 self-start sm:self-auto mt-0.5 sm:mt-0">
                                            <span className="self-start sm:self-auto rounded-full bg-teal-600 text-white px-2.5 py-1 text-xs font-bold shrink-0 shadow-2xs">
                                                Hari Ini: {loggedInSantri.attendanceToday || 'Belum Absen'}
                                            </span>
                                            <span className="self-start sm:self-auto rounded-full bg-emerald-100 text-emerald-800 px-2.5 py-1 text-xs font-bold shrink-0 shadow-2xs">
                                                {loggedInSantri.rekapBulanIni?.hadir || 0} Hari Hadir
                                            </span>
                                        </div>
                                    </div>
                                    {/* Strictly 2x2 di ponsel & tablet (grid-cols-2 lg:grid-cols-4) */}
                                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
                                        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-center min-w-0">
                                            <p className="text-[11px] font-bold text-emerald-700 uppercase truncate">Hadir</p>
                                            <p className="text-lg sm:text-xl font-extrabold text-emerald-800 mt-1 truncate">{loggedInSantri.rekapBulanIni?.hadir || 0} <span className="text-xs font-semibold text-emerald-600">Hari</span></p>
                                        </div>
                                        <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-center min-w-0">
                                            <p className="text-[11px] font-bold text-blue-700 uppercase truncate">Sakit</p>
                                            <p className="text-lg sm:text-xl font-extrabold text-blue-800 mt-1 truncate">{loggedInSantri.rekapBulanIni?.sakit || 0} <span className="text-xs font-semibold text-blue-600">Hari</span></p>
                                        </div>
                                        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-center min-w-0">
                                            <p className="text-[11px] font-bold text-amber-700 uppercase truncate">Izin</p>
                                            <p className="text-lg sm:text-xl font-extrabold text-amber-800 mt-1 truncate">{loggedInSantri.rekapBulanIni?.izin || 0} <span className="text-xs font-semibold text-amber-600">Hari</span></p>
                                        </div>
                                        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-center min-w-0">
                                            <p className="text-[11px] font-bold text-rose-700 uppercase truncate">Alpha</p>
                                            <p className="text-lg sm:text-xl font-extrabold text-rose-800 mt-1 truncate">{loggedInSantri.rekapBulanIni?.alpha || 0} <span className="text-xs font-semibold text-rose-600">Hari</span></p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeFeature === 'tahfizh' && (
                                <div className="space-y-4">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-slate-100 pb-3">
                                        <div className="min-w-0 flex-1">
                                            <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-1.5">
                                                <i className="bi bi-journal-bookmark text-teal-600"></i> Perkembangan Tahfizh Al-Qur'an
                                            </h3>
                                            <p className="text-xs text-slate-500 mt-0.5">Riwayat setoran hafalan (Ziyadah), muroja'ah, dan tasmi' santri.</p>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-1.5 self-start sm:self-auto mt-0.5 sm:mt-0">
                                            {loggedInSantri.totalJuzHafalan !== undefined && loggedInSantri.totalJuzHafalan > 0 && (
                                                <span className="rounded-full bg-emerald-100 text-emerald-800 px-2.5 py-1 text-xs font-bold shrink-0 shadow-2xs">
                                                    Capaian: {loggedInSantri.totalJuzHafalan} Juz
                                                </span>
                                            )}
                                            <span className="rounded-full bg-teal-600 text-white px-2.5 py-1 text-xs font-bold shrink-0 shadow-2xs">
                                                Target: {loggedInSantri.targetJuz || 30} Juz
                                            </span>
                                        </div>
                                    </div>

                                    {loggedInSantri.riwayatTahfizh && loggedInSantri.riwayatTahfizh.length > 0 ? (
                                        <div className="space-y-2">
                                            {loggedInSantri.riwayatTahfizh.map((th, idx) => (
                                                <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5">
                                                    <div className="min-w-0 flex-1">
                                                        <p className="text-xs font-bold text-slate-800 break-words">
                                                            {th.surah} {th.ayat ? `(Ayat ${th.ayat})` : ''} {th.juz ? `• Juz ${th.juz}` : ''}
                                                        </p>
                                                        <p className="text-[11px] text-slate-500">
                                                            {formatDateId(th.tanggal)} {th.tipe ? `• ${th.tipe}` : ''}
                                                        </p>
                                                    </div>
                                                    <span className="rounded-full bg-teal-100 text-teal-800 px-2.5 py-1 text-xs font-bold shrink-0 self-start sm:self-auto">
                                                        {th.predikat || 'Lancar'}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : loggedInSantri.tahfizhTerakhir ? (
                                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                                            <p className="text-xs font-bold text-slate-800 break-words">
                                                {loggedInSantri.tahfizhTerakhir.surah} ({loggedInSantri.tahfizhTerakhir.ayat})
                                            </p>
                                            <p className="text-[11px] text-slate-500 mt-0.5">
                                                Predikat: {loggedInSantri.tahfizhTerakhir.predikat} • {formatDateId(loggedInSantri.tahfizhTerakhir.tanggal)}
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs text-slate-500 italic text-center">
                                            Belum ada catatan setoran tahfizh.
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeFeature === 'kesehatan' && (
                                <div className="space-y-4">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                                        <div className="min-w-0 flex-1">
                                            <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-1.5">
                                                <i className="bi bi-heart-pulse text-rose-600"></i> Rekam Kesehatan &amp; Poskestren
                                            </h3>
                                            <p className="text-xs text-slate-500 mt-0.5">Riwayat pemeriksaan kesehatan dan tindakan perawatan di Poskestren.</p>
                                        </div>
                                        <span className="self-start sm:self-auto rounded-full bg-emerald-100 text-emerald-800 px-2.5 py-1 text-xs font-bold shrink-0 shadow-2xs mt-0.5 sm:mt-0">
                                            <i className="bi bi-shield-check mr-1"></i> Kondisi Sehat
                                        </span>
                                    </div>
                                    {loggedInSantri.riwayatKesehatan && loggedInSantri.riwayatKesehatan.length > 0 ? (
                                        <div className="space-y-2">
                                            {loggedInSantri.riwayatKesehatan.map((kes, idx) => (
                                                <div key={idx} className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5">
                                                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-1 sm:gap-2">
                                                        <p className="text-xs font-bold text-slate-800 break-words min-w-0 flex-1">
                                                            {kes.keluhan || kes.diagnosa || 'Pemeriksaan Kesehatan'}
                                                        </p>
                                                        <span className="rounded-full bg-rose-100 text-rose-800 px-2.5 py-0.5 text-[10px] font-bold shrink-0 self-start sm:self-auto">
                                                            {kes.status || 'Rawat Jalan'}
                                                        </span>
                                                    </div>
                                                    {kes.tindakan && <p className="text-xs text-slate-600 mt-1 break-words">Tindakan: {kes.tindakan}</p>}
                                                    <p className="text-[10px] text-slate-400 mt-1">{formatDateId(kes.tanggal)}</p>
                                                </div>
                                            ))}
                                        </div>
                                    ) : loggedInSantri.kesehatanTerakhir ? (
                                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                                            <p className="text-xs font-bold text-slate-800 break-words">
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
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                                        <div className="min-w-0 flex-1">
                                            <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-1.5">
                                                <i className="bi bi-book text-teal-600"></i> Sirkulasi Pinjaman Perpustakaan
                                            </h3>
                                            <p className="text-xs text-slate-500 mt-0.5">Daftar buku perpustakaan pondok yang sedang dipinjam oleh santri.</p>
                                        </div>
                                        <span className="self-start sm:self-auto rounded-full bg-slate-100 text-slate-700 px-2.5 py-1 text-xs font-bold shrink-0 shadow-2xs mt-0.5 sm:mt-0">
                                            <i className="bi bi-journal-check mr-1"></i> {loggedInSantri.pinjamanBukuAktif || loggedInSantri.daftarPinjamanBuku?.length || 0} Buku Dipinjam
                                        </span>
                                    </div>
                                    {loggedInSantri.daftarPinjamanBuku && loggedInSantri.daftarPinjamanBuku.length > 0 ? (
                                        <div className="space-y-2">
                                            {loggedInSantri.daftarPinjamanBuku.map((bk, idx) => (
                                                <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5">
                                                    <div className="min-w-0 flex-1">
                                                        <p className="text-xs font-bold text-slate-800 break-words">{bk.judul} {bk.kodeBuku ? `(${bk.kodeBuku})` : ''}</p>
                                                        <p className="text-[11px] text-slate-500">
                                                            Pinjam: {formatDateId(bk.tanggalPinjam)} • Jatuh Tempo: <strong>{formatDateId(bk.tanggalKembaliSeharusnya)}</strong>
                                                        </p>
                                                    </div>
                                                    <span className="rounded-full bg-amber-100 text-amber-800 px-2.5 py-1 text-[11px] font-bold shrink-0 self-start sm:self-auto">
                                                        Dipinjam
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs text-slate-500 italic text-center">
                                            Tidak ada pinjaman buku aktif saat ini ({loggedInSantri.pinjamanBukuAktif || 0} buku).
                                        </div>
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



