import React, { useState } from 'react';
import { useAppContext } from '../../AppContext';
import { fetchRaporFromCloud, parseRaporDataV2 } from '../../services/academicService';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const encodeUtf8ToBase64 = (value: string): string => {
    const bytes = new TextEncoder().encode(value);
    let binary = '';
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
        binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
    }
    return btoa(binary);
};

export const RaporWaCloudImportModal: React.FC<Props> = ({ isOpen, onClose, onSuccess }) => {
    const { settings, showToast, showAlert, currentUser } = useAppContext();
    const canWrite = currentUser?.role === 'admin' || currentUser?.permissions?.akademik === 'write';

    const [importSource, setImportSource] = useState<'wa' | 'cloud'>('wa');
    const [waInput, setWaInput] = useState('');
    const [cloudScriptUrl, setCloudScriptUrl] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    if (!isOpen) return null;

    const handleProcessImport = async () => {
        if (!canWrite) return;
        if (importSource === 'wa' && !waInput.trim()) return;
        if (importSource === 'cloud' && !cloudScriptUrl.trim()) return;

        setIsProcessing(true);
        try {
            let dataStrings: string[] = [];

            if (importSource === 'wa') {
                const match = waInput.match(/RAPOR_V2_START([\s\S]*?)RAPOR_V2_END/);
                if (!match || !match[1]) throw new Error("Format kode WA tidak valid. Pastikan diawali RAPOR_V2_START dan diakhiri RAPOR_V2_END.");
                dataStrings.push(match[1]);
            } else {
                const cloudData = await fetchRaporFromCloud(cloudScriptUrl);
                const jsonString = JSON.stringify(cloudData);
                const b64 = encodeUtf8ToBase64(jsonString);
                dataStrings.push(b64);
            }

            let totalSuccess = 0;
            let totalErrors: string[] = [];

            for (const str of dataStrings) {
                const { successCount, errors } = await parseRaporDataV2(str, settings);
                totalSuccess += successCount;
                totalErrors = [...totalErrors, ...errors];
            }

            if (totalSuccess > 0) {
                showToast(`Berhasil mengimpor ${totalSuccess} data nilai santri.`, 'success');
                setWaInput('');
                onSuccess();
                onClose();
            }
            if (totalErrors.length > 0) {
                showAlert('Sebagian Data Gagal Diimpor', totalErrors.join('\n'));
            }
        } catch (e) {
            showAlert('Gagal Memproses Data', (e as Error).message);
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-3xl max-w-xl w-full flex flex-col shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="p-6 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                    <div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-teal-700 bg-teal-100/70 px-2.5 py-0.5 rounded-lg">
                            Impor Nilai Eksternal
                        </span>
                        <h3 className="text-lg font-black text-slate-800 mt-1">Impor via WhatsApp & Cloud</h3>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-9 h-9 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-full transition-colors"
                    >
                        <i className="bi bi-x-lg text-lg"></i>
                    </button>
                </div>

                {/* Tabs */}
                <div className="p-6 space-y-4">
                    <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl border border-slate-200">
                        <button
                            type="button"
                            onClick={() => setImportSource('wa')}
                            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                                importSource === 'wa'
                                    ? 'bg-white text-emerald-700 shadow-sm'
                                    : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            <i className="bi bi-whatsapp text-emerald-500"></i>
                            <span>Kode WhatsApp</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setImportSource('cloud')}
                            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                                importSource === 'cloud'
                                    ? 'bg-white text-blue-700 shadow-sm'
                                    : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            <i className="bi bi-cloud-arrow-down text-blue-500"></i>
                            <span>Google Cloud Script</span>
                        </button>
                    </div>

                    {importSource === 'wa' ? (
                        <div className="space-y-2">
                            <label className="block text-xs font-bold text-slate-700">
                                Tempelkan Teks Kode Rapor:
                            </label>
                            <textarea
                                value={waInput}
                                onChange={e => setWaInput(e.target.value)}
                                className="w-full h-44 border border-slate-200 rounded-2xl p-3 font-mono text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-teal-500 outline-none transition-all"
                                placeholder="Paste format RAPOR_V2_START...RAPOR_V2_END dari pesan WhatsApp guru di sini..."
                            />
                            <p className="text-[11px] text-slate-500">
                                Format ini dihasilkan dari fitur formulir digital nilai yang dikirim guru melalui WhatsApp.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <div className="bg-blue-50 border border-blue-100 p-3.5 rounded-2xl text-xs text-blue-800 leading-relaxed">
                                <i className="bi bi-info-circle-fill mr-1 text-blue-600"></i>
                                Sistem akan menarik data dari Web App Google Script spreadsheet Anda dan mencocokkannya dengan ID santri secara otomatis.
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">URL Web App (Google Apps Script)</label>
                                <input
                                    type="text"
                                    value={cloudScriptUrl}
                                    onChange={e => setCloudScriptUrl(e.target.value)}
                                    placeholder="https://script.google.com/macros/s/..."
                                    className="w-full border border-slate-200 rounded-xl p-3 text-xs font-mono bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl text-xs hover:bg-slate-100"
                    >
                        Batal
                    </button>
                    <button
                        type="button"
                        onClick={handleProcessImport}
                        disabled={isProcessing || (!waInput.trim() && !cloudScriptUrl.trim()) || !canWrite}
                        className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-xs shadow-md disabled:bg-slate-300 flex items-center gap-1.5"
                    >
                        {isProcessing ? (
                            <>
                                <span className="animate-spin h-3.5 w-3.5 border-2 border-white rounded-full border-t-transparent"></span>
                                <span>Memproses...</span>
                            </>
                        ) : (
                            <>
                                <i className="bi bi-box-arrow-in-down"></i>
                                <span>Proses & Simpan Nilai</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};
