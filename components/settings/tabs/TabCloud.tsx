
import React, { Suspense, useState, useEffect } from 'react';
import { PondokSettings, SyncProvider, StorageStats } from '../../../types';
import { useAppContext } from '../../../AppContext';
import { db } from '../../../db';
import { useFirebase } from '../../../contexts/FirebaseContext';
import { formatBytes } from '../../../utils/formatters';
import { loadSyncService } from '../../../utils/lazyCloudServices';
import { loadFirebaseRealtimeRuntime } from '../../../utils/lazyFirebaseRuntimes';
import { LoadingFallback } from '../../common/LoadingFallback';

const FirebaseCloudPanel = React.lazy(() => import('../cloud/FirebaseCloudPanel').then((module) => ({ default: module.FirebaseCloudPanel })));
const DropboxCloudPanel = React.lazy(() => import('../cloud/DropboxCloudPanel').then((module) => ({ default: module.DropboxCloudPanel })));
const WebDavCloudPanel = React.lazy(() => import('../cloud/WebDavCloudPanel').then((module) => ({ default: module.WebDavCloudPanel })));
const CloudPairingPanel = React.lazy(() => import('../cloud/CloudPairingPanel').then((module) => ({ default: module.CloudPairingPanel })));
const PortalBridgePanel = React.lazy(() => import('../cloud/PortalBridgePanel').then((module) => ({ default: module.PortalBridgePanel })));
const CloudPairingModals = React.lazy(() => import('../cloud/CloudPairingModals').then((module) => ({ default: module.CloudPairingModals })));

const StorageIndicator: React.FC<{ stats: StorageStats | null, isLoading: boolean, provider: SyncProvider }> = ({ stats, isLoading, provider }) => {
    if (isLoading) return <div className="text-xs text-gray-500 mt-2 animate-pulse">Memuat data penyimpanan cloud...</div>;
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
        <div className="mt-3 bg-gray-50 p-4 rounded-lg border border-gray-200">
            <div className="flex justify-between items-center mb-3">
                <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-2">
                    <i className="bi bi-cloud-check text-blue-500"></i> Kesehatan Cloud ({provider})
                </h4>
                <span className="text-[10px] text-gray-500">🕒 Cek: {new Date().toLocaleTimeString()}</span>
            </div>

            <div className="space-y-3">
                <div>
                    <div className="flex justify-between mb-1">
                        <span className="text-xs font-medium text-gray-700">Kapasitas Cloud</span>
                        <span className="text-xs font-medium text-gray-700">{formatBytes(stats.used)} / {stats.total ? formatBytes(stats.total) : 'Unlimited'}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className={`${colorClass} h-2 rounded-full transition-all duration-500`} style={{ width: `${Math.min(percent, 100)}%` }}></div>
                    </div>
                    <div className="flex justify-between mt-1">
                        <span className="text-[10px] text-gray-500">{percent.toFixed(1)}% Terpakai</span>
                        <span className="text-[10px] text-gray-500">Sisa: {stats.total ? formatBytes(remainingSpace) : 'Unlimited'}</span>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-200">
                    <div className="bg-white p-2 rounded border border-gray-100">
                        <p className="text-[9px] text-gray-500 uppercase font-bold">Estimasi Sisa File</p>
                        <p className="text-sm font-bold text-gray-800">± {estimatedFiles} Backup</p>
                    </div>
                    <div className="bg-white p-2 rounded border border-gray-100">
                        <p className="text-[9px] text-gray-500 uppercase font-bold">Status Koneksi</p>
                        <p className="text-sm font-bold text-green-600 flex items-center gap-1">
                            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span> Aktif
                        </p>
                    </div>
                </div>

                {provider === 'dropbox' && (
                    <p className="text-[10px] text-gray-500 italic">
                        *Batasan Dropbox: Maksimal 3 perangkat terhubung untuk akun gratis.
                    </p>
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
    const { settings, showToast, showConfirmation, onUpdateSettings, currentUser } = useAppContext();
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

    // Portal States
    const [isPortalEnabled, setIsPortalEnabled] = useState(localSettings.cloudSyncConfig?.portalEnabled || false);
    const [isSyncingPortal, setIsSyncingPortal] = useState(false);

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
                // Silent fail for stats, or show toast
                console.error("Cloud stats failed", error);
            } finally {
                setIsLoadingStats(false);
            }
        };
        fetchStats();
    }, [settings.cloudSyncConfig]);

    useEffect(() => {
        if (localSettings.cloudSyncConfig?.provider === 'firebase' || isPortalEnabled) {
            void initializeAuthState();
        }
    }, [initializeAuthState, isPortalEnabled, localSettings.cloudSyncConfig?.provider]);

    const handleSyncProviderChange = (provider: SyncProvider) => {
        setLocalSettings(prev => ({
            ...prev,
            cloudSyncConfig: { ...prev.cloudSyncConfig, provider }
        }));
        setStorageStats(null);
    };

    const handleSyncConfigChange = (field: string, value: any) => {
        setLocalSettings(prev => ({
            ...prev,
            cloudSyncConfig: { ...prev.cloudSyncConfig, [field]: value }
        }));
    };

    const handlePortalToggle = (checked: boolean) => {
        setIsPortalEnabled(checked);
        setLocalSettings(prev => ({
            ...prev,
            cloudSyncConfig: { ...prev.cloudSyncConfig, portalEnabled: checked },
            portalConfig: { ...prev.portalConfig!, enabled: checked }
        }));
    };

    const handleSyncToPortal = async () => {
        setIsSyncingPortal(true);
        try {
            // In a real implementation, this would filter data and push to Firebase
            // For now, we simulate the process
            await new Promise(resolve => setTimeout(resolve, 2000));
            showToast('Data berhasil disinkronkan ke Portal Wali.', 'success');
        } catch (error) {
            showToast('Gagal sinkronisasi data ke portal.', 'error');
        } finally {
            setIsSyncingPortal(false);
        }
    };

    const handleOpenDropboxAuth = () => {
        // App Key might be in UI state (localSettings) or saved in DB (settings)
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
                provider: 'dropbox' as SyncProvider
            };
            
            // Save immediately
            const fullyUpdatedConfig = {
                ...localSettings.cloudSyncConfig,
                ...updatedConfig
            };
            await onSaveSettings({ ...localSettings, cloudSyncConfig: fullyUpdatedConfig });
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
            await onSaveSettings(localSettings);
            showToast('Koneksi WebDAV Berhasil!', 'success');
        } catch (e) {
            showToast(`Gagal koneksi WebDAV: ${(e as Error).message}. Pastikan CORS diaktifkan di server Anda.`, 'error');
        } finally {
            setIsTestingWebDav(false);
        }
    };

    // --- PAIRING LOGIC (Universal for Dropbox & WebDAV) ---

    const handleGeneratePairingCode = async () => {
        // Use localSettings so it reflects current entries and most recent saves
        const config = localSettings.cloudSyncConfig;
        
        // Merge with context settings for sensitive values that might be empty in UI
        const effectiveAppKey = config.dropboxAppKey || settings.cloudSyncConfig.dropboxAppKey;
        const effectiveAppSecret = config.dropboxAppSecret || settings.cloudSyncConfig.dropboxAppSecret;
        const effectiveWebdavPassword = config.webdavPassword || settings.cloudSyncConfig.webdavPassword;

        let payloadString = '';

        if (config.provider === 'dropbox') {
             if (!config.dropboxRefreshToken) {
                showToast('Dropbox belum terhubung. Pastikan status sudah "Terhubung" sebelum membagikan akses.', 'error');
                return;
            }
            if (!effectiveAppKey || !effectiveAppSecret) {
                showToast('App Key atau App Secret belum diisi. Keduanya wajib ada bagi Admin untuk membagikan akses kepada Staff.', 'error');
                return;
            }
            // Include REFRESH TOKEN. This allows session cloning.
            payloadString = JSON.stringify({
                p: 'dropbox',
                k: effectiveAppKey,
                s: effectiveAppSecret,
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
            setGeneratedCodeMode('session');
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
                    dropboxAppKey: data.k,
                    dropboxAppSecret: data.s,
                    dropboxRefreshToken: data.r, // SESSION CLONED HERE
                    dropboxToken: '', // Clear old token to force refresh
                    dropboxTokenExpiresAt: 0
                };
            } else if (data.p === 'webdav') {
                updatedConfig = {
                    ...updatedConfig,
                    provider: 'webdav',
                    webdavUrl: data.u,
                    webdavUsername: data.n,
                    webdavPassword: data.w
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
                    firebasePairedTenantId: data.t
                };
            } else {
                 throw new Error("Format kode tidak dikenali.");
            }
            
            // 1. Save Config Locally
            await onSaveSettings({ ...settings, cloudSyncConfig: updatedConfig });
            
            // 2. Validate Session immediately (Force Refresh Token usage)
            setPairingStep('validating');
            try {
                // This calls getQuota/getSpaceUsage. If credentials (refresh token) are invalid, it throws.
                const { getCloudStorageStats } = await loadSyncService();
                await getCloudStorageStats(updatedConfig);
            } catch (err) {
                throw new Error("Kode valid, tapi gagal terhubung ke Cloud. Sesi mungkin kadaluarsa atau internet bermasalah.");
            }

            // 3. Download Data Akun & Pengaturan (Config)
            setPairingStep('downloading_account');
            const { updateAccountFromCloud, downloadAndMergeMaster } = await loadSyncService();
            await updateAccountFromCloud(updatedConfig);
            
                // 4. Download Master Data (Santri, Transaksi, dll)
            setPairingStep('downloading_data');
            if (updatedConfig.provider === 'firebase') {
                if (updatedConfig.firebasePairedTenantId) {
                    const { downloadAllFromFirebase } = await loadFirebaseRealtimeRuntime();
                    await downloadAllFromFirebase(updatedConfig.firebasePairedTenantId);
                }
            } else {
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
        // If multi-user is already enabled in the synced settings, 
        // we should redirect to login instead of just reloading to home
        const checkAndRedirect = async () => {
            // Re-fetch from DB to get the LATEST synced settings
            const settingsList = await db.settings.toArray();
            const syncedConfig = settingsList[0];
            
            if (syncedConfig?.multiUserMode) {
                // Clear any existing session to be safe
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
                    await pushAllToFirebase(fbUser!.uid);
                    showToast('Semua data berhasil diunggah ke Firebase!', 'success');
                } catch (err) {
                    showToast('Gagal mengunggah data.', 'error');
                }
            }
        );
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
            <h2 className="text-xl font-bold text-gray-700 mb-4 border-b pb-2">Konfigurasi Sinkronisasi Cloud</h2>
            <p className="text-sm text-gray-600 mb-4">
                Pilih layanan penyimpanan untuk backup data dan sinkronisasi antar perangkat.
            </p>
            
            <div className="flex flex-col md:flex-row md:items-start gap-4 md:gap-8 mb-6">
                <div className="flex-1 w-full">
                    <label className="block mb-2 text-sm font-medium text-gray-700">Penyedia Layanan</label>
                    <select 
                        value={localSettings.cloudSyncConfig?.provider || 'none'} 
                        onChange={(e) => handleSyncProviderChange(e.target.value as SyncProvider)}
                        className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2.5"
                    >
                        <option value="none">Tidak Aktif</option>
                        <option value="firebase">Firebase Realtime (Rekomendasi - Multi User)</option>
                        <option value="dropbox">Dropbox (Mudah & Gratis)</option>
                        <option value="webdav">WebDAV / Nextcloud (Self-Hosted/CasaOS)</option>
                    </select>
                    <StorageIndicator stats={storageStats} isLoading={isLoadingStats} provider={localSettings.cloudSyncConfig?.provider || 'none'} />
                </div>

                {localSettings.cloudSyncConfig?.provider !== 'none' && (
                    <div className="flex-1 w-full md:pt-7">
                        <div className="flex items-center p-3 bg-gray-50 rounded-lg border border-gray-100 h-full">
                            <label className="inline-flex items-center cursor-pointer w-full">
                                <input 
                                    type="checkbox" 
                                    checked={localSettings.cloudSyncConfig?.autoSync || false} 
                                    onChange={(e) => handleSyncConfigChange('autoSync', e.target.checked)}
                                    className="sr-only peer"
                                />
                                <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-teal-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
                                <span className="ms-3 text-sm font-medium text-gray-900">
                                    Auto Sync (Tiap 5 Menit)
                                </span>
                            </label>
                        </div>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 gap-6">
                <Suspense fallback={<LoadingFallback />}>
                    {localSettings.cloudSyncConfig?.provider === 'firebase' && (
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
                            onToggleCustomFirebase={() => setShowCustomFirebase(!showCustomFirebase)}
                            onSyncConfigChange={handleSyncConfigChange}
                        />
                    )}

                    {localSettings.cloudSyncConfig?.provider === 'dropbox' && (
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

                    {localSettings.cloudSyncConfig?.provider === 'webdav' && (
                        <WebDavCloudPanel
                            localSettings={localSettings}
                            storageStats={storageStats}
                            isTestingWebDav={isTestingWebDav}
                            onSyncConfigChange={handleSyncConfigChange}
                            onTestWebDav={handleTestWebDav}
                            onGeneratePairingCode={handleGeneratePairingCode}
                        />
                    )}
                    {(!settings.cloudSyncConfig.provider || settings.cloudSyncConfig.provider === 'none' || (settings.cloudSyncConfig.provider === 'dropbox' && !settings.cloudSyncConfig.dropboxRefreshToken)) && (
                        <CloudPairingPanel
                            inputPairingCode={inputPairingCode}
                            isProcessingPairing={isProcessingPairing}
                            pairingStep={pairingStep}
                            onInputPairingCodeChange={setInputPairingCode}
                            onConnectViaPairing={handleConnectViaPairing}
                        />
                    )}

                    {localSettings.cloudSyncConfig?.provider !== 'none' && (
                        <PortalBridgePanel
                            provider={localSettings.cloudSyncConfig?.provider}
                            fbUser={fbUser ? { uid: fbUser.uid } : null}
                            isPortalEnabled={isPortalEnabled}
                            isFbLoading={isFbLoading}
                            isSyncingPortal={isSyncingPortal}
                            onPortalToggle={handlePortalToggle}
                            onOpenPortalSettings={() => window.dispatchEvent(new CustomEvent('change-settings-tab', { detail: 'portal' }))}
                            onPortalBridgeLogin={handleFirebaseLogin}
                            onSyncToPortal={handleSyncToPortal}
                        />
                    )}
                </Suspense>
            </div>

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
        </div>
    );
};
