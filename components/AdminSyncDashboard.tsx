import React, { useState, useEffect, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useAppContext } from '../AppContext';
import { useFirebase } from '../contexts/FirebaseContext';
import { SyncFileRecord, ConflictItem, StorageStats, Page } from '../types';
import { db } from '../db';
import { formatBytes } from '../utils/formatters';
import { ConflictResolver } from './sync/ConflictResolver';
import { loadSyncService } from '../utils/lazyCloudServices';
import { loadFirebaseRealtimeRuntime } from '../utils/lazyFirebaseRuntimes';
import { PageHeader } from './common/PageHeader';
import { SectionCard } from './common/SectionCard';
import { EmptyState } from './common/EmptyState';
import { HeaderTabs, HeaderTabItem } from './common/HeaderTabs';
import type { InboxFileInspection } from '../services/syncService';

type SyncHubTab = 'inbox' | 'history' | 'panduan';

const HUB_TABS: HeaderTabItem<SyncHubTab>[] = [
    { value: 'inbox', label: 'Inbox Kiriman Staff', icon: 'bi-inbox-fill' },
    { value: 'history', label: 'Riwayat Penggabungan', icon: 'bi-clock-history' },
    { value: 'panduan', label: 'Panduan & Resolusi Konflik', icon: 'bi-book-half' },
];

const parseSenderFromFilename = (filename: string): string => {
    // Format: 1728271239123_username_here.json
    const clean = filename.replace(/\.json$/i, '');
    const match = clean.match(/^\d+_(.+)$/);
    if (match && match[1]) {
        return match[1].replace(/_/g, ' ');
    }
    return 'Staff / Operator';
};

export const AdminSyncDashboard: React.FC = () => {
    const { settings, showToast, showConfirmation, showAlert, currentUser, triggerManualSync, syncStatus, pendingChanges } = useAppContext();
    const { fbUser, initializeAuthState, login } = useFirebase();

    const [activeTab, setActiveTab] = useState<SyncHubTab>('inbox');
    const [files, setFiles] = useState<SyncFileRecord[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [isBatchMerging, setIsBatchMerging] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'merged'>('all');

    // Reminder state when Admin has merged files in this session but hasn't published Master yet
    const [hasUnpublishedMerge, setHasUnpublishedMerge] = useState(false);
    const [storageStats, setStorageStats] = useState<StorageStats | null>(null);

    // Inspect Modal State
    const [inspectingFile, setInspectingFile] = useState<SyncFileRecord | null>(null);
    const [inspectionData, setInspectionData] = useState<InboxFileInspection | null>(null);
    const [isInspecting, setIsInspecting] = useState(false);

    // Conflict State
    const [conflicts, setConflicts] = useState<ConflictItem[]>([]);
    const [isConflictModalOpen, setIsConflictModalOpen] = useState(false);
    const [currentFileToMerge, setCurrentFileToMerge] = useState<SyncFileRecord | null>(null);

    // Live query for SyncHistory & Local Stats
    const syncHistoryList = useLiveQuery(
        () => db.syncHistory.orderBy('mergedAt').reverse().toArray(),
        []
    ) || [];

    const localSummaryStats = useLiveQuery(async () => {
        const [santri, tagihan, pembayaran, absensi, tahfizh, pendaftar, transaksiKas] = await Promise.all([
            db.santri.count(),
            db.tagihan.count(),
            db.pembayaran.count(),
            db.absensi.count(),
            db.tahfizh.count(),
            db.pendaftar.count(),
            db.transaksiKas.count(),
        ]);
        return { santri, tagihan, pembayaran, absensi, tahfizh, pendaftar, transaksiKas };
    }, []);

    // Firebase Action State
    const [isFirebaseActionRunning, setIsFirebaseActionRunning] = useState<string | null>(null);

    const config = settings.cloudSyncConfig;

    const navigateToCloudSettings = () => {
        window.dispatchEvent(new CustomEvent('navigate-page', { detail: { page: Page.Pengaturan, tab: 'cloud' } }));
    };

    const openPanduanSync = (sectionId: string = 'cloud') => {
        window.dispatchEvent(new CustomEvent('open-panduan', { detail: sectionId }));
    };

    const fetchFilesAndStats = async () => {
        if (!config || config.provider === 'none' || config.provider === 'firebase') return;
        setIsLoading(true);
        try {
            const { listInboxFiles, getCloudStorageStats } = await loadSyncService();
            const [fileList, stats] = await Promise.all([
                listInboxFiles(config),
                getCloudStorageStats(config).catch(() => null),
            ]);
            if (stats) setStorageStats(stats);

            const historyIds = await db.syncHistory.toCollection().primaryKeys();
            const processedList = fileList.map(f => ({
                ...f,
                status: historyIds.includes(f.id) ? 'merged' : 'pending'
            })) as SyncFileRecord[];

            processedList.sort((a, b) => {
                if (a.status === b.status) {
                    return new Date(b.client_modified).getTime() - new Date(a.client_modified).getTime();
                }
                return a.status === 'pending' ? -1 : 1;
            });

            setFiles(processedList);
        } catch (e) {
            showToast(`Gagal memuat daftar file: ${(e as Error).message}`, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (config?.provider === 'firebase') {
            void initializeAuthState();
        } else if (config && config.provider !== 'none') {
            void fetchFilesAndStats();
        }
    }, [config?.provider]);

    const handleInspectFile = async (file: SyncFileRecord) => {
        setInspectingFile(file);
        setInspectionData(null);
        setIsInspecting(true);
        try {
            const { inspectInboxFile } = await loadSyncService();
            const detail = await inspectInboxFile(config, file);
            setInspectionData(detail);
        } catch (e) {
            showToast(`Gagal memeriksa isi file: ${(e as Error).message}`, 'error');
            setInspectingFile(null);
        } finally {
            setIsInspecting(false);
        }
    };

    const handleMerge = async (file: SyncFileRecord, resolveConflicts?: ConflictItem[]): Promise<boolean> => {
        setProcessingId(file.id);
        try {
            const { processInboxFile } = await loadSyncService();
            const result = await processInboxFile(config, file, resolveConflicts);

            if (result.conflicts && result.conflicts.length > 0) {
                setConflicts(result.conflicts);
                setCurrentFileToMerge(file);
                setIsConflictModalOpen(true);
                return false;
            }

            const mergerIdentity = currentUser?.fullName || currentUser?.username || 'Admin Pengepul';

            await db.syncHistory.put({
                id: file.id,
                fileId: file.id,
                fileName: file.name,
                mergedAt: new Date().toISOString(),
                mergedBy: mergerIdentity,
                recordCount: result.recordCount || 0
            });

            showToast(`Berhasil menggabungkan ${result.recordCount} data dari ${parseSenderFromFilename(file.name)}.`, 'success');

            setFiles(prev => prev.map(f => f.id === file.id ? { ...f, status: 'merged' } : f));
            setConflicts([]);
            setIsConflictModalOpen(false);
            setHasUnpublishedMerge(true);
            return true;
        } catch (e) {
            showAlert('Gagal Menggabungkan Data', (e as Error).message);
            return false;
        } finally {
            setProcessingId(null);
        }
    };

    const handleBatchMergeAll = async () => {
        const pendingList = files.filter(f => f.status === 'pending');
        if (pendingList.length === 0) {
            showToast('Tidak ada file berstatus "Baru" untuk digabungkan.', 'info');
            return;
        }

        showConfirmation(
            `Gabung Semua (${pendingList.length} File)?`,
            `Sistem akan menggabungkan ${pendingList.length} file kiriman staff secara berurutan dari yang paling lama ke paling baru agar kronologi perubahan tetap akurat. Jika ditemukan konflik data, proses akan berhenti sejenak untuk meminta keputusan Anda.`,
            async () => {
                setIsBatchMerging(true);
                // Sort oldest to newest for chronological merging
                const chronological = [...pendingList].sort(
                    (a, b) => new Date(a.client_modified).getTime() - new Date(b.client_modified).getTime()
                );

                let mergedCount = 0;
                for (const file of chronological) {
                    const ok = await handleMerge(file);
                    if (!ok) {
                        // Paused due to conflict or error
                        break;
                    }
                    mergedCount++;
                }
                setIsBatchMerging(false);
                if (mergedCount > 0) {
                    showToast(`${mergedCount} file berhasil digabungkan! Jangan lupa klik "Publikasikan Master".`, 'success');
                }
            },
            { confirmColor: 'teal', confirmText: `Ya, Gabung ${pendingList.length} File` }
        );
    };

    const handleConflictResolved = (resolvedList: ConflictItem[]) => {
        if (currentFileToMerge) {
            void handleMerge(currentFileToMerge, resolvedList);
        }
    };

    const handlePublishMaster = async () => {
        showConfirmation(
            'Publikasikan Master Data?',
            'Ini akan memperbarui file Master Data & Master Config di Cloud dengan data gabungan terbaru yang ada di komputer Anda saat ini. Seluruh staff dapat mengunduh pembaruan ini melalui tombol Ambil Master.',
            async () => {
                setIsLoading(true);
                try {
                    const { publishMasterData } = await loadSyncService();
                    const res = await publishMasterData(config);
                    if (settings.id) {
                        await db.settings.update(settings.id, {
                            cloudSyncConfig: { ...config, lastSync: res.timestamp }
                        });
                    }
                    setHasUnpublishedMerge(false);
                    showToast('Master Data Berhasil Dipublikasikan ke Cloud!', 'success');
                } catch (e) {
                    showAlert('Gagal Publikasi', (e as Error).message);
                } finally {
                    setIsLoading(false);
                }
            },
            { confirmColor: 'blue', confirmText: 'Ya, Publikasikan Master' }
        );
    };

    const handleDeleteFile = async (file: SyncFileRecord) => {
        showConfirmation(
            'Hapus File dari Cloud?',
            `File "${file.name}" kiriman ${parseSenderFromFilename(file.name)} akan dihapus permanen dari folder Inbox Cloud.`,
            async () => {
                try {
                    const { deleteInboxFile } = await loadSyncService();
                    await deleteInboxFile(config, file.path_lower);
                    setFiles(prev => prev.filter(f => f.id !== file.id));
                    showToast('File dihapus dari Cloud.', 'success');
                } catch (e) {
                    showToast('Gagal menghapus file.', 'error');
                }
            },
            { confirmColor: 'red', confirmText: 'Hapus Permanen' }
        );
    };

    const handleDeleteMerged = async () => {
        const mergedFiles = files.filter(f => f.status === 'merged');
        if (mergedFiles.length === 0) {
            showToast('Tidak ada file yang statusnya "Sudah Digabung" untuk dihapus.', 'info');
            return;
        }

        showConfirmation(
            'Bersihkan Inbox Cloud?',
            `Anda akan menghapus ${mergedFiles.length} file yang sudah digabungkan dari Cloud agar kapasitas penyimpanan tetap lega. Data yang sudah masuk ke database lokal Anda TIDAK akan terhapus. Lanjutkan?`,
            async () => {
                setIsLoading(true);
                try {
                    const { deleteMultipleInboxFiles } = await loadSyncService();
                    const paths = mergedFiles.map(f => f.path_lower);
                    await deleteMultipleInboxFiles(config, paths);
                    setFiles(prev => prev.filter(f => f.status !== 'merged'));
                    showToast(`${mergedFiles.length} file yang sudah digabung berhasil dibersihkan dari Cloud.`, 'success');
                } catch (e) {
                    showToast('Gagal membersihkan inbox.', 'error');
                } finally {
                    setIsLoading(false);
                }
            },
            { confirmColor: 'red', confirmText: 'Ya, Bersihkan Inbox' }
        );
    };

    const handleClearSyncHistory = () => {
        if (syncHistoryList.length === 0) return;
        showConfirmation(
            'Bersihkan Log Riwayat Penggabungan?',
            'Catatan riwayat penggabungan lokal akan dikosongkan. Perhatian: Jika masih ada file lama di Inbox Cloud yang belum dihapus, statusnya akan terbaca sebagai "Baru" kembali.',
            async () => {
                await db.syncHistory.clear();
                showToast('Riwayat penggabungan berhasil dibersihkan.', 'info');
                void fetchFilesAndStats();
            },
            { confirmColor: 'red', confirmText: 'Bersihkan Riwayat' }
        );
    };

    // Firebase Manual Control Handlers
    const handleFirebaseSyncAction = (action: 'up' | 'down' | 'psb') => {
        const activeTenantId = config.firebasePairedTenantId || fbUser?.uid;
        if (!activeTenantId) {
            showToast('Koneksi Firebase belum aktif. Silakan login Google atau masukkan kode Pairing terlebih dahulu.', 'error');
            return;
        }

        if (action === 'psb') {
            setIsFirebaseActionRunning('psb');
            loadFirebaseRealtimeRuntime()
                .then(({ syncPsbWithFirebaseHub }) => syncPsbWithFirebaseHub(activeTenantId))
                .then((res) => {
                    showToast(`Sinkronisasi PSB selesai! Ditarik: ${res.pulledCount}, Diunggah: ${res.pushedCount} (Total: ${res.total} pendaftar).`, 'success');
                })
                .catch((err) => {
                    showToast(`Gagal sinkronisasi PSB: ${(err as Error).message}`, 'error');
                })
                .finally(() => setIsFirebaseActionRunning(null));
            return;
        }

        const isPush = action === 'up';
        showConfirmation(
            isPush ? 'Unggah Paksa Semua Data Lokal ke Firebase?' : 'Tarik & Segarkan Semua Data dari Firebase?',
            isPush
                ? 'Seluruh tabel database di komputer ini akan diunggah ke Firebase Cloud Hub untuk memastikan seluruh perangkat staff menerima salinan terbaru.'
                : 'Aplikasi akan menarik seluruh dokumen terbaru dari Firebase Cloud Hub dan menyelaraskannya ke database lokal Anda.',
            async () => {
                setIsFirebaseActionRunning(action);
                try {
                    await triggerManualSync(isPush ? 'admin_publish' : 'down');
                } finally {
                    setIsFirebaseActionRunning(null);
                }
            },
            { confirmColor: isPush ? 'teal' : 'blue', confirmText: isPush ? 'Ya, Unggah Semua' : 'Ya, Tarik Semua' }
        );
    };

    const filteredFiles = useMemo(() => {
        return files.filter(f => {
            const sender = parseSenderFromFilename(f.name).toLowerCase();
            const matchSearch = !searchQuery.trim() ||
                f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                sender.includes(searchQuery.toLowerCase());
            const matchStatus = statusFilter === 'all' || f.status === statusFilter;
            return matchSearch && matchStatus;
        });
    }, [files, searchQuery, statusFilter]);

    const pendingFilesCount = useMemo(() => files.filter(f => f.status === 'pending').length, [files]);
    const mergedFilesCount = useMemo(() => files.filter(f => f.status === 'merged').length, [files]);

    if (!config || config.provider === 'none') {
        return (
            <div className="space-y-6">
                <PageHeader
                    eyebrow="Sistem"
                    title="Pusat Sinkronisasi Cloud"
                    description="Kelola kolaborasi multi-admin, penggabungan data staff, atau pantau koneksi real-time Firebase."
                />
                <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center max-w-2xl mx-auto shadow-xs">
                    <div className="w-16 h-16 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center mx-auto mb-4 text-3xl">
                        <i className="bi bi-cloud-slash"></i>
                    </div>
                    <h3 className="text-lg font-bold text-slate-800 mb-2">Sinkronisasi Cloud Belum Diaktifkan</h3>
                    <p className="text-sm text-slate-600 mb-6 leading-relaxed">
                        Pilih penyedia layanan Cloud terlebih dahulu di menu <strong>Pengaturan &gt; Sync Cloud</strong> (mendukung <strong>Firebase Realtime</strong> untuk kolaborasi otomatis, atau <strong>Dropbox / WebDAV Nextcloud</strong> untuk metode Hub &amp; Spoke).
                    </p>
                    <div className="flex flex-wrap justify-center gap-3">
                        <button onClick={navigateToCloudSettings} className="app-button-primary px-5 py-2.5 text-sm">
                            <i className="bi bi-gear-fill"></i> Buka Pengaturan Sync Cloud
                        </button>
                        <button onClick={() => openPanduanSync('cloud')} className="app-button-secondary px-5 py-2.5 text-sm">
                            <i className="bi bi-book-half"></i> Pelajari Panduan Cloud Sync
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // --- FIREBASE REAL-TIME CONTROL CENTER ---
    if (config.provider === 'firebase') {
        const activeTenantId = config.firebasePairedTenantId || fbUser?.uid;
        const isSpokeDevice = Boolean(config.firebasePairedTenantId && (!fbUser || config.firebasePairedTenantId !== fbUser.uid));
        const isConnected = Boolean(activeTenantId);

        return (
            <div className="space-y-6">
                <PageHeader
                    eyebrow="Sistem • Real-Time Sync"
                    title="Status & Kontrol Firebase Cloud"
                    description="Pantau kesehatan koneksi real-time antar perangkat, status Hub/Spoke, dan jalankan penyelarasan penuh bila diperlukan."
                    actions={
                        <div className="flex flex-wrap gap-2">
                            <button
                                onClick={() => openPanduanSync('firebase')}
                                className="app-button-secondary px-4 py-2.5 text-sm"
                            >
                                <i className="bi bi-book-half"></i> Panduan Firebase
                            </button>
                            <button
                                onClick={navigateToCloudSettings}
                                className="app-button-primary px-4 py-2.5 text-sm"
                            >
                                <i className="bi bi-sliders"></i> Konfigurasi & Pairing
                            </button>
                        </div>
                    }
                />

                {/* Status Hero Banner */}
                <div className={`rounded-2xl border p-6 shadow-xs ${isConnected ? 'bg-gradient-to-br from-teal-50 via-white to-emerald-50/60 border-teal-200' : 'bg-amber-50/70 border-amber-200'}`}>
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                        <div className="flex items-start gap-4">
                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 text-2xl shadow-xs ${isConnected ? 'bg-teal-600 text-white' : 'bg-amber-500 text-white'}`}>
                                <i className={`bi ${isConnected ? 'bi-cloud-check-fill' : 'bi-exclamation-triangle-fill'}`}></i>
                            </div>
                            <div>
                                <div className="flex flex-wrap items-center gap-2 mb-1">
                                    <h2 className="text-lg font-bold text-slate-900">
                                        {isConnected ? 'Sinkronisasi Real-Time Aktif' : 'Menunggu Otorisasi / Pairing Firebase'}
                                    </h2>
                                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${isConnected ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-amber-100 text-amber-800 border border-amber-200'}`}>
                                        {isSpokeDevice ? 'Perangkat Staff (Spoke)' : 'Admin Inti (Cloud Hub)'}
                                    </span>
                                </div>
                                <p className="text-sm text-slate-600 max-w-2xl">
                                    {isConnected
                                        ? 'Setiap penambahan, perubahan, dan penghapusan data langsung disinkronkan secara otomatis ke seluruh perangkat yang terhubung dalam Tenant yang sama tanpa perlu klik Gabung Data.'
                                        : 'Perangkat ini belum login ke akun Google Hub atau belum dipasangkan (Pairing). Silakan login atau buka menu Pengaturan > Sync Cloud.'}
                                </p>
                                <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-slate-600">
                                    <span className="inline-flex items-center gap-1.5 bg-white px-3 py-1 rounded-lg border border-slate-200 font-mono">
                                        <i className="bi bi-hdd-network text-teal-600"></i>
                                        Tenant ID: <strong>{activeTenantId ? `${activeTenantId.slice(0, 10)}...${activeTenantId.slice(-4)}` : 'Belum Terhubung'}</strong>
                                    </span>
                                    {fbUser?.email && (
                                        <span className="inline-flex items-center gap-1.5 bg-white px-3 py-1 rounded-lg border border-slate-200">
                                            <i className="bi bi-google text-blue-600"></i>
                                            Akun: <strong>{fbUser.email}</strong>
                                        </span>
                                    )}
                                    {config.lastSync && (
                                        <span className="inline-flex items-center gap-1.5 bg-white px-3 py-1 rounded-lg border border-slate-200">
                                            <i className="bi bi-clock-history text-slate-500"></i>
                                            Sinkronisasi Penuh Terakhir: <strong>{new Date(config.lastSync).toLocaleString('id-ID')}</strong>
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {!isConnected && (
                            <div className="shrink-0">
                                <button
                                    onClick={() => void login()}
                                    className="app-button-primary px-5 py-2.5 text-sm"
                                >
                                    <i className="bi bi-google"></i> Login Google Sekarang
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Action Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col justify-between shadow-2xs">
                        <div>
                            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-lg mb-3">
                                <i className="bi bi-cloud-arrow-down-fill"></i>
                            </div>
                            <h3 className="font-bold text-slate-800 text-sm mb-1">Tarik Semua Data dari Cloud</h3>
                            <p className="text-xs text-slate-500 leading-relaxed mb-4">
                                Unduh ulang seluruh koleksi data dari Firebase Hub ke perangkat ini. Gunakan jika perangkat baru selesai dipasang atau terasa ada data yang belum tampil.
                            </p>
                        </div>
                        <button
                            onClick={() => handleFirebaseSyncAction('down')}
                            disabled={!isConnected || !!isFirebaseActionRunning || syncStatus === 'syncing'}
                            className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors"
                        >
                            {isFirebaseActionRunning === 'down' ? (
                                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                            ) : (
                                <i className="bi bi-cloud-download"></i>
                            )}
                            Tarik &amp; Segarkan dari Firebase
                        </button>
                    </div>

                    <div className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col justify-between shadow-2xs">
                        <div>
                            <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center text-lg mb-3">
                                <i className="bi bi-cloud-arrow-up-fill"></i>
                            </div>
                            <h3 className="font-bold text-slate-800 text-sm mb-1">Unggah Paksa Database Lokal</h3>
                            <p className="text-xs text-slate-500 leading-relaxed mb-4">
                                Dorong seluruh isi database lokal Anda ke Firebase Hub sekaligus. Berguna setelah melakukan <em>Restore Backup</em> atau import Excel massal.
                            </p>
                        </div>
                        <button
                            onClick={() => handleFirebaseSyncAction('up')}
                            disabled={!isConnected || !!isFirebaseActionRunning || syncStatus === 'syncing'}
                            className="w-full py-2.5 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors"
                        >
                            {isFirebaseActionRunning === 'up' ? (
                                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                            ) : (
                                <i className="bi bi-cloud-upload"></i>
                            )}
                            Unggah Semua ke Firebase
                        </button>
                    </div>

                    <div className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col justify-between shadow-2xs">
                        <div>
                            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center text-lg mb-3">
                                <i className="bi bi-person-plus-fill"></i>
                            </div>
                            <h3 className="font-bold text-slate-800 text-sm mb-1">Sinkronisasi Data PSB</h3>
                            <p className="text-xs text-slate-500 leading-relaxed mb-4">
                                Selaraskan dua arah khusus untuk data Pendaftar Santri Baru (PSB) antara posko pendaftaran lokal dan Firebase Cloud Hub.
                            </p>
                        </div>
                        <button
                            onClick={() => handleFirebaseSyncAction('psb')}
                            disabled={!isConnected || !!isFirebaseActionRunning}
                            className="w-full py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors"
                        >
                            {isFirebaseActionRunning === 'psb' ? (
                                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                            ) : (
                                <i className="bi bi-arrow-left-right"></i>
                            )}
                            Sinkronkan Pendaftar PSB
                        </button>
                    </div>
                </div>

                {/* Local Replicated Records Summary */}
                <SectionCard
                    title="Ringkasan Data Lokal Tersinkronisasi"
                    description="Jumlah dokumen aktif di perangkat ini yang terhubung dengan listener real-time Firebase."
                    contentClassName="p-5 sm:p-6"
                >
                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                        {[
                            { label: 'Santri', value: localSummaryStats?.santri ?? 0, icon: 'bi-people-fill', color: 'text-teal-600 bg-teal-50' },
                            { label: 'Tagihan', value: localSummaryStats?.tagihan ?? 0, icon: 'bi-receipt', color: 'text-amber-600 bg-amber-50' },
                            { label: 'Pembayaran', value: localSummaryStats?.pembayaran ?? 0, icon: 'bi-cash-stack', color: 'text-emerald-600 bg-emerald-50' },
                            { label: 'Buku Kas', value: localSummaryStats?.transaksiKas ?? 0, icon: 'bi-journal-album', color: 'text-blue-600 bg-blue-50' },
                            { label: 'Absensi', value: localSummaryStats?.absensi ?? 0, icon: 'bi-calendar-check-fill', color: 'text-indigo-600 bg-indigo-50' },
                            { label: 'Tahfizh', value: localSummaryStats?.tahfizh ?? 0, icon: 'bi-journal-richtext', color: 'text-purple-600 bg-purple-50' },
                            { label: 'PSB', value: localSummaryStats?.pendaftar ?? 0, icon: 'bi-person-plus-fill', color: 'text-rose-600 bg-rose-50' },
                        ].map((item) => (
                            <div key={item.label} className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-3.5">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{item.label}</span>
                                    <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-sm ${item.color}`}>
                                        <i className={`bi ${item.icon}`}></i>
                                    </span>
                                </div>
                                <div className="text-xl font-black text-slate-800">{item.value.toLocaleString('id-ID')}</div>
                            </div>
                        ))}
                    </div>
                </SectionCard>
            </div>
        );
    }

    // --- DROPBOX / WEBDAV HUB & SPOKE DASHBOARD ---
    const providerLabel = config.provider === 'webdav' ? 'WebDAV / Nextcloud' : 'Dropbox Cloud';
    const providerIcon = config.provider === 'webdav' ? 'bi-hdd-network text-orange-600' : 'bi-dropbox text-blue-600';
    const providerBg = config.provider === 'webdav' ? 'bg-orange-50 border-orange-200 text-orange-800' : 'bg-blue-50 border-blue-200 text-blue-800';

    return (
        <div className="space-y-6">
            <PageHeader
                eyebrow="Sistem • Hub & Spoke"
                title="Pusat Sinkronisasi Cloud"
                description="Kelola kiriman data dari staff, periksa rincian perubahan, selesaikan konflik, dan publikasikan Master Data terbaru."
                actions={
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={fetchFilesAndStats}
                            disabled={isLoading || isBatchMerging}
                            className="app-button-secondary px-4 py-2.5 text-sm"
                        >
                            <i className={`bi bi-arrow-repeat ${isLoading ? 'animate-spin' : ''}`}></i> Segarkan Inbox
                        </button>
                        {pendingFilesCount > 1 && (
                            <button
                                onClick={handleBatchMergeAll}
                                disabled={isLoading || isBatchMerging || !!processingId}
                                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-bold text-sm flex items-center gap-2 shadow-xs transition-colors"
                            >
                                {isBatchMerging ? (
                                    <span className="animate-spin h-4 w-4 border-2 border-white rounded-full border-t-transparent"></span>
                                ) : (
                                    <i className="bi bi-collection-play-fill"></i>
                                )}
                                Gabung Semua ({pendingFilesCount})
                            </button>
                        )}
                        <button
                            onClick={handlePublishMaster}
                            disabled={isLoading || isBatchMerging}
                            className="app-button-primary px-4 py-2.5 text-sm"
                        >
                            {isLoading ? (
                                <span className="animate-spin h-4 w-4 border-2 border-white rounded-full border-t-transparent"></span>
                            ) : (
                                <i className="bi bi-cloud-arrow-up-fill"></i>
                            )}
                            Publikasikan Master
                        </button>
                    </div>
                }
                tabs={<HeaderTabs tabs={HUB_TABS} value={activeTab} onChange={setActiveTab} />}
            />

            {/* Unpublished Merge Reminder Banner */}
            {hasUnpublishedMerge && (
                <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs animate-fade-in">
                    <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 text-lg">
                            <i className="bi bi-megaphone-fill"></i>
                        </div>
                        <div>
                            <h4 className="font-bold text-amber-950 text-sm">Data Gabungan Belum Dipublikasikan ke Master Cloud!</h4>
                            <p className="text-xs text-amber-800 mt-0.5">
                                Anda baru saja menggabungkan kiriman data dari staff ke komputer ini. Klik <strong>Publikasikan Master</strong> agar seluruh staff lain bisa mengunduh data gabungan terbaru.
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={handlePublishMaster}
                        disabled={isLoading}
                        className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold whitespace-nowrap shadow-xs transition-colors"
                    >
                        <i className="bi bi-cloud-arrow-up-fill mr-1.5"></i> Publikasikan Sekarang
                    </button>
                </div>
            )}

            {/* Summary KPI Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center gap-3.5 shadow-2xs">
                    <div className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center text-xl shrink-0">
                        <i className={`bi ${providerIcon}`}></i>
                    </div>
                    <div className="min-w-0">
                        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Penyedia Cloud</div>
                        <div className="text-sm font-bold text-slate-800 truncate">{providerLabel}</div>
                        <button onClick={navigateToCloudSettings} className="text-[11px] text-teal-600 hover:underline font-semibold">
                            Ubah Konfigurasi &rarr;
                        </button>
                    </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center gap-3.5 shadow-2xs">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0 ${pendingFilesCount > 0 ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'}`}>
                        <i className={`bi ${pendingFilesCount > 0 ? 'bi-envelope-exclamation-fill' : 'bi-check2-all'}`}></i>
                    </div>
                    <div>
                        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Antrean Inbox Staff</div>
                        <div className="text-lg font-black text-slate-800">
                            {pendingFilesCount} <span className="text-xs font-medium text-slate-500">File Baru</span>
                        </div>
                        <div className="text-[11px] text-slate-500">{mergedFilesCount} file sudah digabung</div>
                    </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center gap-3.5 shadow-2xs">
                    <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-xl shrink-0">
                        <i className="bi bi-clock-history"></i>
                    </div>
                    <div className="min-w-0">
                        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Publikasi / Sync Terakhir</div>
                        <div className="text-xs font-bold text-slate-800 truncate">
                            {config.lastSync ? new Date(config.lastSync).toLocaleString('id-ID') : 'Belum Pernah'}
                        </div>
                        <div className="text-[11px] text-slate-500">
                            {pendingChanges > 0 ? `${pendingChanges} perubahan lokal belum dipublish` : 'Database lokal sinkron'}
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center gap-3.5 shadow-2xs">
                    <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center text-xl shrink-0">
                        <i className="bi bi-hdd-fill"></i>
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Kapasitas Cloud</div>
                        {storageStats && storageStats.total > 0 ? (
                            <>
                                <div className="text-xs font-bold text-slate-800">
                                    {formatBytes(storageStats.used)} <span className="text-slate-400 font-normal">/ {formatBytes(storageStats.total)}</span>
                                </div>
                                <div className="w-full h-1.5 bg-slate-100 rounded-full mt-1.5 overflow-hidden">
                                    <div
                                        className={`h-full rounded-full ${storageStats.percent > 85 ? 'bg-red-500' : 'bg-purple-600'}`}
                                        style={{ width: `${Math.min(storageStats.percent, 100)}%` }}
                                    />
                                </div>
                            </>
                        ) : (
                            <div className="text-xs font-semibold text-slate-600 mt-0.5">Aktif &amp; Terhubung</div>
                        )}
                    </div>
                </div>
            </div>

            {activeTab === 'inbox' && (
                <SectionCard
                    title="Inbox: Update dari Staff"
                    description={`Daftar paket perubahan data yang disetor oleh staff ke folder ${config.provider === 'webdav' ? 'WebDAV' : 'Dropbox'}.`}
                    actions={
                        mergedFilesCount > 0 ? (
                            <button
                                onClick={handleDeleteMerged}
                                disabled={isLoading}
                                className="text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-xl text-xs font-bold border border-red-200 flex items-center gap-1.5 transition-colors"
                            >
                                <i className="bi bi-trash3-fill"></i> Bersihkan yang Sudah Digabung ({mergedFilesCount})
                            </button>
                        ) : undefined
                    }
                    contentClassName="overflow-hidden p-0"
                >
                    {/* Filter & Search Bar */}
                    <div className="px-6 py-3.5 bg-slate-50/80 border-b border-app-border flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-slate-200 w-fit">
                            {([
                                { id: 'all', label: `Semua (${files.length})` },
                                { id: 'pending', label: `Baru (${pendingFilesCount})` },
                                { id: 'merged', label: `Sudah Digabung (${mergedFilesCount})` },
                            ] as const).map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setStatusFilter(tab.id)}
                                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${statusFilter === tab.id ? 'bg-teal-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        <div className="relative w-full sm:w-64">
                            <i className="bi bi-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Cari nama pengirim atau file..."
                                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                            />
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="app-table w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-500 border-b border-app-border text-xs uppercase">
                                <tr>
                                    <th className="px-6 py-3 font-semibold">Pengirim (Staff)</th>
                                    <th className="px-6 py-3 font-semibold">Nama File</th>
                                    <th className="px-6 py-3 font-semibold">Ukuran</th>
                                    <th className="px-6 py-3 font-semibold">Waktu Setor</th>
                                    <th className="px-6 py-3 font-semibold text-center">Status</th>
                                    <th className="px-6 py-3 font-semibold text-right">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredFiles.map(file => {
                                    const senderName = parseSenderFromFilename(file.name);
                                    return (
                                        <tr key={file.id} className="hover:bg-slate-50/80 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2.5">
                                                    <div className="w-8 h-8 rounded-full bg-teal-50 text-teal-700 border border-teal-200 flex items-center justify-center font-bold text-xs uppercase shrink-0">
                                                        {senderName.slice(0, 2)}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-slate-800 text-sm">{senderName}</div>
                                                        <div className="text-[11px] text-slate-400">Operator / Staff</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 font-mono text-xs text-slate-600">
                                                <div className="flex items-center gap-2">
                                                    <i className="bi bi-file-earmark-zip text-blue-500 text-base"></i>
                                                    <span className="truncate max-w-[200px]" title={file.name}>{file.name}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-slate-500 font-mono text-xs">{formatBytes(file.size)}</td>
                                            <td className="px-6 py-4 text-slate-600 text-xs">
                                                {new Date(file.client_modified).toLocaleString('id-ID', {
                                                    dateStyle: 'medium',
                                                    timeStyle: 'short'
                                                })}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {file.status === 'merged' ? (
                                                    <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full text-xs font-bold">
                                                        <i className="bi bi-check-circle-fill"></i> Sudah Digabung
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 px-2.5 py-1 rounded-full text-xs font-bold">
                                                        <i className="bi bi-clock-fill"></i> Baru
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="inline-flex items-center justify-end gap-1.5">
                                                    <button
                                                        onClick={() => void handleInspectFile(file)}
                                                        className="text-slate-600 hover:text-teal-700 hover:bg-teal-50 px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 transition-colors"
                                                        title="Intip Rincian Isi File"
                                                    >
                                                        <i className="bi bi-eye"></i> Rincian
                                                    </button>
                                                    {file.status !== 'merged' && (
                                                        <button
                                                            onClick={() => void handleMerge(file)}
                                                            disabled={!!processingId || isBatchMerging}
                                                            className="text-white bg-teal-600 hover:bg-teal-700 px-3 py-1.5 rounded-lg text-xs font-bold disabled:bg-slate-300 transition-colors flex items-center gap-1"
                                                        >
                                                            {processingId === file.id ? (
                                                                <>
                                                                    <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                                                                    <span>Memproses...</span>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <i className="bi bi-diagram-2-fill"></i>
                                                                    <span>Gabung</span>
                                                                </>
                                                            )}
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => void handleDeleteFile(file)}
                                                        disabled={!!processingId || isBatchMerging}
                                                        className="text-red-600 hover:bg-red-50 px-2.5 py-1.5 rounded-lg border border-transparent hover:border-red-200 transition-colors"
                                                        title="Hapus File dari Cloud"
                                                    >
                                                        <i className="bi bi-trash"></i>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {filteredFiles.length === 0 && !isLoading && (
                                    <tr>
                                        <td colSpan={6} className="p-6">
                                            <EmptyState
                                                icon="bi-cloud-check"
                                                title={files.length === 0 ? 'Inbox sinkronisasi kosong' : 'Tidak ada file yang cocok'}
                                                description={files.length === 0 ? 'Belum ada file kiriman baru dari staff di Cloud untuk digabungkan.' : 'Coba ubah kata kunci pencarian atau filter status di atas.'}
                                            />
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </SectionCard>
            )}

            {activeTab === 'history' && (
                <SectionCard
                    title="Riwayat Penggabungan Data (Lokal)"
                    description="Log audit file kiriman staff yang telah berhasil digabungkan ke database komputer Admin ini."
                    actions={
                        syncHistoryList.length > 0 ? (
                            <button
                                onClick={handleClearSyncHistory}
                                className="text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-xl text-xs font-bold border border-red-200 flex items-center gap-1.5 transition-colors"
                            >
                                <i className="bi bi-trash"></i> Bersihkan Log Riwayat
                            </button>
                        ) : undefined
                    }
                    contentClassName="overflow-hidden p-0"
                >
                    <div className="overflow-x-auto">
                        <table className="app-table w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-500 border-b border-app-border text-xs uppercase">
                                <tr>
                                    <th className="px-6 py-3 font-semibold">Waktu Digabung</th>
                                    <th className="px-6 py-3 font-semibold">Pengirim File</th>
                                    <th className="px-6 py-3 font-semibold">Nama File</th>
                                    <th className="px-6 py-3 font-semibold text-center">Jumlah Data Masuk</th>
                                    <th className="px-6 py-3 font-semibold">Dieksekusi Oleh</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {syncHistoryList.map((item) => (
                                    <tr key={item.id} className="hover:bg-slate-50/80">
                                        <td className="px-6 py-3.5 text-xs text-slate-600">
                                            {new Date(item.mergedAt).toLocaleString('id-ID', {
                                                dateStyle: 'medium',
                                                timeStyle: 'short'
                                            })}
                                        </td>
                                        <td className="px-6 py-3.5 font-bold text-slate-800 text-xs">
                                            {parseSenderFromFilename(item.fileName)}
                                        </td>
                                        <td className="px-6 py-3.5 font-mono text-xs text-slate-500">
                                            {item.fileName}
                                        </td>
                                        <td className="px-6 py-3.5 text-center">
                                            <span className="inline-flex items-center gap-1 bg-teal-50 text-teal-700 border border-teal-200 px-2.5 py-0.5 rounded-full text-xs font-bold">
                                                +{item.recordCount.toLocaleString('id-ID')} baris
                                            </span>
                                        </td>
                                        <td className="px-6 py-3.5 text-xs text-slate-700 font-medium">
                                            <i className="bi bi-person-check-fill text-teal-600 mr-1.5"></i>
                                            {item.mergedBy}
                                        </td>
                                    </tr>
                                ))}
                                {syncHistoryList.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="p-6">
                                            <EmptyState
                                                icon="bi-clock-history"
                                                title="Belum ada riwayat penggabungan"
                                                description="Setiap kali Anda menggabungkan file dari tab Inbox, jejak waktunya akan tercatat di sini."
                                            />
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </SectionCard>
            )}

            {activeTab === 'panduan' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <SectionCard
                        title="SOP Admin Pengepul (Metode Hub & Spoke)"
                        description="Alur kerja standar agar data dari seluruh staff tetap selaras dan tidak saling menimpa."
                        contentClassName="p-5 sm:p-6"
                    >
                        <div className="space-y-3">
                            {[
                                {
                                    step: 1,
                                    title: 'Segarkan Inbox',
                                    desc: 'Klik tombol "Segarkan Inbox" di kanan atas untuk memeriksa apakah ada kiriman paket perubahan data baru dari ustadz/staff.',
                                    icon: 'bi-arrow-repeat',
                                    color: 'bg-blue-50 text-blue-600 border-blue-200'
                                },
                                {
                                    step: 2,
                                    title: 'Intip Rincian (Opsional)',
                                    desc: 'Klik tombol "Rincian" pada baris file untuk memverifikasi siapa pengirimnya dan tabel modul apa saja yang diubah sebelum digabungkan.',
                                    icon: 'bi-eye',
                                    color: 'bg-teal-50 text-teal-600 border-teal-200'
                                },
                                {
                                    step: 3,
                                    title: 'Gabung Data (Satu per Satu atau Sekaligus)',
                                    desc: 'Klik "Gabung" atau "Gabung Semua". Sistem otomatis menggabungkan dari file paling awal ke terbaru agar urutan waktu akurat.',
                                    icon: 'bi-diagram-2-fill',
                                    color: 'bg-emerald-50 text-emerald-600 border-emerald-200'
                                },
                                {
                                    step: 4,
                                    title: 'Publikasikan Master ke Cloud',
                                    desc: 'Setelah seluruh file berstatus "Sudah Digabung", wajib klik "Publikasikan Master" agar seluruh staff dapat mengunduh Master Data terbaru.',
                                    icon: 'bi-cloud-arrow-up-fill',
                                    color: 'bg-indigo-50 text-indigo-600 border-indigo-200'
                                },
                                {
                                    step: 5,
                                    title: 'Bersihkan Inbox Secara Berkala',
                                    desc: 'Gunakan tombol "Bersihkan yang Sudah Digabung" agar kapasitas penyimpanan Dropbox / WebDAV tetap lega.',
                                    icon: 'bi-trash3-fill',
                                    color: 'bg-amber-50 text-amber-600 border-amber-200'
                                },
                            ].map((item) => (
                                <div key={item.step} className="flex items-start gap-3.5 p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/60">
                                    <div className={`w-8 h-8 rounded-lg border flex items-center justify-center font-bold text-xs shrink-0 ${item.color}`}>
                                        {item.step}
                                    </div>
                                    <div className="min-w-0">
                                        <h4 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                                            <i className={`bi ${item.icon} text-xs opacity-75`}></i>
                                            {item.title}
                                        </h4>
                                        <p className="text-xs text-slate-600 mt-1 leading-relaxed">{item.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </SectionCard>

                    <SectionCard
                        title="Panduan Resolusi Konflik Data"
                        description="Apa yang harus dilakukan ketika Admin dan Staff mengedit data santri/rekaman yang sama?"
                        contentClassName="p-5 sm:p-6 flex flex-col justify-between"
                    >
                        <div className="space-y-4">
                            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 leading-relaxed flex items-start gap-3">
                                <i className="bi bi-exclamation-triangle-fill text-amber-600 text-base shrink-0 mt-0.5"></i>
                                <div>
                                    Jika data yang dikirim staff ternyata memiliki versi lokal yang lebih baru di komputer Admin, jendela <strong>Resolusi Konflik</strong> akan terbuka secara otomatis untuk seluruh tabel yang bentrok.
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="p-3.5 rounded-xl border border-blue-200 bg-blue-50/40">
                                    <div className="font-bold text-blue-900 text-sm flex items-center gap-2">
                                        <i className="bi bi-laptop text-blue-600"></i>
                                        Gunakan Semua Data Lokal
                                    </div>
                                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                                        Mempertahankan seluruh kolom data yang ada di komputer Admin saat ini dan mengabaikan perubahan dari staff pada item tersebut.
                                    </p>
                                </div>

                                <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/40">
                                    <div className="font-bold text-emerald-900 text-sm flex items-center gap-2">
                                        <i className="bi bi-cloud-check text-emerald-600"></i>
                                        Gunakan Semua Data Staff
                                    </div>
                                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                                        Menerima penuh pembaruan yang dikirim oleh staff dan menimpa versi lokal komputer Admin untuk item tersebut.
                                    </p>
                                </div>

                                <div className="p-3.5 rounded-xl border border-purple-200 bg-purple-50/40">
                                    <div className="font-bold text-purple-900 text-sm flex items-center gap-2">
                                        <i className="bi bi-stars text-purple-600"></i>
                                        Mix &amp; Match (Campuran per Kolom)
                                    </div>
                                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                                        Anda dapat mengklik kotak kolom tertentu di sisi kiri (Lokal) dan kolom lain di sisi kanan (Staff), lalu klik <strong>Simpan Hasil Campuran</strong>.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="pt-5 mt-5 border-t border-slate-200 flex items-center justify-between gap-3">
                            <span className="text-xs text-slate-500">Butuh penjelasan alur multi-admin lebih lengkap?</span>
                            <button
                                onClick={() => openPanduanSync('admin')}
                                className="app-button-secondary px-4 py-2 text-xs shrink-0"
                            >
                                <i className="bi bi-book-half"></i> Buka Dokumentasi Multi-Admin
                            </button>
                        </div>
                    </SectionCard>
                </div>
            )}

            {/* Inspect Payload Modal */}
            {inspectingFile && (
                <div
                    className="fixed inset-0 bg-black/60 z-[95] flex items-center justify-center p-4 backdrop-blur-xs"
                    onClick={() => setInspectingFile(null)}
                >
                    <div
                        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 animate-scale-up"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center text-lg">
                                    <i className="bi bi-file-earmark-medical-fill"></i>
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800 text-base">Rincian Paket Sinkronisasi</h3>
                                    <p className="text-xs text-slate-500 font-mono truncate max-w-[280px]">{inspectingFile.name}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setInspectingFile(null)}
                                className="w-8 h-8 rounded-full hover:bg-slate-200 flex items-center justify-center text-slate-500"
                            >
                                <i className="bi bi-x-lg"></i>
                            </button>
                        </div>

                        <div className="p-6 max-h-[70vh] overflow-y-auto space-y-4">
                            {isInspecting ? (
                                <div className="py-12 text-center space-y-3">
                                    <div className="h-8 w-8 animate-spin rounded-full border-3 border-teal-600 border-t-transparent mx-auto"></div>
                                    <p className="text-xs text-slate-500">Mengunduh dan memeriksa isi paket dari Cloud...</p>
                                </div>
                            ) : inspectionData ? (
                                <>
                                    <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs">
                                        <div>
                                            <span className="text-slate-400 block uppercase font-bold text-[10px]">Pengirim</span>
                                            <span className="font-bold text-slate-800 text-sm">{inspectionData.sender}</span>
                                        </div>
                                        <div>
                                            <span className="text-slate-400 block uppercase font-bold text-[10px]">Waktu Paket Dibuat</span>
                                            <span className="font-semibold text-slate-700">
                                                {new Date(inspectionData.timestamp).toLocaleString('id-ID')}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-slate-400 block uppercase font-bold text-[10px]">Tipe Sinkronisasi</span>
                                            <span className="font-semibold text-teal-700">
                                                {inspectionData.isIncremental ? 'Inkremental (Hanya Perubahan)' : 'Salinan Penuh (Full Sync)'}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-slate-400 block uppercase font-bold text-[10px]">Total Baris Data</span>
                                            <span className="font-black text-slate-800 text-sm">
                                                {inspectionData.totalRecords.toLocaleString('id-ID')} Record
                                            </span>
                                        </div>
                                    </div>

                                    <div>
                                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                                            Rincian Tabel yang Diubah ({inspectionData.tableBreakdown.length} Modul)
                                        </h4>
                                        {inspectionData.tableBreakdown.length === 0 ? (
                                            <p className="text-xs text-slate-500 italic py-4 text-center">Tidak ada baris perubahan data di dalam file ini.</p>
                                        ) : (
                                            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                                                {inspectionData.tableBreakdown.map((tb) => (
                                                    <div key={tb.tableName} className="px-4 py-2.5 flex items-center justify-between bg-white hover:bg-slate-50 text-xs">
                                                        <div>
                                                            <span className="font-semibold text-slate-800">{tb.label}</span>
                                                            <span className="ml-2 font-mono text-[10px] text-slate-400">({tb.tableName})</span>
                                                        </div>
                                                        <span className="font-bold text-teal-700 bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-200">
                                                            {tb.count.toLocaleString('id-ID')} data
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </>
                            ) : null}
                        </div>

                        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
                            <button
                                onClick={() => setInspectingFile(null)}
                                className="app-button-secondary px-4 py-2 text-xs"
                            >
                                Tutup
                            </button>
                            {inspectingFile.status !== 'merged' && !isInspecting && (
                                <button
                                    onClick={() => {
                                        const target = inspectingFile;
                                        setInspectingFile(null);
                                        void handleMerge(target);
                                    }}
                                    className="app-button-primary px-4 py-2 text-xs"
                                >
                                    <i className="bi bi-diagram-2-fill"></i> Gabungkan File Ini Sekarang
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Conflict Resolver Modal */}
            <ConflictResolver
                isOpen={isConflictModalOpen}
                conflicts={conflicts}
                onResolve={handleConflictResolved}
                onCancel={() => { setIsConflictModalOpen(false); setConflicts([]); }}
            />
        </div>
    );
};
