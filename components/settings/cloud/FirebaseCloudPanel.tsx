import React from 'react';
import type { PondokSettings, User } from '../../../types';

interface FirebaseCloudPanelProps {
    currentUser: User | null;
    fbUser: {
        uid: string;
        email: string | null;
        displayName: string | null;
        photoURL: string | null;
    } | null;
    isFbLoading: boolean;
    localSettings: PondokSettings;
    showCustomFirebase: boolean;
    onFirebaseLogin: () => Promise<void>;
    onFirebaseLogout: () => Promise<void>;
    onGeneratePairingCode: () => Promise<void>;
    onLinkEmail: () => Promise<void>;
    onUploadAllData: () => void;
    onToggleCustomFirebase: () => void;
    onSyncConfigChange: (field: string, value: unknown) => void;
}

export const FirebaseCloudPanel: React.FC<FirebaseCloudPanelProps> = ({
    currentUser,
    fbUser,
    isFbLoading,
    localSettings,
    showCustomFirebase,
    onFirebaseLogin,
    onFirebaseLogout,
    onGeneratePairingCode,
    onLinkEmail,
    onUploadAllData,
    onToggleCustomFirebase,
    onSyncConfigChange,
}) => (
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
                        onClick={() => { void onFirebaseLogin(); }}
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
                        <button onClick={() => { void onFirebaseLogout(); }} className="ml-auto text-xs text-red-600 hover:text-red-800 font-medium">
                            Logout
                        </button>
                    </div>

                    {fbUser && !currentUser?.email && (
                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
                            <div className="text-xs text-blue-800">
                                <i className="bi bi-link-45deg mr-1"></i>
                                Hubungkan email <strong>{fbUser.email}</strong> ke akun lokal Anda agar bisa login via Google nanti.
                            </div>
                            <button onClick={() => { void onLinkEmail(); }} className="bg-blue-600 text-white text-[10px] px-2 py-1 rounded hover:bg-blue-700">
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
                            onClick={onUploadAllData}
                            className="flex-1 bg-teal-600 hover:bg-teal-700 text-white font-medium py-2.5 px-4 rounded-lg text-sm flex items-center justify-center gap-2"
                        >
                            <i className="bi bi-cloud-upload"></i> Upload Data
                        </button>

                        {!localSettings.cloudSyncConfig.firebasePairedTenantId && (
                            <button
                                onClick={() => { void onGeneratePairingCode(); }}
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
                    onClick={onToggleCustomFirebase}
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
                                    onChange={(e) => onSyncConfigChange('firebaseApiKey', e.target.value)}
                                    className="w-full text-xs p-2 border rounded mt-1"
                                    placeholder="AIzaSy..."
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-gray-700 uppercase">Project ID</label>
                                <input
                                    type="text"
                                    value={localSettings.cloudSyncConfig.firebaseProjectId || ''}
                                    onChange={(e) => onSyncConfigChange('firebaseProjectId', e.target.value)}
                                    className="w-full text-xs p-2 border rounded mt-1"
                                    placeholder="my-project-id"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-gray-700 uppercase">Auth Domain</label>
                                <input
                                    type="text"
                                    value={localSettings.cloudSyncConfig.firebaseAuthDomain || ''}
                                    onChange={(e) => onSyncConfigChange('firebaseAuthDomain', e.target.value)}
                                    className="w-full text-xs p-2 border rounded mt-1"
                                    placeholder="my-project.firebaseapp.com"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-gray-700 uppercase">App ID</label>
                                <input
                                    type="text"
                                    value={localSettings.cloudSyncConfig.firebaseAppId || ''}
                                    onChange={(e) => onSyncConfigChange('firebaseAppId', e.target.value)}
                                    className="w-full text-xs p-2 border rounded mt-1"
                                    placeholder="1:123456789:web:..."
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-gray-700 uppercase">Database ID (Optional)</label>
                                <input
                                    type="text"
                                    value={localSettings.cloudSyncConfig.firebaseDatabaseId || ''}
                                    onChange={(e) => onSyncConfigChange('firebaseDatabaseId', e.target.value)}
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
);
