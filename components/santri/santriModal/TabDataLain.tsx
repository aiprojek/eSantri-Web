import React, { useState } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Santri, Prestasi, Pelanggaran } from '../../../types';
import { FormSection } from './FormSection';

interface TabDataLainProps {
  formMethods: UseFormReturn<Santri>;
  openPrestasiModal: (prestasi: Prestasi | null) => void;
  openPelanggaranModal: (pelanggaran: Pelanggaran | null) => void;
}

export const TabDataLain: React.FC<TabDataLainProps> = ({ formMethods, openPrestasiModal, openPelanggaranModal }) => {
    const { register, watch, setValue, getValues } = formMethods;

    const [newHobby, setNewHobby] = useState('');
    const watchHobi = watch('hobi');
    const watchPrestasi = watch('prestasi');
    const watchPelanggaran = watch('pelanggaran');

    const handleDeletePrestasi = (id: number) => {
        const updatedPrestasi = (getValues('prestasi') || []).filter(p => p.id !== id);
        setValue('prestasi', updatedPrestasi, { shouldDirty: true });
    }

    const handleDeletePelanggaran = (id: number) => {
        const updatedPelanggaran = (getValues('pelanggaran') || []).filter(p => p.id !== id);
        setValue('pelanggaran', updatedPelanggaran, { shouldDirty: true });
    }
    
    const handleAddHobby = () => {
        if (newHobby.trim()) {
            const updatedHobi = [...(getValues('hobi') || []), newHobby.trim()];
            setValue('hobi', updatedHobi, { shouldDirty: true });
            setNewHobby('');
        }
    }

    const handleRemoveHobby = (index: number) => {
        const updatedHobi = (getValues('hobi') || []).filter((_, i) => i !== index);
        setValue('hobi', updatedHobi, { shouldDirty: true });
    }
  
    return (
      <div>
        <FormSection title="Data Periodik Santri">
            <div className="lg:col-span-1"><label className="block mb-1 text-sm font-medium text-gray-700">Tinggi Badan (cm)</label><input type="number" {...register('tinggiBadan', { valueAsNumber: true })} className="bg-gray-50 border border-gray-300 text-sm rounded-lg w-full p-2.5" /></div>
            <div className="lg:col-span-1"><label className="block mb-1 text-sm font-medium text-gray-700">Berat Badan (kg)</label><input type="number" {...register('beratBadan', { valueAsNumber: true })} className="bg-gray-50 border border-gray-300 text-sm rounded-lg w-full p-2.5" /></div>
            <div className="lg:col-span-1"><label className="block mb-1 text-sm font-medium text-gray-700">Jarak ke Pondok</label><input type="text" {...register('jarakKePondok')} placeholder="cth: < 1 km" className="bg-gray-50 border border-gray-300 text-sm rounded-lg w-full p-2.5" /></div>
            <div className="lg:col-span-1"><label className="block mb-1 text-sm font-medium text-gray-700">Jumlah Saudara</label><input type="number" {...register('jumlahSaudara', { valueAsNumber: true })} className="bg-gray-50 border border-gray-300 text-sm rounded-lg w-full p-2.5" /></div>
            <div className="lg:col-span-2"><label className="block mb-1 text-sm font-medium text-gray-700">Berkebutuhan Khusus</label><input type="text" {...register('berkebutuhanKhusus')} className="bg-gray-50 border border-gray-300 text-sm rounded-lg w-full p-2.5" /></div>
            <div className="lg:col-span-4"><label className="block mb-1 text-sm font-medium text-gray-700">Riwayat Penyakit</label><textarea {...register('riwayatPenyakit')} rows={2} className="bg-gray-50 border border-gray-300 text-sm rounded-lg w-full p-2.5" /></div>
        </FormSection>
          <div className="pt-6">
            <h3 className="text-base font-semibold text-gray-800 border-b pb-2 mb-4">Hobi</h3>
            <div className="flex items-center gap-2 mb-2">
                <input type="text" value={newHobby} onChange={e => setNewHobby(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddHobby()} placeholder="Ketik hobi lalu Enter" className="bg-gray-50 border border-gray-300 text-sm rounded-lg w-full md:w-1/3 p-2.5" />
                <button onClick={handleAddHobby} type="button" className="text-white bg-teal-600 hover:bg-teal-700 px-4 py-2.5 rounded-lg text-sm">Tambah</button>
            </div>
            <div className="flex flex-wrap gap-2">
                {(watchHobi || []).map((hobby, index) => (
                    <span key={index} className="flex items-center gap-2 bg-teal-100 text-teal-800 text-sm font-medium px-2.5 py-1 rounded-full">
                        {hobby}
                        <button type="button" onClick={() => handleRemoveHobby(index)} className="text-teal-600 hover:text-teal-800"><i className="bi bi-x-circle-fill"></i></button>
                    </span>
                ))}
            </div>
        </div>
        <div className="pt-6">
            <h3 className="text-base font-semibold text-gray-800 border-b pb-2 mb-4">Prestasi</h3>
            <div className="border rounded-lg max-h-60 overflow-y-auto">
                {(watchPrestasi || []).length > 0 ? (
                    <ul className="divide-y">
                        {(watchPrestasi || []).map(p => (
                            <li key={p.id} className="flex justify-between items-center p-2 hover:bg-gray-50 group">
                                <div className="text-sm">
                                    <p className="font-medium">{p.nama} <span className="bg-gray-200 text-gray-700 px-2 py-0.5 text-xs rounded-full">{p.tahun}</span></p>
                                    <p className="text-xs text-gray-500">{p.tingkat} - {p.jenis}</p>
                                </div>
                                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <button onClick={() => openPrestasiModal(p)} type="button" className="text-blue-500 hover:text-blue-700 text-xs"><i className="bi bi-pencil-square"></i></button>
                                      <button onClick={() => handleDeletePrestasi(p.id)} type="button" className="text-red-500 hover:text-red-700 text-xs"><i className="bi bi-trash"></i></button>
                                </div>
                            </li>
                        ))}
                    </ul>
                ) : <p className="text-sm text-gray-400 p-3 text-center">Belum ada data prestasi.</p>}
            </div>
            <button onClick={() => openPrestasiModal(null)} type="button" className="mt-2 text-sm text-teal-600 hover:text-teal-800 font-medium">+ Tambah Prestasi</button>
        </div>
        <div className="pt-6">
            <h3 className="text-base font-semibold text-gray-800 border-b pb-2 mb-4">Catatan Pelanggaran</h3>
            <div className="border rounded-lg max-h-60 overflow-y-auto">
                {(watchPelanggaran || []).length > 0 ? (
                    <ul className="divide-y">
                        {(watchPelanggaran || []).map(p => (
                            <li key={p.id} className="flex justify-between items-center p-2 hover:bg-gray-50 group">
                                <div className="text-sm flex-grow">
                                    <div className="flex justify-between items-start">
                                        <p className="font-medium flex-grow pr-4">{p.deskripsi}</p>
                                        <span className={`px-2 py-0.5 text-xs rounded-full flex-shrink-0 ${ p.jenis === 'Berat' ? 'bg-red-100 text-red-800' : p.jenis === 'Sedang' ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800'}`}>{p.jenis}</span>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">
                                        <span className="font-semibold">Tindak Lanjut:</span> {p.tindakLanjut} | <span className="font-semibold">Pelapor:</span> {p.pelapor} | <span className="font-semibold">Tanggal:</span> {new Date(p.tanggal).toLocaleDateString('id-ID')}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2 pl-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <button onClick={() => openPelanggaranModal(p)} type="button" className="text-blue-500 hover:text-blue-700 text-xs"><i className="bi bi-pencil-square"></i></button>
                                      <button onClick={() => handleDeletePelanggaran(p.id)} type="button" className="text-red-500 hover:text-red-700 text-xs"><i className="bi bi-trash"></i></button>
                                </div>
                            </li>
                        ))}
                    </ul>
                ) : <p className="text-sm text-gray-400 p-3 text-center">Belum ada data pelanggaran.</p>}
            </div>
            <button onClick={() => openPelanggaranModal(null)} type="button" className="mt-2 text-sm text-teal-600 hover:text-teal-800 font-medium">+ Tambah Pelanggaran</button>
        </div>
      </div>
    );
};
