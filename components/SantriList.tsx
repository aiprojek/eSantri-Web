import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Santri, RiwayatStatus } from '../types';
import { useAppContext } from '../AppContext';
import { useSantriFilter } from '../hooks/useSantriFilter';
import { useDebounce } from '../hooks/useDebounce';
import { SantriModal } from './santri/SantriModal';
import { Pagination } from './common/Pagination';
import { BulkStatusModal } from './santri/modals/BulkStatusModal';
import { BulkMoveModal } from './santri/modals/BulkMoveModal';
// Import new service functions
import { generateSantriCsvForUpdate, generateSantriCsvTemplate, parseSantriCsv, ParsedCsvResult } from '../services/csvService';

interface SantriListProps {
  initialFilters?: any;
}

type ImportMode = 'update' | 'add';
// The interface is now imported from the service
type ImportPreview = ParsedCsvResult;


const SantriList: React.FC<SantriListProps> = ({ initialFilters = {} }) => {
  const { 
    santriList, 
    settings, 
    onAddSantri,
    onBulkAddSantri,
    onUpdateSantri, 
    onDeleteSantri, 
    onBulkUpdateSantri,
    showConfirmation,
    showToast,
    showAlert,
    santriFilters,
    setSantriFilters,
  } = useAppContext();
  
  const { filters, handleFilterChange, filteredSantri, getAvailableOptions } = useSantriFilter(santriList, santriFilters, setSantriFilters);
  const { availableKelas, availableRombel } = getAvailableOptions(settings);
  
  const [searchTerm, setSearchTerm] = useState(filters.search);
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const [isModalOpen, setModalOpen] = useState(false);
  const [selectedSantri, setSelectedSantri] = useState<Santri | null>(null);
  
  const [isImportModalOpen, setImportModalOpen] = useState(false);
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isExportMenuOpen, setExportMenuOpen] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);


  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  
  // State for Bulk Actions
  const [selectedSantriIds, setSelectedSantriIds] = useState<number[]>([]);
  const [isBulkStatusModalOpen, setBulkStatusModalOpen] = useState(false);
  const [isBulkMoveModalOpen, setBulkMoveModalOpen] = useState(false);
  const selectAllCheckboxRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    handleFilterChange('search', debouncedSearchTerm);
  }, [debouncedSearchTerm]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filters, itemsPerPage]);

  useEffect(() => {
    setSelectedSantriIds([]);
  }, [filters]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
            setExportMenuOpen(false);
        }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
        document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [exportMenuRef]);


  const getDetailName = (type: 'jenjang' | 'kelas' | 'rombel', id: number): string => {
    const item = settings[type].find(i => i.id === id);
    return item ? item.nama : 'N/A';
  }
  
  const paginatedSantri = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredSantri.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredSantri, currentPage, itemsPerPage]);
  
  const totalPages = Math.ceil(filteredSantri.length / itemsPerPage);
  
  const startItem = filteredSantri.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0;
  const endItem = Math.min(currentPage * itemsPerPage, filteredSantri.length);

    // --- Bulk Action Logic ---
    const paginatedIds = useMemo(() => paginatedSantri.map(s => s.id), [paginatedSantri]);
    const allOnPageSelected = paginatedIds.length > 0 && paginatedIds.every(id => selectedSantriIds.includes(id));

    useEffect(() => {
        if (selectAllCheckboxRef.current) {
            const someOnPageSelected = paginatedIds.some(id => selectedSantriIds.includes(id));
            selectAllCheckboxRef.current.checked = allOnPageSelected;
            selectAllCheckboxRef.current.indeterminate = someOnPageSelected && !allOnPageSelected;
        }
    }, [selectedSantriIds, paginatedIds, allOnPageSelected]);

    const handleSelectOne = (id: number) => {
        setSelectedSantriIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleSelectAllOnPage = () => {
        if (allOnPageSelected) {
            setSelectedSantriIds(prev => prev.filter(id => !paginatedIds.includes(id)));
        } else {
            setSelectedSantriIds(prev => [...new Set([...prev, ...paginatedIds])]);
        }
    };

    const handleBulkUpdate = async (updatedFields: Partial<Santri>) => {
        const santriToUpdate = santriList
            .filter(s => selectedSantriIds.includes(s.id))
            .map(s => ({ ...s, ...updatedFields }));
        
        try {
            await onBulkUpdateSantri(santriToUpdate);
            showToast(`${santriToUpdate.length} data santri berhasil diperbarui.`, 'success');
            setSelectedSantriIds([]);
        } catch (error) {
            showToast('Gagal memperbarui data santri secara massal.', 'error');
        }
    };
    
    const handleBulkStatusSave = (newStatus: Santri['status'], newStatusDate?: string) => {
        const updatedFields: Partial<Santri> = {
            status: newStatus,
            tanggalStatus: newStatusDate,
        };
        showConfirmation(
            'Ubah Status Massal',
            `Anda akan mengubah status ${selectedSantriIds.length} santri menjadi "${newStatus}". Lanjutkan?`,
            () => handleBulkUpdate(updatedFields),
            { confirmText: 'Ya, Ubah Status', confirmColor: 'green' }
        );
        setBulkStatusModalOpen(false);
    };
    
    const handleBulkMoveSave = (jenjangId: number, kelasId: number, rombelId: number) => {
        const updatedFields: Partial<Santri> = {
            jenjangId,
            kelasId,
            rombelId,
        };
        showConfirmation(
            'Pindahkan Rombel Massal',
            `Anda akan memindahkan ${selectedSantriIds.length} santri ke rombel "${getDetailName('rombel', rombelId)}". Lanjutkan?`,
            () => handleBulkUpdate(updatedFields),
            { confirmText: 'Ya, Pindahkan', confirmColor: 'green' }
        );
        setBulkMoveModalOpen(false);
    };


  const openModal = (santri: Santri | null = null) => {
    if (santri) {
      setSelectedSantri(santri);
    } else {
        const defaultJenjangId = settings.jenjang[0]?.id || 0;
        const defaultKelas = settings.kelas.find(k => k.jenjangId === defaultJenjangId);
        const defaultRombel = defaultKelas ? settings.rombel.find(r => r.kelasId === defaultKelas.id) : undefined;
        
        setSelectedSantri({
            id: 0,
            nis: '',
            namaLengkap: '',
            jenisKelamin: 'Laki-laki',
            tempatLahir: '',
            tanggalLahir: '',
            tanggalMasuk: new Date().toISOString().split('T')[0],
            alamat: { detail: '' },
            namaAyah: '',
            namaIbu: '',
            teleponWali: '',
            jenjangId: defaultJenjangId,
            kelasId: defaultKelas?.id || 0,
            rombelId: defaultRombel?.id || 0,
            status: 'Aktif',
            prestasi: [],
            pelanggaran: [],
            hobi: [],
            riwayatStatus: [],
      });
    }
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setSelectedSantri(null);
  };
  
  const handleSave = async (data: Santri) => {
    if (!data) return;
    try {
      if (data.id > 0) {
        await onUpdateSantri(data);
      } else {
        // Automatically add "Masuk" status history for new santri
        const firstRiwayat: RiwayatStatus = {
            id: Date.now(),
            status: 'Masuk',
            tanggal: data.tanggalMasuk,
            keterangan: 'Santri baru diterima.'
        };
        const updatedData = { ...data, riwayatStatus: [firstRiwayat] };
        const { id, ...newSantriData } = updatedData;
        await onAddSantri(newSantriData);
      }
      closeModal();
      showToast(data.id > 0 ? 'Data santri berhasil diperbarui.' : 'Santri baru berhasil ditambahkan.', 'success');
    } catch (error) {
      console.error("Failed to save santri:", error);
      showToast('Gagal menyimpan data santri.', 'error');
    }
  };

  const handleDelete = (id: number) => {
    const santri = santriList.find(s => s.id === id);
    showConfirmation(
        `Hapus Santri`,
        `Apakah Anda yakin ingin menghapus data santri ${santri?.namaLengkap}? Tindakan ini tidak dapat dibatalkan.`,
        async () => {
          try {
            await onDeleteSantri(id);
            showToast('Data santri berhasil dihapus.', 'success');
          } catch(error) {
            showToast('Gagal menghapus data santri.', 'error');
          }
        },
        { confirmText: 'Ya, Hapus', confirmColor: 'red' }
    );
  };

  // --- Refactored Export/Import Logic ---

  const downloadCsv = (csvContent: string, fileName: string) => {
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportForUpdate = () => {
    const csvContent = generateSantriCsvForUpdate(filteredSantri);
    downloadCsv(csvContent, `data_santri_update_${new Date().toISOString().slice(0, 10)}.csv`);
  };

  const handleExportTemplate = () => {
    const csvContent = generateSantriCsvTemplate();
    downloadCsv(csvContent, `template_tambah_santri.csv`);
  };

  const handleImportFile = (event: React.ChangeEvent<HTMLInputElement>, mode: ImportMode) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const text = e.target?.result as string;
            const preview = parseSantriCsv(text, mode, santriList);
            setImportPreview(preview);
        } catch (error) {
            showAlert(`Gagal Memproses File`, `Terjadi kesalahan saat membaca file CSV: ${(error as Error).message}`);
        } finally {
            if (fileInputRef.current) { fileInputRef.current.value = ''; }
            setImportModalOpen(false);
        }
    };
    reader.readAsText(file);
  };

  const confirmImport = async () => {
    if (!importPreview) return;
    setIsImporting(true);
    try {
        if (importPreview.mode === 'update') {
            await onBulkUpdateSantri(importPreview.toUpdate);
            showToast(`${importPreview.toUpdate.length} data santri berhasil diperbarui.`, 'success');
        } else {
            await onBulkAddSantri(importPreview.toAdd);
            showToast(`${importPreview.toAdd.length} santri baru berhasil ditambahkan.`, 'success');
        }
    } catch (error) {
        showToast('Terjadi kesalahan saat menyimpan data.', 'error');
    } finally {
        setIsImporting(false);
        setImportPreview(null);
    }
  };
  
  // --- End Refactored Logic ---
  
  const ImportModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-[60] flex justify-center items-center p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
            <div className="p-5 border-b flex justify-between items-center"><h3 className="text-lg font-semibold text-gray-800">Impor Data Massal</h3><button onClick={() => setImportModalOpen(false)} className="text-gray-400 hover:text-gray-600" aria-label="Tutup"><i className="bi bi-x-lg"></i></button></div>
            <div className="p-6 space-y-4">
                <input type="file" accept=".csv" ref={fileInputRef} id="import-update-input" className="hidden" onChange={(e) => handleImportFile(e, 'update')} />
                <input type="file" accept=".csv" ref={fileInputRef} id="import-add-input" className="hidden" onChange={(e) => handleImportFile(e, 'add')} />
                <label htmlFor="import-update-input" className="w-full cursor-pointer p-4 border rounded-lg flex items-start gap-4 hover:bg-gray-50 hover:border-teal-400 transition-colors">
                    <i className="bi bi-arrow-repeat text-2xl text-teal-600 mt-1"></i>
                    <div><h4 className="font-semibold text-gray-800">Perbarui Data yang Ada</h4><p className="text-sm text-gray-600">Pilih mode ini jika file CSV Anda berisi santri yang sudah ada di database dan memiliki kolom 'id'.</p></div>
                </label>
                <label htmlFor="import-add-input" className="w-full cursor-pointer p-4 border rounded-lg flex items-start gap-4 hover:bg-gray-50 hover:border-green-400 transition-colors">
                     <i className="bi bi-person-plus-fill text-2xl text-green-600 mt-1"></i>
                    <div><h4 className="font-semibold text-gray-800">Tambah sebagai Data Baru</h4><p className="text-sm text-gray-600">Pilih mode ini untuk menambahkan semua baris di file CSV sebagai santri baru. Kolom 'id' akan diabaikan.</p></div>
                </label>
            </div>
        </div>
    </div>
  );
  
  const ImportPreviewModal = () => {
    if (!importPreview) return null;
    const { mode, toAdd, toUpdate, errors } = importPreview;
    const successCount = mode === 'add' ? toAdd.length : toUpdate.length;
    const errorCount = errors.length;
    const totalCount = successCount + errorCount;
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-[70] flex justify-center items-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
                <div className="p-5 border-b"><h3 className="text-lg font-semibold text-gray-800">Pratinjau Impor Data</h3></div>
                <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                    <p className="text-sm text-gray-700">Sistem telah memproses file Anda. Berikut adalah ringkasannya:</p>
                    <div className="p-3 bg-gray-50 rounded-lg border">
                        <p>Total Baris Data Diproses: <strong className="font-semibold">{totalCount}</strong></p>
                        {successCount > 0 && mode === 'add' && <p className="text-green-700">Santri Baru akan Ditambahkan: <strong className="font-semibold">{successCount}</strong></p>}
                        {successCount > 0 && mode === 'update' && <p className="text-teal-700">Data Santri akan Diperbarui: <strong className="font-semibold">{successCount}</strong></p>}
                        {errorCount > 0 && <p className="text-red-700">Baris dengan Error (Akan Dilewati): <strong className="font-semibold">{errorCount}</strong></p>}
                    </div>
                    {errorCount > 0 && (
                        <div>
                            <h4 className="text-sm font-semibold text-gray-800 mb-1">Detail Error:</h4>
                            <ul className="text-xs text-red-600 bg-red-50 p-2 rounded-md border border-red-200 list-disc list-inside max-h-32 overflow-y-auto">
                                {errors.slice(0, 10).map((err, i) => <li key={i}>{err}</li>)}
                                {errors.length > 10 && <li>Dan {errors.length - 10} error lainnya...</li>}
                            </ul>
                        </div>
                    )}
                    <div className="p-3 rounded-md border-l-4 border-yellow-500 bg-yellow-50 text-yellow-800 text-sm">
                        <strong className="font-bold">Konfirmasi:</strong> Apakah Anda yakin ingin melanjutkan? Data yang berhasil diproses akan disimpan ke database.
                    </div>
                </div>
                <div className="p-4 border-t flex justify-end space-x-2">
                    <button onClick={() => setImportPreview(null)} type="button" className="text-gray-500 bg-white hover:bg-gray-100 rounded-lg border border-gray-200 text-sm font-medium px-5 py-2.5">Batal</button>
                    <button onClick={confirmImport} disabled={isImporting} className="text-white bg-green-600 hover:bg-green-700 font-medium rounded-lg text-sm px-5 py-2.5 flex items-center justify-center min-w-[120px] disabled:bg-green-300">
                        {isImporting ? 'Menyimpan...' : 'Ya, Lanjutkan'}
                    </button>
                </div>
            </div>
        </div>
    );
  };
  
  if (santriList.length === 0) {
    return (
      <div>
        <h1 className="text-3xl font-bold text-gray-800 mb-6">Database Santri</h1>
        <div className="bg-white p-6 rounded-lg shadow-md text-center py-20">
          <i className="bi bi-people text-6xl text-gray-300"></i>
          <h2 className="mt-4 text-2xl font-bold text-gray-700">Database Santri Masih Kosong</h2>
          <p className="mt-2 text-gray-500">Mulai dengan menambahkan data santri baru atau impor data dari file CSV.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <button 
              onClick={() => openModal()} 
              className="flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
            >
              <i className="bi bi-person-plus-fill"></i>
              Tambah Santri Baru
            </button>
            <button
              onClick={() => setImportModalOpen(true)}
              className="flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            >
              <i className="bi bi-box-arrow-in-down"></i>
              Impor dari CSV
            </button>
            <button
              onClick={handleExportTemplate}
              className="flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            >
              <i className="bi bi-file-earmark-arrow-down"></i>
              Unduh Template
            </button>
          </div>
        </div>
        {isModalOpen && (
          <SantriModal
            isOpen={isModalOpen}
            onClose={closeModal}
            onSave={handleSave}
            santriData={selectedSantri}
          />
        )}
        {isImportModalOpen && <ImportModal />}
        {importPreview && <ImportPreviewModal />}
      </div>
    );
  }

  return (
    <div>
        <h1 className="text-3xl font-bold text-gray-800 mb-6">Database Santri</h1>

        <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-4">
                <div className="lg:col-span-3 xl:col-span-4">
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                            <i className="bi bi-search text-gray-400"></i>
                        </div>
                        <input
                            type="text"
                            placeholder="Cari berdasarkan Nama, NIS, atau NIK..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-teal-500 focus:border-teal-500 block w-full pl-10 p-2.5"
                        />
                    </div>
                </div>
                <select value={filters.jenjang} onChange={(e) => handleFilterChange('jenjang', e.target.value)} className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-teal-500 focus:border-teal-500 block w-full p-2.5">
                    <option value="">Semua Jenjang</option>
                    {settings.jenjang.map(j => <option key={j.id} value={j.id}>{j.nama}</option>)}
                </select>
                <select value={filters.kelas} onChange={(e) => handleFilterChange('kelas', e.target.value)} disabled={!filters.jenjang} className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-teal-500 focus:border-teal-500 block w-full p-2.5 disabled:bg-gray-200">
                    <option value="">Semua Kelas</option>
                    {availableKelas.map(k => <option key={k.id} value={k.id}>{k.nama}</option>)}
                </select>
                <select value={filters.rombel} onChange={(e) => handleFilterChange('rombel', e.target.value)} disabled={!filters.kelas} className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-teal-500 focus:border-teal-500 block w-full p-2.5 disabled:bg-gray-200">
                    <option value="">Semua Rombel</option>
                     {availableRombel.map(r => <option key={r.id} value={r.id}>{r.nama}</option>)}
                </select>
                <select value={filters.status} onChange={(e) => handleFilterChange('status', e.target.value)} className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-teal-500 focus:border-teal-500 block w-full p-2.5">
                    <option value="">Semua Status</option>
                    <option value="Aktif">Aktif</option>
                    <option value="Hiatus">Hiatus</option>
                    <option value="Lulus">Lulus</option>
                    <option value="Keluar/Pindah">Keluar/Pindah</option>
                </select>
                <select value={filters.gender} onChange={(e) => handleFilterChange('gender', e.target.value)} className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-teal-500 focus:border-teal-500 block w-full p-2.5">
                    <option value="">Semua Gender</option>
                    <option value="Laki-laki">Laki-laki</option>
                    <option value="Perempuan">Perempuan</option>
                </select>
                 <input type="text" placeholder="Filter Provinsi..." value={filters.provinsi} onChange={(e) => handleFilterChange('provinsi', e.target.value)} className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-teal-500 focus:border-teal-500 block w-full p-2.5" />
                 <input type="text" placeholder="Filter Kabupaten/Kota..." value={filters.kabupatenKota} onChange={(e) => handleFilterChange('kabupatenKota', e.target.value)} className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-teal-500 focus:border-teal-500 block w-full p-2.5" />
                 <input type="text" placeholder="Filter Kecamatan..." value={filters.kecamatan} onChange={(e) => handleFilterChange('kecamatan', e.target.value)} className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-teal-500 focus:border-teal-500 block w-full p-2.5" />
            </div>

            <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-4">
               {selectedSantriIds.length > 0 ? (
                    <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-3 p-2 rounded-lg bg-teal-50 border border-teal-200">
                        <div className="text-sm font-semibold text-teal-800">
                            {selectedSantriIds.length} santri dipilih. 
                             <button onClick={() => setSelectedSantriIds([])} className="ml-2 text-red-600 hover:underline font-medium">Batalkan</button>
                        </div>
                        <div className="flex items-center gap-2">
                             <button onClick={() => setBulkMoveModalOpen(true)} className="flex items-center justify-center gap-2 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white rounded-md hover:bg-gray-100 border border-gray-300">
                                <i className="bi bi-arrows-move"></i> Pindahkan Rombel
                            </button>
                            <button onClick={() => setBulkStatusModalOpen(true)} className="flex items-center justify-center gap-2 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white rounded-md hover:bg-gray-100 border border-gray-300">
                                <i className="bi bi-tag-fill"></i> Ubah Status
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="flex-wrap w-full md:w-auto flex items-center justify-center md:justify-start gap-x-4 gap-y-2 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                            <label htmlFor="items-per-page-select" className="sr-only">Items per page</label>
                            <select
                                id="items-per-page-select"
                                value={itemsPerPage}
                                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                                className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-teal-500 focus:border-teal-500 p-1.5"
                            >
                                <option value={10}>10 per halaman</option>
                                <option value={25}>25 per halaman</option>
                                <option value={50}>50 per halaman</option>
                                <option value={100}>100 per halaman</option>
                            </select>
                        </div>
                        <div className="text-gray-500 text-center">
                            <span className="font-semibold text-gray-800">{filteredSantri.length}</span> hasil ditemukan
                            <span className="hidden lg:inline"> (dari total <span className="font-semibold text-gray-800">{santriList.length}</span> santri)</span>
                        </div>
                    </div>
                )}

                <div className="w-full md:w-auto">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        <button onClick={() => setImportModalOpen(true)} disabled={isImporting} className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:bg-gray-300 disabled:cursor-not-allowed">
                            {isImporting ? (
                                <>
                                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    <span>Memproses...</span>
                                </>
                            ) : (
                                <>
                                    <i className="bi bi-box-arrow-in-down"></i>
                                    Impor
                                </>
                            )}
                        </button>
                        <div className="relative">
                            <button
                                onClick={() => setExportMenuOpen(prev => !prev)}
                                className="w-full h-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                            >
                                <i className="bi bi-box-arrow-up"></i>
                                Ekspor
                                <i className={`bi bi-chevron-down transition-transform duration-200 ${isExportMenuOpen ? 'rotate-180' : ''}`}></i>
                            </button>
                            {isExportMenuOpen && (
                                <div ref={exportMenuRef} className="absolute right-0 mt-2 w-64 origin-top-right bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-50">
                                    <div className="py-1">
                                        <button 
                                            onClick={(e) => { e.preventDefault(); handleExportForUpdate(); setExportMenuOpen(false); }} 
                                            className="w-full text-left block px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                                        >
                                            <div className="font-medium text-gray-800">Ekspor Data (untuk Update)</div>
                                            <p className="text-xs text-gray-500 mt-1">Unduh data yang ditampilkan saat ini (sesuai filter). File ini berisi ID untuk memperbarui data yang sudah ada.</p>
                                        </button>
                                        <button 
                                            onClick={(e) => { e.preventDefault(); handleExportTemplate(); setExportMenuOpen(false); }} 
                                            className="w-full text-left block px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                                        >
                                            <div className="font-medium text-gray-800">Unduh Template (untuk Tambah)</div>
                                            <p className="text-xs text-gray-500 mt-1">Unduh file CSV kosong dengan header yang benar untuk menambahkan santri baru.</p>
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                        <button onClick={() => openModal()} className="col-span-2 md:col-span-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500">
                            <i className="bi bi-person-plus-fill"></i>
                            Tambah Santri
                        </button>
                    </div>
                </div>
            </div>

            <div className="overflow-x-auto border rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="sticky top-0 bg-gray-50 z-30">
                        <tr>
                            <th scope="col" className="p-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                               <input 
                                    type="checkbox" 
                                    ref={selectAllCheckboxRef}
                                    onChange={handleSelectAllOnPage}
                                    className="h-4 w-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
                                    aria-label="Pilih semua santri di halaman ini"
                                />
                            </th>
                            <th scope="col" className="p-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 top-0 bg-gray-50 z-40">
                                NIS
                            </th>
                            <th scope="col" className="p-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Nama Lengkap
                            </th>
                            <th scope="col" className="p-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Rombel
                            </th>
                            <th scope="col" className="p-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Jenjang
                            </th>
                            <th scope="col" className="p-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Status
                            </th>
                             <th scope="col" className="p-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Tgl. Masuk
                            </th>
                            <th scope="col" className="relative p-3">
                                <span className="sr-only">Aksi</span>
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {paginatedSantri.map(santri => (
                            <tr key={santri.id} className={`group ${selectedSantriIds.includes(santri.id) ? 'bg-teal-50' : 'hover:bg-gray-50'}`}>
                                <td className="p-3">
                                   <input 
                                        type="checkbox" 
                                        checked={selectedSantriIds.includes(santri.id)}
                                        onChange={() => handleSelectOne(santri.id)}
                                        className="h-4 w-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
                                        aria-label={`Pilih ${santri.namaLengkap}`}
                                    />
                                </td>
                                <td className={`p-3 whitespace-nowrap text-sm font-medium text-gray-800 sticky left-0 z-20 ${selectedSantriIds.includes(santri.id) ? 'bg-teal-50' : 'bg-white group-hover:bg-gray-50'}`}>
                                    {santri.nis}
                                </td>
                                <td className="p-3 whitespace-nowrap text-sm text-gray-900">{santri.namaLengkap}</td>
                                <td className="p-3 whitespace-nowrap text-sm text-gray-500">{getDetailName('rombel', santri.rombelId)}</td>
                                <td className="p-3 whitespace-nowrap text-sm text-gray-500">{getDetailName('jenjang', santri.jenjangId)}</td>
                                <td className="p-3 whitespace-nowrap text-sm">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                        santri.status === 'Aktif' ? 'bg-green-100 text-green-800' :
                                        santri.status === 'Hiatus' ? 'bg-yellow-100 text-yellow-800' :
                                        santri.status === 'Lulus' ? 'bg-blue-100 text-blue-800' :
                                        'bg-red-100 text-red-800'
                                    }`}>
                                        {santri.status}
                                    </span>
                                </td>
                                <td className="p-3 whitespace-nowrap text-sm text-gray-500">{new Date(santri.tanggalMasuk).toLocaleDateString('id-ID')}</td>
                                <td className="p-3 whitespace-nowrap text-right text-sm font-medium">
                                    <button onClick={() => openModal(santri)} className="text-blue-600 hover:text-blue-900 mr-4" aria-label={`Edit data ${santri.namaLengkap}`}><i className="bi bi-pencil-square"></i></button>
                                    <button onClick={() => handleDelete(santri.id)} className="text-red-600 hover:text-red-900" aria-label={`Hapus data ${santri.namaLengkap}`}><i className="bi bi-trash-fill"></i></button>
                                </td>
                            </tr>
                        ))}
                         {filteredSantri.length === 0 && (
                            <tr>
                                <td colSpan={8} className="text-center py-16 text-gray-500">
                                    <i className="bi bi-search text-5xl text-gray-400"></i>
                                    <h3 className="mt-4 text-xl font-semibold text-gray-700">Hasil Tidak Ditemukan</h3>
                                    <p className="mt-1">Tidak ada santri yang cocok dengan kriteria filter Anda.</p>
                                    <button 
                                        onClick={() => {
                                            setSearchTerm('');
                                            setSantriFilters({ search: '', jenjang: '', kelas: '', rombel: '', status: '', gender: '', provinsi: '', kabupatenKota: '', kecamatan: '' });
                                        }} 
                                        className="mt-4 px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
                                    >
                                        Hapus Filter
                                    </button>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            
            <div className="flex flex-col sm:flex-row justify-between items-center mt-4 text-sm text-gray-600">
                <p className="mb-2 sm:mb-0">
                    Menampilkan <span className="font-semibold">{startItem}</span> - <span className="font-semibold">{endItem}</span> dari <span className="font-semibold">{filteredSantri.length}</span> santri
                </p>
                <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                />
            </div>
        </div>

        {isModalOpen && (
            <SantriModal
                isOpen={isModalOpen}
                onClose={closeModal}
                onSave={handleSave}
                santriData={selectedSantri}
            />
        )}
        {isImportModalOpen && <ImportModal />}
        {importPreview && <ImportPreviewModal />}
        {isBulkStatusModalOpen && <BulkStatusModal isOpen={isBulkStatusModalOpen} onClose={() => setBulkStatusModalOpen(false)} onSave={handleBulkStatusSave} selectedCount={selectedSantriIds.length} />}
        {isBulkMoveModalOpen && <BulkMoveModal isOpen={isBulkMoveModalOpen} onClose={() => setBulkMoveModalOpen(false)} onSave={handleBulkMoveSave} selectedCount={selectedSantriIds.length} />}
    </div>
  );
};

export default SantriList;
