import React, { useState } from 'react';
import { useAppContext } from '../AppContext';
import { useSantriContext } from '../contexts/SantriContext';
import { useSantriFilter } from '../hooks/useSantriFilter';
import { Santri } from '../types';
import { SantriModal } from './santri/SantriModal';
import { BulkSantriEditor } from './santri/modals/BulkSantriEditor';
import { parseSantriCsv, generateSantriCsvForUpdate, generateSantriCsvTemplate } from '../services/csvService';
import { Pagination } from './common/Pagination';
import { BulkStatusModal } from './santri/modals/BulkStatusModal';
import { BulkMoveModal } from './santri/modals/BulkMoveModal';

const SantriList: React.FC = () => {
    const { settings, showToast, showConfirmation, currentUser } = useAppContext();
    const { santriList, santriFilters, setSantriFilters, onAddSantri, onUpdateSantri, onDeleteSantri, onBulkAddSantri, onBulkUpdateSantri } = useSantriContext();
    const { filteredSantri, getAvailableOptions, handleFilterChange } = useSantriFilter(santriList, santriFilters, setSantriFilters);
    const { availableKelas, availableRombel } = getAvailableOptions(settings);

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

    // Permission Check
    const canWrite = currentUser?.role === 'admin' || currentUser?.permissions?.santri === 'write';

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
        if (e.target.checked) {
            setSelectedIds(paginatedSantri.map(s => s.id));
        } else {
            setSelectedIds([]);
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

    // CSV / Bulk Editor
    const fileInputRef = React.useRef<HTMLInputElement>(null);

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

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">Data Santri</h1>
                    <p className="text-gray-500 text-sm">Kelola data seluruh santri, filter, dan export.</p>
                </div>
                {canWrite && (
                    <div className="flex gap-2">
                        <button onClick={() => { setEditingSantri(null); setIsModalOpen(true); }} className="bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-teal-700 flex items-center gap-2">
                            <i className="bi bi-person-plus-fill"></i> Tambah
                        </button>
                        <div className="relative group">
                            <button className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-bold hover:bg-gray-50 flex items-center gap-2">
                                <i className="bi bi-three-dots-vertical"></i> Opsi Lain
                            </button>
                            <div className="absolute right-0 mt-2 w-48 bg-white border rounded-lg shadow-xl z-50 hidden group-hover:block">
                                <button onClick={() => { setBulkEditorMode('add'); setBulkEditorData([]); setIsBulkEditorOpen(true); }} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100"><i className="bi bi-table"></i> Tambah Massal (Grid)</button>
                                <button onClick={() => { setBulkEditorMode('edit'); setBulkEditorData(filteredSantri); setIsBulkEditorOpen(true); }} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100"><i className="bi bi-pencil-square"></i> Edit Massal (Grid)</button>
                                <hr/>
                                <button onClick={handleDownloadTemplate} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100"><i className="bi bi-file-earmark-spreadsheet"></i> Download Template CSV</button>
                                <button onClick={handleDownloadData} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100"><i className="bi bi-download"></i> Backup CSV</button>
                                <label className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 cursor-pointer flex items-center">
                                    <i className="bi bi-upload mr-2"></i> Import CSV
                                    <input type="file" ref={fileInputRef} className="hidden" accept=".csv" onChange={(e) => handleImportCSV(e, 'add')} />
                                </label>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
                 <div className="lg:col-span-5 relative">
                     <input type="text" placeholder="Cari Nama, NIS, NIK..." value={santriFilters.search} onChange={e => handleFilterChange('search', e.target.value)} className="w-full pl-9 border rounded-lg p-2.5 text-sm"/>
                     <i className="bi bi-search absolute left-3 top-3 text-gray-400"></i>
                 </div>
                 <select value={santriFilters.jenjang} onChange={e => handleFilterChange('jenjang', e.target.value)} className="border rounded-lg p-2 text-sm"><option value="">Semua Jenjang</option>{settings.jenjang.map(j => <option key={j.id} value={j.id}>{j.nama}</option>)}</select>
                 <select value={santriFilters.kelas} onChange={e => handleFilterChange('kelas', e.target.value)} className="border rounded-lg p-2 text-sm" disabled={!santriFilters.jenjang}><option value="">Semua Kelas</option>{availableKelas.map(k => <option key={k.id} value={k.id}>{k.nama}</option>)}</select>
                 <select value={santriFilters.rombel} onChange={e => handleFilterChange('rombel', e.target.value)} className="border rounded-lg p-2 text-sm" disabled={!santriFilters.kelas}><option value="">Semua Rombel</option>{availableRombel.map(r => <option key={r.id} value={r.id}>{r.nama}</option>)}</select>
                 <select value={santriFilters.status} onChange={e => handleFilterChange('status', e.target.value)} className="border rounded-lg p-2 text-sm"><option value="">Semua Status</option><option value="Aktif">Aktif</option><option value="Lulus">Lulus</option><option value="Keluar/Pindah">Keluar/Pindah</option></select>
                 <select value={santriFilters.gender} onChange={e => handleFilterChange('gender', e.target.value)} className="border rounded-lg p-2 text-sm"><option value="">Semua Gender</option><option value="Laki-laki">Laki-laki</option><option value="Perempuan">Perempuan</option></select>
            </div>

            {/* Bulk Actions Toolbar */}
            {selectedIds.length > 0 && canWrite && (
                <div className="bg-teal-50 border border-teal-200 p-3 rounded-lg flex items-center justify-between animate-fade-in-down">
                    <span className="text-sm font-bold text-teal-800">{selectedIds.length} santri dipilih</span>
                    <div className="flex gap-2">
                        <button onClick={() => setIsBulkStatusOpen(true)} className="px-3 py-1.5 bg-white border border-teal-300 text-teal-700 text-xs font-bold rounded hover:bg-teal-100">Ubah Status</button>
                        <button onClick={() => setIsBulkMoveOpen(true)} className="px-3 py-1.5 bg-white border border-teal-300 text-teal-700 text-xs font-bold rounded hover:bg-teal-100">Pindah Kelas</button>
                    </div>
                </div>
            )}

            {/* Table */}
            <div className="bg-white border rounded-lg shadow-sm overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-600 uppercase text-xs font-semibold">
                        <tr>
                            <th className="p-4 w-10 text-center"><input type="checkbox" onChange={handleSelectAll} checked={selectedIds.length > 0 && selectedIds.length === paginatedSantri.length} className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500" /></th>
                            <th className="p-4">Nama Santri</th>
                            <th className="p-4">NIS / NISN</th>
                            <th className="p-4">Kelas</th>
                            <th className="p-4 text-center">L/P</th>
                            <th className="p-4">Status</th>
                            <th className="p-4 text-center">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {paginatedSantri.map(s => (
                            <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                                <td className="p-4 text-center"><input type="checkbox" checked={selectedIds.includes(s.id)} onChange={() => handleSelectOne(s.id)} className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500" /></td>
                                <td className="p-4 font-bold text-gray-800 flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
                                         {s.fotoUrl && !s.fotoUrl.includes('text=Foto') ? <img src={s.fotoUrl} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">{s.namaLengkap.charAt(0)}</div>}
                                    </div>
                                    {s.namaLengkap}
                                </td>
                                <td className="p-4 text-gray-500 font-mono text-xs">{s.nis || '-'} <br/> {s.nisn}</td>
                                <td className="p-4">
                                    <div className="text-gray-900">{settings.kelas.find(k=>k.id===s.kelasId)?.nama || '-'}</div>
                                    <div className="text-gray-500 text-xs">{settings.rombel.find(r=>r.id===s.rombelId)?.nama}</div>
                                </td>
                                <td className="p-4 text-center">{s.jenisKelamin === 'Laki-laki' ? 'L' : 'P'}</td>
                                <td className="p-4"><StatusBadge status={s.status} /></td>
                                <td className="p-4 text-center">
                                    {canWrite && (
                                        <div className="flex justify-center gap-2">
                                            <button onClick={() => handleEdit(s)} className="text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 p-2 rounded transition-colors"><i className="bi bi-pencil-square"></i></button>
                                            <button onClick={() => handleDelete(s.id)} className="text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 p-2 rounded transition-colors"><i className="bi bi-trash"></i></button>
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ))}
                        {filteredSantri.length === 0 && (
                            <tr><td colSpan={7} className="p-8 text-center text-gray-500 italic">Tidak ada data santri yang cocok.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
            
            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />

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
                        // Cast partial data to compatible Omit<Santri, 'id'> type
                        // In real app, might need more rigorous validation or default filling
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