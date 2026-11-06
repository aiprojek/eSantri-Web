import React from 'react';
import type { PondokSettings } from '../../../types';
import { SensitiveInput } from './SensitiveInput';

interface R2CloudPanelProps {
    localSettings: PondokSettings;
    savedCloudConfig: PondokSettings['cloudSyncConfig'];
    onSyncConfigChange: (field: string, value: unknown) => void;
    onGeneratePairingCode: () => Promise<void>;
}

export const R2CloudPanel: React.FC<R2CloudPanelProps> = ({
    localSettings,
    savedCloudConfig,
    onSyncConfigChange,
    onGeneratePairingCode,
}) => {
    const config = localSettings.cloudSyncConfig;
    const isConfigured = Boolean(
        (config.r2AccountId || savedCloudConfig.r2AccountId) &&
        (config.r2AccessKeyId || savedCloudConfig.r2AccessKeyId) &&
        (config.r2BucketName || savedCloudConfig.r2BucketName)
    );

    return (
        <div className="space-y-6">
            <div className="app-panel-soft grid grid-cols-1 gap-4 rounded-[24px] p-5 sm:p-6">
                <div className="flex flex-wrap justify-between items-center gap-2">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-sm">
                            <i className="bi bi-box-seam"></i>
                        </div>
                        <div>
                            <h4 className="font-bold text-orange-950 text-sm">Cloudflare R2 (Model Hub & Spoke)</h4>
                            <p className="text-[11px] text-orange-800/80">S3-Compatible Object Storage • 10 GB Gratis • $0 Egress Fee</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => window.dispatchEvent(new CustomEvent('open-panduan', { detail: 'r2' }))}
                            className="text-xs text-orange-700 hover:text-orange-900 hover:underline flex items-center gap-1 font-semibold bg-orange-100/70 hover:bg-orange-100 px-2.5 py-1 rounded-lg border border-orange-200 transition-colors"
                        >
                            <i className="bi bi-question-circle"></i> Panduan R2
                        </button>
                        {isConfigured && (
                            <span className="text-green-700 text-xs font-bold bg-green-100 px-2.5 py-1 rounded-full border border-green-200 flex items-center gap-1">
                                <i className="bi bi-check-circle-fill"></i> Terkonfigurasi
                            </span>
                        )}
                    </div>
                </div>

                <div className="rounded-[18px] border border-orange-200 bg-orange-50/80 p-3.5 text-xs text-orange-900 space-y-1.5">
                    <div className="font-bold flex items-center gap-1.5">
                        <i className="bi bi-info-circle-fill text-orange-600"></i> Keunggulan Cloudflare R2 untuk Pesantren:
                    </div>
                    <ul className="list-disc list-inside text-[11px] space-y-0.5 text-orange-800">
                        <li><strong>10 GB Kuota Gratis Permanen:</strong> Cukup untuk ribuan file backup JSON terenkripsi dan master santri.</li>
                        <li><strong>Tanpa Biaya Egress ($0 Bandwidth):</strong> Berbeda dengan AWS S3, mengunduh data di R2 gratis tanpa biaya tak terduga.</li>
                        <li><strong>Kredensial Awet:</strong> Token API R2 permanen dan tidak kedaluwarsa seperti sesi OAuth consumer.</li>
                    </ul>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block mb-1.5 text-xs font-bold uppercase tracking-wider text-gray-700">
                            Account ID Cloudflare <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={config.r2AccountId || ''}
                            onChange={(e) => onSyncConfigChange('r2AccountId', e.target.value)}
                            placeholder="Contoh: a1b2c3d4e5f67890abcdef1234567890"
                            className="app-input text-xs font-mono"
                        />
                        <span className="text-[10px] text-gray-500 mt-1 block">Dapat dilihat di sidebar kanan dashboard Cloudflare.</span>
                    </div>

                    <div>
                        <label className="block mb-1.5 text-xs font-bold uppercase tracking-wider text-gray-700">
                            Nama Bucket R2 <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={config.r2BucketName || ''}
                            onChange={(e) => onSyncConfigChange('r2BucketName', e.target.value)}
                            placeholder="Contoh: esantri-backup"
                            className="app-input text-xs"
                        />
                        <span className="text-[10px] text-gray-500 mt-1 block">Buat bucket di menu <strong>R2 Object Storage &gt; Create bucket</strong>.</span>
                    </div>

                    <div>
                        <label className="block mb-1.5 text-xs font-bold uppercase tracking-wider text-gray-700">
                            Access Key ID <span className="text-red-500">*</span>
                        </label>
                        <SensitiveInput
                            value={config.r2AccessKeyId || ''}
                            onChange={(val) => onSyncConfigChange('r2AccessKeyId', val)}
                            placeholder="R2 API Token Access Key ID"
                        />
                    </div>

                    <div>
                        <label className="block mb-1.5 text-xs font-bold uppercase tracking-wider text-gray-700">
                            Secret Access Key <span className="text-red-500">*</span>
                        </label>
                        <SensitiveInput
                            value={config.r2SecretAccessKey || ''}
                            onChange={(val) => onSyncConfigChange('r2SecretAccessKey', val)}
                            placeholder="R2 API Token Secret Access Key"
                        />
                    </div>

                    <div>
                        <label className="block mb-1.5 text-xs font-bold uppercase tracking-wider text-gray-700">
                            Custom S3 Endpoint (Opsional)
                        </label>
                        <input
                            type="text"
                            value={config.r2Endpoint || ''}
                            onChange={(e) => onSyncConfigChange('r2Endpoint', e.target.value)}
                            placeholder="Otomatis jika dikosongkan (https://<account_id>.r2.cloudflarestorage.com)"
                            className="app-input text-xs"
                        />
                    </div>

                    <div>
                        <label className="block mb-1.5 text-xs font-bold uppercase tracking-wider text-gray-700">
                            Public URL / Custom Domain (Opsional)
                        </label>
                        <input
                            type="text"
                            value={config.r2PublicUrl || ''}
                            onChange={(e) => onSyncConfigChange('r2PublicUrl', e.target.value)}
                            placeholder="Contoh: https://r2.domainpesantren.sch.id"
                            className="app-input text-xs"
                        />
                    </div>
                </div>

                <div className="border-t border-orange-200/60 pt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
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
