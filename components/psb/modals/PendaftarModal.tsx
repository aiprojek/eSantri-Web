
import React, { useState, useEffect } from 'react';
import { Pendaftar, PondokSettings } from '../../../types';
import { useAppContext } from '../../../AppContext';

interface PendaftarModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: Omit<Pendaftar, 'id'>) => Promise<void>;
    onUpdate: (data: Pendaftar) => Promise<void>;
    pendaftarData: Pendaftar | null;
    settings: PondokSettings;
}

export const PendaftarModal: React.FC<PendaftarModalProps> = ({ isOpen, onClose, onSave, onUpdate, pendaftarData, settings }) => {
    const { showAlert } = useAppContext();
    const [activeTab, setActiveTab] = useState<'dataDiri' | 'alamat' | 'ortu' | 'sekolah'>('dataDiri');
    
    // Initial state with comprehensive fields
    const [formData, setFormData] = useState<Partial<Pendaftar>>({
        namaLengkap: '',
        nisn: '',
        nik: '',
        jenisKelamin: 'Laki-laki',
        tempatLahir: '',
        tanggalLahir: '',
        kewarganegaraan: 'WNI',
        statusKeluarga: '',
        anakKe: undefined,
        jumlahSaudara: undefined,
        berkebutuhanKhusus: '',
        
        alamat: '',
        desaKelurahan: '',
        kecamatan: '',
        kabupatenKota: '',
        provinsi: '',
        kodePos: '',

        namaAyah: '',
        nikAyah: '',
        statusAyah: '',
        pekerjaanAyah: '',
        pendidikanAyah: '',
        penghasilanAyah: '',
        teleponAyah: '',
        
        namaIbu: '',
        nikIbu: '',
        statusIbu: '',
        pekerjaanIbu: '',
        pendidikanIbu: '',
        penghasilanIbu: '',
        teleponIbu: '',

        namaWali: '',
        nomorHpWali: '',
        hubunganWali: '',
        pekerjaanWali: '',
        pendidikanWali: '',
        penghasilanWali: '',
        
        jenjangId: 0,
        asalSekolah: '',
        alamatSekolahAsal: '',
        jalurPendaftaran: 'Reguler',
        catatan: '',
        status: 'Baru',
        tanggalDaftar: new Date().toISOString()
    });

    useEffect(() => {
        if (isOpen) {
            if (pendaftarData) {
                setFormData(pendaftarData);
            } else {
                setFormData({
                    namaLengkap: '',
                    nisn: '',
                    nik: '',
                    jenisKelamin: 'Laki-laki',
                    tempatLahir: '',
                    tanggalLahir: '',
                    kewarganegaraan: 'WNI',
                    alamat: '',
                    desaKelurahan: '',
                    kecamatan: '',
                    kabupatenKota: '',
                    provinsi: '',
                    kodePos: '',
                    namaAyah: '',
                    namaIbu: '',
                    namaWali: '',
                    nomorHpWali: '',
                    jenjangId: settings.jenjang[0]?.id || 0,
                    asalSekolah: '',
                    jalurPendaftaran: 'Reguler',
                    catatan: '',
                    status: 'Baru',
                    tanggalDaftar: new Date().toISOString()
                });
            }
            setActiveTab('dataDiri');
        }
    }, [isOpen, pendaftarData, settings.jenjang]);

    if (!isOpen) return null;

    const handleChange = (key: keyof Pendaftar, value: any) => {
        setFormData(prev => ({ ...prev, [key]: value }));
    };

    const handleSave = () => {
        if (!formData.namaLengkap?.trim() || !formData.jenjangId) {
            showAlert('Validasi Gagal', 'Nama Lengkap dan Jenjang wajib diisi.');
            return;
        }

        const dataToSave = {
            ...formData,
            jenjangId: Number(formData.jenjangId),
            anakKe: formData.anakKe ? Number(formData.anakKe) : undefined,
            jumlahSaudara: formData.jumlahSaudara ? Number(formData.jumlahSaudara) : undefined
        } as Pendaftar;

        if (pendaftarData?.id) {
            onUpdate(dataToSave);
        } else {
            onSave(dataToSave);
        }
        onClose();
    };

    const TabButton: React.FC<{ id: string; label: string }> = ({ id, label }) => (
        <button
            type="button"
            onClick={() => setActiveTab(id as any)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                activeTab === id
                    ? 'border-b-2 border-teal-600 text-teal-600 bg-gray-50'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
        >
            {label}
        </button>
    );

    const pendidikanOptions = ['Tidak/Belum Sekolah', 'SD/Sederajat', 'SLTP/Sederajat', 'SLTA/Sederajat', 'Diploma', 'Sarjana', 'Pascasarjana'];
    const pekerjaanOptions = ['PNS', 'TNI/Polri', 'Wiraswasta', 'Petani', 'Nelayan', 'Karyawan Swasta', 'Buruh', 'Lainnya'];
    const penghasilanOptions = ['< 1 Juta', '1 - 2 Juta', '2 - 5 Juta', '> 5 Juta', 'Tidak Berpenghasilan'];

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-[70] flex justify-center items-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-[90vh] flex flex-col">
                <div className="p-5 border-b flex justify-between items-center bg-gray-50 rounded-t-lg">
                    <h3 className="text-xl font-bold text-gray-800">{pendaftarData ? 'Edit' : 'Tambah'} Pendaftar Baru</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><i className="bi bi-x-lg text-xl"></i></button>
                </div>
                
                <div className="bg-white border-b px-6 pt-2">
                    <nav className="flex space-x-2 overflow-x-auto">
                        <TabButton id="dataDiri" label="Identitas & Kependudukan" />
                        <TabButton id="alamat" label="Alamat Lengkap" />
                        <TabButton id="ortu" label="Orang Tua & Wali" />
                        <TabButton id="sekolah" label="Sekolah & Pendaftaran" />
                    </nav>
                </div>

                <div className="flex-grow overflow-y-auto p-6 bg-white">
                    {/* --- TAB 1: IDENTITAS DIRI --- */}
                    {activeTab === 'dataDiri' && (
                        <div className="space-y-6">
                            <h4 className="font-semibold text-gray-700 border-b pb-2">Identitas Utama</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="md:col-span-2">
                                    <label className="block mb-1 text-sm font-medium text-gray-700">Nama Lengkap *</label>
                                    <input type="text" value={formData.namaLengkap} onChange={e => handleChange('namaLengkap', e.target.value)} className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-teal-500 focus:border-teal-500" />
                                </div>
                                <div>
                                    <label className="block mb-1 text-sm font-medium text-gray-700">Nama Hijrah / Panggilan</label>
                                    <input type="text" value={formData.namaHijrah || ''} onChange={e => handleChange('namaHijrah', e.target.value)} className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2.5 text-sm" />
                                </div>
                                <div>
                                    <label className="block mb-1 text-sm font-medium text-gray-700">Jenis Kelamin</label>
                                    <select value={formData.jenisKelamin} onChange={e => handleChange('jenisKelamin', e.target.value)} className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2.5 text-sm">
                                        <option value="Laki-laki">Laki-laki</option>
                                        <option value="Perempuan">Perempuan</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block mb-1 text-sm font-medium text-gray-700">Tempat Lahir</label>
                                    <input type="text" value={formData.tempatLahir} onChange={e => handleChange('tempatLahir', e.target.value)} className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2.5 text-sm" />
                                </div>
                                <div>
                                    <label className="block mb-1 text-sm font-medium text-gray-700">Tanggal Lahir</label>
                                    <input type="date" value={formData.tanggalLahir ? formData.tanggalLahir.split('T')[0] : ''} onChange={e => handleChange('tanggalLahir', e.target.value)} className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2.5 text-sm" />
                                </div>
                            </div>

                            <h4 className="font-semibold text-gray-700 border-b pb-2 mt-6">Data Kependudukan & Lainnya</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                <div>
                                    <label className="block mb-1 text-sm font-medium text-gray-700">NIK (Nomor Induk Kependudukan)</label>
                                    <input type="text" value={formData.nik || ''} onChange={e => handleChange('nik', e.target.value)} className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2.5 text-sm" maxLength={16} />
                                </div>
                                <div>
                                    <label className="block mb-1 text-sm font-medium text-gray-700">NISN</label>
                                    <input type="text" value={formData.nisn || ''} onChange={e => handleChange('nisn', e.target.value)} className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2.5 text-sm" />
                                </div>
                                <div>
                                    <label className="block mb-1 text-sm font-medium text-gray-700">Kewarganegaraan</label>
                                    <select value={formData.kewarganegaraan || 'WNI'} onChange={e => handleChange('kewarganegaraan', e.target.value)} className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2.5 text-sm">
                                        <option value="WNI">WNI</option>
                                        <option value="WNA">WNA</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block mb-1 text-sm font-medium text-gray-700">Anak Ke-</label>
                                    <input type="number" value={formData.anakKe || ''} onChange={e => handleChange('anakKe', e.target.value)} className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2.5 text-sm" />
                                </div>
                                <div>
                                    <label className="block mb-1 text-sm font-medium text-gray-700">Jumlah Saudara</label>
                                    <input type="number" value={formData.jumlahSaudara || ''} onChange={e => handleChange('jumlahSaudara', e.target.value)} className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2.5 text-sm" />
                                </div>
                                <div>
                                    <label className="block mb-1 text-sm font-medium text-gray-700">Status Keluarga</label>
                                    <select value={formData.statusKeluarga || ''} onChange={e => handleChange('statusKeluarga', e.target.value)} className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2.5 text-sm">
                                        <option value="">- Pilih -</option>
                                        <option value="Anak Kandung">Anak Kandung</option>
                                        <option value="Anak Yatim">Anak Yatim</option>
                                        <option value="Anak Piatu">Anak Piatu</option>
                                        <option value="Anak Yatim Piatu">Anak Yatim Piatu</option>
                                        <option value="Anak Angkat">Anak Angkat</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* --- TAB 2: ALAMAT & KONTAK --- */}
                    {activeTab === 'alamat' && (
                        <div className="space-y-4">
                            <h4 className="font-semibold text-gray-700 border-b pb-2">Alamat Domisili</h4>
                            <div className="grid grid-cols-1 gap-4">
                                <div>
                                    <label className="block mb-1 text-sm font-medium text-gray-700">Alamat Lengkap (Jalan, RT/RW, Dusun)</label>
                                    <textarea rows={2} value={formData.alamat} onChange={e => handleChange('alamat', e.target.value)} className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2.5 text-sm" placeholder="Contoh: Jl. Merdeka No. 10, RT 01/RW 02, Dusun Krajan" />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                <div>
                                    <label className="block mb-1 text-sm font-medium text-gray-700">Desa / Kelurahan</label>
                                    <input type="text" value={formData.desaKelurahan || ''} onChange={e => handleChange('desaKelurahan', e.target.value)} className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2.5 text-sm" />
                                </div>
                                <div>
                                    <label className="block mb-1 text-sm font-medium text-gray-700">Kecamatan</label>
                                    <input type="text" value={formData.kecamatan || ''} onChange={e => handleChange('kecamatan', e.target.value)} className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2.5 text-sm" />
                                </div>
                                <div>
                                    <label className="block mb-1 text-sm font-medium text-gray-700">Kabupaten / Kota</label>
                                    <input type="text" value={formData.kabupatenKota || ''} onChange={e => handleChange('kabupatenKota', e.target.value)} className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2.5 text-sm" />
                                </div>
                                <div>
                                    <label className="block mb-1 text-sm font-medium text-gray-700">Provinsi</label>
                                    <input type="text" value={formData.provinsi || ''} onChange={e => handleChange('provinsi', e.target.value)} className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2.5 text-sm" />
                                </div>
                                <div>
                                    <label className="block mb-1 text-sm font-medium text-gray-700">Kode Pos</label>
                                    <input type="text" value={formData.kodePos || ''} onChange={e => handleChange('kodePos', e.target.value)} className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2.5 text-sm" />
                                </div>
                            </div>
                            
                            <h4 className="font-semibold text-gray-700 border-b pb-2 mt-6">Kontak Utama</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block mb-1 text-sm font-medium text-gray-700">Nomor HP / WhatsApp (Aktif)</label>
                                    <input type="text" value={formData.nomorHpWali} onChange={e => handleChange('nomorHpWali', e.target.value)} className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2.5 text-sm" placeholder="08xxxxxxxxxx" />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* --- TAB 3: DATA ORANG TUA --- */}
                    {activeTab === 'ortu' && (
                        <div className="space-y-8">
                            <div>
                                <h4 className="font-semibold text-teal-700 mb-3 border-b pb-1">Data Ayah Kandung</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    <div className="md:col-span-2"><label className="block mb-1 text-sm font-medium text-gray-700">Nama Lengkap Ayah</label><input type="text" value={formData.namaAyah || ''} onChange={e => handleChange('namaAyah', e.target.value)} className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2.5 text-sm" /></div>
                                    <div><label className="block mb-1 text-sm font-medium text-gray-700">NIK Ayah</label><input type="text" value={formData.nikAyah || ''} onChange={e => handleChange('nikAyah', e.target.value)} className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2.5 text-sm" /></div>
                                    <div><label className="block mb-1 text-sm font-medium text-gray-700">Status Hidup</label><select value={formData.statusAyah || ''} onChange={e => handleChange('statusAyah', e.target.value)} className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2.5 text-sm"><option value="">- Pilih -</option><option value="Hidup">Hidup</option><option value="Meninggal">Meninggal</option><option value="Cerai">Cerai</option></select></div>
                                    <div><label className="block mb-1 text-sm font-medium text-gray-700">Pendidikan</label><select value={formData.pendidikanAyah || ''} onChange={e => handleChange('pendidikanAyah', e.target.value)} className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2.5 text-sm"><option value="">- Pilih -</option>{pendidikanOptions.map(o=><option key={o} value={o}>{o}</option>)}</select></div>
                                    <div><label className="block mb-1 text-sm font-medium text-gray-700">Pekerjaan</label><select value={formData.pekerjaanAyah || ''} onChange={e => handleChange('pekerjaanAyah', e.target.value)} className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2.5 text-sm"><option value="">- Pilih -</option>{pekerjaanOptions.map(o=><option key={o} value={o}>{o}</option>)}</select></div>
                                    <div><label className="block mb-1 text-sm font-medium text-gray-700">Penghasilan</label><select value={formData.penghasilanAyah || ''} onChange={e => handleChange('penghasilanAyah', e.target.value)} className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2.5 text-sm"><option value="">- Pilih -</option>{penghasilanOptions.map(o=><option key={o} value={o}>{o}</option>)}</select></div>
                                    <div><label className="block mb-1 text-sm font-medium text-gray-700">No. Telepon Ayah</label><input type="text" value={formData.teleponAyah || ''} onChange={e => handleChange('teleponAyah', e.target.value)} className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2.5 text-sm" /></div>
                                </div>
                            </div>

                            <div>
                                <h4 className="font-semibold text-pink-700 mb-3 border-b pb-1">Data Ibu Kandung</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    <div className="md:col-span-2"><label className="block mb-1 text-sm font-medium text-gray-700">Nama Lengkap Ibu</label><input type="text" value={formData.namaIbu || ''} onChange={e => handleChange('namaIbu', e.target.value)} className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2.5 text-sm" /></div>
                                    <div><label className="block mb-1 text-sm font-medium text-gray-700">NIK Ibu</label><input type="text" value={formData.nikIbu || ''} onChange={e => handleChange('nikIbu', e.target.value)} className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2.5 text-sm" /></div>
                                    <div><label className="block mb-1 text-sm font-medium text-gray-700">Status Hidup</label><select value={formData.statusIbu || ''} onChange={e => handleChange('statusIbu', e.target.value)} className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2.5 text-sm"><option value="">- Pilih -</option><option value="Hidup">Hidup</option><option value="Meninggal">Meninggal</option><option value="Cerai">Cerai</option></select></div>
                                    <div><label className="block mb-1 text-sm font-medium text-gray-700">Pendidikan</label><select value={formData.pendidikanIbu || ''} onChange={e => handleChange('pendidikanIbu', e.target.value)} className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2.5 text-sm"><option value="">- Pilih -</option>{pendidikanOptions.map(o=><option key={o} value={o}>{o}</option>)}</select></div>
                                    <div><label className="block mb-1 text-sm font-medium text-gray-700">Pekerjaan</label><select value={formData.pekerjaanIbu || ''} onChange={e => handleChange('pekerjaanIbu', e.target.value)} className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2.5 text-sm"><option value="">- Pilih -</option>{pekerjaanOptions.map(o=><option key={o} value={o}>{o}</option>)}</select></div>
                                    <div><label className="block mb-1 text-sm font-medium text-gray-700">Penghasilan</label><select value={formData.penghasilanIbu || ''} onChange={e => handleChange('penghasilanIbu', e.target.value)} className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2.5 text-sm"><option value="">- Pilih -</option>{penghasilanOptions.map(o=><option key={o} value={o}>{o}</option>)}</select></div>
                                    <div><label className="block mb-1 text-sm font-medium text-gray-700">No. Telepon Ibu</label><input type="text" value={formData.teleponIbu || ''} onChange={e => handleChange('teleponIbu', e.target.value)} className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2.5 text-sm" /></div>
                                </div>
                            </div>
                            
                            <div>
                                <h4 className="font-semibold text-gray-700 mb-3 border-b pb-1">Data Wali</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                     <div className="md:col-span-2"><label className="block mb-1 text-sm font-medium text-gray-700">Nama Wali</label><input type="text" value={formData.namaWali} onChange={e => handleChange('namaWali', e.target.value)} className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2.5 text-sm" /></div>
                                     <div><label className="block mb-1 text-sm font-medium text-gray-700">Hubungan</label><select value={formData.hubunganWali || ''} onChange={e => handleChange('hubunganWali', e.target.value)} className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2.5 text-sm"><option value="">- Pilih -</option>{['Kakek', 'Nenek', 'Paman', 'Bibi', 'Kakak', 'Lainnya'].map(o=><option key={o} value={o}>{o}</option>)}</select></div>
                                     <div><label className="block mb-1 text-sm font-medium text-gray-700">Pekerjaan</label><select value={formData.pekerjaanWali || ''} onChange={e => handleChange('pekerjaanWali', e.target.value)} className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2.5 text-sm"><option value="">- Pilih -</option>{pekerjaanOptions.map(o=><option key={o} value={o}>{o}</option>)}</select></div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* --- TAB 4: SEKOLAH & DAFTAR --- */}
                    {activeTab === 'sekolah' && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="md:col-span-2">
                                    <label className="block mb-1 text-sm font-medium text-gray-700">Jenjang Dituju *</label>
                                    <select value={formData.jenjangId} onChange={e => handleChange('jenjangId', e.target.value)} className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2.5 text-sm">
                                        <option value={0}>-- Pilih Jenjang --</option>
                                        {settings.jenjang.map(j => <option key={j.id} value={j.id}>{j.nama}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block mb-1 text-sm font-medium text-gray-700">Asal Sekolah</label>
                                    <input type="text" value={formData.asalSekolah} onChange={e => handleChange('asalSekolah', e.target.value)} className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2.5 text-sm" />
                                </div>
                                <div>
                                    <label className="block mb-1 text-sm font-medium text-gray-700">Alamat Sekolah Asal</label>
                                    <input type="text" value={formData.alamatSekolahAsal || ''} onChange={e => handleChange('alamatSekolahAsal', e.target.value)} className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2.5 text-sm" />
                                </div>
                                <div>
                                    <label className="block mb-1 text-sm font-medium text-gray-700">Jalur Pendaftaran</label>
                                    <select value={formData.jalurPendaftaran} onChange={e => handleChange('jalurPendaftaran', e.target.value)} className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2.5 text-sm">
                                        <option value="Reguler">Reguler</option>
                                        <option value="Prestasi">Prestasi</option>
                                        <option value="Yatim/Dhuafa">Yatim/Dhuafa</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block mb-1 text-sm font-medium text-gray-700">Catatan Khusus</label>
                                    <input type="text" value={formData.catatan || ''} onChange={e => handleChange('catatan', e.target.value)} className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2.5 text-sm" />
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-4 border-t flex justify-end gap-2 bg-gray-50 rounded-b-lg">
                    <button onClick={onClose} className="px-4 py-2 border rounded-lg text-gray-600 hover:bg-gray-100 text-sm">Batal</button>
                    <button onClick={handleSave} className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-sm font-medium">Simpan Data</button>
                </div>
            </div>
        </div>
    );
};
