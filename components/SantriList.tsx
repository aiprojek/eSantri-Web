
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Santri, RiwayatStatus } from '../types';
import { useAppContext } from '../AppContext';
import { useSantriContext } from '../contexts/SantriContext';
import { useSantriFilter } from '../hooks/useSantriFilter';
import { useDebounce } from '../hooks/useDebounce';
import { SantriModal } from './santri/SantriModal';
import { Pagination } from './common/Pagination';
import { BulkStatusModal } from './santri/modals/BulkStatusModal';
import { BulkMoveModal } from './santri/modals/BulkMoveModal';
import { generateSantriCsvForUpdate, generateSantriCsvTemplate, parseSantriCsv, ParsedCsvResult } from '../services/csvService';
import { BulkSantriEditor } from './santri/modals/BulkSantriEditor';

interface SantriListProps {
  initialFilters?: any;
}

type ImportMode = 'update' | 'add';
type ImportPreview = ParsedCsvResult;

const SantriList: React.FC<SantriListProps> = ({ initialFilters = {} }) => {
  const { settings, showConfirmation, showToast, showAlert, santriFilters, setSantriFilters, currentUser } = useAppContext();
  const { santriList, onAddSantri, onBulkAddSantri, onUpdateSantri, onDeleteSantri, onBulkUpdateSantri } = useSantriContext();
  
  const canWrite = currentUser?.role === 'admin' || currentUser?.permissions?.santri === 'write';

  const { filters, handleFilterChange, filteredSantri, getAvailableOptions } = useSantriFilter(santriList, santriFilters, setSantriFilters);
  const { availableKelas, availableRombel } = getAvailableOptions(settings);
  
  const [searchTerm, setSearchTerm] = useState(filters.search);
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const [isModalOpen, setModalOpen] = useState(false);
  const [selectedSantri, setSelectedSantri] = useState<Santri | null>(null);
  
  const [isImportModalOpen, setImportModalOpen] = useState(false);
  const [isExportModalOpen, setExportModalOpen] = useState(false);
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);
  
  const fileInputUpdateRef = useRef<HTMLInputElement>(null);
  const fileInputAddRef = useRef<HTMLInputElement>(null);

  const [isImporting, setIsImporting] = useState(false);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  
  const [selectedSantriIds, setSelectedSantriIds] = useState<number[]>([]);
  const [isBulkStatusModalOpen, setBulkStatusModalOpen] = useState(false);
  const [isBulkMoveModalOpen, setBulkMoveModalOpen] = useState(false);
  const [isBulkEditorOpen, setBulkEditorOpen] = useState(false);
  const [bulkEditorMode, setBulkEditorMode] = useState<'add' | 'edit'>('add');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const selectAllCheckboxRef = useRef<HTMLInputElement>(null);

  useEffect(() => { handleFilterChange('search', debouncedSearchTerm); }, [debouncedSearchTerm]);
  useEffect(() => { setCurrentPage(1); }, [filters, itemsPerPage]);
  useEffect(() => { setSelectedSantriIds([]); }, [filters]);

  const getDetailName = (type: 'jenjang' | 'kelas' | 'rombel', id: number): string => {
    const item = settings[type].find(i => i.id === id);
    return item ? item.nama : '-';
  }
  
  const paginatedSantri = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredSantri.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredSantri, currentPage, itemsPerPage]);
  
  const totalPages = Math.ceil(filteredSantri.length / itemsPerPage);
  const startItem = filteredSantri.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0;
  const endItem = Math.min(currentPage * itemsPerPage, filteredSantri.length);

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
        setSelectedSantriIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    const handleSelectAllOnPage = () => {
        if (allOnPageSelected) {
            setSelectedSantriIds(prev => prev.filter(id => !paginatedIds.includes(id)));
        } else {
            setSelectedSantriIds(prev => [...new Set([...prev, ...paginatedIds])]);
        }
    };

    const handleBulkUpdate = async (updatedFields: Partial<Santri>) => {
        const santriToUpdate = santriList.filter(s => selectedSantriIds.includes(s.id)).map(s => ({ ...s, ...updatedFields }));
        try {
            await onBulkUpdateSantri(santriToUpdate);
            showToast(`${santriToUpdate.length} data santri berhasil diperbarui.`, 'success');
            setSelectedSantriIds([]);
        } catch (error) {
            showToast('Gagal memperbarui data santri secara massal.', 'error');
        }
    };
    
    const handleBulkStatusSave = (newStatus: Santri['status'], newStatusDate?: string) => {
        const updatedFields: Partial<Santri> = { status: newStatus, tanggalStatus: newStatusDate };
        showConfirmation('Ubah Status Massal', `Anda akan mengubah status ${selectedSantriIds.length} santri menjadi "${newStatus}". Lanjutkan?`, () => handleBulkUpdate(updatedFields), { confirmText: 'Ya, Ubah Status', confirmColor: 'green' });
        setBulkStatusModalOpen(false);
    };
    
    const handleBulkMoveSave = (jenjangId: number, kelasId: number, rombelId: number) => {
        const updatedFields: Partial<Santri> = { jenjangId, kelasId, rombelId };
        showConfirmation('Pindahkan Rombel Massal', `Anda akan memindahkan ${selectedSantriIds.length} santri ke rombel "${getDetailName('rombel', rombelId)}". Lanjutkan?`, () => handleBulkUpdate(updatedFields), { confirmText: 'Ya, Pindahkan', confirmColor: 'green' });
        setBulkMoveModalOpen(false);
    };

  const openModal = (santri: Santri | null = null) => {
    if (!canWrite && santri === null) return;
    if (santri) { setSelectedSantri(santri); } 
    else {
        const defaultJenjangId = settings.jenjang[0]?.id || 0;
        const defaultKelas = settings.kelas.find(k => k.jenjangId === defaultJenjangId);
        const defaultRombel = defaultKelas ? settings.rombel.find(r => r.kelasId === defaultKelas.id) : undefined;
        setSelectedSantri({
            id: 0, nis: '', namaLengkap: '', jenisKelamin: 'Laki-laki', tempatLahir: '', tanggalLahir: '', kewarganegaraan: 'WNI', tanggalMasuk: new Date().toISOString().split('T')[0],
            alamat: { detail: '' }, namaAyah: '', namaIbu: '', teleponWali: '', jenjangId: defaultJenjangId, kelasId: defaultKelas?.id || 0, rombelId: defaultRombel?.id || 0,
            status: 'Aktif', prestasi: [], pelanggaran: [], hobi: [], riwayatStatus: [],
      });
    }
    setModalOpen(true);
  };

  const closeModal = () => { setModalOpen(false); setSelectedSantri(null); };
  
  const handleSave = async (data: Santri) => {
    if (!canWrite) { showToast('Anda tidak memiliki akses.', 'error'); return; }
    if (!data) return;
    try {
      if (data.id > 0) { await onUpdateSantri(data); } else {
        const firstRiwayat: RiwayatStatus = { id: Date.now(), status: 'Masuk', tanggal: data.tanggalMasuk, keterangan: 'Santri baru diterima.' };
        const { id, ...newSantriData } = { ...data, riwayatStatus: [firstRiwayat] };
        await onAddSantri(newSantriData);
      }
      closeModal();
      showToast(data.id > 0 ? 'Data diperbarui.' : 'Santri ditambahkan.', 'success');
    } catch (error) { showToast('Gagal menyimpan data.', 'error'); }
  };

  const handleDelete = (id: number) => {
    if (!canWrite) return;
    const santri = santriList.find(s => s.id === id);
    showConfirmation(`Hapus Santri`, `Hapus ${santri?.namaLengkap}?`, async () => {
          try { await onDeleteSantri(id); showToast('Santri dihapus.', 'success'); } catch(error) { showToast('Gagal menghapus.', 'error'); }
    }, { confirmText: 'Ya, Hapus', confirmColor: 'red' });
  };

  const downloadCsv = (csvContent: string, fileName: string) => {
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", fileName);
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  const handleExportForUpdate = () => {
    const csvContent = generateSantriCsvForUpdate(filteredSantri);
    downloadCsv(csvContent, `data_santri_update_${new Date().toISOString().slice(0, 10)}.csv`);
    setExportModalOpen(false);
  };

  const handleExportTemplate = () => {
    const csvContent = generateSantriCsvTemplate();
    downloadCsv(csvContent, `template_tambah_santri.csv`);
    setExportModalOpen(false);
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
        } catch (error) { showAlert(`Gagal Memproses File`, `Error: ${(error as Error).message}`); } finally { if (fileInputUpdateRef.current) fileInputUpdateRef.current.value = ''; if (fileInputAddRef.current) fileInputAddRef.current.value = ''; setImportModalOpen(false); }
    };
    reader.readAsText(file);
  };

  const confirmImport = async () => {
    if (!importPreview || !canWrite) return;
    setIsImporting(true);
    try {
        if (importPreview.mode === 'update') { await onBulkUpdateSantri(importPreview.toUpdate); showToast(`${importPreview.toUpdate.length} data diperbarui.`, 'success'); } 
        else { await onBulkAddSantri(importPreview.toAdd); showToast(`${importPreview.toAdd.length} data ditambahkan.`, 'success'); }
    } catch (error) { showToast('Gagal menyimpan data.', 'error'); } finally { setIsImporting(false); setImportPreview(null); }
  };
  
  const handleOpenBulkEditorAdd = () => { setBulkEditorMode('add'); setBulkEditorOpen(true); };
  const handleOpenBulkEditorEdit = () => { setBulkEditorMode('edit'); setBulkEditorOpen(true); };

  const handleSaveBulkEditor = async (data: any[]) => {
      if (!canWrite) return;
      try {
          if (bulkEditorMode === 'add') { await onBulkAddSantri(data); showToast(`${data.length} santri ditambahkan.`, 'success'); } 
          else { await onBulkUpdateSantri(data); showToast(`${data.length} data diperbarui.`, 'success'); setSelectedSantriIds([]); }
      } catch (error) { showToast('Gagal menyimpan data massal.', 'error'); }
  };
  
  const ImportModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-[60] flex justify-center items-center p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
            <div className="p-5 border-b flex justify-between items-center"><h3 className="text-lg font-semibold text-gray-800">Impor Data Massal</h3><button onClick={() => setImportModalOpen(false)} className="text-gray-400 hover:text-gray-600" aria-label="Tutup"><i className="bi bi-x-lg"></i></button></div>
            <div className="p-6 space-y-4">
                <input type="file" accept=".csv" ref={fileInputUpdateRef} id="import-update-input" className="hidden" onChange={(e) => handleImportFile(e, 'update')} />
                <input type="file" accept=".csv" ref={fileInputAddRef} id="import-add-input" className="hidden" onChange={(e) => handleImportFile(e, 'add')} />
                <label htmlFor="import-update-input" className="w-full cursor-pointer p-4 border rounded-lg flex items-start gap-4 hover:bg-gray-50 hover:border-teal-400 transition-colors">
                    <i className="bi bi-arrow-repeat text-2xl text-teal-600 mt-1"></i><div><h4 className="font-semibold text-gray-800">Perbarui Data yang Ada</h4><p className="text-sm text-gray-600">Update data santri berdasarkan ID.</p></div>
                </label>
                <label htmlFor="import-add-input" className="w-full cursor-pointer p-4 border rounded-lg flex items-start gap-4 hover:bg-gray-50 hover:border-green-400 transition-colors">
                     <i className="bi bi-person-plus-fill text-2xl text-green-600 mt-1"></i><div><h4 className="font-semibold text-gray-800">Tambah Data Baru</h4><p className="text-sm text-gray-600">Tambah santri baru (ID diabaikan).</p></div>
                </label>
            </div>
        </div>
    </div>
  );

  const ExportModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-[60] flex justify-center items-center p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
            <div className="p-5 border-b flex justify-between items-center"><h3 className="text-lg font-semibold text-gray-800">Ekspor Data</h3><button onClick={() => setExportModalOpen(false)} className="text-gray-400 hover:text-gray-600" aria-label="Tutup"><i className="bi bi-x-lg"></i></button></div>
            <div className="p-6 space-y-4">
                <button onClick={handleExportForUpdate} className="w-full cursor-pointer p-4 border rounded-lg flex items-start gap-4 hover:bg-gray-50 hover:border-blue-400 transition-colors text-left">
                    <i className="bi bi-file-earmark-spreadsheet text-2xl text-blue-600 mt-1"></i><div><h4 className="font-semibold text-gray-800">Ekspor Data Santri (Lengkap)</h4><p className="text-sm text-gray-600">Unduh data saat ini untuk backup atau edit di Excel.</p></div>
                </button>
                <button onClick={handleExportTemplate} className="w-full cursor-pointer p-4 border rounded-lg flex items-start gap-4 hover:bg-gray-50 hover:border-orange-400 transition-colors text-left">
                     <i className="bi bi-file-earmark-plus text-2xl text-orange-600 mt-1"></i><div><h4 className="font-semibold text-gray-800">Unduh Template Kosong</h4><p className="text-sm text-gray-600">Template CSV kosong untuk data baru.</p></div>
                </button>
            </div>
        </div>
    </div>
  );
  
  const ImportPreviewModal = () => {
    if (!importPreview) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-[70] flex justify-center items-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
                <div className="p-5 border-b"><h3 className="text-lg font-semibold text-gray-800">Pratinjau Impor</h3></div>
                <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                    <div className="p-3 bg-gray-50 rounded-lg border">
                        <p>Total Baris: <strong className="font-semibold">{importPreview.mode === 'add' ? importPreview.toAdd.length + importPreview.errors.length : importPreview.toUpdate.length + importPreview.errors.length}</strong></p>
                        {importPreview.mode === 'add' && <p className="text-green-700">Akan Ditambah: <strong className="font-semibold">{importPreview.toAdd.length}</strong></p>}
                        {importPreview.mode === 'update' && <p className="text-teal-700">Akan Diupdate: <strong className="font-semibold">{importPreview.toUpdate.length}</strong></p>}
                        {importPreview.errors.length > 0 && <p className="text-red-700">Error (Dilewati): <strong className="font-semibold">{importPreview.errors.length}</strong></p>}
                    </div>
                    {importPreview.errors.length > 0 && (
                        <ul className="text-xs text-red-600 bg-red-50 p-2 rounded-md border border-red-200 list-disc list-inside max-h-32 overflow-y-auto">
                            {importPreview.errors.slice(0, 10).map((err, i) => <li key={i}>{err}</li>)}
                        </ul>
                    )}
                </div>
                <div className="p-4 border-t flex justify-end space-x-2">
                    <button onClick={() => setImportPreview(null)} className="text-gray-500 bg-white hover:bg-gray-100 rounded-lg border border-gray-200 text-sm px-5 py-2.5">Batal</button>
                    <button onClick={confirmImport} disabled={isImporting} className="text-white bg-green-600 hover:bg-green-700 rounded-lg text-sm px-5 py-2.5 disabled:bg-green-300">{isImporting ? 'Menyimpan...' : 'Lanjutkan'}</button>
                </div>
            </div>
        </div>
    );
  };

  const TableAvatar = ({ name, url }: { name: string, url?: string }) => {
      const hasPhoto = url && !url.includes('text=Foto');
      const initials = name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
      return (
          <div className="flex-shrink-0 w-8 h-8 rounded-full overflow-hidden mr-3 bg-teal-100 flex items-center justify-center text-teal-700 text-xs font-bold border border-teal-200">
              {hasPhoto ? <img src={url} alt={name} className="w-full h-full object-cover" /> : <span>{initials}</span>}
          </div>
      );
  };

  const StatusBadge = ({ status }: { status: Santri['status'] }) => {
      const colors = { 'Aktif': 'bg-green-50 text-green-700 border-green-200', 'Hiatus': 'bg-yellow-50 text-yellow-700 border-yellow-200', 'Lulus': 'bg-blue-50 text-blue-700 border-blue-200', 'Keluar/Pindah': 'bg-red-50 text-red-700 border-red-200', 'Masuk': 'bg-gray-50 text-gray-700 border-gray-200' };
      return <span className={`px-2.5 py-0.5 inline-flex text-xs leading-5 font-medium rounded-full border ${colors[status] || colors['Aktif']}`}>{status}</span>;
  };

  return (
    <div className="w-full">
        <div className="flex flex-col gap-6 mb-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div><h1 className="text-2xl font-bold text-gray-900 tracking-tight">Database Santri</h1><p className="text-gray-500 text-sm mt-1">Kelola data santri, filter, dan ekspor data.</p></div>
                {canWrite && (
                    <div className="flex flex-wrap gap-2">
                        <button onClick={handleOpenBulkEditorAdd} className="flex items-center justify-center px-4 py-2 text-sm font-medium text-teal-700 bg-teal-50 border border-teal-200 rounded-lg hover:bg-teal-100 transition-colors"><i className="bi bi-plus-square-dotted mr-2"></i> Tambah Massal</button>
                        <button onClick={() => openModal()} className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 shadow-sm transition-colors focus:ring-4 focus:ring-teal-300"><i className="bi bi-plus-lg"></i> Tambah Santri</button>
                    </div>
                )}
            </div>

            {selectedSantriIds.length > 0 && (
                <div className="bg-teal-50 border border-teal-200 rounded-lg p-3 flex flex-col sm:flex-row items-center justify-between gap-3 animate-fade-in">
                    <div className="flex items-center gap-2 text-teal-800 text-sm font-medium"><span className="bg-teal-200 text-teal-800 text-xs px-2 py-0.5 rounded-full">{selectedSantriIds.length}</span><span>santri dipilih</span><span className="text-gray-300 mx-1">|</span><button onClick={() => setSelectedSantriIds([])} className="text-teal-600 hover:text-teal-800 hover:underline">Batalkan</button></div>
                    {canWrite && (
                        <div className="flex items-center gap-2">
                            <button onClick={handleOpenBulkEditorEdit} className="px-3 py-1.5 text-xs font-medium text-teal-700 bg-white border border-teal-300 rounded-md hover:bg-teal-50 transition-colors"><i className="bi bi-pencil-square mr-1"></i> Edit</button>
                            <button onClick={() => setBulkMoveModalOpen(true)} className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"><i className="bi bi-arrows-move mr-1"></i> Pindah Kelas</button>
                            <button onClick={() => setBulkStatusModalOpen(true)} className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"><i className="bi bi-tag mr-1"></i> Ubah Status</button>
                        </div>
                    )}
                </div>
            )}

            <div className="flex flex-col xl:flex-row gap-4">
                <div className="relative flex-grow xl:max-w-md"><div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400"><i className="bi bi-search"></i></div><input type="text" placeholder="Cari nama, NIS, atau NIK..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-teal-500 focus:border-teal-500 block w-full pl-10 p-2.5 shadow-sm"/></div>
                <div className="flex-grow flex flex-wrap xl:flex-nowrap gap-2 items-center overflow-x-auto pb-2 xl:pb-0 scrollbar-hide">
                    <select value={filters.jenjang} onChange={(e) => handleFilterChange('jenjang', e.target.value)} className="bg-white border border-gray-300 text-gray-700 text-sm rounded-lg p-2.5 min-w-[140px]"><option value="">Semua Jenjang</option>{settings.jenjang.map(j => <option key={j.id} value={j.id}>{j.nama}</option>)}</select>
                    <select value={filters.kelas} onChange={(e) => handleFilterChange('kelas', e.target.value)} disabled={!filters.jenjang} className="bg-white border border-gray-300 text-gray-700 text-sm rounded-lg p-2.5 min-w-[120px] disabled:bg-gray-100"><option value="">Semua Kelas</option>{availableKelas.map(k => <option key={k.id} value={k.id}>{k.nama}</option>)}</select>
                    <select value={filters.rombel} onChange={(e) => handleFilterChange('rombel', e.target.value)} disabled={!filters.kelas} className="bg-white border border-gray-300 text-gray-700 text-sm rounded-lg p-2.5 min-w-[140px] disabled:bg-gray-100"><option value="">Semua Rombel</option>{availableRombel.map(r => <option key={r.id} value={r.id}>{r.nama}</option>)}</select>
                    <select value={filters.status} onChange={(e) => handleFilterChange('status', e.target.value)} className="bg-white border border-gray-300 text-gray-700 text-sm rounded-lg p-2.5 min-w-[120px]"><option value="">Semua Status</option><option value="Aktif">Aktif</option><option value="Hiatus">Hiatus</option><option value="Lulus">Lulus</option><option value="Keluar/Pindah">Keluar/Pindah</option></select>
                    <select value={filters.gender} onChange={(e) => handleFilterChange('gender', e.target.value)} className="bg-white border border-gray-300 text-gray-700 text-sm rounded-lg p-2.5 min-w-[120px]"><option value="">Semua Gender</option><option value="Laki-laki">Laki-laki</option><option value="Perempuan">Perempuan</option></select>
                    <button onClick={() => setShowAdvancedFilters(!showAdvancedFilters)} className={`p-2.5 rounded-lg border transition-colors ${showAdvancedFilters ? 'bg-teal-50 border-teal-500 text-teal-700' : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'}`} title="Filter Lanjutan"><i className="bi bi-sliders"></i></button>
                    <div className="ml-auto flex gap-2 pl-2 border-l border-gray-300">
                        {canWrite && <button onClick={() => setImportModalOpen(true)} disabled={isImporting} className="p-2.5 text-gray-600 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg" title="Impor CSV">{isImporting ? <i className="bi bi-arrow-repeat animate-spin"></i> : <i className="bi bi-upload"></i>}</button>}
                        <button onClick={() => setExportModalOpen(true)} className="p-2.5 text-gray-600 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg flex items-center gap-1" title="Ekspor CSV"><i className="bi bi-download"></i></button>
                    </div>
                </div>
            </div>

            {showAdvancedFilters && (
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 grid grid-cols-1 md:grid-cols-3 gap-4 animate-fade-in-down">
                    <input type="text" placeholder="Filter Provinsi..." value={filters.provinsi} onChange={(e) => handleFilterChange('provinsi', e.target.value)} className="bg-white border border-gray-300 text-sm rounded-lg p-2.5 w-full"/>
                    <input type="text" placeholder="Filter Kab/Kota..." value={filters.kabupatenKota} onChange={(e) => handleFilterChange('kabupatenKota', e.target.value)} className="bg-white border border-gray-300 text-sm rounded-lg p-2.5 w-full"/>
                    <input type="text" placeholder="Filter Kecamatan..." value={filters.kecamatan} onChange={(e) => handleFilterChange('kecamatan', e.target.value)} className="bg-white border border-gray-300 text-sm rounded-lg p-2.5 w-full"/>
                </div>
            )}
        </div>

        <div className="bg-white border border-gray-200 rounded-none md:rounded-xl shadow-sm overflow-hidden flex flex-col">
            <div className="overflow-x-auto min-h-[300px]">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-50/50 border-b border-gray-200 sticky top-0 z-10 backdrop-blur-sm">
                        <tr>
                            <th scope="col" className="p-4 w-10"><div className="flex items-center"><input type="checkbox" ref={selectAllCheckboxRef} onChange={handleSelectAllOnPage} disabled={!canWrite} className="w-4 h-4 text-teal-600 bg-gray-100 border-gray-300 rounded focus:ring-teal-500 focus:ring-2 disabled:text-gray-300"/></div></th>
                            <th scope="col" className="p-4 text-xs font-semibold tracking-wide text-gray-500 uppercase">Nama Lengkap</th>
                            <th scope="col" className="p-4 text-xs font-semibold tracking-wide text-gray-500 uppercase">Identitas</th>
                            <th scope="col" className="p-4 text-xs font-semibold tracking-wide text-gray-500 uppercase">Kelas</th>
                            <th scope="col" className="p-4 text-xs font-semibold tracking-wide text-gray-500 uppercase">Status</th>
                            <th scope="col" className="p-4 text-xs font-semibold tracking-wide text-gray-500 uppercase">Info</th>
                            <th scope="col" className="p-4 text-xs font-semibold tracking-wide text-gray-500 uppercase text-right">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {paginatedSantri.map(santri => (
                            <tr key={santri.id} className={`group transition-colors ${selectedSantriIds.includes(santri.id) ? 'bg-teal-50/60 hover:bg-teal-50' : 'hover:bg-gray-50'}`}>
                                <td className="p-4"><div className="flex items-center"><input type="checkbox" checked={selectedSantriIds.includes(santri.id)} onChange={() => handleSelectOne(santri.id)} disabled={!canWrite} className="w-4 h-4 text-teal-600 bg-gray-100 border-gray-300 rounded focus:ring-teal-500 focus:ring-2 disabled:text-gray-300"/></div></td>
                                <td className="p-4"><div className="flex items-center"><TableAvatar name={santri.namaLengkap} url={santri.fotoUrl} /><div><div className="text-sm font-medium text-gray-900">{santri.namaLengkap}</div>{santri.namaHijrah && <div className="text-xs text-gray-500">({santri.namaHijrah})</div>}</div></div></td>
                                <td className="p-4"><div className="text-sm text-gray-900 font-mono">{santri.nis}</div>{santri.nisn && <div className="text-xs text-gray-500">NISN: {santri.nisn}</div>}</td>
                                <td className="p-4"><div className="text-sm text-gray-900">{getDetailName('rombel', santri.rombelId)}</div><div className="text-xs text-gray-500">{getDetailName('jenjang', santri.jenjangId)}</div></td>
                                <td className="p-4"><StatusBadge status={santri.status} /></td>
                                <td className="p-4"><div className="text-xs text-gray-500 flex flex-col gap-0.5"><span title="Tanggal Masuk"><i className="bi bi-calendar-event mr-1"></i> {new Date(santri.tanggalMasuk).toLocaleDateString('id-ID')}</span><span title="Jenis Kelamin"><i className={`bi bi-gender-${santri.jenisKelamin === 'Laki-laki' ? 'male text-blue-500' : 'female text-pink-500'} mr-1`}></i> {santri.jenisKelamin === 'Laki-laki' ? 'L' : 'P'}</span></div></td>
                                <td className="p-4 text-right">
                                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => openModal(santri)} className="p-1.5 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors" title={canWrite ? "Edit" : "Lihat Detail"}><i className={`bi ${canWrite ? 'bi-pencil-square' : 'bi-eye-fill'}`}></i></button>
                                        {canWrite && <button onClick={() => handleDelete(santri.id)} className="p-1.5 text-red-600 bg-red-50 hover:bg-red-100 rounded-md transition-colors" title="Hapus"><i className="bi bi-trash"></i></button>}
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {filteredSantri.length === 0 && <tr><td colSpan={7} className="px-6 py-12 text-center"><div className="flex flex-col items-center justify-center"><div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 mb-3"><i className="bi bi-search text-xl"></i></div><h3 className="text-sm font-medium text-gray-900">Tidak ada data ditemukan</h3><p className="text-xs text-gray-500 mt-1 max-w-xs">Coba ubah kata kunci pencarian atau filter Anda.</p></div></td></tr>}
                    </tbody>
                </table>
            </div>
            <div className="bg-gray-50 border-t border-gray-200 p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-sm text-gray-600">Menampilkan <span className="font-medium text-gray-900">{startItem}-{endItem}</span> dari <span className="font-medium text-gray-900">{filteredSantri.length}</span> santri</div>
                <div className="flex items-center gap-4"><select value={itemsPerPage} onChange={(e) => setItemsPerPage(Number(e.target.value))} className="bg-white border border-gray-300 text-gray-700 text-sm rounded-lg focus:ring-teal-500 focus:border-teal-500 p-1.5"><option value={10}>10 baris</option><option value={25}>25 baris</option><option value={50}>50 baris</option><option value={100}>100 baris</option></select><Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} /></div>
            </div>
        </div>

        {isModalOpen && <SantriModal isOpen={isModalOpen} onClose={closeModal} onSave={handleSave} santriData={selectedSantri} onSwitchToBulk={() => { closeModal(); handleOpenBulkEditorAdd(); }} />}
        {isImportModalOpen && <ImportModal />}
        {isExportModalOpen && <ExportModal />}
        {importPreview && <ImportPreviewModal />}
        {isBulkStatusModalOpen && <BulkStatusModal isOpen={isBulkStatusModalOpen} onClose={() => setBulkStatusModalOpen(false)} onSave={handleBulkStatusSave} selectedCount={selectedSantriIds.length} />}
        {isBulkMoveModalOpen && <BulkMoveModal isOpen={isBulkMoveModalOpen} onClose={() => setBulkMoveModalOpen(false)} onSave={handleBulkMoveSave} selectedCount={selectedSantriIds.length} />}
        {isBulkEditorOpen && <BulkSantriEditor isOpen={isBulkEditorOpen} onClose={() => setBulkEditorOpen(false)} mode={bulkEditorMode} initialData={bulkEditorMode === 'edit' ? santriList.filter(s => selectedSantriIds.includes(s.id)) : undefined} onSave={handleSaveBulkEditor} />}
    </div>
  );
};

export default SantriList;
