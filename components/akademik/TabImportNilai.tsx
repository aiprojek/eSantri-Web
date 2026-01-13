
import React, { useState } from 'react';
import { useAppContext } from '../../AppContext';
import { fetchRaporFromCloud, parseRaporDataV2 } from '../../services/academicService';

export const TabImportNilai: React.FC = () => {
    const { settings, showToast, showAlert, currentUser } = useAppContext();
    const canWrite = currentUser?.role === 'admin' || currentUser?.permissions?.akademik === 'write';

    const [importSource, setImportSource] = useState<'wa' | 'cloud'>('wa');
    const [waInput, setWaInput] = useState('');
    const [cloudScriptUrl, setCloudScriptUrl] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    const handleProcessImport = async () => {
        if (!canWrite) return;
        if (importSource === 'wa' && !waInput.trim()) return;
        if (importSource === 'cloud' && !cloudScriptUrl.trim()) return;

        setIsProcessing(true);
        try {
            let dataStrings: string[] = [];

            if (importSource === 'wa') {
                const match = waInput.match(/RAPOR_V2_START([\s\S]*?)RAPOR_V2_END/);
                if (!match || !match[1]) throw new Error("Format kode WA tidak valid.");
                dataStrings.push(match[1]);
            } else {
                if (importSource === 'cloud') {
                     const cloudData = await fetchRaporFromCloud(cloudScriptUrl);
                     const jsonString = JSON.stringify(cloudData);
                     const b64 = btoa(unescape(encodeURIComponent(jsonString)));
                     dataStrings.push(b64);
                }
            }

            let totalSuccess = 0;
            let totalErrors: string[] = [];

            for (const str of dataStrings) {
                const { successCount, errors } = await parseRaporDataV2(str, settings);
                totalSuccess += successCount;
                totalErrors = [...totalErrors, ...errors];
            }

            if (totalSuccess > 0) {
                showToast(`Berhasil menyimpan ${totalSuccess} data nilai.`, 'success');
            }
            if (totalErrors.length > 0) {
                showAlert('Beberapa Error Terjadi', totalErrors.join('\n'));
            }
            if (totalSuccess > 0) {
                setWaInput('');
            }

        } catch (e) {
            showAlert('Gagal Memproses Data', (e as Error).message);
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
                <h3 className="font-bold text-gray-800">Impor Data Nilai</h3>
                
                {/* Source Selection */}
                <div className="flex gap-2">
                    <button onClick={() => setImportSource('wa')} className={`flex-1 py-2 rounded text-sm font-medium border ${importSource === 'wa' ? 'bg-green-50 border-green-500 text-green-700' : 'bg-white border-gray-300 text-gray-600'}`}>
                        <i className="bi bi-whatsapp"></i> Via WhatsApp
                    </button>
                    <button onClick={() => setImportSource('cloud')} className={`flex-1 py-2 rounded text-sm font-medium border ${importSource === 'cloud' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white border-gray-300 text-gray-600'}`}>
                        <i className="bi bi-cloud-arrow-down"></i> Via Google Cloud
                    </button>
                </div>

                {importSource === 'wa' ? (
                    <textarea 
                        value={waInput} 
                        onChange={e => setWaInput(e.target.value)} 
                        className="w-full h-48 border rounded-lg p-3 font-mono text-xs bg-gray-50 focus:ring-2 focus:ring-teal-500 outline-none" 
                        placeholder="Paste kode RAPOR_V2_START dari WA..."
                    ></textarea>
                ) : (
                    <div className="space-y-2">
                        <label className="block text-xs font-bold text-gray-700">URL Web App (Google Script)</label>
                        <input 
                            type="text" 
                            value={cloudScriptUrl} 
                            onChange={e => setCloudScriptUrl(e.target.value)}
                            placeholder="https://script.google.com/macros/s/..." 
                            className="w-full border rounded p-2 text-xs font-mono"
                        />
                        <p className="text-[10px] text-gray-500">Pastikan script yang digunakan mendukung fungsi <code>doGet</code> (Lihat panduan di tab Generator).</p>
                    </div>
                )}

                <button onClick={handleProcessImport} disabled={isProcessing || (!waInput.trim() && !cloudScriptUrl.trim()) || !canWrite} className="w-full bg-teal-600 text-white py-3 rounded-lg hover:bg-teal-700 disabled:bg-gray-300 font-bold shadow-md flex items-center justify-center gap-2">
                    {isProcessing ? <><span className="animate-spin h-4 w-4 border-2 border-white rounded-full border-t-transparent"></span> Memproses...</> : 'Proses & Simpan'}
                </button>
            </div>

            <div className="flex flex-col items-center justify-center text-center p-8 text-gray-500 border-2 border-dashed rounded-xl bg-gray-50">
                <i className="bi bi-database-check text-5xl mb-4 text-gray-300"></i>
                <h4 className="font-bold text-gray-700">Data Tersimpan?</h4>
                <p className="text-sm mt-2 max-w-xs">Data nilai yang berhasil diimpor akan masuk ke database <strong>Data Nilai</strong>. Gunakan tab <strong>Cetak Rapor</strong> untuk mencetak hasilnya.</p>
            </div>
        </div>
    );
};
