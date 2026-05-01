
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Santri, Alamat } from '../../../types';
import { useAppContext } from '../../../AppContext';
import { useSantriContext } from '../../../contexts/SantriContext';
import { generateNis } from '../../../utils/nisGenerator';
import { loadXLSX } from '../../../utils/lazyClientLibs';

interface BulkSantriEditorProps {
    isOpen: boolean;
    onClose: () => void;
    mode: 'add' | 'edit';
    initialData?: Santri[]; // Only for edit mode
    onSave: (data: Partial<Santri>[]) => Promise<void>;
}

type EditableRow = Partial<Santri> & { tempId: number };
type GridCellPosition = { rowIndex: number; colIndex: number } | null;
type AuditLogItem = { id: number; time: string; action: string; detail: string };
type BulkSantriDraftPayload = {
    mode: 'add' | 'edit';
    savedAt: number;
    rows: EditableRow[];
    gridFilter: {
        nama: string;
        nis: string;
        status: string;
        jenjangId: string;
        kelasId: string;
        rombelId: string;
    };
    importPreset: 'auto' | 'internal' | 'emis' | 'simple';
    validationProfile: 'basic' | 'strict';
};

export const BulkSantriEditor: React.FC<BulkSantriEditorProps> = ({ isOpen, onClose, mode, initialData, onSave }) => {
    const { settings, showToast, showAlert } = useAppContext();
    const { santriList } = useSantriContext();
    const [rows, setRows] = useState<EditableRow[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [isPasteModalOpen, setIsPasteModalOpen] = useState(false);
    const [pasteText, setPasteText] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const tableRef = useRef<HTMLTableElement>(null);
    const [sortField, setSortField] = useState<'namaLengkap' | 'nis' | 'status' | 'tanggalMasuk' | null>(null);
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
    const [anchorCell, setAnchorCell] = useState<GridCellPosition>(null);
    const [activeCell, setActiveCell] = useState<GridCellPosition>(null);
    const [lastJumpedErrorKey, setLastJumpedErrorKey] = useState<string | null>(null);
    const [isDesktopViewport, setIsDesktopViewport] = useState(
        typeof window !== 'undefined' ? window.matchMedia('(min-width: 768px)').matches : true
    );
    const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
    const undoStackRef = useRef<EditableRow[][]>([]);
    const redoStackRef = useRef<EditableRow[][]>([]);
    const [historyVersion, setHistoryVersion] = useState(0);
    const [showAuditTrail, setShowAuditTrail] = useState(false);
    const [showAdvancedPanel, setShowAdvancedPanel] = useState(false);
    const [showFilterPanel, setShowFilterPanel] = useState(true);
    const [importPreset, setImportPreset] = useState<'auto' | 'internal' | 'emis' | 'simple'>('auto');
    const [validationProfile, setValidationProfile] = useState<'basic' | 'strict'>('basic');
    const [hasDraft, setHasDraft] = useState(false);
    const [lastDraftSavedAt, setLastDraftSavedAt] = useState<number | null>(null);
    const [gridFilter, setGridFilter] = useState({
        nama: '',
        nis: '',
        status: '',
        jenjangId: '',
        kelasId: '',
        rombelId: '',
    });
    const hasActiveGridFilter = useMemo(
        () => Object.values(gridFilter).some((value) => String(value).trim() !== ''),
        [gridFilter]
    );
    const draftStorageKey = useMemo(() => `esantri:bulk-santri-draft:${mode}`, [mode]);

    const cloneRows = (source: EditableRow[]): EditableRow[] => source.map((row) => ({
        ...row,
        alamat: row.alamat ? { ...row.alamat } : row.alamat,
    }));

    const appendAuditLog = (action: string, detail: string) => {
        setAuditLogs(prev => [{ id: Date.now() + Math.random(), time: new Date().toLocaleTimeString('id-ID'), action, detail }, ...prev].slice(0, 20));
    };

    const canUndo = undoStackRef.current.length > 0;
    const canRedo = redoStackRef.current.length > 0;

    const applyRowsMutation = (action: string, detail: string, mutator: (draft: EditableRow[]) => EditableRow[]) => {
        setRows(prev => {
            const prevSnapshot = cloneRows(prev);
            const nextRows = mutator(cloneRows(prev));
            undoStackRef.current.push(prevSnapshot);
            if (undoStackRef.current.length > 30) undoStackRef.current.shift();
            redoStackRef.current = [];
            setHistoryVersion(v => v + 1);
            appendAuditLog(action, detail);
            return nextRows;
        });
    };

    const handleUndo = () => {
        if (!undoStackRef.current.length) return;
        setRows(prev => {
            const previous = undoStackRef.current.pop()!;
            redoStackRef.current.push(cloneRows(prev));
            setHistoryVersion(v => v + 1);
            appendAuditLog('Undo', 'Mengembalikan perubahan terakhir');
            return cloneRows(previous);
        });
    };

    const handleRedo = () => {
        if (!redoStackRef.current.length) return;
        setRows(prev => {
            const next = redoStackRef.current.pop()!;
            undoStackRef.current.push(cloneRows(prev));
            setHistoryVersion(v => v + 1);
            appendAuditLog('Redo', 'Menerapkan ulang perubahan');
            return cloneRows(next);
        });
    };

    const handleResetGridFilter = () => {
        if (!hasActiveGridFilter) return;
        setGridFilter({
            nama: '',
            nis: '',
            status: '',
            jenjangId: '',
            kelasId: '',
            rombelId: '',
        });
        appendAuditLog('Reset Filter', 'Mengembalikan filter grid ke default');
        showToast('Filter berhasil direset.', 'success');
    };

    const refreshDraftState = () => {
        const raw = localStorage.getItem(draftStorageKey);
        if (!raw) {
            setHasDraft(false);
            setLastDraftSavedAt(null);
            return;
        }
        try {
            const parsed = JSON.parse(raw) as BulkSantriDraftPayload;
            setHasDraft(parsed.mode === mode && Array.isArray(parsed.rows));
            setLastDraftSavedAt(parsed.savedAt || null);
        } catch {
            setHasDraft(false);
            setLastDraftSavedAt(null);
        }
    };

    const handleSaveDraft = () => {
        try {
            const payload: BulkSantriDraftPayload = {
                mode,
                savedAt: Date.now(),
                rows: cloneRows(rows),
                gridFilter,
                importPreset,
                validationProfile,
            };
            localStorage.setItem(draftStorageKey, JSON.stringify(payload));
            refreshDraftState();
            appendAuditLog('Simpan Draft', `Menyimpan draft ${rows.length} baris`);
            showToast('Draft berhasil disimpan.', 'success');
        } catch {
            showToast('Gagal menyimpan draft.', 'error');
        }
    };

    const handleLoadDraft = () => {
        try {
            const raw = localStorage.getItem(draftStorageKey);
            if (!raw) {
                showToast('Draft tidak ditemukan.', 'info');
                return;
            }
            const parsed = JSON.parse(raw) as BulkSantriDraftPayload;
            if (parsed.mode !== mode || !Array.isArray(parsed.rows)) {
                showToast('Draft tidak cocok dengan mode editor ini.', 'error');
                return;
            }
            undoStackRef.current = [];
            redoStackRef.current = [];
            setRows(cloneRows(parsed.rows));
            setGridFilter(parsed.gridFilter || {
                nama: '',
                nis: '',
                status: '',
                jenjangId: '',
                kelasId: '',
                rombelId: '',
            });
            setImportPreset(parsed.importPreset || 'auto');
            setValidationProfile(parsed.validationProfile || 'basic');
            setHistoryVersion(v => v + 1);
            appendAuditLog('Muat Draft', `Memuat draft ${parsed.rows.length} baris`);
            showToast('Draft berhasil dimuat.', 'success');
            refreshDraftState();
        } catch {
            showToast('Draft rusak/tidak valid.', 'error');
        }
    };

    const handleDeleteDraft = () => {
        localStorage.removeItem(draftStorageKey);
        refreshDraftState();
        appendAuditLog('Hapus Draft', 'Menghapus draft tersimpan');
        showToast('Draft dihapus.', 'success');
    };

    // Helper to convert YYYY-MM-DD to DD/MM/YYYY
    const toDisplayDate = (isoDate?: string) => {
        if (!isoDate) return '';
        if (/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) {
            const [y, m, d] = isoDate.split('-');
            return `${d}/${m}/${y}`;
        }
        return isoDate;
    };

    // Helper to convert DD/MM/YYYY to YYYY-MM-DD
    const toStorageDate = (val?: string) => {
        if (!val) return '';
        // Match d/m/yyyy or d-m-yyyy
        const match = val.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
        if (match) {
            const [_, d, m, y] = match;
            return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
        }
        return val;
    };

    const normalizeHeader = (header: string) =>
        header.toLowerCase().replace(/[\s\-./()]/g, '').replace(/_/g, '');

    const headerMap: Record<string, string> = {
        namalengkap: 'namaLengkap',
        fullname: 'namaLengkap',
        name: 'namaLengkap',
        namahijrah: 'namaHijrah',
        panggilan: 'namaHijrah',
        nis: 'nis',
        nik: 'nik',
        nisn: 'nisn',
        jeniskelamin: 'jenisKelamin',
        gender: 'jenisKelamin',
        sex: 'jenisKelamin',
        lp: 'jenisKelamin',
        tempatlahir: 'tempatLahir',
        tgllahir: 'tanggalLahir',
        tanggallahir: 'tanggalLahir',
        tanggalmasuk: 'tanggalMasuk',
        tgmasuk: 'tanggalMasuk',
        kewarganegaraan: 'kewarganegaraan',
        statushubungankeluarga: 'statusKeluarga',
        statuskeluarga: 'statusKeluarga',
        jenissantri: 'jenisSantri',
        statussantri: 'status',
        status: 'status',
        berkebutuhankhusus: 'berkebutuhanKhusus',
        jenjang: 'jenjangId',
        jenjangid: 'jenjangId',
        kelas: 'kelasId',
        kelasid: 'kelasId',
        rombel: 'rombelId',
        rombelid: 'rombelId',
        alamat: 'alamat.detail',
        alamatdetail: 'alamat.detail',
        jalan: 'alamat.detail',
        desa: 'alamat.desaKelurahan',
        desakelurahan: 'alamat.desaKelurahan',
        kelurahan: 'alamat.desaKelurahan',
        kecamatan: 'alamat.kecamatan',
        kabupaten: 'alamat.kabupatenKota',
        kota: 'alamat.kabupatenKota',
        kabupatenkota: 'alamat.kabupatenKota',
        provinsi: 'alamat.provinsi',
        kodepos: 'alamat.kodePos',
        namaayah: 'namaAyah',
        statusayah: 'statusAyah',
        tempatlahirayah: 'tempatLahirAyah',
        tanggallahirayah: 'tanggalLahirAyah',
        nikayah: 'nikAyah',
        pendidikanayah: 'pendidikanAyah',
        pekerjaanayah: 'pekerjaanAyah',
        penghasilanayah: 'penghasilanAyah',
        hpayah: 'teleponAyah',
        teleponayah: 'teleponAyah',
        namaibu: 'namaIbu',
        statusibu: 'statusIbu',
        tempatlahiribu: 'tempatLahirIbu',
        tanggallahiribu: 'tanggalLahirIbu',
        nikibu: 'nikIbu',
        pendidikanibu: 'pendidikanIbu',
        pekerjaanibu: 'pekerjaanIbu',
        penghasilanibu: 'penghasilanIbu',
        hpibu: 'teleponIbu',
        teleponibu: 'teleponIbu',
        namawali: 'namaWali',
        hubunganwali: 'statusWali',
        statuswali: 'statusWali',
        statushidupwali: 'statusHidupWali',
        pendidikanwali: 'pendidikanWali',
        pekerjaanwali: 'pekerjaanWali',
        penghasilanwali: 'penghasilanWali',
        hpwali: 'teleponWali',
        teleponwali: 'teleponWali',
    };

    const importPresetHeaderMaps: Record<'internal' | 'emis' | 'simple', Record<string, string>> = {
        internal: {
            namasantri: 'namaLengkap',
            namalengkap: 'namaLengkap',
            namahijrah: 'namaHijrah',
            nis: 'nis',
            nik: 'nik',
            jenjang: 'jenjangId',
            kelas: 'kelasId',
            rombel: 'rombelId',
            tanggalmasuk: 'tanggalMasuk',
            statussantri: 'status',
        },
        emis: {
            namasiswa: 'namaLengkap',
            nama: 'namaLengkap',
            nis: 'nis',
            nisn: 'nisn',
            nik: 'nik',
            jeniskelamin: 'jenisKelamin',
            tanggallahir: 'tanggalLahir',
            tempatlahir: 'tempatLahir',
            kelas: 'kelasId',
            rombel: 'rombelId',
            tanggalmasuk: 'tanggalMasuk',
            status: 'status',
            alamat: 'alamat.detail',
        },
        simple: {
            nama: 'namaLengkap',
            namalengkap: 'namaLengkap',
            nis: 'nis',
            jenjang: 'jenjangId',
            kelas: 'kelasId',
            rombel: 'rombelId',
            status: 'status',
        },
    };

    const getMappedHeaderField = (normalizedHeader: string): string | undefined => {
        if (importPreset === 'auto') return headerMap[normalizedHeader];
        return importPresetHeaderMaps[importPreset][normalizedHeader] || headerMap[normalizedHeader];
    };

    const toDisplayDateFromImport = (input: unknown): string => {
        if (input === undefined || input === null || input === '') return '';
        if (typeof input === 'number' && Number.isFinite(input) && input > 0) {
            const excelEpoch = Date.UTC(1899, 11, 30);
            const date = new Date(excelEpoch + input * 86400000);
            return `${String(date.getUTCDate()).padStart(2, '0')}/${String(date.getUTCMonth() + 1).padStart(2, '0')}/${date.getUTCFullYear()}`;
        }
        if (input instanceof Date) {
            return `${String(input.getDate()).padStart(2, '0')}/${String(input.getMonth() + 1).padStart(2, '0')}/${input.getFullYear()}`;
        }
        const raw = String(input).trim();
        if (!raw) return '';
        if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return toDisplayDate(raw.slice(0, 10));
        if (/^\d{1,2}[\/-]\d{1,2}[\/-]\d{4}$/.test(raw)) {
            const [d, m, y] = raw.split(/[\/-]/);
            return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`;
        }
        const parsed = new Date(raw);
        if (!Number.isNaN(parsed.getTime())) return toDisplayDate(parsed.toISOString().slice(0, 10));
        return '';
    };

    const findIdByNameOrId = (
        value: unknown,
        source: Array<{ id: number; nama: string }>
    ): number => {
        const raw = String(value ?? '').trim();
        if (!raw) return 0;
        const asId = Number(raw);
        if (Number.isInteger(asId) && source.some(item => item.id === asId)) return asId;
        const byName = source.find(item => item.nama.toLowerCase() === raw.toLowerCase());
        return byName?.id || 0;
    };

    const mapImportedObjectsToRows = (data: any[]): EditableRow[] => {
        return data.map((item: any, idx: number) => {
            const empty = createEmptyRow(idx);
            const normalizedRow: Record<string, any> = {};

            Object.keys(item).forEach((header) => {
                const mappedKey = getMappedHeaderField(normalizeHeader(header));
                if (!mappedKey) return;
                normalizedRow[mappedKey] = item[header];
            });

            const nama = String(normalizedRow.namaLengkap || '').trim();
            if (!nama) return null;

            const jenjangId = findIdByNameOrId(normalizedRow.jenjangId, settings.jenjang);
            const kelasSource = jenjangId ? settings.kelas.filter(k => k.jenjangId === jenjangId) : settings.kelas;
            const kelasId = findIdByNameOrId(normalizedRow.kelasId, kelasSource);
            const rombelSource = kelasId ? settings.rombel.filter(r => r.kelasId === kelasId) : settings.rombel;
            const rombelId = findIdByNameOrId(normalizedRow.rombelId, rombelSource);
            const rawGender = String(normalizedRow.jenisKelamin || '').trim().toLowerCase();

            return {
                ...empty,
                namaLengkap: nama,
                namaHijrah: String(normalizedRow.namaHijrah || ''),
                nis: String(normalizedRow.nis || ''),
                nik: String(normalizedRow.nik || ''),
                nisn: String(normalizedRow.nisn || ''),
                jenisKelamin: rawGender.startsWith('p') || rawGender === 'f' ? 'Perempuan' : 'Laki-laki',
                tempatLahir: String(normalizedRow.tempatLahir || ''),
                tanggalLahir: toDisplayDateFromImport(normalizedRow.tanggalLahir),
                tanggalMasuk: toDisplayDateFromImport(normalizedRow.tanggalMasuk) || empty.tanggalMasuk,
                kewarganegaraan: String(normalizedRow.kewarganegaraan || empty.kewarganegaraan),
                statusKeluarga: String(normalizedRow.statusKeluarga || ''),
                jenisSantri: String(normalizedRow.jenisSantri || empty.jenisSantri),
                status: String(normalizedRow.status || empty.status) as any,
                berkebutuhanKhusus: String(normalizedRow.berkebutuhanKhusus || ''),
                jenjangId,
                kelasId,
                rombelId,
                alamat: {
                    ...empty.alamat,
                    detail: String(normalizedRow['alamat.detail'] || ''),
                    desaKelurahan: String(normalizedRow['alamat.desaKelurahan'] || ''),
                    kecamatan: String(normalizedRow['alamat.kecamatan'] || ''),
                    kabupatenKota: String(normalizedRow['alamat.kabupatenKota'] || ''),
                    provinsi: String(normalizedRow['alamat.provinsi'] || ''),
                    kodePos: String(normalizedRow['alamat.kodePos'] || '')
                },
                namaAyah: String(normalizedRow.namaAyah || ''),
                statusAyah: String(normalizedRow.statusAyah || ''),
                tempatLahirAyah: String(normalizedRow.tempatLahirAyah || ''),
                tanggalLahirAyah: toDisplayDateFromImport(normalizedRow.tanggalLahirAyah),
                nikAyah: String(normalizedRow.nikAyah || ''),
                pendidikanAyah: String(normalizedRow.pendidikanAyah || ''),
                pekerjaanAyah: String(normalizedRow.pekerjaanAyah || ''),
                penghasilanAyah: String(normalizedRow.penghasilanAyah || ''),
                teleponAyah: String(normalizedRow.teleponAyah || ''),
                namaIbu: String(normalizedRow.namaIbu || ''),
                statusIbu: String(normalizedRow.statusIbu || ''),
                tempatLahirIbu: String(normalizedRow.tempatLahirIbu || ''),
                tanggalLahirIbu: toDisplayDateFromImport(normalizedRow.tanggalLahirIbu),
                nikIbu: String(normalizedRow.nikIbu || ''),
                pendidikanIbu: String(normalizedRow.pendidikanIbu || ''),
                pekerjaanIbu: String(normalizedRow.pekerjaanIbu || ''),
                penghasilanIbu: String(normalizedRow.penghasilanIbu || ''),
                teleponIbu: String(normalizedRow.teleponIbu || ''),
                namaWali: String(normalizedRow.namaWali || ''),
                statusWali: String(normalizedRow.statusWali || ''),
                statusHidupWali: String(normalizedRow.statusHidupWali || ''),
                pendidikanWali: String(normalizedRow.pendidikanWali || ''),
                pekerjaanWali: String(normalizedRow.pekerjaanWali || ''),
                penghasilanWali: String(normalizedRow.penghasilanWali || ''),
                teleponWali: String(normalizedRow.teleponWali || ''),
            } as EditableRow;
        }).filter(Boolean) as EditableRow[];
    };

    const mergedRows = useMemo(() => {
        const nameFilter = gridFilter.nama.trim().toLowerCase();
        const nisFilter = gridFilter.nis.trim().toLowerCase();

        const filtered = rows.filter((row) => {
            if (nameFilter && !String(row.namaLengkap || '').toLowerCase().includes(nameFilter)) return false;
            if (nisFilter && !String(row.nis || '').toLowerCase().includes(nisFilter)) return false;
            if (gridFilter.status && String(row.status || '') !== gridFilter.status) return false;
            if (gridFilter.jenjangId && Number(row.jenjangId || 0) !== Number(gridFilter.jenjangId)) return false;
            if (gridFilter.kelasId && Number(row.kelasId || 0) !== Number(gridFilter.kelasId)) return false;
            if (gridFilter.rombelId && Number(row.rombelId || 0) !== Number(gridFilter.rombelId)) return false;
            return true;
        });

        if (!sortField) return filtered;

        return [...filtered].sort((a, b) => {
            const av = String((a as any)[sortField] || '');
            const bv = String((b as any)[sortField] || '');
            const result = av.localeCompare(bv, 'id', { numeric: true, sensitivity: 'base' });
            return sortDirection === 'asc' ? result : -result;
        });
    }, [rows, gridFilter, sortField, sortDirection]);

    useEffect(() => {
        const media = window.matchMedia('(min-width: 768px)');
        const handleChange = () => setIsDesktopViewport(media.matches);
        handleChange();
        media.addEventListener('change', handleChange);
        return () => media.removeEventListener('change', handleChange);
    }, []);

    useEffect(() => {
        setShowFilterPanel(isDesktopViewport);
    }, [isDesktopViewport]);

    useEffect(() => {
        const table = tableRef.current;
        if (!table) return;

        table.querySelectorAll('td[data-grid-selected="true"]').forEach((cell) => {
            const td = cell as HTMLTableCellElement;
            td.dataset.gridSelected = 'false';
            td.style.boxShadow = '';
            td.style.outline = '';
        });

        if (!anchorCell || !activeCell) return;

        const rowStart = Math.min(anchorCell.rowIndex, activeCell.rowIndex);
        const rowEnd = Math.max(anchorCell.rowIndex, activeCell.rowIndex);
        const colStart = Math.min(anchorCell.colIndex, activeCell.colIndex);
        const colEnd = Math.max(anchorCell.colIndex, activeCell.colIndex);

        table.querySelectorAll('tbody tr[data-row-index]').forEach((rowEl) => {
            const rowIndex = Number((rowEl as HTMLTableRowElement).dataset.rowIndex || '-1');
            if (rowIndex < rowStart || rowIndex > rowEnd) return;

            Array.from((rowEl as HTMLTableRowElement).cells).forEach((cell, visibleColIndex) => {
                const logicalColIndex = isDesktopViewport ? visibleColIndex : visibleColIndex + 1;
                if (logicalColIndex < colStart || logicalColIndex > colEnd) return;
                const td = cell as HTMLTableCellElement;
                td.dataset.gridSelected = 'true';
                td.style.boxShadow = 'inset 0 0 0 1px rgba(13, 148, 136, 0.45)';
                td.style.outline = '1px solid rgba(13, 148, 136, 0.2)';
            });
        });
    }, [anchorCell, activeCell, mergedRows, isDesktopViewport]);

    const toggleSort = (field: 'namaLengkap' | 'nis' | 'status' | 'tanggalMasuk') => {
        if (sortField === field) {
            setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
            return;
        }
        setSortField(field);
        setSortDirection('asc');
    };

    useEffect(() => {
        if (isOpen) {
            undoStackRef.current = [];
            redoStackRef.current = [];
            setHistoryVersion(v => v + 1);
            setAuditLogs([]);
            if (mode === 'edit' && initialData) {
                setRows(initialData.map(s => ({ 
                    ...s, 
                    tempId: s.id,
                    tanggalLahir: toDisplayDate(s.tanggalLahir),
                    tanggalMasuk: toDisplayDate(s.tanggalMasuk),
                    tanggalLahirAyah: toDisplayDate(s.tanggalLahirAyah),
                    tanggalLahirIbu: toDisplayDate(s.tanggalLahirIbu),
                    tanggalLahirWali: toDisplayDate(s.tanggalLahirWali),
                })));
            } else {
                // Mode Add: Start with 3 empty rows
                const initialRows = Array.from({ length: 3 }).map((_, i) => createEmptyRow(i));
                setRows(initialRows);
            }
            appendAuditLog('Init', mode === 'add' ? 'Memulai tambah massal' : 'Memulai edit massal');
            refreshDraftState();
        }
    }, [isOpen, mode, initialData]);

    const createEmptyRow = (index: number): EditableRow => ({
        tempId: Date.now() + index,
        namaLengkap: '',
        namaHijrah: '',
        nis: '',
        nik: '',
        nisn: '',
        jenisKelamin: 'Laki-laki',
        tempatLahir: '',
        tanggalLahir: '',
        kewarganegaraan: 'WNI',
        jenisSantri: 'Mondok - Baru',
        statusKeluarga: undefined,
        status: 'Aktif',
        jenjangId: 0,
        kelasId: 0,
        rombelId: 0,
        tanggalMasuk: toDisplayDate(new Date().toISOString().split('T')[0]),
        alamat: { 
            detail: '',
            desaKelurahan: '',
            kecamatan: '',
            kabupatenKota: '',
            provinsi: '',
            kodePos: '' 
        },
        // Data Ayah
        namaAyah: '',
        statusAyah: undefined,
        nikAyah: '',
        pendidikanAyah: '',
        pekerjaanAyah: '',
        penghasilanAyah: '',
        teleponAyah: '',
        tanggalLahirAyah: '',
        
        // Data Ibu
        namaIbu: '',
        statusIbu: undefined,
        nikIbu: '',
        pendidikanIbu: '',
        pekerjaanIbu: '',
        penghasilanIbu: '',
        teleponIbu: '',
        tanggalLahirIbu: '',

        // Data Wali
        namaWali: '',
        statusWali: undefined,
        statusHidupWali: undefined,
        pendidikanWali: '',
        pekerjaanWali: '',
        penghasilanWali: '',
        teleponWali: '',
        tanggalLahirWali: '',
        
        anakKe: undefined,
        jumlahSaudara: undefined
    });

    const handleAddRow = () => {
        applyRowsMutation('Tambah Baris', 'Menambahkan satu baris kosong', prev => [...prev, createEmptyRow(prev.length)]);
    };

    const handleRemoveRow = (tempId: number) => {
        applyRowsMutation('Hapus Baris', 'Menghapus satu baris dari grid', prev => prev.filter(r => r.tempId !== tempId));
    };

    const updateRow = (tempId: number, field: string, value: any) => {
        applyRowsMutation('Edit Sel', `Memperbarui field ${field}`, prev => prev.map(row => {
            if (row.tempId !== tempId) return row;

            // Handle Nested Address Updates
            if (field.startsWith('alamat.')) {
                const addressField = field.split('.')[1];
                // Ensure alamat exists and satisfies the Alamat type structure
                const currentAlamat: Alamat = row.alamat || { detail: '' };
                
                return { 
                    ...row, 
                    alamat: { 
                        ...currentAlamat, 
                        [addressField]: value 
                    } 
                };
            }

            // Cascading Logic for Dropdowns
            if (field === 'jenjangId') {
                return { ...row, jenjangId: Number(value), kelasId: 0, rombelId: 0 };
            }
            if (field === 'kelasId') {
                return { ...row, kelasId: Number(value), rombelId: 0 };
            }
            if (field === 'rombelId') {
                return { ...row, rombelId: Number(value) };
            }
            
            // Number conversions
            if (['anakKe', 'jumlahSaudara'].includes(field)) {
                return { ...row, [field]: value ? parseInt(value) : undefined };
            }

            return { ...row, [field]: value };
        }));
    };

    const handleGenerateNis = (tempId: number) => {
        const row = rows.find(r => r.tempId === tempId);
        if (!row) return;

        try {
            // Prepare a temporary santri object for the generator
            const tempSantri: Santri = {
                ...row,
                id: mode === 'edit' ? (row.id || 0) : row.tempId,
                tanggalMasuk: toStorageDate(row.tanggalMasuk),
                tanggalLahir: toStorageDate(row.tanggalLahir),
            } as Santri;

            const newNis = generateNis(settings, santriList, tempSantri);
            updateRow(tempId, 'nis', newNis);
        } catch (error) {
            showAlert('Gagal Membuat NIS', (error as Error).message);
        }
    };

    const handleGenerateAllNis = () => {
        let currentSantriList = [...santriList];
        const newRows = [...rows];
        let successCount = 0;
        let errorMsg = '';

        for (let i = 0; i < newRows.length; i++) {
            const row = newRows[i];
            if (!row.namaLengkap) continue;

            try {
                const tempSantri: Santri = {
                    ...row,
                    id: mode === 'edit' ? (row.id || 0) : row.tempId,
                    tanggalMasuk: toStorageDate(row.tanggalMasuk),
                    tanggalLahir: toStorageDate(row.tanggalLahir),
                } as Santri;

                const newNis = generateNis(settings, currentSantriList, tempSantri);
                newRows[i] = { ...row, nis: newNis };
                
                // Add to temporary list to prevent duplicates within the bulk batch
                currentSantriList.push({ ...tempSantri, nis: newNis });
                successCount++;
            } catch (error) {
                errorMsg = (error as Error).message;
            }
        }

        applyRowsMutation('Generate NIS', 'Generate NIS untuk semua baris valid', () => newRows);
        if (successCount > 0) {
            showToast(`${successCount} NIS berhasil dibuat otomatis`, 'success');
        }
        if (errorMsg && successCount === 0) {
            showAlert('Gagal Membuat NIS', errorMsg);
        }
    };

    const handleSave = async () => {
        if (invalidRowCount > 0) {
            showToast(`Masih ada ${invalidRowCount} baris dengan data tidak valid. Perbaiki sel berwarna merah terlebih dahulu.`, 'error');
            appendAuditLog('Simpan Ditolak', `Masih ada ${invalidRowCount} baris invalid`);
            return;
        }

        // Basic Validation
        const validRows = rows.filter(r => r.namaLengkap?.trim());

        if (validRows.length === 0) {
            showToast('Tidak ada data valid (Nama Lengkap wajib diisi) untuk disimpan.', 'error');
            return;
        }

        setIsSaving(true);
        try {
            // Clean up tempId and format dates back to YYYY-MM-DD before sending back
            const cleanData = validRows.map(({ tempId, ...rest }) => ({
                ...rest,
                tanggalLahir: toStorageDate(rest.tanggalLahir),
                tanggalMasuk: toStorageDate(rest.tanggalMasuk),
                tanggalLahirAyah: toStorageDate(rest.tanggalLahirAyah),
                tanggalLahirIbu: toStorageDate(rest.tanggalLahirIbu),
                tanggalLahirWali: toStorageDate(rest.tanggalLahirWali),
            }));
            appendAuditLog('Simpan', `Menyimpan ${cleanData.length} baris`);
            await onSave(cleanData);
            localStorage.removeItem(draftStorageKey);
            refreshDraftState();
            onClose();
        } catch (error) {
            showToast('Gagal menyimpan data.', 'error');
            appendAuditLog('Simpan Gagal', 'Terjadi error saat menyimpan data');
        } finally {
            setIsSaving(false);
        }
    };

    const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                const XLSX = await loadXLSX();
                const bstr = evt.target?.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const data = XLSX.utils.sheet_to_json(ws, { defval: '' });

                if (data.length === 0) {
                    showToast('File kosong atau format tidak dikenali.', 'error');
                    return;
                }
                const newImportedRows = mapImportedObjectsToRows(data);

                if (newImportedRows.length > 0) {
                    applyRowsMutation('Smart Import', `Impor ${newImportedRows.length} baris dari file`, prev => mode === 'add' ? [...newImportedRows] : [...prev, ...newImportedRows]);
                    showToast(`${newImportedRows.length} data berhasil diimpor & dipetakan secara otomatis.`, 'success');
                } else {
                    showToast('Tidak ada data yang cocok untuk diimpor.', 'info');
                }
            } catch (err) {
                console.error(err);
                showToast('Gagal memproses file. Pastikan format Excel/CSV benar.', 'error');
            }
            if (fileInputRef.current) fileInputRef.current.value = '';
        };
        reader.readAsBinaryString(file);
    };

    const handlePasteSpreadsheet = () => {
        const raw = pasteText.trim();
        if (!raw) {
            showToast('Tempelkan data spreadsheet terlebih dahulu.', 'info');
            return;
        }

        const lines = raw.split(/\r?\n/).filter(Boolean);
        if (lines.length < 2) {
            showToast('Format paste tidak valid. Pastikan ada header dan minimal 1 baris data.', 'error');
            return;
        }

        const headers = lines[0].split('\t').map(h => h.trim());
        const objects = lines.slice(1).map((line) => {
            const values = line.split('\t');
            const rowObj: Record<string, string> = {};
            headers.forEach((header, idx) => {
                rowObj[header] = values[idx] ?? '';
            });
            return rowObj;
        });

        const pastedRows = mapImportedObjectsToRows(objects);
        if (pastedRows.length === 0) {
            showToast('Tidak ada baris valid yang bisa dipetakan dari hasil paste.', 'error');
            return;
        }

        applyRowsMutation('Paste Excel Modal', `Menempel ${pastedRows.length} baris dari modal paste`, prev => mode === 'add' ? pastedRows : [...prev, ...pastedRows]);
        setPasteText('');
        setIsPasteModalOpen(false);
        showToast(`${pastedRows.length} baris berhasil dipaste dari spreadsheet.`, 'success');
    };
    
    const pendidikanOptions = ['SD/Sederajat', 'SLTP/Sederajat', 'SLTA/Sederajat', 'Diploma', 'Sarjana (S1)', 'Pascasarjana (S2/S3)', 'Tidak Sekolah'];
    const statusHidupOptions = ['Hidup', 'Meninggal', 'Cerai'];
    const santriStatusOptions = ['Aktif', 'Hiatus', 'Lulus', 'Keluar/Pindah'];
    const penghasilanOptions = [
        'Kurang dari Rp. 1.000.000',
        'Rp. 1.000.000 - Rp. 2.000.000',
        'Lebih dari Rp. 2.000.000',
        'Lebih dari Rp. 5.000.000',
        'Tidak Berpenghasilan',
        'Lainnya',
    ];
    const displayDateRegex = /^(0?[1-9]|[12]\d|3[01])[\/-](0?[1-9]|1[0-2])[\/-]\d{4}$/;

    const rowValidationErrors = useMemo(() => {
        const errorsByRow: Record<number, Record<string, string>> = {};

        rows.forEach((row) => {
            const rowErrors: Record<string, string> = {};
            const namaLengkap = String(row.namaLengkap || '').trim();
            const nis = String(row.nis || '').trim();
            const nik = String(row.nik || '').trim();
            const tanggalLahir = String(row.tanggalLahir || '').trim();
            const tanggalMasuk = String(row.tanggalMasuk || '').trim();
            const status = String(row.status || '').trim();
            const jenjangId = Number(row.jenjangId || 0);
            const kelasId = Number(row.kelasId || 0);
            const rombelId = Number(row.rombelId || 0);

            if (!namaLengkap) rowErrors.namaLengkap = 'Nama lengkap wajib diisi.';
            if (nis && !/^\d+$/.test(nis)) rowErrors.nis = 'NIS hanya boleh angka.';
            if (nik && !/^\d{16}$/.test(nik)) rowErrors.nik = 'NIK harus 16 digit angka.';
            if (tanggalLahir && !displayDateRegex.test(tanggalLahir)) rowErrors.tanggalLahir = 'Format tanggal lahir harus dd/mm/yyyy.';
            if (!tanggalMasuk) rowErrors.tanggalMasuk = 'Tanggal masuk wajib diisi.';
            if (tanggalMasuk && !displayDateRegex.test(tanggalMasuk)) rowErrors.tanggalMasuk = 'Format tanggal masuk harus dd/mm/yyyy.';
            if (!santriStatusOptions.includes(status)) rowErrors.status = 'Status santri tidak valid.';
            if (!jenjangId) rowErrors.jenjangId = 'Jenjang wajib dipilih.';
            if (!kelasId) rowErrors.kelasId = 'Kelas wajib dipilih.';
            if (!rombelId) rowErrors.rombelId = 'Rombel wajib dipilih.';

            if (validationProfile === 'strict') {
                if (!nis) rowErrors.nis = 'NIS wajib diisi (Strict).';
                if (!nik) rowErrors.nik = 'NIK wajib diisi (Strict).';
                if (!tanggalLahir) rowErrors.tanggalLahir = 'Tanggal lahir wajib diisi (Strict).';
            }

            if (jenjangId && kelasId) {
                const kelasValid = settings.kelas.some(k => k.id === kelasId && k.jenjangId === jenjangId);
                if (!kelasValid) rowErrors.kelasId = 'Kelas tidak sesuai jenjang.';
            }
            if (kelasId && rombelId) {
                const rombelValid = settings.rombel.some(r => r.id === rombelId && r.kelasId === kelasId);
                if (!rombelValid) rowErrors.rombelId = 'Rombel tidak sesuai kelas.';
            }

            if (Object.keys(rowErrors).length > 0) {
                errorsByRow[row.tempId] = rowErrors;
            }
        });

        return errorsByRow;
    }, [rows, settings.kelas, settings.rombel, santriStatusOptions, validationProfile]);

    const invalidRowCount = useMemo(() => Object.keys(rowValidationErrors).length, [rowValidationErrors]);
    const qualitySummary = useMemo(() => {
        const validRows = rows.filter(row => !rowValidationErrors[row.tempId]).length;
        const countDuplicates = (values: string[]) => {
            const counts = new Map<string, number>();
            values.filter(Boolean).forEach((value) => {
                counts.set(value, (counts.get(value) || 0) + 1);
            });
            return Array.from(counts.entries()).reduce((acc, [, count]) => acc + (count > 1 ? count : 0), 0);
        };

        const duplicateNisRows = countDuplicates(rows.map(row => String(row.nis || '').trim()));
        const duplicateNikRows = countDuplicates(rows.map(row => String(row.nik || '').trim()));

        return {
            totalRows: rows.length,
            validRows,
            invalidRows: invalidRowCount,
            duplicateNisRows,
            duplicateNikRows,
        };
    }, [rows, rowValidationErrors, invalidRowCount]);

    const errorFieldPriority = ['namaLengkap', 'nis', 'nik', 'tanggalLahir', 'jenjangId', 'kelasId', 'rombelId', 'tanggalMasuk', 'status'] as const;
    const visibleErrorTargets = useMemo(() => {
        const targets: Array<{ key: string; tempId: number; rowIndex: number; field: (typeof errorFieldPriority)[number] }> = [];
        mergedRows.forEach((row, rowIndex) => {
            errorFieldPriority.forEach((field) => {
                if (!rowValidationErrors[row.tempId]?.[field]) return;
                targets.push({
                    key: `${row.tempId}:${field}`,
                    tempId: row.tempId,
                    rowIndex,
                    field,
                });
            });
        });
        return targets;
    }, [mergedRows, rowValidationErrors]);

    const getCellError = (tempId: number, field: string): string | undefined => rowValidationErrors[tempId]?.[field];

    const getCellInputClass = (tempId: number, field: string, baseClass: string): string => {
        const error = getCellError(tempId, field);
        if (!error) return baseClass;
        return `${baseClass} border-red-400 bg-red-50 focus:border-red-500 focus:ring-red-500`;
    };

    const handleJumpToNextError = () => {
        if (visibleErrorTargets.length === 0) {
            showToast('Tidak ada sel error pada baris yang sedang tampil.', 'info');
            return;
        }

        const currentIdx = visibleErrorTargets.findIndex(target => target.key === lastJumpedErrorKey);
        const nextIdx = currentIdx >= 0 ? (currentIdx + 1) % visibleErrorTargets.length : 0;
        const target = visibleErrorTargets[nextIdx];

        const cellTarget = tableRef.current?.querySelector(
            `tbody tr[data-row-index="${target.rowIndex}"] [data-grid-field="${target.field}"]`
        ) as HTMLElement | null;

        if (!cellTarget) {
            showToast('Sel error tidak ditemukan di tampilan saat ini.', 'info');
            return;
        }

        cellTarget.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
        if (typeof (cellTarget as HTMLInputElement).focus === 'function') {
            (cellTarget as HTMLInputElement).focus();
        }

        const colIndex = spreadsheetFieldByColumnIndex.indexOf(target.field);
        if (colIndex >= 0) {
            const pos = { rowIndex: target.rowIndex, colIndex };
            setAnchorCell(pos);
            setActiveCell(pos);
        }
        setLastJumpedErrorKey(target.key);
    };

    const handleAutoFixErrors = () => {
        if (invalidRowCount === 0) {
            showToast('Tidak ada error yang perlu diperbaiki otomatis.', 'info');
            return;
        }

        const todayDisplayDate = toDisplayDate(new Date().toISOString().slice(0, 10));
        let fixedCells = 0;

        applyRowsMutation('Auto Fix', 'Memperbaiki nilai ringan secara otomatis', prev => prev.map((row) => {
            const rowErrors = rowValidationErrors[row.tempId];
            if (!rowErrors) return row;

            let draft: EditableRow = {
                ...row,
                alamat: { ...(row.alamat || { detail: '' }) }
            };

            const applyIfChanged = (field: string, nextValue: any) => {
                const currentValue = field.startsWith('alamat.')
                    ? (draft.alamat as any)?.[field.split('.')[1]]
                    : (draft as any)[field];
                if (currentValue === nextValue) return;
                draft = applyValueToRowDraft(draft, field, nextValue);
                fixedCells += 1;
            };

            if (rowErrors.namaLengkap) {
                const normalized = String(draft.namaLengkap || '').replace(/\s+/g, ' ').trim();
                applyIfChanged('namaLengkap', normalized);
            }
            if (rowErrors.nis) {
                const normalized = String(draft.nis || '').replace(/\D/g, '');
                applyIfChanged('nis', normalized);
            }
            if (rowErrors.nik) {
                const normalized = String(draft.nik || '').replace(/\D/g, '').slice(0, 16);
                applyIfChanged('nik', normalized);
            }
            if (rowErrors.tanggalLahir) {
                const normalized = toDisplayDateFromImport(draft.tanggalLahir || '');
                applyIfChanged('tanggalLahir', normalized);
            }
            if (rowErrors.tanggalMasuk) {
                const normalized = toDisplayDateFromImport(draft.tanggalMasuk || '') || todayDisplayDate;
                applyIfChanged('tanggalMasuk', normalized);
            }
            if (rowErrors.status) {
                const normalized = normalizeStatusValue(String(draft.status || ''));
                applyIfChanged('status', normalized || 'Aktif');
            }
            if (rowErrors.jenjangId) {
                const normalized = findIdByNameOrId((draft as any).jenjangId, settings.jenjang);
                applyIfChanged('jenjangId', normalized);
            }
            if (rowErrors.kelasId) {
                const kelasSource = draft.jenjangId ? settings.kelas.filter(k => k.jenjangId === draft.jenjangId) : settings.kelas;
                const normalized = findIdByNameOrId((draft as any).kelasId, kelasSource);
                applyIfChanged('kelasId', normalized);
            }
            if (rowErrors.rombelId) {
                const rombelSource = draft.kelasId ? settings.rombel.filter(r => r.kelasId === draft.kelasId) : settings.rombel;
                const normalized = findIdByNameOrId((draft as any).rombelId, rombelSource);
                applyIfChanged('rombelId', normalized);
            }

            return draft;
        }));

        if (fixedCells > 0) {
            showToast(`${fixedCells} sel berhasil diperbaiki otomatis.`, 'success');
            return;
        }
        showToast('Auto-fix tidak menemukan nilai yang bisa diperbaiki otomatis.', 'info');
    };
    const spreadsheetFieldByColumnIndex: Array<string | null> = [
        null,
        'namaLengkap',
        'namaHijrah',
        'nis',
        'nik',
        'nisn',
        'jenisKelamin',
        'tempatLahir',
        'tanggalLahir',
        'kewarganegaraan',
        'statusKeluarga',
        'jenisSantri',
        'berkebutuhanKhusus',
        'jenjangId',
        'kelasId',
        'rombelId',
        'tanggalMasuk',
        'status',
        'alamat.detail',
        'alamat.desaKelurahan',
        'alamat.kecamatan',
        'alamat.kabupatenKota',
        'alamat.provinsi',
        'alamat.kodePos',
        'namaAyah',
        'statusAyah',
        'tempatLahirAyah',
        'tanggalLahirAyah',
        'nikAyah',
        'pendidikanAyah',
        'pekerjaanAyah',
        'penghasilanAyah',
        'teleponAyah',
        'namaIbu',
        'statusIbu',
        'tempatLahirIbu',
        'tanggalLahirIbu',
        'nikIbu',
        'pendidikanIbu',
        'pekerjaanIbu',
        'penghasilanIbu',
        'teleponIbu',
        'namaWali',
        'statusWali',
        'statusHidupWali',
        'pendidikanWali',
        'pekerjaanWali',
        'penghasilanWali',
        'teleponWali',
    ];

    const normalizeOption = (raw: string, options: string[]): string => {
        const value = raw.trim();
        if (!value) return '';
        const matched = options.find(option => option.toLowerCase() === value.toLowerCase());
        return matched || value;
    };

    const normalizeStatusValue = (raw: string): string => {
        const value = raw.trim().toLowerCase();
        if (!value) return '';
        if (value === 'keluar' || value === 'pindah' || value === 'keluar/pindah') return 'Keluar/Pindah';
        if (value === 'aktif') return 'Aktif';
        if (value === 'hiatus') return 'Hiatus';
        if (value === 'lulus') return 'Lulus';
        return raw.trim();
    };

    const normalizeGenderValue = (raw: string): string => {
        const value = raw.trim().toLowerCase();
        if (!value) return 'Laki-laki';
        if (value === 'p' || value === 'f' || value.startsWith('perem')) return 'Perempuan';
        return 'Laki-laki';
    };

    const applyValueToRowDraft = (row: EditableRow, field: string, value: any): EditableRow => {
        if (field.startsWith('alamat.')) {
            const addressField = field.split('.')[1];
            const currentAlamat: Alamat = row.alamat || { detail: '' };
            return {
                ...row,
                alamat: {
                    ...currentAlamat,
                    [addressField]: value
                }
            };
        }

        if (field === 'jenjangId') {
            const jenjangId = Number(value) || 0;
            return { ...row, jenjangId, kelasId: 0, rombelId: 0 };
        }
        if (field === 'kelasId') {
            const kelasId = Number(value) || 0;
            return { ...row, kelasId, rombelId: 0 };
        }
        if (field === 'rombelId') {
            return { ...row, rombelId: Number(value) || 0 };
        }
        if (['anakKe', 'jumlahSaudara'].includes(field)) {
            return { ...row, [field]: value ? parseInt(String(value), 10) : undefined };
        }
        return { ...row, [field]: value };
    };

    const normalizePastedValue = (field: string, raw: string, rowDraft: EditableRow): any => {
        const value = raw.trim();
        if (field === 'jenisKelamin') return normalizeGenderValue(value);
        if (field === 'status') return normalizeStatusValue(value);
        if (field === 'statusAyah' || field === 'statusIbu' || field === 'statusHidupWali') return normalizeOption(value, statusHidupOptions);
        if (field === 'pendidikanAyah' || field === 'pendidikanIbu' || field === 'pendidikanWali') return normalizeOption(value, pendidikanOptions);
        if (field === 'penghasilanAyah' || field === 'penghasilanIbu' || field === 'penghasilanWali') return normalizeOption(value, penghasilanOptions);
        if (field === 'tanggalLahir' || field === 'tanggalMasuk' || field === 'tanggalLahirAyah' || field === 'tanggalLahirIbu' || field === 'tanggalLahirWali') {
            return toDisplayDateFromImport(value);
        }
        if (field === 'jenjangId') {
            return findIdByNameOrId(value, settings.jenjang);
        }
        if (field === 'kelasId') {
            const kelasSource = rowDraft.jenjangId ? settings.kelas.filter(k => k.jenjangId === rowDraft.jenjangId) : settings.kelas;
            return findIdByNameOrId(value, kelasSource);
        }
        if (field === 'rombelId') {
            const rombelSource = rowDraft.kelasId ? settings.rombel.filter(r => r.kelasId === rowDraft.kelasId) : settings.rombel;
            return findIdByNameOrId(value, rombelSource);
        }
        return value;
    };

    const handleGridPaste = (e: React.ClipboardEvent<HTMLTableElement>) => {
        const target = e.target as HTMLElement;
        const targetCell = target.closest('td') as HTMLTableCellElement | null;
        const targetRow = target.closest('tr') as HTMLTableRowElement | null;
        if (!targetCell || !targetRow) return;

        const tempId = Number(targetRow.dataset.tempId || 0);
        if (!tempId) return;

        const clipboardText = e.clipboardData.getData('text/plain');
        if (!clipboardText || (!clipboardText.includes('\t') && !clipboardText.includes('\n'))) return;

        const normalizedRows = clipboardText
            .replace(/\r\n/g, '\n')
            .replace(/\r/g, '\n')
            .split('\n');
        while (normalizedRows.length > 0 && normalizedRows[normalizedRows.length - 1] === '') {
            normalizedRows.pop();
        }
        if (normalizedRows.length === 0) return;

        const matrix = normalizedRows.map(line => line.split('\t'));
        const startRowIndex = rows.findIndex(row => row.tempId === tempId);
        const visibleStartRowIndex = mergedRows.findIndex(row => row.tempId === tempId);
        if (startRowIndex < 0 || visibleStartRowIndex < 0) return;
        const isDesktop = window.matchMedia('(min-width: 768px)').matches;
        const baseColumnIndex = isDesktop ? targetCell.cellIndex : targetCell.cellIndex + 1;

        e.preventDefault();

        let changedCells = 0;
        applyRowsMutation('Paste Grid', 'Paste data langsung ke sel grid', prev => {
            const nextRows = [...prev];

            matrix.forEach((columns, rowOffset) => {
                const visibleRowIndex = visibleStartRowIndex + rowOffset;
                if (visibleRowIndex >= mergedRows.length) {
                    if (mode !== 'add') return;
                    nextRows.push(createEmptyRow(nextRows.length));
                }

                const targetTempId = visibleRowIndex < mergedRows.length
                    ? mergedRows[visibleRowIndex].tempId
                    : nextRows[nextRows.length - 1].tempId;
                const targetRowIndex = nextRows.findIndex(row => row.tempId === targetTempId);
                if (targetRowIndex < 0) return;

                let rowDraft: EditableRow = {
                    ...nextRows[targetRowIndex],
                    alamat: { ...(nextRows[targetRowIndex].alamat || { detail: '' }) }
                };

                columns.forEach((cellValue, colOffset) => {
                    const field = spreadsheetFieldByColumnIndex[baseColumnIndex + colOffset];
                    if (!field) return;
                    const normalizedValue = normalizePastedValue(field, cellValue, rowDraft);
                    rowDraft = applyValueToRowDraft(rowDraft, field, normalizedValue);
                    changedCells += 1;
                });

                nextRows[targetRowIndex] = rowDraft;
            });

            return nextRows;
        });

        if (changedCells > 0) {
            showToast(`${changedCells} sel berhasil dipaste ke grid.`, 'success');
        }
    };

    const getCellPositionFromEventTarget = (target: HTMLElement): GridCellPosition => {
        const targetCell = target.closest('td') as HTMLTableCellElement | null;
        const targetRow = target.closest('tr') as HTMLTableRowElement | null;
        if (!targetCell || !targetRow) return null;
        const rowIndex = Number(targetRow.dataset.rowIndex);
        if (!Number.isInteger(rowIndex)) return null;
        const isDesktop = window.matchMedia('(min-width: 768px)').matches;
        const colIndex = isDesktop ? targetCell.cellIndex : targetCell.cellIndex + 1;
        return { rowIndex, colIndex };
    };

    const getFieldValueForCopy = (row: EditableRow, field: string): string => {
        if (field.startsWith('alamat.')) {
            const addressField = field.split('.')[1] as keyof Alamat;
            return String((row.alamat?.[addressField] as string) || '');
        }
        const value = (row as any)[field];
        if (value === undefined || value === null) return '';
        if (typeof value === 'number') return String(value);
        return String(value);
    };

    const handleGridCopy = (e: React.ClipboardEvent<HTMLTableElement>) => {
        if (!anchorCell || !activeCell) return;
        const selection = window.getSelection();
        if (selection && selection.toString().trim()) return;

        const focused = document.activeElement as HTMLInputElement | HTMLTextAreaElement | null;
        if (
            focused &&
            (focused.tagName === 'INPUT' || focused.tagName === 'TEXTAREA') &&
            typeof focused.selectionStart === 'number' &&
            typeof focused.selectionEnd === 'number' &&
            focused.selectionStart !== focused.selectionEnd
        ) {
            return;
        }

        const rowStart = Math.min(anchorCell.rowIndex, activeCell.rowIndex);
        const rowEnd = Math.max(anchorCell.rowIndex, activeCell.rowIndex);
        const colStart = Math.min(anchorCell.colIndex, activeCell.colIndex);
        const colEnd = Math.max(anchorCell.colIndex, activeCell.colIndex);

        const copiedRows: string[] = [];
        for (let r = rowStart; r <= rowEnd; r += 1) {
            const row = mergedRows[r];
            if (!row) continue;
            const copiedCols: string[] = [];
            for (let c = colStart; c <= colEnd; c += 1) {
                const field = spreadsheetFieldByColumnIndex[c];
                if (!field) {
                    copiedCols.push('');
                    continue;
                }
                copiedCols.push(getFieldValueForCopy(row, field));
            }
            copiedRows.push(copiedCols.join('\t'));
        }
        if (copiedRows.length === 0) return;

        e.preventDefault();
        e.clipboardData.setData('text/plain', copiedRows.join('\n'));
        showToast(`Berhasil menyalin ${copiedRows.length} baris ke clipboard.`, 'success');
    };

    const clearGridSelection = () => {
        setAnchorCell(null);
        setActiveCell(null);
    };

    const selectedCellCount = useMemo(() => {
        if (!anchorCell || !activeCell) return 0;
        const rowCount = Math.abs(anchorCell.rowIndex - activeCell.rowIndex) + 1;
        const colCount = Math.abs(anchorCell.colIndex - activeCell.colIndex) + 1;
        return rowCount * colCount;
    }, [anchorCell, activeCell]);

    useEffect(() => {
        if (!lastJumpedErrorKey) return;
        if (visibleErrorTargets.some(target => target.key === lastJumpedErrorKey)) return;
        setLastJumpedErrorKey(null);
    }, [visibleErrorTargets, lastJumpedErrorKey]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-gray-100 z-[80] flex min-h-0 flex-col">
            {/* Header */}
            <div className="bg-white border-b px-4 py-3 sm:px-6 sm:py-4 shadow-sm shrink-0 z-20">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0">
                    <h2 className="text-xl font-bold text-gray-800">
                        {mode === 'add' ? 'Tambah Santri Massal' : 'Edit Data Massal'}
                    </h2>
                    <p className="text-sm text-gray-500">
                        Lengkapi data santri, orang tua, dan wali dalam satu tampilan tabel.
                    </p>
                </div>
                <div className="w-full overflow-x-auto md:w-auto">
                <div className="flex min-w-max gap-2 md:gap-3">
                    <button
                        onClick={handleUndo}
                        disabled={!canUndo}
                        className="px-4 py-2 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg font-medium transition-colors flex items-center gap-2 border border-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
                        title="Undo perubahan terakhir (Ctrl+Z)"
                    >
                        <i className="bi bi-arrow-counterclockwise"></i> Undo
                    </button>
                    <button
                        onClick={handleRedo}
                        disabled={!canRedo}
                        className="px-4 py-2 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg font-medium transition-colors flex items-center gap-2 border border-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
                        title="Redo perubahan (Ctrl+Y)"
                    >
                        <i className="bi bi-arrow-clockwise"></i> Redo
                    </button>
                    <button
                        onClick={handleSaveDraft}
                        className="px-4 py-2 text-cyan-700 bg-cyan-50 hover:bg-cyan-100 rounded-lg font-medium transition-colors flex items-center gap-2 border border-cyan-200"
                        title="Simpan draft agar bisa dilanjutkan nanti"
                    >
                        <i className="bi bi-save2"></i> Simpan Draft
                    </button>
                    <button
                        onClick={handleLoadDraft}
                        disabled={!hasDraft}
                        className="px-4 py-2 text-sky-700 bg-sky-50 hover:bg-sky-100 rounded-lg font-medium transition-colors flex items-center gap-2 border border-sky-200 disabled:cursor-not-allowed disabled:opacity-50"
                        title="Muat draft terakhir"
                    >
                        <i className="bi bi-clock-history"></i> Muat Draft
                    </button>
                    <button
                        onClick={handleDeleteDraft}
                        disabled={!hasDraft}
                        className="px-4 py-2 text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg font-medium transition-colors flex items-center gap-2 border border-rose-200 disabled:cursor-not-allowed disabled:opacity-50"
                        title="Hapus draft tersimpan"
                    >
                        <i className="bi bi-trash3"></i> Hapus Draft
                    </button>
                    {mode === 'add' && (
                        <>
                            <input 
                                type="file" 
                                ref={fileInputRef} 
                                onChange={handleImportFile} 
                                accept=".csv, .xlsx, .xls" 
                                className="hidden" 
                            />
                            <button 
                                onClick={() => fileInputRef.current?.click()}
                                className="px-4 py-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg font-medium transition-colors flex items-center gap-2 border border-blue-200"
                                title="Impor data dari Excel atau CSV"
                            >
                                <i className="bi bi-file-earmark-spreadsheet"></i> Smart Import
                            </button>
                            <button
                                onClick={() => setIsPasteModalOpen(true)}
                                className="px-4 py-2 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg font-medium transition-colors flex items-center gap-2 border border-indigo-200"
                                title="Paste data dari Excel (Ctrl+C / Ctrl+V)"
                            >
                                <i className="bi bi-clipboard-plus"></i> Paste Excel
                            </button>
                        </>
                    )}
                    <button 
                        onClick={handleGenerateAllNis}
                        className="px-4 py-2 text-teal-600 bg-teal-50 hover:bg-teal-100 rounded-lg font-medium transition-colors flex items-center gap-2 border border-teal-200"
                        title="Generate NIS untuk semua baris yang memiliki nama"
                    >
                        <i className="bi bi-magic"></i> Generate Semua NIS
                    </button>
                    <button onClick={onClose} className="px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors">Batal</button>
                    <button 
                        onClick={handleSave} 
                        disabled={isSaving}
                        className="hidden px-6 py-2 bg-teal-600 text-white hover:bg-teal-700 rounded-lg font-medium shadow-sm transition-colors disabled:bg-teal-400 md:flex items-center gap-2"
                    >
                        {isSaving && <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>}
                        Simpan Semua
                    </button>
                </div>
                </div>
                </div>
            </div>

            {/* Table Container */}
            <div className="min-h-0 flex-grow overflow-auto p-2 sm:p-6">
                <div className="bg-white rounded-lg shadow border relative">
                    <div className="sticky top-0 z-20 border-b bg-slate-50 px-4 py-3">
                        <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-600">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 font-medium text-slate-600">
                                    Preset: {importPreset}
                                </span>
                                <span className="rounded-full border border-fuchsia-200 bg-fuchsia-50 px-2 py-0.5 font-medium text-fuchsia-700">
                                    Validasi: {validationProfile}
                                </span>
                                {invalidRowCount > 0 && (
                                    <span className="rounded-full border border-red-200 bg-red-50 px-2 py-0.5 font-medium text-red-700">
                                        {invalidRowCount} baris error
                                    </span>
                                )}
                                {selectedCellCount > 0 && (
                                    <span className="rounded-full border border-teal-200 bg-teal-50 px-2 py-0.5 font-medium text-teal-700">
                                        {selectedCellCount} sel terpilih
                                    </span>
                                )}
                                {hasDraft && (
                                    <span className="rounded-full border border-cyan-200 bg-cyan-50 px-2 py-0.5 font-medium text-cyan-700">
                                        Draft: {lastDraftSavedAt ? new Date(lastDraftSavedAt).toLocaleString('id-ID') : 'tersedia'}
                                    </span>
                                )}
                            </div>
                            <div className="grid w-full grid-cols-2 gap-1 sm:w-auto sm:grid-cols-none sm:flex sm:items-center sm:gap-2">
                                <button
                                    type="button"
                                    onClick={handleJumpToNextError}
                                    className="rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] font-medium text-amber-700 hover:bg-amber-100 min-h-[32px] sm:min-h-0"
                                >
                                    Error Berikutnya
                                </button>
                                <button
                                    type="button"
                                    onClick={handleAutoFixErrors}
                                    disabled={invalidRowCount === 0}
                                    className="rounded-full border border-indigo-200 bg-indigo-50 px-2 py-1 text-[11px] font-medium text-indigo-700 hover:bg-indigo-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400 min-h-[32px] sm:min-h-0"
                                >
                                    Auto Fix
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowFilterPanel(prev => !prev)}
                                    className="rounded-full border border-teal-200 bg-teal-50 px-2 py-1 text-[11px] font-medium text-teal-700 hover:bg-teal-100 min-h-[32px] sm:min-h-0"
                                >
                                    {showFilterPanel ? 'Sembunyikan Filter' : 'Tampilkan Filter'}
                                </button>
                                <button
                                    type="button"
                                    onClick={handleResetGridFilter}
                                    disabled={!hasActiveGridFilter}
                                    className="rounded-full border border-cyan-200 bg-cyan-50 px-2 py-1 text-[11px] font-medium text-cyan-700 hover:bg-cyan-100 min-h-[32px] sm:min-h-0 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
                                >
                                    Reset Filter
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowAdvancedPanel(prev => !prev)}
                                    className="rounded-full border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-100 min-h-[32px] sm:min-h-0"
                                >
                                    {showAdvancedPanel ? 'Sembunyikan Panel Lanjutan' : 'Tampilkan Panel Lanjutan'}
                                </button>
                            </div>
                        </div>
                        {showAdvancedPanel && (
                            <>
                                <div className="mb-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-600">
                                    Tip: klik sel tujuan lalu paste (`Ctrl+V`). Copy range: `Shift+klik` lalu `Ctrl+C`. Reset seleksi: `Esc`.
                                    Undo/Redo: `Ctrl+Z` / `Ctrl+Y`.
                                </div>
                                <div className="mb-2 grid grid-cols-1 gap-2 md:grid-cols-2">
                                    <label className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-[11px] text-slate-600">
                                        <span className="mb-1 block font-semibold text-slate-700">Preset Template Import</span>
                                        <select
                                            value={importPreset}
                                            onChange={(e) => {
                                                const next = e.target.value as 'auto' | 'internal' | 'emis' | 'simple';
                                                setImportPreset(next);
                                                appendAuditLog('Preset Import', `Mengganti preset import ke ${next}`);
                                            }}
                                            className="h-8 w-full rounded border border-slate-300 bg-white px-2 text-xs"
                                        >
                                            <option value="auto">Auto (Alias Lengkap)</option>
                                            <option value="internal">Internal eSantri</option>
                                            <option value="emis">EMIS / Nama Umum Sekolah</option>
                                            <option value="simple">Simple (kolom minimum)</option>
                                        </select>
                                    </label>
                                    <label className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-[11px] text-slate-600">
                                        <span className="mb-1 block font-semibold text-slate-700">Validation Profile</span>
                                        <select
                                            value={validationProfile}
                                            onChange={(e) => {
                                                const next = e.target.value as 'basic' | 'strict';
                                                setValidationProfile(next);
                                                appendAuditLog('Validation Profile', `Mengganti mode validasi ke ${next}`);
                                            }}
                                            className="h-8 w-full rounded border border-slate-300 bg-white px-2 text-xs"
                                        >
                                            <option value="basic">Basic (default)</option>
                                            <option value="strict">Strict (wajib data kunci)</option>
                                        </select>
                                    </label>
                                </div>
                                <div className="mb-2 grid grid-cols-2 gap-2 md:grid-cols-5">
                                    <div className="rounded-lg border border-slate-200 bg-white px-2 py-1">
                                        <p className="text-[10px] text-slate-500">Total Baris</p>
                                        <p className="text-sm font-semibold text-slate-700">{qualitySummary.totalRows}</p>
                                    </div>
                                    <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1">
                                        <p className="text-[10px] text-emerald-700">Baris Valid</p>
                                        <p className="text-sm font-semibold text-emerald-700">{qualitySummary.validRows}</p>
                                    </div>
                                    <div className="rounded-lg border border-red-200 bg-red-50 px-2 py-1">
                                        <p className="text-[10px] text-red-700">Baris Invalid</p>
                                        <p className="text-sm font-semibold text-red-700">{qualitySummary.invalidRows}</p>
                                    </div>
                                    <div className="rounded-lg border border-amber-200 bg-amber-50 px-2 py-1">
                                        <p className="text-[10px] text-amber-700">Duplikat NIS</p>
                                        <p className="text-sm font-semibold text-amber-700">{qualitySummary.duplicateNisRows}</p>
                                    </div>
                                    <div className="rounded-lg border border-orange-200 bg-orange-50 px-2 py-1">
                                        <p className="text-[10px] text-orange-700">Duplikat NIK</p>
                                        <p className="text-sm font-semibold text-orange-700">{qualitySummary.duplicateNikRows}</p>
                                    </div>
                                </div>
                                <div className="mb-2 rounded-lg border border-slate-200 bg-white">
                                    <button
                                        type="button"
                                        onClick={() => setShowAuditTrail(prev => !prev)}
                                        className="flex w-full items-center justify-between px-3 py-2 text-left text-xs font-semibold text-slate-700"
                                    >
                                        <span>Audit Trail (20 aktivitas) • Riwayat: {undoStackRef.current.length} undo / {redoStackRef.current.length} redo / v{historyVersion}</span>
                                        <i className={`bi ${showAuditTrail ? 'bi-chevron-up' : 'bi-chevron-down'}`}></i>
                                    </button>
                                    {showAuditTrail && (
                                        <div className="max-h-36 overflow-y-auto border-t border-slate-100 px-3 py-2 text-[11px] text-slate-600">
                                            {auditLogs.length === 0 && <p>Belum ada aktivitas.</p>}
                                            {auditLogs.map(log => (
                                                <div key={log.id} className="mb-1 flex items-start justify-between gap-2 rounded bg-slate-50 px-2 py-1">
                                                    <div>
                                                        <p className="font-semibold text-slate-700">{log.action}</p>
                                                        <p>{log.detail}</p>
                                                    </div>
                                                    <span className="whitespace-nowrap text-slate-500">{log.time}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                        {showFilterPanel && (
                            <div className="grid grid-cols-1 gap-2 md:grid-cols-6">
                                <input
                                    value={gridFilter.nama}
                                    onChange={(e) => setGridFilter(prev => ({ ...prev, nama: e.target.value }))}
                                    placeholder="Filter Nama"
                                    className="h-9 rounded border border-slate-300 px-2 text-xs"
                                />
                                <input
                                    value={gridFilter.nis}
                                    onChange={(e) => setGridFilter(prev => ({ ...prev, nis: e.target.value }))}
                                    placeholder="Filter NIS"
                                    className="h-9 rounded border border-slate-300 px-2 text-xs"
                                />
                                <select
                                    value={gridFilter.jenjangId}
                                    onChange={(e) => setGridFilter(prev => ({ ...prev, jenjangId: e.target.value, kelasId: '', rombelId: '' }))}
                                    className="h-9 rounded border border-slate-300 px-2 text-xs"
                                >
                                    <option value="">Semua Jenjang</option>
                                    {settings.jenjang.map((j) => <option key={j.id} value={j.id}>{j.nama}</option>)}
                                </select>
                                <select
                                    value={gridFilter.kelasId}
                                    onChange={(e) => setGridFilter(prev => ({ ...prev, kelasId: e.target.value, rombelId: '' }))}
                                    className="h-9 rounded border border-slate-300 px-2 text-xs"
                                >
                                    <option value="">Semua Kelas</option>
                                    {settings.kelas
                                        .filter(k => !gridFilter.jenjangId || k.jenjangId === Number(gridFilter.jenjangId))
                                        .map((k) => <option key={k.id} value={k.id}>{k.nama}</option>)}
                                </select>
                                <select
                                    value={gridFilter.rombelId}
                                    onChange={(e) => setGridFilter(prev => ({ ...prev, rombelId: e.target.value }))}
                                    className="h-9 rounded border border-slate-300 px-2 text-xs"
                                >
                                    <option value="">Semua Rombel</option>
                                    {settings.rombel
                                        .filter(r => !gridFilter.kelasId || r.kelasId === Number(gridFilter.kelasId))
                                        .map((r) => <option key={r.id} value={r.id}>{r.nama}</option>)}
                                </select>
                                <select
                                    value={gridFilter.status}
                                    onChange={(e) => setGridFilter(prev => ({ ...prev, status: e.target.value }))}
                                    className="h-9 rounded border border-slate-300 px-2 text-xs"
                                >
                                    <option value="">Semua Status</option>
                                    <option value="Aktif">Aktif</option>
                                    <option value="Hiatus">Hiatus</option>
                                    <option value="Lulus">Lulus</option>
                                    <option value="Keluar/Pindah">Keluar/Pindah</option>
                                </select>
                            </div>
                        )}
                    </div>
                    <div className="overflow-x-auto">
                        <table
                            ref={tableRef}
                            className="min-w-full divide-y divide-gray-200 text-sm"
                            onPasteCapture={handleGridPaste}
                            onCopyCapture={handleGridCopy}
                            onKeyDownCapture={(e) => {
                                if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
                                    e.preventDefault();
                                    if (e.shiftKey) {
                                        handleRedo();
                                    } else {
                                        handleUndo();
                                    }
                                    return;
                                }
                                if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
                                    e.preventDefault();
                                    handleRedo();
                                    return;
                                }
                                if (e.key === 'Escape' && (anchorCell || activeCell)) {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    clearGridSelection();
                                    return;
                                }
                            }}
                            onFocusCapture={(e) => {
                                const pos = getCellPositionFromEventTarget(e.target as HTMLElement);
                                if (!pos) return;
                                setActiveCell(pos);
                            }}
                            onMouseDownCapture={(e) => {
                                const pos = getCellPositionFromEventTarget(e.target as HTMLElement);
                                if (!pos) return;
                                if ((e as React.MouseEvent).shiftKey && anchorCell) {
                                    setActiveCell(pos);
                                    return;
                                }
                                setAnchorCell(pos);
                                setActiveCell(pos);
                            }}
                        >
                            <thead className="bg-gray-100 sticky top-0 z-10 shadow-sm">
                                {/* Group Headers */}
                                <tr>
                                    <th className="hidden md:table-cell bg-gray-200 md:sticky md:left-0 md:z-20 border-r border-b"></th>
                                    <th className="bg-gray-200 md:sticky md:left-10 md:z-20 border-r border-b min-w-[180px] md:min-w-[200px]"></th>
                                    <th colSpan={11} className="px-4 py-1 text-center font-bold text-gray-600 border-r border-b uppercase text-xs tracking-wider bg-blue-50">Identitas & Kependudukan</th>
                                    <th colSpan={5} className="px-4 py-1 text-center font-bold text-gray-600 border-r border-b uppercase text-xs tracking-wider bg-green-50">Akademik</th>
                                    <th colSpan={6} className="px-4 py-1 text-center font-bold text-gray-600 border-r border-b uppercase text-xs tracking-wider bg-yellow-50">Alamat Lengkap</th>
                                    <th colSpan={8} className="px-4 py-1 text-center font-bold text-gray-600 border-r border-b uppercase text-xs tracking-wider bg-indigo-50">Data Ayah</th>
                                    <th colSpan={8} className="px-4 py-1 text-center font-bold text-gray-600 border-r border-b uppercase text-xs tracking-wider bg-pink-50">Data Ibu</th>
                                    <th colSpan={7} className="px-4 py-1 text-center font-bold text-gray-600 border-b uppercase text-xs tracking-wider bg-gray-200">Data Wali</th>
                                    {mode === 'add' && <th className="bg-gray-200 border-b"></th>}
                                </tr>
                                {/* Column Headers */}
                                <tr>
                                    <th className="hidden md:table-cell px-2 py-3 text-center font-semibold text-gray-700 w-10 md:sticky md:left-0 bg-gray-100 border-r md:z-20">No</th>
                                    <th className="px-4 py-3 text-left font-semibold text-gray-700 min-w-[180px] md:min-w-[220px] md:sticky md:left-10 bg-gray-100 border-r md:z-20 md:shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                                        <button type="button" onClick={() => toggleSort('namaLengkap')} className="inline-flex items-center gap-1">
                                            Nama Lengkap <span className="text-red-500">*</span>
                                            {sortField === 'namaLengkap' && <i className={`bi ${sortDirection === 'asc' ? 'bi-sort-down' : 'bi-sort-up'}`}></i>}
                                        </button>
                                    </th>
                                    
                                    {/* Identitas */}
                                    <th className="px-2 py-2 text-left font-medium text-gray-500 min-w-[150px] bg-blue-50/30">Nama Hijrah</th>
                                    <th className="px-2 py-2 text-left font-medium text-gray-500 min-w-[160px] bg-blue-50/30">
                                        <button type="button" onClick={() => toggleSort('nis')} className="inline-flex items-center gap-1">
                                            NIS {sortField === 'nis' && <i className={`bi ${sortDirection === 'asc' ? 'bi-sort-down' : 'bi-sort-up'}`}></i>}
                                        </button>
                                    </th>
                                    <th className="px-2 py-2 text-left font-medium text-gray-500 min-w-[130px] bg-blue-50/30">NIK</th>
                                    <th className="px-2 py-2 text-left font-medium text-gray-500 min-w-[120px] bg-blue-50/30">NISN</th>
                                    <th className="px-2 py-2 text-left font-medium text-gray-500 min-w-[100px] bg-blue-50/30">Gender</th>
                                    <th className="px-2 py-2 text-left font-medium text-gray-500 min-w-[140px] bg-blue-50/30">Tempat Lahir</th>
                                    <th className="px-2 py-2 text-left font-medium text-gray-500 min-w-[130px] bg-blue-50/30">Tgl. Lahir</th>
                                    <th className="px-2 py-2 text-left font-medium text-gray-500 min-w-[100px] bg-blue-50/30">Warga</th>
                                    <th className="px-2 py-2 text-left font-medium text-gray-500 min-w-[130px] bg-blue-50/30">Status Keluarga</th>
                                    <th className="px-2 py-2 text-left font-medium text-gray-500 min-w-[150px] bg-blue-50/30">Jenis Santri</th>
                                    <th className="px-2 py-2 text-left font-medium text-gray-500 min-w-[130px] bg-blue-50/30">Berkeb. Khusus</th>

                                    {/* Akademik */}
                                    <th className="px-2 py-2 text-left font-medium text-gray-500 min-w-[150px] bg-green-50/30">Jenjang</th>
                                    <th className="px-2 py-2 text-left font-medium text-gray-500 min-w-[120px] bg-green-50/30">Kelas</th>
                                    <th className="px-2 py-2 text-left font-medium text-gray-500 min-w-[150px] bg-green-50/30">Rombel</th>
                                    <th className="px-2 py-2 text-left font-medium text-gray-500 min-w-[130px] bg-green-50/30">
                                        <button type="button" onClick={() => toggleSort('tanggalMasuk')} className="inline-flex items-center gap-1">
                                            Tgl Masuk {sortField === 'tanggalMasuk' && <i className={`bi ${sortDirection === 'asc' ? 'bi-sort-down' : 'bi-sort-up'}`}></i>}
                                        </button>
                                    </th>
                                    <th className="px-2 py-2 text-left font-medium text-gray-500 min-w-[100px] bg-green-50/30">
                                        <button type="button" onClick={() => toggleSort('status')} className="inline-flex items-center gap-1">
                                            Status {sortField === 'status' && <i className={`bi ${sortDirection === 'asc' ? 'bi-sort-down' : 'bi-sort-up'}`}></i>}
                                        </button>
                                    </th>

                                    {/* Alamat */}
                                    <th className="px-2 py-2 text-left font-medium text-gray-500 min-w-[250px] bg-yellow-50/30">Jalan / Detail</th>
                                    <th className="px-2 py-2 text-left font-medium text-gray-500 min-w-[140px] bg-yellow-50/30">Desa/Kel</th>
                                    <th className="px-2 py-2 text-left font-medium text-gray-500 min-w-[140px] bg-yellow-50/30">Kecamatan</th>
                                    <th className="px-2 py-2 text-left font-medium text-gray-500 min-w-[140px] bg-yellow-50/30">Kab/Kota</th>
                                    <th className="px-2 py-2 text-left font-medium text-gray-500 min-w-[140px] bg-yellow-50/30">Provinsi</th>
                                    <th className="px-2 py-2 text-left font-medium text-gray-500 min-w-[90px] bg-yellow-50/30">Kode Pos</th>

                                    {/* Data Ayah */}
                                    <th className="px-2 py-2 text-left font-medium text-gray-500 min-w-[160px] bg-indigo-50/30">Nama Ayah</th>
                                    <th className="px-2 py-2 text-left font-medium text-gray-500 min-w-[120px] bg-indigo-50/30">Status Ayah</th>
                                    <th className="px-2 py-2 text-left font-medium text-gray-500 min-w-[140px] bg-indigo-50/30">Tempat Lahir</th>
                                    <th className="px-2 py-2 text-left font-medium text-gray-500 min-w-[130px] bg-indigo-50/30">Tgl Lahir</th>
                                    <th className="px-2 py-2 text-left font-medium text-gray-500 min-w-[130px] bg-indigo-50/30">NIK Ayah</th>
                                    <th className="px-2 py-2 text-left font-medium text-gray-500 min-w-[140px] bg-indigo-50/30">Pendidikan</th>
                                    <th className="px-2 py-2 text-left font-medium text-gray-500 min-w-[140px] bg-indigo-50/30">Pekerjaan</th>
                                    <th className="px-2 py-2 text-left font-medium text-gray-500 min-w-[140px] bg-indigo-50/30">Penghasilan</th>
                                    <th className="px-2 py-2 text-left font-medium text-gray-500 min-w-[130px] bg-indigo-50/30">No. HP Ayah</th>

                                    {/* Data Ibu */}
                                    <th className="px-2 py-2 text-left font-medium text-gray-500 min-w-[160px] bg-pink-50/30">Nama Ibu</th>
                                    <th className="px-2 py-2 text-left font-medium text-gray-500 min-w-[120px] bg-pink-50/30">Status Ibu</th>
                                    <th className="px-2 py-2 text-left font-medium text-gray-500 min-w-[140px] bg-pink-50/30">Tempat Lahir</th>
                                    <th className="px-2 py-2 text-left font-medium text-gray-500 min-w-[130px] bg-pink-50/30">Tgl Lahir</th>
                                    <th className="px-2 py-2 text-left font-medium text-gray-500 min-w-[130px] bg-pink-50/30">NIK Ibu</th>
                                    <th className="px-2 py-2 text-left font-medium text-gray-500 min-w-[140px] bg-pink-50/30">Pendidikan</th>
                                    <th className="px-2 py-2 text-left font-medium text-gray-500 min-w-[140px] bg-pink-50/30">Pekerjaan</th>
                                    <th className="px-2 py-2 text-left font-medium text-gray-500 min-w-[140px] bg-pink-50/30">Penghasilan</th>
                                    <th className="px-2 py-2 text-left font-medium text-gray-500 min-w-[130px] bg-pink-50/30">No. HP Ibu</th>

                                    {/* Data Wali */}
                                    <th className="px-2 py-2 text-left font-medium text-gray-500 min-w-[160px] bg-gray-100">Nama Wali</th>
                                    <th className="px-2 py-2 text-left font-medium text-gray-500 min-w-[130px] bg-gray-100">Hubungan</th>
                                    <th className="px-2 py-2 text-left font-medium text-gray-500 min-w-[120px] bg-gray-100">Status Wali</th>
                                    <th className="px-2 py-2 text-left font-medium text-gray-500 min-w-[140px] bg-gray-100">Pendidikan</th>
                                    <th className="px-2 py-2 text-left font-medium text-gray-500 min-w-[140px] bg-gray-100">Pekerjaan</th>
                                    <th className="px-2 py-2 text-left font-medium text-gray-500 min-w-[140px] bg-gray-100">Penghasilan</th>
                                    <th className="px-2 py-2 text-left font-medium text-gray-500 min-w-[130px] bg-gray-100">No. HP Wali</th>

                                    {mode === 'add' && <th className="px-4 py-3 text-center font-medium text-gray-500 w-10"><i className="bi bi-trash"></i></th>}
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {mergedRows.map((row, index) => {
                                    // Filtering dropdowns based on selection
                                    const availableKelas = settings.kelas.filter(k => k.jenjangId === row.jenjangId);
                                    const availableRombel = settings.rombel.filter(r => r.kelasId === row.kelasId);

                                    return (
                                        <tr key={row.tempId} data-temp-id={row.tempId} data-row-index={index} className="hover:bg-gray-50 group">
                                            {/* Sticky Columns */}
                                            <td className="hidden md:table-cell px-2 py-2 text-center text-gray-500 bg-white group-hover:bg-gray-50 md:sticky md:left-0 border-r md:z-10">{index + 1}</td>
                                            <td className="px-2 py-2 bg-white group-hover:bg-gray-50 md:sticky md:left-10 border-r md:z-10 md:shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                                                <input
                                                    type="text"
                                                    value={row.namaLengkap}
                                                    onChange={e => updateRow(row.tempId, 'namaLengkap', e.target.value)}
                                                    className={getCellInputClass(row.tempId, 'namaLengkap', 'w-full border-gray-300 rounded text-sm focus:ring-teal-500 focus:border-teal-500 h-9 px-2')}
                                                    placeholder="Nama Santri"
                                                    title={getCellError(row.tempId, 'namaLengkap') || ''}
                                                    aria-invalid={Boolean(getCellError(row.tempId, 'namaLengkap'))}
                                                    data-grid-field="namaLengkap"
                                                />
                                            </td>

                                            {/* Identitas */}
                                            <td className="px-2 py-2 bg-blue-50/10"><input type="text" value={row.namaHijrah} onChange={e => updateRow(row.tempId, 'namaHijrah', e.target.value)} className="w-full border-gray-300 rounded text-sm h-9 px-2" /></td>
                                             <td className="px-2 py-2 bg-blue-50/10">
                                                <div className="flex gap-1">
                                                    <input
                                                        type="text"
                                                        value={row.nis}
                                                        onChange={e => updateRow(row.tempId, 'nis', e.target.value)}
                                                        className={getCellInputClass(row.tempId, 'nis', 'w-full border-gray-300 rounded text-sm h-9 px-2')}
                                                        title={getCellError(row.tempId, 'nis') || ''}
                                                        aria-invalid={Boolean(getCellError(row.tempId, 'nis'))}
                                                        data-grid-field="nis"
                                                    />
                                                    <button 
                                                        onClick={() => handleGenerateNis(row.tempId)}
                                                        className="px-2 bg-teal-50 text-teal-600 border border-teal-200 rounded hover:bg-teal-100 transition-colors"
                                                        title="Generate NIS"
                                                    >
                                                        <i className="bi bi-magic"></i>
                                                    </button>
                                                </div>
                                            </td>
                                            <td className="px-2 py-2 bg-blue-50/10">
                                                <input
                                                    type="text"
                                                    value={row.nik}
                                                    onChange={e => updateRow(row.tempId, 'nik', e.target.value)}
                                                    className={getCellInputClass(row.tempId, 'nik', 'w-full border-gray-300 rounded text-sm h-9 px-2')}
                                                    title={getCellError(row.tempId, 'nik') || ''}
                                                    aria-invalid={Boolean(getCellError(row.tempId, 'nik'))}
                                                    data-grid-field="nik"
                                                />
                                            </td>
                                            <td className="px-2 py-2 bg-blue-50/10"><input type="text" value={row.nisn} onChange={e => updateRow(row.tempId, 'nisn', e.target.value)} className="w-full border-gray-300 rounded text-sm h-9 px-2" /></td>
                                            <td className="px-2 py-2 bg-blue-50/10">
                                                <select value={row.jenisKelamin} onChange={e => updateRow(row.tempId, 'jenisKelamin', e.target.value)} className="w-full border-gray-300 rounded text-sm h-9 px-1">
                                                    <option value="Laki-laki">Laki-laki</option><option value="Perempuan">Perempuan</option>
                                                </select>
                                            </td>
                                            <td className="px-2 py-2 bg-blue-50/10"><input type="text" value={row.tempatLahir} onChange={e => updateRow(row.tempId, 'tempatLahir', e.target.value)} className="w-full border-gray-300 rounded text-sm h-9 px-2" /></td>
                                            <td className="px-2 py-2 bg-blue-50/10">
                                                <input
                                                    type="text"
                                                    placeholder="dd/mm/yyyy"
                                                    value={row.tanggalLahir}
                                                    onChange={e => updateRow(row.tempId, 'tanggalLahir', e.target.value)}
                                                    className={getCellInputClass(row.tempId, 'tanggalLahir', 'w-full border-gray-300 rounded text-sm h-9 px-1')}
                                                    title={getCellError(row.tempId, 'tanggalLahir') || ''}
                                                    aria-invalid={Boolean(getCellError(row.tempId, 'tanggalLahir'))}
                                                    data-grid-field="tanggalLahir"
                                                />
                                            </td>
                                            <td className="px-2 py-2 bg-blue-50/10">
                                                 <select value={row.kewarganegaraan} onChange={e => updateRow(row.tempId, 'kewarganegaraan', e.target.value)} className="w-full border-gray-300 rounded text-sm h-9 px-1">
                                                    <option value="WNI">WNI</option><option value="WNA">WNA</option><option value="Keturunan">Keturunan</option>
                                                </select>
                                            </td>
                                            <td className="px-2 py-2 bg-blue-50/10">
                                                 <select value={row.statusKeluarga} onChange={e => updateRow(row.tempId, 'statusKeluarga', e.target.value)} className="w-full border-gray-300 rounded text-sm h-9 px-1">
                                                    <option value="">- Pilih -</option>
                                                    <option value="Anak Kandung">Anak Kandung</option>
                                                    <option value="Anak Tiri">Anak Tiri</option>
                                                    <option value="Anak Angkat">Anak Angkat</option>
                                                    <option value="Anak Asuh">Anak Asuh</option>
                                                </select>
                                            </td>
                                            <td className="px-2 py-2 bg-blue-50/10">
                                                 <select value={row.jenisSantri} onChange={e => updateRow(row.tempId, 'jenisSantri', e.target.value)} className="w-full border-gray-300 rounded text-sm h-9 px-1">
                                                    <option value="Mondok - Baru">Mondok - Baru</option>
                                                    <option value="Mondok - Pindahan">Mondok - Pindahan</option>
                                                    <option value="Laju - Baru">Laju - Baru</option>
                                                    <option value="Laju - Pindahan">Laju - Pindahan</option>
                                                </select>
                                            </td>
                                            <td className="px-2 py-2 bg-blue-50/10"><input type="text" value={row.berkebutuhanKhusus} onChange={e => updateRow(row.tempId, 'berkebutuhanKhusus', e.target.value)} className="w-full border-gray-300 rounded text-sm h-9 px-2" /></td>

                                            {/* Akademik */}
                                            <td className="px-2 py-2 bg-green-50/10">
                                                <select
                                                    value={row.jenjangId}
                                                    onChange={e => updateRow(row.tempId, 'jenjangId', e.target.value)}
                                                    className={getCellInputClass(row.tempId, 'jenjangId', 'w-full border-gray-300 rounded text-sm h-9 px-1')}
                                                    title={getCellError(row.tempId, 'jenjangId') || ''}
                                                    aria-invalid={Boolean(getCellError(row.tempId, 'jenjangId'))}
                                                    data-grid-field="jenjangId"
                                                >
                                                    <option value={0}>- Pilih -</option>{settings.jenjang.map(j => <option key={j.id} value={j.id}>{j.nama}</option>)}
                                                </select>
                                            </td>
                                            <td className="px-2 py-2 bg-green-50/10">
                                                <select
                                                    value={row.kelasId}
                                                    onChange={e => updateRow(row.tempId, 'kelasId', e.target.value)}
                                                    disabled={!row.jenjangId}
                                                    className={getCellInputClass(row.tempId, 'kelasId', 'w-full border-gray-300 rounded text-sm h-9 px-1 disabled:bg-gray-100')}
                                                    title={getCellError(row.tempId, 'kelasId') || ''}
                                                    aria-invalid={Boolean(getCellError(row.tempId, 'kelasId'))}
                                                    data-grid-field="kelasId"
                                                >
                                                    <option value={0}>- Pilih -</option>{availableKelas.map(k => <option key={k.id} value={k.id}>{k.nama}</option>)}
                                                </select>
                                            </td>
                                            <td className="px-2 py-2 bg-green-50/10">
                                                <select
                                                    value={row.rombelId}
                                                    onChange={e => updateRow(row.tempId, 'rombelId', e.target.value)}
                                                    disabled={!row.kelasId}
                                                    className={getCellInputClass(row.tempId, 'rombelId', 'w-full border-gray-300 rounded text-sm h-9 px-1 disabled:bg-gray-100')}
                                                    title={getCellError(row.tempId, 'rombelId') || ''}
                                                    aria-invalid={Boolean(getCellError(row.tempId, 'rombelId'))}
                                                    data-grid-field="rombelId"
                                                >
                                                    <option value={0}>- Pilih -</option>{availableRombel.map(r => <option key={r.id} value={r.id}>{r.nama}</option>)}
                                                </select>
                                            </td>
                                            <td className="px-2 py-2 bg-green-50/10">
                                                <input
                                                    type="text"
                                                    placeholder="dd/mm/yyyy"
                                                    value={row.tanggalMasuk}
                                                    onChange={e => updateRow(row.tempId, 'tanggalMasuk', e.target.value)}
                                                    className={getCellInputClass(row.tempId, 'tanggalMasuk', 'w-full border-gray-300 rounded text-sm h-9 px-1')}
                                                    title={getCellError(row.tempId, 'tanggalMasuk') || ''}
                                                    aria-invalid={Boolean(getCellError(row.tempId, 'tanggalMasuk'))}
                                                    data-grid-field="tanggalMasuk"
                                                />
                                            </td>
                                            <td className="px-2 py-2 bg-green-50/10">
                                                 <select
                                                    value={row.status}
                                                    onChange={e => updateRow(row.tempId, 'status', e.target.value)}
                                                    className={getCellInputClass(row.tempId, 'status', 'w-full border-gray-300 rounded text-sm h-9 px-1')}
                                                    title={getCellError(row.tempId, 'status') || ''}
                                                    aria-invalid={Boolean(getCellError(row.tempId, 'status'))}
                                                    data-grid-field="status"
                                                >
                                                    <option value="Aktif">Aktif</option><option value="Hiatus">Hiatus</option><option value="Lulus">Lulus</option><option value="Keluar/Pindah">Keluar</option>
                                                </select>
                                            </td>

                                            {/* Alamat */}
                                            <td className="px-2 py-2 bg-yellow-50/10"><input type="text" value={row.alamat?.detail} onChange={e => updateRow(row.tempId, 'alamat.detail', e.target.value)} className="w-full border-gray-300 rounded text-sm h-9 px-2" placeholder="Jalan, RT/RW" /></td>
                                            <td className="px-2 py-2 bg-yellow-50/10"><input type="text" value={row.alamat?.desaKelurahan} onChange={e => updateRow(row.tempId, 'alamat.desaKelurahan', e.target.value)} className="w-full border-gray-300 rounded text-sm h-9 px-2" /></td>
                                            <td className="px-2 py-2 bg-yellow-50/10"><input type="text" value={row.alamat?.kecamatan} onChange={e => updateRow(row.tempId, 'alamat.kecamatan', e.target.value)} className="w-full border-gray-300 rounded text-sm h-9 px-2" /></td>
                                            <td className="px-2 py-2 bg-yellow-50/10"><input type="text" value={row.alamat?.kabupatenKota} onChange={e => updateRow(row.tempId, 'alamat.kabupatenKota', e.target.value)} className="w-full border-gray-300 rounded text-sm h-9 px-2" /></td>
                                            <td className="px-2 py-2 bg-yellow-50/10"><input type="text" value={row.alamat?.provinsi} onChange={e => updateRow(row.tempId, 'alamat.provinsi', e.target.value)} className="w-full border-gray-300 rounded text-sm h-9 px-2" /></td>
                                            <td className="px-2 py-2 bg-yellow-50/10"><input type="text" value={row.alamat?.kodePos} onChange={e => updateRow(row.tempId, 'alamat.kodePos', e.target.value)} className="w-full border-gray-300 rounded text-sm h-9 px-2" /></td>

                                            {/* Data Ayah */}
                                            <td className="px-2 py-2 bg-indigo-50/10"><input type="text" value={row.namaAyah} onChange={e => updateRow(row.tempId, 'namaAyah', e.target.value)} className="w-full border-gray-300 rounded text-sm h-9 px-2" /></td>
                                            <td className="px-2 py-2 bg-indigo-50/10">
                                                <select value={row.statusAyah} onChange={e => updateRow(row.tempId, 'statusAyah', e.target.value)} className="w-full border-gray-300 rounded text-sm h-9 px-1">
                                                    <option value="">- Pilih -</option>{statusHidupOptions.map(o => <option key={o} value={o}>{o}</option>)}
                                                </select>
                                            </td>
                                            <td className="px-2 py-2 bg-indigo-50/10"><input type="text" value={row.tempatLahirAyah} onChange={e => updateRow(row.tempId, 'tempatLahirAyah', e.target.value)} className="w-full border-gray-300 rounded text-sm h-9 px-2" /></td>
                                            <td className="px-2 py-2 bg-indigo-50/10"><input type="text" placeholder="dd/mm/yyyy" value={row.tanggalLahirAyah} onChange={e => updateRow(row.tempId, 'tanggalLahirAyah', e.target.value)} className="w-full border-gray-300 rounded text-sm h-9 px-1" /></td>
                                            <td className="px-2 py-2 bg-indigo-50/10"><input type="text" value={row.nikAyah} onChange={e => updateRow(row.tempId, 'nikAyah', e.target.value)} className="w-full border-gray-300 rounded text-sm h-9 px-2" /></td>
                                            <td className="px-2 py-2 bg-indigo-50/10">
                                                <select value={row.pendidikanAyah} onChange={e => updateRow(row.tempId, 'pendidikanAyah', e.target.value)} className="w-full border-gray-300 rounded text-sm h-9 px-1">
                                                    <option value="">- Pilih -</option>{pendidikanOptions.map(o => <option key={o} value={o}>{o}</option>)}
                                                </select>
                                            </td>
                                            <td className="px-2 py-2 bg-indigo-50/10"><input type="text" value={row.pekerjaanAyah} onChange={e => updateRow(row.tempId, 'pekerjaanAyah', e.target.value)} className="w-full border-gray-300 rounded text-sm h-9 px-2" /></td>
                                            <td className="px-2 py-2 bg-indigo-50/10">
                                                <select value={row.penghasilanAyah} onChange={e => updateRow(row.tempId, 'penghasilanAyah', e.target.value)} className="w-full border-gray-300 rounded text-sm h-9 px-1">
                                                    <option value="">- Pilih -</option>{penghasilanOptions.map(o => <option key={o} value={o}>{o}</option>)}
                                                </select>
                                            </td>
                                            <td className="px-2 py-2 bg-indigo-50/10"><input type="text" value={row.teleponAyah} onChange={e => updateRow(row.tempId, 'teleponAyah', e.target.value)} className="w-full border-gray-300 rounded text-sm h-9 px-2" /></td>

                                             {/* Data Ibu */}
                                             <td className="px-2 py-2 bg-pink-50/10"><input type="text" value={row.namaIbu} onChange={e => updateRow(row.tempId, 'namaIbu', e.target.value)} className="w-full border-gray-300 rounded text-sm h-9 px-2" /></td>
                                            <td className="px-2 py-2 bg-pink-50/10">
                                                <select value={row.statusIbu} onChange={e => updateRow(row.tempId, 'statusIbu', e.target.value)} className="w-full border-gray-300 rounded text-sm h-9 px-1">
                                                    <option value="">- Pilih -</option>{statusHidupOptions.map(o => <option key={o} value={o}>{o}</option>)}
                                                </select>
                                            </td>
                                            <td className="px-2 py-2 bg-pink-50/10"><input type="text" value={row.tempatLahirIbu} onChange={e => updateRow(row.tempId, 'tempatLahirIbu', e.target.value)} className="w-full border-gray-300 rounded text-sm h-9 px-2" /></td>
                                            <td className="px-2 py-2 bg-pink-50/10"><input type="text" placeholder="dd/mm/yyyy" value={row.tanggalLahirIbu} onChange={e => updateRow(row.tempId, 'tanggalLahirIbu', e.target.value)} className="w-full border-gray-300 rounded text-sm h-9 px-1" /></td>
                                            <td className="px-2 py-2 bg-pink-50/10"><input type="text" value={row.nikIbu} onChange={e => updateRow(row.tempId, 'nikIbu', e.target.value)} className="w-full border-gray-300 rounded text-sm h-9 px-2" /></td>
                                            <td className="px-2 py-2 bg-pink-50/10">
                                                <select value={row.pendidikanIbu} onChange={e => updateRow(row.tempId, 'pendidikanIbu', e.target.value)} className="w-full border-gray-300 rounded text-sm h-9 px-1">
                                                    <option value="">- Pilih -</option>{pendidikanOptions.map(o => <option key={o} value={o}>{o}</option>)}
                                                </select>
                                            </td>
                                            <td className="px-2 py-2 bg-pink-50/10"><input type="text" value={row.pekerjaanIbu} onChange={e => updateRow(row.tempId, 'pekerjaanIbu', e.target.value)} className="w-full border-gray-300 rounded text-sm h-9 px-2" /></td>
                                            <td className="px-2 py-2 bg-pink-50/10">
                                                <select value={row.penghasilanIbu} onChange={e => updateRow(row.tempId, 'penghasilanIbu', e.target.value)} className="w-full border-gray-300 rounded text-sm h-9 px-1">
                                                    <option value="">- Pilih -</option>{penghasilanOptions.map(o => <option key={o} value={o}>{o}</option>)}
                                                </select>
                                            </td>
                                            <td className="px-2 py-2 bg-pink-50/10"><input type="text" value={row.teleponIbu} onChange={e => updateRow(row.tempId, 'teleponIbu', e.target.value)} className="w-full border-gray-300 rounded text-sm h-9 px-2" /></td>

                                            {/* Data Wali */}
                                            <td className="px-2 py-2 bg-gray-100"><input type="text" value={row.namaWali} onChange={e => updateRow(row.tempId, 'namaWali', e.target.value)} className="w-full border-gray-300 rounded text-sm h-9 px-2" /></td>
                                            <td className="px-2 py-2 bg-gray-100">
                                                <select value={row.statusWali} onChange={e => updateRow(row.tempId, 'statusWali', e.target.value)} className="w-full border-gray-300 rounded text-sm h-9 px-1">
                                                    <option value="">- Pilih -</option>{['Kakek', 'Paman (Saudara Ayah)', 'Saudara Laki-laki Seayah', 'Saudara Laki-laki Kandung', 'Orang Tua Angkat', 'Orang Tua Asuh', 'Orang Tua Tiri', 'Kerabat Mahram Lainnya', 'Lainnya'].map(o => <option key={o} value={o}>{o}</option>)}
                                                </select>
                                            </td>
                                            <td className="px-2 py-2 bg-gray-100">
                                                <select value={row.statusHidupWali} onChange={e => updateRow(row.tempId, 'statusHidupWali', e.target.value)} className="w-full border-gray-300 rounded text-sm h-9 px-1">
                                                    <option value="">- Pilih -</option>{statusHidupOptions.map(o => <option key={o} value={o}>{o}</option>)}
                                                </select>
                                            </td>
                                            <td className="px-2 py-2 bg-gray-100">
                                                <select value={row.pendidikanWali} onChange={e => updateRow(row.tempId, 'pendidikanWali', e.target.value)} className="w-full border-gray-300 rounded text-sm h-9 px-1">
                                                    <option value="">- Pilih -</option>{pendidikanOptions.map(o => <option key={o} value={o}>{o}</option>)}
                                                </select>
                                            </td>
                                            <td className="px-2 py-2 bg-gray-100"><input type="text" value={row.pekerjaanWali} onChange={e => updateRow(row.tempId, 'pekerjaanWali', e.target.value)} className="w-full border-gray-300 rounded text-sm h-9 px-2" /></td>
                                            <td className="px-2 py-2 bg-gray-100">
                                                <select value={row.penghasilanWali} onChange={e => updateRow(row.tempId, 'penghasilanWali', e.target.value)} className="w-full border-gray-300 rounded text-sm h-9 px-1">
                                                    <option value="">- Pilih -</option>{penghasilanOptions.map(o => <option key={o} value={o}>{o}</option>)}
                                                </select>
                                            </td>
                                            <td className="px-2 py-2 bg-gray-100"><input type="text" value={row.teleponWali} onChange={e => updateRow(row.tempId, 'teleponWali', e.target.value)} className="w-full border-gray-300 rounded text-sm h-9 px-2" /></td>

                                            {mode === 'add' && (
                                                <td className="px-2 py-2 text-center border-l">
                                                    <button onClick={() => handleRemoveRow(row.tempId)} className="text-red-500 hover:text-red-700 p-1" title="Hapus Baris"><i className="bi bi-x-lg"></i></button>
                                                </td>
                                            )}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    {mode === 'add' && (
                         <div className="p-4 bg-gray-50 border-t sticky bottom-0 left-0 right-0">
                            <button onClick={handleAddRow} className="text-teal-600 font-medium text-sm hover:text-teal-800 flex items-center gap-2">
                                <i className="bi bi-plus-circle-fill"></i> Tambah 1 Baris Lagi
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <div className="md:hidden shrink-0 border-t bg-white px-4 py-3">
                <div className="flex gap-2">
                    <button
                        onClick={onClose}
                        className="flex-1 rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700"
                    >
                        Batal
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="flex-1 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white disabled:bg-teal-400"
                    >
                        {isSaving ? 'Menyimpan...' : 'Simpan Semua'}
                    </button>
                </div>
            </div>

            {isPasteModalOpen && (
                <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40 p-4">
                    <div className="w-full max-w-3xl rounded-xl border border-slate-200 bg-white shadow-xl">
                        <div className="border-b px-5 py-3">
                            <h3 className="text-base font-bold text-slate-800">Paste dari Excel</h3>
                            <p className="text-xs text-slate-500">Tempel blok tabel dari Excel/Spreadsheet. Baris pertama harus header kolom.</p>
                        </div>
                        <div className="p-5">
                            <textarea
                                value={pasteText}
                                onChange={(e) => setPasteText(e.target.value)}
                                rows={10}
                                placeholder="Contoh header: namaLengkap[TAB]nis[TAB]jenjangId ..."
                                className="w-full rounded-lg border border-slate-300 p-3 font-mono text-xs focus:border-teal-500 focus:outline-none"
                            />
                        </div>
                        <div className="flex justify-end gap-2 border-t px-5 py-3">
                            <button
                                onClick={() => { setIsPasteModalOpen(false); setPasteText(''); }}
                                className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200"
                            >
                                Batal
                            </button>
                            <button
                                onClick={handlePasteSpreadsheet}
                                className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
                            >
                                Tempel ke Grid
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
