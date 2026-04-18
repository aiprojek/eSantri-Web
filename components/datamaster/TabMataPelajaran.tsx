
import React, { useState } from 'react';
import { PondokSettings, MataPelajaran } from '../../types';
import { useAppContext } from '../../AppContext';
import { MapelModal } from '../settings/modals/MapelModal';
import { BulkMasterEditor } from './modals/BulkMasterEditor';

interface TabMataPelajaranProps {
    localSettings: PondokSettings;
    handleInputChange: <K extends keyof PondokSettings>(key: K, value: PondokSettings[K]) => void;
    canWrite: boolean;
}

export const TabMataPelajaran: React.FC<TabMataPelajaranProps> = ({ localSettings, handleInputChange, canWrite }) => {
    const { showConfirmation, showToast } = useAppContext();
    const [mapelModalData, setMapelModalData] = useState<{
        mode: 'add' | 'edit';
        jenjangId: number;
        item?: MataPelajaran;
    } | null>(null);

    const [isBulkOpen, setIsBulkOpen] = useState(false);
    const [bulkInitialData, setBulkInitialData] = useState<any[] | undefined>(undefined);
    const [selectedIds, setSelectedIds] = useState<number[]>([]);

    const handleBulkDelete = () => {
        if (selectedIds.length === 0) return;
        showConfirmation(
            `Hapus ${selectedIds.length} Mata Pelajaran`,
            `Apakah Anda yakin ingin menghapus ${selectedIds.length} mata pelajaran yang terpilih?`,
            () => {
                const newList = localSettings.mataPelajaran.filter(m => !selectedIds.includes(m.id));
                handleInputChange('mataPelajaran', newList);
                setSelectedIds([]);
                showToast(`${selectedIds.length} mata pelajaran berhasil dihapus.`, 'success');
            },
            { confirmColor: 'red' }
        );
    };

    const handleBulkEditMapel = () => {
        const selected = localSettings.mataPelajaran.filter(m => selectedIds.includes(m.id));
        setBulkInitialData(selected);
        setIsBulkOpen(true);
    };

    const toggleSelectAll = (ids: number[]) => {
        const allSelected = ids.every(id => selectedIds.includes(id));
        if (allSelected) {
            setSelectedIds(prev => prev.filter(id => !ids.includes(id)));
        } else {
            setSelectedIds(prev => Array.from(new Set([...prev, ...ids])));
        }
    };

    const toggleSelectOne = (id: number) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(prev => prev.filter(i => i !== id));
        } else {
            setSelectedIds(prev => [...prev, id]);
        }
    };

    const handleSaveMapel = (mapel: MataPelajaran) => {
        if (!mapelModalData) return;
        const { mode } = mapelModalData;

        const list = localSettings.mataPelajaran;
        if (mode === 'add') {
            const newItem = { ...mapel, id: list.length > 0 ? Math.max(...list.map(m => m.id)) + 1 : 1 };
            handleInputChange('mataPelajaran', [...list, newItem]);
        } else {
            handleInputChange('mataPelajaran', list.map(m => m.id === mapel.id ? mapel : m));
        }
        setMapelModalData(null);
    };

    const handleBulkSaveMapel = (data: any[]) => {
        const list = [...localSettings.mataPelajaran];
        let nextId = list.length > 0 ? Math.max(...list.map(m => m.id)) + 1 : 1;
        
        data.forEach(item => {
            const isEdit = !!item.id;
            const mapelData: MataPelajaran = {
                id: isEdit ? item.id : nextId++,
                nama: item.nama,
                jenjangId: item.jenjangId,
                kkm: item.kkm ? parseInt(item.kkm) : undefined,
                modul: item.modul,
                linkUnduh: item.linkUnduh,
                linkPembelian: item.linkPembelian
            };

            if (isEdit) {
                const idx = list.findIndex(m => m.id === item.id);
                if (idx !== -1) list[idx] = mapelData;
            } else {
                list.push(mapelData);
            }
        });

        handleInputChange('mataPelajaran', list);
        setIsBulkOpen(false);
        setBulkInitialData(undefined);
        setSelectedIds([]);
        showToast(`Operasi massal mata pelajaran berhasil.`, 'success');
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
            <div className="flex justify-between items-center mb-4 border-b pb-2">
                <div className="flex items-center gap-4">
                    <h2 className="text-xl font-bold text-gray-700">Mata Pelajaran per Jenjang</h2>
                    {selectedIds.length > 0 && (
                        <div className="flex items-center gap-3 animate-fade-in pl-4 border-l">
                            <span className="text-xs font-bold text-teal-700 bg-teal-50 px-2 py-1 rounded border border-teal-100">{selectedIds.length} dipilih</span>
                            <button onClick={() => setSelectedIds([])} className="text-xs text-gray-400 hover:text-gray-600 underline">Batal</button>
                            <button onClick={handleBulkEditMapel} className="text-xs bg-blue-50 text-blue-600 hover:bg-blue-100 px-2 py-1 rounded border border-blue-200 font-bold"><i className="bi bi-pencil-square mr-1"></i> Edit Massal</button>
                            <button onClick={handleBulkDelete} className="text-xs bg-red-50 text-red-600 hover:bg-red-100 px-2 py-1 rounded border border-red-200 font-bold"><i className="bi bi-trash mr-1"></i> Hapus Massal</button>
                        </div>
                    )}
                </div>
                {canWrite && <button onClick={() => { setBulkInitialData(undefined); setIsBulkOpen(true); }} className="text-sm bg-teal-600 text-white hover:bg-teal-700 px-3 py-1.5 rounded flex items-center gap-2"><i className="bi bi-table"></i> Tambah Massal (Semua Jenjang)</button>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {localSettings.jenjang.map(jenjang => {
                    const mapelList = localSettings.mataPelajaran.filter(m => m.jenjangId === jenjang.id);
                    const mapelIds = mapelList.map(m => m.id);
                    const isAllSelected = mapelIds.length > 0 && mapelIds.every(id => selectedIds.includes(id));

                    return (
                    <div key={jenjang.id} className="p-4 border border-gray-200 rounded-lg bg-gray-50/50">
                        <div className="flex justify-between items-center mb-3">
                            <div className="flex items-center gap-2">
                                <i className="bi bi-book text-teal-600"></i>
                                <h3 className="text-md font-bold text-gray-800">{jenjang.nama}</h3>
                            </div>
                            {mapelList.length > 0 && (
                                <label className="flex items-center gap-2 text-[10px] text-gray-500 cursor-pointer">
                                    <input type="checkbox" checked={isAllSelected} onChange={() => toggleSelectAll(mapelIds)} className="w-3.5 h-3.5 text-teal-600 rounded" />
                                    Pilih Semua
                                </label>
                            )}
                        </div>
                        <div className="border bg-white rounded-lg max-h-60 overflow-y-auto">
                            {mapelList.length > 0 ? (
                                <ul className="divide-y">
                                    {mapelList.map(mapel => {
                                        const isSelected = selectedIds.includes(mapel.id);
                                        return (
                                        <li key={mapel.id} className={`flex justify-between items-center p-3 hover:bg-gray-50 group transition-colors ${isSelected ? 'bg-teal-50' : ''}`}>
                                            <div className="flex items-center gap-3">
                                                <input type="checkbox" checked={isSelected} onChange={() => toggleSelectOne(mapel.id)} className="w-4 h-4 text-teal-600 rounded cursor-pointer" />
                                                <div>
                                                    <p className="text-sm font-semibold text-gray-800">{mapel.nama}</p>
                                                    <div className="flex gap-3 mt-1">
                                                        {mapel.kkm && <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded border border-blue-100 font-medium">KKM: {mapel.kkm}</span>}
                                                        {mapel.modul && <span className="text-[10px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded border border-indigo-100 font-medium"><i className="bi bi-book mr-1"></i>{mapel.modul}</span>}
                                                    </div>
                                                </div>
                                            </div>
                                            {canWrite && (
                                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => setMapelModalData({ mode: 'edit', jenjangId: jenjang.id, item: mapel })} className="text-blue-500 hover:text-blue-700 text-xs" aria-label={`Edit mata pelajaran ${mapel.nama}`}><i className="bi bi-pencil-square"></i></button>
                                                    <button onClick={() => showConfirmation('Hapus Mata Pelajaran', `Yakin ingin menghapus ${mapel.nama}?`, () => handleInputChange('mataPelajaran', localSettings.mataPelajaran.filter(m => m.id !== mapel.id)), {confirmColor:'red'})} className="text-red-500 hover:text-red-700 text-xs" aria-label={`Hapus mata pelajaran ${mapel.nama}`}><i className="bi bi-trash"></i></button>
                                                </div>
                                            )}
                                        </li>
                                    )})}
                                </ul>
                            ) : <p className="text-sm text-gray-400 p-4 text-center italic">Belum ada mata pelajaran.</p>}
                        </div>
                            {canWrite && (
                                <div className="flex gap-2 mt-3">
                                    <button onClick={() => setMapelModalData({ mode: 'add', jenjangId: jenjang.id })} className="flex-1 text-sm text-white bg-teal-600 hover:bg-teal-700 px-3 py-1.5 rounded flex items-center justify-center gap-2 transition-colors"><i className="bi bi-plus-lg"></i> Tambah</button>
                                </div>
                            )}
                    </div>
                    )
                })}
            </div>
            {localSettings.jenjang.length === 0 && (
                <div className="text-center py-8 bg-yellow-50 rounded-lg border border-yellow-100 text-yellow-800">
                    <i className="bi bi-exclamation-circle text-2xl mb-2 block"></i>
                    <p>Silakan tambah <strong>Jenjang Pendidikan</strong> terlebih dahulu di tab Struktur Pendidikan.</p>
                </div>
            )}
            
            {mapelModalData && <MapelModal isOpen={!!mapelModalData} onClose={() => setMapelModalData(null)} onSave={handleSaveMapel} modalData={mapelModalData} />}
            
            <BulkMasterEditor 
                isOpen={isBulkOpen} 
                onClose={() => setIsBulkOpen(false)} 
                mode="mapel"
                settings={localSettings}
                onSave={handleBulkSaveMapel}
                initialData={bulkInitialData}
            />
        </div>
    );
};
