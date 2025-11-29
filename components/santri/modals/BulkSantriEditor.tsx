
import React, { useState, useEffect } from 'react';
import { Santri, Alamat } from '../../../types';
import { useAppContext } from '../../../AppContext';

interface BulkSantriEditorProps {
    isOpen: boolean;
    onClose: () => void;
    mode: 'add' | 'edit';
    initialData?: Santri[]; // Only for edit mode
    onSave: (data: Partial<Santri>[]) => Promise<void>;
}

type EditableRow = Partial<Santri> & { tempId: number };

export const BulkSantriEditor: React.FC<BulkSantriEditorProps> = ({ isOpen, onClose, mode, initialData, onSave }) => {
    const { settings, showToast } = useAppContext();
    const [rows, setRows] = useState<EditableRow[]>([]);
    const [isSaving, setIsSaving] = useState(false);

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

    useEffect(() => {
        if (isOpen) {
            if (mode === 'edit' && initialData) {
                setRows(initialData.map(s => ({ 
                    ...s, 
                    tempId: s.id,
                    tanggalLahir: toDisplayDate(s.tanggalLahir),
                    tanggalMasuk: toDisplayDate(s.tanggalMasuk)
                })));
            } else {
                // Mode Add: Start with 3 empty rows
                const initialRows = Array.from({ length: 3 }).map((_, i) => createEmptyRow(i));
                setRows(initialRows);
            }
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
        
        // Data Ibu
        namaIbu: '',
        statusIbu: undefined,
        nikIbu: '',
        pendidikanIbu: '',
        pekerjaanIbu: '',
        penghasilanIbu: '',
        teleponIbu: '',

        // Data Wali
        namaWali: '',
        statusWali: undefined,
        statusHidupWali: undefined,
        pendidikanWali: '',
        pekerjaanWali: '',
        penghasilanWali: '',
        teleponWali: '',
        
        anakKe: undefined,
        jumlahSaudara: undefined
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

    const handleSave = async () => {
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
                tanggalMasuk: toStorageDate(rest.tanggalMasuk)
            }));
            await onSave(cleanData);
            onClose();
        } catch (error) {
            showToast('Gagal menyimpan data.', 'error');
        } finally {
            setIsSaving(false);
        }
    };
    
    const pendidikanOptions = ['SD/Sederajat', 'SLTP/Sederajat', 'SLTA/Sederajat', 'Diploma', 'Sarjana (S1)', 'Pascasarjana (S2/S3)', 'Tidak Sekolah'];
    const statusHidupOptions = ['Hidup', 'Meninggal', 'Cerai'];

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-gray-100 z-[80] flex flex-col">
            {/* Header */}
            <div className="bg-white border-b px-6 py-4 flex justify-between items-center shadow-sm shrink-0 z-20">
                <div>
                    <h2 className="text-xl font-bold text-gray-800">
                        {mode === 'add' ? 'Tambah Santri Massal' : 'Edit Data Massal'}
                    </h2>
                    <p className="text-sm text-gray-500">
                        Lengkapi data santri, orang tua, dan wali dalam satu tampilan tabel.
                    </p>
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
                                {/* Group Headers */}
                                <tr>
                                    <th className="bg-gray-200 sticky left-0 z-20 border-r border-b"></th>
                                    <th className="bg-gray-200 sticky left-10 z-20 border-r border-b min-w-[200px]"></th>
                                    <th colSpan={11} className="px-4 py-1 text-center font-bold text-gray-600 border-r border-b uppercase text-xs tracking-wider bg-blue-50">Identitas & Kependudukan</th>
                                    <th colSpan={5} className="px-4 py-1 text-center font-bold text-gray-600 border-r border-b uppercase text-xs tracking-wider bg-green-50">Akademik</th>
                                    <th colSpan={6} className="px-4 py-1 text-center font-bold text-gray-600 border-r border-b uppercase text-xs tracking-wider bg-yellow-50">Alamat Lengkap</th>
                                    <th colSpan={7} className="px-4 py-1 text-center font-bold text-gray-600 border-r border-b uppercase text-xs tracking-wider bg-indigo-50">Data Ayah</th>
                                    <th colSpan={7} className="px-4 py-1 text-center font-bold text-gray-600 border-r border-b uppercase text-xs tracking-wider bg-pink-50">Data Ibu</th>
                                    <th colSpan={7} className="px-4 py-1 text-center font-bold text-gray-600 border-b uppercase text-xs tracking-wider bg-gray-200">Data Wali</th>
                                    {mode === 'add' && <th className="bg-gray-200 border-b"></th>}
                                </tr>
                                {/* Column Headers */}
                                <tr>
                                    <th className="px-2 py-3 text-center font-semibold text-gray-700 w-10 sticky left-0 bg-gray-100 border-r z-20">No</th>
                                    <th className="px-4 py-3 text-left font-semibold text-gray-700 min-w-[220px] sticky left-10 bg-gray-100 border-r z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Nama Lengkap <span className="text-red-500">*</span></th>
                                    
                                    {/* Identitas */}
                                    <th className="px-2 py-2 text-left font-medium text-gray-500 min-w-[150px] bg-blue-50/30">Nama Hijrah</th>
                                    <th className="px-2 py-2 text-left font-medium text-gray-500 min-w-[120px] bg-blue-50/30">NIS</th>
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
                                    <th className="px-2 py-2 text-left font-medium text-gray-500 min-w-[130px] bg-green-50/30">Tgl Masuk</th>
                                    <th className="px-2 py-2 text-left font-medium text-gray-500 min-w-[100px] bg-green-50/30">Status</th>

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
                                    <th className="px-2 py-2 text-left font-medium text-gray-500 min-w-[130px] bg-indigo-50/30">NIK Ayah</th>
                                    <th className="px-2 py-2 text-left font-medium text-gray-500 min-w-[140px] bg-indigo-50/30">Pendidikan</th>
                                    <th className="px-2 py-2 text-left font-medium text-gray-500 min-w-[140px] bg-indigo-50/30">Pekerjaan</th>
                                    <th className="px-2 py-2 text-left font-medium text-gray-500 min-w-[140px] bg-indigo-50/30">Penghasilan</th>
                                    <th className="px-2 py-2 text-left font-medium text-gray-500 min-w-[130px] bg-indigo-50/30">No. HP Ayah</th>

                                    {/* Data Ibu */}
                                    <th className="px-2 py-2 text-left font-medium text-gray-500 min-w-[160px] bg-pink-50/30">Nama Ibu</th>
                                    <th className="px-2 py-2 text-left font-medium text-gray-500 min-w-[120px] bg-pink-50/30">Status Ibu</th>
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
                                {rows.map((row, index) => {
                                    // Filtering dropdowns based on selection
                                    const availableKelas = settings.kelas.filter(k => k.jenjangId === row.jenjangId);
                                    const availableRombel = settings.rombel.filter(r => r.kelasId === row.kelasId);

                                    return (
                                        <tr key={row.tempId} className="hover:bg-gray-50 group">
                                            {/* Sticky Columns */}
                                            <td className="px-2 py-2 text-center text-gray-500 bg-white group-hover:bg-gray-50 sticky left-0 border-r z-10">{index + 1}</td>
                                            <td className="px-2 py-2 bg-white group-hover:bg-gray-50 sticky left-10 border-r z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                                                <input type="text" value={row.namaLengkap} onChange={e => updateRow(row.tempId, 'namaLengkap', e.target.value)} className="w-full border-gray-300 rounded text-sm focus:ring-teal-500 focus:border-teal-500 h-9 px-2" placeholder="Nama Santri" />
                                            </td>

                                            {/* Identitas */}
                                            <td className="px-2 py-2 bg-blue-50/10"><input type="text" value={row.namaHijrah} onChange={e => updateRow(row.tempId, 'namaHijrah', e.target.value)} className="w-full border-gray-300 rounded text-sm h-9 px-2" /></td>
                                            <td className="px-2 py-2 bg-blue-50/10"><input type="text" value={row.nis} onChange={e => updateRow(row.tempId, 'nis', e.target.value)} className="w-full border-gray-300 rounded text-sm h-9 px-2" /></td>
                                            <td className="px-2 py-2 bg-blue-50/10"><input type="text" value={row.nik} onChange={e => updateRow(row.tempId, 'nik', e.target.value)} className="w-full border-gray-300 rounded text-sm h-9 px-2" /></td>
                                            <td className="px-2 py-2 bg-blue-50/10"><input type="text" value={row.nisn} onChange={e => updateRow(row.tempId, 'nisn', e.target.value)} className="w-full border-gray-300 rounded text-sm h-9 px-2" /></td>
                                            <td className="px-2 py-2 bg-blue-50/10">
                                                <select value={row.jenisKelamin} onChange={e => updateRow(row.tempId, 'jenisKelamin', e.target.value)} className="w-full border-gray-300 rounded text-sm h-9 px-1">
                                                    <option value="Laki-laki">Laki-laki</option><option value="Perempuan">Perempuan</option>
                                                </select>
                                            </td>
                                            <td className="px-2 py-2 bg-blue-50/10"><input type="text" value={row.tempatLahir} onChange={e => updateRow(row.tempId, 'tempatLahir', e.target.value)} className="w-full border-gray-300 rounded text-sm h-9 px-2" /></td>
                                            <td className="px-2 py-2 bg-blue-50/10"><input type="text" placeholder="dd/mm/yyyy" value={row.tanggalLahir} onChange={e => updateRow(row.tempId, 'tanggalLahir', e.target.value)} className="w-full border-gray-300 rounded text-sm h-9 px-1" /></td>
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
                                                <select value={row.jenjangId} onChange={e => updateRow(row.tempId, 'jenjangId', e.target.value)} className="w-full border-gray-300 rounded text-sm h-9 px-1">
                                                    <option value={0}>- Pilih -</option>{settings.jenjang.map(j => <option key={j.id} value={j.id}>{j.nama}</option>)}
                                                </select>
                                            </td>
                                            <td className="px-2 py-2 bg-green-50/10">
                                                <select value={row.kelasId} onChange={e => updateRow(row.tempId, 'kelasId', e.target.value)} disabled={!row.jenjangId} className="w-full border-gray-300 rounded text-sm h-9 px-1 disabled:bg-gray-100">
                                                    <option value={0}>- Pilih -</option>{availableKelas.map(k => <option key={k.id} value={k.id}>{k.nama}</option>)}
                                                </select>
                                            </td>
                                            <td className="px-2 py-2 bg-green-50/10">
                                                <select value={row.rombelId} onChange={e => updateRow(row.tempId, 'rombelId', e.target.value)} disabled={!row.kelasId} className="w-full border-gray-300 rounded text-sm h-9 px-1 disabled:bg-gray-100">
                                                    <option value={0}>- Pilih -</option>{availableRombel.map(r => <option key={r.id} value={r.id}>{r.nama}</option>)}
                                                </select>
                                            </td>
                                            <td className="px-2 py-2 bg-green-50/10"><input type="text" placeholder="dd/mm/yyyy" value={row.tanggalMasuk} onChange={e => updateRow(row.tempId, 'tanggalMasuk', e.target.value)} className="w-full border-gray-300 rounded text-sm h-9 px-1" /></td>
                                            <td className="px-2 py-2 bg-green-50/10">
                                                 <select value={row.status} onChange={e => updateRow(row.tempId, 'status', e.target.value)} className="w-full border-gray-300 rounded text-sm h-9 px-1">
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
        </div>
    );
};
