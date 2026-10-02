
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { PondokSettings, Jenjang, Kelas, Rombel } from '../../types';
import { useAppContext } from '../../AppContext';
import { useSantriContext } from '../../contexts/SantriContext';
import { StructureModal } from '../settings/modals/StructureModal';
import { BulkMasterEditor } from './modals/BulkMasterEditor';
import { loadXLSX } from '../../utils/lazyClientLibs';

type StructureItem = Jenjang | Kelas | Rombel;

interface TabStrukturPendidikanProps {
    localSettings: PondokSettings;
    handleInputChange: <K extends keyof PondokSettings>(key: K, value: PondokSettings[K]) => void;
    canWrite: boolean;
}

export const TabStrukturPendidikan: React.FC<TabStrukturPendidikanProps> = ({ localSettings, handleInputChange, canWrite }) => {
    const { showAlert, showConfirmation, showToast } = useAppContext();
    const { santriList } = useSantriContext();
    const [structureModalData, setStructureModalData] = useState<{
        mode: 'add' | 'edit';
        listName: 'jenjang' | 'kelas' | 'rombel';
        item?: StructureItem;
    } | null>(null);

    // Bulk Add State
    const [bulkMode, setBulkMode] = useState<'jenjang' | 'kelas' | 'rombel' | null>(null);
    const [bulkInitialData, setBulkInitialData] = useState<any[] | undefined>(undefined);

    // Selection state for each list
    const [selectedJenjangIds, setSelectedJenjangIds] = useState<number[]>([]);
    const [selectedKelasIds, setSelectedKelasIds] = useState<number[]>([]);
    const [selectedRombelIds, setSelectedRombelIds] = useState<number[]>([]);

    // Search state for each list
    const [searchJenjang, setSearchJenjang] = useState('');
    const [searchKelas, setSearchKelas] = useState('');
    const [searchRombel, setSearchRombel] = useState('');

    // Calculate active teachers for dropdowns (Mudir, Wali Kelas)
    const activeTeachers = useMemo(() => {
        return localSettings.tenagaPengajar.filter(t => {
            if (!t.riwayatJabatan || t.riwayatJabatan.length === 0) return false;
            const latestRiwayat = [...t.riwayatJabatan].sort((a, b) => new Date(b.tanggalMulai).getTime() - new Date(a.tanggalMulai).getTime())[0];
            return !latestRiwayat.tanggalSelesai;
        });
    }, [localSettings.tenagaPengajar]);

    const [isExporting, setIsExporting] = useState(false);
    const [isActionOpen, setIsActionOpen] = useState(false);
    const [actionSubmenu, setActionSubmenu] = useState<'none' | 'manual' | 'bulk'>('none');
    const actionRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (actionRef.current && !actionRef.current.contains(e.target as Node)) {
                setIsActionOpen(false);
                setActionSubmenu('none');
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleExportStruktur = async () => {
        setIsExporting(true);
        try {
            const XLSX = await loadXLSX();
            const exportData = localSettings.rombel.map((r, idx) => {
                const parentKelas = localSettings.kelas.find(k => k.id === r.kelasId);
                const parentJenjang = parentKelas ? localSettings.jenjang.find(j => j.id === parentKelas.jenjangId) : undefined;
                const wali = localSettings.tenagaPengajar.find(t => t.id === r.waliKelasId);
                const santriCount = santriList.filter(s => s.rombelId === r.id && s.status === 'Aktif').length;
                const kapasitas = r.kapasitas || 30;

                return {
                    'No': idx + 1,
                    'Jenjang': parentJenjang?.nama || '-',
                    'Kode Jenjang': parentJenjang?.kode || '-',
                    'Tingkat / Kelas': parentKelas?.nama || '-',
                    'Nama Rombel': r.nama,
                    'Wali Kelas': wali?.nama || 'Belum Ditentukan',
                    'Jumlah Santri': santriCount,
                    'Kapasitas': kapasitas,
                    'Sisa Kuota': Math.max(0, kapasitas - santriCount),
                    'Status Kuota': santriCount >= kapasitas ? 'Penuh' : santriCount / kapasitas > 0.8 ? 'Hampir Penuh' : 'Tersedia'
                };
            });

            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.json_to_sheet(exportData);
            XLSX.utils.book_append_sheet(wb, ws, "Struktur Rombel");
            XLSX.writeFile(wb, `Struktur_Pendidikan_${new Date().toISOString().split('T')[0]}.xlsx`);
            showToast('Struktur pendidikan berhasil diekspor ke Excel!', 'success');
        } catch (e) {
            console.error('Export error:', e);
            showToast('Gagal mengekspor struktur pendidikan.', 'error');
        } finally {
            setIsExporting(false);
        }
    };

    const handleCloneRombel = (rombel: Rombel) => {
        const list = [...localSettings.rombel];
        const nextId = list.length > 0 ? Math.max(...list.map(r => r.id)) + 1 : 1;
        const clonedName = `${rombel.nama} (Salinan)`;
        const newRombel: Rombel = {
            ...rombel,
            id: nextId,
            nama: clonedName,
            waliKelasId: undefined
        };
        handleInputChange('rombel', [...list, newRombel]);
        showToast(`Rombel "${clonedName}" berhasil diduplikasi.`, 'success');
    };

    const handleSaveStructureItem = (item: StructureItem) => {
        if (!structureModalData) return;
        const { listName, mode } = structureModalData;
        
        const list = localSettings[listName];
        let updatedList: any[];
        
        if (mode === 'add') {
             const newItem = { ...item, id: list.length > 0 ? Math.max(...list.map((i: any) => i.id)) + 1 : 1 };
             updatedList = [...list, newItem];
        } else {
             updatedList = list.map((i: any) => i.id === item.id ? item : i);
        }

        // SYNC LOGIC: From Rombel to Teacher
        if (listName === 'rombel') {
            const rombel = item as Rombel;
            const teachers = [...localSettings.tenagaPengajar];
            let teachersChanged = false;

            const updatedTeachers = teachers.map(t => {
                const currentJabatan = t.riwayatJabatan || [];
                const matchingJabatanIdx = currentJabatan.findIndex(r => r.jabatan === 'Wali Kelas' && r.rombelId === rombel.id && !r.tanggalSelesai);
                
                // Case 1: This teacher IS now assigned as Wali Kelas for this rombel
                if (t.id === rombel.waliKelasId) {
                    if (matchingJabatanIdx === -1) {
                        // Add new jabatan
                        teachersChanged = true;
                        return {
                            ...t,
                            riwayatJabatan: [...currentJabatan, {
                                id: Date.now(),
                                jabatan: 'Wali Kelas' as any,
                                rombelId: rombel.id,
                                tanggalMulai: new Date().toISOString().split('T')[0]
                            }]
                        };
                    }
                } 
                // Case 2: This teacher WAS Wali Kelas but IS NOT anymore
                else if (matchingJabatanIdx !== -1) {
                    teachersChanged = true;
                    return {
                        ...t,
                        riwayatJabatan: currentJabatan.map((r, idx) => 
                            idx === matchingJabatanIdx ? { ...r, tanggalSelesai: new Date().toISOString().split('T')[0] } : r
                        )
                    };
                }
                
                return t;
            });

            if (teachersChanged) {
                handleInputChange('tenagaPengajar', updatedTeachers);
            }
        }

        handleInputChange(listName, updatedList as any);
        setStructureModalData(null);
    };

    const handleBulkSave = (data: any[]) => {
        if (!bulkMode) return;
        const listName = bulkMode;
        
        const list = [...localSettings[listName]];
        let nextId = list.length > 0 ? Math.max(...list.map((i: any) => i.id)) + 1 : 1;

        data.forEach(item => {
            const isEdit = !!item.id;
            const finalItem = {
                ...item,
                id: isEdit ? item.id : nextId++
            };

            if (isEdit) {
                const idx = list.findIndex((i: any) => i.id === item.id);
                if (idx !== -1) list[idx] = finalItem;
            } else {
                list.push(finalItem);
            }
        });

        // SYNC LOGIC for Rombel updates in bulk
        if (listName === 'rombel') {
            const teachers = [...localSettings.tenagaPengajar];
            let teachersChanged = false;

            data.forEach(rombel => {
                if (rombel.waliKelasId) {
                    const teacherIdx = teachers.findIndex(t => t.id === rombel.waliKelasId);
                    if (teacherIdx !== -1) {
                        const t = teachers[teacherIdx];
                        const currentJabatan = t.riwayatJabatan || [];
                        const hasJabatan = currentJabatan.some(r => r.jabatan === 'Wali Kelas' && r.rombelId === rombel.id && !r.tanggalSelesai);
                        
                        if (!hasJabatan) {
                            teachersChanged = true;
                            teachers[teacherIdx] = {
                                ...t,
                                riwayatJabatan: [...currentJabatan, {
                                    id: Date.now() + Math.random(),
                                    jabatan: 'Wali Kelas' as any,
                                    rombelId: rombel.id,
                                    tanggalMulai: new Date().toISOString().split('T')[0]
                                }]
                            };
                        }
                    }
                }
            });

            if (teachersChanged) {
                handleInputChange('tenagaPengajar', teachers);
            }
        }

        handleInputChange(listName, list as any);
        setBulkMode(null);
        setBulkInitialData(undefined);
        
        // Reset selection for that list
        if (listName === 'jenjang') setSelectedJenjangIds([]);
        if (listName === 'kelas') setSelectedKelasIds([]);
        if (listName === 'rombel') setSelectedRombelIds([]);

        showToast(`Operasi massal pada ${listName} berhasil diterapkan.`, 'success');
    };

    const renderListManager = (
        listName: 'jenjang' | 'kelas' | 'rombel',
        itemName: string,
        parentList?: 'jenjang' | 'kelas'
    ) => {
        const list = localSettings[listName];
        
        const selectionState = listName === 'jenjang' ? selectedJenjangIds : listName === 'kelas' ? selectedKelasIds : selectedRombelIds;
        const setSelectionState = listName === 'jenjang' ? setSelectedJenjangIds : listName === 'kelas' ? setSelectedKelasIds : setSelectedRombelIds;

        const searchQuery = listName === 'jenjang' ? searchJenjang : listName === 'kelas' ? searchKelas : searchRombel;
        const setSearchQuery = listName === 'jenjang' ? setSearchJenjang : listName === 'kelas' ? setSearchKelas : setSearchRombel;

        const filteredList = list.filter((i: any) => {
            if (!searchQuery.trim()) return true;
            const q = searchQuery.toLowerCase();
            return (i.nama || '').toLowerCase().includes(q) || (i.kode || '').toLowerCase().includes(q);
        });

        const getSantriCount = (item: any) => {
            if (listName === 'jenjang') return santriList.filter(s => s.jenjangId === item.id).length;
            if (listName === 'kelas') return santriList.filter(s => s.kelasId === item.id).length;
            if (listName === 'rombel') return santriList.filter(s => s.rombelId === item.id).length;
            return 0;
        };

        const handleBulkDelete = () => {
            if (selectionState.length === 0) return;
            if (listName === 'jenjang') {
                const impactedSantri = santriList.filter(s => selectionState.includes(s.jenjangId)).length;
                if (impactedSantri > 0) {
                    showAlert('Penghapusan Dicegah', `Tidak dapat hapus massal Jenjang. Masih ada ${impactedSantri} santri terkait.`);
                    return;
                }
                const impactedKelas = localSettings.kelas.filter(k => selectionState.includes(k.jenjangId)).length;
                const impactedRombel = localSettings.rombel.filter(r => localSettings.kelas.some(k => selectionState.includes(k.jenjangId) && k.id === r.kelasId)).length;
                const impactedMapel = localSettings.mataPelajaran.filter(m => selectionState.includes(m.jenjangId)).length;
                showConfirmation(
                    `Hapus ${selectionState.length} ${itemName}`,
                    `Dampak: ${impactedKelas} Kelas, ${impactedRombel} Rombel, ${impactedMapel} Mapel akan ikut terhapus. Lanjutkan?`,
                    () => {
                        const kelasIdsToDelete = localSettings.kelas.filter(k => selectionState.includes(k.jenjangId)).map(k => k.id);
                        handleInputChange('jenjang', localSettings.jenjang.filter(j => !selectionState.includes(j.id)) as any);
                        handleInputChange('kelas', localSettings.kelas.filter(k => !selectionState.includes(k.jenjangId)) as any);
                        handleInputChange('rombel', localSettings.rombel.filter(r => !kelasIdsToDelete.includes(r.kelasId)) as any);
                        handleInputChange('mataPelajaran', localSettings.mataPelajaran.filter(m => !selectionState.includes(m.jenjangId)) as any);
                        setSelectionState([]);
                        showToast(`${selectionState.length} data berhasil dihapus.`, 'success');
                    },
                    { confirmColor: 'red' }
                );
                return;
            }

            if (listName === 'kelas') {
                const impactedSantri = santriList.filter(s => selectionState.includes(s.kelasId)).length;
                const impactedRombel = localSettings.rombel.filter(r => selectionState.includes(r.kelasId)).length;
                if (impactedSantri > 0 || impactedRombel > 0) {
                    showAlert('Penghapusan Dicegah', `Tidak dapat hapus massal Kelas. Dampak terdeteksi: ${impactedSantri} santri, ${impactedRombel} rombel.`);
                    return;
                }
            }

            if (listName === 'rombel') {
                const impactedSantri = santriList.filter(s => selectionState.includes(s.rombelId || -1)).length;
                if (impactedSantri > 0) {
                    showAlert('Penghapusan Dicegah', `Tidak dapat hapus massal Rombel. Masih ada ${impactedSantri} santri terkait.`);
                    return;
                }
            }
            showConfirmation(
                `Hapus ${selectionState.length} ${itemName}`,
                `Yakin ingin menghapus ${selectionState.length} data ${itemName} ini secara massal? Tindakan ini tidak dapat dibatalkan.`,
                () => {
                    const newList = list.filter((i: any) => !selectionState.includes(i.id));
                    handleInputChange(listName, newList as any);
                    setSelectionState([]);
                    showToast(`${selectionState.length} data berhasil dihapus.`, 'success');
                },
                { confirmColor: 'red' }
            );
        };

        const handleBulkEdit = () => {
             const selectedItems = list.filter((i: any) => selectionState.includes(i.id));
             setBulkInitialData(selectedItems);
             setBulkMode(listName);
        };

        const toggleSelectAll = () => {
            if (selectionState.length === list.length) {
                setSelectionState([]);
            } else {
                setSelectionState(list.map((i: any) => i.id));
            }
        };

        const toggleSelectOne = (id: number) => {
            if (selectionState.includes(id)) {
                setSelectionState(prev => prev.filter(i => i !== id));
            } else {
                setSelectionState(prev => [...prev, id]);
            }
        };

        const handleRemoveItem = (id: number) => {
            const itemToDelete = list.find((item: any) => item.id === id);
            if (!itemToDelete) return;

            // Integrity checks
            if (listName === 'jenjang') {
                const santriInJenjang = santriList.filter(s => s.jenjangId === id);
                if (santriInJenjang.length > 0) {
                    showAlert('Penghapusan Dicegah', `Tidak dapat menghapus jenjang "${itemToDelete.nama}" karena masih terdaftar ${santriInJenjang.length} santri di dalamnya.`);
                    return;
                }
                showConfirmation(`Hapus ${itemName}`,`Apakah Anda yakin ingin menghapus ${itemName} "${itemToDelete.nama}"? Semua data kelas, rombel, dan mata pelajaran yang terkait akan ikut terhapus.`,
                    () => {
                        const kelasIdsToDelete = localSettings.kelas.filter(k => k.jenjangId === id).map(k => k.id);
                        handleInputChange('jenjang', localSettings.jenjang.filter(item => item.id !== id));
                        handleInputChange('kelas', localSettings.kelas.filter(item => item.jenjangId !== id));
                        handleInputChange('rombel', localSettings.rombel.filter(item => !kelasIdsToDelete.includes(item.kelasId)));
                        handleInputChange('mataPelajaran', localSettings.mataPelajaran.filter(item => item.jenjangId !== id));
                    },
                    { confirmText: 'Ya, Hapus', confirmColor: 'red' }
                );
                return;
            }

            if (listName === 'kelas') {
                const santriInKelas = santriList.filter(s => s.kelasId === id);
                if (santriInKelas.length > 0) {
                    showAlert('Penghapusan Dicegah', `Tidak dapat menghapus kelas "${itemToDelete.nama}" karena masih terdaftar ${santriInKelas.length} santri di dalamnya.`);
                    return;
                }
                if (localSettings.rombel.some(r => r.kelasId === id)) {
                    showAlert('Penghapusan Dicegah', `Tidak dapat menghapus kelas "${itemToDelete.nama}" karena masih digunakan oleh data rombel.`);
                    return;
                }
            }
            
            if (listName === 'rombel') {
                 const santriInRombel = santriList.filter(s => s.rombelId === id);
                 if (santriInRombel.length > 0) {
                     showAlert('Penghapusan Dicegah', `Tidak dapat menghapus rombel "${itemToDelete.nama}" karena masih terdaftar ${santriInRombel.length} santri di dalamnya.`);
                     return;
                 }
            }

            showConfirmation(`Hapus ${itemName}`,`Apakah Anda yakin ingin menghapus ${itemName} "${itemToDelete.nama}"?`,
                () => handleInputChange(listName, list.filter((item: any) => item.id !== id) as any),
                { confirmText: 'Ya, Hapus', confirmColor: 'red' }
            );
        };

        const getAssignmentName = (item: StructureItem) => {
            let teacherId: number | undefined;
            if (listName === 'jenjang') teacherId = (item as Jenjang).mudirId;
            if (listName === 'rombel') teacherId = (item as Rombel).waliKelasId;
            if (!teacherId) return null;

            const teacher = localSettings.tenagaPengajar.find(t => t.id === teacherId);
            return teacher ? teacher.nama : 'Pengajar tidak ditemukan';
        };

        return (
            <div className="mb-4 flex flex-col h-full bg-white border border-gray-100 rounded-xl shadow-sm p-4 overflow-hidden">
                <div className="flex justify-between items-center mb-2">
                    <h3 className="text-md font-bold text-gray-700 capitalize flex items-center gap-2">
                        {listName === 'jenjang' && <i className="bi bi-layers text-teal-600"></i>}
                        {listName === 'kelas' && <i className="bi bi-bar-chart-steps text-teal-600"></i>}
                        {listName === 'rombel' && <i className="bi bi-people text-teal-600"></i>}
                        {itemName}
                        <span className="text-xs font-normal text-gray-400">({list.length})</span>
                    </h3>
                    {selectionState.length > 0 && (
                        <div className="flex items-center gap-2 text-xs">
                            <button onClick={handleBulkEdit} className="text-[10px] bg-blue-50 text-blue-600 px-2 py-1 rounded border border-blue-100 font-bold" title="Edit Massal"><i className="bi bi-pencil-square mr-1"></i> Edit</button>
                            <button onClick={handleBulkDelete} className="text-[10px] bg-red-50 text-red-600 px-2 py-1 rounded border border-red-100 font-bold" title="Hapus Massal"><i className="bi bi-trash"></i></button>
                            <button onClick={() => setSelectionState([])} className="text-[10px] text-gray-400 hover:text-gray-600 underline">Batal</button>
                        </div>
                    )}
                </div>

                {list.length > 3 && (
                    <div className="relative mb-2">
                        <i className="bi bi-search absolute left-2.5 top-2 text-gray-400 text-xs"></i>
                        <input
                            type="text"
                            placeholder={`Cari ${itemName.toLowerCase()}...`}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-7 pr-7 py-1 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500"
                        />
                        {searchQuery && (
                            <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1.5 text-gray-400 hover:text-gray-600 text-xs">
                                <i className="bi bi-x-circle-fill"></i>
                            </button>
                        )}
                    </div>
                )}
                
                <div className="border rounded-lg max-h-64 overflow-y-auto bg-gray-50 flex-grow scrollbar-thin">
                    {filteredList.length > 0 ? (
                        <ul className="divide-y">
                            <li className="bg-gray-100/80 p-1.5 flex items-center sticky top-0 z-10 border-b">
                                <input type="checkbox" checked={filteredList.length > 0 && selectionState.length === filteredList.length} onChange={toggleSelectAll} className="w-3.5 h-3.5 text-teal-600 rounded mr-2 cursor-pointer" />
                                <span className="text-[10px] font-bold text-gray-400 uppercase">Pilih Semua ({filteredList.length})</span>
                            </li>
                            {filteredList.map((item: any) => {
                                const isSelected = selectionState.includes(item.id);
                                const santriCount = getSantriCount(item);
                                const kapasitas = listName === 'rombel' ? ((item as Rombel).kapasitas || 30) : undefined;
                                const isFull = kapasitas ? santriCount >= kapasitas : false;
                                const ratio = kapasitas ? Math.min(100, Math.round((santriCount / kapasitas) * 100)) : 0;

                                return (
                                <li key={item.id} className={`flex justify-between items-center p-2.5 hover:bg-white group transition-colors ${isSelected ? 'bg-teal-50' : ''}`}>
                                    <div className="flex items-center gap-2 min-w-0 flex-1">
                                        <input type="checkbox" checked={isSelected} onChange={() => toggleSelectOne(item.id)} className="w-3.5 h-3.5 text-teal-600 rounded cursor-pointer shrink-0" />
                                        <div className="text-sm min-w-0 flex-1">
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                <p className="font-semibold text-gray-800 truncate">{item.nama}</p>
                                                {(item as Jenjang).kode && <span className="text-[11px] font-mono font-medium text-gray-500 bg-gray-100 px-1 rounded">{(item as Jenjang).kode}</span>}
                                                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold border ${santriCount > 0 ? 'bg-teal-50 text-teal-700 border-teal-200' : 'bg-gray-100 text-gray-400 border-gray-200'}`}>
                                                    {santriCount} santri
                                                </span>
                                                {kapasitas && (
                                                    <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${isFull ? 'bg-rose-50 text-rose-700 border border-rose-200' : ratio > 80 ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-gray-50 text-gray-500'}`}>
                                                        {isFull ? 'Penuh' : `Kuota ${kapasitas}`}
                                                    </span>
                                                )}
                                            </div>
                                            {kapasitas && (
                                                <div className="w-28 bg-gray-200 rounded-full h-1 mt-1 overflow-hidden">
                                                    <div className={`h-full rounded-full transition-all ${isFull ? 'bg-rose-500' : ratio > 80 ? 'bg-amber-500' : 'bg-teal-500'}`} style={{ width: `${ratio}%` }}></div>
                                                </div>
                                            )}
                                            <div className="text-[10px] text-gray-500 flex flex-wrap gap-x-2 mt-0.5">
                                                {parentList && (
                                                    <span>
                                                        Induk: {(() => {
                                                            const parent = localSettings[parentList].find(p => p.id === (item as any)[`${parentList}Id`]);
                                                            let label = parent?.nama || 'N/A';
                                                            if (listName === 'rombel' && parent) {
                                                                const grandParent = localSettings.jenjang.find(j => j.id === (parent as Kelas).jenjangId);
                                                                if (grandParent) label += ` (${grandParent.nama})`;
                                                            }
                                                            return label;
                                                        })()}
                                                    </span>
                                                )}
                                                {getAssignmentName(item) && <span className="text-blue-600 font-medium"><i className="bi bi-person-check mr-1"></i>{getAssignmentName(item)}</span>}
                                            </div>
                                        </div>
                                    </div>
                                    {canWrite && (
                                        <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0 ml-2">
                                             {listName === 'rombel' && (
                                                 <button onClick={() => handleCloneRombel(item as Rombel)} className="text-teal-600 hover:text-teal-800 p-1.5 rounded hover:bg-teal-50" aria-label={`Duplikasi Rombel ${item.nama}`} title="Kloning / Duplikasi Rombel"><i className="bi bi-copy text-xs"></i></button>
                                             )}
                                             <button onClick={() => setStructureModalData({ mode: 'edit', listName, item })} className="text-blue-600 hover:text-blue-800 p-1.5 rounded hover:bg-blue-50" aria-label={`Edit ${itemName} ${item.nama}`} title="Edit"><i className="bi bi-pencil-square text-xs"></i></button>
                                             <button onClick={() => handleRemoveItem(item.id)} className="text-red-500 hover:text-red-700 p-1.5 rounded hover:bg-red-50" aria-label={`Hapus ${itemName} ${item.nama}`} title="Hapus"><i className="bi bi-trash text-xs"></i></button>
                                        </div>
                                    )}
                                </li>
                            )})}
                        </ul>
                    ) : <p className="text-sm text-gray-400 p-4 text-center">{searchQuery ? 'Tidak ada data cocok.' : 'Data kosong.'}</p>}
                </div>
                {canWrite && (
                    <div className="flex gap-2 mt-2">
                         <button onClick={() => setStructureModalData({ mode: 'add', listName })} className="flex-1 text-sm bg-teal-50 text-teal-700 border border-teal-200 hover:bg-teal-100 py-1.5 rounded font-medium"><i className="bi bi-plus"></i> Tambah</button>
                         <button onClick={() => { setBulkInitialData(undefined); setBulkMode(listName); }} className="flex-none px-3 py-1.5 text-sm bg-gray-100 text-gray-600 border border-gray-300 hover:bg-gray-200 rounded font-medium" title="Tambah Banyak (Bulk)"><i className="bi bi-table"></i></button>
                    </div>
                )}
            </div>
        )
    };

    return (
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 border-b pb-4">
                <div>
                    <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                        <i className="bi bi-diagram-3-fill text-teal-600"></i>
                        Struktur Pendidikan
                    </h2>
                    <p className="text-xs text-gray-500 mt-1">Hierarki jenjang, tingkat kelas, serta rombongan belajar (rombel) dan wali kelas.</p>
                </div>
                <div className="relative" ref={actionRef}>
                    <button
                        type="button"
                        onClick={() => {
                            setIsActionOpen(!isActionOpen);
                            setActionSubmenu('none');
                        }}
                        className="text-xs bg-teal-700 hover:bg-teal-800 text-white font-semibold px-3.5 py-2 rounded-lg shadow-xs flex items-center gap-2 transition"
                    >
                        <i className="bi bi-grid-fill"></i>
                        <span>Menu Aksi</span>
                        <i className={`bi bi-chevron-${isActionOpen ? 'up' : 'down'} text-[10px]`}></i>
                    </button>

                    {isActionOpen && (
                        <div className="absolute right-0 mt-1.5 w-60 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-30 animate-fade-in text-xs divide-y divide-gray-100">
                            {canWrite && (
                                <div className="py-1">
                                    {actionSubmenu === 'none' && (
                                        <>
                                            <button
                                                type="button"
                                                onClick={() => setActionSubmenu('manual')}
                                                className="w-full text-left px-3.5 py-2 hover:bg-teal-50 flex items-center justify-between text-gray-700 transition"
                                            >
                                                <div className="flex items-center gap-2.5">
                                                    <i className="bi bi-plus-circle-fill text-teal-600 text-sm"></i>
                                                    <div>
                                                        <span className="font-semibold block text-gray-800">Tambah Manual</span>
                                                        <span className="text-[10px] text-gray-400">Jenjang, kelas, atau rombel</span>
                                                    </div>
                                                </div>
                                                <i className="bi bi-chevron-right text-gray-400 text-[10px]"></i>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setActionSubmenu('bulk')}
                                                className="w-full text-left px-3.5 py-2 hover:bg-teal-50 flex items-center justify-between text-gray-700 transition"
                                            >
                                                <div className="flex items-center gap-2.5">
                                                    <i className="bi bi-table text-indigo-600 text-sm"></i>
                                                    <div>
                                                        <span className="font-semibold block text-gray-800">Tambah Massal</span>
                                                        <span className="text-[10px] text-gray-400">Editor multi baris cepat</span>
                                                    </div>
                                                </div>
                                                <i className="bi bi-chevron-right text-gray-400 text-[10px]"></i>
                                            </button>
                                        </>
                                    )}

                                    {actionSubmenu === 'manual' && (
                                        <div className="space-y-0.5">
                                            <button
                                                type="button"
                                                onClick={() => setActionSubmenu('none')}
                                                className="w-full text-left px-3 py-1.5 text-gray-400 hover:text-gray-700 font-semibold flex items-center gap-1.5 border-b border-gray-100 mb-1"
                                            >
                                                <i className="bi bi-arrow-left"></i> Kembali
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setIsActionOpen(false);
                                                    setActionSubmenu('none');
                                                    setStructureModalData({ mode: 'add', listName: 'jenjang' });
                                                }}
                                                className="w-full text-left px-3.5 py-1.5 hover:bg-teal-50 flex items-center gap-2 text-gray-700"
                                            >
                                                <i className="bi bi-mortarboard text-teal-600"></i>
                                                <span>Tambah Jenjang Pendidikan</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setIsActionOpen(false);
                                                    setActionSubmenu('none');
                                                    setStructureModalData({ mode: 'add', listName: 'kelas' });
                                                }}
                                                className="w-full text-left px-3.5 py-1.5 hover:bg-teal-50 flex items-center gap-2 text-gray-700"
                                            >
                                                <i className="bi bi-collection text-teal-600"></i>
                                                <span>Tambah Tingkat Kelas</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setIsActionOpen(false);
                                                    setActionSubmenu('none');
                                                    setStructureModalData({ mode: 'add', listName: 'rombel' });
                                                }}
                                                className="w-full text-left px-3.5 py-1.5 hover:bg-teal-50 flex items-center gap-2 text-gray-700"
                                            >
                                                <i className="bi bi-people text-teal-600"></i>
                                                <span>Tambah Rombongan Belajar (Rombel)</span>
                                            </button>
                                        </div>
                                    )}

                                    {actionSubmenu === 'bulk' && (
                                        <div className="space-y-0.5">
                                            <button
                                                type="button"
                                                onClick={() => setActionSubmenu('none')}
                                                className="w-full text-left px-3 py-1.5 text-gray-400 hover:text-gray-700 font-semibold flex items-center gap-1.5 border-b border-gray-100 mb-1"
                                            >
                                                <i className="bi bi-arrow-left"></i> Kembali
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setIsActionOpen(false);
                                                    setActionSubmenu('none');
                                                    setBulkInitialData(undefined);
                                                    setBulkMode('jenjang');
                                                }}
                                                className="w-full text-left px-3.5 py-1.5 hover:bg-indigo-50 flex items-center gap-2 text-gray-700"
                                            >
                                                <i className="bi bi-table text-indigo-600"></i>
                                                <span>Massal: Jenjang Pendidikan</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setIsActionOpen(false);
                                                    setActionSubmenu('none');
                                                    setBulkInitialData(undefined);
                                                    setBulkMode('kelas');
                                                }}
                                                className="w-full text-left px-3.5 py-1.5 hover:bg-indigo-50 flex items-center gap-2 text-gray-700"
                                            >
                                                <i className="bi bi-table text-indigo-600"></i>
                                                <span>Massal: Tingkat Kelas</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setIsActionOpen(false);
                                                    setActionSubmenu('none');
                                                    setBulkInitialData(undefined);
                                                    setBulkMode('rombel');
                                                }}
                                                className="w-full text-left px-3.5 py-1.5 hover:bg-indigo-50 flex items-center gap-2 text-gray-700"
                                            >
                                                <i className="bi bi-table text-indigo-600"></i>
                                                <span>Massal: Rombongan Belajar</span>
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}

                            {actionSubmenu === 'none' && (
                                <div className="py-1">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsActionOpen(false);
                                            handleExportStruktur();
                                        }}
                                        disabled={isExporting || localSettings.rombel.length === 0}
                                        className="w-full text-left px-3.5 py-2 hover:bg-emerald-50 flex items-center gap-2.5 text-gray-700 transition disabled:opacity-50"
                                    >
                                        <i className="bi bi-file-earmark-excel-fill text-emerald-600 text-sm"></i>
                                        <div>
                                            <span className="font-semibold block text-emerald-800">Ekspor Excel</span>
                                            <span className="text-[10px] text-gray-400">Unduh struktur rombel (.xlsx)</span>
                                        </div>
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {renderListManager('jenjang', 'Jenjang Pendidikan')}
                {renderListManager('kelas', 'Kelas', 'jenjang')}
                {renderListManager('rombel', 'Rombel', 'kelas')}
            </div>
            
            {structureModalData && <StructureModal isOpen={!!structureModalData} onClose={() => setStructureModalData(null)} onSave={handleSaveStructureItem} modalData={structureModalData} activeTeachers={activeTeachers} />}
            
            {bulkMode && (
                <BulkMasterEditor 
                    isOpen={!!bulkMode} 
                    onClose={() => setBulkMode(null)} 
                    mode={bulkMode}
                    settings={localSettings}
                    onSave={handleBulkSave}
                    initialData={bulkInitialData}
                />
            )}
        </div>
    );
};
