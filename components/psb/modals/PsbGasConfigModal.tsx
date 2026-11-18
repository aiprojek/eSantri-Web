import React, { useState, useMemo } from 'react';
import { PondokSettings, PsbCloudProvider } from '../../../types';
import { useAppContext } from '../../../AppContext';
import { extractDriveFolderId } from '../utils/psbUtils';
import {
    buildPsbGasScriptV31,
    getPsbCloudProviderMeta,
    isPsbCloudEndpointValid,
    PSB_CLOUDFLARE_D1_WORKER_SCRIPT,
    PSB_CLOUDFLARE_R2_WORKER_SCRIPT,
    PSB_SUPABASE_SQL_SETUP,
    testPsbCloudConnection
} from '../../../services/psbCloudService';

interface PsbGasConfigModalProps {
    isOpen: boolean;
    onClose: () => void;
    settings: PondokSettings;
    onSyncNow?: () => void;
}

const PROVIDERS: PsbCloudProvider[] = ['gas', 'cloudflare_d1', 'cloudflare_r2', 'supabase'];

export const PsbGasConfigModal: React.FC<PsbGasConfigModalProps> = ({
    isOpen,
    onClose,
    settings,
    onSyncNow
}) => {
    const { onUpdateSettings, showToast } = useAppContext();
    const currentUrl = settings.psbConfig?.googleScriptUrl || '';
    const currentProvider: PsbCloudProvider = settings.psbConfig?.backendProvider || 'gas';
    const currentApiKey = settings.psbConfig?.cloudApiKey || '';
    const currentFolderId = settings.psbConfig?.driveFolderId || '';
    const currentBucket = settings.psbConfig?.supabaseBucket || 'psb-berkas';

    const [backendProvider, setBackendProvider] = useState<PsbCloudProvider>(currentProvider);
    const [scriptUrl, setScriptUrl] = useState(currentUrl);
    const [cloudApiKey, setCloudApiKey] = useState(currentApiKey);
    const [driveFolderId, setDriveFolderId] = useState(currentFolderId);
    const [supabaseBucket, setSupabaseBucket] = useState(currentBucket);
    const cleanDriveFolderId = extractDriveFolderId(driveFolderId);

    const [isTesting, setIsTesting] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [showScriptBox, setShowScriptBox] = useState(false);
    const [copiedScript, setCopiedScript] = useState(false);
    const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

    const providerMeta = useMemo(() => getPsbCloudProviderMeta(backendProvider), [backendProvider]);

    const setupScriptCode = useMemo(() => {
        switch (backendProvider) {
            case 'cloudflare_d1':
                return PSB_CLOUDFLARE_D1_WORKER_SCRIPT;
            case 'cloudflare_r2':
                return PSB_CLOUDFLARE_R2_WORKER_SCRIPT;
            case 'supabase':
                return PSB_SUPABASE_SQL_SETUP;
            case 'gas':
            default:
                return buildPsbGasScriptV31(cleanDriveFolderId);
        }
    }, [backendProvider, cleanDriveFolderId]);

    if (!isOpen) return null;

    const handleTestConnection = async () => {
        setIsTesting(true);
        setTestResult(null);
        try {
            const res = await testPsbCloudConnection({
                endpointUrl: scriptUrl,
                backendProvider,
                apiKey: cloudApiKey
            });
            setTestResult({ success: true, message: res.message });
        } catch (err: any) {
            setTestResult({
                success: false,
                message: err?.message || 'Gagal menghubungi server Cloud. Pastikan deployment publik/izin akses sudah benar.'
            });
        } finally {
            setIsTesting(false);
        }
    };

    const handleCopyScript = () => {
        navigator.clipboard.writeText(setupScriptCode.trim());
        setCopiedScript(true);
        showToast(`${providerMeta.scriptBadge} disalin ke clipboard!`, 'success');
        setTimeout(() => setCopiedScript(false), 2500);
    };

    const handleSave = async () => {
        const trimmed = scriptUrl.trim();
        if (trimmed && !isPsbCloudEndpointValid(trimmed, backendProvider)) {
            showToast(
                backendProvider === 'gas'
                    ? 'URL GAS harus berakhiran /exec (URL Deployment Web App).'
                    : 'Format URL endpoint harus diawali https:// yang valid.',
                'error'
            );
            return;
        }
        if (backendProvider === 'supabase' && trimmed && !cloudApiKey.trim()) {
            showToast('Supabase Anon / Public Key wajib diisi.', 'error');
            return;
        }

        setIsSaving(true);
        try {
            const currentMethod = settings.psbConfig?.submissionMethod;
            const newMethod = currentMethod === 'whatsapp' || !currentMethod || currentMethod === 'portal' ? 'hybrid' : currentMethod;

            const updatedSettings: PondokSettings = {
                ...settings,
                psbConfig: {
                    ...settings.psbConfig,
                    backendProvider,
                    googleScriptUrl: trimmed,
                    cloudApiKey: cloudApiKey.trim(),
                    driveFolderId: cleanDriveFolderId,
                    supabaseBucket: supabaseBucket.trim() || 'psb-berkas',
                    submissionMethod: newMethod as any
                }
            };

            await onUpdateSettings(updatedSettings);
            showToast(`Konfigurasi Cloud PSB (${providerMeta.name}) berhasil disimpan!`, 'success');
            onClose();
        } catch (e: any) {
            showToast('Gagal menyimpan pengaturan: ' + e.message, 'error');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs animate-fade-in overflow-y-auto">
            <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-gray-200 overflow-hidden my-auto max-h-[92vh] flex flex-col">
                {/* Modal Header */}
                <div className="p-4 sm:p-5 border-b flex justify-between items-center bg-teal-800 text-white shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-teal-700/70 border border-teal-600/60 flex items-center justify-center text-lg text-teal-200 shrink-0">
                            <i className="bi bi-cloud-check-fill"></i>
                        </div>
                        <div>
                            <h3 className="font-bold text-base leading-tight">Koneksi Cloud PSB &amp; Penyimpanan Lampiran</h3>
                            <p className="text-xs text-teal-100">Pilih Google Apps Script + Drive, Cloudflare D1/R2, atau Supabase</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-teal-200 hover:text-white hover:bg-teal-700/50 transition-colors"
                        title="Tutup Modal"
                    >
                        <i className="bi bi-x-lg text-lg"></i>
                    </button>
                </div>

                {/* Modal Body */}
                <div className="p-5 space-y-4 text-xs text-gray-700 overflow-y-auto flex-1">
                    {/* Status Card */}
                    <div className="flex items-center justify-between p-3 rounded-xl bg-teal-50/70 border border-teal-200/80 gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                            <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${currentUrl ? 'bg-emerald-500 ring-4 ring-emerald-100' : 'bg-amber-400 ring-4 ring-amber-100'}`}></span>
                            <div className="min-w-0">
                                <span className="font-semibold text-teal-950 block truncate">
                                    {currentUrl ? `Aktif: ${getPsbCloudProviderMeta(currentProvider).name}` : 'Belum Ada Tautan Aktif'}
                                </span>
                                <span className="text-[11px] text-teal-700 block truncate">
                                    Lampiran: {providerMeta.attachmentLabel}
                                </span>
                            </div>
                        </div>
                        {currentUrl && onSyncNow && (
                            <button
                                onClick={() => {
                                    onClose();
                                    onSyncNow();
                                }}
                                className="bg-white text-teal-800 border border-teal-300 hover:bg-teal-100/60 font-semibold px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors shadow-2xs text-[11px] shrink-0"
                            >
                                <i className="bi bi-arrow-repeat text-teal-700"></i>
                                <span>Tarik Sekarang</span>
                            </button>
                        )}
                    </div>

                    {/* Provider Selector */}
                    <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                            Pilih Backend Server &amp; Penyimpanan Berkas
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {PROVIDERS.map((pid) => {
                                const m = getPsbCloudProviderMeta(pid);
                                const active = backendProvider === pid;
                                return (
                                    <button
                                        key={pid}
                                        type="button"
                                        onClick={() => {
                                            setBackendProvider(pid);
                                            setTestResult(null);
                                        }}
                                        className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                                            active
                                                ? 'border-teal-600 bg-teal-50 text-teal-950 ring-2 ring-teal-200'
                                                : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-700'
                                        }`}
                                    >
                                        <div className="font-bold text-[11px] truncate">{m.shortName}</div>
                                        <div className="text-[10px] text-gray-500 truncate mt-0.5">{m.attachmentLabel}</div>
                                    </button>
                                );
                            })}
                        </div>
                        <p className="text-[11px] text-slate-600 mt-2 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
                            <i className="bi bi-info-circle-fill text-teal-700 mr-1"></i>
                            {providerMeta.helperSummary}
                        </p>
                    </div>

                    {/* Endpoint Input Field */}
                    <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                            {providerMeta.endpointLabel}
                        </label>
                        <div className="relative">
                            <input
                                type="url"
                                value={scriptUrl}
                                onChange={(e) => {
                                    setScriptUrl(e.target.value);
                                    setTestResult(null);
                                }}
                                placeholder={providerMeta.endpointPlaceholder}
                                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-hidden pr-14 bg-white"
                            />
                            {scriptUrl && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setScriptUrl('');
                                        setTestResult(null);
                                    }}
                                    className="absolute right-2 top-2 text-[11px] text-gray-400 hover:text-gray-600 px-1.5 py-0.5 rounded"
                                    title="Hapus tautan"
                                >
                                    Hapus
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Conditional API Key / Anon Key */}
                    {providerMeta.supportsApiKey && (
                        <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                                {providerMeta.apiKeyLabel}
                            </label>
                            <input
                                type="password"
                                value={cloudApiKey}
                                onChange={(e) => {
                                    setCloudApiKey(e.target.value);
                                    setTestResult(null);
                                }}
                                placeholder={providerMeta.apiKeyPlaceholder}
                                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-hidden bg-white"
                            />
                            <p className="text-[11px] text-gray-500 mt-1">{providerMeta.apiKeyHelp}</p>
                        </div>
                    )}

                    {/* Conditional Drive Folder ID (GAS) */}
                    {providerMeta.usesDriveFolder && (
                        <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                                ID atau Link Folder Google Drive Tujuan Berkas (Opsional)
                            </label>
                            <input
                                type="text"
                                value={driveFolderId}
                                onChange={(e) => setDriveFolderId(e.target.value)}
                                placeholder="Tempel Link Folder Drive atau ID Folder (cth: 1a2B3c4D5e...)"
                                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-hidden bg-white"
                            />
                            {driveFolderId.trim() ? (
                                cleanDriveFolderId ? (
                                    <p className="text-[11px] text-teal-700 mt-1 flex items-center gap-1 font-medium">
                                        <i className="bi bi-check-circle-fill"></i> ID Folder Induk: <code className="bg-teal-100 px-1 rounded font-bold">{cleanDriveFolderId}</code> (Subfolder <code>berkas-psb-&lt;tahun-ajaran&gt;</code> otomatis dibuat di dalamnya)
                                    </p>
                                ) : (
                                    <p className="text-[11px] text-amber-700 mt-1">
                                        Format ID Folder belum dikenali. Salin link folder dari browser (<code>drive.google.com/drive/folders/ID_FOLDER</code>).
                                    </p>
                                )
                            ) : (
                                <p className="text-[11px] text-gray-500 mt-1">
                                    Opsional: bila dikosongkan, script otomatis membuat folder <code>berkas-psb-&lt;tahun-ajaran&gt;</code> di Google Drive utama. Jika diisi link Folder Induk (mis. <strong>Arsip PSB</strong>), subfolder per tahun otomatis dibuat di dalamnya.
                                </p>
                            )}
                        </div>
                    )}

                    {/* Conditional Supabase Storage Bucket */}
                    {providerMeta.usesSupabaseBucket && (
                        <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                                Nama Bucket Supabase Storage
                            </label>
                            <input
                                type="text"
                                value={supabaseBucket}
                                onChange={(e) => setSupabaseBucket(e.target.value)}
                                placeholder="psb-berkas"
                                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-hidden bg-white"
                            />
                            <p className="text-[11px] text-gray-500 mt-1">
                                Default: <code>psb-berkas</code> (otomatis dibuat saat menjalankan SQL Setup di bawah).
                            </p>
                        </div>
                    )}

                    {/* Test Connection Button & Result */}
                    <div className="space-y-2 pt-1">
                        <button
                            type="button"
                            onClick={handleTestConnection}
                            disabled={isTesting || !scriptUrl.trim()}
                            className="w-full h-9 px-3 rounded-xl border border-teal-300 bg-teal-50 hover:bg-teal-100/70 text-teal-900 font-semibold text-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-50 shadow-2xs"
                        >
                            {isTesting ? (
                                <>
                                    <i className="bi bi-arrow-repeat animate-spin text-teal-700"></i>
                                    <span>Menguji respon {providerMeta.name}...</span>
                                </>
                            ) : (
                                <>
                                    <i className="bi bi-broadcast text-teal-700"></i>
                                    <span>Test Koneksi ke {providerMeta.name}</span>
                                </>
                            )}
                        </button>

                        {testResult && (
                            <div
                                className={`p-3 rounded-xl border text-xs leading-relaxed ${
                                    testResult.success
                                        ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                                        : 'bg-rose-50 border-rose-200 text-rose-900'
                                }`}
                            >
                                {testResult.message}
                            </div>
                        )}
                    </div>

                    {/* Collapsible Setup Code Box */}
                    <div>
                        <button
                            type="button"
                            onClick={() => setShowScriptBox(!showScriptBox)}
                            className="w-full flex items-center justify-between px-3 py-2 bg-slate-100 hover:bg-slate-200/70 border border-slate-300 rounded-xl text-slate-800 font-semibold text-xs transition-colors"
                        >
                            <span className="flex items-center gap-1.5">
                                <i className="bi bi-code-slash text-teal-700"></i>
                                <span>{providerMeta.scriptButtonLabel}</span>
                            </span>
                            <i className={`bi ${showScriptBox ? 'bi-chevron-up' : 'bi-chevron-down'}`}></i>
                        </button>

                        {showScriptBox && (
                            <div className="mt-2 rounded-xl border border-slate-700/80 overflow-hidden bg-slate-900 shadow-sm">
                                <div className="bg-slate-800 px-3 py-2 border-b border-slate-700 flex items-center justify-between gap-2">
                                    <span className="text-[11px] font-bold text-slate-100 truncate">
                                        {providerMeta.name} ({providerMeta.scriptBadge})
                                    </span>
                                    <button
                                        type="button"
                                        onClick={handleCopyScript}
                                        className={`shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                                            copiedScript ? 'bg-emerald-600 text-white' : 'bg-teal-600 hover:bg-teal-500 text-white'
                                        }`}
                                    >
                                        <i className={`bi ${copiedScript ? 'bi-check2-all' : 'bi-clipboard'}`}></i>
                                        <span>{copiedScript ? 'Tersalin!' : 'Salin Kode'}</span>
                                    </button>
                                </div>
                                <textarea
                                    readOnly
                                    value={setupScriptCode}
                                    rows={7}
                                    className="w-full bg-slate-950 text-emerald-300 font-mono text-[11px] p-3 border-0 focus:ring-0 focus:outline-hidden resize-y leading-relaxed"
                                />
                            </div>
                        )}
                    </div>
                </div>

                {/* Modal Footer */}
                <div className="p-4 bg-gray-50 border-t border-gray-200 flex items-center justify-end gap-2 shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 rounded-xl text-gray-600 hover:bg-gray-200 text-xs font-semibold transition-colors"
                    >
                        Tutup
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={isSaving}
                        className="px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold shadow-2xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
                    >
                        {isSaving ? (
                            <>
                                <i className="bi bi-arrow-repeat animate-spin"></i>
                                <span>Menyimpan...</span>
                            </>
                        ) : (
                            <>
                                <i className="bi bi-check2-circle"></i>
                                <span>Simpan Konfigurasi</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};
