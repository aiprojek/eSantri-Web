import React, { Suspense, useState, useEffect } from 'react';
import { PondokSettings, SyncProvider, SyncModelType, StorageStats } from '../../../types';
import { useAppContext } from '../../../AppContext';
import { db } from '../../../db';
import { useFirebase } from '../../../contexts/FirebaseContext';
import { formatBytes } from '../../../utils/formatters';
import { loadSyncService } from '../../../utils/lazyCloudServices';
import { loadFirebaseRealtimeRuntime } from '../../../utils/lazyFirebaseRuntimes';
import { LoadingFallback } from '../../common/LoadingFallback';
import { SectionCard } from '../../common/SectionCard';

const FirebaseCloudPanel = React.lazy(() => import('../cloud/FirebaseCloudPanel').then((module) => ({ default: module.FirebaseCloudPanel })));
const SupabaseCloudPanel = React.lazy(() => import('../cloud/SupabaseCloudPanel').then((module) => ({ default: module.SupabaseCloudPanel })));
const CloudflareD1Panel = React.lazy(() => import('../cloud/CloudflareD1Panel').then((module) => ({ default: module.CloudflareD1Panel })));
const R2CloudPanel = React.lazy(() => import('../cloud/R2CloudPanel').then((module) => ({ default: module.R2CloudPanel })));
const DropboxCloudPanel = React.lazy(() => import('../cloud/DropboxCloudPanel').then((module) => ({ default: module.DropboxCloudPanel })));
const WebDavCloudPanel = React.lazy(() => import('../cloud/WebDavCloudPanel').then((module) => ({ default: module.WebDavCloudPanel })));
const CloudPairingPanel = React.lazy(() => import('../cloud/CloudPairingPanel').then((module) => ({ default: module.CloudPairingPanel })));
const CloudPairingModals = React.lazy(() => import('../cloud/CloudPairingModals').then((module) => ({ default: module.CloudPairingModals })));

const StorageIndicator: React.FC<{ stats: StorageStats | null, isLoading: boolean, provider: SyncProvider }> = ({ stats, isLoading, provider }) => {
    if (isLoading) return <div className="mt-2 animate-pulse text-xs text-slate-500">Memuat data kapasitas penyimpanan cloud...</div>;
    if (!stats) return null;

    const percent = stats.percent || 0;
    let colorClass = 'bg-blue-600';
    if (percent > 75) colorClass = 'bg-yellow-500';
    if (percent > 90) colorClass = 'bg-red-600';

    // Estimate remaining files (average master file size is ~500KB compressed)
    const avgFileSize = 512 * 1024; 
    const remainingSpace = (stats.total || 0) - (stats.used || 0);
    const estimatedFiles = stats.total ? Math.floor(remainingSpace / avgFileSize) : '∞';

    return (
        <div className="mt-3 rounded-xl border border-app-border bg-app-subtle p-4">
            <div className="flex justify-between items-center mb-3">
                <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700">
                    <i className="bi bi-cloud-check text-blue-500"></i> Kesehatan Cloud ({provider})
                </h4>
                <span className="text-[10px] text-slate-500">Cek: {new Date().toLocaleTimeString()}</span>
            </div>

            <div className="space-y-3">
                <div>
                    <div className="flex justify-between mb-1">
                        <span className="text-xs font-medium text-slate-700">Kapasitas Cloud</span>
                        <span className="text-xs font-medium text-slate-700">{formatBytes(stats.used)} / {stats.total ? formatBytes(stats.total) : 'Unlimited'}</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-200">
                        <div className={`${colorClass} h-2 rounded-full transition-all duration-500`} style={{ width: `${Math.min(percent, 100)}%` }}></div>
                    </div>
                    <div className="flex justify-between mt-1">
                        <span className="text-[10px] text-slate-500">{percent.toFixed(1)}% Terpakai</span>
                        <span className="text-[10px] text-slate-500">Sisa: {stats.total ? formatBytes(remainingSpace) : 'Unlimited'}</span>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-2 border-t border-app-border pt-2">
                    <div className="rounded-lg border border-slate-100 bg-white p-2">
                        <p className="text-[9px] font-bold uppercase text-slate-500">Estimasi Sisa File</p>
                        <p className="text-sm font-bold text-slate-800">± {estimatedFiles} Backup</p>
                    </div>
                    <div className="rounded-lg border border-slate-100 bg-white p-2">
                        <p className="text-[9px] font-bold uppercase text-slate-500">Status Koneksi</p>
                        <p className="flex items-center gap-1 text-sm font-bold text-green-600">
                            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span> Aktif
                        </p>
                    </div>
                </div>

                {provider === 'dropbox' && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-2.5 text-[11px] text-amber-900 space-y-1">
                        <div className="flex items-center gap-1.5 font-bold text-amber-800">
                            <i className="bi bi-info-circle-fill text-amber-600"></i>
                            <span>Batasan Dropbox Basic (3 Perangkat):</span>
                        </div>
                        <p className="text-[10px] text-amber-950 leading-relaxed">
                            Kebijakan resmi Dropbox membatasi akun gratis maksimal terhubung ke 3 perangkat aktif. Jika pesantren memiliki lebih dari 3 staf/admin, beralihlah ke <strong>Cloudflare R2</strong> (10 GB gratis, tanpa batas perangkat, $0 biaya egress) atau <strong>WebDAV</strong>.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

interface TabCloudProps {
    localSettings: PondokSettings;
    setLocalSettings: React.Dispatch<React.SetStateAction<PondokSettings>>;
    onSaveSettings: (settings: PondokSettings) => Promise<void>;
}

export const TabCloud: React.FC<TabCloudProps> = ({ localSettings, setLocalSettings, onSaveSettings }) => {
    const { settings, showToast, showConfirmation, currentUser } = useAppContext();
    const { fbUser, login, logout, isFbLoading, initializeAuthState, joinTenant, createTenantInvite } = useFirebase();
    const [isConnectingDropbox, setIsConnectingDropbox] = useState(false);
    const [storageStats, setStorageStats] = useState<StorageStats | null>(null);
    const [isLoadingStats, setIsLoadingStats] = useState(false);
    const [isTestingWebDav, setIsTestingWebDav] = useState(false);
    
    // Manual Auth Flow State
    const [manualAuthCode, setManualAuthCode] = useState('');
    const [showCustomFirebase, setShowCustomFirebase] = useState(false);
    
    // Pairing States
    const [generatedCode, setGeneratedCode] = useState('');
    const [generatedCodeMode, setGeneratedCodeMode] = useState<'session' | 'invite'>('session');
    const [inputPairingCode, setInputPairingCode] = useState('');
    const [isProcessingPairing, setIsProcessingPairing] = useState(false);
    const [pairingStep, setPairingStep] = useState(''); 

    const saveSettingsSafely = async (candidate: PondokSettings) => {
        const dataToSave = { ...candidate };
        if (!dataToSave.cloudSyncConfig.dropboxAppKey && settings.cloudSyncConfig.dropboxAppKey) {
            dataToSave.cloudSyncConfig.dropboxAppKey = settings.cloudSyncConfig.dropboxAppKey;
        }
        if (!dataToSave.cloudSyncConfig.dropboxAppSecret && settings.cloudSyncConfig.dropboxAppSecret) {
            dataToSave.cloudSyncConfig.dropboxAppSecret = settings.cloudSyncConfig.dropboxAppSecret;
        }
        if (!dataToSave.cloudSyncConfig.webdavPassword && settings.cloudSyncConfig.webdavPassword) {
            dataToSave.cloudSyncConfig.webdavPassword = settings.cloudSyncConfig.webdavPassword;
        }
        if (!dataToSave.cloudSyncConfig.r2AccessKeyId && settings.cloudSyncConfig.r2AccessKeyId) {
            dataToSave.cloudSyncConfig.r2AccessKeyId = settings.cloudSyncConfig.r2AccessKeyId;
        }
        if (!dataToSave.cloudSyncConfig.r2SecretAccessKey && settings.cloudSyncConfig.r2SecretAccessKey) {
            dataToSave.cloudSyncConfig.r2SecretAccessKey = settings.cloudSyncConfig.r2SecretAccessKey;
        }
        if (!dataToSave.cloudSyncConfig.supabaseAnonKey && settings.cloudSyncConfig.supabaseAnonKey) {
            dataToSave.cloudSyncConfig.supabaseAnonKey = settings.cloudSyncConfig.supabaseAnonKey;
        }
        if (!dataToSave.cloudSyncConfig.d1ApiToken && settings.cloudSyncConfig.d1ApiToken) {
            dataToSave.cloudSyncConfig.d1ApiToken = settings.cloudSyncConfig.d1ApiToken;
        }
        await onSaveSettings(dataToSave);
    };

    useEffect(() => {
        const fetchStats = async () => {
            const config = settings.cloudSyncConfig;
            if (config.provider === 'none') {
                setStorageStats(null);
                return;
            }

            setIsLoadingStats(true);
            try {
                const { getCloudStorageStats } = await loadSyncService();
                if (config.provider === 'dropbox' && config.dropboxRefreshToken) {
                    const stats = await getCloudStorageStats(config);
                    setStorageStats(stats);
                } else if (config.provider === 'webdav' && config.webdavUrl) {
                    const stats = await getCloudStorageStats(config);
                    setStorageStats(stats);
                }
            } catch (error) {
                console.error("Cloud stats failed", error);
            } finally {
                setIsLoadingStats(false);
            }
        };
        fetchStats();
    }, [settings.cloudSyncConfig]);

    useEffect(() => {
        if (localSettings.cloudSyncConfig?.provider === 'firebase') {
            void initializeAuthState();
        }
    }, [initializeAuthState, localSettings.cloudSyncConfig?.provider]);

    // Current state resolution
    const currentProvider = localSettings.cloudSyncConfig?.provider || 'none';
    const currentModel: SyncModelType = localSettings.cloudSyncConfig?.syncModel || (
        currentProvider === 'none' ? 'none' :
        ['firebase', 'supabase', 'cloudflare_d1'].includes(currentProvider) ? 'realtime' : 'hub_spoke'
    );

    const handleModelChange = (model: SyncModelType) => {
        let newProvider: SyncProvider = 'none';
        if (model === 'realtime') {
            newProvider = ['firebase', 'supabase', 'cloudflare_d1'].includes(currentProvider) ? currentProvider : 'firebase';
        } else if (model === 'hub_spoke') {
            newProvider = ['cloudflare_r2', 'dropbox', 'webdav'].includes(currentProvider) ? currentProvider : 'cloudflare_r2';
        } else {
            newProvider = 'none';
        }
        setLocalSettings(prev => ({
            ...prev,
            cloudSyncConfig: {
                ...prev.cloudSyncConfig,
                syncModel: model,
                provider: newProvider
            }
        }));
        setStorageStats(null);
    };

    const handleSyncProviderChange = (provider: SyncProvider) => {
        const model: SyncModelType = provider === 'none' ? 'none' :
            ['firebase', 'supabase', 'cloudflare_d1'].includes(provider) ? 'realtime' : 'hub_spoke';
        setLocalSettings(prev => ({
            ...prev,
            cloudSyncConfig: { 
                ...prev.cloudSyncConfig, 
                provider,
                syncModel: model
            }
        }));
        setStorageStats(null);
    };

    const handleSyncConfigChange = (field: string, value: unknown) => {
        setLocalSettings(prev => ({
            ...prev,
            cloudSyncConfig: { ...prev.cloudSyncConfig, [field]: value }
        }));
    };

    const handleOpenDropboxAuth = () => {
        const appKey = localSettings.cloudSyncConfig.dropboxAppKey || settings.cloudSyncConfig.dropboxAppKey;
        if (!appKey) {
            showToast('Harap isi App Key terlebih dahulu.', 'error');
            return;
        }
        
        const redirectUri = window.location.origin;
        showConfirmation(
            'Pembaruan Keamanan Dropbox',
            `Dropbox telah menghapus fitur "Tampilkan Kode" (OOB). Sekarang Anda WAJIB mendaftarkan Redirect URI.\n\n1. Buka App Console Dropbox Anda.\n2. Tambahkan URL ini ke kolom Redirect URIs:\n   ${redirectUri}\n3. Klik Lanjutkan di bawah ini. Saat di-redirect kembali ke aplikasi web ini, silakan copy tulisan setelah "?code=" dari URL (Address Bar) browser Anda, lalu paste di langkah ke-2.`,
            () => {
                const authUrl = `https://www.dropbox.com/oauth2/authorize?client_id=${appKey}&response_type=code&token_access_type=offline&redirect_uri=${encodeURIComponent(redirectUri)}`;
                window.open(authUrl, '_blank', 'width=800,height=700');
            }
        );
    };

    const handleVerifyDropboxCode = async () => {
        const { dropboxAppKey, dropboxAppSecret } = localSettings.cloudSyncConfig;
        if (!dropboxAppKey || !dropboxAppSecret || !manualAuthCode) {
            showToast('App Key, App Secret, dan Kode Otorisasi wajib diisi.', 'error');
            return;
        }

        setIsConnectingDropbox(true);
        try {
            const redirectUri = window.location.origin;
            const { exchangeCodeForToken } = await loadSyncService();
            const result = await exchangeCodeForToken(dropboxAppKey, dropboxAppSecret, manualAuthCode, redirectUri);
            const updatedConfig = {
                ...settings.cloudSyncConfig,
                dropboxAppKey,
                dropboxAppSecret,
                dropboxToken: result.access_token,
                dropboxRefreshToken: result.refresh_token,
                dropboxTokenExpiresAt: Date.now() + (result.expires_in * 1000),
                provider: 'dropbox' as SyncProvider,
                syncModel: 'hub_spoke' as SyncModelType
            };
            
            const fullyUpdatedConfig = {
                ...localSettings.cloudSyncConfig,
                ...updatedConfig
            };
            await saveSettingsSafely({ ...localSettings, cloudSyncConfig: fullyUpdatedConfig });
            setManualAuthCode('');
            
            showToast('Berhasil terhubung dengan Dropbox! Kredensial telah disembunyikan demi keamanan.', 'success');
        } catch (error) {
            showToast(`Verifikasi Gagal: ${(error as Error).message}`, 'error');
        } finally {
            setIsConnectingDropbox(false);
        }
    };

    const handleTestWebDav = async () => {
        const { webdavUrl, webdavUsername, webdavPassword } = localSettings.cloudSyncConfig;
        if (!webdavUrl || !webdavUsername || !webdavPassword) {
            showToast('Harap lengkapi URL, Username, dan Password WebDAV.', 'error');
            return;
        }
        setIsTestingWebDav(true);
        try {
            const { getCloudStorageStats } = await loadSyncService();
            const stats = await getCloudStorageStats(localSettings.cloudSyncConfig);
            if (stats) setStorageStats(stats);
            await saveSettingsSafely(localSettings);
            showToast('Koneksi WebDAV Berhasil!', 'success');
        } catch (e) {
            showToast(`Gagal koneksi WebDAV: ${(e as Error).message}. Pastikan CORS diaktifkan di server Anda.`, 'error');
        } finally {
            setIsTestingWebDav(false);
        }
    };

    // --- PAIRING LOGIC (Universal: Real-Time & Hub & Spoke) ---

    const handleGeneratePairingCode = async () => {
        const config = localSettings.cloudSyncConfig;
        setGeneratedCodeMode('session');
        
        const effectiveDropboxKey = config.dropboxAppKey || settings.cloudSyncConfig.dropboxAppKey;
        const effectiveDropboxSecret = config.dropboxAppSecret || settings.cloudSyncConfig.dropboxAppSecret;
        const effectiveWebdavPassword = config.webdavPassword || settings.cloudSyncConfig.webdavPassword;
        const effectiveR2AccessKey = config.r2AccessKeyId || settings.cloudSyncConfig.r2AccessKeyId;
        const effectiveR2SecretKey = config.r2SecretAccessKey || settings.cloudSyncConfig.r2SecretAccessKey;
        const effectiveSupabaseAnon = config.supabaseAnonKey || settings.cloudSyncConfig.supabaseAnonKey;
        const effectiveD1Token = config.d1ApiToken || settings.cloudSyncConfig.d1ApiToken;

        let payloadString = '';

        if (config.provider === 'dropbox') {
            if (!config.dropboxRefreshToken) {
                showToast('Dropbox belum terhubung. Pastikan status sudah "Terhubung" sebelum membagikan akses.', 'error');
                return;
            }
            if (!effectiveDropboxKey || !effectiveDropboxSecret) {
                showToast('App Key atau App Secret belum diisi. Keduanya wajib ada bagi Admin untuk membagikan akses.', 'error');
                return;
            }
            payloadString = JSON.stringify({
                p: 'dropbox',
                k: effectiveDropboxKey,
                s: effectiveDropboxSecret,
                r: config.dropboxRefreshToken
            });
        } else if (config.provider === 'webdav') {
            if (!config.webdavUrl || !config.webdavUsername || !effectiveWebdavPassword) {
                showToast('Konfigurasi WebDAV belum lengkap. Harap isi URL, Username, dan Password.', 'error');
                return;
            }
            payloadString = JSON.stringify({
                p: 'webdav',
                u: config.webdavUrl,
                n: config.webdavUsername,
                w: effectiveWebdavPassword
            });
        } else if (config.provider === 'cloudflare_r2') {
            if (!config.r2AccountId || !effectiveR2AccessKey || !effectiveR2SecretKey || !config.r2BucketName) {
                showToast('Konfigurasi R2 belum lengkap. Harap isi Account ID, Bucket Name, dan Access Keys.', 'error');
                return;
            }
            payloadString = JSON.stringify({
                p: 'cloudflare_r2',
                a: config.r2AccountId,
                k: effectiveR2AccessKey,
                s: effectiveR2SecretKey,
                b: config.r2BucketName,
                e: config.r2Endpoint,
                u: config.r2PublicUrl
            });
        } else if (config.provider === 'supabase') {
            if (!config.supabaseUrl || !effectiveSupabaseAnon) {
                showToast('Konfigurasi Supabase belum lengkap. Harap isi Project URL dan Anon Key.', 'error');
                return;
            }
            payloadString = JSON.stringify({
                p: 'supabase',
                u: config.supabaseUrl,
                k: effectiveSupabaseAnon,
                pr: config.supabaseTablePrefix
            });
        } else if (config.provider === 'cloudflare_d1') {
            if (!config.d1WorkerUrl || !effectiveD1Token) {
                showToast('Konfigurasi Cloudflare D1 belum lengkap. Harap isi Worker URL dan API Token.', 'error');
                return;
            }
            payloadString = JSON.stringify({
                p: 'cloudflare_d1',
                w: config.d1WorkerUrl,
                t: effectiveD1Token,
                d: config.d1DatabaseName
            });
        } else if (config.provider === 'firebase' && fbUser) {
            const inviteId = await createTenantInvite();
            payloadString = JSON.stringify({
                p: 'firebase',
                i: inviteId
            });
            setGeneratedCodeMode('invite');
        } else if (config.provider === 'firebase') {
            showToast('Silakan login dengan Google terlebih dahulu.', 'error');
            return;
        } else {
            showToast('Pilih penyedia cloud terlebih dahulu sebelum membagikan sesi.', 'error');
            return;
        }
        
        const encoded = btoa(payloadString); 
        setGeneratedCode(`ESANTRI-CLOUD-${encoded}`);
    };

    const handleConnectViaPairing = async () => {
        if (!inputPairingCode.trim()) return;
        
        setPairingStep('connecting');
        setIsProcessingPairing(true);
        
        try {
            const rawCode = inputPairingCode.replace('ESANTRI-CLOUD-', '').trim();
            const decoded = atob(rawCode);
            const data = JSON.parse(decoded);

            let updatedConfig = { ...settings.cloudSyncConfig };

            if (data.p === 'dropbox') {
                updatedConfig = {
                    ...updatedConfig,
                    provider: 'dropbox',
                    syncModel: 'hub_spoke',
                    dropboxAppKey: data.k,
                    dropboxAppSecret: data.s,
                    dropboxRefreshToken: data.r,
                    dropboxToken: '',
                    dropboxTokenExpiresAt: 0
                };
            } else if (data.p === 'webdav') {
                updatedConfig = {
                    ...updatedConfig,
                    provider: 'webdav',
                    syncModel: 'hub_spoke',
                    webdavUrl: data.u,
                    webdavUsername: data.n,
                    webdavPassword: data.w
                };
            } else if (data.p === 'cloudflare_r2') {
                updatedConfig = {
                    ...updatedConfig,
                    provider: 'cloudflare_r2',
                    syncModel: 'hub_spoke',
                    r2AccountId: data.a,
                    r2AccessKeyId: data.k,
                    r2SecretAccessKey: data.s,
                    r2BucketName: data.b,
                    r2Endpoint: data.e,
                    r2PublicUrl: data.u
                };
            } else if (data.p === 'supabase') {
                updatedConfig = {
                    ...updatedConfig,
                    provider: 'supabase',
                    syncModel: 'realtime',
                    supabaseUrl: data.u,
                    supabaseAnonKey: data.k,
                    supabaseTablePrefix: data.pr
                };
            } else if (data.p === 'cloudflare_d1') {
                updatedConfig = {
                    ...updatedConfig,
                    provider: 'cloudflare_d1',
                    syncModel: 'realtime',
                    d1WorkerUrl: data.w,
                    d1ApiToken: data.t,
                    d1DatabaseName: data.d
                };
            } else if (data.p === 'firebase') {
                if (!fbUser) {
                    showToast('Silakan login dengan Google terlebih dahulu sebelum memasukkan Pairing Code.', 'info');
                    setIsProcessingPairing(false);
                    setPairingStep('idle');
                    return;
                }
                if (!data.i) {
                    throw new Error("Pairing code Firebase tidak valid.");
                }
                
                setPairingStep('validating');
                try {
                    const joinedTenantId = await joinTenant(data.i);
                    data.t = joinedTenantId;
                } catch (e) {
                    console.error("Join Tenant Error:", e);
                    throw e;
                }

                updatedConfig = {
                    ...updatedConfig,
                    provider: 'firebase',
                    syncModel: 'realtime',
                    firebasePairedTenantId: data.t
                };
            } else {
                throw new Error("Format kode tidak dikenali.");
            }
            
            // 1. Save Config Locally
            await saveSettingsSafely({ ...settings, cloudSyncConfig: updatedConfig });
            
            // 2. Validate Session immediately (for supported providers)
            setPairingStep('validating');
            try {
                if (updatedConfig.provider === 'dropbox' || updatedConfig.provider === 'webdav') {
                    const { getCloudStorageStats } = await loadSyncService();
                    await getCloudStorageStats(updatedConfig);
                }
            } catch (err) {
                throw new Error("Kode valid, tapi gagal terhubung ke Cloud. Sesi mungkin kadaluarsa atau internet bermasalah.");
            }

            // 3. Download Data Akun & Pengaturan (Config)
            setPairingStep('downloading_account');
            if (updatedConfig.provider === 'dropbox' || updatedConfig.provider === 'webdav') {
                const { updateAccountFromCloud } = await loadSyncService();
                await updateAccountFromCloud(updatedConfig);
            }
            
            // 4. Download Master Data (Santri, Transaksi, dll)
            setPairingStep('downloading_data');
            if (updatedConfig.provider === 'firebase') {
                if (updatedConfig.firebasePairedTenantId) {
                    const { downloadAllFromFirebase } = await loadFirebaseRealtimeRuntime();
                    await downloadAllFromFirebase(updatedConfig.firebasePairedTenantId);
                }
            } else if (updatedConfig.provider === 'dropbox' || updatedConfig.provider === 'webdav') {
                const { downloadAndMergeMaster } = await loadSyncService();
                await downloadAndMergeMaster(updatedConfig);
            }
            
            // 5. Success
            setPairingStep('success');

        } catch (e) {
            showToast('Gagal Pairing: ' + (e as Error).message, 'error');
            setIsProcessingPairing(false);
            setPairingStep('');
        }
    };

    const handleFinishPairing = () => {
        const checkAndRedirect = async () => {
            const settingsList = await db.settings.toArray();
            const syncedConfig = settingsList[0];
            
            if (syncedConfig?.multiUserMode) {
                localStorage.removeItem('eSantriCurrentUser');
                window.location.href = '/login';
            } else {
                window.location.reload();
            }
        };

        checkAndRedirect();
    };

    const handleFirebaseLogin = async () => {
        try {
            await login();
            showToast('Berhasil login ke Firebase!', 'success');
        } catch (err) {
            showToast('Gagal login ke Firebase.', 'error');
        }
    };

    const handleFirebaseLogout = async () => {
        await logout();
    };

    const handleLinkFirebaseEmail = async () => {
        try {
            await db.users.update(currentUser!.id, { email: fbUser?.email || undefined });
            showToast('Email berhasil dihubungkan!', 'success');
            window.location.reload();
        } catch (err) {
            showToast('Gagal menghubungkan email.', 'error');
        }
    };

    const handleUploadAllFirebaseData = () => {
        showConfirmation(
            'Upload Semua Data',
            'Apakah Anda yakin ingin mengunggah semua data lokal ke Firebase? Ini akan menimpa data di cloud jika sudah ada.',
            async () => {
                try {
                    const { pushAllToFirebase } = await loadFirebaseRealtimeRuntime();
                    const targetTenantId = localSettings.cloudSyncConfig.firebasePairedTenantId || fbUser!.uid;
                    await pushAllToFirebase(targetTenantId);
                    showToast('Semua data berhasil diunggah ke Firebase!', 'success');
                } catch (err) {
                    showToast('Gagal mengunggah data: ' + (err as Error).message, 'error');
                }
            }
        );
    };

    const handleDownloadAllFirebaseData = () => {
        showConfirmation(
            'Tarik Data dari Cloud Hub',
            'Sistem akan mengunduh seluruh data terbaru dari Firebase Hub dan menggabungkannya ke penyimpanan lokal perangkat ini. Lanjutkan?',
            async () => {
                try {
                    const { downloadAllFromFirebase, syncPsbWithFirebaseHub } = await loadFirebaseRealtimeRuntime();
                    const targetTenantId = localSettings.cloudSyncConfig.firebasePairedTenantId || fbUser!.uid;
                    await downloadAllFromFirebase(targetTenantId);
                    await syncPsbWithFirebaseHub(targetTenantId);
                    showToast('Semua data berhasil disinkronkan dari Firebase!', 'success');
                } catch (err) {
                    showToast('Gagal mengunduh data: ' + (err as Error).message, 'error');
                }
            }
        );
    };

    return (
        <SectionCard
            title="Konfigurasi Sinkronisasi Multi-Admin & Cloud"
            description="Pilih arsitektur kerja tim (Real-Time vs Hub & Spoke) dan penyedia cloud untuk sinkronisasi data santri antar admin."
            contentClassName="space-y-6 p-5 sm:p-6"
        >
            {/* LANGKAH 1: PILIH MODEL KERJA SAMA MULTI-ADMIN */}
            <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                        <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-teal-700 text-white flex items-center justify-center text-xs font-bold shadow-xs">1</span>
                            Pilih Model Kolaborasi Tim (Multi-Admin)
                        </h4>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Tentukan bagaimana admin & staff di pondok Anda berkolaborasi mengelola data santri.
                        </p>
                    </div>
                    {currentModel !== 'none' && (
                        <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-teal-50 text-teal-800 border border-teal-200 flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full ${currentModel === 'realtime' ? 'bg-emerald-500 animate-pulse' : 'bg-indigo-500'}`}></span>
                            Model Aktif: {currentModel === 'realtime' ? 'Real-Time Live Sync' : 'Hub & Spoke (Offline-First)'}
                        </span>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {/* Card 1: Real-Time */}
                    <div
                        onClick={() => handleModelChange('realtime')}
                        className={`cursor-pointer rounded-2xl border p-4 transition-all relative ${
                            currentModel === 'realtime'
                                ? 'bg-gradient-to-br from-emerald-50 via-teal-50 to-white border-teal-500 ring-2 ring-teal-500/20 shadow-sm'
                                : 'bg-white hover:bg-slate-50 border-slate-200 hover:border-slate-300'
                        }`}
                    >
                        <div className="flex items-start justify-between">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg ${
                                currentModel === 'realtime' ? 'bg-teal-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600'
                            }`}>
                                <i className="bi bi-broadcast"></i>
                            </div>
                            {currentModel === 'realtime' && (
                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            )}
                        </div>
                        <h5 className="font-bold text-slate-900 text-sm mt-3">Mode Real-Time</h5>
                        <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                            Sinkronisasi data otomatis seketika via WebSocket & Cloud DB. Sangat pas jika seluruh admin bekerja bersamaan secara serentak online.
                        </p>
                        <div className="mt-3 pt-2.5 border-t border-slate-100 text-[10px] text-teal-800 font-medium flex items-center gap-1">
                            <i className="bi bi-check2"></i> Firebase, Supabase, Cloudflare D1
                        </div>
                    </div>

                    {/* Card 2: Hub & Spoke */}
                    <div
                        onClick={() => handleModelChange('hub_spoke')}
                        className={`cursor-pointer rounded-2xl border p-4 transition-all relative ${
                            currentModel === 'hub_spoke'
                                ? 'bg-gradient-to-br from-blue-50 via-indigo-50 to-white border-indigo-500 ring-2 ring-indigo-500/20 shadow-sm'
                                : 'bg-white hover:bg-slate-50 border-slate-200 hover:border-slate-300'
                        }`}
                    >
                        <div className="flex items-start justify-between">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg ${
                                currentModel === 'hub_spoke' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600'
                            }`}>
                                <i className="bi bi-diagram-3"></i>
                            </div>
                            {currentModel === 'hub_spoke' && (
                                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
                            )}
                        </div>
                        <h5 className="font-bold text-slate-900 text-sm mt-3">Mode Hub & Spoke</h5>
                        <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                            Offline-First: Admin bekerja offline mandiri, lalu setor (Push) & unduh (Pull) data ke cloud terpusat. Kuota hemat & kebal mati lampu/sinyal.
                        </p>
                        <div className="mt-3 pt-2.5 border-t border-slate-100 text-[10px] text-indigo-800 font-medium flex items-center gap-1">
                            <i className="bi bi-check2"></i> Cloudflare R2, Dropbox, WebDAV
                        </div>
                    </div>

                    {/* Card 3: Mandiri / Non-Aktif */}
                    <div
                        onClick={() => handleModelChange('none')}
                        className={`cursor-pointer rounded-2xl border p-4 transition-all relative ${
                            currentModel === 'none'
                                ? 'bg-gradient-to-br from-slate-100 to-white border-slate-400 ring-2 ring-slate-400/20 shadow-sm'
                                : 'bg-white hover:bg-slate-50 border-slate-200 hover:border-slate-300'
                        }`}
                    >
                        <div className="flex items-start justify-between">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg ${
                                currentModel === 'none' ? 'bg-slate-700 text-white shadow-xs' : 'bg-slate-100 text-slate-600'
                            }`}>
                                <i className="bi bi-laptop"></i>
                            </div>
                        </div>
                        <h5 className="font-bold text-slate-900 text-sm mt-3">Offline Mandiri</h5>
                        <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                            Aplikasi berjalan mandiri di satu perangkat saja tanpa sinkronisasi antar admin. Backup dapat diunduh manual berkala.
                        </p>
                        <div className="mt-3 pt-2.5 border-t border-slate-100 text-[10px] text-slate-500 font-medium flex items-center gap-1">
                            <i className="bi bi-shield-check"></i> Penyimpanan Lokal (IndexedDB)
                        </div>
                    </div>
                </div>
            </div>

            {/* LANGKAH 2: PILIH PENYEDIA LAYANAN CLOUD */}
            {currentModel !== 'none' && (
                <div className="space-y-4 pt-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-200 pt-5">
                        <div>
                            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                <span className="w-6 h-6 rounded-full bg-teal-700 text-white flex items-center justify-center text-xs font-bold shadow-xs">2</span>
                                Pilih Penyedia Cloud ({currentModel === 'realtime' ? 'Real-Time Database' : 'Hub & Spoke Storage'})
                            </h4>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Klik salah satu opsi di bawah untuk membuka form konfigurasi penyedia layanan.
                            </p>
                        </div>

                        {/* Auto Sync Toggle */}
                        <div className="flex items-center rounded-xl border border-app-border bg-app-subtle px-3.5 py-2 self-start sm:self-auto">
                            <label className="inline-flex items-center cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    checked={localSettings.cloudSyncConfig?.autoSync || false} 
                                    onChange={(e) => handleSyncConfigChange('autoSync', e.target.checked)}
                                    className="sr-only peer"
                                />
                                <div className="relative w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-teal-600"></div>
                                <span className="ms-2.5 text-xs font-semibold text-slate-700">
                                    Auto Sync Tiap 5 Menit
                                </span>
                            </label>
                        </div>
                    </div>

                    {/* Providers Pill Tabs */}
                    <div className="flex flex-wrap gap-2">
                        {currentModel === 'realtime' ? (
                            <>
                                <button
                                    type="button"
                                    onClick={() => handleSyncProviderChange('firebase')}
                                    className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 border transition-all ${
                                        currentProvider === 'firebase'
                                            ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
                                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                                    }`}
                                >
                                    <i className="bi bi-fire text-sm"></i>
                                    <span>Firebase Firestore (Google)</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleSyncProviderChange('supabase')}
                                    className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 border transition-all ${
                                        currentProvider === 'supabase'
                                            ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm'
                                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                                    }`}
                                >
                                    <i className="bi bi-database-check text-sm"></i>
                                    <span>Supabase (PostgreSQL Realtime)</span>
                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-800/40 text-emerald-100">500MB Free</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleSyncProviderChange('cloudflare_d1')}
                                    className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 border transition-all ${
                                        currentProvider === 'cloudflare_d1'
                                            ? 'bg-cyan-600 text-white border-cyan-700 shadow-sm'
                                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                                    }`}
                                >
                                    <i className="bi bi-hdd-stack text-sm"></i>
                                    <span>Cloudflare D1 + Workers</span>
                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-800/40 text-cyan-100">5M Baris Free</span>
                                </button>
                            </>
                        ) : (
                            <>
                                <button
                                    type="button"
                                    onClick={() => handleSyncProviderChange('cloudflare_r2')}
                                    className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 border transition-all ${
                                        currentProvider === 'cloudflare_r2'
                                            ? 'bg-orange-600 text-white border-orange-700 shadow-sm'
                                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                                    }`}
                                >
                                    <i className="bi bi-box-seam text-sm"></i>
                                    <span>Cloudflare R2 (S3 Storage)</span>
                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-800/40 text-orange-100">10GB Free • $0 Egress</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleSyncProviderChange('dropbox')}
                                    className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 border transition-all ${
                                        currentProvider === 'dropbox'
                                            ? 'bg-blue-600 text-white border-blue-700 shadow-sm'
                                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                                    }`}
                                >
                                    <i className="bi bi-dropbox text-sm"></i>
                                    <span>Dropbox Cloud</span>
                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-800/40 text-blue-100">2GB Free</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleSyncProviderChange('webdav')}
                                    className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 border transition-all ${
                                        currentProvider === 'webdav'
                                            ? 'bg-amber-600 text-white border-amber-700 shadow-sm'
                                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                                    }`}
                                >
                                    <i className="bi bi-hdd-network text-sm"></i>
                                    <span>WebDAV / Nextcloud</span>
                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-800/40 text-amber-100">Self-Hosted</span>
                                </button>
                            </>
                        )}
                    </div>

                    <StorageIndicator stats={storageStats} isLoading={isLoadingStats} provider={currentProvider} />
                </div>
            )}

            {/* NOTIFIKASI ADMIN INTI */}
            {currentModel !== 'none' && (
                <div className="rounded-xl border border-app-border bg-app-subtle p-4">
                    <h4 className="mb-3 text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                        <i className="bi bi-bell-fill text-teal-600"></i>
                        Kontak Admin Inti (Notifikasi Setelah Staff Setor Data)
                    </h4>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                        <input
                            type="text"
                            value={localSettings.cloudSyncConfig.adminNotifyName || ''}
                            onChange={(e) => handleSyncConfigChange('adminNotifyName', e.target.value)}
                            className="app-input w-full p-2.5 text-xs"
                            placeholder="Nama admin inti (opsional)"
                        />
                        <input
                            type="text"
                            value={localSettings.cloudSyncConfig.adminNotifyWhatsapp || ''}
                            onChange={(e) => handleSyncConfigChange('adminNotifyWhatsapp', e.target.value)}
                            className="app-input w-full p-2.5 text-xs"
                            placeholder="WhatsApp admin, contoh 62812xxxx"
                        />
                        <input
                            type="text"
                            value={localSettings.cloudSyncConfig.adminNotifyTelegram || ''}
                            onChange={(e) => handleSyncConfigChange('adminNotifyTelegram', e.target.value)}
                            className="app-input w-full p-2.5 text-xs"
                            placeholder="Telegram @username atau https://t.me/..."
                        />
                    </div>
                    <p className="mt-2 text-xs text-slate-500">
                        Setelah staff berhasil setor data (sync upload), sistem akan menyediakan opsi cepat kirim konfirmasi WhatsApp/Telegram ke admin inti.
                    </p>
                </div>
            )}

            {/* RENDER FORM SESUAI PROVIDER */}
            <div className="grid grid-cols-1 gap-6">
                <Suspense fallback={<LoadingFallback />}>
                    {currentProvider === 'firebase' && (
                        <FirebaseCloudPanel
                            currentUser={currentUser}
                            fbUser={fbUser}
                            isFbLoading={isFbLoading}
                            localSettings={localSettings}
                            showCustomFirebase={showCustomFirebase}
                            onFirebaseLogin={handleFirebaseLogin}
                            onFirebaseLogout={handleFirebaseLogout}
                            onGeneratePairingCode={handleGeneratePairingCode}
                            onLinkEmail={handleLinkFirebaseEmail}
                            onUploadAllData={handleUploadAllFirebaseData}
                            onDownloadAllData={handleDownloadAllFirebaseData}
                            onToggleCustomFirebase={() => setShowCustomFirebase(!showCustomFirebase)}
                            onSyncConfigChange={handleSyncConfigChange}
                        />
                    )}

                    {currentProvider === 'supabase' && (
                        <SupabaseCloudPanel
                            localSettings={localSettings}
                            savedCloudConfig={settings.cloudSyncConfig}
                            onSyncConfigChange={handleSyncConfigChange}
                            onGeneratePairingCode={handleGeneratePairingCode}
                        />
                    )}

                    {currentProvider === 'cloudflare_d1' && (
                        <CloudflareD1Panel
                            localSettings={localSettings}
                            savedCloudConfig={settings.cloudSyncConfig}
                            onSyncConfigChange={handleSyncConfigChange}
                            onGeneratePairingCode={handleGeneratePairingCode}
                        />
                    )}

                    {currentProvider === 'cloudflare_r2' && (
                        <R2CloudPanel
                            localSettings={localSettings}
                            savedCloudConfig={settings.cloudSyncConfig}
                            onSyncConfigChange={handleSyncConfigChange}
                            onGeneratePairingCode={handleGeneratePairingCode}
                        />
                    )}

                    {currentProvider === 'dropbox' && (
                        <DropboxCloudPanel
                            localSettings={localSettings}
                            savedCloudConfig={settings.cloudSyncConfig}
                            manualAuthCode={manualAuthCode}
                            isConnectingDropbox={isConnectingDropbox}
                            onManualAuthCodeChange={setManualAuthCode}
                            onSyncConfigChange={handleSyncConfigChange}
                            onOpenDropboxAuth={handleOpenDropboxAuth}
                            onVerifyDropboxCode={handleVerifyDropboxCode}
                            onGeneratePairingCode={handleGeneratePairingCode}
                        />
                    )}

                    {currentProvider === 'webdav' && (
                        <WebDavCloudPanel
                            localSettings={localSettings}
                            storageStats={storageStats}
                            isTestingWebDav={isTestingWebDav}
                            onSyncConfigChange={handleSyncConfigChange}
                            onTestWebDav={handleTestWebDav}
                            onGeneratePairingCode={handleGeneratePairingCode}
                        />
                    )}

                    {/* SETUP CEPAT VIA PAIRING CODE (UNTUK STAFF) */}
                    <CloudPairingPanel
                        inputPairingCode={inputPairingCode}
                        isProcessingPairing={isProcessingPairing}
                        pairingStep={pairingStep}
                        onInputPairingCodeChange={setInputPairingCode}
                        onConnectViaPairing={handleConnectViaPairing}
                    />
                </Suspense>
            </div>

            {/* MODALS PAIRING */}
            <Suspense fallback={null}>
                {(generatedCode || pairingStep === 'success') && (
                    <CloudPairingModals
                        generatedCode={generatedCode}
                        generatedCodeMode={generatedCodeMode}
                        pairingStep={pairingStep}
                        onClosePairingModal={() => setGeneratedCode('')}
                        onCopyCode={() => { navigator.clipboard.writeText(generatedCode); showToast('Kode disalin!', 'success'); }}
                        onFinishPairing={handleFinishPairing}
                    />
                )}
            </Suspense>
        </SectionCard>
    );
};
