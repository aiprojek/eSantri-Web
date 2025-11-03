import React, { useState } from 'react';
import { Prestasi } from '../../../types';
import { useAppContext } from '../../../AppContext';

interface PrestasiModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (prestasi: Prestasi) => void;
  prestasiData: Prestasi | null;
}

export const PrestasiModal: React.FC<PrestasiModalProps> = ({ isOpen, onClose, onSave, prestasiData }) => {
    const { showAlert } = useAppContext();
    if (!isOpen) return null;

    const [prestasi, setPrestasi] = useState<Prestasi>(prestasiData || {
        id: Date.now(),
        jenis: 'Akademik',
        tingkat: 'Desa',
        nama: '',
        tahun: new Date().getFullYear(),
        penyelenggara: '',
    });

    const handleSave = () => {
        if (!prestasi.nama.trim() || !prestasi.tahun || !prestasi.penyelenggara.trim()) {
            showAlert('Input Tidak Lengkap', 'Harap isi semua field yang wajib: Nama Prestasi, Tahun, dan Penyelenggara.');
            return;
        }
        onSave(prestasi);
    }
    
    const handleChange = (field: keyof Prestasi, value: any) => {
        setPrestasi(p => ({ ...p, [field]: value }));
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-[60] flex justify-center items-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
                <div className="p-5 border-b">
                    <h3 className="text-lg font-semibold text-gray-800">{prestasiData?.id ? 'Edit' : 'Tambah'} Prestasi</h3>
                </div>
                <div className="p-5 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block mb-1 text-sm font-medium text-gray-700">Jenis Prestasi</label>
                            <select value={prestasi.jenis} onChange={e => handleChange('jenis', e.target.value)} className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-teal-500 focus:border-teal-500 block w-full p-2.5">
                                <option value="Akademik">Akademik</option>
                                <option value="Non-Akademik">Non-Akademik</option>
                                <option value="Tahfidz">Tahfidz</option>
                                <option value="Lainnya">Lainnya</option>
                            </select>
                        </div>
                        <div>
                            <label className="block mb-1 text-sm font-medium text-gray-700">Tingkat</label>
                            <select value={prestasi.tingkat} onChange={e => handleChange('tingkat', e.target.value)} className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-teal-500 focus:border-teal-500 block w-full p-2.5">
                                <option value="Desa">Desa</option>
                                <option value="Kecamatan">Kecamatan</option>
                                <option value="Kabupaten">Kabupaten</option>
                                <option value="Provinsi">Provinsi</option>
                                <option value="Nasional">Nasional</option>
                                <option value="Internasional">Internasional</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="block mb-1 text-sm font-medium text-gray-700">Nama Prestasi/Lomba</label>
                        <input type="text" value={prestasi.nama} onChange={e => handleChange('nama', e.target.value)} className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-teal-500 focus:border-teal-500 block w-full p-2.5" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block mb-1 text-sm font-medium text-gray-700">Tahun</label>
                            <input type="number" value={prestasi.tahun} onChange={e => handleChange('tahun', parseInt(e.target.value) || new Date().getFullYear())} className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-teal-500 focus:border-teal-500 block w-full p-2.5" />
                        </div>
                         <div>
                            <label className="block mb-1 text-sm font-medium text-gray-700">Penyelenggara</label>
                            <input type="text" value={prestasi.penyelenggara} onChange={e => handleChange('penyelenggara', e.target.value)} className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-teal-500 focus:border-teal-500 block w-full p-2.5" />
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
