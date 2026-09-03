
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
        badge: 0,
        badgeColor: 'purple',
        title: 'Persiapan, Multi-Admin & Sinkronisasi Sistem',
        steps: [
            {
                title: 'Pemberitahuan Penting: Konsep & 2 Model Sinkronisasi Multi-Admin',
                content: (
                    <div className="bg-yellow-50 p-4 rounded-lg border-l-4 border-yellow-500 text-sm text-gray-700 space-y-3">
                        <p>
                            <strong>Pilihan Arsitektur Multi-Admin:</strong> Aplikasi ini mendukung operasional offline-first dengan dua pilihan mode sinkronisasi multi-admin:
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="bg-white p-3 rounded-lg border border-yellow-200 shadow-2xs">
                                <h4 className="font-bold text-teal-800 text-xs uppercase mb-1 flex items-center gap-1.5">
                                    <i className="bi bi-fire text-amber-600"></i> Mode 1: Firebase Realtime
                                </h4>
                                <p className="text-[11px] text-gray-600">Data tersinkronisasi otomatis dan instan antar perangkat saat terhubung internet. Sangat praktis untuk kolaborasi harian tanpa perlu kirim/gabung file manual.</p>
                            </div>
                            <div className="bg-white p-3 rounded-lg border border-yellow-200 shadow-2xs">
                                <h4 className="font-bold text-teal-800 text-xs uppercase mb-1 flex items-center gap-1.5">
                                    <i className="bi bi-diagram-3-fill text-indigo-600"></i> Mode 2: Hub & Spoke (Dropbox / WebDAV)
                                </h4>
                                <p className="text-[11px] text-gray-600">Pola Admin Utama (Hub) dan Staf/Guru (Spoke). Staf mengirim paket data perubahan, dan Admin Utama bertindak sebagai pengepul untuk menggabungkan ke Master.</p>
                            </div>
                        </div>
                    </div>
                )
            },
            {
                title: '⚡ PANDUAN WAJIB: Alur Kerja Multi-Admin Hub & Spoke (Dropbox / WebDAV)',
                color: 'indigo',
                content: (
                    <div className="space-y-3 text-sm">
                        <div className="bg-indigo-50 p-3.5 rounded-lg border border-indigo-200 text-xs text-indigo-950 space-y-2">
                            <h5 className="font-bold flex items-center gap-1.5 text-indigo-900">
                                <i className="bi bi-arrow-repeat text-indigo-600"></i> SOP Wajib Operasional Hub & Spoke (Pencegah Timpa Data)
                            </h5>
                            <p className="text-gray-700">
                                Dalam model <strong>Hub & Spoke</strong>, satu komputer bertindak sebagai <strong>Admin Pusat (Hub)</strong> dan perangkat staf/guru sebagai <strong>Cabang (Spoke)</strong>. Agar tidak terjadi bentrok atau kehilangan data, patuhi urutan 4 langkah wajib berikut:
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="bg-white p-3 rounded-lg border border-indigo-100 shadow-2xs space-y-1.5">
                                <h6 className="font-bold text-xs text-indigo-800 flex items-center gap-1">
                                    <span className="w-5 h-5 bg-indigo-600 text-white rounded-full inline-flex items-center justify-center text-[10px]">1</span>
                                    Staf / Guru Mengirim Data (Spoke)
                                </h6>
                                <p className="text-[11px] text-gray-600">
                                    Setelah selesai menginput setoran Tahfizh, Absensi, atau Nilai di laptop/HP masing-masing, Staf mengklik tombol <strong>"Kirim Perubahan ke Admin"</strong> di bar atas/menu Sinkronisasi. Data terkompresi otomatis terunggah ke folder Cloud (Dropbox/WebDAV).
                                </p>
                            </div>

                            <div className="bg-white p-3 rounded-lg border border-indigo-100 shadow-2xs space-y-1.5">
                                <h6 className="font-bold text-xs text-indigo-800 flex items-center gap-1">
                                    <span className="w-5 h-5 bg-indigo-600 text-white rounded-full inline-flex items-center justify-center text-[10px]">2</span>
                                    Admin Pusat Menggabung (Hub Merge)
                                </h6>
                                <p className="text-[11px] text-gray-600">
                                    Admin Utama membuka menu <strong>Pusat Sinkronisasi &gt; Inbox Perubahan Staff</strong> &gt; Klik <strong>"Segarkan"</strong> &gt; Klik <strong>"Gabung"</strong> pada berkas kiriman staf. Sistem memadukan data baru dengan aman (Last-Write-Wins).
                                </p>
                            </div>

                            <div className="bg-white p-3 rounded-lg border border-amber-200 bg-amber-50/50 shadow-2xs space-y-1.5">
                                <h6 className="font-bold text-xs text-amber-900 flex items-center gap-1">
                                    <span className="w-5 h-5 bg-amber-600 text-white rounded-full inline-flex items-center justify-center text-[10px]">3</span>
                                    Admin Publikasikan Master (WAJIB)
                                </h6>
                                <p className="text-[11px] text-gray-700 font-medium">
                                    Setelah seluruh berkas staf selesai digabungkan, Admin Utama <strong>WAJIB menekan tombol "Publikasikan Master"</strong>. Tindakan ini memperbarui berkas database induk di Cloud agar siap diambil oleh seluruh staf.
                                </p>
                            </div>

                            <div className="bg-white p-3 rounded-lg border border-teal-200 bg-teal-50/50 shadow-2xs space-y-1.5">
                                <h6 className="font-bold text-xs text-teal-900 flex items-center gap-1">
                                    <span className="w-5 h-5 bg-teal-600 text-white rounded-full inline-flex items-center justify-center text-[10px]">4</span>
                                    Staf Mengambil Master Terbaru
                                </h6>
                                <p className="text-[11px] text-gray-600">
                                    Sebelum memulai aktivitas menginput di hari baru, Staf menekan tombol <strong>"Ambil Data Master"</strong> (atau "Update dari Cloud") agar data di perangkat mereka sinkron dengan hasil olahan Admin Pusat.
                                </p>
                            </div>
                        </div>

                        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-900 space-y-1">
                            <strong className="flex items-center gap-1 font-bold"><i className="bi bi-exclamation-triangle-fill text-red-600"></i> Peringatan Resolusi Konflik Data:</strong>
                            <p>
                                Jika Admin dan Staf mengubah santri atau transaksi yang sama secara bersamaan, jendela <strong>Resolusi Konflik</strong> akan otomatis muncul saat tombol Gabung diklik. Admin dapat memilih:
                            </p>
                            <ul className="list-disc pl-5 mt-1 space-y-0.5 text-gray-700">
                                <li><strong>Versi Lokal (Admin):</strong> Mempertahankan nilai yang ada di komputer Admin.</li>
                                <li><strong>Versi Staff:</strong> Menggunakan perubahan yang diajukan oleh staf.</li>
                                <li><strong>Mix & Match:</strong> Memilih bagian data tertentu per baris atribut sebelum disimpan.</li>
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
                            <ul className="list-disc pl-4 mt-2 text-xs text-indigo-700 space-y-1">
                                <li>Saat bulk, Anda bisa atur <strong>Role</strong>, <strong>Preset Izin</strong>, dan <strong>Izin Sync</strong> per user.</li>
                                <li>Gunakan tombol <strong>Atur/Kustom</strong> untuk mengatur hak akses <strong>per modul</strong> (Blokir/Lihat/Edit) sebelum user dibuat.</li>
                            </ul>
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
                                <li><strong>Admin:</strong> Buka menu <em>Pusat Sync</em> (atau klik tombol Sync Cloud) &gt; Klik <strong>"Publikasikan Master"</strong> (atau data akan otomatis terkirim jika menggunakan Firebase).</li>
                                <li><strong>Staff:</strong> Di halaman login laptop staff, klik tombol <strong>"Update Data Akun dari Cloud"</strong>.</li>
                                <li><strong>Staff:</strong> Login dengan password baru.</li>
                            </ol>
                        </div>
                        <div className="border-l-4 border-teal-500 pl-3 py-1 bg-teal-50">
                            <h4 className="font-bold text-teal-800 text-sm">Jika Menggunakan Firebase (Google Login)</h4>
                            <p className="text-xs mb-1">Jika Anda menggunakan Firebase Realtime, manajemen password sedikit berbeda:</p>
                            <ul className="list-disc pl-4 text-xs text-teal-700">
                                <li><strong>Password Google:</strong> Jika lupa password Google, silakan reset melalui layanan Google.</li>
                                <li><strong>Password Lokal:</strong> Jika Anda lupa password lokal untuk masuk ke aplikasi, gunakan tombol <strong>"Update Data Akun dari Cloud"</strong> di halaman login. Sistem akan mengambil data user terbaru dari Firebase (termasuk password yang mungkin sudah direset oleh Admin Utama).</li>
                            </ul>
                        </div>
                    </div>
                )
            },
            {
                title: 'Update Hak Akses Saat Ada Fitur Baru',
                content: (
                    <div className="space-y-2 text-sm">
                        <p>Setiap kali aplikasi menambah modul/fitur baru, lakukan pengecekan hak akses di <strong>Pengaturan &gt; User &amp; Keamanan</strong>.</p>
                        <div className="rounded border border-yellow-200 bg-yellow-50 p-3 text-xs text-yellow-900">
                            <strong>Perilaku default:</strong> akun staff lama yang belum memiliki izin untuk fitur baru akan dianggap <strong>tidak punya akses</strong> sampai Admin memperbarui permission-nya.
                        </div>
                        <ol className="list-decimal pl-5 text-xs text-gray-700 space-y-1">
                            <li>Buka daftar user, pilih akun staff yang relevan.</li>
                            <li>Aktifkan izin modul baru sesuai kebutuhan (Read / Write).</li>
                            <li>Simpan perubahan, lalu minta staff login ulang atau update data akun dari cloud.</li>
                        </ol>
                    </div>
                )
            },
            {
                title: 'Backup & Restore (Yang Perlu Dipahami Operator)',
                content: (
                    <div className="space-y-2 text-sm">
                        <ul className="list-disc pl-5 space-y-1">
                            <li>Backup JSON mencakup pengaturan dan seluruh data modul inti aplikasi.</li>
                            <li>Saat restore selesai, sistem menampilkan <strong>Laporan Hasil Restore</strong> berisi data apa yang diperbarui dan data apa yang tidak ditemukan di file backup.</li>
                            <li>Jika ada tabel yang tidak ditemukan, biasanya karena backup berasal dari versi lama atau fitur tersebut belum dipakai saat backup dibuat.</li>
                        </ul>
                        <p className="text-xs text-gray-600">Saran operasional: lakukan backup rutin mingguan dan simpan minimal 2 file cadangan terakhir di lokasi berbeda.</p>
                    </div>
                )
            },
            {
                title: 'Pengaturan AI (BYOK OpenAI / Gemini)',
                content: (
                    <div className="space-y-2 text-sm">
                        <p>Fitur AI di eSantri (Draft Surat, Insight Dashboard, dan Generator Poster) bisa memakai mode gratis atau API key milik Anda sendiri.</p>
                        <ol className="list-decimal pl-5 text-xs text-gray-700 space-y-1">
                            <li>Buka <strong>Pengaturan &gt; Umum &gt; AI Assistant (BYOK)</strong>.</li>
                            <li>Pilih provider utama: <strong>Pollinations</strong>, <strong>OpenAI</strong>, <strong>Gemini</strong>, atau <strong>OpenRouter</strong>.</li>
                            <li>Jika pakai BYOK, isi API key dan model yang sesuai.</li>
                            <li>Klik <strong>Uji Koneksi OpenAI</strong> / <strong>Uji Koneksi Gemini</strong> untuk validasi sebelum digunakan di modul.</li>
                            <li>Jika pakai OpenRouter: klik <strong>Refresh Model</strong>, filter model gratis (<code>:free</code>), lalu pilih model aktif.</li>
                            <li>Aktifkan <strong>Auto fallback ke model gratis</strong> agar saat limit model aktif habis, sistem mencoba model gratis lain dari daftar.</li>
                            <li>Cek indikator status <strong>Sehat/Gagal</strong> dan waktu <strong>Terakhir tes</strong> di panel AI.</li>
                            <li>Aktifkan <strong>Prioritaskan BYOK</strong> agar sistem memakai API key Anda dulu, lalu fallback ke mode gratis jika gagal.</li>
                            <li>Konfigurasi AI bersifat <strong>global aplikasi</strong>, jadi user non-admin yang punya akses fitur AI akan otomatis memakai konfigurasi API dari admin inti.</li>
                            <li>Untuk poster, aktifkan <strong>Generate Desain Poster langsung di aplikasi</strong> lalu gunakan tombol Generate di modul PSB Poster Maker.</li>
                        </ol>
                        <div className="rounded border border-yellow-200 bg-yellow-50 p-3 text-xs text-yellow-900">
                            <strong>Catatan:</strong> API key disimpan di perangkat/database aplikasi Anda. Batasi akses perangkat admin dan lakukan backup terenkripsi sesuai SOP internal pondok.
                        </div>
                    </div>
                )
            }
        ]
    },
    {
        id: 'datamaster',
        badge: 'LENGKAP',
        badgeColor: 'teal',
        title: 'Data Master & Struktur Lembaga',
        steps: [
            {
                title: 'Ikhtisar & Struktur Inti Data Master',
                content: (
                    <div className="bg-teal-50 p-4 rounded-lg border-l-4 border-teal-500 text-sm text-gray-700 space-y-3">
                        <p>
                            <strong>Data Master</strong> adalah pondasi operasional seluruh modul di eSantri Web (Santri, Absensi, Jadwal, Nilai, Rapor, hingga Keuangan). 
                            Pastikan data master dikonfigurasi secara urut dan lengkap sebelum memulai aktivitas harian.
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                            <div className="bg-white p-2.5 rounded border border-teal-100 shadow-2xs">
                                <span className="font-bold text-teal-800 flex items-center gap-1.5 mb-1"><i className="bi bi-diagram-3-fill text-teal-600"></i> 1. Struktur Pendidikan</span>
                                <p className="text-[11px] text-gray-600">Jenjang (Marhalah) &rarr; Tingkat Kelas &rarr; Rombel (Kelas Paralel) & Wali Kelas.</p>
                            </div>
                            <div className="bg-white p-2.5 rounded border border-teal-100 shadow-2xs">
                                <span className="font-bold text-teal-800 flex items-center gap-1.5 mb-1"><i className="bi bi-person-workspace text-teal-600"></i> 2. Tenaga Pendidik (Guru)</span>
                                <p className="text-[11px] text-gray-600">Profil pengajar, NIP/NIY, hari ketersediaan mengajar, & kompetensi mapel.</p>
                            </div>
                            <div className="bg-white p-2.5 rounded border border-teal-100 shadow-2xs">
                                <span className="font-bold text-teal-800 flex items-center gap-1.5 mb-1"><i className="bi bi-book-half text-teal-600"></i> 3. Mata Pelajaran</span>
                                <p className="text-[11px] text-gray-600">Passing Grade (KKM), multi-modul/kitab, link unduh materi & link beli kitab.</p>
                            </div>
                            <div className="bg-white p-2.5 rounded border border-teal-100 shadow-2xs">
                                <span className="font-bold text-teal-800 flex items-center gap-1.5 mb-1"><i className="bi bi-calendar-event text-teal-600"></i> 4. Tahun Ajaran & Semester</span>
                                <p className="text-[11px] text-gray-600">Penetapan semester aktif (Ganjil/Genap), tanggal periode, dan status arsip.</p>
                            </div>
                        </div>
                    </div>
                )
            },
            {
                title: '1. Struktur Pendidikan: Jenjang, Kelas & Rombel',
                content: (
                    <div className="space-y-3 text-sm">
                        <p>Hierarki pendidikan diatur secara terstruktur bertingkat:</p>
                        <ol className="list-decimal pl-5 space-y-2 bg-gray-50 p-3 rounded-lg border text-xs text-gray-700">
                            <li>
                                <strong>Jenjang (Marhalah):</strong> Menentukan unit tingkatan utama lembaga (misal: <em>Salafiyah Ula, Wustho, Ulya, MTs, SMP, MA, SMK</em>).
                            </li>
                            <li>
                                <strong>Tingkat Kelas:</strong> Mengelompokkan tingkat kelas yang menginduk ke Jenjang tertentu (misal: <em>Kelas 1, 2, 3</em> atau <em>Kelas VII, VIII, IX</em>).
                            </li>
                            <li>
                                <strong>Rombel (Rombongan Belajar / Kelas Paralel):</strong> Unit kelas riil tempat santri belajar (misal: <em>Kelas 7A, 7B, Ula-1 Putra</em>). Di sini Anda juga menetapkan <strong>Wali Kelas</strong> yang bertugas.
                            </li>
                        </ol>
                        <div className="text-[11px] bg-blue-50 border-l-4 border-blue-400 p-2.5 rounded text-blue-900">
                            <strong>💡 Tips Cepat:</strong> Gunakan tombol <strong>"Tambah Banyak (Tabel)"</strong> di setiap tab untuk menginput banyak jenjang, kelas, atau rombel sekaligus layaknya di Excel.
                        </div>
                    </div>
                )
            },
            {
                title: '2. Tenaga Pendidik: Jadwal Mengajar & Integrasi Akun',
                content: (
                    <div className="space-y-3 text-sm">
                        <p>Kelola data asatidz/guru pengampu secara terintegrasi:</p>
                        <ul className="list-disc pl-5 space-y-1.5 text-xs text-gray-700">
                            <li><strong>Biodata Lengkap:</strong> NIP/NIY, nama lengkap, gelar, jabatan utama, status kepegawaian (Tetap/Honorer).</li>
                            <li><strong>Hari Ketersediaan Mengajar:</strong> Atur hari-hari di mana guru bersedia mengajar (Senin-Ahad). Pengaturan ini menjadi filter otomatis anti-bentrok pada modul <em>Jadwal Pelajaran</em>.</li>
                            <li><strong>Kompetensi Mapel:</strong> Tentukan mata pelajaran apa saja yang diampu oleh masing-masing guru agar sistem dapat merekomendasikan guru yang tepat saat menyusun jadwal.</li>
                            <li><strong>Pembuatan Akun Login Instan:</strong> Data guru dapat langsung diubah menjadi akun login staf dengan tombol <em>"Ambil dari Data Guru"</em> pada menu <em>Pengaturan &gt; Akun & Pengguna</em>.</li>
                        </ul>
                    </div>
                )
            },
            {
                title: '3. Mata Pelajaran: Multi-Kitab, Link Unduh & Toko',
                content: (
                    <div className="space-y-2 text-sm">
                        <p>Mata pelajaran mendukung pengayaan referensi belajar modern & klasik:</p>
                        <ol className="list-decimal pl-5 space-y-1.5 text-xs text-gray-700">
                            <li>Buka <strong>Data Master &gt; Mata Pelajaran</strong>, klik Tambah Mapel atau edit data yang ada.</li>
                            <li>Tentukan <strong>Kode Mapel</strong>, <strong>Nama Mapel</strong>, <strong>KKM (Passing Grade)</strong>, dan <strong>Kelompok</strong> (Agama, Kepesantrenan, Umum, Mulok).</li>
                            <li>
                                <strong>Multi-Entri Modul/Kitab:</strong> Jika satu mapel menggunakan lebih dari 1 kitab/buku, ketikkan <strong>satu baris per item</strong> (atau gunakan tanda titik koma <code>;</code> pada mode Tambah Banyak).
                            </li>
                            <li>
                                <strong>Link Unduh & Link Pembelian:</strong> Masukkan URL unduhan PDF/e-book modul atau tautan toko pembelian kitab fisik untuk memudahkan santri/wali santri.
                            </li>
                        </ol>
                        <div className="bg-gray-50 border p-2.5 rounded text-[11px] text-gray-600 font-mono">
                            Contoh Input: <code>Fathul Qorib; Taqrib; Safinah</code>
                        </div>
                    </div>
                )
            },
            {
                title: '4. Tahun Ajaran & Semester (Mobile Card & Desktop Table)',
                content: (
                    <div className="space-y-3 text-sm">
                        <p>Mengatur periode kalender akademik pondok:</p>
                        <ul className="list-disc pl-5 space-y-1.5 text-xs text-gray-700">
                            <li><strong>Tampilan Responsif Ganda:</strong> Pada layar desktop tampil berupa tabel penuh yang komprehensif, sedangkan pada layar ponsel otomatis beralih ke <strong>Mode Kartu / Accordion</strong> yang ringkas dan nyaman disentuh.</li>
                            <li><strong>Status Aktif vs Arsip:</strong> Hanya ada 1 tahun ajaran & semester aktif yang menjadi target default pencatatan absensi, tagihan, dan rapor. Periode sebelumnya otomatis tersimpan sebagai arsip historis yang aman.</li>
                        </ul>
                    </div>
                )
            },
            {
                title: '5. Fitur Bulk Grid & Indikator Belum Disimpan (Dirty State)',
                content: (
                    <div className="space-y-3 text-sm">
                        <div className="bg-amber-50 p-3 rounded-lg border border-amber-200 text-xs text-amber-900 space-y-1.5">
                            <h5 className="font-bold flex items-center gap-1.5"><i className="bi bi-shield-exclamation text-amber-600"></i> Proteksi Kehilangan Data (Dirty State Warning)</h5>
                            <p>Sistem dilengkapi sensor perubahan formulir. Jika Anda melakukan perubahan dan belum menekan tombol Simpan, indikator kuning peringatan akan aktif dan mencegah perpindahan halaman tanpa konfirmasi agar data tidak hilang secara tidak sengaja.</p>
                        </div>
                        <ul className="list-disc pl-5 space-y-1 text-xs text-gray-700">
                            <li>Gunakan <strong>Keyboard Navigation</strong> (`Tab`, `Enter`, panah arah) saat menginput di tabel grid massal.</li>
                            <li>Mendukung <strong>Copy-Paste langsung dari Excel / Spreadsheet</strong> (`Ctrl+C` & `Ctrl+V`).</li>
                        </ul>
                    </div>
                )
            }
        ]
    },
    {
        id: 'firebase',
        badge: 'NEW',
        badgeColor: 'teal',
        title: 'Firebase Realtime & Multi-User',
        steps: [
            {
                title: 'Apa itu Firebase Realtime?',
                content: (
                    <div className="bg-teal-50 p-4 rounded-lg border-l-4 border-teal-500 text-sm text-gray-700 space-y-3">
                        <p>
                            <strong>Sinkronisasi Instan:</strong> Berbeda dengan Dropbox/WebDAV yang memerlukan proses "Kirim" dan "Terima" manual, 
                            <strong>Firebase</strong> bekerja secara real-time. Setiap perubahan data di satu laptop akan langsung muncul di laptop lain dalam hitungan detik.
                        </p>
                        <p>
                            <strong>Multi-User Sejati:</strong> Fitur ini memungkinkan banyak admin atau staff bekerja secara bersamaan di database yang sama tanpa takut bentrok data.
                        </p>
                    </div>
                )
            },
            {
                title: 'Cara Aktivasi (Login Google)',
                content: (
                    <ol className="list-decimal pl-5 space-y-2 text-sm mt-1 bg-gray-50 p-3 rounded border">
                        <li>Buka menu <strong>Pengaturan &gt; Sync Cloud</strong>.</li>
                        <li>Pilih Provider: <strong>Firebase Realtime</strong>.</li>
                        <li>Klik tombol <strong>"Login dengan Google"</strong>. Gunakan akun Google pondok Anda.</li>
                        <li>Setelah login berhasil, status akan berubah menjadi <strong>"Terhubung"</strong>.</li>
                    </ol>
                )
            },
            {
                title: 'PENTING: Whitelist Domain (Login Google)',
                color: 'red',
                content: (
                    <div className="bg-red-50 p-3 rounded border border-red-200 text-sm text-red-900 space-y-2">
                        <p className="font-bold mb-1"><i className="bi bi-globe"></i> Otorisasi Domain di Firebase</p>
                        <p>Agar fitur <strong>Login Google</strong> berfungsi, Firebase harus mengenali alamat website tempat aplikasi ini berjalan.</p>
                        
                        <div className="bg-white p-2 rounded border border-red-100 text-xs">
                            <p className="font-bold text-gray-700 mb-1">Domain yang biasanya sudah terdaftar otomatis:</p>
                            <ul className="list-disc pl-4 space-y-0.5">
                                <li><code>localhost</code> (untuk pengetesan lokal)</li>
                                <li><code>namaproject.firebaseapp.com</code></li>
                                <li><code>namaproject.web.app</code></li>
                            </ul>
                        </div>

                        <p>Jika Anda menggunakan domain lain (misal: <code>esantriweb.pages.dev</code>, <code>esantri.pondokanda.com</code>, atau IP Server), Anda <strong>WAJIB</strong> menambahkannya secara manual di Firebase Console:</p>
                        
                        <ol className="list-decimal pl-5 mt-2 space-y-1">
                            <li>Buka <strong>Firebase Console</strong> &gt; Project Anda.</li>
                            <li>Pilih menu <strong>Authentication</strong> &gt; Tab <strong>Settings</strong>.</li>
                            <li>Klik <strong>Authorized Domains</strong> &gt; Klik <strong>Add Domain</strong>.</li>
                            <li>Masukkan domain tempat aplikasi Anda dihosting (tanpa <code>https://</code>, misal: <code>esantriweb.pages.dev</code>).</li>
                        </ol>
                        <p className="text-[10px] italic mt-2">* Tanpa langkah ini, Anda akan menemui error "Unauthorized Domain" saat mencoba Login Google.</p>
                    </div>
                )
            },
            {
                title: 'Alur Multi-User (Admin & Staff)',
                content: (
                    <div className="space-y-3">
                        <div className="border-l-4 border-teal-500 pl-3 py-1 bg-teal-50">
                            <h4 className="font-bold text-teal-800 text-sm">1. Sisi Admin (Pusat)</h4>
                            <p className="text-xs">Admin login dengan Google, lalu klik tombol <strong>"Bagikan Sesi (Pairing Code)"</strong>. Berikan kode tersebut ke Staff.</p>
                        </div>
                        <div className="border-l-4 border-blue-500 pl-3 py-1 bg-blue-50">
                            <h4 className="font-bold text-blue-800 text-sm">2. Sisi Staff (Pengurus)</h4>
                            <p className="text-xs">Staff login dengan <strong>akun Google mereka sendiri</strong>, lalu masukkan Pairing Code dari Admin di kolom "Setup Cepat".</p>
                            <p className="text-[10px] mt-1 text-blue-700 font-bold"><i className="bi bi-shield-check"></i> AUTOMATIC REDIRECT: Jika Admin mengaktifkan Multi-User, setelah Pairing berhasil, Anda akan otomatis diarahkan ke halaman <strong>Login</strong> demi keamanan.</p>
                            <p className="text-[10px] mt-1 text-teal-700"><strong>DATA LENGKAP:</strong> Sinkronisasi mencakup Data Santri, Data Master (Jenjang, Kelas, Matpel), dan Pengaturan.</p>
                        </div>
                        <p className="text-[10px] text-gray-500 italic">* Metode ini lebih aman karena Staff tidak perlu tahu password akun Google Admin.</p>
                    </div>
                )
            },
            {
                title: 'Migrasi Data Awal (PENTING)',
                color: 'orange',
                content: (
                    <div className="bg-orange-50 p-3 rounded border border-orange-200 text-sm">
                        <p className="mb-2">Jika Anda sudah memiliki data lokal dan ingin memindahkannya ke Firebase untuk pertama kali:</p>
                        <ol className="list-decimal pl-5 space-y-1">
                            <li>Pastikan Anda sudah login ke Firebase.</li>
                            <li>Klik tombol <strong>"Upload Semua Data ke Cloud"</strong> di menu Pengaturan Cloud.</li>
                            <li>Tunggu hingga proses selesai. Sekarang data Anda sudah ada di cloud dan siap diakses perangkat lain.</li>
                        </ol>
                    </div>
                )
            },
            {
                title: 'Penggunaan Project Sendiri (Versi Build / Mandiri)',
                color: 'purple',
                content: (
                    <div className="bg-purple-50 p-3 rounded border border-purple-200 text-sm text-purple-900">
                        <p className="font-bold mb-1"><i className="bi bi-gear-wide-connected"></i> Konfigurasi Kustom (App Key/Secret)</p>
                        <p className="mb-2">Jika Anda menggunakan versi build yang tidak memiliki URL tetap atau ingin menggunakan project Firebase sendiri:</p>
                        <ol className="list-decimal pl-5 space-y-1">
                            <li>Buka menu <strong>Pengaturan &gt; Sync Cloud</strong>.</li>
                            <li>Klik <strong>"Gunakan Project Firebase Sendiri (Advanced)"</strong>.</li>
                            <li>Masukkan <strong>API Key, Project ID, App ID</strong>, dll (didapat dari Firebase Console). Ini adalah padanan dari App Key/Secret di Dropbox.</li>
                            <li>Klik <strong>Simpan</strong> dan <strong>Refresh Halaman</strong>.</li>
                            <li><strong>PENTING:</strong> Jangan lupa mendaftarkan domain website Anda di menu <em>Authentication &gt; Settings &gt; Authorized Domains</em> pada Firebase Console project baru Anda tersebut.</li>
                        </ol>
                        <p className="mt-2 text-[10px] italic">* Catatan: Untuk versi build lokal, pastikan Anda menjalankan aplikasi melalui local server (seperti <code>npx serve</code>) agar Login Google tetap berfungsi.</p>
                    </div>
                )
            },
            {
                title: 'Keamanan & Isolasi Data',
                content: (
                    <p className="text-sm">
                        Setiap pondok memiliki <strong>Tenant ID</strong> unik. Data Pondok A tidak akan bisa dilihat oleh Pondok B meskipun menggunakan aplikasi yang sama. 
                        Akses staff dikontrol melalui daftar anggota yang hanya bisa dikelola oleh Admin Pondok tersebut.
                    </p>
                )
            },
            {
                title: 'Batasan Versi Gratis (Free Tier)',
                color: 'red',
                content: (
                    <div className="bg-red-50 p-3 rounded border border-red-200 text-sm text-red-900">
                        <p className="font-bold mb-1"><i className="bi bi-exclamation-triangle-fill"></i> Ketentuan Firebase Free Tier:</p>
                        <ul className="list-disc pl-5 space-y-1">
                            <li><strong>Penyimpanan:</strong> Maksimal 1GB untuk database dan 5GB untuk file dokumen.</li>
                            <li><strong>Transfer Data:</strong> Ada batasan kuota harian untuk baca/tulis data (50k read / 20k write per hari).</li>
                            <li><strong>Jika Kuota Habis:</strong> Sinkronisasi akan terhenti sementara hingga kuota direset keesokan harinya. Untuk penggunaan skala besar, disarankan upgrade ke paket Pay-as-you-go (Blaze).</li>
                        </ul>
                    </div>
                )
            }
        ]
    },
    {
        id: 'cloud',
        badge: 3,
        badgeColor: 'purple',
        title: 'Sinkronisasi Cloud',
        steps: [
            {
                title: 'Konsep Sinkronisasi',
                content: (
                    <>
                        <p className="mb-2">Aplikasi ini menyimpan data di laptop Anda (Offline). Sinkronisasi Cloud berguna untuk:</p>
                        <ul className="list-disc pl-5 space-y-1 text-sm">
                            <li><strong>Backup Otomatis:</strong> Data aman jika laptop rusak.</li>
                            <li><strong>Kerja Tim (Multi-User):</strong> Banyak laptop bisa mengakses data yang sama.</li>
                            <li><strong>Jembatan Portal:</strong> Menghubungkan data internal ke Portal Wali Santri secara aman.</li>
                        </ul>
                        <div className="mt-3 p-2 bg-yellow-50 border border-yellow-100 rounded text-xs text-yellow-800">
                            <i className="bi bi-info-circle mr-1"></i> 
                            <strong>Catatan:</strong> Panduan di bawah ini (Hub & Spoke) berlaku khusus untuk pengguna <strong>Dropbox</strong> dan <strong>WebDAV</strong>. Untuk pengguna <strong>Firebase</strong>, sinkronisasi berjalan otomatis secara real-time.
                        </div>
                    </>
                )
            },
            {
                title: 'Pilih Penyedia Cloud',
                content: (
                    <ul className="list-disc pl-5 space-y-1 text-sm mt-1">
                        <li>Buka menu <strong>Pengaturan &gt; Sync Cloud</strong>.</li>
                        <li><strong>Firebase (Rekomendasi):</strong> Real-time, sangat cepat, cocok untuk kerja tim yang intensif.</li>
                        <li><strong>Dropbox:</strong> Mudah, gratis, cocok untuk backup dan sinkronisasi berkala.</li>
                        <li><strong>WebDAV:</strong> Untuk Anda yang punya server sendiri (Nextcloud/CasaOS) demi privasi maksimal.</li>
                    </ul>
                )
            },
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
                title: 'Sinkronisasi Antar Admin (2 Perangkat)',
                color: 'blue',
                content: (
                    <div className="bg-blue-50 p-3 rounded border border-blue-200 text-sm">
                        <p className="mb-2">Jika ada 2 perangkat Admin (misal Laptop Kantor & Laptop Rumah) menggunakan Dropbox/WebDAV:</p>
                        <ol className="list-decimal pl-5 space-y-2">
                            <li><strong>Admin 1:</strong> Lakukan perubahan data, lalu klik tombol Sync di samping dan pilih <strong>"Publikasikan Master"</strong>.</li>
                            <li><strong>Admin 2:</strong> Klik tombol Sync di samping dan pilih <strong>"Ambil Data Terbaru"</strong> untuk menarik perubahan dari Admin 1.</li>
                        </ol>
                        <p className="mt-2 text-xs text-blue-800 italic">* Jika menggunakan Firebase, data tersinkron otomatis secara real-time tanpa langkah ini.</p>
                    </div>
                )
            },
            {
                title: 'Pembaruan Data Staff (Otomatis)',
                color: 'teal',
                content: (
                    <div className="bg-teal-50 p-3 rounded border border-teal-200 text-sm">
                        <p>Untuk memudahkan Staff, sistem telah dilengkapi fitur <strong>Auto-Pull on Login</strong>:</p>
                        <ul className="list-disc pl-5 mt-2 space-y-1">
                            <li>Setiap kali Staff <strong>Login</strong>, aplikasi akan otomatis menarik (Pull) data Master terbaru dari Cloud.</li>
                            <li><strong>Incremental Sync:</strong> Aplikasi hanya mengirim data yang berubah saja (Deltas), sehingga sinkronisasi jauh lebih cepat dan hemat data.</li>
                            <li><strong>Pending Badge:</strong> Muncul indikator angka pada tombol Sync jika ada data baru yang belum terkirim ke Cloud.</li>
                        </ul>
                    </div>
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
        id: 'portal',
        badge: 'NEW',
        badgeColor: 'blue',
        title: 'Pengaturan Portal Wali Santri',
        steps: [
            {
                title: 'Aktivasi & Jembatan Data (Google Sheets + GAS)',
                content: (
                    <div className="space-y-3">
                        <p className="text-sm">Portal Wali Santri memungkinkan orang tua memantau perkembangan anak secara online. Jembatan data portal memakai <strong>Google Sheets + Google Apps Script (GAS)</strong>:</p>
                        <div className="bg-blue-50 p-3 rounded border border-blue-200 text-xs text-blue-900">
                            <ul className="list-disc pl-4 space-y-1">
                                <li><strong>Data Utama:</strong> Tetap aman di laptop Anda atau Cloud Storage pribadi (Dropbox/WebDAV).</li>
                                <li><strong>Data Portal:</strong> Hanya data ringkas (profil, absen, saldo, tagihan) yang dikirim ke Google Sheet melalui GAS.</li>
                            </ul>
                        </div>
                        <ol className="list-decimal pl-5 space-y-1 text-sm">
                            <li>Buka menu <strong>Portal Wali</strong> di sidebar.</li>
                            <li>Pastikan status portal <strong>Aktif</strong>.</li>
                            <li>Isi <strong>Portal ID</strong>, <strong>URL Web App GAS</strong>, dan token opsional.</li>
                            <li>Klik <strong>Sinkronkan Sekarang</strong> untuk mengirim data ringkas pertama kali.</li>
                        </ol>
                    </div>
                )
            },
            {
                title: 'Langkah Deploy Google Apps Script',
                content: (
                    <div className="space-y-3 text-sm">
                        <p>Ikuti urutan ini dari awal sampai akhir agar Portal Wali bisa aktif tanpa error:</p>
                        <ol className="list-decimal pl-5 space-y-1">
                            <li>Buka <strong>Portal Wali</strong> di sidebar.</li>
                            <li>Isi <strong>Portal ID</strong> (contoh: <code>ponpes-al-ikhlas</code>).</li>
                            <li>Klik <strong>Lihat Kode Google Apps Script</strong>, lalu klik <strong>Salin Kode</strong>.</li>
                            <li>Buat <strong>Google Sheet baru</strong> di akun Google Anda.</li>
                            <li>Di Google Sheet: klik <strong>Extensions &gt; Apps Script</strong>.</li>
                            <li>Hapus kode bawaan, paste kode dari eSantri, lalu klik <strong>Save</strong>.</li>
                            <li>Klik <strong>Deploy &gt; New Deployment</strong>.</li>
                            <li>Pilih type <strong>Web App</strong>.</li>
                            <li>Set <strong>Execute as: Me</strong>.</li>
                            <li>Set <strong>Who has access: Anyone</strong>.</li>
                            <li>Klik <strong>Deploy</strong>, lalu <strong>Authorize</strong> jika diminta Google.</li>
                            <li>Salin URL Web App yang berakhiran <code>/exec</code>.</li>
                            <li>Kembali ke eSantri, tempel URL itu ke kolom <strong>URL Web App GAS</strong>.</li>
                            <li>Jika ingin pakai token keamanan, isi <strong>API_TOKEN</strong> di script dan isi nilai yang sama di kolom <strong>Token API</strong> eSantri.</li>
                            <li>Simpan pengaturan portal, lalu klik tombol <strong>Sinkronkan Sekarang</strong> di halaman Portal Wali.</li>
                            <li>Buka URL Portal Wali yang muncul, lalu uji dari HP/laptop lain.</li>
                        </ol>
                        <div className="rounded border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900">
                            Jika terjadi gagal akses, cek lagi 3 hal ini: URL harus <code>/exec</code>, akses Web App harus <strong>Anyone</strong>, dan Portal ID di aplikasi harus sama dengan yang dipakai di data portal.
                        </div>
                    </div>
                )
            },
            {
                title: 'Mendapatkan & Membagikan URL Portal',
                color: 'blue',
                content: (
                    <div className="space-y-2">
                        <p className="text-sm">Setelah Portal ID dan URL GAS diisi, Anda akan melihat panel <strong>URL Portal Wali Santri</strong> di bagian atas halaman pengaturan portal.</p>
                        <div className="bg-gray-50 p-3 rounded border text-xs">
                            <p className="font-bold mb-1">Format URL:</p>
                            <ul className="list-disc pl-4 space-y-1">
                                <li><strong>Versi Online:</strong> <code>https://domain-anda.com/portal/ID_UNIK?gas=URL_GAS</code></li>
                                <li><strong>Versi Desktop (Tauri) / Android:</strong> Anda harus memasukkan <em>Domain Kustom</em> di pengaturan portal agar link yang dihasilkan valid untuk wali santri.</li>
                            </ul>
                        </div>
                        <p className="text-sm">Klik tombol <strong>Salin</strong> atau tunjukkan <strong>QR Code</strong> yang tersedia untuk dibagikan kepada wali santri.</p>
                    </div>
                )
            },
            {
                title: 'Cara Wali Santri Login',
                content: (
                    <div className="space-y-2">
                        <p className="text-sm">Wali santri tidak perlu membuat akun baru. Mereka cukup menggunakan data santri yang sudah ada:</p>
                        <ul className="list-disc pl-5 space-y-1 text-sm">
                            <li><strong>Username:</strong> NIS (Nomor Induk Santri).</li>
                            <li><strong>Password:</strong> Secara default adalah tanggal lahir santri (format: <code>DDMMYYYY</code>) atau PIN yang ditentukan Admin.</li>
                        </ul>
                        <p className="text-xs italic text-gray-500">* Anda dapat mengatur instruksi login ini di bagian Pesan Selamat Datang.</p>
                    </div>
                )
            },
            {
                title: 'Kustomisasi Tampilan (Tema)',
                content: (
                    <p className="text-sm">
                        Anda dapat menyesuaikan warna portal agar sesuai dengan identitas pondok. Pilih salah satu dari 7 tema warna yang tersedia (Teal, Blue, Indigo, Slate, Rose, Emerald, Cyan). Perubahan tema akan langsung terlihat oleh wali santri saat mereka membuka portal.
                    </p>
                )
            },
            {
                title: 'Kontrol Visibilitas Data',
                content: (
                    <div className="space-y-2">
                        <p className="text-sm">Anda memiliki kendali penuh atas data apa saja yang boleh diakses oleh wali santri. Centang modul yang ingin ditampilkan:</p>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="flex items-center gap-2 bg-gray-50 p-2 rounded border"><i className="bi bi-cash-coin text-green-600"></i> Keuangan</div>
                            <div className="flex items-center gap-2 bg-gray-50 p-2 rounded border"><i className="bi bi-mortarboard text-blue-600"></i> Akademik</div>
                            <div className="flex items-center gap-2 bg-gray-50 p-2 rounded border"><i className="bi bi-calendar-check text-teal-600"></i> Absensi</div>
                            <div className="flex items-center gap-2 bg-gray-50 p-2 rounded border"><i className="bi bi-book text-green-700"></i> Tahfizh</div>
                            <div className="flex items-center gap-2 bg-gray-50 p-2 rounded border"><i className="bi bi-heart-pulse text-red-600"></i> Kesehatan</div>
                            <div className="flex items-center gap-2 bg-gray-50 p-2 rounded border"><i className="bi bi-book-half text-teal-700"></i> Perpustakaan</div>
                        </div>
                    </div>
                )
            },
            {
                title: 'Informasi & Pengumuman',
                content: (
                    <ul className="list-disc pl-5 space-y-2 text-sm">
                        <li><strong>Pesan Selamat Datang:</strong> Kalimat sapaan yang muncul di dashboard utama portal.</li>
                        <li><strong>Pengumuman:</strong> Informasi penting (misal: jadwal libur, info pendaftaran) yang akan muncul di bagian atas portal wali.</li>
                    </ul>
                )
            },
            {
                title: 'Kontak Penting & Link Kustom',
                content: (
                    <div className="space-y-3">
                        <div className="border-l-4 border-blue-500 pl-3 py-1 bg-blue-50">
                            <h4 className="font-bold text-blue-800 text-sm">Kontak Penting</h4>
                            <p className="text-xs">Tambahkan nomor WhatsApp Admin, Bendahara, atau Pengasuh. Wali santri bisa langsung mengklik ikon WhatsApp di portal untuk memulai chat.</p>
                        </div>
                        <div className="border-l-4 border-indigo-500 pl-3 py-1 bg-indigo-50">
                            <h4 className="font-bold text-indigo-800 text-sm">Link Kustom</h4>
                            <p className="text-xs">Tambahkan link ke website pondok, brosur PDF di Google Drive, atau link pendaftaran santri baru (PSB).</p>
                        </div>
                    </div>
                )
            },
            {
                title: 'Update Data ke Portal',
                color: 'orange',
                content: (
                    <div className="bg-orange-50 p-3 rounded border border-orange-200 text-sm">
                        <p>Setelah melakukan perubahan data (misal: input absensi baru atau mengubah pengaturan portal), klik tombol <strong>Sinkronkan Sekarang</strong> di halaman <em>Portal Wali</em> agar data di portal wali ikut terbarui.</p>
                    </div>
                )
            },
            {
                title: 'Hosting & Deployment (Online)',
                content: (
                    <div className="space-y-3">
                        <p className="text-sm">Agar portal wali bisa diakses dari mana saja, diperlukan sebuah alamat web (URL) yang aktif di internet.</p>
                        
                        <div className="bg-green-50 p-3 rounded border border-green-200 text-sm">
                            <p className="font-bold text-green-900 mb-1"><i className="bi bi-check-circle-fill"></i> Untuk Pengguna Awam (Installer):</p>
                            <p className="text-xs">Anda cukup menggunakan link portal yang muncul di menu <strong>Pengaturan &gt; Portal Wali</strong>. Agar link tersebut valid, pastikan Admin telah memasukkan <strong>URL Web Portal</strong> yang sudah dionlinekan di kolom yang tersedia.</p>
                        </div>

                        <div className="bg-blue-50 p-3 rounded border border-blue-200 text-sm">
                            <p className="font-bold text-blue-900 mb-1"><i className="bi bi-info-circle-fill"></i> Mengapa Harus Hosting?</p>
                            <p className="text-xs">Karena aplikasi Desktop (Tauri) berjalan di laptop pribadi, wali santri tidak bisa mengaksesnya langsung. Anda perlu menghosting versi web aplikasi ini (sekali saja) sebagai "pintu masuk" agar wali santri bisa melihat data melalui internet.</p>
                        </div>

                        <div className="bg-gray-50 p-3 rounded border border-gray-200 text-sm">
                            <p className="font-bold text-gray-700 mb-1"><i className="bi bi-gear-fill"></i> Untuk Tim IT / Pengembang (Lanjutan):</p>
                            <p className="text-[11px] mb-2">Jika pondok ingin menggunakan domain sendiri (misal: <code>portal.pondokanda.com</code>), Anda bisa menghosting sendiri versi web aplikasi ini:</p>
                            <ul className="list-disc pl-4 text-[10px] space-y-1">
                                <li><strong>Cloudflare Pages / Vercel / Netlify:</strong> Opsi praktis untuk hosting file statis.</li>
                                <li><strong>GitHub Pages / Vercel:</strong> Gratis untuk hosting file statis (folder <code>dist</code>).</li>
                            </ul>
                            <p className="mt-2 text-[10px] text-gray-600">Script Google Apps Script tersedia langsung di menu <strong>Pengaturan &gt; Portal Wali</strong> melalui tombol <strong>Lihat Kode Google Apps Script</strong>.</p>
                        </div>
                    </div>
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
                title: 'Alur Input Data Santri (Manual + Bulk)',
                content: (
                    <>
                        <p>Mulai dari cara ini agar operasional rapi dan cepat:</p>
                        <ul className="list-disc pl-5 space-y-1 text-sm mt-1">
                            <li><strong>Manual:</strong> Klik "Tambah Santri" untuk input detail satu per satu lengkap dengan foto.</li>
                            <li><strong>Tambah Massal:</strong> Klik "Tambah Massal" untuk input cepat dalam bentuk tabel (seperti Excel) langsung di aplikasi.</li>
                            <li><strong>Impor CSV:</strong> Gunakan template CSV untuk migrasi data ratusan santri sekaligus dari aplikasi lain.</li>
                            <li><strong>Edit Massal:</strong> Gunakan saat memperbarui banyak santri sekaligus (kelas, status, data identitas, dll).</li>
                        </ul>
                    </>
                )
            },
            {
                title: 'Workflow Bulk Editor (Direkomendasikan)',
                content: (
                    <div className="space-y-2 text-sm text-gray-700">
                        <p>Agar cepat dan minim salah, gunakan alur berikut di Bulk Editor:</p>
                        <ol className="list-decimal pl-5 space-y-1">
                            <li>Pilih <strong>Preset Import</strong> sesuai sumber data (Auto, Internal, EMIS, Simple).</li>
                            <li>Tentukan <strong>Validation Profile</strong> (`Basic` atau `Strict`).</li>
                            <li>Masukkan data via <strong>Smart Import</strong>, <strong>Paste Excel</strong>, atau paste langsung ke grid (`Ctrl+V`).</li>
                            <li>Perbaiki error dengan <strong>Lompat ke Error</strong> dan <strong>Perbaiki Otomatis</strong>.</li>
                            <li>Pastikan ringkasan kualitas data sudah aman, lalu simpan.</li>
                        </ol>
                        <div className="rounded border border-teal-200 bg-teal-50 p-3 text-xs text-teal-900">
                            Bulk Editor mendukung <strong>Simpan Draft</strong>, <strong>Muat Draft</strong>, dan <strong>Hapus Draft</strong> (terpisah untuk mode Tambah dan Edit).
                        </div>
                    </div>
                )
            },
            {
                title: 'Fitur Spreadsheet & Kontrol Kualitas Data',
                content: (
                    <div className="space-y-3 text-sm text-gray-700">
                        <ul className="list-disc pl-5 space-y-1">
                            <li><strong>Copy range:</strong> klik sel awal, <code>Shift+klik</code> sel akhir, lalu <code>Ctrl+C</code>.</li>
                            <li><strong>Reset seleksi:</strong> <code>Esc</code>.</li>
                            <li><strong>Undo/Redo:</strong> tombol toolbar atau <code>Ctrl+Z</code> / <code>Ctrl+Y</code>.</li>
                            <li><strong>Data Quality Summary:</strong> total baris, valid/invalid, duplikat NIS, duplikat NIK.</li>
                            <li><strong>Audit Trail:</strong> catatan aktivitas input (import, edit, auto-fix, undo/redo, simpan).</li>
                        </ul>
                    </div>
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
        id: 'jurnal_mengajar',
        badge: 'NEW',
        badgeColor: 'teal',
        title: 'Jurnal Mengajar & Agenda Kelas',
        steps: [
            {
                title: 'Akses Menu Input Jurnal',
                content: (
                     <ul className="list-disc pl-5 space-y-1 text-sm mt-1">
                        <li>Buka menu <strong>Absensi</strong> lalu pilih Rombel dan Tanggal.</li>
                        <li>Jika ingin isi jurnal tanpa input absensi, klik tombol <strong>Isi Jurnal Saja</strong> pada panel status rombel.</li>
                        <li>Jika sedang input absensi, klik tombol <strong>Isi Jurnal / Agenda</strong> di bagian bawah.</li>
                        <li>Alternatif monitoring tetap tersedia di menu <strong>Akademik &gt; Jurnal Mengajar (Log)</strong>.</li>
                    </ul>
                )
            },
            {
                title: 'Mengisi Catatan Jurnal',
                content: (
                   <ul className="list-disc pl-5 space-y-1 text-sm mt-1">
                        <li>Pilih <strong>Mata Pelajaran</strong> dan <strong>Guru Pengampu</strong>.</li>
                        <li>Pilih jam pelajaran ke-berapa materi ini disampaikan (bisa memilih multiple, misal Jam 1 dan 2).</li>
                        <li>Tuliskan <strong>Kompetensi Dasar / Materi</strong> yang diajarkan pada form yang tersedia.</li>
                        <li>(Opsional) Isi <strong>Catatan Kejadian</strong> jika ada peristiwa khusus di kelas.</li>
                    </ul>
                )
            },
             {
                title: 'Mencetak Laporan Jurnal',
                content: (
                     <div className="space-y-2 text-sm bg-gray-50 p-2 rounded">
                        <ol className="list-decimal pl-5 space-y-1">
                            <li>Buka menu <strong>Laporan</strong>.</li>
                            <li>Pilih kategori <strong>Akademik & Kesiswaan</strong>.</li>
                            <li>Pilih <strong>Rekap Jurnal Mengajar</strong>.</li>
                            <li>Filter laporan berdasarkan tanggal dan rombel pada opsi sebelah kiri layar, kemudian Generate.</li>
                        </ol>
                    </div>
                )
            },
            {
                title: 'Monitoring Jurnal (Admin/Staff)',
                content: (
                    <ul className="list-disc pl-5 space-y-1 text-sm mt-1">
                        <li>Buka menu <strong>Akademik</strong>.</li>
                        <li>Pilih tab <strong>Jurnal Mengajar</strong>.</li>
                        <li>Gunakan filter Tanggal, Rombel, atau Guru untuk mencari catatan tertentu.</li>
                        <li>Gunakan search bar untuk mencari berdasarkan materi pembelajaran.</li>
                        <li>Admin dapat menghapus catatan yang salah input melalui tombol sampah di kolom aksi.</li>
                    </ul>
                )
            }
        ]
    },
    {
        id: 'cetak_kartu',
        badge: 'NEW',
        badgeColor: 'indigo',
        title: 'Desain & Cetak Kartu Santri',
        steps: [
            {
                title: 'Akses Sub Menu Kelengkapan Identitas',
                content: (
                    <ul className="list-disc pl-5 space-y-1 text-sm mt-1">
                        <li>Buka menu <strong>Laporan</strong>.</li>
                        <li>Pilih kategori <strong>Kelengkapan Identitas</strong>.</li>
                        <li>Di sini Anda dapat memilih <strong>Kartu Santri</strong>, <strong>Buku Induk</strong>, atau <strong>Label Nama</strong>.</li>
                    </ul>
                )
            },
            {
                title: 'Opsi Kustomisasi Desain Sisi Depan',
                content: (
                    <div className="space-y-2 text-sm">
                        <p>Menu Laporan Kartu Santri memberikan opsi layout yang sangat fleksibel:</p>
                        <ol className="list-decimal pl-5 space-y-1 bg-gray-50 p-2 rounded">
                            <li><strong>Variasi Data Latar:</strong> Anda bisa memilih untuk memunculkan (atau menyembunyikan) Foto Santri, Barcode NIS, Logo Tut Wuri / DEPAG, serta detail kelas dan alamat.</li>
                            <li><strong>Masa Berlaku (Valid Until):</strong> Kartu dapat diset mencetak label "Berlaku Selama Menjadi Santri", atau hingga masa kelulusan (otomatis dihitung).</li>
                        </ol>
                    </div>
                )
            },
            {
                title: 'Desain Sisi Belakang & Tata Tertib',
                content: (
                    <div className="space-y-3">
                        <p className="text-sm">Kartu santri mendukung desain sisi belakang (Backside) otomatis. Di panel kiri, atur "Layout Sisi Belakang":</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                            <div className="bg-indigo-50 p-2 border border-indigo-200 rounded">
                                <strong>Berdampingan (Depan & Belakang)</strong><br />
                                Sisi depan dan belakang akan dicetak bersebelahan dalam 1 file. Sangat cocok jika Anda mencetaknya menggunakan pelastik ID Card lipat.
                            </div>
                            <div className="bg-blue-50 p-2 border border-blue-200 rounded">
                                <strong>Terpisah / Balik Kertas</strong><br />
                                Bagian belakang dirender di lembar (page) tersendiri. Cocok untuk mesin cetak PVC dua sisi (Duplex Printing).
                            </div>
                        </div>
                    </div>
                )
            },
            {
                title: 'Auto-Scaling Teks & Jabatan Penanda Tangan',
                color: 'teal',
                content: (
                    <ul className="list-disc pl-5 space-y-1 text-sm mt-1">
                        <li><strong>Tata Tertib Dinamis:</strong> Anda bisa mengetik aturan bebas di TextBox yang disediakan. Gunakan variabel <code>{'{NamaPonpes}'}</code> agar nama berubah otomatis. Jika teksnya panjang, sistem akan <strong>otomatis mengecilkan font</strong> agar muat dalam 1 kartu!</li>
                        <li><strong>Ubah Jabatan Pengasuh:</strong> Anda bebas mengubah title tanda tangan bagian belakang. Misal dari "Mengetahui," menjadi "Mudir Aam", dan memilih nama ustadz spesifik dari daftar tenaga pengajar tanpa merubah Pengaturan Umum.</li>
                    </ul>
                )
            },
            {
                title: 'Cara Ekspor Vector / PDF tanpa Pecah',
                color: 'green',
                content: (
                    <div className="bg-green-50 p-3 rounded border border-green-200 text-sm">
                        <p className="mb-2">Daripada repot melakukan layout manual di CorelDRAW / Inkscape:</p>
                        <ol className="list-decimal pl-5 space-y-1 text-green-900 font-medium">
                            <li>Filter rombel yang akan dicetak di aplikasi. </li>
                            <li>Klik tombol <strong>Cetak Document Laporan</strong>.</li>
                            <li>Di jendela Preview Cetak Browser, pastikan Anda mengubah tujuan (Destination) menjadi <strong>Simpan sebagai PDF (Save as PDF)</strong>.</li>
                            <li>Setelan Kertas: A4, Margin: None (Tidak Ada), Scale: Default.</li>
                            <li>File PDF yang dihasilkan aslinya adalah basis <strong>Vector Component</strong>. Anda bisa langsung mencetaknya atau membukanya di Corel/Inkscape tanpa resolusi pecah!</li>
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
                            <li><strong>Sync Data:</strong> Jika menggunakan Cloud Sync (Dropbox), Petugas klik "Kirim Perubahan". Jika menggunakan <strong>Firebase</strong>, data otomatis terkirim secara real-time.</li>
                        </ol>
                    </>
                )
            },
            {
                title: 'Integrasi Absensi & Cetak Surat',
                content: (
                     <ul className="list-disc pl-5 space-y-1 text-sm mt-1">
                        <li><strong>Absensi Otomatis:</strong> Jika status pemeriksaan adalah <strong>Rawat Inap (Pondok)</strong> atau <strong>Rujuk RS/Klinik</strong>, sistem otomatis menandai santri tersebut <strong>Sakit (S)</strong> di menu Absensi pada tanggal tersebut.</li>
                        <li><strong>Catatan:</strong> Status <strong>Rawat Jalan</strong> tidak mengubah absensi otomatis agar tidak menandai sakit berlebihan.</li>
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
                        <br/>Satpam bisa menggunakan HP/Laptop di pos jaga. Jika menggunakan Cloud Sync, lakukan <strong>Kirim Perubahan</strong> saat pergantian shift. Jika menggunakan <strong>Firebase</strong>, data tersinkron otomatis.
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
                                <li><strong>Gunakan Sync Cloud:</strong> Hubungkan laptop Konselor ke Dropbox atau <strong>Firebase</strong> pondok.</li>
                                <li><strong>Input & Sync:</strong> Konselor mencatat sesi di laptopnya. Jika menggunakan Dropbox, klik "Kirim Perubahan". Jika menggunakan <strong>Firebase</strong>, data tersimpan secara real-time dan aman.</li>
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
        title: 'Absensi & Kehadiran Santri',
        steps: [
            {
                title: 'SOP Kerja Multi-Admin: Real-Time Sync vs Hub-and-Spoke',
                content: (
                    <div className="space-y-3 text-sm">
                        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-950 text-xs flex items-start gap-2.5">
                            <i className="bi bi-exclamation-triangle-fill text-amber-600 shrink-0 text-base mt-0.5"></i>
                            <div>
                                <strong className="font-bold text-amber-900 block mb-0.5">Pentingnya Kedisiplinan Kerja Multi-Admin:</strong>
                                Di pondok pesantren dengan puluhan ustadz/musyrif yang mengabsen serentak di kelas dan asrama, sistem mendukung 2 arsitektur utama: <strong>Real-Time Cloud (Firebase)</strong> dan <strong>Hub-and-Spoke (Offline/Dropbox/File)</strong>. Ikuti SOP di bawah ini agar data absensi tidak saling menimpa (conflict-free).
                            </div>
                        </div>

                        {/* Model A */}
                        <div className="p-3.5 bg-teal-50/70 border border-teal-200 rounded-xl space-y-2">
                            <div className="flex items-center justify-between border-b border-teal-200/70 pb-1.5">
                                <h5 className="font-bold text-teal-900 flex items-center gap-1.5 text-xs">
                                    <span className="w-5 h-5 rounded-full bg-teal-200 text-teal-800 flex items-center justify-center text-[10px] font-black">1</span>
                                    Model A: Real-Time Live Sync (Firebase Firestore)
                                </h5>
                                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase">Online Aktif</span>
                            </div>
                            <p className="text-xs text-gray-600">
                                Cocok untuk lingkungan pondok dengan koneksi WiFi/internet lancar di ruang kelas dan kantor guru.
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-xs">
                                <div className="p-2.5 bg-white rounded-lg border border-teal-100 shadow-2xs">
                                    <strong className="text-teal-950 block mb-1 font-semibold">
                                        <i className="bi bi-person-check text-teal-600"></i> Akun Mandiri Guru
                                    </strong>
                                    <p className="text-[11px] text-gray-600">
                                        Setiap pengajar login menggunakan akun masing-masing. Nama pencatat otomatis direkam di atribut <code>recordedBy</code> untuk audit jejak digital.
                                    </p>
                                </div>
                                <div className="p-2.5 bg-white rounded-lg border border-teal-100 shadow-2xs">
                                    <strong className="text-teal-950 block mb-1 font-semibold">
                                        <i className="bi bi-broadcast text-teal-600"></i> Sinkronisasi Detik Itu Juga
                                    </strong>
                                    <p className="text-[11px] text-gray-600">
                                        Saat guru menekan "Simpan Data Absensi", data masuk ke IndexedDB lokal dan langsung didorong ke Cloud Firebase. Admin pusat &amp; pimpinan pondok dapat memantau secara live.
                                    </p>
                                </div>
                                <div className="p-2.5 bg-white rounded-lg border border-teal-100 shadow-2xs">
                                    <strong className="text-teal-950 block mb-1 font-semibold">
                                        <i className="bi bi-shield-lock text-teal-600"></i> Partisi Kerja Rombel
                                    </strong>
                                    <p className="text-[11px] text-gray-600">
                                        Ustadz A mengabsen Rombel 1A, Ustadz B mengabsen Rombel 1B. Jangan ada 2 admin yang menginput rombel yang sama di tanggal &amp; sesi yang sama secara simultan.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Model B */}
                        <div className="p-3.5 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-2">
                            <div className="flex items-center justify-between border-b border-indigo-200/70 pb-1.5">
                                <h5 className="font-bold text-indigo-900 flex items-center gap-1.5 text-xs">
                                    <span className="w-5 h-5 rounded-full bg-indigo-200 text-indigo-800 flex items-center justify-center text-[10px] font-black">2</span>
                                    Model B: Hub-and-Spoke (Offline-First / Dropbox / File JSON)
                                </h5>
                                <span className="ml-auto px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-[10px] font-bold uppercase">Hybrid / Offline</span>
                            </div>
                            <p className="text-xs text-gray-600">
                                Cocok untuk pondok yang ruang asrama atau kelasnya tidak memiliki jangkauan sinyal internet stabil.
                            </p>
                            <div className="space-y-2 pt-1 text-xs">
                                <div className="p-2 bg-white rounded-lg border border-indigo-100">
                                    <strong className="text-indigo-950">A. Peran HUB (Pusat Data Induk di Kantor TU):</strong>
                                    <p className="text-[11px] text-gray-600 mt-0.5">
                                        Komputer Utama di Kantor Tata Usaha yang memegang salinan induk seluruh data santri, absensi, tagihan, dan pengaturan.
                                    </p>
                                </div>
                                <div className="p-2 bg-white rounded-lg border border-indigo-100">
                                    <strong className="text-indigo-950">B. Peran SPOKE (Perangkat Guru/Musyrif di Kelas):</strong>
                                    <p className="text-[11px] text-gray-600 mt-0.5">
                                        Laptop atau HP masing-masing pengajar. Sebelum jam KBM/halaqah dimulai, guru memastikan perangkatnya telah memuat Master Data terbaru dari Hub.
                                    </p>
                                </div>
                                <div className="p-2 bg-white rounded-lg border border-indigo-100">
                                    <strong className="text-indigo-950">C. Alur Penggabungan (Merging) Sore Hari:</strong>
                                    <ol className="list-decimal pl-4 mt-1 space-y-1 text-[11px] text-gray-600">
                                        <li>Guru mengabsen santri secara mandiri di kelas (tanpa perlu paket data).</li>
                                        <li>Saat KBM selesai atau ketika mendapat sinyal, guru mengeklik <strong>"Kirim Perubahan (Upload Staff Changes)"</strong> di menu Cloud Sync, atau mengirim file ekspor ke Admin.</li>
                                        <li>Admin Utama di Hub mengeklik <strong>"Gabungkan Perubahan Staff (Merge Changes)"</strong>. Sistem membandingkan stempel <code>lastModified</code> dan menyatukan seluruh absensi tanpa menimpa data rombel lain.</li>
                                        <li>Admin Pusat mengeklik <strong>"Terbitkan Master Data (Publish Master)"</strong> untuk mendistribusikan data termutakhir ke seluruh staf.</li>
                                    </ol>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            },
            {
                title: '5 Aturan Emas Menjaga Keutuhan Data Absensi',
                content: (
                    <div className="space-y-2 text-xs text-gray-700">
                        <p className="text-sm font-medium text-gray-800">
                            Patuhi 5 panduan utama berikut agar rekaman absensi selalu konsisten, akurat, dan terbebas dari tumpang tindih data:
                        </p>
                        <ul className="space-y-2.5 pt-1">
                            <li className="flex items-start gap-2.5 p-2.5 bg-gray-50 rounded-lg border border-gray-200">
                                <i className="bi bi-check-circle-fill text-teal-600 shrink-0 text-sm mt-0.5"></i>
                                <div>
                                    <strong className="text-gray-900 block">1. Satu Rombel Satu Penanggung Jawab:</strong>
                                    <span className="text-gray-600 text-[11px]">Jangan izinkan dua orang membuka dan mengedit form absensi untuk rombel &amp; sesi yang persis sama pada waktu bersamaan.</span>
                                </div>
                            </li>
                            <li className="flex items-start gap-2.5 p-2.5 bg-gray-50 rounded-lg border border-gray-200">
                                <i className="bi bi-check-circle-fill text-teal-600 shrink-0 text-sm mt-0.5"></i>
                                <div>
                                    <strong className="text-gray-900 block">2. Gunakan Fitur Dispensasi untuk Izin Multi-Hari:</strong>
                                    <span className="text-gray-600 text-[11px]">Jika santri sakit/izin lebih dari 1 hari atau izin massal rombongan lomba, gunakan tab <em>Izin &amp; Dispensasi</em> agar nomor disposisi dan catatan tercatat rapi secara atomik.</span>
                                </div>
                            </li>
                            <li className="flex items-start gap-2.5 p-2.5 bg-gray-50 rounded-lg border border-gray-200">
                                <i className="bi bi-check-circle-fill text-teal-600 shrink-0 text-sm mt-0.5"></i>
                                <div>
                                    <strong className="text-gray-900 block">3. Wajib Isi Alasan untuk Non-Hadir:</strong>
                                    <span className="text-gray-600 text-[11px]">Pastikan alasan sakit, izin, atau alpa diisi dengan jelas sebelum menyimpan form agar riwayat absensi bernilai valid saat audit atau cetak laporan.</span>
                                </div>
                            </li>
                            <li className="flex items-start gap-2.5 p-2.5 bg-gray-50 rounded-lg border border-gray-200">
                                <i className="bi bi-check-circle-fill text-teal-600 shrink-0 text-sm mt-0.5"></i>
                                <div>
                                    <strong className="text-gray-900 block">4. Segera Ambil Tindakan untuk Santri At-Risk:</strong>
                                    <span className="text-gray-600 text-[11px]">Jika muncul badge peringatan merah (Alpha ≥ 3 atau kehadiran &lt; 80%), wali kelas wajib menjadwalkan konseling BK atau menerbitkan Surat Peringatan (SP) langsung dari aplikasi.</span>
                                </div>
                            </li>
                            <li className="flex items-start gap-2.5 p-2.5 bg-gray-50 rounded-lg border border-gray-200">
                                <i className="bi bi-check-circle-fill text-teal-600 shrink-0 text-sm mt-0.5"></i>
                                <div>
                                    <strong className="text-gray-900 block">5. Download Backup JSON Berkala:</strong>
                                    <span className="text-gray-600 text-[11px]">Admin Pusat wajib mengunduh berkas cadangan JSON di menu <em>Pengaturan &gt; Backup &amp; Restore</em> minimal 1 minggu sekali sebagai arsip fisik cold-storage.</span>
                                </div>
                            </li>
                        </ul>
                    </div>
                )
            },
            {
                title: 'Alur Input Presensi Harian & Multi-Sesi (Mobile Friendly)',
                content: (
                    <div className="space-y-2 text-sm text-gray-700">
                        <p>
                            Mendukung multi-sesi harian (KBM Pagi, KBM Siang, Sore / Madrasah Diniyah, Halaqah Qur'an Malam, Subuh, dan Sholat Fardhu Berjamaah) dengan langkah efisien:
                        </p>
                        <ol className="list-decimal pl-5 space-y-1.5 text-xs text-gray-600 bg-gray-50 p-3 rounded-lg border border-gray-200">
                            <li>Buka menu <strong>Absensi</strong> &gt; Tab <strong>Input Harian</strong>.</li>
                            <li>Tentukan Jenjang, Kelas, Rombel, Tanggal, dan Sesi Kehadiran.</li>
                            <li><strong>Pintasan Cepat:</strong> Klik tombol <em>"Tandai Semua Hadir"</em> di pojok atas untuk mengisi status Hadir (H) ke semua santri sekaligus.</li>
                            <li>Ubah status santri yang berhalangan hadir dengan mengklik tombol huruf di sebelah nama (S = Sakit, I = Izin, A = Alpha).</li>
                            <li><strong>Catatan Alasan Wajib:</strong> Untuk status non-Hadir (S/I/A), isi kolom keterangan alasan untuk akuntabilitas.</li>
                            <li><strong>Early Warning System:</strong> Santri dengan Alpha ≥ 3 atau kehadiran &lt; 80% akan ditandai dengan banner kuning/merah disertai tombol langsung untuk membuat sesi BK Konseling atau mengirim WhatsApp ke wali santri.</li>
                            <li><strong>Simpan &amp; Lanjut:</strong> Klik <em>"Simpan Data Absensi"</em> atau gunakan <em>"Simpan &amp; Tanggal Berikutnya"</em> untuk mempercepat penginputan presensi secara beruntun.</li>
                            <li><strong>Impor Massal Excel:</strong> Klik tombol <em>"Impor Excel"</em> di header halaman untuk mengunggah rekap presensi dari lembar kerja spreadsheet dengan validasi NIS dan rombel otomatis.</li>
                        </ol>
                    </div>
                )
            },
            {
                title: 'Izin & Dispensasi Massal (Multi-Hari & Multi-Santri)',
                content: (
                    <div className="space-y-2 text-sm text-gray-700">
                        <p>
                            Gunakan tab <strong>Izin &amp; Dispensasi</strong> saat santri berhalangan hadir lebih dari 1 hari atau perizinan rombongan:
                        </p>
                        <ul className="list-disc pl-5 space-y-1.5 text-xs text-gray-600">
                            <li><strong>Dispensasi Rentang Tanggal:</strong> Memungkinkan pemberian izin/sakit sekaligus untuk beberapa hari ke depan tanpa harus menginput satu per satu hari secara manual.</li>
                            <li><strong>Pemberian Massal ke Banyak Santri:</strong> Pilih beberapa santri sekaligus (misalnya delegasi lomba MQK/Pospeda, santri isolasi kesehatan di asrama, atau santri izin pulang).</li>
                            <li><strong>Nomor Surat Disposisi:</strong> Otomatis menghasilkan dan merekam nomor surat dispensasi resmi pada catatan absensi santri.</li>
                        </ul>
                    </div>
                )
            },
            {
                title: 'Surat Peringatan (SP 1, SP 2, SP 3, Panggilan Wali) & Konseling BK',
                content: (
                    <div className="space-y-2 text-sm text-gray-700">
                        <p>
                            Terintegrasi penuh untuk pembinaan kedisiplinan dan penanganan santri bermasalah:
                        </p>
                        <ul className="list-disc pl-5 space-y-1.5 text-xs text-gray-600">
                            <li><strong>Klasifikasi Otomatis:</strong> Sistem mengelompokkan santri yang masuk kriteria SP 1 (Alpha 3-4 hari), SP 2 (Alpha 5-6 hari), SP 3 (Alpha ≥ 7 hari), dan Surat Pemanggilan Orang Tua.</li>
                            <li><strong>Generator Dokumen Resmi:</strong> Dokumen surat otomatis memuat kop resmi pondok, nomor surat dinamis, biodata santri, rincian tanggal mangkir, kolom tanda tangan wali kelas &amp; pimpinan, serta barcode verifikasi keaslian surat.</li>
                            <li><strong>Ekspor Dokumen &amp; Simpan ke Arsip:</strong> Surat dapat dicetak langsung, diunduh sebagai file Microsoft Word (.doc), dan disimpan langsung ke database <strong>Arsip Surat Resmi</strong> aplikasi melalui tombol <em>"Simpan ke Arsip"</em>.</li>
                            <li><strong>Bimbingan Konseling (BK):</strong> Klik tombol <em>"Jadwalkan Konseling BK"</em> untuk mencatat riwayat konsultasi, keluhan, penanganan, dan komitmen santri di database konseling (<code>db.bkSessions</code>).</li>
                            <li><strong>WhatsApp Notifikasi Wali:</strong> Kirimkan pesan resmi evaluasi kehadiran santri langsung ke nomor orang tua/wali via WhatsApp Web/Desktop.</li>
                        </ul>
                    </div>
                )
            },
            {
                title: 'Kalender Kehadiran, Analitik Komparasi Rombel, & Rekap Matriks 1-31',
                content: (
                    <div className="space-y-2 text-sm text-gray-700">
                        <ul className="list-disc pl-5 space-y-1.5 text-xs text-gray-600">
                            <li><strong>Heatmap Kalender:</strong> Visualisasi kehadiran bulanan dengan indikator warna (Hijau: Kehadiran tinggi, Kuning: Sedang, Merah: Rendah).</li>
                            <li><strong>Komparasi Rombel:</strong> Perbandingan persentase kedisiplinan antar kelas/halaqah untuk bahan evaluasi wali kelas dan pimpinan.</li>
                            <li><strong>Segmentasi Santri:</strong> Filter analitik berdasarkan status Mukim (Mondok) dan Non-Mukim (Laju).</li>
                            <li><strong>Matriks Presensi 1-31:</strong> Format tabel absensi konvensional tanggal 1 hingga 31 lengkap dengan total Hadir, Sakit, Izin, Alpha, dan persentase kehadiran per santri.</li>
                            <li><strong>Ekspor Fleksibel:</strong> Unduh berkas format Excel (.xlsx) untuk laporan dinas/Kemenag, atau cetak lembar PDF digital ber-kop resmi pondok pesantren.</li>
                        </ul>
                    </div>
                )
            }
        ]
    },
    {
        id: 'tahfizh',
        badge: 7,
        badgeColor: 'green',
        title: "Tahfizh & Mutaba'ah Qur'an (Rapor & Halaqah)",
        steps: [
            {
                title: 'Ikhtisar & Rekomendasi Alur Kerja (Workflow)',
                content: (
                    <div className="space-y-3 text-sm">
                        <p>
                            Modul Tahfizh dirancang untuk mencatat mutaba'ah harian, ujian berkala per juz, hingga penerbitan Buku Rapor Semesteran dan Syahadah Hafalan secara terstruktur:
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                                <h5 className="font-bold text-green-900 flex items-center gap-1.5 mb-1">
                                    <i className="bi bi-person-workspace text-green-700"></i> 1. Desentralisasi Input Halaqah
                                </h5>
                                <p className="text-xs text-gray-700">
                                    Admin membuatkan akun staff untuk setiap Ustadz Muhaffizh. Pengajar langsung mencatat saat menyimak santri maju setoran lewat HP/tablet masing-masing.
                                </p>
                            </div>
                            <div className="bg-teal-50 p-3 rounded-lg border border-teal-200">
                                <h5 className="font-bold text-teal-900 flex items-center gap-1.5 mb-1">
                                    <i className="bi bi-cloud-arrow-up text-teal-700"></i> 2. Sinkronisasi Real-Time / Offline
                                </h5>
                                <p className="text-xs text-gray-700">
                                    Bekerja mulus tanpa internet (Offline-First). Bila terhubung Firebase Realtime, data setoran langsung tersinkron ke admin dan portal wali santri.
                                </p>
                            </div>
                        </div>
                    </div>
                )
            },
            {
                title: '1. Manajemen Halaqah & Plotting Santri (Filter Cascading)',
                color: 'teal',
                content: (
                    <div className="space-y-3 text-sm">
                        <p>Kelola kelompok halaqah dan bagi santri ke pembimbingnya:</p>
                        <ol className="list-decimal pl-5 space-y-2 bg-gray-50 p-3 rounded-lg border text-xs text-gray-700">
                            <li>
                                <strong>Membuat Halaqah:</strong> Buka tab <em>Manajemen Halaqah</em> &gt; Klik <strong>"+ Tambah Halaqah"</strong>. Masukkan Nama Halaqah, pilih Ustadz Muhaffizh, dan tentukan target hafalan.
                            </li>
                            <li>
                                <strong>Plotting Anggota dengan Filter Bertingkat:</strong> Buka tab <em>Plotting Anggota</em>. Gunakan filter <strong>Jenjang &rarr; Kelas &rarr; Rombel</strong> di panel atas untuk menyaring santri angkatan tertentu dengan cepat.
                            </li>
                            <li>
                                <strong>Simpan Anggota:</strong> Centang nama-nama santri yang dibimbing, lalu klik <strong>"Simpan Anggota Halaqah"</strong>.
                            </li>
                        </ol>
                    </div>
                )
            },
            {
                title: '2. Metode Setoran: Sabaq (Ziyadah), Sabqi (Murojaah Dekat) & Manzil (Murojaah Jauh)',
                color: 'green',
                content: (
                    <div className="space-y-3 text-sm">
                        <p>Aplikasi mendukung klasifikasi setoran hafalan standar internasional (Sabaq, Sabqi, Manzil) dan metode umum:</p>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                            <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-lg space-y-1">
                                <span className="px-2 py-0.5 rounded bg-emerald-600 text-white font-bold text-[10px]">SABAQ / ZIYADAH</span>
                                <h6 className="font-bold text-emerald-950">Hafalan Baru</h6>
                                <p className="text-gray-600">Setoran ayat/halaman yang baru pertama kali dihafal. Sistem otomatis menyarankan ayat lanjutan dari setoran sebelumnya.</p>
                            </div>
                            <div className="bg-teal-50 border border-teal-200 p-3 rounded-lg space-y-1">
                                <span className="px-2 py-0.5 rounded bg-teal-600 text-white font-bold text-[10px]">SABQI / MUROJAAH DEKAT</span>
                                <h6 className="font-bold text-teal-950">Ulangan Juz Baru</h6>
                                <p className="text-gray-600">Murojaah beberapa lembar ke belakang dari juz yang sedang aktif dihafal agar tidak mudah hilang.</p>
                            </div>
                            <div className="bg-cyan-50 border border-cyan-200 p-3 rounded-lg space-y-1">
                                <span className="px-2 py-0.5 rounded bg-cyan-600 text-white font-bold text-[10px]">MANZIL / MUROJAAH JAUH</span>
                                <h6 className="font-bold text-cyan-950">Ulangan Juz Lama</h6>
                                <p className="text-gray-600">Pengulangan juz-juz lama yang sudah pernah diujikan untuk menjaga kelancaran hafalan jangka panjang.</p>
                            </div>
                        </div>

                        <div className="bg-gray-50 border border-gray-200 p-3 rounded-lg text-xs space-y-1.5">
                            <span className="font-bold text-gray-800 flex items-center gap-1">
                                <i className="bi bi-mic-fill text-rose-500"></i> Rekam Audio Setoran Suara Santri (Voice Recorder):
                            </span>
                            <p className="text-gray-600">
                                Ustadz dapat merekam lantunan ayat santri langsung dari browser saat menyimak dengan mengklik ikon mikrofon. Rekaman audio disimpan sebagai bukti mutaba'ah, dapat diputar ulang, atau diunduh untuk evaluasi dan laporan kepada wali santri.
                            </p>
                        </div>

                        <div className="bg-emerald-50/70 border border-emerald-200 p-3 rounded-lg text-xs space-y-1">
                            <span className="font-bold text-emerald-900 flex items-center gap-1">
                                <i className="bi bi-card-checklist text-emerald-700"></i> Preset Kamus Catatan Tajwid & Makhraj:
                            </span>
                            <p className="text-gray-700">
                                Gunakan chip catatan cepat (Tawaqquf/Tersendat, Lahn Jali, Lahn Khafi, Mad Thobi'i, Ghunnah, dll.) untuk mencatat evaluasi teknis hanya dengan 1 klik tanpa harus mengetik manual dari awal.
                            </p>
                        </div>
                    </div>
                )
            },
            {
                title: '3. Ujian Hafalan Per Juz, Penandaan Mutqin & Analisis Capaian',
                color: 'blue',
                content: (
                    <div className="space-y-3 text-sm">
                        <p>Untuk menguji hafalan satu juz penuh atau seperempat Al-Qur'an secara resmi:</p>
                        <ol className="list-decimal pl-5 space-y-1.5 bg-blue-50 p-3 rounded-lg border border-blue-200 text-xs text-blue-950">
                            <li>Pilih tipe setoran: <strong>"Ujian Hafalan"</strong>.</li>
                            <li>Pilih nomor <strong>Juz yang Diujikan</strong> (misal: Juz 30, Juz 1, dsb).</li>
                            <li>Isi skor kelancaran, tajwid, fashahah/makhraj, serta adab tilawah.</li>
                            <li>
                                <strong>Tandai Status Mutqin:</strong> Jika santri lulus dengan nilai di atas batas minimal, centang <strong>"Tandai Status Mutqin"</strong>. Status ini akan otomatis mewarnai nomor juz menjadi hijau terang pada <strong>Peta Visual 30 Juz</strong>.
                            </li>
                            <li>
                                <strong>Grafik & Analisis Kecepatan:</strong> Masuk ke tab <em>Statistik & Grafik</em> untuk memantau grafik kenaikan hafalan bulanan, rata-rata kelancaran, dan estimasi waktu khatam santri.
                            </li>
                        </ol>
                    </div>
                )
            },
            {
                title: '4. Penerbitan Dokumen: Buku Rapor, Kartu Setoran Saku & Syahadah',
                color: 'purple',
                content: (
                    <div className="space-y-3 text-sm">
                        <p>Modul Tahfizh menyediakan format dokumen resmi siap cetak dan ekspor:</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                            <div className="bg-white p-3 rounded-lg border shadow-2xs">
                                <h6 className="font-bold text-purple-900 flex items-center gap-1 mb-1">
                                    <i className="bi bi-journal-bookmark-fill text-purple-600"></i> Buku Rapor Semesteran (A4)
                                </h6>
                                <p className="text-gray-600">Dilengkapi Kop Pondok Resmi, Peta Visual 30 Juz, Rekap Rata-rata Nilai, Akumulasi Catatan Evaluasi Semester, dan Tanda Tangan 3 Pihak (Mudir, Pengampu, Wali).</p>
                            </div>
                            <div className="bg-white p-3 rounded-lg border shadow-2xs">
                                <h6 className="font-bold text-emerald-900 flex items-center gap-1 mb-1">
                                    <i className="bi bi-card-text text-emerald-600"></i> Kartu Mutaba'ah Saku (Buku Harian)
                                </h6>
                                <p className="text-gray-600">Format kartu mutaba'ah harian/bulanan ringkas yang bisa dicetak untuk pegangan santri atau diselipkan di mushaf.</p>
                            </div>
                            <div className="bg-white p-3 rounded-lg border shadow-2xs">
                                <h6 className="font-bold text-amber-900 flex items-center gap-1 mb-1">
                                    <i className="bi bi-award-fill text-amber-600"></i> Syahadah Tahfizh (Landscape)
                                </h6>
                                <p className="text-gray-600">Sertifikat kelulusan juz dengan bingkai kaligrafi elegan, titimangsa Hijriah/Masehi resmi, dan barcode validasi.</p>
                            </div>
                            <div className="bg-white p-3 rounded-lg border shadow-2xs">
                                <h6 className="font-bold text-teal-900 flex items-center gap-1 mb-1">
                                    <i className="bi bi-file-earmark-text-fill text-teal-600"></i> Laporan Perkembangan & Rekap Muhaffizh
                                </h6>
                                <p className="text-gray-600">Rekap riwayat kronologis seluruh setoran ziyadah & murojaah santri dalam rentang tanggal untuk laporan ke pengasuh.</p>
                            </div>
                        </div>
                    </div>
                )
            },
            {
                title: '5. Pengaturan Titimangsa & Tanda Tangan Proporsional',
                color: 'orange',
                content: (
                    <div className="space-y-3 text-sm">
                        <p>Fleksibilitas penanggalan dan penandatanganan rapor/syahadah:</p>
                        <ul className="list-disc pl-5 space-y-1.5 text-xs text-gray-700">
                            <li>
                                <strong>Format Tanggal:</strong> Pilih format <em>Hanya Masehi</em>, <em>Hanya Hijriah</em>, atau <em>Ganda (Hijriah & Masehi)</em>.
                            </li>
                            <li>
                                <strong>Penyesuaian Hari Hijriah:</strong> Gunakan koreksi hari (-2 s/d +2 hari) untuk menyesuaikan hasil hisab/rukyat lokal atau ketik teks Hijriah manual.
                            </li>
                            <li>
                                <strong>Tata Letak Tanda Tangan:</strong> Titimangsa tempat & tanggal tertata dalam satu baris penuh tanpa terpotong, dengan ruang vertikal tanda tangan yang proporsional.
                            </li>
                            <li>
                                <strong>Penandatangan:</strong> Otomatis mendeteksi Pimpinan/Mudir Pondok, Ustadz Pembimbing Halaqah / Wali Kelas, atau dapat dikustomisasi secara manual.
                            </li>
                        </ul>
                    </div>
                )
            },
            {
                title: '6. Performa Cetak Massal Ringan & Sinkronisasi Multi-Admin',
                color: 'teal',
                content: (
                    <div className="space-y-3 text-sm">
                        <div className="bg-teal-50 p-3.5 rounded-lg border border-teal-200 text-teal-950">
                            <p className="font-semibold flex items-center gap-1.5 text-xs mb-1">
                                <i className="bi bi-lightning-charge-fill text-amber-500"></i> Optimasi Cetak On-Demand
                            </p>
                            <p className="text-xs text-gray-700">
                                Pencetakan ratusan rapor atau syahadah kini berjalan instan dan hemat memori berkat teknologi <em>On-Demand Lazy Rendering</em>. Dokumen hanya dimuat ke memori saat Anda menekan tombol Cetak/Ekspor, menjaga peramban tetap responsif.
                            </p>
                        </div>

                        <div className="bg-indigo-50 p-3.5 rounded-lg border border-indigo-200 text-indigo-950 space-y-2">
                            <p className="font-semibold flex items-center gap-1.5 text-xs">
                                <i className="bi bi-arrow-left-right text-indigo-600"></i> SOP Sinkronisasi Multi-Admin Tahfizh:
                            </p>
                            <ul className="list-disc pl-5 space-y-1 text-xs text-gray-700">
                                <li>
                                    <strong>Mode Firebase (Real-time):</strong> Ustadz yang menginput setoran di halaqah langsung mengalirkan data ke Admin & Portal Wali Santri secara instan tanpa perlu tindakan manual.
                                </li>
                                <li>
                                    <strong>Mode Hub & Spoke (Dropbox/WebDAV):</strong>
                                    <ol className="list-decimal pl-4 mt-1 space-y-0.5 text-gray-700">
                                        <li><strong>Ustadz (Spoke):</strong> Setelah selesai halaqah, klik <em>"Kirim Perubahan ke Admin"</em>.</li>
                                        <li><strong>Admin Utama (Hub):</strong> Buka menu <em>Pusat Sinkronisasi</em> &gt; Klik <em>"Gabung"</em> pada file setoran ustadz &gt; <strong>WAJIB Klik "Publikasikan Master"</strong>.</li>
                                        <li><strong>Ustadz / Staff Lain:</strong> Klik <em>"Ambil Data Master"</em> di pagi hari sebelum halaqah berikutnya agar data santri & mutaba'ah selalu up-to-date.</li>
                                    </ol>
                                </li>
                            </ul>
                        </div>
                    </div>
                )
            }
        ]
    },
    {
        id: 'akademik',
        badge: 8,
        badgeColor: 'indigo',
        title: 'Akademik: Jadwal, Leger Nilai & Form Guru',
        steps: [
            { 
                title: 'Persiapan Jadwal (Data Master) - WAJIB', 
                content: (
                    <div>
                        <p className="mb-2">Sebelum menyusun jadwal, Anda <strong>wajib</strong> melengkapi Data Master terlebih dahulu agar fitur deteksi bentrok berfungsi:</p>
                        <ul className="list-disc pl-5 space-y-1 text-sm bg-indigo-50 p-2.5 rounded border border-indigo-200 text-indigo-950">
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
                title: 'Konsep Rapor Digital (Desentralisasi Tanpa Login)',
                color: 'blue',
                content: (
                    <div className="bg-blue-50 p-3.5 rounded text-blue-900 border border-blue-200 text-sm space-y-2">
                        <p>
                            <strong>Metode Unik & Mandiri:</strong> Aplikasi ini dirancang agar Guru <strong>TIDAK PERLU LOGIN</strong> ke sistem untuk mengisi nilai.
                        </p>
                        <div className="bg-white p-2.5 rounded border border-blue-100 font-mono text-xs text-blue-800">
                            Alur: Admin Desain Template &rarr; Generate Form HTML &rarr; Kirim via WA/Email &rarr; Guru Isi di HP/Laptop (Offline) &rarr; Kirim Balik &rarr; Admin Impor Sekali Klik.
                        </div>
                    </div>
                )
            },
            {
                title: 'Dukungan Responsif Ganda: Tabel Leger & Form Kartu Santri',
                color: 'teal',
                content: (
                    <div className="space-y-3 text-sm">
                        <p>Formulir HTML guru kini mendukung 2 mode tampilan canggih:</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                            <div className="bg-white p-3 rounded-lg border shadow-2xs">
                                <h5 className="font-bold text-teal-800 flex items-center gap-1.5 mb-1"><i className="bi bi-card-checklist text-teal-600"></i> Mode Form Kartu Santri (Mobile)</h5>
                                <p className="text-gray-600">Ideal untuk pengisian lewat HP. Menampilkan 1 santri per kartu dengan input nilai besar, tombol navigasi <em>Sebelumnya / Berikutnya</em>, dan pencarian santri instan.</p>
                            </div>
                            <div className="bg-white p-3 rounded-lg border shadow-2xs">
                                <h5 className="font-bold text-indigo-800 flex items-center gap-1.5 mb-1"><i className="bi bi-table text-indigo-600"></i> Mode Tabel Leger (Desktop)</h5>
                                <p className="text-gray-600">Ideal untuk laptop/PC. Menampilkan matriks tabel penuh dengan <em>Freeze Header</em> & kolom nama santri yang tetap terkunci saat di-scroll horizontal.</p>
                            </div>
                        </div>
                        <div className="bg-teal-50 border-l-4 border-teal-500 p-2.5 rounded text-xs text-teal-900">
                            <strong>Filter Pintar:</strong> Jika formulir dibuat khusus untuk satu rombel, pilihan kelas/rombel yang berlebih akan disederhanakan otomatis sehingga guru langsung fokus mencari nama santri dan menginput nilai.
                        </div>
                    </div>
                )
            },
            {
                title: '3. Desain Grid & Rumus Rapor',
                content: (
                    <ul className="list-disc pl-5 space-y-1.5 text-sm mt-1">
                        <li>Buka menu <strong>Akademik &gt; Desain Rapor</strong>.</li>
                        <li>Buat Template baru atau Import dari Excel.</li>
                        <li>Gunakan variabel dinamis seperti <code>$NAMA</code>, <code>$NIS</code>, <code>$ROMBEL</code>, atau buat kode kolom nilai seperti <code>$NILAI_UH1</code>, <code>$NILAI_PAS</code>.</li>
                        <li>Gunakan formula otomatis seperti <code>AVERAGE($UH1, $UH2)</code> atau <code>RANK($TOTAL)</code> untuk menghitung peringkat kelas otomatis.</li>
                    </ul>
                )
            },
            {
                title: '4. Generate Formulir Guru & Pengiriman Nilai',
                content: (
                     <ul className="list-disc pl-5 space-y-1.5 text-sm mt-1">
                        <li>Masuk ke tab <strong>Generate Form</strong>.</li>
                        <li>Pilih Jenjang, Tingkat Kelas, Rombel, dan Template Rapor.</li>
                        <li>Pilih metode integrasi: <strong>WhatsApp Web</strong>, <strong>Google Sheets</strong>, atau <strong>Hybrid</strong>.</li>
                        <li>Download file HTML dan kirimkan ke guru mapel / wali kelas. File dapat dibuka langsung di browser HP tanpa install aplikasi tambahan.</li>
                    </ul>
                )
            },
            {
                title: '5. Import Nilai & Cetak Rapor (Admin)',
                content: (
                    <ul className="list-disc pl-5 space-y-1.5 text-sm mt-1">
                        <li>Admin menerima salinan kode hasil input guru (diawali kode aman <code>RAPOR_V2_START</code>).</li>
                        <li>Tempelkan (Paste) di menu <strong>Akademik &gt; Import Nilai</strong>.</li>
                        <li>Buka tab <strong>Cetak Rapor</strong> untuk mencetak rapor fisik siswa (PDF) lengkap dengan layout tanda tangan wali kelas & kepala madrasah.</li>
                    </ul>
                )
            },
             {
                title: '6. Monitoring Kelengkapan Nilai',
                content: (
                     <>
                        <p className="text-sm mb-1">Fitur ini membantu Admin memantau progres nilai tiap rombel secara real-time:</p>
                        <ul className="list-disc pl-5 space-y-1 text-sm">
                            <li>Buka menu <strong>Akademik &gt; Monitoring</strong>.</li>
                            <li><span className="text-green-600 font-bold">Hijau</span> = Nilai Lengkap (Semua Santri sudah ada nilainya).</li>
                            <li><span className="text-amber-600 font-bold">Kuning</span> = Sebagian nilai sudah masuk.</li>
                            <li><span className="text-red-600 font-bold">Merah</span> = Belum ada data nilai masuk.</li>
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
                            <li><strong>Wajib Sync Cloud:</strong> Data keuangan adalah data vital. Sinkronisasi ke Dropbox atau <strong>Firebase</strong> memastikan data aman dan selalu ter-backup di cloud.</li>
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
            },
            {
                title: 'Buku Kas Umum (Filter, Preset, Ekspor)',
                content: (
                    <div className="space-y-2 text-sm">
                        <p>Modul <strong>Buku Kas</strong> adalah buku besar kas pondok untuk memantau arus masuk/keluar dan posisi saldo aktual harian.</p>
                        <p className="text-xs text-gray-600">Tujuan utamanya: memastikan uang fisik, transaksi kasir, dan laporan bendahara tetap sinkron.</p>
                        <ol className="list-decimal pl-5 space-y-1 bg-gray-50 p-2 rounded">
                            <li>Gunakan preset tanggal cepat: <strong>Hari Ini</strong>, <strong>7 Hari</strong>, atau <strong>30 Hari</strong>.</li>
                            <li>Gunakan <strong>Reset Filter</strong> untuk kembali ke tampilan netral.</li>
                            <li>Filter transaksi dengan kombinasi <strong>Tanggal</strong>, <strong>Jenis</strong>, dan <strong>Kategori</strong>.</li>
                            <li>Ekspor hasil sesuai filter aktif via tombol <strong>CSV</strong> atau <strong>Excel</strong>.</li>
                        </ol>
                        <p className="text-xs text-gray-600">Catatan: file ekspor mengikuti data yang sedang tersaring, bukan seluruh transaksi.</p>
                    </div>
                )
            },
            {
                title: 'Hubungan Buku Kas dengan Modul Keuangan Utama',
                color: 'teal',
                content: (
                    <div className="space-y-3 text-sm">
                        <div className="bg-teal-50 p-3 rounded border border-teal-200">
                            <p className="font-semibold text-teal-800 mb-1">Alur data antar modul</p>
                            <ol className="list-decimal pl-5 space-y-1 text-teal-900">
                                <li><strong>Status Pembayaran:</strong> pembayaran santri tercatat lebih dulu sebagai transaksi operasional.</li>
                                <li><strong>Setoran Kas:</strong> transaksi yang sudah divalidasi dipindahkan ke Buku Kas sebagai pemasukan resmi.</li>
                                <li><strong>Penggajian:</strong> posting payroll menambahkan pengeluaran otomatis ke Buku Kas.</li>
                                <li><strong>Buku Kas:</strong> menjadi titik kontrol akhir saldo kas pondok.</li>
                            </ol>
                        </div>
                        <div className="bg-gray-50 p-3 rounded border border-gray-200">
                            <p className="font-semibold mb-1">SOP ringkas bendahara</p>
                            <ul className="list-disc pl-5 space-y-1">
                                <li>Pagi: cek saldo akhir Buku Kas sebagai saldo awal kerja.</li>
                                <li>Siang/Sore: lakukan <strong>Setoran Kas</strong> untuk transaksi kasir/pembayaran yang sudah valid.</li>
                                <li>Akhir hari: cocokkan saldo Buku Kas dengan uang fisik/laporan transfer.</li>
                                <li>Akhir pekan: ekspor CSV/Excel berdasarkan periode untuk arsip dan pelaporan pengurus.</li>
                            </ul>
                        </div>
                    </div>
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
                             <li><strong>Hybrid (Google Sheet + WA Backup):</strong> Form pendaftaran mengirim data ke Google Sheet/Drive sekaligus menyiapkan backup notifikasi ke WhatsApp admin.</li>
                             <li><strong>Upload Berkas:</strong> Berkas yang diunggah pendaftar otomatis direname ke pola <code>dokumen-nama-santri-waktu.[ext]</code> agar arsip lebih rapi.</li>
                             <li><strong>Desain Formulir:</strong> Buat formulir pendaftaran custom di menu <em>Desain Formulir Online</em>.</li>
                             <li><strong>Smart Script:</strong> Jika menggunakan Google Spreadsheet, Anda cukup menggunakan satu script untuk banyak jenis formulir.</li>
                             <li><strong>Catatan Multi Formulir:</strong> Form bisa lebih dari satu, tetapi sinkron rekap Google Sheet membaca URL GAS aktif global. Untuk operasional paling stabil, gunakan <strong>satu GAS utama</strong> dan bedakan data per <code>sheetName</code>.</li>
                             <li><strong>Metode WhatsApp:</strong> Multi formulir tetap bisa via copy-paste kode <code>PSB_START...PSB_END</code> atau <code>PSB_BACKUP_START...PSB_BACKUP_END</code> ke menu Impor WA.</li>
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
        title: 'Mode Offline & Unduh Cache Lengkap',
        steps: [
            {
                title: 'Teknologi Offline-First & Service Worker',
                content: (
                    <div className="bg-cyan-50 p-4 rounded-lg border-l-4 border-cyan-500 text-sm text-cyan-950 space-y-2">
                        <p>
                            Aplikasi eSantri Web dibangun dengan prinsip <strong>Offline-First PWA (Progressive Web App)</strong>. 
                            Seluruh basis data disimpan lokal di browser (IndexedDB) sehingga Anda dapat bekerja dengan kecepatan maksimal tanpa bergantung pada koneksi internet.
                        </p>
                        <p className="text-xs text-cyan-800">
                            Fitur <strong>Dynamic Asset Discovery</strong> secara otomatis mendeteksi dan mengunduh seluruh berkas aplikasi (Javascript bundle, stylesheet CSS, Google Fonts, Bootstrap Icons, dan manifest) ke dalam cache browser.
                        </p>
                    </div>
                )
            },
            {
                title: 'Cara Mengunduh Cache untuk Pemakaian Offline Penuh',
                content: (
                    <ol className="list-decimal pl-5 space-y-1.5 text-sm mt-1">
                        <li>Pastikan koneksi internet Anda aktif dan stabil.</li>
                        <li>Masuk ke menu <strong>Pengaturan &gt; Umum</strong>.</li>
                        <li>Lihat panel <em>Status Cache & Mode Offline</em> di bagian atas.</li>
                        <li>Klik tombol <strong>"Unduh Aset Offline"</strong>.</li>
                        <li>Sistem akan memindai seluruh skrip, font, dan ikon lalu menyimpannya ke cache. Tunggu hingga status menampilkan <span className="text-green-600 font-bold"><i className="bi bi-check-circle-fill"></i> Siap Offline (100%)</span>.</li>
                        <li>Setelah selesai, aplikasi dapat diakses kapan saja tanpa koneksi internet sama sekali.</li>
                    </ol>
                )
            },
            {
                title: 'Instalasi Aplikasi (Desktop & Android)',
                content: (
                    <ul className="list-disc pl-5 space-y-1 text-sm mt-1">
                        <li>Di menu <strong>Pengaturan &gt; Umum</strong>, klik tombol <strong>"Install Aplikasi (PWA)"</strong>.</li>
                        <li>Atau, klik ikon instal di bilah alamat browser (Google Chrome, Microsoft Edge, atau browser Android).</li>
                        <li>Aplikasi akan terpasang di Homescreen / Desktop dan dapat dibuka layaknya aplikasi native tanpa address bar browser.</li>
                    </ul>
                )
            },
            {
                title: 'Kapan Saja Internet Dibutuhkan?',
                color: 'red',
                content: (
                    <div className="bg-red-50 p-3 rounded border border-red-200 text-sm">
                        Meskipun aplikasi 100% offline-ready untuk operasional harian, internet tetap dibutuhkan saat:
                        <ul className="list-disc pl-5 mt-1 font-semibold text-red-800 space-y-1 text-xs">
                            <li>Sinkronisasi Cloud Realtime (Firebase / Dropbox / WebDAV).</li>
                            <li>Mengarahkan pesan broadcast WhatsApp ke WhatsApp Web.</li>
                            <li>Menerima pendaftaran online santri baru dari Google Sheets (PSB).</li>
                            <li>Menghasilkan draf surat dengan bantuan AI (Magic Draft).</li>
                        </ul>
                    </div>
                )
            }
        ]
    },
    {
        id: 'maintenance',
        badge: 'NEW',
        badgeColor: 'red',
        title: 'Pemeliharaan & Diagnosa Sistem',
        steps: [
            {
                title: 'Mengapa Perlu Diagnosa?',
                content: (
                    <div className="bg-red-50 p-4 rounded-lg border-l-4 border-red-500 text-sm text-gray-700 space-y-3">
                        <p>
                            Database lokal (IndexedDB) di browser bersifat sangat cepat namun rentan terhadap interupsi. 
                            <strong>Diagnosa Sistem</strong> membantu Anda mendeteksi ketidakkonsistenan data yang disebabkan oleh:
                        </p>
                        <ul className="list-disc pl-5 space-y-1 text-xs">
                            <li>Browser atau Laptop mati mendadak saat proses simpan/sync.</li>
                            <li>Pembersihan cache browser yang tidak sempurna.</li>
                            <li>Bug pada versi aplikasi lama yang meninggalkan data "yatim".</li>
                        </ul>
                    </div>
                )
            },
            {
                title: 'Siapa yang Bertugas?',
                content: (
                    <div className="bg-gray-50 p-3 rounded border text-sm">
                        <p>Fitur ini adalah <strong>Alat Admin (IT Tools)</strong>. Hanya Admin Utama atau Bagian IT yang disarankan menjalankan fitur ini.</p>
                        <p className="mt-2 text-xs italic text-red-600 font-bold">WARNING: Selalu lakukan "Unduh Cadangan Data" (Backup) di tab Backup sebelum menjalankan perbaikan otomatis.</p>
                    </div>
                )
            },
            {
                title: 'Penjelasan Tindakan Auto-Fix',
                content: (
                    <div className="space-y-4">
                        <div className="bg-white p-3 rounded border shadow-sm">
                            <h4 className="font-bold text-teal-700 text-xs uppercase mb-1">1. Perbaiki Saldo (Integritas Data)</h4>
                            <p className="text-[11px]">Sistem mendeteksi santri yang tidak punya catatan saldo (biasanya karena gagal sinkronisasi). <br/><strong>Efek:</strong> Akan dibuatkan saldo Rp 0 agar fitur keuangan santri tersebut bisa digunakan kembali.</p>
                        </div>
                        <div className="bg-white p-3 rounded border shadow-sm">
                            <h4 className="font-bold text-orange-700 text-xs uppercase mb-1">2. Re-Index Data (Kinerja Cloud)</h4>
                            <p className="text-[11px]">Menambahkan timestamp sinkronisasi pada data-data versi lama. <br/><strong>Efek:</strong> Data lama akan diunggah ulang ke Cloud pada sinkronisasi berikutnya untuk memastikan data Cloud & Lokal seragam.</p>
                        </div>
                        <div className="bg-white p-3 rounded border shadow-sm">
                            <h4 className="font-bold text-red-700 text-xs uppercase mb-1">3. Bersihkan Orphan (Kerapihan Database)</h4>
                            <p className="text-[11px]">Menghapus transaksi yang kodenya merujuk ke santri yang sudah dihapus selamanya. <br/><strong>Efek:</strong> Database menjadi lebih ringan dan bersih dari data "hantu".</p>
                        </div>
                    </div>
                )
            }
        ]
    },
    {
        id: 'fitur',
        badge: 15,
        badgeColor: 'teal',
        title: 'Daftar Fitur Utama',
        steps: [
            {
                title: 'Manajemen Data & Akademik',
                content: (
                    <ul className="list-disc pl-5 space-y-1 text-sm">
                        <li><strong>Dashboard Operasional:</strong> ringkasan cepat statistik pondok dan indikator utama aktivitas harian.</li>
                        <li><strong>Data Santri:</strong> Profil lengkap, riwayat status, prestasi, dan pelanggaran.</li>
                        <li><strong>Akademik:</strong> Manajemen Marhalah, Kelas, Rombel, Mata Pelajaran, dan Jadwal Pelajaran.</li>
                        <li><strong>Absensi:</strong> Pencatatan kehadiran harian santri per rombel.</li>
                        <li><strong>Jurnal Mengajar:</strong> Catatan materi/agenda kelas harian guru dan monitoring progres pembelajaran.</li>
                        <li><strong>Tahfizh:</strong> Setoran hafalan (Ziyadah/Murojaah) dengan target per juz/surah.</li>
                        <li><strong>Rapor Dinamis:</strong> Desain format rapor sendiri dengan sistem Grid & Formula.</li>
                    </ul>
                )
            },
            {
                title: 'Keuangan & Operasional',
                content: (
                    <ul className="list-disc pl-5 space-y-1 text-sm">
                        <li><strong>Keuangan:</strong> Manajemen tagihan (SPP/Uang Pangkal), pembayaran, dan penggajian guru.</li>
                        <li><strong>Buku Kas:</strong> Pencatatan arus kas masuk/keluar pondok (Buku Kas Umum).</li>
                        <li><strong>Koperasi & Kantin:</strong> Sistem kasir (POS) sederhana dengan stok barang dan parkir pesanan.</li>
                        <li><strong>Sarana Prasarana:</strong> Inventaris barang, lokasi, dan kondisi aset pondok.</li>
                    </ul>
                )
            },
            {
                title: 'Layanan & Keamanan',
                content: (
                    <ul className="list-disc pl-5 space-y-1 text-sm">
                        <li><strong>Keasramaan:</strong> Manajemen gedung asrama, kamar, dan penempatan santri.</li>
                        <li><strong>Kesehatan & BK:</strong> Rekam medis santri dan bimbingan konseling (privat).</li>
                        <li><strong>Perpustakaan:</strong> Katalog buku, sirkulasi peminjaman, dan cetak label buku.</li>
                        <li><strong>Buku Tamu:</strong> Pencatatan kunjungan tamu dan pengawasan keamanan.</li>
                        <li><strong>WhatsApp Center:</strong> Broadcast pesan massal ke wali santri untuk tagihan, pengumuman, dan laporan.</li>
                        <li><strong>Surat Menyurat:</strong> Pembuatan surat resmi, tagihan, dan arsip digital.</li>
                        <li><strong>Log Aktivitas (Audit):</strong> Jejak perubahan data oleh user untuk kontrol dan evaluasi.</li>
                    </ul>
                )
            },
            {
                title: 'Teknologi & Integrasi',
                color: 'purple',
                content: (
                    <ul className="list-disc pl-5 space-y-1 text-sm">
                        <li><strong>Offline-First:</strong> Aplikasi tetap berjalan lancar tanpa internet.</li>
                        <li><strong>Firebase Sync:</strong> Sinkronisasi data real-time antar perangkat (Multi-User) dengan database cloud yang aman.</li>
                        <li><strong>Cloud Sync (Dropbox/WebDAV):</strong> Backup data dan kolaborasi tim menggunakan penyimpanan awan pribadi.</li>
                        <li><strong>Portal Wali Santri:</strong> Akses informasi santri (Nilai, Absen, Keuangan) bagi orang tua secara online.</li>
                        <li><strong>Multi-Platform:</strong> Tersedia dalam versi Web, Desktop (Tauri), dan Android.</li>
                    </ul>
                )
            }
        ]
    },
    {
        id: 'laporan_lanjutan',
        badge: 'UPDATE',
        badgeColor: 'indigo',
        title: 'Modul Laporan & Cetak Kartu Santri',
        steps: [
            {
                title: 'Cetak Kartu Santri & ID Card Vertikal (Auto-Fit Font & Presisi)',
                color: 'teal',
                content: (
                    <div className="space-y-3 text-sm">
                        <div className="bg-teal-50 p-3.5 rounded-lg border border-teal-200 text-xs text-teal-950 space-y-2">
                            <h5 className="font-bold flex items-center gap-1.5"><i className="bi bi-person-badge text-teal-700"></i> Desain Kartu Identitas Santri Modern</h5>
                            <p>Modul Laporan & Identitas mendukung pembuatan Kartu Santri (Landscape 2 Muka) dan Kartu ID Santri Vertikal (Portrait) siap cetak.</p>
                        </div>
                        <ul className="list-disc pl-5 space-y-1.5 text-xs text-gray-700">
                            <li>
                                <strong>Ukuran Font Dinamis (Anti-Elipsis):</strong> Judul dan nama lembaga secara otomatis menyesuaikan ukuran font (dinamis) sehingga tidak akan terpotong (...) meskipun nama pesantren sangat panjang.
                            </li>
                            <li>
                                <strong>Tata Letak Tata Tertib Bersih:</strong> Pada kartu vertikal, teks tata tertib diposisikan secara presisi di bawah margin latar merah header sehingga kontras keterbacaan sempurna.
                            </li>
                            <li>
                                <strong>Penempatan Presisi Barcode / QR Code & Nomor Seri:</strong> Nomor seri unik dan barcode/QR diletakkan di slot khusus muka belakang tanpa menumpuk atau menutupi teks header.
                            </li>
                            <li>
                                <strong>Layout Cetak Massal:</strong> Mendukung cetak otomatis per rombel atau seluruh santri dalam format kertas standar A4 dengan batas potong (cutting marks).
                            </li>
                        </ul>
                    </div>
                )
            },
            {
                title: 'Daftar Laporan & Fungsinya',
                content: (
                    <ul className="list-disc pl-5 space-y-1 text-sm">
                        <li><strong>Laporan Santri & Identitas:</strong> daftar santri, buku induk, kartu santri, kelengkapan data, dan arsip status.</li>
                        <li><strong>Laporan Akademik:</strong> rekap nilai, rapor, jurnal mengajar, progres pembelajaran, dan dokumen pendukung kelas.</li>
                        <li><strong>Laporan Tahfizh:</strong> mutaba’ah setoran, progres hafalan per santri, dan ringkasan capaian per rombel.</li>
                        <li><strong>Laporan Absensi & Kedisiplinan:</strong> rekap hadir/izin/sakit/alfa per periode dan ringkasan kedisiplinan kelas.</li>
                        <li><strong>Laporan Keuangan:</strong> tunggakan, status pembayaran, arus kas, payroll, uang saku, dan ringkasan setoran.</li>
                        <li><strong>Laporan PSB:</strong> rekap pendaftar, status seleksi, efektivitas funnel, serta arsip formulir/berkas.</li>
                        <li><strong>Laporan Sarpras & Aset:</strong> daftar inventaris, kondisi aset, aset bergerak, dan ringkasan valuasi.</li>
                        <li><strong>Laporan Administratif:</strong> buku tamu, surat menyurat, dan dokumen administrasi operasional.</li>
                        <li><strong>Snapshot Operasional Harian:</strong> ringkasan 1 halaman untuk pimpinan (absensi, layanan, kas, dan PSB harian).</li>
                        <li><strong>Early Warning Santri:</strong> deteksi dini santri berisiko dari kombinasi absensi, BK, kesehatan, dan tunggakan.</li>
                        <li><strong>Perkembangan Tahfizh:</strong> rekap total setoran dan persentase kelancaran per santri.</li>
                        <li><strong>Kinerja Pengajar:</strong> ringkasan performa berdasarkan jurnal mengajar yang terisi.</li>
                        <li><strong>Kelas/Asrama Bermasalah:</strong> peringkat rombel/gedung dengan indikator masalah tertinggi.</li>
                        <li><strong>Cohort Santri:</strong> retensi dan outcome santri berdasarkan tahun masuk.</li>
                        <li><strong>Kepatuhan Administrasi:</strong> daftar santri yang data intinya belum lengkap.</li>
                        <li><strong>Efektivitas PSB:</strong> funnel status pendaftar dan distribusi jalur/gelombang.</li>
                    </ul>
                )
            },
            {
                title: 'Cara Pakai Cepat',
                content: (
                    <ol className="list-decimal pl-5 space-y-1 text-sm bg-gray-50 p-3 rounded border border-gray-200">
                        <li>Buka menu <strong>Laporan</strong>, pilih kategori laporan yang dibutuhkan.</li>
                        <li>Gunakan filter Marhalah/Kelas/Rombel untuk laporan berbasis santri (misalnya Early Warning atau Tahfizh).</li>
                        <li>Klik <strong>Tampilkan Preview</strong> untuk melihat hasil.</li>
                        <li>Untuk hasil paling presisi, gunakan <strong>Unduh &gt; PDF Visual (Akurat)</strong> atau <strong>Cetak</strong> lalu pilih Save as PDF.</li>
                    </ol>
                )
            },
            {
                title: 'Catatan Interpretasi',
                color: 'orange',
                content: (
                    <div className="bg-orange-50 p-3 rounded border border-orange-200 text-sm text-orange-900">
                        Laporan strategis bersifat <strong>indikatif</strong> untuk membantu prioritas pembinaan. Keputusan final tetap perlu musyawarah tim pengasuhan, wali kelas, dan pimpinan pondok.
                    </div>
                )
            }
        ]
    },
    {
        id: 'whatsapp',
        badge: 'NEW',
        badgeColor: 'green',
        title: 'Smart WhatsApp Automation',
        steps: [
            {
                title: 'Konsep & Cara Kerja',
                content: (
                    <div className="bg-green-50 p-4 rounded-lg border-l-4 border-green-500 text-sm text-gray-700 space-y-3">
                        <p>
                            <strong>Komunikasi Efektif:</strong> Fitur ini memungkinkan Anda mengirimkan pesan otomatis ke wali santri tanpa harus mengetik ulang atau menyimpan nomor satu per satu.
                        </p>
                        <p>
                            <strong>Metode Semi-Otomatis (Redirect):</strong> Aplikasi menyusun pesan cerdas (menggunakan variabel), lalu mengarahkan Anda ke WhatsApp Web/Desktop. Anda tinggal menekan tombol <em>Send</em>. Metode ini 100% aman karena tidak menggunakan API ilegal yang berisiko blokir.
                        </p>
                        <p>
                            <strong>Indikator WA Redirect Ready:</strong> Menunjukkan perangkat Anda sedang online dan siap membuka redirect WhatsApp. Jika offline, tombol kirim akan dinonaktifkan.
                        </p>
                    </div>
                )
            },
            {
                title: 'Penggunaan Template Cerdas',
                content: (
                    <div className="space-y-2">
                        <p className="text-sm font-medium text-gray-800">Anda dapat menggunakan variabel di dalam pesan agar teks berubah otomatis sesuai data santri:</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div className="bg-white p-2 border rounded text-xs">
                                <code className="text-teal-600">[nama_santri]</code>
                                <p className="text-gray-500 mt-1">Nama lengkap santri.</p>
                            </div>
                            <div className="bg-white p-2 border rounded text-xs">
                                <code className="text-teal-600">[ortu]</code>
                                <p className="text-gray-500 mt-1">Nama Ayah atau Ibu santri.</p>
                            </div>
                            <div className="bg-white p-2 border rounded text-xs">
                                <code className="text-teal-600">[nominal]</code>
                                <p className="text-gray-500 mt-1">Nilai uang (misal: Tagihan/Saldo).</p>
                            </div>
                            <div className="bg-white p-2 border rounded text-xs">
                                <code className="text-teal-600">[bulan]</code>
                                <p className="text-gray-500 mt-1">Nama bulan saat ini.</p>
                            </div>
                        </div>
                    </div>
                )
            },
            {
                title: 'Broadcast / Pengiriman Massal',
                content: (
                    <ol className="list-decimal pl-5 space-y-2 text-sm mt-1 bg-gray-50 p-3 rounded border">
                        <li>Buka menu <strong>WhatsApp Center</strong>.</li>
                        <li>Pilih <strong>Template Pesan</strong> atau ketik pesan kustom.</li>
                        <li>Gunakan <strong>Filter</strong> (Marhalah, Kelas, Rombel) di bagian atas tabel untuk mempersempit target penerima.</li>
                        <li>Centang santri yang akan dikirimi pesan (atau centang header untuk pilih semua yang tampil).</li>
                        <li>Klik tombol <strong>Kirim Ke [X] Santri</strong> di pojok kanan atas.</li>
                        <li>Sistem akan membuka tab WhatsApp satu per satu. Anda cukup klik <strong>Send</strong> di setiap jendela yang terbuka.</li>
                        <li>Untuk pengumuman umum atau grup, gunakan menu <strong>Siaran Umum / Grup</strong> lalu klik <strong>Buka Composer WA</strong>.</li>
                    </ol>
                )
            }
        ]
    },
    {
        id: 'koperasi_pro',
        badge: 'NEW',
        badgeColor: 'blue',
        title: 'Koperasi Profesional (Warehouse & Vendor)',
        steps: [
            {
                title: 'Multi-Warehouse (Gudang)',
                content: (
                    <div className="space-y-3">
                        <p className="text-sm text-gray-700">Filter ini memungkinkan koperasi pondok mengelola stok di berbagai lokasi (misal: Toko Atas, Toko Bawah, Gudang Utama).</p>
                        <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 text-xs text-blue-800">
                            <strong>Penting:</strong> Setiap mutasi barang (Stok Masuk/Rusak) wajib memilih gudang tujuan agar data sebaran stok tetap akurat.
                        </div>
                        <ul className="list-disc pl-5 text-sm space-y-1">
                            <li><strong>Tambah Gudang:</strong> Masukkan kode dan nama gudang di tab <em>Gudang</em>.</li>
                            <li><strong>Sebaran Stok:</strong> Di form produk, tab <em>Stok Per Gudang</em> menampilkan jumlah barang di tiap lokasi.</li>
                            <li><strong>Transfer Stok:</strong> Gunakan tombol <em>Transfer Stok</em> untuk memindahkan barang antar gudang tanpa mengubah total stok sistem.</li>
                        </ul>
                    </div>
                )
            },
            {
                title: 'Vendor Management',
                content: (
                    <div className="space-y-3">
                        <p className="text-sm text-gray-700">Kelola database pemasok barang secara profesional lengkap dengan data legalitas dan kategori.</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="bg-white p-3 border rounded-lg shadow-sm">
                                <h5 className="font-bold text-xs mb-1 text-teal-700">Kategori Vendor</h5>
                                <p className="text-[11px] text-gray-500">Grupkan vendor berdasarkan apa yang mereka pasok (misal: Alat Tulis, Konveksi, Sembako).</p>
                            </div>
                            <div className="bg-white p-3 border rounded-lg shadow-sm">
                                <h5 className="font-bold text-xs mb-1 text-teal-700">Status Vendor</h5>
                                <p className="text-[11px] text-gray-500">Filter vendor aktif atau non-aktif untuk menjaga kualitas rantai pasok pondok.</p>
                            </div>
                        </div>
                    </div>
                )
            }
        ]
    }
];
