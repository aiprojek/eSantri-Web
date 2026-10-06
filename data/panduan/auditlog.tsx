import React from 'react';
import { PanduanSectionData } from '../panduan';

export const auditlogPanduan: PanduanSectionData = {
    id: 'auditlog',
    badge: 'NEW',
    badgeColor: 'teal',
    title: 'Pusat Audit, Forensik Data, Rollback & SOP Pengawasan Multi-Admin',
    steps: [
        {
            title: '1. SOP Pengawasan Multi-Admin: Real-Time Cloud (Firebase) vs Hub-and-Spoke',
            color: 'teal',
            content: (
                <div className="space-y-3.5 text-sm text-gray-700">
                    <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-950 text-xs flex items-start gap-2.5">
                        <i className="bi bi-shield-lock-fill text-amber-600 shrink-0 text-base mt-0.5"></i>
                        <div>
                            <strong className="font-bold text-amber-900 block mb-0.5">Mengapa Audit Log Sangat Krusial di Lingkungan Multi-Admin Pesantren?</strong>
                            Saat operasional pesantren didelegasikan ke banyak petugas (Bendahara SPP, Kasir Koperasi, Staf Sarpras, Wali Kelas, Musyrif Asrama, Petugas Poskestren, hingga Satpam), Pimpinan Pondok dan Dewan Pengawas Yayasan memerlukan instrumen pengawasan yang transparan. <strong>Pusat Audit &amp; Log Aktivitas</strong> merekam siapa melakukan apa, kapan, pada modul mana, serta menyimpan potret data sebelum (<em>Before</em>) dan sesudah (<em>After</em>) perubahan.
                        </div>
                    </div>

                    {/* Model A: Cloud Real-Time */}
                    <div className="p-3.5 bg-teal-50/70 border border-teal-200 rounded-xl space-y-2">
                        <div className="flex items-center justify-between border-b border-teal-200/70 pb-1.5">
                            <h5 className="font-bold text-teal-900 flex items-center gap-1.5 text-xs">
                                <span className="w-5 h-5 rounded-full bg-teal-600 text-white flex items-center justify-center text-[10px] font-black">1</span>
                                Model A: Cloud Real-Time (Firebase Firestore)
                            </h5>
                            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase">Live Audit Stream</span>
                        </div>
                        <p className="text-xs text-gray-600 leading-relaxed">
                            Sangat ideal untuk pengawasan langsung (<em>real-time</em>) ketika perangkat staf di kantor, koperasi, asrama, dan klinik terhubung ke jaringan internet/WiFi pondok:
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-xs">
                            <div className="p-2.5 bg-white rounded-lg border border-teal-100 shadow-2xs space-y-1">
                                <strong className="text-teal-950 block font-semibold">
                                    <i className="bi bi-broadcast text-teal-600"></i> Pemantauan Detik Itu Juga
                                </strong>
                                <p className="text-[11px] text-gray-600 leading-relaxed">
                                    Setiap kali staf menambah, mengubah, atau menghapus data di perangkatnya, jejak audit langsung terkirim ke koleksi Cloud <code>auditLogs</code> dan tampil seketika di layar Super Admin tanpa perlu muat ulang halaman.
                                </p>
                            </div>
                            <div className="p-2.5 bg-white rounded-lg border border-teal-100 shadow-2xs space-y-1">
                                <strong className="text-teal-950 block font-semibold">
                                    <i className="bi bi-shield-check text-teal-600"></i> Proteksi Anti-Loop Sinkronisasi
                                </strong>
                                <p className="text-[11px] text-gray-600 leading-relaxed">
                                    Sistem dilengkapi mekanisme <em>Sync Mute Guard</em> yang otomatis membungkam pencatatan lokal saat sedang menerima aliran data dari Cloud, sehingga sinkronisasi antar-perangkat tidak memicu log ganda/palsu.
                                </p>
                            </div>
                            <div className="p-2.5 bg-white rounded-lg border border-teal-100 shadow-2xs space-y-1">
                                <strong className="text-teal-950 block font-semibold">
                                    <i className="bi bi-arrow-counterclockwise text-teal-600"></i> Rollback Lintas Perangkat
                                </strong>
                                <p className="text-[11px] text-gray-600 leading-relaxed">
                                    Jika Super Admin memulihkan (<em>Rollback</em>) data yang salah dihapus oleh staf, data yang dipulihkan langsung aktif kembali di layar seluruh staf secara <em>real-time</em>.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Model B: Hub-and-Spoke */}
                    <div className="p-3.5 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-2">
                        <div className="flex items-center justify-between border-b border-indigo-200/70 pb-1.5">
                            <h5 className="font-bold text-indigo-900 flex items-center gap-1.5 text-xs">
                                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-black">2</span>
                                Model B: Hub-and-Spoke (Dropbox / Nextcloud / WebDAV / Offline)
                            </h5>
                            <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-[10px] font-bold uppercase">Offline-First Audit</span>
                        </div>
                        <p className="text-xs text-gray-600 leading-relaxed">
                            Menjamin akuntabilitas tetap berjalan 100% meskipun perangkat cabang (<em>Spoke</em>) dioperasikan di area tanpa internet:
                        </p>
                        <div className="space-y-2 pt-1 text-xs">
                            <div className="p-2.5 bg-white rounded-lg border border-indigo-100">
                                <strong className="text-indigo-950 block mb-0.5">A. Perekaman Jejak Audit Lokal Selama Offline (Spoke):</strong>
                                <p className="text-[11px] text-gray-600 leading-relaxed">
                                    Saat staf menginput atau mengedit data secara <em>offline</em> di kelas, gudang, atau asrama, seluruh log aktivitas beserta potret <code>old_data</code> dan <code>new_data</code> tetap terekam utuh di database lokal perangkat staf (<code>IndexedDB</code>).
                                </p>
                            </div>
                            <div className="p-2.5 bg-white rounded-lg border border-indigo-100">
                                <strong className="text-indigo-950 block mb-0.5">B. Pengiriman &amp; Penggabungan Log ke Komputer Pusat (Hub Merge):</strong>
                                <ol className="list-decimal pl-4 mt-1 space-y-1 text-[11px] text-gray-600 leading-relaxed">
                                    <li>Saat staf mengeklik <strong>&quot;Kirim Perubahan (Upload Staff Changes)&quot;</strong>, paket perubahan menyertakan tabel <code>auditLogs</code> dari perangkat cabang tersebut.</li>
                                    <li>Ketika Admin Pusat (Hub) mengeklik <strong>&quot;Gabungkan Perubahan Staff (Merge Changes)&quot;</strong>, sistem menyatukan seluruh log aktivitas staf secara idempoten (berbasis UUID unik) tanpa memicu pencatatan log baru yang berulang.</li>
                                    <li>Setelah Admin Pusat menekan <strong>&quot;Publikasikan Master&quot;</strong>, histori audit gabungan tersimpan aman di cadangan induk Cloud.</li>
                                </ol>
                            </div>
                        </div>
                    </div>

                    {/* Disiplin Sesi Akun */}
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs space-y-1.5 text-rose-950">
                        <strong className="text-rose-900 flex items-center gap-1.5 font-bold">
                            <i className="bi bi-person-vcard-fill text-rose-600"></i> Disiplin Sesi Login &amp; Deteksi Petugas Otomatis (Auto-User Attribution):
                        </strong>
                        <p className="text-[11px] text-gray-700 leading-relaxed">
                            Sistem Audit Log dilengkapi fitur <strong>Auto-User Detection</strong> yang otomatis menyematkan nama lengkap dan peran petugas dari sesi aktif (<code>eSantriCurrentUser</code>). Agar nama petugas di kolom <strong>Petugas / Admin</strong> selalu valid dan dapat dipertanggungjawabkan:
                        </p>
                        <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-gray-700">
                            <li><strong>Satu Petugas Satu Akun:</strong> Dilarang membagikan <em>username</em> dan <em>password</em> akun Super Admin atau Bendahara kepada staf lain.</li>
                            <li><strong>Wajib Logout di Komputer Bersama:</strong> Pada perangkat yang dipakai bergantian (seperti PC Kantor TU, Kasir Koperasi, Poskestren, atau Pos Satpam), petugas yang selesai bertugas <strong>WAJIB mengeklik Logout</strong> agar aktivitas shift berikutnya tidak tercatat atas nama akun Anda.</li>
                        </ul>
                    </div>
                </div>
            )
        },
        {
            title: '2. Cakupan Auto-Capture 33 Tabel & 4 Kartu Indikator (KPI) Eksekutif',
            color: 'blue',
            content: (
                <div className="space-y-3 text-sm text-gray-700">
                    <p className="leading-relaxed">
                        Berbeda dengan pencatatan manual biasa, Pusat Audit eSantri Web bekerja dengan teknologi <strong>Dual-Layer Audit Capture</strong> (kombinasi pencatatan konteks aplikasi dan <em>Global Database Hooks</em> otomatis) yang mengawasi <strong>33 tabel data</strong> secara menyeluruh:
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-2xs space-y-1.5">
                            <strong className="text-blue-900 flex items-center gap-1.5 font-bold">
                                <i className="bi bi-database-fill-check text-blue-600"></i> Modul yang Tercakup Otomatis
                            </strong>
                            <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-gray-600 leading-relaxed">
                                <li><strong>Keuangan &amp; Kas:</strong> Tagihan SPP, Pembayaran Santri, Buku Kas, Master Pos Tagihan, Diskon, Tabungan Santri, dan Penggajian/Payroll.</li>
                                <li><strong>Unit Usaha &amp; Aset:</strong> Produk Koperasi, Transaksi POS, Keuangan Koperasi, Riwayat Stok, serta Inventaris Sarpras &amp; Wakaf.</li>
                                <li><strong>Kesantrian &amp; Akademik:</strong> Data Santri, Pendaftar PSB, Tahfizh, Absensi, Rapor, Nilai, Asrama, Poskestren, BK, Perpustakaan, dan Buku Tamu.</li>
                                <li><strong>Tata Usaha &amp; Sistem:</strong> Arsip &amp; Template Surat, Pengaturan Pondok, Akun Pengguna, serta Kalender.</li>
                            </ul>
                        </div>
                        <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-2xs space-y-1.5">
                            <strong className="text-teal-900 flex items-center gap-1.5 font-bold">
                                <i className="bi bi-speedometer2 text-teal-600"></i> 4 Kartu KPI Interaktif (Klik untuk Filter Cepat)
                            </strong>
                            <ul className="list-disc pl-4 space-y-1 text-[11px] text-gray-600 leading-relaxed">
                                <li><strong>Total Jejak Audit:</strong> Menampilkan total rekaman log tersimpan beserta jumlah aktivitas yang terjadi <em>Hari Ini</em>.</li>
                                <li><strong>Input &amp; Pembaruan:</strong> Rekapitulasi jumlah penambahan data baru (<code>+INSERT</code>) dan revisi data (<code>UPDATE</code>).</li>
                                <li><strong>Data Dihapus (DELETE):</strong> <em>(Dapat Diklik)</em> Klik kartu merah ini untuk langsung memfilter khusus daftar data yang dihapus oleh staf.</li>
                                <li><strong>Aksi Sensitif &amp; Kas:</strong> <em>(Dapat Diklik)</em> Klik kartu kuning/amber ini untuk memfilter khusus perubahan pada modul Keuangan, Buku Kas, Koperasi, Inventaris, Pengaturan, serta seluruh aksi penghapusan data.</li>
                            </ul>
                        </div>
                    </div>
                </div>
            )
        },
        {
            title: '3. Pencarian Forensik Bebas & Filter Multi-Dimensi',
            color: 'indigo',
            content: (
                <div className="space-y-3 text-sm text-gray-700">
                    <p className="leading-relaxed">
                        Untuk memudahkan investigasi ribuan log aktivitas dalam hitungan detik, gunakan kombinasi panel penyaringan di atas tabel:
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-200 space-y-1">
                            <strong className="text-indigo-950 flex items-center gap-1.5 font-bold">
                                <i className="bi bi-search text-indigo-600"></i> 1. Pencarian Teks Dalam Payload JSON
                            </strong>
                            <p className="text-[11px] text-gray-600 leading-relaxed">
                                Ketik kata kunci apa saja seperti <strong>Nama Santri, NIS, Nominal Rupiah (misal: 500000), Kode Barang, Nomor Surat, Nama Petugas,</strong> atau <strong>ID Record</strong>. Mesin pencari memindai hingga ke dalam isi atribut <code>old_data</code> dan <code>new_data</code>.
                            </p>
                        </div>
                        <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-200 space-y-1">
                            <strong className="text-indigo-950 flex items-center gap-1.5 font-bold">
                                <i className="bi bi-layers-fill text-indigo-600"></i> 2. Filter Modul &amp; Petugas Eksekutor
                            </strong>
                            <p className="text-[11px] text-gray-600 leading-relaxed">
                                Pilih <strong>Modul / Tabel</strong> spesifik (misal hanya ingin memeriksa <em>Pembayaran SPP</em> atau <em>Buku Kas</em>) dan pilih <strong>Petugas / Admin</strong> tertentu untuk mengevaluasi riwayat kerja staf bersangkutan.
                            </p>
                        </div>
                        <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-200 space-y-1">
                            <strong className="text-indigo-950 flex items-center gap-1.5 font-bold">
                                <i className="bi bi-funnel-fill text-indigo-600"></i> 3. Filter Jenis Operasi
                            </strong>
                            <p className="text-[11px] text-gray-600 leading-relaxed">
                                Saring berdasarkan jenis tindakan: <strong>TAMBAH (INSERT)</strong>, <strong>UBAH (UPDATE)</strong>, <strong>HAPUS (DELETE)</strong>, atau <strong>Khusus Aksi Sensitif &amp; Keuangan</strong>.
                            </p>
                        </div>
                        <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-200 space-y-1">
                            <strong className="text-indigo-950 flex items-center gap-1.5 font-bold">
                                <i className="bi bi-calendar-range-fill text-indigo-600"></i> 4. Filter Rentang Waktu Fleksibel
                            </strong>
                            <p className="text-[11px] text-gray-600 leading-relaxed">
                                Gunakan tombol cepat <strong>Hari Ini</strong>, <strong>7 Hari</strong>, <strong>30 Hari</strong>, atau klik <strong>Pilih Tanggal</strong> untuk menentukan rentang tanggal mulai dan tanggal akhir audit secara presisi.
                            </p>
                        </div>
                    </div>
                </div>
            )
        },
        {
            title: '4. Inspeksi Forensik Perubahan Data (Before vs After Diff & Raw JSON)',
            color: 'purple',
            content: (
                <div className="space-y-3 text-sm text-gray-700">
                    <p className="leading-relaxed">
                        Setiap baris pada tabel menampilkan ringkasan otomatis tentang objek apa yang diubah dan berapa kolom yang terdampak. Klik tombol <strong>&quot;Inspeksi&quot;</strong> (<i className="bi bi-eye text-gray-600"></i>) di kolom paling kanan untuk membuka jendela <strong>Inspeksi Forensik Perubahan Data</strong>:
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                        <div className="p-3.5 bg-white rounded-xl border border-purple-200 shadow-2xs space-y-1.5">
                            <strong className="text-purple-900 flex items-center gap-1.5 font-bold">
                                <i className="bi bi-layout-split text-purple-600"></i> Tab 1: Perbandingan Visual (Field Diff)
                            </strong>
                            <ul className="list-disc pl-4 space-y-1 text-[11px] text-gray-600 leading-relaxed">
                                <li>Menampilkan tabel berdampingan antara <strong>Nilai Sebelumnya (Before / Lama)</strong> dengan latar merah muda dan <strong>Nilai Sesudahnya (After / Baru)</strong> dengan latar hijau.</li>
                                <li>Kolom yang nilainya berubah ditandai dengan lencana kuning <strong>BERUBAH</strong> sehingga auditor langsung melihat titik modifikasi (contoh: nominal tagihan diubah atau status kondisi aset diganti).</li>
                                <li>Aktifkan centang <strong>&quot;Hanya tampilkan kolom yang berubah&quot;</strong> untuk menyembunyikan puluhan atribut lain yang tidak ikut diedit.</li>
                            </ul>
                        </div>
                        <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-1.5">
                            <strong className="text-slate-900 flex items-center gap-1.5 font-bold">
                                <i className="bi bi-braces text-slate-600"></i> Tab 2: Payload JSON Mentah (Technical Audit)
                            </strong>
                            <ul className="list-disc pl-4 space-y-1 text-[11px] text-gray-600 leading-relaxed">
                                <li>Menampilkan struktur objek JSON utuh dari <code>old_data</code> dan <code>new_data</code> dengan tampilan konsol gelap yang rapi.</li>
                                <li>Sangat berguna bagi Administrator IT untuk memeriksa struktur array bersarang (seperti item keranjang koperasi, rincian resep obat, atau riwayat servis aset).</li>
                            </ul>
                        </div>
                    </div>
                </div>
            )
        },
        {
            title: '5. Pemulihan Data Instan 1-Klik (Rollback / Undo & Restore Data Terhapus)',
            color: 'red',
            content: (
                <div className="space-y-3 text-sm text-gray-700">
                    <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-950 space-y-1.5">
                        <strong className="font-bold text-red-900 flex items-center gap-1.5 text-sm">
                            <i className="bi bi-arrow-counterclockwise text-red-600"></i>
                            Solusi Penyelamatan Data Tanpa Perlu Restore Full Backup
                        </strong>
                        <p className="leading-relaxed text-gray-700">
                            Apabila seorang staf tidak sengaja menghapus data santri, menghapus transaksi kas, atau salah mengedit biodata/nominal penting, <strong>Admin Utama</strong> dapat membatalkan perubahan spesifik tersebut hanya dalam 1 klik tanpa mengganggu data lain yang baru masuk:
                        </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div className="p-3 bg-white rounded-xl border border-gray-200 shadow-2xs space-y-1.5">
                            <span className="px-2 py-0.5 rounded bg-red-100 text-red-800 font-bold text-[10px] uppercase">Skenario 1: Data Terhapus (DELETE)</span>
                            <h6 className="font-bold text-gray-900">Cara Memulihkan Data yang Dihapus</h6>
                            <ol className="list-decimal pl-4 space-y-1 text-[11px] text-gray-600 leading-relaxed">
                                <li>Klik kartu KPI <strong>Data Dihapus (DELETE)</strong> untuk menemukan log penghapusan terkait.</li>
                                <li>Klik tombol <strong>Inspeksi</strong> pada baris data yang ingin diselamatkan.</li>
                                <li>Pastikan isi data pada kolom <em>Nilai Sebelumnya (Before)</em> sudah benar, lalu klik tombol hijau <strong>&quot;Pulihkan Data Terhapus&quot;</strong> di pojok kanan bawah modal.</li>
                                <li>Data langsung dikembalikan ke tabel aktif (<code>deleted: false</code>) dan disinkronkan ulang ke seluruh perangkat.</li>
                            </ol>
                        </div>

                        <div className="p-3 bg-white rounded-xl border border-gray-200 shadow-2xs space-y-1.5">
                            <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-bold text-[10px] uppercase">Skenario 2: Salah Edit (UPDATE)</span>
                            <h6 className="font-bold text-gray-900">Cara Mengembalikan ke Versi Sebelumnya (Revert)</h6>
                            <ol className="list-decimal pl-4 space-y-1 text-[11px] text-gray-600 leading-relaxed">
                                <li>Cari log perubahan bertanda <strong>UBAH (UPDATE)</strong> yang ingin dibatalkan, lalu klik <strong>Inspeksi</strong>.</li>
                                <li>Tinjau perbedaan nilai lama vs nilai baru pada tabel perbandingan.</li>
                                <li>Klik tombol <strong>&quot;Kembalikan ke Versi Lama (Revert)&quot;</strong> dan konfirmasi tindakan.</li>
                                <li>Seluruh field pada record tersebut dikembalikan ke kondisi sebelum perubahan, dan aksi pemulihan ini juga tercatat otomatis di Audit Log atas nama <code>Admin (Rollback)</code>.</li>
                            </ol>
                        </div>
                    </div>
                </div>
            )
        },
        {
            title: '6. Ekspor Laporan Audit (Excel, CSV, Cetak Resmi Ber-Kop) & Retensi Database',
            color: 'green',
            content: (
                <div className="space-y-3 text-sm text-gray-700">
                    <p className="leading-relaxed">
                        Untuk keperluan rapat evaluasi bulanan pengurus, pemeriksaan auditor yayasan, serta pemeliharaan kapasitas database jangka panjang:
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                        <div className="p-3 bg-white rounded-xl border border-gray-200 shadow-2xs space-y-1">
                            <strong className="text-emerald-900 flex items-center gap-1.5 font-bold">
                                <i className="bi bi-file-earmark-excel-fill text-emerald-600"></i> 1. Ekspor Excel (.xlsx) &amp; CSV
                            </strong>
                            <p className="text-[11px] text-gray-600 leading-relaxed">
                                Klik tombol <strong>Excel</strong> atau <strong>CSV</strong> untuk mengunduh seluruh catatan log yang sedang difilter lengkap dengan waktu, nama petugas, kategori modul, objek data, daftar kolom berubah, hingga payload JSON.
                            </p>
                        </div>
                        <div className="p-3 bg-white rounded-xl border border-gray-200 shadow-2xs space-y-1">
                            <strong className="text-slate-900 flex items-center gap-1.5 font-bold">
                                <i className="bi bi-printer-fill text-slate-700"></i> 2. Cetak Laporan Audit Ber-Kop
                            </strong>
                            <p className="text-[11px] text-gray-600 leading-relaxed">
                                Klik tombol <strong>Cetak Laporan Audit</strong> untuk menerbitkan dokumen resmi lengkap dengan Kop Pondok Pesantren, ringkasan parameter filter, tabel log aktivitas, serta kolom tanda tangan <em>Auditor Sistem</em> dan <em>Pimpinan Pondok</em>.
                            </p>
                        </div>
                        <div className="p-3 bg-white rounded-xl border border-rose-200 shadow-2xs space-y-1">
                            <strong className="text-rose-900 flex items-center gap-1.5 font-bold">
                                <i className="bi bi-eraser-fill text-rose-600"></i> 3. Retensi Log (&gt; 90 Hari)
                            </strong>
                            <p className="text-[11px] text-gray-600 leading-relaxed">
                                Agar database browser dan Cloud tetap ringan, Admin Utama disarankan mengunduh arsip Excel setiap akhir semester/triwulan, lalu mengeklik tombol <strong>&quot;Bersihkan &gt;90 Hari&quot;</strong> untuk menghapus log lawas yang sudah diarsipkan.
                            </p>
                        </div>
                    </div>
                </div>
            )
        }
    ]
};
