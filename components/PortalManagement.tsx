import React, { Suspense, useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { PondokSettings } from '../types';
import { useAppContext } from '../AppContext';
import { db } from '../db';
import { syncPortalBridgeToGas } from '../services/portalGasService';
import { downloadStandalonePortalHtml } from '../utils/portalStandaloneGenerator';
import { logActivity } from '../services/logService';
import { LoadingFallback } from './common/LoadingFallback';
import { PageHeader } from './common/PageHeader';
import { SectionCard } from './common/SectionCard';

const TabPortal = React.lazy(() => import('./settings/tabs/TabPortal').then((module) => ({ default: module.TabPortal })));

const PortalManagement: React.FC = () => {
    const { settings, onSaveSettings, showToast, currentUser } = useAppContext();
    const [localSettings, setLocalSettings] = useState<PondokSettings>(settings);
    const [isSyncingPortal, setIsSyncingPortal] = useState(false);

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
            let maxTime = 0;
            for (const tbl of tables) {
                const arr = await tbl.toArray();
                for (const item of arr as any[]) {
                    const t = typeof item.lastModified === 'number'
                        ? item.lastModified
                        : (item.lastModified ? new Date(item.lastModified).getTime() : 0);
                    if (t > maxTime) maxTime = t;
                }
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
        setIsSyncingPortal(true);
        try {
            const res = await syncPortalBridgeToGas(localSettings);
            const updatedConfig = {
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
                    syncedAt: res.syncedAt
                },
                currentUser?.fullName || currentUser?.username || 'Admin',
                `Sinkronisasi data Portal Wali Santri ke GAS (${res.santriCount} santri, ${(res.payloadSize / 1024).toFixed(1)} KB)`
            );

            showToast(`Berhasil menyinkronkan ${res.santriCount} data santri ke Portal Wali!`, 'success');
        } catch (error) {
            showToast(`Gagal sinkronisasi data ke portal: ${(error as Error).message}`, 'error');
        } finally {
            setIsSyncingPortal(false);
        }
    };

    const handleDownloadStandalone = () => {
        try {
            if (!localSettings.portalConfig?.gasEndpoint?.trim()) {
                showToast('Isi URL Web App GAS di pengaturan bawah terlebih dahulu.', 'error');
                return;
            }
            downloadStandalonePortalHtml(localSettings);
            showToast('File index.html Portal Wali (Terenkripsi) berhasil diunduh!', 'success');
        } catch (err) {
            showToast((err as Error)?.message || 'Gagal mengunduh file HTML mandiri.', 'error');
        }
    };

    const lastSyncedAt = localSettings.portalConfig?.lastSyncedAt;
    const lastSyncedTimeMs = lastSyncedAt ? new Date(lastSyncedAt).getTime() : 0;
    const hasUnsyncedChanges = Boolean(
        localSettings.portalConfig?.gasEndpoint?.trim() &&
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
                description="Kelola sinkronisasi data terenkripsi, generator file HTML mandiri (Cloudflare Pages), dan konfigurasi Portal Wali."
            />

            <SectionCard
                title="Pusat Kontrol Sinkronisasi & Distribusi Portal Wali"
                description="Kirim pembaruan data akademik, rapor, keuangan, asrama, presensi, tahfizh, kesehatan, dan perpustakaan ke jembatan cloud Portal Wali."
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
                        <button
                            type="button"
                            onClick={handleSyncToPortal}
                            disabled={isSyncingPortal}
                            className="shrink-0 rounded-lg bg-amber-600 hover:bg-amber-700 text-white px-3.5 py-1.5 text-xs font-bold transition-colors disabled:opacity-60"
                        >
                            {isSyncingPortal ? 'Menyinkronkan...' : 'Sinkronkan ke Portal'}
                        </button>
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
                            {lastPayloadSize ? `Ukuran paket: ${(lastPayloadSize / 1024).toFixed(1)} KB` : 'Siap dikirim ke Google Sheets'}
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
                    <div className="flex flex-wrap items-center gap-2.5">
                        <button
                            type="button"
                            onClick={handleSyncToPortal}
                            disabled={isSyncingPortal}
                            className="app-button-primary inline-flex items-center gap-2 px-5 py-2.5 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            <i className={`bi ${isSyncingPortal ? 'bi-arrow-repeat animate-spin' : 'bi-cloud-arrow-up-fill'}`}></i>
                            {isSyncingPortal ? 'Menyinkronkan Data ke GAS...' : 'Sinkronkan Sekarang ke Portal'}
                        </button>

                        <button
                            type="button"
                            onClick={handleDownloadStandalone}
                            className="inline-flex items-center gap-2 rounded-xl border border-teal-600 bg-teal-50/70 px-4 py-2.5 text-xs font-bold text-teal-800 hover:bg-teal-100 transition-colors"
                        >
                            <i className="bi bi-file-earmark-code-fill"></i>
                            Download HTML Mandiri (Cloudflare Pages)
                        </button>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-500">
                        <i className="bi bi-shield-lock-fill text-teal-600"></i>
                        <span>Proteksi Enkripsi Vault Key &amp; Server-Side Login v2.0</span>
                    </div>
                </div>
            </SectionCard>

            <Suspense fallback={<LoadingFallback />}>
                <TabPortal
                    localSettings={localSettings}
                    setLocalSettings={setLocalSettings}
                    onSaveSettings={onSaveSettings}
                />
            </Suspense>
        </div>
    );
};

export default PortalManagement;
