import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAppContext } from '../../AppContext';
import { useSantriContext } from '../../contexts/SantriContext';
import { RaporRecord } from '../../types';
import { db } from '../../db';
import { MobileFilterDrawer } from '../common/MobileFilterDrawer';
import { getAcademicYearOptions, getDefaultAcademicYear } from '../../utils/academicYear';
import { getRaporRecordsByPeriod, getRaporRecordsByPeriodAndRombel } from '../../services/academicQueries';
import { useAcademicRaporYears } from '../../hooks/useAcademicRaporYears';
import {
    exportRaporExcelTemplate,
    PresensiSyncResult,
    getTemplateSheets,
    extractTemplateKeys
} from '../../services/raporExcelService';
import { RaporExcelImportModal } from './RaporExcelImportModal';
import { RaporPresensiSyncModal } from './RaporPresensiSyncModal';
import { RaporWaCloudImportModal } from './RaporWaCloudImportModal';
import { RaporTahfizhSyncModal, TahfizhSyncPayload, StudentTahfizhAggregate } from './RaporTahfizhSyncModal';
import { RaporBulkHelperModal } from './modals/RaporBulkHelperModal';

const NON_SCORE_TOKENS = [
    'SAKIT', 'IZIN', 'ALPHA', 'ALPA', 'ABSEN',
    'CATATAN', 'KEPUTUSAN', 'KELULUSAN', 'KENAIKAN',
    'DESKRIPSI', 'CAPAIAN', 'SIKAP', 'AKHLAK', 'KEPRIBADIAN',
    'EKSTRA', 'JUZ', 'SURAH', 'SETORAN', 'PREDIKAT', 'KETERANGAN'
];

export interface TabInputNilaiWaliProps {
    initialContext?: {
        rombelId?: number;
        santriId?: number;
        tahunAjaran?: string;
        semester?: 'Ganjil' | 'Genap';
        templateId?: string;
    };
    onContextChange?: (ctx: {
        rombelId?: number;
        tahunAjaran?: string;
        semester?: 'Ganjil' | 'Genap';
        templateId?: string;
    }) => void;
}

export const TabInputNilaiWali: React.FC<TabInputNilaiWaliProps> = ({ initialContext, onContextChange }) => {
    const { settings, onUpdateSettings, showToast, currentUser } = useAppContext();
    const { santriList } = useSantriContext();
    const defaultAcademicYear = useMemo(() => getDefaultAcademicYear(settings), [settings]);
    const archiveYears = useAcademicRaporYears();
    const availableAcademicYears = useMemo(() => getAcademicYearOptions(settings, archiveYears), [settings, archiveYears]);

    const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
    const [tahunAjaran, setTahunAjaran] = useState<string>(defaultAcademicYear);
    const [semester, setSemester] = useState<'Ganjil' | 'Genap'>('Ganjil');

    // Quick Search & Completeness Filter for Students
    const [studentSearchQuery, setStudentSearchQuery] = useState('');
    const [studentStatusFilter, setStudentStatusFilter] = useState<'all' | 'incomplete' | 'complete'>('all');

    // Expandable Textarea Popover Modal for Long Text Notes
    const [expandedTextModal, setExpandedTextModal] = useState<{
        studentId: number;
        studentName: string;
        key: string;
        label: string;
        value: string;
    } | null>(null);

    // Modal states for Excel, Attendance Sync, Tahfizh Sync, Bulk Helper, and WA/Cloud Import
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [isWaCloudModalOpen, setIsWaCloudModalOpen] = useState(false);
    const [isPresensiModalOpen, setIsPresensiModalOpen] = useState(false);
    const [isTahfizhModalOpen, setIsTahfizhModalOpen] = useState(false);
    const [isBulkHelperOpen, setIsBulkHelperOpen] = useState(false);
    const [isExportingExcel, setIsExportingExcel] = useState(false);
    const [refreshCounter, setRefreshCounter] = useState(0);

    // Admin Filters
    const [adminJenjangId, setAdminJenjangId] = useState<number>(0);
    const [adminKelasId, setAdminKelasId] = useState<number>(0);

    const canManageAllRombel = currentUser?.role === 'admin' || currentUser?.permissions?.akademik === 'write';
    const [activeRombelId, setActiveRombelId] = useState<number | null>(null);
    const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);

    // Detect assigned Rombel(s) for Wali Kelas
    const myRombels = useMemo(() => {
        if (!currentUser || canManageAllRombel) return [];
        return settings.rombel.filter(
            r => r.waliKelasUserId === currentUser.id || r.waliKelasId === currentUser.id
        );
    }, [currentUser, canManageAllRombel, settings.rombel]);

    const myRombel = useMemo(() => {
        if (myRombels.length === 0) return null;
        return myRombels.find(r => r.id === activeRombelId) || myRombels[0] || null;
    }, [myRombels, activeRombelId]);

    // Sync from initialContext when provided
    useEffect(() => {
        if (!initialContext) return;
        if (initialContext.tahunAjaran && initialContext.tahunAjaran !== tahunAjaran) {
            setTahunAjaran(initialContext.tahunAjaran);
        }
        if (initialContext.semester && initialContext.semester !== semester) {
            setSemester(initialContext.semester);
        }
        if (initialContext.rombelId && initialContext.rombelId !== activeRombelId) {
            const targetRombel = settings.rombel.find(r => r.id === initialContext.rombelId);
            if (targetRombel) {
                const targetKelas = settings.kelas.find(k => k.id === targetRombel.kelasId);
                if (targetKelas) {
                    setAdminJenjangId(targetKelas.jenjangId);
                    setAdminKelasId(targetKelas.id);
                }
                setActiveRombelId(targetRombel.id);
            }
        }
        if (initialContext.santriId) {
            const targetSantri = santriList.find(s => s.id === initialContext.santriId);
            if (targetSantri) {
                setStudentSearchQuery(targetSantri.namaLengkap);
            }
        }
        if (initialContext.templateId && initialContext.templateId !== selectedTemplateId) {
            setSelectedTemplateId(initialContext.templateId);
        }
    }, [initialContext, settings.rombel, settings.kelas, santriList]);

    // Notify parent on context changes
    useEffect(() => {
        if (onContextChange) {
            onContextChange({
                rombelId: activeRombelId || undefined,
                tahunAjaran,
                semester,
                templateId: selectedTemplateId || undefined
            });
        }
    }, [activeRombelId, tahunAjaran, semester, selectedTemplateId]);

    // Derived lists for Admin
    const availableKelas = useMemo(
        () => (adminJenjangId ? settings.kelas.filter(k => k.jenjangId === adminJenjangId) : []),
        [adminJenjangId, settings.kelas]
    );
    const availableRombel = useMemo(
        () => (adminKelasId ? settings.rombel.filter(r => r.kelasId === adminKelasId) : []),
        [adminKelasId, settings.rombel]
    );

    const activeJenjangId = useMemo(() => {
        const rombel = activeRombelId ? settings.rombel.find(r => r.id === activeRombelId) : null;
        const kelas = rombel
            ? settings.kelas.find(k => k.id === rombel.kelasId)
            : adminKelasId
            ? settings.kelas.find(k => k.id === adminKelasId)
            : null;
        return rombel ? kelas?.jenjangId || 0 : adminJenjangId;
    }, [activeRombelId, adminKelasId, adminJenjangId, settings.rombel, settings.kelas]);

    const filteredTemplates = useMemo(() => {
        const rombel = activeRombelId ? settings.rombel.find(r => r.id === activeRombelId) : null;
        const kelas = rombel
            ? settings.kelas.find(k => k.id === rombel.kelasId)
            : adminKelasId
            ? settings.kelas.find(k => k.id === adminKelasId)
            : null;
        const jenjangId = rombel ? kelas?.jenjangId || null : adminJenjangId;

        if (!jenjangId) return settings.raporTemplates || [];

        return (settings.raporTemplates || []).filter(t => {
            if (!t.jenjangId) return true;
            if (t.jenjangId !== jenjangId) return false;
            if (t.kelasId && (!kelas || t.kelasId !== kelas.id)) return false;
            if (t.rombelId && (!rombel || t.rombelId !== rombel.id)) return false;
            return true;
        });
    }, [activeRombelId, adminJenjangId, adminKelasId, settings.rombel, settings.kelas, settings.raporTemplates]);

    useEffect(() => {
        if (activeRombelId || adminJenjangId) {
            if (selectedTemplateId && !filteredTemplates.find(t => t.id === selectedTemplateId)) {
                setSelectedTemplateId('');
            }
            if (filteredTemplates.length === 1 && selectedTemplateId !== filteredTemplates[0].id) {
                setSelectedTemplateId(filteredTemplates[0].id);
            }
        }
    }, [activeRombelId, adminJenjangId, filteredTemplates, selectedTemplateId]);

    useEffect(() => {
        if (myRombel && !activeRombelId) {
            setActiveRombelId(myRombel.id);
        }
    }, [myRombel]);

    useEffect(() => {
        if (!tahunAjaran.trim()) {
            setTahunAjaran(defaultAcademicYear);
        }
    }, [tahunAjaran, defaultAcademicYear]);

    // Rapor Approval & Lock Check (terhubung langsung dengan status di TabCetakRapor)
    const rombelLockKey = `${tahunAjaran}_${semester}_${activeRombelId || 'all'}`;
    const globalLockKey = `${tahunAjaran}_${semester}_all`;
    const isRaporLocked = useMemo(() => {
        const statusMap = settings.raporApprovalStatus || {};
        if (activeRombelId && statusMap[`${tahunAjaran}_${semester}_${activeRombelId}`] === 'locked') {
            return true;
        }
        if (statusMap[globalLockKey] === 'locked') {
            return true;
        }
        return false;
    }, [settings.raporApprovalStatus, tahunAjaran, semester, activeRombelId, globalLockKey]);

    const handleAdminUnlockRapor = async () => {
        if (!canManageAllRombel) return;
        const updatedMap = { ...(settings.raporApprovalStatus || {}) };
        if (activeRombelId && updatedMap[rombelLockKey] === 'locked') {
            updatedMap[rombelLockKey] = 'verified';
        }
        if (updatedMap[globalLockKey] === 'locked') {
            updatedMap[globalLockKey] = 'verified';
        }
        await onUpdateSettings({
            ...settings,
            raporApprovalStatus: updatedMap
        });
        showToast('Kunci rapor dibuka sementara (Status: Terverifikasi). Silakan lakukan revisi nilai.', 'info');
    };

    // Filter active non-deleted students in the active selection
    const studentsInRombel = useMemo(() => {
        let list = santriList.filter(s => !s.deleted && s.status === 'Aktif');

        if (canManageAllRombel) {
            if (adminJenjangId) list = list.filter(s => s.jenjangId === adminJenjangId);
            if (adminKelasId) list = list.filter(s => s.kelasId === adminKelasId);
            if (activeRombelId) list = list.filter(s => s.rombelId === activeRombelId);
        } else {
            if (!activeRombelId) return [];
            list = list.filter(s => s.rombelId === activeRombelId);
        }

        return list.sort((a, b) => {
            if (a.rombelId !== b.rombelId) return a.rombelId - b.rombelId;
            return a.namaLengkap.localeCompare(b.namaLengkap);
        });
    }, [activeRombelId, adminJenjangId, adminKelasId, santriList, canManageAllRombel]);

    // Get template & input keys
    const template = useMemo(() => {
        return (settings.raporTemplates || []).find(t => t.id === selectedTemplateId);
    }, [selectedTemplateId, settings.raporTemplates]);

    const availableSheets = useMemo(() => getTemplateSheets(template), [template]);
    const [activeInputSheetId, setActiveInputSheetId] = useState<string>('all');

    useEffect(() => {
        setActiveInputSheetId('all');
    }, [selectedTemplateId]);

    const inputKeys = useMemo(() => {
        if (!template) return [];
        return extractTemplateKeys(template, activeInputSheetId);
    }, [template, activeInputSheetId]);

    // Metadata KKM & Validasi Angka per Kolom
    const keyValidationMeta = useMemo(() => {
        const meta: Record<string, { isNumericScore: boolean; kkm: number }> = {};
        const mapelPool = (settings.mataPelajaran || []).filter(
            m => !activeJenjangId || m.jenjangId === activeJenjangId
        );
        const norm = (str: string) => str.toUpperCase().replace(/[^A-Z0-9]+/g, '');

        inputKeys.forEach(k => {
            if (k.type === 'dropdown') {
                meta[k.key] = { isNumericScore: false, kkm: 70 };
                return;
            }
            const combinedUpper = `${k.key} ${k.label || ''}`.toUpperCase();
            const isNonScore = NON_SCORE_TOKENS.some(tok => combinedUpper.includes(tok));
            if (isNonScore) {
                meta[k.key] = { isNumericScore: false, kkm: 70 };
                return;
            }

            const nKey = norm(k.key);
            const nLabel = norm(k.label || '');
            const matchedMapel = mapelPool.find(mp => {
                const nKode = mp.kodeMapel ? norm(mp.kodeMapel) : '';
                const nNama = norm(mp.nama);
                return (
                    (nKode && (nKey === nKode || nKey.includes(nKode))) ||
                    (nNama && (nKey === nNama || nLabel === nNama || nLabel.includes(nNama) || nNama.includes(nKey)))
                );
            });

            meta[k.key] = {
                isNumericScore: true,
                kkm: matchedMapel?.kkm ?? 70
            };
        });
        return meta;
    }, [inputKeys, settings.mataPelajaran, activeJenjangId]);

    // State for grades & baseline tracking (Dirty & Local Auto-Draft)
    const [grades, setGrades] = useState<Record<number, Record<string, string>>>({});
    const [savedBaselineJson, setSavedBaselineJson] = useState<string>('{}');
    const [pendingDraft, setPendingDraft] = useState<Record<number, Record<string, string>> | null>(null);
    const [syncedTahfizhMap, setSyncedTahfizhMap] = useState<Record<number, StudentTahfizhAggregate>>({});
    const [, setExistingPeriodRecords] = useState<RaporRecord[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [viewMode, setViewMode] = useState<'table' | 'card'>('table');
    const [activeStudentIndex, setActiveStudentIndex] = useState(0);
    const tableWrapperRef = useRef<HTMLDivElement>(null);

    const draftStorageKey = useMemo(() => {
        if (!tahunAjaran || !semester || !selectedTemplateId) return '';
        const scope = activeRombelId ? `r${activeRombelId}` : `j${adminJenjangId}_k${adminKelasId}`;
        return `rapor_draft_v1_${tahunAjaran}_${semester}_${scope}_${selectedTemplateId}`;
    }, [tahunAjaran, semester, activeRombelId, adminJenjangId, adminKelasId, selectedTemplateId]);

    const isDirty = useMemo(() => {
        if (!selectedTemplateId || studentsInRombel.length === 0) return false;
        return JSON.stringify(grades) !== savedBaselineJson;
    }, [grades, savedBaselineJson, selectedTemplateId, studentsInRombel.length]);

    const isLongTextKey = (key: string, type?: string) => {
        if (type === 'text') return true;
        const upper = key.toUpperCase();
        return (
            upper.includes('CATATAN') ||
            upper.includes('DESKRIPSI') ||
            upper.includes('KEPUTUSAN') ||
            upper.includes('KETERANGAN') ||
            upper.includes('SARAN') ||
            upper.includes('PRESTASI') ||
            upper.includes('EKSTRA') ||
            upper.includes('SIKAP') ||
            upper.includes('AKHLAK') ||
            upper.includes('PERILAKU')
        );
    };

    // Calculate student completeness for quick filtering
    const studentStatsMap = useMemo(() => {
        const map = new Map<number, { filledCount: number; totalKeys: number; isComplete: boolean }>();
        const totalKeys = inputKeys.length;
        studentsInRombel.forEach(s => {
            const sGrades = grades[s.id] || {};
            let filledCount = 0;
            inputKeys.forEach(k => {
                const v = sGrades[k.key];
                if (v !== undefined && v !== null && String(v).trim() !== '') {
                    filledCount++;
                }
            });
            map.set(s.id, {
                filledCount,
                totalKeys,
                isComplete: totalKeys > 0 && filledCount === totalKeys
            });
        });
        return map;
    }, [studentsInRombel, grades, inputKeys]);

    const filteredStudents = useMemo(() => {
        let list = studentsInRombel;
        if (studentSearchQuery.trim()) {
            const q = studentSearchQuery.trim().toLowerCase();
            list = list.filter(
                s => s.namaLengkap.toLowerCase().includes(q) || (s.nis || '').toLowerCase().includes(q)
            );
        }
        if (studentStatusFilter === 'incomplete') {
            list = list.filter(s => {
                const stat = studentStatsMap.get(s.id);
                return stat ? !stat.isComplete : true;
            });
        } else if (studentStatusFilter === 'complete') {
            list = list.filter(s => {
                const stat = studentStatsMap.get(s.id);
                return stat ? stat.isComplete : false;
            });
        }
        return list;
    }, [studentsInRombel, studentSearchQuery, studentStatusFilter, studentStatsMap]);

    // Clamp activeStudentIndex in Card Mode when search/status filter changes
    useEffect(() => {
        if (activeStudentIndex >= filteredStudents.length && filteredStudents.length > 0) {
            setActiveStudentIndex(0);
        }
    }, [filteredStudents.length, activeStudentIndex]);

    // Handle global Ctrl+S / Cmd+S save shortcut
    useEffect(() => {
        const handleGlobalKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
                e.preventDefault();
                if (isDirty && !isSaving && !isRaporLocked && selectedTemplateId && studentsInRombel.length > 0) {
                    handleSave();
                }
            }
        };
        window.addEventListener('keydown', handleGlobalKeyDown);
        return () => window.removeEventListener('keydown', handleGlobalKeyDown);
    }, [isDirty, isSaving, isRaporLocked, selectedTemplateId, studentsInRombel.length]);

    // Load existing records from DB + check unsaved local draft
    useEffect(() => {
        const loadExisting = async () => {
            if (!tahunAjaran || !semester) return;

            let query;
            if (activeRombelId) {
                query = getRaporRecordsByPeriodAndRombel(tahunAjaran, semester, activeRombelId);
            } else if (adminJenjangId) {
                query = getRaporRecordsByPeriod(tahunAjaran, semester);
            } else {
                setExistingPeriodRecords([]);
                setGrades({});
                setSavedBaselineJson('{}');
                setPendingDraft(null);
                return;
            }

            let existing = (await query).filter(r => !r.deleted);

            if (!activeRombelId && adminJenjangId) {
                existing = existing.filter(r => r.jenjangId === adminJenjangId);
                if (adminKelasId) {
                    existing = existing.filter(r => r.kelasId === adminKelasId);
                }
            }
            setExistingPeriodRecords(existing);

            const newGrades: Record<number, Record<string, string>> = {};
            existing.forEach(rec => {
                try {
                    const data = JSON.parse(rec.customData || '{}');
                    newGrades[rec.santriId] = data;
                } catch (e) {
                    console.error('Failed to parse customData', e);
                }
            });

            const baselineStr = JSON.stringify(newGrades);
            setGrades(newGrades);
            setSavedBaselineJson(baselineStr);
            setSyncedTahfizhMap({});

            // Cek apakah ada draf lokal yang belum sempat disimpan
            if (draftStorageKey) {
                try {
                    const rawDraft = localStorage.getItem(draftStorageKey);
                    if (rawDraft && rawDraft !== baselineStr) {
                        const parsed = JSON.parse(rawDraft);
                        if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) {
                            setPendingDraft(parsed);
                        } else {
                            setPendingDraft(null);
                        }
                    } else {
                        setPendingDraft(null);
                    }
                } catch {
                    setPendingDraft(null);
                }
            } else {
                setPendingDraft(null);
            }
        };
        loadExisting();
    }, [activeRombelId, adminJenjangId, adminKelasId, tahunAjaran, semester, refreshCounter, draftStorageKey]);

    // Simpan otomatis ke localStorage saat ada perubahan yang belum disimpan ke DB
    useEffect(() => {
        if (!draftStorageKey) return;
        if (isDirty) {
            try {
                localStorage.setItem(draftStorageKey, JSON.stringify(grades));
            } catch {
                // ignore storage quota errors
            }
        }
    }, [grades, isDirty, draftStorageKey]);

    // Peringatan browser sebelum menutup tab jika masih ada nilai belum disimpan
    useEffect(() => {
        if (!isDirty) return;
        const onBeforeUnload = (e: BeforeUnloadEvent) => {
            e.preventDefault();
            e.returnValue = '';
        };
        window.addEventListener('beforeunload', onBeforeUnload);
        return () => window.removeEventListener('beforeunload', onBeforeUnload);
    }, [isDirty]);

    const handleRestoreDraft = () => {
        if (!pendingDraft) return;
        setGrades(pendingDraft);
        setPendingDraft(null);
        showToast('Draf nilai yang belum tersimpan berhasil dipulihkan. Jangan lupa klik Simpan Nilai.', 'success');
    };

    const handleDiscardDraft = () => {
        if (draftStorageKey) {
            try {
                localStorage.removeItem(draftStorageKey);
            } catch {}
        }
        setPendingDraft(null);
        showToast('Draf lokal diabaikan dan dihapus.', 'info');
    };

    const handleInputChange = (santriId: number, key: string, value: string) => {
        if (isRaporLocked) return;
        setGrades(prev => ({
            ...prev,
            [santriId]: {
                ...(prev[santriId] || {}),
                [key]: value
            }
        }));
    };

    // Hitung ringkasan validasi skor pada tampilan aktif
    const scoreHealthStats = useMemo(() => {
        let outOfRange = 0;
        let belowKkm = 0;
        studentsInRombel.forEach(s => {
            const sGrades = grades[s.id];
            if (!sGrades) return;
            inputKeys.forEach(k => {
                const meta = keyValidationMeta[k.key];
                if (!meta?.isNumericScore) return;
                const raw = (sGrades[k.key] ?? '').trim();
                if (!raw) return;
                const num = Number(raw.replace(',', '.'));
                if (isNaN(num)) return;
                if (num < 0 || num > 100) outOfRange++;
                else if (num < meta.kkm) belowKkm++;
            });
        });
        return { outOfRange, belowKkm };
    }, [studentsInRombel, grades, inputKeys, keyValidationMeta]);

    const getCellScoreStatus = (key: string, rawVal: string): { status: 'normal' | 'invalid' | 'below_kkm'; kkm: number } => {
        const meta = keyValidationMeta[key];
        if (!meta?.isNumericScore || !rawVal || rawVal.trim() === '') {
            return { status: 'normal', kkm: meta?.kkm ?? 70 };
        }
        const num = Number(rawVal.trim().replace(',', '.'));
        if (isNaN(num)) return { status: 'normal', kkm: meta.kkm };
        if (num < 0 || num > 100) return { status: 'invalid', kkm: meta.kkm };
        if (num < meta.kkm) return { status: 'below_kkm', kkm: meta.kkm };
        return { status: 'normal', kkm: meta.kkm };
    };

    // Navigasi keyboard ala Excel di tabel web
    const focusTableCell = (sIdx: number, kIdx: number) => {
        if (sIdx < 0 || sIdx >= filteredStudents.length || kIdx < 0 || kIdx >= inputKeys.length) return;
        const container = tableWrapperRef.current;
        if (!container) return;
        const el = container.querySelector<HTMLInputElement | HTMLSelectElement>(
            `[data-wali-cell="${sIdx}:${kIdx}"]`
        );
        if (el) {
            el.focus();
            if ('select' in el && typeof el.select === 'function') {
                el.select();
            }
        }
    };

    const handleTableKeyDown = (
        e: React.KeyboardEvent<HTMLInputElement | HTMLSelectElement>,
        sIdx: number,
        kIdx: number
    ) => {
        const target = e.currentTarget;
        const isInput = target instanceof HTMLInputElement;

        if (e.key === 'Enter') {
            e.preventDefault();
            focusTableCell(e.shiftKey ? sIdx - 1 : sIdx + 1, kIdx);
        } else if (e.key === 'ArrowDown' && !(target instanceof HTMLSelectElement && e.altKey)) {
            if (!isInput) return;
            e.preventDefault();
            focusTableCell(sIdx + 1, kIdx);
        } else if (e.key === 'ArrowUp' && !(target instanceof HTMLSelectElement && e.altKey)) {
            if (!isInput) return;
            e.preventDefault();
            focusTableCell(sIdx - 1, kIdx);
        } else if (e.key === 'ArrowRight') {
            if (isInput && target.selectionStart !== null && target.selectionStart < target.value.length) {
                return;
            }
            e.preventDefault();
            focusTableCell(sIdx, kIdx + 1);
        } else if (e.key === 'ArrowLeft') {
            if (isInput && target.selectionStart !== null && target.selectionStart > 0) {
                return;
            }
            e.preventDefault();
            focusTableCell(sIdx, kIdx - 1);
        }
    };

    // Paste langsung blok multi-sel dari Excel / Google Sheets ke tabel web
    const handleTablePaste = (
        e: React.ClipboardEvent<HTMLInputElement>,
        startStudentIdx: number,
        startKeyIdx: number
    ) => {
        if (isRaporLocked) return;
        const text = e.clipboardData.getData('text/plain');
        if (!text || (!text.includes('\t') && !text.includes('\n') && !text.includes('\r'))) {
            return; // Paste teks tunggal biasa
        }

        const rawRows = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
        if (rawRows.length > 1 && rawRows[rawRows.length - 1] === '') {
            rawRows.pop();
        }
        if (rawRows.length === 0) return;

        e.preventDefault();
        let appliedRows = 0;
        let maxAppliedCols = 0;

        setGrades(prev => {
            const next = { ...prev };
            rawRows.forEach((rowStr, rOffset) => {
                const targetStudent = filteredStudents[startStudentIdx + rOffset];
                if (!targetStudent) return;
                const cols = rowStr.split('\t');
                let rowTouched = false;
                let colsCountInRow = 0;

                const updatedStudentGrades = { ...(next[targetStudent.id] || {}) };
                cols.forEach((cellVal, cOffset) => {
                    const targetKeyObj = inputKeys[startKeyIdx + cOffset];
                    if (!targetKeyObj) return;
                    updatedStudentGrades[targetKeyObj.key] = cellVal.trim();
                    rowTouched = true;
                    colsCountInRow++;
                });

                if (rowTouched) {
                    next[targetStudent.id] = updatedStudentGrades;
                    appliedRows++;
                    if (colsCountInRow > maxAppliedCols) maxAppliedCols = colsCountInRow;
                }
            });
            return next;
        });

        if (appliedRows > 0) {
            showToast(
                `Berhasil menempel ${appliedRows} baris × ${maxAppliedCols} kolom nilai langsung dari clipboard!`,
                'success'
            );
        }
    };

    const activeRombelName = useMemo(() => {
        if (activeRombelId) {
            return settings.rombel.find(r => r.id === activeRombelId)?.nama || '';
        }
        if (myRombel) return myRombel.nama;
        return 'Semua Rombel';
    }, [activeRombelId, settings.rombel, myRombel]);

    const saveGradesToDb = async (
        customPresensiAggregates?: Record<number, { sakit: number; izin: number; alpha: number }>,
        incomingGradesMap?: Record<number, Record<string, string>>,
        customTahfizhAggregates?: Record<number, StudentTahfizhAggregate>
    ) => {
        if (!selectedTemplateId) throw new Error('Pilih template terlebih dahulu');
        if (studentsInRombel.length === 0) throw new Error('Tidak ada santri untuk disimpan');

        const existingPeriod = await db.raporRecords
            .where('[tahunAjaran+semester]')
            .equals([tahunAjaran, semester])
            .toArray();

        const existingBySantri = new Map(existingPeriod.map(rec => [rec.santriId, rec]));
        const mergedGradesSnapshot: Record<number, Record<string, string>> = { ...grades };
        const effectiveTahfizhMap = customTahfizhAggregates || syncedTahfizhMap;

        const promises = studentsInRombel.map(async student => {
            const baseGrades = grades[student.id] || {};
            const incoming = incomingGradesMap?.[student.id] || {};
            const studentGrades = { ...baseGrades, ...incoming };
            mergedGradesSnapshot[student.id] = studentGrades;
            const existing = existingBySantri.get(student.id);

            const findKeyVal = (...kList: string[]): number | undefined => {
                for (const k of kList) {
                    if (studentGrades[k] !== undefined && String(studentGrades[k]).trim() !== '') {
                        const num = Number(String(studentGrades[k]).trim().replace(',', '.'));
                        if (!isNaN(num)) return num;
                    }
                }
                return undefined;
            };

            const agg = customPresensiAggregates?.[student.id];
            const sakit =
                agg !== undefined
                    ? agg.sakit
                    : findKeyVal('SAKIT', 'sakit', 'S', 'ABSENSI_SAKIT') ?? (existing?.sakit || 0);
            const izin =
                agg !== undefined
                    ? agg.izin
                    : findKeyVal('IZIN', 'izin', 'I', 'ABSENSI_IZIN') ?? (existing?.izin || 0);
            const alpha =
                agg !== undefined
                    ? agg.alpha
                    : findKeyVal('ALPHA', 'alpha', 'ALPA', 'alpa', 'A', 'ABSENSI_ALPHA') ?? (existing?.alpha || 0);

            const findTextVal = (...kList: string[]): string | undefined => {
                for (const k of kList) {
                    if (studentGrades[k] !== undefined && String(studentGrades[k]).trim() !== '') {
                        return String(studentGrades[k]).trim();
                    }
                }
                return undefined;
            };

            const catatanWaliKelas =
                findTextVal('CATATAN_WALI_KELAS', 'catatanWaliKelas', 'CATATAN_WALI', 'catatan_wali') ||
                existing?.catatanWaliKelas ||
                '';
            const keputusan = findTextVal('KEPUTUSAN', 'keputusan') || existing?.keputusan || '';

            const tahfizhAgg = effectiveTahfizhMap?.[student.id];
            const tahfizhSnapshot =
                tahfizhAgg && tahfizhAgg.totalSetoran > 0
                    ? {
                          averagePredikat: tahfizhAgg.predikatDominan,
                          lastJuz: tahfizhAgg.lastJuz,
                          lastSurah: tahfizhAgg.lastSurah,
                          catatan: tahfizhAgg.catatanRingkas
                      }
                    : undefined;

            const record: RaporRecord = {
                id: existing?.id || Date.now() + Math.floor(Math.random() * 10000),
                santriId: student.id,
                tahunAjaran,
                semester,
                rombelId: student.rombelId,
                jenjangId: student.jenjangId,
                kelasId: student.kelasId,
                nilai: existing?.nilai || [],
                tahfizhGanjil: semester === 'Ganjil' ? tahfizhSnapshot || existing?.tahfizhGanjil : existing?.tahfizhGanjil,
                tahfizhGenap: semester === 'Genap' ? tahfizhSnapshot || existing?.tahfizhGenap : existing?.tahfizhGenap,
                sakit,
                izin,
                alpha,
                kepribadian: existing?.kepribadian || [],
                ekstrakurikuler: existing?.ekstrakurikuler || [],
                catatanWaliKelas,
                keputusan,
                tanggalRapor: existing?.tanggalRapor || new Date().toISOString(),
                customData: JSON.stringify(studentGrades),
                deleted: false,
                lastModified: Date.now()
            };

            return db.raporRecords.put(record);
        });

        await Promise.all(promises);

        // Bersihkan status dirty & draf lokal karena sudah resmi tersimpan di DB
        setSavedBaselineJson(JSON.stringify(mergedGradesSnapshot));
        setPendingDraft(null);
        if (draftStorageKey) {
            try {
                localStorage.removeItem(draftStorageKey);
            } catch {}
        }
    };

    const handleSave = async () => {
        if (isRaporLocked) {
            return showToast('Rapor rombel ini sedang dikunci. Hubungi Admin jika perlu revisi.', 'error');
        }
        if (!selectedTemplateId) return showToast('Pilih template terlebih dahulu', 'error');
        if (studentsInRombel.length === 0) return showToast('Tidak ada santri untuk disimpan', 'error');

        setIsSaving(true);
        try {
            await saveGradesToDb();
            showToast('Data nilai berhasil disimpan ke database lokal.', 'success');
        } catch (e) {
            showToast('Gagal menyimpan data: ' + (e as Error).message, 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleExportExcel = async () => {
        if (studentsInRombel.length === 0) {
            showToast('Tidak ada santri aktif di rombel ini untuk diunduh.', 'info');
            return;
        }
        try {
            setIsExportingExcel(true);
            const fileName = await exportRaporExcelTemplate({
                template,
                santriList: studentsInRombel,
                rombelName: activeRombelName,
                tahunAjaran,
                semester,
                currentGrades: grades
            });
            showToast(`Template ${fileName} berhasil diunduh.`, 'success');
        } catch (err: any) {
            showToast('Gagal mengunduh template Excel: ' + err.message, 'error');
        } finally {
            setIsExportingExcel(false);
        }
    };

    const handlePresensiSyncSuccess = async (syncResult: PresensiSyncResult, shouldSaveToDb: boolean) => {
        const sakitKey = inputKeys.find(k => ['sakit', 's', 'absensi_sakit'].includes(k.key.toLowerCase()))?.key || 'SAKIT';
        const izinKey = inputKeys.find(k => ['izin', 'i', 'absensi_izin'].includes(k.key.toLowerCase()))?.key || 'IZIN';
        const alphaKey = inputKeys.find(k => ['alpha', 'alpa', 'a', 'absensi_alpha'].includes(k.key.toLowerCase()))?.key || 'ALPHA';

        const incoming: Record<number, Record<string, string>> = {};
        setGrades(prev => {
            const next = { ...prev };
            studentsInRombel.forEach(student => {
                const agg = syncResult.aggregates[student.id] || { sakit: 0, izin: 0, alpha: 0 };
                const patch = {
                    [sakitKey]: String(agg.sakit),
                    [izinKey]: String(agg.izin),
                    [alphaKey]: String(agg.alpha)
                };
                incoming[student.id] = patch;
                next[student.id] = {
                    ...(next[student.id] || {}),
                    ...patch
                };
            });
            return next;
        });

        if (shouldSaveToDb) {
            await saveGradesToDb(syncResult.aggregates, incoming);
        }
    };

    const handleTahfizhSyncSuccess = async (payload: TahfizhSyncPayload, shouldSaveToDb: boolean) => {
        setSyncedTahfizhMap(payload.aggregates);
        setGrades(prev => {
            const next = { ...prev };
            Object.entries(payload.mappedGrades).forEach(([sIdStr, gradesObj]) => {
                const sId = Number(sIdStr);
                next[sId] = {
                    ...(next[sId] || {}),
                    ...gradesObj
                };
            });
            return next;
        });

        if (shouldSaveToDb) {
            await saveGradesToDb(undefined, payload.mappedGrades, payload.aggregates);
        }
    };

    const handleApplyBulkHelper = (updatesBySantri: Record<number, Record<string, string>>) => {
        if (isRaporLocked) return;
        let count = 0;
        setGrades(prev => {
            const next = { ...prev };
            Object.entries(updatesBySantri).forEach(([sIdStr, patch]) => {
                const sId = Number(sIdStr);
                next[sId] = {
                    ...(next[sId] || {}),
                    ...patch
                };
                count++;
            });
            return next;
        });
        showToast(`Berhasil mengisi otomatis data pada ${count} santri. Klik Simpan Nilai untuk menyimpan.`, 'success');
    };

    const handleExcelImportSuccess = async (
        importedGrades: Record<number, Record<string, string>>,
        shouldSaveToDb: boolean
    ) => {
        setGrades(prev => {
            const next = { ...prev };
            Object.entries(importedGrades).forEach(([sIdStr, gradesObj]) => {
                const sId = Number(sIdStr);
                next[sId] = {
                    ...(next[sId] || {}),
                    ...gradesObj
                };
            });
            return next;
        });

        if (shouldSaveToDb) {
            await saveGradesToDb(undefined, importedGrades);
        }
    };

    if (myRombels.length === 0 && !canManageAllRombel) {
        return (
            <div className="p-10 text-center bg-gray-50 rounded-xl border-2 border-dashed">
                <i className="bi bi-person-x text-5xl text-gray-300 mb-4 block"></i>
                <h3 className="text-xl font-bold text-gray-700">Akses Terbatas</h3>
                <p className="text-gray-500">Akun Anda belum terdaftar sebagai Wali Kelas di Rombel manapun.</p>
                <p className="text-sm text-gray-400 mt-2">Silakan hubungi Admin untuk pengaturan Wali Kelas.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Banner Status Rapor Terkunci */}
            {isRaporLocked && (
                <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs text-emerald-950 shadow-xs">
                    <div className="flex items-center gap-2.5">
                        <i className="bi bi-shield-lock-fill text-emerald-600 text-lg shrink-0"></i>
                        <div>
                            <div className="font-black text-emerald-900">
                                Rapor Periode Ini Telah Disahkan &amp; Dikunci
                            </div>
                            <p className="text-emerald-800">
                                Pengeditan dan import nilai dinonaktifkan untuk menjaga keutuhan dokumen cetak rapor resmi.
                            </p>
                        </div>
                    </div>
                    {canManageAllRombel && (
                        <button
                            type="button"
                            onClick={handleAdminUnlockRapor}
                            className="px-3 py-1.5 bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg font-bold transition-colors shrink-0 flex items-center gap-1.5"
                        >
                            <i className="bi bi-unlock-fill"></i>
                            <span>Buka Kunci</span>
                        </button>
                    )}
                </div>
            )}

            {/* Banner Pemulihan Draf Lokal */}
            {pendingDraft && !isRaporLocked && (
                <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs text-amber-950 shadow-xs">
                    <div className="flex items-center gap-2.5">
                        <i className="bi bi-clock-history text-amber-600 text-lg shrink-0"></i>
                        <div>
                            <div className="font-black text-amber-900">
                                Ditemukan Draf Pengisian Nilai Belum Tersimpan
                            </div>
                            <p className="text-amber-800">
                                Ada perubahan nilai pada sesi sebelumnya di perangkat ini yang belum sempat disimpan ke database.
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <button
                            type="button"
                            onClick={handleDiscardDraft}
                            className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-600 border border-amber-200 rounded-lg font-bold"
                        >
                            Abaikan
                        </button>
                        <button
                            type="button"
                            onClick={handleRestoreDraft}
                            className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-black shadow-xs flex items-center gap-1"
                        >
                            <i className="bi bi-arrow-counterclockwise"></i>
                            <span>Pulihkan Draf</span>
                        </button>
                    </div>
                </div>
            )}

            <div className="bg-white p-4 rounded-xl border shadow-sm flex flex-col gap-4">
                {/* Mobile Filter & Quick Action Trigger */}
                <div className="md:hidden flex items-center gap-2">
                    <button
                        onClick={() => setIsFilterDrawerOpen(true)}
                        className="flex-grow flex items-center justify-center gap-2 px-4 py-2.5 bg-teal-50 text-teal-700 border border-teal-200 rounded-xl font-bold text-sm shadow-sm"
                    >
                        <i className="bi bi-funnel-fill"></i>
                        <span>Filter &amp; Aksi</span>
                    </button>
                    <button
                        onClick={() => setIsBulkHelperOpen(true)}
                        disabled={studentsInRombel.length === 0 || isRaporLocked}
                        title="Asisten Isi Cepat Catatan & Keputusan"
                        className="w-[42px] h-[42px] flex items-center justify-center bg-amber-50 text-amber-700 border border-amber-200 rounded-xl disabled:opacity-50"
                    >
                        <i className="bi bi-stars text-lg"></i>
                    </button>
                    <button
                        onClick={() => setIsImportModalOpen(true)}
                        disabled={studentsInRombel.length === 0 || isRaporLocked}
                        title="Import Excel"
                        className="w-[42px] h-[42px] flex items-center justify-center bg-teal-50 text-teal-700 border border-teal-200 rounded-xl disabled:opacity-50"
                    >
                        <i className="bi bi-file-earmark-arrow-up text-lg"></i>
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving || !selectedTemplateId || studentsInRombel.length === 0 || isRaporLocked}
                        title="Simpan Nilai"
                        className="relative shrink-0 w-[42px] h-[42px] flex items-center justify-center bg-teal-600 text-white rounded-xl shadow-lg shadow-teal-100 disabled:opacity-50"
                    >
                        {isSaving ? (
                            <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                        ) : (
                            <i className="bi bi-save2-fill text-lg"></i>
                        )}
                        {isDirty && (
                            <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-amber-400 border-2 border-white"></span>
                        )}
                    </button>
                </div>

                {/* Desktop Filter Row */}
                <div className="hidden md:grid md:grid-cols-4 lg:grid-cols-6 gap-3 items-end">
                    <div className="md:col-span-1">
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 tracking-widest pl-1">
                            Tahun Ajaran
                        </label>
                        <select
                            value={tahunAjaran}
                            onChange={e => setTahunAjaran(e.target.value)}
                            className="w-full border rounded-lg p-2 text-xs font-bold bg-gray-50 focus:bg-white focus:ring-2 focus:ring-teal-500 transition-all"
                        >
                            {availableAcademicYears.map(year => (
                                <option key={year} value={year}>
                                    {year}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="md:col-span-1">
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 tracking-widest pl-1">
                            Semester
                        </label>
                        <select
                            value={semester}
                            onChange={e => setSemester(e.target.value as any)}
                            className="w-full border rounded-lg p-2 text-xs font-bold bg-gray-50 focus:bg-white focus:ring-2 focus:ring-teal-500 transition-all"
                        >
                            <option value="Ganjil">Ganjil</option>
                            <option value="Genap">Genap</option>
                        </select>
                    </div>

                    {canManageAllRombel ? (
                        <>
                            <div className="md:col-span-1">
                                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 tracking-widest pl-1">
                                    Jenjang
                                </label>
                                <select
                                    value={adminJenjangId}
                                    onChange={e => {
                                        setAdminJenjangId(Number(e.target.value));
                                        setAdminKelasId(0);
                                        setActiveRombelId(null);
                                    }}
                                    className="w-full border rounded-lg p-2 text-xs font-bold bg-gray-50 focus:bg-white focus:ring-2 focus:ring-teal-500 transition-all"
                                >
                                    <option value={0}>Pilih Jenjang</option>
                                    {settings.jenjang.map(j => (
                                        <option key={j.id} value={j.id}>
                                            {j.nama}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="md:col-span-1">
                                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 tracking-widest pl-1">
                                    Kelas
                                </label>
                                <select
                                    value={adminKelasId}
                                    onChange={e => {
                                        setAdminKelasId(Number(e.target.value));
                                        setActiveRombelId(0);
                                    }}
                                    disabled={!adminJenjangId}
                                    className="w-full border rounded-lg p-2 text-xs font-bold disabled:bg-gray-100 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-teal-500 transition-all"
                                >
                                    <option value={0}>Semua Kelas</option>
                                    {availableKelas.map(k => (
                                        <option key={k.id} value={k.id}>
                                            {k.nama}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="lg:col-span-1">
                                <label className="block text-[10px] font-bold text-teal-600 uppercase mb-1 tracking-widest pl-1">
                                    Rombel
                                </label>
                                <select
                                    value={activeRombelId || 0}
                                    onChange={e => setActiveRombelId(parseInt(e.target.value))}
                                    disabled={!adminJenjangId}
                                    className="w-full border-2 border-teal-100 rounded-lg p-2 text-xs font-black bg-teal-50/20 disabled:bg-gray-50 focus:bg-white focus:ring-2 focus:ring-teal-500 transition-all"
                                >
                                    <option value={0}>Pilih Rombel</option>
                                    {availableRombel.map(r => (
                                        <option key={r.id} value={r.id}>
                                            {r.nama}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </>
                    ) : myRombels.length > 1 ? (
                        <div className="md:col-span-2">
                            <label className="block text-[10px] font-bold text-teal-600 uppercase mb-1 tracking-widest pl-1">
                                Pilih Rombel Anda ({myRombels.length})
                            </label>
                            <select
                                value={activeRombelId || myRombel?.id || 0}
                                onChange={e => setActiveRombelId(Number(e.target.value))}
                                className="w-full border-2 border-teal-200 rounded-lg p-2 text-xs font-black bg-teal-50 text-teal-900 focus:bg-white focus:ring-2 focus:ring-teal-500 transition-all"
                            >
                                {myRombels.map(r => (
                                    <option key={r.id} value={r.id}>
                                        {r.nama}
                                    </option>
                                ))}
                            </select>
                        </div>
                    ) : (
                        <div className="md:col-span-1">
                            <label className="block text-[10px] font-bold text-teal-600 uppercase mb-1 tracking-widest pl-1">
                                Rombel Anda
                            </label>
                            <div className="bg-teal-50 text-teal-700 px-3 py-2 rounded-lg border border-teal-100 font-bold text-xs text-center truncate">
                                {myRombel?.nama}
                            </div>
                        </div>
                    )}

                    <div className="lg:col-span-1">
                        <label className="block text-[10px] font-bold text-teal-600 uppercase mb-1 tracking-widest pl-1">
                            Template Rapor
                        </label>
                        <select
                            value={selectedTemplateId}
                            onChange={e => setSelectedTemplateId(e.target.value)}
                            className="w-full border-2 border-teal-100 rounded-lg p-2 text-xs font-black bg-teal-50 focus:bg-white focus:ring-2 focus:ring-teal-500 transition-all"
                        >
                            <option value="">Pilih Template</option>
                            {filteredTemplates.map(t => (
                                <option key={t.id} value={t.id}>
                                    {t.name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Desktop Action Toolbar */}
                <div className="hidden md:flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2.5 py-1 bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1.5">
                            <i className="bi bi-person-badge text-teal-600"></i>
                            <span>{activeRombelName}</span>
                        </span>
                        <span className="px-2.5 py-1 bg-teal-50 border border-teal-200 text-teal-800 rounded-lg text-xs font-bold">
                            {studentsInRombel.length} Santri
                        </span>
                        {isDirty && (
                            <span className="px-2.5 py-1 bg-amber-100 border border-amber-300 text-amber-900 rounded-lg text-xs font-bold flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-amber-600 animate-pulse"></span>
                                <span>Perubahan Belum Disimpan</span>
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                        {/* Tarik Presensi */}
                        <button
                            type="button"
                            onClick={() => setIsPresensiModalOpen(true)}
                            disabled={studentsInRombel.length === 0 || isRaporLocked}
                            className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 disabled:opacity-50"
                            title="Tarik rekap Sakit, Izin, Alpha dari log presensi"
                        >
                            <i className="bi bi-clock-history text-emerald-600"></i>
                            <span>Tarik Presensi</span>
                        </button>

                        {/* Tarik Tahfizh Otomatis */}
                        <button
                            type="button"
                            onClick={() => setIsTahfizhModalOpen(true)}
                            disabled={studentsInRombel.length === 0 || isRaporLocked}
                            className="px-3 py-2 bg-cyan-50 hover:bg-cyan-100 text-cyan-900 border border-cyan-200 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 disabled:opacity-50"
                            title="Tarik nilai rata-rata, surah/juz terakhir & jumlah setoran Tahfizh"
                        >
                            <i className="bi bi-journal-bookmark-fill text-cyan-600"></i>
                            <span>Tarik Tahfizh</span>
                        </button>

                        {/* Asisten Isi Cepat (Catatan Wali & Keputusan) */}
                        <button
                            type="button"
                            onClick={() => setIsBulkHelperOpen(true)}
                            disabled={studentsInRombel.length === 0 || !selectedTemplateId || isRaporLocked}
                            className="px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 disabled:opacity-50"
                            title="Isi otomatis Catatan Wali Kelas & Keputusan Kenaikan/Kelulusan"
                        >
                            <i className="bi bi-stars text-amber-600"></i>
                            <span>Isi Cepat Catatan/Keputusan</span>
                        </button>

                        {/* Unduh Template Excel */}
                        <button
                            type="button"
                            onClick={handleExportExcel}
                            disabled={isExportingExcel || studentsInRombel.length === 0}
                            className="px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 disabled:opacity-50"
                        >
                            {isExportingExcel ? (
                                <span className="w-3.5 h-3.5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></span>
                            ) : (
                                <i className="bi bi-download text-teal-600"></i>
                            )}
                            <span>Unduh Excel</span>
                        </button>

                        {/* Import File Excel */}
                        <button
                            type="button"
                            onClick={() => setIsImportModalOpen(true)}
                            disabled={studentsInRombel.length === 0 || isRaporLocked}
                            className="px-3 py-2 bg-white hover:bg-teal-50 text-teal-800 border border-teal-200 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 disabled:opacity-50"
                            title="Import nilai siswa dari file Excel"
                        >
                            <i className="bi bi-file-earmark-arrow-up text-teal-600"></i>
                            <span>Import Excel</span>
                        </button>

                        {/* Import WA / Cloud */}
                        <button
                            type="button"
                            onClick={() => setIsWaCloudModalOpen(true)}
                            disabled={isRaporLocked}
                            className="px-3 py-2 bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 disabled:opacity-50"
                            title="Import nilai via WhatsApp text atau Google Cloud Web App"
                        >
                            <i className="bi bi-whatsapp text-emerald-600"></i>
                            <span>Import WA</span>
                        </button>

                        {/* Simpan Nilai */}
                        <button
                            type="button"
                            onClick={handleSave}
                            disabled={isSaving || !selectedTemplateId || studentsInRombel.length === 0 || isRaporLocked}
                            className={`px-4 py-2 text-white rounded-lg text-xs font-black shadow-md disabled:opacity-50 transition-all flex items-center gap-1.5 ${
                                isDirty
                                    ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/20'
                                    : 'bg-teal-600 hover:bg-teal-700 shadow-teal-600/20'
                            }`}
                        >
                            {isSaving ? (
                                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                            ) : (
                                <i className="bi bi-floppy"></i>
                            )}
                            <span>{isDirty ? 'Simpan Perubahan' : 'Simpan Nilai'}</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Filter Drawer */}
            <MobileFilterDrawer
                isOpen={isFilterDrawerOpen}
                onClose={() => setIsFilterDrawerOpen(false)}
                title="Pengaturan Input"
            >
                <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                            <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest pl-1">
                                Tahun Ajaran
                            </label>
                            <select
                                value={tahunAjaran}
                                onChange={e => setTahunAjaran(e.target.value)}
                                className="w-full border-2 border-white rounded-xl p-3 text-sm font-bold shadow-sm focus:border-teal-500 outline-none"
                            >
                                {availableAcademicYears.map(year => (
                                    <option key={year} value={year}>
                                        {year}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                            <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest pl-1">
                                Semester
                            </label>
                            <select
                                value={semester}
                                onChange={e => setSemester(e.target.value as any)}
                                className="w-full border-2 border-white rounded-xl p-3 text-sm font-bold shadow-sm focus:border-teal-500 outline-none"
                            >
                                <option value="Ganjil">Ganjil</option>
                                <option value="Genap">Genap</option>
                            </select>
                        </div>
                    </div>

                    {canManageAllRombel ? (
                        <div className="bg-gray-50 p-6 rounded-[2rem] border border-gray-100 space-y-4">
                            <h4 className="text-xs font-black text-teal-700 uppercase tracking-widest flex items-center gap-2">
                                <i className="bi bi-funnel"></i> Filter Rombel
                            </h4>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5 tracking-widest ml-1">
                                        Pilih Jenjang
                                    </label>
                                    <select
                                        value={adminJenjangId}
                                        onChange={e => {
                                            setAdminJenjangId(Number(e.target.value));
                                            setAdminKelasId(0);
                                            setActiveRombelId(null);
                                        }}
                                        className="w-full border-2 border-white rounded-2xl p-4 text-base font-bold shadow-sm focus:border-teal-500 outline-none"
                                    >
                                        <option value={0}>Pilih Jenjang</option>
                                        {settings.jenjang.map(j => (
                                            <option key={j.id} value={j.id}>
                                                {j.nama}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5 tracking-widest ml-1">
                                        Pilih Kelas
                                    </label>
                                    <select
                                        value={adminKelasId}
                                        onChange={e => {
                                            setAdminKelasId(Number(e.target.value));
                                            setActiveRombelId(0);
                                        }}
                                        disabled={!adminJenjangId}
                                        className="w-full border-2 border-white rounded-2xl p-4 text-base font-bold shadow-sm focus:border-teal-500 outline-none disabled:opacity-50"
                                    >
                                        <option value={0}>Semua Kelas</option>
                                        {availableKelas.map(k => (
                                            <option key={k.id} value={k.id}>
                                                {k.nama}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="pt-2">
                                    <label className="block text-[10px] font-black text-teal-600 uppercase mb-1.5 tracking-widest ml-1">
                                        Pilih Rombongan Belajar
                                    </label>
                                    <select
                                        value={activeRombelId || 0}
                                        onChange={e => setActiveRombelId(parseInt(e.target.value))}
                                        disabled={!adminJenjangId}
                                        className="w-full border-2 border-teal-100 rounded-2xl p-4 text-base font-black bg-teal-50 shadow-sm focus:border-teal-500 outline-none disabled:opacity-50"
                                    >
                                        <option value={0}>Pilih Rombel</option>
                                        {availableRombel.map(r => (
                                            <option key={r.id} value={r.id}>
                                                {r.nama}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                    ) : myRombels.length > 1 ? (
                        <div className="bg-teal-50 p-6 rounded-3xl border border-teal-100 space-y-2">
                            <label className="text-[10px] font-black text-teal-600 uppercase tracking-widest block">
                                Pilih Rombel Pengampu ({myRombels.length})
                            </label>
                            <select
                                value={activeRombelId || myRombel?.id || 0}
                                onChange={e => setActiveRombelId(Number(e.target.value))}
                                className="w-full border-2 border-white rounded-2xl p-3.5 text-base font-black text-teal-900 bg-white shadow-sm outline-none"
                            >
                                {myRombels.map(r => (
                                    <option key={r.id} value={r.id}>
                                        {r.nama}
                                    </option>
                                ))}
                            </select>
                        </div>
                    ) : (
                        <div className="bg-teal-50 p-6 rounded-3xl border border-teal-100 text-center">
                            <span className="text-[10px] font-black text-teal-600 uppercase tracking-widest block mb-1">
                                Rombel Pengampu
                            </span>
                            <span className="text-xl font-black text-teal-900">{myRombel?.nama}</span>
                        </div>
                    )}

                    <div className="bg-teal-50/50 p-6 rounded-[2rem] border-2 border-teal-100">
                        <label className="block text-xs font-black text-teal-700 uppercase mb-3 tracking-widest ml-1">
                            Template Rapor
                        </label>
                        <select
                            value={selectedTemplateId}
                            onChange={e => setSelectedTemplateId(e.target.value)}
                            className="w-full border-2 border-white rounded-2xl p-4 text-lg font-black text-teal-900 bg-white shadow-xl shadow-teal-900/5 focus:border-teal-500 outline-none"
                        >
                            <option value="">Pilih Template Rapor</option>
                            {filteredTemplates.map(t => (
                                <option key={t.id} value={t.id}>
                                    {t.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Mobile Quick Action Buttons */}
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2.5">
                        <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-widest pl-1">
                            Aksi Cepat Data
                        </h4>
                        <div className="grid grid-cols-1 gap-2">
                            <button
                                type="button"
                                onClick={() => {
                                    setIsFilterDrawerOpen(false);
                                    setIsPresensiModalOpen(true);
                                }}
                                disabled={studentsInRombel.length === 0 || isRaporLocked}
                                className="w-full py-2.5 px-4 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl font-bold text-xs flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                <i className="bi bi-clock-history text-emerald-600"></i>
                                <span>Tarik Presensi Otomatis</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setIsFilterDrawerOpen(false);
                                    setIsTahfizhModalOpen(true);
                                }}
                                disabled={studentsInRombel.length === 0 || isRaporLocked}
                                className="w-full py-2.5 px-4 bg-cyan-50 text-cyan-900 border border-cyan-200 rounded-xl font-bold text-xs flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                <i className="bi bi-journal-bookmark-fill text-cyan-600"></i>
                                <span>Tarik Data Tahfizh Otomatis</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setIsFilterDrawerOpen(false);
                                    setIsBulkHelperOpen(true);
                                }}
                                disabled={studentsInRombel.length === 0 || !selectedTemplateId || isRaporLocked}
                                className="w-full py-2.5 px-4 bg-amber-50 text-amber-900 border border-amber-200 rounded-xl font-bold text-xs flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                <i className="bi bi-stars text-amber-600"></i>
                                <span>Isi Cepat Catatan &amp; Keputusan</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setIsFilterDrawerOpen(false);
                                    handleExportExcel();
                                }}
                                disabled={isExportingExcel || studentsInRombel.length === 0}
                                className="w-full py-2.5 px-4 bg-white text-slate-700 border border-slate-200 rounded-xl font-bold text-xs flex items-center justify-center gap-2"
                            >
                                <i className="bi bi-download text-teal-600"></i>
                                <span>Unduh Template Excel</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setIsFilterDrawerOpen(false);
                                    setIsImportModalOpen(true);
                                }}
                                disabled={studentsInRombel.length === 0 || isRaporLocked}
                                className="w-full py-2.5 px-4 bg-teal-50 text-teal-800 border border-teal-200 rounded-xl font-bold text-xs flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                <i className="bi bi-file-earmark-arrow-up text-teal-600"></i>
                                <span>Import File Excel</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setIsFilterDrawerOpen(false);
                                    setIsWaCloudModalOpen(true);
                                }}
                                disabled={isRaporLocked}
                                className="w-full py-2.5 px-4 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl font-bold text-xs flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                <i className="bi bi-whatsapp text-emerald-600"></i>
                                <span>Import WA / Cloud</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setIsFilterDrawerOpen(false);
                                    handleSave();
                                }}
                                disabled={isSaving || !selectedTemplateId || studentsInRombel.length === 0 || isRaporLocked}
                                className="w-full py-2.5 px-4 bg-teal-600 text-white rounded-xl font-black text-xs flex items-center justify-center gap-2 shadow-md shadow-teal-600/20 disabled:opacity-50"
                            >
                                {isSaving ? (
                                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                                ) : (
                                    <i className="bi bi-floppy"></i>
                                )}
                                <span>Simpan Nilai Rombel</span>
                            </button>
                        </div>
                    </div>
                </div>
            </MobileFilterDrawer>

            {!selectedTemplateId ? (
                <div className="p-20 text-center bg-gray-50 rounded-xl border-2 border-dashed">
                    <i className="bi bi-file-earmark-spreadsheet text-5xl text-gray-300 mb-4 block"></i>
                    <p className="text-gray-500">
                        Silakan pilih <strong>Template Rapor</strong> untuk memulai pengisian nilai.
                    </p>
                </div>
            ) : studentsInRombel.length === 0 ? (
                <div className="p-20 text-center bg-gray-50 rounded-xl border-2 border-dashed">
                    <i className="bi bi-people text-5xl text-gray-300 mb-4 block"></i>
                    <p className="text-gray-500">Tidak ada santri aktif di rombel ini.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {/* View Switcher & Validation Indicators Header */}
                    <div className="bg-white p-3 rounded-xl border flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Tampilan Input:</span>
                            <div className="inline-flex rounded-lg bg-gray-100 p-1 border">
                                <button
                                    type="button"
                                    onClick={() => setViewMode('table')}
                                    className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 transition-all ${
                                        viewMode === 'table' ? 'bg-white text-teal-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                                    }`}
                                >
                                    <i className="bi bi-table"></i>
                                    <span>Tabel Leger (Enter / Paste Excel)</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setViewMode('card')}
                                    className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 transition-all ${
                                        viewMode === 'card' ? 'bg-white text-teal-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                                    }`}
                                >
                                    <i className="bi bi-card-text"></i>
                                    <span>Form Kartu (Mobile)</span>
                                </button>
                            </div>
                        </div>

                        <div className="text-xs font-semibold text-gray-500 flex items-center gap-2 flex-wrap justify-end">
                            {scoreHealthStats.outOfRange > 0 && (
                                <span
                                    className="bg-rose-50 text-rose-700 border border-rose-200 px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1"
                                    title="Ada angka di luar rentang wajar 0-100 (kemungkinan salah ketik)"
                                >
                                    <i className="bi bi-exclamation-octagon-fill"></i>
                                    <span>{scoreHealthStats.outOfRange} di luar 0-100</span>
                                </span>
                            )}
                            {scoreHealthStats.belowKkm > 0 && (
                                <span
                                    className="bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1"
                                    title="Jumlah nilai mata pelajaran yang berada di bawah KKM"
                                >
                                    <i className="bi bi-exclamation-triangle-fill text-amber-500"></i>
                                    <span>{scoreHealthStats.belowKkm} di bawah KKM</span>
                                </span>
                            )}
                            <span className="bg-teal-50 text-teal-700 border border-teal-200 px-2.5 py-1 rounded-lg text-xs font-bold">
                                Total: {studentsInRombel.length} Santri
                            </span>
                        </div>
                    </div>

                    {/* Quick Search & Completeness Filter Bar */}
                    <div className="bg-white p-3 rounded-xl border flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-2xs">
                        <div className="flex items-center gap-2 flex-grow max-w-md">
                            <div className="relative w-full">
                                <i className="bi bi-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
                                <input
                                    type="text"
                                    value={studentSearchQuery}
                                    onChange={e => setStudentSearchQuery(e.target.value)}
                                    placeholder="Cari nama santri atau NIS..."
                                    className="w-full pl-8 pr-8 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-teal-500 bg-slate-50 focus:bg-white transition-all"
                                />
                                {studentSearchQuery && (
                                    <button
                                        type="button"
                                        onClick={() => setStudentSearchQuery('')}
                                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                    >
                                        <i className="bi bi-x-circle-fill text-xs"></i>
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Filter Segmented Controls */}
                        <div className="flex items-center gap-1.5 overflow-x-auto select-none no-scrollbar">
                            <button
                                type="button"
                                onClick={() => setStudentStatusFilter('all')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                                    studentStatusFilter === 'all'
                                        ? 'bg-slate-800 text-white shadow-xs'
                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                            >
                                <span>Semua</span>
                                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-black/20">
                                    {studentsInRombel.length}
                                </span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setStudentStatusFilter('incomplete')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                                    studentStatusFilter === 'incomplete'
                                        ? 'bg-rose-600 text-white shadow-xs'
                                        : 'bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100'
                                }`}
                            >
                                <i className="bi bi-clock-history"></i>
                                <span>Belum Lengkap</span>
                                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-black/20">
                                    {studentsInRombel.filter(s => !studentStatsMap.get(s.id)?.isComplete).length}
                                </span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setStudentStatusFilter('complete')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                                    studentStatusFilter === 'complete'
                                        ? 'bg-teal-600 text-white shadow-xs'
                                        : 'bg-teal-50 text-teal-800 border border-teal-200 hover:bg-teal-100'
                                }`}
                            >
                                <i className="bi bi-check-circle-fill"></i>
                                <span>Lengkap</span>
                                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-black/20">
                                    {studentsInRombel.filter(s => studentStatsMap.get(s.id)?.isComplete).length}
                                </span>
                            </button>
                        </div>
                    </div>

                    {/* TABLE MODE */}
                    {viewMode === 'table' && (
                        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                            {/* Multi-Sheet Tab Navigation for Table Mode */}
                            {availableSheets.length > 1 && (
                                <div className="bg-slate-50 border-b px-4 py-2 flex items-center gap-2 overflow-x-auto select-none no-scrollbar">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
                                        <i className="bi bi-collection"></i> Lembar Input:
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => setActiveInputSheetId('all')}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                                            activeInputSheetId === 'all'
                                                ? 'bg-teal-700 text-white shadow-sm'
                                                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                                        }`}
                                    >
                                        <span>Semua Lembar</span>
                                        <span className="text-[10px] opacity-80 bg-black/20 px-1.5 py-0.5 rounded-full">
                                            {extractTemplateKeys(template, 'all').length}
                                        </span>
                                    </button>
                                    {availableSheets.map(sh => {
                                        const count = extractTemplateKeys(template, sh.id).length;
                                        const isActive = activeInputSheetId === sh.id;
                                        return (
                                            <button
                                                key={sh.id}
                                                type="button"
                                                onClick={() => setActiveInputSheetId(sh.id)}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                                                    isActive
                                                        ? 'bg-teal-700 text-white shadow-sm'
                                                        : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                                                }`}
                                            >
                                                <i className="bi bi-file-earmark-spreadsheet"></i>
                                                <span>{sh.name}</span>
                                                <span className="text-[10px] opacity-80 bg-black/20 px-1.5 py-0.5 rounded-full">
                                                    {count}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}

                            <div ref={tableWrapperRef} className="max-h-[calc(100vh-270px)] overflow-auto relative border rounded-xl shadow-2xs bg-white">
                                <table className="w-full text-sm text-left border-collapse">
                                    <thead className="bg-slate-100 text-slate-700 border-b border-slate-300 sticky top-0 z-20 shadow-xs select-none">
                                        <tr>
                                            <th className="p-3 w-12 text-center sticky top-0 left-0 z-30 bg-slate-100 border-r border-slate-200 text-slate-700 font-bold">
                                                No
                                            </th>
                                            <th className="p-3 min-w-[210px] sticky top-0 left-12 z-30 bg-slate-100 border-r-2 border-slate-300 shadow-[3px_0_6px_rgba(0,0,0,0.04)] text-slate-700 font-bold">
                                                Nama Santri
                                            </th>
                                            {inputKeys.map(k => {
                                                const meta = keyValidationMeta[k.key];
                                                const isText = isLongTextKey(k.key, k.type);
                                                return (
                                                    <th
                                                        key={k.key}
                                                        className={`p-3 text-center ${
                                                            isText ? 'min-w-[240px] max-w-[340px]' : 'min-w-[105px]'
                                                        }`}
                                                    >
                                                        {activeInputSheetId === 'all' && k.sheetName && (
                                                            <div className="text-[9px] font-bold text-teal-600 uppercase tracking-tight bg-teal-50 px-1.5 py-0.5 rounded inline-block mb-1 border border-teal-100 truncate max-w-[110px]">
                                                                {k.sheetName}
                                                            </div>
                                                        )}
                                                        <div className="text-[10px] text-gray-400 uppercase mb-0.5 font-mono">
                                                            ${k.key}
                                                        </div>
                                                        <div className="text-xs font-bold text-gray-700">{k.label}</div>
                                                        {meta?.isNumericScore && (
                                                            <div className="text-[9px] font-semibold text-slate-400 mt-0.5">
                                                                KKM: {meta.kkm}
                                                            </div>
                                                        )}
                                                        {isText && (
                                                            <div className="text-[9px] font-semibold text-teal-600 mt-0.5">
                                                                Teks / Catatan
                                                            </div>
                                                        )}
                                                    </th>
                                                );
                                            })}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {filteredStudents.length === 0 ? (
                                            <tr>
                                                <td
                                                    colSpan={2 + inputKeys.length}
                                                    className="p-8 text-center text-slate-400 text-xs italic"
                                                >
                                                    Tidak ada data santri yang cocok dengan filter pencarian.
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredStudents.map((student, idx) => {
                                                const prevStudent = idx > 0 ? filteredStudents[idx - 1] : null;
                                                const showRombelHeader =
                                                    !prevStudent || prevStudent.rombelId !== student.rombelId;
                                                const rombelName =
                                                    settings.rombel.find(r => r.id === student.rombelId)?.nama ||
                                                    'Tanpa Rombel';
                                                const sStat = studentStatsMap.get(student.id);

                                                return (
                                                    <React.Fragment key={student.id}>
                                                        {showRombelHeader && (
                                                            <tr className="bg-blue-50/70 border-y border-blue-100">
                                                                <td
                                                                    colSpan={2 + inputKeys.length}
                                                                    className="p-2.5 px-4 text-xs font-black text-blue-800 uppercase tracking-wider"
                                                                >
                                                                    <i className="bi bi-person-badge mr-1.5"></i>
                                                                    Rombel: {rombelName}
                                                                </td>
                                                            </tr>
                                                        )}
                                                        <tr className="group bg-white hover:bg-slate-50/90 focus-within:bg-teal-50/70 transition-colors">
                                                            <td className="p-3 text-center text-slate-400 sticky left-0 z-10 bg-inherit border-r border-slate-200 font-bold text-xs">
                                                                {idx + 1}
                                                            </td>
                                                            <td className="p-3 sticky left-12 z-10 bg-inherit border-r-2 border-slate-300 shadow-[3px_0_6px_rgba(0,0,0,0.04)]">
                                                                <div className="font-bold text-slate-800 text-xs flex items-center justify-between gap-1.5">
                                                                    <span className="truncate">{student.namaLengkap}</span>
                                                                    {sStat?.isComplete ? (
                                                                        <i
                                                                            className="bi bi-check-circle-fill text-emerald-500 text-xs shrink-0"
                                                                            title="Semua nilai terisi lengkap"
                                                                        ></i>
                                                                    ) : (
                                                                        <span
                                                                            className="text-[9px] font-mono text-slate-400 bg-slate-100 px-1 rounded shrink-0"
                                                                            title={`Terisi ${sStat?.filledCount || 0} dari ${sStat?.totalKeys || 0} kolom`}
                                                                        >
                                                                            {sStat?.filledCount || 0}/{sStat?.totalKeys || 0}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <div className="text-[10px] text-slate-400 font-mono">
                                                                    {student.nis}
                                                                </div>
                                                            </td>
                                                            {inputKeys.map((k, kIdx) => {
                                                                const rawVal = grades[student.id]?.[k.key] || '';
                                                                const isText = isLongTextKey(k.key, k.type);
                                                                const scoreCheck = getCellScoreStatus(k.key, rawVal);
                                                                const cellColorClass =
                                                                    scoreCheck.status === 'invalid'
                                                                        ? 'border-rose-400 bg-rose-50 text-rose-800 ring-1 ring-rose-300 font-bold'
                                                                        : scoreCheck.status === 'below_kkm'
                                                                        ? 'border-amber-300 bg-amber-50/80 text-amber-900 font-bold'
                                                                        : 'border-slate-200 bg-white text-slate-800';

                                                                return (
                                                                    <td key={k.key} className="p-1.5 align-top">
                                                                        {k.type === 'dropdown' ? (
                                                                            <select
                                                                                data-wali-cell={`${idx}:${kIdx}`}
                                                                                disabled={isRaporLocked}
                                                                                value={rawVal}
                                                                                onChange={e =>
                                                                                    handleInputChange(
                                                                                        student.id,
                                                                                        k.key,
                                                                                        e.target.value
                                                                                    )
                                                                                }
                                                                                onKeyDown={e =>
                                                                                    handleTableKeyDown(e, idx, kIdx)
                                                                                }
                                                                                className="w-full border border-slate-200 rounded-lg p-2 text-center focus:ring-2 focus:ring-teal-500 outline-none disabled:bg-slate-100 disabled:text-slate-500 bg-white"
                                                                            >
                                                                                <option value=""></option>
                                                                                {k.options?.map(opt => (
                                                                                    <option key={opt} value={opt}>
                                                                                        {opt}
                                                                                    </option>
                                                                                ))}
                                                                            </select>
                                                                        ) : isText ? (
                                                                            <div className="relative flex items-center">
                                                                                <input
                                                                                    type="text"
                                                                                    data-wali-cell={`${idx}:${kIdx}`}
                                                                                    disabled={isRaporLocked}
                                                                                    value={rawVal}
                                                                                    onChange={e =>
                                                                                        handleInputChange(
                                                                                            student.id,
                                                                                            k.key,
                                                                                            e.target.value
                                                                                        )
                                                                                    }
                                                                                    onKeyDown={e =>
                                                                                        handleTableKeyDown(e, idx, kIdx)
                                                                                    }
                                                                                    onPaste={e =>
                                                                                        handleTablePaste(e, idx, kIdx)
                                                                                    }
                                                                                    placeholder="Ketik catatan..."
                                                                                    className="w-full border border-slate-200 rounded-lg p-2 pr-7 text-left font-sans text-xs focus:ring-2 focus:ring-teal-500 outline-none bg-white transition-colors"
                                                                                    title="Klik ikon di kanan atau klik ganda untuk menulis catatan panjang yang lebih lega"
                                                                                    onDoubleClick={() =>
                                                                                        setExpandedTextModal({
                                                                                            studentId: student.id,
                                                                                            studentName: student.namaLengkap,
                                                                                            key: k.key,
                                                                                            label: k.label,
                                                                                            value: rawVal
                                                                                        })
                                                                                    }
                                                                                />
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() =>
                                                                                        setExpandedTextModal({
                                                                                            studentId: student.id,
                                                                                            studentName: student.namaLengkap,
                                                                                            key: k.key,
                                                                                            label: k.label,
                                                                                            value: rawVal
                                                                                        })
                                                                                    }
                                                                                    className="absolute right-1 p-1 text-slate-400 hover:text-teal-700 transition-colors"
                                                                                    title="Perbesar kotak ketik catatan"
                                                                                >
                                                                                    <i className="bi bi-arrows-angle-expand text-[10px]"></i>
                                                                                </button>
                                                                            </div>
                                                                        ) : (
                                                                            <div>
                                                                                <input
                                                                                    type="text"
                                                                                    data-wali-cell={`${idx}:${kIdx}`}
                                                                                    disabled={isRaporLocked}
                                                                                    value={rawVal}
                                                                                    onChange={e =>
                                                                                        handleInputChange(
                                                                                            student.id,
                                                                                            k.key,
                                                                                            e.target.value
                                                                                        )
                                                                                    }
                                                                                    onKeyDown={e =>
                                                                                        handleTableKeyDown(e, idx, kIdx)
                                                                                    }
                                                                                    onPaste={e =>
                                                                                        handleTablePaste(e, idx, kIdx)
                                                                                    }
                                                                                    title={
                                                                                        scoreCheck.status === 'invalid'
                                                                                            ? 'Perhatian: Nilai berada di luar rentang 0 - 100!'
                                                                                            : scoreCheck.status === 'below_kkm'
                                                                                            ? `Nilai di bawah KKM (${scoreCheck.kkm})`
                                                                                            : 'Ketik nilai, tekan Enter untuk turun, atau Ctrl+V blok nilai dari Excel'
                                                                                    }
                                                                                    className={`w-full border rounded-lg p-2 text-center focus:ring-2 focus:ring-teal-500 outline-none font-mono disabled:bg-slate-100 disabled:text-slate-500 transition-colors ${cellColorClass}`}
                                                                                    placeholder="0"
                                                                                />
                                                                                {scoreCheck.status === 'invalid' && (
                                                                                    <div className="text-[9px] font-bold text-rose-600 text-center mt-0.5">
                                                                                        Luar 0-100!
                                                                                    </div>
                                                                                )}
                                                                                {scoreCheck.status === 'below_kkm' && (
                                                                                    <div className="text-[9px] font-semibold text-amber-700 text-center mt-0.5">
                                                                                        &lt; KKM {scoreCheck.kkm}
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        )}
                                                                    </td>
                                                                );
                                                            })}
                                                        </tr>
                                                    </React.Fragment>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* CARD / MOBILE STEPPER MODE */}
                    {viewMode === 'card' &&
                        (() => {
                            if (filteredStudents.length === 0) {
                                return (
                                    <div className="bg-white rounded-2xl border p-8 text-center max-w-xl mx-auto space-y-3 shadow-xs">
                                        <i className="bi bi-search text-3xl text-slate-300 block"></i>
                                        <p className="text-sm font-bold text-slate-700">
                                            Tidak ada santri yang sesuai dengan filter pencarian.
                                        </p>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setStudentSearchQuery('');
                                                setStudentStatusFilter('all');
                                            }}
                                            className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition-colors"
                                        >
                                            Reset Pencarian &amp; Filter
                                        </button>
                                    </div>
                                );
                            }

                            const safeStudentIdx = Math.min(activeStudentIndex, filteredStudents.length - 1);
                            const currentStudent = filteredStudents[safeStudentIdx] || filteredStudents[0];
                            const rombelName =
                                settings.rombel.find(r => r.id === currentStudent?.rombelId)?.nama || 'Tanpa Rombel';

                            return (
                                <div className="bg-white rounded-2xl border shadow-md overflow-hidden max-w-2xl mx-auto">
                                    {/* Top Student Selector Header */}
                                    <div className="bg-gradient-to-r from-teal-700 to-emerald-700 p-4 text-white">
                                        <div className="flex items-center justify-between mb-3">
                                            <span className="text-xs font-bold bg-white/20 px-2.5 py-0.5 rounded-full backdrop-blur-sm">
                                                Santri #{safeStudentIdx + 1} dari {filteredStudents.length}
                                            </span>
                                            <span className="text-xs font-bold text-teal-100">Rombel: {rombelName}</span>
                                        </div>
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                            <div>
                                                <h3 className="text-lg font-black tracking-tight">
                                                    {currentStudent?.namaLengkap}
                                                </h3>
                                                <p className="text-xs text-teal-100 font-mono">
                                                    NIS: {currentStudent?.nis || '-'}
                                                </p>
                                            </div>
                                            <select
                                                value={safeStudentIdx}
                                                onChange={e => setActiveStudentIndex(Number(e.target.value))}
                                                className="bg-white text-gray-900 text-xs font-bold rounded-lg px-3 py-2 border-0 outline-none shadow-sm cursor-pointer"
                                            >
                                                {filteredStudents.map((s, idx) => (
                                                    <option key={s.id} value={idx}>
                                                        {idx + 1}. {s.namaLengkap}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    {/* Multi-Sheet Tab Navigation for Card Mode */}
                                    {availableSheets.length > 1 && (
                                        <div className="bg-slate-100 border-b px-4 py-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                                            <button
                                                type="button"
                                                onClick={() => setActiveInputSheetId('all')}
                                                className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all shrink-0 ${
                                                    activeInputSheetId === 'all'
                                                        ? 'bg-teal-700 text-white shadow-sm'
                                                        : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
                                                }`}
                                            >
                                                Semua ({extractTemplateKeys(template, 'all').length})
                                            </button>
                                            {availableSheets.map(sh => (
                                                <button
                                                    key={sh.id}
                                                    type="button"
                                                    onClick={() => setActiveInputSheetId(sh.id)}
                                                    className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all shrink-0 ${
                                                        activeInputSheetId === sh.id
                                                            ? 'bg-teal-700 text-white shadow-sm'
                                                            : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
                                                    }`}
                                                >
                                                    {sh.name} ({extractTemplateKeys(template, sh.id).length})
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    {/* Form Fields */}
                                    <div className="p-5 space-y-3 max-h-[60vh] overflow-y-auto bg-gray-50/50">
                                        {inputKeys.map(k => {
                                            const val = grades[currentStudent?.id]?.[k.key] || '';
                                            const scoreCheck = getCellScoreStatus(k.key, val);
                                            const cardInputClass =
                                                scoreCheck.status === 'invalid'
                                                    ? 'border-rose-400 bg-rose-50 text-rose-800'
                                                    : scoreCheck.status === 'below_kkm'
                                                    ? 'border-amber-300 bg-amber-50 text-amber-900'
                                                    : 'border-gray-200 bg-white text-gray-800';

                                            return (
                                                <div
                                                    key={k.key}
                                                    className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                                                >
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            {activeInputSheetId === 'all' && k.sheetName && (
                                                                <span className="text-[9px] font-bold bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded border border-purple-200">
                                                                    {k.sheetName}
                                                                </span>
                                                            )}
                                                            <span className="text-[10px] font-bold bg-teal-50 text-teal-700 px-1.5 py-0.5 rounded border border-teal-200 font-mono">
                                                                ${k.key}
                                                            </span>
                                                            <span className="text-xs font-bold text-gray-800">{k.label}</span>
                                                            {keyValidationMeta[k.key]?.isNumericScore && (
                                                                <span className="text-[10px] text-slate-400 font-semibold">
                                                                    (KKM {scoreCheck.kkm})
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="w-full sm:w-48">
                                                        {k.type === 'dropdown' ? (
                                                            <select
                                                                disabled={isRaporLocked}
                                                                value={val}
                                                                onChange={e =>
                                                                    handleInputChange(currentStudent.id, k.key, e.target.value)
                                                                }
                                                                className="w-full border-2 border-gray-200 rounded-lg p-2 text-sm font-bold text-gray-800 focus:border-teal-500 outline-none bg-white disabled:bg-slate-100"
                                                            >
                                                                <option value="">-- Pilih --</option>
                                                                {k.options?.map(opt => (
                                                                    <option key={opt} value={opt}>
                                                                        {opt}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        ) : (
                                                            <div>
                                                                <input
                                                                    type="text"
                                                                    disabled={isRaporLocked}
                                                                    value={val}
                                                                    onChange={e =>
                                                                        handleInputChange(currentStudent.id, k.key, e.target.value)
                                                                    }
                                                                    className={`w-full border-2 rounded-lg p-2 text-sm font-bold text-center font-mono focus:border-teal-500 outline-none disabled:bg-slate-100 ${cardInputClass}`}
                                                                    placeholder="0"
                                                                />
                                                                {scoreCheck.status === 'invalid' && (
                                                                    <div className="text-[10px] font-bold text-rose-600 text-center mt-0.5">
                                                                        Nilai di luar rentang 0-100!
                                                                    </div>
                                                                )}
                                                                {scoreCheck.status === 'below_kkm' && (
                                                                    <div className="text-[10px] font-semibold text-amber-700 text-center mt-0.5">
                                                                        Di bawah KKM ({scoreCheck.kkm})
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* Bottom Stepper Footer */}
                                    <div className="p-4 bg-white border-t flex items-center justify-between gap-2">
                                        <button
                                            type="button"
                                            disabled={safeStudentIdx === 0}
                                            onClick={() => setActiveStudentIndex(Math.max(0, safeStudentIdx - 1))}
                                            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl text-xs font-bold hover:bg-gray-200 disabled:opacity-40 flex items-center gap-1 transition-all"
                                        >
                                            <i className="bi bi-chevron-left"></i> Sebelumnya
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleSave}
                                            disabled={isSaving || isRaporLocked}
                                            className={`px-4 py-2 text-white rounded-xl text-xs font-bold disabled:opacity-50 shadow-sm flex items-center gap-1 transition-all ${
                                                isDirty ? 'bg-amber-600 hover:bg-amber-700' : 'bg-teal-600 hover:bg-teal-700'
                                            }`}
                                        >
                                            <i className="bi bi-save2"></i> {isDirty ? 'Simpan*' : 'Simpan'}
                                        </button>
                                        <button
                                            type="button"
                                            disabled={safeStudentIdx >= filteredStudents.length - 1}
                                            onClick={() =>
                                                setActiveStudentIndex(Math.min(filteredStudents.length - 1, safeStudentIdx + 1))
                                            }
                                            className="px-4 py-2 bg-teal-50 text-teal-800 border border-teal-200 rounded-xl text-xs font-bold hover:bg-teal-100 disabled:opacity-40 flex items-center gap-1 transition-all"
                                        >
                                            Berikutnya <i className="bi bi-chevron-right"></i>
                                        </button>
                                    </div>
                                </div>
                            );
                        })()}
                </div>
            )}

            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 text-blue-800 text-xs flex gap-3">
                <i className="bi bi-info-circle-fill text-lg shrink-0"></i>
                <div>
                    <p className="font-bold mb-1">Tips Cepat Pengisian Nilai Wali Kelas:</p>
                    <ul className="list-disc pl-4 space-y-1">
                        <li>
                            <strong>Navigasi ala Excel:</strong> Tekan <code>Enter</code> untuk turun ke santri berikutnya, atau gunakan tombol panah <code>↑ ↓ ← →</code> untuk berpindah kolom.
                        </li>
                        <li>
                            <strong>Paste Blok dari Excel:</strong> Salin beberapa baris &amp; kolom sekaligus di Microsoft Excel / Google Sheets, klik sel awal di tabel ini, lalu tekan <code>Ctrl+V</code>.
                        </li>
                        <li>
                            <strong>Auto-Draf Aman:</strong> Ketikan Anda otomatis dicadangkan di perangkat ini sebelum menekan tombol <strong>Simpan Nilai</strong>.
                        </li>
                    </ul>
                </div>
            </div>

            {/* Modal Import Excel Rapor */}
            <RaporExcelImportModal
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                template={template}
                santriList={studentsInRombel}
                rombelName={activeRombelName}
                tahunAjaran={tahunAjaran}
                semester={semester}
                onImportSuccess={handleExcelImportSuccess}
            />

            {/* Modal Sinkronisasi Presensi Otomatis */}
            <RaporPresensiSyncModal
                isOpen={isPresensiModalOpen}
                onClose={() => setIsPresensiModalOpen(false)}
                santriList={studentsInRombel}
                rombelName={activeRombelName}
                tahunAjaran={tahunAjaran}
                semester={semester}
                settings={settings}
                onSyncSuccess={handlePresensiSyncSuccess}
            />

            {/* Modal Sinkronisasi Tahfizh Otomatis */}
            <RaporTahfizhSyncModal
                isOpen={isTahfizhModalOpen}
                onClose={() => setIsTahfizhModalOpen(false)}
                santriList={studentsInRombel}
                rombelName={activeRombelName}
                tahunAjaran={tahunAjaran}
                semester={semester}
                settings={settings}
                inputKeys={inputKeys}
                onSyncSuccess={handleTahfizhSyncSuccess}
            />

            {/* Modal Asisten Isi Cepat Catatan & Keputusan */}
            <RaporBulkHelperModal
                isOpen={isBulkHelperOpen}
                onClose={() => setIsBulkHelperOpen(false)}
                santriList={studentsInRombel}
                inputKeys={inputKeys}
                currentGrades={grades}
                onApplyBulkUpdates={handleApplyBulkHelper}
            />

            {/* Modal Import WA & Cloud Script */}
            <RaporWaCloudImportModal
                isOpen={isWaCloudModalOpen}
                onClose={() => setIsWaCloudModalOpen(false)}
                onSuccess={() => {
                    setRefreshCounter(c => c + 1);
                    showToast('Data rapor berhasil diperbarui.', 'success');
                }}
            />

            {/* Floating Save Action Bar (Muncul Melayang Saat Ada Perubahan Belum Disimpan) */}
            {isDirty && !isRaporLocked && (
                <div className="fixed bottom-6 right-6 z-40 bg-slate-900/95 text-white backdrop-blur-md px-4 py-3 rounded-2xl shadow-2xl border border-slate-700/60 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-3 select-none">
                    <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse"></span>
                        <span className="text-xs font-bold text-slate-200 hidden sm:inline">Perubahan Belum Disimpan</span>
                    </div>
                    <div className="h-4 w-px bg-slate-700 hidden sm:block"></div>
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={isSaving}
                        className="bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-xs px-3.5 py-1.5 rounded-xl shadow-xs transition-all flex items-center gap-1.5 disabled:opacity-50 active:scale-95 cursor-pointer"
                    >
                        {isSaving ? (
                            <span className="w-3.5 h-3.5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></span>
                        ) : (
                            <i className="bi bi-floppy"></i>
                        )}
                        <span>Simpan Nilai (Ctrl+S)</span>
                    </button>
                </div>
            )}

            {/* Modal Popover Ketik Catatan Panjang */}
            {expandedTextModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
                    <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 flex flex-col">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                            <div>
                                <h3 className="text-sm font-bold text-slate-900">
                                    {expandedTextModal.label || expandedTextModal.key}
                                </h3>
                                <p className="text-xs text-slate-500 font-semibold">
                                    Santri: {expandedTextModal.studentName}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setExpandedTextModal(null)}
                                className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center"
                            >
                                <i className="bi bi-x-lg"></i>
                            </button>
                        </div>
                        <div className="py-4 space-y-2">
                            <textarea
                                rows={6}
                                value={expandedTextModal.value}
                                onChange={e => setExpandedTextModal({ ...expandedTextModal, value: e.target.value })}
                                className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-teal-500 outline-none leading-relaxed"
                                placeholder="Ketik catatan lengkap, deskripsi capaian, atau keputusan wali kelas di sini..."
                                autoFocus
                            />
                            <div className="text-[11px] text-slate-400 text-right">
                                {expandedTextModal.value.length} karakter
                            </div>
                        </div>
                        <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setExpandedTextModal(null)}
                                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                            >
                                Batal
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    handleInputChange(expandedTextModal.studentId, expandedTextModal.key, expandedTextModal.value);
                                    setExpandedTextModal(null);
                                }}
                                className="px-4 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-xs"
                            >
                                Terapkan Catatan
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
