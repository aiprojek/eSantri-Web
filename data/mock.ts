
import { PondokSettings, Santri } from '../types';

export const initialSettings: PondokSettings = {
    namaYayasan: 'Yayasan Pondok Pesantren Al-Ikhlas',
    namaPonpes: 'Pondok Pesantren Al-Ikhlas',
    nspp: '510033020001',
    npsn: '69900001',
    alamat: 'Jl. Pesantren No. 1, Desa Sukamaju, Kec. Karangjaya, Kab. Berkah',
    telepon: '08123456789',
    email: 'info@ppalikhlas.com',
    website: 'https://ppalikhlas.com',
    jenjang: [
        { id: 1, nama: 'Salafiyah Wustho', kode: 'SW', hariLibur: [5] }, // 5 = Jumat
        { id: 2, nama: 'Salafiyah Ulya', kode: 'SU', hariLibur: [5] }
    ],
    kelas: [
        { id: 1, nama: 'Kelas 1', jenjangId: 1 },
        { id: 2, nama: 'Kelas 2', jenjangId: 1 },
        { id: 3, nama: 'Kelas 3', jenjangId: 1 },
        { id: 4, nama: 'Kelas 1', jenjangId: 2 },
        { id: 5, nama: 'Kelas 2', jenjangId: 2 },
        { id: 6, nama: 'Kelas 3', jenjangId: 2 },
    ],
    rombel: [
        { id: 1, nama: '1A Putra', kelasId: 1, waliKelasId: 2 },
        { id: 2, nama: '1B Putri', kelasId: 1, waliKelasId: 3 },
        { id: 3, nama: '2A Putra', kelasId: 2, waliKelasId: 4 },
        { id: 4, nama: '1A Ulya', kelasId: 4, waliKelasId: 1 },
    ],
    tenagaPengajar: [
        { 
            id: 1, 
            nama: 'Kyai Abdullah', 
            riwayatJabatan: [{ id: 1, jabatan: 'Pengasuh', tanggalMulai: '2010-01-01' }],
            configGaji: { gajiPokok: 2000000, tunjanganJabatan: 500000, honorPerJam: 0, tunjanganLain: 0, potonganLain: 0 },
            hariMasuk: [0, 1, 2, 3, 4, 5, 6],
            kompetensiMapelIds: [3]
        },
        { 
            id: 2, 
            nama: 'Ust. Hasan', 
            riwayatJabatan: [{ id: 2, jabatan: 'Kepala Sekolah SW', tanggalMulai: '2020-01-01' }],
            configGaji: { gajiPokok: 1500000, tunjanganJabatan: 300000, honorPerJam: 20000, tunjanganLain: 0, potonganLain: 0 },
            hariMasuk: [1, 2, 3, 4, 6],
            kompetensiMapelIds: [1, 2]
        },
        { 
            id: 3, 
            nama: 'Ustdz. Fatimah', 
            riwayatJabatan: [{ id: 3, jabatan: 'Guru Pengajar', tanggalMulai: '2021-06-15' }],
            configGaji: { gajiPokok: 1200000, tunjanganJabatan: 0, honorPerJam: 25000, tunjanganLain: 100000, potonganLain: 0 },
            hariMasuk: [1, 2, 3, 4, 6],
            kompetensiMapelIds: [1, 3]
        },
        { 
            id: 4, 
            nama: 'Ust. Zulkifli', 
            riwayatJabatan: [{ id: 4, jabatan: 'Guru & Musyrif', tanggalMulai: '2022-01-01' }],
            configGaji: { gajiPokok: 1300000, tunjanganJabatan: 100000, honorPerJam: 20000, tunjanganLain: 0, potonganLain: 0 },
            hariMasuk: [0, 1, 2, 3, 4, 6],
            kompetensiMapelIds: [2]
        }
    ],
    mataPelajaran: [
        { id: 1, nama: 'Nahwu', jenjangId: 1 },
        { id: 2, nama: 'Shorof', jenjangId: 1 },
        { id: 3, nama: 'Fiqh', jenjangId: 1 },
        { id: 4, nama: 'Tauhid', jenjangId: 1 },
        { id: 5, nama: 'Bahasa Arab', jenjangId: 1 },
        { id: 6, nama: 'Tafsir', jenjangId: 2 },
        { id: 7, nama: 'Hadits', jenjangId: 2 },
        { id: 8, nama: 'Ushul Fiqh', jenjangId: 2 },
    ],
    biaya: [
        { id: 1, nama: 'SPP Bulanan', jenis: 'Bulanan', nominal: 150000, jenjangId: 1 },
        { id: 2, nama: 'SPP Bulanan Ulya', jenis: 'Bulanan', nominal: 200000, jenjangId: 2 },
        { id: 3, nama: 'Uang Makan', jenis: 'Bulanan', nominal: 450000 },
        { id: 4, nama: 'Uang Gedung', jenis: 'Cicilan', nominal: 3000000, jumlahCicilan: 6, nominalCicilan: 500000 },
        { id: 5, nama: 'Seragam', jenis: 'Sekali Bayar', nominal: 600000 },
        { id: 6, nama: 'Kitab Awal Tahun', jenis: 'Sekali Bayar', nominal: 350000 },
    ],
    gedungAsrama: [
        { id: 1, nama: 'Asrama Putra Al-Fatih', jenis: 'Putra' },
        { id: 2, nama: 'Asrama Putri Khadijah', jenis: 'Putri' }
    ],
    kamar: [
        { id: 1, nama: 'Kamar 101', gedungId: 1, kapasitas: 10, musyrifId: 4 },
        { id: 2, nama: 'Kamar 102', gedungId: 1, kapasitas: 10, musyrifId: 4 },
        { id: 3, nama: 'Kamar 201', gedungId: 2, kapasitas: 12, musyrifId: 3 },
        { id: 4, nama: 'Kamar 202', gedungId: 2, kapasitas: 12, musyrifId: 3 }
    ],
    multiUserMode: false,
    nisSettings: {
        generationMethod: 'global',
        format: '{TH}{KODE}{NO_URUT}',
        jenjangConfig: [],
        masehiYearSource: 'auto',
        manualMasehiYear: new Date().getFullYear(),
        hijriahYearSource: 'auto',
        manualHijriahYear: 1446,
        globalPrefix: '24',
        globalUseYearPrefix: true,
        globalUseJenjangCode: true,
        globalStartNumber: 1,
        globalPadding: 4,
        dobFormat: 'DDMMYY',
        dobSeparator: '',
        dobUseJenjangCode: true,
        dobPadding: 3
    },
    cloudSyncConfig: {
        provider: 'none'
    },
    backupConfig: {
        frequency: 'weekly'
    },
    psbConfig: {
        tahunAjaranAktif: new Date().getFullYear() + '/' + (new Date().getFullYear() + 1),
        targetKuota: 100,
        nomorHpAdmin: '08123456789',
        pesanSukses: 'Terima kasih telah mendaftar. Silakan hubungi admin untuk konfirmasi.',
        activeGelombang: 1,
        biayaPendaftaran: 100000,
        infoRekening: 'BRI 1234567890 a.n Ponpes Al-Ikhlas',
        targetJenjangId: 1,
        activeFields: ['namaLengkap', 'nisn', 'jenisKelamin', 'tempatLahir', 'tanggalLahir', 'alamat', 'namaWali', 'nomorHpWali', 'asalSekolah', 'namaAyah', 'namaIbu'],
        requiredStandardFields: ['namaLengkap', 'jenisKelamin', 'alamat', 'namaWali', 'nomorHpWali'],
        requiredDocuments: ['Kartu Keluarga (KK)', 'Akte Kelahiran', 'Pas Foto 3x4'],
        designStyle: 'classic',
        posterTitle: 'Penerimaan Santri Baru',
        posterSubtitle: 'Tahun Ajaran 2025/2026',
        posterInfo: 'Segera Daftar Putra/Putri Anda! Kuota Terbatas.',
        customFields: [
            { id: 'sec_1', type: 'section', label: 'SURAT PERNYATAAN', required: false },
            { id: 'stmt_1', type: 'statement', label: 'Dengan ini saya menyatakan sanggup menaati segala peraturan pondok.', required: false },
            { id: 'chk_1', type: 'checkbox', label: 'Persetujuan', options: ['Saya Setuju'], required: true }
        ],
        templates: [],
        registrationDeadline: ''
    },
    raporTemplates: [],
    suratTagihanPembuka: 'Assalamu\'alaikum Wr. Wb.\n\nDengan ini kami sampaikan tagihan biaya pendidikan santri sebagai berikut:',
    suratTagihanPenutup: 'Demikian pemberitahuan ini kami sampaikan. Atas perhatian dan kerjasamanya kami ucapkan terima kasih.\n\nWassalamu\'alaikum Wr. Wb.',
    suratTagihanCatatan: 'Mohon dibayarkan sebelum tanggal 10 bulan berjalan.',
    pesanWaTunggakan: 'Assalamu\'alaikum Wr. Wb.\n\nYth. Wali Santri {NAMA_SANTRI},\n\nKami informasikan bahwa terdapat tunggakan administrasi sebesar *{JUMLAH_TUNGGAKAN}*.\nMohon segera melakukan pembayaran.\n\nTerima kasih.\n{NAMA_PONPES}',
    hijriAdjustment: 0
};

export const initialSantri: Santri[] = [
    {
        id: 1001,
        nis: '202401001',
        nisn: '0012345678',
        nik: '3301010101010001',
        namaLengkap: 'Ahmad Fauzan',
        namaHijrah: 'Fauzan',
        jenisKelamin: 'Laki-laki',
        tempatLahir: 'Banyumas',
        tanggalLahir: '2010-05-15',
        kewarganegaraan: 'WNI',
        alamat: {
            detail: 'Jl. Pemuda No. 10, RT 01 RW 02',
            desaKelurahan: 'Karangjaya',
            kecamatan: 'Karangjaya',
            kabupatenKota: 'Banyumas',
            provinsi: 'Jawa Tengah',
            kodePos: '53123'
        },
        namaAyah: 'Budi Santoso',
        nikAyah: '3301010101010002',
        pekerjaanAyah: 'Wiraswasta',
        pendidikanAyah: 'SLTA/Sederajat',
        penghasilanAyah: 'Rp. 2.000.000 - Rp. 5.000.000',
        teleponAyah: '081234567001',
        namaIbu: 'Siti Aminah',
        nikIbu: '3301010101010003',
        pekerjaanIbu: 'Mengurus Rumah Tangga',
        pendidikanIbu: 'SLTP/Sederajat',
        penghasilanIbu: 'Tidak Berpenghasilan',
        teleponIbu: '081234567002',
        jenjangId: 1,
        kelasId: 1,
        rombelId: 1,
        tanggalMasuk: '2024-07-15',
        status: 'Aktif',
        fotoUrl: 'https://placehold.co/150x200/e2e8f0/334155?text=Foto',
        jenisSantri: 'Mondok - Baru',
        kamarId: 1,
        riwayatStatus: [
            { id: 1, status: 'Masuk', tanggal: '2024-07-15', keterangan: 'Santri Baru' }
        ],
        hobi: ['Sepak Bola', 'Membaca']
    },
    {
        id: 1002,
        nis: '202401002',
        nisn: '0012345679',
        nik: '3301010101010004',
        namaLengkap: 'Zainul Arifin',
        jenisKelamin: 'Laki-laki',
        tempatLahir: 'Cilacap',
        tanggalLahir: '2010-08-20',
        kewarganegaraan: 'WNI',
        alamat: {
            detail: 'Dusun Manis RT 03 RW 01',
            desaKelurahan: 'Adipala',
            kecamatan: 'Adipala',
            kabupatenKota: 'Cilacap',
            provinsi: 'Jawa Tengah'
        },
        namaAyah: 'Slamet Riyadi',
        pekerjaanAyah: 'Petani/Pekebun',
        teleponAyah: '081234567003',
        namaIbu: 'Khotimah',
        pekerjaanIbu: 'Pedagang',
        jenjangId: 1,
        kelasId: 1,
        rombelId: 1,
        tanggalMasuk: '2024-07-15',
        status: 'Aktif',
        fotoUrl: 'https://placehold.co/150x200/e2e8f0/334155?text=Foto',
        jenisSantri: 'Mondok - Baru',
        kamarId: 1,
        riwayatStatus: [
             { id: 1, status: 'Masuk', tanggal: '2024-07-15', keterangan: 'Santri Baru' }
        ]
    },
    {
        id: 1003,
        nis: '202401003',
        nisn: '0012345680',
        namaLengkap: 'Aisyah Humaira',
        jenisKelamin: 'Perempuan',
        tempatLahir: 'Kebumen',
        tanggalLahir: '2010-11-10',
        kewarganegaraan: 'WNI',
        alamat: {
            detail: 'Jl. Laut No. 45',
            desaKelurahan: 'Ayah',
            kecamatan: 'Ayah',
            kabupatenKota: 'Kebumen',
            provinsi: 'Jawa Tengah'
        },
        namaAyah: 'H. Rahmat',
        pekerjaanAyah: 'PNS',
        teleponAyah: '081234567004',
        namaIbu: 'Hj. Zulaikha',
        pekerjaanIbu: 'Guru',
        jenjangId: 1,
        kelasId: 1,
        rombelId: 2,
        tanggalMasuk: '2024-07-15',
        status: 'Aktif',
        fotoUrl: 'https://placehold.co/150x200/e2e8f0/334155?text=Foto',
        jenisSantri: 'Mondok - Baru',
        kamarId: 3,
        prestasi: [
             { id: 1, nama: 'Juara 1 MTQ Kecamatan', tingkat: 'Kecamatan', jenis: 'Keagamaan', tahun: 2024, penyelenggara: 'Kemenag' }
        ],
        riwayatStatus: [
             { id: 1, status: 'Masuk', tanggal: '2024-07-15', keterangan: 'Santri Baru' }
        ]
    },
    {
        id: 1004,
        nis: '202401004',
        nisn: '0012345681',
        namaLengkap: 'Fatimatuz Zahra',
        jenisKelamin: 'Perempuan',
        tempatLahir: 'Purbalingga',
        tanggalLahir: '2010-02-28',
        kewarganegaraan: 'WNI',
        alamat: {
            detail: 'Gang Delima No. 5',
            desaKelurahan: 'Kalimanah',
            kecamatan: 'Kalimanah',
            kabupatenKota: 'Purbalingga',
            provinsi: 'Jawa Tengah'
        },
        namaAyah: 'Supriyanto',
        pekerjaanAyah: 'Karyawan Swasta',
        namaIbu: 'Sri Wahyuni',
        jenjangId: 1,
        kelasId: 1,
        rombelId: 2,
        tanggalMasuk: '2024-07-15',
        status: 'Aktif',
        fotoUrl: 'https://placehold.co/150x200/e2e8f0/334155?text=Foto',
        jenisSantri: 'Mondok - Baru',
        kamarId: 3,
        riwayatStatus: [
             { id: 1, status: 'Masuk', tanggal: '2024-07-15', keterangan: 'Santri Baru' }
        ]
    },
    {
        id: 1005,
        nis: '202302001',
        namaLengkap: 'Muhammad Yusuf',
        jenisKelamin: 'Laki-laki',
        tempatLahir: 'Jakarta',
        tanggalLahir: '2008-01-12',
        kewarganegaraan: 'WNI',
        alamat: {
            detail: 'Komp. Pondok Indah Blok A',
            desaKelurahan: 'Pondok Pinang',
            kecamatan: 'Kebayoran Lama',
            kabupatenKota: 'Jakarta Selatan',
            provinsi: 'DKI Jakarta'
        },
        namaAyah: 'Ir. Hendra',
        pekerjaanAyah: 'Wiraswasta',
        teleponAyah: '081299998888',
        namaIbu: 'Dr. Sarah',
        jenjangId: 2,
        kelasId: 4,
        rombelId: 4,
        tanggalMasuk: '2023-07-10',
        status: 'Aktif',
        fotoUrl: 'https://placehold.co/150x200/e2e8f0/334155?text=Foto',
        jenisSantri: 'Mondok - Pindahan',
        sekolahAsal: 'SMPIT Darul Quran',
        kamarId: 2,
        riwayatStatus: [
             { id: 1, status: 'Masuk', tanggal: '2023-07-10', keterangan: 'Pindahan' }
        ]
    },
     {
        id: 1006,
        nis: '202401006',
        namaLengkap: 'Budi Darmawan',
        jenisKelamin: 'Laki-laki',
        tempatLahir: 'Banyumas',
        tanggalLahir: '2010-06-10',
        kewarganegaraan: 'WNI',
        alamat: { detail: 'Desa Karangmangu' },
        namaAyah: 'Darmawan',
        namaIbu: 'Suminah',
        jenjangId: 1,
        kelasId: 1,
        rombelId: 1,
        tanggalMasuk: '2024-07-15',
        status: 'Hiatus',
        tanggalStatus: '2024-10-01',
        fotoUrl: 'https://placehold.co/150x200/e2e8f0/334155?text=Foto',
        jenisSantri: 'Mondok - Baru',
        kamarId: 1,
        riwayatStatus: [
             { id: 1, status: 'Masuk', tanggal: '2024-07-15', keterangan: 'Santri Baru' },
             { id: 2, status: 'Hiatus', tanggal: '2024-10-01', keterangan: 'Sakit Jangka Panjang' }
        ]
    },
    {
        id: 1007,
        nis: '202401007',
        namaLengkap: 'Siti Nurhaliza',
        jenisKelamin: 'Perempuan',
        tempatLahir: 'Banyumas',
        tanggalLahir: '2010-09-09',
        kewarganegaraan: 'WNI',
        alamat: { detail: 'Desa Rempoah' },
        namaAyah: 'Nurhadi',
        namaIbu: 'Halimah',
        jenjangId: 1,
        kelasId: 1,
        rombelId: 2,
        tanggalMasuk: '2024-07-15',
        status: 'Keluar/Pindah',
        tanggalStatus: '2024-09-15',
        fotoUrl: 'https://placehold.co/150x200/e2e8f0/334155?text=Foto',
        jenisSantri: 'Mondok - Baru',
        riwayatStatus: [
             { id: 1, status: 'Masuk', tanggal: '2024-07-15', keterangan: 'Santri Baru' },
             { id: 2, status: 'Keluar/Pindah', tanggal: '2024-09-15', keterangan: 'Pindah ikut orang tua' }
        ]
    }
];
