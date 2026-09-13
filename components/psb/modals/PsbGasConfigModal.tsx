import React, { useState } from 'react';
import { PondokSettings } from '../../../types';
import { useAppContext } from '../../../AppContext';

interface PsbGasConfigModalProps {
    isOpen: boolean;
    onClose: () => void;
    settings: PondokSettings;
    onSyncNow?: () => void;
}

export const PsbGasConfigModal: React.FC<PsbGasConfigModalProps> = ({
    isOpen,
    onClose,
    settings,
    onSyncNow
}) => {
    const { onUpdateSettings, showToast } = useAppContext();
    const currentUrl = settings.psbConfig?.googleScriptUrl || '';
    const [scriptUrl, setScriptUrl] = useState(currentUrl);
    const [isTesting, setIsTesting] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

    if (!isOpen) return null;

    const isValidUrl = (url: string) => {
        return /^https:\/\/script\.google\.com\/macros\/s\/.+\/exec/.test(url.trim());
    };

    const handleTestConnection = async () => {
        const trimmed = scriptUrl.trim();
        if (!trimmed) {
            setTestResult({ success: false, message: 'Masukkan URL Google Apps Script terlebih dahulu.' });
            return;
        }

        if (!isValidUrl(trimmed)) {
            setTestResult({
                success: false,
                message: 'Format URL tidak sesuai. URL deployment Web App harus berakhiran "/exec" (bukan link editor script).'
            });
            return;
        }

        setIsTesting(true);
        setTestResult(null);

        try {
            const res = await fetch(trimmed, { method: 'GET' });
            if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);

            const data = await res.json();
            if (Array.isArray(data)) {
                setTestResult({
                    success: true,
                    message: `✅ Terhubung Berhasil! Google Sheet merespons dengan ${data.length} baris data pendaftar.`
                });
            } else {
                setTestResult({
                    success: false,
                    message: '⚠️ Script merespons tetapi data bukan array pendaftar. Pastikan fungsi doGet(e) di script GAS sudah sesuai.'
                });
            }
        } catch (err: any) {
            setTestResult({
                success: false,
                message: `❌ Gagal menghubungi Web App: ${err.message || 'Cek koneksi'}. Pastikan saat Deployment di Google, "Who has access" dipilih "Anyone" (Siapa Saja).`
            });
        } finally {
            setIsTesting(false);
        }
    };

    const handleSave = async () => {
        const trimmed = scriptUrl.trim();
        if (trimmed && !isValidUrl(trimmed)) {
            showToast('URL harus berakhiran /exec (URL Deployment Web App).', 'error');
            return;
        }

        setIsSaving(true);
        try {
            const currentMethod = settings.psbConfig?.submissionMethod;
            const newMethod = (currentMethod === 'whatsapp' || !currentMethod) ? 'hybrid' : currentMethod;

            const updatedSettings: PondokSettings = {
                ...settings,
                psbConfig: {
                    ...settings.psbConfig,
                    googleScriptUrl: trimmed,
                    submissionMethod: newMethod as any
                }
            };

            await onUpdateSettings(updatedSettings);
            showToast('Pengaturan Google Apps Script berhasil disimpan!', 'success');
            onClose();
        } catch (e: any) {
            showToast('Gagal menyimpan pengaturan: ' + e.message, 'error');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs animate-fade-in overflow-y-auto">
            <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-gray-200 overflow-hidden my-auto">
                {/* Modal Header */}
                <div className="p-4 sm:p-5 border-b flex justify-between items-center bg-teal-800 text-white">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-teal-700/70 border border-teal-600/60 flex items-center justify-center text-lg text-teal-200 shrink-0">
                            <i className="bi bi-file-earmark-spreadsheet-fill"></i>
                        </div>
                        <div>
                            <h3 className="font-bold text-base leading-tight">Koneksi Google Sheet & Apps Script</h3>
                            <p className="text-xs text-teal-100">Hubungkan Web App untuk penarikan data formulir online</p>
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
                <div className="p-5 space-y-4 text-xs text-gray-700">
                    {/* Status Card */}
                    <div className="flex items-center justify-between p-3 rounded-xl bg-teal-50/70 border border-teal-200/80">
                        <div className="flex items-center gap-2">
                            <span className={`w-2.5 h-2.5 rounded-full ${currentUrl ? 'bg-emerald-500 ring-4 ring-emerald-100' : 'bg-amber-400 ring-4 ring-amber-100'}`}></span>
                            <span className="font-semibold text-teal-950">
                                {currentUrl ? 'Tautan Aktif Tersimpan' : 'Belum Ada Tautan Aktif'}
                            </span>
                        </div>
                        {currentUrl && onSyncNow && (
                            <button
                                onClick={() => {
                                    onClose();
                                    onSyncNow();
                                }}
                                className="bg-white text-teal-800 border border-teal-300 hover:bg-teal-100/60 font-semibold px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition-colors shadow-2xs text-[11px]"
                            >
                                <i className="bi bi-arrow-repeat text-teal-700"></i>
                                <span>Tarik Sekarang</span>
                            </button>
                        )}
                    </div>

                    {/* Input Field */}
                    <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                            URL Deployment Google Apps Script (Web App)
                        </label>
                        <div className="relative">
                            <input
                                type="url"
                                value={scriptUrl}
                                onChange={(e) => {
                                    setScriptUrl(e.target.value);
                                    setTestResult(null);
                                }}
                                placeholder="https://script.google.com/macros/s/.../exec"
                                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-hidden pr-14 bg-white"
                            />
                            {scriptUrl && (
                                <button
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
                        <p className="text-[11px] text-gray-500 mt-1.5 flex items-center gap-1">
                            <i className="bi bi-info-circle text-teal-700"></i>
                            Tautan deployment Web App Google Sheets yang berakhiran <code>/exec</code>.
                        </p>
                    </div>

                    {/* Test Connection Button & Result */}
                    <div className="space-y-2 pt-1">
                        <button
                            onClick={handleTestConnection}
                            disabled={isTesting || !scriptUrl.trim()}
                            className="w-full h-9 px-3 rounded-xl border border-teal-300 bg-teal-50 hover:bg-teal-100/70 text-teal-900 font-semibold text-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-50 shadow-2xs"
                        >
                            {isTesting ? (
                                <>
                                    <i className="bi bi-arrow-repeat animate-spin text-teal-700"></i>
                                    <span>Menguji respon Google Apps Script...</span>
                                </>
                            ) : (
                                <>
                                    <i className="bi bi-broadcast text-teal-700"></i>
                                    <span>Test Koneksi ke Google Apps Script</span>
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

                    {/* Helpful Navigation Guidance */}
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs space-y-2">
                        <div className="font-bold text-slate-800 flex items-center gap-1.5">
                            <i className="bi bi-compass text-teal-700"></i>
                            Informasi Alur &amp; Panduan:
                        </div>
                        <div className="text-[11px] text-slate-600 space-y-1.5 leading-relaxed">
                            <p>
                                • <strong>Kode Script GAS &amp; Panduan Singkat:</strong> Buka tab <strong>Desain Formulir</strong> di modul PSB untuk menyalin kode script <code>Code.gs</code> dan melihat alur pendaftaran.
                            </p>
                            <p>
                                • <strong>Panduan Lengkap (Folder Drive &amp; Deployment):</strong> Buka menu <strong>Sistem &gt; Panduan Sistem &gt; PSB &amp; Surat Menyurat</strong> untuk panduan pembuatan folder Google Drive, konfigurasi akses, dan tutorial deployment bergambar.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Modal Footer */}
                <div className="p-4 bg-gray-50 border-t border-gray-200 flex items-center justify-end gap-2">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-xl text-gray-600 hover:bg-gray-200 text-xs font-semibold transition-colors"
                    >
                        Tutup
                    </button>
                    <button
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
                                <span>Simpan Tautan</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};
