
export interface FeatureItemData {
    icon: string;
    title: string;
    desc: string;
}

export interface FeatureCategory {
    id: string;
    title: string;
    color: string;
    icon: string;
    colorClass?: string;
    items: FeatureItemData[];
}

export const FEATURE_DATA: FeatureCategory[] = [
    {
        id: 'akademik',
        title: 'Akademik & Pendidikan',
        color: 'text-blue-600',
        icon: 'bi-mortarboard-fill',
        items: [
            { icon: 'bi-calendar-week-fill', title: 'Jadwal Pelajaran Otomatis', desc: 'Penyusunan jadwal KBM dengan deteksi bentrok guru dan fitur salin jadwal antar kelas.' },
            { icon: 'bi-file-earmark-spreadsheet-fill', title: 'Rapor Digital (Desentralisasi)', desc: 'Desain rapor custom, kirim form nilai HTML ke guru via WA, dan import nilai otomatis.' },
            { icon: 'bi-journal-bookmark-fill', title: 'Mutaba\'ah Tahfizh', desc: 'Pencatatan setoran hafalan (Ziyadah/Murojaah) dengan grafik perkembangan santri.' },
            { icon: 'bi-book-half', title: 'Perpustakaan & Sirkulasi', desc: 'Katalog buku, cetak label/slip, dan manajemen peminjaman dengan denda otomatis.' },
            { icon: 'bi-calendar-event-fill', title: 'Kalender Akademik', desc: 'Agenda kegiatan pondok, hari libur nasional/hijriah, dan cetak kalender dinding.' },
        ]
    },
    {
        id: 'kesiswaan',
        title: 'Kesiswaan & Asrama',
        color: 'text-teal-600',
        icon: 'bi-people-fill',
        items: [
            { icon: 'bi-person-badge-fill', title: 'Database Santri Terpusat', desc: 'Biodata lengkap, riwayat keluarga, prestasi, pelanggaran, dan mutasi status santri.' },
            { icon: 'bi-building-fill', title: 'Manajemen Asrama', desc: 'Pengelolaan gedung dan penempatan santri dalam kamar (Room Management).' },
            { icon: 'bi-heart-pulse-fill', title: 'Poskestren (Rekam Medis)', desc: 'Pencatatan sakit santri, stok obat, dan integrasi otomatis ke absensi.' },
            { icon: 'bi-person-heart', title: 'Bimbingan Konseling (BK)', desc: 'Catatan konseling privasi tinggi dan pemantauan kasus santri.' },
            { icon: 'bi-shield-check', title: 'Buku Tamu & Keamanan', desc: 'Pencatatan tamu/wali santri yang berkunjung (Check-in/Check-out).' },
        ]
    },
    {
        id: 'keuangan',
        title: 'Keuangan & Bisnis',
        color: 'text-green-600',
        icon: 'bi-wallet2',
        items: [
            { icon: 'bi-shop', title: 'Koperasi & Kantin (POS)', desc: 'Aplikasi kasir lengkap dengan dukungan barcode, struk Bluetooth, dan fitur Kasbon (Hutang).' },
            { icon: 'bi-cash-coin', title: 'SPP & Tagihan', desc: 'Generate tagihan bulanan/bebas secara massal dan pelacakan tunggakan real-time.' },
            { icon: 'bi-wallet-fill', title: 'Tabungan Uang Saku', desc: 'Dompet digital santri untuk deposit dan penarikan uang saku (Cashless).' },
            { icon: 'bi-cash-stack', title: 'Payroll (Penggajian)', desc: 'Hitung honor guru otomatis berdasarkan jadwal mengajar (JTM) dan cetak slip gaji.' },
            { icon: 'bi-journal-text', title: 'Buku Kas Umum (BKU)', desc: 'Pencatatan arus kas masuk/keluar lembaga dengan rekapitulasi otomatis.' },
        ]
    },
    {
        id: 'administrasi',
        title: 'Sistem & Administrasi',
        color: 'text-purple-600',
        icon: 'bi-cpu-fill',
        items: [
            { icon: 'bi-cloud-arrow-up-fill', title: 'Cloud Sync (Hub & Spoke)', desc: 'Sinkronisasi data antar Admin dan Staff menggunakan Dropbox/WebDAV dengan sistem Pairing Code.' },
            { icon: 'bi-file-earmark-person-fill', title: 'PSB Online', desc: 'Formulir pendaftaran custom, integrasi WhatsApp, dan Google Sheet.' },
            { icon: 'bi-envelope-paper-fill', title: 'Surat Menyurat', desc: 'Buat surat massal dengan placeholder otomatis dan arsip digital.' },
            { icon: 'bi-printer-fill', title: 'Pusat Cetak Dokumen', desc: 'Cetak Kartu Santri, Kuitansi, Label, dan Laporan dalam format PDF/Excel.' },
        ]
    }
];
