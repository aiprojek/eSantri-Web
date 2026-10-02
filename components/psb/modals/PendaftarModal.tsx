import React, { useState, useEffect } from 'react';
import { Pendaftar, PondokSettings, PsbBerkasFisik, PsbNilaiUjian, PendaftarStatus } from '../../../types';
import { useAppContext } from '../../../AppContext';
import { loadFirebasePsbUploadRuntime } from '../../../utils/lazyFirebaseRuntimes';
import { isFirebaseClientConfigReady } from '../../../firebaseStorage';
import { getPsbRegistrationNumber, calculatePsbAverageScore } from '../utils/psbUtils';
import { MarkdownEditor } from '../../common/MarkdownEditor';
import { MarkdownViewer } from '../../common/MarkdownViewer';

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
    const [activeTab, setActiveTab] = useState<'dataDiri' | 'alamat' | 'ortu' | 'sekolah' | 'seleksi' | 'tambahan'>('dataDiri');
    
    // State to hold parsed custom data
    const [parsedCustomData, setParsedCustomData] = useState<Record<string, any>>({});

    // Use 'any' for formData to allow flat address fields and avoid type conflicts with Pendaftar interface
    const [formData, setFormData] = useState<any>({
        nomorRegistrasi: '',
        namaLengkap: '',
        namaHijrah: '',
        nisn: '',
        nik: '',
        jenisKelamin: 'Laki-laki',
        tempatLahir: '',
        tanggalLahir: '',
        kewarganegaraan: 'WNI',
        agama: 'Islam',
        golonganDarah: '',
        statusKeluarga: '',
        anakKe: undefined,
        jumlahSaudara: undefined,
        citaCita: '',
        hobi: '',
        
        alamat: '', // Detail address as string
        desaKelurahan: '',
        kecamatan: '',
        kabupatenKota: '',
        provinsi: '',
        kodePos: '',
        telepon: '',
        jarakKePondok: '',

        // Fisik & Kesehatan
        tinggiBadan: undefined,
        beratBadan: undefined,
        riwayatPenyakit: '',
        berkebutuhanKhusus: '',

        namaAyah: '',
        nikAyah: '',
        statusAyah: '',
        pekerjaanAyah: '',
        pendidikanAyah: '',
        penghasilanAyah: '',
        teleponAyah: '',
        tempatLahirAyah: '',
        tanggalLahirAyah: '',
        
        namaIbu: '',
        nikIbu: '',
        statusIbu: '',
        pekerjaanIbu: '',
        pendidikanIbu: '',
        penghasilanIbu: '',
        teleponIbu: '',
        tempatLahirIbu: '',
        tanggalLahirIbu: '',

        namaWali: '',
        nikWali: '',
        nomorHpWali: '',
        statusWali: '',
        pekerjaanWali: '',
        pendidikanWali: '',
        penghasilanWali: '',
        
        jenjangId: 0,
        asalSekolah: '',
        alamatSekolahAsal: '',
        nomorIjazahSebelumnya: '',
        tahunLulusSebelumnya: '',
        jalurPendaftaran: 'Reguler',
        jenisSantri: 'Mondok - Baru',
        targetJuz: undefined,
        catatan: '',
        status: 'Baru',
        tanggalDaftar: new Date().toISOString(),
        customData: '{}',

        berkasFisik: {
            kk: false,
            akta: false,
            ijazahSkl: false,
            suratSehat: false,
            pasFoto: false,
            catatanBerkas: ''
        },

        nilaiUjian: {
            bacaQuran: '',
            tahfizh: '',
            akademik: '',
            wawancara: '',
            totalSkor: '',
            rekomendasi: 'Direkomendasikan',
            penguji: '',
            ruangUjian: 'Ruang Seleksi Posko 1',
            tanggalUjian: '',
            catatanUjian: ''
        }
    });

    const [isUploading, setIsUploading] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            if (pendaftarData) {
                // Flatten address object for form state
                const { alamat, ...rest } = pendaftarData;
                setFormData({
                    ...rest,
                    nomorRegistrasi: pendaftarData.nomorRegistrasi || '',
                    namaHijrah: pendaftarData.namaHijrah || '',
                    agama: pendaftarData.agama || 'Islam',
                    golonganDarah: pendaftarData.golonganDarah || '',
                    citaCita: pendaftarData.citaCita || '',
                    hobi: Array.isArray(pendaftarData.hobi) ? pendaftarData.hobi.join(', ') : (pendaftarData.hobi || ''),
                    telepon: pendaftarData.telepon || (pendaftarData as any).noHp || '',
                    jarakKePondok: pendaftarData.jarakKePondok || '',
                    tinggiBadan: pendaftarData.tinggiBadan ?? '',
                    beratBadan: pendaftarData.beratBadan ?? '',
                    riwayatPenyakit: pendaftarData.riwayatPenyakit || '',
                    berkebutuhanKhusus: pendaftarData.berkebutuhanKhusus || '',
                    tempatLahirAyah: pendaftarData.tempatLahirAyah || '',
                    tanggalLahirAyah: pendaftarData.tanggalLahirAyah ? pendaftarData.tanggalLahirAyah.split('T')[0] : '',
                    tempatLahirIbu: pendaftarData.tempatLahirIbu || '',
                    tanggalLahirIbu: pendaftarData.tanggalLahirIbu ? pendaftarData.tanggalLahirIbu.split('T')[0] : '',
                    nikWali: pendaftarData.nikWali || '',
                    pekerjaanWali: pendaftarData.pekerjaanWali || '',
                    pendidikanWali: pendaftarData.pendidikanWali || '',
                    penghasilanWali: pendaftarData.penghasilanWali || '',
                    nomorIjazahSebelumnya: pendaftarData.nomorIjazahSebelumnya || '',
                    tahunLulusSebelumnya: pendaftarData.tahunLulusSebelumnya || '',
                    jenisSantri: pendaftarData.jenisSantri || 'Mondok - Baru',
                    targetJuz: pendaftarData.targetJuz ?? '',
                    catatan: pendaftarData.catatan || '',
                    alamat: alamat?.detail || '',
                    desaKelurahan: alamat?.desaKelurahan || '',
                    kecamatan: alamat?.kecamatan || '',
                    kabupatenKota: alamat?.kabupatenKota || '',
                    provinsi: alamat?.provinsi || '',
                    kodePos: alamat?.kodePos || '',
                    berkasFisik: pendaftarData.berkasFisik || {
                        kk: false,
                        akta: false,
                        ijazahSkl: false,
                        suratSehat: false,
                        pasFoto: false,
                        catatanBerkas: ''
                    },
                    nilaiUjian: pendaftarData.nilaiUjian ? {
                        ...pendaftarData.nilaiUjian,
                        bacaQuran: pendaftarData.nilaiUjian.bacaQuran ?? '',
                        tahfizh: pendaftarData.nilaiUjian.tahfizh ?? '',
                        akademik: pendaftarData.nilaiUjian.akademik ?? '',
                        wawancara: pendaftarData.nilaiUjian.wawancara ?? '',
                        totalSkor: pendaftarData.nilaiUjian.totalSkor ?? '',
                        rekomendasi: pendaftarData.nilaiUjian.rekomendasi || 'Direkomendasikan',
                        penguji: pendaftarData.nilaiUjian.penguji || '',
                        ruangUjian: pendaftarData.nilaiUjian.ruangUjian || 'Ruang Seleksi Posko 1',
                        tanggalUjian: pendaftarData.nilaiUjian.tanggalUjian ? pendaftarData.nilaiUjian.tanggalUjian.split('T')[0] : '',
                        catatanUjian: pendaftarData.nilaiUjian.catatanUjian || ''
                    } : {
                        bacaQuran: '',
                        tahfizh: '',
                        akademik: '',
                        wawancara: '',
                        totalSkor: '',
                        rekomendasi: 'Direkomendasikan',
                        penguji: '',
                        ruangUjian: 'Ruang Seleksi Posko 1',
                        tanggalUjian: '',
                        catatanUjian: ''
                    }
                });
                try {
                    setParsedCustomData(pendaftarData.customData ? JSON.parse(pendaftarData.customData) : {});
                } catch (e) {
                    setParsedCustomData({});
                }
            } else {
                setFormData({
                    nomorRegistrasi: '',
                    namaLengkap: '',
                    namaHijrah: '',
                    nisn: '',
                    nik: '',
                    jenisKelamin: 'Laki-laki',
                    tempatLahir: '',
                    tanggalLahir: '',
                    kewarganegaraan: 'WNI',
                    agama: 'Islam',
                    golonganDarah: '',
                    statusKeluarga: '',
                    anakKe: undefined,
                    jumlahSaudara: undefined,
                    citaCita: '',
                    hobi: '',
                    alamat: '',
                    desaKelurahan: '',
                    kecamatan: '',
                    kabupatenKota: '',
                    provinsi: '',
                    kodePos: '',
                    telepon: '',
                    jarakKePondok: '',
                    tinggiBadan: undefined,
                    beratBadan: undefined,
                    riwayatPenyakit: '',
                    berkebutuhanKhusus: '',
                    namaAyah: '',
                    nikAyah: '',
                    statusAyah: '',
                    pekerjaanAyah: '',
                    pendidikanAyah: '',
                    penghasilanAyah: '',
                    teleponAyah: '',
                    tempatLahirAyah: '',
                    tanggalLahirAyah: '',
                    namaIbu: '',
                    nikIbu: '',
                    statusIbu: '',
                    pekerjaanIbu: '',
                    pendidikanIbu: '',
                    penghasilanIbu: '',
                    teleponIbu: '',
                    tempatLahirIbu: '',
                    tanggalLahirIbu: '',
                    namaWali: '',
                    nikWali: '',
                    nomorHpWali: '',
                    statusWali: '',
                    pekerjaanWali: '',
                    pendidikanWali: '',
                    penghasilanWali: '',
                    jenjangId: settings.jenjang[0]?.id || 0,
                    asalSekolah: '',
                    alamatSekolahAsal: '',
                    nomorIjazahSebelumnya: '',
                    tahunLulusSebelumnya: '',
                    jalurPendaftaran: 'Reguler',
                    jenisSantri: 'Mondok - Baru',
                    targetJuz: undefined,
                    catatan: '',
                    status: 'Baru',
                    tanggalDaftar: new Date().toISOString(),
                    customData: '{}',
                    berkasFisik: {
                        kk: false,
                        akta: false,
                        ijazahSkl: false,
                        suratSehat: false,
                        pasFoto: false,
                        catatanBerkas: ''
                    },
                    nilaiUjian: {
                        bacaQuran: '',
                        tahfizh: '',
                        akademik: '',
                        wawancara: '',
                        totalSkor: '',
                        rekomendasi: 'Direkomendasikan',
                        penguji: '',
                        ruangUjian: 'Ruang Seleksi Posko 1',
                        tanggalUjian: '',
                        catatanUjian: ''
                    }
                });
                setParsedCustomData({});
            }
            setActiveTab('dataDiri');
        }
    }, [isOpen, pendaftarData, settings.jenjang]);

    if (!isOpen) return null;

    const handleChange = (key: string, value: any) => {
        setFormData((prev: any) => ({ ...prev, [key]: value }));
    };

    const handleCustomDataChange = (key: string, value: string) => {
        const updated = { ...parsedCustomData, [key]: value };
        setParsedCustomData(updated);
        // Sync back to formData string immediately
        setFormData((prev: any) => ({ ...prev, customData: JSON.stringify(updated) }));
    };

    const handleRemoveFile = (fieldName: string) => {
        const updated = { ...parsedCustomData };
        delete updated[fieldName];
        setParsedCustomData(updated);
        setFormData((prev: any) => ({ ...prev, customData: JSON.stringify(updated) }));
        showAlert('Dihapus', `Dokumen ${fieldName} telah dihapus.`);
    };

    const handleFileUpload = async (fieldName: string, file: File) => {
        if (!formData.namaLengkap?.trim()) {
            showAlert('Nama Wajib Diisi', 'Mohon isi nama lengkap santri terlebih dahulu untuk penamaan file otomatis.');
            return;
        }

        // Check if file is excessively large (> 5MB)
        if (file.size > 5 * 1024 * 1024) {
            showAlert('File Terlalu Besar', 'Ukuran file melebihi 5MB. Mohon gunakan dokumen atau foto yang telah dikompres (di bawah 5MB).');
            return;
        }

        setIsUploading(fieldName);
        try {
            let fileUrl = '';
            const isFirebaseReady = isFirebaseClientConfigReady;

            // 1. If Firebase is configured, try uploading to Firebase Storage
            if (isFirebaseReady) {
                try {
                    const { uploadPsbDocument } = await loadFirebasePsbUploadRuntime();
                    fileUrl = await uploadPsbDocument({
                        fieldName,
                        santriName: formData.namaLengkap,
                        file,
                    });
                } catch (fbErr: any) {
                    console.warn("Firebase upload failed, falling back to local Base64 storage:", fbErr);
                }
            }

            // 2. If Firebase is not ready or failed, fallback to local Base64 Data URL (offline/IndexedDB)
            if (!fileUrl) {
                fileUrl = await new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result as string);
                    reader.onerror = reject;
                    reader.readAsDataURL(file);
                });
            }
            
            handleCustomDataChange(fieldName, fileUrl);
            const isCloud = fileUrl.startsWith('http');
            showAlert('Berhasil Disimpan', `Dokumen ${fieldName} berhasil disimpan ${isCloud ? 'ke Firebase Storage (Cloud)' : 'ke Database Lokal (IndexedDB / Base64 Offline)'}.`);
        } catch (error: any) {
            console.error("Upload failed:", error);
            showAlert('Gagal Menyimpan', `Gagal memproses berkas: ${error.message}`);
        } finally {
            setIsUploading(null);
        }
    };

    const handleSave = () => {
        if (!formData.namaLengkap?.trim() || !formData.jenjangId) {
            showAlert('Validasi Gagal', 'Nama Lengkap dan Jenjang wajib diisi.');
            return;
        }

        const jenjangName = settings.jenjang.find(j => j.id === Number(formData.jenjangId))?.nama;
        const nomorRegistrasi = formData.nomorRegistrasi?.trim() || getPsbRegistrationNumber({
            id: pendaftarData?.id || Date.now(),
            tanggalDaftar: formData.tanggalDaftar,
            nomorRegistrasi: formData.nomorRegistrasi
        } as any, jenjangName);

        const rawNilai = formData.nilaiUjian || {};
        const parsedNilai: PsbNilaiUjian = {
            bacaQuran: rawNilai.bacaQuran !== '' && rawNilai.bacaQuran !== undefined ? Number(rawNilai.bacaQuran) : undefined,
            tahfizh: rawNilai.tahfizh !== '' && rawNilai.tahfizh !== undefined ? Number(rawNilai.tahfizh) : undefined,
            akademik: rawNilai.akademik !== '' && rawNilai.akademik !== undefined ? Number(rawNilai.akademik) : undefined,
            wawancara: rawNilai.wawancara !== '' && rawNilai.wawancara !== undefined ? Number(rawNilai.wawancara) : undefined,
            rekomendasi: rawNilai.rekomendasi || 'Direkomendasikan',
            penguji: rawNilai.penguji || '',
            ruangUjian: rawNilai.ruangUjian || 'Ruang Seleksi Posko 1',
            tanggalUjian: rawNilai.tanggalUjian || '',
            catatanUjian: rawNilai.catatanUjian || ''
        };
        parsedNilai.totalSkor = calculatePsbAverageScore(parsedNilai);

        const parsedBerkas: PsbBerkasFisik = {
            kk: !!formData.berkasFisik?.kk,
            akta: !!formData.berkasFisik?.akta,
            ijazahSkl: !!formData.berkasFisik?.ijazahSkl,
            suratSehat: !!formData.berkasFisik?.suratSehat,
            pasFoto: !!formData.berkasFisik?.pasFoto,
            catatanBerkas: formData.berkasFisik?.catatanBerkas || ''
        };

        const dataToSave = {
            ...formData,
            nomorRegistrasi,
            berkasFisik: parsedBerkas,
            nilaiUjian: parsedNilai,
            // Reconstruct nested Alamat object
            alamat: {
                detail: formData.alamat,
                desaKelurahan: formData.desaKelurahan,
                kecamatan: formData.kecamatan,
                kabupatenKota: formData.kabupatenKota,
                provinsi: formData.provinsi,
                kodePos: formData.kodePos
            },
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
            const isLongOrFormatted = stringVal.includes('\n') || stringVal.length > 60 || /[#*`_~]/.test(stringVal);
            if (isLongOrFormatted) {
                return (
                    <div className="mt-1">
                        <MarkdownEditor
                            value={stringVal}
                            onChange={(newVal) => handleCustomDataChange(key, newVal)}
                            placeholder={`Isi ${key.replace(/_/g, ' ')}...`}
                            rows={3}
                        />
                    </div>
                );
            }
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
                        <TabButton id="seleksi" label="Seleksi & Ujian" />
                        <TabButton id="tambahan" label="Data Tambahan & Dokumen" />
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

                            <h4 className="font-semibold text-gray-700 border-b pb-2 mt-6">Data Kependudukan & Kontak</h4>
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
                                    <label className="block mb-1 text-sm font-medium text-gray-700">Agama</label>
                                    <select value={formData.agama || 'Islam'} onChange={e => handleChange('agama', e.target.value)} className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2.5 text-sm">
                                        <option value="Islam">Islam</option>
                                        <option value="Lainnya">Lainnya</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block mb-1 text-sm font-medium text-gray-700">Golongan Darah</label>
                                    <select value={formData.golonganDarah || ''} onChange={e => handleChange('golonganDarah', e.target.value)} className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2.5 text-sm">
                                        <option value="">- Belum Diketahui -</option>
                                        <option value="A">A</option>
                                        <option value="B">B</option>
                                        <option value="AB">AB</option>
                                        <option value="O">O</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block mb-1 text-sm font-medium text-gray-700">No. HP / WA Calon Santri</label>
                                    <input type="text" value={formData.telepon || ''} onChange={e => handleChange('telepon', e.target.value)} className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2.5 text-sm" placeholder="08xxxxxxxxxx" />
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

                            <h4 className="font-semibold text-gray-700 border-b pb-2 mt-6">Data Fisik, Kesehatan & Bakat</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div>
                                    <label className="block mb-1 text-sm font-medium text-gray-700">Tinggi Badan (cm)</label>
                                    <input type="number" value={formData.tinggiBadan || ''} onChange={e => handleChange('tinggiBadan', e.target.value)} className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2.5 text-sm" placeholder="Contoh: 155" />
                                </div>
                                <div>
                                    <label className="block mb-1 text-sm font-medium text-gray-700">Berat Badan (kg)</label>
                                    <input type="number" value={formData.beratBadan || ''} onChange={e => handleChange('beratBadan', e.target.value)} className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2.5 text-sm" placeholder="Contoh: 45" />
                                </div>
                                <div>
                                    <label className="block mb-1 text-sm font-medium text-gray-700">Hobi</label>
                                    <input type="text" value={formData.hobi || ''} onChange={e => handleChange('hobi', e.target.value)} className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2.5 text-sm" placeholder="Membaca, Memanah..." />
                                </div>
                                <div>
                                    <label className="block mb-1 text-sm font-medium text-gray-700">Cita-Cita</label>
                                    <input type="text" value={formData.citaCita || ''} onChange={e => handleChange('citaCita', e.target.value)} className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2.5 text-sm" placeholder="Ulama, Dokter..." />
                                </div>
                                <div className="md:col-span-2 lg:col-span-4">
                                    <label className="block mb-1 text-sm font-medium text-gray-700">Riwayat Penyakit / Alergi Khusus</label>
                                    <input type="text" value={formData.riwayatPenyakit || ''} onChange={e => handleChange('riwayatPenyakit', e.target.value)} className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2.5 text-sm" placeholder="Asma, alergi dingin, dll (kosongkan jika tidak ada)" />
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
                                    <textarea rows={2} value={formData.alamat} onChange={e => handleChange('alamat', e.target.value)} className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2.5 text-sm" placeholder="Contoh: Jl. Merdeka No. 10, RT 01/RW 02, Dusun Krajan"></textarea>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                            </div>
                        </div>
                    )}

                    {/* --- TAB 3: DATA ORANG TUA --- */}
                    {activeTab === 'ortu' && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {/* Ayah */}
                                <div className="space-y-4">
                                    <h4 className="font-semibold text-gray-700 border-b pb-2">Data Ayah</h4>
                                    <div>
                                        <label className="block mb-1 text-sm font-medium text-gray-700">Nama Ayah</label>
                                        <input type="text" value={formData.namaAyah || ''} onChange={e => handleChange('namaAyah', e.target.value)} className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2.5 text-sm" />
                                    </div>
                                    <div>
                                        <label className="block mb-1 text-sm font-medium text-gray-700">NIK Ayah</label>
                                        <input type="text" value={formData.nikAyah || ''} onChange={e => handleChange('nikAyah', e.target.value)} className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2.5 text-sm" maxLength={16} />
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="block mb-1 text-sm font-medium text-gray-700">Tempat Lahir</label>
                                            <input type="text" value={formData.tempatLahirAyah || ''} onChange={e => handleChange('tempatLahirAyah', e.target.value)} className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2.5 text-sm" />
                                        </div>
                                        <div>
                                            <label className="block mb-1 text-sm font-medium text-gray-700">Tanggal Lahir</label>
                                            <input type="date" value={formData.tanggalLahirAyah ? formData.tanggalLahirAyah.split('T')[0] : ''} onChange={e => handleChange('tanggalLahirAyah', e.target.value)} className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2.5 text-sm" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block mb-1 text-sm font-medium text-gray-700">Status Ayah</label>
                                        <select value={formData.statusAyah || ''} onChange={e => handleChange('statusAyah', e.target.value)} className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2.5 text-sm">
                                            <option value="">- Pilih -</option>
                                            <option value="Hidup">Hidup</option>
                                            <option value="Meninggal">Meninggal</option>
                                            <option value="Bercerai">Bercerai</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block mb-1 text-sm font-medium text-gray-700">Pendidikan Terakhir</label>
                                        <select value={formData.pendidikanAyah || ''} onChange={e => handleChange('pendidikanAyah', e.target.value)} className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2.5 text-sm">
                                            <option value="">- Pilih Pendidikan -</option>
                                            {pendidikanOptions.map(p => <option key={p} value={p}>{p}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block mb-1 text-sm font-medium text-gray-700">Pekerjaan</label>
                                        <input type="text" value={formData.pekerjaanAyah || ''} onChange={e => handleChange('pekerjaanAyah', e.target.value)} className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2.5 text-sm" />
                                    </div>
                                    <div>
                                        <label className="block mb-1 text-sm font-medium text-gray-700">Penghasilan Bulanan</label>
                                        <select value={formData.penghasilanAyah || ''} onChange={e => handleChange('penghasilanAyah', e.target.value)} className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2.5 text-sm">
                                            <option value="">- Pilih Penghasilan -</option>
                                            {penghasilanOptions.map(p => <option key={p} value={p}>{p}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block mb-1 text-sm font-medium text-gray-700">No. HP Ayah</label>
                                        <input type="text" value={formData.teleponAyah || ''} onChange={e => handleChange('teleponAyah', e.target.value)} className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2.5 text-sm" />
                                    </div>
                                </div>

                                {/* Ibu */}
                                <div className="space-y-4">
                                    <h4 className="font-semibold text-gray-700 border-b pb-2">Data Ibu</h4>
                                    <div>
                                        <label className="block mb-1 text-sm font-medium text-gray-700">Nama Ibu</label>
                                        <input type="text" value={formData.namaIbu || ''} onChange={e => handleChange('namaIbu', e.target.value)} className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2.5 text-sm" />
                                    </div>
                                    <div>
                                        <label className="block mb-1 text-sm font-medium text-gray-700">NIK Ibu</label>
                                        <input type="text" value={formData.nikIbu || ''} onChange={e => handleChange('nikIbu', e.target.value)} className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2.5 text-sm" maxLength={16} />
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="block mb-1 text-sm font-medium text-gray-700">Tempat Lahir</label>
                                            <input type="text" value={formData.tempatLahirIbu || ''} onChange={e => handleChange('tempatLahirIbu', e.target.value)} className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2.5 text-sm" />
                                        </div>
                                        <div>
                                            <label className="block mb-1 text-sm font-medium text-gray-700">Tanggal Lahir</label>
                                            <input type="date" value={formData.tanggalLahirIbu ? formData.tanggalLahirIbu.split('T')[0] : ''} onChange={e => handleChange('tanggalLahirIbu', e.target.value)} className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2.5 text-sm" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block mb-1 text-sm font-medium text-gray-700">Status Ibu</label>
                                        <select value={formData.statusIbu || ''} onChange={e => handleChange('statusIbu', e.target.value)} className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2.5 text-sm">
                                            <option value="">- Pilih -</option>
                                            <option value="Hidup">Hidup</option>
                                            <option value="Meninggal">Meninggal</option>
                                            <option value="Bercerai">Bercerai</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block mb-1 text-sm font-medium text-gray-700">Pendidikan Terakhir</label>
                                        <select value={formData.pendidikanIbu || ''} onChange={e => handleChange('pendidikanIbu', e.target.value)} className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2.5 text-sm">
                                            <option value="">- Pilih Pendidikan -</option>
                                            {pendidikanOptions.map(p => <option key={p} value={p}>{p}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block mb-1 text-sm font-medium text-gray-700">Pekerjaan</label>
                                        <input type="text" value={formData.pekerjaanIbu || ''} onChange={e => handleChange('pekerjaanIbu', e.target.value)} className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2.5 text-sm" />
                                    </div>
                                    <div>
                                        <label className="block mb-1 text-sm font-medium text-gray-700">Penghasilan Bulanan</label>
                                        <select value={formData.penghasilanIbu || ''} onChange={e => handleChange('penghasilanIbu', e.target.value)} className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2.5 text-sm">
                                            <option value="">- Pilih Penghasilan -</option>
                                            {penghasilanOptions.map(p => <option key={p} value={p}>{p}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block mb-1 text-sm font-medium text-gray-700">No. HP Ibu</label>
                                        <input type="text" value={formData.teleponIbu || ''} onChange={e => handleChange('teleponIbu', e.target.value)} className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2.5 text-sm" />
                                    </div>
                                </div>
                            </div>
                            
                            <h4 className="font-semibold text-gray-700 border-b pb-2 mt-6">Data Wali (Jika Ada)</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                <div>
                                    <label className="block mb-1 text-sm font-medium text-gray-700">Nama Wali</label>
                                    <input type="text" value={formData.namaWali || ''} onChange={e => handleChange('namaWali', e.target.value)} className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2.5 text-sm" />
                                </div>
                                <div>
                                    <label className="block mb-1 text-sm font-medium text-gray-700">NIK Wali</label>
                                    <input type="text" value={formData.nikWali || ''} onChange={e => handleChange('nikWali', e.target.value)} className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2.5 text-sm" maxLength={16} />
                                </div>
                                <div>
                                    <label className="block mb-1 text-sm font-medium text-gray-700">No. HP Wali</label>
                                    <input type="text" value={formData.nomorHpWali || ''} onChange={e => handleChange('nomorHpWali', e.target.value)} className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2.5 text-sm" />
                                </div>
                                <div>
                                    <label className="block mb-1 text-sm font-medium text-gray-700">Hubungan dengan Santri</label>
                                    <input type="text" value={formData.statusWali || ''} onChange={e => handleChange('statusWali', e.target.value)} className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2.5 text-sm" placeholder="Paman, Kakek, dll" />
                                </div>
                                <div>
                                    <label className="block mb-1 text-sm font-medium text-gray-700">Pekerjaan Wali</label>
                                    <input type="text" value={formData.pekerjaanWali || ''} onChange={e => handleChange('pekerjaanWali', e.target.value)} className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2.5 text-sm" />
                                </div>
                                <div>
                                    <label className="block mb-1 text-sm font-medium text-gray-700">Penghasilan Wali</label>
                                    <select value={formData.penghasilanWali || ''} onChange={e => handleChange('penghasilanWali', e.target.value)} className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2.5 text-sm">
                                        <option value="">- Pilih Penghasilan -</option>
                                        {penghasilanOptions.map(p => <option key={p} value={p}>{p}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* --- TAB 4: SEKOLAH --- */}
                    {activeTab === 'sekolah' && (
                        <div className="space-y-4">
                            <h4 className="font-semibold text-gray-700 border-b pb-2">Pendidikan Sebelumnya & Tujuan</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block mb-1 text-sm font-medium text-gray-700">Mendaftar ke Jenjang</label>
                                    <select value={formData.jenjangId} onChange={e => handleChange('jenjangId', parseInt(e.target.value))} className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2.5 text-sm">
                                        <option value={0}>-- Pilih Jenjang --</option>
                                        {settings.jenjang.map(j => <option key={j.id} value={j.id}>{j.nama}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block mb-1 text-sm font-medium text-gray-700">Jalur Pendaftaran</label>
                                    <select value={formData.jalurPendaftaran || 'Reguler'} onChange={e => handleChange('jalurPendaftaran', e.target.value)} className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2.5 text-sm">
                                        <option value="Reguler">Reguler</option>
                                        <option value="Prestasi">Prestasi</option>
                                        <option value="Beasiswa">Beasiswa</option>
                                        <option value="Pindahan">Pindahan</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block mb-1 text-sm font-medium text-gray-700">Sekolah Asal</label>
                                    <input type="text" value={formData.asalSekolah || ''} onChange={e => handleChange('asalSekolah', e.target.value)} className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2.5 text-sm" placeholder="Nama Sekolah Sebelumnya" />
                                </div>
                                <div>
                                    <label className="block mb-1 text-sm font-medium text-gray-700">Alamat Sekolah Asal</label>
                                    <input type="text" value={formData.alamatSekolahAsal || ''} onChange={e => handleChange('alamatSekolahAsal', e.target.value)} className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2.5 text-sm" />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* --- TAB 5: SELEKSI & UJIAN --- */}
                    {activeTab === 'seleksi' && (
                        <div className="space-y-6">
                            {/* Status Pendaftaran & Nomor Registrasi */}
                            <div className="p-4 bg-teal-50/70 border border-teal-200 rounded-xl space-y-4">
                                <h4 className="font-bold text-teal-950 text-sm flex items-center gap-2">
                                    <i className="bi bi-shield-check text-teal-700"></i>
                                    Status Alur Seleksi & Nomor Registrasi
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block mb-1 text-xs font-semibold text-gray-700">Tahapan / Status Pendaftar</label>
                                        <select
                                            value={formData.status || 'Baru'}
                                            onChange={e => handleChange('status', e.target.value)}
                                            className="w-full bg-white border border-gray-300 rounded-lg p-2.5 text-sm font-semibold text-gray-800 focus:ring-teal-500 focus:border-teal-500"
                                        >
                                            <option value="Baru">Baru (Belum Diverifikasi)</option>
                                            <option value="Verifikasi Berkas">Verifikasi Berkas</option>
                                            <option value="Ujian Masuk">Ujian Masuk / Seleksi</option>
                                            <option value="Cadangan">Cadangan</option>
                                            <option value="Diterima">Diterima (Lulus Seleksi)</option>
                                            <option value="Ditolak">Tidak Lulus / Ditolak</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block mb-1 text-xs font-semibold text-gray-700">Nomor Registrasi PSB</label>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={formData.nomorRegistrasi || ''}
                                                onChange={e => handleChange('nomorRegistrasi', e.target.value)}
                                                className="w-full bg-white border border-gray-300 rounded-lg p-2.5 text-sm font-mono font-bold text-teal-900"
                                                placeholder="Contoh: PSB-2025-SMP-0001"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const jenjangName = settings.jenjang.find(j => j.id === Number(formData.jenjangId))?.nama;
                                                    const autoNo = getPsbRegistrationNumber({
                                                        id: pendaftarData?.id || Date.now(),
                                                        tanggalDaftar: formData.tanggalDaftar
                                                    } as any, jenjangName);
                                                    handleChange('nomorRegistrasi', autoNo);
                                                }}
                                                className="px-3 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-medium whitespace-nowrap"
                                                title="Buat Nomor Registrasi Baru"
                                            >
                                                Auto
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Checklist Berkas Fisik */}
                            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                                    <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                                        <i className="bi bi-file-earmark-check text-slate-700"></i>
                                        Checklist Kelengkapan Berkas Fisik (Posko)
                                    </h4>
                                    <span className="text-xs text-slate-500">Centang dokumen yang diserahkan fisik</span>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-1">
                                    <label className="flex items-center gap-2.5 p-2 bg-white rounded-lg border border-gray-200 text-xs font-medium cursor-pointer hover:bg-teal-50/50">
                                        <input
                                            type="checkbox"
                                            checked={!!formData.berkasFisik?.kk}
                                            onChange={e => handleChange('berkasFisik', { ...formData.berkasFisik, kk: e.target.checked })}
                                            className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 border-gray-300"
                                        />
                                        <span>Fotokopi Kartu Keluarga (KK)</span>
                                    </label>

                                    <label className="flex items-center gap-2.5 p-2 bg-white rounded-lg border border-gray-200 text-xs font-medium cursor-pointer hover:bg-teal-50/50">
                                        <input
                                            type="checkbox"
                                            checked={!!formData.berkasFisik?.akta}
                                            onChange={e => handleChange('berkasFisik', { ...formData.berkasFisik, akta: e.target.checked })}
                                            className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 border-gray-300"
                                        />
                                        <span>Fotokopi Akta Kelahiran</span>
                                    </label>

                                    <label className="flex items-center gap-2.5 p-2 bg-white rounded-lg border border-gray-200 text-xs font-medium cursor-pointer hover:bg-teal-50/50">
                                        <input
                                            type="checkbox"
                                            checked={!!formData.berkasFisik?.ijazahSkl}
                                            onChange={e => handleChange('berkasFisik', { ...formData.berkasFisik, ijazahSkl: e.target.checked })}
                                            className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 border-gray-300"
                                        />
                                        <span>Fotokopi Ijazah / SKL</span>
                                    </label>

                                    <label className="flex items-center gap-2.5 p-2 bg-white rounded-lg border border-gray-200 text-xs font-medium cursor-pointer hover:bg-teal-50/50">
                                        <input
                                            type="checkbox"
                                            checked={!!formData.berkasFisik?.suratSehat}
                                            onChange={e => handleChange('berkasFisik', { ...formData.berkasFisik, suratSehat: e.target.checked })}
                                            className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 border-gray-300"
                                        />
                                        <span>Surat Keterangan Sehat Dokter</span>
                                    </label>

                                    <label className="flex items-center gap-2.5 p-2 bg-white rounded-lg border border-gray-200 text-xs font-medium cursor-pointer hover:bg-teal-50/50">
                                        <input
                                            type="checkbox"
                                            checked={!!formData.berkasFisik?.pasFoto}
                                            onChange={e => handleChange('berkasFisik', { ...formData.berkasFisik, pasFoto: e.target.checked })}
                                            className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 border-gray-300"
                                        />
                                        <span>Pas Foto Calon Santri (3x4)</span>
                                    </label>
                                </div>

                                <div className="pt-2">
                                    <label className="block mb-1 text-xs font-medium text-gray-700">Catatan Administrasi Berkas Fisik</label>
                                    <input
                                        type="text"
                                        value={formData.berkasFisik?.catatanBerkas || ''}
                                        onChange={e => handleChange('berkasFisik', { ...formData.berkasFisik, catatanBerkas: e.target.value })}
                                        className="w-full bg-white border border-gray-300 rounded-lg p-2 text-xs"
                                        placeholder="Contoh: SKL asli belum dilegalisir, janji serahkan saat daftar ulang"
                                    />
                                </div>
                            </div>

                            {/* Lembar Penilaian Ujian Masuk */}
                            <div className="p-4 bg-amber-50/60 border border-amber-200 rounded-xl space-y-4">
                                <div className="flex items-center justify-between border-b border-amber-200/80 pb-2">
                                    <h4 className="font-bold text-amber-950 text-sm flex items-center gap-2">
                                        <i className="bi bi-pencil-square text-amber-800"></i>
                                        Lembar Penilaian Ujian Masuk & Seleksi
                                    </h4>
                                    <span className="text-xs font-bold text-amber-900 bg-amber-100 px-2.5 py-0.5 rounded-full">
                                        Rata-rata:{' '}
                                        {calculatePsbAverageScore({
                                            bacaQuran: formData.nilaiUjian?.bacaQuran ? Number(formData.nilaiUjian.bacaQuran) : undefined,
                                            tahfizh: formData.nilaiUjian?.tahfizh ? Number(formData.nilaiUjian.tahfizh) : undefined,
                                            akademik: formData.nilaiUjian?.akademik ? Number(formData.nilaiUjian.akademik) : undefined,
                                            wawancara: formData.nilaiUjian?.wawancara ? Number(formData.nilaiUjian.wawancara) : undefined
                                        }) || 0}
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    <div>
                                        <label className="block mb-1 text-xs font-medium text-gray-700">Tanggal Pelaksanaan Ujian</label>
                                        <input
                                            type="date"
                                            value={formData.nilaiUjian?.tanggalUjian || ''}
                                            onChange={e => handleChange('nilaiUjian', { ...formData.nilaiUjian, tanggalUjian: e.target.value })}
                                            className="w-full bg-white border border-gray-300 rounded-lg p-2 text-xs"
                                        />
                                    </div>
                                    <div>
                                        <label className="block mb-1 text-xs font-medium text-gray-700">Ruang / Meja Seleksi</label>
                                        <input
                                            type="text"
                                            value={formData.nilaiUjian?.ruangUjian || ''}
                                            onChange={e => handleChange('nilaiUjian', { ...formData.nilaiUjian, ruangUjian: e.target.value })}
                                            className="w-full bg-white border border-gray-300 rounded-lg p-2 text-xs"
                                            placeholder="Ruang 1"
                                        />
                                    </div>
                                    <div>
                                        <label className="block mb-1 text-xs font-medium text-gray-700">Nama Penguji / Asatidz</label>
                                        <input
                                            type="text"
                                            value={formData.nilaiUjian?.penguji || ''}
                                            onChange={e => handleChange('nilaiUjian', { ...formData.nilaiUjian, penguji: e.target.value })}
                                            className="w-full bg-white border border-gray-300 rounded-lg p-2 text-xs"
                                            placeholder="Ust. Ahmad"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-1">
                                    <div>
                                        <label className="block mb-1 text-xs font-semibold text-gray-700">1. Baca Al-Qur'an (0-100)</label>
                                        <input
                                            type="number"
                                            min={0}
                                            max={100}
                                            value={formData.nilaiUjian?.bacaQuran ?? ''}
                                            onChange={e => handleChange('nilaiUjian', { ...formData.nilaiUjian, bacaQuran: e.target.value })}
                                            className="w-full bg-white border border-gray-300 rounded-lg p-2 text-sm font-bold font-mono text-center"
                                            placeholder="85"
                                        />
                                    </div>
                                    <div>
                                        <label className="block mb-1 text-xs font-semibold text-gray-700">2. Tahfizh/Hafalan (0-100)</label>
                                        <input
                                            type="number"
                                            min={0}
                                            max={100}
                                            value={formData.nilaiUjian?.tahfizh ?? ''}
                                            onChange={e => handleChange('nilaiUjian', { ...formData.nilaiUjian, tahfizh: e.target.value })}
                                            className="w-full bg-white border border-gray-300 rounded-lg p-2 text-sm font-bold font-mono text-center"
                                            placeholder="80"
                                        />
                                    </div>
                                    <div>
                                        <label className="block mb-1 text-xs font-semibold text-gray-700">3. Diniyah/Akademik (0-100)</label>
                                        <input
                                            type="number"
                                            min={0}
                                            max={100}
                                            value={formData.nilaiUjian?.akademik ?? ''}
                                            onChange={e => handleChange('nilaiUjian', { ...formData.nilaiUjian, akademik: e.target.value })}
                                            className="w-full bg-white border border-gray-300 rounded-lg p-2 text-sm font-bold font-mono text-center"
                                            placeholder="78"
                                        />
                                    </div>
                                    <div>
                                        <label className="block mb-1 text-xs font-semibold text-gray-700">4. Wawancara (0-100)</label>
                                        <input
                                            type="number"
                                            min={0}
                                            max={100}
                                            value={formData.nilaiUjian?.wawancara ?? ''}
                                            onChange={e => handleChange('nilaiUjian', { ...formData.nilaiUjian, wawancara: e.target.value })}
                                            className="w-full bg-white border border-gray-300 rounded-lg p-2 text-sm font-bold font-mono text-center"
                                            placeholder="90"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                                    <div>
                                        <label className="block mb-1 text-xs font-semibold text-gray-700">Rekomendasi Dewan Penguji</label>
                                        <select
                                            value={formData.nilaiUjian?.rekomendasi || 'Direkomendasikan'}
                                            onChange={e => handleChange('nilaiUjian', { ...formData.nilaiUjian, rekomendasi: e.target.value })}
                                            className="w-full bg-white border border-gray-300 rounded-lg p-2 text-xs font-semibold"
                                        >
                                            <option value="Sangat Direkomendasikan">Sangat Direkomendasikan</option>
                                            <option value="Direkomendasikan">Direkomendasikan</option>
                                            <option value="Dipertimbangkan">Dipertimbangkan (Cadangan)</option>
                                            <option value="Tidak Direkomendasikan">Tidak Direkomendasikan</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block mb-1 text-xs font-semibold text-gray-700">Catatan / Evaluasi Khusus Penguji</label>
                                        <input
                                            type="text"
                                            value={formData.nilaiUjian?.catatanUjian || ''}
                                            onChange={e => handleChange('nilaiUjian', { ...formData.nilaiUjian, catatanUjian: e.target.value })}
                                            className="w-full bg-white border border-gray-300 rounded-lg p-2 text-xs"
                                            placeholder="Contoh: Makharijul huruf baik, tajwid perlu pembinaan dasar"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* --- TAB 5: DATA TAMBAHAN --- */}
                    {activeTab === 'tambahan' && (
                        <div className="space-y-4">
                            <h4 className="font-semibold text-gray-700 border-b pb-2">Catatan & Data Kustom</h4>
                            <div>
                                <label className="block mb-1 text-sm font-medium text-gray-700">Catatan Panitia / Harapan Wali (Markdown)</label>
                                <MarkdownEditor
                                    value={formData.catatan || ''}
                                    onChange={val => handleChange('catatan', val)}
                                    placeholder="Catatan khusus calon santri, riwayat wawancara, pesan orang tua (mendukung markdown)..."
                                    rows={4}
                                />
                            </div>
                            
                            {Object.keys(parsedCustomData).length > 0 && (
                                <div className="mt-4">
                                    <h5 className="font-bold text-gray-600 mb-2 text-sm uppercase">Data Tambahan (dari Formulir Online)</h5>
                                    <div className="space-y-3 bg-gray-50 p-4 rounded-lg border border-gray-200">
                                        {Object.entries(parsedCustomData).map(([key, val]) => (
                                            <div key={key}>
                                                <label className="block text-xs font-bold text-gray-500 uppercase">{key.replace(/_/g, ' ')}</label>
                                                {renderCustomValue(key, val)}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="mt-8 pt-4 border-t border-dashed">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                                    <h5 className="font-bold text-gray-700 flex items-center gap-2 text-sm">
                                        <i className="bi bi-file-earmark-arrow-up text-teal-600"></i>
                                        Unggah Dokumen & Berkas Lampiran
                                    </h5>
                                    {isFirebaseClientConfigReady ? (
                                        <span className="text-[11px] bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-0.5 rounded-full font-semibold flex items-center gap-1 shrink-0">
                                            <i className="bi bi-cloud-check-fill text-blue-600"></i> Cloud: Firebase Storage Aktif
                                        </span>
                                    ) : (
                                        <span className="text-[11px] bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-0.5 rounded-full font-semibold flex items-center gap-1 shrink-0">
                                            <i className="bi bi-hdd-fill text-amber-600"></i> Mode Offline: Disimpan di IndexedDB (Base64)
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs text-gray-500 mb-3">
                                    Unggah file berkas calon santri (format JPG, PNG, atau PDF). File tetap tersimpan aman di database lokal aplikasi meskipun tanpa Firebase.
                                </p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {['Kartu Keluarga', 'Akte Kelahiran', 'KTP Orang Tua', 'Ijazah Terakhir', 'Pas Foto'].map(docName => {
                                        const fileVal = parsedCustomData[docName];
                                        return (
                                            <div key={docName} className="p-3.5 bg-white border border-gray-200 rounded-xl shadow-xs">
                                                <div className="flex items-center justify-between mb-2">
                                                    <label className="block text-xs font-bold text-gray-700 uppercase">{docName}</label>
                                                    {fileVal && (
                                                        <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                                                            <i className="bi bi-check-circle-fill"></i> Terunggah
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <input 
                                                        type="file" 
                                                        id={`upload-${docName}`}
                                                        className="hidden"
                                                        accept="image/*,.pdf"
                                                        onChange={(e) => {
                                                            const file = e.target.files?.[0];
                                                            if (file) handleFileUpload(docName, file);
                                                        }}
                                                    />
                                                    <button 
                                                        type="button"
                                                        onClick={() => document.getElementById(`upload-${docName}`)?.click()}
                                                        disabled={!!isUploading}
                                                        className="flex-grow flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold transition-colors border border-slate-300 disabled:opacity-50"
                                                    >
                                                        {isUploading === docName ? (
                                                            <i className="bi bi-arrow-repeat animate-spin text-teal-600"></i>
                                                        ) : (
                                                            <i className="bi bi-upload text-teal-600"></i>
                                                        )}
                                                        {isUploading === docName ? 'Memproses...' : fileVal ? 'Ganti Berkas' : `Pilih File`}
                                                    </button>
                                                    {fileVal && (
                                                        <>
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    if (typeof fileVal === 'string') {
                                                                        const w = window.open();
                                                                        if (w) w.document.write(`<iframe src="${fileVal}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`);
                                                                    }
                                                                }}
                                                                className="px-2.5 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-lg text-xs font-semibold"
                                                                title="Lihat Berkas"
                                                            >
                                                                <i className="bi bi-eye"></i>
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleRemoveFile(docName)}
                                                                className="px-2.5 py-2 bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 rounded-lg text-xs font-semibold"
                                                                title="Hapus Berkas"
                                                            >
                                                                <i className="bi bi-trash"></i>
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-4 border-t bg-gray-50 flex justify-end gap-2 rounded-b-lg">
                    <button onClick={onClose} className="px-4 py-2 text-gray-600 bg-white hover:bg-gray-100 border border-gray-300 rounded-lg text-sm font-medium">Batal</button>
                    <button onClick={handleSave} className="px-6 py-2 bg-teal-600 text-white hover:bg-teal-700 rounded-lg text-sm font-bold shadow-sm">Simpan Data</button>
                </div>
            </div>
        </div>
    );
};
