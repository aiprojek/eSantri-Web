
import React, { useState, useRef, useEffect } from 'react';
import { useAppContext } from '../AppContext';
import { useSantriContext } from '../contexts/SantriContext';
import { useSantriFilter } from '../hooks/useSantriFilter';
import { Santri } from '../types';
import { SantriModal } from './santri/SantriModal';
import { BulkSantriEditor } from './santri/modals/BulkSantriEditor';
import { sendManualWA, WA_TEMPLATES, formatWAMessage } from '../services/waService';
import { parseSantriCsv, generateSantriCsvForUpdate, generateSantriCsvTemplate } from '../services/csvService';
import { Pagination } from './common/Pagination';
import { BulkStatusModal } from './santri/modals/BulkStatusModal';
import { BulkMoveModal } from './santri/modals/BulkMoveModal';
import { SantriFilterBar } from './common/SantriFilterBar';
import { PageHeader } from './common/PageHeader';
import { SectionCard } from './common/SectionCard';
import { EmptyState } from './common/EmptyState';

const SantriList: React.FC = () => {
    const { settings, showToast, showConfirmation, currentUser } = useAppContext();
    const { santriList, santriFilters, setSantriFilters, onAddSantri, onUpdateSantri, onDeleteSantri, onBulkAddSantri, onBulkUpdateSantri } = useSantriContext();
    const { filteredSantri } = useSantriFilter(santriList, santriFilters, setSantriFilters);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSantri, setEditingSantri] = useState<Santri | null>(null);
    const [isBulkEditorOpen, setIsBulkEditorOpen] = useState(false);
    const [bulkEditorMode, setBulkEditorMode] = useState<'add' | 'edit'>('add');
    const [bulkEditorData, setBulkEditorData] = useState<Santri[]>([]);

    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [isBulkStatusOpen, setIsBulkStatusOpen] = useState(false);
    const [isBulkMoveOpen, setIsBulkMoveOpen] = useState(false);
    
    // Dropdown Menu State
    const [isOptionsMenuOpen, setIsOptionsMenuOpen] = useState(false);
    const optionsMenuRef = useRef<HTMLDivElement>(null);

    // Permission Check
    const canWrite = currentUser?.role === 'admin' || currentUser?.permissions?.santri === 'write';

    // Close menu on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (optionsMenuRef.current && !optionsMenuRef.current.contains(event.target as Node)) {
                setIsOptionsMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        setCurrentPage(1);
    }, [santriFilters]);

    const paginatedSantri = filteredSantri.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
    const totalPages = Math.ceil(filteredSantri.length / itemsPerPage);

    const handleEdit = (santri: Santri) => {
        setEditingSantri(santri);
        setIsModalOpen(true);
    };

    const handleDelete = (id: number) => {
        if (!canWrite) return;
        showConfirmation('Hapus Santri?', 'Data santri akan dihapus permanen (soft delete).', async () => {
            await onDeleteSantri(id);
            showToast('Santri berhasil dihapus', 'success');
        }, { confirmColor: 'red' });
    };

    const handleSave = async (data: any) => {
        if (editingSantri) {
            await onUpdateSantri(data);
            showToast('Data santri diperbarui', 'success');
        } else {
            await onAddSantri(data);
            showToast('Santri baru ditambahkan', 'success');
        }
        setIsModalOpen(false);
    };

    // Bulk Actions
    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        const currentPageIds = paginatedSantri.map(s => s.id);
        if (e.target.checked) {
            setSelectedIds(prev => Array.from(new Set([...prev, ...currentPageIds])));
        } else {
            setSelectedIds(prev => prev.filter(id => !currentPageIds.includes(id)));
        }
    };

    const handleSelectOne = (id: number) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(selectedIds.filter(i => i !== id));
        } else {
            setSelectedIds([...selectedIds, id]);
        }
    };

    const handleBulkStatusSave = async (newStatus: Santri['status'], date?: string) => {
        const updates = santriList.filter(s => selectedIds.includes(s.id)).map(s => ({
            ...s,
            status: newStatus,
            tanggalStatus: date || s.tanggalStatus,
            riwayatStatus: [...(s.riwayatStatus || []), { id: Date.now(), status: newStatus, tanggal: date || new Date().toISOString(), keterangan: 'Update Massal' }]
        }));
        await onBulkUpdateSantri(updates);
        setIsBulkStatusOpen(false);
        setSelectedIds([]);
        showToast('Status berhasil diubah massal', 'success');
    };

    const handleBulkMoveSave = async (jenjangId: number, kelasId: number, rombelId: number) => {
        const updates = santriList.filter(s => selectedIds.includes(s.id)).map(s => ({
            ...s,
            jenjangId,
            kelasId,
            rombelId
        }));
        await onBulkUpdateSantri(updates);
        setIsBulkMoveOpen(false);
        setSelectedIds([]);
        showToast('Rombel berhasil dipindah massal', 'success');
    };

    const handleBulkEditSelected = () => {
        const selectedSantri = santriList.filter(s => selectedIds.includes(s.id));
        if (selectedSantri.length === 0) {
            showToast('Pilih santri terlebih dahulu.', 'info');
            return;
        }
        setBulkEditorMode('edit');
        setBulkEditorData(selectedSantri);
        setIsBulkEditorOpen(true);
    };

    // CSV / Bulk Editor
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>, mode: 'add' | 'update') => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (evt) => {
            const text = evt.target?.result as string;
            try {
                const result = parseSantriCsv(text, mode === 'add' ? 'add' : 'update', santriList);
                if (result.errors.length > 0) {
                    showToast(`Ada error: ${result.errors[0]}`, 'error');
                }
                if (result.toAdd.length > 0) {
                     await onBulkAddSantri(result.toAdd);
                     showToast(`${result.toAdd.length} data ditambahkan.`, 'success');
                }
                if (result.toUpdate.length > 0) {
                    await onBulkUpdateSantri(result.toUpdate);
                    showToast(`${result.toUpdate.length} data diperbarui.`, 'success');
                }
            } catch (err) {
                 showToast((err as Error).message, 'error');
            }
            if (fileInputRef.current) fileInputRef.current.value = '';
            setIsOptionsMenuOpen(false);
        };
        reader.readAsText(file);
    };

    const handleDownloadTemplate = () => {
        const csv = generateSantriCsvTemplate();
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'template_santri.csv';
        a.click();
        window.URL.revokeObjectURL(url);
        setIsOptionsMenuOpen(false);
    };

    const handleDownloadData = () => {
        const csv = generateSantriCsvForUpdate(filteredSantri);
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'data_santri_backup.csv';
        a.click();
        window.URL.revokeObjectURL(url);
        setIsOptionsMenuOpen(false);
    }
    
    const StatusBadge = ({ status }: { status: Santri['status'] }) => {
          const colors: Record<string, string> = {
              'Aktif': 'bg-green-100 text-green-800 border-green-200',
              'Hiatus': 'bg-yellow-100 text-yellow-800 border-yellow-200',
              'Lulus': 'bg-blue-100 text-blue-800 border-blue-200',
              'Keluar/Pindah': 'bg-red-100 text-red-800 border-red-200',
              'Masuk': 'bg-gray-100 text-gray-800 border-gray-200',
              'Baru': 'bg-purple-100 text-purple-800 border-purple-200',
              'Diterima': 'bg-teal-100 text-teal-800 border-teal-200',
              'Cadangan': 'bg-orange-100 text-orange-800 border-orange-200',
              'Ditolak': 'bg-red-100 text-red-800 border-red-200'
          };
          return <span className={`px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full border ${colors[status] || colors['Aktif']}`}>{status}</span>;
      };

    const handleQuickWA = (santri: Santri) => {
        const phone = santri.teleponAyah || santri.teleponIbu || santri.teleponWali;
        if (!phone) {
            showToast('Nomor telepon tidak tersedia', 'error');
            return;
        }
        const message = formatWAMessage("Assalamualaikum, Bapak/Ibu [ortu]. Saya dari Pengurus Pondok ingin menyapa santri [nama_santri].", {
            nama_santri: santri.namaLengkap,
            ortu: santri.namaAyah || santri.namaIbu || 'Wali Santri'
        });
        sendManualWA(phone, message);
    };

    return (
        <div className="space-y-6">
            <PageHeader
                eyebrow="Kesiswaan"
                title="Data Santri"
                description="Kelola data seluruh santri, gunakan filter lintas jenjang sampai rombel, lalu lanjutkan ke aksi massal atau ekspor data dari satu tempat."
                actions={canWrite ? (
                    <>
                        <button onClick={() => { setEditingSantri(null); setIsModalOpen(true); }} className="app-button-primary w-full justify-center px-4 py-2 text-sm sm:w-auto sm:min-w-[148px]">
                            <i className="bi bi-person-plus-fill"></i> Tambah
                        </button>
                        <div className="relative" ref={optionsMenuRef}>
                            <button 
                                onClick={() => setIsOptionsMenuOpen(!isOptionsMenuOpen)} 
                                className={`app-button-secondary w-full justify-center px-4 py-2 text-sm sm:w-auto sm:min-w-[148px] ${isOptionsMenuOpen ? 'ring-2 ring-teal-100' : ''}`}
                            >
                                <i className="bi bi-three-dots-vertical"></i> Opsi Lain
                            </button>
                            {isOptionsMenuOpen && (
                                <div className="absolute left-0 right-0 z-50 mt-2 overflow-hidden rounded-xl border border-app-border bg-white shadow-soft animate-fade-in-down sm:left-auto sm:right-0 sm:w-56">
                                    <button onClick={() => { setBulkEditorMode('add'); setBulkEditorData([]); setIsBulkEditorOpen(true); setIsOptionsMenuOpen(false); }} className="w-full px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-teal-50"><i className="bi bi-table mr-2 text-teal-600"></i> Tambah Massal (Grid)</button>
                                    <hr className="border-slate-100"/>
                                    <button onClick={handleDownloadTemplate} className="w-full px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-teal-50"><i className="bi bi-file-earmark-spreadsheet mr-2 text-green-600"></i> Download Template CSV</button>
                                    <button onClick={handleDownloadData} className="w-full px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-teal-50"><i className="bi bi-download mr-2 text-gray-600"></i> Backup CSV</button>
                                    <label className="flex w-full cursor-pointer items-center px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-teal-50">
                                        <i className="bi bi-upload mr-2 text-purple-600"></i> Import CSV
                                        <input type="file" ref={fileInputRef} className="hidden" accept=".csv" onChange={(e) => handleImportCSV(e, 'add')} />
                                    </label>
                                </div>
                            )}
                        </div>
                    </>
                ) : undefined}
            />

            <SectionCard
                title="Daftar Santri"
                description="Filter, seleksi massal, dan tabel santri disatukan agar lebih ringkas dan langsung ke data."
                contentClassName="p-0"
            >
            <div className="space-y-4 border-b border-app-border p-5 sm:p-6">
                <SantriFilterBar
                    settings={settings}
                    filters={santriFilters}
                    onChange={setSantriFilters}
                    title="Filter Santri"
                    searchPlaceholder="Cari Nama, NIS, atau NIK..."
                    resultCount={filteredSantri.length}
                    showGender
                    className="border-0 p-0 shadow-none"
                />

                {selectedIds.length > 0 && canWrite && (
                    <div className="app-toolbar animate-fade-in-down">
                        <div className="flex items-center gap-4">
                            <span className="text-sm font-bold text-teal-800">{selectedIds.length} santri dipilih</span>
                            <button
                                onClick={() => setSelectedIds([])}
                                className="text-xs font-medium text-red-600 underline hover:text-red-800"
                            >
                                Batalkan Pilihan
                            </button>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={handleBulkEditSelected} className="rounded-lg border border-blue-300 bg-white px-3 py-1.5 text-xs font-bold text-blue-700 transition-colors hover:bg-blue-100">Edit Massal</button>
                            <button onClick={() => setIsBulkStatusOpen(true)} className="rounded-lg border border-teal-300 bg-white px-3 py-1.5 text-xs font-bold text-teal-700 transition-colors hover:bg-teal-100">Ubah Status</button>
                            <button onClick={() => setIsBulkMoveOpen(true)} className="rounded-lg border border-teal-300 bg-white px-3 py-1.5 text-xs font-bold text-teal-700 transition-colors hover:bg-teal-100">Pindah Kelas</button>
                        </div>
                    </div>
                )}
            </div>
            <div className="app-table-shell">
            <div className="hidden md:block app-scrollbar overflow-x-auto">
                <table className="app-table text-sm text-left">
                    <thead>
                        <tr>
                            <th className="p-4 w-10 text-center">
                                <input 
                                    type="checkbox" 
                                    onChange={handleSelectAll} 
                                    checked={paginatedSantri.length > 0 && paginatedSantri.every(s => selectedIds.includes(s.id))} 
                                    className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500 cursor-pointer" 
                                />
                            </th>
                            <th className="p-4">Nama Santri</th>
                            <th className="p-4">NIS / NISN</th>
                            <th className="p-4">Kelas</th>
                            <th className="p-4 text-center">L/P</th>
                            <th className="p-4">Status</th>
                            <th className="p-4 text-center">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                        {paginatedSantri.map(s => (
                            <tr key={s.id} className={`transition-colors hover:bg-teal-50/50 ${selectedIds.includes(s.id) ? 'bg-teal-50/40' : ''}`}>
                                <td className="p-4 text-center"><input type="checkbox" checked={selectedIds.includes(s.id)} onChange={() => handleSelectOne(s.id)} className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500 cursor-pointer" /></td>
                                <td className="flex items-center gap-3 p-4 font-bold text-slate-800">
                                    <div className="h-8 w-8 flex-shrink-0 overflow-hidden rounded-full border border-teal-100 bg-teal-50">
                                         {s.fotoUrl && !s.fotoUrl.includes('text=Foto') ? <img src={s.fotoUrl} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center text-xs font-bold text-teal-600">{s.namaLengkap.charAt(0)}</div>}
                                    </div>
                                    {s.namaLengkap}
                                </td>
                                <td className="p-4 font-mono text-xs text-slate-500">{s.nis || '-'} <br/> {s.nisn}</td>
                                <td className="p-4">
                                    <div className="font-medium text-slate-900">{settings.kelas.find(k=>k.id===s.kelasId)?.nama || '-'}</div>
                                    <div className="text-xs text-slate-500">{settings.rombel.find(r=>r.id===s.rombelId)?.nama}</div>
                                </td>
                                <td className="p-4 text-center"><span className={`px-2 py-0.5 rounded text-xs font-bold ${s.jenisKelamin === 'Laki-laki' ? 'bg-blue-100 text-blue-700' : 'bg-pink-100 text-pink-700'}`}>{s.jenisKelamin === 'Laki-laki' ? 'L' : 'P'}</span></td>
                                <td className="p-4"><StatusBadge status={s.status} /></td>
                                <td className="p-4 text-center">
                                    <div className="flex justify-center gap-2">
                                        <button 
                                            onClick={() => handleQuickWA(s)}
                                            className="rounded p-2 text-green-600 transition-colors hover:bg-green-100 hover:text-green-800" 
                                            title="Kirim WhatsApp"
                                        >
                                            <i className="bi bi-whatsapp"></i>
                                        </button>
                                        {canWrite && (
                                            <>
                                                <button onClick={() => handleEdit(s)} className="rounded p-2 text-blue-600 transition-colors hover:bg-blue-100 hover:text-blue-800" title="Edit"><i className="bi bi-pencil-square"></i></button>
                                                <button onClick={() => handleDelete(s.id)} className="rounded p-2 text-red-600 transition-colors hover:bg-red-100 hover:text-red-800" title="Hapus"><i className="bi bi-trash"></i></button>
                                            </>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {filteredSantri.length === 0 && (
                            <tr>
                                <td colSpan={7} className="p-0">
                                    <EmptyState
                                        icon="bi-people"
                                        title="Tidak ada data santri"
                                        description="Coba ubah filter pencarian, jenjang, kelas, rombel, atau status agar data yang dicari muncul."
                                        compact
                                    />
                                </td>
                            </tr>
                        )}
                        {filteredSantri.length > 0 && paginatedSantri.length === 0 && (
                            <tr>
                                <td colSpan={7} className="p-0">
                                    <EmptyState
                                        icon="bi-list-columns-reverse"
                                        title="Halaman kosong"
                                        description="Kembali ke halaman sebelumnya atau ubah jumlah data per halaman."
                                        compact
                                    />
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            <div className="md:hidden space-y-3 p-4">
                <label className="mb-1 flex items-center gap-2 text-xs font-semibold text-slate-600">
                    <input
                        type="checkbox"
                        onChange={handleSelectAll}
                        checked={paginatedSantri.length > 0 && paginatedSantri.every(s => selectedIds.includes(s.id))}
                        className="h-4 w-4 cursor-pointer rounded text-teal-600 focus:ring-teal-500"
                    />
                    Pilih semua data di halaman ini
                </label>

                {paginatedSantri.map((s) => (
                    <article key={s.id} className={`rounded-2xl border p-4 shadow-sm ${selectedIds.includes(s.id) ? 'border-teal-300 bg-teal-50/40' : 'border-app-border bg-white'}`}>
                        <div className="mb-3 flex items-start gap-3">
                            <input
                                type="checkbox"
                                checked={selectedIds.includes(s.id)}
                                onChange={() => handleSelectOne(s.id)}
                                className="mt-1 h-4 w-4 cursor-pointer rounded text-teal-600 focus:ring-teal-500"
                            />
                            <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-full border border-teal-100 bg-teal-50">
                                {s.fotoUrl && !s.fotoUrl.includes('text=Foto')
                                    ? <img src={s.fotoUrl} alt="" className="h-full w-full object-cover" />
                                    : <div className="flex h-full w-full items-center justify-center text-sm font-bold text-teal-600">{s.namaLengkap.charAt(0)}</div>}
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-bold text-slate-800">{s.namaLengkap}</p>
                                <p className="mt-0.5 text-[11px] font-mono text-slate-500">NIS: {s.nis || '-'} • NISN: {s.nisn || '-'}</p>
                            </div>
                            <StatusBadge status={s.status} />
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-xs">
                            <div className="rounded-lg border border-slate-100 bg-slate-50 p-2">
                                <div className="text-[10px] uppercase tracking-wide text-slate-500">Kelas</div>
                                <div className="mt-0.5 font-semibold text-slate-800">{settings.kelas.find(k => k.id === s.kelasId)?.nama || '-'}</div>
                                <div className="text-slate-500">{settings.rombel.find(r => r.id === s.rombelId)?.nama || '-'}</div>
                            </div>
                            <div className="rounded-lg border border-slate-100 bg-slate-50 p-2">
                                <div className="text-[10px] uppercase tracking-wide text-slate-500">Gender</div>
                                <div className="mt-1">
                                    <span className={`rounded px-2 py-0.5 text-xs font-bold ${s.jenisKelamin === 'Laki-laki' ? 'bg-blue-100 text-blue-700' : 'bg-pink-100 text-pink-700'}`}>
                                        {s.jenisKelamin === 'Laki-laki' ? 'Laki-laki' : 'Perempuan'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="mt-3 flex items-center justify-end gap-2">
                            <button onClick={() => handleQuickWA(s)} className="rounded p-2 text-green-600 transition-colors hover:bg-green-100 hover:text-green-800" title="Kirim WhatsApp">
                                <i className="bi bi-whatsapp"></i>
                            </button>
                            {canWrite && (
                                <>
                                    <button onClick={() => handleEdit(s)} className="rounded p-2 text-blue-600 transition-colors hover:bg-blue-100 hover:text-blue-800" title="Edit">
                                        <i className="bi bi-pencil-square"></i>
                                    </button>
                                    <button onClick={() => handleDelete(s.id)} className="rounded p-2 text-red-600 transition-colors hover:bg-red-100 hover:text-red-800" title="Hapus">
                                        <i className="bi bi-trash"></i>
                                    </button>
                                </>
                            )}
                        </div>
                    </article>
                ))}

                {filteredSantri.length === 0 && (
                    <EmptyState
                        icon="bi-people"
                        title="Tidak ada data santri"
                        description="Coba ubah filter pencarian, jenjang, kelas, rombel, atau status agar data yang dicari muncul."
                        compact
                    />
                )}

                {filteredSantri.length > 0 && paginatedSantri.length === 0 && (
                    <EmptyState
                        icon="bi-list-columns-reverse"
                        title="Halaman kosong"
                        description="Kembali ke halaman sebelumnya atau ubah jumlah data per halaman."
                        compact
                    />
                )}
            </div>
            <div className="px-5 py-4 sm:px-6">
                <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
            </div>
            </div>
            </SectionCard>

            {/* Modals */}
            <SantriModal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
                onSave={handleSave} 
                santriData={editingSantri}
                onSwitchToBulk={() => { setIsModalOpen(false); setBulkEditorMode('add'); setBulkEditorData([]); setIsBulkEditorOpen(true); }}
            />
            
            <BulkSantriEditor 
                isOpen={isBulkEditorOpen} 
                onClose={() => setIsBulkEditorOpen(false)} 
                mode={bulkEditorMode} 
                initialData={bulkEditorData}
                onSave={async (data) => {
                    if (bulkEditorMode === 'add') {
                        await onBulkAddSantri(data as Omit<Santri, 'id'>[]);
                        showToast(`${data.length} santri ditambahkan`, 'success');
                    } else {
                        await onBulkUpdateSantri(data as Santri[]);
                        showToast(`${data.length} santri diperbarui`, 'success');
                    }
                }}
            />

            <BulkStatusModal 
                isOpen={isBulkStatusOpen}
                onClose={() => setIsBulkStatusOpen(false)}
                onSave={handleBulkStatusSave}
                selectedCount={selectedIds.length}
            />

            <BulkMoveModal 
                isOpen={isBulkMoveOpen}
                onClose={() => setIsBulkMoveOpen(false)}
                onSave={handleBulkMoveSave}
                selectedCount={selectedIds.length}
            />
        </div>
    );
};

export default SantriList;
