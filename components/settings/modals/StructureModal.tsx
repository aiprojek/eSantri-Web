// FIX: Cannot find name 'useMemo'. Import `useMemo` from 'react'.
import React, { useState, useEffect, useMemo } from 'react';
import { Jenjang, Kelas, Rombel, TenagaPengajar } from '../../../types';
import { useAppContext } from '../../../AppContext';

type StructureItem = Jenjang | Kelas | Rombel;

interface StructureModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (item: StructureItem) => void;
    modalData: {
        mode: 'add' | 'edit';
        listName: 'jenjang' | 'kelas' | 'rombel';
        item?: StructureItem;
    };
    activeTeachers: TenagaPengajar[];
}

export const StructureModal: React.FC<StructureModalProps> = ({ isOpen, onClose, onSave, modalData, activeTeachers }) => {
    const { settings, showAlert } = useAppContext();
    const { mode, listName, item } = modalData;
    const [nama, setNama] = useState('');
    const [kode, setKode] = useState('');
    const [parentId, setParentId] = useState('');
    const [assignmentId, setAssignmentId] = useState('');
    
    const parentList = useMemo(() => listName === 'kelas' ? 'jenjang' : listName === 'rombel' ? 'kelas' : null, [listName]);
    
    useEffect(() => {
        if (isOpen) {
            setNama(item?.nama || '');
            setKode(listName === 'jenjang' && 'kode' in (item || {}) ? (item as Jenjang).kode || '' : '');
            
            let initialParentId = '';
            if (listName === 'kelas' && 'jenjangId' in (item || {})) initialParentId = (item as Kelas).jenjangId.toString();
            else if (listName === 'rombel' && 'kelasId' in (item || {})) initialParentId = (item as Rombel).kelasId.toString();
            else if (parentList && settings[parentList].length > 0) initialParentId = settings[parentList][0].id.toString();
            setParentId(initialParentId);

            let initialAssignmentId = '';
            if (listName === 'jenjang' && 'mudirId' in (item || {})) initialAssignmentId = (item as Jenjang).mudirId?.toString() || '';
            else if (listName === 'rombel' && 'waliKelasId' in (item || {})) initialAssignmentId = (item as Rombel).waliKelasId?.toString() || '';
            setAssignmentId(initialAssignmentId);
        }
    }, [isOpen, item, listName, parentList, settings]);

    if (!isOpen) return null;

    const title = `${mode === 'add' ? 'Tambah' : 'Edit'} ${listName.charAt(0).toUpperCase() + listName.slice(1)}`;

    const handleSave = () => {
        if (!nama.trim()) {
            showAlert('Input Tidak Lengkap', 'Nama tidak boleh kosong.');
            return;
        }
        if (listName === 'jenjang' && !kode.trim()) {
            showAlert('Input Tidak Lengkap', 'Kode Jenjang tidak boleh kosong.');
            return;
        }
        if (parentList && !parentId) {
            showAlert('Input Tidak Lengkap', `Induk ${parentList} harus dipilih.`);
            return;
        }

        let newItem: StructureItem;
        const baseItem = {
            id: item?.id || Date.now(),
            nama: nama,
        };
        if (listName === 'kelas') newItem = { ...baseItem, jenjangId: parseInt(parentId, 10) };
        else if (listName === 'rombel') newItem = { ...baseItem, kelasId: parseInt(parentId, 10), waliKelasId: assignmentId ? parseInt(assignmentId) : undefined };
        else if (listName === 'jenjang') newItem = { ...baseItem, kode: kode, mudirId: assignmentId ? parseInt(assignmentId) : undefined };
        else newItem = baseItem;
        
        onSave(newItem);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
                <div className="p-5 border-b"><h3 className="text-lg font-semibold text-gray-800">{title}</h3></div>
                <div className="p-5 space-y-4">
                    <div>
                        <label className="block mb-1 text-sm font-medium text-gray-700">Nama</label>
                        <input type="text" value={nama} onChange={(e) => setNama(e.target.value)} autoFocus className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-teal-500 focus:border-teal-500 block w-full p-2.5" />
                    </div>
                    {listName === 'jenjang' && (
                        <div>
                            <label className="block mb-1 text-sm font-medium text-gray-700">Kode Jenjang (cth: SW)</label>
                            <input 
                                type="text" 
                                value={kode} 
                                onChange={(e) => setKode(e.target.value.toUpperCase())} 
                                maxLength={4}
                                className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-teal-500 focus:border-teal-500 block w-full p-2.5" 
                            />
                        </div>
                    )}
                    {parentList && (
                        <div>
                            <label className="block mb-1 text-sm font-medium text-gray-700">Induk {parentList}</label>
                            <select value={parentId} onChange={(e) => setParentId(e.target.value)} className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-teal-500 focus:border-teal-500 block w-full p-2.5">
                                {settings[parentList].map(p => <option key={p.id} value={p.id}>{p.nama}</option>)}
                            </select>
                        </div>
                    )}
                     {(listName === 'jenjang' || listName === 'rombel') && (
                        <div>
                            <label className="block mb-1 text-sm font-medium text-gray-700">{listName === 'jenjang' ? 'Mudir Marhalah' : 'Wali Kelas'}</label>
                            <select value={assignmentId} onChange={(e) => setAssignmentId(e.target.value)} className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-teal-500 focus:border-teal-500 block w-full p-2.5">
                                <option value="">-- Tidak Ditugaskan --</option>
                                {activeTeachers.map(t => <option key={t.id} value={t.id}>{t.nama}</option>)}
                            </select>
                        </div>
                    )}
                </div>
                <div className="p-4 border-t flex justify-end space-x-2">
                    <button onClick={onClose} type="button" className="text-gray-500 bg-white hover:bg-gray-100 focus:ring-4 focus:outline-none focus:ring-blue-300 rounded-lg border border-gray-200 text-sm font-medium px-5 py-2.5 hover:text-gray-900 focus:z-10">Batal</button>
                    <button onClick={handleSave} type="button" className="text-white bg-teal-700 hover:bg-teal-800 focus:ring-4 focus:outline-none focus:ring-teal-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center">Simpan</button>
                </div>
            </div>
        </div>
    );
}