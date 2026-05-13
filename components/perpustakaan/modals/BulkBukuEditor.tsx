
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Buku } from '../../../types';
import { useAppContext } from '../../../AppContext';

interface BulkBukuEditorProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: Omit<Buku, 'id'>[]) => Promise<void>;
}

type EditableRow = Partial<Buku> & { tempId: number };

export const BulkBukuEditor: React.FC<BulkBukuEditorProps> = ({ isOpen, onClose, onSave }) => {
    const { showToast } = useAppContext();
    const [rows, setRows] = useState<EditableRow[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [query, setQuery] = useState('');
    const [isPasteModalOpen, setIsPasteModalOpen] = useState(false);
    const [pasteText, setPasteText] = useState('');
    const undoStackRef = useRef<EditableRow[][]>([]);
    const redoStackRef = useRef<EditableRow[][]>([]);
    const draftStorageKey = 'esantri:bulk-buku-draft';

    const cloneRows = (source: EditableRow[]) => source.map((row) => ({ ...row }));
    const canUndo = undoStackRef.current.length > 0;
    const canRedo = redoStackRef.current.length > 0;

    const applyRowsMutation = (mutator: (draft: EditableRow[]) => EditableRow[]) => {
        setRows(prev => {
            const snapshot = cloneRows(prev);
            const nextRows = mutator(cloneRows(prev));
            undoStackRef.current.push(snapshot);
            if (undoStackRef.current.length > 30) undoStackRef.current.shift();
            redoStackRef.current = [];
            return nextRows;
        });
    };

    useEffect(() => {
        if (isOpen) {
            undoStackRef.current = [];
            redoStackRef.current = [];
            setQuery('');
            // Start with 5 empty rows
            const initialRows = Array.from({ length: 5 }).map((_, i) => createEmptyRow(i));
            setRows(initialRows);
        }
    }, [isOpen]);

    const createEmptyRow = (index: number): EditableRow => ({
        tempId: Date.now() + index,
        kodeBuku: '',
        judul: '',
        kategori: 'Kitab Kuning',
        penulis: '',
        penerbit: '',
        tahunTerbit: undefined,
        stok: 1,
        lokasiRak: ''
    });

    const handleAddRow = () => {
        applyRowsMutation(prev => [...prev, createEmptyRow(prev.length)]);
    };

    const handleRemoveRow = (tempId: number) => {
        applyRowsMutation(prev => prev.filter(r => r.tempId !== tempId));
    };

    const updateRow = (tempId: number, field: string, value: any) => {
        applyRowsMutation(prev => prev.map(row => {
            if (row.tempId !== tempId) return row;
            
            // Auto capitalize Kode Buku
            if (field === 'kodeBuku') return { ...row, [field]: value.toUpperCase() };

            // Number handling
            if (field === 'stok' || field === 'tahunTerbit') {
                return { ...row, [field]: value ? parseInt(value) : undefined };
            }

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
        showToast('Draft bulk buku disimpan.', 'success');
    };

    const handleLoadDraft = () => {
        const raw = localStorage.getItem(draftStorageKey);
        if (!raw) {
            showToast('Draft bulk buku tidak ditemukan.', 'info');
            return;
        }
        try {
            const parsed = JSON.parse(raw) as { rows?: EditableRow[] };
            if (!Array.isArray(parsed.rows)) return;
            undoStackRef.current = [];
            redoStackRef.current = [];
            setRows(parsed.rows.map((row, i) => ({ ...row, tempId: row.tempId || Date.now() + i })));
            showToast('Draft bulk buku dimuat.', 'success');
        } catch {
            showToast('Draft bulk buku tidak valid.', 'error');
        }
    };

    const handleDeleteDraft = () => {
        localStorage.removeItem(draftStorageKey);
        showToast('Draft bulk buku dihapus.', 'success');
    };

    const parseRowsFromText = (text: string): EditableRow[] => {
        const lines = text
            .split('\n')
            .map(line => line.trim())
            .filter(Boolean);
        return lines.map((line, i) => {
            const chunks = line.includes('\t') ? line.split('\t') : line.split(';');
            const row = createEmptyRow(i);
            row.judul = (chunks[0] || '').trim();
            row.kodeBuku = (chunks[1] || '').trim().toUpperCase();
            row.kategori = (chunks[2] || 'Kitab Kuning').trim();
            row.penulis = (chunks[3] || '').trim();
            row.penerbit = (chunks[4] || '').trim();
            row.tahunTerbit = chunks[5] ? parseInt(chunks[5], 10) || undefined : undefined;
            row.stok = chunks[6] ? parseInt(chunks[6], 10) || 1 : 1;
            row.lokasiRak = (chunks[7] || '').trim();
            return row;
        });
    };

    const handleApplyPaste = () => {
        const parsed = parseRowsFromText(pasteText);
        if (!parsed.length) return;
        applyRowsMutation(prev => [...prev, ...parsed.map((row, i) => ({ ...row, tempId: Date.now() + i }))]);
        setPasteText('');
        setIsPasteModalOpen(false);
    };

    const filteredRows = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return rows;
        return rows.filter(row =>
            [row.judul, row.kodeBuku, row.penulis, row.penerbit, row.kategori]
                .some(v => (v || '').toString().toLowerCase().includes(q))
        );
    }, [rows, query]);

    const handleSave = async () => {
        const validRows = rows.filter(r => r.judul?.trim());

        if (validRows.length === 0) {
            showToast('Tidak ada data valid (Judul Buku wajib diisi).', 'error');
            return;
        }

        setIsSaving(true);
        try {
            const cleanData = validRows.map(({ tempId, ...rest }) => {
                // Generate Kode otomatis jika kosong
                if (!rest.kodeBuku) {
                    rest.kodeBuku = `BK-${Date.now().toString().slice(-4)}-${Math.floor(Math.random()*1000)}`;
                }
                return rest as Omit<Buku, 'id'>;
            });
            
            await onSave(cleanData);
            onClose();
        } catch (error) {
            showToast('Gagal menyimpan data.', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-gray-100 z-[80] flex flex-col">
            {/* Header */}
            <div className="bg-white border-b px-6 py-4 flex justify-between items-center shadow-sm shrink-0 z-20">
                <div>
                    <h2 className="text-xl font-bold text-gray-800">Tambah Buku Massal</h2>
                    <p className="text-sm text-gray-500">Input katalog buku dengan cepat dalam format tabel.</p>
                </div>
                <div className="flex gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors">Batal</button>
                    <button 
                        onClick={handleSave} 
                        disabled={isSaving}
                        className="px-6 py-2 bg-teal-600 text-white hover:bg-teal-700 rounded-lg font-medium shadow-sm transition-colors disabled:bg-teal-400 flex items-center gap-2"
                    >
                        {isSaving && <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>}
                        Simpan Semua
                    </button>
                </div>
            </div>

            {/* Table Container */}
            <div className="flex-grow overflow-auto p-6">
                <div className="mb-4 bg-white border rounded-lg p-3 flex flex-wrap items-center gap-2">
                    <input
                        type="text"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        placeholder="Cari judul/kode/penulis..."
                        className="border-gray-300 rounded text-sm h-9 px-3 min-w-[260px]"
                    />
                    <button onClick={handleUndo} disabled={!canUndo} className="px-3 py-2 text-sm rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-50">
                        <i className="bi bi-arrow-counterclockwise"></i> Undo
                    </button>
                    <button onClick={handleRedo} disabled={!canRedo} className="px-3 py-2 text-sm rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-50">
                        <i className="bi bi-arrow-clockwise"></i> Redo
                    </button>
                    <button onClick={handleSaveDraft} className="px-3 py-2 text-sm rounded bg-blue-50 text-blue-700 hover:bg-blue-100">Simpan Draft</button>
                    <button onClick={handleLoadDraft} className="px-3 py-2 text-sm rounded bg-blue-50 text-blue-700 hover:bg-blue-100">Muat Draft</button>
                    <button onClick={handleDeleteDraft} className="px-3 py-2 text-sm rounded bg-gray-100 hover:bg-gray-200">Hapus Draft</button>
                    <button onClick={() => setIsPasteModalOpen(true)} className="px-3 py-2 text-sm rounded bg-teal-50 text-teal-700 hover:bg-teal-100">Tempel Massal</button>
                    <span className="text-xs text-gray-500 ml-auto">{filteredRows.length} baris tampil</span>
                </div>
                <div className="bg-white rounded-lg shadow border relative">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 text-sm">
                            <thead className="bg-gray-100 sticky top-0 z-10 shadow-sm">
                                <tr>
                                    <th className="px-2 py-3 text-center font-semibold text-gray-700 w-10 border-r">No</th>
                                    <th className="px-4 py-3 text-left font-semibold text-gray-700 min-w-[250px]">Judul Buku <span className="text-red-500">*</span></th>
                                    <th className="px-4 py-3 text-left font-semibold text-gray-700 w-32">Kode</th>
                                    <th className="px-4 py-3 text-left font-semibold text-gray-700 w-40">Kategori</th>
                                    <th className="px-4 py-3 text-left font-semibold text-gray-700 min-w-[150px]">Penulis</th>
                                    <th className="px-4 py-3 text-left font-semibold text-gray-700 min-w-[150px]">Penerbit</th>
                                    <th className="px-4 py-3 text-left font-semibold text-gray-700 w-24">Tahun</th>
                                    <th className="px-4 py-3 text-left font-semibold text-gray-700 w-20">Stok</th>
                                    <th className="px-4 py-3 text-left font-semibold text-gray-700 w-32">Rak</th>
                                    <th className="px-4 py-3 text-center w-10"><i className="bi bi-trash"></i></th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {filteredRows.map((row, index) => (
                                    <tr key={row.tempId} className="hover:bg-gray-50 group">
                                        <td className="px-2 py-2 text-center text-gray-500 border-r bg-gray-50">{index + 1}</td>
                                        
                                        <td className="px-2 py-2">
                                            <input 
                                                type="text" 
                                                value={row.judul} 
                                                onChange={e => updateRow(row.tempId, 'judul', e.target.value)} 
                                                className="w-full border-gray-300 rounded text-sm h-9 px-2 focus:ring-teal-500 focus:border-teal-500 font-medium" 
                                                placeholder="Judul Buku..." 
                                            />
                                        </td>
                                        
                                        <td className="px-2 py-2">
                                            <input 
                                                type="text" 
                                                value={row.kodeBuku} 
                                                onChange={e => updateRow(row.tempId, 'kodeBuku', e.target.value)} 
                                                className="w-full border-gray-300 rounded text-sm h-9 px-2 font-mono uppercase" 
                                                placeholder="(Auto)"
                                            />
                                        </td>
                                        
                                        <td className="px-2 py-2">
                                            <select 
                                                value={row.kategori} 
                                                onChange={e => updateRow(row.tempId, 'kategori', e.target.value)} 
                                                className="w-full border-gray-300 rounded text-sm h-9 px-1"
                                            >
                                                <option value="Kitab Kuning">Kitab Kuning</option>
                                                <option value="Buku Pelajaran">Buku Pelajaran</option>
                                                <option value="Umum">Umum</option>
                                                <option value="Referensi">Referensi</option>
                                            </select>
                                        </td>

                                        <td className="px-2 py-2">
                                            <input 
                                                type="text" 
                                                value={row.penulis} 
                                                onChange={e => updateRow(row.tempId, 'penulis', e.target.value)} 
                                                className="w-full border-gray-300 rounded text-sm h-9 px-2" 
                                            />
                                        </td>

                                        <td className="px-2 py-2">
                                            <input 
                                                type="text" 
                                                value={row.penerbit} 
                                                onChange={e => updateRow(row.tempId, 'penerbit', e.target.value)} 
                                                className="w-full border-gray-300 rounded text-sm h-9 px-2" 
                                            />
                                        </td>

                                        <td className="px-2 py-2">
                                            <input 
                                                type="number" 
                                                value={row.tahunTerbit || ''} 
                                                onChange={e => updateRow(row.tempId, 'tahunTerbit', e.target.value)} 
                                                className="w-full border-gray-300 rounded text-sm h-9 px-2" 
                                                placeholder="YYYY"
                                            />
                                        </td>

                                        <td className="px-2 py-2">
                                            <input 
                                                type="number" 
                                                value={row.stok} 
                                                onChange={e => updateRow(row.tempId, 'stok', e.target.value)} 
                                                className="w-full border-gray-300 rounded text-sm h-9 px-2 text-center font-bold" 
                                                min={0}
                                            />
                                        </td>

                                        <td className="px-2 py-2">
                                            <input 
                                                type="text" 
                                                value={row.lokasiRak} 
                                                onChange={e => updateRow(row.tempId, 'lokasiRak', e.target.value)} 
                                                className="w-full border-gray-300 rounded text-sm h-9 px-2" 
                                                placeholder="A-01"
                                            />
                                        </td>

                                        <td className="px-2 py-2 text-center border-l">
                                            <button onClick={() => handleRemoveRow(row.tempId)} className="text-red-500 hover:text-red-700 p-1"><i className="bi bi-x-lg"></i></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="p-4 bg-gray-50 border-t sticky bottom-0 left-0 right-0">
                        <button onClick={handleAddRow} className="text-teal-600 font-medium text-sm hover:text-teal-800 flex items-center gap-2">
                            <i className="bi bi-plus-circle-fill"></i> Tambah Baris
                        </button>
                    </div>
                </div>
            </div>
            {isPasteModalOpen && (
                <div className="fixed inset-0 z-[90] bg-black/30 flex items-center justify-center p-4">
                    <div className="w-full max-w-3xl bg-white rounded-xl shadow-lg border">
                        <div className="px-4 py-3 border-b flex items-center justify-between">
                            <h3 className="font-semibold text-gray-800">Tempel Data Buku Massal</h3>
                            <button onClick={() => setIsPasteModalOpen(false)} className="text-gray-500 hover:text-gray-700">
                                <i className="bi bi-x-lg"></i>
                            </button>
                        </div>
                        <div className="p-4 space-y-3">
                            <p className="text-sm text-gray-600">
                                Format kolom: Judul;Kode;Kategori;Penulis;Penerbit;Tahun;Stok;Rak
                            </p>
                            <textarea
                                rows={10}
                                value={pasteText}
                                onChange={e => setPasteText(e.target.value)}
                                className="w-full border-gray-300 rounded-lg text-sm p-3"
                                placeholder="Kitab Tauhid;BK-001;Kitab Kuning;Penulis A;Penerbit B;2024;3;A-01"
                            />
                        </div>
                        <div className="px-4 py-3 border-t flex justify-end gap-2">
                            <button onClick={() => setIsPasteModalOpen(false)} className="px-4 py-2 text-sm rounded bg-gray-100 hover:bg-gray-200">Batal</button>
                            <button onClick={handleApplyPaste} className="px-4 py-2 text-sm rounded bg-teal-600 text-white hover:bg-teal-700">Masukkan ke Tabel</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
