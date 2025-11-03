import React, { useState } from 'react';
import { Pelanggaran } from '../../../types';
import { useAppContext } from '../../../AppContext';

interface PelanggaranModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (pelanggaran: Pelanggaran) => void;
  pelanggaranData: Pelanggaran | null;
}

export const PelanggaranModal: React.FC<PelanggaranModalProps> = ({ isOpen, onClose, onSave, pelanggaranData }) => {
    const { showAlert } = useAppContext();
    if (!isOpen) return null;

    const [pelanggaran, setPelanggaran] = useState<Pelanggaran>(pelanggaranData || {
        id: Date.now(),
        tanggal: new Date().toISOString().split('T')[0],
        jenis: 'Ringan',
        deskripsi: '',
        tindakLanjut: '',
        pelapor: '',
    });

    const handleSave = () => {
        if (!pelanggaran.deskripsi.trim() || !pelanggaran.tindakLanjut.trim() || !pelanggaran.pelapor.trim()) {
            showAlert('Input Tidak Lengkap', 'Harap isi semua field yang wajib: Deskripsi, Tindak Lanjut, dan Pelapor.');
            return;
        }
        onSave(pelanggaran);
    }
    
    const handleChange = (field: keyof Pelanggaran, value: any) => {
        setPelanggaran(p => ({ ...p, [field]: value }));
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-[60] flex justify-center items-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
                <div className="p-5 border-b">
                    <h3 className="text-lg font-semibold text-gray-800">{pelanggaranData?.id ? 'Edit' : 'Tambah'} Catatan Pelanggaran</h3>
                </div>
                <div className="p-5 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block mb-1 text-sm font-medium text-gray-700">Tanggal</label>
                            <input type="date" value={pelanggaran.tanggal} onChange={e => handleChange('tanggal', e.target.value)} className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-teal-500 focus:border-teal-500 block w-full p-2.5" />
                        </div>
                        <div>
                            <label className="block mb-1 text-sm font-medium text-gray-700">Jenis Pelanggaran</label>
                            <select value={pelanggaran.jenis} onChange={e => handleChange('jenis', e.target.value)} className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-teal-500 focus:border-teal-500 block w-full p-2.5">
                                <option value="Ringan">Ringan</option>
                                <option value="Sedang">Sedang</option>
                                <option value="Berat">Berat</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="block mb-1 text-sm font-medium text-gray-700">Deskripsi Pelanggaran</label>
                        <textarea rows={3} value={pelanggaran.deskripsi} onChange={e => handleChange('deskripsi', e.target.value)} className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-teal-500 focus:border-teal-500 block w-full p-2.5" />
                    </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block mb-1 text-sm font-medium text-gray-700">Tindak Lanjut / Sanksi</label>
                            <input type="text" value={pelanggaran.tindakLanjut} onChange={e => handleChange('tindakLanjut', e.target.value)} className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-teal-500 focus:border-teal-500 block w-full p-2.5" />
                        </div>
                        <div>
                            <label className="block mb-1 text-sm font-medium text-gray-700">Nama Pelapor</label>
                            <input type="text" value={pelanggaran.pelapor} onChange={e => handleChange('pelapor', e.target.value)} className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-teal-500 focus:border-teal-500 block w-full p-2.5" />
                        </div>
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
