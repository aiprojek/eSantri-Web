
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { PondokSettings } from '../../../types';

export type MasterType = 'pendidik' | 'jenjang' | 'kelas' | 'rombel' | 'mapel';

interface BulkMasterEditorProps {
    isOpen: boolean;
    onClose: () => void;
    mode: MasterType;
    settings: PondokSettings;
    onSave: (data: any[]) => void;
    initialData?: any[];
}

export const BulkMasterEditor: React.FC<BulkMasterEditorProps> = ({ 
    isOpen, onClose, mode, settings, onSave, initialData 
}) => {
    const [rows, setRows] = useState<any[]>([]);
    const [query, setQuery] = useState('');
    const [isPasteModalOpen, setIsPasteModalOpen] = useState(false);
    const [pasteText, setPasteText] = useState('');
    const undoStackRef = useRef<any[][]>([]);
    const redoStackRef = useRef<any[][]>([]);
    const draftStorageKey = `esantri:bulk-master-draft:${mode}`;

    const cloneRows = (source: any[]) => source.map((row) => ({ ...row }));
    const canUndo = undoStackRef.current.length > 0;
    const canRedo = redoStackRef.current.length > 0;

    const applyRowsMutation = (mutator: (draft: any[]) => any[]) => {
        setRows(prev => {
            const snapshot = cloneRows(prev);
            const nextRows = mutator(cloneRows(prev));
            undoStackRef.current.push(snapshot);
            if (undoStackRef.current.length > 30) undoStackRef.current.shift();
            redoStackRef.current = [];
            return nextRows;
        });
    };

    const parseMultiValue = (value?: string) =>
        (value || '')
            .split(/\n|;/)
            .map(v => v.trim())
            .filter(Boolean);

    useEffect(() => {
        if (isOpen) {
            undoStackRef.current = [];
            redoStackRef.current = [];
            setQuery('');
            if (initialData && initialData.length > 0) {
                setRows(initialData.map((item, i) => ({ ...item, tempId: Date.now() + i })));
            } else {
                // Inisialisasi dengan 3 baris kosong
                const initialRows = Array.from({ length: 3 }).map((_, i) => createEmptyRow(i));
                setRows(initialRows);
            }
        }
    }, [isOpen, mode, initialData]);

    const createEmptyRow = (index: number) => {
        const base = { tempId: Date.now() + index, nama: '' };
        switch (mode) {
            case 'pendidik': return { ...base, jabatan: '', tanggalMulai: new Date().toISOString().split('T')[0], telepon: '', email: '', kelasId: '', rombelId: '' };
            case 'jenjang': return { ...base, kode: '', mudirId: '' };
            case 'kelas': return { ...base, jenjangId: settings.jenjang[0]?.id || '' };
            case 'rombel': return { ...base, kelasId: settings.kelas[0]?.id || '', waliKelasId: '' };
            case 'mapel': return { ...base, jenjangId: settings.jenjang[0]?.id || '', kkm: 70, modul: '', linkUnduh: '', linkPembelian: '' };
            default: return base;
        }
    };

    const handleAddRow = () => {
        applyRowsMutation(prev => [...prev, createEmptyRow(prev.length)]);
    };

    const handleRemoveRow = (tempId: number) => {
        applyRowsMutation(prev => prev.filter(r => r.tempId !== tempId));
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
    };

    const handleLoadDraft = () => {
        const raw = localStorage.getItem(draftStorageKey);
        if (!raw) return;
        try {
            const parsed = JSON.parse(raw) as { rows?: any[] };
            if (!Array.isArray(parsed.rows)) return;
            undoStackRef.current = [];
            redoStackRef.current = [];
            setRows(parsed.rows.map((row, i) => ({ ...row, tempId: row.tempId || Date.now() + i })));
        } catch {
            // ignore invalid draft
        }
    };

    const handleDeleteDraft = () => {
        localStorage.removeItem(draftStorageKey);
    };

    const getPasteFields = (): string[] => {
        switch (mode) {
            case 'pendidik':
                return ['nama', 'jabatan', 'kelasId', 'rombelId', 'telepon', 'email', 'tanggalMulai'];
            case 'jenjang':
                return ['nama', 'kode', 'mudirId'];
            case 'kelas':
                return ['nama', 'jenjangId'];
            case 'rombel':
                return ['nama', 'kelasId', 'waliKelasId'];
            case 'mapel':
                return ['nama', 'kkm', 'modul', 'linkUnduh', 'linkPembelian', 'jenjangId'];
            default:
                return ['nama'];
        }
    };

    const parseRowsFromText = (text: string) => {
        const lines = text
            .split('\n')
            .map(line => line.trim())
            .filter(Boolean);
        if (!lines.length) return [];
        const fields = getPasteFields();
        return lines.map((line, i) => {
            const chunks = line.includes('\t') ? line.split('\t') : line.split(';');
            const row: any = createEmptyRow(i);
            fields.forEach((field, idx) => {
                row[field] = (chunks[idx] || '').trim();
            });
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
        return rows.filter(row => (row.nama || '').toString().toLowerCase().includes(q));
    }, [rows, query]);

    const handleSave = () => {
        // Filter baris yang punya Nama
        const validRows = rows.filter(r => r.nama && r.nama.trim() !== '');
        if (validRows.length === 0) return;
        
        // Bersihkan data tempId sebelum dikirim
        const cleanData = validRows.map(({ tempId, ...rest }) => {
            // Konversi ID dropdown ke number jika perlu
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
        const prefix = isEdit ? 'Edit' : 'Tambah';
        switch(mode) {
            case 'pendidik': return `${prefix} Tenaga Pendidik Massal`;
            case 'jenjang': return `${prefix} Jenjang Pendidikan Massal`;
            case 'kelas': return `${prefix} Kelas Massal`;
            case 'rombel': return `${prefix} Rombel Massal`;
            case 'mapel': return `${prefix} Mata Pelajaran Massal`;
            default: return `${prefix} Data Massal`;
        }
    };

    return (
        <div className="fixed inset-0 bg-gray-100 z-[80] flex flex-col">
            {/* Header */}
            <div className="bg-white border-b px-6 py-4 flex justify-between items-center shadow-sm shrink-0 z-20">
                <div>
                    <h2 className="text-xl font-bold text-gray-800">{getTitle()}</h2>
                    <p className="text-sm text-gray-500">Isi data detail dalam format tabel di bawah ini.</p>
                </div>
                <div className="flex gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors">Batal</button>
                    <button onClick={handleSave} className="px-6 py-2 bg-teal-600 text-white hover:bg-teal-700 rounded-lg font-medium shadow-sm transition-colors flex items-center gap-2">
                        <i className="bi bi-save"></i> Simpan Semua
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
                        placeholder="Cari nama..."
                        className="border-gray-300 rounded text-sm h-9 px-3 min-w-[220px]"
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
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                        <thead className="bg-gray-100 sticky top-0 z-10 shadow-sm">
                            <tr>
                                <th className="px-4 py-3 text-center w-10 font-semibold text-gray-600 border-r">No</th>
                                <th className="px-4 py-3 text-left font-semibold text-gray-600 min-w-[200px]">Nama (Wajib)</th>
                                
                                {mode === 'pendidik' && (
                                    <>
                                        <th className="px-4 py-3 text-left font-semibold text-gray-600 min-w-[150px]">Jabatan Awal</th>
                                        <th className="px-4 py-3 text-left font-semibold text-gray-600 min-w-[180px]">Kelas (Wali)</th>
                                        <th className="px-4 py-3 text-left font-semibold text-gray-600 min-w-[150px]">Rombel (Wali)</th>
                                        <th className="px-4 py-3 text-left font-semibold text-gray-600 min-w-[150px]">No. Telp</th>
                                        <th className="px-4 py-3 text-left font-semibold text-gray-600 min-w-[180px]">Email</th>
                                        <th className="px-4 py-3 text-left font-semibold text-gray-600 min-w-[150px]">Tanggal Mulai</th>
                                    </>
                                )}
                                
                                {mode === 'jenjang' && (
                                    <>
                                        <th className="px-4 py-3 text-left font-semibold text-gray-600 w-32">Kode (Singkatan)</th>
                                        <th className="px-4 py-3 text-left font-semibold text-gray-600 min-w-[200px]">Mudir Marhalah</th>
                                    </>
                                )}

                                {mode === 'kelas' && (
                                    <th className="px-4 py-3 text-left font-semibold text-gray-600 min-w-[200px]">Induk Jenjang</th>
                                )}

                                {mode === 'rombel' && (
                                    <>
                                        <th className="px-4 py-3 text-left font-semibold text-gray-600 min-w-[200px]">Induk Kelas</th>
                                        <th className="px-4 py-3 text-left font-semibold text-gray-600 min-w-[200px]">Wali Kelas</th>
                                    </>
                                )}

                                {mode === 'mapel' && (
                                    <>
                                        <th className="px-4 py-3 text-left font-semibold text-gray-600 w-24">KKM</th>
                                        <th className="px-4 py-3 text-left font-semibold text-gray-600 min-w-[200px]">Modul / Kitab</th>
                                        <th className="px-4 py-3 text-left font-semibold text-gray-600 min-w-[200px]">Link Unduh</th>
                                        <th className="px-4 py-3 text-left font-semibold text-gray-600 min-w-[200px]">Link Beli</th>
                                        <th className="px-4 py-3 text-left font-semibold text-gray-600 min-w-[200px]">Jenjang</th>
                                    </>
                                )}

                                <th className="px-4 py-3 text-center w-10"><i className="bi bi-trash"></i></th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredRows.map((row, index) => (
                                <tr key={row.tempId} className="hover:bg-gray-50 group">
                                    <td className="px-4 py-2 text-center text-gray-500 border-r bg-gray-50">{index + 1}</td>
                                    <td className="px-4 py-2">
                                        <input type="text" value={row.nama} onChange={e => updateRow(row.tempId, 'nama', e.target.value)} className="w-full border-gray-300 rounded text-sm h-9 px-2 focus:ring-teal-500 focus:border-teal-500" placeholder="Nama..." />
                                    </td>

                                    {mode === 'pendidik' && (
                                        <>
                                            <td className="px-4 py-2">
                                                <select value={row.jabatan} onChange={e => updateRow(row.tempId, 'jabatan', e.target.value)} className="w-full border-gray-300 rounded text-sm h-9 px-1">
                                                    <option value="">-- Jabatan --</option>
                                                    <option value="Wali Kelas">Wali Kelas</option>
                                                    <option value="Guru Mapel">Guru Mapel</option>
                                                    <option value="Pengajar">Pengajar</option>
                                                    <option value="Staff">Staff</option>
                                                </select>
                                            </td>
                                            <td className="px-4 py-2">
                                                <select
                                                    value={row.kelasId || ''}
                                                    onChange={e => {
                                                        updateRow(row.tempId, 'kelasId', e.target.value);
                                                        updateRow(row.tempId, 'rombelId', '');
                                                    }}
                                                    disabled={row.jabatan !== 'Wali Kelas'}
                                                    className="w-full border-gray-300 rounded text-sm h-9 px-1 disabled:opacity-50"
                                                >
                                                    <option value="">-- Kelas --</option>
                                                    {settings.kelas.map(k => {
                                                        const parentJenjang = settings.jenjang.find(j => j.id === k.jenjangId);
                                                        return <option key={k.id} value={k.id}>{parentJenjang?.nama} - {k.nama}</option>;
                                                    })}
                                                </select>
                                            </td>
                                            <td className="px-4 py-2">
                                                <select value={row.rombelId} onChange={e => updateRow(row.tempId, 'rombelId', e.target.value)} disabled={row.jabatan !== 'Wali Kelas'} className="w-full border-gray-300 rounded text-sm h-9 px-1 disabled:opacity-50">
                                                    <option value="">-- Rombel --</option>
                                                    {settings.rombel.filter(r => !row.kelasId || r.kelasId === parseInt(row.kelasId)).map(r => {
                                                        const kelas = settings.kelas.find(k => k.id === r.kelasId);
                                                        return <option key={r.id} value={r.id}>{kelas?.nama} - {r.nama}</option>
                                                    })}
                                                </select>
                                            </td>
                                            <td className="px-4 py-2"><input type="text" value={row.telepon} onChange={e => updateRow(row.tempId, 'telepon', e.target.value)} className="w-full border-gray-300 rounded text-sm h-9 px-2" placeholder="08..." /></td>
                                            <td className="px-4 py-2"><input type="email" value={row.email} onChange={e => updateRow(row.tempId, 'email', e.target.value)} className="w-full border-gray-300 rounded text-sm h-9 px-2" placeholder="email@..." /></td>
                                            <td className="px-4 py-2"><input type="date" value={row.tanggalMulai} onChange={e => updateRow(row.tempId, 'tanggalMulai', e.target.value)} className="w-full border-gray-300 rounded text-sm h-9 px-2" /></td>
                                        </>
                                    )}

                                    {mode === 'jenjang' && (
                                        <>
                                            <td className="px-4 py-2"><input type="text" value={row.kode} onChange={e => updateRow(row.tempId, 'kode', e.target.value)} className="w-full border-gray-300 rounded text-sm h-9 px-2 uppercase" placeholder="CTH: SW" maxLength={5} /></td>
                                            <td className="px-4 py-2">
                                                <select value={row.mudirId} onChange={e => updateRow(row.tempId, 'mudirId', e.target.value)} className="w-full border-gray-300 rounded text-sm h-9 px-1">
                                                    <option value="">-- Pilih Mudir --</option>
                                                    {settings.tenagaPengajar.map(t => <option key={t.id} value={t.id}>{t.nama}</option>)}
                                                </select>
                                            </td>
                                        </>
                                    )}

                                    {mode === 'kelas' && (
                                        <td className="px-4 py-2">
                                            <select value={row.jenjangId} onChange={e => updateRow(row.tempId, 'jenjangId', e.target.value)} className="w-full border-gray-300 rounded text-sm h-9 px-1">
                                                {settings.jenjang.map(j => <option key={j.id} value={j.id}>{j.nama}</option>)}
                                            </select>
                                        </td>
                                    )}

                                    {mode === 'rombel' && (
                                        <>
                                            <td className="px-4 py-2">
                                                <select value={row.kelasId} onChange={e => updateRow(row.tempId, 'kelasId', e.target.value)} className="w-full border-gray-300 rounded text-sm h-9 px-1">
                                                    {settings.kelas.map(k => {
                                                        const parentJenjang = settings.jenjang.find(j => j.id === k.jenjangId);
                                                        const label = parentJenjang ? `${k.nama} (${parentJenjang.nama})` : k.nama;
                                                        return <option key={k.id} value={k.id}>{label}</option>
                                                    })}
                                                </select>
                                            </td>
                                            <td className="px-4 py-2">
                                                <select value={row.waliKelasId} onChange={e => updateRow(row.tempId, 'waliKelasId', e.target.value)} className="w-full border-gray-300 rounded text-sm h-9 px-1">
                                                    <option value="">-- Pilih Wali Kelas --</option>
                                                    {settings.tenagaPengajar.map(t => <option key={t.id} value={t.id}>{t.nama}</option>)}
                                                </select>
                                            </td>
                                        </>
                                    )}

                                    {mode === 'mapel' && (
                                        <>
                                            <td className="px-4 py-2">
                                                <input type="number" value={row.kkm} onChange={e => updateRow(row.tempId, 'kkm', e.target.value)} className="w-full border-gray-300 rounded text-sm h-9 px-2 focus:ring-teal-500 focus:border-teal-500" />
                                            </td>
                                            <td className="px-4 py-2">
                                                <input type="text" value={row.modul} onChange={e => updateRow(row.tempId, 'modul', e.target.value)} className="w-full border-gray-300 rounded text-sm h-9 px-2 focus:ring-teal-500 focus:border-teal-500" placeholder="Pisah dgn ; jika lebih dari satu" />
                                            </td>
                                            <td className="px-4 py-2">
                                                <input type="url" value={row.linkUnduh} onChange={e => updateRow(row.tempId, 'linkUnduh', e.target.value)} className="w-full border-gray-300 rounded text-sm h-9 px-2 focus:ring-teal-500 focus:border-teal-500" placeholder="Pisah dgn ; jika lebih dari satu" />
                                            </td>
                                            <td className="px-4 py-2">
                                                <input type="url" value={row.linkPembelian} onChange={e => updateRow(row.tempId, 'linkPembelian', e.target.value)} className="w-full border-gray-300 rounded text-sm h-9 px-2 focus:ring-teal-500 focus:border-teal-500" placeholder="Pisah dgn ; jika lebih dari satu" />
                                            </td>
                                            <td className="px-4 py-2">
                                                <select value={row.jenjangId} onChange={e => updateRow(row.tempId, 'jenjangId', e.target.value)} className="w-full border-gray-300 rounded text-sm h-9 px-1">
                                                    {settings.jenjang.map(j => <option key={j.id} value={j.id}>{j.nama}</option>)}
                                                </select>
                                            </td>
                                        </>
                                    )}

                                    <td className="px-4 py-2 text-center">
                                        <button onClick={() => handleRemoveRow(row.tempId)} className="text-red-500 hover:text-red-700 p-1"><i className="bi bi-x-lg"></i></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="mt-4">
                    <button onClick={handleAddRow} className="text-teal-600 font-medium text-sm hover:text-teal-800 flex items-center gap-2">
                        <i className="bi bi-plus-circle-fill"></i> Tambah Baris Lagi
                    </button>
                </div>
            </div>
            {isPasteModalOpen && (
                <div className="fixed inset-0 z-[90] bg-black/30 flex items-center justify-center p-4">
                    <div className="w-full max-w-3xl bg-white rounded-xl shadow-lg border">
                        <div className="px-4 py-3 border-b flex items-center justify-between">
                            <h3 className="font-semibold text-gray-800">Tempel Data Massal</h3>
                            <button onClick={() => setIsPasteModalOpen(false)} className="text-gray-500 hover:text-gray-700">
                                <i className="bi bi-x-lg"></i>
                            </button>
                        </div>
                        <div className="p-4 space-y-3">
                            <p className="text-sm text-gray-600">
                                Tempel data per baris. Gunakan pemisah kolom tab atau titik koma (<code>;</code>).
                            </p>
                            <textarea
                                rows={10}
                                value={pasteText}
                                onChange={e => setPasteText(e.target.value)}
                                className="w-full border-gray-300 rounded-lg text-sm p-3"
                                placeholder="Nama;Jabatan;KelasId;RombelId;Telepon;Email;TanggalMulai"
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
