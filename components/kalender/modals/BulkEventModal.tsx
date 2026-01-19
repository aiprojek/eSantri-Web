
import React, { useState, useEffect } from 'react';
import { CalendarEvent } from '../../../types';
import { useAppContext } from '../../../AppContext';

interface BulkEventModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: Omit<CalendarEvent, 'id'>[]) => Promise<void>;
}

type EditableRow = Partial<CalendarEvent> & { tempId: number };

export const BulkEventModal: React.FC<BulkEventModalProps> = ({ isOpen, onClose, onSave }) => {
    const { showToast } = useAppContext();
    const [rows, setRows] = useState<EditableRow[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    const colors = [
        { label: 'Merah', val: 'bg-red-500' },
        { label: 'Hijau', val: 'bg-green-500' },
        { label: 'Biru', val: 'bg-blue-500' },
        { label: 'Kuning', val: 'bg-yellow-500' },
        { label: 'Ungu', val: 'bg-purple-500' },
        { label: 'Pink', val: 'bg-pink-500' },
        { label: 'Abu', val: 'bg-gray-500' },
        { label: 'Teal', val: 'bg-teal-500' },
    ];

    const categories = ['Libur', 'Ujian', 'Kegiatan', 'Rapat', 'Lainnya'];

    useEffect(() => {
        if (isOpen) {
            // Start with 5 empty rows
            const initialRows = Array.from({ length: 5 }).map((_, i) => createEmptyRow(i));
            setRows(initialRows);
        }
    }, [isOpen]);

    const createEmptyRow = (index: number): EditableRow => {
        const today = new Date().toISOString().split('T')[0];
        return {
            tempId: Date.now() + index,
            title: '',
            startDate: today,
            endDate: today,
            category: 'Kegiatan',
            color: 'bg-blue-500',
            description: ''
        };
    };

    const handleAddRow = () => {
        setRows(prev => [...prev, createEmptyRow(prev.length)]);
    };

    const handleRemoveRow = (tempId: number) => {
        setRows(prev => prev.filter(r => r.tempId !== tempId));
    };

    const updateRow = (tempId: number, field: string, value: any) => {
        setRows(prev => prev.map(row => {
            if (row.tempId !== tempId) return row;
            
            // Auto sync End Date if Start Date changes and End Date was same/empty
            if (field === 'startDate') {
                if (!row.endDate || row.endDate === row.startDate) {
                     return { ...row, [field]: value, endDate: value };
                }
            }
            
            return { ...row, [field]: value };
        }));
    };

    const handleSave = async () => {
        const validRows = rows.filter(r => r.title?.trim());

        if (validRows.length === 0) {
            showToast('Tidak ada data valid (Nama Kegiatan wajib diisi).', 'error');
            return;
        }

        setIsSaving(true);
        try {
            const cleanData = validRows.map(({ tempId, ...rest }) => rest as Omit<CalendarEvent, 'id'>);
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
                    <h2 className="text-xl font-bold text-gray-800">Tambah Agenda Massal</h2>
                    <p className="text-sm text-gray-500">Input jadwal kegiatan pondok dengan cepat.</p>
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
                                    <th className="px-4 py-3 text-left font-semibold text-gray-700 min-w-[250px]">Nama Kegiatan <span className="text-red-500">*</span></th>
                                    <th className="px-4 py-3 text-left font-semibold text-gray-700 w-40">Mulai</th>
                                    <th className="px-4 py-3 text-left font-semibold text-gray-700 w-40">Selesai</th>
                                    <th className="px-4 py-3 text-left font-semibold text-gray-700 w-32">Kategori</th>
                                    <th className="px-4 py-3 text-left font-semibold text-gray-700 w-32">Warna</th>
                                    <th className="px-4 py-3 text-left font-semibold text-gray-700 min-w-[200px]">Deskripsi</th>
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
                                                value={row.title} 
                                                onChange={e => updateRow(row.tempId, 'title', e.target.value)} 
                                                className="w-full border-gray-300 rounded text-sm h-9 px-2 focus:ring-teal-500 focus:border-teal-500" 
                                                placeholder="Nama kegiatan..." 
                                            />
                                        </td>
                                        
                                        <td className="px-2 py-2">
                                            <input 
                                                type="date" 
                                                value={row.startDate} 
                                                onChange={e => updateRow(row.tempId, 'startDate', e.target.value)} 
                                                className="w-full border-gray-300 rounded text-sm h-9 px-2" 
                                            />
                                        </td>
                                        
                                        <td className="px-2 py-2">
                                            <input 
                                                type="date" 
                                                value={row.endDate} 
                                                onChange={e => updateRow(row.tempId, 'endDate', e.target.value)} 
                                                className="w-full border-gray-300 rounded text-sm h-9 px-2" 
                                            />
                                        </td>

                                        <td className="px-2 py-2">
                                            <select 
                                                value={row.category} 
                                                onChange={e => updateRow(row.tempId, 'category', e.target.value)} 
                                                className="w-full border-gray-300 rounded text-sm h-9 px-1"
                                            >
                                                {categories.map(c => <option key={c} value={c}>{c}</option>)}
                                            </select>
                                        </td>

                                        <td className="px-2 py-2">
                                            <select 
                                                value={row.color} 
                                                onChange={e => updateRow(row.tempId, 'color', e.target.value)} 
                                                className="w-full border-gray-300 rounded text-sm h-9 px-1"
                                                style={{ borderLeftWidth: '5px', borderLeftColor: row.color ? row.color.replace('bg-', 'var(--color-').replace('-500', '-500)') : 'gray' }} 
                                            >
                                                {colors.map(c => <option key={c.val} value={c.val}>{c.label}</option>)}
                                            </select>
                                            {/* Note: The inline style above is a bit tricky with Tailwind classes without JS variable resolution. 
                                                Ideally we just trust the dropdown text. */}
                                        </td>

                                        <td className="px-2 py-2">
                                            <input 
                                                type="text" 
                                                value={row.description} 
                                                onChange={e => updateRow(row.tempId, 'description', e.target.value)} 
                                                className="w-full border-gray-300 rounded text-sm h-9 px-2" 
                                                placeholder="Keterangan opsional" 
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
