
import React from 'react';

export interface FaqItemData {
    question: string;
    answer: string | React.ReactNode;
}

export interface FaqCategoryData {
    title: string;
    icon: string;
    colorClass: string;
    items: FaqItemData[];
}

export const faqData: FaqCategoryData[] = [
    {
        title: "Umum & Keamanan Akun",
        icon: "bi-shield-lock-fill",
        colorClass: "bg-purple-50 border-purple-500 text-purple-900",
        items: [
            {
                question: "Apa manfaat mengaktifkan Mode Multi-User?",
                answer: (
                    <div>
                        <p className="mb-2">Mode Multi-User sangat disarankan, terutama jika Anda menggunakan fitur <strong>Absensi</strong>, <strong>Keuangan</strong>, dan <strong>Keamanan</strong>. Manfaat utamanya:</p>
                        <ul className="list-disc pl-5 space-y-1">
                            <li><strong>Akuntabilitas:</strong> Sistem akan mencatat siapa petugas yang melakukan entri data (misal: 'Pak Satpam' di Buku Tamu atau 'Ust. Ahmad' di Absensi).</li>
                            <li><strong>Keamanan:</strong> Membatasi akses orang lain yang meminjam komputer Anda.</li>
                            <li><strong>Pembagian Tugas (Role):</strong> Anda bisa membuat akun Staff yang hanya bisa akses menu tertentu (misal: Satpam hanya akses Buku Tamu, tidak bisa lihat Keuangan).</li>
                        </ul>
                    </div>
                )
            },
            {
                question: "Saya lupa password Admin, bagaimana cara resetnya?",
                answer: (
                    <div>
                        <p className="mb-2">Jika menggunakan mode Multi-User, gunakan <strong>Kunci Pemulihan (Recovery Key)</strong>:</p>
                        <ol className="list-decimal pl-5 space-y-1">
                            <li>Di halaman login, klik "Gunakan Kunci Darurat".</li>
                            <li>Masukkan kode unik (ESANTRI-XXXX...) yang diberikan saat setup.</li>
                            <li>Jika kunci valid, Anda bisa membuat password baru.</li>
                        </ol>
                        <p className="mt-2 text-xs italic text-red-600">Catatan: Jika Anda juga kehilangan Kunci Pemulihan, data tidak dapat diakses (terenkripsi). Solusinya adalah melakukan Reset Aplikasi (Hapus Data).</p>
                    </div>
                )
            },
            {
                question: "Apakah aplikasi ini butuh internet?",
                answer: "Secara umum TIDAK. Aplikasi ini berkonsep 'Offline-First'. Anda bisa input data, bayar SPP, dan cetak laporan tanpa internet. Internet HANYA dibutuhkan saat Anda ingin melakukan Sinkronisasi Cloud (Dropbox/WebDAV), menggunakan fitur AI Magic Draft, atau mengirim Formulir Online (PSB/Rapor)."
            },
            {
                question: "Apa yang terjadi jika saya 'Clear Cache' browser?",
                answer: <span className="text-red-600 font-bold">BAHAYA! Menghapus Cache/History akan MENGHAPUS SEMUA DATA. Pastikan Anda rutin melakukan "Unduh Cadangan Data" (file JSON) atau Sinkronisasi Cloud agar data aman.</span>
            }
        ]
    },
    {
        title: "Koperasi & Kantin",
        icon: "bi-shop",
        colorClass: "bg-pink-100 text-pink-700 border-pink-200",
        items: [
            {
                 question: "Bagaimana cara kerja 'Parkir Pesanan'?",
                 answer: "Saat santri di kasir lupa bawa uang atau ingin menambah barang tapi antrean panjang, klik tombol 'Simpan Sementara'. Pesanan akan disimpan. Anda bisa melayani santri lain dulu. Nanti, klik tombol Keranjang (warna oranye) di atas untuk memanggil kembali pesanan tersebut." 
            },
            {
                 question: "Bagaimana jika santri ingin Kasbon/Hutang?",
                 answer: "Di halaman pembayaran (Checkout), pilih metode 'Hutang'. Jika pelanggan adalah 'Umum', Anda wajib mengisi Nama dan No HP. Data hutang akan masuk ke tab 'Kasbon' dan tidak dihitung sebagai pemasukan kas sampai dilunasi."
            },
            {
                 question: "Cara menghubungkan Printer Thermal Bluetooth?",
                 answer: "Buka tab 'Pengaturan' di menu Koperasi. Klik tombol 'Cari & Hubungkan Printer'. Pastikan Bluetooth laptop/HP aktif dan printer sudah dinyalakan. Setelah terhubung, struk akan otomatis tercetak saat transaksi selesai."
            }
        ]
    },
    {
        title: "Akademik & Jadwal",
        icon: "bi-mortarboard",
        colorClass: "bg-indigo-100 text-indigo-600 border-indigo-200",
        items: [
            { question: "Kenapa nama guru tidak muncul saat mengisi Jadwal?", answer: "Sistem memfilter guru berdasarkan 'Kompetensi Mapel' dan 'Hari Ketersediaan'. Buka menu Data Master > Tenaga Pendidik, edit guru tersebut, dan pastikan Anda sudah mencentang Mapel yang sesuai dan Hari dimana guru tersebut bisa mengajar." },
            { question: "Bagaimana cara menyalin jadwal pelajaran?", answer: "Masuk menu Jadwal, pilih kelas target yang masih kosong. Klik tombol 'Salin Jadwal Dari...', lalu pilih kelas sumber yang sudah ada jadwalnya. Jadwal akan terduplikasi." },
            { question: "Guru tidak bisa membuka file input nilai di HP?", answer: "Pastikan guru menggunakan browser modern (Chrome/Firefox/Safari). File formulir nilai berbasis HTML5 standar yang ringan dan tidak butuh aplikasi khusus." },
            { question: "Rumus Ranking di Rapor tidak muncul?", answer: "Pastikan Anda menggunakan formula =RANK($NA) di kolom ranking pada Desain Rapor. '$NA' harus merujuk pada Kode Variabel kolom Nilai Akhir." },
        ]
    },
    {
        title: "Buku Tamu & Keamanan",
        icon: "bi-shield-check",
        colorClass: "bg-gray-50 border-gray-500 text-gray-900",
        items: [
            {
                question: "Apakah data tamu bisa dihapus?",
                answer: "Hanya Admin yang bisa menghapus data tamu. Petugas biasa (Staff) hanya bisa melakukan 'Check-In' dan 'Check-Out' untuk menjaga integritas data kunjungan."
            },
            {
                question: "Apa fungsi tombol Check-Out?",
                answer: "Tombol Check-Out menandakan tamu sudah pulang/meninggalkan area pondok. Ini penting agar sistem bisa menampilkan daftar 'Tamu Aktif' (yang masih berada di dalam area) secara akurat di Dashboard Keamanan."
            },
            {
                question: "Bisakah mencatat plat nomor kendaraan?",
                answer: "Bisa. Saat Check-In, ada kolom opsional untuk mencatat jenis kendaraan dan plat nomor. Ini berguna untuk pengawasan parkir."
            }
        ]
    },
    {
        title: "Perpustakaan",
        icon: "bi-book-half",
        colorClass: "bg-teal-50 border-teal-500 text-teal-900",
        items: [
            {
                question: "Bagaimana cara mencetak label punggung buku?",
                answer: "Masuk ke menu Perpustakaan > Cetak Kartu. Pilih tab 'Label', lalu pilih buku yang ingin dicetak labelnya. Label ini memuat kode panggil (Call Number) dan informasi Rak untuk ditempel di punggung buku."
            },
            {
                question: "Apakah stok buku berkurang otomatis?",
                answer: "Ya. Saat Anda mencatat peminjaman di menu Sirkulasi, stok buku di Katalog akan berkurang otomatis. Stok akan kembali bertambah saat buku dikembalikan."
            },
            {
                question: "Apakah bisa input buku secara massal?",
                answer: "Tentu. Gunakan tombol 'Tambah Massal' di menu Katalog Buku. Anda bisa menginput Judul, Penulis, Penerbit, dll dalam format tabel."
            }
        ]
    },
    {
        title: "Kesehatan & BK",
        icon: "bi-heart-pulse-fill",
        colorClass: "bg-red-50 border-red-500 text-red-900",
        items: [
             {
                question: "Apa perbedaan fitur BK dan Pelanggaran?",
                answer: (
                    <ul className="list-disc pl-5 space-y-1">
                        <li><strong>Pelanggaran:</strong> Bersifat publik/administratif (hukuman, poin). Data ini bisa muncul di rapor santri atau surat panggilan wali.</li>
                        <li><strong>BK (Bimbingan Konseling):</strong> Bersifat personal/privat (curhat, masalah keluarga, motivasi). Data ini <strong>RAHASIA</strong> dan tidak muncul di laporan umum.</li>
                    </ul>
                )
            },
            {
                question: "Siapa yang bisa melihat data BK?",
                answer: "Hanya user dengan role 'Admin' atau user 'Staff' yang diberikan izin khusus akses modul BK. Staff biasa (misal bagian dapur atau keamanan) tidak akan melihat menu BK sama sekali jika tidak diberi akses."
            },
            {
                question: "Apakah stok obat berkurang otomatis?",
                answer: "Ya. Saat Anda mencatat pemeriksaan dan menambahkan 'Resep Obat' di formulir, stok obat di gudang akan otomatis berkurang sesuai jumlah yang diberikan."
            },
            {
                question: "Bagaimana jika santri sakit (Rawat Inap)?",
                answer: "Sistem terintegrasi otomatis. Jika Anda memilih status 'Rawat Inap' atau 'Rujuk' di menu Kesehatan, maka di menu Absensi, santri tersebut akan otomatis tercatat 'S' (Sakit) pada tanggal tersebut."
            }
        ]
    },
    {
        title: "Absensi & Kehadiran",
        icon: "bi-calendar-check-fill",
        colorClass: "bg-teal-50 border-teal-500 text-teal-900",
        items: [
            {
                question: "Apa bedanya 'Export PDF' dan 'Cetak Laporan' di Rekap Absensi?",
                answer: (
                    <div>
                        <p className="mb-1"><strong>Export PDF:</strong> Menghasilkan file PDF digital yang sangat rapi (High Quality/Vector), lengkap dengan Kop Surat, judul, dan tanda tangan. Cocok untuk dikirim via WhatsApp/Email.</p>
                        <p><strong>Cetak Laporan:</strong> Menggunakan fitur print bawaan browser. Lebih cepat jika ingin langsung print ke kertas, namun tampilannya bergantung pada pengaturan printer Anda.</p>
                    </div>
                )
            },
            {
                question: "Bisakah saya mengabsen untuk tanggal yang sudah lewat (Backdate)?",
                answer: "BISA. Saat masuk ke menu Absensi, Anda bebas memilih tanggal berapapun. Ini berguna jika petugas piket lupa menginput data hari sebelumnya."
            },
            {
                question: "Bagaimana cara mengubah status santri yang salah input?",
                answer: "Cukup ulangi proses absensi pada tanggal dan kelas yang sama. Pilih status yang benar, lalu simpan ulang. Data lama akan tertimpa dengan yang baru."
            },
            {
                question: "Apakah Guru bisa mengabsen lewat HP mereka sendiri?",
                answer: (
                    <div>
                        <p className="mb-2"><strong>BISA dan SANGAT DISARANKAN.</strong> Aplikasi ini didesain <em>Mobile First</em>.</p>
                        <p>Dengan mengaktifkan fitur <strong>Sync Cloud</strong> dan <strong>Mode Multi-User</strong>:</p>
                        <ul className="list-disc pl-5 space-y-1 mt-1 text-sm">
                            <li>Guru bisa login di HP/Laptop masing-masing menggunakan akun staff.</li>
                            <li>Guru melakukan absensi langsung di kelas (tidak perlu antri di komputer Admin).</li>
                            <li>Setelah selesai, Guru cukup klik "Kirim Perubahan" agar data masuk ke Admin Pusat.</li>
                        </ul>
                    </div>
                )
            }
        ]
    },
    {
        title: "Keuangan & Pembayaran",
        icon: "bi-cash-coin",
        colorClass: "bg-green-50 border-green-500 text-green-900",
        items: [
            {
                question: "Kenapa Saldo Kas tidak bertambah setelah ada pembayaran?",
                answer: "Pembayaran santri masuk ke status 'Di Laci Kasir' (Pending). Admin Keuangan harus melakukan 'Setoran Kas' di menu Keuangan agar uang tercatat resmi masuk ke Buku Kas Umum Pondok."
            },
            {
                question: "Apakah fitur Keuangan & Payroll aman digunakan?",
                answer: (
                    <div>
                        <p className="mb-2">Sangat aman, namun kami <strong>SANGAT MEREKOMENDASIKAN</strong> dua hal ini untuk Bendahara:</p>
                        <ul className="list-disc pl-5 space-y-1">
                            <li><strong>Multi-User:</strong> Aktifkan di Pengaturan. Buat akun khusus untuk Bendahara agar setiap transaksi tercatat atas nama petugas (Audit Trail).</li>
                            <li><strong>Cloud Sync:</strong> Data keuangan adalah data vital. Sinkronisasi ke Dropbox/WebDAV memastikan data tidak hilang jika laptop rusak atau terkena virus.</li>
                        </ul>
                    </div>
                )
            },
            {
                question: "Bagaimana cara hitung gaji guru otomatis?",
                answer: "Gunakan menu Keuangan > Penggajian. Pastikan Anda sudah mengatur Jadwal Pelajaran terlebih dahulu. Sistem akan menghitung estimasi honor berdasarkan (Jumlah Jam Mengajar x Honor per Jam) + Gaji Pokok."
            }
        ]
    },
    {
        title: "Sinkronisasi Tim",
        icon: "bi-cloud-arrow-up-fill",
        colorClass: "bg-gray-50 border-gray-500 text-gray-900",
        items: [
            {
                question: "Apa bedanya 'Kirim Perubahan' dan 'Ambil Master'?",
                answer: "Kirim Perubahan (Upload) mengirim pekerjaan Anda ke Cloud. Ambil Master (Download) mengambil data terbaru yang sudah disahkan Admin Pusat. Staff wajib melakukan Ambil Master setiap pagi."
            },
            {
                question: "Apakah bisa real-time collaboration?",
                answer: "Tidak real-time (seperti Google Docs). Sistem ini menggunakan model Hub & Spoke. Staff bekerja offline, lalu menyetor data ke Admin Pusat untuk digabungkan. Ini mencegah konflik data dan memungkinkan kerja tanpa internet."
            },
            {
                question: "Apa fungsi 'Kode Pairing' di menu Sync?",
                answer: "Kode Pairing memungkinkan Staff terhubung ke Dropbox Admin tanpa perlu login email/password akun Dropbox tersebut. Cukup Copy-Paste kode dari Admin, laptop Staff langsung terhubung."
            }
        ]
    },
    {
        title: "Kalender & Jadwal Ibadah",
        icon: "bi-calendar-range-fill",
        colorClass: "bg-yellow-50 border-yellow-500 text-yellow-900",
        items: [
            {
                question: "Apakah Kalender bisa dicetak?",
                answer: "Tentu. Anda bisa mencetak Kalender Akademik dalam berbagai layout (1 lembar, 3 lembar, 4 lembar) dan memilih penanggalan utama (Masehi atau Hijriah). Klik tombol 'Cetak / Export' di menu Kalender."
            },
            {
                question: "Bagaimana cara membuat Jadwal Piket Imam & Muadzin?",
                answer: "Buka menu **Kalender > Tab 'Jadwal Piket Ibadah'**. Pilih tanggal, lalu klik tombol **'Auto Isi'** (ikon tongkat sihir). Sistem akan mengacak santri putra aktif untuk mengisi slot yang masih kosong secara otomatis. Anda juga bisa mengedit manual."
            },
             {
                question: "Apakah penanda puasa Ramadhan di kalender akurat?",
                answer: "Penanda puasa (Ramadhan/Sunnah) di kalender menggunakan metode **Hisab/Estimasi**. Untuk penetapan awal Ramadhan dan Hari Raya, tetap ikuti keputusan resmi pemerintah (Sidang Isbat). Anda bisa menyesuaikan selisih hari di menu **Pengaturan > Umum > Koreksi Tanggal Hijriah**."
            }
        ]
    }
];
