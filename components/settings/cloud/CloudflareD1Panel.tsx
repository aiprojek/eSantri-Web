import React from 'react';
import type { PondokSettings } from '../../../types';
import { SensitiveInput } from './SensitiveInput';

interface CloudflareD1PanelProps {
    localSettings: PondokSettings;
    savedCloudConfig: PondokSettings['cloudSyncConfig'];
    onSyncConfigChange: (field: string, value: unknown) => void;
    onGeneratePairingCode: () => Promise<void>;
}

export const CloudflareD1Panel: React.FC<CloudflareD1PanelProps> = ({
    localSettings,
    savedCloudConfig,
    onSyncConfigChange,
    onGeneratePairingCode,
}) => {
    const config = localSettings.cloudSyncConfig;
    const isConfigured = Boolean(
        (config.d1WorkerUrl || savedCloudConfig.d1WorkerUrl) &&
        (config.d1ApiToken || savedCloudConfig.d1ApiToken)
    );

    return (
        <div className="space-y-6">
            <div className="app-panel-soft grid grid-cols-1 gap-4 rounded-[24px] p-5 sm:p-6">
                <div className="flex flex-wrap justify-between items-center gap-2">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-cyan-100 text-cyan-700 flex items-center justify-center font-bold text-sm">
                            <i className="bi bi-hdd-stack"></i>
                        </div>
                        <div>
                            <h4 className="font-bold text-cyan-950 text-sm">Cloudflare D1 + Workers (Model Real-Time SQLite)</h4>
                            <p className="text-[11px] text-cyan-800/80">Edge Serverless SQLite • 5 Juta Baris Baca/Hari • 100 Ribu Tulis/Hari Gratis</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => window.dispatchEvent(new CustomEvent('open-panduan', { detail: 'd1' }))}
                            className="text-xs text-cyan-800 hover:text-cyan-950 hover:underline flex items-center gap-1 font-semibold bg-cyan-100/70 hover:bg-cyan-100 px-2.5 py-1 rounded-lg border border-cyan-200 transition-colors"
                        >
                            <i className="bi bi-question-circle"></i> Panduan D1
                        </button>
                        {isConfigured && (
                            <span className="text-green-700 text-xs font-bold bg-green-100 px-2.5 py-1 rounded-full border border-green-200 flex items-center gap-1">
                                <i className="bi bi-check-circle-fill"></i> Terkonfigurasi
                            </span>
                        )}
                    </div>
                </div>

                <div className="rounded-[18px] border border-cyan-200 bg-cyan-50/80 p-3.5 text-xs text-cyan-900 space-y-1.5">
                    <div className="font-bold flex items-center gap-1.5">
                        <i className="bi bi-info-circle-fill text-cyan-600"></i> Keunggulan Cloudflare D1 untuk Pesantren:
                    </div>
                    <ul className="list-disc list-inside text-[11px] space-y-0.5 text-cyan-800">
                        <li><strong>Serverless SQLite di 300+ Kota Dunia:</strong> Latensi super cepat karena data diproses langsung di server Cloudflare terdekat.</li>
                        <li><strong>Kuota Gratis Sangat Besar:</strong> 5 Juta baris baca per hari dan 100.000 baris tulis per hari (jauh di atas kebutuhan harian pondok).</li>
                        <li><strong>Database Ringkas & Nyaman:</strong> Format SQLite yang identik dengan arsitektur Dexie.js lokal di browser.</li>
                    </ul>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                        <label className="block mb-1.5 text-xs font-bold uppercase tracking-wider text-gray-700">
                            Cloudflare Worker API URL <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={config.d1WorkerUrl || ''}
                            onChange={(e) => onSyncConfigChange('d1WorkerUrl', e.target.value)}
                            placeholder="https://esantri-sync.subdomain.workers.dev"
                            className="app-input text-xs font-mono"
                        />
                        <span className="text-[10px] text-gray-500 mt-1 block">
                            URL endpoint Cloudflare Worker yang menghubungkan aplikasi e-Santri ke database D1.
                        </span>
                    </div>

                    <div>
                        <label className="block mb-1.5 text-xs font-bold uppercase tracking-wider text-gray-700">
                            Worker Secret / Bearer API Token <span className="text-red-500">*</span>
                        </label>
                        <SensitiveInput
                            value={config.d1ApiToken || ''}
                            onChange={(val) => onSyncConfigChange('d1ApiToken', val)}
                            placeholder="Token otentikasi worker"
                        />
                        <span className="text-[10px] text-gray-500 mt-1 block">Token pengaman agar hanya admin pesantren yang bisa mengakses Worker API.</span>
                    </div>

                    <div>
                        <label className="block mb-1.5 text-xs font-bold uppercase tracking-wider text-gray-700">
                            Nama / ID Database D1 (Opsional)
                        </label>
                        <input
                            type="text"
                            value={config.d1DatabaseName || ''}
                            onChange={(e) => onSyncConfigChange('d1DatabaseName', e.target.value)}
                            placeholder="esantri-db"
                            className="app-input text-xs"
                        />
                        <span className="text-[10px] text-gray-500 mt-1 block">Nama database D1 yang diikat ke Worker (opsional untuk verifikasi).</span>
                    </div>
                </div>

                <div className="border-t border-cyan-200/60 pt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
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
