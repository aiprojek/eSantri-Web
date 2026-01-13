
import React, { useState, useEffect } from 'react';
import { PondokSettings } from '../../../types';

export type MasterType = 'pendidik' | 'jenjang' | 'kelas' | 'rombel' | 'mapel';

interface BulkMasterEditorProps {
    isOpen: boolean;
    onClose: () => void;
    mode: MasterType;
    settings: PondokSettings;
    onSave: (data: any[]) => void;
}

export const BulkMasterEditor: React.FC<BulkMasterEditorProps> = ({ 
    isOpen, onClose, mode, settings, onSave 
}) => {
    const [rows, setRows] = useState<any[]>([]);

    useEffect(() => {
        if (isOpen) {
            // Inisialisasi dengan 3 baris kosong
            const initialRows = Array.from({ length: 3 }).map((_, i) => createEmptyRow(i));
            setRows(initialRows);
        }
    }, [isOpen, mode]);

    const createEmptyRow = (index: number) => {
        const base = { tempId: Date.now() + index, nama: '' };
        switch (mode) {
            case 'pendidik': return { ...base, jabatan: '', tanggalMulai: new Date().toISOString().split('T')[0] };
            case 'jenjang': return { ...base, kode: '', mudirId: '' };
            case 'kelas': return { ...base, jenjangId: settings.jenjang[0]?.id || '' };
            case 'rombel': return { ...base, kelasId: settings.kelas[0]?.id || '', waliKelasId: '' };
            case 'mapel': return { ...base, jenjangId: settings.jenjang[0]?.id || '' };
            default: return base;
        }
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
            return { ...row, [field]: value };
        }));
    };

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
            return rest;
        });

        onSave(cleanData);
    };

    if (!isOpen) return null;

    const getTitle = () => {
        switch(mode) {
            case 'pendidik': return 'Tambah Tenaga Pendidik Massal';
            case 'jenjang': return 'Tambah Jenjang Pendidikan Massal';
            case 'kelas': return 'Tambah Kelas Massal';
            case 'rombel': return 'Tambah Rombel Massal';
            case 'mapel': return 'Tambah Mata Pelajaran Massal';
            default: return 'Bulk Add';
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
                <div className="bg-white rounded-lg shadow border relative">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                        <thead className="bg-gray-100 sticky top-0 z-10 shadow-sm">
                            <tr>
                                <th className="px-4 py-3 text-center w-10 font-semibold text-gray-600 border-r">No</th>
                                <th className="px-4 py-3 text-left font-semibold text-gray-600 min-w-[200px]">Nama (Wajib)</th>
                                
                                {mode === 'pendidik' && (
                                    <>
                                        <th className="px-4 py-3 text-left font-semibold text-gray-600 min-w-[150px]">Jabatan Awal</th>
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
                                    <th className="px-4 py-3 text-left font-semibold text-gray-600 min-w-[200px]">Jenjang</th>
                                )}

                                <th className="px-4 py-3 text-center w-10"><i className="bi bi-trash"></i></th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {rows.map((row, index) => (
                                <tr key={row.tempId} className="hover:bg-gray-50 group">
                                    <td className="px-4 py-2 text-center text-gray-500 border-r bg-gray-50">{index + 1}</td>
                                    <td className="px-4 py-2">
                                        <input type="text" value={row.nama} onChange={e => updateRow(row.tempId, 'nama', e.target.value)} className="w-full border-gray-300 rounded text-sm h-9 px-2 focus:ring-teal-500 focus:border-teal-500" placeholder="Nama..." />
                                    </td>

                                    {mode === 'pendidik' && (
                                        <>
                                            <td className="px-4 py-2"><input type="text" value={row.jabatan} onChange={e => updateRow(row.tempId, 'jabatan', e.target.value)} className="w-full border-gray-300 rounded text-sm h-9 px-2" placeholder="Guru / Staff" /></td>
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
                                        <td className="px-4 py-2">
                                            <select value={row.jenjangId} onChange={e => updateRow(row.tempId, 'jenjangId', e.target.value)} className="w-full border-gray-300 rounded text-sm h-9 px-1">
                                                {settings.jenjang.map(j => <option key={j.id} value={j.id}>{j.nama}</option>)}
                                            </select>
                                        </td>
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
        </div>
    );
};
