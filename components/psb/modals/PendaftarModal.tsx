
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
    const [activeTab, setActiveTab] = useState<'dataDiri' | 'alamat' | 'ortu' | 'sekolah' | 'tambahan'>('dataDiri');
    
    // State to hold parsed custom data
    const [parsedCustomData, setParsedCustomData] = useState<Record<string, any>>({});

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
        statusWali: '',
        pekerjaanWali: '',
        pendidikanWali: '',
        penghasilanWali: '',
        
        jenjangId: 0,
        asalSekolah: '',
        alamatSekolahAsal: '',
        jalurPendaftaran: 'Reguler',
        catatan: '',
        status: 'Baru',
        tanggalDaftar: new Date().toISOString(),
        customData: '{}'
    });

    useEffect(() => {
        if (isOpen) {
            if (pendaftarData) {
                setFormData(pendaftarData);
                try {
                    setParsedCustomData(pendaftarData.customData ? JSON.parse(pendaftarData.customData) : {});
                } catch (e) {
                    setParsedCustomData({});
                }
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
                    tanggalDaftar: new Date().toISOString(),
                    customData: '{}'
                });
                setParsedCustomData({});
            }
            setActiveTab('dataDiri');
        }
    }, [isOpen, pendaftarData, settings.jenjang]);

    if (!isOpen) return null;

    const handleChange = (key: keyof Pendaftar, value: any) => {
        setFormData(prev => ({ ...prev, [key]: value }));
    };

    const handleCustomDataChange = (key: string, value: string) => {
        const updated = { ...parsedCustomData, [key]: value };
        setParsedCustomData(updated);
        // Sync back to formData string immediately
        setFormData(prev => ({ ...prev, customData: JSON.stringify(updated) }));
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
            jumlahSaudara: formData.jumlahSaudara ? Number(formData.jumlahSaudara) : undefined,
            // Ensure customData matches the current parsed state
            customData: JSON.stringify(parsedCustomData)
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
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors whitespace-nowrap ${
                activeTab === id
                    ? 'border-b-2 border-teal-600 text-teal-600 bg-gray-50'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
        >
            {label}
        </button>
    );

    const renderCustomValue = (key: string, val: any) => {
        const stringVal = String(val || '');
        const isUrl = stringVal.startsWith('http');
        const isBase64Image = stringVal.startsWith('data:image');

        if (isUrl) {
            return (
                <div className="flex items-center gap-2 mt-1">
                    <input 
                        type="text" 
                        value={stringVal} 
                        onChange={(e) => handleCustomDataChange(key, e.target.value)}
                        className="flex-grow bg-gray-50 border border-gray-300 rounded-lg p-2.5 text-sm"
                    />
                    <a href={stringVal} target="_blank" rel="noopener noreferrer" className="bg-blue-100 text-blue-700 px-3 py-2.5 rounded-lg hover:bg-blue-200 text-sm font-medium flex items-center gap-2">
                        <i className="bi bi-box-arrow-up-right"></i> Buka
                    </a>
                </div>
            );
        } else if (isBase64Image) {
            return (
                <div className="mt-1 space-y-2">
                    <img src={stringVal} alt={key} className="max-h-40 rounded border p-1 bg-white" />
                    <button 
                        onClick={() => {
                            const w = window.open("");
                            w?.document.write('<img src="' + stringVal + '" />');
                        }}
                        className="text-xs text-blue-600 hover:underline"
                    >
                        Lihat Ukuran Penuh
                    </button>
                    {/* Hidden input to hold value */}
                    <input type="hidden" value={stringVal} /> 
                </div>
            );
        } else {
            return (
                <input 
                    type="text" 
                    value={stringVal} 
                    onChange={(e) => handleCustomDataChange(key, e.target.value)}
                    className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2.5 text-sm mt-1"
                />
            );
        }
    };

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
                    <nav className="flex space-x-2 overflow-x-auto pb-1 scrollbar-hide">
                        <TabButton id="dataDiri" label="Identitas" />
                        <TabButton id="alamat" label="Alamat" />
                        <TabButton id="ortu" label="Orang Tua" />
                        <TabButton id="sekolah" label="Sekolah" />
                        <TabButton id="tambahan" label="Data Tambahan & Berkas" />
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
                                    <textarea rows={2} value={formData.alamat} onChange={e => handleChange('alamat', e.target.value)} className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2.5 text-sm" placeholder="Contoh: Jl. Merdeka No. 10, RT 01/RW 02, Dusun