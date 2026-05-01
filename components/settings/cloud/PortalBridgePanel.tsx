import React from 'react';

interface PortalBridgePanelProps {
    provider: string | undefined;
    fbUser: { uid: string } | null;
    isPortalEnabled: boolean;
    isFbLoading: boolean;
    isSyncingPortal: boolean;
    onPortalToggle: (checked: boolean) => void;
    onOpenPortalSettings: () => void;
    onPortalBridgeLogin: () => Promise<void>;
    onSyncToPortal: () => Promise<void>;
}

export const PortalBridgePanel: React.FC<PortalBridgePanelProps> = ({
    provider,
    fbUser,
    isPortalEnabled,
    isFbLoading,
    isSyncingPortal,
    onPortalToggle,
    onOpenPortalSettings,
    onPortalBridgeLogin,
    onSyncToPortal,
}) => (
    <div className="mt-8 border-t pt-6">
        <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-gray-800">
            <i className="bi bi-globe2 text-blue-600"></i> Fitur Publik & Portal
        </h3>

        <div className="app-panel-soft grid grid-cols-1 gap-4 rounded-[24px] border-blue-100 p-5 sm:p-6">
            <div className="flex justify-between items-start">
                <div>
                    <div className="flex items-center gap-2">
                        <h4 className="font-bold text-blue-800 text-sm">Portal Wali Santri (Hybrid Bridge)</h4>
                        <button
                            onClick={onOpenPortalSettings}
                            className="rounded-[12px] bg-blue-600 px-2 py-0.5 text-[10px] text-white transition-colors hover:bg-blue-700"
                        >
                            <i className="bi bi-gear-fill mr-1"></i> Pengaturan Lengkap
                        </button>
                    </div>
                    <p className="text-xs text-blue-700 mt-1 max-w-2xl">
                        Aktifkan fitur ini untuk membuat portal khusus wali santri.
                        {provider !== 'firebase' &&
                            ' Karena Anda menggunakan Dropbox/WebDAV, data ringkas akan dijembatani secara aman ke Firebase agar wali bisa mengaksesnya tanpa melihat data internal pondok.'}
                    </p>
                </div>
                <label className="inline-flex cursor-pointer items-center">
                    <input
                        type="checkbox"
                        checked={isPortalEnabled}
                        onChange={(e) => onPortalToggle(e.target.checked)}
                        className="sr-only peer"
                    />
                    <div className="relative w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
            </div>

            {isPortalEnabled && (
                <div className="mt-4 p-4 bg-white rounded border border-blue-200">
                    {provider !== 'firebase' && !fbUser ? (
                        <div className="text-center py-4">
                            <p className="text-sm text-gray-600 mb-4">
                                Untuk mengaktifkan Portal Wali, Anda perlu login dengan Google (Firebase) sebagai jembatan data.
                            </p>
                            <button
                                onClick={() => { void onPortalBridgeLogin(); }}
                                disabled={isFbLoading}
                                className="app-button-secondary mx-auto px-4 py-2 text-sm"
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
                                    onClick={() => { void onSyncToPortal(); }}
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
                            <div className="rounded-[18px] border bg-gray-50 p-3 text-xs text-gray-600">
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
);
