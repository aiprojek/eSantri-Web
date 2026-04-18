
import React, { useState, useMemo } from 'react';
import { PondokSettings, Jenjang, Kelas, Rombel } from '../../types';
import { useAppContext } from '../../AppContext';
import { useSantriContext } from '../../contexts/SantriContext';
import { StructureModal } from '../settings/modals/StructureModal';
import { BulkMasterEditor } from './modals/BulkMasterEditor';

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

    // Calculate active teachers for dropdowns (Mudir, Wali Kelas)
    const activeTeachers = useMemo(() => {
        return localSettings.tenagaPengajar.filter(t => {
            if (!t.riwayatJabatan || t.riwayatJabatan.length === 0) return false;
            const latestRiwayat = [...t.riwayatJabatan].sort((a, b) => new Date(b.tanggalMulai).getTime() - new Date(a.tanggalMulai).getTime())[0];
            return !latestRiwayat.tanggalSelesai;
        });
    }, [localSettings.tenagaPengajar]);

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

        const handleBulkDelete = () => {
            if (selectionState.length === 0) return;
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
                <div className="flex justify-between items-center mb-3">
                    <h3 className="text-md font-bold text-gray-700 capitalize flex items-center gap-2">
                        {listName === 'jenjang' && <i className="bi bi-layers text-teal-600"></i>}
                        {listName === 'kelas' && <i className="bi bi-bar-chart-steps text-teal-600"></i>}
                        {listName === 'rombel' && <i className="bi bi-people text-teal-600"></i>}
                        {itemName}
                    </h3>
                    {selectionState.length > 0 && (
                        <div className="flex items-center gap-2 text-xs">
                            <button onClick={handleBulkEdit} className="text-[10px] bg-blue-50 text-blue-600 px-2 py-1 rounded border border-blue-100 font-bold" title="Edit Massal"><i className="bi bi-pencil-square mr-1"></i> Edit</button>
                            <button onClick={handleBulkDelete} className="text-[10px] bg-red-50 text-red-600 px-2 py-1 rounded border border-red-100 font-bold" title="Hapus Massal"><i className="bi bi-trash"></i></button>
                            <button onClick={() => setSelectionState([])} className="text-[10px] text-gray-400 hover:text-gray-600 underline">Batal</button>
                        </div>
                    )}
                </div>
                
                <div className="border rounded-lg max-h-60 overflow-y-auto bg-gray-50 flex-grow scrollbar-thin">
                    {list.length > 0 ? (
                        <ul className="divide-y">
                            <li className="bg-gray-100/80 p-1.5 flex items-center sticky top-0 z-10 border-b">
                                <input type="checkbox" checked={list.length > 0 && selectionState.length === list.length} onChange={toggleSelectAll} className="w-3.5 h-3.5 text-teal-600 rounded mr-2 cursor-pointer" />
                                <span className="text-[10px] font-bold text-gray-400 uppercase">Pilih Semua</span>
                            </li>
                            {list.map((item: any) => {
                                const isSelected = selectionState.includes(item.id);
                                return (
                                <li key={item.id} className={`flex justify-between items-center p-2 hover:bg-white group transition-colors ${isSelected ? 'bg-teal-50' : ''}`}>
                                    <div className="flex items-center gap-2">
                                        <input type="checkbox" checked={isSelected} onChange={() => toggleSelectOne(item.id)} className="w-3.5 h-3.5 text-teal-600 rounded cursor-pointer" />
                                        <div className="text-sm">
                                            <p className="font-medium">{item.nama} {(item as Jenjang).kode && <span className="font-normal text-gray-500">({(item as Jenjang).kode})</span>}</p>
                                            <div className="text-[10px] text-gray-500 flex flex-wrap gap-x-2">
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
                                        <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                             <button onClick={() => setStructureModalData({ mode: 'edit', listName, item })} className="text-blue-500 hover:text-blue-700 p-1 rounded hover:bg-blue-50" aria-label={`Edit ${itemName} ${item.nama}`}><i className="bi bi-pencil-square"></i></button>
                                             <button onClick={() => handleRemoveItem(item.id)} className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50" aria-label={`Hapus ${itemName} ${item.nama}`}><i className="bi bi-trash"></i></button>
                                        </div>
                                    )}
                                </li>
                            )})}
                        </ul>
                    ) : <p className="text-sm text-gray-400 p-3 text-center">Data kosong.</p>}
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
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
            <h2 className="text-xl font-bold text-gray-700 mb-6 border-b pb-2">Struktur Pendidikan</h2>
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
