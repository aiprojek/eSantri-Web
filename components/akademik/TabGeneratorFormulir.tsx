import React, { useState, useMemo, useEffect } from 'react';
import { useAppContext } from '../../AppContext';
import { useSantriContext } from '../../contexts/SantriContext';
import { db } from '../../db';
import { generateRaporFormHtml } from '../../services/academicService';
import { getTemplateSheets } from '../../services/raporExcelService';
import { getAcademicYearOptions, getDefaultAcademicYear } from '../../utils/academicYear';
import { buildStandardExportFileName } from '../../utils/exportFileName';
import {
    RAPOR_UNIFIED_GAS_SCRIPT_V3,
    generateRaporAuditPortalHtml
} from '../../utils/raporAuditPortalGenerator';

export interface TabGeneratorFormulirProps {
    initialMode?: 'ledger' | 'audit_portal';
    initialTahunAjaran?: string;
    initialSemester?: 'Ganjil' | 'Genap';
}

export const TabGeneratorFormulir: React.FC<TabGeneratorFormulirProps> = ({
    initialMode = 'ledger',
    initialTahunAjaran,
    initialSemester
}) => {
    const { settings, onUpdateSettings, showToast, showAlert } = useAppContext();
    const { santriList } = useSantriContext();
    const templates = settings.raporTemplates || [];
    const defaultAcademicYear = useMemo(() => getDefaultAcademicYear(settings), [settings]);
    const availableAcademicYears = useMemo(() => getAcademicYearOptions(settings), [settings]);

    const [generatorMode, setGeneratorMode] = useState<'ledger' | 'audit_portal'>(initialMode);

    useEffect(() => {
        if (initialMode) {
            setGeneratorMode(initialMode);
        }
    }, [initialMode]);

    // --- SHARED CLOUD / GAS CONFIG (1 Link GAS untuk Semua Ledger & Portal Audit) ---
    const savedCloudCfg = settings.raporCloudConfig;
    const [submissionMethod, setSubmissionMethod] = useState<'whatsapp' | 'google_sheet' | 'hybrid'>(
        savedCloudCfg?.submissionMethod || (savedCloudCfg?.googleScriptUrl ? 'hybrid' : 'whatsapp')
    );
    const [googleScriptUrl, setGoogleScriptUrl] = useState(savedCloudCfg?.googleScriptUrl || '');
    const [waDestination, setWaDestination] = useState(savedCloudCfg?.waDestination || '');
    const [tabMode, setTabMode] = useState<'per_rombel' | 'per_jenjang' | 'per_file'>(
        savedCloudCfg?.tabMode || 'per_rombel'
    );
    const [showScriptHelper, setShowScriptHelper] = useState(false);
    const [isSavingConfig, setIsSavingConfig] = useState(false);

    // Sync state if settings load asynchronously
    useEffect(() => {
        if (settings.raporCloudConfig) {
            if (!googleScriptUrl && settings.raporCloudConfig.googleScriptUrl) {
                setGoogleScriptUrl(settings.raporCloudConfig.googleScriptUrl);
            }
            if (!waDestination && settings.raporCloudConfig.waDestination) {
                setWaDestination(settings.raporCloudConfig.waDestination);
            }
            if (settings.raporCloudConfig.tabMode) {
                setTabMode(settings.raporCloudConfig.tabMode);
            }
            if (settings.raporCloudConfig.submissionMethod) {
                setSubmissionMethod(settings.raporCloudConfig.submissionMethod);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [settings.raporCloudConfig?.googleScriptUrl]);

    const hasUnsavedCloudChanges = useMemo(() => {
        const curUrl = googleScriptUrl.trim();
        const savedUrl = (savedCloudCfg?.googleScriptUrl || '').trim();
        const curWa = waDestination.trim();
        const savedWa = (savedCloudCfg?.waDestination || '').trim();
        const savedMethod = savedCloudCfg?.submissionMethod || 'whatsapp';
        const savedTab = savedCloudCfg?.tabMode || 'per_rombel';
        return (
            curUrl !== savedUrl ||
            curWa !== savedWa ||
            submissionMethod !== savedMethod ||
            tabMode !== savedTab
        );
    }, [googleScriptUrl, waDestination, submissionMethod, tabMode, savedCloudCfg]);

    const persistRaporCloudConfig = async (silent = false) => {
        if (!hasUnsavedCloudChanges) {
            if (!silent) showToast('Konfigurasi Link GAS sudah tersimpan sebagai default.', 'info');
            return;
        }
        setIsSavingConfig(true);
        try {
            await onUpdateSettings({
                ...settings,
                raporCloudConfig: {
                    googleScriptUrl: googleScriptUrl.trim(),
                    submissionMethod,
                    waDestination: waDestination.trim(),
                    tabMode,
                    updatedAt: new Date().toISOString()
                }
            });
            if (!silent) {
                showToast('1 Link GAS Terpadu berhasil disimpan sebagai default Rapor Pondok.', 'success');
            }
        } catch (err) {
            if (!silent) {
                showToast('Gagal menyimpan konfigurasi Link GAS: ' + (err as Error).message, 'error');
            }
        } finally {
            setIsSavingConfig(false);
        }
    };

    // --- LEDGER GENERATOR STATE ---
    const [genTemplateId, setGenTemplateId] = useState('');
    const [genJenjangId, setGenJenjangId] = useState(0);
    const [genKelasId, setGenKelasId] = useState(0);
    const [genRombelId, setGenRombelId] = useState(0);
    const [targetMode, setTargetMode] = useState<'single' | 'range'>('single');
    const [rangeFromKelasId, setRangeFromKelasId] = useState<number>(0);
    const [rangeToKelasId, setRangeToKelasId] = useState<number>(0);
    const [genSemester, setGenSemester] = useState<'Ganjil' | 'Genap'>(initialSemester || 'Ganjil');
    const [genTahunAjaran, setGenTahunAjaran] = useState(initialTahunAjaran || defaultAcademicYear);
    const [genRankingScope, setGenRankingScope] = useState<'rombel' | 'kelas' | 'jenjang' | 'global'>('rombel');

    useEffect(() => {
        if (initialTahunAjaran) setGenTahunAjaran(initialTahunAjaran);
    }, [initialTahunAjaran]);

    useEffect(() => {
        if (initialSemester) setGenSemester(initialSemester);
    }, [initialSemester]);

    // --- PORTAL AUDIT & LEGER STATE ---
    const [portalJenjangId, setPortalJenjangId] = useState<number>(0);
    const [portalTemplateId, setPortalTemplateId] = useState<string>('');
    const [portalIncludeSnapshot, setPortalIncludeSnapshot] = useState<boolean>(true);
    const [isBuildingPortal, setIsBuildingPortal] = useState<boolean>(false);

    const availableKelas = useMemo(
        () => (genJenjangId ? settings.kelas.filter(k => k.jenjangId === genJenjangId) : []),
        [genJenjangId, settings.kelas]
    );
    const availableRombel = useMemo(
        () => (genKelasId ? settings.rombel.filter(r => r.kelasId === genKelasId) : []),
        [genKelasId, settings.rombel]
    );

    useEffect(() => {
        if (availableKelas.length > 0) {
            if (!rangeFromKelasId || !availableKelas.some(k => k.id === rangeFromKelasId)) {
                setRangeFromKelasId(availableKelas[0].id);
            }
            if (!rangeToKelasId || !availableKelas.some(k => k.id === rangeToKelasId)) {
                setRangeToKelasId(availableKelas[availableKelas.length - 1].id);
            }
        } else {
            setRangeFromKelasId(0);
            setRangeToKelasId(0);
        }
    }, [availableKelas, rangeFromKelasId, rangeToKelasId]);

    const selectedRangeKelas = useMemo(() => {
        if (targetMode !== 'range' || availableKelas.length === 0) return [];
        const fromIdx = availableKelas.findIndex(k => k.id === rangeFromKelasId);
        const toIdx = availableKelas.findIndex(k => k.id === rangeToKelasId);
        if (fromIdx === -1 || toIdx === -1) return availableKelas;
        const minIdx = Math.min(fromIdx, toIdx);
        const maxIdx = Math.max(fromIdx, toIdx);
        return availableKelas.slice(minIdx, maxIdx + 1);
    }, [targetMode, availableKelas, rangeFromKelasId, rangeToKelasId]);

    const filteredTemplates = useMemo(() => {
        const rombel = targetMode === 'single' && genRombelId ? settings.rombel.find(r => r.id === genRombelId) : null;
        const kelas =
            targetMode === 'single'
                ? rombel
                    ? settings.kelas.find(k => k.id === rombel.kelasId)
                    : genKelasId
                    ? settings.kelas.find(k => k.id === genKelasId)
                    : null
                : null;
        const jenjangId = rombel ? kelas?.jenjangId || null : genJenjangId;

        if (!jenjangId) return templates;

        return templates.filter(t => {
            if (!t.jenjangId) return true;
            if (t.jenjangId !== jenjangId) return false;

            if (targetMode === 'range') {
                if (t.kelasId && !selectedRangeKelas.some(k => k.id === t.kelasId)) return false;
                if (t.rombelId) return false;
                return true;
            }

            if (t.kelasId && (!kelas || t.kelasId !== kelas.id)) return false;
            if (t.rombelId && (!rombel || t.rombelId !== rombel.id)) return false;
            return true;
        });
    }, [templates, genJenjangId, genKelasId, genRombelId, targetMode, selectedRangeKelas, settings.rombel, settings.kelas]);

    useEffect(() => {
        if (genJenjangId) {
            if (genTemplateId && !filteredTemplates.find(t => t.id === genTemplateId)) {
                setGenTemplateId('');
            }
            if (filteredTemplates.length === 1 && genTemplateId !== filteredTemplates[0].id) {
                setGenTemplateId(filteredTemplates[0].id);
            }
        }
    }, [genJenjangId, filteredTemplates, genTemplateId]);

    useEffect(() => {
        if (!genTahunAjaran.trim()) {
            setGenTahunAjaran(defaultAcademicYear);
        }
    }, [genTahunAjaran, defaultAcademicYear]);

    const selectedTemplate = useMemo(() => templates.find(t => t.id === genTemplateId), [templates, genTemplateId]);
    const availableSheets = useMemo(() => getTemplateSheets(selectedTemplate), [selectedTemplate]);
    const [genSheetId, setGenSheetId] = useState<string>('all');
    const [previewModalOpen, setPreviewModalOpen] = useState(false);
    const [previewHtml, setPreviewHtml] = useState('');
    const [previewTitle, setPreviewTitle] = useState('Pratinjau Dokumen HTML');

    const activeSantriAll = useMemo(
        () => santriList.filter(s => !s.deleted && (s.status || '').trim().toLowerCase() === 'aktif'),
        [santriList]
    );

    const targetSantriList = useMemo(() => {
        if (targetMode === 'range') {
            if (!genJenjangId || selectedRangeKelas.length === 0) return [];
            const rangeIds = new Set(selectedRangeKelas.map(k => Number(k.id)));
            return activeSantriAll.filter(s => {
                if (s.kelasId && rangeIds.has(Number(s.kelasId))) return true;
                const sRombel = settings.rombel.find(r => Number(r.id) === Number(s.rombelId));
                return sRombel && rangeIds.has(Number(sRombel.kelasId));
            });
        }

        if (genRombelId > 0) {
            return activeSantriAll.filter(s => Number(s.rombelId) === Number(genRombelId));
        }
        if (genKelasId > 0) {
            return activeSantriAll.filter(s => {
                if (Number(s.kelasId) === Number(genKelasId)) return true;
                const sRombel = settings.rombel.find(r => Number(r.id) === Number(s.rombelId));
                return sRombel && Number(sRombel.kelasId) === Number(genKelasId);
            });
        }
        if (genJenjangId > 0) {
            return activeSantriAll.filter(s => {
                if (Number(s.jenjangId) === Number(genJenjangId)) return true;
                const sKelas = settings.kelas.find(k => Number(k.id) === Number(s.kelasId));
                if (sKelas && Number(sKelas.jenjangId) === Number(genJenjangId)) return true;
                const sRombel = settings.rombel.find(r => Number(r.id) === Number(s.rombelId));
                const sRombelKelas = sRombel ? settings.kelas.find(k => Number(k.id) === Number(sRombel.kelasId)) : null;
                return sRombelKelas && Number(sRombelKelas.jenjangId) === Number(genJenjangId);
            });
        }
        return [];
    }, [activeSantriAll, targetMode, selectedRangeKelas, genRombelId, genKelasId, genJenjangId, settings.rombel, settings.kelas]);

    const portalSantriCount = useMemo(() => {
        if (!portalJenjangId) return activeSantriAll.length;
        const kIds = new Set(settings.kelas.filter(k => k.jenjangId === portalJenjangId).map(k => k.id));
        const rIds = new Set(settings.rombel.filter(r => kIds.has(r.kelasId)).map(r => r.id));
        return activeSantriAll.filter(
            s => s.jenjangId === portalJenjangId || kIds.has(s.kelasId) || rIds.has(s.rombelId)
        ).length;
    }, [activeSantriAll, portalJenjangId, settings.kelas, settings.rombel]);

    const portalTemplatesFiltered = useMemo(() => {
        if (!portalJenjangId) return templates;
        return templates.filter(t => !t.jenjangId || t.jenjangId === portalJenjangId);
    }, [templates, portalJenjangId]);

    // --- GENERATE LEDGER HTML ---
    const createGeneratedLedgerHtml = (): string | null => {
        if (targetMode === 'range') {
            if (!genTemplateId || !genJenjangId || selectedRangeKelas.length === 0) {
                showToast('Pilih template, jenjang, dan rentang kelas terlebih dahulu', 'error');
                return null;
            }
        } else {
            if (!genTemplateId || (!genRombelId && !genKelasId && !genJenjangId)) {
                showToast('Pilih template dan target (Jenjang/Kelas/Rombel) terlebih dahulu', 'error');
                return null;
            }
        }
        if (targetSantriList.length === 0) {
            showToast('Tidak ada santri aktif pada target yang dipilih', 'error');
            return null;
        }
        const tpl = templates.find(t => t.id === genTemplateId);
        if (!tpl) return null;

        const rangeLabel =
            targetMode === 'range' && selectedRangeKelas.length > 0
                ? `${selectedRangeKelas[0].nama} s/d ${selectedRangeKelas[selectedRangeKelas.length - 1].nama} (${selectedRangeKelas.length} Tingkat Kelas)`
                : undefined;

        return generateRaporFormHtml(santriList, settings, {
            rombelId: targetMode === 'range' ? 0 : genRombelId,
            kelasId: targetMode === 'range' ? 0 : genKelasId,
            jenjangId: genJenjangId,
            kelasRange:
                targetMode === 'range' && selectedRangeKelas.length > 0
                    ? {
                          fromKelasId: rangeFromKelasId,
                          toKelasId: rangeToKelasId,
                          kelasIds: selectedRangeKelas.map(k => k.id),
                          label: rangeLabel
                      }
                    : undefined,
            semester: genSemester,
            tahunAjaran: genTahunAjaran,
            template: tpl,
            sheetId: genSheetId,
            submissionMethod,
            googleScriptUrl: googleScriptUrl.trim(),
            waDestination: waDestination.trim(),
            rankingScope: genRankingScope,
            tabMode
        });
    };

    const handlePreviewLedger = async () => {
        try {
            const html = createGeneratedLedgerHtml();
            if (!html) return;
            await persistRaporCloudConfig(true);
            setPreviewTitle(`Pratinjau Formulir Ledger — ${selectedTemplate?.name || 'Rapor'}`);
            setPreviewHtml(html);
            setPreviewModalOpen(true);
        } catch (e) {
            showAlert('Gagal Pratinjau', (e as Error).message);
        }
    };

    const handleDownloadLedger = async () => {
        try {
            const html = createGeneratedLedgerHtml();
            if (!html) return;
            await persistRaporCloudConfig(true);

            const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;

            const targetJenjang =
                genJenjangId > 0 ? settings.jenjang.find(j => j.id === genJenjangId)?.nama : 'semua-marhalah';
            let targetKelas = '';
            let targetRombel = '';

            if (targetMode === 'range') {
                targetKelas =
                    selectedRangeKelas.length > 0
                        ? `rentang-${selectedRangeKelas[0].nama}-sd-${selectedRangeKelas[selectedRangeKelas.length - 1].nama}`
                        : 'rentang-kelas';
                targetRombel = 'semua-rombel';
            } else {
                targetKelas = genKelasId > 0 ? settings.kelas.find(k => k.id === genKelasId)?.nama || '' : '';
                targetRombel =
                    genRombelId > 0
                        ? settings.rombel.find(r => r.id === genRombelId)?.nama || ''
                        : genKelasId > 0
                        ? 'semua-rombel-kelas'
                        : 'semua-rombel-jenjang';
            }

            const filename = buildStandardExportFileName(
                'form-nilai',
                [targetJenjang, targetKelas, targetRombel, genSemester, genTahunAjaran].filter(Boolean)
            );
            a.download = `${filename}.html`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            showToast(`Formulir Ledger berhasil diunduh (${targetSantriList.length} santri aktif).`, 'success');
        } catch (e) {
            showAlert('Gagal Generate', (e as Error).message);
        }
    };

    // --- GENERATE PORTAL AUDIT & REKAP LEGER HTML ---
    const createGeneratedAuditPortalHtml = async (): Promise<string | null> => {
        if (templates.length === 0) {
            showToast('Buat minimal 1 Template Rapor terlebih dahulu di tab Desain.', 'error');
            return null;
        }
        if (portalSantriCount === 0) {
            showToast('Tidak ada santri aktif pada cakupan yang dipilih.', 'error');
            return null;
        }
        if (!googleScriptUrl.trim() && !portalIncludeSnapshot) {
            showToast('Masukkan URL Google Apps Script atau aktifkan Snapshot Data Lokal.', 'error');
            return null;
        }

        setIsBuildingPortal(true);
        try {
            const localRecords = portalIncludeSnapshot ? await db.raporRecords.toArray() : [];
            return generateRaporAuditPortalHtml({
                settings,
                santriList,
                localRecords,
                googleScriptUrl: googleScriptUrl.trim(),
                defaultTahunAjaran: genTahunAjaran || defaultAcademicYear,
                defaultSemester: genSemester,
                filterJenjangId: portalJenjangId,
                filterTemplateId: portalTemplateId,
                includeLocalSnapshot: portalIncludeSnapshot
            });
        } finally {
            setIsBuildingPortal(false);
        }
    };

    const handlePreviewAuditPortal = async () => {
        try {
            const html = await createGeneratedAuditPortalHtml();
            if (!html) return;
            await persistRaporCloudConfig(true);
            setPreviewTitle('Pratinjau Portal Audit & Rekap Leger (Tanpa Login)');
            setPreviewHtml(html);
            setPreviewModalOpen(true);
        } catch (e) {
            showAlert('Gagal Membuka Pratinjau Portal', (e as Error).message);
        }
    };

    const handleDownloadAuditPortal = async () => {
        try {
            const html = await createGeneratedAuditPortalHtml();
            if (!html) return;
            await persistRaporCloudConfig(true);

            const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;

            const jenjangLabel =
                portalJenjangId > 0
                    ? settings.jenjang.find(j => j.id === portalJenjangId)?.nama || 'marhalah'
                    : 'semua-marhalah';
            const filename = buildStandardExportFileName(
                'portal-audit-leger',
                [jenjangLabel, genSemester, genTahunAjaran].filter(Boolean)
            );
            a.download = `${filename}.html`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            showToast('File Portal Audit & Rekap Leger (.html) berhasil diunduh.', 'success');
        } catch (e) {
            showAlert('Gagal Generate Portal Audit', (e as Error).message);
        }
    };

    return (
        <div className="space-y-5 animate-fade-in min-w-0">
            {/* TOP MODE SWITCHER: Ledger Input Guru vs Portal Audit & Rekap Leger Tanpa Login */}
            <div className="bg-slate-900 text-white p-4 sm:p-5 rounded-2xl border border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4 min-w-0 overflow-hidden">
                <div className="space-y-1 min-w-0">
                    <div className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-teal-300">
                        <i className="bi bi-hdd-network-fill shrink-0"></i>
                        <span className="truncate">Ekosistem 1 Link GAS Terpadu (Konsep Multi-Tab seperti PSB)</span>
                    </div>
                    <h3 className="text-base sm:text-lg font-black text-white">
                        Generator File Mandiri HTML: Input Ledger Guru &amp; Portal Audit Pengurus
                    </h3>
                    <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                        Cukup pasang <strong>1 Link Google Apps Script</strong> sekali untuk seluruh Rombel &amp; Template Rapor. Kiriman guru otomatis dipisah ke <strong>Tab Baru</strong> dan digabung per santri, serta dapat dipantau live lewat file <strong>Portal Audit Tanpa Login</strong>.
                    </p>
                </div>

                <div className="flex bg-slate-800 p-1 rounded-xl border border-slate-700 w-full lg:w-auto max-w-full overflow-x-auto no-scrollbar touch-pan-x">
                    <button
                        type="button"
                        onClick={() => setGeneratorMode('ledger')}
                        className={`grow lg:grow-0 px-3.5 py-2.5 rounded-lg text-xs font-bold whitespace-nowrap shrink-0 flex items-center justify-center gap-2 transition-all ${
                            generatorMode === 'ledger'
                                ? 'bg-teal-500 text-slate-950 shadow-sm'
                                : 'text-slate-300 hover:text-white'
                        }`}
                    >
                        <i className="bi bi-pencil-square shrink-0"></i>
                        <span>1. Form Input / Ledger Guru (.html)</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setGeneratorMode('audit_portal')}
                        className={`grow lg:grow-0 px-3.5 py-2.5 rounded-lg text-xs font-bold whitespace-nowrap shrink-0 flex items-center justify-center gap-2 transition-all ${
                            generatorMode === 'audit_portal'
                                ? 'bg-teal-500 text-slate-950 shadow-sm'
                                : 'text-slate-300 hover:text-white'
                        }`}
                    >
                        <i className="bi bi-clipboard2-data-fill shrink-0"></i>
                        <span>2. Portal Audit &amp; Leger Tanpa Login (.html)</span>
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 min-w-0">
                {/* LEFT COLUMN: Mode-Specific Target Configuration */}
                <div className="space-y-5 min-w-0">
                    {generatorMode === 'ledger' ? (
                        <>
                            {/* STEP 1: Pilih Template Rapor */}
                            <div className="bg-teal-50/70 border border-teal-200 p-4 sm:p-5 rounded-xl flex gap-3.5 items-start shadow-2xs min-w-0 overflow-hidden">
                                <div className="bg-teal-600 text-white w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm shrink-0">
                                    1
                                </div>
                                <div className="flex-grow space-y-3 min-w-0">
                                    <div>
                                        <h4 className="font-bold text-teal-950 text-sm sm:text-base mb-0.5">
                                            Pilih Template Rapor
                                        </h4>
                                        <p className="text-xs text-teal-700 mb-2">
                                            Pilih desain grid (Reguler, Diniyah, Hadits/Mutun, atau Tahfizh) yang akan diisi guru.
                                        </p>
                                        <select
                                            value={genTemplateId}
                                            onChange={e => {
                                                setGenTemplateId(e.target.value);
                                                setGenSheetId('all');
                                            }}
                                            className="w-full border border-teal-300 rounded-lg p-2.5 text-sm bg-white focus:ring-2 focus:ring-teal-500 outline-none"
                                        >
                                            <option value="">-- Pilih Template --</option>
                                            {filteredTemplates.map(t => (
                                                <option key={t.id} value={t.id}>
                                                    {t.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {availableSheets.length > 1 && (
                                        <div className="bg-white p-3 rounded-lg border border-teal-200">
                                            <label className="block text-xs font-bold text-teal-900 mb-1 flex items-center justify-between">
                                                <span>
                                                    <i className="bi bi-layers-fill text-teal-600 mr-1"></i> Lembar Kerja (Sheets) yang Disertakan:
                                                </span>
                                                <span className="text-[10px] text-teal-700 font-normal">
                                                    {availableSheets.length} Lembar Tersedia
                                                </span>
                                            </label>
                                            <select
                                                value={genSheetId}
                                                onChange={e => setGenSheetId(e.target.value)}
                                                className="w-full border border-teal-300 rounded-lg p-2 text-xs font-semibold bg-white focus:ring-2 focus:ring-teal-500 outline-none"
                                            >
                                                <option value="all">Semua Lembar (Multi-Sheet Gabungan)</option>
                                                {availableSheets.map(s => (
                                                    <option key={s.id} value={s.id}>
                                                        Khusus Lembar: {s.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* STEP 2: Target Kelas & Periode */}
                            <div className="bg-white border border-slate-200 p-4 sm:p-5 rounded-xl shadow-2xs min-w-0 overflow-hidden">
                                <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3 mb-4 min-w-0">
                                    <span className="bg-blue-600 text-white w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs shrink-0">
                                        2
                                    </span>
                                    <div className="min-w-0">
                                        <h4 className="font-bold text-slate-800 text-sm">Target Kelas &amp; Periode Penilaian</h4>
                                        <p className="text-[11px] text-slate-500">
                                            Bisa per Rombel maupun 1 file gabungan se-Jenjang (otomatis dipecah ke tab masing-masing Rombel di G-Sheet).
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-1.5 mb-4 bg-slate-100 p-1 rounded-xl border border-slate-200 w-full max-w-full overflow-x-auto no-scrollbar touch-pan-x">
                                    <button
                                        type="button"
                                        onClick={() => setTargetMode('single')}
                                        className={`grow shrink-0 py-2 px-3.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${
                                            targetMode === 'single'
                                                ? 'bg-white text-blue-700 shadow-2xs border border-slate-200/80'
                                                : 'text-slate-600 hover:text-slate-900'
                                        }`}
                                    >
                                        <i className="bi bi-ui-checks-grid shrink-0"></i>
                                        <span>Kelas / Rombel Tunggal</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setTargetMode('range')}
                                        className={`grow shrink-0 py-2 px-3.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${
                                            targetMode === 'range'
                                                ? 'bg-white text-indigo-700 shadow-2xs border border-slate-200/80'
                                                : 'text-slate-600 hover:text-slate-900'
                                        }`}
                                    >
                                        <i className="bi bi-arrows-expand shrink-0"></i>
                                        <span>Rentang Kelas (Multi-Tingkat)</span>
                                    </button>
                                </div>

                                {targetMode === 'single' ? (
                                    <>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                                            <div>
                                                <label className="block text-xs font-bold text-slate-600 mb-1">Jenjang</label>
                                                <select
                                                    value={genJenjangId}
                                                    onChange={e => {
                                                        setGenJenjangId(Number(e.target.value));
                                                        setGenKelasId(0);
                                                        setGenRombelId(0);
                                                    }}
                                                    className="w-full border border-slate-300 rounded-lg p-2 text-sm bg-slate-50 focus:bg-white transition-colors outline-none"
                                                >
                                                    <option value={0}>Pilih...</option>
                                                    {settings.jenjang.map(j => (
                                                        <option key={j.id} value={j.id}>
                                                            {j.nama}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-600 mb-1">Kelas</label>
                                                <select
                                                    value={genKelasId}
                                                    onChange={e => {
                                                        setGenKelasId(Number(e.target.value));
                                                        setGenRombelId(0);
                                                    }}
                                                    disabled={!genJenjangId}
                                                    className="w-full border border-slate-300 rounded-lg p-2 text-sm disabled:bg-slate-100 bg-slate-50 focus:bg-white transition-colors outline-none"
                                                >
                                                    <option value={0}>Semua Kelas</option>
                                                    {availableKelas.map(k => (
                                                        <option key={k.id} value={k.id}>
                                                            {k.nama}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-600 mb-1">Rombel</label>
                                                <select
                                                    value={genRombelId}
                                                    onChange={e => setGenRombelId(Number(e.target.value))}
                                                    disabled={!genJenjangId}
                                                    className="w-full border border-slate-300 rounded-lg p-2 text-sm disabled:bg-slate-100 bg-slate-50 focus:bg-white transition-colors outline-none"
                                                >
                                                    <option value={0}>-- Semua Rombel (1 File) --</option>
                                                    {availableRombel.map(r => (
                                                        <option key={r.id} value={r.id}>
                                                            {r.nama}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <div className="space-y-3">
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                                            <div>
                                                <label className="block text-xs font-bold text-indigo-900 mb-1">1. Jenjang (Marhalah)</label>
                                                <select
                                                    value={genJenjangId}
                                                    onChange={e => {
                                                        setGenJenjangId(Number(e.target.value));
                                                        setGenKelasId(0);
                                                        setGenRombelId(0);
                                                    }}
                                                    className="w-full border border-indigo-200 rounded-lg p-2 text-sm bg-white focus:border-indigo-500 outline-none"
                                                >
                                                    <option value={0}>Pilih Jenjang...</option>
                                                    {settings.jenjang.map(j => (
                                                        <option key={j.id} value={j.id}>
                                                            {j.nama}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-indigo-900 mb-1">2. Dari Kelas</label>
                                                <select
                                                    value={rangeFromKelasId}
                                                    onChange={e => setRangeFromKelasId(Number(e.target.value))}
                                                    disabled={!genJenjangId || availableKelas.length === 0}
                                                    className="w-full border border-indigo-200 rounded-lg p-2 text-sm disabled:bg-slate-100 bg-white focus:border-indigo-500 outline-none"
                                                >
                                                    {availableKelas.map(k => (
                                                        <option key={k.id} value={k.id}>
                                                            {k.nama}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-indigo-900 mb-1">3. Sampai Kelas</label>
                                                <select
                                                    value={rangeToKelasId}
                                                    onChange={e => setRangeToKelasId(Number(e.target.value))}
                                                    disabled={!genJenjangId || availableKelas.length === 0}
                                                    className="w-full border border-indigo-200 rounded-lg p-2 text-sm disabled:bg-slate-100 bg-white focus:border-indigo-500 outline-none"
                                                >
                                                    {availableKelas.map(k => (
                                                        <option key={k.id} value={k.id}>
                                                            {k.nama}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>

                                        {genJenjangId > 0 && selectedRangeKelas.length > 0 && (
                                            <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl text-xs text-indigo-900">
                                                <strong>{selectedRangeKelas.length} Tingkat Kelas Terpilih:</strong>{' '}
                                                {selectedRangeKelas.map(k => k.nama).join(', ')}
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-3.5 mt-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 mb-1">Tahun Ajaran</label>
                                        <select
                                            value={genTahunAjaran}
                                            onChange={e => setGenTahunAjaran(e.target.value)}
                                            className="w-full border border-slate-300 rounded-lg p-2 text-sm bg-white outline-none"
                                        >
                                            {availableAcademicYears.map(year => (
                                                <option key={year} value={year}>
                                                    {year}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 mb-1">Semester</label>
                                        <select
                                            value={genSemester}
                                            onChange={e => setGenSemester(e.target.value as 'Ganjil' | 'Genap')}
                                            className="w-full border border-slate-300 rounded-lg p-2 text-sm bg-white outline-none"
                                        >
                                            <option value="Ganjil">Ganjil</option>
                                            <option value="Genap">Genap</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="mt-4 pt-3 border-t border-slate-100">
                                    <label className="block text-xs font-bold text-slate-700 mb-1">
                                        <i className="bi bi-trophy-fill text-amber-500 mr-1"></i> Cakupan Perhitungan Ranking (Rumus RANK):
                                    </label>
                                    <select
                                        value={genRankingScope}
                                        onChange={e => setGenRankingScope(e.target.value as 'rombel' | 'kelas' | 'jenjang' | 'global')}
                                        className="w-full border border-slate-300 bg-slate-50 rounded-lg p-2 text-xs font-semibold text-slate-800 outline-none"
                                    >
                                        <option value="rombel">Per Rombel (Juara dihitung terpisah tiap rombel)</option>
                                        <option value="kelas">Per Tingkat Kelas (Paralel dalam 1 tingkat)</option>
                                        <option value="jenjang">Per Jenjang / Marhalah</option>
                                        <option value="global">Global (Seluruh santri dalam file)</option>
                                    </select>
                                </div>

                                {/* LIVE SANTRI COUNT PREVIEW */}
                                <div
                                    className={`mt-4 p-3.5 rounded-xl border ${
                                        targetSantriList.length > 0
                                            ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                                            : 'bg-amber-50/70 border-amber-200 text-amber-900'
                                    }`}
                                >
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                            <i
                                                className={`bi ${
                                                    targetSantriList.length > 0
                                                        ? 'bi-check-circle-fill text-emerald-600'
                                                        : 'bi-exclamation-triangle-fill text-amber-600'
                                                } text-base`}
                                            ></i>
                                            <div>
                                                <span className="text-xs font-bold block tabular-nums">
                                                    Target Santri: <span className="underline font-black">{targetSantriList.length} Santri Aktif</span>
                                                </span>
                                                <span className="text-[11px] opacity-80">
                                                    {genRombelId > 0
                                                        ? `Rombel: ${settings.rombel.find(r => r.id === genRombelId)?.nama || ''}`
                                                        : genKelasId > 0
                                                        ? `Kelas: ${settings.kelas.find(k => k.id === genKelasId)?.nama || ''} (Semua Rombel)`
                                                        : genJenjangId > 0
                                                        ? `Jenjang: ${settings.jenjang.find(j => j.id === genJenjangId)?.nama || ''}`
                                                        : 'Pilih Jenjang / Kelas / Rombel di atas'}
                                                </span>
                                            </div>
                                        </div>
                                        {targetSantriList.length > 0 && (
                                            <span className="px-2.5 py-1 bg-white border border-emerald-200 rounded-lg text-xs font-bold tabular-nums shrink-0">
                                                {targetSantriList.length} Santri
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                        /* MODE 2: PORTAL AUDIT & REKAP LEGER TANPA LOGIN */
                        <div className="bg-white border border-slate-200 p-4 sm:p-5 rounded-xl shadow-2xs space-y-4 min-w-0 overflow-hidden">
                            <div className="flex items-start gap-3 border-b border-slate-100 pb-3.5 min-w-0">
                                <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center shrink-0">
                                    <i className="bi bi-clipboard2-data-fill text-xl"></i>
                                </div>
                                <div className="min-w-0">
                                    <h4 className="font-black text-slate-900 text-base">
                                        Portal Audit Nilai &amp; Rekap Leger Mandiri (Tanpa Login)
                                    </h4>
                                    <p className="text-xs text-slate-600 leading-relaxed mt-0.5">
                                        Menghasilkan <strong>1 file HTML ringan</strong> (seperti konsep Portal Santri) untuk Kepala Madrasah, Pengurus Pondok, Kurikulum, atau Dewan Guru yang <strong>tidak memiliki akses login ke aplikasi utama</strong>.
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">
                                        Cakupan Jenjang / Marhalah
                                    </label>
                                    <select
                                        value={portalJenjangId}
                                        onChange={e => {
                                            setPortalJenjangId(Number(e.target.value));
                                            setPortalTemplateId('');
                                        }}
                                        className="w-full border border-slate-300 rounded-lg p-2.5 text-xs font-semibold bg-white outline-none focus:border-teal-600"
                                    >
                                        <option value={0}>Seluruh Jenjang Pondok ({settings.jenjang.length} Jenjang)</option>
                                        {settings.jenjang.map(j => (
                                            <option key={j.id} value={j.id}>
                                                Khusus Marhalah: {j.nama}
                                            </option>
                                        ))}
                                    </select>
                                    <p className="text-[10px] text-slate-500 mt-1">
                                        Bisa dibuat 1 Portal untuk seluruh pondok atau khusus per Mudir Marhalah.
                                    </p>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">
                                        Cakupan Template Rapor
                                    </label>
                                    <select
                                        value={portalTemplateId}
                                        onChange={e => setPortalTemplateId(e.target.value)}
                                        className="w-full border border-slate-300 rounded-lg p-2.5 text-xs font-semibold bg-white outline-none focus:border-teal-600"
                                    >
                                        <option value="">Semua Template ({portalTemplatesFiltered.length} Template)</option>
                                        {portalTemplatesFiltered.map(t => (
                                            <option key={t.id} value={t.id}>
                                                Khusus: {t.name}
                                            </option>
                                        ))}
                                    </select>
                                    <p className="text-[10px] text-slate-500 mt-1">
                                        Mendukung Rapor Reguler, Diniyah, maupun Hafalan Hadits/Mutun.
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3.5">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Periode Awal: Tahun Ajaran</label>
                                    <select
                                        value={genTahunAjaran}
                                        onChange={e => setGenTahunAjaran(e.target.value)}
                                        className="w-full border border-slate-300 rounded-lg p-2 text-xs font-semibold bg-white outline-none"
                                    >
                                        {availableAcademicYears.map(year => (
                                            <option key={year} value={year}>
                                                {year}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Periode Awal: Semester</label>
                                    <select
                                        value={genSemester}
                                        onChange={e => setGenSemester(e.target.value as 'Ganjil' | 'Genap')}
                                        className="w-full border border-slate-300 rounded-lg p-2 text-xs font-semibold bg-white outline-none"
                                    >
                                        <option value="Ganjil">Ganjil</option>
                                        <option value="Genap">Genap</option>
                                    </select>
                                </div>
                            </div>

                            <label className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={portalIncludeSnapshot}
                                    onChange={e => setPortalIncludeSnapshot(e.target.checked)}
                                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                                />
                                <div className="text-xs">
                                    <span className="font-bold text-slate-800 block">
                                        Sertakan Snapshot Nilai Lokal Aplikasi saat Ini (Rekomendasi)
                                    </span>
                                    <span className="text-slate-500 leading-relaxed">
                                        Nilai yang sudah diinput Wali Kelas di aplikasi utama ikut terbawa sebagai data dasar, lalu otomatis digabung (Smart Merge) dengan kiriman terbaru guru dari Link GAS saat portal dibuka online.
                                    </span>
                                </div>
                            </label>

                            <div className="p-3.5 rounded-xl bg-teal-50/70 border border-teal-200 space-y-2 text-xs text-teal-950">
                                <div className="font-bold flex items-center justify-between">
                                    <span>Isi Paket Portal Audit (.html):</span>
                                    <span className="tabular-nums font-black text-teal-800">{portalSantriCount} Santri Aktif</span>
                                </div>
                                <ul className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] text-teal-900 pt-1">
                                    <li className="bg-white/80 p-2 rounded-lg border border-teal-200/80">
                                        <strong>1. Progres Rombel:</strong> Persentase ketuntasan tiap kelas &amp; wali kelas.
                                    </li>
                                    <li className="bg-white/80 p-2 rounded-lg border border-teal-200/80">
                                        <strong>2. Audit Mapel:</strong> Cek guru/mapel mana yang belum menyetor nilai.
                                    </li>
                                    <li className="bg-white/80 p-2 rounded-lg border border-teal-200/80">
                                        <strong>3. Rekap Leger:</strong> Hitung otomatis rumus Jumlah, Rerata, KKM, Ranking + Ekspor Excel/PDF.
                                    </li>
                                </ul>
                            </div>
                        </div>
                    )}
                </div>

                {/* RIGHT COLUMN: Shared 1-GAS Configuration & Generate Actions */}
                <div className="space-y-5 min-w-0">
                    <div className="bg-white border border-slate-200 p-4 sm:p-5 rounded-xl shadow-2xs space-y-4 min-w-0 overflow-hidden">
                        <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3 min-w-0">
                            <div className="min-w-0">
                                <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                                    <i className="bi bi-cloud-check-fill text-teal-600 text-base shrink-0"></i>
                                    <span>Konfigurasi 1 Link GAS Terpadu (Sumber Data Bersama)</span>
                                </h4>
                                <p className="text-[11px] text-slate-500 mt-0.5">
                                    Link Google Apps Script yang sama dipakai oleh seluruh Formulir Ledger Guru, Portal Audit Pengurus, dan Impor Cloud.
                                </p>
                            </div>
                            {savedCloudCfg?.googleScriptUrl && !hasUnsavedCloudChanges && (
                                <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold whitespace-nowrap shrink-0">
                                    Tersimpan Default
                                </span>
                            )}
                        </div>

                        {generatorMode === 'ledger' && (
                            <div className="space-y-2 min-w-0">
                                <label className="block text-xs font-bold text-slate-700">Metode Pengiriman Nilai dari Guru</label>
                                <div className="flex items-center gap-2 w-full max-w-full overflow-x-auto no-scrollbar touch-pan-x pb-0.5">
                                    <button
                                        type="button"
                                        onClick={() => setSubmissionMethod('whatsapp')}
                                        className={`grow shrink-0 py-2 px-3 rounded-lg border text-xs font-bold flex items-center justify-center gap-1.5 whitespace-nowrap transition-all ${
                                            submissionMethod === 'whatsapp'
                                                ? 'bg-emerald-50 border-emerald-500 text-emerald-800 ring-1 ring-emerald-500'
                                                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                        }`}
                                    >
                                        <i className="bi bi-whatsapp shrink-0"></i> WhatsApp
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setSubmissionMethod('google_sheet')}
                                        className={`grow shrink-0 py-2 px-3 rounded-lg border text-xs font-bold flex items-center justify-center gap-1.5 whitespace-nowrap transition-all ${
                                            submissionMethod === 'google_sheet'
                                                ? 'bg-blue-50 border-blue-500 text-blue-800 ring-1 ring-blue-500'
                                                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                        }`}
                                    >
                                        <i className="bi bi-file-earmark-spreadsheet shrink-0"></i> G-Sheet
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setSubmissionMethod('hybrid')}
                                        className={`grow shrink-0 py-2 px-3 rounded-lg border text-xs font-bold flex items-center justify-center gap-1.5 whitespace-nowrap transition-all ${
                                            submissionMethod === 'hybrid'
                                                ? 'bg-teal-50 border-teal-500 text-teal-800 ring-1 ring-teal-500'
                                                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                        }`}
                                    >
                                        <i className="bi bi-hdd-network shrink-0"></i> Hybrid
                                    </button>
                                </div>
                            </div>
                        )}

                        {generatorMode === 'ledger' && (submissionMethod === 'whatsapp' || submissionMethod === 'hybrid') && (
                            <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-xl">
                                <label className="block text-xs font-bold text-emerald-900 mb-1">
                                    Nomor WA Admin / Kurikulum (Opsional)
                                </label>
                                <input
                                    type="text"
                                    value={waDestination}
                                    onChange={e => setWaDestination(e.target.value)}
                                    placeholder="628xxxxxxxxxx (kosongkan agar guru memilih kontak)"
                                    className="w-full border border-emerald-300 bg-white rounded-lg p-2 text-xs font-mono outline-none focus:border-emerald-600"
                                />
                            </div>
                        )}

                        {(generatorMode === 'audit_portal' || submissionMethod === 'google_sheet' || submissionMethod === 'hybrid') && (
                            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                                <div>
                                    <label className="block text-xs font-bold text-slate-800 mb-1">
                                        URL Web App Google Apps Script (1 Link untuk Semua)
                                    </label>
                                    <div className="flex gap-2 min-w-0">
                                        <input
                                            type="text"
                                            value={googleScriptUrl}
                                            onChange={e => setGoogleScriptUrl(e.target.value)}
                                            placeholder="https://script.google.com/macros/s/.../exec"
                                            className="flex-grow min-w-0 border border-slate-300 bg-white rounded-lg p-2 text-xs font-mono outline-none focus:border-teal-600"
                                        />
                                        <button
                                            type="button"
                                            onClick={async () => {
                                                if (!googleScriptUrl.trim()) {
                                                    return showToast('Masukkan URL Web App terlebih dahulu', 'error');
                                                }
                                                try {
                                                    const res = await fetch(googleScriptUrl.trim(), { method: 'GET' });
                                                    if (!res.ok) throw new Error(`HTTP ${res.status}`);
                                                    const json = await res.json();
                                                    const count = Array.isArray(json) ? json.length : 0;
                                                    showToast(
                                                        `Koneksi GAS Aktif! Terbaca ${count} baris nilai di Spreadsheet.`,
                                                        'success'
                                                    );
                                                } catch {
                                                    showToast(
                                                        'URL belum merespons JSON. Pastikan Deploy > Web App > Access: Anyone.',
                                                        'error'
                                                    );
                                                }
                                            }}
                                            className="bg-slate-800 hover:bg-slate-900 text-white px-3 rounded-lg text-xs font-bold whitespace-nowrap shrink-0"
                                        >
                                            Tes Link
                                        </button>
                                    </div>
                                </div>

                                {generatorMode === 'ledger' && (
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1">
                                            Pengelompokan Tab Otomatis di Spreadsheet (Metode Tab Baru):
                                        </label>
                                        <select
                                            value={tabMode}
                                            onChange={e => setTabMode(e.target.value as 'per_rombel' | 'per_jenjang' | 'per_file')}
                                            className="w-full border border-slate-300 bg-white rounded-lg p-2 text-xs font-semibold text-slate-800 outline-none"
                                        >
                                            <option value="per_rombel">
                                                Otomatis Tab Baru per Rombel &amp; Template (Rekomendasi seperti PSB)
                                            </option>
                                            <option value="per_jenjang">
                                                Otomatis Tab Baru per Jenjang / Marhalah &amp; Template
                                            </option>
                                            <option value="per_file">
                                                1 Tab Sesuai Nama File Formulir yang Di-generate
                                            </option>
                                        </select>
                                        <p className="text-[10px] text-slate-500 mt-1">
                                            Contoh nama tab otomatis: <code>(25-26 Ganjil) VII-A - Rapor Diniyah</code>. Kiriman beberapa guru mapel pada rombel yang sama otomatis digabung (Smart Merge) di 1 baris santri.
                                        </p>
                                    </div>
                                )}

                                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                                    <button
                                        type="button"
                                        onClick={() => setShowScriptHelper(!showScriptHelper)}
                                        className="text-xs font-bold text-teal-700 hover:text-teal-900 flex items-center gap-1"
                                    >
                                        <i className={`bi ${showScriptHelper ? 'bi-chevron-up' : 'bi-code-slash'}`}></i>
                                        <span>
                                            {showScriptHelper
                                                ? 'Sembunyikan Kode Apps Script v3.0'
                                                : 'Salin Kode Google Apps Script Terpadu v3.0 (Multi-Tab)'}
                                        </span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => persistRaporCloudConfig(false)}
                                        disabled={isSavingConfig || !hasUnsavedCloudChanges}
                                        className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 disabled:bg-slate-200 disabled:text-slate-500 text-white text-xs font-bold whitespace-nowrap transition-colors"
                                    >
                                        <i className="bi bi-floppy-fill mr-1"></i>
                                        Simpan Default Pondok
                                    </button>
                                </div>

                                {showScriptHelper && (
                                    <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-2 text-xs text-slate-700">
                                        <div className="font-bold text-slate-900">
                                            Setup Cukup 1x untuk Seluruh Rombel, Template &amp; Portal Audit:
                                        </div>
                                        <ol className="list-decimal pl-4 space-y-1 text-[11px] text-slate-600">
                                            <li>Buka 1 <strong>Google Spreadsheet</strong> khusus Rapor Pondok &gt; klik <strong>Extensions &gt; Apps Script</strong>.</li>
                                            <li>Hapus kode lama, lalu <strong>Salin &amp; Tempel</strong> kode v3.0 di bawah ini.</li>
                                            <li>Klik <strong>Deploy &gt; New Deployment</strong> (atau <em>Manage Deployments &gt; Edit &gt; New Version</em> jika memperbarui script lama).</li>
                                            <li>Pilih type <strong>Web App</strong>, Execute as: <strong>Me</strong>, Who has access: <strong>Anyone</strong>, lalu tempel URL-nya di kolom atas dan klik <strong>Simpan Default Pondok</strong>.</li>
                                        </ol>
                                        <div className="relative">
                                            <textarea
                                                readOnly
                                                className="w-full h-36 text-[10px] font-mono border border-slate-200 rounded-lg p-2.5 bg-slate-900 text-teal-300"
                                                value={RAPOR_UNIFIED_GAS_SCRIPT_V3}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    navigator.clipboard.writeText(RAPOR_UNIFIED_GAS_SCRIPT_V3);
                                                    showToast('Kode Google Apps Script Terpadu v3.0 berhasil disalin!', 'success');
                                                }}
                                                className="absolute top-2 right-2 bg-teal-600 hover:bg-teal-500 text-white px-2.5 py-1 rounded-md text-[11px] font-bold flex items-center gap-1 shadow-sm"
                                            >
                                                <i className="bi bi-clipboard-check"></i> Salin Script v3.0
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* ACTION CARD */}
                    {generatorMode === 'ledger' ? (
                        <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-2xs space-y-3 min-w-0 overflow-hidden">
                            <div className="flex flex-col sm:flex-row gap-3 min-w-0">
                                <button
                                    type="button"
                                    onClick={handlePreviewLedger}
                                    disabled={!genTemplateId || !genJenjangId}
                                    className="flex-1 min-w-0 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 py-3 px-4 rounded-xl font-bold text-xs transition-all disabled:opacity-40 flex items-center justify-center gap-2 whitespace-nowrap"
                                >
                                    <i className="bi bi-eye-fill text-sm shrink-0"></i>
                                    <span className="truncate">Pratinjau Formulir Ledger</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={handleDownloadLedger}
                                    disabled={!genTemplateId || !genJenjangId}
                                    className="flex-1 min-w-0 bg-teal-600 hover:bg-teal-700 text-white py-3 px-4 rounded-xl font-black text-xs shadow-sm transition-all disabled:opacity-40 flex items-center justify-center gap-2 whitespace-nowrap"
                                >
                                    <i className="bi bi-cloud-download-fill text-sm shrink-0"></i>
                                    <span className="truncate">Download Formulir (.html)</span>
                                </button>
                            </div>
                            <p className="text-[11px] text-slate-500 leading-relaxed">
                                Dilengkapi tombol <strong>Muat Cloud</strong> di dalam formulir agar guru/wali kelas juga dapat menarik nilai yang sudah masuk sebelumnya dari Link GAS yang sama.
                            </p>
                        </div>
                    ) : (
                        <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-2xs space-y-3 min-w-0 overflow-hidden">
                            <div className="flex flex-col sm:flex-row gap-3 min-w-0">
                                <button
                                    type="button"
                                    onClick={handlePreviewAuditPortal}
                                    disabled={isBuildingPortal || templates.length === 0}
                                    className="flex-1 min-w-0 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 py-3 px-4 rounded-xl font-bold text-xs transition-all disabled:opacity-40 flex items-center justify-center gap-2 whitespace-nowrap"
                                >
                                    <i className="bi bi-eye-fill text-sm shrink-0"></i>
                                    <span className="truncate">Pratinjau Portal Audit</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={handleDownloadAuditPortal}
                                    disabled={isBuildingPortal || templates.length === 0}
                                    className="flex-1 min-w-0 bg-teal-600 hover:bg-teal-700 text-white py-3 px-4 rounded-xl font-black text-xs shadow-sm transition-all disabled:opacity-40 flex items-center justify-center gap-2 whitespace-nowrap"
                                >
                                    <i className="bi bi-file-earmark-bar-graph-fill text-sm shrink-0"></i>
                                    <span className="truncate">Download Portal Audit &amp; Leger (.html)</span>
                                </button>
                            </div>
                            <p className="text-[11px] text-slate-500 leading-relaxed">
                                Bagikan file <code>.html</code> ini via WhatsApp ke Kepala Madrasah / Pimpinan / Grup Guru, atau unggah ke hosting statis (Cloudflare Pages / GitHub Pages). <strong>Tanpa login</strong>, otomatis membaca data live dari Link GAS yang sama.
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* INTERACTIVE PREVIEW MODAL */}
            {previewModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 md:p-6 animate-fade-in">
                    <div className="bg-white w-full h-full max-w-7xl max-h-[95vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-300">
                        <div className="bg-slate-900 text-white px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 shrink-0">
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="p-2 bg-teal-500/20 text-teal-400 rounded-xl border border-teal-500/30 shrink-0">
                                    <i className="bi bi-window-fullscreen text-lg"></i>
                                </div>
                                <div className="min-w-0">
                                    <h3 className="font-bold text-sm text-white truncate">{previewTitle}</h3>
                                    <p className="text-[11px] text-slate-400">
                                        Tampilan interaktif mandiri persis seperti saat file dibuka di HP/Laptop penerima.
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={
                                        generatorMode === 'ledger'
                                            ? handleDownloadLedger
                                            : handleDownloadAuditPortal
                                    }
                                    className="px-3.5 py-1.5 bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-sm transition-colors whitespace-nowrap"
                                >
                                    <i className="bi bi-download"></i> Unduh File (.html)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPreviewModalOpen(false)}
                                    className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg text-lg transition-colors ml-1"
                                    title="Tutup Pratinjau"
                                >
                                    <i className="bi bi-x-lg"></i>
                                </button>
                            </div>
                        </div>

                        <div className="flex-grow w-full h-full bg-slate-100 relative">
                            <iframe
                                title={previewTitle}
                                srcDoc={previewHtml}
                                className="w-full h-full border-0"
                                sandbox="allow-scripts allow-modals allow-same-origin allow-downloads"
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
