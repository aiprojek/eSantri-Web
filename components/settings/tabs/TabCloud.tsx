
import React, { useState, useEffect } from 'react';
import { PondokSettings, SyncProvider, StorageStats } from '../../../types';
import { useAppContext } from '../../../AppContext';
import { getCloudStorageStats, exchangeCodeForToken, getValidDropboxToken } from '../../../services/syncService';
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

// PKCE Helper Functions
const generateCodeVerifier = () => {
    const array = new Uint8Array(32);
    window.crypto.getRandomValues(array);
    return Array.from(array, dec => ('0' + dec.toString(16)).substr(-2)).join('');
};

const generateCodeChallenge = async (verifier: string) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const digest = await window.crypto.subtle.digest('SHA-256', data);
    const base64Digest = btoa(String.fromCharCode(...new Uint8Array(digest)));
    return base64Digest.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
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
    
    const currentRedirectUri = window.location.origin + window.location.pathname;

    useEffect(() => {
        const fetchStats = async () => {
            const config = settings.cloudSyncConfig;
            if (config.provider === 'none') {
                setStorageStats(null);
                return;
            }

            setIsLoadingStats(true);
            try {
                if (config.provider === 'dropbox' && config.dropboxToken) {
                    const stats = await getCloudStorageStats(config);
                    setStorageStats(stats);
                }
            } catch (error) {
                // Now showing user-facing error for configuration issues in the UI
                showToast(`Gagal memuat status Dropbox: ${(error as Error).message}`, 'error');
            } finally {
                setIsLoadingStats(false);
            }
        };
        fetchStats();
    }, [settings.cloudSyncConfig, showToast]);

    useEffect(() => {
        const handleAuthCallback = async () => {
            const urlParams = new URLSearchParams(window.location.search);
            const code = urlParams.get('code');
            const storedVerifier = sessionStorage.getItem('dropbox_code_verifier');

            if (code && storedVerifier && settings.cloudSyncConfig.provider === 'dropbox') {
                window.history.replaceState({}, document.title, window.location.pathname);
                setIsConnectingDropbox(true);
                try {
                    const result = await exchangeCodeForToken(settings.cloudSyncConfig.dropboxAppKey!, code, storedVerifier);
                    const updatedConfig = {
                        ...settings.cloudSyncConfig,
                        dropboxToken: result.access_token,
                        dropboxRefreshToken: result.refresh_token,
                        dropboxTokenExpiresAt: Date.now() + (result.expires_in * 1000)
                    };
                    await onSaveSettings({ ...settings, cloudSyncConfig: updatedConfig });
                    sessionStorage.removeItem('dropbox_code_verifier');
                    showToast('Berhasil terhubung dengan Dropbox!', 'success');
                } catch (error) {
                    showToast(`Gagal menghubungkan Dropbox: ${(error as Error).message}`, 'error');
                } finally {
                    setIsConnectingDropbox(false);
                }
            }
        };
        handleAuthCallback();
    }, []);

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

    const handleConnectDropbox = async () => {
        const appKey = localSettings.cloudSyncConfig.dropboxAppKey;
        if (!appKey) {
            showToast('Harap isi App Key terlebih dahulu.', 'error');
            return;
        }
        if (appKey !== settings.cloudSyncConfig.dropboxAppKey) {
            await onSaveSettings(localSettings);
        }
        const verifier = generateCodeVerifier();
        const challenge = await generateCodeChallenge(verifier);
        sessionStorage.setItem('dropbox_code_verifier', verifier);
        const redirectUri = window.location.origin + window.location.pathname;
        const authUrl = `https://www.dropbox.com/oauth2/authorize?client_id=${appKey}&response_type=code&code_challenge=${challenge}&code_challenge_method=S256&token_access_type=offline&redirect_uri=${encodeURIComponent(redirectUri)}`;
        window.location.href = authUrl;
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
            <h2 className="text-xl font-bold text-gray-700 mb-4 border-b pb-2">Konfigurasi Sinkronisasi Dropbox</h2>
            <p className="text-sm text-gray-600 mb-4">
                Hubungkan aplikasi ke Dropbox untuk backup otomatis dan kolaborasi tim (Hub & Spoke).
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
                        <option value="dropbox">Dropbox</option>
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
                                    Auto Sync (Push & Pull)
                                </span>
                            </label>
                        </div>
                    </div>
                )}

                {localSettings.cloudSyncConfig?.provider === 'dropbox' && (
                    <div className="col-span-2 grid grid-cols-1 gap-4 border p-4 rounded-lg bg-blue-50">
                        <div className="p-3 bg-blue-100 border border-blue-300 rounded text-xs text-blue-900">
                            <strong>Setup Otomatis:</strong> Masukkan <strong>App Key</strong> Anda, lalu klik tombol "Hubungkan".
                            <br/>Pastikan URL berikut ada di <strong>Redirect URIs</strong> Dropbox App Console:
                            <code className="block mt-1 p-1 bg-white border border-blue-200 rounded select-all font-mono text-xs break-all">{currentRedirectUri}</code>
                        </div>
                        <div>
                            <label className="block mb-2 text-sm font-medium text-gray-700">App Key</label>
                            <SensitiveInput 
                                value={localSettings.cloudSyncConfig.dropboxAppKey || ''}
                                onChange={(val) => handleSyncConfigChange('dropboxAppKey', val)}
                                placeholder="Dapatkan dari Dropbox App Console"
                            />
                        </div>
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                 <label className="block text-sm font-medium text-gray-700">Status Koneksi</label>
                            </div>
                            <div className="flex items-center gap-3">
                                <button 
                                    onClick={handleConnectDropbox}
                                    disabled={isConnectingDropbox}
                                    className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg text-sm flex items-center gap-2"
                                >
                                    {isConnectingDropbox ? 'Menghubungkan...' : <><i className="bi bi-dropbox"></i> Hubungkan ke Dropbox</>}
                                </button>
                                {settings.cloudSyncConfig.dropboxRefreshToken ? (
                                    <span className="text-green-600 text-sm font-semibold flex items-center gap-1"><i className="bi bi-check-circle-fill"></i> Terhubung</span>
                                ) : (
                                    <span className="text-gray-500 text-sm italic">Belum terhubung</span>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
