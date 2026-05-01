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
        <div className="app-panel-soft grid grid-cols-1 gap-4 rounded-[24px] p-5 sm:p-6">
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
                    className="app-input text-sm"
                />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block mb-2 text-sm font-medium text-gray-700">Username</label>
                    <input
                        type="text"
                        value={localSettings.cloudSyncConfig.webdavUsername || ''}
                        onChange={(e) => onSyncConfigChange('webdavUsername', e.target.value)}
                        className="app-input text-sm"
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
                <button onClick={() => { void onTestWebDav(); }} disabled={isTestingWebDav} className="flex w-full items-center justify-center gap-2 rounded-[16px] bg-orange-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-orange-700 sm:w-auto">
                    {isTestingWebDav ? 'Menghubungi...' : <><i className="bi bi-hdd-network"></i> Test Koneksi & Simpan</>}
                </button>
                {storageStats && (
                    <button onClick={() => { void onGeneratePairingCode(); }} className="flex w-full items-center justify-center gap-2 rounded-[16px] bg-purple-600 px-4 py-2.5 text-sm font-medium text-white shadow-soft transition-colors hover:bg-purple-700 sm:w-auto">
                        <i className="bi bi-qr-code"></i> Bagikan Sesi
                    </button>
                )}
            </div>
        </div>
    </div>
);
