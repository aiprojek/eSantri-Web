import React from 'react';
import { PanduanSectionData } from '../panduan';

export const pusatSyncPanduan: PanduanSectionData = {
    id: 'pusat_sync',
    badge: 'UPDATE',
    badgeColor: 'teal',
    title: 'Pusat Sinkronisasi, Resolusi Konflik & Kontrol Firebase',
    steps: [
        {
            title: '1. Ikhtisar Operasional: Mode Hub-and-Spoke (Dropbox/WebDAV) vs Status Firebase (Real-Time Hub)',
            color: 'teal',
            content: (
                <div className="space-y-3.5 text-sm text-gray-700">
                    <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-950 text-xs flex items-start gap-2.5">
                        <i className="bi bi-shield-check text-amber-600 shrink-0 text-base mt-0.5"></i>
                        <div>
                            <strong className="font-bold text-amber-900 block mb-0.5">Hak Akses &amp; Delegasi Wewenang Admin Pengepul (syncAdmin):</strong>
                            Menu <strong>Pusat Sync</strong> di sidebar secara otomatis menyesuaikan tampilannya berdasarkan penyedia Cloud yang aktif di <em>Pengaturan &gt; Sync Cloud</em>. Selain <strong>Super Admin</strong>, akses ke halaman ini juga dapat didelegasikan kepada kepala tata usaha atau operator koordinator dengan mengaktifkan izin <strong>&quot;Admin Pengepul (Sync)&quot;</strong> pada menu <em>Pengaturan &gt; User &amp; Keamanan</em>.
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                        {/* Mode Hub and Spoke */}
                        <div className="p-3.5 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-2">
                            <div className="flex items-center justify-between border-b border-indigo-200/70 pb-1.5">
                                <h5 className="font-bold text-indigo-900 flex items-center gap-1.5 text-xs">
                                    <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-black">A</span>
                                    Mode Hub &amp; Spoke (Dropbox / Nextcloud WebDAV)
                                </h5>
                                <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-[10px] font-bold uppercase">Pusat Sync</span>
                            </div>
                            <p className="text-[11px] text-gray-600 leading-relaxed">
                                Digunakan ketika pesantren mengandalkan penyimpanan awan berbasis berkas (<em>File-Based Sync</em>). Menu di sidebar akan bernama <strong>Pusat Sync</strong>.
                            </p>
                            <ul className="list-disc pl-4 space-y-1 text-[11px] text-gray-600 leading-relaxed">
                                <li><strong>Perangkat Staff (Spoke):</strong> Menekan tombol <em>Setor Data</em> di pojok kanan atas untuk mengirim paket perubahan (<code>.json</code>) ke folder <code>/inbox</code> di Cloud.</li>
                                <li><strong>Komputer Admin Pengepul (Hub):</strong> Membuka <strong>Pusat Sync</strong> untuk meninjau kiriman staff, menyelesaikan konflik jika ada, menggabungkannya ke database induk, lalu menekan <strong>Publikasikan Master</strong>.</li>
                            </ul>
                        </div>

                        {/* Mode Firebase Realtime */}
                        <div className="p-3.5 bg-teal-50/70 border border-teal-200 rounded-xl space-y-2">
                            <div className="flex items-center justify-between border-b border-teal-200/70 pb-1.5">
                                <h5 className="font-bold text-teal-900 flex items-center gap-1.5 text-xs">
                                    <span className="w-5 h-5 rounded-full bg-teal-600 text-white flex items-center justify-center text-[10px] font-black">B</span>
                                    Mode Cloud Real-Time (Firebase Firestore)
                                </h5>
                                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase">Status Firebase</span>
                            </div>
                            <p className="text-[11px] text-gray-600 leading-relaxed">
                                Digunakan ketika pesantren mengaktifkan database <em>Firebase Firestore</em>. Menu di sidebar otomatis berubah menjadi <strong>Status Firebase</strong>.
                            </p>
                            <ul className="list-disc pl-4 space-y-1 text-[11px] text-gray-600 leading-relaxed">
                                <li><strong>Sinkronisasi Otomatis Detik Itu Juga:</strong> Tidak perlu lagi menggabungkan file inbox satu per satu karena setiap perubahan langsung mengalir antar perangkat.</li>
                                <li><strong>Pusat Kontrol &amp; Diagnostik:</strong> Halaman ini berfungsi untuk memantau status koneksi Hub/Spoke, <em>Tenant ID</em>, jumlah dokumen aktif, serta menjalankan <strong>Tarik Paksa / Unggah Paksa / Sinkronisasi PSB</strong>.</li>
                            </ul>
                        </div>
                    </div>
                </div>
            )
        },
        {
            title: '2. SOP 5 Langkah Harian Admin Pengepul (Mode Hub & Spoke: Dropbox / WebDAV)',
            color: 'indigo',
            content: (
                <div className="space-y-3 text-sm text-gray-700">
                    <p className="leading-relaxed text-xs">
                        Agar seluruh data yang diinput oleh ustadz, wali kelas, kasir, maupun musyrif asrama tergabung secara utuh tanpa saling menimpa, ikuti alur kerja baku 5 langkah berikut di komputer Admin Pengepul:
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5 text-xs">
                        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-1">
                            <span className="w-6 h-6 rounded-lg bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs mb-1">1</span>
                            <strong className="text-slate-800 block">Segarkan Inbox</strong>
                            <p className="text-[11px] text-gray-600 leading-relaxed">
                                Klik tombol <strong>Segarkan Inbox</strong> di kanan atas untuk memuat daftar kiriman terbaru dari folder Cloud.
                            </p>
                        </div>
                        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-1">
                            <span className="w-6 h-6 rounded-lg bg-teal-100 text-teal-700 font-bold flex items-center justify-center text-xs mb-1">2</span>
                            <strong className="text-slate-800 block">Intip Rincian</strong>
                            <p className="text-[11px] text-gray-600 leading-relaxed">
                                Klik tombol <strong>Rincian</strong> pada baris file untuk memverifikasi pengirim dan tabel modul apa saja yang diubah.
                            </p>
                        </div>
                        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-1">
                            <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center text-xs mb-1">3</span>
                            <strong className="text-slate-800 block">Gabung Data</strong>
                            <p className="text-[11px] text-gray-600 leading-relaxed">
                                Klik <strong>Gabung</strong> per baris atau <strong>Gabung Semua</strong> untuk memadukan data staff ke database lokal Admin.
                            </p>
                        </div>
                        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-1">
                            <span className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs mb-1">4</span>
                            <strong className="text-slate-800 block">Publikasikan Master</strong>
                            <p className="text-[11px] text-gray-600 leading-relaxed">
                                <strong>Wajib</strong> klik tombol biru <strong>Publikasikan Master</strong> agar seluruh staff lain dapat menarik data gabungan terbaru.
                            </p>
                        </div>
                        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-1">
                            <span className="w-6 h-6 rounded-lg bg-amber-100 text-amber-700 font-bold flex items-center justify-center text-xs mb-1">5</span>
                            <strong className="text-slate-800 block">Bersihkan Inbox</strong>
                            <p className="text-[11px] text-gray-600 leading-relaxed">
                                Hapus file yang berstatus <em>Sudah Digabung</em> secara berkala agar kuota penyimpanan Cloud tetap lega.
                            </p>
                        </div>
                    </div>

                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-950 flex items-center gap-2.5">
                        <i className="bi bi-megaphone-fill text-amber-600 text-base shrink-0"></i>
                        <span>
                            <strong>Banner Pengingat Otomatis:</strong> Setiap kali Anda selesai menggabungkan file staff, sistem akan menampilkan banner pengingat kuning di bagian atas halaman hingga Anda menekan tombol <strong>Publikasikan Master</strong>.
                        </span>
                    </div>
                </div>
            )
        },
        {
            title: '3. Fitur Inspeksi Isi File ("Rincian") & Penggabungan Massal ("Gabung Semua")',
            color: 'blue',
            content: (
                <div className="space-y-3 text-sm text-gray-700">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs space-y-2">
                            <h5 className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                                <i className="bi bi-eye-fill text-teal-600"></i> Inspeksi Paket Sebelum Merge (Tombol &quot;Rincian&quot;)
                            </h5>
                            <p className="text-[11px] text-gray-600 leading-relaxed">
                                Sebelum menggabungkan kiriman staff, Anda dapat mengeklik tombol <strong>Rincian</strong> untuk membuka jendela pratinjau isi paket:
                            </p>
                            <ul className="list-disc pl-4 space-y-1 text-[11px] text-gray-600">
                                <li>Menampilkan identitas <strong>Pengirim</strong> dan <strong>Waktu Paket Dibuat</strong>.</li>
                                <li>Menampilkan jenis sinkronisasi: <em>Inkremental (Hanya Perubahan)</em> atau <em>Salinan Penuh (Full Sync)</em>.</li>
                                <li>Menampilkan <strong>Rincian Tabel yang Diubah</strong> beserta jumlah baris data per modul (misal: <em>Data Santri: 12 data</em>, <em>Absensi Santri: 45 data</em>).</li>
                            </ul>
                        </div>

                        <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs space-y-2">
                            <h5 className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                                <i className="bi bi-collection-play-fill text-emerald-600"></i> Penggabungan Berurutan Otomatis (&quot;Gabung Semua&quot;)
                            </h5>
                            <p className="text-[11px] text-gray-600 leading-relaxed">
                                Jika terdapat lebih dari 1 file berstatus <strong>Baru</strong> di Inbox, tombol hijau <strong>Gabung Semua (N)</strong> akan muncul di header:
                            </p>
                            <ul className="list-disc pl-4 space-y-1 text-[11px] text-gray-600">
                                <li><strong>Urutan Kronologis (FIFO):</strong> Sistem otomatis mengurutkan dan menggabungkan file dari yang <em>paling awal dikirim</em> hingga yang <em>paling baru</em> agar kronologi perubahan data akurat.</li>
                                <li><strong>Jeda Otomatis Saat Konflik:</strong> Jika pada salah satu file terdeteksi konflik data dengan komputer Admin, antrean otomatis berhenti sejenak dan menampilkan jendela <em>Resolusi Konflik</em>.</li>
                            </ul>
                        </div>
                    </div>
                </div>
            )
        },
        {
            title: '4. Panduan Resolusi Konflik Multi-Tabel (Local vs Staff vs Mix & Match)',
            color: 'purple',
            content: (
                <div className="space-y-3 text-sm text-gray-700">
                    <p className="leading-relaxed text-xs">
                        Konflik terjadi apabila <strong>rekaman yang sama</strong> (misalnya biodata santri yang sama atau tagihan yang sama) telah diubah di komputer Admin pada waktu yang lebih baru dibandingkan paket yang dikirim oleh staff. Sistem memindai <strong>seluruh tabel sekaligus</strong> dalam satu file dan menampilkan modal perbandingan berdampingan:
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                        <div className="p-3.5 rounded-xl border border-blue-200 bg-blue-50/50 space-y-1.5">
                            <strong className="text-blue-900 flex items-center gap-1.5 font-bold">
                                <i className="bi bi-laptop text-blue-600"></i> 1. Gunakan Semua Data Lokal
                            </strong>
                            <p className="text-[11px] text-gray-600 leading-relaxed">
                                Mempertahankan 100% data yang saat ini ada di komputer Admin dan mengabaikan perubahan dari staff untuk item yang sedang ditampilkan.
                            </p>
                        </div>

                        <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/50 space-y-1.5">
                            <strong className="text-emerald-900 flex items-center gap-1.5 font-bold">
                                <i className="bi bi-cloud-check text-emerald-600"></i> 2. Gunakan Semua Data Staff
                            </strong>
                            <p className="text-[11px] text-gray-600 leading-relaxed">
                                Menerima penuh seluruh kolom pembaruan yang dikirim oleh staff dan menimpa versi lokal di komputer Admin untuk item tersebut.
                            </p>
                        </div>

                        <div className="p-3.5 rounded-xl border border-purple-200 bg-purple-50/50 space-y-1.5">
                            <strong className="text-purple-900 flex items-center gap-1.5 font-bold">
                                <i className="bi bi-stars text-purple-600"></i> 3. Mix &amp; Match (Per Kolom)
                            </strong>
                            <p className="text-[11px] text-gray-600 leading-relaxed">
                                Klik langsung kotak field tertentu di kolom kiri (Lokal) dan field lain di kolom kanan (Staff) untuk memilih nilai terbaik per baris, lalu klik <strong>Simpan Hasil Campuran</strong>.
                            </p>
                        </div>
                    </div>
                </div>
            )
        },
        {
            title: '5. Manajemen Kuota Cloud & Audit Riwayat Penggabungan',
            color: 'orange',
            content: (
                <div className="space-y-3 text-sm text-gray-700">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1.5">
                            <strong className="text-slate-900 flex items-center gap-1.5 font-bold">
                                <i className="bi bi-trash3-fill text-red-600"></i> Pembersihan File Inbox Cloud
                            </strong>
                            <p className="text-[11px] text-gray-600 leading-relaxed">
                                File yang sudah berstatus <span className="text-emerald-700 font-bold">Sudah Digabung</span> datanya telah tersimpan aman di database komputer Admin. Klik tombol <strong>&quot;Bersihkan yang Sudah Digabung&quot;</strong> untuk menghapus file-file lama tersebut dari folder Dropbox/WebDAV agar kuota penyimpanan Cloud tidak penuh.
                            </p>
                        </div>

                        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1.5">
                            <strong className="text-slate-900 flex items-center gap-1.5 font-bold">
                                <i className="bi bi-clock-history text-teal-600"></i> Tab Riwayat Penggabungan
                            </strong>
                            <p className="text-[11px] text-gray-600 leading-relaxed">
                                Mencatat jejak waktu penggabungan, nama pengirim, nama berkas, jumlah baris data yang masuk, serta akun Admin yang mengeksekusi penggabungan. Perhatian: jangan menekan <em>Bersihkan Log Riwayat</em> sebelum file yang sudah digabung dihapus dari Cloud agar file lama tidak terbaca sebagai &quot;Baru&quot; kembali.
                            </p>
                        </div>
                    </div>

                    <div className="p-3.5 bg-teal-50/80 border border-teal-200 rounded-xl text-xs text-teal-950 space-y-1.5">
                        <strong className="font-bold text-teal-900 flex items-center gap-1.5">
                            <i className="bi bi-shield-lock-fill text-teal-600 text-sm"></i> Proteksi Otomatis Data Lokal yang Lupa Disetor (Pemisahan Terakhir Setor vs Unduh Master):
                        </strong>
                        <p className="text-[11px] text-gray-700 leading-relaxed">
                            Apabila seorang staf (misal Admin Keuangan atau Wali Kelas) lupa menekan <strong>Setor Data</strong> di hari sebelumnya, sementara Admin Pusat sudah mempublikasikan Master Data baru dari staf lain, <strong>data lokal staf yang belum disetor dijamin 100% aman dan tidak akan tertimpa</strong> saat staf tersebut login keesokan harinya:
                        </p>
                        <ul className="list-disc pl-4 space-y-1 text-[11px] text-gray-700">
                            <li><strong>Pemisahan Penanda Waktu (Watermark):</strong> Sistem mencatat waktu <em>Terakhir Setor (Push)</em> dan <em>Terakhir Unduh Master (Pull)</em> secara terpisah di modal Sinkronisasi.</li>
                            <li><strong>Prioritas Data Lokal Belum Disetor:</strong> Saat <em>Auto-Pull Master</em> berjalan ketika login, sistem otomatis melindungi seluruh record lokal yang dimodifikasi setelah waktu setor terakhir dan tetap mempertahankannya di dalam antrean <strong>Perubahan Belum Disinkronkan</strong>.</li>
                            <li><strong>Pengingat Login &amp; Peringatan Logout:</strong> Sistem menampilkan notifikasi pengingat otomatis saat login serta peringatan konfirmasi saat hendak <em>Logout</em> apabila masih ada pekerjaan lokal yang belum disetor ke Cloud.</li>
                        </ul>
                    </div>
                </div>
            )
        },
        {
            title: '6. Panel Kontrol Cepat Mode Firebase Realtime (Tarik, Unggah & Sync PSB)',
            color: 'green',
            content: (
                <div className="space-y-3 text-sm text-gray-700">
                    <p className="leading-relaxed text-xs">
                        Apabila Anda menggunakan <strong>Firebase Realtime</strong>, halaman <strong>Status Firebase</strong> menyediakan 3 panel kontrol penyelarasan manual serta indikator ringkasan dokumen aktif:
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                        <div className="bg-white p-3.5 rounded-xl border border-blue-200 shadow-2xs space-y-1.5">
                            <strong className="text-blue-900 flex items-center gap-1.5 font-bold">
                                <i className="bi bi-cloud-arrow-down-fill text-blue-600"></i> Tarik Semua dari Cloud
                            </strong>
                            <p className="text-[11px] text-gray-600 leading-relaxed">
                                Mengunduh ulang dan menyegarkan seluruh koleksi data dari Firebase Cloud Hub ke database lokal perangkat Anda. Sangat berguna saat laptop baru selesai di-pairing.
                            </p>
                        </div>

                        <div className="bg-white p-3.5 rounded-xl border border-teal-200 shadow-2xs space-y-1.5">
                            <strong className="text-teal-900 flex items-center gap-1.5 font-bold">
                                <i className="bi bi-cloud-arrow-up-fill text-teal-600"></i> Unggah Paksa Database Lokal
                            </strong>
                            <p className="text-[11px] text-gray-600 leading-relaxed">
                                Mendorong seluruh isi database lokal komputer ini ke Firebase Cloud Hub. Gunakan fitur ini sesudah Anda melakukan <em>Restore Backup JSON</em> atau import data Excel massal.
                            </p>
                        </div>

                        <div className="bg-white p-3.5 rounded-xl border border-purple-200 shadow-2xs space-y-1.5">
                            <strong className="text-purple-900 flex items-center gap-1.5 font-bold">
                                <i className="bi bi-person-plus-fill text-purple-600"></i> Sinkronkan Pendaftar PSB
                            </strong>
                            <p className="text-[11px] text-gray-600 leading-relaxed">
                                Menyelaraskan dua arah (tarik &amp; unggah) khusus untuk tabel <strong>Pendaftar Santri Baru (PSB)</strong> antara meja posko pendaftaran dan Firebase Cloud Hub.
                            </p>
                        </div>
                    </div>
                </div>
            )
        }
    ]
};
