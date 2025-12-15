
import { PondokSettings, Santri, TenagaPengajar, MataPelajaran, GedungAsrama, Kamar } from '../types';

export const initialJenjang = [
  { id: 1, nama: 'Salafiyah Wustho', kode: 'SW', mudirId: 2 },
  { id: 2, nama: 'Salafiyah Ulya', kode: 'SU', mudirId: 3 },
];

export const initialKelas = [ // Sebelumnya initialTingkat
  { id: 1, nama: 'Kelas 1', jenjangId: 1 },
  { id: 2, nama: 'Kelas 2', jenjangId: 1 },
  { id: 3, nama: 'Kelas 3', jenjangId: 1 },
  { id: 4, nama: 'Kelas 1', jenjangId: 2 },
  { id: 5, nama: 'Kelas 2', jenjangId: 2 },
  { id: 6, nama: 'Kelas 3', jenjangId: 2 },
];

export const initialRombel = [ // Sebelumnya initialKelas
  // Jenjang 1: Wustho
  { id: 1, nama: 'SW - 1A Putra', kelasId: 1, waliKelasId: 4 },
  { id: 2, nama: 'SW - 1B Putra', kelasId: 1 },
  { id: 3, nama: 'SW - 1A Putri', kelasId: 1, waliKelasId: 5 },
  { id: 4, nama: 'SW - 2A Putra', kelasId: 2 },
  { id: 5, nama: 'SW - 2A Putri', kelasId: 2 },
  { id: 6, nama: 'SW - 3A Putra', kelasId: 3 },
  { id: 7, nama: 'SW - 3A Putri', kelasId: 3 },
  // Jenjang 2: Ulya
  { id: 8, nama: 'SU - 1A Putra', kelasId: 4 },
  { id: 9, nama: 'SU - 1A Putri', kelasId: 4 },
  { id: 10, nama: 'SU - 2A Putra', kelasId: 5 },
  { id: 11, nama: 'SU - 2A Putri', kelasId: 5 },
  { id: 12, nama: 'SU - 3A Putra', kelasId: 6 },
  { id: 13, nama: 'SU - 3A Putri', kelasId: 6 },
];


export const initialMataPelajaran: MataPelajaran[] = [
  { id: 1, nama: 'Aqidah', jenjangId: 1 },
  { id: 2, nama: 'Fiqih', jenjangId: 1 },
  { id: 3, nama: 'Bahasa Arab', jenjangId: 1 },
  { id: 4, nama: 'Hadits', jenjangId: 1 },
  { id: 5, nama: 'Tafsir', jenjangId: 2 },
  { id: 6, nama: 'Ushul Fiqih', jenjangId: 2 },
  { id: 7, nama: 'Musthalah Hadits', jenjangId: 2 },
];

export const initialTenagaPengajar: TenagaPengajar[] = [
    { 
      id: 1, 
      nama: 'Dr. Ahmad Fauzi, M.Pd.I', 
      riwayatJabatan: [
        { id: 1, jabatan: 'Mudir Aam', tanggalMulai: '2020-01-15' }
      ] 
    },
    { 
      id: 2, 
      nama: 'Karsiman', 
      riwayatJabatan: [
        { id: 1, jabatan: 'Mudir Marhalah Wustho', tanggalMulai: '2021-07-01' }
      ] 
    },
    { 
      id: 3, 
      nama: 'Ust. Hasan Basri, S.Pd.', 
      riwayatJabatan: [
        { id: 1, jabatan: 'Mudir Marhalah Ulya', tanggalMulai: '2021-07-01' }
      ] 
    },
    { 
      id: 4, 
      nama: 'Ust. Muhammad Iqbal', 
      riwayatJabatan: [
        { id: 1, jabatan: 'Wali Kelas', tanggalMulai: '2022-07-15' },
        { id: 2, jabatan: 'Musyrif Asrama', tanggalMulai: '2022-07-15' }
      ] 
    },
    { 
      id: 5, 
      nama: 'Usth. Fatimah Az-Zahra, S.Ag', 
      riwayatJabatan: [
        { id: 1, jabatan: 'Wali Kelas', tanggalMulai: '2022-08-01' },
        { id: 2, jabatan: 'Musyrifah Asrama', tanggalMulai: '2022-08-01' }
      ] 
    },
    { 
      id: 6, 
      nama: 'Ust. Sulaiman Al-Hafidz', 
      riwayatJabatan: [
        { id: 1, jabatan: 'Guru Tahfidz', tanggalMulai: '2019-05-20', tanggalSelesai: '2023-12-31' }
      ] 
    },
];

export const initialGedungAsrama: GedungAsrama[] = [
  { id: 1, nama: 'Gedung Ali bin Abi Thalib', jenis: 'Putra' },
  { id: 2, nama: 'Gedung Aisyah', jenis: 'Putri' },
];

export const initialKamar: Kamar[] = [
  // Gedung Putra
  { id: 1, nama: 'Kamar 101', gedungId: 1, kapasitas: 4, musyrifId: 4 },
  { id: 2, nama: 'Kamar 102', gedungId: 1, kapasitas: 4 },
  // Gedung Putri
  { id: 3, nama: 'Kamar A1', gedungId: 2, kapasitas: 6, musyrifId: 5 },
  { id: 4, nama: 'Kamar A2', gedungId: 2, kapasitas: 6 },
];


export const initialSettings: PondokSettings = {
  namaYayasan: 'Yayasan Cahaya Ilmu',
  skMenteri: 'AHU-12345.AH.01.04.Tahun 2023',
  aktaNotaris: 'Nomor 01, Tanggal 01 Januari 2023',
  namaPonpes: 'Pondok Pesantren Al-Hikmah',
  nspp: '123456789012',
  npsn: '98765432',
  alamat: 'Jl. Pesantren No. 1, Desa Barokah, Kab. Sejahtera',
  telepon: '081234567890',
  website: 'www.al-hikmah.sch.id',
  email: 'info@al-hikmah.sch.id',
  logoYayasanUrl: '',
  logoPonpesUrl: '',
  mudirAamId: 1,
  jenjang: initialJenjang,
  kelas: initialKelas, // sebelumnya tingkat
  rombel: initialRombel, // sebelumnya kelas
  tenagaPengajar: initialTenagaPengajar,
  mataPelajaran: initialMataPelajaran,
  gedungAsrama: initialGedungAsrama,
  kamar: initialKamar,
  biaya: [
    { id: 1, nama: 'SPP Salafiyah Wustho', nominal: 150000, jenis: 'Bulanan', jenjangId: 1 },
    { id: 2, nama: 'SPP Salafiyah Ulya', nominal: 200000, jenis: 'Bulanan', jenjangId: 2 },
    { id: 3, nama: 'Uang Pangkal Santri Baru', nominal: 1200000, jenis: 'Cicilan', jumlahCicilan: 3, nominalCicilan: 400000 },
  ],
  nisSettings: {
    generationMethod: 'custom',
    // Custom Method Settings
    format: '{TM}{TH} {KODE} {NO_URUT}',
    jenjangConfig: [
      { jenjangId: 1, startNumber: 1, padding: 3 },
      { jenjangId: 2, startNumber: 1, padding: 3 },
    ],
    masehiYearSource: 'auto',
    manualMasehiYear: new Date().getFullYear(),
    hijriahYearSource: 'auto',
    manualHijriahYear: 1446,
    // Global Method Settings
    globalPrefix: '',
    globalUseYearPrefix: true,
    globalUseJenjangCode: false,
    globalStartNumber: 1,
    globalPadding: 4,
    // DOB Method Settings
    dobFormat: 'DDMMYY',
    dobSeparator: '',
    dobUseJenjangCode: false,
    dobPadding: 3,
  },
  suratTagihanPembuka: `Assalamu'alaikum Warahmatullahi Wabarakatuh,\n\nDengan hormat, bersama surat ini kami sampaikan bahwa berdasarkan catatan administrasi keuangan kami, terdapat beberapa kewajiban pembayaran yang belum diselesaikan oleh ananda. Berikut adalah rinciannya:`,
  suratTagihanPenutup: `Kami memohon kepada Bapak/Ibu untuk dapat segera menyelesaikan administrasi tersebut. Untuk pembayaran dapat dilakukan secara langsung di kantor administrasi pondok.\n\nDemikian surat pemberitahuan ini kami sampaikan. Atas perhatian dan kerjasamanya, kami ucapkan Jazakumullahu khairan.\n\nWassalamu'alaikum Warahmatullahi Wabarakatuh.`,
  suratTagihanCatatan: `Pembayaran dapat dilakukan melalui transfer ke rekening Bank Syariah Indonesia (BSI) No. Rek: 123456789 a.n. Bendahara Pondok Pesantren.`,
  pesanWaTunggakan: `Yth. Bapak/Ibu Wali dari ananda {NAMA_SANTRI},\n\nKami informasikan dari {NAMA_PONPES} bahwa terdapat tagihan yang belum diselesaikan sebesar {JUMLAH_TUNGGAKAN}.\n\nMohon untuk dapat segera melakukan pembayaran. Abaikan pesan ini jika sudah membayar.\n\nTerima kasih.\n- Bendahara {NAMA_PONPES}`,
  backupConfig: {
    frequency: 'weekly',
    lastBackup: null,
  },
  cloudSyncConfig: {
    provider: 'none',
    lastSync: null
  }
};

const commonSantriData = (id: number) => ({
    fotoUrl: 'https://placehold.co/150x200/e2e8f0/334155?text=Foto',
    kewarganegaraan: 'WNI' as const,
    jenisSantri: 'Mondok - Baru' as const,
    tanggalLahir: '2010-01-01',
    alamat: {
        detail: `Jl. Santri No. ${id}, RT 01/RW 02`,
        desaKelurahan: `Desa Barokah`,
        kecamatan: `Kec. Sejahtera`,
        kabupatenKota: `Kab. Makmur`,
        provinsi: `Provinsi Jaya`,
        kodePos: `1234${id % 10}`
    },
    namaAyah: `Ayah Santri ${id}`,
    namaIbu: `Ibu Santri ${id}`,
    teleponWali: `081234567${id.toString().padStart(3, '0')}`,
});

export const initialSantri: Santri[] = [
    // Jenjang 1: Salafiyah Wustho (12 Santri)
    // Putra (6)
    { id: 1, nis: '2546 SW 001', namaLengkap: 'Ahmad Fauzan', jenisKelamin: 'Laki-laki', tempatLahir: 'Jakarta', tanggalMasuk: '2025-07-01', jenjangId: 1, kelasId: 1, rombelId: 1, kamarId: 1, status: 'Aktif', ...commonSantriData(1) },
    { id: 2, nis: '2546 SW 002', namaLengkap: 'Budi Santoso', jenisKelamin: 'Laki-laki', tempatLahir: 'Bandung', tanggalMasuk: '2025-07-01', jenjangId: 1, kelasId: 1, rombelId: 2, kamarId: 1, status: 'Aktif', ...commonSantriData(2) },
    { id: 3, nis: '2445 SW 003', namaLengkap: 'Candra Wijaya', jenisKelamin: 'Laki-laki', tempatLahir: 'Surabaya', tanggalMasuk: '2024-07-05', jenjangId: 1, kelasId: 2, rombelId: 4, kamarId: 2, status: 'Aktif', ...commonSantriData(3) },
    { id: 4, nis: '2445 SW 004', namaLengkap: 'Dedi Hidayat', jenisKelamin: 'Laki-laki', tempatLahir: 'Semarang', tanggalMasuk: '2024-07-05', jenjangId: 1, kelasId: 2, rombelId: 4, status: 'Hiatus', tanggalStatus: '2025-01-10', ...commonSantriData(4) },
    { id: 5, nis: '2344 SW 005', namaLengkap: 'Eko Prasetyo', jenisKelamin: 'Laki-laki', tempatLahir: 'Yogyakarta', tanggalMasuk: '2023-07-10', jenjangId: 1, kelasId: 3, rombelId: 6, status: 'Lulus', tanggalStatus: '2025-06-20', ...commonSantriData(5) },
    { id: 6, nis: '2243 SW 006', namaLengkap: 'Fajar Nugroho', jenisKelamin: 'Laki-laki', tempatLahir: 'Medan', tanggalMasuk: '2022-07-12', jenjangId: 1, kelasId: 3, rombelId: 6, status: 'Keluar/Pindah', tanggalStatus: '2024-11-01', ...commonSantriData(6) },
    // Putri (6)
    { id: 7, nis: '2546 SW 007', namaLengkap: 'Annisa Fitriani', jenisKelamin: 'Perempuan', tempatLahir: 'Makassar', tanggalMasuk: '2025-07-02', jenjangId: 1, kelasId: 1, rombelId: 3, kamarId: 3, status: 'Aktif', ...commonSantriData(7) },
    { id: 8, nis: '2546 SW 008', namaLengkap: 'Bunga Lestari', jenisKelamin: 'Perempuan', tempatLahir: 'Palembang', tanggalMasuk: '2025-07-02', jenjangId: 1, kelasId: 1, rombelId: 3, kamarId: 3, status: 'Aktif', ...commonSantriData(8) },
    { id: 9, nis: '2445 SW 009', namaLengkap: 'Citra Dewi', jenisKelamin: 'Perempuan', tempatLahir: 'Depok', tanggalMasuk: '2024-07-06', jenjangId: 1, kelasId: 2, rombelId: 5, kamarId: 4, status: 'Aktif', ...commonSantriData(9) },
    { id: 10, nis: '2445 SW 010', namaLengkap: 'Dian Puspita', jenisKelamin: 'Perempuan', tempatLahir: 'Tangerang', tanggalMasuk: '2024-07-06', jenjangId: 1, kelasId: 2, rombelId: 5, status: 'Aktif', ...commonSantriData(10) },
    { id: 11, nis: '2344 SW 011', namaLengkap: 'Eka Wulandari', jenisKelamin: 'Perempuan', tempatLahir: 'Bekasi', tanggalMasuk: '2023-07-11', jenjangId: 1, kelasId: 3, rombelId: 7, status: 'Aktif', ...commonSantriData(11) },
    { id: 12, nis: '2344 SW 012', namaLengkap: 'Fitriyah Hasanah', jenisKelamin: 'Perempuan', tempatLahir: 'Bogor', tanggalMasuk: '2023-07-11', jenjangId: 1, kelasId: 3, rombelId: 7, status: 'Aktif', ...commonSantriData(12) },
    
    // Jenjang 2: Salafiyah Ulya (12 Santri)
    // Putra (6)
    { id: 13, nis: '2546 SU 001', namaLengkap: 'Guntur Saputra', jenisKelamin: 'Laki-laki', tempatLahir: 'Malang', tanggalMasuk: '2025-07-03', jenjangId: 2, kelasId: 4, rombelId: 8, status: 'Aktif', ...commonSantriData(13) },
    { id: 14, nis: '2546 SU 002', namaLengkap: 'Hadi Wibowo', jenisKelamin: 'Laki-laki', tempatLahir: 'Solo', tanggalMasuk: '2025-07-03', jenjangId: 2, kelasId: 4, rombelId: 8, status: 'Aktif', ...commonSantriData(14) },
    { id: 15, nis: '2445 SU 003', namaLengkap: 'Irfan Maulana', jenisKelamin: 'Laki-laki', tempatLahir: 'Cirebon', tanggalMasuk: '2024-07-08', jenjangId: 2, kelasId: 5, rombelId: 10, status: 'Aktif', ...commonSantriData(15) },
    { id: 16, nis: '2445 SU 004', namaLengkap: 'Joko Susilo', jenisKelamin: 'Laki-laki', tempatLahir: 'Purwokerto', tanggalMasuk: '2024-07-08', jenjangId: 2, kelasId: 5, rombelId: 10, status: 'Aktif', ...commonSantriData(16) },
    { id: 17, nis: '2142 SU 005', namaLengkap: 'Kurniawan Adi', jenisKelamin: 'Laki-laki', tempatLahir: 'Pekalongan', tanggalMasuk: '2021-07-15', jenjangId: 2, kelasId: 6, rombelId: 12, status: 'Aktif', ...commonSantriData(17) },
    { id: 18, nis: '2142 SU 006', namaLengkap: 'Lukman Hakim', jenisKelamin: 'Laki-laki', tempatLahir: 'Tegal', tanggalMasuk: '2021-07-15', jenjangId: 2, kelasId: 6, rombelId: 12, status: 'Lulus', tanggalStatus: '2023-06-15', ...commonSantriData(18) },
    // Putri (6)
    { id: 19, nis: '2546 SU 007', namaLengkap: 'Gita Anggraini', jenisKelamin: 'Perempuan', tempatLahir: 'Banyumas', tanggalMasuk: '2025-07-04', jenjangId: 2, kelasId: 4, rombelId: 9, status: 'Aktif', ...commonSantriData(19) },
    { id: 20, nis: '2546 SU 008', namaLengkap: 'Hana Nabila', jenisKelamin: 'Perempuan', tempatLahir: 'Cilacap', tanggalMasuk: '2025-07-04', jenjangId: 2, kelasId: 4, rombelId: 9, status: 'Aktif', ...commonSantriData(20) },
    { id: 21, nis: '2445 SU 009', namaLengkap: 'Indah Permatasari', jenisKelamin: 'Perempuan', tempatLahir: 'Kudus', tanggalMasuk: '2024-07-09', jenjangId: 2, kelasId: 5, rombelId: 11, status: 'Aktif', ...commonSantriData(21) },
    { id: 22, nis: '2243 SU 010', namaLengkap: 'Jihan Aulia', jenisKelamin: 'Perempuan', tempatLahir: 'Pati', tanggalMasuk: '2022-07-14', jenjangId: 2, kelasId: 5, rombelId: 11, status: 'Hiatus', tanggalStatus: '2025-02-01', ...commonSantriData(22) },
    { id: 23, nis: '2243 SU 011', namaLengkap: 'Kartika Sari', jenisKelamin: 'Perempuan', tempatLahir: 'Rembang', tanggalMasuk: '2022-07-14', jenjangId: 2, kelasId: 6, rombelId: 13, status: 'Aktif', ...commonSantriData(23) },
    { id: 24, nis: '2041 SU 012', namaLengkap: 'Lina Marlina', jenisKelamin: 'Perempuan', tempatLahir: 'Jepara', tanggalMasuk: '2020-07-20', jenjangId: 2, kelasId: 6, rombelId: 13, status: 'Lulus', tanggalStatus: '2022-06-18', ...commonSantriData(24) },
];