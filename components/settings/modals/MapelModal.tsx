import React, { useState, useEffect } from 'react';
import { MataPelajaran } from '../../../types';
import { useAppContext } from '../../../AppContext';

interface MapelModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (item: MataPelajaran) => void;
    modalData: {
        mode: 'add' | 'edit';
        jenjangId: number;
        item?: MataPelajaran;
    };
}

export const MapelModal: React.FC<MapelModalProps> = ({ isOpen, onClose, onSave, modalData }) => {
    const { showAlert } = useAppContext();
    const { mode, jenjangId, item } = modalData;
    const [nama, setNama] = useState('');

    useEffect(() => {
        if (isOpen) {
            setNama(item?.nama || '');
        }
    }, [isOpen, item]);

    if (!isOpen) return null;

    const handleSave = () => {
        if (!nama.trim()) {
            showAlert('Input Tidak Lengkap', 'Nama mata pelajaran tidak boleh kosong.');
            return;
        }
        
        const newItem: MataPelajaran = {
            id: item?.id || Date.now(),
            nama: nama.trim(),
            jenjangId: jenjangId
        };
        
        onSave(newItem);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
                <div className="p-5 border-b"><h3 className="text-lg font-semibold text-gray-800">{mode === 'add' ? 'Tambah' : 'Edit'} Mata Pelajaran</h3></div>
                <div className="p-5 space-y-4">
                    <div>
                        <label className="block mb-1 text-sm font-medium text-gray-700">Nama Mata Pelajaran</label>
                        <input type="text" value={nama} onChange={(e) => setNama(e.target.value)} autoFocus className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-teal-500 focus:border-teal-500 block w-full p-2.5" />
                    </div>
                </div>
                <div className="p-4 border-t flex justify-end space-x-2">
                    <button onClick={onClose} type="button" className="text-gray-500 bg-white hover:bg-gray-100 focus:ring-4 focus:outline-none focus:ring-blue-300 rounded-lg border border-gray-200 text-sm font-medium px-5 py-2.5 hover:text-gray-900 focus:z-10">Batal</button>
                    <button onClick={handleSave} type="button" className="text-white bg-teal-700 hover:bg-teal-800 focus:ring-4 focus:outline-none focus:ring-teal-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center">Simpan</button>
                </div>
            </div>
        </div>
    );
}
