import React, { Suspense, useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { PondokSettings } from '../types';
import { useAppContext } from '../AppContext';
import { db } from '../db';
import { syncPortalData, syncPortalBridgeToGas } from '../services/portalGasService';
import { downloadStandalonePortalHtml } from '../utils/portalStandaloneGenerator';
import { logActivity } from '../services/logService';
import { LoadingFallback } from './common/LoadingFallback';
import { PageHeader } from './common/PageHeader';
import { SectionCard } from './common/SectionCard';
import { PortalLivePreview } from './portal/PortalLivePreview';

const TabPortal = React.lazy(() => import('./portal/TabPortal').then((module) => ({ default: module.TabPortal })));

const PortalManagement: React.FC = () => {
    const { settings, onSaveSettings, showToast, currentUser } = useAppContext();
    const [localSettings, setLocalSettings] = useState<PondokSettings>(settings);
    const [isSyncingPortal, setIsSyncingPortal] = useState(false);
    const [activeTab, setActiveTab] = useState<'config' | 'preview'>('config');

    const activeSantriCount = useLiveQuery(
        async () => {
            const list = await db.santri.filter(s => !s.deleted && s.status === 'Aktif').count();
            return list;
        },
        [],
        0
    );

    const unpaidBillsCount = useLiveQuery(
        async () => {
            const list = await db.tagihan.filter(t => !t.deleted && t.status === 'Belum Lunas').count();
            return list;
        },
        [],
        0
    );

    const canWrite =
        currentUser?.role === 'admin' ||
        currentUser?.permissions?.portalwali === 'write' ||
        currentUser?.permissions?.pengaturan === 'write';

    const latestDataChangeTime = useLiveQuery(
        async () => {
            const tables = [
                db.santri,
                db.tagihan,
                db.pembayaran,
                db.saldoSantri,
                db.transaksiSaldo,
                db.absensi,
                db.tahfizh,
                db.kesehatanRecords,
                db.sirkulasi,
                db.raporRecords
            ];
            const lastItems = await Promise.all(
                tables.map((tbl) => tbl.orderBy('lastModified').last())
            );
            let maxTime = 0;
            for (const item of lastItems) {
                if (!item) continue;
                const raw = (item as any).lastModified;
                const t = typeof raw === 'number' ? raw : (raw ? new Date(raw).getTime() : 0);
                if (t > maxTime) maxTime = t;
            }
            return maxTime;
        },
        [],
        0
    );

    useEffect(() => {
        setLocalSettings({
            ...settings,
            cloudSyncConfig: {
                ...settings.cloudSyncConfig,
                dropboxAppKey: '',
                dropboxAppSecret: '',
                webdavPassword: ''
            }
        });
    }, [settings]);

    const handleSyncToPortal = async () => {
        if (!canWrite) {
            showToast('Mode baca saja: Anda tidak memiliki izin menyinkronkan Portal Wali.', 'error');
            return;
        }
        setIsSyncingPortal(true);
        try {
            const res = await syncPortalData(localSettings);
            const updatedConfig = {
                enabled: true,
                theme: 'teal' as const,
                showFinance: true,
                showAcademic: true,
                showAttendance: true,
                showTahfizh: true,
                showHealth: true,
                showLibrary: true,
                welcomeMessage: '',
                announcement: '',
                contacts: [],
                customLinks: [],
                ...localSettings.portalConfig,
                lastSyncedAt: res.syncedAt,
                lastSyncedCount: res.santriCount,
                lastPayloadSize: res.payloadSize
            };
            const nextSettings: PondokSettings = {
                ...localSettings,
                portalConfig: updatedConfig
            };
            setLocalSettings(nextSettings);

            // Preserve cloud secrets when saving
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

            await logActivity(
                'UPDATE',
                'settings',
                localSettings.portalConfig?.portalId || 'portal-wali',
                undefined,
                {
                    action: 'SYNC_PORTAL_WALI',
                    santriCount: res.santriCount,
                    payloadSizeKb: Math.round(res.payloadSize / 1024),
                    syncedAt: res.syncedAt,
                    summary: `Sinkronisasi data Portal Wali Santri ke ${res.providerName} (${res.santriCount} santri, ${(res.payloadSize / 1024).toFixed(1)} KB)`
                },
                currentUser?.fullName || currentUser?.username || 'Admin'
            );

            showToast(`Berhasil menyinkronkan ${res.santriCount} data santri ke ${res.providerName}!`, 'success');
        } catch (error) {
            showToast(`Gagal sinkronisasi data ke portal: ${(error as Error).message}`, 'error');
        } finally {
            setIsSyncingPortal(false);
        }
    };

    const handleDownloadStandalone = () => {
        if (!canWrite) {
            showToast('Mode baca saja: Anda tidak memiliki izin mengunduh paket konfigurasi Portal Wali.', 'error');
            return;
        }
        try {
            const provider = localSettings.portalConfig?.provider || 'gas';
            if (provider === 'gas' && !localSettings.portalConfig?.gasEndpoint?.trim()) {
                showToast('Isi URL Web App Google Apps Script di pengaturan terlebih dahulu.', 'error');
                return;
            }
            if (provider === 'cloudflare' && !localSettings.portalConfig?.cloudflareWorkerUrl?.trim()) {
                showToast('Isi URL Cloudflare Worker di pengaturan terlebih dahulu.', 'error');
                return;
            }
            if (provider === 'supabase' && (!localSettings.portalConfig?.supabaseUrl?.trim() || !localSettings.portalConfig?.supabaseAnonKey?.trim())) {
                showToast('Isi URL Supabase dan Anon Key di pengaturan terlebih dahulu.', 'error');
                return;
            }
            downloadStandalonePortalHtml(localSettings);
            showToast('File index.html Portal Wali Mandiri berhasil diunduh!', 'success');
        } catch (err) {
            showToast((err as Error)?.message || 'Gagal mengunduh file HTML mandiri.', 'error');
        }
    };

    const lastSyncedAt = localSettings.portalConfig?.lastSyncedAt;
    const lastSyncedTimeMs = lastSyncedAt ? new Date(lastSyncedAt).getTime() : 0;
    const activeProvider = localSettings.portalConfig?.provider || 'gas';
    const isConfigured = Boolean(
        (activeProvider === 'gas' && localSettings.portalConfig?.gasEndpoint?.trim()) ||
        (activeProvider === 'cloudflare' && localSettings.portalConfig?.cloudflareWorkerUrl?.trim()) ||
        (activeProvider === 'supabase' && localSettings.portalConfig?.supabaseUrl?.trim()) ||
        activeProvider === 'firebase' ||
        activeProvider === 'standalone'
    );
    const hasUnsyncedChanges = Boolean(
        isConfigured &&
        (!lastSyncedTimeMs || (latestDataChangeTime && latestDataChangeTime > lastSyncedTimeMs + 5000))
    );
    const lastSyncedCount = localSettings.portalConfig?.lastSyncedCount;
    const lastPayloadSize = localSettings.portalConfig?.lastPayloadSize;
    const publishedAnnouncements = (localSettings.portalConfig?.announcementPosts || []).filter(p => p && p.isPublished).length;

    return (
        <div className="space-y-6">
            <PageHeader
                eyebrow="Layanan Publik & Wali Santri"
                title="Portal Wali Santri"
                description="Kelola sinkronisasi multi-provider cloud (GAS, Cloudflare, Firebase, Supabase, Standalone) dan simulasi pratinjau langsung tampilan wali santri."
            />

            {/* Navigation Switcher: Konfigurasi vs Live Preview Simulator */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setActiveTab('config')}
                        className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all ${
                            activeTab === 'config'
                                ? 'bg-teal-700 text-white shadow-2xs'
                                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                    >
                        <i className="bi bi-gear-wide-connected text-sm"></i>
                        Pengaturan &amp; Provider Cloud
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('preview')}
                        className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all ${
                            activeTab === 'preview'
                                ? 'bg-teal-700 text-white shadow-2xs'
                                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                    >
                        <i className="bi bi-phone text-sm"></i>
                        Live Preview Simulator
                        <span className="rounded-full bg-teal-100 text-teal-900 px-2 py-0.5 text-[10px] font-extrabold ml-1">
                            Interaktif
                        </span>
                    </button>
                </div>

                <div className="flex items-center gap-2">
                    <a
                        href="/?portal=true&preview=true"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-teal-800 hover:text-teal-950 bg-teal-50 border border-teal-200 rounded-xl transition-colors"
                    >
                        <i className="bi bi-box-arrow-up-right"></i>
                        Buka Portal di Tab Baru
                    </a>
                </div>
            </div>

            {activeTab === 'preview' ? (
                <PortalLivePreview
                    settings={localSettings}
                    onClose={() => setActiveTab('config')}
                    onUpdateTheme={(themeKey) => {
                        const nextSettings: PondokSettings = {
                            ...localSettings,
                            portalConfig: {
                                ...(localSettings.portalConfig || {
                                    enabled: true,
                                    theme: 'teal',
                                    showFinance: true,
                                    showAcademic: true,
                                    showAttendance: true,
                                    showTahfizh: true,
                                    showHealth: true,
                                    showLibrary: true,
                                    welcomeMessage: '',
                                    announcement: '',
                                    contacts: [],
                                    customLinks: []
                                }),
                                theme: themeKey as any
                            }
                        };
                        setLocalSettings(nextSettings);
                        if (canWrite) {
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
                            onSaveSettings(dataToSave).catch(console.error);
                        }
                    }}
                />
            ) : (
                <>
                    <SectionCard
                        title="Pusat Kontrol Sinkronisasi & Distribusi Portal Wali"
                        description="Kirim pembaruan data akademik, rapor, keuangan, asrama, presensi, tahfizh, kesehatan, dan perpustakaan ke backend pilihan Anda."
                        contentClassName="p-6 space-y-5"
                    >
                        {hasUnsyncedChanges && (
                            <div className="rounded-xl border border-amber-300 bg-amber-50/90 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
                                <div className="flex items-center gap-2.5 text-amber-900">
                                    <i className="bi bi-arrow-repeat text-amber-600 text-lg"></i>
                                    <div>
                                        <p className="text-xs font-extrabold">Terdeteksi Pembaruan Data Lokal / Cloud</p>
                                        <p className="text-[11px] text-amber-800">
                                            Ada perubahan data santri, keuangan, rapor, atau aktivitas pondok yang baru masuk dari perangkat ini atau Cloud Multi-Admin sejak sinkronisasi terakhir ke Portal Wali.
                                        </p>
                                    </div>
                                </div>
                                {canWrite && (
                                    <button
                                        type="button"
                                        onClick={handleSyncToPortal}
                                        disabled={isSyncingPortal}
                                        className="shrink-0 rounded-lg bg-amber-600 hover:bg-amber-700 text-white px-3.5 py-1.5 text-xs font-bold transition-colors disabled:opacity-60"
                                    >
                                        {isSyncingPortal ? 'Menyinkronkan...' : 'Sinkronkan ke Portal'}
                                    </button>
                                )}
                            </div>
                        )}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
                            <div className="rounded-xl border border-teal-200 bg-teal-50/60 p-3.5">
                                <div className="flex items-center justify-between text-teal-700 mb-1">
                                    <span className="text-[11px] font-bold uppercase tracking-wider">Santri Siap Sinkron</span>
                                    <i className="bi bi-people-fill text-base"></i>
                                </div>
                                <p className="text-xl font-extrabold text-teal-950">{activeSantriCount} <span className="text-xs font-semibold text-teal-700">Santri Aktif</span></p>
                                <p className="text-[11px] text-teal-700 mt-0.5">
                                    {lastSyncedCount !== undefined ? `Tersinkron terakhir: ${lastSyncedCount} santri` : 'Belum pernah disinkronkan'}
                                </p>
                            </div>

                            <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-3.5">
                                <div className="flex items-center justify-between text-rose-700 mb-1">
                                    <span className="text-[11px] font-bold uppercase tracking-wider">Tagihan Aktif</span>
                                    <i className="bi bi-receipt-cutoff text-base"></i>
                                </div>
                                <p className="text-xl font-extrabold text-rose-950">{unpaidBillsCount} <span className="text-xs font-semibold text-rose-700">Tagihan</span></p>
                                <p className="text-[11px] text-rose-700 mt-0.5">Rincian tagihan &amp; 5 pembayaran terakhir</p>
                            </div>

                            <div className="rounded-xl border border-indigo-200 bg-indigo-50/60 p-3.5">
                                <div className="flex items-center justify-between text-indigo-700 mb-1">
                                    <span className="text-[11px] font-bold uppercase tracking-wider">Pengumuman Tayang</span>
                                    <i className="bi bi-megaphone-fill text-base"></i>
                                </div>
                                <p className="text-xl font-extrabold text-indigo-950">{publishedAnnouncements} <span className="text-xs font-semibold text-indigo-700">Info</span></p>
                                <p className="text-[11px] text-indigo-700 mt-0.5">Tampil di beranda login &amp; dasbor wali</p>
                            </div>

                            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                                <div className="flex items-center justify-between text-slate-600 mb-1">
                                    <span className="text-[11px] font-bold uppercase tracking-wider">Sinkronisasi Terakhir</span>
                                    <i className="bi bi-cloud-check-fill text-emerald-600 text-base"></i>
                                </div>
                                <p className="text-sm font-extrabold text-slate-900 truncate">
                                    {lastSyncedAt ? new Date(lastSyncedAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : 'Belum Sinkron'}
                                </p>
                                <p className="text-[11px] text-slate-500 mt-0.5">
                                    {lastPayloadSize ? `Ukuran: ${(lastPayloadSize / 1024).toFixed(1)} KB (${localSettings.portalConfig?.provider || 'GAS'})` : 'Siap dikirim ke cloud'}
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
                            {canWrite ? (
                                <div className="flex flex-wrap items-center gap-2.5">
                                    <button
                                        type="button"
                                        onClick={handleSyncToPortal}
                                        disabled={isSyncingPortal}
                                        className="app-button-primary inline-flex items-center gap-2 px-5 py-2.5 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        <i className={`bi ${isSyncingPortal ? 'bi-arrow-repeat animate-spin' : 'bi-cloud-arrow-up-fill'}`}></i>
                                        {isSyncingPortal ? 'Menyinkronkan Data...' : `Sinkronkan Sekarang (${(localSettings.portalConfig?.provider || 'gas').toUpperCase()})`}
                                    </button>

                                    <button
                                        type="button"
                                        onClick={handleDownloadStandalone}
                                        className="inline-flex items-center gap-2 rounded-xl border border-teal-600 bg-teal-50/70 px-4 py-2.5 text-xs font-bold text-teal-800 hover:bg-teal-100 transition-colors"
                                    >
                                        <i className="bi bi-file-earmark-code-fill"></i>
                                        Download HTML Mandiri (Cloudflare / Netlify)
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setActiveTab('preview')}
                                        className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                                    >
                                        <i className="bi bi-phone"></i>
                                        Live Simulator
                                    </button>
                                </div>
                            ) : (
                                <div className="inline-flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
                                    <i className="bi bi-lock-fill"></i>
                                    Mode Lihat Saja: Hubungi Admin atau Operator Portal Wali untuk mengubah konfigurasi & sinkronisasi.
                                </div>
                            )}

                            <div className="flex items-center gap-2 text-xs text-slate-500">
                                <i className="bi bi-shield-lock-fill text-teal-600"></i>
                                <span>Multi-Provider: GAS, Cloudflare Worker, Firebase, Supabase &amp; Standalone</span>
                            </div>
                        </div>
                    </SectionCard>

                    <Suspense fallback={<LoadingFallback />}>
                        <TabPortal
                            localSettings={localSettings}
                            setLocalSettings={setLocalSettings}
                            onSaveSettings={canWrite ? onSaveSettings : undefined}
                            canWrite={canWrite}
                            onSwitchToPreview={() => setActiveTab('preview')}
                        />
                    </Suspense>
                </>
            )}
        </div>
    );
};

export default PortalManagement;
