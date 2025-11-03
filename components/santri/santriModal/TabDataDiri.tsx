import React, { useMemo } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Santri } from '../../../types';
import { useAppContext } from '../../../AppContext';
import { FormSection } from './FormSection';
import { FormError } from './FormError';
import { AlamatFields } from './AlamatFields';
import { PhotoUploader } from './PhotoUploader';

interface TabDataDiriProps {
  formMethods: UseFormReturn<Santri>;
  onGenerateNis: () => void;
}

export const TabDataDiri: React.FC<TabDataDiriProps> = ({ formMethods, onGenerateNis }) => {
  // FIX: Get santriList from useAppContext hook at top level.
  const { settings, santriList } = useAppContext();
  // FIX: Destructure getValues from formMethods.
  const { register, formState: { errors }, watch, setValue, trigger, getValues } = formMethods;

  const watchJenjangId = watch('jenjangId');
  const watchKelasId = watch('kelasId');
  const watchStatus = watch('status');

  const availableKelas = useMemo(() => {
    if (!watchJenjangId) return [];
    return settings.kelas.filter(k => k.jenjangId === watchJenjangId);
  }, [watchJenjangId, settings.kelas]);

  const availableRombelInModal = useMemo(() => {
    if (!watchKelasId) return [];
    return settings.rombel.filter(r => r.kelasId === watchKelasId);
  }, [watchKelasId, settings.rombel]);
  
  const kewarganegaraanOptions = [
    { value: 'WNI', label: 'WNI (Warga Negara Indonesia)' },
    { value: 'WNA', label: 'WNA (Warga Negara Asing)' },
    { value: 'Keturunan', label: 'Keturunan' },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      <div className="lg:col-span-1">
        <PhotoUploader formMethods={formMethods} />
      </div>
      <div className="lg:col-span-4">
        <FormSection title="Data Pribadi">
          <div className="lg:col-span-2">
              <label className="block mb-1 text-sm font-medium text-gray-700">Nama Lengkap</label>
              <input type="text" {...register('namaLengkap', { required: 'Nama Lengkap wajib diisi.'})} className={`bg-gray-50 border text-gray-900 text-sm rounded-lg block w-full p-2.5 ${errors.namaLengkap ? 'border-red-500' : 'border-gray-300'}`} />
              <FormError error={errors.namaLengkap} />
          </div>
          <div className="lg:col-span-2">
              <label className="block mb-1 text-sm font-medium text-gray-700">Nama Hijrah</label>
              <input type="text" {...register('namaHijrah')} className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2.5" />
          </div>
            <div className="lg:col-span-2">
              <label className="block mb-1 text-sm font-medium text-gray-700">Tempat Lahir</label>
              <input type="text" {...register('tempatLahir', { required: 'Tempat lahir wajib diisi.' })} className={`bg-gray-50 border text-gray-900 text-sm rounded-lg w-full p-2.5 ${errors.tempatLahir ? 'border-red-500' : 'border-gray-300'}`} />
              <FormError error={errors.tempatLahir} />
          </div>
            <div className="lg:col-span-2">
              <label className="block mb-1 text-sm font-medium text-gray-700">Tanggal Lahir</label>
              <input type="date" {...register('tanggalLahir', { required: 'Tanggal lahir wajib diisi.' })} className={`bg-gray-50 border text-gray-900 text-sm rounded-lg w-full p-2.5 ${errors.tanggalLahir ? 'border-red-500' : 'border-gray-300'}`} />
              <FormError error={errors.tanggalLahir} />
          </div>
            <div className="lg:col-span-2">
              <label className="block mb-1 text-sm font-medium text-gray-700">Jenis Kelamin</label>
              <select {...register('jenisKelamin')} className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg w-full p-2.5">
                  <option value="Laki-laki">Laki-laki</option>
                  <option value="Perempuan">Perempuan</option>
              </select>
          </div>
            <div className="lg:col-span-2">
              <label className="block mb-1 text-sm font-medium text-gray-700">Kewarganegaraan</label>
              <select {...register('kewarganegaraan')} className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg w-full p-2.5">
                  {kewarganegaraanOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
          </div>
        </FormSection>
        <FormSection title="Alamat Santri">
          <AlamatFields fieldName="alamat" formMethods={formMethods} />
        </FormSection>
        <FormSection title="Data Akademik & Kependudukan">
          <div className="lg:col-span-2">
              <label className="block mb-1 text-sm font-medium text-gray-700">NIS</label>
              <div className="flex">
                  <input 
                      type="text" 
                      {...register('nis', { 
                          required: 'NIS wajib diisi.',
                          validate: value => !santriList.some(s => s.nis.trim().toLowerCase() === value.trim().toLowerCase() && s.id !== getValues('id')) || 'NIS ini sudah digunakan.'
                      })}
                      className={`rounded-l-lg bg-gray-50 border text-gray-900 text-sm focus:ring-teal-500 focus:border-teal-500 block w-full p-2.5 ${errors.nis ? 'border-red-500' : 'border-gray-300'}`} 
                  />
                  <button onClick={onGenerateNis} type="button" title="Buat NIS Otomatis" className="bg-teal-600 hover:bg-teal-700 text-white p-2.5 rounded-r-lg"><i className="bi bi-arrow-clockwise"></i></button>
              </div>
              <FormError error={errors.nis} />
          </div>
          <div className="lg:col-span-2">
              <label className="block mb-1 text-sm font-medium text-gray-700">NIK</label>
              <input type="text" {...register('nik', { pattern: { value: /^\d*$/, message: 'NIK hanya boleh berisi angka.' }})} className={`bg-gray-50 border text-gray-900 text-sm rounded-lg w-full p-2.5 ${errors.nik ? 'border-red-500' : 'border-gray-300'}`} />
              <FormError error={errors.nik} />
          </div>
          <div className="lg:col-span-2">
              <label className="block mb-1 text-sm font-medium text-gray-700">NISN</label>
              <input type="text" {...register('nisn', { pattern: { value: /^\d*$/, message: 'NISN hanya boleh berisi angka.' }})} className={`bg-gray-50 border text-gray-900 text-sm rounded-lg w-full p-2.5 ${errors.nisn ? 'border-red-500' : 'border-gray-300'}`} />
              <FormError error={errors.nisn} />
          </div>
          <div className="lg:col-span-2">
              <label className="block mb-1 text-sm font-medium text-gray-700">Tanggal Masuk</label>
              <input type="date" {...register('tanggalMasuk', { required: 'Tanggal masuk wajib diisi.' })} className={`bg-gray-50 border text-gray-900 text-sm rounded-lg w-full p-2.5 ${errors.tanggalMasuk ? 'border-red-500' : 'border-gray-300'}`} />
              <FormError error={errors.tanggalMasuk} />
          </div>
            <div className="lg:col-span-2">
              <label className="block mb-1 text-sm font-medium text-gray-700">Status Santri</label>
              <select {...register('status', {
                  onChange: e => { if (e.target.value === 'Aktif') setValue('tanggalStatus', undefined) }
              })} className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg w-full p-2.5">
                  <option value="Aktif">Aktif</option>
                  <option value="Hiatus">Hiatus</option>
                  <option value="Lulus">Lulus</option>
                  <option value="Keluar/Pindah">Keluar/Pindah</option>
              </select>
          </div>
            {watchStatus !== 'Aktif' && (
              <div className="lg:col-span-2">
                  <label className="block mb-1 text-sm font-medium text-gray-700">Tanggal Status</label>
                  <input type="date" {...register('tanggalStatus', { required: 'Tanggal status wajib diisi untuk status selain Aktif.' })} className={`bg-gray-50 border text-gray-900 text-sm rounded-lg w-full p-2.5 ${errors.tanggalStatus ? 'border-red-500' : 'border-gray-300'}`} />
                  <FormError error={errors.tanggalStatus} />
              </div>
          )}
          <div className="lg:col-span-4 grid grid-cols-1 md:grid-cols-3 gap-4 border-t pt-4 mt-4">
              <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">Jenjang</label>
                  <select 
                      {...register('jenjangId', { 
                          valueAsNumber: true, 
                          validate: value => (value && value > 0) || 'Jenjang wajib dipilih' 
                      })}
                      onChange={(e) => {
                          const newJenjangId = parseInt(e.target.value, 10);
                          setValue('jenjangId', newJenjangId, { shouldDirty: true });
                          const firstKelasInJenjang = settings.kelas.find(k => k.jenjangId === newJenjangId);
                          setValue('kelasId', firstKelasInJenjang?.id || 0, { shouldDirty: true });
                          const firstRombelInKelas = firstKelasInJenjang ? settings.rombel.find(r => r.kelasId === firstKelasInJenjang.id) : undefined;
                          setValue('rombelId', firstRombelInKelas?.id || 0, { shouldDirty: true });
                          trigger(['jenjangId', 'kelasId', 'rombelId']);
                      }}
                      className={`bg-gray-50 border text-gray-900 text-sm rounded-lg w-full p-2.5 ${errors.jenjangId ? 'border-red-500' : 'border-gray-300'}`}
                  >
                      <option value={0}>-- Pilih Jenjang --</option>
                      {settings.jenjang.map(j => <option key={j.id} value={j.id}>{j.nama}</option>)}
                  </select>
                  <FormError error={errors.jenjangId} />
              </div>
              <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">Kelas</label>
                  <select 
                      {...register('kelasId', {
                          valueAsNumber: true,
                          validate: value => (value && value > 0) || 'Kelas wajib dipilih'
                      })}
                      onChange={(e) => {
                          const newKelasId = parseInt(e.target.value, 10);
                          setValue('kelasId', newKelasId, { shouldDirty: true });
                          const firstRombelInKelas = settings.rombel.find(r => r.kelasId === newKelasId);
                          setValue('rombelId', firstRombelInKelas?.id || 0, { shouldDirty: true });
                          trigger(['kelasId', 'rombelId']);
                      }}
                      disabled={!watchJenjangId}
                      className={`bg-gray-50 border text-gray-900 text-sm rounded-lg w-full p-2.5 disabled:bg-gray-200 ${errors.kelasId ? 'border-red-500' : 'border-gray-300'}`}
                  >
                        <option value={0}>-- Pilih Kelas --</option>
                      {availableKelas.map(k => <option key={k.id} value={k.id}>{k.nama}</option>)}
                  </select>
                  <FormError error={errors.kelasId} />
              </div>
                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">Rombel</label>
                  <select 
                      {...register('rombelId', {
                          valueAsNumber: true,
                          validate: value => (value && value > 0) || 'Rombel wajib dipilih'
                      })}
                      disabled={!watchKelasId}
                      className={`bg-gray-50 border text-gray-900 text-sm rounded-lg w-full p-2.5 disabled:bg-gray-200 ${errors.rombelId ? 'border-red-500' : 'border-gray-300'}`}
                  >
                      <option value={0}>-- Pilih Rombel --</option>
                      {availableRombelInModal.map(r => <option key={r.id} value={r.id}>{r.nama}</option>)}
                  </select>
                  <FormError error={errors.rombelId} />
              </div>
          </div>
        </FormSection>
      </div>
    </div>
  );
};