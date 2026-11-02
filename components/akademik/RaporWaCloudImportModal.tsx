import React, { useState, useEffect, useMemo } from 'react';
import { useAppContext } from '../../AppContext';
import {
    fetchRaporFromCloud,
    parseRaporDataV2,
    syncRaporStructuredData,
    inspectRaporCloudSummary,
    RaporCloudInspectionSummary,
    ParseRaporFilterOptions,
    RaporSyncConflictItem
} from '../../services/academicService';
import { RAPOR_UNIFIED_GAS_SCRIPT_V3 } from '../../utils/raporAuditPortalGenerator';
import { getAcademicYearOptions, getDefaultAcademicYear } from '../../utils/academicYear';

export interface RaporWaCloudImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
    initialSource?: 'cloud' | 'wa';
    defaultTahunAjaran?: string;
    defaultSemester?: 'Ganjil' | 'Genap';
    defaultRombelId?: number;
    defaultTemplateId?: string;
}

export const RaporWaCloudImportModal: React.FC<RaporWaCloudImportModalProps> = ({
    isOpen,
    onClose,
    onSuccess,
    initialSource,
    defaultTahunAjaran,
    defaultSemester,
    defaultRombelId,
    defaultTemplateId
}) => {
    const { settings, onUpdateSettings, showToast, showAlert, currentUser } = useAppContext();

    const isAdminOrGlobalWrite =
        currentUser?.role === 'admin' || currentUser?.permissions?.akademik === 'write';
    const isWaliKelas = currentUser?.role === 'wali_kelas';
    const canImport = isAdminOrGlobalWrite || isWaliKelas;

    const myWaliRombels = useMemo(() => {
        if (!currentUser || isAdminOrGlobalWrite) return [];
        return settings.rombel.filter(
            r => r.waliKelasUserId === currentUser.id || r.waliKelasId === currentUser.id
        );
    }, [currentUser, isAdminOrGlobalWrite, settings.rombel]);

    const defaultYear = useMemo(() => getDefaultAcademicYear(settings), [settings]);
    const availableYears = useMemo(() => getAcademicYearOptions(settings), [settings]);

    const [importSource, setImportSource] = useState<'wa' | 'cloud'>(() => {
        if (initialSource) return initialSource;
        return settings.raporCloudConfig?.googleScriptUrl ? 'cloud' : 'wa';
    });
    const [waInput, setWaInput] = useState('');
    const [cloudScriptUrl, setCloudScriptUrl] = useState(
        settings.raporCloudConfig?.googleScriptUrl || ''
    );
    const [filterPeriodOnly, setFilterPeriodOnly] = useState<boolean>(
        Boolean(defaultTahunAjaran || defaultSemester)
    );
    const [targetTahun, setTargetTahun] = useState<string>(defaultTahunAjaran || defaultYear);
    const [targetSemester, setTargetSemester] = useState<'Ganjil' | 'Genap'>(
        defaultSemester || settings.semesterAktif || 'Ganjil'
    );
    const [targetRombelId, setTargetRombelId] = useState<number>(defaultRombelId || 0);
    const [targetTemplateId, setTargetTemplateId] = useState<string>(defaultTemplateId || '');

    const [isProcessing, setIsProcessing] = useState(false);
    const [isInspecting, setIsInspecting] = useState(false);
    const [cloudPreview, setCloudPreview] = useState<RaporCloudInspectionSummary | null>(null);
    const [showGasScriptHelper, setShowGasScriptHelper] = useState(false);
    const [pendingDiffReview, setPendingDiffReview] = useState<{
        source: 'wa' | 'cloud';
        conflicts: RaporSyncConflictItem[];
        newFieldsCount: number;
        uniqueStudentsUpdated: number;
        cachedCloudData?: any[];
        cachedWaBlocks?: string[];
    } | null>(null);

    useEffect(() => {
        if (!isOpen) return;
        if (initialSource) {
            setImportSource(initialSource);
        } else if (settings.raporCloudConfig?.googleScriptUrl) {
            setImportSource('cloud');
        }
        if (settings.raporCloudConfig?.googleScriptUrl) {
            setCloudScriptUrl(settings.raporCloudConfig.googleScriptUrl);
        }
        if (defaultTahunAjaran) setTargetTahun(defaultTahunAjaran);
        if (defaultSemester) setTargetSemester(defaultSemester);
        if (defaultRombelId !== undefined) setTargetRombelId(defaultRombelId || 0);
        if (defaultTemplateId !== undefined) setTargetTemplateId(defaultTemplateId || '');
        setCloudPreview(null);
        setPendingDiffReview(null);
    }, [
        isOpen,
        initialSource,
        settings.raporCloudConfig?.googleScriptUrl,
        defaultTahunAjaran,
        defaultSemester,
        defaultRombelId,
        defaultTemplateId
    ]);

    const selectableRombels = useMemo(() => {
        if (isAdminOrGlobalWrite) return settings.rombel;
        return myWaliRombels;
    }, [isAdminOrGlobalWrite, settings.rombel, myWaliRombels]);

    const detectedWaBlocks = useMemo(() => {
        if (!waInput.trim()) return 0;
        return Array.from(waInput.matchAll(/RAPOR_V2_START([\s\S]*?)RAPOR_V2_END/g)).length;
    }, [waInput]);

    if (!isOpen) return null;

    const buildFilterOptions = (): ParseRaporFilterOptions => {
        const opts: ParseRaporFilterOptions = {};
        if (importSource === 'cloud' && filterPeriodOnly) {
            if (targetTahun) opts.tahunAjaran = targetTahun;
            if (targetSemester) opts.semester = targetSemester;
        }
        if (importSource === 'cloud' && targetRombelId > 0) {
            opts.rombelId = targetRombelId;
        }
        if (importSource === 'cloud' && targetTemplateId) {
            opts.templateId = targetTemplateId;
        }
        if (!isAdminOrGlobalWrite && isWaliKelas) {
            opts.allowedRombelIds = myWaliRombels.map(r => r.id);
        }
        return opts;
    };

    const handleInspectCloud = async () => {
        const cleanUrl = cloudScriptUrl.trim();
        if (!cleanUrl) return;
        setIsInspecting(true);
        try {
            const filterOpts = filterPeriodOnly
                ? {
                      tahunAjaran: targetTahun,
                      semester: targetSemester,
                      ...(targetRombelId > 0 ? { rombelId: targetRombelId } : {}),
                      ...(targetTemplateId ? { templateId: targetTemplateId } : {})
                  }
                : {
                      ...(targetRombelId > 0 ? { rombelId: targetRombelId } : {}),
                      ...(targetTemplateId ? { templateId: targetTemplateId } : {})
                  };
            const rows = await fetchRaporFromCloud(cleanUrl, filterOpts);
            const summary = inspectRaporCloudSummary(rows, settings);
            setCloudPreview(summary);
            if (summary.totalRows === 0) {
                showToast('Terhubung ke GAS, tetapi belum ada baris nilai pada filter tersebut.', 'info');
            } else {
                showToast(
                    `Terdeteksi ${summary.uniqueStudents} santri di ${summary.tabs.length} tab Google Sheet.`,
                    'success'
                );
            }
        } catch (err) {
            showAlert('Gagal Membaca Google Sheet', (err as Error).message);
        } finally {
            setIsInspecting(false);
        }
    };

    const handleCopyGasScript = async () => {
        try {
            await navigator.clipboard.writeText(RAPOR_UNIFIED_GAS_SCRIPT_V3);
            showToast('Kode Google Apps Script Terpadu v3.0 berhasil disalin ke Clipboard.', 'success');
        } catch {
            showToast('Gagal menyalin otomatis. Silakan salin manual dari kotak kode.', 'error');
        }
    };

    const executeCommitImport = async (
        mode: 'overwrite' | 'fill_empty_only',
        cachedPayload?: { cloudData?: any[]; waBlocks?: string[] }
    ) => {
        setIsProcessing(true);
        try {
            const filterOpts: ParseRaporFilterOptions = {
                ...buildFilterOptions(),
                dryRun: false,
                conflictMode: mode
            };
            let totalSuccess = 0;
            let totalErrors: string[] = [];
            let tabsCount = 0;

            if (importSource === 'wa') {
                const blocks =
                    cachedPayload?.waBlocks ||
                    Array.from(waInput.matchAll(/RAPOR_V2_START([\s\S]*?)RAPOR_V2_END/g))
                        .map(m => (m[1] || '').trim())
                        .filter(Boolean);

                for (const block of blocks) {
                    const { successCount, errors } = await parseRaporDataV2(block, settings, filterOpts);
                    totalSuccess += successCount;
                    totalErrors = [...totalErrors, ...errors];
                }
            } else {
                const cleanUrl = cloudScriptUrl.trim();
                const cloudData =
                    cachedPayload?.cloudData ||
                    (await fetchRaporFromCloud(cleanUrl, {
                        ...(filterOpts.tahunAjaran ? { tahunAjaran: filterOpts.tahunAjaran } : {}),
                        ...(filterOpts.semester ? { semester: filterOpts.semester } : {}),
                        ...(filterOpts.rombelId ? { rombelId: filterOpts.rombelId } : {}),
                        ...(filterOpts.templateId ? { templateId: filterOpts.templateId } : {})
                    }));
                const result = await syncRaporStructuredData(cloudData, settings, filterOpts);
                totalSuccess = result.successCount;
                totalErrors = result.errors;
                tabsCount = result.stats.tabsDetected.length;

                if (isAdminOrGlobalWrite && cleanUrl) {
                    try {
                        await onUpdateSettings({
                            ...settings,
                            raporCloudConfig: {
                                ...(settings.raporCloudConfig || {}),
                                googleScriptUrl: cleanUrl,
                                submissionMethod:
                                    settings.raporCloudConfig?.submissionMethod || 'hybrid',
                                tabMode: settings.raporCloudConfig?.tabMode || 'per_rombel',
                                updatedAt:
                                    settings.raporCloudConfig?.updatedAt ||
                                    new Date().toISOString(),
                                lastSyncedAt: new Date().toISOString(),
                                lastSyncedStudents: totalSuccess
                            }
                        });
                    } catch {
                        // non-fatal
                    }
                }
            }

            setPendingDiffReview(null);

            if (totalSuccess > 0) {
                const tabSuffix =
                    importSource === 'cloud' && tabsCount > 0
                        ? ` dari ${tabsCount} tab Google Sheet`
                        : '';
                const modeNote =
                    mode === 'fill_empty_only' ? ' (hanya mengisi sel kosong)' : '';
                showToast(
                    `Berhasil menarik & menggabungkan nilai ${totalSuccess} santri${tabSuffix}${modeNote}.`,
                    'success'
                );
                setWaInput('');
                onSuccess?.();
                onClose();
            } else if (totalErrors.length === 0) {
                showToast(
                    mode === 'fill_empty_only'
                        ? 'Tidak ada sel kosong baru yang perlu diisi (seluruh nilai lokal dipertahankan).'
                        : 'Tidak ada data nilai baru yang cocok dengan periode atau ruang lingkup rombel yang dipilih.',
                    'info'
                );
                if (mode === 'fill_empty_only') {
                    onClose();
                }
            }

            if (totalErrors.length > 0) {
                showAlert('Catatan Sinkronisasi Nilai', totalErrors.slice(0, 15).join('\n'));
            }
        } catch (e) {
            showAlert('Gagal Menarik / Memproses Data', (e as Error).message);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleProcessImport = async () => {
        if (!canImport) return;
        if (!isAdminOrGlobalWrite && isWaliKelas && myWaliRombels.length === 0) {
            showAlert(
                'Rombel Wali Belum Terhubung',
                'Akun Wali Kelas Anda belum dipetakan ke Rombel manapun. Hubungi Admin untuk mengatur Wali Kelas pada Data Master Rombel.'
            );
            return;
        }
        if (importSource === 'wa' && !waInput.trim()) return;
        if (importSource === 'cloud' && !cloudScriptUrl.trim()) return;

        setIsProcessing(true);
        try {
            const dryOpts: ParseRaporFilterOptions = {
                ...buildFilterOptions(),
                dryRun: true,
                conflictMode: 'overwrite'
            };

            if (importSource === 'wa') {
                const matches = Array.from(
                    waInput.matchAll(/RAPOR_V2_START([\s\S]*?)RAPOR_V2_END/g)
                );
                const blocks = matches.map(m => (m[1] || '').trim()).filter(Boolean);
                if (blocks.length === 0) {
                    throw new Error(
                        'Format kode WA tidak valid. Pastikan pesan mengandung blok RAPOR_V2_START ... RAPOR_V2_END.'
                    );
                }

                const allConflicts: RaporSyncConflictItem[] = [];
                let newFields = 0;
                let updatedStudents = 0;
                for (const block of blocks) {
                    const dryRes = await parseRaporDataV2(block, settings, dryOpts);
                    if (dryRes.stats) {
                        allConflicts.push(...(dryRes.stats.conflicts || []));
                        newFields += dryRes.stats.newFieldsCount || 0;
                        updatedStudents += dryRes.stats.uniqueStudentsUpdated || 0;
                    }
                }

                if (allConflicts.length > 0) {
                    setPendingDiffReview({
                        source: 'wa',
                        conflicts: allConflicts,
                        newFieldsCount: newFields,
                        uniqueStudentsUpdated: updatedStudents,
                        cachedWaBlocks: blocks
                    });
                    setIsProcessing(false);
                    return;
                }

                await executeCommitImport('overwrite', { waBlocks: blocks });
            } else {
                const cleanUrl = cloudScriptUrl.trim();
                const cloudQueryOpts = {
                    ...(dryOpts.tahunAjaran ? { tahunAjaran: dryOpts.tahunAjaran } : {}),
                    ...(dryOpts.semester ? { semester: dryOpts.semester } : {}),
                    ...(dryOpts.rombelId ? { rombelId: dryOpts.rombelId } : {}),
                    ...(dryOpts.templateId ? { templateId: dryOpts.templateId } : {})
                };

                const cloudData = await fetchRaporFromCloud(cleanUrl, cloudQueryOpts);
                const dryRes = await syncRaporStructuredData(cloudData, settings, dryOpts);

                if (dryRes.stats.conflicts.length > 0) {
                    setPendingDiffReview({
                        source: 'cloud',
                        conflicts: dryRes.stats.conflicts,
                        newFieldsCount: dryRes.stats.newFieldsCount,
                        uniqueStudentsUpdated: dryRes.stats.uniqueStudentsUpdated,
                        cachedCloudData: cloudData
                    });
                    setIsProcessing(false);
                    return;
                }

                await executeCommitImport('overwrite', { cloudData });
            }
        } catch (e) {
            showAlert('Gagal Menarik / Memproses Data', (e as Error).message);
            setIsProcessing(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl max-w-2xl w-full flex flex-col shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200 max-h-[92vh]">
                {/* Header */}
                <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-3 shrink-0">
                    <div className="min-w-0">
                        <div className="text-xs font-semibold text-teal-700">
                            Sinkronisasi &amp; Impor Nilai Rapor
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 truncate">
                            Tarik Nilai dari Cloud GAS &amp; WhatsApp
                        </h3>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-9 h-9 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-xl transition-colors shrink-0"
                        aria-label="Tutup modal"
                    >
                        <i className="bi bi-x-lg text-sm"></i>
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-4 overflow-y-auto custom-scrollbar">
                    {pendingDiffReview && (
                        <div className="p-4 rounded-2xl bg-amber-50/90 border border-amber-300 space-y-3 animate-in fade-in">
                            <div className="flex items-start gap-2.5">
                                <i className="bi bi-exclamation-triangle-fill text-amber-600 text-base mt-0.5 shrink-0"></i>
                                <div className="text-xs text-amber-950">
                                    <div className="font-black text-sm">
                                        Ditemukan {pendingDiffReview.conflicts.length} Nilai Berbeda dengan Data Lokal
                                    </div>
                                    <p className="text-amber-800 mt-0.5 leading-relaxed">
                                        Terdapat <strong>{pendingDiffReview.newFieldsCount}</strong> sel kosong baru dan{' '}
                                        <strong>{pendingDiffReview.conflicts.length}</strong> sel yang nilainya berbeda dengan data yang sudah tersimpan di perangkat ini. Pilih cara penggabungan di bawah:
                                    </p>
                                </div>
                            </div>

                            <div className="max-h-52 overflow-y-auto bg-white rounded-xl border border-amber-200 divide-y divide-slate-100">
                                <table className="w-full text-left text-[11px]">
                                    <thead className="bg-slate-50 text-slate-600 sticky top-0">
                                        <tr>
                                            <th className="py-2 px-3 font-bold">Santri</th>
                                            <th className="py-2 px-2 font-bold">Kolom</th>
                                            <th className="py-2 px-3 font-bold text-right">Lokal → Baru</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {pendingDiffReview.conflicts.slice(0, 80).map((c, idx) => (
                                            <tr key={`${c.santriId}_${c.key}_${idx}`} className="hover:bg-slate-50">
                                                <td className="py-1.5 px-3">
                                                    <div className="font-bold text-slate-800">{c.santriName}</div>
                                                    <div className="text-[10px] text-slate-400">{c.rombelName}</div>
                                                </td>
                                                <td className="py-1.5 px-2 font-mono font-semibold text-slate-600">
                                                    {c.key}
                                                </td>
                                                <td className="py-1.5 px-3 text-right font-mono whitespace-nowrap">
                                                    <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-bold">
                                                        {c.oldValue}
                                                    </span>
                                                    <i className="bi bi-arrow-right mx-1 text-slate-400"></i>
                                                    <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-black">
                                                        {c.newValue}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {pendingDiffReview.conflicts.length > 80 && (
                                    <div className="p-2 text-center text-[10px] text-slate-500 bg-slate-50">
                                        ...dan {pendingDiffReview.conflicts.length - 80} perubahan nilai lainnya.
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Interactive Source Switcher */}
                    <div className="flex gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200">
                        <button
                            type="button"
                            onClick={() => {
                                setImportSource('cloud');
                                setPendingDiffReview(null);
                            }}
                            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${
                                importSource === 'cloud'
                                    ? 'bg-white text-blue-700 shadow-xs'
                                    : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            <i className="bi bi-cloud-arrow-down-fill text-blue-600"></i>
                            <span>Tarik Google Sheet (1-Link GAS)</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setImportSource('wa');
                                setPendingDiffReview(null);
                            }}
                            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${
                                importSource === 'wa'
                                    ? 'bg-white text-emerald-700 shadow-xs'
                                    : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            <i className="bi bi-whatsapp text-emerald-600"></i>
                            <span>Tempel Kode WhatsApp</span>
                        </button>
                    </div>

                    {!isAdminOrGlobalWrite && isWaliKelas && (
                        <div className="p-3 rounded-xl bg-teal-50/70 border border-teal-200 text-xs text-teal-900">
                            Mode Wali Kelas aktif: sistem hanya menarik dan menggabungkan nilai santri pada rombel ampu Anda (
                            <strong>{myWaliRombels.map(r => r.nama).join(', ') || 'Belum ada rombel'}</strong>).
                        </div>
                    )}

                    {importSource === 'cloud' ? (
                        <div className="space-y-4">
                            <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl text-xs text-slate-700 leading-relaxed flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div>
                                    Menarik nilai dari seluruh tab Rombel &amp; Template pada{' '}
                                    <strong className="text-slate-900">1 Link Google Apps Script Terpadu</strong>,
                                    termasuk koreksi manual di sel Google Sheets, lalu menggabungkannya per santri tanpa menimpa mapel lain yang sudah terisi.
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setShowGasScriptHelper(v => !v)}
                                    className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold text-xs whitespace-nowrap shrink-0 transition-colors"
                                >
                                    <i className="bi bi-code-slash mr-1.5 text-teal-600"></i>
                                    {showGasScriptHelper ? 'Tutup Kode GAS' : 'Lihat Script GAS'}
                                </button>
                            </div>

                            {showGasScriptHelper && (
                                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-900 text-slate-100 space-y-2">
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="text-xs font-semibold text-teal-300">
                                            Google Apps Script Terpadu v3.0 (Multi-Tab + Smart Merge)
                                        </span>
                                        <button
                                            type="button"
                                            onClick={handleCopyGasScript}
                                            className="px-2.5 py-1 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors"
                                        >
                                            <i className="bi bi-clipboard-check"></i>
                                            <span>Salin Script</span>
                                        </button>
                                    </div>
                                    <pre className="max-h-36 overflow-y-auto text-[11px] font-mono text-slate-300 bg-slate-950/80 p-2.5 rounded-lg border border-slate-800">
                                        {RAPOR_UNIFIED_GAS_SCRIPT_V3}
                                    </pre>
                                    <p className="text-[11px] text-slate-400">
                                        Pasang di Google Sheets &rarr; Extensions &rarr; Apps Script &rarr; Deploy as Web App (Execute as: Me, Who has access: Anyone).
                                    </p>
                                </div>
                            )}

                            {/* URL Input + Cek Isi Sheet */}
                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between gap-2">
                                    <label className="text-xs font-bold text-slate-700">
                                        URL Web App Google Apps Script
                                    </label>
                                    <div className="flex items-center gap-2 text-[11px] text-slate-500 tabular-nums">
                                        {settings.raporCloudConfig?.googleScriptUrl &&
                                            cloudScriptUrl.trim() ===
                                                settings.raporCloudConfig.googleScriptUrl.trim() && (
                                                <span className="text-emerald-700 font-semibold">
                                                    Link Default Pondok
                                                </span>
                                            )}
                                        {settings.raporCloudConfig?.lastSyncedAt && (
                                            <>
                                                <span aria-hidden="true">·</span>
                                                <span>
                                                    Tarik terakhir:{' '}
                                                    {new Date(
                                                        settings.raporCloudConfig.lastSyncedAt
                                                    ).toLocaleString('id-ID', {
                                                        day: '2-digit',
                                                        month: 'short',
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}
                                                </span>
                                            </>
                                        )}
                                    </div>
                                </div>
                                <div className="flex flex-col sm:flex-row gap-2">
                                    <input
                                        type="url"
                                        value={cloudScriptUrl}
                                        onChange={e => setCloudScriptUrl(e.target.value)}
                                        readOnly={!isAdminOrGlobalWrite && Boolean(settings.raporCloudConfig?.googleScriptUrl)}
                                        placeholder="https://script.google.com/macros/s/.../exec"
                                        className="flex-1 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-mono bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleInspectCloud}
                                        disabled={isInspecting || !cloudScriptUrl.trim()}
                                        className="px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 whitespace-nowrap disabled:opacity-50 transition-colors"
                                    >
                                        {isInspecting ? (
                                            <>
                                                <span className="animate-spin h-3.5 w-3.5 border-2 border-slate-600 rounded-full border-t-transparent"></span>
                                                <span>Mengecek...</span>
                                            </>
                                        ) : (
                                            <>
                                                <i className="bi bi-search text-blue-600"></i>
                                                <span>Cek Isi Sheet</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Live Cloud Inspection Preview */}
                            {cloudPreview && (
                                <div className="p-3.5 rounded-xl border border-blue-200 bg-blue-50/50 space-y-2.5 text-xs">
                                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-blue-100 pb-2">
                                        <span className="font-bold text-slate-800">
                                            Ringkasan Data di Google Sheet
                                        </span>
                                        <div className="flex items-center gap-2 text-slate-600 tabular-nums font-medium">
                                            <span>{cloudPreview.tabs.length} Tab</span>
                                            <span aria-hidden="true">·</span>
                                            <span>{cloudPreview.uniqueStudents} Santri</span>
                                            <span aria-hidden="true">·</span>
                                            <span>{cloudPreview.totalRows} Baris</span>
                                        </div>
                                    </div>
                                    {cloudPreview.tabs.length > 0 ? (
                                        <div className="space-y-1.5">
                                            <div className="text-[11px] text-slate-600">
                                                <strong>Periode terdeteksi:</strong>{' '}
                                                {cloudPreview.periods.join(', ') || '-'}
                                            </div>
                                            <div className="max-h-28 overflow-y-auto space-y-1 pr-1">
                                                {cloudPreview.tabs.map(t => (
                                                    <div
                                                        key={t.name}
                                                        className="flex items-center justify-between text-[11px] bg-white px-2.5 py-1.5 rounded-lg border border-slate-200/80"
                                                    >
                                                        <span className="font-medium text-slate-700 truncate pr-2">
                                                            {t.name}
                                                        </span>
                                                        <span className="font-mono text-slate-500 tabular-nums shrink-0">
                                                            {t.rowCount} baris
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-[11px] text-slate-500">
                                            Belum ada tab nilai yang cocok dengan filter saat ini.
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Scope / Filter Controls */}
                            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                                <div className="flex items-center justify-between">
                                    <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={filterPeriodOnly}
                                            onChange={e => setFilterPeriodOnly(e.target.checked)}
                                            className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                                        />
                                        <span>Batasi Tahun Ajaran &amp; Semester tertentu</span>
                                    </label>
                                    <span className="text-[11px] text-slate-500">
                                        {filterPeriodOnly ? 'Filter Periode Aktif' : 'Semua Periode'}
                                    </span>
                                </div>

                                {filterPeriodOnly && (
                                    <div className="grid grid-cols-2 gap-2.5">
                                        <div>
                                            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                                                Tahun Ajaran
                                            </label>
                                            <select
                                                value={targetTahun}
                                                onChange={e => setTargetTahun(e.target.value)}
                                                className="w-full border border-slate-300 rounded-lg p-2 text-xs font-semibold bg-white outline-none"
                                            >
                                                {availableYears.map(y => (
                                                    <option key={y} value={y}>
                                                        {y}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                                                Semester
                                            </label>
                                            <select
                                                value={targetSemester}
                                                onChange={e =>
                                                    setTargetSemester(e.target.value as 'Ganjil' | 'Genap')
                                                }
                                                className="w-full border border-slate-300 rounded-lg p-2 text-xs font-semibold bg-white outline-none"
                                            >
                                                <option value="Ganjil">Ganjil</option>
                                                <option value="Genap">Genap</option>
                                            </select>
                                        </div>
                                    </div>
                                )}

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 border-t border-slate-200/80">
                                    <div>
                                        <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                                            Filter Rombel (Opsional)
                                        </label>
                                        <select
                                            value={targetRombelId}
                                            onChange={e => setTargetRombelId(Number(e.target.value))}
                                            className="w-full border border-slate-300 rounded-lg p-2 text-xs font-semibold bg-white outline-none"
                                        >
                                            <option value={0}>
                                                {isAdminOrGlobalWrite
                                                    ? 'Semua Rombel di Spreadsheet'
                                                    : 'Semua Rombel Ampu Saya'}
                                            </option>
                                            {selectableRombels.map(r => (
                                                <option key={r.id} value={r.id}>
                                                    {r.nama}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                                            Filter Template Rapor (Opsional)
                                        </label>
                                        <select
                                            value={targetTemplateId}
                                            onChange={e => setTargetTemplateId(e.target.value)}
                                            className="w-full border border-slate-300 rounded-lg p-2 text-xs font-semibold bg-white outline-none"
                                        >
                                            <option value="">Semua Template (Reguler, Diniyah, Mutun, dll.)</option>
                                            {(settings.raporTemplates || []).map(t => (
                                                <option key={t.id} value={t.id}>
                                                    {t.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-2.5">
                            <div className="flex items-center justify-between">
                                <label className="block text-xs font-bold text-slate-700">
                                    Tempelkan Pesan / Kode Setoran Rapor dari WhatsApp:
                                </label>
                                {detectedWaBlocks > 0 && (
                                    <span className="text-xs font-semibold text-emerald-700 tabular-nums">
                                        {detectedWaBlocks} blok kode terdeteksi
                                    </span>
                                )}
                            </div>
                            <textarea
                                value={waInput}
                                onChange={e => setWaInput(e.target.value)}
                                className="w-full h-48 border border-slate-200 rounded-xl p-3 font-mono text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-teal-500 outline-none transition-all"
                                placeholder="Paste 1 atau beberapa pesan RAPOR_V2_START...RAPOR_V2_END sekaligus di sini..."
                            />
                            <p className="text-[11px] text-slate-500 leading-relaxed">
                                Anda dapat menempelkan beberapa chat setoran guru sekaligus. Seluruh blok kode{' '}
                                <code>RAPOR_V2_START...RAPOR_V2_END</code> akan digabungkan otomatis (Smart Merge).
                            </p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2 shrink-0">
                    {pendingDiffReview ? (
                        <div className="flex flex-wrap items-center justify-end gap-2 w-full">
                            <button
                                type="button"
                                onClick={() => setPendingDiffReview(null)}
                                disabled={isProcessing}
                                className="px-3.5 py-2 border border-slate-300 text-slate-700 rounded-xl font-bold text-xs hover:bg-slate-100 transition-colors"
                            >
                                Kembali
                            </button>
                            <button
                                type="button"
                                onClick={() =>
                                    executeCommitImport('fill_empty_only', {
                                        cloudData: pendingDiffReview.cachedCloudData,
                                        waBlocks: pendingDiffReview.cachedWaBlocks
                                    })
                                }
                                disabled={isProcessing}
                                className="px-4 py-2 bg-white hover:bg-teal-50 text-teal-800 border border-teal-300 font-bold rounded-xl text-xs shadow-2xs transition-colors flex items-center gap-1.5"
                                title="Hanya mengisi sel yang saat ini masih kosong; nilai lokal yang sudah terisi tidak akan ditimpa"
                            >
                                <i className="bi bi-shield-check text-teal-600"></i>
                                <span>Hanya Isi Sel Kosong ({pendingDiffReview.newFieldsCount})</span>
                            </button>
                            <button
                                type="button"
                                onClick={() =>
                                    executeCommitImport('overwrite', {
                                        cloudData: pendingDiffReview.cachedCloudData,
                                        waBlocks: pendingDiffReview.cachedWaBlocks
                                    })
                                }
                                disabled={isProcessing}
                                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs shadow-sm transition-colors flex items-center gap-1.5"
                                title="Perbarui nilai lokal dengan nilai kiriman terbaru"
                            >
                                <i className="bi bi-arrow-repeat"></i>
                                <span>Timpa Nilai Lama ({pendingDiffReview.conflicts.length})</span>
                            </button>
                        </div>
                    ) : (
                        <>
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={isProcessing}
                                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl font-bold text-xs hover:bg-slate-100 transition-colors"
                            >
                                Batal
                            </button>
                            <button
                                type="button"
                                onClick={handleProcessImport}
                                disabled={
                                    isProcessing ||
                                    (importSource === 'wa' ? !waInput.trim() : !cloudScriptUrl.trim()) ||
                                    !canImport
                                }
                                className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-xs shadow-sm disabled:bg-slate-300 flex items-center gap-1.5 whitespace-nowrap transition-colors"
                            >
                                {isProcessing ? (
                                    <>
                                        <span className="animate-spin h-3.5 w-3.5 border-2 border-white rounded-full border-t-transparent"></span>
                                        <span>Memeriksa &amp; Menggabungkan...</span>
                                    </>
                                ) : (
                                    <>
                                        <i
                                            className={
                                                importSource === 'cloud'
                                                    ? 'bi bi-cloud-arrow-down-fill'
                                                    : 'bi bi-box-arrow-in-down'
                                            }
                                        ></i>
                                        <span>
                                            {importSource === 'cloud'
                                                ? 'Tarik & Simpan Nilai GAS'
                                                : 'Proses & Simpan Kode WA'}
                                        </span>
                                    </>
                                )}
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export interface RaporCloudPullControlProps {
    defaultTahunAjaran?: string;
    defaultSemester?: 'Ganjil' | 'Genap';
    defaultRombelId?: number;
    defaultTemplateId?: string;
    showWaShortcut?: boolean;
    compact?: boolean;
    hasUnsavedChanges?: boolean;
    onSyncComplete?: () => void;
}

/**
 * Tombol Split Cepat [Tarik Nilai GAS | ⚙] ala PSB + Pintasan Impor WA.
 * Jika URL GAS sudah tersimpan di Pengaturan Pondok, klik tombol utama langsung menarik & menggabungkan
 * nilai dari seluruh tab Google Sheet dalam 1 klik. Jika belum, otomatis membuka modal konfigurasi GAS.
 */
export const RaporCloudPullControl: React.FC<RaporCloudPullControlProps> = ({
    defaultTahunAjaran,
    defaultSemester,
    defaultRombelId,
    defaultTemplateId,
    showWaShortcut = false,
    compact = false,
    hasUnsavedChanges = false,
    onSyncComplete
}) => {
    const { settings, onUpdateSettings, currentUser, showToast, showAlert, showConfirmation } =
        useAppContext();

    const isAdminOrGlobalWrite =
        currentUser?.role === 'admin' || currentUser?.permissions?.akademik === 'write';
    const isWaliKelas = currentUser?.role === 'wali_kelas';
    const canImport = isAdminOrGlobalWrite || isWaliKelas;

    const myWaliRombels = useMemo(() => {
        if (!currentUser || isAdminOrGlobalWrite) return [];
        return settings.rombel.filter(
            r => r.waliKelasUserId === currentUser.id || r.waliKelasId === currentUser.id
        );
    }, [currentUser, isAdminOrGlobalWrite, settings.rombel]);

    const [isQuickPulling, setIsQuickPulling] = useState(false);
    const [modalState, setModalState] = useState<{
        open: boolean;
        source: 'cloud' | 'wa';
    }>({ open: false, source: 'cloud' });
    const [quickDiffState, setQuickDiffState] = useState<{
        cloudData: any[];
        filterOpts: ParseRaporFilterOptions;
        conflicts: RaporSyncConflictItem[];
        newFieldsCount: number;
    } | null>(null);

    if (!canImport) return null;

    const savedScriptUrl = (settings.raporCloudConfig?.googleScriptUrl || '').trim();

    const commitQuickPullData = async (
        cloudData: any[],
        baseFilterOpts: ParseRaporFilterOptions,
        conflictMode: 'overwrite' | 'fill_empty_only'
    ) => {
        setIsQuickPulling(true);
        try {
            const result = await syncRaporStructuredData(cloudData, settings, {
                ...baseFilterOpts,
                dryRun: false,
                conflictMode
            });

            if (isAdminOrGlobalWrite) {
                try {
                    await onUpdateSettings({
                        ...settings,
                        raporCloudConfig: {
                            ...(settings.raporCloudConfig || {}),
                            googleScriptUrl: savedScriptUrl,
                            lastSyncedAt: new Date().toISOString(),
                            lastSyncedStudents: result.successCount
                        }
                    });
                } catch {
                    // non-fatal
                }
            }

            setQuickDiffState(null);

            if (result.successCount > 0) {
                const tabCount = result.stats.tabsDetected.length;
                const modeNote =
                    conflictMode === 'fill_empty_only' ? ' (hanya sel kosong)' : '';
                showToast(
                    `Berhasil menarik & menggabungkan nilai ${result.successCount} santri${
                        tabCount > 0 ? ` dari ${tabCount} tab Sheet` : ''
                    }${modeNote}.`,
                    'success'
                );
                onSyncComplete?.();
            } else if (result.errors.length === 0) {
                showToast(
                    conflictMode === 'fill_empty_only'
                        ? 'Tidak ada sel kosong baru yang diisi (nilai lokal yang sudah ada dipertahankan).'
                        : defaultTahunAjaran
                        ? `Belum ada kiriman nilai baru di Google Sheet untuk periode ${defaultTahunAjaran} (${defaultSemester || ''}). Klik ikon pengaturan (⚙) jika ingin menarik semua periode.`
                        : 'Belum ada baris nilai baru di Google Sheet.',
                    'info'
                );
            }

            if (result.errors.length > 0) {
                showAlert('Catatan Sinkronisasi Nilai', result.errors.slice(0, 15).join('\n'));
            }
        } catch (err) {
            showAlert(
                'Gagal Menyimpan Nilai dari GAS',
                (err as Error).message
            );
        } finally {
            setIsQuickPulling(false);
        }
    };

    const executeQuickPull = async () => {
        if (!savedScriptUrl) {
            setModalState({ open: true, source: 'cloud' });
            return;
        }
        if (!isAdminOrGlobalWrite && isWaliKelas && myWaliRombels.length === 0) {
            showAlert(
                'Rombel Wali Belum Terhubung',
                'Akun Wali Kelas Anda belum dipetakan ke Rombel manapun. Hubungi Admin.'
            );
            return;
        }

        setIsQuickPulling(true);
        try {
            const filterOpts: ParseRaporFilterOptions = {};
            if (defaultTahunAjaran) filterOpts.tahunAjaran = defaultTahunAjaran;
            if (defaultSemester) filterOpts.semester = defaultSemester;
            if (!isAdminOrGlobalWrite && isWaliKelas) {
                filterOpts.allowedRombelIds = myWaliRombels.map(r => r.id);
            }

            const cloudData = await fetchRaporFromCloud(savedScriptUrl, {
                ...(filterOpts.tahunAjaran ? { tahunAjaran: filterOpts.tahunAjaran } : {}),
                ...(filterOpts.semester ? { semester: filterOpts.semester } : {})
            });

            const dryResult = await syncRaporStructuredData(cloudData, settings, {
                ...filterOpts,
                dryRun: true,
                conflictMode: 'overwrite'
            });

            if (dryResult.stats.conflicts.length > 0) {
                setQuickDiffState({
                    cloudData,
                    filterOpts,
                    conflicts: dryResult.stats.conflicts,
                    newFieldsCount: dryResult.stats.newFieldsCount
                });
                setIsQuickPulling(false);
                return;
            }

            await commitQuickPullData(cloudData, filterOpts, 'overwrite');
        } catch (err) {
            showAlert(
                'Gagal Menarik Nilai dari GAS',
                `${(err as Error).message}\n\nKlik tombol pengaturan (⚙) di sebelah tombol Tarik GAS untuk memeriksa URL Google Apps Script.`
            );
            setIsQuickPulling(false);
        }
    };

    const handleQuickPullClick = () => {
        if (hasUnsavedChanges) {
            showConfirmation(
                'Ketikan Lokal Belum Disimpan',
                'Anda memiliki ketikan nilai yang belum disimpan di halaman ini. Menarik nilai dari Cloud GAS akan memuat ulang data terbaru dari database. Lanjutkan?',
                () => {
                    executeQuickPull();
                },
                { confirmColor: 'amber', confirmText: 'Ya, Tarik dari GAS' }
            );
            return;
        }
        executeQuickPull();
    };

    const openModalWithGuard = (source: 'cloud' | 'wa') => {
        if (hasUnsavedChanges) {
            showConfirmation(
                'Ketikan Lokal Belum Disimpan',
                'Anda memiliki ketikan nilai yang belum disimpan. Simpan terlebih dahulu atau lanjutkan membuka menu impor eksternal?',
                () => {
                    setModalState({ open: true, source });
                },
                { confirmColor: 'amber', confirmText: 'Tetap Buka Impor' }
            );
            return;
        }
        setModalState({ open: true, source });
    };

    const padClass = compact ? 'px-3 py-2 text-xs' : 'px-3.5 py-2 text-xs';

    return (
        <>
            <div className="inline-flex items-center gap-2 flex-wrap">
                <div className="inline-flex items-stretch rounded-xl shadow-2xs overflow-hidden border border-blue-200 bg-blue-50">
                    <button
                        type="button"
                        onClick={handleQuickPullClick}
                        disabled={isQuickPulling}
                        title={
                            savedScriptUrl
                                ? `Tarik & gabungkan nilai terbaru dari Google Sheet${
                                      defaultTahunAjaran
                                          ? ` (${defaultTahunAjaran} ${defaultSemester || ''})`
                                          : ''
                                  }`
                                : 'Hubungkan Link Google Apps Script untuk menarik nilai otomatis'
                        }
                        className={`${padClass} font-bold text-blue-800 hover:bg-blue-100/80 transition-colors flex items-center gap-1.5 whitespace-nowrap disabled:opacity-60`}
                    >
                        {isQuickPulling ? (
                            <>
                                <span className="animate-spin h-3.5 w-3.5 border-2 border-blue-700 rounded-full border-t-transparent"></span>
                                <span>Menarik GAS...</span>
                            </>
                        ) : (
                            <>
                                <i className="bi bi-cloud-arrow-down-fill text-blue-600 text-sm"></i>
                                <span>Tarik Nilai GAS</span>
                            </>
                        )}
                    </button>
                    <button
                        type="button"
                        onClick={() => openModalWithGuard('cloud')}
                        disabled={isQuickPulling}
                        title="Pengaturan Link GAS, Cek Isi Sheet, Filter Rombel & Impor Kode WA"
                        aria-label="Pengaturan Tarik Nilai GAS dan Impor WA"
                        className="px-2.5 py-2 border-l border-blue-200 text-blue-700 hover:bg-blue-100 transition-colors flex items-center justify-center"
                    >
                        <i className="bi bi-sliders text-xs"></i>
                    </button>
                </div>

                {showWaShortcut && (
                    <button
                        type="button"
                        onClick={() => openModalWithGuard('wa')}
                        disabled={isQuickPulling}
                        title="Tempel kode setoran nilai dari pesan WhatsApp guru"
                        className={`${padClass} bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl font-bold transition-colors flex items-center gap-1.5 whitespace-nowrap`}
                    >
                        <i className="bi bi-whatsapp text-emerald-600"></i>
                        <span>Import WA</span>
                    </button>
                )}
            </div>

            {quickDiffState && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-2xl border border-amber-200 space-y-4 animate-in fade-in zoom-in-95">
                        <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
                            <div className="flex items-start gap-2.5">
                                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                                    <i className="bi bi-arrow-left-right text-sm"></i>
                                </div>
                                <div>
                                    <h3 className="text-sm font-black text-slate-900">
                                        Pratinjau Perbedaan Nilai Cloud GAS
                                    </h3>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        Ditemukan <strong>{quickDiffState.newFieldsCount}</strong> sel kosong baru dan{' '}
                                        <strong>{quickDiffState.conflicts.length}</strong> sel yang berbeda dengan nilai lokal.
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setQuickDiffState(null)}
                                className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center"
                            >
                                <i className="bi bi-x-lg text-xs"></i>
                            </button>
                        </div>

                        <div className="max-h-56 overflow-y-auto rounded-xl border border-slate-200">
                            <table className="w-full text-left text-[11px]">
                                <thead className="bg-slate-50 text-slate-600 sticky top-0">
                                    <tr>
                                        <th className="py-2 px-3 font-bold">Santri</th>
                                        <th className="py-2 px-2 font-bold">Kolom</th>
                                        <th className="py-2 px-3 font-bold text-right">Lokal → Cloud</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {quickDiffState.conflicts.slice(0, 80).map((c, idx) => (
                                        <tr key={`${c.santriId}_${c.key}_${idx}`} className="hover:bg-slate-50">
                                            <td className="py-1.5 px-3">
                                                <div className="font-bold text-slate-800">{c.santriName}</div>
                                                <div className="text-[10px] text-slate-400">{c.rombelName}</div>
                                            </td>
                                            <td className="py-1.5 px-2 font-mono font-semibold text-slate-600">
                                                {c.key}
                                            </td>
                                            <td className="py-1.5 px-3 text-right font-mono whitespace-nowrap">
                                                <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-bold">
                                                    {c.oldValue}
                                                </span>
                                                <i className="bi bi-arrow-right mx-1 text-slate-400"></i>
                                                <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-black">
                                                    {c.newValue}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="pt-3 border-t border-slate-100 flex flex-wrap justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setQuickDiffState(null)}
                                disabled={isQuickPulling}
                                className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                            >
                                Batal
                            </button>
                            <button
                                type="button"
                                onClick={() =>
                                    commitQuickPullData(
                                        quickDiffState.cloudData,
                                        quickDiffState.filterOpts,
                                        'fill_empty_only'
                                    )
                                }
                                disabled={isQuickPulling}
                                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white hover:bg-teal-50 text-teal-800 border border-teal-300"
                            >
                                Hanya Isi Sel Kosong ({quickDiffState.newFieldsCount})
                            </button>
                            <button
                                type="button"
                                onClick={() =>
                                    commitQuickPullData(
                                        quickDiffState.cloudData,
                                        quickDiffState.filterOpts,
                                        'overwrite'
                                    )
                                }
                                disabled={isQuickPulling}
                                className="px-4 py-2 rounded-xl text-xs font-black bg-amber-600 hover:bg-amber-700 text-white shadow-xs"
                            >
                                Timpa Nilai Lama ({quickDiffState.conflicts.length})
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <RaporWaCloudImportModal
                isOpen={modalState.open}
                onClose={() => setModalState(prev => ({ ...prev, open: false }))}
                onSuccess={onSyncComplete}
                initialSource={modalState.source}
                defaultTahunAjaran={defaultTahunAjaran}
                defaultSemester={defaultSemester}
                defaultRombelId={defaultRombelId}
                defaultTemplateId={defaultTemplateId}
            />
        </>
    );
};
