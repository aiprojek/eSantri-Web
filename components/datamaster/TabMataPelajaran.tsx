
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
        const list = localSettings.mataPelajaran;
        let nextId = list.length > 0 ? Math.max(...list.map(m => m.id)) + 1 : 1;
        
        const newItems: MataPelajaran[] = data.map(item => ({
            id: nextId++,
            nama: item.nama,
            jenjangId: item.jenjangId
        }));

        handleInputChange('mataPelajaran', [...list, ...newItems]);
        setIsBulkOpen(false);
        showToast(`${newItems.length} mata pelajaran berhasil ditambahkan.`, 'success');
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
            <div className="flex justify-between items-center mb-4 border-b pb-2">
                <h2 className="text-xl font-bold text-gray-700">Mata Pelajaran per Jenjang</h2>
                {canWrite && <button onClick={() => setIsBulkOpen(true)} className="text-sm bg-teal-600 text-white hover:bg-teal-700 px-3 py-1.5 rounded flex items-center gap-2"><i className="bi bi-table"></i> Tambah Massal (Semua Jenjang)</button>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {localSettings.jenjang.map(jenjang => {
                    const mapelList = localSettings.mataPelajaran.filter(m => m.jenjangId === jenjang.id);
                    return (
                    <div key={jenjang.id} className="p-4 border border-gray-200 rounded-lg bg-gray-50/50">
                        <div className="flex items-center gap-2 mb-3">
                            <i className="bi bi-book text-teal-600"></i>
                            <h3 className="text-md font-bold text-gray-800">{jenjang.nama}</h3>
                        </div>
                        <div className="border bg-white rounded-lg max-h-60 overflow-y-auto">
                            {mapelList.length > 0 ? (
                                <ul className="divide-y">
                                    {mapelList.map(mapel => (
                                        <li key={mapel.id} className="flex justify-between items-center p-2 hover:bg-gray-50 group transition-colors">
                                            <p className="text-sm text-gray-700">{mapel.nama}</p>
                                            {canWrite && (
                                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => setMapelModalData({ mode: 'edit', jenjangId: jenjang.id, item: mapel })} className="text-blue-500 hover:text-blue-700 text-xs" aria-label={`Edit mata pelajaran ${mapel.nama}`}><i className="bi bi-pencil-square"></i></button>
                                                    <button onClick={() => showConfirmation('Hapus Mata Pelajaran', `Yakin ingin menghapus ${mapel.nama}?`, () => handleInputChange('mataPelajaran', localSettings.mataPelajaran.filter(m => m.id !== mapel.id)), {confirmColor:'red'})} className="text-red-500 hover:text-red-700 text-xs" aria-label={`Hapus mata pelajaran ${mapel.nama}`}><i className="bi bi-trash"></i></button>
                                                </div>
                                            )}
                                        </li>
                                    ))}
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
            />
        </div>
    );
};
