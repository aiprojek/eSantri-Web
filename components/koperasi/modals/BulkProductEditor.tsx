
import React, { useState, useEffect } from 'react';
import { ProdukKoperasi } from '../../../types';
import { useAppContext } from '../../../AppContext';

interface BulkProductEditorProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (products: Omit<ProdukKoperasi, 'id'>[]) => Promise<void>;
}

type EditableRow = Partial<ProdukKoperasi> & { tempId: number };

export const BulkProductEditor: React.FC<BulkProductEditorProps> = ({ isOpen, onClose, onSave }) => {
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
        nama: '',
        kategori: 'Makanan',
        hargaBeli: 0,
        hargaJual: 0,
        stok: 0,
        minStok: 5,
        satuan: 'pcs',
        barcode: ''
    });

    const handleAddRow = () => {
        setRows(prev => [...prev, createEmptyRow(prev.length)]);
    };

    const handleRemoveRow = (tempId: number) => {
        setRows(prev => prev.filter(r => r.tempId !== tempId));
    };

    const updateRow = (tempId: number, field: keyof ProdukKoperasi, value: any) => {
        setRows(prev => prev.map(row => {
            if (row.tempId !== tempId) return row;
            
            // Numeric handling
            if (field === 'hargaBeli' || field === 'hargaJual' || field === 'stok' || field === 'minStok') {
                return { ...row, [field]: Number(value) };
            }
            return { ...row, [field]: value };
        }));
    };

    const handleSave = async () => {
        const validRows = rows.filter(r => r.nama?.trim());

        if (validRows.length === 0) {
            showToast('Tidak ada data valid (Nama Produk wajib diisi).', 'error');
            return;
        }

        setIsSaving(true);
        try {
            const cleanData = validRows.map(({ tempId, ...rest }) => ({
                ...rest,
                hargaBeli: rest.hargaBeli || 0,
                hargaJual: rest.hargaJual || 0,
                stok: rest.stok || 0,
                minStok: rest.minStok || 5,
                satuan: rest.satuan || 'pcs',
                kategori: rest.kategori || 'Umum'
            })) as Omit<ProdukKoperasi, 'id'>[];

            await onSave(cleanData);
            onClose();
        } catch (error) {
            showToast('Gagal menyimpan data.', 'error');
            console.error(error);
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
                    <h2 className="text-xl font-bold text-gray-800">Tambah Produk Massal</h2>
                    <p className="text-sm text-gray-500">Input stok barang koperasi dengan cepat.</p>
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
                                    <th className="px-4 py-3 text-left font-semibold text-gray-700 min-w-[200px]">Nama Produk <span className="text-red-500">*</span></th>
                                    <th className="px-4 py-3 text-left font-semibold text-gray-700 w-40">Kategori</th>
                                    <th className="px-4 py-3 text-left font-semibold text-gray-700 w-24">Satuan</th>
                                    <th className="px-4 py-3 text-left font-semibold text-gray-700 w-32 bg-blue-50">Harga Beli</th>
                                    <th className="px-4 py-3 text-left font-semibold text-gray-700 w-32 bg-green-50">Harga Jual</th>
                                    <th className="px-4 py-3 text-left font-semibold text-gray-700 w-20">Stok</th>
                                    <th className="px-4 py-3 text-left font-semibold text-gray-700 w-20 text-red-600">Min</th>
                                    <th className="px-4 py-3 text-left font-semibold text-gray-700 w-40">Barcode</th>
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
                                                value={row.nama} 
                                                onChange={e => updateRow(row.tempId, 'nama', e.target.value)} 
                                                className="w-full border-gray-300 rounded text-sm h-9 px-2 focus:ring-teal-500 focus:border-teal-500" 
                                                placeholder="Nama Barang..." 
                                            />
                                        </td>
                                        
                                        <td className="px-2 py-2">
                                            <input 
                                                list={`cat-${row.tempId}`} 
                                                value={row.kategori} 
                                                onChange={e => updateRow(row.tempId, 'kategori', e.target.value)} 
                                                className="w-full border-gray-300 rounded text-sm h-9 px-2"
                                            />
                                            <datalist id={`cat-${row.tempId}`}>
                                                <option value="Makanan"/>
                                                <option value="Minuman"/>
                                                <option value="Alat Tulis"/>
                                                <option value="Kitab"/>
                                                <option value="Seragam"/>
                                                <option value="Perlengkapan Mandi"/>
                                            </datalist>
                                        </td>
                                        
                                        <td className="px-2 py-2">
                                            <input 
                                                type="text" 
                                                value={row.satuan} 
                                                onChange={e => updateRow(row.tempId, 'satuan', e.target.value)} 
                                                className="w-full border-gray-300 rounded text-sm h-9 px-2" 
                                                placeholder="pcs"
                                            />
                                        </td>

                                        <td className="px-2 py-2 bg-blue-50/20">
                                            <input 
                                                type="number" 
                                                value={row.hargaBeli} 
                                                onChange={e => updateRow(row.tempId, 'hargaBeli', e.target.value)} 
                                                className="w-full border-gray-300 rounded text-sm h-9 px-2 text-right" 
                                                min={0}
                                            />
                                        </td>

                                        <td className="px-2 py-2 bg-green-50/20">
                                            <input 
                                                type="number" 
                                                value={row.hargaJual} 
                                                onChange={e => updateRow(row.tempId, 'hargaJual', e.target.value)} 
                                                className="w-full border-gray-300 rounded text-sm h-9 px-2 text-right font-bold" 
                                                min={0}
                                            />
                                        </td>

                                        <td className="px-2 py-2">
                                            <input 
                                                type="number" 
                                                value={row.stok} 
                                                onChange={e => updateRow(row.tempId, 'stok', e.target.value)} 
                                                className="w-full border-gray-300 rounded text-sm h-9 px-2 text-center" 
                                                min={0}
                                            />
                                        </td>

                                        <td className="px-2 py-2 bg-red-50/20">
                                            <input 
                                                type="number" 
                                                value={row.minStok} 
                                                onChange={e => updateRow(row.tempId, 'minStok', e.target.value)} 
                                                className="w-full border-gray-300 rounded text-sm h-9 px-2 text-center text-red-600" 
                                                min={0}
                                            />
                                        </td>

                                        <td className="px-2 py-2">
                                            <input 
                                                type="text" 
                                                value={row.barcode} 
                                                onChange={e => updateRow(row.tempId, 'barcode', e.target.value)} 
                                                className="w-full border-gray-300 rounded text-sm h-9 px-2 font-mono" 
                                                placeholder="Scan..."
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
