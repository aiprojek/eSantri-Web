import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Santri } from '../../../types';
import { FormSection } from './FormSection';
import { FormError } from './FormError';
import { AlamatFields } from './AlamatFields';

interface TabDataOrangTuaProps {
  formMethods: UseFormReturn<Santri>;
}

export const TabDataOrangTua: React.FC<TabDataOrangTuaProps> = ({ formMethods }) => {
    const { register, formState: { errors } } = formMethods;

    const pendidikanOptions = ['Tidak/Belum Sekolah', 'Belum Tamat SD/Sederajat', 'Tamat SD/Sederajat', 'SLTP/Sederajat', 'SLTA/Sederajat', 'Diploma I/II', 'Akademi/Diploma III/S. Muda', 'Diploma IV/Strata I', 'Strata II', 'Strata III'];
    const pekerjaanOptions = ['Belum/Tidak Bekerja', 'Mengurus Rumah Tangga', 'Pelajar/Mahasiswa', 'Pensiunan', 'Pegawai Negeri Sipil', 'TNI', 'POLRI', 'Wiraswasta', 'Guru', 'Dokter', 'Bidan', 'Perawat', 'Petani/Pekebun', 'Nelayan', 'Karyawan Swasta', 'Karyawan BUMN', 'Buruh Harian Lepas', 'Lainnya'];
    const penghasilanOptions = [
        '-- Pilih Penghasilan --',
        'Kurang dari Rp. 1.000.000',
        'Rp. 1.000.000 - Rp. 2.000.000',
        'Lebih dari Rp. 2.000.000',
        'Lebih dari Rp. 5.000.000',
        'Tidak Berpenghasilan',
        'Lainnya',
    ];

  return (
    <div>
      <FormSection title="Data Ayah Kandung">
          <div className="lg:col-span-2">
              <label className="block mb-1 text-sm font-medium text-gray-700">Nama Lengkap Ayah</label>
              <input type="text" {...register('namaAyah', { required: 'Nama Ayah wajib diisi.' })} className={`bg-gray-50 border text-gray-900 text-sm rounded-lg w-full p-2.5 ${errors.namaAyah ? 'border-red-500' : 'border-gray-300'}`} />
              <FormError error={errors.namaAyah} />
          </div>
          <div className="lg:col-span-2">
              <label className="block mb-1 text-sm font-medium text-gray-700">NIK Ayah</label>
              <input type="text" {...register('nikAyah', { pattern: { value: /^\d*$/, message: 'NIK Ayah hanya boleh berisi angka.' }})} className={`bg-gray-50 border text-gray-900 text-sm rounded-lg w-full p-2.5 ${errors.nikAyah ? 'border-red-500' : 'border-gray-300'}`} />
              <FormError error={errors.nikAyah} />
          </div>
          <div className="lg:col-span-2">
              <label className="block mb-1 text-sm font-medium text-gray-700">Tempat Lahir Ayah</label>
              <input type="text" {...register('tempatLahirAyah')} className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg w-full p-2.5" />
          </div>
          <div className="lg:col-span-2">
              <label className="block mb-1 text-sm font-medium text-gray-700">Tanggal Lahir Ayah</label>
              <input type="date" {...register('tanggalLahirAyah')} className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg w-full p-2.5" />
          </div>
          <div className="lg:col-span-2"><label className="block mb-1 text-sm font-medium text-gray-700">Pendidikan Ayah</label><select {...register('pendidikanAyah')} className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg w-full p-2.5"><option value="">-- Pilih --</option>{pendidikanOptions.map(o=><option key={o} value={o}>{o}</option>)}</select></div>
          <div className="lg:col-span-2"><label className="block mb-1 text-sm font-medium text-gray-700">Pekerjaan Ayah</label><select {...register('pekerjaanAyah')} className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg w-full p-2.5"><option value="">-- Pilih --</option>{pekerjaanOptions.map(o=><option key={o} value={o}>{o}</option>)}</select></div>
          <div className="lg:col-span-2"><label className="block mb-1 text-sm font-medium text-gray-700">Penghasilan Ayah</label><select {...register('penghasilanAyah')} className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg w-full p-2.5">{penghasilanOptions.map(o=><option key={o} value={o === penghasilanOptions[0] ? '' : o}>{o}</option>)}</select></div>
          <div className="lg:col-span-2"><label className="block mb-1 text-sm font-medium text-gray-700">Telepon Ayah</label><input type="tel" {...register('teleponAyah')} className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg w-full p-2.5" /></div>
          <div className="lg:col-span-4 mt-4 pt-4 border-t font-semibold text-gray-600">Alamat Ayah</div>
          <AlamatFields fieldName="alamatAyah" formMethods={formMethods} />
      </FormSection>
        <FormSection title="Data Ibu Kandung">
          <div className="lg:col-span-2">
              <label className="block mb-1 text-sm font-medium text-gray-700">Nama Lengkap Ibu</label>
              <input type="text" {...register('namaIbu', { required: 'Nama Ibu wajib diisi.' })} className={`bg-gray-50 border text-gray-900 text-sm rounded-lg w-full p-2.5 ${errors.namaIbu ? 'border-red-500' : 'border-gray-300'}`} />
              <FormError error={errors.namaIbu} />
          </div>
          <div className="lg:col-span-2">
              <label className="block mb-1 text-sm font-medium text-gray-700">NIK Ibu</label>
              <input type="text" {...register('nikIbu', { pattern: { value: /^\d*$/, message: 'NIK Ibu hanya boleh berisi angka.' }})} className={`bg-gray-50 border text-gray-900 text-sm rounded-lg w-full p-2.5 ${errors.nikIbu ? 'border-red-500' : 'border-gray-300'}`} />
              <FormError error={errors.nikIbu} />
          </div>
          <div className="lg:col-span-2"><label className="block mb-1 text-sm font-medium text-gray-700">Tempat Lahir Ibu</label><input type="text" {...register('tempatLahirIbu')} className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg w-full p-2.5" /></div>
          <div className="lg:col-span-2"><label className="block mb-1 text-sm font-medium text-gray-700">Tanggal Lahir Ibu</label><input type="date" {...register('tanggalLahirIbu')} className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg w-full p-2.5" /></div>
          <div className="lg:col-span-2"><label className="block mb-1 text-sm font-medium text-gray-700">Pendidikan Ibu</label><select {...register('pendidikanIbu')} className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg w-full p-2.5"><option value="">-- Pilih --</option>{pendidikanOptions.map(o=><option key={o} value={o}>{o}</option>)}</select></div>
          <div className="lg:col-span-2"><label className="block mb-1 text-sm font-medium text-gray-700">Pekerjaan Ibu</label><select {...register('pekerjaanIbu')} className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg w-full p-2.5"><option value="">-- Pilih --</option>{pekerjaanOptions.map(o=><option key={o} value={o}>{o}</option>)}</select></div>
          <div className="lg:col-span-2"><label className="block mb-1 text-sm font-medium text-gray-700">Penghasilan Ibu</label><select {...register('penghasilanIbu')} className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg w-full p-2.5">{penghasilanOptions.map(o=><option key={o} value={o === penghasilanOptions[0] ? '' : o}>{o}</option>)}</select></div>
          <div className="lg:col-span-2"><label className="block mb-1 text-sm font-medium text-gray-700">Telepon Ibu</label><input type="tel" {...register('teleponIbu')} className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg w-full p-2.5" /></div>
          <div className="lg:col-span-4 mt-4 pt-4 border-t font-semibold text-gray-600">Alamat Ibu</div>
          <AlamatFields fieldName="alamatIbu" formMethods={formMethods} />
      </FormSection>
      <FormSection title="Data Wali (Isi jika berbeda dari Orang Tua)">
          <div className="lg:col-span-2"><label className="block mb-1 text-sm font-medium text-gray-700">Nama Lengkap Wali</label><input type="text" {...register('namaWali')} className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg w-full p-2.5" /></div>
          <div className="lg:col-span-2"><label className="block mb-1 text-sm font-medium text-gray-700">Status Hubungan Wali</label><select {...register('statusWali')} className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg w-full p-2.5"><option value="">-- Pilih --</option>{['Kakek', 'Paman (Saudara Ayah)', 'Saudara Laki-laki Seayah', 'Saudara Laki-laki Kandung', 'Orang Tua Angkat', 'Orang Tua Asuh', 'Orang Tua Tiri', 'Kerabat Mahram Lainnya', 'Lainnya'].map(o=><option key={o} value={o}>{o}</option>)}</select></div>
          <div className="lg:col-span-2"><label className="block mb-1 text-sm font-medium text-gray-700">Pendidikan Wali</label><select {...register('pendidikanWali')} className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg w-full p-2.5"><option value="">-- Pilih --</option>{pendidikanOptions.map(o=><option key={o} value={o}>{o}</option>)}</select></div>
          <div className="lg:col-span-2"><label className="block mb-1 text-sm font-medium text-gray-700">Pekerjaan Wali</label><select {...register('pekerjaanWali')} className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg w-full p-2.5"><option value="">-- Pilih --</option>{pekerjaanOptions.map(o=><option key={o} value={o}>{o}</option>)}</select></div>
          <div className="lg:col-span-2"><label className="block mb-1 text-sm font-medium text-gray-700">Penghasilan Wali</label><select {...register('penghasilanWali')} className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg w-full p-2.5">{penghasilanOptions.map(o=><option key={o} value={o === penghasilanOptions[0] ? '' : o}>{o}</option>)}</select></div>
          <div className="lg:col-span-2"><label className="block mb-1 text-sm font-medium text-gray-700">Telepon Wali</label><input type="tel" {...register('teleponWali')} className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg w-full p-2.5" /></div>
          <div className="lg:col-span-4 mt-4 pt-4 border-t font-semibold text-gray-600">Alamat Wali</div>
          <AlamatFields fieldName="alamatWali" formMethods={formMethods} />
      </FormSection>
    </div>
  );
};
