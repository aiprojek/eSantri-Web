
import React from 'react';

export interface PanduanStepData {
    title: string;
    content: React.ReactNode;
    color?: string;
}

export interface PanduanSectionData {
    id: string;
    badge: string | number | React.ReactNode;
    badgeColor: string; // Tailwind color name (e.g. 'purple', 'teal')
    title: string;
    containerClass?: string; // Optional override classes
    steps: PanduanStepData[];
}

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
                title: 'Aktivasi & Setup (Oleh Admin)',
                color: 'black',
                content: (
                    <ol className="list-decimal pl-5 space-y-2 text-sm mt-1 bg-gray-50 p-3 rounded border">
                        <li><strong>Di Laptop Admin Pusat:</strong> Buka <em>Pengaturan &gt; Sync Cloud</em>.</li>
                        <li>Pilih Provider (Dropbox atau WebDAV).</li>
                        <li>Jika menggunakan <strong>Dropbox</strong>: Masukkan <em>App Key</em> & <em>App Secret</em> (Didapat dari Dropbox Developer Console), lalu klik "Dapatkan Kode" dan ikuti proses otorisasi manual.</li>
                        <li>Setelah terhubung, klik tombol <strong>"Bagikan Akses (Pairing Code)"</strong>. Salin kode rahasia yang muncul.</li>
                    </ol>
                )
            },
             {
                title: 'Koneksi Staff (Pairing)',
                color: 'black',
                content: (
                    <ol className="list-decimal pl-5 space-y-2 text-sm mt-1">
                         <li><strong>Di Laptop Staff:</strong> Buka menu <em>Pengaturan &gt; Sync Cloud</em>.</li>
                         <li>Paste kode dari Admin ke kolom <strong>"Setup Cepat"</strong> di bagian bawah.</li>
                         <li>Klik <strong>Hubungkan</strong>. Sistem akan otomatis mengonfigurasi akses cloud dan mendownload data terbaru.</li>
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
        id: 'koperasi',
        badge: 14,
        badgeColor: 'pink',
        title: 'Koperasi & Kantin',
        steps: [
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
            {
                title: 'Manajemen Produk & Stok Opname',
                content: (
                    <ul className="list-disc pl-5 space-y-1 text-sm mt-1">
                        <li><strong>Input Produk:</strong> Masuk tab <em>Produk & Stok</em>. Gunakan "Tambah Massal" untuk input cepat. Scan barcode barang agar kasir lebih cepat.</li>
                        <li><strong>Stok Menipis:</strong> Aktifkan filter "Stok Menipis" di daftar produk untuk melihat barang yang perlu dibeli (kulakan).</li>
                        <li><strong>Stok Opname:</strong> Klik tombol <em>Stok Opname</em>. Masukkan jumlah fisik barang di rak pada kolom yang tersedia. Sistem otomatis menghitung selisih dan mencatatnya sebagai koreksi stok.</li>
                    </ul>
                )
            },
            {
                title: 'Transaksi Kasir (POS) & Printer Bluetooth',
                content: (
                    <ol className="list-decimal pl-5 space-y-1 text-sm mt-1">
                        <li><strong>Hubungkan Printer:</strong> Di tab <em>Pengaturan</em>, klik "Cari & Hubungkan Printer" untuk pairing dengan thermal printer Bluetooth.</li>
                        <li><strong>Scan Barcode:</strong> Arahkan kursor ke kolom pencarian, scan barang.</li>
                        <li><strong>Pilih Pelanggan:</strong> 
                            <ul className="list-disc pl-4 text-xs">
                                <li><strong>Santri:</strong> Gunakan Saldo Tabungan (Cashless). Jika saldo kurang, transaksi ditolak.</li>
                                <li><strong>Umum:</strong> Pembayaran Tunai.</li>
                            </ul>
                        </li>
                        <li><strong>Metode Bayar:</strong> Pilih Tunai, Tabungan, atau <strong>Hutang/Kasbon</strong>.</li>
                        <li><strong>Checkout:</strong> Klik Bayar. Struk akan tercetak otomatis jika printer terhubung.</li>
                    </ol>
                )
            },
            {
                title: 'Manajemen Hutang (Kasbon) & Pelunasan',
                content: (
                     <div className="text-sm">
                         <p className="mb-2">Jika santri/pembeli tidak membawa uang:</p>
                         <ol className="list-decimal pl-5 space-y-1">
                             <li>Saat checkout, pilih metode <strong>Hutang</strong>. Transaksi akan tercatat tapi uang belum masuk kas.</li>
                             <li>Untuk melihat daftar hutang, buka tab <strong>Kasbon (Hutang)</strong>.</li>
                             <li>Jika pembeli datang membayar, klik tombol <strong>Lunasi</strong> pada transaksi tersebut.</li>
                             <li>Pilih metode pelunasan (Tunai/Potong Tabungan). Setelah lunas, uang baru akan tercatat sebagai Pemasukan di laporan keuangan.</li>
                         </ol>
                     </div>
                )
            },
            {
                title: 'Laporan Keuangan Toko',
                content: (
                     <div className="text-sm">
                         <p className="mb-2">Sistem memisahkan laporan operasional toko dengan keuangan pondok pusat.</p>
                         <ul className="list-disc pl-5 space-y-1">
                             <li><strong>Tab Riwayat:</strong> Fokus pada omset penjualan dan barang keluar.</li>
                             <li><strong>Tab Laba Rugi:</strong> Fokus pada profit bersih. Anda bisa mencatat pengeluaran operasional toko (Gaji penjaga, Listrik Toko, Plastik) di sini agar Laba Bersih terlihat akurat.</li>
                         </ul>
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
                            <li><strong>Sinkronisasi:</strong> Setelah mengabsen (offline), guru cukup melakukan "Kirim Perubahan" agar data masuk ke Admin Pusat.</li>
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
                                <li><strong>Download PDF:</strong> Menghasilkan file PDF digital yang sangat rapi (High Quality/Vector), lengkap dengan Kop Surat resmi.</li>
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
        title: 'Akademik: Jadwal & Rapor',
        steps: [
            { 
                title: 'Persiapan Jadwal (Data Master) - WAJIB', 
                content: (
                    <div>
                        <p className="mb-2">Sebelum menyusun jadwal, Anda <strong>wajib</strong> melengkapi Data Master terlebih dahulu agar fitur deteksi bentrok berfungsi:</p>
                        <ul className="list-disc pl-5 space-y-1 text-sm bg-indigo-50 p-2 rounded border border-indigo-200">
                            <li>Buka <strong>Data Master &gt; Tenaga Pendidik</strong>.</li>
                            <li>Edit Guru, lalu atur <strong>"Hari Ketersediaan"</strong> (hari apa saja guru bisa mengajar) dan <strong>"Kompetensi Mapel"</strong>.</li>
                            <li>Tanpa ini, sistem tidak bisa merekomendasikan guru yang tepat di grid jadwal.</li>
                        </ul>
                    </div>
                )
            },
            { 
                title: 'Menyusun Jadwal Pelajaran', 
                content: (
                    <ul className="list-disc pl-5 space-y-1 text-sm mt-1">
                         <li>Buka menu <strong>Akademik &gt; Jadwal Pelajaran</strong>.</li>
                         <li>Atur durasi jam pelajaran di panel kiri (Klik Simpan).</li>
                         <li>Pilih Jenjang & Rombel. Klik kotak grid kosong untuk mengisi Mapel & Guru.</li>
                         <li>Gunakan fitur <strong>"Salin Jadwal Dari..."</strong> untuk menduplikasi jadwal dari kelas lain (misal dari 7A ke 7B).</li>
                    </ul>
                )
            },
            {
                title: 'Konsep Rapor Digital (Desentralisasi)',
                color: 'blue',
                content: (
                    <div className="bg-blue-50 p-3 rounded text-blue-900 border border-blue-200">
                        <strong>Metode Unik:</strong> Aplikasi ini dirancang agar Guru <strong>TIDAK PERLU LOGIN</strong> untuk mengisi nilai.
                        <br/>
                        Alurnya: Admin Desain Rapor &rarr; Generate File HTML &rarr; Kirim ke Guru (WA) &rarr; Guru Isi Nilai di HP (Offline) &rarr; Kirim Balik ke Admin &rarr; Admin Import.
                    </div>
                )
            },
            {
                title: '3. Desain Grid Rapor',
                content: (
                    <ul className="list-disc pl-5 space-y-1 text-sm mt-1">
                        <li>Buka menu <strong>Akademik &gt; Desain Rapor</strong>.</li>
                        <li>Buat Template baru atau Import dari Excel.</li>
                        <li>Gunakan kode variabel seperti <code>$NAMA</code>, <code>$NIS</code>, atau buat kode input sendiri seperti <code>$NILAI_UH1</code>.</li>
                    </ul>
                )
            },
            {
                title: '4. Generate Formulir Guru',
                content: (
                     <ul className="list-disc pl-5 space-y-1 text-sm mt-1">
                        <li>Masuk ke tab <strong>Generate Form</strong>.</li>
                        <li>Pilih Rombel dan Template.</li>
                        <li>Pilih metode pengiriman (WhatsApp / Hybrid).</li>
                        <li>Download file HTML dan kirimkan ke Guru Mapel/Wali Kelas.</li>
                    </ul>
                )
            },
            {
                title: '5. Import & Cetak (Oleh Admin)',
                content: (
                    <ul className="list-disc pl-5 space-y-1 text-sm mt-1">
                        <li>Admin menyalin kode pesan dari Guru (diawali <code>RAPOR_V2_START</code>).</li>
                        <li>Paste di menu <strong>Akademik &gt; Import Nilai</strong>.</li>
                        <li>Buka tab <strong>Cetak Rapor</strong> untuk mencetak rapor fisik (PDF) atau arsip.</li>
                    </ul>
                )
            },
             {
                title: '6. Monitoring Progress',
                content: (
                     <>
                        <p className="text-sm mb-1">Fitur ini membantu Admin memantau kelengkapan nilai:</p>
                        <ul className="list-disc pl-5 space-y-1 text-sm">
                            <li>Buka menu <strong>Akademik &gt; Monitoring</strong>.</li>
                            <li><span className="text-green-600 font-bold">Hijau</span> = Nilai Lengkap (Semua Santri sudah ada nilainya).</li>
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
                title: 'Rekomendasi: Multi-User & Cloud (Wajib untuk Bendahara)',
                color: 'red',
                content: (
                    <div className="bg-red-50 p-3 rounded border border-red-200 text-sm text-red-900">
                        <p className="font-bold mb-1"><i className="bi bi-shield-lock-fill"></i> Keamanan Data Vital</p>
                        <p className="mb-2">Data keuangan dan gaji sangat sensitif. Jangan gunakan akun Admin tunggal bersama-sama.</p>
                        <ul className="list-disc pl-5 mt-1 space-y-1">
                            <li>Buat akun khusus untuk Bendahara (Role: Staff, Akses: Keuangan Write).</li>
                            <li><strong>Wajib Multi-User:</strong> Aktifkan di Pengaturan agar setiap transaksi (SPP/Gaji) tercatat <em>siapa</em> yang menginputnya (Audit Trail).</li>
                            <li><strong>Wajib Cloud Sync:</strong> Data keuangan adalah data vital. Sinkronisasi ke Dropbox/WebDAV memastikan data tidak hilang jika laptop rusak atau terkena virus.</li>
                        </ul>
                    </div>
                )
            },
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
                title: 'Penggajian Guru (Payroll)',
                content: (
                     <ul className="list-disc pl-5 space-y-1 text-sm mt-1">
                        <li><strong>Konfigurasi:</strong> Buka tab <em>Penggajian &gt; Konfigurasi</em>. Isi Gaji Pokok, Tunjangan, dan Tarif JTM (Jam Tatap Muka) per guru.</li>
                        <li><strong>Generate Bulanan:</strong> Buka tab <em>Generate Gaji</em>. Pilih Bulan/Tahun. Klik "Hitung Estimasi". Sistem otomatis menghitung total jam dari Jadwal Pelajaran.</li>
                        <li><strong>Cetak & Posting:</strong> Periksa draft gaji. Jika sudah benar, klik "Posting Keuangan" untuk mencatat pengeluaran kas otomatis, lalu cetak Slip Gaji PDF.</li>
                    </ul>
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
            },
            {
                title: 'Optimalisasi Tim Asrama (Cloud)',
                color: 'orange',
                content: (
                    <div className="bg-orange-50 p-3 rounded border border-orange-200 text-sm">
                        <strong>Tips Kolaborasi:</strong> Jika kantor asrama putra dan putri terpisah, gunakan fitur <strong>Cloud Sync</strong>. 
                        <ul className="list-disc pl-5 mt-1">
                            <li>Buat akun khusus untuk Musyrif/Musyrifah.</li>
                            <li>Mereka dapat mengecek data santri atau kapasitas kamar langsung dari asrama tanpa perlu ke kantor pusat.</li>
                        </ul>
                    </div>
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
                title: 'Kerja Tim Panitia PSB (Multi-User)',
                color: 'green',
                content: (
                     <div className="bg-green-50 p-3 rounded border border-green-200 text-sm">
                        <strong>Rekomendasi Panitia:</strong> Jangan kerjakan sendiri. Aktifkan <strong>Multi-User</strong> dan bagikan tugas:
                        <ul className="list-disc pl-5 mt-1">
                            <li><strong>Meja 1:</strong> Input Data & Wawancara.</li>
                            <li><strong>Meja 2:</strong> Terima Pembayaran & Seragam.</li>
                        </ul>
                        Semua laptop panitia terhubung ke data pusat via Cloud.
                    </div>
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
        title: 'Kalender & Jadwal Ibadah',
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
                title: 'Manajemen Jadwal Piket Ibadah',
                content: (
                    <ul className="list-disc pl-5 space-y-1 text-sm mt-1">
                        <li>Buka tab <strong>Jadwal Piket Ibadah</strong> di menu Kalender.</li>
                        <li>Pilih tanggal yang ingin diatur.</li>
                        <li><strong>Manual:</strong> Klik tombol edit pada kolom Muadzin/Imam untuk memilih santri tertentu.</li>
                        <li><strong>Otomatis:</strong> Klik tombol <strong>Auto Isi</strong>. Sistem akan memilih santri putra secara acak untuk mengisi slot yang kosong pada hari tersebut.</li>
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
            },
            {
                title: 'Integrasi Komputer Perpustakaan',
                color: 'teal',
                content: (
                    <div className="bg-teal-50 p-3 rounded border border-teal-200 text-sm">
                        <strong>Saran Implementasi:</strong> Biasanya perpustakaan memiliki komputer khusus yang terpisah dari kantor admin.
                        <br/>
                        Gunakan <strong>Cloud Sync</strong> untuk menghubungkan komputer perpustakaan dengan database santri pusat. Pustakawan cukup login dengan akun staff terbatas untuk mengelola peminjaman.
                    </div>
                )
            }
        ]
    },
    {
        id: 'offline',
        badge: 14,
        badgeColor: 'cyan',
        title: 'Mode Offline & Instalasi (PWA)',
        steps: [
            {
                title: 'Apa itu Mode Offline?',
                content: 'Aplikasi eSantri Web menggunakan teknologi PWA (Progressive Web App). Artinya, aplikasi ini dapat berjalan tanpa koneksi internet setelah aset-asetnya diunduh ke dalam browser Anda.'
            },
            {
                title: 'Cara Mengunduh Aset Offline',
                content: (
                    <ol className="list-decimal pl-5 space-y-1 text-sm mt-1">
                        <li>Pastikan internet Anda lancar.</li>
                        <li>Masuk ke menu <strong>Pengaturan &gt; Umum</strong>.</li>
                        <li>Lihat kotak status di bagian atas. Klik tombol <strong>"Unduh Aset Offline"</strong>.</li>
                        <li>Tunggu hingga proses selesai (100%) dan status berubah menjadi <span className="text-green-600 font-bold"><i className="bi bi-check-circle-fill"></i> Siap Offline</span>.</li>
                    </ol>
                )
            },
            {
                title: 'Instalasi ke Desktop / HP',
                content: (
                    <ul className="list-disc pl-5 space-y-1 text-sm mt-1">
                        <li>Di menu <strong>Pengaturan &gt; Umum</strong>, klik tombol <strong>"Install Aplikasi (PWA)"</strong>.</li>
                        <li>Atau, klik ikon "Install" di address bar browser (Chrome/Edge).</li>
                        <li>Aplikasi akan muncul di layar utama (Homescreen) atau Desktop dan bisa dibuka seperti aplikasi native tanpa bar browser.</li>
                    </ul>
                )
            },
            {
                title: 'Kapan Saya Butuh Internet?',
                color: 'red',
                content: (
                    <div className="bg-red-50 p-3 rounded border border-red-200 text-sm">
                        Meskipun "Siap Offline", Anda tetap membutuhkan internet untuk fitur-fitur berikut:
                        <ul className="list-disc pl-5 mt-1 font-semibold text-red-800">
                            <li>Sinkronisasi Data (Cloud Sync / Dropbox).</li>
                            <li>Mengirim Pesan WhatsApp.</li>
                            <li>Mengakses Formulir PSB Online (Google Sheet).</li>
                            <li>Generate AI (Magic Draft / Poster).</li>
                        </ul>
                    </div>
                )
            }
        ]
    }
];
