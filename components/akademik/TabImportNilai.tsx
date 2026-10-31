import React, { useState, useEffect, useMemo } from 'react';
import { useAppContext } from '../../AppContext';
import { fetchRaporFromCloud, parseRaporDataV2, syncRaporStructuredData } from '../../services/academicService';
import { getAcademicYearOptions, getDefaultAcademicYear } from '../../utils/academicYear';

export const TabImportNilai: React.FC = () => {
    const { settings, onUpdateSettings, showToast, showAlert, currentUser } = useAppContext();
    const canWrite = currentUser?.role === 'admin' || currentUser?.permissions?.akademik === 'write';

    const defaultYear = useMemo(() => getDefaultAcademicYear(settings), [settings]);
    const availableYears = useMemo(() => getAcademicYearOptions(settings), [settings]);

    const [importSource, setImportSource] = useState<'wa' | 'cloud'>(
        settings.raporCloudConfig?.googleScriptUrl ? 'cloud' : 'wa'
    );
    const [waInput, setWaInput] = useState('');
    const [cloudScriptUrl, setCloudScriptUrl] = useState(
        settings.raporCloudConfig?.googleScriptUrl || ''
    );
    const [filterPeriodOnly, setFilterPeriodOnly] = useState<boolean>(false);
    const [targetTahun, setTargetTahun] = useState<string>(defaultYear);
    const [targetSemester, setTargetSemester] = useState<'Ganjil' | 'Genap'>('Ganjil');
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        if (settings.raporCloudConfig?.googleScriptUrl && !cloudScriptUrl) {
            setCloudScriptUrl(settings.raporCloudConfig.googleScriptUrl);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [settings.raporCloudConfig?.googleScriptUrl]);

    const handleProcessImport = async () => {
        if (!canWrite) return;
        if (importSource === 'wa' && !waInput.trim()) return;
        if (importSource === 'cloud' && !cloudScriptUrl.trim()) return;

        setIsProcessing(true);
        try {
            const filterOpts =
                importSource === 'cloud' && filterPeriodOnly
                    ? { tahunAjaran: targetTahun, semester: targetSemester }
                    : undefined;

            let totalSuccess = 0;
            let totalErrors: string[] = [];

            if (importSource === 'wa') {
                const matches = Array.from(waInput.matchAll(/RAPOR_V2_START([\s\S]*?)RAPOR_V2_END/g));
                if (matches.length === 0) {
                    throw new Error('Format kode WA tidak ditemukan. Pastikan menempelkan teks yang memuat RAPOR_V2_START ... RAPOR_V2_END.');
                }
                for (const m of matches) {
                    if (!m[1]) continue;
                    const { successCount, errors } = await parseRaporDataV2(m[1], settings, filterOpts);
                    totalSuccess += successCount;
                    totalErrors = [...totalErrors, ...errors];
                }
            } else {
                const cleanUrl = cloudScriptUrl.trim();
                const cloudData = await fetchRaporFromCloud(cleanUrl, filterOpts);
                const syncRes = await syncRaporStructuredData(cloudData, settings, filterOpts);
                totalSuccess = syncRes.successCount;
                totalErrors = syncRes.errors;

                try {
                    await onUpdateSettings({
                        ...settings,
                        raporCloudConfig: {
                            ...(settings.raporCloudConfig || {}),
                            googleScriptUrl: cleanUrl,
                            submissionMethod: settings.raporCloudConfig?.submissionMethod || 'hybrid',
                            tabMode: settings.raporCloudConfig?.tabMode || 'per_rombel',
                            lastSyncedAt: new Date().toISOString(),
                            lastSyncedStudents: syncRes.successCount,
                            updatedAt: new Date().toISOString()
                        }
                    });
                } catch {
                    // non-fatal
                }
            }

            if (totalSuccess > 0) {
                showToast(`Berhasil menyimpan & menggabungkan ${totalSuccess} data nilai santri.`, 'success');
                setWaInput('');
            } else if (totalErrors.length === 0) {
                showToast('Tidak ada perubahan nilai baru pada periode yang dipilih.', 'info');
            }
            if (totalErrors.length > 0) {
                showAlert('Beberapa Error Terjadi', totalErrors.join('\n'));
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
                <h3 className="font-bold text-gray-800">Impor Data Nilai (WhatsApp &amp; 1 Link Cloud GAS)</h3>

                {/* Source Selection */}
                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={() => setImportSource('wa')}
                        className={`flex-1 py-2 rounded-lg text-xs font-bold border whitespace-nowrap ${
                            importSource === 'wa'
                                ? 'bg-green-50 border-green-500 text-green-700'
                                : 'bg-white border-gray-300 text-gray-600'
                        }`}
                    >
                        <i className="bi bi-whatsapp mr-1"></i> Via WhatsApp
                    </button>
                    <button
                        type="button"
                        onClick={() => setImportSource('cloud')}
                        className={`flex-1 py-2 rounded-lg text-xs font-bold border whitespace-nowrap ${
                            importSource === 'cloud'
                                ? 'bg-blue-50 border-blue-500 text-blue-700'
                                : 'bg-white border-gray-300 text-gray-600'
                        }`}
                    >
                        <i className="bi bi-cloud-arrow-down mr-1"></i> Via Google Cloud (Multi-Tab)
                    </button>
                </div>

                {importSource === 'wa' ? (
                    <textarea
                        value={waInput}
                        onChange={e => setWaInput(e.target.value)}
                        className="w-full h-48 border rounded-lg p-3 font-mono text-xs bg-gray-50 focus:ring-2 focus:ring-teal-500 outline-none"
                        placeholder="Paste kode RAPOR_V2_START dari WA..."
                    />
                ) : (
                    <div className="space-y-3">
                        <div className="bg-blue-50 border border-blue-100 p-3 rounded-lg text-[11px] text-blue-800 leading-relaxed">
                            <i className="bi bi-info-circle-fill mr-1"></i>
                            <b>1 Link GAS Multi-Tab:</b> Sistem menarik seluruh tab Rombel &amp; Template dari Spreadsheet Anda dan menggabungkannya secara otomatis berdasarkan ID Santri.
                        </div>
                        <label className="block text-xs font-bold text-gray-700">URL Web App (Google Script)</label>
                        <input
                            type="text"
                            value={cloudScriptUrl}
                            onChange={e => setCloudScriptUrl(e.target.value)}
                            placeholder="https://script.google.com/macros/s/.../exec"
                            className="w-full border rounded-lg p-2.5 text-xs font-mono"
                        />

                        <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg space-y-2">
                            <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={filterPeriodOnly}
                                    onChange={e => setFilterPeriodOnly(e.target.checked)}
                                    className="rounded border-gray-300 text-teal-600"
                                />
                                <span>Filter khusus Tahun Ajaran &amp; Semester tertentu</span>
                            </label>
                            {filterPeriodOnly && (
                                <div className="grid grid-cols-2 gap-2">
                                    <select
                                        value={targetTahun}
                                        onChange={e => setTargetTahun(e.target.value)}
                                        className="border rounded p-1.5 text-xs bg-white font-semibold"
                                    >
                                        {availableYears.map(y => (
                                            <option key={y} value={y}>
                                                {y}
                                            </option>
                                        ))}
                                    </select>
                                    <select
                                        value={targetSemester}
                                        onChange={e => setTargetSemester(e.target.value as 'Ganjil' | 'Genap')}
                                        className="border rounded p-1.5 text-xs bg-white font-semibold"
                                    >
                                        <option value="Ganjil">Ganjil</option>
                                        <option value="Genap">Genap</option>
                                    </select>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                <button
                    type="button"
                    onClick={handleProcessImport}
                    disabled={isProcessing || (!waInput.trim() && !cloudScriptUrl.trim()) || !canWrite}
                    className="w-full bg-teal-600 text-white py-3 rounded-lg hover:bg-teal-700 disabled:bg-gray-300 font-bold shadow-md flex items-center justify-center gap-2"
                >
                    {isProcessing ? (
                        <>
                            <span className="animate-spin h-4 w-4 border-2 border-white rounded-full border-t-transparent"></span>{' '}
                            Memproses...
                        </>
                    ) : (
                        'Proses & Simpan Nilai'
                    )}
                </button>
            </div>

            <div className="flex flex-col items-center justify-center text-center p-8 text-gray-500 border-2 border-dashed rounded-xl bg-gray-50">
                <i className="bi bi-database-check text-5xl mb-4 text-gray-300"></i>
                <h4 className="font-bold text-gray-700">1 Link GAS untuk Semua Rombel</h4>
                <p className="text-sm mt-2 max-w-xs">
                    Link Google Apps Script otomatis tersimpan dan dipakai bersama oleh Formulir Ledger Guru, Portal Audit Tanpa Login, dan menu Impor Nilai.
                </p>
            </div>
        </div>
    );
};
