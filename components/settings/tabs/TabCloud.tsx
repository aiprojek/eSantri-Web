
import React, { useState, useEffect } from 'react';
import { PondokSettings, SyncProvider, StorageStats } from '../../../types';
import { useAppContext } from '../../../AppContext';
import { getCloudStorageStats, exchangeCodeForToken, downloadAndMergeMaster, updateAccountFromCloud } from '../../../services/syncService';
import { formatBytes } from '../../../utils/formatters';

const StorageIndicator: React.FC<{ stats: StorageStats | null, isLoading: boolean }> = ({ stats, isLoading }) => {
    if (isLoading) return <div className="text-xs text-gray-500 mt-2 animate-pulse">Memuat data penyimpanan...</div>;
    if (!stats) return null;

    const percent = stats.percent || 0;
    let colorClass = 'bg-blue-600';
    if (percent > 75) colorClass = 'bg-yellow-500';
    if (percent > 90) colorClass = 'bg-red-600';

    return (
        <div className="mt-3 bg-white p-3 rounded border border-gray-200">
            <div className="flex justify-between mb-1">
                <span className="text-xs font-medium text-gray-700">Penyimpanan Digunakan</span>
                <span className="text-xs font-medium text-gray-700">{formatBytes(stats.used)} / {stats.total ? formatBytes(stats.total) : 'Unlimited'}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div className={`${colorClass} h-2.5 rounded-full transition-all duration-500`} style={{ width: `${Math.min(percent, 100)}%` }}></div>
            </div>
            <div className="text-right mt-1">
                <span className="text-[10px] text-gray-500">{percent.toFixed(1)}% Terpakai</span>
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
    const { settings, showToast } = useAppContext();
    const [isConnectingDropbox, setIsConnectingDropbox] = useState(false);
    const [storageStats, setStorageStats] = useState<StorageStats | null>(null);
    const [isLoadingStats, setIsLoadingStats] = useState(false);
    const [isTestingWebDav, setIsTestingWebDav] = useState(false);
    
    // Manual Auth Flow State
    const [manualAuthCode, setManualAuthCode] = useState('');
    
    // Pairing States
    const [showPairingModal, setShowPairingModal] = useState(false);
    const [generatedCode, setGeneratedCode] = useState('');
    const [inputPairingCode, setInputPairingCode] = useState('');
    const [isProcessingPairing, setIsProcessingPairing] = useState(false);
    const [pairingStep, setPairingStep] = useState(''); 

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
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block mb-2 text-sm font-medium text-gray-700">Penyedia Layanan</label>
                    <select 
                        value={localSettings.cloudSyncConfig?.provider || 'none'} 
                        onChange={(e) => handleSyncProviderChange(e.target.value as SyncProvider)}
                        className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2.5"
                    >
                        <option value="none">Tidak Aktif</option>
                        <option value="dropbox">Dropbox (Mudah & Gratis)</option>
                        <option value="webdav">WebDAV / Nextcloud (Self-Hosted/CasaOS)</option>
                    </select>
                    <StorageIndicator stats={storageStats} isLoading={isLoadingStats} />
                </div>

                {localSettings.cloudSyncConfig?.provider !== 'none' && (
                    <div className="flex flex-col gap-4 mt-1">
                        <div className="flex items-center mt-6">
                            <label className="inline-flex items-center cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    checked={localSettings.cloudSyncConfig?.autoSync || false} 
                                    onChange={(e) => handleSyncConfigChange('autoSync', e.target.checked)}
                                    className="sr-only peer"
                                />
                                <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-teal-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
                                <span className="ms-3 text-sm font-medium text-gray-900">
                                    Auto Sync (Otomatis Tiap 5 Menit)
                                </span>
                            </label>
                        </div>
                    </div>
                )}

                {/* --- DROPBOX UI (MANUAL FLOW) --- */}
                {localSettings.cloudSyncConfig?.provider === 'dropbox' && (
                    <div className="col-span-2 space-y-6">
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
                                    <div className="grid grid-cols-2 gap-4">
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
                                        <div className="flex gap-2 mb-3">
                                            <div className="flex-1">
                                                <button onClick={handleOpenDropboxAuth} className="w-full bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 py-2 rounded text-sm font-medium">
                                                    1. Dapatkan Kode Otorisasi (Buka Browser)
                                                </button>
                                            </div>
                                            <div className="flex-1">
                                                <input 
                                                    type="text" 
                                                    value={manualAuthCode}
                                                    onChange={e => setManualAuthCode(e.target.value)}
                                                    className="w-full border border-gray-300 rounded p-2 text-sm"
                                                    placeholder="2. Paste Kode Disini..."
                                                />
                                            </div>
                                        </div>
                                        <button onClick={handleVerifyDropboxCode} disabled={isConnectingDropbox} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg text-sm flex items-center justify-center gap-2">
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
                    <div className="col-span-2 space-y-6">
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
                            <div className="grid grid-cols-2 gap-4">
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
                            <div className="flex gap-2">
                                <button onClick={handleTestWebDav} disabled={isTestingWebDav} className="bg-orange-600 hover:bg-orange-700 text-white font-medium py-2 px-4 rounded-lg text-sm flex items-center gap-2">
                                    {isTestingWebDav ? 'Menghubungi...' : <><i className="bi bi-hdd-network"></i> Test Koneksi & Simpan</>}
                                </button>
                                {storageStats && (
                                    <button onClick={handleGeneratePairingCode} className="bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-lg text-sm flex items-center gap-2 shadow-sm">
                                        <i className="bi bi-qr-code"></i> Bagikan Sesi
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                )}
                
                 {/* --- PAIRING SECTION (COMMON) --- */}
                 {(!settings.cloudSyncConfig.provider || settings.cloudSyncConfig.provider === 'none' || (settings.cloudSyncConfig.provider === 'dropbox' && !settings.cloudSyncConfig.dropboxRefreshToken)) && (
                    <div className="col-span-2 grid grid-cols-1 gap-4 border p-4 rounded-lg bg-green-50">
                        <h4 className="font-bold text-green-800 text-sm">B. Setup Cepat (Untuk Staff)</h4>
                        <p className="text-xs text-green-700">
                            Punya kode dari Admin? Paste di sini untuk langsung terhubung tanpa login.
                        </p>
                        <div className="flex gap-2">
                            <input 
                                type="text" 
                                value={inputPairingCode}
                                onChange={e => setInputPairingCode(e.target.value)}
                                className="flex-grow bg-white border border-green-300 rounded text-sm p-2"
                                placeholder="Paste kode ESANTRI-CLOUD-... disini"
                                disabled={isProcessingPairing}
                            />
                            <button 
                                onClick={handleConnectViaPairing}
                                disabled={isProcessingPairing}
                                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm font-bold disabled:bg-gray-400 flex items-center gap-2"
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
            </div>

            {/* Modal Show Code */}
            {showPairingModal && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6">
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
                    <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-8 text-center animate-fade-in-down border-t-4 border-green-500">
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
