import React, { useState, useEffect } from 'react';
import { TenagaPengajar, RiwayatJabatan } from '../../../types';
import { useAppContext } from '../../../AppContext';

interface TeacherModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (teacher: TenagaPengajar) => void;
    modalData: {
        mode: 'add' | 'edit';
        item?: TenagaPengajar;
    };
}

export const TeacherModal: React.FC<TeacherModalProps> = ({ isOpen, onClose, onSave, modalData }) => {
    const { showAlert } = useAppContext();
    const { mode, item } = modalData;
    const [teacher, setTeacher] = useState<Partial<TenagaPengajar>>({});

    useEffect(() => {
        if (isOpen) {
            setTeacher(item || {
                nama: '',
                riwayatJabatan: [{ id: Date.now(), jabatan: '', tanggalMulai: new Date().toISOString().split('T')[0] }]
            });
        }
    }, [isOpen, item]);

    if (!isOpen) return null;

    const handleTeacherChange = <K extends keyof TenagaPengajar>(key: K, value: TenagaPengajar[K]) => {
        setTeacher(prev => ({ ...prev, [key]: value }));
    };

    const handleRiwayatChange = (index: number, field: keyof RiwayatJabatan, value: string) => {
        const updatedRiwayat = [...(teacher.riwayatJabatan || [])];
        updatedRiwayat[index] = { ...updatedRiwayat[index], [field]: value };
        handleTeacherChange('riwayatJabatan', updatedRiwayat);
    }

    const addRiwayat = () => {
        const newRiwayat: RiwayatJabatan = {
            id: Date.now(),
            jabatan: '',
            tanggalMulai: new Date().toISOString().split('T')[0],
        };
        handleTeacherChange('riwayatJabatan', [...(teacher.riwayatJabatan || []), newRiwayat]);
    }

    const removeRiwayat = (index: number) => {
        const updatedRiwayat = (teacher.riwayatJabatan || []).filter((_, i) => i !== index);
        handleTeacherChange('riwayatJabatan', updatedRiwayat);
    }

    const handleSave = () => {
        if (!teacher.nama?.trim()) {
            showAlert('Input Tidak Lengkap', 'Nama tenaga pendidik tidak boleh kosong.');
            return;
        }
        
        const teacherToSave = {
            id: item?.id || Date.now(),
            nama: teacher.nama,
            riwayatJabatan: teacher.riwayatJabatan || [],
        };
        onSave(teacherToSave);
    }
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-start p-4 overflow-y-auto">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl my-8">
                <div className="p-5 border-b flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-gray-800">{mode === 'add' ? 'Tambah' : 'Edit'} Tenaga Pendidik</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600" aria-label="Tutup modal"><i className="bi bi-x-lg"></i></button>
                </div>
                <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
                     <div>
                        <label className="block mb-1 text-sm font-medium text-gray-700">Nama Lengkap</label>
                        <input type="text" value={teacher.nama || ''} onChange={(e) => handleTeacherChange('nama', e.target.value)} autoFocus className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-teal-500 focus:border-teal-500 block w-full p-2.5" />
                    </div>
                    <h4 className="text-md font-semibold text-gray-700 pt-2 border-t mt-4">Riwayat Jabatan</h4>
                    {teacher.riwayatJabatan?.map((riwayat, index) => (
                         <div key={index} className="p-3 border rounded-lg bg-gray-50 space-y-3 relative">
                            <button onClick={() => removeRiwayat(index)} className="absolute top-2 right-2 text-red-400 hover:text-red-600" aria-label="Hapus riwayat jabatan"><i className="bi bi-x-circle-fill"></i></button>
                            <div>
                                <label className="block mb-1 text-xs font-medium text-gray-600">Jabatan</label>
                                <input type="text" value={riwayat.jabatan} onChange={e => handleRiwayatChange(index, 'jabatan', e.target.value)} className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg w-full p-2" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block mb-1 text-xs font-medium text-gray-600">Tanggal Mulai</label>
                                    <input type="date" value={riwayat.tanggalMulai} onChange={e => handleRiwayatChange(index, 'tanggalMulai', e.target.value)} className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg w-full p-2" />
                                </div>
                                <div>
                                    <label className="block mb-1 text-xs font-medium text-gray-600">Tanggal Selesai (Kosongkan jika aktif)</label>
                                    <input type="date" value={riwayat.tanggalSelesai || ''} onChange={e => handleRiwayatChange(index, 'tanggalSelesai', e.target.value)} className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg w-full p-2" />
                                </div>
                            </div>
                         </div>
                    ))}
                     <button onClick={addRiwayat} className="text-sm text-teal-600 hover:text-teal-800 font-medium">+ Tambah Riwayat Jabatan</button>
                </div>
                <div className="p-4 border-t flex justify-end space-x-2">
                    <button onClick={onClose} type="button" className="text-gray-500 bg-white hover:bg-gray-100 focus:ring-4 focus:outline-none focus:ring-blue-300 rounded-lg border border-gray-200 text-sm font-medium px-5 py-2.5 hover:text-gray-900 focus:z-10">Batal</button>
                    <button onClick={handleSave} type="button" className="text-white bg-teal-700 hover:bg-teal-800 focus:ring-4 focus:outline-none focus:ring-teal-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center">Simpan</button>
                </div>
            </div>
        </div>
    )
}
