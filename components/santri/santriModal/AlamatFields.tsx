import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Santri } from '../../../types';

interface AlamatFieldsProps {
    fieldName: 'alamat' | 'alamatAyah' | 'alamatIbu' | 'alamatWali';
    formMethods: UseFormReturn<Santri>;
}

export const AlamatFields: React.FC<AlamatFieldsProps> = ({ fieldName, formMethods }) => {
    const { register } = formMethods;
    return (
        <>
            <div className="lg:col-span-4">
                <label className="block mb-1 text-sm font-medium text-gray-700">Detail Alamat (Jalan, RT/RW, Dusun)</label>
                <textarea {...register(`${fieldName}.detail`)} rows={2} placeholder="Contoh: Jl. Merdeka No. 10, RT 01/RW 02, Dusun Krajan" className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2.5"/>
            </div>
            <div className="lg:col-span-2"><label className="block mb-1 text-sm font-medium text-gray-700">Desa / Kelurahan</label><input type="text" {...register(`${fieldName}.desaKelurahan`)} className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg w-full p-2.5" /></div>
            <div className="lg:col-span-2"><label className="block mb-1 text-sm font-medium text-gray-700">Kecamatan</label><input type="text" {...register(`${fieldName}.kecamatan`)} className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg w-full p-2.5" /></div>
            <div className="lg:col-span-2"><label className="block mb-1 text-sm font-medium text-gray-700">Kabupaten / Kota</label><input type="text" {...register(`${fieldName}.kabupatenKota`)} className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg w-full p-2.5" /></div>
            <div className="lg:col-span-1"><label className="block mb-1 text-sm font-medium text-gray-700">Provinsi</label><input type="text" {...register(`${fieldName}.provinsi`)} className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg w-full p-2.5" /></div>
            <div className="lg:col-span-1"><label className="block mb-1 text-sm font-medium text-gray-700">Kode POS</label><input type="text" {...register(`${fieldName}.kodePos`)} className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg w-full p-2.5" /></div>
        </>
    );
};
