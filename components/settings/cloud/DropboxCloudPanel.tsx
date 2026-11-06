import React from 'react';
import type { PondokSettings } from '../../../types';
import { SensitiveInput } from './SensitiveInput';

interface DropboxCloudPanelProps {
    localSettings: PondokSettings;
    savedCloudConfig: PondokSettings['cloudSyncConfig'];
    manualAuthCode: string;
    isConnectingDropbox: boolean;
    onManualAuthCodeChange: (value: string) => void;
    onSyncConfigChange: (field: string, value: unknown) => void;
    onOpenDropboxAuth: () => void;
    onVerifyDropboxCode: () => Promise<void>;
    onGeneratePairingCode: () => Promise<void>;
}

export const DropboxCloudPanel: React.FC<DropboxCloudPanelProps> = ({
    localSettings,
    savedCloudConfig,
    manualAuthCode,
    isConnectingDropbox,
    onManualAuthCodeChange,
    onSyncConfigChange,
    onOpenDropboxAuth,
    onVerifyDropboxCode,
    onGeneratePairingCode,
}) => (
    <div className="space-y-6">
        <div className="app-panel-soft grid grid-cols-1 gap-4 rounded-[24px] p-5 sm:p-6">
            <div className="flex justify-between items-center">
                <h4 className="font-bold text-blue-800 text-sm">Setup Dropbox (Hub &amp; Spoke)</h4>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => window.dispatchEvent(new CustomEvent('open-panduan', { detail: 'cloud' }))}
                        className="text-xs text-blue-700 hover:text-blue-900 hover:underline flex items-center gap-1 font-semibold bg-blue-100/70 hover:bg-blue-100 px-2.5 py-1 rounded-lg border border-blue-200 transition-colors"
                    >
                        <i className="bi bi-question-circle"></i> Panduan Dropbox
                    </button>
                    {savedCloudConfig.dropboxRefreshToken && (
                        <span className="text-green-600 text-xs font-bold bg-green-100 px-2.5 py-1 rounded-full border border-green-200 flex items-center gap-1">
                            <i className="bi bi-check-circle-fill"></i> Terhubung
                        </span>
                    )}
                </div>
            </div>

            <div className="rounded-[18px] border border-blue-200 bg-blue-100 p-3 text-[11px] text-blue-900 space-y-1">
                <div>
                    <strong>Kredensial Aplikasi:</strong> Masukkan App Key &amp; Secret dari <a href="https://www.dropbox.com/developers/apps" target="_blank" rel="noreferrer" className="underline font-bold">Dropbox Developer Console</a>. Keduanya wajib diisi untuk keamanan enkripsi saat membagikan akses (Pairing Code).
                </div>
                <div className="text-[10px] text-blue-800 pt-1 border-t border-blue-200/60 flex items-start gap-1.5">
                    <i className="bi bi-info-circle-fill text-blue-600 shrink-0 mt-0.5"></i>
                    <span><strong>Info Kuota Perangkat:</strong> Dropbox Basic gratis membatasi maksimal 3 perangkat terhubung per akun. Jika pesantren Anda mengoperasikan &gt;3 laptop/perangkat admin, gunakan opsi <strong>Cloudflare R2</strong> (10 GB gratis, tanpa batas perangkat) atau <strong>WebDAV</strong>.</span>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block mb-2 text-sm font-medium text-gray-700">App Key</label>
                    <SensitiveInput
                        value={localSettings.cloudSyncConfig.dropboxAppKey || ''}
                        onChange={(val) => onSyncConfigChange('dropboxAppKey', val)}
                        placeholder="App Key"
                    />
                </div>
                <div>
                    <label className="block mb-2 text-sm font-medium text-gray-700">App Secret</label>
                    <SensitiveInput
                        value={localSettings.cloudSyncConfig.dropboxAppSecret || ''}
                        onChange={(val) => onSyncConfigChange('dropboxAppSecret', val)}
                        placeholder="App Secret"
                    />
                </div>
            </div>

            {!savedCloudConfig.dropboxRefreshToken ? (
                <div className="border-t border-blue-200 pt-4">
                    <label className="block mb-2 text-sm font-bold text-gray-700">Langkah Otorisasi:</label>
                    <div className="flex flex-col sm:flex-row gap-2 mb-3">
                        <div className="flex-1">
                            <button onClick={onOpenDropboxAuth} className="app-button-secondary w-full py-2.5 text-sm">
                                1. Dapatkan Kode Otorisasi (Buka Browser)
                            </button>
                        </div>
                        <div className="flex-1">
                            <input
                                type="text"
                                value={manualAuthCode}
                                onChange={(e) => onManualAuthCodeChange(e.target.value)}
                                className="app-input text-sm"
                                placeholder="2. Paste Kode Disini..."
                            />
                        </div>
                    </div>
                    <button onClick={() => { void onVerifyDropboxCode(); }} disabled={isConnectingDropbox} className="app-button-primary w-full px-4 py-3 text-sm">
                        {isConnectingDropbox ? 'Memverifikasi...' : '3. Verifikasi & Simpan'}
                    </button>
                </div>
            ) : (
                <div className="border-t border-blue-200 pt-4">
                    {(!(localSettings.cloudSyncConfig.dropboxAppKey || savedCloudConfig.dropboxAppKey) ||
                        !(localSettings.cloudSyncConfig.dropboxAppSecret || savedCloudConfig.dropboxAppSecret)) && (
                        <div className="mb-3 rounded-[18px] border border-red-100 bg-red-50 p-3 text-[11px] text-red-700">
                            <i className="bi bi-exclamation-triangle-fill mr-1"></i>
                            <strong>Perhatian:</strong> Karena Anda pengguna lama, kolom <strong>App Key</strong> dan <strong>App Secret</strong> mungkin kosong. Harap isi kembali di atas lalu klik <strong>"Simpan Perubahan"</strong> di bawah agar bisa membagikan Pairing Code.
                        </div>
                    )}

                    <button onClick={() => { void onGeneratePairingCode(); }} className="flex items-center gap-2 rounded-[16px] bg-purple-600 px-4 py-2.5 text-sm font-medium text-white shadow-soft transition-colors hover:bg-purple-700">
                        <i className="bi bi-qr-code"></i> Bagikan Sesi (Pairing Code)
                    </button>
                    <p className="text-[10px] text-purple-700 mt-2">
                        *Fitur ini akan menyalin Sesi Login (Refresh Token) ke perangkat staff agar mereka <strong>tidak perlu login manual</strong>.
                    </p>
                </div>
            )}
        </div>
    </div>
);
