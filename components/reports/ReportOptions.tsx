
import React, { useMemo, useState } from 'react';
import { Santri, PondokSettings, ReportType } from '../../types';
import { useReportConfig } from '../../hooks/useReportConfig';
import { formatAcademicYearDisplay, getAcademicYearOptions } from '../../utils/academicYear';

const SantriSelector: React.FC<{
    title?: string;
    printMode: 'all' | 'selected';
    setPrintMode: (mode: 'all' | 'selected') => void;
    selectedIds: number[];
    setSelectedIds: (ids: number[] | ((prev: number[]) => number[])) => void;
    radioGroupName: string;
    filteredSantri: Santri[];
}> = ({ title, printMode, setPrintMode, selectedIds, setSelectedIds, radioGroupName, filteredSantri }) => {
    const [searchTerm, setSearchTerm] = useState('');

    const displayedSantri = useMemo(() => {
        if (!searchTerm.trim()) return filteredSantri;
        const q = searchTerm.toLowerCase();
        return filteredSantri.filter(s => 
            (s.namaLengkap || '').toLowerCase().includes(q) || 
            (s.nis || '').toLowerCase().includes(q)
        );
    }, [filteredSantri, searchTerm]);

    const handleSelection = (santriId: number) => {
        const numId = Number(santriId);
        setSelectedIds(prev => {
            const prevNums = prev.map(Number);
            return prevNums.includes(numId) ? prevNums.filter(id => id !== numId) : [...prevNums, numId];
        });
    };

    const isAllDisplayedSelected = displayedSantri.length > 0 && displayedSantri.every(s => selectedIds.map(Number).includes(Number(s.id)));

    const handleToggleAll = () => {
        const displayedIds = displayedSantri.map(s => Number(s.id));
        if (isAllDisplayedSelected) {
            setSelectedIds(prev => prev.filter(id => !displayedIds.includes(Number(id))));
        } else {
            setSelectedIds(prev => [...new Set([...prev.map(Number), ...displayedIds])]);
        }
    };

    return (
        <div className="space-y-4">
            {title && <h3 className="text-md font-semibold text-gray-700">{title}</h3>}
            <div>
                <label className="block mb-2 text-sm font-medium text-gray-700">Santri yang Akan Dicetak</label>
                <div className="flex flex-col sm:flex-row gap-4">
                    <label className="flex items-center cursor-pointer">
                        <input 
                            type="radio" 
                            id={`${radioGroupName}-all`} 
                            name={radioGroupName} 
                            value="all" 
                            checked={printMode === 'all'} 
                            onChange={e => setPrintMode(e.target.value as any)} 
                            className="w-4 h-4 text-teal-600"
                        />
                        <span className="ml-2 text-sm">Cetak Semua Santri ({filteredSantri.length})</span>
                    </label>
                    <label className="flex items-center cursor-pointer">
                        <input 
                            type="radio" 
                            id={`${radioGroupName}-select`} 
                            name={radioGroupName} 
                            value="selected" 
                            checked={printMode === 'selected'} 
                            onChange={e => setPrintMode(e.target.value as any)} 
                            className="w-4 h-4 text-teal-600"
                        />
                        <span className="ml-2 text-sm">Pilih Santri Tertentu</span>
                    </label>
                </div>
            </div>
            {printMode === 'selected' && (
                 <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 space-y-2.5">
                    <div className="flex justify-between items-center">
                        <span className="text-xs font-semibold text-gray-700">
                            {selectedIds.length} dipilih dari {filteredSantri.length} santri
                        </span>
                        <button 
                            type="button" 
                            onClick={handleToggleAll} 
                            className="text-xs font-semibold text-teal-600 hover:underline"
                        >
                            {isAllDisplayedSelected ? 'Hapus Pilihan' : 'Pilih Semua'}
                        </button>
                    </div>

                    {filteredSantri.length > 5 && (
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Cari nama atau NIS santri..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-full bg-white border border-gray-300 rounded-md px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-teal-500 focus:outline-none"
                            />
                            {searchTerm && (
                                <button 
                                    type="button" 
                                    onClick={() => setSearchTerm('')} 
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
                                >
                                    ✕
                                </button>
                            )}
                        </div>
                    )}

                    <div className="max-h-48 overflow-y-auto grid grid-cols-1 gap-1.5 border bg-white p-2.5 rounded-md">
                        {displayedSantri.length > 0 ? displayedSantri.map(santri => {
                            const isChecked = selectedIds.map(Number).includes(Number(santri.id));
                            return (
                                <label 
                                    key={santri.id} 
                                    className={`flex items-center px-2 py-1.5 rounded cursor-pointer transition-colors ${isChecked ? 'bg-teal-50 text-teal-900 font-medium' : 'hover:bg-gray-50 text-gray-700'}`}
                                >
                                    <input 
                                        id={`${radioGroupName}-santri-${santri.id}`} 
                                        type="checkbox" 
                                        checked={isChecked} 
                                        onChange={() => handleSelection(santri.id)} 
                                        className="w-4 h-4 text-teal-600 bg-gray-100 border-gray-300 rounded focus:ring-teal-500" 
                                    />
                                    <span className="ml-2.5 text-xs truncate">
                                        {santri.namaLengkap} <span className="text-[10px] text-gray-400 font-normal">({santri.nis})</span>
                                    </span>
                                </label>
                            );
                        }) : (
                            <p className="text-xs text-gray-400 col-span-full text-center py-2">
                                {searchTerm ? 'Tidak ada santri yang cocok dengan pencarian.' : 'Tidak ada santri sesuai filter.'}
                            </p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};


type ReportOptionsProps = {
    config: ReturnType<typeof useReportConfig>;
    filteredSantri: Santri[];
    settings: PondokSettings;
    selectedJenjangId: string;
};

export const ReportOptions: React.FC<ReportOptionsProps> = ({ config, filteredSantri, settings, selectedJenjangId }) => {
    const { activeReport, options } = config;
    const availableAcademicYears = useMemo(() => getAcademicYearOptions(settings), [settings]);
    
    // Internal state for Rekening Koran selector
    const [rekeningSearch, setRekeningSearch] = useState('');
    const [rekeningJenjang, setRekeningJenjang] = useState('');
    const [rekeningKelas, setRekeningKelas] = useState('');

    const rekeningAvailableKelas = useMemo(() => {
        if (!rekeningJenjang) return settings.kelas;
        return settings.kelas.filter(k => k.jenjangId === parseInt(rekeningJenjang));
    }, [rekeningJenjang, settings.kelas]);

    const santriForRekeningSelector = useMemo(() => {
        return filteredSantri.filter(s => {
            const searchLower = rekeningSearch.toLowerCase();
            const nameMatch = s.namaLengkap.toLowerCase().includes(searchLower);
            const nisMatch = s.nis.toLowerCase().includes(searchLower);

            return (
                (nameMatch || nisMatch) &&
                (!rekeningJenjang || s.jenjangId === parseInt(rekeningJenjang)) &&
                (!rekeningKelas || s.kelasId === parseInt(rekeningKelas))
            );
        });
    }, [filteredSantri, rekeningSearch, rekeningJenjang, rekeningKelas]);


    const availableMapel = useMemo(() => {
        if (!selectedJenjangId) return [];
        return settings.mataPelajaran.filter(m => m.jenjangId === parseInt(selectedJenjangId));
    }, [selectedJenjangId, settings.mataPelajaran]);

    const hijriMonths = useMemo(() => [
        { value: 1, name: "Muharram" }, { value: 2, name: "Safar" }, { value: 3, name: "Rabi'ul Awwal" },
        { value: 4, name: "Rabi'ul Akhir" }, { value: 5, name: "Jumadal Ula" }, { value: 6, name: "Jumadal Akhirah" },
        { value: 7, name: "Rajab" }, { value: 8, name: "Sha'ban" }, { value: 9, name: "Ramadhan" },
        { value: 10, name: "Shawwal" }, { value: 11, name: "Dhu al-Qi'dah" }, { value: 12, name: "Dhu al-Hijjah" }
    ], []);

    const availableLabelFields = useMemo(() => [
        { id: 'namaLengkap', label: 'Nama Lengkap' }, { id: 'nis', label: 'NIS' }, { id: 'rombel', label: 'Nama Rombel' },
        { id: 'jenjang', label: 'Nama Jenjang' }, { id: 'namaHijrah', label: 'Nama Hijrah' }, { id: 'ttl', label: 'Tempat & Tgl. Lahir' },
        { id: 'alamat', label: 'Alamat Lengkap' },
    ], []);

    const availableCardFields = useMemo(() => [
        // Identitas Pokok
        { id: 'foto', label: 'Foto Santri (otomatis placeholder jika kosong)', category: 'Identitas Pokok' }, 
        { id: 'namaLengkap', label: 'Nama Lengkap Santri', category: 'Identitas Pokok' }, 
        { id: 'namaHijrah', label: 'Nama Hijrah / Panggilan', category: 'Identitas Pokok' },
        { id: 'nis', label: 'NIS (Nomor Induk Santri Pondok)', category: 'Identitas Pokok' },
        { id: 'nisn', label: 'NISN (Nasional Kemdikbud/Kemenag)', category: 'Identitas Pokok' },
        { id: 'nik', label: 'NIK Santri (Kependudukan)', category: 'Identitas Pokok' },

        // Akademik & Domisili
        { id: 'jenjang', label: 'Jenjang Pendidikan (MI / MTs / MA / PDF dll)', category: 'Akademik & Domisili' }, 
        { id: 'kelas', label: 'Tingkat / Kelas (Kelas VII, 1, X dll)', category: 'Akademik & Domisili' }, 
        { id: 'rombel', label: 'Rombel / Kelompok Belajar', category: 'Akademik & Domisili' }, 
        { id: 'asrama', label: 'Gedung Asrama & Kamar Santri', category: 'Akademik & Domisili' },
        { id: 'jenisSantri', label: 'Status Santri (Mukim / Non-Mukim / Mondok)', category: 'Akademik & Domisili' },
        { id: 'tahunMasuk', label: 'Tahun Masuk / Angkatan Santri', category: 'Akademik & Domisili' },

        // Data Personal, Medis & Kontak
        { id: 'ttl', label: 'Tempat & Tanggal Lahir (TTL)', category: 'Personal & Kontak Darurat' },
        { id: 'golonganDarah', label: 'Golongan Darah (A / B / AB / O)', category: 'Personal & Kontak Darurat' },
        { id: 'ayahWali', label: 'Nama Orang Tua / Wali', category: 'Personal & Kontak Darurat' },
        { id: 'teleponWali', label: 'No. HP / Kontak Darurat Ortu', category: 'Personal & Kontak Darurat' },
        { id: 'alamat', label: 'Alamat Asal Lengkap', category: 'Personal & Kontak Darurat' },
    ], []);

    const cardDesigns = useMemo(() => [
        { id: 'classic', label: 'Klasik Tradisional (Landscape)' },
        { id: 'modern', label: 'Modern Tech (Landscape)' },
        { id: 'vertical', label: 'Vertikal ID (Portrait)' },
        { id: 'dark', label: 'Premium Dark (Landscape)' },
        { id: 'ceria', label: 'Ceria / TPQ (Landscape)' },
    ], []);

    const [rombelColSearch, setRombelColSearch] = useState('');
    const [rombelColCategory, setRombelColCategory] = useState<'all' | 'santri' | 'ortu' | 'wali' | 'akademik' | 'alamat' | 'fisik'>('all');

    const daftarRombelColumns = useMemo(() => ([
        // --- Data Pokok & Kependudukan Santri ---
        { id: 'no', label: 'No', category: 'santri' },
        { id: 'nis', label: 'NIS', category: 'santri' },
        { id: 'nisn', label: 'NISN', category: 'santri' },
        { id: 'nik', label: 'NIK Santri', category: 'santri' },
        { id: 'namaLengkap', label: 'Nama Lengkap', category: 'santri' },
        { id: 'namaHijrah', label: 'Nama Hijrah / Panggilan', category: 'santri' },
        { id: 'lp', label: 'L/P', category: 'santri' },
        { id: 'tempatLahir', label: 'Tempat Lahir', category: 'santri' },
        { id: 'tanggalLahir', label: 'Tanggal Lahir', category: 'santri' },
        { id: 'ttl', label: 'TTL (Tempat, Tgl Lahir)', category: 'santri' },
        { id: 'kewarganegaraan', label: 'Kewarganegaraan', category: 'santri' },
        { id: 'statusKeluarga', label: 'Status dalam Keluarga', category: 'santri' },
        { id: 'anakKe', label: 'Anak Ke-', category: 'santri' },
        { id: 'jumlahSaudara', label: 'Jumlah Saudara', category: 'santri' },

        // --- Akademik, Keasramaan & Tahfizh ---
        { id: 'jenjang', label: 'Jenjang', category: 'akademik' },
        { id: 'kelas', label: 'Kelas', category: 'akademik' },
        { id: 'rombel', label: 'Rombel', category: 'akademik' },
        { id: 'status', label: 'Status Santri', category: 'akademik' },
        { id: 'tanggalStatus', label: 'Tanggal Status/Mutasi', category: 'akademik' },
        { id: 'jenisSantri', label: 'Jenis Santri (Mondok/Laju)', category: 'akademik' },
        { id: 'tanggalMasuk', label: 'Tanggal Masuk', category: 'akademik' },
        { id: 'kamar', label: 'Kamar Asrama', category: 'akademik' },
        { id: 'gedungAsrama', label: 'Gedung Asrama', category: 'akademik' },
        { id: 'halaqah', label: 'Kelompok Halaqah Tahfizh', category: 'akademik' },
        { id: 'targetJuz', label: 'Target Hafalan (Juz)', category: 'akademik' },

        // --- Alamat Santri & Sekolah Asal ---
        { id: 'alamat', label: 'Alamat Lengkap Santri', category: 'alamat' },
        { id: 'jalan', label: 'Jalan / RT / RW', category: 'alamat' },
        { id: 'desa', label: 'Desa / Kelurahan', category: 'alamat' },
        { id: 'kecamatan', label: 'Kecamatan', category: 'alamat' },
        { id: 'kabupaten', label: 'Kabupaten / Kota', category: 'alamat' },
        { id: 'provinsi', label: 'Provinsi', category: 'alamat' },
        { id: 'kodePos', label: 'Kode Pos', category: 'alamat' },
        { id: 'sekolahAsal', label: 'Sekolah Asal', category: 'alamat' },
        { id: 'alamatSekolahAsal', label: 'Alamat Sekolah Asal', category: 'alamat' },

        // --- Data Orang Tua (Ayah & Ibu) ---
        { id: 'ayah', label: 'Nama Ayah Kandung', category: 'ortu' },
        { id: 'statusAyah', label: 'Status Ayah (Hidup/Wafat/Cerai)', category: 'ortu' },
        { id: 'nikAyah', label: 'NIK Ayah', category: 'ortu' },
        { id: 'ttlAyah', label: 'TTL Ayah', category: 'ortu' },
        { id: 'tempatLahirAyah', label: 'Tempat Lahir Ayah', category: 'ortu' },
        { id: 'tanggalLahirAyah', label: 'Tanggal Lahir Ayah', category: 'ortu' },
        { id: 'pendidikanAyah', label: 'Pendidikan Ayah', category: 'ortu' },
        { id: 'pekerjaanAyah', label: 'Pekerjaan Ayah', category: 'ortu' },
        { id: 'penghasilanAyah', label: 'Penghasilan Ayah', category: 'ortu' },
        { id: 'teleponAyah', label: 'No. Telepon/HP Ayah', category: 'ortu' },
        { id: 'alamatAyah', label: 'Alamat Ayah', category: 'ortu' },

        { id: 'ibu', label: 'Nama Ibu Kandung', category: 'ortu' },
        { id: 'statusIbu', label: 'Status Ibu (Hidup/Wafat/Cerai)', category: 'ortu' },
        { id: 'nikIbu', label: 'NIK Ibu', category: 'ortu' },
        { id: 'ttlIbu', label: 'TTL Ibu', category: 'ortu' },
        { id: 'tempatLahirIbu', label: 'Tempat Lahir Ibu', category: 'ortu' },
        { id: 'tanggalLahirIbu', label: 'Tanggal Lahir Ibu', category: 'ortu' },
        { id: 'pendidikanIbu', label: 'Pendidikan Ibu', category: 'ortu' },
        { id: 'pekerjaanIbu', label: 'Pekerjaan Ibu', category: 'ortu' },
        { id: 'penghasilanIbu', label: 'Penghasilan Ibu', category: 'ortu' },
        { id: 'teleponIbu', label: 'No. Telepon/HP Ibu', category: 'ortu' },
        { id: 'alamatIbu', label: 'Alamat Ibu', category: 'ortu' },

        // --- Data Wali ---
        { id: 'wali', label: 'Nama Wali', category: 'wali' },
        { id: 'statusWali', label: 'Hubungan Wali', category: 'wali' },
        { id: 'statusHidupWali', label: 'Status Hidup Wali', category: 'wali' },
        { id: 'ttlWali', label: 'TTL Wali', category: 'wali' },
        { id: 'tempatLahirWali', label: 'Tempat Lahir Wali', category: 'wali' },
        { id: 'tanggalLahirWali', label: 'Tanggal Lahir Wali', category: 'wali' },
        { id: 'pendidikanWali', label: 'Pendidikan Wali', category: 'wali' },
        { id: 'pekerjaanWali', label: 'Pekerjaan Wali', category: 'wali' },
        { id: 'penghasilanWali', label: 'Penghasilan Wali', category: 'wali' },
        { id: 'teleponWali', label: 'No. Telepon/HP Wali', category: 'wali' },
        { id: 'alamatWali', label: 'Alamat Wali', category: 'wali' },
        { id: 'telepon', label: 'No. Telepon Utama (Gabungan)', category: 'wali' },

        // --- Data Fisik & Kesehatan ---
        { id: 'tinggiBadan', label: 'Tinggi Badan (cm)', category: 'fisik' },
        { id: 'beratBadan', label: 'Berat Badan (kg)', category: 'fisik' },
        { id: 'jarakKePondok', label: 'Jarak ke Pondok', category: 'fisik' },
        { id: 'berkebutuhanKhusus', label: 'Kebutuhan Khusus (ABK)', category: 'fisik' },
        { id: 'riwayatPenyakit', label: 'Riwayat Penyakit', category: 'fisik' },
        { id: 'hobi', label: 'Hobi', category: 'fisik' },
    ]), []);

    const handleRombelColumnToggle = (columnId: string) => {
        options.setRombelVisibleColumns((prev: string[]) => {
            if (prev.includes(columnId)) return prev.filter((id) => id !== columnId);
            return [...prev, columnId];
        });
    };

    const handleMapelSelection = (mapelId: number) => {
        options.setSelectedMapelIds(prev => 
          prev.includes(mapelId) 
            ? prev.filter(id => id !== mapelId)
            : [...prev, mapelId]
        );
      };
      
    const handleLabelFieldChange = (fieldId: string) => {
        options.setLabelFields(prev => 
          prev.includes(fieldId)
            ? prev.filter(id => id !== fieldId)
            : [...prev, fieldId]
        );
    };
    
    const handleCardFieldChange = (fieldId: string) => {
        options.setCardFields(prev => 
          prev.includes(fieldId)
            ? prev.filter(id => id !== fieldId)
            : [...prev, fieldId]
        );
    };

    const handleApplyCardPreset = (preset: 'standar' | 'lengkap' | 'minimal' | 'semua' | 'reset') => {
        if (preset === 'standar') {
            options.setCardFields(['foto', 'namaLengkap', 'nis', 'jenjang', 'kelas', 'rombel']);
        } else if (preset === 'lengkap') {
            options.setCardFields(['foto', 'namaLengkap', 'nis', 'nisn', 'jenjang', 'kelas', 'rombel', 'asrama', 'ttl', 'golonganDarah', 'ayahWali', 'teleponWali', 'alamat']);
        } else if (preset === 'minimal') {
            options.setCardFields(['foto', 'namaLengkap', 'nis', 'kelas', 'rombel']);
        } else if (preset === 'semua') {
            options.setCardFields(availableCardFields.map(f => f.id));
        } else if (preset === 'reset') {
            options.setCardFields(['foto', 'namaLengkap', 'nis', 'jenjang', 'kelas', 'rombel', 'ttl', 'alamat', 'ayahWali']);
        }
    };

    const handleCardDesignChange = (designId: string) => {
        options.setCardDesign(designId);
        // Automatically switch width/height based on design orientation
        if (designId === 'vertical') {
            options.setCardWidth(5.398);
            options.setCardHeight(8.56);
        } else {
            options.setCardWidth(8.56);
            options.setCardHeight(5.398);
        }
    };

    const AcademicYearSelect = ({
        id,
        value,
        onChange,
    }: {
        id?: string;
        value?: string;
        onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
    }) => (
        <select
            id={id}
            value={value !== undefined ? value : options.tahunAjaran}
            onChange={onChange || (e => options.setTahunAjaran(e.target.value))}
            className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg w-full p-2.5"
        >
            {availableAcademicYears.map((year) => (
                <option key={year} value={year}>{formatAcademicYearDisplay(settings, year)}</option>
            ))}
        </select>
    );

    if (
        activeReport === ReportType.DashboardSummary ||
        activeReport === ReportType.FinanceSummary ||
        activeReport === ReportType.OperasionalHarian ||
        activeReport === ReportType.EarlyWarningSantri ||
        activeReport === ReportType.KinerjaPengajar ||
        activeReport === ReportType.KelasAsramaBermasalah ||
        activeReport === ReportType.CohortSantri ||
        activeReport === ReportType.KepatuhanAdministrasi ||
        activeReport === ReportType.EfektivitasPSB
    ) {
        return (
            <div className="pt-4 border-t">
                <p className="text-sm text-gray-600">Laporan ini akan mencakup ringkasan data keseluruhan dan tidak memerlukan opsi tambahan.</p>
            </div>
        );
    }

    // Tahfizh Progress - special case with filter options
    if (activeReport === ReportType.TahfizhProgress) {
        const tipeOptions = ['Ziyadah', 'Murojaah', "Tasmi'", 'Ujian Hafalan'];
        const handleTipeChange = (tipe: string) => {
            if (options.tahfizhTipeFilter.includes(tipe)) {
                options.setTahfizhTipeFilter(options.tahfizhTipeFilter.filter(t => t !== tipe));
            } else {
                options.setTahfizhTipeFilter([...options.tahfizhTipeFilter, tipe]);
            }
        };
        return (
            <div className="pt-4 border-t space-y-4">
                <h3 className="text-md font-semibold text-gray-700">Filter Laporan Tahfizh</h3>

                {/* Date Range */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="block mb-1 text-sm font-medium text-gray-700">Tanggal Mulai</label>
                        <input type="date" value={options.tahfizhStartDate} onChange={e => options.setTahfizhStartDate(e.target.value)} className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg w-full p-2.5" />
                    </div>
                    <div>
                        <label className="block mb-1 text-sm font-medium text-gray-700">Tanggal Selesai</label>
                        <input type="date" value={options.tahfizhEndDate} onChange={e => options.setTahfizhEndDate(e.target.value)} className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg w-full p-2.5" />
                    </div>
                </div>

                {/* Sector Type Filter */}
                <div className="border-t pt-4">
                    <label className="block mb-2 text-sm font-medium text-gray-700">Jenis Setoran yang Ditampilkan</label>
                    <div className="flex flex-wrap gap-3">
                        {tipeOptions.map(tipe => (
                            <div key={tipe} className="flex items-center">
                                <input
                                    id={`tahfizh-tipe-${tipe}`}
                                    type="checkbox"
                                    checked={options.tahfizhTipeFilter.includes(tipe)}
                                    onChange={() => handleTipeChange(tipe)}
                                    className="w-4 h-4 text-teal-600 bg-gray-100 border-gray-300 rounded focus:ring-teal-500"
                                />
                                <label htmlFor={`tahfizh-tipe-${tipe}`} className="ml-2 text-sm text-gray-700">{tipe}</label>
                            </div>
                        ))}
                    </div>
                    {options.tahfizhTipeFilter.length === 0 && (
                        <p className="text-xs text-red-500 mt-1">Pilih minimal satu jenis setoran.</p>
                    )}
                </div>
            </div>
        );
    }

    switch (activeReport) {
        case ReportType.LaporanArusKas:
            return (
                <div className="pt-4 border-t">
                    <h3 className="text-md font-semibold text-gray-700 mb-2">Filter Rentang Tanggal Laporan</h3>
                    <div className="grid grid-cols-1 gap-4">
                        <div><label className="block mb-1 text-sm font-medium text-gray-700">Tanggal Mulai</label><input type="date" value={options.kasStartDate} onChange={e => options.setKasStartDate(e.target.value)} className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg w-full p-2.5" /></div>
                        <div><label className="block mb-1 text-sm font-medium text-gray-700">Tanggal Selesai</label><input type="date" value={options.kasEndDate} onChange={e => options.setKasEndDate(e.target.value)} className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg w-full p-2.5" /></div>
                    </div>
                </div>
            );
        case ReportType.RekeningKoranSantri:
             const handleRekeningSelection = (santriId: number) => {
                const numId = Number(santriId);
                options.setSelectedRekeningKoranSantriIds(prev => {
                    const prevNums = prev.map(Number);
                    return prevNums.includes(numId) ? prevNums.filter(id => id !== numId) : [...prevNums, numId];
                });
             };
             const handleRekeningToggleAll = () => {
                const allIds = santriForRekeningSelector.map(s => Number(s.id));
                const allCurrentlySelected = allIds.length > 0 && allIds.every(id => options.selectedRekeningKoranSantriIds.map(Number).includes(id));
                if (allCurrentlySelected) {
                    options.setSelectedRekeningKoranSantriIds(prev => prev.filter(id => !allIds.includes(Number(id))));
                } else {
                    options.setSelectedRekeningKoranSantriIds(prev => [...new Set([...prev.map(Number), ...allIds])]);
                }
             };

             return (
                <div className="pt-4 border-t space-y-4">
                     <div>
                        <h3 className="text-md font-semibold text-gray-700 mb-2">Filter Rentang Tanggal</h3>
                        <div className="grid grid-cols-1 gap-4">
                            <div><label className="block mb-1 text-sm font-medium text-gray-700">Tanggal Mulai</label><input type="date" value={options.rekeningKoranStartDate} onChange={e => options.setRekeningKoranStartDate(e.target.value)} className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg w-full p-2.5" /></div>
                            <div><label className="block mb-1 text-sm font-medium text-gray-700">Tanggal Selesai</label><input type="date" value={options.rekeningKoranEndDate} onChange={e => options.setRekeningKoranEndDate(e.target.value)} className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg w-full p-2.5" /></div>
                        </div>
                    </div>
                    <div className="pt-4 border-t">
                        <h3 className="text-md font-semibold text-gray-700 mb-2">Santri yang Akan Dicetak</h3>
                        <div className="flex flex-col sm:flex-row gap-4 mb-4">
                            <div className="flex items-center"><input type="radio" id="rekeningKoran-all" name="rekeningKoran" value="all" checked={options.rekeningKoranPrintMode === 'all'} onChange={e => options.setRekeningKoranPrintMode(e.target.value as any)} className="w-4 h-4 text-teal-600"/><label htmlFor="rekeningKoran-all" className="ml-2 text-sm">Cetak Semua Santri Hasil Filter Utama ({filteredSantri.length} santri)</label></div>
                            <div className="flex items-center"><input type="radio" id="rekeningKoran-select" name="rekeningKoran" value="selected" checked={options.rekeningKoranPrintMode === 'selected'} onChange={e => options.setRekeningKoranPrintMode(e.target.value as any)} className="w-4 h-4 text-teal-600"/><label htmlFor="rekeningKoran-select" className="ml-2 text-sm">Pilih Santri Tertentu</label></div>
                        </div>

                        {options.rekeningKoranPrintMode === 'selected' && (
                            <div className="p-4 bg-gray-100 rounded-lg border space-y-3">
                                <div className="grid grid-cols-1 gap-3">
                                    <input type="text" placeholder="Cari Nama atau NIS..." value={rekeningSearch} onChange={e => setRekeningSearch(e.target.value)} className="sm:col-span-3 bg-white border border-gray-300 rounded-md p-2 text-sm" />
                                    <select value={rekeningJenjang} onChange={e => { setRekeningJenjang(e.target.value); setRekeningKelas(''); }} className="bg-white border p-2 text-sm rounded-md"><option value="">Filter Jenjang</option>{settings.jenjang.map(j=><option key={j.id} value={j.id}>{j.nama}</option>)}</select>
                                    <select value={rekeningKelas} onChange={e => setRekeningKelas(e.target.value)} disabled={!rekeningJenjang} className="bg-white border p-2 text-sm rounded-md disabled:bg-gray-200"><option value="">Filter Kelas</option>{rekeningAvailableKelas.map(k=><option key={k.id} value={k.id}>{k.nama}</option>)}</select>
                                </div>
                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <label className="block text-sm font-medium text-gray-700">Pilih Santri ({santriForRekeningSelector.length} hasil)</label>
                                        <button onClick={handleRekeningToggleAll} className="text-xs font-semibold text-teal-600 hover:underline">
                                            {santriForRekeningSelector.length > 0 && santriForRekeningSelector.every(s => options.selectedRekeningKoranSantriIds.map(Number).includes(Number(s.id))) ? 'Hapus Pilihan' : 'Pilih Semua Hasil'}
                                        </button>
                                    </div>
                                    <div className="max-h-48 overflow-y-auto grid grid-cols-1 gap-2 border bg-white p-3 rounded-md">
                                        {santriForRekeningSelector.length > 0 ? santriForRekeningSelector.map(santri => (
                                          <div key={santri.id} className="flex items-center">
                                              <input id={`rekening-santri-${santri.id}`} type="checkbox" checked={options.selectedRekeningKoranSantriIds.map(Number).includes(Number(santri.id))} onChange={() => handleRekeningSelection(santri.id)} className="w-4 h-4 text-teal-600 bg-gray-100 border-gray-300 rounded focus:ring-teal-500" />
                                              <label htmlFor={`rekening-santri-${santri.id}`} className="ml-2 text-sm text-gray-700">{santri.namaLengkap}</label>
                                          </div>
                                        )) : <p className="text-sm text-gray-400 col-span-full text-center">Tidak ada santri sesuai filter.</p>}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
             );
        case ReportType.LaporanAsrama:
            return (
                <div className="pt-4 border-t">
                    <p className="text-sm text-gray-600">Laporan ini akan mencakup data rekapitulasi keasramaan berdasarkan filter gedung yang dipilih. Klik 'Tampilkan Pratinjau' untuk melanjutkan.</p>
                </div>
            );
        case ReportType.Biodata:
            return (
                <div className="pt-4 border-t space-y-4">
                    <SantriSelector title="Opsi Cetak Biodata" printMode={options.biodataPrintMode} setPrintMode={options.setBiodataPrintMode} selectedIds={options.selectedBiodataSantriIds} setSelectedIds={options.setSelectedBiodataSantriIds} radioGroupName="biodata" filteredSantri={filteredSantri} />
                    <div className="pt-4 border-t">
                        <h4 className="text-md font-semibold text-gray-700 mb-2">Opsi Tanda Tangan</h4>
                        <div className="flex items-center mb-2"><input type="checkbox" id="useHijri" checked={options.useHijriDate} onChange={e => options.setUseHijriDate(e.target.checked)} className="w-4 h-4 text-teal-600 bg-gray-100 border-gray-300 rounded focus:ring-teal-500"/><label htmlFor="useHijri" className="ml-2 text-sm font-medium text-gray-700">Sertakan Tanggal Hijriah</label></div>
                        {options.useHijriDate && (<div className="pl-6 space-y-2"><div className="flex gap-4"><div className="flex items-center"><input type="radio" id="hijri-auto" value="auto" checked={options.hijriDateMode === 'auto'} onChange={e => options.setHijriDateMode(e.target.value as any)} className="w-4 h-4 text-teal-600"/><label htmlFor="hijri-auto" className="ml-2 text-sm">Otomatis (Hari Ini)</label></div><div className="flex items-center"><input type="radio" id="hijri-manual" value="manual" checked={options.hijriDateMode === 'manual'} onChange={e => options.setHijriDateMode(e.target.value as any)} className="w-4 h-4 text-teal-600"/><label htmlFor="hijri-manual" className="ml-2 text-sm">Manual</label></div></div>{options.hijriDateMode === 'manual' && (<div><input type="text" value={options.manualHijriDate} onChange={e => options.setManualHijriDate(e.target.value)} placeholder="Contoh: 1 Muharram 1446 H" className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg w-full md:w-1/2 p-2.5 mt-1"/></div>)}</div>)}
                    </div>
                </div>
            );
        case ReportType.LembarPembinaan:
            return <div className="pt-4 border-t"><SantriSelector title="Opsi Cetak Lembar Pembinaan" printMode={options.pembinaanPrintMode} setPrintMode={options.setPembinaanPrintMode} selectedIds={options.selectedPembinaanSantriIds} setSelectedIds={options.setSelectedPembinaanSantriIds} radioGroupName="pembinaan" filteredSantri={filteredSantri} /></div>;
        case ReportType.FormulirIzin:
            return (
              <div className="pt-4 border-t space-y-4">
                  <h3 className="text-md font-semibold text-gray-700">Opsi Formulir Izin</h3>
                  <div className="grid grid-cols-1 gap-4">
                    <div><label className="block mb-1 text-sm font-medium text-gray-700">Tujuan</label><input type="text" value={options.izinTujuan} onChange={e => options.setIzinTujuan(e.target.value)} className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg w-full p-2.5" placeholder="Contoh: Rumah, Rumah Sakit" /></div>
                    <div><label className="block mb-1 text-sm font-medium text-gray-700">Keperluan</label><input type="text" value={options.izinKeperluan} onChange={e => options.setIzinKeperluan(e.target.value)} className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg w-full p-2.5" placeholder="Contoh: Menjenguk orang tua sakit" /></div>
                    <div><label className="block mb-1 text-sm font-medium text-gray-700">Tanggal Berangkat</label><input type="date" value={options.izinTanggalBerangkat} onChange={e => options.setIzinTanggalBerangkat(e.target.value)} className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg w-full p-2.5" /></div>
                    <div><label className="block mb-1 text-sm font-medium text-gray-700">Tanggal Kembali</label><input type="date" value={options.izinTanggalKembali} onChange={e => options.setIzinTanggalKembali(e.target.value)} className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg w-full p-2.5" /></div>
                    <div className="md:col-span-2"><label className="block mb-1 text-sm font-medium text-gray-700">Nama Penjemput</label><input type="text" value={options.izinPenjemput} onChange={e => options.setIzinPenjemput(e.target.value)} className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg w-full p-2.5" placeholder="Nama lengkap penjemput" /></div>
                  </div>
                  <div className="pt-4 border-t"><h4 className="text-md font-semibold text-gray-700 mb-2">Pengaturan Tanda Tangan</h4><div className="grid grid-cols-1 gap-4"><div><label className="block mb-1 text-sm font-medium text-gray-700">Jabatan Penanda Tangan</label><input type="text" value={options.izinSignatoryTitle} onChange={e => options.setIzinSignatoryTitle(e.target.value)} placeholder="Contoh: Bag. Keamanan" className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg w-full p-2.5" /></div><div><label className="block mb-1 text-sm font-medium text-gray-700">Penanda Tangan (Opsional)</label><select value={options.izinSignatoryId} onChange={e => options.setIzinSignatoryId(e.target.value)} className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg w-full p-2.5"><option value="">-- Pilih Penanda Tangan --</option>{settings.tenagaPengajar.map(p => (<option key={p.id} value={p.id.toString()}>{p.nama}</option>))}</select></div></div></div>
                  <div className="pt-4 border-t"><h4 className="text-md font-semibold text-gray-700 mb-2">Ketentuan Izin</h4><div><label htmlFor="ketentuan-izin" className="block mb-1 text-sm font-medium text-gray-700">Tulis ketentuan di sini, pisahkan setiap poin dengan baris baru.</label><textarea id="ketentuan-izin" rows={5} value={options.izinKetentuan} onChange={e => options.setIzinKetentuan(e.target.value)} className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg w-full p-2.5"/></div></div>
                  <SantriSelector title="" printMode={options.izinPrintMode} setPrintMode={options.setIzinPrintMode} selectedIds={options.selectedIzinSantriIds} setSelectedIds={options.setSelectedIzinSantriIds} radioGroupName="izin" filteredSantri={filteredSantri} />
              </div>
            );
        case ReportType.KartuSantri:
             return (
                <div className="pt-4 border-t space-y-4">
                    <h3 className="text-md font-semibold text-gray-700">Kustomisasi Kartu Santri</h3>

                    {/* Design Selection */}
                    <div>
                        <label className="block mb-2 text-sm font-medium text-gray-700">Pilih Desain Kartu</label>
                        <select
                            value={options.cardDesign}
                            onChange={e => handleCardDesignChange(e.target.value)}
                            className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg w-full p-2.5"
                        >
                            {cardDesigns.map(design => (
                                <option key={design.id} value={design.id}>{design.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Ukuran Kartu - Full width stacked */}
                    <div className="space-y-3">
                        <div>
                            <label className="block mb-1 text-sm font-medium text-gray-700">Lebar (cm)</label>
                            <input
                                type="number"
                                value={options.cardWidth}
                                onChange={e => options.setCardWidth(Number(e.target.value))}
                                step="0.01"
                                className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg w-full p-2.5"
                            />
                        </div>
                        <div>
                            <label className="block mb-1 text-sm font-medium text-gray-700">Tinggi (cm)</label>
                            <input
                                type="number"
                                value={options.cardHeight}
                                onChange={e => options.setCardHeight(Number(e.target.value))}
                                step="0.01"
                                className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg w-full p-2.5"
                            />
                        </div>
                    </div>

                    <div>
                        <div className="flex flex-wrap items-center justify-between gap-1.5 mb-2">
                            <label className="block text-sm font-medium text-gray-700">Data Strategis pada Kartu</label>
                            <div className="flex flex-wrap items-center gap-1">
                                <button
                                    type="button"
                                    onClick={() => handleApplyCardPreset('standar')}
                                    className="px-2 py-0.5 text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-medium transition-colors"
                                    title="Nama, NIS, Jenjang, Kelas, Rombel"
                                >
                                    Standar
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleApplyCardPreset('lengkap')}
                                    className="px-2 py-0.5 text-[11px] bg-teal-100 hover:bg-teal-200 text-teal-800 rounded font-medium transition-colors"
                                    title="Lengkap: Asrama, Darah, Kontak Ortu, NISN, dll"
                                >
                                    Lengkap
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleApplyCardPreset('semua')}
                                    className="px-2 py-0.5 text-[11px] bg-blue-50 hover:bg-blue-100 text-blue-700 rounded font-medium transition-colors"
                                >
                                    Pilih Semua
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleApplyCardPreset('reset')}
                                    className="px-2 py-0.5 text-[11px] bg-gray-100 hover:bg-gray-200 text-gray-600 rounded font-medium transition-colors"
                                >
                                    Reset
                                </button>
                            </div>
                        </div>

                        <div className="border bg-white rounded-lg p-3 space-y-3 max-h-[340px] overflow-y-auto">
                            {['Identitas Pokok', 'Akademik & Domisili', 'Personal & Kontak Darurat'].map(category => {
                                const fieldsInCategory = availableCardFields.filter(f => f.category === category);
                                return (
                                    <div key={category} className="space-y-1.5">
                                        <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider bg-slate-50 px-2 py-0.5 rounded flex items-center justify-between">
                                            <span>{category}</span>
                                            <span className="text-[10px] font-normal text-slate-400">
                                                {fieldsInCategory.filter(f => options.cardFields.includes(f.id)).length}/{fieldsInCategory.length} aktif
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pl-1">
                                            {fieldsInCategory.map(field => {
                                                const isChecked = options.cardFields.includes(field.id);
                                                return (
                                                    <label 
                                                        key={field.id} 
                                                        className={`flex items-center gap-2 p-1.5 rounded cursor-pointer transition-colors text-xs ${
                                                            isChecked ? 'bg-teal-50/60 text-teal-900 font-medium' : 'hover:bg-slate-50 text-slate-700'
                                                        }`}
                                                    >
                                                        <input 
                                                            id={`card-field-${field.id}`} 
                                                            type="checkbox" 
                                                            checked={isChecked} 
                                                            onChange={() => handleCardFieldChange(field.id)} 
                                                            className="w-3.5 h-3.5 text-teal-600 bg-gray-100 border-gray-300 rounded focus:ring-teal-500 shrink-0" 
                                                        />
                                                        <span className="leading-tight">{field.label}</span>
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        <p className="text-xs text-gray-500 mt-1 italic">
                            Tip: Opsi Jenjang dan Tingkat/Kelas dapat dicentang terpisah atau bersamaan. Font akan beradaptasi cerdas agar muat rapi di kartu.
                        </p>
                    </div>

                    {/* QR Code / Barcode Option */}
                    <div className="border-t pt-4">
                        <div className="flex items-center mb-2">
                            <input
                                type="checkbox"
                                id="show-qrcode"
                                checked={options.cardShowQRCode}
                                onChange={e => options.setCardShowQRCode(e.target.checked)}
                                className="w-4 h-4 text-teal-600 rounded"
                            />
                            <label htmlFor="show-qrcode" className="ml-2 text-sm font-medium text-gray-700">
                                Tampilkan QR Code NIS
                            </label>
                        </div>
                        <p className="text-xs text-gray-500 mb-3">
                            QR Code diletakkan pada muka depan kartu santri untuk absensi, perizinan, dan transaksi santri.
                        </p>
                        {options.cardShowQRCode && (
                            <div className="space-y-2.5 pl-6 bg-gray-50 p-3 rounded-lg border border-gray-200">
                                <label className="block text-xs font-semibold text-gray-700">Pilihan Penempatan QR Code</label>
                                <div className="flex flex-col sm:flex-row gap-3">
                                    <label className="flex items-start gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="cardQRPlacement"
                                            id="qr-placement-with-photo"
                                            value="with_photo"
                                            checked={options.cardQRPlacement !== 'replace_photo'}
                                            onChange={() => options.setCardQRPlacement('with_photo')}
                                            className="w-4 h-4 text-teal-600 mt-0.5"
                                        />
                                        <div>
                                            <span className="text-xs font-medium text-gray-800 block">Bersama Foto Santri</span>
                                            <span className="text-[11px] text-gray-500">QR Code di pojok kanan bawah foto santri</span>
                                        </div>
                                    </label>
                                    <label className="flex items-start gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="cardQRPlacement"
                                            id="qr-placement-replace-photo"
                                            value="replace_photo"
                                            checked={options.cardQRPlacement === 'replace_photo'}
                                            onChange={() => options.setCardQRPlacement('replace_photo')}
                                            className="w-4 h-4 text-teal-600 mt-0.5"
                                        />
                                        <div>
                                            <span className="text-xs font-medium text-gray-800 block">Gantikan Foto Santri</span>
                                            <span className="text-[11px] text-gray-500">Kotak foto santri digantikan QR Code NIS</span>
                                        </div>
                                    </label>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Masa Berlaku Config */}
                    <div>
                        <label className="block mb-1 text-sm font-medium text-gray-700">Masa Berlaku Kartu</label>
                        <div className="flex flex-col gap-2 mb-2">
                            <label className="flex items-center gap-2">
                                <input type="radio" name="cardValidityMode" value="date" checked={options.cardValidityMode === 'date'} onChange={() => options.setCardValidityMode('date')} className="text-teal-600" />
                                <span className="text-sm">Tanggal Tertentu</span>
                            </label>
                            <label className="flex items-center gap-2">
                                <input type="radio" name="cardValidityMode" value="forever" checked={options.cardValidityMode === 'forever'} onChange={() => options.setCardValidityMode('forever')} className="text-teal-600" />
                                <span className="text-sm">Selama Menjadi Santri</span>
                            </label>
                            <label className="flex items-center gap-2">
                                <input type="radio" name="cardValidityMode" value="none" checked={options.cardValidityMode === 'none'} onChange={() => options.setCardValidityMode('none')} className="text-teal-600" />
                                <span className="text-sm">Sembunyikan (Tidak Ditampilkan)</span>
                            </label>
                        </div>
                        
                        {options.cardValidityMode === 'date' && (
                            <div>
                                <label className="block mb-1 text-xs text-gray-600">Pilih Tanggal Berakhir</label>
                                <input type="date" value={options.cardValidUntil} onChange={e => options.setCardValidUntil(e.target.value)} className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg w-full p-2.5" />
                            </div>
                        )}
                    </div>

                    {/* Sisi Belakang Layout */}
                    <div>
                        <label className="block mb-2 text-sm font-medium text-gray-700">Layout Sisi Belakang Kartu (Backside)</label>
                        <select 
                            value={options.cardBacksideLayout} 
                            onChange={e => options.setCardBacksideLayout(e.target.value as any)} 
                            className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg w-full p-2.5"
                        >
                            <option value="none">Tanpa Sisi Belakang (Hanya 1 Sisi)</option>
                            <option value="side-by-side">Bersebelahan dalam 1 Kotak (Bisa dilipat ke belakang)</option>
                            <option value="separate">Halaman Terpisah (Untuk Printer Duplex Bolak-Balik)</option>
                        </select>
                        <p className="text-xs text-gray-500 mt-1 italic">
                            Opsi Bersebelahan cocok untuk cetak manual & laminating. Opsi Halaman Terpisah merender sisi belakang di lembar kertas berikutnya.
                        </p>
                        
                        {options.cardBacksideLayout !== 'none' && (
                            <div className="mt-3 space-y-4 rounded-lg bg-gray-50 border border-gray-200 p-3">
                                {/* Header / Title */}
                                <div>
                                    <div className="flex items-center justify-between mb-1.5">
                                        <label className="block text-xs font-semibold text-gray-800">
                                            Tata Tertib / Ketentuan Singkat (Sisi Belakang)
                                        </label>
                                        <span className="text-[10px] text-gray-500">
                                            {(options.cardRules || '').split('\n').filter((l: string) => l.trim() !== '').length} Butir • {(options.cardRules || '').length} Karakter
                                        </span>
                                    </div>

                                    {/* Hint Box */}
                                    <div className="bg-blue-50 border border-blue-200 rounded-md p-2.5 mb-2 text-xs text-blue-900 flex items-start gap-2">
                                        <i className="bi bi-info-circle text-blue-600 text-sm shrink-0 mt-0.5"></i>
                                        <div className="space-y-0.5 text-[11px] leading-relaxed">
                                            <p className="font-semibold text-blue-950">💡 Petunjuk Penulisan:</p>
                                            <p>• Tekan <kbd className="px-1 py-0.5 bg-white border border-blue-300 rounded text-[10px] font-mono shadow-xs">Enter</kbd> untuk membuat nomor butir aturan baru secara otomatis (1, 2, 3...).</p>
                                            <p>• Gunakan tag <code className="bg-white px-1 py-0.5 border border-blue-300 rounded font-mono text-[10px] text-blue-700">{`{NamaPonpes}`}</code> agar otomatis digantikan dengan nama pondok saat dicetak.</p>
                                        </div>
                                    </div>

                                    {/* Toolbox Toolbar */}
                                    <div className="flex flex-wrap items-center gap-1.5 mb-1.5 p-1.5 bg-white border border-gray-200 rounded-md">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const current = options.cardRules || '';
                                                const addition = current ? `\nSantri wajib mematuhi seluruh peraturan pesantren.` : `Santri wajib mematuhi seluruh peraturan pesantren.`;
                                                options.setCardRules(current + addition);
                                            }}
                                            className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-[11px] font-medium transition-colors"
                                            title="Tambah butir baru di baris bawah"
                                        >
                                            <i className="bi bi-plus-lg text-teal-600"></i>
                                            + Butir Baru
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => {
                                                const current = options.cardRules || '';
                                                options.setCardRules(current + ' {NamaPonpes}');
                                            }}
                                            className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded text-[11px] font-medium transition-colors"
                                            title="Sisipkan tag nama pondok"
                                        >
                                            <i className="bi bi-stars text-blue-600"></i>
                                            + {'{NamaPonpes}'}
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => {
                                                const defaultTemplate = `Kartu ini adalah tanda pengenal resmi santri {NamaPonpes}.\nSantri wajib membawa kartu ini selama berada di lingkungan pesantren atau saat mengikuti kegiatan resmi.\nKartu ini tidak boleh dipindahtangankan kepada orang lain.\nApabila kartu ini hilang atau rusak, santri wajib segera melapor kepada pengurus kesantrian untuk proses penggantian.\nKartu ini berlaku sebagai akses (jika terintegrasi) untuk peminjaman perpustakaan, layanan kesehatan, dan transaksi koperasi.`;
                                                options.setCardRules(defaultTemplate);
                                            }}
                                            className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded text-[11px] font-medium transition-colors ml-auto"
                                            title="Kembalikan ke susunan teks bawaan"
                                        >
                                            <i className="bi bi-arrow-counterclockwise text-gray-500"></i>
                                            Reset Standar
                                        </button>
                                    </div>

                                    {/* Textarea */}
                                    <textarea 
                                        value={options.cardRules} 
                                        onChange={e => options.setCardRules(e.target.value)} 
                                        rows={6}
                                        className="bg-white border border-gray-300 text-gray-900 text-xs rounded-lg w-full p-2.5 focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                                        placeholder="Masukkan setiap poin pada baris baru (tekan Enter). Gunakan {NamaPonpes} untuk memunculkan nama pondok."
                                    />
                                </div>

                                {/* Typography & Color Customization Toolbox */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-gray-200">
                                    <div>
                                        <label className="flex items-center gap-1 text-[11px] font-medium text-gray-700 mb-1">
                                            <i className="bi bi-fonts text-gray-500"></i>
                                            Ukuran Font Teks Tata Tertib
                                        </label>
                                        <select
                                            value={options.cardRulesFontSize || 'auto'}
                                            onChange={e => options.setCardRulesFontSize(e.target.value as any)}
                                            className="bg-white border border-gray-300 text-gray-800 text-xs rounded-md w-full p-2"
                                        >
                                            <option value="auto">Otomatis (Menyesuaikan panjang teks)</option>
                                            <option value="small">Kecil (4pt - Muat banyak butir)</option>
                                            <option value="normal">Sedang (4.8pt - Standar)</option>
                                            <option value="large">Besar (5.5pt - Tulisan ringkas)</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="flex items-center gap-1 text-[11px] font-medium text-gray-700 mb-1">
                                            <i className="bi bi-palette text-gray-500"></i>
                                            Warna Teks Khusus (Opsional)
                                        </label>
                                        <select
                                            value={options.cardRulesCustomColor || ''}
                                            onChange={e => options.setCardRulesCustomColor(e.target.value)}
                                            className="bg-white border border-gray-300 text-gray-800 text-xs rounded-md w-full p-2"
                                        >
                                            <option value="">Ikuti Tema Kartu (Default)</option>
                                            <option value="#111827">Hitam Pekat (#111827)</option>
                                            <option value="#065f46">Hijau Islami (#065f46)</option>
                                            <option value="#1e3a8a">Biru Navy (#1e3a8a)</option>
                                            <option value="#831843">Merah Marun (#831843)</option>
                                            <option value="#d97706">Emas / Kuning (#d97706)</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Quotes Customization Box */}
                                <div className="pt-2 border-t border-gray-200 bg-amber-50/60 p-2.5 rounded-lg border border-amber-200/70">
                                    <div className="flex items-center justify-between">
                                        <label className="flex items-center gap-1.5 text-xs font-semibold text-amber-950 cursor-pointer">
                                            <i className="bi bi-chat-quote-fill text-amber-600"></i>
                                            Kutipan / Kata Mutiara Muka Belakang
                                        </label>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input 
                                                type="checkbox" 
                                                checked={options.cardShowQuote ?? true} 
                                                onChange={e => options.setCardShowQuote(e.target.checked)}
                                                className="sr-only peer"
                                            />
                                            <div className="w-9 h-5 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-600"></div>
                                        </label>
                                    </div>

                                    {(options.cardShowQuote ?? true) && (
                                        <div className="mt-2 space-y-2 pt-2 border-t border-amber-200/50">
                                            <div>
                                                <div className="flex items-center justify-between mb-1">
                                                    <label className="text-[11px] font-medium text-amber-900">Preset Hadits & Mahfudzot</label>
                                                    {options.cardCustomQuote && (
                                                        <button
                                                            type="button"
                                                            onClick={() => options.setCardCustomQuote('')}
                                                            className="text-[10px] text-amber-700 hover:text-amber-900 underline flex items-center gap-0.5"
                                                        >
                                                            <i className="bi bi-arrow-counterclockwise"></i> Reset ke Default Desain
                                                        </button>
                                                    )}
                                                </div>
                                                <select
                                                    value={options.cardCustomQuote || ''}
                                                    onChange={e => options.setCardCustomQuote(e.target.value)}
                                                    className="w-full bg-white border border-amber-300 text-gray-800 text-xs rounded-md p-1.5 focus:ring-1 focus:ring-amber-500"
                                                >
                                                    <option value="">-- Sesuai Bawaan Tema Kartu yang Aktif --</option>
                                                    <option value="Sebaik-baik manusia adalah yang paling bermanfaat bagi orang lain.">Hadits: Sebaik-baik manusia adalah yang paling bermanfaat bagi sesama</option>
                                                    <option value="Menuntut ilmu adalah kewajiban bagi setiap muslim.">Hadits: Menuntut ilmu adalah kewajiban setiap muslim</option>
                                                    <option value="Man jadda wajada (Barangsiapa bersungguh-sungguh, dia akan berhasil).">Mahfudzot: Man jadda wajada (Siapa bersungguh-sungguh pasti berhasil)</option>
                                                    <option value="Adab dan akhlak mulia mendahului ketinggian ilmu.">Adab & Ilmu: Adab dan akhlak mulia mendahului ketinggian ilmu</option>
                                                    <option value="Disiplin dan adab adalah kunci keberkahan ilmu.">Karakter: Disiplin dan adab adalah kunci keberkahan ilmu</option>
                                                    <option value="Rajin mengaji, santun berbudi, berbakti pada orang tua & guru.">TPQ/Santri Cilik: Rajin mengaji, santun berbudi, berbakti pada ortu & guru</option>
                                                    <option value="Al-Waqtu kassaif, in lam taqtha'hu qatha'aka (Waktu laksana pedang).">Mahfudzot: Waktu laksana pedang</option>
                                                    <option value="Man shobaro zhofiro (Barangsiapa yang bersabar, dia akan beruntung).">Mahfudzot: Siapa bersabar pasti beruntung</option>
                                                    <option value="Tholabul 'ilmi minal mahdi ilal lahdi (Menuntut ilmu dari buaian hingga liang lahad).">Mahfudzot: Belajar dari buaian hingga liang lahad</option>
                                                </select>
                                            </div>

                                            <div>
                                                <label className="block text-[11px] font-medium text-amber-900 mb-0.5">Teks Kutipan / Kata Mutiara Kustom</label>
                                                <input
                                                    type="text"
                                                    value={options.cardCustomQuote || ''}
                                                    onChange={e => options.setCardCustomQuote(e.target.value)}
                                                    placeholder="Tulis kata mutiara, motto santri, hadits, atau slogan pondok..."
                                                    className="w-full bg-white border border-amber-300 text-gray-900 text-xs rounded-md p-2 focus:ring-1 focus:ring-amber-500"
                                                />
                                                <p className="text-[10px] text-amber-800/80 mt-0.5">
                                                    *Kosongkan untuk otomatis menggunakan kata mutiara default sesuai desain kartu. Nonaktifkan toggle di atas jika ingin kartu tanpa quotes.
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-3 pt-2 border-t border-gray-200">
                                    <div>
                                        <label className="block mb-1 text-xs font-medium text-gray-700">Jabatan Penanda Tangan (Belakang)</label>
                                        <input
                                            type="text"
                                            value={options.cardSignatoryTitle}
                                            onChange={e => options.setCardSignatoryTitle(e.target.value)}
                                            className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg w-full p-2.5"
                                            placeholder="Contoh: Mudir Marhalah"
                                        />
                                    </div>
                                    <div>
                                        <label className="block mb-1 text-xs font-medium text-gray-700">Penanda Tangan (Belakang)</label>
                                        <select
                                            value={options.cardSignatoryId}
                                            onChange={e => options.setCardSignatoryId(e.target.value)}
                                            className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg w-full p-2.5"
                                        >
                                            <option value="">-- Pengasuh Utama --</option>
                                            {settings.tenagaPengajar.map((p: any) => (
                                                <option key={p.id} value={p.id.toString()}>{p.nama}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                    
                    <SantriSelector title="" printMode={options.cardPrintMode} setPrintMode={options.setCardPrintMode} selectedIds={options.selectedCardSantriIds} setSelectedIds={options.setSelectedCardSantriIds} radioGroupName="card" filteredSantri={filteredSantri} />
                </div>
             );
        case ReportType.LabelSantri:
            return (
                <div className="pt-4 border-t space-y-4">
                    <h4 className="text-sm font-semibold text-gray-700">Kustomisasi Label</h4>

                    {/* Ukuran Label */}
                    <div className="space-y-3">
                        <div>
                            <label className="block mb-1 text-sm font-medium text-gray-700">Lebar Label (cm)</label>
                            <input type="number" value={options.labelWidth} onChange={e => options.setLabelWidth(Number(e.target.value))} className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg w-full p-2.5" step="0.1" />
                        </div>
                        <div>
                            <label className="block mb-1 text-sm font-medium text-gray-700">Tinggi Label (cm)</label>
                            <input type="number" value={options.labelHeight} onChange={e => options.setLabelHeight(Number(e.target.value))} className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg w-full p-2.5" step="0.1" />
                        </div>
                        <div>
                            <label className="block mb-1 text-sm font-medium text-gray-700">Ukuran Font (pt)</label>
                            <input type="number" value={options.labelFontSize} onChange={e => options.setLabelFontSize(Number(e.target.value))} className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg w-full p-2.5" />
                        </div>
                    </div>

                    {/* Data yang Ditampilkan */}
                    <div className="border-t pt-4">
                        <label className="block mb-2 text-sm font-medium text-gray-700">Data yang Ditampilkan</label>
                        <div className="max-h-40 overflow-y-auto border bg-white p-3 rounded-md">
                            {availableLabelFields.map(field => (
                                <div key={field.id} className="flex items-center py-1">
                                    <input id={`field-${field.id}`} type="checkbox" checked={options.labelFields.includes(field.id)} onChange={() => handleLabelFieldChange(field.id)} className="w-4 h-4 text-teal-600 bg-gray-100 border-gray-300 rounded focus:ring-teal-500" />
                                    <label htmlFor={`field-${field.id}`} className="ml-2 text-sm text-gray-700">{field.label}</label>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Santri yang Akan Dicetak */}
                    <SantriSelector 
                        title="Santri yang Akan Dicetak" 
                        printMode={options.labelPrintMode} 
                        setPrintMode={options.setLabelPrintMode} 
                        selectedIds={options.selectedLabelSantriIds} 
                        setSelectedIds={options.setSelectedLabelSantriIds} 
                        radioGroupName="label" 
                        filteredSantri={filteredSantri} 
                    />
                </div>
            );
        case ReportType.LembarNilai:
            return (
                <div className="pt-4 border-t space-y-4">
                  <div className="rounded-lg border bg-white p-4">
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">1. Filter Guru Pengajar</h4>
                    <select
                        value={options.nilaiGuruFilter || ''}
                        onChange={e => options.setNilaiGuruFilter(e.target.value ? Number(e.target.value) : null)}
                        className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg w-full p-2.5"
                    >
                        <option value="">Semua Guru</option>
                        {settings.tenagaPengajar.map(guru => (
                            <option key={guru.id} value={guru.id}>{guru.nama}</option>
                        ))}
                    </select>
                    {options.nilaiGuruFilter && (
                        <p className="text-xs text-teal-600 mt-1">
                            ✓ Filter aktif: menampilkan mapel yang diajar oleh guru terpilih
                        </p>
                    )}
                  </div>

                  <div className="rounded-lg border bg-white p-4">
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">
                        2. Pengaturan Daftar Mata Pelajaran
                    </h4>
                    <p className="text-xs text-gray-500 mb-2">
                        Mata Pelajaran (Jenjang: {selectedJenjangId ? settings.jenjang.find(j=>j.id === parseInt(selectedJenjangId))?.nama : 'Semua'})
                    </p>
                    <h5 className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">
                        Daftar Mata Pelajaran
                    </h5>
                    <div className="flex justify-end mb-2">
                        <div className="space-x-2">
                            <button onClick={() => options.setSelectedMapelIds(availableMapel.map(m => m.id))} className="text-xs font-semibold text-teal-600 hover:underline">Pilih Semua</button>
                            <button onClick={() => options.setSelectedMapelIds([])} className="text-xs font-semibold text-gray-500 hover:underline">Hapus Semua</button>
                        </div>
                    </div>
                    <div className="max-h-40 overflow-y-auto border bg-white p-3 rounded-md">
                      {availableMapel.length > 0 ? availableMapel.map(mapel => (
                              <div key={mapel.id} className="flex items-center py-1">
                                  <input id={`mapel-${mapel.id}`} type="checkbox"
                                      checked={options.selectedMapelIds.includes(mapel.id)}
                                      onChange={() => handleMapelSelection(mapel.id)}
                                      className="w-4 h-4 text-teal-600 bg-gray-100 border-gray-300 rounded focus:ring-teal-500"
                                  />
                                  <label htmlFor={`mapel-${mapel.id}`} className="ml-2 text-sm text-gray-700">
                                      {mapel.nama}
                                  </label>
                              </div>
                          )) : <p className="text-sm text-gray-400 text-center">Pilih jenjang spesifik untuk melihat mata pelajaran.</p>}
                    </div>
                  </div>

                  <div className="rounded-lg border bg-white p-4">
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">3. Pengaturan Laporan</h4>
                    <div className="space-y-3">
                        <div>
                            <label className="block mb-1 text-sm font-medium text-gray-700">Semester</label>
                            <select value={options.semester} onChange={e => options.setSemester(e.target.value as any)} className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg w-full p-2.5">
                                <option value="Ganjil">Ganjil</option>
                                <option value="Genap">Genap</option>
                            </select>
                        </div>
                        <div>
                            <label className="block mb-1 text-sm font-medium text-gray-700">Tahun Ajaran</label>
                            <AcademicYearSelect />
                        </div>
                    </div>
                  </div>

                  <div className="rounded-lg border bg-white p-4">
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">4. Pengaturan Struktur Kolom Nilai</h4>
                    <div className="space-y-3">
                        <div>
                            <label className="block mb-1 text-sm font-medium text-gray-700">Jumlah Kolom Nilai TP (Tujuan Pembelajaran)</label>
                            <input type="number" value={options.nilaiTpCount} onChange={e => options.setNilaiTpCount(Number(e.target.value))} min="1" max="10" className="bg-white border border-gray-300 text-sm rounded-lg w-full p-2.5" />
                        </div>
                        <div>
                            <label className="block mb-1 text-sm font-medium text-gray-700">Jumlah Kolom Nilai SM (Sumatif Materi)</label>
                            <input type="number" value={options.nilaiSmCount} onChange={e => options.setNilaiSmCount(Number(e.target.value))} min="1" max="5" className="bg-white border border-gray-300 text-sm rounded-lg w-full p-2.5" />
                        </div>
                        <div className="flex items-center">
                            <input type="checkbox" id="show-nts" checked={options.showNilaiTengahSemester} onChange={e => options.setShowNilaiTengahSemester(e.target.checked)} className="w-4 h-4 text-teal-600 rounded" />
                            <label htmlFor="show-nts" className="ml-2 text-sm font-medium text-gray-700">Sertakan Kolom Tengah Semester (STS)</label>
                        </div>
                    </div>
                  </div>

                  <div className="rounded-lg border bg-white p-4">
                    <label className="block mb-2 text-sm font-semibold text-gray-700">5. Opsi Panduan Penilaian</label>
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center">
                            <input type="radio" id="g-show" value="show" checked={options.guidanceOption === 'show'} onChange={e => options.setGuidanceOption(e.target.value as any)} className="w-4 h-4 text-teal-600"/>
                            <label htmlFor="g-show" className="ml-2 text-sm">Tampilkan di halaman terpisah</label>
                        </div>
                        <div className="flex items-center">
                            <input type="radio" id="g-hide" value="hide" checked={options.guidanceOption === 'hide'} onChange={e => options.setGuidanceOption(e.target.value as any)} className="w-4 h-4 text-teal-600"/>
                            <label htmlFor="g-hide" className="ml-2 text-sm">Jangan tampilkan</label>
                        </div>
                    </div>
                  </div>
                </div>
            );
        case ReportType.LembarAbsensi:
            return (
                <div className="pt-4 border-t space-y-4">
                    <div className="rounded-lg border bg-white p-4">
                        <h4 className="text-sm font-semibold text-gray-700 mb-2">1. Periode Absensi</h4>

                        <div className="mb-4">
                            <label className="block mb-1 text-sm font-medium text-gray-700">Jenis Kalender</label>
                            <div className="flex gap-4">
                                <div className="flex items-center">
                                    <input type="radio" id="masehi" value="Masehi" checked={options.attendanceCalendar === 'Masehi'} onChange={e => options.setAttendanceCalendar(e.target.value as any)} className="w-4 h-4 text-teal-600"/>
                                    <label htmlFor="masehi" className="ml-2 text-sm">Masehi</label>
                                </div>
                                <div className="flex items-center">
                                    <input type="radio" id="hijriah" value="Hijriah" checked={options.attendanceCalendar === 'Hijriah'} onChange={e => options.setAttendanceCalendar(e.target.value as any)} className="w-4 h-4 text-teal-600"/>
                                    <label htmlFor="hijriah" className="ml-2 text-sm">Hijriah</label>
                                </div>
                            </div>
                        </div>

                        {options.attendanceCalendar === 'Masehi' ? (
                            <div className="space-y-3">
                                <div>
                                    <label htmlFor="startMonth" className="block mb-1 text-sm font-medium text-gray-700">Bulan Mulai</label>
                                    <input type="month" id="startMonth" value={options.startMonth} onChange={e => options.setStartMonth(e.target.value)} className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg w-full p-2.5" />
                                </div>
                                <div>
                                    <label htmlFor="endMonth" className="block mb-1 text-sm font-medium text-gray-700">Bulan Selesai</label>
                                    <input type="month" id="endMonth" value={options.endMonth} onChange={e => options.setEndMonth(e.target.value)} className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg w-full p-2.5" />
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <div className="grid grid-cols-1 gap-3">
                                    <div>
                                        <label className="block mb-1 text-sm font-medium text-gray-700">Bulan Mulai</label>
                                        <select value={options.hijriStartMonth} onChange={e => options.setHijriStartMonth(Number(e.target.value))} className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg w-full p-2.5">
                                            {hijriMonths.map(m => <option key={m.value} value={m.value}>{m.name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block mb-1 text-sm font-medium text-gray-700">Tahun</label>
                                        <input type="number" value={options.hijriStartYear} onChange={e => options.setHijriStartYear(Number(e.target.value))} className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg w-full p-2.5"/>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 gap-3">
                                    <div>
                                        <label className="block mb-1 text-sm font-medium text-gray-700">Bulan Selesai</label>
                                        <select value={options.hijriEndMonth} onChange={e => options.setHijriEndMonth(Number(e.target.value))} className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg w-full p-2.5">
                                            {hijriMonths.map(m => <option key={m.value} value={m.value}>{m.name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block mb-1 text-sm font-medium text-gray-700">Tahun</label>
                                        <input type="number" value={options.hijriEndYear} onChange={e => options.setHijriEndYear(Number(e.target.value))} className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg w-full p-2.5"/>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="rounded-lg border bg-white p-4">
                        <h4 className="text-sm font-semibold text-gray-700 mb-2">2. Informasi Tambahan</h4>
                        <div className="space-y-3">
                            <div>
                                <label htmlFor="semester-absensi" className="block mb-1 text-sm font-medium text-gray-700">Semester</label>
                                <select id="semester-absensi" value={options.semester} onChange={e => options.setSemester(e.target.value as any)} className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg w-full p-2.5">
                                    <option value="Ganjil">Ganjil</option>
                                    <option value="Genap">Genap</option>
                                </select>
                            </div>
                            <div>
                                <label htmlFor="tahun-ajaran-absensi" className="block mb-1 text-sm font-medium text-gray-700">Tahun Ajaran</label>
                                <AcademicYearSelect id="tahun-ajaran-absensi" />
                            </div>
                        </div>
                    </div>
                </div>
            );
        case ReportType.DaftarRombel:
            return (
                <div className="pt-4 border-t space-y-5">
                    {/* Judul Laporan Kustom */}
                    <div>
                        <label className="block mb-1 text-xs font-semibold text-gray-700">Judul Laporan</label>
                        <input
                            type="text"
                            value={options.rombelTitle || 'DAFTAR SANTRI'}
                            onChange={e => options.setRombelTitle(e.target.value)}
                            placeholder="Contoh: DAFTAR SANTRI AKTIF"
                            className="w-full bg-white border border-gray-300 text-gray-900 text-sm rounded-lg p-2.5"
                        />
                    </div>

                    {/* Pengelompokan Data */}
                    <div>
                        <label className="block mb-1 text-xs font-semibold text-gray-700">Pengelompokan Santri (Grouping)</label>
                        <select
                            value={options.rombelGrouping || 'rombel'}
                            onChange={e => options.setRombelGrouping(e.target.value as any)}
                            className="w-full bg-white border border-gray-300 text-gray-900 text-sm rounded-lg p-2.5"
                        >
                            <option value="rombel">Per Rombel (Standar - Halaman/Tabel Per Rombel)</option>
                            <option value="kelas">Per Kelas (Gabungan Semua Rombel dalam Kelas)</option>
                            <option value="jenjang">Per Jenjang (Gabungan Semua Santri dalam Jenjang)</option>
                            <option value="jenisSantri">Per Jenis Santri (Mondok - Baru, Mondok - Pindahan, Laju - Baru, Laju - Pindahan)</option>
                            <option value="none">Tanpa Pengelompokan (Satu Daftar Rata Terurut)</option>
                        </select>
                    </div>

                    {/* Orientasi Kertas */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block mb-1 text-xs font-semibold text-gray-700">Orientasi Kertas</label>
                            <select
                                value={options.rombelOrientation || 'auto'}
                                onChange={e => options.setRombelOrientation(e.target.value as any)}
                                className="w-full bg-white border border-gray-300 text-gray-900 text-sm rounded-lg p-2"
                            >
                                <option value="auto">Otomatis (Sesuai Jumlah Kolom)</option>
                                <option value="portrait">Tegak (Portrait)</option>
                                <option value="landscape">Memanjang (Landscape)</option>
                            </select>
                        </div>
                        <div className="flex flex-col justify-end">
                            <label className="flex items-center gap-2 p-2 bg-gray-50 border rounded-lg cursor-pointer hover:bg-gray-100 text-xs font-medium text-gray-700">
                                <input
                                    type="checkbox"
                                    checked={options.showRombelStats ?? true}
                                    onChange={e => options.setShowRombelStats(e.target.checked)}
                                    className="h-4 w-4 text-teal-600 rounded"
                                />
                                Ringkasan Statistik Santri
                            </label>
                        </div>
                    </div>

                    {/* Kolom yang Ditampilkan & Presets */}
                    <div>
                        <div className="flex justify-between items-center mb-1.5">
                            <h4 className="text-xs font-semibold text-gray-700">Pilih Kolom Tabel ({options.rombelVisibleColumns.length} dipilih)</h4>
                        </div>

                        {/* Presets Kolom Cepat */}
                        <div className="flex flex-wrap gap-1.5 mb-2.5">
                            <button
                                type="button"
                                onClick={() => options.setRombelVisibleColumns(['no', 'nis', 'namaLengkap', 'lp', 'ttl', 'wali', 'telepon', 'alamat'])}
                                className="text-[11px] px-2 py-1 bg-teal-50 text-teal-700 border border-teal-200 rounded hover:bg-teal-100 font-medium transition-colors"
                            >
                                Standar (Data Pokok)
                            </button>
                            <button
                                type="button"
                                onClick={() => options.setRombelVisibleColumns(['no', 'nis', 'nisn', 'nik', 'namaLengkap', 'lp', 'ttl', 'jenjang', 'kelas', 'rombel', 'jenisSantri', 'status', 'wali', 'telepon', 'alamat'])}
                                className="text-[11px] px-2 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded hover:bg-blue-100 font-medium transition-colors"
                            >
                                Lengkap (Akademik & Domisili)
                            </button>
                            <button
                                type="button"
                                onClick={() => options.setRombelVisibleColumns(['no', 'nis', 'namaLengkap', 'ayah', 'nikAyah', 'ttlAyah', 'pekerjaanAyah', 'teleponAyah', 'ibu', 'nikIbu', 'ttlIbu', 'pekerjaanIbu', 'teleponIbu', 'alamat'])}
                                className="text-[11px] px-2 py-1 bg-purple-50 text-purple-700 border border-purple-200 rounded hover:bg-purple-100 font-medium transition-colors"
                            >
                                Data Orang Tua Lengkap
                            </button>
                            <button
                                type="button"
                                onClick={() => options.setRombelVisibleColumns(['no', 'nis', 'namaLengkap', 'wali', 'statusWali', 'ttlWali', 'pekerjaanWali', 'teleponWali', 'alamatWali', 'telepon'])}
                                className="text-[11px] px-2 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded hover:bg-amber-100 font-medium transition-colors"
                            >
                                Kontak & Wali
                            </button>
                            <button
                                type="button"
                                onClick={() => options.setRombelVisibleColumns(['no', 'nis', 'namaLengkap', 'rombel', 'jenisSantri', 'gedungAsrama', 'kamar', 'halaqah', 'targetJuz', 'telepon'])}
                                className="text-[11px] px-2 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded hover:bg-emerald-100 font-medium transition-colors"
                            >
                                Asrama & Tahfizh
                            </button>
                            <button
                                type="button"
                                onClick={() => options.setRombelVisibleColumns(daftarRombelColumns.map(c => c.id))}
                                className="text-[11px] px-2 py-1 bg-gray-100 text-gray-700 border border-gray-200 rounded hover:bg-gray-200 font-medium transition-colors"
                            >
                                Pilih Semua ({daftarRombelColumns.length})
                            </button>
                            <button
                                type="button"
                                onClick={() => options.setRombelVisibleColumns(['no', 'nis', 'namaLengkap'])}
                                className="text-[11px] px-2 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded hover:bg-rose-100 font-medium transition-colors"
                            >
                                Minimal
                            </button>
                        </div>

                        {/* Search & Category Filter */}
                        <div className="space-y-2 mb-2">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={rombelColSearch}
                                    onChange={e => setRombelColSearch(e.target.value)}
                                    placeholder="Cari kolom (misal: NIK, Ayah, TTL, Kamar)..."
                                    className="flex-1 text-xs border border-gray-300 rounded px-2.5 py-1.5 focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
                                />
                                {rombelColSearch && (
                                    <button
                                        type="button"
                                        onClick={() => setRombelColSearch('')}
                                        className="text-xs text-gray-400 hover:text-gray-600 px-2"
                                    >
                                        Bersihkan
                                    </button>
                                )}
                            </div>

                            <div className="flex flex-wrap gap-1 text-[10px]">
                                {[
                                    { id: 'all', label: 'Semua' },
                                    { id: 'santri', label: 'Santri' },
                                    { id: 'ortu', label: 'Orang Tua' },
                                    { id: 'wali', label: 'Wali' },
                                    { id: 'akademik', label: 'Akademik/Asrama' },
                                    { id: 'alamat', label: 'Alamat' },
                                    { id: 'fisik', label: 'Fisik/ABK' },
                                ].map(cat => (
                                    <button
                                        key={cat.id}
                                        type="button"
                                        onClick={() => setRombelColCategory(cat.id as any)}
                                        className={`px-2 py-0.5 rounded-full border transition-colors ${
                                            rombelColCategory === cat.id
                                                ? 'bg-teal-600 text-white border-teal-600 font-medium'
                                                : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                                        }`}
                                    >
                                        {cat.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="max-h-60 overflow-y-auto border bg-white p-2.5 rounded-lg space-y-1 divide-y divide-gray-100">
                            {daftarRombelColumns
                                .filter(col => {
                                    if (rombelColCategory !== 'all' && col.category !== rombelColCategory) return false;
                                    if (rombelColSearch.trim()) {
                                        const query = rombelColSearch.toLowerCase();
                                        return col.label.toLowerCase().includes(query) || col.id.toLowerCase().includes(query);
                                    }
                                    return true;
                                })
                                .map((col) => {
                                    const isChecked = options.rombelVisibleColumns.includes(col.id);
                                    return (
                                        <label key={col.id} className="flex items-center justify-between p-1.5 text-xs text-gray-700 hover:bg-teal-50 rounded cursor-pointer transition-colors">
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="checkbox"
                                                    checked={isChecked}
                                                    onChange={() => handleRombelColumnToggle(col.id)}
                                                    className="h-4 w-4 text-teal-600 rounded"
                                                />
                                                <span className={isChecked ? "font-medium text-teal-900" : "text-gray-600"}>
                                                    {col.label}
                                                </span>
                                            </div>
                                            <span className="text-[10px] text-gray-400 uppercase font-mono tracking-wider">
                                                {col.category}
                                            </span>
                                        </label>
                                    );
                                })}
                        </div>
                    </div>

                    {/* Pengaturan Tanda Tangan */}
                    <div className="pt-3 border-t space-y-3">
                        <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={options.rombelShowSignatures ?? true}
                                onChange={e => options.setRombelShowSignatures(e.target.checked)}
                                className="h-4 w-4 text-teal-600 rounded"
                            />
                            Tampilkan Kolom Tanda Tangan Resmi
                        </label>

                        {(options.rombelShowSignatures ?? true) && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-6 border-l-2 border-teal-200 bg-gray-50/50 p-2.5 rounded-r-lg">
                                <div>
                                    <label className="block mb-1 text-[11px] font-medium text-gray-600">Jabatan Penandatangan 1</label>
                                    <input
                                        type="text"
                                        value={options.rombelSignatory1Title || 'Wali Kelas'}
                                        onChange={e => options.setRombelSignatory1Title(e.target.value)}
                                        placeholder="Wali Kelas"
                                        className="w-full bg-white border border-gray-300 text-xs rounded p-2 mb-1.5"
                                    />
                                    <select
                                        value={options.rombelSignatory1Id || ''}
                                        onChange={e => options.setRombelSignatory1Id(e.target.value)}
                                        className="w-full bg-white border border-gray-300 text-xs rounded p-2"
                                    >
                                        <option value="">-- Otomatis Wali Kelas Terkait --</option>
                                        {settings.tenagaPengajar.map(tp => (
                                            <option key={tp.id} value={tp.id}>{tp.nama}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block mb-1 text-[11px] font-medium text-gray-600">Jabatan Penandatangan 2</label>
                                    <input
                                        type="text"
                                        value={options.rombelSignatory2Title || 'Kepala Madrasah / Mudir'}
                                        onChange={e => options.setRombelSignatory2Title(e.target.value)}
                                        placeholder="Kepala Madrasah"
                                        className="w-full bg-white border border-gray-300 text-xs rounded p-2 mb-1.5"
                                    />
                                    <select
                                        value={options.rombelSignatory2Id || ''}
                                        onChange={e => options.setRombelSignatory2Id(e.target.value)}
                                        className="w-full bg-white border border-gray-300 text-xs rounded p-2"
                                    >
                                        <option value="">-- Mudir / Pimpinan Utama --</option>
                                        {settings.tenagaPengajar.map(tp => (
                                            <option key={tp.id} value={tp.id}>{tp.nama}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            );
        case ReportType.LembarKedatangan:
            return (
                <div className="pt-4 border-t space-y-4">
                    <h3 className="text-md font-semibold text-gray-700">Opsi Lembar Kedatangan</h3>
                    <div>
                        <label htmlFor="agenda-kedatangan" className="block mb-1 text-sm font-medium text-gray-700">Keterangan Agenda</label>
                        <input type="text" id="agenda-kedatangan" value={options.agendaKedatangan} onChange={e => options.setAgendaKedatangan(e.target.value)} className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg w-full p-2.5" placeholder="Contoh: Libur Idul Fitri 1446 H" />
                    </div>
                    <div>
                        <label htmlFor="semester-kedatangan" className="block mb-1 text-sm font-medium text-gray-700">Semester</label>
                        <select id="semester-kedatangan" value={options.semester} onChange={e => options.setSemester(e.target.value as any)} className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg w-full p-2.5">
                            <option value="Ganjil">Ganjil</option>
                            <option value="Genap">Genap</option>
                        </select>
                    </div>
                    <div>
                        <label htmlFor="tahun-ajaran-kedatangan" className="block mb-1 text-sm font-medium text-gray-700">Tahun Ajaran</label>
                        <AcademicYearSelect id="tahun-ajaran-kedatangan" />
                    </div>
                </div>
            );
        case ReportType.JurnalMengajar:
            return (
                <div className="pt-4 border-t space-y-4">
                    <div className="rounded-lg border bg-white p-4">
                        <h4 className="text-sm font-semibold text-gray-700 mb-2">1. Pengaturan Filter Laporan</h4>
                        <div className="space-y-3">
                            <div>
                                <label className="block mb-1 text-sm font-medium text-gray-700">Filter Mata Pelajaran</label>
                                <select
                                    value={options.jurnalMapelFilter || ''}
                                    onChange={e => options.setJurnalMapelFilter(e.target.value ? Number(e.target.value) : null)}
                                    className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg w-full p-2.5"
                                >
                                    <option value="">Semua Mata Pelajaran</option>
                                    {settings.mataPelajaran.map(mapel => (
                                        <option key={mapel.id} value={mapel.id}>{mapel.nama}</option>
                                    ))}
                                </select>
                                {options.jurnalMapelFilter && (
                                    <p className="text-xs text-teal-600 mt-1">
                                        ✓ Menampilkan laporan hanya untuk: {settings.mataPelajaran.find(m => m.id === options.jurnalMapelFilter)?.nama}
                                    </p>
                                )}
                            </div>
                            <div>
                                <label className="block mb-1 text-sm font-medium text-gray-700">Tanggal Mulai</label>
                                <input
                                    type="date"
                                    value={options.jurnalTanggalFilter}
                                    onChange={e => options.setJurnalTanggalFilter(e.target.value)}
                                    className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg w-full p-2.5"
                                />
                            </div>
                            <div>
                                <label className="block mb-1 text-sm font-medium text-gray-700">Tanggal Selesai</label>
                                <input
                                    type="date"
                                    value={options.jurnalEndDate}
                                    onChange={e => options.setJurnalEndDate(e.target.value)}
                                    className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg w-full p-2.5"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="rounded-lg border bg-white p-4">
                        <h4 className="text-sm font-semibold text-gray-700 mb-2">2. Periode Akademik</h4>
                        <div className="space-y-3">
                            <div>
                                <label className="block mb-1 text-sm font-medium text-gray-700">Semester</label>
                                <select value={options.semester} onChange={e => options.setSemester(e.target.value as any)} className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg w-full p-2.5">
                                    <option value="Ganjil">Ganjil</option>
                                    <option value="Genap">Genap</option>
                                </select>
                            </div>
                            <div>
                                <label className="block mb-1 text-sm font-medium text-gray-700">Tahun Ajaran</label>
                                <AcademicYearSelect />
                            </div>
                        </div>
                    </div>
                </div>
            );
        case ReportType.RekapKesehatan:
        case ReportType.RekapKonseling:
            const isHealth = activeReport === ReportType.RekapKesehatan;
            return (
                <div className="pt-4 border-t space-y-4">
                    <h3 className="text-md font-semibold text-gray-700">Filter {isHealth ? 'Rekap Kesehatan' : 'Rekap Konseling'}</h3>
                    <div className="grid grid-cols-1 gap-4">
                        <div>
                            <label className="block mb-1 text-sm font-medium text-gray-700">Dari Tanggal</label>
                            <input 
                                type="date" 
                                value={isHealth ? options.kesehatanStartDate : options.bkStartDate} 
                                onChange={e => isHealth ? options.setKesehatanStartDate(e.target.value) : options.setBkStartDate(e.target.value)} 
                                className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg w-full p-2.5" 
                            />
                        </div>
                        <div>
                            <label className="block mb-1 text-sm font-medium text-gray-700">Sampai Tanggal</label>
                            <input 
                                type="date" 
                                value={isHealth ? options.kesehatanEndDate : options.bkEndDate} 
                                onChange={e => isHealth ? options.setKesehatanEndDate(e.target.value) : options.setBkEndDate(e.target.value)} 
                                className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg w-full p-2.5" 
                            />
                        </div>
                    </div>
                </div>
            );
        case ReportType.LembarRapor:
        case ReportType.RaporLengkap:
             return (
                <div className="pt-4 border-t">
                    <h3 className="text-md font-semibold text-gray-700">Opsi {activeReport === ReportType.LembarRapor ? 'Lembar Rapor' : 'Rapor Lengkap'}</h3>
                    <div className="grid grid-cols-1 gap-4">
                        <div><label htmlFor="semester" className="block mb-1 text-sm font-medium text-gray-700">Semester</label><select id="semester" value={options.semester} onChange={e => options.setSemester(e.target.value as any)} className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg w-full p-2.5"><option value="Ganjil">Ganjil</option><option value="Genap">Genap</option></select></div>
                        <div><label htmlFor="tahun-ajaran" className="block mb-1 text-sm font-medium text-gray-700">Tahun Ajaran</label><AcademicYearSelect id="tahun-ajaran" /></div>
                    </div>
                    {activeReport === ReportType.RaporLengkap && (
                        <p className="mt-3 text-xs text-gray-500 italic">
                            *Pastikan data nilai sudah diimpor di menu Akademik untuk periode yang dipilih.
                        </p>
                    )}
                </div>
            );
        case ReportType.BukuIndukSantri:
            return (
                <div className="pt-4 border-t space-y-4">
                    <div className="p-3.5 bg-indigo-50/60 border border-indigo-200 rounded-xl flex items-start gap-3">
                        <i className="bi bi-info-circle-fill text-indigo-600 text-lg mt-0.5"></i>
                        <div className="text-xs text-indigo-900 leading-relaxed">
                            <strong className="block font-semibold mb-0.5">Lembar Buku Induk Santri Resmi (2 Halaman per Santri):</strong>
                            Dokumen arsip permanen kesiswaan standar EMIS 4.0 / Ditpdpontren Kemenag. Terdiri dari Lembar A (Biodata Siswa & Riwayat Pendidikan Sebelumnya) dan Lembar B (Riwayat Lengkap Orang Tua, Wali, serta Riwayat Mutasi/Kelulusan).
                        </div>
                    </div>

                    <SantriSelector
                        title="Pilih Santri Buku Induk"
                        printMode={options.bukuIndukPrintMode}
                        setPrintMode={options.setBukuIndukPrintMode}
                        selectedIds={options.selectedBukuIndukSantriIds}
                        setSelectedIds={options.setSelectedBukuIndukSantriIds}
                        radioGroupName="bukuInduk"
                        filteredSantri={filteredSantri}
                    />

                    <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-4">
                        <h4 className="text-sm font-semibold text-gray-800">Opsi Pengesahan Lembar Induk</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block mb-1 text-sm font-medium text-gray-700">Jabatan Pengesah</label>
                                <input
                                    type="text"
                                    value={options.bukuIndukSignatoryTitle}
                                    onChange={e => options.setBukuIndukSignatoryTitle(e.target.value)}
                                    className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg w-full p-2.5"
                                    placeholder="Contoh: Kepala Madrasah / Staf Tata Usaha"
                                />
                            </div>
                            <div>
                                <label className="block mb-1 text-sm font-medium text-gray-700">Nama Pengesah</label>
                                <select
                                    value={options.bukuIndukSignatoryId}
                                    onChange={e => options.setBukuIndukSignatoryId(e.target.value)}
                                    className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg w-full p-2.5"
                                >
                                    <option value="">-- Pilih Penanda Tangan --</option>
                                    {settings.tenagaPengajar.map(p => (
                                        <option key={p.id} value={p.id.toString()}>{p.nama} {p.nip ? `(${p.nip})` : ''}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>
                </div>
            );
        case ReportType.MatriksTunggakanSPP:
            return (
                <div className="pt-4 border-t space-y-4">
                    <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl flex items-start gap-3">
                        <i className="bi bi-grid-3x3-gap-fill text-emerald-700 text-lg mt-0.5"></i>
                        <div className="text-xs text-emerald-950 leading-relaxed">
                            <strong className="block font-semibold mb-0.5">Matriks 12 Bulan Pembayaran SPP Rombel:</strong>
                            Menampilkan grid status pembayaran 12 bulan (Juli s.d. Juni) santri per rombel secara horizontal (Landscape), total tagihan, nominal terbayar, sisa tunggakan, dan persentase ketercapaian pembayaran.
                        </div>
                    </div>

                    <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-4">
                        <h4 className="text-sm font-semibold text-gray-800">1. Filter Periode Pembayaran</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block mb-1 text-sm font-medium text-gray-700">Tahun Ajaran</label>
                                <AcademicYearSelect
                                    value={options.matriksTahunAjaran || options.tahunAjaran}
                                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                                        if (options.setMatriksTahunAjaran) options.setMatriksTahunAjaran(e.target.value);
                                        options.setTahunAjaran(e.target.value);
                                    }}
                                />
                            </div>
                        </div>

                        <h4 className="text-sm font-semibold text-gray-800 pt-3 border-t">2. Tanda Tangan Pengesahan</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="block text-xs font-semibold text-gray-600">Pihak 1 (Wali Kelas / Asatidz)</label>
                                <input
                                    type="text"
                                    value={options.matriksSignatory1Title}
                                    onChange={e => options.setMatriksSignatory1Title(e.target.value)}
                                    placeholder="Wali Kelas"
                                    className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg w-full p-2.5"
                                />
                                <select
                                    value={options.matriksSignatory1Id}
                                    onChange={e => options.setMatriksSignatory1Id(e.target.value)}
                                    className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg w-full p-2.5"
                                >
                                    <option value="">-- Pilih Wali Kelas / Asatidz --</option>
                                    {settings.tenagaPengajar.map(p => (
                                        <option key={p.id} value={p.id.toString()}>{p.nama}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="block text-xs font-semibold text-gray-600">Pihak 2 (Bendahara / Mudir)</label>
                                <input
                                    type="text"
                                    value={options.matriksSignatory2Title}
                                    onChange={e => options.setMatriksSignatory2Title(e.target.value)}
                                    placeholder="Bendahara Pesantren"
                                    className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg w-full p-2.5"
                                />
                                <select
                                    value={options.matriksSignatory2Id}
                                    onChange={e => options.setMatriksSignatory2Id(e.target.value)}
                                    className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg w-full p-2.5"
                                >
                                    <option value="">-- Pilih Bendahara / Mudir --</option>
                                    {settings.tenagaPengajar.map(p => (
                                        <option key={p.id} value={p.id.toString()}>{p.nama}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>
                </div>
            );
        default:
            return null;
    }
};
