
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
                        <p className="mb-2">Mode Multi-User sangat disarankan, terutama jika Anda menggunakan fitur <strong>Absensi</strong> dan <strong>Keuangan</strong>. Manfaat utamanya:</p>
                        <ul className="list-disc pl-5 space-y-1">
                            <li><strong>Akuntabilitas Absensi:</strong> Sistem akan mencatat siapa petugas yang melakukan absensi (misal: 'Ust. Ahmad' atau 'Petugas Piket').</li>
                            <li><strong>Keamanan:</strong> Membatasi akses orang lain yang meminjam komputer Anda.</li>
                            <li><strong>Pembagian Tugas (Role):</strong> Anda bisa membuat akun Staff yang hanya bisa akses menu tertentu (misal: Bendahara hanya akses Keuangan, tidak bisa hapus data Santri).</li>
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
                                <p>Buat akun khusus Staff (misal: Bendahara) yang hanya bisa akses menu Keuangan, tapi tidak bisa hapus data Santri.</p>
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
            }
        ]
    },
    {
        id: 'absensi',
        badge: 3,
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
        badge: 4,
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
        badge: 5,
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
        badge: 6,
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
        badge: 7,
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
        badge: 8,
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
    }
];
