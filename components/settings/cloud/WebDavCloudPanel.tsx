import React from 'react';
import type { PondokSettings, StorageStats } from '../../../types';
import { SensitiveInput } from './SensitiveInput';

interface WebDavCloudPanelProps {
    localSettings: PondokSettings;
    storageStats: StorageStats | null;
    isTestingWebDav: boolean;
    onSyncConfigChange: (field: string, value: unknown) => void;
    onTestWebDav: () => Promise<void>;
    onGeneratePairingCode: () => Promise<void>;
}

export const WebDavCloudPanel: React.FC<WebDavCloudPanelProps> = ({
    localSettings,
    storageStats,
    isTestingWebDav,
    onSyncConfigChange,
    onTestWebDav,
    onGeneratePairingCode,
}) => (
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
                    onChange={(e) => onSyncConfigChange('webdavUrl', e.target.value)}
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
                        onChange={(e) => onSyncConfigChange('webdavUsername', e.target.value)}
                        className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2.5"
                    />
                </div>
                <div>
                    <label className="block mb-2 text-sm font-medium text-gray-700">Password / App Password</label>
                    <SensitiveInput
                        value={localSettings.cloudSyncConfig.webdavPassword || ''}
                        onChange={(val) => onSyncConfigChange('webdavPassword', val)}
                    />
                </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
                <button onClick={() => { void onTestWebDav(); }} disabled={isTestingWebDav} className="w-full sm:w-auto bg-orange-600 hover:bg-orange-700 text-white font-medium py-2.5 px-4 rounded-lg text-sm flex items-center justify-center gap-2">
                    {isTestingWebDav ? 'Menghubungi...' : <><i className="bi bi-hdd-network"></i> Test Koneksi & Simpan</>}
                </button>
                {storageStats && (
                    <button onClick={() => { void onGeneratePairingCode(); }} className="w-full sm:w-auto bg-purple-600 hover:bg-purple-700 text-white font-medium py-2.5 px-4 rounded-lg text-sm flex items-center justify-center gap-2 shadow-sm">
                        <i className="bi bi-qr-code"></i> Bagikan Sesi
                    </button>
                )}
            </div>
        </div>
    </div>
);
