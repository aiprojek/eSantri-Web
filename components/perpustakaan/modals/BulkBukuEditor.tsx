
import React, { useState, useEffect } from 'react';
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

    useEffect(() => {
        if (isOpen) {
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
        setRows(prev => [...prev, createEmptyRow(prev.length)]);
    };

    const handleRemoveRow = (tempId: number) => {
        setRows(prev => prev.filter(r => r.tempId !== tempId));
    };

    const updateRow = (tempId: number, field: string, value: any) => {
        setRows(prev => prev.map(row => {
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
                                {rows.map((row, index) => (
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
        </div>
    );
};
