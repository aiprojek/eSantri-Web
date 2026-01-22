
import React from 'react';

// --- TIPE DATA ---

export interface FaqItemData {
    question: string;
    answer: React.ReactNode;
}

export interface FaqCategoryData {
    title: string;
    icon: string;
    colorClass: string;
    items: FaqItemData[];
}

export interface PanduanStepData {
    title: string;
    content: React.ReactNode;
    color?: string;
}

export interface PanduanSectionData {
    id: string;
    badge: string | number;
    badgeColor: string; // Tailwind color name (e.g. 'purple', 'teal')
    title: string;
    containerClass?: string; // Optional override classes
    steps: PanduanStepData[];
}

// --- DATA FAQ ---

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
                answer: "Secara umum TIDAK. Aplikasi ini berkonsep 'Offline-First'. Anda bisa input data, bayar SPP, dan cetak laporan tanpa internet. Internet HANYA dibutuhkan saat Anda ingin melakukan Sinkronisasi Cloud (Dropbox), menggunakan fitur AI Magic Draft, atau mengirim Formulir Online (PSB/Rapor)."
            },
            {
                question: "Apa yang terjadi jika saya 'Clear Cache' browser?",
                answer: <span className="text-red-600 font-bold">BAHAYA! Menghapus Cache/History akan MENGHAPUS SEMUA DATA. Pastikan Anda rutin melakukan "Unduh Cadangan Data" (file JSON) atau Sinkronisasi Cloud agar data aman.</span>
            }
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
        title: "Data Master & Akademik",
        icon: "bi-database-fill",
        colorClass: "bg-blue-50 border-blue-500 text-blue-900",
        items: [
            {
                question: "Apakah aplikasi ini terhubung langsung dengan EMIS Kemenag?",
                answer: (
                    <div>
                        <p>Tidak secara langsung (API), karena akses API EMIS tertutup untuk umum.</p>
                        <p>Namun, eSantri Web menyediakan fitur <strong>Ekspor Format EMIS</strong> di menu Laporan. Fitur ini akan mengunduh data santri ke dalam format Excel yang kolom-kolomnya sudah disesuaikan dengan template upload EMIS, sehingga Anda tidak perlu mengetik ulang data satu per satu.</p>
                    </div>
                )
            },
            {
                question: "Bagaimana cara input banyak kelas/rombel sekaligus?",
                answer: (
                    <div>
                        <p className="mb-1">Gunakan tombol <strong>"Tambah Banyak (Tabel)"</strong> di menu Data Master &gt; Struktur Pendidikan.</p>
                        <p>Fitur ini memungkinkan Anda mengisi nama kelas seperti mengisi tabel Excel. Anda juga bisa langsung memilih Induk (misal: Rombel 1A induknya Kelas 1) tanpa perlu bolak-balik menu.</p>
                    </div>
                )
            },
            {
                question: "Apa beda Jenjang, Kelas, dan Rombel?",
                answer: (
                    <ul className="list-disc pl-5 space-y-1">
                        <li><strong>Jenjang:</strong> Tingkat pendidikan utama (Misal: Salafiyah Wustho, Salafiyah Ulya).</li>
                        <li><strong>Kelas:</strong> Tingkatan tahun dalam jenjang (Misal: Kelas 1, Kelas 2). Ini adalah induk dari Rombel.</li>
                        <li><strong>Rombel (Rombongan Belajar):</strong> Kelas fisik tempat santri belajar (Misal: Kelas 1A Putra, Kelas 1B Putri). Santri dimasukkan ke dalam Rombel.</li>
                    </ul>
                )
            },
            {
                question: "Bisakah saya menghapus Jenjang yang sudah ada santrinya?",
                answer: "TIDAK BISA. Untuk menjaga integritas data, Anda tidak bisa menghapus Jenjang/Kelas/Rombel yang masih memiliki santri aktif di dalamnya. Pindahkan dulu santri ke kelas lain atau luluskan, baru hapus datanya."
            }
        ]
    },
    {
        title: "PSB & Formulir Online",
        icon: "bi-person-plus-fill",
        colorClass: "bg-orange-50 border-orange-500 text-orange-900",
        items: [
            {
                question: "Apakah setiap Template Formulir butuh Web App URL (Script) berbeda?",
                answer: "TIDAK. Fitur 'Smart Script' memungkinkan Anda menggunakan SATU Web App URL untuk semua formulir. Script akan otomatis mendeteksi nama formulir dan membuat Tab (Sheet) baru di file Spreadsheet yang sama untuk memisahkan data."
            },
            {
                question: "Bagaimana cara import data dari WhatsApp?",
                answer: "Salin seluruh pesan pendaftaran dari WA (termasuk kode PSB_START...), lalu paste di menu 'Impor WA' pada dashboard PSB. Sistem akan otomatis memparsing data JSON tersebut."
            },
            {
                question: "Apa itu Metode Hybrid?",
                answer: "Metode Hybrid mengirim data ke Google Sheet (Cloud) untuk arsip otomatis, TETAPI juga membuat pesan WhatsApp berisi data backup. Ini paling aman: jika server error, data masih ada di chat WA Admin."
            }
        ]
    },
    {
        title: "Rapor Digital",
        icon: "bi-mortarboard-fill",
        colorClass: "bg-indigo-50 border-indigo-500 text-indigo-900",
        items: [
            {
                question: "Apakah Guru perlu login untuk mengisi nilai?",
                answer: "TIDAK PERLU. Admin akan mengirimkan file HTML (Formulir Offline) kepada Guru via WhatsApp. Guru cukup membuka file tersebut di HP atau Laptop mereka, mengisi nilai, lalu klik 'Kirim'."
            },
            {
                question: "Apakah Guru butuh internet saat mengisi nilai?",
                answer: "TIDAK. Formulir HTML tersebut bisa dibuka dan diisi tanpa kuota internet (Offline). Internet hanya dibutuhkan sesaat ketika Guru menekan tombol 'Kirim ke WA' untuk mengirimkan hasilnya ke Admin."
            },
            {
                question: "Apa itu kode acak saat Guru mengirim nilai via WA?",
                answer: "Itu adalah data nilai yang sudah dienkripsi (dikodekan) agar aman dan mudah dibaca oleh sistem. Admin cukup menyalin seluruh pesan tersebut ke menu 'Import Nilai', sistem akan otomatis menerjemahkannya menjadi angka di rapor."
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
                question: "Apa beda Uang Saku dan SPP?",
                answer: "Uang Saku adalah tabungan pribadi santri (Deposit/Penarikan) yang dikelola pondok. SPP adalah kewajiban bayar bulanan. Saldo Uang Saku tidak otomatis memotong SPP kecuali ditarik manual."
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
        title: "Kalender & Sarpras",
        icon: "bi-calendar-range-fill",
        colorClass: "bg-yellow-50 border-yellow-500 text-yellow-900",
        items: [
            {
                question: "Apakah Kalender bisa dicetak?",
                answer: "Tentu. Anda bisa mencetak Kalender Akademik dalam berbagai layout (1 lembar, 3 lembar, 4 lembar) dan memilih penanggalan utama (Masehi atau Hijriah). Klik tombol 'Cetak / Export' di menu Kalender."
            },
            {
                question: "Bagaimana cara menghitung nilai aset di Sarpras?",
                answer: "Sistem otomatis menjumlahkan 'Harga Perolehan' dari semua barang yang Anda input. Pastikan Anda mengisi estimasi harga saat menambah data aset agar laporan valuasi akurat."
            },
            {
                question: "Bisakah saya import data agenda kalender dari Excel?",
                answer: "Saat ini fitur import Excel untuk kalender belum tersedia. Namun, Anda bisa menggunakan fitur 'Tambah Massal' (tombol tabel) untuk menginput banyak kegiatan sekaligus dalam satu layar."
            }
        ]
    }
];

// --- DATA PANDUAN ---

export const panduanData: PanduanSectionData[] = [
    {
        id: 'setup',
        badge: 1,
        badgeColor: 'purple',
        title: 'Persiapan & Keamanan Sistem',
        steps: [
            {
                title: 'Pemberitahuan Penting: Konsep & Rekomendasi',
                content: (
                    <div className="bg-yellow-50 p-4 rounded-lg border-l-4 border-yellow-500 text-sm text-gray-700 space-y-3">
                        <p>
                            <strong>Asal Usul & Evolusi:</strong> Aplikasi ini awalnya didesain untuk penggunaan <em>Admin Sentris</em> (terpusat pada satu komputer). 
                            Namun, untuk mempermudah pekerjaan Admin tanpa menambah biaya server yang mahal, kami menghadirkan fitur <strong>Sinkronisasi Cloud (Hub & Spoke)</strong>.
                        </p>
                        <div className="border-t border-yellow-200 pt-2">
                            <strong>Saran Penggunaan:</strong>
                            <ul className="list-disc pl-5 mt-1 space-y-1">
                                <li>
                                    <strong>Pahami Alurnya Dulu:</strong> Sebelum penerapan penuh di pondok, sangat disarankan untuk mencoba aplikasi ini dalam <strong>tim kecil</strong> (misal: 1 Admin + 1 Guru) untuk memahami cara kerja kirim/terima data.
                                </li>
                                <li>
                                    <strong>Gunakan Fitur Kolaborasi:</strong> Untuk menunjang pekerjaan Admin agar tidak menumpuk, sangat disarankan mengaktifkan fitur <strong>Multi-User</strong> dan dukungan <strong>Cloud Sync</strong>. Biarkan Guru/Musyrif mengisi data (Absensi/Tahfizh) dari perangkat mereka sendiri.
                                </li>
                            </ul>
                        </div>
                    </div>
                )
            },
            {
                title: 'Konfigurasi Data Lembaga',
                content: (
                    <>
                        <p>Lakukan langkah ini sebelum menggunakan fitur lain:</p>
                        <ol className="list-decimal pl-5 space-y-1 mt-2 bg-gray-50 p-3 rounded border border-gray-200 text-sm">
                            <li>Buka menu <strong>Pengaturan &gt; Umum</strong>. Isi data lengkap yayasan dan pesantren (Nama, Alamat, Logo).</li>
                            <li>Buka menu <strong>Data Master &gt; Tenaga Pendidik</strong>. Gunakan tombol <strong>"Tambah Banyak (Tabel)"</strong> untuk menginput daftar guru, jabatan, dan tanggal mulai tugas secara massal.</li>
                            <li>Buka menu <strong>Data Master &gt; Struktur Pendidikan</strong>.
                                <ul className="list-disc pl-4 mt-1 text-xs text-gray-500">
                                    <li>Isi <strong>Jenjang</strong> terlebih dahulu (misal: Salafiyah Wustho).</li>
                                    <li>Isi <strong>Kelas</strong>. Gunakan "Tambah Banyak" untuk input Kelas 1, 2, 3 sekaligus dan memilih Jenjang Induknya di tabel.</li>
                                    <li>Isi <strong>Rombel</strong>. Gunakan "Tambah Banyak" untuk membuat kelas paralel (1A, 1B, dll) dan pilih Kelas Induk & Wali Kelasnya.</li>
                                </ul>
                            </li>
                        </ol>
                    </>
                )
            },
            {
                title: 'Keamanan: Aktivasi Mode Multi-User',
                content: (
                    <>
                         <p>Secara default, aplikasi ini berjalan tanpa login. <strong>Sangat disarankan</strong> mengaktifkan Mode Multi-User di menu <em>Pengaturan &gt; User & Keamanan</em>.</p>
                        <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                            <div className="bg-blue-50 p-3 rounded border border-blue-100">
                                <h4 className="font-bold text-blue-800 mb-1"><i className="bi bi-shield-check"></i> Keamanan Data</h4>
                                <p>Mencegah orang tidak berwenang mengakses data santri atau keuangan jika laptop ditinggal.</p>
                            </div>
                            <div className="bg-green-50 p-3 rounded border border-green-100">
                                <h4 className="font-bold text-green-800 mb-1"><i className="bi bi-person-fill-lock"></i> Pembagian Tugas</h4>
                                <p>Buat akun khusus Staff (misal: Bendahara hanya akses Keuangan, tidak bisa lihat Keuangan). Pembagian tugas yang jelas akan meningkatkan efisiensi.</p>
                            </div>
                            <div className="bg-orange-50 p-3 rounded border border-orange-100">
                                <h4 className="font-bold text-orange-800 mb-1"><i className="bi bi-activity"></i> Audit Trail</h4>
                                <p>Sistem mencatat siapa yang melakukan perubahan data di menu <strong>Log Aktivitas</strong>.</p>
                            </div>
                            <div className="bg-red-50 p-3 rounded border border-red-100">
                                <h4 className="font-bold text-red-800 mb-1"><i className="bi bi-key-fill"></i> Kunci Darurat</h4>
                                <p>Saat aktivasi, Anda akan dapat <strong>Kunci Pemulihan</strong>. Simpan baik-baik untuk reset password Admin jika lupa.</p>
                            </div>
                        </div>
                    </>
                )
            },
            {
                title: 'Manajemen User & Lupa Password',
                content: (
                    <div className="space-y-3">
                        <div className="border-l-4 border-indigo-500 pl-3 py-1 bg-indigo-50">
                            <h4 className="font-bold text-indigo-800 text-sm">Menambah User Staff</h4>
                            <p className="text-xs">Gunakan tombol <strong>"Ambil dari Data Guru"</strong> di menu Pengaturan Akun. Username akan dibuat otomatis. <br/><strong>Password Default:</strong> <code>123456</code> (Bisa diubah di tabel).</p>
                        </div>
                        <div className="border-l-4 border-red-500 pl-3 py-1 bg-red-50">
                            <h4 className="font-bold text-red-800 text-sm">Fitur Lupa Password Staff (Mandiri)</h4>
                            <p className="text-xs mb-1">Jika staff lupa password, klik <strong>"Lupa Password?"</strong> di halaman login.</p>
                            <ul className="list-disc pl-4 text-xs text-red-700">
                                <li>Untuk user yang dibuat manual, jawab pertanyaan keamanan yang diset saat pembuatan.</li>
                                <li>Untuk user dari "Data Guru" (Bulk), Pertanyaan default: <strong>"Apa nama aplikasi ini?"</strong>, Jawaban: <strong>"esantri"</strong>.</li>
                            </ul>
                        </div>
                        <div className="border-l-4 border-orange-500 pl-3 py-1 bg-orange-50">
                            <h4 className="font-bold text-orange-800 text-sm">SOP Reset Password Manual (Oleh Admin)</h4>
                            <p className="text-xs mb-1">Jika staff lupa jawaban keamanan dan Admin mereset password secara manual, ikuti urutan wajib ini agar password baru bisa dipakai staff:</p>
                            <ol className="list-decimal pl-4 text-xs text-orange-900 space-y-1">
                                <li><strong>Admin:</strong> Ubah password di menu <em>Pengaturan &gt; Akun</em>.</li>
                                <li><strong>Admin:</strong> Buka menu <em>Pusat Sync</em> (atau klik tombol Sync Cloud) &gt; Klik <strong>"Publikasikan Master"</strong>. (Langkah ini wajib agar konfigurasi user baru terkirim ke Cloud).</li>
                                <li><strong>Staff:</strong> Di halaman login laptop staff, klik tombol <strong>"Update Data Akun dari Cloud"</strong>.</li>
                                <li><strong>Staff:</strong> Login dengan password baru.</li>
                            </ol>
                        </div>
                    </div>
                )
            }
        ]
    },
    {
        id: 'sop',
        badge: 'SOP',
        badgeColor: 'gray',
        title: 'SOP Multi-Admin (Hub & Spoke)',
        containerClass: 'border-l-4 border-l-gray-800',
        steps: [
            {
                title: 'Konsep: Pusat (Hub) & Cabang (Spoke)',
                color: 'black',
                content: (
                    <ul className="list-disc pl-5 space-y-2 text-sm mt-1">
                        <li><strong>Admin Pusat (Hub):</strong> Laptop Utama. Pemegang "Kebenaran Data". Tugasnya menerima data dari staff, menggabungkannya, dan membagikan data Master terbaru.</li>
                        <li><strong>Staff (Spoke):</strong> Laptop Pendukung. Tugasnya input data harian (bayar SPP, input santri baru) dan menyetorkannya ke Pusat.</li>
                    </ul>
                )
            },
            {
                title: 'Aktivasi & Pairing (Satu Kali Saja)',
                color: 'black',
                content: (
                    <ol className="list-decimal pl-5 space-y-2 text-sm mt-1 bg-gray-50 p-3 rounded border">
                        <li><strong>Di Laptop Admin Pusat:</strong> Buka <em>Pengaturan &gt; Sync Cloud</em>. Login Dropbox. Buat Akun User untuk Staff di menu <em>User & Keamanan</em>.</li>
                        <li>Klik tombol <strong>"Bagikan Akses (Pairing Code)"</strong>. Salin kode yang muncul.</li>
                        <li><strong>Di Laptop Staff:</strong> Buka menu Sync Cloud. Paste kode tersebut di kolom <strong>"Setup Cepat"</strong>. Klik Hubungkan.</li>
                        <li>Sistem otomatis mengunduh semua data terbaru dari Pusat. Setelah selesai, klik <strong>OK</strong> dan login menggunakan akun yang sudah dibuatkan Admin.</li>
                    </ol>
                )
            },
            {
                title: 'SOP Harian: Alur Kerja Staff',
                color: 'black',
                content: (
                    <div className="space-y-3">
                        <div className="border-l-4 border-green-500 pl-3 py-1 bg-green-50">
                            <h4 className="font-bold text-green-800 text-sm">PAGI HARI (Sebelum Mulai Kerja)</h4>
                            <p className="text-xs">Klik tombol <strong>Sync Cloud &gt; Ambil Master Data</strong>. Ini memastikan Anda bekerja dengan data terbaru yang sudah disahkan Admin.</p>
                        </div>
                        <div className="border-l-4 border-blue-500 pl-3 py-1 bg-blue-50">
                            <h4 className="font-bold text-blue-800 text-sm">SIANG HARI (Saat Bekerja)</h4>
                            <p className="text-xs">Lakukan input data seperti biasa (Terima Pembayaran, Input Santri). Bisa dilakukan tanpa internet.</p>
                        </div>
                        <div className="border-l-4 border-orange-500 pl-3 py-1 bg-orange-50">
                            <h4 className="font-bold text-orange-800 text-sm">SORE HARI (Sebelum Pulang)</h4>
                            <p className="text-xs">Pastikan ada internet. Klik tombol <strong>Sync Cloud &gt; Kirim Perubahan</strong>. Ini akan mengirim pekerjaan Anda hari ini ke "Inbox" Admin.</p>
                        </div>
                    </div>
                )
            },
            {
                title: 'SOP Harian: Alur Kerja Admin Pusat',
                color: 'black',
                content: (
                    <>
                        <p className="text-sm mb-2">Dilakukan sore hari setelah semua staff melakukan "Kirim Perubahan".</p>
                        <ol className="list-decimal pl-5 space-y-1 text-sm mt-1 border p-3 rounded">
                            <li>Buka menu <strong>Pusat Sync</strong> di sidebar (muncul jika login sebagai Admin).</li>
                            <li>Klik <strong>Segarkan</strong> untuk melihat file kiriman Staff.</li>
                            <li>Klik <strong>Gabung</strong> pada setiap file yang masuk. Sistem akan menggabungkan data staff ke database pusat secara cerdas.</li>
                            <li>Setelah semua file digabung, klik tombol biru besar: <strong>Publikasikan Master</strong>.</li>
                            <li>Selesai. Data Master di Cloud sudah terupdate dan siap diambil Staff besok pagi.</li>
                        </ol>
                    </>
                )
            }
        ]
    },
    {
        id: 'santri',
        badge: 2,
        badgeColor: 'teal',
        title: 'Manajemen Santri',
        steps: [
            {
                title: 'Input Data Santri',
                content: (
                    <>
                         <p>Tiga cara memasukkan data:</p>
                        <ul className="list-disc pl-5 space-y-1 text-sm mt-1">
                            <li><strong>Manual:</strong> Klik "Tambah Santri" untuk input detail satu per satu lengkap dengan foto.</li>
                            <li><strong>Tambah Massal:</strong> Klik "Tambah Massal" untuk input cepat dalam bentuk tabel (seperti Excel) langsung di aplikasi.</li>
                            <li><strong>Impor CSV:</strong> Gunakan template CSV untuk migrasi data ratusan santri sekaligus dari aplikasi lain.</li>
                        </ul>
                    </>
                )
            },
            {
                title: 'Kenaikan Kelas & Alumni',
                content: (
                    <ul className="list-disc pl-5 space-y-1 text-sm mt-1">
                        <li><strong>Pindah Kelas Massal:</strong> Di menu Data Santri, filter kelas lama, centang semua (klik checkbox di header), klik tombol <strong>Pindah Kelas</strong> yang muncul di atas tabel.</li>
                        <li><strong>Kelulusan:</strong> Pilih santri, klik <strong>Ubah Status</strong>, pilih 'Lulus'. Data akan diarsipkan sebagai alumni dan tidak muncul di tagihan aktif.</li>
                    </ul>
                )
            },
            {
                title: 'Ekspor Data EMIS (Penting)',
                color: 'green',
                content: (
                    <div className="bg-green-50 p-3 rounded border border-green-200">
                        <p className="text-sm mb-2 text-green-900">
                            Fitur ini membantu Anda menyiapkan file Excel untuk upload ke EMIS Kemenag tanpa input ulang manual.
                        </p>
                        <ol className="list-decimal pl-5 space-y-1 text-sm text-green-800">
                            <li>Pastikan data NIK, Nama Ibu Kandung, dan Tempat/Tgl Lahir santri sudah lengkap.</li>
                            <li>Buka menu <strong>Laporan</strong>.</li>
                            <li>Pilih kategori <strong>Penunjang & Lainnya</strong>, lalu klik tombol <strong>Ekspor Format EMIS</strong>.</li>
                            <li>File Excel akan terunduh. Kolom-kolomnya sudah disesuaikan agar mudah dicopy ke template EMIS.</li>
                        </ol>
                    </div>
                )
            }
        ]
    },
    {
        id: 'kesehatan',
        badge: 3,
        badgeColor: 'red',
        title: "Poskestren & Kesehatan",
        steps: [
            {
                title: 'Setup Stok & Data Obat',
                content: (
                    <ul className="list-disc pl-5 space-y-1 text-sm mt-1">
                        <li>Buka menu <strong>Kesehatan &gt; Stok Obat</strong>.</li>
                        <li>Klik <strong>Tambah Obat</strong> untuk menginput database obat (Nama, Jenis, Stok Awal).</li>
                        <li>Stok akan otomatis berkurang saat obat diresepkan kepada santri.</li>
                    </ul>
                )
            },
            {
                title: 'Alur Pemeriksaan Ideal (Beban Kerja Terbagi)',
                content: (
                     <>
                        <div className="bg-red-50 p-3 rounded border border-red-200 text-sm mb-2 text-red-900">
                            <strong>REKOMENDASI:</strong> Jangan biarkan Admin Kantor mengerjakan semuanya. Delegasikan input kesehatan ke Petugas Poskestren.
                        </div>
                        <ol className="list-decimal pl-5 space-y-2 text-sm mt-1">
                            <li><strong>Buat Akun Petugas:</strong> Admin membuat user baru dengan role 'Staff' dan akses hanya ke modul 'Kesehatan'.</li>
                            <li><strong>Input di Klinik:</strong> Petugas Poskestren login di laptop klinik. Saat ada santri sakit, input data di menu <strong>Rekam Medis</strong>.</li>
                            <li><strong>Sync Data:</strong> Sore hari, Petugas klik "Kirim Perubahan". Admin pusat akan menerima data rekam medis tersebut.</li>
                        </ol>
                    </>
                )
            },
            {
                title: 'Integrasi Absensi & Cetak Surat',
                content: (
                     <ul className="list-disc pl-5 space-y-1 text-sm mt-1">
                        <li><strong>Absensi Otomatis:</strong> Jika status pemeriksaan adalah 'Rawat Inap' atau 'Rujuk', sistem otomatis menandai santri tersebut 'Sakit' (S) di menu Absensi pada tanggal tersebut.</li>
                        <li><strong>Cetak Surat:</strong> Klik ikon printer pada tabel rekam medis untuk mencetak Surat Keterangan Sakit resmi untuk izin sekolah/kamar.</li>
                    </ul>
                )
            }
        ]
    },
    {
        id: 'bukutamu',
        badge: 4,
        badgeColor: 'gray',
        title: 'Buku Tamu (Satpam)',
        steps: [
             {
                title: 'Check-In & Check-Out',
                content: (
                    <>
                        <p className="mb-2 text-sm">Gunakan fitur ini di pos keamanan atau resepsionis.</p>
                        <ol className="list-decimal pl-5 space-y-1 text-sm">
                            <li><strong>Check-In:</strong> Klik "Check-In Baru" saat tamu datang. Pilih kategori (Wali/Dinas). Jika Wali Santri, pilih nama santri yang dikunjungi.</li>
                            <li><strong>Check-Out:</strong> Klik tombol "Check-Out" pada kartu tamu saat mereka pulang. Ini akan mencatat jam keluar dan mengubah status menjadi selesai.</li>
                        </ol>
                    </>
                )
            },
            {
                title: 'Desentralisasi Input (Rekomendasi)',
                color: 'teal',
                content: (
                    <div className="bg-gray-100 p-3 rounded border border-gray-300 text-sm">
                        Agar tidak membebani Admin Kantor, <strong>buatkan akun khusus untuk Satpam</strong> dengan akses hanya ke modul 'Buku Tamu'.
                        <br/>Satpam bisa menggunakan HP/Laptop di pos jaga. Pastikan melakukan <strong>Sync Cloud</strong> (Kirim Perubahan) saat pergantian shift.
                    </div>
                )
            }
        ]
    },
    {
        id: 'bk',
        badge: 5,
        badgeColor: 'indigo',
        title: 'Bimbingan Konseling (BK)',
        steps: [
             {
                title: 'Penting: Privasi Data (Confidential)',
                color: 'red',
                content: (
                    <div className="bg-indigo-50 p-3 border border-indigo-200 rounded text-sm text-indigo-900">
                        <i className="bi bi-shield-lock-fill mr-1"></i> Data BK bersifat <strong>Sangat Rahasia</strong>.
                        Pastikan Anda mengaktifkan <strong>Multi-User Mode</strong> di Pengaturan. 
                        Buat akun khusus untuk Konselor/Guru BK. Staff biasa yang tidak memiliki izin akses 'BK' <strong>TIDAK AKAN BISA</strong> melihat menu ini.
                    </div>
                )
            },
             {
                title: 'Cara Aman Menggunakan (Desentralisasi)',
                color: 'teal',
                content: (
                    <>
                        <p className="mb-2 text-sm">Agar kerahasiaan terjaga dan tidak terekspos di komputer admin pusat yang ramai, gunakan metode ini:</p>
                        <div className="bg-teal-50 p-3 rounded border border-teal-200">
                            <ol className="list-decimal pl-5 space-y-2 text-sm">
                                <li><strong>Konselor Pakai Laptop Sendiri:</strong> Jangan mencatat BK di komputer utama kantor.</li>
                                <li><strong>Gunakan Cloud Sync:</strong> Hubungkan laptop Konselor ke Dropbox pondok.</li>
                                <li><strong>Input & Kirim:</strong> Konselor mencatat sesi di laptopnya (offline/online), lalu klik "Kirim Perubahan". Data akan terenkripsi dan aman sampai ke Admin Pusat.</li>
                            </ol>
                        </div>
                    </>
                )
            },
            {
                title: 'Mencatat Sesi Konseling',
                content: (
                    <ol className="list-decimal pl-5 space-y-1 text-sm mt-1">
                        <li>Buka menu <strong>Bimbingan Konseling</strong> di Sidebar.</li>
                        <li>Klik <strong>"Catat Sesi Baru"</strong>.</li>
                        <li>Pilih Nama Santri dan Kategori Masalah (Pribadi, Belajar, Keluarga, dll).</li>
                        <li>Tulis keluhan santri dan saran/penanganan.</li>
                        <li><strong>Privasi:</strong> Pilih tingkat kerahasiaan (Biasa/Rahasia/Sangat Rahasia).</li>
                    </ol>
                )
            }
        ]
    },
    {
        id: 'absensi',
        badge: 6,
        badgeColor: 'teal',
        title: 'Manajemen Absensi',
        steps: [
             {
                title: 'Persiapan: Multi-User & Kolaborasi Cloud',
                content: (
                    <>
                        <p>Agar tidak bergantung pada satu komputer Admin (Admin Sentris), sangat disarankan mengaktifkan <strong>Sync Cloud (Dropbox)</strong>.</p>
                        <ul className="list-disc pl-5 space-y-1 text-sm mt-1">
                            <li><strong>Gunakan Perangkat Masing-masing:</strong> Guru/Musyrif bisa mengabsen langsung di kelas/asrama menggunakan HP atau Laptop mereka sendiri.</li>
                            <li><strong>Akuntabilitas (Multi-User):</strong> Setiap guru login dengan akun masing-masing yang dibuatkan Admin, sehingga sistem mencatat siapa yang melakukan absensi.</li>
                            <li><strong>Sinkronisasi:</strong> Setelah mengabsen (offline), guru cukup melakukan "Kirim Perubahan" agar data masuk ke komputer pusat Admin.</li>
                        </ul>
                    </>
                )
            },
            {
                title: 'Proses Absensi Harian (Mobile Friendly)',
                content: (
                    <ol className="list-decimal pl-5 space-y-1 text-sm mt-1 bg-gray-50 p-2 rounded">
                        <li>Buka menu <strong>Absensi</strong>.</li>
                        <li>Pilih <strong>Rombel</strong> yang akan diabsen. Tanggal otomatis terisi hari ini (bisa diubah jika input mundur).</li>
                        <li>Klik tombol <strong>"Lanjut"</strong>.</li>
                        <li>Tips Cepat: Klik tombol <strong>"Tandai Semua Hadir"</strong> di pojok kanan atas. Semua status santri akan berubah menjadi (H).</li>
                        <li>Ubah status santri yang tidak hadir (Sakit/Izin/Alpha) dengan mengklik tombol huruf di sebelah namanya.</li>
                        <li>Klik <strong>Simpan Absensi</strong> di bagian bawah.</li>
                    </ol>
                )
            },
            {
                title: 'Rekap, Export Excel & Cetak PDF',
                content: (
                    <ul className="list-disc pl-5 space-y-1 text-sm mt-1">
                        <li>Masuk ke tab <strong>Rekap & Laporan</strong> di menu Absensi. Pilih Rombel, Bulan, dan Tahun.</li>
                        <li>Sistem akan menampilkan tabel matriks kehadiran tanggal 1-31 beserta persentase.</li>
                        <li>Klik tombol <strong>Export</strong> (Pojok Kanan Atas) untuk opsi lanjutan:
                             <ul className="list-disc pl-4 mt-1 border-l-2 border-teal-200">
                                <li><strong>Download PDF:</strong> Menghasilkan file PDF berkualitas tinggi (Vektor) lengkap dengan Kop Surat resmi.</li>
                                <li><strong>Excel (.xlsx):</strong> Mengunduh data mentah untuk diolah lebih lanjut di Microsoft Excel.</li>
                             </ul>
                        </li>
                    </ul>
                )
            }
        ]
    },
    {
        id: 'tahfizh',
        badge: 7,
        badgeColor: 'green',
        title: "Tahfizh & Mutaba'ah Qur'an",
        steps: [
             {
                title: 'Rekomendasi Workflow (Halaqah Real-time)',
                content: (
                    <>
                        <p className="mb-2 text-sm">Agar pencatatan hafalan efisien dan tidak menumpuk di meja admin, gunakan alur berikut:</p>
                        <div className="bg-green-50 p-3 rounded border border-green-200">
                            <ol className="list-decimal pl-5 space-y-2 text-sm">
                                <li><strong>Muhaffizh Login di HP/Tablet Sendiri:</strong> Admin membuatkan akun staff untuk setiap muhaffizh.</li>
                                <li><strong>Input Saat Menyimak:</strong> Muhaffizh membuka menu <em>Tahfizh &gt; Input Setoran</em> saat santri maju setoran.</li>
                                <li><strong>Otomatis Lanjut Ayat:</strong> Sistem otomatis menyarankan ayat lanjutan berdasarkan setoran terakhir, sehingga input sangat cepat.</li>
                                <li><strong>Sync Data:</strong> Setelah halaqah selesai, Muhaffizh klik tombol "Kirim Perubahan" (jika menggunakan Cloud Sync).</li>
                            </ol>
                        </div>
                    </>
                )
            },
            {
                title: 'Cara Input Setoran',
                content: (
                    <ul className="list-disc pl-5 space-y-1 text-sm mt-1">
                        <li>Buka menu <strong>Tahfizh &gt; Input Setoran</strong>.</li>
                        <li>Pilih Nama Santri di panel kiri (gunakan fitur pencarian untuk cepat).</li>
                        <li>Pilih Jenis Setoran: <strong>Ziyadah</strong> (Hafalan Baru), <strong>Murojaah</strong> (Mengulang), atau <strong>Tasmi'</strong> (Ujian).</li>
                        <li>Isi detail: Juz, Surat, dan Ayat. Berikan penilaian (Predikat) dan catatan jika perlu.</li>
                        <li>Klik <strong>Simpan Setoran</strong>.</li>
                    </ul>
                )
            },
            {
                title: 'Laporan Perkembangan & PDF',
                content: (
                    <ul className="list-disc pl-5 space-y-1 text-sm mt-1">
                        <li>Buka tab <strong>Riwayat & Laporan</strong>.</li>
                        <li>Cari santri yang diinginkan. Anda akan melihat daftar riwayat setoran lengkap.</li>
                        <li>Klik kartu santri untuk membuka detail.</li>
                        <li>Tekan tombol <strong>"Cetak Laporan"</strong> (ikon printer) untuk mengunduh <strong>Laporan Mutaba'ah PDF</strong> resmi yang berisi grafik capaian, detail setoran per tanggal, dan kolom tanda tangan wali.</li>
                    </ul>
                )
            }
        ]
    },
    {
        id: 'akademik',
        badge: 8,
        badgeColor: 'indigo',
        title: 'Akademik & Rapor Digital',
        steps: [
            {
                title: '1. Desain Grid Rapor',
                content: (
                    <ul className="list-disc pl-5 space-y-1 text-sm mt-1">
                        <li>Buka menu <strong>Akademik &gt; Desain Grid</strong>.</li>
                        <li>Buat Template baru atau Import dari Excel.</li>
                        <li>Gunakan kode variabel seperti <code>$NAMA</code>, <code>$NIS</code>, atau buat kode input sendiri seperti <code>$NILAI_UH1</code>.</li>
                    </ul>
                )
            },
            {
                title: '2. Generate Formulir Guru',
                content: (
                     <ul className="list-disc pl-5 space-y-1 text-sm mt-1">
                        <li>Masuk ke tab <strong>Generate Formulir</strong>.</li>
                        <li>Pilih Rombel dan Template.</li>
                        <li>Pilih metode pengiriman (WhatsApp / Hybrid).</li>
                        <li>Download file HTML dan kirimkan ke Guru Mapel/Wali Kelas.</li>
                    </ul>
                )
            },
            {
                title: '3. Proses Pengisian Nilai (Oleh Guru)',
                content: (
                    <ol className="list-decimal pl-5 space-y-1 text-sm mt-1 bg-gray-50 p-2 rounded">
                        <li>Guru membuka file HTML di browser HP/Laptop (Offline).</li>
                        <li>Guru mengisi nilai santri. Rumus rata-rata akan terhitung otomatis.</li>
                        <li>Klik <strong>"Kirim Nilai"</strong>. WhatsApp akan terbuka berisi kode data terenkripsi.</li>
                        <li>Guru mengirim pesan tersebut ke nomor Admin.</li>
                    </ol>
                )
            },
            {
                title: '4. Import & Cetak (Oleh Admin)',
                content: (
                    <ul className="list-disc pl-5 space-y-1 text-sm mt-1">
                        <li>Admin menyalin kode pesan dari Guru (diawali <code>RAPOR_V2_START</code>).</li>
                        <li>Paste di menu <strong>Akademik &gt; Import Nilai</strong>.</li>
                        <li>Buka tab <strong>Cetak Rapor</strong> untuk mencetak rapor fisik (PDF) atau arsip.</li>
                    </ul>
                )
            },
             {
                title: '5. Monitoring Progress (Audit)',
                content: (
                     <>
                        <p className="text-sm mb-1">Fitur ini membantu Admin memantau kelengkapan nilai:</p>
                        <ul className="list-disc pl-5 space-y-1 text-sm">
                            <li>Buka menu <strong>Akademik &gt; Monitoring</strong>.</li>
                            <li>Lihat diagram batang untuk setiap Rombel.</li>
                            <li><span className="text-green-600 font-bold">Hijau</span> = Nilai Lengkap (Semua Santri sudah ada nilainya).</li>
                            <li><span className="text-yellow-600 font-bold">Kuning</span> = Masih sebagian (Sedang proses input).</li>
                            <li><span className="text-red-600 font-bold">Merah</span> = Belum ada data masuk sama sekali.</li>
                        </ul>
                    </>
                )
            }
        ]
    },
    {
        id: 'finance',
        badge: 9,
        badgeColor: 'blue',
        title: 'Keuangan & Pembayaran',
        steps: [
            {
                title: 'Siklus Tagihan & Pembayaran',
                content: (
                     <ul className="list-disc pl-5 space-y-1 text-sm mt-1">
                        <li><strong>Pengaturan Biaya:</strong> Buat komponen biaya (SPP, Uang Gedung) di menu <em>Keuangan &gt; Pengaturan Biaya</em>.</li>
                        <li><strong>Generate Tagihan:</strong> Buka <em>Status Pembayaran &gt; Generate Tagihan</em>. Lakukan setiap awal bulan untuk SPP.</li>
                        <li><strong>Pembayaran:</strong> Cari santri di Status Pembayaran, klik tombol <strong>"Bayar"</strong>, centang bulan yang dibayar. Kuitansi tercetak otomatis.</li>
                    </ul>
                )
            },
            {
                title: 'Uang Saku & Tabungan',
                content: (
                    <>
                        <p>Fitur untuk mengelola uang jajan santri (Tabungan):</p>
                        <ul className="list-disc pl-5 space-y-1 text-sm mt-1">
                            <li>Buka tab <strong>Uang Saku</strong>.</li>
                            <li>Klik <strong>Deposit</strong> saat wali santri menitipkan uang.</li>
                            <li>Klik <strong>Penarikan</strong> saat santri mengambil uang jajan.</li>
                            <li>Cetak laporan "Rekening Koran" untuk laporan ke wali santri.</li>
                        </ul>
                    </>
                )
            },
             {
                title: 'Setoran Kas (Closing Harian)',
                content: (
                    <>
                        <p>Penting untuk validasi uang fisik kasir:</p>
                        <ol className="list-decimal pl-5 space-y-1 text-sm mt-1 bg-gray-50 p-2 rounded">
                            <li>Uang yang diterima kasir (SPP/Uang Saku) masuk status "Di Laci Kasir" (Pending).</li>
                            <li>Buka menu <strong>Setoran Kas</strong> di sore hari.</li>
                            <li>Centang semua transaksi hari itu, klik <strong>"Setor ke Buku Kas"</strong>.</li>
                            <li>Uang resmi masuk ke Saldo Pondok (Buku Kas Umum).</li>
                        </ol>
                    </>
                )
            }
        ]
    },
    {
        id: 'asrama',
        badge: 10,
        badgeColor: 'orange',
        title: 'Keasramaan',
        steps: [
            {
                title: 'Manajemen Kamar',
                content: (
                    <ul className="list-disc pl-5 space-y-1 text-sm mt-1">
                        <li>Buka menu <strong>Keasramaan &gt; Manajemen Asrama</strong>.</li>
                        <li>Tambah Gedung (Putra/Putri) dan Kamar beserta kapasitasnya.</li>
                    </ul>
                )
            },
            {
                title: 'Penempatan Santri',
                content: (
                     <ul className="list-disc pl-5 space-y-1 text-sm mt-1">
                        <li>Buka tab <strong>Penempatan Santri</strong>.</li>
                        <li>Pilih santri dari daftar "Tanpa Kamar" (bisa filter per kelas).</li>
                        <li>Klik tombol "Tempatkan" pada kartu kamar yang tersedia.</li>
                    </ul>
                )
            }
        ]
    },
    {
        id: 'admin',
        badge: 11,
        badgeColor: 'green',
        title: 'PSB & Surat Menyurat',
        steps: [
            {
                title: 'Penerimaan Santri Baru (PSB)',
                content: (
                    <>
                        <div className="mb-2">Gunakan menu <strong>PSB</strong> untuk mengelola pendaftaran santri baru secara online/offline.</div>
                        <ul className="list-disc pl-5 space-y-1 text-sm mt-1">
                             <li><strong>Desain Formulir:</strong> Buat formulir pendaftaran custom di menu <em>Desain Formulir Online</em>.</li>
                             <li><strong>Smart Script:</strong> Anda cukup menggunakan <strong>SATU Google Apps Script</strong> untuk banyak jenis formulir. Sistem akan otomatis memisahkan data ke Tab (Sheet) yang berbeda di Google Spreadsheet berdasarkan nama formulir.</li>
                             <li><strong>Metode Hybrid:</strong> Pilih metode "Hybrid" agar data tersimpan otomatis ke Cloud (Google Sheet) sekaligus mengirim notifikasi & data backup ke WhatsApp Admin.</li>
                             <li><strong>Rekap & Seleksi:</strong> Kelola data masuk di menu <em>Rekap Pendaftar</em>. Klik tombol "Terima" untuk memindahkan pendaftar resmi menjadi Santri Aktif secara otomatis.</li>
                        </ul>
                    </>
                )
            },
            {
                title: 'Surat Menyurat & Arsip',
                content: (
                    <ul className="list-disc pl-5 space-y-1 text-sm mt-1">
                        <li><strong>Template Editor:</strong> Buat template surat (Izin, Undangan, Keterangan) dengan editor teks lengkap. Gunakan variabel <code>{'{NAMA_SANTRI}'}</code> agar data terisi otomatis.</li>
                        <li><strong>Magic Draft (AI):</strong> Gunakan fitur AI untuk membuatkan draf bahasa surat yang sopan dan formal secara instan.</li>
                        <li><strong>Cetak Massal:</strong> Cetak surat untuk satu kelas sekaligus (Mail Merge) dengan satu klik.</li>
                    </ul>
                )
            }
        ]
    },
    {
        id: 'kalender',
        badge: 12,
        badgeColor: 'yellow',
        title: 'Kalender Akademik',
        steps: [
            {
                title: 'Input Agenda Kegiatan',
                content: (
                    <ul className="list-disc pl-5 space-y-1 text-sm mt-1">
                        <li>Buka menu <strong>Kalender</strong>.</li>
                        <li>Klik <strong>Tambah Agenda</strong> untuk memasukkan kegiatan secara manual satu per satu.</li>
                        <li>Gunakan tombol <strong>Tambah Massal</strong> (ikon tabel) untuk memasukkan banyak agenda sekaligus (seperti Jadwal Ujian, Libur Semester, PHBI) dalam format tabel yang cepat.</li>
                    </ul>
                )
            },
            {
                title: 'Cetak Kalender Dinding (Custom)',
                content: (
                    <ol className="list-decimal pl-5 space-y-1 text-sm mt-1 bg-gray-50 p-2 rounded">
                        <li>Klik tombol <strong>Cetak / Export</strong>.</li>
                        <li>Pilih <strong>Tema Desain</strong> (Classic, Modern, Ceria, dll) sesuai selera.</li>
                        <li>Pilih <strong>Layout</strong>: 1 Lembar (untuk dinding kantor), 3 Lembar (Triwulan), atau 4 Lembar (Caturwulan).</li>
                        <li><strong>Penanggalan:</strong> Pilih apakah angka utama adalah Masehi atau Hijriah.</li>
                        <li>Anda juga bisa mengupload foto gedung pondok sebagai banner atau watermark.</li>
                        <li>Klik Cetak untuk menghasilkan PDF siap print.</li>
                    </ol>
                )
            }
        ]
    },
    {
        id: 'library',
        badge: 13,
        badgeColor: 'teal',
        title: 'Perpustakaan Digital',
        steps: [
            {
                title: 'Manajemen Katalog Buku',
                content: (
                    <ul className="list-disc pl-5 space-y-1 text-sm mt-1">
                        <li>Buka menu <strong>Perpustakaan &gt; Katalog Buku</strong>.</li>
                        <li>Klik <strong>Tambah Buku</strong> untuk input satu per satu, atau <strong>Tambah Massal</strong> untuk input cepat menggunakan tabel.</li>
                        <li>Isi data lengkap seperti Judul, Penulis, Penerbit, dan Lokasi Rak untuk memudahkan pencarian.</li>
                    </ul>
                )
            },
            {
                title: 'Sirkulasi (Peminjaman & Pengembalian)',
                content: (
                    <ul className="list-disc pl-5 space-y-1 text-sm mt-1">
                        <li><strong>Peminjaman:</strong> Di tab Sirkulasi, cari nama santri dan judul buku. Tentukan durasi pinjam, lalu klik "Proses Peminjaman".</li>
                        <li><strong>Pengembalian:</strong> Masuk ke sub-menu "Pengembalian". Cari nama peminjam. Sistem otomatis menghitung denda jika terlambat. Klik "Kembalikan" untuk menyelesaikan.</li>
                    </ul>
                )
            },
             {
                title: 'Cetak Kartu & Label',
                content: (
                    <ul className="list-disc pl-5 space-y-1 text-sm mt-1">
                        <li>Buka tab <strong>Cetak Kartu</strong>.</li>
                        <li><strong>Kartu Anggota:</strong> Pilih santri untuk mencetak kartu perpustakaan dengan barcode.</li>
                        <li><strong>Slip Buku:</strong> Cetak slip tanggal kembali untuk ditempel di belakang buku.</li>
                        <li><strong>Label Punggung:</strong> Cetak label kode buku (Call Number) untuk ditempel di punggung buku (spine) agar mudah disusun di rak.</li>
                    </ul>
                )
            }
        ]
    }
];
