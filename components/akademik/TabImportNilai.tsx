import React, { useState, useEffect, useMemo } from 'react';
import { useAppContext } from '../../AppContext';
import { acceptAndReencryptPlaintextRapor, fetchRaporFromCloud, ParseRaporFilterOptions, parseRaporDataV2, syncRaporStructuredData } from '../../services/academicService';
import { RaporCloudProvider, getRaporCloudProviderMeta } from '../../services/raporCloudService';
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
    const [backendProvider, setBackendProvider] = useState<RaporCloudProvider>(
        settings.raporCloudConfig?.backendProvider || 'gas'
    );
    const [cloudScriptUrl, setCloudScriptUrl] = useState(
        settings.raporCloudConfig?.googleScriptUrl || ''
    );
    const [cloudApiKey, setCloudApiKey] = useState(settings.raporCloudConfig?.apiKey || '');
    const providerMeta = useMemo(() => getRaporCloudProviderMeta(backendProvider), [backendProvider]);
    const [filterPeriodOnly, setFilterPeriodOnly] = useState<boolean>(false);
    const [targetTahun, setTargetTahun] = useState<string>(defaultYear);
    const [targetSemester, setTargetSemester] = useState<'Ganjil' | 'Genap'>('Ganjil');
    const [isProcessing, setIsProcessing] = useState(false);
    const [quarantinedPlaintext, setQuarantinedPlaintext] = useState<{
        items: any[];
        filterOpts?: ParseRaporFilterOptions;
    } | null>(null);
    const [isReencrypting, setIsReencrypting] = useState(false);

    useEffect(() => {
        if (settings.raporCloudConfig?.backendProvider) {
            setBackendProvider(settings.raporCloudConfig.backendProvider);
        }
        if (settings.raporCloudConfig?.googleScriptUrl && !cloudScriptUrl) {
            setCloudScriptUrl(settings.raporCloudConfig.googleScriptUrl);
        }
        if (settings.raporCloudConfig?.apiKey && !cloudApiKey) {
            setCloudApiKey(settings.raporCloudConfig.apiKey);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [settings.raporCloudConfig?.googleScriptUrl, settings.raporCloudConfig?.backendProvider, settings.raporCloudConfig?.apiKey]);

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
            const rejectedItems: any[] = [];

            if (importSource === 'wa') {
                const matches = Array.from(waInput.matchAll(/RAPOR_V2_START([\s\S]*?)RAPOR_V2_END/g));
                if (matches.length === 0) {
                    throw new Error('Format kode WA tidak ditemukan. Pastikan menempelkan teks yang memuat RAPOR_V2_START ... RAPOR_V2_END.');
                }
                for (const m of matches) {
                    if (!m[1]) continue;
                    const { successCount, errors, stats } = await parseRaporDataV2(m[1], settings, filterOpts);
                    totalSuccess += successCount;
                    totalErrors = [...totalErrors, ...errors];
                    if (stats?.rejectedPlaintextItems?.length) {
                        rejectedItems.push(...stats.rejectedPlaintextItems);
                    }
                }
            } else {
                const cleanUrl = cloudScriptUrl.trim();
                const cloudData = await fetchRaporFromCloud(cleanUrl, filterOpts, {
                    backendProvider,
                    apiKey: cloudApiKey.trim()
                });
                const skippedChunksTotal = cloudData.reduce((acc, r) => acc + (Number(r?._e2eeSkippedChunks) || 0), 0);
                if (skippedChunksTotal > 0) {
                    showToast(`${skippedChunksTotal} paket nilai E2EE lama/beda kunci dilewati.`, 'info');
                }
                const syncRes = await syncRaporStructuredData(cloudData, settings, filterOpts);
                totalSuccess = syncRes.successCount;
                totalErrors = syncRes.errors;
                if (syncRes.stats.rejectedPlaintextItems?.length) {
                    rejectedItems.push(...syncRes.stats.rejectedPlaintextItems);
                }

                try {
                    await onUpdateSettings({
                        ...settings,
                        raporCloudConfig: {
                            ...(settings.raporCloudConfig || {}),
                            backendProvider,
                            googleScriptUrl: cleanUrl,
                            apiKey: cloudApiKey.trim(),
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

            if (rejectedItems.length > 0) {
                setQuarantinedPlaintext({ items: rejectedItems, filterOpts });
                showToast(`${rejectedItems.length} kiriman nilai plaintext ditolak karena E2EE Rapor aktif (tidak disimpan otomatis).`, 'error');
            } else {
                setQuarantinedPlaintext(null);
            }

            if (totalSuccess > 0) {
                showToast(`Berhasil menyimpan & menggabungkan ${totalSuccess} data nilai santri.`, 'success');
                setWaInput('');
            } else if (totalErrors.length === 0 && rejectedItems.length === 0) {
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

    const handleAcceptAndReencrypt = async () => {
        if (!quarantinedPlaintext || quarantinedPlaintext.items.length === 0) return;
        setIsReencrypting(true);
        try {
            const res = await acceptAndReencryptPlaintextRapor(
                quarantinedPlaintext.items,
                settings,
                quarantinedPlaintext.filterOpts
            );
            setQuarantinedPlaintext(null);
            setWaInput('');
            showToast(
                `${res.importedCount} nilai plaintext diterima & disimpan${res.reencryptedCloudCount > 0 ? ` (${res.reencryptedCloudCount} dienkripsi ulang ke Cloud)` : ''}.`,
                'success'
            );
        } catch (e) {
            showAlert('Gagal Terima & Enkripsi Ulang', (e as Error).message);
        } finally {
            setIsReencrypting(false);
        }
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
                <h3 className="font-bold text-gray-800">Impor Data Nilai (WhatsApp &amp; Cloud {providerMeta.shortName})</h3>

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
                        <i className="bi bi-cloud-arrow-down mr-1"></i> Via Cloud ({providerMeta.shortName})
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
                            <b>1 Endpoint Cloud Universal:</b> Sistem menarik seluruh kiriman nilai dari backend <strong>{providerMeta.name}</strong> Anda dan menggabungkannya otomatis per Santri.
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                            {(['gas', 'cloudflare_d1', 'supabase', 'cloudflare_r2'] as RaporCloudProvider[]).map(pv => {
                                const pm = getRaporCloudProviderMeta(pv);
                                return (
                                    <button
                                        key={pv}
                                        type="button"
                                        onClick={() => setBackendProvider(pv)}
                                        className={`py-1.5 px-2 rounded-lg border text-xs font-bold transition-all ${
                                            backendProvider === pv
                                                ? 'bg-teal-50 border-teal-500 text-teal-800'
                                                : 'bg-white border-gray-300 text-gray-600'
                                        }`}
                                    >
                                        {pm.shortName}
                                    </button>
                                );
                            })}
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1">{providerMeta.endpointLabel}</label>
                            <input
                                type="text"
                                value={cloudScriptUrl}
                                onChange={e => setCloudScriptUrl(e.target.value)}
                                placeholder={providerMeta.endpointPlaceholder}
                                className="w-full border rounded-lg p-2.5 text-xs font-mono"
                            />
                        </div>

                        {providerMeta.supportsApiKey && (
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">{providerMeta.apiKeyLabel}</label>
                                <input
                                    type="password"
                                    value={cloudApiKey}
                                    onChange={e => setCloudApiKey(e.target.value)}
                                    placeholder={providerMeta.apiKeyPlaceholder}
                                    className="w-full border rounded-lg p-2.5 text-xs font-mono"
                                />
                            </div>
                        )}

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

                {quarantinedPlaintext && quarantinedPlaintext.items.length > 0 && (
                    <div className="p-3.5 rounded-xl bg-red-50 border border-red-300 text-xs text-red-950 space-y-2">
                        <div className="font-bold text-red-900">
                            <i className="bi bi-shield-fill-exclamation mr-1.5"></i>
                            {quarantinedPlaintext.items.length} Paket Nilai Plaintext Ditolak (E2EE Aktif)
                        </div>
                        <p className="text-[11px] text-red-800 leading-relaxed">
                            E2EE modul Rapor aktif sehingga nilai tanpa enkripsi tidak disimpan otomatis &amp; tidak dihapus dari cloud.
                        </p>
                        <button
                            type="button"
                            onClick={() => void handleAcceptAndReencrypt()}
                            disabled={isReencrypting}
                            className="px-3 py-1.5 rounded-lg bg-red-700 hover:bg-red-800 disabled:bg-red-300 text-white font-bold text-xs"
                        >
                            {isReencrypting ? 'Memproses...' : `Terima & enkripsi ulang (${quarantinedPlaintext.items.length})`}
                        </button>
                    </div>
                )}
            </div>

            <div className="flex flex-col items-center justify-center text-center p-8 text-gray-500 border-2 border-dashed rounded-xl bg-gray-50">
                <i className="bi bi-database-check text-5xl mb-4 text-gray-300"></i>
                <h4 className="font-bold text-gray-700">1 Endpoint Cloud untuk Semua Rombel</h4>
                <p className="text-sm mt-2 max-w-xs">
                    Konfigurasi backend (GAS, Cloudflare D1, Supabase, atau R2) otomatis tersimpan dan dipakai bersama oleh Formulir Ledger Guru, Portal Audit Tanpa Login, dan menu Impor Nilai.
                </p>
            </div>
        </div>
    );
};
