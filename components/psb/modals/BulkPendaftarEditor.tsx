


import React, { useState, useEffect } from 'react';
import { Pendaftar, Alamat } from '../../../types';
import { useAppContext } from '../../../AppContext';

interface BulkPendaftarEditorProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: Partial<Pendaftar>[]) => Promise<void>;
}

// Extend Partial<Pendaftar> with flat fields used for editing
type EditableRow = Partial<Pendaftar> & { 
    tempId: number;
    // Flat address fields for editing table
    alamatDetail?: string;
    desaKelurahan?: string;
    kecamatan?: string;
    kabupatenKota?: string;
    provinsi?: string;
    kodePos?: string;
};

export const BulkPendaftarEditor: React.FC<BulkPendaftarEditorProps> = ({ isOpen, onClose, onSave }) => {
    const { settings, showToast } = useAppContext();
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
        namaLengkap: '',
        nisn: '',
        nik: '',
        jenisKelamin: 'Laki-laki',
        tempatLahir: '',
        tanggalLahir: '',
        kewarganegaraan: 'WNI',
        
        // Initialize as empty Alamat object to satisfy type, but we edit via flat fields
        alamat: { detail: '' },
        alamatDetail: '',
        desaKelurahan: '',
        kecamatan: '',
        kabupatenKota: '',
        provinsi: '',
        kodePos: '',
        
        namaAyah: '',
        nikAyah: '',
        pekerjaanAyah: '',
        teleponAyah: '',
        
        namaIbu: '',
        nikIbu: '',
        pekerjaanIbu: '',
        teleponIbu: '',
        
        namaWali: '',
        nomorHpWali: '',
        jenjangId: 0,
        asalSekolah: '',
        jalurPendaftaran: 'Reguler',
        status: 'Baru',
        tanggalDaftar: new Date().toISOString()
    });

    const handleAddRow = () => {
        setRows(prev => [...prev, createEmptyRow(prev.length)]);
    };

    const handleRemoveRow = (tempId: number) => {
        setRows(prev => prev.filter(r => r.tempId !== tempId));
    };

    const updateRow = (tempId: number, field: keyof EditableRow, value: any) => {
        setRows(prev => prev.map(row => {
            if (row.tempId !== tempId) return row;
            if (field === 'jenjangId') return { ...row, [field]: Number(value) };
            return { ...row, [field]: value };
        }));
    };

    const handleSave = async () => {
        const validRows = rows.filter(r => r.namaLengkap?.trim());
        if (validRows.length === 0) {
            showToast('Tidak ada data valid (Nama Lengkap wajib diisi).', 'error');
            return;
        }

        setIsSaving(true);
        try {
            const cleanData = validRows.map(({ tempId, alamatDetail, desaKelurahan, kecamatan, kabupatenKota, provinsi, kodePos, ...rest }) => {
                // Construct the Alamat object from flat fields
                const alamat: Alamat = {
                    detail: alamatDetail || '',
                    desaKelurahan,
                    kecamatan,
                    kabupatenKota,
                    provinsi,
                    kodePos
                };
                return { ...rest, alamat };
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
            <div className="bg-white border-b px-6 py-4 flex justify-between items-center shadow-sm shrink-0 z-20">
                <div>
                    <h2 className="text-xl font-bold text-gray-800">Tambah Pendaftar Massal</h2>
                    <p className="text-sm text-gray-500">Input data pendaftar dengan cepat dalam format tabel.</p>
                </div>
                <div className="flex gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors">Batal</button>
                    <button onClick={handleSave} disabled={isSaving} className="px-6 py-2 bg-teal-600 text-white hover:bg-teal-700 rounded-lg font-medium shadow-sm transition-colors disabled:bg-teal-400 flex items-center gap-2">
                        {isSaving && <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>}
                        Simpan Semua
                    </button>
                </div>
            </div>

            <div className="flex-grow overflow-auto p-6">
                <div className="bg-white rounded-lg shadow border relative">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 text-sm">
                            <thead className="bg-gray-100 sticky top-0 z-10 shadow-sm">
                                {/* Header Groups */}
                                <tr>
                                    <th className="bg-gray-200 sticky left-0 z-20 border-r border-b"></th>
                                    <th className="bg-gray-200 sticky left-10 z-20 border-r border-b min-w-[200px]"></th>
                                    <th colSpan={7} className="px-4 py-1 text-center font-bold text-gray-600 border-r border-b uppercase text-xs tracking-wider bg-blue-50">Identitas</th>
                                    <th colSpan={6} className="px-4 py-1 text-center font-bold text-gray-600 border-r border-b uppercase text-xs tracking-wider bg-yellow-50">Alamat Lengkap</th>
                                    <th colSpan={4} className="px-4 py-1 text-center font-bold text-gray-600 border-r border-b uppercase text-xs tracking-wider bg-indigo-50">Data Ayah</th>
                                    <th colSpan={4} className="px-4 py-1 text-center font-bold text-gray-600 border-r border-b uppercase text-xs tracking-wider bg-pink-50">Data Ibu</th>
                                    <th colSpan={2} className="px-4 py-1 text-center font-bold text-gray-600 border-b uppercase text-xs tracking-wider bg-gray-200">Data Wali</th>
                                    <th className="bg-gray-200 border-b"></th>
                                </tr>
                                <tr>
                                    <th className="px-2 py-3 text-center font-semibold text-gray-700 w-10 sticky left-0 bg-gray-100 border-r z-20">No</th>
                                    <th className="px-4 py-3 text-left font-semibold text-gray-700 min-w-[200px] sticky left-10 bg-gray-100 border-r z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Nama Lengkap *</th>
                                    
                                    <th className="px-2 py-2 text-left font-medium text-gray-500 min-w-[150px] bg-blue-50/20">Jenjang</th>
                                    <th className="px-2 py-2 text-left font-medium text-gray-500 min-w-[120px] bg-blue-50/20">Jenis Kelamin</th>
                                    <th className="px-2 py-2 text-left font-medium text-gray-500 min-w-[150px] bg-blue-50/20">NISN</th>
                                    <th className="px-2 py-2 text-left font-medium text-gray-500 min-w-[150px] bg-blue-50/20">NIK</th>
                                    <th className="px-2 py-2 text-left font-medium text-gray-500 min-w-[150px] bg-blue-50/20">Tempat Lahir</th>
                                    <th className="px-2 py-2 text-left font-medium text-gray-500 min-w-[150px] bg-blue-50/20">Tanggal Lahir</th>
                                    <th className="px-2 py-2 text-left font-medium text-gray-500 min-w-[150px] bg-blue-50/20">Asal Sekolah</th>
                                    
                                    {/* Alamat */}
                                    <th className="px-2 py-2 text-left font-medium text-gray-500 min-w-[200px] bg-yellow-50/20">Jalan / Detail</th>
                                    <th className="px-2 py-2 text-left font-medium text-gray-500 min-w-[150px] bg-yellow-50/20">Desa/Kel</th>
                                    <th className="px-2 py-2 text-left font-medium text-gray-500 min-w-[150px] bg-yellow-50/20">Kecamatan</th>
                                    <th className="px-2 py-2 text-left font-medium text-gray-500 min-w-[150px] bg-yellow-50/20">Kab/Kota</th>
                                    <th className="px-2 py-2 text-left font-medium text-gray-500 min-w-[150px] bg-yellow-50/20">Provinsi</th>
                                    <th className="px-2 py-2 text-left font-medium text-gray-500 min-w-[100px] bg-yellow-50/20">Kode Pos</th>

                                    {/* Data Ayah */}
                                    <th className="px-2 py-2 text-left font-medium text-gray-500 min-w-[150px] bg-indigo-50/20">Nama Ayah</th>
                                    <th className="px-2 py-2 text-left font-medium text-gray-500 min-w-[150px] bg-indigo-50/20">NIK Ayah</th>
                                    <th className="px-2 py-2 text-left font-medium text-gray-500 min-w-[150px] bg-indigo-50/20">Pekerjaan</th>
                                    <th className="px-2 py-2 text-left font-medium text-gray-500 min-w-[150px] bg-indigo-50/20">No. HP Ayah</th>

                                    {/* Data Ibu */}
                                    <th className="px-2 py-2 text-left font-medium text-gray-500 min-w-[150px] bg-pink-50/20">Nama Ibu</th>
                                    <th className="px-2 py-2 text-left font-medium text-gray-500 min-w-[150px] bg-pink-50/20">NIK Ibu</th>
                                    <th className="px-2 py-2 text-left font-medium text-gray-500 min-w-[150px] bg-pink-50/20">Pekerjaan</th>
                                    <th className="px-2 py-2 text-left font-medium text-gray-500 min-w-[150px] bg-pink-50/20">No. HP Ibu</th>

                                    <th className="px-2 py-2 text-left font-medium text-gray-500 min-w-[150px] bg-gray-100/50">Nama Wali</th>
                                    <th className="px-2 py-2 text-left font-medium text-gray-500 min-w-[150px] bg-gray-100/50">No. HP Wali</th>
                                    
                                    <th className="px-4 py-3 text-center w-10"><i className="bi bi-trash"></i></th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {rows.map((row, index) => (
                                    <tr key={row.tempId} className="hover:bg-gray-50 group">
                                        <td className="px-2 py-2 text-center text-gray-500 bg-white group-hover:bg-gray-50 sticky left-0 border-r z-10">{index + 1}</td>
                                        <td className="px-2 py-2 bg-white group-hover:bg-gray-50 sticky left-10 border-r z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                                            <input type="text" value={row.namaLengkap} onChange={e => updateRow(row.tempId, 'namaLengkap', e.target.value)} className="w-full border-gray-300 rounded text-sm h-9 px-2 focus:ring-teal-500 focus:border-teal-500" placeholder="Nama Pendaftar" />
                                        </td>
                                        
                                        <td className="px-2 py-2 bg-blue-50/10">
                                            <select value={row.jenjangId} onChange={e => updateRow(row.tempId, 'jenjangId', e.target.value)} className="w-full border-gray-300 rounded text-sm h-9 px-1">
                                                <option value={0}>- Pilih -</option>{settings.jenjang.map(j => <option key={j.id} value={j.id}>{j.nama}</option>)}
                                            </select>
                                        </td>
                                        <td className="px-2 py-2 bg-blue-50/10">
                                            <select value={row.jenisKelamin} onChange={e => updateRow(row.tempId, 'jenisKelamin', e.target.value)} className="w-full border-gray-300 rounded text-sm h-9 px-1">
                                                <option value="Laki-laki">Laki-laki</option><option value="Perempuan">Perempuan</option>
                                            </select>
                                        </td>
                                        <td className="px-2 py-2 bg-blue-50/10"><input type="text" value={row.nisn} onChange={e => updateRow(row.tempId, 'nisn', e.target.value)} className="w-full border-gray-300 rounded text-sm h-9 px-2" /></td>
                                        <td className="px-2 py-2 bg-blue-50/10"><input type="text" value={row.nik} onChange={e => updateRow(row.tempId, 'nik', e.target.value)} className="w-full border-gray-300 rounded text-sm h-9 px-2" /></td>
                                        <td className="px-2 py-2 bg-blue-50/10"><input type="text" value={row.tempatLahir} onChange={e => updateRow(row.tempId, 'tempatLahir', e.target.value)} className="w-full border-gray-300 rounded text-sm h-9 px-2" /></td>
                                        <td className="px-2 py-2 bg-blue-50/10"><input type="date" value={row.tanggalLahir} onChange={e => updateRow(row.tempId, 'tanggalLahir', e.target.value)} className="w-full border-gray-300 rounded text-sm h-9 px-1" /></td>
                                        <td className="px-2 py-2 bg-blue-50/10"><input type="text" value={row.asalSekolah} onChange={e => updateRow(row.tempId, 'asalSekolah', e.target.value)} className="w-full border-gray-300 rounded text-sm h-9 px-2" /></td>
                                        
                                        <td className="px-2 py-2 bg-yellow-50/10"><input type="text" value={row.alamatDetail} onChange={e => updateRow(row.tempId, 'alamatDetail', e.target.value)} className="w-full border-gray-300 rounded text-sm h-9 px-2" placeholder="Jalan" /></td>
                                        <td className="px-2 py-2 bg-yellow-50/10"><input type="text" value={row.desaKelurahan} onChange={e => updateRow(row.tempId, 'desaKelurahan', e.target.value)} className="w-full border-gray-300 rounded text-sm h-9 px-2" /></td>
                                        <td className="px-2 py-2 bg-yellow-50/10"><input type="text" value={row.kecamatan} onChange={e => updateRow(row.tempId, 'kecamatan', e.target.value)} className="w-full border-gray-300 rounded text-sm h-9 px-2" /></td>
                                        <td className="px-2 py-2 bg-yellow-50/10"><input type="text" value={row.kabupatenKota} onChange={e => updateRow(row.tempId, 'kabupatenKota', e.target.value)} className="w-full border-gray-300 rounded text-sm h-9 px-2" /></td>
                                        <td className="px-2 py-2 bg-yellow-50/10"><input type="text" value={row.provinsi} onChange={e => updateRow(row.tempId, 'provinsi', e.target.value)} className="w-full border-gray-300 rounded text-sm h-9 px-2" /></td>
                                        <td className="px-2 py-2 bg-yellow-50/10"><input type="text" value={row.kodePos} onChange={e => updateRow(row.tempId, 'kodePos', e.target.value)} className="w-full border-gray-300 rounded text-sm h-9 px-2" /></td>

                                        <td className="px-2 py-2 bg-indigo-50/10"><input type="text" value={row.namaAyah} onChange={e => updateRow(row.tempId, 'namaAyah', e.target.value)} className="w-full border-gray-300 rounded text-sm h-9 px-2" /></td>
                                        <td className="px-2 py-2 bg-indigo-50/10"><input type="text" value={row.nikAyah} onChange={e => updateRow(row.tempId, 'nikAyah', e.target.value)} className="w-full border-gray-300 rounded text-sm h-9 px-2" /></td>
                                        <td className="px-2 py-2 bg-indigo-50/10"><input type="text" value={row.pekerja