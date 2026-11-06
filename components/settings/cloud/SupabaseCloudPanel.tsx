import React from 'react';
import type { PondokSettings } from '../../../types';
import { SensitiveInput } from './SensitiveInput';

interface SupabaseCloudPanelProps {
    localSettings: PondokSettings;
    savedCloudConfig: PondokSettings['cloudSyncConfig'];
    onSyncConfigChange: (field: string, value: unknown) => void;
    onGeneratePairingCode: () => Promise<void>;
}

export const SupabaseCloudPanel: React.FC<SupabaseCloudPanelProps> = ({
    localSettings,
    savedCloudConfig,
    onSyncConfigChange,
    onGeneratePairingCode,
}) => {
    const config = localSettings.cloudSyncConfig;
    const isConfigured = Boolean(
        (config.supabaseUrl || savedCloudConfig.supabaseUrl) &&
        (config.supabaseAnonKey || savedCloudConfig.supabaseAnonKey)
    );

    return (
        <div className="space-y-6">
            <div className="app-panel-soft grid grid-cols-1 gap-4 rounded-[24px] p-5 sm:p-6">
                <div className="flex flex-wrap justify-between items-center gap-2">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold text-sm">
                            <i className="bi bi-database-check"></i>
                        </div>
                        <div>
                            <h4 className="font-bold text-emerald-950 text-sm">Supabase (Model Real-Time Live Sync)</h4>
                            <p className="text-[11px] text-emerald-800/80">PostgreSQL Cloud • 500 MB Database Gratis • Realtime WebSocket Channels</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => window.dispatchEvent(new CustomEvent('open-panduan', { detail: 'supabase' }))}
                            className="text-xs text-emerald-700 hover:text-emerald-900 hover:underline flex items-center gap-1 font-semibold bg-emerald-100/70 hover:bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-200 transition-colors"
                        >
                            <i className="bi bi-question-circle"></i> Panduan Supabase
                        </button>
                        {isConfigured && (
                            <span className="text-green-700 text-xs font-bold bg-green-100 px-2.5 py-1 rounded-full border border-green-200 flex items-center gap-1">
                                <i className="bi bi-check-circle-fill"></i> Terkonfigurasi
                            </span>
                        )}
                    </div>
                </div>

                <div className="rounded-[18px] border border-emerald-200 bg-emerald-50/80 p-3.5 text-xs text-emerald-900 space-y-1.5">
                    <div className="font-bold flex items-center gap-1.5">
                        <i className="bi bi-info-circle-fill text-emerald-600"></i> Keunggulan Supabase untuk Pesantren:
                    </div>
                    <ul className="list-disc list-inside text-[11px] space-y-0.5 text-emerald-800">
                        <li><strong>Live Realtime Collaboration:</strong> Saat bendahara menginput SPP santri, layar admin lain langsung ter-update seketika lewat WebSocket.</li>
                        <li><strong>PostgreSQL Terstruktur:</strong> Data tersimpan rapi dalam tabel relasional dengan backup berkala.</li>
                        <li><strong>Tingkat Gratis Lega:</strong> 500 MB penyimpanan database gratis, 50.000 pengguna aktif per bulan, 5 GB bandwidth.</li>
                    </ul>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                        <label className="block mb-1.5 text-xs font-bold uppercase tracking-wider text-gray-700">
                            Project URL Supabase <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={config.supabaseUrl || ''}
                            onChange={(e) => onSyncConfigChange('supabaseUrl', e.target.value)}
                            placeholder="https://xyzabcdefghijklmn.supabase.co"
                            className="app-input text-xs font-mono"
                        />
                        <span className="text-[10px] text-gray-500 mt-1 block">Dapat ditemukan di Supabase Console &gt; Project Settings &gt; API.</span>
                    </div>

                    <div>
                        <label className="block mb-1.5 text-xs font-bold uppercase tracking-wider text-gray-700">
                            Supabase Anon / Public API Key <span className="text-red-500">*</span>
                        </label>
                        <SensitiveInput
                            value={config.supabaseAnonKey || ''}
                            onChange={(val) => onSyncConfigChange('supabaseAnonKey', val)}
                            placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                        />
                        <span className="text-[10px] text-gray-500 mt-1 block">Gunakan API Key anon/public (bukan service_role) untuk keamanan browser.</span>
                    </div>

                    <div>
                        <label className="block mb-1.5 text-xs font-bold uppercase tracking-wider text-gray-700">
                            Table Prefix (Opsional)
                        </label>
                        <input
                            type="text"
                            value={config.supabaseTablePrefix || ''}
                            onChange={(e) => onSyncConfigChange('supabaseTablePrefix', e.target.value)}
                            placeholder="esantri_ (default)"
                            className="app-input text-xs"
                        />
                        <span className="text-[10px] text-gray-500 mt-1 block">Awalan nama tabel di database Supabase (misal: esantri_santri).</span>
                    </div>
                </div>

                <div className="border-t border-emerald-200/60 pt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <p className="text-xs text-gray-600">
                        Klik <strong>"Simpan Perubahan"</strong> di bawah untuk menerapkan konfigurasi ini.
                    </p>
                    {isConfigured && (
                        <button
                            type="button"
                            onClick={() => { void onGeneratePairingCode(); }}
                            className="flex items-center gap-2 rounded-[16px] bg-purple-600 px-4 py-2 text-xs font-medium text-white shadow-soft transition-colors hover:bg-purple-700"
                        >
                            <i className="bi bi-qr-code"></i> Bagikan Akses ke Staff (Pairing Code)
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
