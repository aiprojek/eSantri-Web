
import React, { useState, useEffect } from 'react';
import { UseFormReturn, FieldPath } from 'react-hook-form';
import { Santri } from '../../../types';
import { FormSection } from './FormSection';
import { FormError } from './FormError';
import { AlamatFields } from './AlamatFields';

// Helper component to avoid repetition
const DateInput: React.FC<{
    fieldName: FieldPath<Santri>;
    label: string;
    formMethods: UseFormReturn<Santri>;
}> = ({ fieldName, label, formMethods }) => {
    const { register, formState: { errors }, watch, setValue, trigger } = formMethods;

    register(fieldName, {
        validate: value => {
            if (!value) return true; // Allow empty
            if (!/^\d{4}-\d{2}-\d{2}$/.test(value as string) || isNaN(new Date(value as string).getTime())) {
                return 'Format tanggal harus DD/MM/YYYY dan valid.';
            }
            return true;
        }
    });

    const formValue = watch(fieldName);
    const [displayValue, setDisplayValue] = useState('');

    useEffect(() => {
        // Safe cast since we know DateInput is used for string fields like dates
        const value = formValue as string | undefined;
        if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
            const [y, m, d] = value.split('-');
            setDisplayValue(`${d}/${m}/${y}`);
        } else {
            setDisplayValue(value || '');
        }
    }, [formValue]);

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
        const displayValue = e.target.value;
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(displayValue)) {
            const [d, m, y] = displayValue.split('/');
            setValue(fieldName, `${y}-${m}-${d}` as any, { shouldDirty: true });
        } else {
            setValue(fieldName, displayValue as any, { shouldDirty: true });
        }
        trigger(fieldName);
    };

    const error = fieldName.split('.').reduce((o: any, i) => o?.[i], errors);

    return (
        <div>
            <label className="block mb-1 text-sm font-medium text-gray-700">{label}</label>
            <input
                type="text"
                placeholder="DD/MM/YYYY"
                value={displayValue}
                onChange={e => setDisplayValue(e.target.value)}
                onBlur={handleBlur}
                className={`bg-gray-50 border text-gray-900 text-sm rounded-lg w-full p-2.5 ${error ? 'border-red-500' : 'border-gray-300'}`}
            />
            <FormError error={error} />
        </div>
    );
};


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
    const statusHidupOptions = [
        { value: 'Hidup', label: 'Hidup' },
        { value: 'Meninggal', label: 'Meninggal' },
        { value: 'Cerai', label: 'Cerai' },
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
              <label className="block mb-1 text-sm font-medium text-gray-700">Status Ayah</label>
              <select {...register('statusAyah')} className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg w-full p-2.5">
                  <option value="">-- Pilih Status --</option>
                  {statusHidupOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
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
            <DateInput fieldName="tanggalLahirAyah" label="Tanggal Lahir Ayah" formMethods={formMethods} />
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
              <label className="block mb-1 text-sm font-medium text-gray-700">Status Ibu</label>
              <select {...register('statusIbu')} className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg w-full p-2.5">
                  <option value="">-- Pilih Status --</option>
                  {statusHidupOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
          </div>
          <div className="lg:col-span-2">
              <label className="block mb-1 text-sm font-medium text-gray-700">NIK Ibu</label>
              <input type="text" {...register('nikIbu', { pattern: { value: /^\d*$/, message: 'NIK Ibu hanya boleh berisi angka.' }})} className={`bg-gray-50 border text-gray-900 text-sm rounded-lg w-full p-2.5 ${errors.nikIbu ? 'border-red-500' : 'border-gray-300'}`} />
              <FormError error={errors.nikIbu} />
          </div>
          <div className="lg:col-span-2"><label className="block mb-1 text-sm font-medium text-gray-700">Tempat Lahir Ibu</label><input type="text" {...register('tempatLahirIbu')} className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg w-full p-2.5" /></div>
          <div className="lg:col-span-2">
            <DateInput fieldName="tanggalLahirIbu" label="Tanggal Lahir Ibu" formMethods={formMethods} />
          </div>
          <div className="lg:col-span-2"><label className="block mb-1 text-sm font-medium text-gray-700">Pendidikan Ibu</label><select {...register('pendidikanIbu')} className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg w-full p-2.5"><option value="">-- Pilih --</option>{pendidikanOptions.map(o=><option key={o} value={o}>{o}</option>)}</select></div>
          <div className="lg:col-span-2"><label className="block mb-1 text-sm font-medium text-gray-700">Pekerjaan Ibu</label><select {...register('pekerjaanIbu')} className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg w-full p-2.5"><option value="">-- Pilih --</option>{pekerjaanOptions.map(o=><option key={o} value={o}>{o}</option>)}</select></div>
          <div className="lg:col-span-2"><label className="block mb-1 text-sm font-medium text-gray-700">Penghasilan Ibu</label><select {...register('penghasilanIbu')} className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg w-full p-2.5">{penghasilanOptions.map(o=><option key={o} value={o === penghasilanOptions[0] ? '' : o}>{o}</option>)}</select></div>
          <div className="lg:col-span-2"><label className="block mb-1 text-sm font-medium text-gray-700">Telepon Ibu</label><input type="tel" {...register('teleponIbu')} className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg w-full p-2.5" /></div>
          <div className="lg:col-span-4 mt-4 pt-4 border-t font-semibold text-gray-600">Alamat Ibu</div>
          <AlamatFields fieldName="alamatIbu" formMethods={formMethods} />
      </FormSection>
      <FormSection title="Data Wali (Isi jika berbeda dari Orang Tua)">
          <div className="lg:col-span-2"><label className="block mb-1 text-sm font-medium text-gray-700">Nama Lengkap Wali</label><input type="text" {...register('namaWali')} className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg w-full p-2.5" /></div>
          <div className="lg:col-span-2"><label className="block mb-1 text-sm font-medium text-gray-700">Hubungan dengan Santri</label><select {...register('statusWali')} className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg w-full p-2.5"><option value="">-- Pilih --</option>{['Kakek', 'Paman (Saudara Ayah)', 'Saudara Laki-laki Seayah', 'Saudara Laki-laki Kandung', 'Orang Tua Angkat', 'Orang Tua Asuh', 'Orang Tua Tiri', 'Kerabat Mahram Lainnya', 'Lainnya'].map(o=><option key={o} value={o}>{o}</option>)}</select></div>
          <div className="lg:col-span-2">
              <label className="block mb-1 text-sm font-medium text-gray-700">Status Wali</label>
              <select {...register('statusHidupWali')} className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg w-full p-2.5">
                  <option value="">-- Pilih Status --</option>
                  {statusHidupOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
          </div>
          <div className="lg:col-span-4">
            <DateInput fieldName="tanggalLahirWali" label="Tanggal Lahir Wali" formMethods={formMethods} />
          </div>
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
