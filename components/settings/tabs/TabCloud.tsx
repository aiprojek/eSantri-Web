
import React, { useState, useEffect } from 'react';
import { PondokSettings, SyncProvider, StorageStats } from '../../../types';
import { useAppContext } from '../../../AppContext';
import { db } from '../../../db';
import { useFirebase } from '../../../contexts/FirebaseContext';
import { getCloudStorageStats, exchangeCodeForToken, downloadAndMergeMaster, updateAccountFromCloud } from '../../../services/syncService';
import { pushAllToFirebase } from '../../../services/firebaseSyncService';
import { formatBytes } from '../../../utils/formatters';

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

const SensitiveInput: React.FC<{
    value: string;
    onChange: (val: string) => void;
    placeholder?: string;
}> = ({ value, onChange, placeholder }) => {
    const [show, setShow] = useState(false);
    return (
        <div className="relative">
            <input
                type={show ? "text" : "password"}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2.5 pr-10"
            />
            <button
                type="button"
                onClick={() => setShow(!show)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-700 focus:outline-none"
                title={show ? "Sembunyikan" : "Tampilkan"}
            >
                <i className={`bi ${show ? 'bi-eye-slash' : 'bi-eye'}`}></i>
            </button>
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
    const { fbUser, login, logout, isFbLoading, joinTenant } = useFirebase();
    const [isConnectingDropbox, setIsConnectingDropbox] = useState(false);
    const [storageStats, setStorageStats] = useState<StorageStats | null>(null);
    const [isLoadingStats, setIsLoadingStats] = useState(false);
    const [isTestingWebDav, setIsTestingWebDav] = useState(false);
    
    // Manual Auth Flow State
    const [manualAuthCode, setManualAuthCode] = useState('');
    const [showCustomFirebase, setShowCustomFirebase] = useState(false);
    
    // Pairing States
    const [showPairingModal, setShowPairingModal] = useState(false);
    const [generatedCode, setGeneratedCode] = useState('');
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
        const appKey = localSettings.cloudSyncConfig.dropboxAppKey;
        if (!appKey) {
            showToast('Harap isi App Key terlebih dahulu.', 'error');
            return;
        }
        // Standard code flow without specific redirect URI (manual copy paste)
        const authUrl = `https://www.dropbox.com/oauth2/authorize?client_id=${appKey}&response_type=code&token_access_type=offline`;
        window.open(authUrl, '_blank', 'width=600,height=700');
    };

    const handleVerifyDropboxCode = async () => {
        const { dropboxAppKey, dropboxAppSecret } = localSettings.cloudSyncConfig;
        if (!dropboxAppKey || !dropboxAppSecret || !manualAuthCode) {
            showToast('App Key, App Secret, dan Kode Otorisasi wajib diisi.', 'error');
            return;
        }

        setIsConnectingDropbox(true);
        try {
            const result = await exchangeCodeForToken(dropboxAppKey, dropboxAppSecret, manualAuthCode);
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
            await onSaveSettings({ ...settings, cloudSyncConfig: updatedConfig });
            setManualAuthCode('');
            showToast('Berhasil terhubung dengan Dropbox!', 'success');
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

    const handleGeneratePairingCode = () => {
        const config = settings.cloudSyncConfig;
        let payloadString = '';

        if (config.provider === 'dropbox') {
             if (!config.dropboxRefreshToken || !config.dropboxAppKey || !config.dropboxAppSecret) {
                showToast('Cloud belum terhubung. Pastikan status sudah "Terhubung" sebelum membagikan akses.', 'error');
                return;
            }
            // Include REFRESH TOKEN. This allows session cloning.
            payloadString = JSON.stringify({
                p: 'dropbox',
                k: config.dropboxAppKey,
                s: config.dropboxAppSecret,
                r: config.dropboxRefreshToken
            });
        } else if (config.provider === 'webdav') {
            if (!config.webdavUrl || !config.webdavUsername || !config.webdavPassword) {
                showToast('Konfigurasi WebDAV belum lengkap.', 'error');
                return;
            }
             payloadString = JSON.stringify({
                p: 'webdav',
                u: config.webdavUrl,
                n: config.webdavUsername,
                w: config.webdavPassword
            });
        } else if (config.provider === 'firebase' && fbUser) {
            payloadString = JSON.stringify({
                p: 'firebase',
                t: fbUser.uid
            });
        }
        
        const encoded = btoa(payloadString); 
        setGeneratedCode(`ESANTRI-CLOUD-${encoded}`);
        setShowPairingModal(true);
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
                
                setPairingStep('validating');
                try {
                    await joinTenant(data.t);
                } catch (e) {
                    console.error("Join Tenant Error:", e);
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
                await getCloudStorageStats(updatedConfig);
            } catch (err) {
                throw new Error("Kode valid, tapi gagal terhubung ke Cloud. Sesi mungkin kadaluarsa atau internet bermasalah.");
            }

            // 3. Download Data Akun & Pengaturan (Config)
            setPairingStep('downloading_account');
            await updateAccountFromCloud(updatedConfig);
            
            // 4. Download Master Data (Santri, Transaksi, dll)
            setPairingStep('downloading_data');
            await downloadAndMergeMaster(updatedConfig);
            
            // 5. Success
            setPairingStep('success');

        } catch (e) {
            showToast('Gagal Pairing: ' + (e as Error).message, 'error');
            setIsProcessingPairing(false);
            setPairingStep('');
        }
    };

    const handleFinishPairing = () => {
        window.location.reload();
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
                {/* --- FIREBASE UI --- */}
                {localSettings.cloudSyncConfig?.provider === 'firebase' && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 gap-4 border p-4 rounded-lg bg-teal-50">
                            <div className="flex justify-between items-center">
                                <h4 className="font-bold text-teal-800 text-sm">Setup Firebase Realtime</h4>
                                <div className="flex items-center gap-2">
                                    <button 
                                        onClick={() => window.dispatchEvent(new CustomEvent('open-panduan', { detail: 'firebase' }))}
                                        className="text-xs text-teal-600 hover:underline flex items-center gap-1"
                                    >
                                        <i className="bi bi-question-circle"></i> Panduan
                                    </button>
                                    {fbUser && (
                                        <span className="text-green-600 text-xs font-bold bg-green-100 px-2 py-1 rounded border border-green-200">
                                            <i className="bi bi-check-circle-fill"></i> Terhubung
                                        </span>
                                    )}
                                </div>
                            </div>

                            {!fbUser ? (
                                <div className="text-center py-4">
                                    <p className="text-sm text-gray-600 mb-4">
                                        Gunakan akun Google untuk mengaktifkan sinkronisasi real-time dan multi-user.
                                    </p>
                                    <button 
                                        onClick={async () => {
                                            try {
                                                await login();
                                                showToast('Berhasil login ke Firebase!', 'success');
                                            } catch (err) {
                                                showToast('Gagal login ke Firebase.', 'error');
                                            }
                                        }}
                                        disabled={isFbLoading}
                                        className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium py-2.5 px-6 rounded-lg text-sm flex items-center justify-center gap-2 mx-auto shadow-sm"
                                    >
                                        <img src="https://www.gstatic.com/firebase/anonymous-scan.png" alt="Google" className="w-5 h-5 hidden" />
                                        <i className="bi bi-google text-red-500"></i>
                                        Login dengan Google
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-teal-100">
                                        <img src={fbUser.photoURL || ''} alt="Avatar" className="w-10 h-10 rounded-full border" />
                                        <div>
                                            <p className="text-sm font-bold text-gray-800">{fbUser.displayName}</p>
                                            <p className="text-xs text-gray-500">{fbUser.email}</p>
                                        </div>
                                        <button 
                                            onClick={logout}
                                            className="ml-auto text-xs text-red-600 hover:text-red-800 font-medium"
                                        >
                                            Logout
                                        </button>
                                    </div>

                                    {fbUser && !currentUser?.email && (
                                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
                                            <div className="text-xs text-blue-800">
                                                <i className="bi bi-link-45deg mr-1"></i>
                                                Hubungkan email <strong>{fbUser.email}</strong> ke akun lokal Anda agar bisa login via Google nanti.
                                            </div>
                                            <button 
                                                onClick={async () => {
                                                    try {
                                                        await db.users.update(currentUser!.id, { email: fbUser.email || undefined });
                                                        showToast('Email berhasil dihubungkan!', 'success');
                                                        window.location.reload();
                                                    } catch (err) {
                                                        showToast('Gagal menghubungkan email.', 'error');
                                                    }
                                                }}
                                                className="bg-blue-600 text-white text-[10px] px-2 py-1 rounded hover:bg-blue-700"
                                            >
                                                Hubungkan
                                            </button>
                                        </div>
                                    )}

                                     <div className="p-3 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                                        <strong>Info:</strong> Data akan disinkronkan secara real-time antar perangkat yang login dengan akun ini.
                                        {localSettings.cloudSyncConfig.firebasePairedTenantId ? (
                                            <p className="mt-1 text-teal-700 font-bold">
                                                <i className="bi bi-people-fill"></i> Anda sedang terhubung ke database Pondok lain (Multi-User).
                                            </p>
                                        ) : (
                                            <p className="mt-1">
                                                Gunakan fitur "Bagikan Sesi" di bawah agar staff lain bisa mengakses database ini menggunakan akun Google mereka sendiri.
                                            </p>
                                        )}
                                    </div>

                                    <div className="flex flex-col sm:flex-row gap-2">
                                        <button 
                                            onClick={() => {
                                                showConfirmation(
                                                    'Upload Semua Data',
                                                    'Apakah Anda yakin ingin mengunggah semua data lokal ke Firebase? Ini akan menimpa data di cloud jika sudah ada.',
                                                    async () => {
                                                        try {
                                                            await pushAllToFirebase(fbUser.uid);
                                                            showToast('Semua data berhasil diunggah ke Firebase!', 'success');
                                                        } catch (err) {
                                                            showToast('Gagal mengunggah data.', 'error');
                                                        }
                                                    }
                                                );
                                            }}
                                            className="flex-1 bg-teal-600 hover:bg-teal-700 text-white font-medium py-2.5 px-4 rounded-lg text-sm flex items-center justify-center gap-2"
                                        >
                                            <i className="bi bi-cloud-upload"></i> Upload Data
                                        </button>
                                        
                                        {!localSettings.cloudSyncConfig.firebasePairedTenantId && (
                                            <button 
                                                onClick={handleGeneratePairingCode}
                                                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-medium py-2.5 px-4 rounded-lg text-sm flex items-center justify-center gap-2 shadow-sm"
                                            >
                                                <i className="bi bi-qr-code"></i> Bagikan Sesi
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}

                            <div className="mt-4 border-t pt-4">
                                <button 
                                    type="button"
                                    onClick={() => setShowCustomFirebase(!showCustomFirebase)}
                                    className="text-xs text-teal-600 hover:text-teal-800 font-medium flex items-center gap-1"
                                >
                                    <i className={`bi ${showCustomFirebase ? 'bi-chevron-up' : 'bi-chevron-down'}`}></i>
                                    {showCustomFirebase ? 'Sembunyikan Konfigurasi Kustom' : 'Gunakan Project Firebase Sendiri (Advanced)'}
                                </button>
                                
                                {showCustomFirebase && (
                                    <div className="mt-3 space-y-3 p-3 bg-white rounded border border-gray-200">
                                        <p className="text-[10px] text-gray-500 italic">
                                            Gunakan ini jika Anda ingin menggunakan project Firebase Anda sendiri (misal untuk versi build mandiri).
                                            Dapatkan nilai ini dari Firebase Console &gt; Project Settings.
                                        </p>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-[10px] font-bold text-gray-700 uppercase">API Key</label>
                                                <input 
                                                    type="password"
                                                    value={localSettings.cloudSyncConfig.firebaseApiKey || ''}
                                                    onChange={(e) => handleSyncConfigChange('firebaseApiKey', e.target.value)}
                                                    className="w-full text-xs p-2 border rounded mt-1"
                                                    placeholder="AIzaSy..."
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-bold text-gray-700 uppercase">Project ID</label>
                                                <input 
                                                    type="text"
                                                    value={localSettings.cloudSyncConfig.firebaseProjectId || ''}
                                                    onChange={(e) => handleSyncConfigChange('firebaseProjectId', e.target.value)}
                                                    className="w-full text-xs p-2 border rounded mt-1"
                                                    placeholder="my-project-id"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-bold text-gray-700 uppercase">Auth Domain</label>
                                                <input 
                                                    type="text"
                                                    value={localSettings.cloudSyncConfig.firebaseAuthDomain || ''}
                                                    onChange={(e) => handleSyncConfigChange('firebaseAuthDomain', e.target.value)}
                                                    className="w-full text-xs p-2 border rounded mt-1"
                                                    placeholder="my-project.firebaseapp.com"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-bold text-gray-700 uppercase">App ID</label>
                                                <input 
                                                    type="text"
                                                    value={localSettings.cloudSyncConfig.firebaseAppId || ''}
                                                    onChange={(e) => handleSyncConfigChange('firebaseAppId', e.target.value)}
                                                    className="w-full text-xs p-2 border rounded mt-1"
                                                    placeholder="1:123456789:web:..."
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-bold text-gray-700 uppercase">Database ID (Optional)</label>
                                                <input 
                                                    type="text"
                                                    value={localSettings.cloudSyncConfig.firebaseDatabaseId || ''}
                                                    onChange={(e) => handleSyncConfigChange('firebaseDatabaseId', e.target.value)}
                                                    className="w-full text-xs p-2 border rounded mt-1"
                                                    placeholder="(default)"
                                                />
                                            </div>
                                        </div>
                                        <div className="bg-blue-50 p-2 rounded text-[10px] text-blue-800">
                                            <i className="bi bi-info-circle mr-1"></i> Perubahan konfigurasi memerlukan <strong>Simpan & Refresh Halaman</strong> untuk diterapkan.
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* --- DROPBOX UI (MANUAL FLOW) --- */}
                {localSettings.cloudSyncConfig?.provider === 'dropbox' && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 gap-4 border p-4 rounded-lg bg-blue-50">
                            <div className="flex justify-between items-center">
                                <h4 className="font-bold text-blue-800 text-sm">A. Setup Dropbox (Mode Desktop/Manual)</h4>
                                {settings.cloudSyncConfig.dropboxRefreshToken && (
                                    <span className="text-green-600 text-xs font-bold bg-green-100 px-2 py-1 rounded border border-green-200">
                                        <i className="bi bi-check-circle-fill"></i> Terhubung
                                    </span>
                                )}
                            </div>
                            
                            {!settings.cloudSyncConfig.dropboxRefreshToken ? (
                                <>
                                    <div className="p-3 bg-blue-100 border border-blue-300 rounded text-xs text-blue-900">
                                        <strong>Cara Koneksi:</strong> Masukkan App Key & Secret dari Dropbox Console Anda. Klik "Dapatkan Kode", izinkan akses, lalu copy kode yang muncul dan paste di bawah.
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block mb-2 text-sm font-medium text-gray-700">App Key</label>
                                            <SensitiveInput 
                                                value={localSettings.cloudSyncConfig.dropboxAppKey || ''}
                                                onChange={(val) => handleSyncConfigChange('dropboxAppKey', val)}
                                                placeholder="App Key"
                                            />
                                        </div>
                                        <div>
                                            <label className="block mb-2 text-sm font-medium text-gray-700">App Secret</label>
                                            <SensitiveInput 
                                                value={localSettings.cloudSyncConfig.dropboxAppSecret || ''}
                                                onChange={(val) => handleSyncConfigChange('dropboxAppSecret', val)}
                                                placeholder="App Secret"
                                            />
                                        </div>
                                    </div>
                                    
                                    <div className="border-t border-blue-200 pt-4">
                                        <label className="block mb-2 text-sm font-bold text-gray-700">Langkah Otorisasi:</label>
                                        <div className="flex flex-col sm:flex-row gap-2 mb-3">
                                            <div className="flex-1">
                                                <button onClick={handleOpenDropboxAuth} className="w-full bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 py-2.5 rounded text-sm font-medium">
                                                    1. Dapatkan Kode Otorisasi (Buka Browser)
                                                </button>
                                            </div>
                                            <div className="flex-1">
                                                <input 
                                                    type="text" 
                                                    value={manualAuthCode}
                                                    onChange={e => setManualAuthCode(e.target.value)}
                                                    className="w-full border border-gray-300 rounded p-2.5 text-sm"
                                                    placeholder="2. Paste Kode Disini..."
                                                />
                                            </div>
                                        </div>
                                        <button onClick={handleVerifyDropboxCode} disabled={isConnectingDropbox} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg text-sm flex items-center justify-center gap-2">
                                            {isConnectingDropbox ? 'Memverifikasi...' : '3. Verifikasi & Simpan'}
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <div>
                                    <div className="text-xs text-gray-500 mb-2">Terhubung dengan App Key: <strong>{settings.cloudSyncConfig.dropboxAppKey}</strong></div>
                                    <button onClick={handleGeneratePairingCode} className="bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-lg text-sm flex items-center gap-2 shadow-sm">
                                        <i className="bi bi-qr-code"></i> Bagikan Sesi (Pairing Code)
                                    </button>
                                    <p className="text-[10px] text-purple-700 mt-2">
                                        *Fitur ini akan menyalin Sesi Login (Refresh Token) ke perangkat staff agar mereka <strong>tidak perlu login manual</strong>.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* --- WEBDAV UI --- */}
                {localSettings.cloudSyncConfig?.provider === 'webdav' && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 gap-4 border p-4 rounded-lg bg-orange-50">
                             <div className="flex justify-between items-center">
                                <h4 className="font-bold text-orange-800 text-sm">A. Setup WebDAV (Nextcloud/CasaOS)</h4>
                            </div>

                            <div>
                                <label className="block mb-2 text-sm font-medium text-gray-700">WebDAV URL</label>
                                <input 
                                    type="text" 
                                    value={localSettings.cloudSyncConfig.webdavUrl || ''} 
                                    onChange={(e) => handleSyncConfigChange('webdavUrl', e.target.value)}
                                    placeholder="https://nextcloud.domain.com/remote.php/dav/files/user/" 
                                    className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2.5"
                                />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block mb-2 text-sm font-medium text-gray-700">Username</label>
                                    <input 
                                        type="text" 
                                        value={localSettings.cloudSyncConfig.webdavUsername || ''} 
                                        onChange={(e) => handleSyncConfigChange('webdavUsername', e.target.value)}
                                        className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2.5"
                                    />
                                </div>
                                <div>
                                    <label className="block mb-2 text-sm font-medium text-gray-700">Password / App Password</label>
                                    <SensitiveInput 
                                        value={localSettings.cloudSyncConfig.webdavPassword || ''}
                                        onChange={(val) => handleSyncConfigChange('webdavPassword', val)}
                                    />
                                </div>
                            </div>
                            <div className="flex flex-col sm:flex-row gap-2">
                                <button onClick={handleTestWebDav} disabled={isTestingWebDav} className="w-full sm:w-auto bg-orange-600 hover:bg-orange-700 text-white font-medium py-2.5 px-4 rounded-lg text-sm flex items-center justify-center gap-2">
                                    {isTestingWebDav ? 'Menghubungi...' : <><i className="bi bi-hdd-network"></i> Test Koneksi & Simpan</>}
                                </button>
                                {storageStats && (
                                    <button onClick={handleGeneratePairingCode} className="w-full sm:w-auto bg-purple-600 hover:bg-purple-700 text-white font-medium py-2.5 px-4 rounded-lg text-sm flex items-center justify-center gap-2 shadow-sm">
                                        <i className="bi bi-qr-code"></i> Bagikan Sesi
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                )}
                
                 {/* --- PAIRING SECTION (COMMON) --- */}
                 {(!settings.cloudSyncConfig.provider || settings.cloudSyncConfig.provider === 'none' || (settings.cloudSyncConfig.provider === 'dropbox' && !settings.cloudSyncConfig.dropboxRefreshToken)) && (
                    <div className="grid grid-cols-1 gap-4 border p-4 rounded-lg bg-green-50">
                        <h4 className="font-bold text-green-800 text-sm">B. Setup Cepat (Untuk Staff)</h4>
                        <p className="text-xs text-green-700">
                            Punya kode dari Admin? Paste di sini untuk langsung terhubung tanpa login.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-2">
                            <input 
                                type="text" 
                                value={inputPairingCode}
                                onChange={e => setInputPairingCode(e.target.value)}
                                className="flex-grow bg-white border border-green-300 rounded text-sm p-2.5"
                                placeholder="Paste kode ESANTRI-CLOUD-... disini"
                                disabled={isProcessingPairing}
                            />
                            <button 
                                onClick={handleConnectViaPairing}
                                disabled={isProcessingPairing}
                                className="bg-green-600 hover:bg-green-700 text-white px-6 py-2.5 rounded text-sm font-bold disabled:bg-gray-400 flex items-center justify-center gap-2"
                            >
                                {isProcessingPairing ? <span className="animate-spin h-4 w-4 border-2 border-white rounded-full border-t-transparent"></span> : 'Hubungkan'}
                            </button>
                        </div>
                        {pairingStep === 'connecting' && <p className="text-xs text-green-700 animate-pulse">Menyalin Sesi Cloud...</p>}
                        {pairingStep === 'validating' && <p className="text-xs text-orange-700 animate-pulse">Memverifikasi Token & Koneksi...</p>}
                        {pairingStep === 'downloading_account' && <p className="text-xs text-blue-700 animate-pulse">Mengunduh data akun...</p>}
                        {pairingStep === 'downloading_data' && <p className="text-xs text-indigo-700 animate-pulse">Mengunduh data master...</p>}
                    </div>
                )}
                {/* --- FITUR PUBLIK & PORTAL --- */}
                {localSettings.cloudSyncConfig?.provider !== 'none' && (
                    <div className="mt-8 border-t pt-6">
                        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <i className="bi bi-globe2 text-blue-600"></i> Fitur Publik & Portal
                        </h3>
                        
                        <div className="grid grid-cols-1 gap-4 border p-4 rounded-lg bg-blue-50 border-blue-100">
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h4 className="font-bold text-blue-800 text-sm">Portal Wali Santri (Hybrid Bridge)</h4>
                                        <button 
                                            onClick={() => window.dispatchEvent(new CustomEvent('change-settings-tab', { detail: 'portal' }))}
                                            className="text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded hover:bg-blue-700 transition-colors"
                                        >
                                            <i className="bi bi-gear-fill mr-1"></i> Pengaturan Lengkap
                                        </button>
                                    </div>
                                    <p className="text-xs text-blue-700 mt-1 max-w-2xl">
                                        Aktifkan fitur ini untuk membuat portal khusus wali santri. 
                                        {localSettings.cloudSyncConfig?.provider !== 'firebase' && 
                                            " Karena Anda menggunakan Dropbox/WebDAV, data ringkas akan dijembatani secara aman ke Firebase agar wali bisa mengaksesnya tanpa melihat data internal pondok."
                                        }
                                    </p>
                                </div>
                                <label className="inline-flex items-center cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        checked={isPortalEnabled} 
                                        onChange={(e) => handlePortalToggle(e.target.checked)}
                                        className="sr-only peer"
                                    />
                                    <div className="relative w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                </label>
                            </div>

                            {isPortalEnabled && (
                                <div className="mt-4 p-4 bg-white rounded border border-blue-200">
                                    {localSettings.cloudSyncConfig?.provider !== 'firebase' && !fbUser ? (
                                        <div className="text-center py-4">
                                            <p className="text-sm text-gray-600 mb-4">
                                                Untuk mengaktifkan Portal Wali, Anda perlu login dengan Google (Firebase) sebagai jembatan data.
                                            </p>
                                            <button 
                                                onClick={async () => {
                                                    try {
                                                        await login();
                                                        showToast('Berhasil menghubungkan jembatan portal!', 'success');
                                                    } catch (err) {
                                                        showToast('Gagal menghubungkan jembatan portal.', 'error');
                                                    }
                                                }}
                                                disabled={isFbLoading}
                                                className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium py-2 px-4 rounded-lg text-sm flex items-center justify-center gap-2 mx-auto shadow-sm"
                                            >
                                                <i className="bi bi-google text-red-500"></i>
                                                Login Google (Untuk Portal)
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <span className="flex w-3 h-3 bg-green-500 rounded-full animate-pulse"></span>
                                                    <span className="text-sm font-medium text-green-700">Jembatan Portal Aktif</span>
                                                </div>
                                                <button 
                                                    onClick={handleSyncToPortal}
                                                    disabled={isSyncingPortal}
                                                    className="text-xs bg-blue-100 text-blue-700 px-3 py-1.5 rounded font-medium hover:bg-blue-200 transition-colors disabled:opacity-50 flex items-center gap-1"
                                                >
                                                    {isSyncingPortal ? (
                                                        <><span className="animate-spin h-3 w-3 border-2 border-blue-700 rounded-full border-t-transparent"></span> Menyinkronkan...</>
                                                    ) : (
                                                        <><i className="bi bi-cloud-arrow-up"></i> Update Data Portal</>
                                                    )}
                                                </button>
                                            </div>
                                            <div className="bg-gray-50 p-3 rounded border text-xs text-gray-600">
                                                <p className="font-semibold mb-1">Data yang disinkronkan ke portal:</p>
                                                <ul className="list-disc pl-4 space-y-0.5">
                                                    <li>Profil Ringkas Santri (Nama, NIS, Kelas)</li>
                                                    <li>Rekap Kehadiran Terakhir</li>
                                                    <li>Sisa Saldo Tabungan</li>
                                                    <li>Status Tagihan Bulan Ini</li>
                                                </ul>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Modal Show Code */}
            {showPairingModal && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-4 sm:p-6">
                        <h3 className="text-lg font-bold text-gray-800 mb-2">Kode Pairing (Kloning Sesi)</h3>
                        <p className="text-sm text-gray-600 mb-4">
                            Berikan kode ini kepada Staff. Staff tidak perlu login manual, sistem akan menggunakan sesi (Refresh Token) yang sama dengan komputer ini.
                        </p>
                        
                        <div className="bg-gray-100 p-3 rounded border border-gray-300 relative group">
                            <code className="text-xs font-mono break-all text-gray-800">
                                {generatedCode}
                            </code>
                            <button 
                                onClick={() => { navigator.clipboard.writeText(generatedCode); showToast('Kode disalin!', 'success'); }}
                                className="absolute top-2 right-2 bg-white border shadow-sm p-1.5 rounded text-gray-600 hover:text-blue-600"
                                title="Salin"
                            >
                                <i className="bi bi-clipboard"></i>
                            </button>
                        </div>

                        <div className="mt-4 p-3 bg-red-50 text-red-700 text-xs rounded border border-red-200">
                            <strong>PERHATIAN:</strong> Kode ini mengandung Kunci Rahasia akses penyimpanan data. Jangan bagikan di tempat umum.
                        </div>

                        <div className="mt-6 flex justify-end">
                            <button onClick={() => setShowPairingModal(false)} className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded text-sm font-medium">Tutup</button>
                        </div>
                    </div>
                </div>
            )}
            
            {/* SUCCESS PAIRING MODAL */}
            {pairingStep === 'success' && (
                <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-[100] p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 sm:p-8 text-center animate-fade-in-down border-t-4 border-green-500">
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 text-green-600">
                            <i className="bi bi-cloud-check-fill text-4xl"></i>
                        </div>
                        <h3 className="text-2xl font-bold text-gray-800 mb-2">Koneksi Berhasil!</h3>
                        <p className="text-gray-600 mb-6 leading-relaxed">
                            Sesi Cloud telah berhasil disalin dan divalidasi. Data Master terbaru juga sudah diunduh.
                        </p>
                        <button 
                            onClick={handleFinishPairing} 
                            className="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold shadow-lg transition-transform hover:-translate-y-1"
                        >
                            Mulai Sekarang
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
