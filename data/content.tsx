
import React from 'react';

export interface FeatureItemData {
    icon: string;
    title: string;
    desc: string;
}

export interface FeatureCategory {
    id: string;
    title: string;
    color: string; // text color class
    icon: string;
    colorClass?: string; // used in FAQ?
    items: FeatureItemData[];
}

export const FEATURE_DATA: FeatureCategory[] = [
    {
        id: 'akademik',
        title: 'Pendidikan & Akademik',
        color: 'text-blue-600',
        icon: 'bi-mortarboard-fill',
        items: [
            { icon: 'bi-calendar-week-fill', title: 'Manajemen Jadwal Pelajaran', desc: 'Susun jadwal KBM, validasi bentrok guru, salin jadwal otomatis, dan cetak per kelas.' },
            { icon: 'bi-mortarboard-fill', title: 'Rapor Digital', desc: 'Manajemen nilai, input offline via HTML untuk guru, dan cetak rapor custom.' },
            { icon: 'bi-journal-bookmark-fill', title: 'Tahfizh & Al-Qur\'an', desc: 'Mutaba\'ah setoran hafalan, monitoring capaian, dan laporan perkembangan.' },
            { icon: 'bi-book-half', title: 'Perpustakaan Digital', desc: 'Katalog buku, sirkulasi peminjaman, dan cetak kartu anggota/label buku.' },
            { icon: 'bi-calendar-event-fill', title: 'Kalender Akademik', desc: 'Agenda kegiatan pondok dan cetak kalender dinding custom.' },
        ]
    },
    {
        id: 'kesiswaan',
        title: 'Kesiswaan & Asrama',
        color: 'text-teal-600',
        icon: 'bi-people-fill',
        items: [
            { icon: 'bi-person-badge-fill', title: 'Database Santri Lengkap', desc: 'Pencatatan biodata detail, riwayat pendidikan, keluarga, hingga prestasi.' },
            { icon: 'bi-building', title: 'Manajemen Asrama', desc: 'Pengelolaan gedung, kamar, dan penempatan santri yang efisien.' },
            { icon: 'bi-heart-pulse-fill', title: 'Poskestren (Kesehatan)', desc: 'Rekam medis santri, stok obat, dan pemantauan kesehatan berkala.' },
            { icon: 'bi-person-heart', title: 'Bimbingan Konseling (BK)', desc: 'Catatan konseling, pelanggaran, dan pembinaan karakter santri.' },
             { icon: 'bi-person-check-fill', title: 'Absensi Digital', desc: 'Presensi harian santri per kelas/rombel dengan rekap otomatis.' },
        ]
    },
    {
        id: 'administrasi',
        title: 'Keuangan & Administrasi',
        color: 'text-green-600',
        icon: 'bi-wallet2',
        items: [
            { icon: 'bi-cash-coin', title: 'Manajemen SPP & Tagihan', desc: 'Tagihan bulanan otomatis, pencatatan pembayaran, dan cek tunggakan.' },
            { icon: 'bi-wallet', title: 'Tabungan & Uang Saku', desc: 'Sistem deposit dan penarikan uang saku santri (cashless system).' },
            { icon: 'bi-journal-text', title: 'Buku Kas Umum', desc: 'Pencatatan arus kas masuk dan keluar lembaga secara transparan.' },
            { icon: 'bi-envelope-paper-fill', title: 'Persuratan Otomatis', desc: 'Buat surat resmi, izin, atau keterangan dengan template yang bisa disesuaikan.' },
            { icon: 'bi-file-earmark-person', title: 'PSB Online', desc: 'Formulir pendaftaran santri baru yang terintegrasi dengan WhatsApp dan Google Sheet.' },
        ]
    },
    {
        id: 'sistem',
        title: 'Teknologi & Keamanan',
        color: 'text-purple-600',
        icon: 'bi-cpu-fill',
        items: [
            { icon: 'bi-cloud-arrow-up-fill', title: 'Cloud Sync & Backup', desc: 'Sinkronisasi data antar komputer via Dropbox/WebDAV dan backup otomatis.' },
            { icon: 'bi-shield-lock-fill', title: 'Multi-User & Hak Akses', desc: 'Manajemen pengguna dengan peran (Admin/Staff) dan hak akses spesifik.' },
            { icon: 'bi-printer-fill', title: 'Cetak Laporan Lengkap', desc: 'Dukungan cetak ke PDF untuk berbagai laporan, kartu, dan surat.' },
            { icon: 'bi-wifi-off', title: 'Offline-First', desc: 'Aplikasi dapat berjalan tanpa koneksi internet (PWA).' },
        ]
    }
];

export interface PanduanStep {
    title: string;
    content: React.ReactNode;
    color?: string;
}

export interface PanduanSection {
    id: string;
    title: string;
    badge: string | React.ReactNode;
    badgeColor: string;
    steps: PanduanStep[];
}

export const panduanData: PanduanSection[] = [
    {
        id: 'setup',
        title: '1. Persiapan Awal',
        badge: '1',
        badgeColor: 'teal',
        steps: [
            { title: 'Pengaturan Lembaga', content: 'Masuk ke menu Pengaturan > Umum. Isi data yayasan, pesantren, alamat, dan upload logo. Data ini akan muncul di kop surat dan laporan.' },
            { title: 'Data Master Pendidikan', content: 'Ke menu Data Master. Input Jenjang (SD/SMP/SMA/Wustho/Ulya), Kelas, dan Rombel. Input juga daftar Mata Pelajaran dan Tenaga Pengajar.' },
            { title: 'Input Data Santri', content: 'Gunakan menu Data Santri. Anda bisa input satu per satu atau gunakan fitur Import Excel/CSV untuk memindahkan data lama dengan cepat.' },
        ]
    },
    {
        id: 'keuangan',
        title: '2. Manajemen Keuangan',
        badge: '2',
        badgeColor: 'green',
        steps: [
            { title: 'Setting Pos Biaya', content: 'Di menu Keuangan > Pengaturan Biaya, buat pos tagihan seperti SPP (Bulanan), Uang Gedung (Sekali Bayar), atau Seragam (Cicilan).' },
            { title: 'Generate Tagihan', content: 'Setiap awal bulan, buka Keuangan > Status Pembayaran lalu klik Generate Tagihan untuk membebankan SPP ke seluruh santri aktif.' },
            { title: 'Pembayaran', content: 'Saat wali santri membayar, cari nama santri di menu Keuangan, pilih tagihan yang dibayar, dan simpan. Kuitansi dapat langsung dicetak.' },
        ]
    },
    {
        id: 'akademik',
        title: '3. Akademik & Rapor',
        badge: '3',
        badgeColor: 'blue',
        steps: [
            { title: 'Desain Rapor', content: 'Di menu Akademik > Desain Rapor, buat template rapor sesuai kebutuhan. Anda bisa mengatur kolom nilai, formula rata-rata, dan layout.' },
            { title: 'Input Nilai (Guru)', content: 'Gunakan Generator Formulir untuk membuat file input nilai. Kirim file ini ke guru via WA. Guru mengisi nilai di HP/Laptop tanpa login, lalu kirim balik file data ke Admin.' },
            { title: 'Cetak Rapor', content: 'Setelah data nilai masuk, buka tab Cetak Rapor, pilih kelas, dan cetak rapor santri secara massal ke PDF.' },
        ]
    },
    {
        id: 'jadwal',
        title: '4. Manajemen Jadwal Pelajaran (Admin)',
        badge: '4',
        badgeColor: 'indigo',
        steps: [
            { title: 'Konsep Admin-Centric', content: 'Fitur jadwal pelajaran dirancang untuk dikelola terpusat oleh Admin/Bagian Kurikulum. Hal ini untuk mencegah bentrok jadwal dan memastikan pembagian beban jam mengajar yang adil.' },
            { title: 'Langkah 1: Setup Jam', content: 'Masuk menu Akademik > Jadwal Pelajaran. Pilih Jenjang. Atur "Pengaturan Jam" di panel kiri (Jam ke-1 mulai jam berapa, dst). Simpan.' },
            { title: 'Langkah 2: Input Jadwal', content: 'Pilih Kelas dan Rombel di filter atas. Klik pada kotak kosong di tabel jadwal untuk mengisi Mata Pelajaran dan Guru. Sistem otomatis mendeteksi jika guru bentrok di jam yang sama.' },
            { title: 'Langkah 3: Salin Jadwal', content: 'Gunakan fitur "Salin Jadwal Dari..." untuk menyalin jadwal dari kelas lain (misal 7A ke 7B) agar tidak perlu input ulang satu per satu.' },
            { title: 'Cetak & Rekap', content: 'Cetak jadwal per kelas atau gabungan satu jenjang. Gunakan tombol "Rekap Jam" untuk melihat total Jam Tatap Muka (JTM) setiap guru.' },
        ]
    },
    {
        id: 'sync',
        title: '5. Sinkronisasi Data',
        badge: '5',
        badgeColor: 'purple',
        steps: [
            { title: 'Konfigurasi Cloud', content: 'Di Pengaturan > Sync Cloud, hubungkan aplikasi dengan Dropbox atau WebDAV (Nextcloud).' },
            { title: 'Pairing Staff', content: 'Admin memberikan Kode Pairing kepada staff. Staff memasukkan kode tersebut di halaman login/pengaturan untuk terhubung ke penyimpanan yang sama.' },
            { title: 'Alur Kerja', content: 'Staff bekerja (input data) -> Klik "Kirim Perubahan". Admin membuka menu Pusat Sync -> Klik "Gabung" file dari staff -> Klik "Publikasikan Master" agar semua staff mendapat data terbaru.' },
        ]
    }
];

export interface FaqItemData {
    question: string;
    answer: string | React.ReactNode;
}

export interface FaqCategory {
    title: string;
    icon: string;
    colorClass: string;
    items: FaqItemData[];
}

export const faqData: FaqCategory[] = [
    {
        title: "Umum & Keamanan Akun",
        icon: "bi-shield-lock",
        colorClass: "bg-blue-100 text-blue-600",
        items: [
            { question: "Apakah data saya aman?", answer: "Ya. Aplikasi ini offline-first. Data utama tersimpan di browser komputer Anda (IndexedDB). Jika menggunakan Cloud Sync, data disimpan di akun Dropbox/Google Drive pribadi Anda, bukan di server kami." },
            { question: "Lupa password Admin, bagaimana cara reset?", answer: "Gunakan 'Kunci Pemulihan' (Recovery Key) yang dibuat saat pertama kali mengaktifkan mode multi-user. Jika Anda belum menyimpannya, dan tidak bisa login, satu-satunya cara adalah menghapus database browser (data hilang) atau minta bantuan teknis." },
            { question: "Bisakah aplikasi dibuka di HP?", answer: "Bisa. Aplikasi ini berbasis web (PWA). Namun untuk kenyamanan input data (terutama tabel besar seperti nilai/keuangan), disarankan menggunakan Laptop/PC." },
        ]
    },
    {
        title: "Data Master & Akademik",
        icon: "bi-database",
        colorClass: "bg-indigo-100 text-indigo-600",
        items: [
            { question: "Bagaimana cara menyalin jadwal pelajaran?", answer: "Masuk menu 'Jadwal Pelajaran', pilih kelas tujuan (kosong). Klik tombol 'Salin Jadwal Dari...' di panel kiri bawah, lalu pilih kelas sumber yang sudah ada jadwalnya." },
            { question: "Apakah guru bisa mengisi jadwal sendiri?", answer: "Tidak. Penyusunan jadwal dilakukan terpusat oleh Admin/Kurikulum untuk menghindari konflik jadwal antar kelas." },
            { question: "Bagaimana melihat total jam mengajar guru?", answer: "Di menu Jadwal Pelajaran, klik tombol 'Rekap Jam'. Sistem akan menampilkan tabel total jam tatap muka setiap guru." },
        ]
    },
    {
        title: "Keuangan & Pembayaran",
        icon: "bi-wallet2",
        colorClass: "bg-green-100 text-green-600",
        items: [
            { question: "Bagaimana cara menghapus tagihan yang salah?", answer: "Masuk ke menu Keuangan > Status Pembayaran > Riwayat (pada santri ybs). Di sana Anda bisa melihat daftar tagihan dan menghapusnya jika statusnya belum lunas atau salah input." },
            { question: "Apakah bisa mencetak kuitansi mundur tanggal?", answer: "Bisa. Saat mencatat pembayaran, Anda dapat memilih tanggal transaksi secara manual." },
        ]
    },
    {
        title: "Akademik & Rapor",
        icon: "bi-mortarboard",
        colorClass: "bg-blue-100 text-blue-600",
        items: [
            { question: "Guru tidak bisa membuka file input nilai di HP?", answer: "Pastikan guru menggunakan browser Chrome atau browser modern lainnya. File HTML input nilai dirancang agar ringan dan kompatibel dengan mobile browser." },
            { question: "Rumus Ranking tidak muncul?", answer: "Pastikan Anda menggunakan formula =RANK($NA) di kolom ranking pada Desain Rapor. Aplikasi akan otomatis menghitung peringkat berdasarkan nilai tersebut saat input nilai." },
        ]
    },
    {
        title: "Teknis & Sinkronisasi",
        icon: "bi-cloud-arrow-up",
        colorClass: "bg-purple-100 text-purple-600",
        items: [
            { question: "Sync gagal terus, apa solusinya?", answer: "1. Cek koneksi internet. 2. Cek kuota Dropbox/Google Drive. 3. Coba logout dan login ulang ke layanan Cloud di menu Pengaturan." },
            { question: "Bagaimana cara memindahkan data ke komputer baru?", answer: "Cara 1 (Manual): Download Backup (JSON) di komputer lama, lalu Restore di komputer baru. Cara 2 (Cloud): Login Cloud di komputer baru, lalu lakukan 'Ambil Master Data'." },
        ]
    }
];
