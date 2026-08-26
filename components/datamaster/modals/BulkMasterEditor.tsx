import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { PondokSettings } from '../../../types';
import { useAppContext } from '../../../AppContext';

export type MasterType = 'pendidik' | 'jenjang' | 'kelas' | 'rombel' | 'mapel';

interface BulkMasterEditorProps {
    isOpen: boolean;
    onClose: () => void;
    mode: MasterType;
    settings: PondokSettings;
    onSave: (data: any[]) => void;
    initialData?: any[];
}

interface ColumnConfig {
    field: string;
    label: string;
    required?: boolean;
    type: string;
    placeholder?: string;
    options?: string[];
    uppercase?: boolean;
}

type GridCellPosition = { rowIndex: number; colIndex: number } | null;

export const BulkMasterEditor: React.FC<BulkMasterEditorProps> = ({ 
    isOpen, onClose, mode, settings, onSave, initialData 
}) => {
    const { showToast } = useAppContext();
    const [rows, setRows] = useState<any[]>([]);
    const [query, setQuery] = useState('');
    const [isPasteModalOpen, setIsPasteModalOpen] = useState(false);
    const [pasteText, setPasteText] = useState('');
    const [activeCell, setActiveCell] = useState<GridCellPosition>(null);
    const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);

    const tableRef = useRef<HTMLTableElement>(null);
    const undoStackRef = useRef<any[][]>([]);
    const redoStackRef = useRef<any[][]>([]);
    const draftStorageKey = `esantri:bulk-master-draft:${mode}`;

    const cloneRows = (source: any[]) => source.map((row) => ({ ...row }));
    const canUndo = undoStackRef.current.length > 0;
    const canRedo = redoStackRef.current.length > 0;

    // Daftar field berdasarkan kolom tabel untuk navigasi grid dan paste matrix
    const columnsConfig: ColumnConfig[] = useMemo(() => {
        switch (mode) {
            case 'pendidik':
                return [
                    { field: 'nama', label: 'Nama (Wajib)', required: true, type: 'text', placeholder: 'Nama Ustadz/Ustadzah...' },
                    { field: 'jabatan', label: 'Jabatan Awal', type: 'select', options: ['Wali Kelas', 'Guru Mapel', 'Pengajar', 'Staff'] },
                    { field: 'kelasId', label: 'Kelas (Wali)', type: 'select-kelas' },
                    { field: 'rombelId', label: 'Rombel (Wali)', type: 'select-rombel' },
                    { field: 'telepon', label: 'No. Telp', type: 'text', placeholder: '08...' },
                    { field: 'email', label: 'Email', type: 'email', placeholder: 'email@...' },
                    { field: 'tanggalMulai', label: 'Tanggal Mulai', type: 'date' },
                ];
            case 'jenjang':
                return [
                    { field: 'nama', label: 'Nama Jenjang (Wajib)', required: true, type: 'text', placeholder: 'CTH: Salafiyah Wustha' },
                    { field: 'kode', label: 'Kode / Singkatan', type: 'text', placeholder: 'CTH: SW', uppercase: true },
                    { field: 'mudirId', label: 'Mudir Marhalah', type: 'select-mudir' },
                ];
            case 'kelas':
                return [
                    { field: 'nama', label: 'Nama Kelas (Wajib)', required: true, type: 'text', placeholder: 'CTH: Kelas 7, Kelas 8' },
                    { field: 'jenjangId', label: 'Induk Jenjang', type: 'select-jenjang' },
                ];
            case 'rombel':
                return [
                    { field: 'nama', label: 'Nama Rombel (Wajib)', required: true, type: 'text', placeholder: 'CTH: 7A, 7B' },
                    { field: 'kelasId', label: 'Induk Kelas', type: 'select-kelas-all' },
                    { field: 'waliKelasId', label: 'Wali Kelas', type: 'select-wali' },
                ];
            case 'mapel':
                return [
                    { field: 'nama', label: 'Nama Mata Pelajaran (Wajib)', required: true, type: 'text', placeholder: 'CTH: Nahwu, Sharaf' },
                    { field: 'kkm', label: 'KKM', type: 'number', placeholder: '70' },
                    { field: 'modul', label: 'Modul / Kitab', type: 'text', placeholder: 'Pisahkan dgn ;' },
                    { field: 'linkUnduh', label: 'Link Unduh', type: 'url', placeholder: 'https://...' },
                    { field: 'linkPembelian', label: 'Link Beli', type: 'url', placeholder: 'https://...' },
                    { field: 'jenjangId', label: 'Jenjang', type: 'select-jenjang' },
                ];
            default:
                return [{ field: 'nama', label: 'Nama', required: true, type: 'text', placeholder: 'Nama...' }];
        }
    }, [mode, settings]);

    const applyRowsMutation = useCallback((mutator: (draft: any[]) => any[]) => {
        setRows(prev => {
            const snapshot = cloneRows(prev);
            const nextRows = mutator(cloneRows(prev));
            undoStackRef.current.push(snapshot);
            if (undoStackRef.current.length > 30) undoStackRef.current.shift();
            redoStackRef.current = [];
            return nextRows;
        });
    }, []);

    const parseMultiValue = (value?: string) =>
        (value || '')
            .split(/\n|;/)
            .map(v => v.trim())
            .filter(Boolean);

    const createEmptyRow = useCallback((index: number) => {
        const base = { tempId: Date.now() + Math.floor(Math.random() * 10000) + index, nama: '' };
        switch (mode) {
            case 'pendidik': return { ...base, jabatan: '', tanggalMulai: new Date().toISOString().split('T')[0], telepon: '', email: '', kelasId: '', rombelId: '' };
            case 'jenjang': return { ...base, kode: '', mudirId: '' };
            case 'kelas': return { ...base, jenjangId: settings.jenjang[0]?.id || '' };
            case 'rombel': return { ...base, kelasId: settings.kelas[0]?.id || '', waliKelasId: '' };
            case 'mapel': return { ...base, jenjangId: settings.jenjang[0]?.id || '', kkm: 70, modul: '', linkUnduh: '', linkPembelian: '' };
            default: return base;
        }
    }, [mode, settings]);

    useEffect(() => {
        if (isOpen) {
            undoStackRef.current = [];
            redoStackRef.current = [];
            setQuery('');
            setActiveCell(null);
            if (initialData && initialData.length > 0) {
                setRows(initialData.map((item, i) => ({ ...item, tempId: Date.now() + i })));
            } else {
                // Inisialisasi dengan 5 baris kosong
                const initialRows = Array.from({ length: 5 }).map((_, i) => createEmptyRow(i));
                setRows(initialRows);
            }
        }
    }, [isOpen, mode, initialData, createEmptyRow]);

    const handleAddRows = (count = 1) => {
        applyRowsMutation(prev => {
            const newRows = Array.from({ length: count }).map((_, i) => createEmptyRow(prev.length + i));
            return [...prev, ...newRows];
        });
    };

    const handleRemoveRow = (tempId: number) => {
        applyRowsMutation(prev => prev.filter(r => r.tempId !== tempId));
    };

    const handleClearEmptyRows = () => {
        const remaining = rows.filter(r => r.nama && r.nama.trim() !== '');
        if (remaining.length === rows.length) {
            showToast('Tidak ada baris kosong.', 'info');
            return;
        }
        applyRowsMutation(() => remaining.length > 0 ? remaining : [createEmptyRow(0)]);
        showToast('Baris kosong berhasil dibersihkan.', 'success');
    };

    const updateRow = (tempId: number, field: string, value: any) => {
        applyRowsMutation(prev => prev.map(row => {
            if (row.tempId !== tempId) return row;
            return { ...row, [field]: value };
        }));
    };

    const handleUndo = () => {
        if (!undoStackRef.current.length) return;
        setRows(prev => {
            const previous = undoStackRef.current.pop()!;
            redoStackRef.current.push(cloneRows(prev));
            return cloneRows(previous);
        });
    };

    const handleRedo = () => {
        if (!redoStackRef.current.length) return;
        setRows(prev => {
            const next = redoStackRef.current.pop()!;
            undoStackRef.current.push(cloneRows(prev));
            return cloneRows(next);
        });
    };

    const handleSaveDraft = () => {
        localStorage.setItem(draftStorageKey, JSON.stringify({ savedAt: Date.now(), rows }));
        showToast('Draft berhasil disimpan di browser lokal.', 'success');
    };

    const handleLoadDraft = () => {
        const raw = localStorage.getItem(draftStorageKey);
        if (!raw) {
            showToast('Tidak ada draft tersimpan untuk menu ini.', 'info');
            return;
        }
        try {
            const parsed = JSON.parse(raw) as { rows?: any[] };
            if (!Array.isArray(parsed.rows) || parsed.rows.length === 0) {
                showToast('Draft kosong atau rusak.', 'info');
                return;
            }
            undoStackRef.current = [];
            redoStackRef.current = [];
            setRows(parsed.rows.map((row, i) => ({ ...row, tempId: row.tempId || Date.now() + i })));
            showToast(`Draft berhasil dimuat (${parsed.rows.length} baris).`, 'success');
        } catch {
            showToast('Gagal memuat draft.', 'error');
        }
    };

    const handleDeleteDraft = () => {
        localStorage.removeItem(draftStorageKey);
        showToast('Draft berhasil dihapus.', 'info');
    };

    const filteredRows = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return rows;
        return rows.filter(row => (row.nama || '').toString().toLowerCase().includes(q));
    }, [rows, query]);

    // Navigasi Fokus Sel
    const focusCellInput = (rowIndex: number, colIndex: number) => {
        const clampedRow = Math.max(0, Math.min(filteredRows.length - 1, rowIndex));
        const clampedCol = Math.max(0, Math.min(columnsConfig.length - 1, colIndex));
        
        setActiveCell({ rowIndex: clampedRow, colIndex: clampedCol });

        setTimeout(() => {
            const inputEl = tableRef.current?.querySelector(
                `[data-cell-pos="${clampedRow}-${clampedCol}"]`
            ) as HTMLInputElement | HTMLSelectElement | null;
            if (inputEl) {
                inputEl.focus();
                if ('select' in inputEl && typeof (inputEl as HTMLInputElement).select === 'function') {
                    (inputEl as HTMLInputElement).select();
                }
            }
        }, 10);
    };

    // Keyboard Handler pada Sel Grid
    const handleCellKeyDown = (
        e: React.KeyboardEvent<HTMLInputElement | HTMLSelectElement>,
        rowIndex: number,
        colIndex: number
    ) => {
        const isInput = e.currentTarget.tagName === 'INPUT';

        // Shortcut Undo / Redo
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
            e.preventDefault();
            if (e.shiftKey) handleRedo();
            else handleUndo();
            return;
        }
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
            e.preventDefault();
            handleRedo();
            return;
        }

        // Enter: pindah ke baris bawahnya
        if (e.key === 'Enter') {
            e.preventDefault();
            if (rowIndex === filteredRows.length - 1) {
                // Di baris terakhir, otomatis tambah baris baru
                handleAddRows(1);
                setTimeout(() => focusCellInput(rowIndex + 1, colIndex), 30);
            } else {
                focusCellInput(rowIndex + 1, colIndex);
            }
            return;
        }

        // Tab: navigasi kolom
        if (e.key === 'Tab') {
            if (e.shiftKey) {
                if (colIndex > 0) {
                    e.preventDefault();
                    focusCellInput(rowIndex, colIndex - 1);
                } else if (rowIndex > 0) {
                    e.preventDefault();
                    focusCellInput(rowIndex - 1, columnsConfig.length - 1);
                }
            } else {
                if (colIndex < columnsConfig.length - 1) {
                    e.preventDefault();
                    focusCellInput(rowIndex, colIndex + 1);
                } else if (rowIndex < filteredRows.length - 1) {
                    e.preventDefault();
                    focusCellInput(rowIndex + 1, 0);
                } else if (rowIndex === filteredRows.length - 1) {
                    // Baris terakhir + tab di kolom terakhir -> tambah baris baru
                    e.preventDefault();
                    handleAddRows(1);
                    setTimeout(() => focusCellInput(rowIndex + 1, 0), 30);
                }
            }
            return;
        }

        // Arrow Keys Navigation
        if (e.key === 'ArrowUp') {
            if (rowIndex > 0) {
                e.preventDefault();
                focusCellInput(rowIndex - 1, colIndex);
            }
        } else if (e.key === 'ArrowDown') {
            if (rowIndex < filteredRows.length - 1) {
                e.preventDefault();
                focusCellInput(rowIndex + 1, colIndex);
            }
        } else if (e.key === 'ArrowLeft' && isInput) {
            const input = e.currentTarget as HTMLInputElement;
            if (input.selectionStart === 0 && input.selectionEnd === 0 && colIndex > 0) {
                e.preventDefault();
                focusCellInput(rowIndex, colIndex - 1);
            }
        } else if (e.key === 'ArrowRight' && isInput) {
            const input = e.currentTarget as HTMLInputElement;
            if (input.selectionStart === input.value.length && colIndex < columnsConfig.length - 1) {
                e.preventDefault();
                focusCellInput(rowIndex, colIndex + 1);
            }
        }
    };

    // Matrix Direct Paste Handler dari Spreadsheet (Excel/Sheets)
    const handleGridPaste = (
        e: React.ClipboardEvent<HTMLInputElement | HTMLSelectElement>,
        startRowIndex: number,
        startColIndex: number
    ) => {
        const text = e.clipboardData.getData('text/plain');
        if (!text || (!text.includes('\t') && !text.includes('\n'))) return;

        e.preventDefault();

        const lines = text
            .replace(/\r\n/g, '\n')
            .replace(/\r/g, '\n')
            .split('\n');
        
        while (lines.length > 0 && lines[lines.length - 1] === '') {
            lines.pop();
        }
        if (lines.length === 0) return;

        const matrix = lines.map(line => line.split('\t'));
        let cellCount = 0;

        applyRowsMutation(prev => {
            const nextRows = [...prev];
            matrix.forEach((colValues, rOffset) => {
                const targetRowIdx = startRowIndex + rOffset;
                while (targetRowIdx >= nextRows.length) {
                    nextRows.push(createEmptyRow(nextRows.length));
                }

                const targetRow = { ...nextRows[targetRowIdx] };
                colValues.forEach((val, cOffset) => {
                    const targetColIdx = startColIndex + cOffset;
                    if (targetColIdx < columnsConfig.length) {
                        const fieldConfig = columnsConfig[targetColIdx];
                        let cleanVal = val.trim();
                        if (fieldConfig.uppercase) cleanVal = cleanVal.toUpperCase();
                        targetRow[fieldConfig.field] = cleanVal;
                        cellCount += 1;
                    }
                });
                nextRows[targetRowIdx] = targetRow;
            });
            return nextRows;
        });

        showToast(`${cellCount} sel berhasil disalin ke tabel.`, 'success');
    };

    const handleApplyPasteTextModal = () => {
        const lines = pasteText
            .split('\n')
            .map(line => line.trim())
            .filter(Boolean);
        if (!lines.length) return;

        const parsedRows = lines.map((line, i) => {
            const chunks = line.includes('\t') ? line.split('\t') : line.split(';');
            const row: any = createEmptyRow(i);
            columnsConfig.forEach((cfg, idx) => {
                let v = (chunks[idx] || '').trim();
                if (cfg.uppercase) v = v.toUpperCase();
                row[cfg.field] = v;
            });
            return row;
        });

        applyRowsMutation(prev => [...prev, ...parsedRows.map((r, i) => ({ ...r, tempId: Date.now() + i }))]);
        setPasteText('');
        setIsPasteModalOpen(false);
        showToast(`${parsedRows.length} baris berhasil ditambahkan ke tabel.`, 'success');
    };

    const handleSave = () => {
        const validRows = rows.filter(r => r.nama && r.nama.trim() !== '');
        if (validRows.length === 0) {
            showToast('Harap isi setidaknya satu baris dengan Nama yang valid!', 'info');
            return;
        }

        const cleanData = validRows.map(({ tempId, ...rest }) => {
            if (rest.jenjangId) rest.jenjangId = parseInt(rest.jenjangId);
            if (rest.kelasId) rest.kelasId = parseInt(rest.kelasId);
            if (rest.mudirId) rest.mudirId = parseInt(rest.mudirId);
            if (rest.waliKelasId) rest.waliKelasId = parseInt(rest.waliKelasId);
            if (rest.rombelId) rest.rombelId = parseInt(rest.rombelId);
            if (rest.kkm) rest.kkm = parseInt(rest.kkm);
            if (mode === 'mapel') {
                rest.modulList = rest.modulList?.length ? rest.modulList : parseMultiValue(rest.modul);
                rest.linkUnduhList = rest.linkUnduhList?.length ? rest.linkUnduhList : parseMultiValue(rest.linkUnduh);
                rest.linkPembelianList = rest.linkPembelianList?.length ? rest.linkPembelianList : parseMultiValue(rest.linkPembelian);
            }
            return rest;
        });

        onSave(cleanData);
    };

    if (!isOpen) return null;

    const getTitle = () => {
        const isEdit = initialData && initialData.length > 0;
        const prefix = isEdit ? 'Edit' : 'Input';
        switch(mode) {
            case 'pendidik': return `${prefix} Tenaga Pendidik & Staf Massal`;
            case 'jenjang': return `${prefix} Jenjang Pendidikan Massal`;
            case 'kelas': return `${prefix} Kelas Massal`;
            case 'rombel': return `${prefix} Rombel / Halaqah Massal`;
            case 'mapel': return `${prefix} Mata Pelajaran Massal`;
            default: return `${prefix} Data Massal`;
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-100 z-[80] flex flex-col animate-fade-in">
            {/* Top Bar Header */}
            <div className="bg-white border-b border-slate-200 px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs shrink-0 z-20">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center text-xl shrink-0">
                        <i className="bi bi-table"></i>
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-base font-bold text-slate-800">{getTitle()}</h2>
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-teal-100 text-teal-800">
                                Keyboard Grid Active
                            </span>
                        </div>
                        <p className="text-xs text-slate-500">
                            Gunakan tombol panah (↑↓←→), Enter, dan Tab untuk berpindah sel dengan cepat seperti di Excel.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                    <button
                        type="button"
                        onClick={() => setShowKeyboardHelp(!showKeyboardHelp)}
                        className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-colors inline-flex items-center gap-1.5 ${
                            showKeyboardHelp ? 'bg-amber-100 text-amber-800 border-amber-300' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                        title="Bantuan Navigasi Keyboard"
                    >
                        <i className="bi bi-keyboard-fill"></i>
                        <span>Pintasan</span>
                    </button>
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl font-semibold text-xs transition-colors border border-slate-200"
                    >
                        Batal
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-semibold text-xs shadow-xs transition-colors inline-flex items-center gap-1.5"
                    >
                        <i className="bi bi-check-circle-fill"></i>
                        <span>Simpan Data ({rows.filter(r => r.nama?.trim()).length})</span>
                    </button>
                </div>
            </div>

            {/* Keyboard Help Drawer / Banner */}
            {showKeyboardHelp && (
                <div className="bg-amber-50 border-b border-amber-200 px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs text-amber-900 shrink-0">
                    <div className="flex flex-wrap items-center gap-4">
                        <span className="font-bold flex items-center gap-1">
                            <i className="bi bi-info-circle-fill text-amber-600"></i> Panduan Tombol Cepat:
                        </span>
                        <span><kbd className="px-1.5 py-0.5 bg-white border border-amber-300 rounded font-mono text-[11px] font-bold">↵ Enter</kbd> : Pindah ke baris bawah (+ otomatis tambah baris di akhir)</span>
                        <span><kbd className="px-1.5 py-0.5 bg-white border border-amber-300 rounded font-mono text-[11px] font-bold">⇥ Tab</kbd> / <kbd className="px-1.5 py-0.5 bg-white border border-amber-300 rounded font-mono text-[11px] font-bold">⇧ Shift+Tab</kbd> : Pindah kolom kanan / kiri</span>
                        <span><kbd className="px-1.5 py-0.5 bg-white border border-amber-300 rounded font-mono text-[11px] font-bold">↑ ↓ ← →</kbd> : Navigasi sel grid</span>
                        <span><kbd className="px-1.5 py-0.5 bg-white border border-amber-300 rounded font-mono text-[11px] font-bold">Ctrl+V</kbd> : Tempel tabel Excel langsung ke sel</span>
                        <span><kbd className="px-1.5 py-0.5 bg-white border border-amber-300 rounded font-mono text-[11px] font-bold">Ctrl+Z</kbd> / <kbd className="px-1.5 py-0.5 bg-white border border-amber-300 rounded font-mono text-[11px] font-bold">Ctrl+Y</kbd> : Undo / Redo</span>
                    </div>
                    <button onClick={() => setShowKeyboardHelp(false)} className="text-amber-700 hover:text-amber-900">
                        <i className="bi bi-x-lg"></i>
                    </button>
                </div>
            )}

            {/* Sub Toolbar Controls */}
            <div className="bg-slate-50 border-b border-slate-200 px-5 py-2.5 flex flex-wrap items-center justify-between gap-2 shrink-0">
                <div className="flex flex-wrap items-center gap-2">
                    {/* Search filter */}
                    <div className="relative min-w-[200px]">
                        <i className="bi bi-search absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
                        <input
                            type="text"
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            placeholder="Cari dalam tabel..."
                            className="w-full pl-7 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
                        />
                    </div>

                    <div className="h-6 w-px bg-slate-200 mx-1 hidden sm:block"></div>

                    {/* Quick Add Buttons */}
                    <button
                        type="button"
                        onClick={() => handleAddRows(1)}
                        className="px-2.5 py-1.5 text-xs font-semibold rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 inline-flex items-center gap-1 shadow-2xs"
                    >
                        <i className="bi bi-plus-lg text-teal-600"></i> +1 Baris
                    </button>
                    <button
                        type="button"
                        onClick={() => handleAddRows(5)}
                        className="px-2.5 py-1.5 text-xs font-semibold rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 inline-flex items-center gap-1 shadow-2xs"
                    >
                        <i className="bi bi-plus-circle text-teal-600"></i> +5 Baris
                    </button>
                    <button
                        type="button"
                        onClick={handleClearEmptyRows}
                        className="px-2.5 py-1.5 text-xs font-semibold rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-rose-50 hover:text-rose-700 inline-flex items-center gap-1 shadow-2xs"
                        title="Hapus baris yang namanya belum diisi"
                    >
                        <i className="bi bi-eraser"></i> Bersihkan Baris Kosong
                    </button>

                    <div className="h-6 w-px bg-slate-200 mx-1 hidden sm:block"></div>

                    {/* Undo / Redo */}
                    <button
                        type="button"
                        onClick={handleUndo}
                        disabled={!canUndo}
                        className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40"
                        title="Undo (Ctrl+Z)"
                    >
                        <i className="bi bi-arrow-counterclockwise"></i>
                    </button>
                    <button
                        type="button"
                        onClick={handleRedo}
                        disabled={!canRedo}
                        className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40"
                        title="Redo (Ctrl+Y)"
                    >
                        <i className="bi bi-arrow-clockwise"></i>
                    </button>

                    {/* Draft Management */}
                    <button
                        type="button"
                        onClick={handleSaveDraft}
                        className="px-2.5 py-1.5 text-xs font-semibold rounded-xl bg-sky-50 text-sky-700 border border-sky-200 hover:bg-sky-100"
                        title="Simpan sementara di browser"
                    >
                        <i className="bi bi-save2 mr-1"></i> Draft
                    </button>
                    <button
                        type="button"
                        onClick={handleLoadDraft}
                        className="px-2.5 py-1.5 text-xs font-semibold rounded-xl bg-sky-50 text-sky-700 border border-sky-200 hover:bg-sky-100"
                        title="Muat draft sebelumnya"
                    >
                        <i className="bi bi-folder2-open mr-1"></i> Buka Draft
                    </button>
                    <button
                        type="button"
                        onClick={handleDeleteDraft}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                        title="Hapus draft tersimpan"
                    >
                        <i className="bi bi-trash"></i>
                    </button>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setIsPasteModalOpen(true)}
                        className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-teal-50 text-teal-700 border border-teal-200 hover:bg-teal-100 inline-flex items-center gap-1.5"
                    >
                        <i className="bi bi-clipboard-plus"></i>
                        <span>Modal Tempel Massal</span>
                    </button>
                    <span className="text-xs font-medium text-slate-500">
                        {filteredRows.length} baris ({rows.filter(r => r.nama?.trim()).length} terisi)
                    </span>
                </div>
            </div>

            {/* Table Container Grid */}
            <div className="flex-1 overflow-auto p-4 sm:p-5">
                <div className="rounded-xl border border-slate-200 bg-white shadow-2xs overflow-hidden">
                    <div className="overflow-x-auto max-h-[calc(100vh-230px)]">
                        <table ref={tableRef} className="w-full divide-y divide-slate-200 text-xs text-left border-collapse">
                            <thead className="bg-slate-100 sticky top-0 z-10 text-[11px] font-bold uppercase tracking-wider text-slate-700 shadow-2xs">
                                <tr>
                                    <th scope="col" className="px-3 py-3 w-12 text-center border-r border-slate-200">No</th>
                                    {columnsConfig.map((col, idx) => (
                                        <th key={col.field} scope="col" className={`px-3.5 py-3 border-r border-slate-200 ${idx === 0 ? 'min-w-[220px]' : 'min-w-[160px]'}`}>
                                            <div className="flex items-center justify-between">
                                                <span>{col.label}</span>
                                                {col.required && <span className="text-rose-500 font-bold ml-1">*</span>}
                                            </div>
                                        </th>
                                    ))}
                                    <th scope="col" className="px-3 py-3 w-12 text-center">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                                {filteredRows.map((row, rIdx) => {
                                    const isRowActive = activeCell?.rowIndex === rIdx;
                                    const isRowValid = row.nama && row.nama.trim() !== '';

                                    return (
                                        <tr
                                            key={row.tempId}
                                            data-row-index={rIdx}
                                            className={`transition-colors ${
                                                isRowActive ? 'bg-teal-50/40' : rIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'
                                            } hover:bg-slate-100/70`}
                                        >
                                            {/* Row Number */}
                                            <td className={`px-2.5 py-2 text-center font-medium border-r border-slate-200 select-none ${
                                                isRowValid ? 'text-teal-700 bg-teal-50/30 font-bold' : 'text-slate-400 bg-slate-50/50'
                                            }`}>
                                                {rIdx + 1}
                                            </td>

                                            {/* Data Columns */}
                                            {columnsConfig.map((col, cIdx) => {
                                                const isCellFocused = activeCell?.rowIndex === rIdx && activeCell?.colIndex === cIdx;

                                                return (
                                                    <td
                                                        key={col.field}
                                                        className={`p-1 border-r border-slate-200 relative ${
                                                            isCellFocused ? 'bg-teal-100/40 ring-2 ring-teal-500 ring-inset z-5' : ''
                                                        }`}
                                                        onClick={() => setActiveCell({ rowIndex: rIdx, colIndex: cIdx })}
                                                    >
                                                        {col.type === 'text' || col.type === 'email' || col.type === 'url' ? (
                                                            <input
                                                                type={col.type}
                                                                data-cell-pos={`${rIdx}-${cIdx}`}
                                                                value={row[col.field] || ''}
                                                                onChange={e => {
                                                                    let val = e.target.value;
                                                                    if (col.uppercase) val = val.toUpperCase();
                                                                    updateRow(row.tempId, col.field, val);
                                                                }}
                                                                onFocus={() => setActiveCell({ rowIndex: rIdx, colIndex: cIdx })}
                                                                onKeyDown={e => handleCellKeyDown(e, rIdx, cIdx)}
                                                                onPaste={e => handleGridPaste(e, rIdx, cIdx)}
                                                                placeholder={col.placeholder || ''}
                                                                className={`w-full px-2.5 py-1.5 text-xs bg-transparent border-0 rounded-md focus:outline-none focus:bg-white ${
                                                                    col.required && !row[col.field] ? 'placeholder-rose-300' : 'text-slate-800'
                                                                }`}
                                                            />
                                                        ) : col.type === 'number' ? (
                                                            <input
                                                                type="number"
                                                                data-cell-pos={`${rIdx}-${cIdx}`}
                                                                value={row[col.field] ?? ''}
                                                                onChange={e => updateRow(row.tempId, col.field, e.target.value)}
                                                                onFocus={() => setActiveCell({ rowIndex: rIdx, colIndex: cIdx })}
                                                                onKeyDown={e => handleCellKeyDown(e, rIdx, cIdx)}
                                                                onPaste={e => handleGridPaste(e, rIdx, cIdx)}
                                                                placeholder={col.placeholder || ''}
                                                                className="w-full px-2.5 py-1.5 text-xs bg-transparent border-0 rounded-md focus:outline-none focus:bg-white text-slate-800 font-mono"
                                                            />
                                                        ) : col.type === 'date' ? (
                                                            <input
                                                                type="date"
                                                                data-cell-pos={`${rIdx}-${cIdx}`}
                                                                value={row[col.field] || ''}
                                                                onChange={e => updateRow(row.tempId, col.field, e.target.value)}
                                                                onFocus={() => setActiveCell({ rowIndex: rIdx, colIndex: cIdx })}
                                                                onKeyDown={e => handleCellKeyDown(e, rIdx, cIdx)}
                                                                className="w-full px-2.5 py-1.5 text-xs bg-transparent border-0 rounded-md focus:outline-none focus:bg-white text-slate-800"
                                                            />
                                                        ) : col.type === 'select' ? (
                                                            <select
                                                                data-cell-pos={`${rIdx}-${cIdx}`}
                                                                value={row[col.field] || ''}
                                                                onChange={e => updateRow(row.tempId, col.field, e.target.value)}
                                                                onFocus={() => setActiveCell({ rowIndex: rIdx, colIndex: cIdx })}
                                                                onKeyDown={e => handleCellKeyDown(e, rIdx, cIdx)}
                                                                className="w-full px-2 py-1.5 text-xs bg-transparent border-0 rounded-md focus:outline-none focus:bg-white text-slate-800 cursor-pointer"
                                                            >
                                                                <option value="">-- Pilih Jabatan --</option>
                                                                {(col.options || []).map((opt: string) => (
                                                                    <option key={opt} value={opt}>{opt}</option>
                                                                ))}
                                                            </select>
                                                        ) : col.type === 'select-kelas' ? (
                                                            <select
                                                                data-cell-pos={`${rIdx}-${cIdx}`}
                                                                value={row.kelasId || ''}
                                                                onChange={e => {
                                                                    updateRow(row.tempId, 'kelasId', e.target.value);
                                                                    updateRow(row.tempId, 'rombelId', '');
                                                                }}
                                                                disabled={row.jabatan !== 'Wali Kelas'}
                                                                onFocus={() => setActiveCell({ rowIndex: rIdx, colIndex: cIdx })}
                                                                onKeyDown={e => handleCellKeyDown(e, rIdx, cIdx)}
                                                                className="w-full px-2 py-1.5 text-xs bg-transparent border-0 rounded-md focus:outline-none focus:bg-white text-slate-800 disabled:opacity-40 cursor-pointer"
                                                            >
                                                                <option value="">-- Pilih Kelas --</option>
                                                                {settings.kelas.map(k => {
                                                                    const parentJenjang = settings.jenjang.find(j => j.id === k.jenjangId);
                                                                    return <option key={k.id} value={k.id}>{parentJenjang?.nama} - {k.nama}</option>;
                                                                })}
                                                            </select>
                                                        ) : col.type === 'select-rombel' ? (
                                                            <select
                                                                data-cell-pos={`${rIdx}-${cIdx}`}
                                                                value={row.rombelId || ''}
                                                                onChange={e => updateRow(row.tempId, 'rombelId', e.target.value)}
                                                                disabled={row.jabatan !== 'Wali Kelas'}
                                                                onFocus={() => setActiveCell({ rowIndex: rIdx, colIndex: cIdx })}
                                                                onKeyDown={e => handleCellKeyDown(e, rIdx, cIdx)}
                                                                className="w-full px-2 py-1.5 text-xs bg-transparent border-0 rounded-md focus:outline-none focus:bg-white text-slate-800 disabled:opacity-40 cursor-pointer"
                                                            >
                                                                <option value="">-- Pilih Rombel --</option>
                                                                {settings.rombel.filter(r => !row.kelasId || r.kelasId === parseInt(row.kelasId)).map(r => {
                                                                    const kelas = settings.kelas.find(k => k.id === r.kelasId);
                                                                    return <option key={r.id} value={r.id}>{kelas?.nama} - {r.nama}</option>;
                                                                })}
                                                            </select>
                                                        ) : col.type === 'select-mudir' ? (
                                                            <select
                                                                data-cell-pos={`${rIdx}-${cIdx}`}
                                                                value={row.mudirId || ''}
                                                                onChange={e => updateRow(row.tempId, 'mudirId', e.target.value)}
                                                                onFocus={() => setActiveCell({ rowIndex: rIdx, colIndex: cIdx })}
                                                                onKeyDown={e => handleCellKeyDown(e, rIdx, cIdx)}
                                                                className="w-full px-2 py-1.5 text-xs bg-transparent border-0 rounded-md focus:outline-none focus:bg-white text-slate-800 cursor-pointer"
                                                            >
                                                                <option value="">-- Pilih Mudir Marhalah --</option>
                                                                {(settings.tenagaPengajar || []).map(t => (
                                                                    <option key={t.id} value={t.id}>{t.nama}</option>
                                                                ))}
                                                            </select>
                                                        ) : col.type === 'select-jenjang' ? (
                                                            <select
                                                                data-cell-pos={`${rIdx}-${cIdx}`}
                                                                value={row.jenjangId || ''}
                                                                onChange={e => updateRow(row.tempId, 'jenjangId', e.target.value)}
                                                                onFocus={() => setActiveCell({ rowIndex: rIdx, colIndex: cIdx })}
                                                                onKeyDown={e => handleCellKeyDown(e, rIdx, cIdx)}
                                                                className="w-full px-2 py-1.5 text-xs bg-transparent border-0 rounded-md focus:outline-none focus:bg-white text-slate-800 cursor-pointer"
                                                            >
                                                                {settings.jenjang.map(j => (
                                                                    <option key={j.id} value={j.id}>{j.nama}</option>
                                                                ))}
                                                            </select>
                                                        ) : col.type === 'select-kelas-all' ? (
                                                            <select
                                                                data-cell-pos={`${rIdx}-${cIdx}`}
                                                                value={row.kelasId || ''}
                                                                onChange={e => updateRow(row.tempId, 'kelasId', e.target.value)}
                                                                onFocus={() => setActiveCell({ rowIndex: rIdx, colIndex: cIdx })}
                                                                onKeyDown={e => handleCellKeyDown(e, rIdx, cIdx)}
                                                                className="w-full px-2 py-1.5 text-xs bg-transparent border-0 rounded-md focus:outline-none focus:bg-white text-slate-800 cursor-pointer"
                                                            >
                                                                {settings.kelas.map(k => {
                                                                    const parentJenjang = settings.jenjang.find(j => j.id === k.jenjangId);
                                                                    const label = parentJenjang ? `${k.nama} (${parentJenjang.nama})` : k.nama;
                                                                    return <option key={k.id} value={k.id}>{label}</option>;
                                                                })}
                                                            </select>
                                                        ) : col.type === 'select-wali' ? (
                                                            <select
                                                                data-cell-pos={`${rIdx}-${cIdx}`}
                                                                value={row.waliKelasId || ''}
                                                                onChange={e => updateRow(row.tempId, 'waliKelasId', e.target.value)}
                                                                onFocus={() => setActiveCell({ rowIndex: rIdx, colIndex: cIdx })}
                                                                onKeyDown={e => handleCellKeyDown(e, rIdx, cIdx)}
                                                                className="w-full px-2 py-1.5 text-xs bg-transparent border-0 rounded-md focus:outline-none focus:bg-white text-slate-800 cursor-pointer"
                                                            >
                                                                <option value="">-- Pilih Wali Kelas --</option>
                                                                {(settings.tenagaPengajar || []).map(t => (
                                                                    <option key={t.id} value={t.id}>{t.nama}</option>
                                                                ))}
                                                            </select>
                                                        ) : null}
                                                    </td>
                                                );
                                            })}

                                            {/* Row Delete Button */}
                                            <td className="px-2 py-1 text-center">
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveRow(row.tempId)}
                                                    tabIndex={-1}
                                                    className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                                    title="Hapus baris ini"
                                                >
                                                    <i className="bi bi-trash"></i>
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Bottom Quick Row Addition */}
                <div className="mt-3 flex items-center justify-between">
                    <button
                        type="button"
                        onClick={() => handleAddRows(1)}
                        className="text-teal-700 font-semibold text-xs hover:text-teal-900 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-50 border border-teal-200"
                    >
                        <i className="bi bi-plus-circle-fill"></i> Tambah Baris Berikutnya (↵ Enter)
                    </button>
                    <span className="text-[11px] text-slate-400">
                        Tips: Tekan <kbd className="px-1 py-0.5 bg-slate-200 rounded font-mono text-[10px]">Enter</kbd> di baris terakhir untuk membuat baris baru secara instan.
                    </span>
                </div>
            </div>

            {/* Modal Tempel Massal Textarea */}
            {isPasteModalOpen && (
                <div className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
                    <div className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
                        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="p-2 rounded-xl bg-teal-100 text-teal-700">
                                    <i className="bi bi-clipboard2-data"></i>
                                </span>
                                <div>
                                    <h3 className="font-bold text-slate-800 text-sm">Tempel Data Massal dari Spreadsheet</h3>
                                    <p className="text-[11px] text-slate-500">Salin dari Excel atau Google Sheets lalu tempelkan di kotak bawah</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsPasteModalOpen(false)}
                                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200"
                            >
                                <i className="bi bi-x-lg"></i>
                            </button>
                        </div>
                        <div className="p-5 space-y-3">
                            <div className="text-xs text-slate-600 bg-slate-50 border border-slate-200 p-3 rounded-xl">
                                <span className="font-semibold text-slate-700">Urutan Kolom yang diharapkan:</span>{' '}
                                <span className="font-mono text-teal-700">{columnsConfig.map(c => c.label.replace(' (Wajib)', '')).join(' | ')}</span>
                            </div>
                            <textarea
                                rows={9}
                                value={pasteText}
                                onChange={e => setPasteText(e.target.value)}
                                className="w-full border border-slate-200 rounded-xl text-xs p-3 font-mono focus:ring-2 focus:ring-teal-500 focus:outline-none"
                                placeholder={`Contoh:\nUstadz Abdullah;Wali Kelas;;;08123456789;abdullah@mail.com;2024-01-01\nUstadz Fauzan;Guru Mapel;;;08987654321;fauzan@mail.com;2024-01-01`}
                            />
                        </div>
                        <div className="px-5 py-3.5 border-t border-slate-100 bg-slate-50 flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setIsPasteModalOpen(false)}
                                className="px-4 py-2 text-xs font-semibold rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                            >
                                Batal
                            </button>
                            <button
                                type="button"
                                onClick={handleApplyPasteTextModal}
                                disabled={!pasteText.trim()}
                                className="px-5 py-2 text-xs font-semibold rounded-xl bg-teal-600 hover:bg-teal-700 text-white shadow-xs disabled:opacity-50 inline-flex items-center gap-1.5"
                            >
                                <i className="bi bi-plus-lg"></i> Masukkan ke Tabel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
