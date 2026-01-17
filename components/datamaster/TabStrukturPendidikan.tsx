
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
        if (mode === 'add') {
             const newItem = { ...item, id: list.length > 0 ? Math.max(...list.map((i: any) => i.id)) + 1 : 1 };
             handleInputChange(listName, [...list, newItem] as any);
        } else {
             handleInputChange(listName, list.map((i: any) => i.id === item.id ? item : i) as any);
        }
        setStructureModalData(null);
    };

    const handleBulkSave = (data: any[]) => {
        if (!bulkMode) return;
        const listName = bulkMode;
        
        const list = localSettings[listName];
        let nextId = list.length > 0 ? Math.max(...list.map((i: any) => i.id)) + 1 : 1;

        const newItems = data.map(item => {
            return {
                ...item,
                id: nextId++
            };
        });

        handleInputChange(listName, [...list, ...newItems] as any);
        setBulkMode(null);
        showToast(`${newItems.length} data berhasil ditambahkan ke ${listName}.`, 'success');
    };

    const renderListManager = (
        listName: 'jenjang' | 'kelas' | 'rombel',
        itemName: string,
        parentList?: 'jenjang' | 'kelas'
    ) => {
        const list = localSettings[listName];
        
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
            <div className="mb-4 flex flex-col h-full">
                <h3 className="text-lg font-semibold text-gray-700 mb-2 capitalize flex items-center gap-2">
                    {listName === 'jenjang' && <i className="bi bi-layers text-teal-600"></i>}
                    {listName === 'kelas' && <i className="bi bi-bar-chart-steps text-teal-600"></i>}
                    {listName === 'rombel' && <i className="bi bi-people text-teal-600"></i>}
                    {itemName}
                </h3>
                <div className="border rounded-lg max-h-60 overflow-y-auto bg-gray-50 flex-grow">
                    {list.length > 0 ? (
                        <ul className="divide-y">
                            {list.map((item: any) => (
                                <li key={item.id} className="flex justify-between items-center p-2 hover:bg-white group transition-colors">
                                    <div className="text-sm">
                                        <p className="font-medium">{item.nama} {(item as Jenjang).kode && <span className="font-normal text-gray-500">({(item as Jenjang).kode})</span>}</p>
                                        <div className="text-xs text-gray-500 space-x-2">
                                            {parentList && (
                                                <span>
                                                    Induk: {(() => {
                                                        const parent = localSettings[parentList].find(p => p.id === (item as any)[`${parentList}Id`]);
                                                        let label = parent?.nama || 'N/A';
                                                        // Jika Rombel, tampilkan jenjang dari induk kelasnya
                                                        if (listName === 'rombel' && parent) {
                                                            const grandParent = localSettings.jenjang.find(j => j.id === (parent as Kelas).jenjangId);
                                                            if (grandParent) label += ` (${grandParent.nama})`;
                                                        }
                                                        return label;
                                                    })()}
                                                </span>
                                            )}
                                            {getAssignmentName(item) && <span className="text-blue-600"><i className="bi bi-person-check mr-1"></i>{getAssignmentName(item)}</span>}
                                        </div>
                                    </div>
                                    {canWrite && (
                                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                             <button onClick={() => setStructureModalData({ mode: 'edit', listName, item })} className="text-blue-500 hover:text-blue-700 text-xs" aria-label={`Edit ${itemName} ${item.nama}`}><i className="bi bi-pencil-square"></i></button>
                                             <button onClick={() => handleRemoveItem(item.id)} className="text-red-500 hover:text-red-700 text-xs" aria-label={`Hapus ${itemName} ${item.nama}`}><i className="bi bi-trash"></i></button>
                                        </div>
                                    )}
                                </li>
                            ))}
                        </ul>
                    ) : <p className="text-sm text-gray-400 p-3 text-center">Data kosong.</p>}
                </div>
                {canWrite && (
                    <div className="flex gap-2 mt-2">
                         <button onClick={() => setStructureModalData({ mode: 'add', listName })} className="flex-1 text-sm bg-teal-50 text-teal-700 border border-teal-200 hover:bg-teal-100 py-1.5 rounded font-medium"><i className="bi bi-plus"></i> Tambah</button>
                         <button onClick={() => setBulkMode(listName)} className="flex-none px-3 py-1.5 text-sm bg-gray-100 text-gray-600 border border-gray-300 hover:bg-gray-200 rounded font-medium" title="Tambah Banyak (Bulk)"><i className="bi bi-table"></i></button>
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
                />
            )}
        </div>
    );
};
