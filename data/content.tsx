import React from 'react';

export interface FeatureItemData {
    title: string;
    desc: string;
    icon: string;
}

export interface FeatureCategory {
    id: string;
    title: string;
    icon: string;
    color: string;
    items: FeatureItemData[];
}

export const FEATURE_DATA: FeatureCategory[] = [
    {
        id: 'manajemen',
        title: 'Manajemen Data Terpusat',
        icon: 'bi-database-fill',
        color: 'text-blue-600',
        items: [
            { title: 'Database Santri', desc: 'Pencatatan lengkap data diri, orang tua, wali, dan riwayat santri.', icon: 'bi-people-fill' },
            { title: 'Manajemen Asrama', desc: 'Pengelolaan gedung, kamar, dan penempatan santri.', icon: 'bi-building' },
            { title: 'Data Guru & Staff', desc: 'Database tenaga pendidik dan kependidikan.', icon: 'bi-person-badge' }
        ]
    },
    {
        id: 'akademik',
        title: 'Akademik & Pendidikan',
        icon: 'bi-mortarboard-fill',
        color: 'text-teal-600',
        items: [
            { title: 'Rapor K13/Merdeka', desc: 'Cetak rapor otomatis dengan template fleksibel.', icon: 'bi-file-earmark-text' },
            { title: 'Leger Nilai', desc: 'Import/Export nilai dari Excel dengan mudah.', icon: 'bi-table' },
            { title: 'Hafalan Tahfizh', desc: 'Pencatatan setoran hafalan Al-Quran.', icon: 'bi-book' }
        ]
    },
    {
        id: 'keuangan',
        title: 'Keuangan & Administrasi',
        icon: 'bi-cash-coin',
        color: 'text-green-600',
        items: [
            { title: 'SPP & Tagihan', desc: 'Sistem tagihan bulanan dan bebas (uang gedung, dll).', icon: 'bi-receipt' },
            { title: 'Tabungan Santri', desc: 'Manajemen uang saku dan deposit santri.', icon: 'bi-wallet2' },
            { title: 'Laporan Keuangan', desc: 'Laporan arus kas dan tunggakan real-time.', icon: 'bi-graph-up-arrow' }
        ]
    },
    {
        id: 'ekstra',
        title: 'Fitur Ekstra',
        icon: 'bi-stars',
        color: 'text-purple-600',
        items: [
            { title: 'PSB Online', desc: 'Formulir pendaftaran santri baru yang terintegrasi.', icon: 'bi-globe' },
            { title: 'Koperasi / POS', desc: 'Kasir toko santri dengan dukungan Barcode & Struk.', icon: 'bi-shop' },
            { title: 'Cloud Sync', desc: 'Backup dan sinkronisasi data antar komputer (Dropbox/WebDAV).', icon: 'bi-cloud-check' }
        ]
    }
];

export const panduanData = [
    {
        id: 'setup',
        title: '1. Persiapan Awal (Setup)',
        badgeColor: 'blue',
        badge: '1',
        steps: [
            {
                title: 'Atur Data Master',
                content: 'Masuk ke menu Data Master. Isi data Jenjang (SD/SMP/SMA), Kelas, dan Rombel. Data ini penting untuk fitur lainnya.'
            },
            {
                title: 'Input Data Santri',
                content: 'Masuk ke menu Santri. Anda bisa input satu persatu atau import dari Excel (CSV) untuk mempercepat.'
            },
            {
                title: 'Konfigurasi Keuangan',
                content: 'Di menu Keuangan > Pengaturan, buat pos-pos bayaran (SPP, Uang Makan, dll) dan nominalnya.'
            }
        ]
    },
    {
        id: 'keuangan',
        title: '2. Manajemen Keuangan',
        badgeColor: 'green',
        badge: '2',
        steps: [
            {
                title: 'Generate Tagihan',
                content: 'Setiap awal bulan, buka menu Keuangan > Status Pembayaran, lalu klik "Generate Tagihan" untuk memunculkan tagihan SPP bulan tersebut ke semua santri aktif.'
            },
            {
                title: 'Pembayaran',
                content: 'Saat wali santri membayar, cari nama santri di menu Keuangan, klik "Bayar", pilih tagihan yang dibayar, dan simpan. Struk akan otomatis tercetak.'
            },
            {
                title: 'Tabungan / Uang Saku',
                content: 'Gunakan fitur Uang Saku untuk mencatat deposit dan penarikan uang jajan santri. Saldo akan berkurang otomatis jika santri belanja di Koperasi menggunakan metode Tabungan.'
            }
        ]
    },
    {
        id: 'koperasi',
        title: '3. Koperasi & Kantin',
        badgeColor: 'orange',
        badge: '3',
        steps: [
             {
                title: 'Input Produk',
                content: 'Masukkan data barang dagangan di menu Koperasi > Produk. Dukung Barcode Scanner.'
            },
             {
                title: 'Kasir (POS)',
                content: 'Gunakan menu Kasir untuk melayani pembelian. Bisa bayar Tunai atau potong Saldo Tabungan santri.'
            },
            {
                title: 'Rekomendasi: Akun Khusus Penjaga Toko (Multi-User)',
                color: 'purple',
                content: (
                    <div className="bg-pink-50 p-3 rounded border border-pink-200 text-sm text-pink-900">
                        <strong>KEAMANAN DATA:</strong> Jangan berikan akses Admin penuh kepada penjaga koperasi/kantin.
                        <ul className="list-disc pl-5 mt-1 space-y-1">
                            <li>Buat user baru di <em>Pengaturan &gt; Akun</em>.</li>
                            <li>Pilih role <strong>Staff</strong>.</li>
                            <li>Matikan semua akses kecuali <strong>Koperasi</strong>.</li>
                            <li>Dengan ini, penjaga toko hanya bisa berjualan dan tidak bisa mengintip data SPP atau BK santri.</li>
                        </ul>
                    </div>
                )
            },
        ]
    },
    {
        id: 'sync',
        title: '4. Sinkronisasi Data (Cloud)',
        badgeColor: 'purple',
        badge: '4',
        steps: [
            {
                title: 'Konsep Offline-First',
                content: 'Aplikasi ini menyimpan data di browser Anda (Offline). Agar data bisa diakses di komputer lain (misal: Laptop Admin 2), gunakan fitur Sync.'
            },
            {
                title: 'Setup Dropbox',
                content: 'Di menu Pengaturan > Sync Cloud, hubungkan akun Dropbox (Gratis). Ini akan menjadi pusat penyimpanan data.'
            },
            {
                title: 'Proses Sync',
                content: 'Staff melakukan perubahan -> Klik "Upload Perubahan". Admin Utama klik "Download & Merge" untuk menggabungkan data dari semua staff.'
            }
        ]
    }
];

export interface FaqItemData {
    question: string;
    answer: string | React.ReactNode;
}

export const faqData: { title: string, icon: string, colorClass: string, items: FaqItemData[] }[] = [
    {
        title: 'Umum & Keamanan Akun',
        icon: 'bi-shield-lock',
        colorClass: 'bg-blue-100 text-blue-600',
        items: [
            {
                question: 'Apakah aplikasi ini butuh internet?',
                answer: 'Tidak wajib. Aplikasi ini berjalan Offline di browser (menggunakan IndexedDB). Internet hanya butuh saat: 1) Pertama kali buka, 2) Sync data ke Cloud, 3) Kirim WA.'
            },
            {
                question: 'Saya lupa password admin, bagaimana?',
                answer: 'Jika Anda sudah mengatur "Kunci Pemulihan" (Recovery Key) di pengaturan akun, gunakan itu di halaman login (klik Login Darurat). Jika tidak, Anda perlu clear cache browser (data akan hilang jika belum di-backup) atau hubungi support.'
            }
        ]
    },
    {
        title: 'Keuangan & Pembayaran',
        icon: 'bi-wallet2',
        colorClass: 'bg-green-100 text-green-600',
        items: [
            {
                question: 'Kenapa tagihan bulan ini tidak muncul?',
                answer: 'Tagihan bulanan tidak otomatis muncul sendiri. Anda harus klik tombol "Generate Tagihan" di menu Keuangan > Status Pembayaran setiap awal bulan.'
            },
            {
                question: 'Bisakah mencetak kuitansi ulang?',
                answer: 'Bisa. Masuk ke menu Keuangan > Status Pembayaran > Klik tombol "Riwayat" pada santri yang bersangkutan.'
            }
        ]
    },
    {
        title: 'Teknis & Error',
        icon: 'bi-bug',
        colorClass: 'bg-red-100 text-red-600',
        items: [
            {
                question: 'Data saya hilang setelah clear history browser!',
                answer: 'Benar, karena aplikasi ini berbasis browser (Client Side). SANGAT DISARANKAN untuk rutin melakukan Backup Data (Download JSON) atau aktifkan Sync Cloud ke Dropbox agar data aman.'
            },
            {
                question: 'Barcode scanner tidak jalan di Koperasi?',
                answer: 'Pastikan kursor mouse aktif di kolom pencarian produk. Barcode scanner bekerja seperti keyboard, dia hanya "mengetik" kode lalu menekan Enter.'
            }
        ]
    }
];
