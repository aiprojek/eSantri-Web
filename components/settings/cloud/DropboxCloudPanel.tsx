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
        <div className="grid grid-cols-1 gap-4 border p-4 rounded-lg bg-blue-50">
            <div className="flex justify-between items-center">
                <h4 className="font-bold text-blue-800 text-sm">A. Setup Dropbox (Mode Desktop/Manual)</h4>
                {savedCloudConfig.dropboxRefreshToken && (
                    <span className="text-green-600 text-xs font-bold bg-green-100 px-2 py-1 rounded border border-green-200">
                        <i className="bi bi-check-circle-fill"></i> Terhubung
                    </span>
                )}
            </div>

            <div className="p-3 bg-blue-100 border border-blue-200 rounded text-[11px] text-blue-900">
                <strong>Kredensial Aplikasi:</strong> Masukkan App Key & Secret dari <a href="https://www.dropbox.com/developers/apps" target="_blank" rel="noreferrer" className="underline font-bold">Dropbox Console</a>. Keduanya wajib diisi untuk keamanan enkripsi saat membagikan akses (Pairing Code).
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
                            <button onClick={onOpenDropboxAuth} className="w-full bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 py-2.5 rounded text-sm font-medium">
                                1. Dapatkan Kode Otorisasi (Buka Browser)
                            </button>
                        </div>
                        <div className="flex-1">
                            <input
                                type="text"
                                value={manualAuthCode}
                                onChange={(e) => onManualAuthCodeChange(e.target.value)}
                                className="w-full border border-gray-300 rounded p-2.5 text-sm"
                                placeholder="2. Paste Kode Disini..."
                            />
                        </div>
                    </div>
                    <button onClick={() => { void onVerifyDropboxCode(); }} disabled={isConnectingDropbox} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg text-sm flex items-center justify-center gap-2">
                        {isConnectingDropbox ? 'Memverifikasi...' : '3. Verifikasi & Simpan'}
                    </button>
                </div>
            ) : (
                <div className="border-t border-blue-200 pt-4">
                    {(!(localSettings.cloudSyncConfig.dropboxAppKey || savedCloudConfig.dropboxAppKey) ||
                        !(localSettings.cloudSyncConfig.dropboxAppSecret || savedCloudConfig.dropboxAppSecret)) && (
                        <div className="mb-3 p-3 bg-red-50 border border-red-100 rounded text-[11px] text-red-700">
                            <i className="bi bi-exclamation-triangle-fill mr-1"></i>
                            <strong>Perhatian:</strong> Karena Anda pengguna lama, kolom <strong>App Key</strong> dan <strong>App Secret</strong> mungkin kosong. Harap isi kembali di atas lalu klik <strong>"Simpan Perubahan"</strong> di bawah agar bisa membagikan Pairing Code.
                        </div>
                    )}

                    <button onClick={() => { void onGeneratePairingCode(); }} className="bg-purple-600 hover:bg-purple-700 text-white font-medium py-2.5 px-4 rounded-lg text-sm flex items-center gap-2 shadow-sm">
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
