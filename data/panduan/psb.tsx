import React from 'react';
import { PanduanSectionData } from '../panduan';

export const psbPanduan: PanduanSectionData = {
    id: 'admin',
    badge: 11,
    badgeColor: 'teal',
    title: 'Penerimaan Santri Baru (PSB)',
    steps: [
        {
            title: 'Ikhtisar Arsitektur PSB: Formulir HTML Mandiri, Multi-Cloud & Isolasi Tahun Ajaran',
            content: (
                <div className="space-y-3 text-sm text-gray-700">
                    <div className="bg-teal-50 p-4 rounded-xl border border-teal-200 text-xs text-teal-950 space-y-2.5">
                        <h5 className="font-bold flex items-center gap-2 text-teal-900 text-sm">
                            <i className="bi bi-compass-fill text-teal-700 text-base"></i>
                            Alur 6 Tahap Penerimaan Santri Baru Terpadu
                        </h5>
                        <p className="leading-relaxed text-gray-700">
                            Modul PSB eSantri Web dirancang berpusat pada <strong>Formulir HTML Mandiri per jenjang/template</strong> yang terhubung ke pilihan server Cloud (Google Apps Script + Drive, Cloudflare D1/R2, atau Supabase) maupun pesan WhatsApp, lalu terintegrasi langsung ke Buku Induk Santri, Keuangan, Arsip Surat, dan WhatsApp Center:
                        </p>
                        <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 pt-1 text-center font-medium">
                            <div className="bg-white p-2 rounded-lg border border-teal-200 shadow-2xs">
                                <span className="w-5 h-5 mx-auto bg-teal-700 text-white rounded-full flex items-center justify-center text-[10px] font-bold mb-1">1</span>
                                <strong className="text-teal-950 block text-[11px]">TA &amp; Form</strong>
                                <span className="text-[10px] text-gray-500">Desain &amp; Template</span>
                            </div>
                            <div className="bg-white p-2 rounded-lg border border-teal-200 shadow-2xs">
                                <span className="w-5 h-5 mx-auto bg-teal-700 text-white rounded-full flex items-center justify-center text-[10px] font-bold mb-1">2</span>
                                <strong className="text-teal-950 block text-[11px]">Cloud Backend</strong>
                                <span className="text-[10px] text-gray-500">GAS / CF / Supabase</span>
                            </div>
                            <div className="bg-white p-2 rounded-lg border border-teal-200 shadow-2xs">
                                <span className="w-5 h-5 mx-auto bg-teal-700 text-white rounded-full flex items-center justify-center text-[10px] font-bold mb-1">3</span>
                                <strong className="text-teal-950 block text-[11px]">Sebar HTML</strong>
                                <span className="text-[10px] text-gray-500">File Mandiri &amp; Poster</span>
                            </div>
                            <div className="bg-white p-2 rounded-lg border border-teal-200 shadow-2xs">
                                <span className="w-5 h-5 mx-auto bg-teal-700 text-white rounded-full flex items-center justify-center text-[10px] font-bold mb-1">4</span>
                                <strong className="text-teal-950 block text-[11px]">Tarik Cloud</strong>
                                <span className="text-[10px] text-gray-500">Rekap &amp; Anti-Duplikat</span>
                            </div>
                            <div className="bg-white p-2 rounded-lg border border-teal-200 shadow-2xs">
                                <span className="w-5 h-5 mx-auto bg-teal-700 text-white rounded-full flex items-center justify-center text-[10px] font-bold mb-1">5</span>
                                <strong className="text-teal-950 block text-[11px]">Ujian &amp; SK</strong>
                                <span className="text-[10px] text-gray-500">Kartu, F-PSB &amp; PDF</span>
                            </div>
                            <div className="bg-white p-2 rounded-lg border border-teal-200 shadow-2xs">
                                <span className="w-5 h-5 mx-auto bg-teal-700 text-white rounded-full flex items-center justify-center text-[10px] font-bold mb-1">6</span>
                                <strong className="text-teal-950 block text-[11px]">Terima Santri</strong>
                                <span className="text-[10px] text-gray-500">NIS, Tagihan &amp; Arsip</span>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                        <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-2xs space-y-1">
                            <span className="font-bold text-teal-800 flex items-center gap-1.5 text-xs">
                                <i className="bi bi-cloud-check-fill text-teal-600"></i> Hybrid: Cloud + WA (Rekomendasi)
                            </span>
                            <p className="text-[11px] text-gray-600 leading-relaxed">
                                Data dan berkas unggahan (KK, Foto, Akta, Ijazah) dikirim langsung ke Cloud panitia, lalu WhatsApp Admin terbuka dengan ringkasan konfirmasi otomatis sebagai cadangan ganda.
                            </p>
                        </div>
                        <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-2xs space-y-1">
                            <span className="font-bold text-teal-800 flex items-center gap-1.5 text-xs">
                                <i className="bi bi-hdd-stack-fill text-teal-600"></i> Cloud Backend Langsung
                            </span>
                            <p className="text-[11px] text-gray-600 leading-relaxed">
                                Pendaftar mengirim formulir dan lampiran berkas langsung ke endpoint pilihan (Google Apps Script + Drive, Cloudflare D1+R2, Cloudflare R2, atau Supabase) tanpa membuka WhatsApp.
                            </p>
                        </div>
                        <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-2xs space-y-1">
                            <span className="font-bold text-teal-800 flex items-center gap-1.5 text-xs">
                                <i className="bi bi-whatsapp text-emerald-600"></i> WhatsApp Teks / Offline
                            </span>
                            <p className="text-[11px] text-gray-600 leading-relaxed">
                                Tanpa perlu server cloud: pendaftar mengirim blok teks <code>PSB_START...PSB_END</code> ke WhatsApp resmi pondok, lalu panitia memasukkannya lewat tombol <em>Impor WA</em>.
                            </p>
                        </div>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-950 flex items-start gap-2.5">
                        <i className="bi bi-file-earmark-code-fill text-blue-600 text-base shrink-0 mt-0.5"></i>
                        <div className="leading-relaxed text-[11px]">
                            <strong>Fokus pada File Formulir HTML Mandiri:</strong> Agar pengiriman formulir dan unggahan file lampiran berjalan konsisten di berbagai HP wali santri, publikasi online dipusatkan pada file <strong>Formulir HTML Mandiri (.html)</strong> yang diunduh dari tab <em>Desain Formulir</em> (tautan portal langsung sementara dinonaktifkan). File HTML tersebut bisa dibagikan langsung lewat WhatsApp, dibuka di browser HP/laptop, atau ditaruh di situs web pondok / GitHub Pages secara gratis.
                        </div>
                    </div>
                </div>
            )
        },
        {
            title: '1. Desain Formulir Online, Tahun Ajaran PSB, Cetak Vektor & Poster AI',
            content: (
                <div className="space-y-3 text-sm text-gray-700">
                    <div className="bg-teal-50 p-3.5 rounded-xl border border-teal-200 text-xs text-teal-950 space-y-2">
                        <strong className="font-bold flex items-center gap-1.5 text-teal-900 text-sm">
                            <i className="bi bi-calendar-check-fill text-teal-700 text-base"></i>
                            Isolasi Tahun Ajaran PSB (`TA PSB Aktif`)
                        </strong>
                        <p className="leading-relaxed text-gray-700 text-[11px]">
                            Di bagian <strong>1. Konfigurasi Dasar</strong> pada tab <em>Desain Formulir</em>, tersedia pengaturan <strong>Tahun Ajaran PSB</strong> lengkap dengan tombol cepat <strong>TA Aktif</strong> dan <strong>TA Depan</strong>. Panitia dapat membuka pendaftaran untuk tahun ajaran berikutnya lebih awal (misal membuka PSB 2026/2027 saat KBM 2025/2026 masih berjalan) tanpa mengubah Tahun Ajaran Aktif pondok. Nilai ini otomatis menjadi patokan di Header PSB, Dashboard Tren, filter default Rekap Pendaftar, hingga nama folder berkas otomatis di Google Drive / Supabase Storage.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 space-y-2">
                            <strong className="text-gray-800 flex items-center gap-1.5 font-bold">
                                <i className="bi bi-sliders2 text-teal-700"></i> Kustomisasi Template, Field &amp; Pengesahan
                            </strong>
                            <ul className="list-disc pl-4 space-y-1 text-gray-600 text-[11px]">
                                <li><strong>Multi-Template per Jenjang:</strong> Simpan template terpisah (misal Form MTs, Form MA) lengkap dengan target jenjang dan endpoint cloud-nya masing-masing.</li>
                                <li><strong>Kelengkapan Data &amp; Wajib Isi:</strong> Centang field standar yang tampil, tandai status <em>Wajib?</em>, dan edit <em>Hint</em> petunjuk pengisian agar format isian wali seragam.</li>
                                <li><strong>Persyaratan Berkas &amp; Pertanyaan Kustom:</strong> Tambahkan daftar ceklis berkas fisik serta pertanyaan bebas termasuk tipe <strong>Unggah Dokumen</strong> (maks. 5 MB/berkas) dan teks berformat Markdown.</li>
                                <li><strong>Masa Berlaku Formulir (Deadline) &amp; Tanda Tangan:</strong> Tentukan tanggal tutup otomatis formulir serta isi nama/jabatan Ketua Panitia, Pimpinan, dan Kota untuk dicetak otomatis pada Laporan &amp; SK Kelulusan.</li>
                            </ul>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 space-y-2">
                            <strong className="text-gray-800 flex items-center gap-1.5 font-bold">
                                <i className="bi bi-printer-fill text-teal-700"></i> Pratinjau, Cetak PDF Vektor &amp; Poster AI
                            </strong>
                            <ul className="list-disc pl-4 space-y-1 text-gray-600 text-[11px]">
                                <li><strong>Gaya Desain &amp; Unduh HTML:</strong> Pilih tema formulir (Klasik, Modern, Bold, Ceria), lalu klik <strong>Unduh Formulir HTML</strong> untuk menghasilkan 1 file mandiri siap sebar.</li>
                                <li><strong>Cetak / PDF Vektor Tajam:</strong> Pada toolbar pratinjau kanan, pilih ukuran kertas (<strong>A4</strong> / <strong>F4</strong>) dan mode skala (<strong>Fit 1 Halaman</strong> atau persentase manual), lalu klik <strong>Cetak / PDF</strong> untuk menggandakan formulir kertas di posko.</li>
                                <li><strong>Tab Poster AI:</strong> Susun prompt &amp; hasilkan desain gambar poster PSB sesuai rasio (Story 9:16, Feed 1:1/4:5, Spanduk), unduh gambar PNG, dan simpan sebagai template poster panitia.</li>
                            </ul>
                        </div>
                    </div>
                </div>
            )
        },
        {
            title: '2. Multi-Backend Cloud & Penyimpanan Berkas Lampiran Terstruktur',
            content: (
                <div className="space-y-3.5 text-sm text-gray-700">
                    <p className="text-xs text-gray-600 leading-relaxed">
                        Saat memilih metode pengiriman <strong>Hybrid</strong> atau <strong>Cloud Backend Langsung</strong> (di tab <em>Desain Formulir</em> maupun lewat tombol <strong>Koneksi Cloud</strong> di tab <em>Rekap Pendaftar</em>), panitia dapat memilih satu dari empat adapter backend berikut beserta penyimpanan berkas lampirannya:
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                        {/* GAS + Drive */}
                        <div className="bg-teal-50/70 border border-teal-200 rounded-xl p-3.5 space-y-2">
                            <div className="flex items-center justify-between">
                                <strong className="text-teal-950 font-bold flex items-center gap-1.5 text-xs">
                                    <i className="bi bi-google text-teal-700"></i> 1. Google Apps Script (v3.1) + Drive
                                </strong>
                                <span className="px-2 py-0.5 rounded-full bg-teal-700 text-white text-[10px] font-bold">Rekomendasi</span>
                            </div>
                            <ul className="list-disc pl-4 space-y-1 text-[11px] text-gray-700">
                                <li><strong>Auto-Create Folder Tahunan:</strong> Jika kolom <em>ID/Link Folder Drive</em> dikosongkan, GAS otomatis membuat folder <code>berkas-psb-&lt;tahun-ajaran&gt;</code> (contoh: <code>berkas-psb-2026-2027</code>) di Drive utama Anda. Jika diisi Link/ID Folder Induk, subfolder tahunan otomatis dibuat di dalamnya.</li>
                                <li><strong>Penamaan Berkas &amp; Tab Otomatis:</strong> Lampiran otomatis diberi nama rapi (misal <code>kk-nama-santri-20260908-143022.pdf</code>) dan hak akses baca diatur agar bisa dibuka langsung dari tabel Rekap.</li>
                                <li><strong>Pemisahan Antar-Tahun (Opsional):</strong> Pada tahun ajaran baru, Anda bebas membuat Google Spreadsheet &amp; URL Deployment GAS baru untuk memisahkan file Sheet tahun sebelumnya agar arsip tetap bersih.</li>
                            </ul>
                        </div>

                        {/* Cloudflare D1 + R2 */}
                        <div className="bg-orange-50/70 border border-orange-200 rounded-xl p-3.5 space-y-2">
                            <div className="flex items-center justify-between">
                                <strong className="text-orange-950 font-bold flex items-center gap-1.5 text-xs">
                                    <i className="bi bi-cloud-lightning-fill text-orange-600"></i> 2. Cloudflare D1 + R2
                                </strong>
                                <span className="px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 text-[10px] font-bold">Edge SQL + Storage</span>
                            </div>
                            <ul className="list-disc pl-4 space-y-1 text-[11px] text-gray-700">
                                <li><strong>Penyimpanan Terpisah &amp; Cepat:</strong> Data teks pendaftar masuk ke tabel SQLite <strong>Cloudflare D1</strong> (<code>db_psb</code>), sedangkan berkas foto/PDF disimpan ke <strong>Cloudflare R2 Bucket</strong> (<code>psb-berkas</code>).</li>
                                <li><strong>Langkah Pasang:</strong> Buat D1 database, jalankan SQL inisialisasi di bagian atas skrip Worker, buat R2 Bucket, pasang Binding Worker <code>DB</code> &amp; <code>R2_BUCKET</code>, lalu deploy sebagai <code>*.workers.dev</code>.</li>
                                <li><strong>Keamanan Opsional:</strong> Anda dapat menambahkan environment variable <code>API_KEY</code> pada Worker lalu mengisi token yang sama di kolom API Key aplikasi.</li>
                            </ul>
                        </div>

                        {/* Cloudflare R2 Only */}
                        <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3.5 space-y-2">
                            <div className="flex items-center justify-between">
                                <strong className="text-amber-950 font-bold flex items-center gap-1.5 text-xs">
                                    <i className="bi bi-bucket-fill text-amber-600"></i> 3. Cloudflare R2 Only
                                </strong>
                                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">Tanpa SQL Terpisah</span>
                            </div>
                            <ul className="list-disc pl-4 space-y-1 text-[11px] text-gray-700">
                                <li><strong>Ringkas 1 Storage:</strong> Tanpa perlu membuat database SQL terpisah; baik data JSON pendaftar maupun berkas lampiran disimpan langsung di 1 <strong>Bucket Cloudflare R2</strong> (kuota gratis hingga 10 GB/bulan).</li>
                                <li><strong>Langkah Pasang:</strong> Cukup buat R2 Bucket, tempel kode Worker R2 dari aplikasi, pasang binding <code>R2_BUCKET</code>, lalu deploy.</li>
                            </ul>
                        </div>

                        {/* Supabase */}
                        <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3.5 space-y-2">
                            <div className="flex items-center justify-between">
                                <strong className="text-emerald-950 font-bold flex items-center gap-1.5 text-xs">
                                    <i className="bi bi-database-fill-check text-emerald-700"></i> 4. Supabase PostgreSQL + Storage
                                </strong>
                                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">SQL + Public Bucket</span>
                            </div>
                            <ul className="list-disc pl-4 space-y-1 text-[11px] text-gray-700">
                                <li><strong>PostgreSQL + Folder Tahun Bucket:</strong> Data biodata disimpan di tabel <code>psb_submissions</code>, sedangkan berkas diunggah langsung ke <strong>Supabase Storage Bucket</strong> (default: <code>psb-berkas</code>) di dalam folder sesuai Tahun Ajaran.</li>
                                <li><strong>Langkah Pasang:</strong> Buka <em>SQL Editor</em> di Supabase dan jalankan skrip SQL yang disediakan (otomatis membuat tabel + bucket + kebijakan RLS), lalu tempel <em>Project URL</em> dan <strong>Anon / Public Key</strong> (wajib).</li>
                            </ul>
                        </div>
                    </div>

                    {/* Langkah Kritis GAS */}
                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-3.5 space-y-2 text-xs">
                        <h6 className="font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                            <i className="bi bi-list-check text-teal-700"></i> Ringkasan Pemasangan &amp; Uji Koneksi GAS (Paling Umum Digunakan):
                        </h6>
                        <ol className="list-decimal pl-4 space-y-1.5 text-gray-700 text-[11px] leading-relaxed">
                            <li>Buka Google Spreadsheet baru/khusus panitia PSB, pilih menu <strong>Ekstensi &gt; Apps Script</strong>, hapus kode lama, lalu tempel <strong>Kode Script GAS v3.1</strong> dari tombol skrip di aplikasi.</li>
                            <li>Klik <strong>Deploy &gt; Deployment Baru &gt; Aplikasi Web</strong>, atur <em>Jalankan sebagai</em> = <strong>Saya</strong> dan <em>Siapa yang memiliki akses</em> = <strong className="bg-teal-100 text-teal-900 px-1 rounded">Siapa Saja (Anyone)</strong>, lalu beri izin akses Drive &amp; Spreadsheet saat otorisasi muncul.</li>
                            <li>Salin URL Web App yang berakhiran <code>/exec</code>, tempel ke kolom endpoint, lalu klik tombol <strong>Tes Link</strong> (atau <strong>Uji Koneksi</strong>) untuk memastikan aplikasi dapat membaca data dari server sebelum file HTML disebar.</li>
                            <li><strong>Penting:</strong> Jika suatu saat Anda mengubah kode di editor <code>Code.gs</code>, setelah menyimpan wajib memperbarui deployment via <strong>Deploy &gt; Kelola Deployment &gt; Edit &gt; Versi Baru (New Version)</strong>.</li>
                        </ol>
                    </div>
                </div>
            )
        },
        {
            title: '3. Tarik Data Multi-Endpoint, Auto-Healing & Isolasi Anti-Duplikasi',
            content: (
                <div className="space-y-3 text-sm text-gray-700">
                    <p className="leading-relaxed text-xs text-gray-600">
                        Di tab <strong>Rekap Pendaftar</strong>, panitia dapat mengelola data pendaftar masuk dari berbagai jalur sekaligus dengan perlindungan isolasi tahun ajaran:
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 space-y-1.5">
                            <strong className="text-gray-800 flex items-center gap-1.5 font-bold">
                                <i className="bi bi-cloud-download-fill text-teal-700"></i> Tarik Cloud Multi-Template &amp; Impor Lainnya
                            </strong>
                            <ul className="list-disc pl-4 space-y-1 text-[11px] text-gray-600">
                                <li><strong>Tarik Cloud:</strong> Mengambil baris pendaftar baru dari endpoint utama sekaligus seluruh endpoint berbeda pada masing-masing <em>Template Formulir</em> jenjang (termasuk campuran GAS, Cloudflare, dan Supabase).</li>
                                <li><strong>Impor WA:</strong> Mem-parsing kode pesan pendaftaran <code>PSB_START...PSB_END</code> dari WhatsApp panitia.</li>
                                <li><strong>Sync Antar-Admin Posko:</strong> Sinkronisasi internal sesama perangkat panitia via <em>Firebase Realtime Hub</em> atau <em>Dropbox Inbox</em>.</li>
                                <li><strong>Tambah Manual &amp; Editor Massal:</strong> Input langsung pendaftar walk-in atau ubah data banyak peserta sekaligus.</li>
                            </ul>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 space-y-1.5">
                            <strong className="text-gray-800 flex items-center gap-1.5 font-bold">
                                <i className="bi bi-shield-lock-fill text-teal-700"></i> Auto-Healing Kolom &amp; Anti-Duplikasi Lintas Tahun
                            </strong>
                            <ul className="list-disc pl-4 space-y-1 text-[11px] text-gray-600">
                                <li><strong>Filter Tahun Ajaran:</strong> Daftar pendaftar, kartu hitung status, dan pengumuman default terkunci sesuai <em>TA PSB Aktif</em>, namun riwayat tahun lama tetap bisa dilihat via filter dropdown Tahun Ajaran.</li>
                                <li><strong>Auto-Healing Kolom &amp; Jenjang:</strong> Data yang terlanjur tersimpan di kolom kustom atau memakai nama/alias jenjang otomatis dipetakan ke kolom biodata standar (termasuk nomor HP wali, orang tua, dan lampiran berkas).</li>
                                <li><strong>Anti-Duplikasi Cerdas:</strong> Pengecekan identitas gabungan (<strong>Tahun Ajaran + Nama + NIK / NISN / HP / Tanggal Lahir</strong>) mencegah data ganda pada tahun yang sama tanpa mengganggu pendaftar bernama sama dari tahun ajaran berbeda.</li>
                            </ul>
                        </div>
                    </div>
                </div>
            )
        },
        {
            title: '4. Dashboard Tren, Komparasi Multi-Tahun & Arsip Historis Permanen',
            content: (
                <div className="space-y-3 text-sm text-gray-700">
                    <p className="leading-relaxed text-xs text-gray-600">
                        Tab <strong>Dashboard</strong> menyajikan analisa pendaftaran yang selalu fokus pada <strong>Tahun Ajaran PSB Aktif</strong> sehingga angka statistik tidak tercampur dengan pendaftar tahun-tahun sebelumnya:
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                        <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-2xs space-y-1">
                            <strong className="text-teal-900 flex items-center gap-1.5">
                                <i className="bi bi-graph-up-arrow text-teal-600"></i> Statistik &amp; Komparasi Multi-Tahun
                            </strong>
                            <p className="text-[11px] text-gray-600 leading-relaxed">
                                Memantau grafik tren harian 7 hari terakhir, capaian target kuota, sebaran L/P per jenjang, serta grafik pertumbuhan nyata melawan tahun ajaran pembanding.
                            </p>
                        </div>
                        <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-2xs space-y-1">
                            <strong className="text-teal-900 flex items-center gap-1.5">
                                <i className="bi bi-file-earmark-bar-graph-fill text-teal-600"></i> Cetak Laporan Rekapitulasi (PDF)
                            </strong>
                            <p className="text-[11px] text-gray-600 leading-relaxed">
                                Tersedia di Dashboard maupun tab Rekap. Menghasilkan dokumen laporan statistik resmi bertanda tangan panitia/pimpinan dengan kop pesantren dan ekspor PDF vektor.
                            </p>
                        </div>
                        <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-2xs space-y-1">
                            <strong className="text-teal-900 flex items-center gap-1.5">
                                <i className="bi bi-archive-fill text-amber-600"></i> Arsip &amp; Dokumen PSB Permanen
                            </strong>
                            <p className="text-[11px] text-gray-600 leading-relaxed">
                                Rekap akhir tahun ajaran dapat dikunci ke <strong>Arsip Historis PSB</strong> di pengaturan aplikasi (ikut tersimpan pada Backup JSON &amp; Cloud Sync) sehingga grafik komparasi multi-tahun tetap terjaga meski data mentah pendaftar lama telah dibersihkan.
                            </p>
                        </div>
                    </div>
                </div>
            )
        },
        {
            title: '5. Seleksi Ujian, Pengumuman Kelulusan PDF & Arsip Surat Otomatis',
            content: (
                <div className="space-y-3 text-sm text-gray-700">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 space-y-1.5">
                            <strong className="text-gray-800 flex items-center gap-1.5 font-bold">
                                <i className="bi bi-file-earmark-text-fill text-teal-700"></i> Formulir F-PSB &amp; Kartu Ujian (Satuan / Massal)
                            </strong>
                            <p className="text-[11px] text-gray-600 leading-relaxed">
                                Klik ikon cetak pada baris pendaftar—atau centang beberapa peserta lalu pilih <strong>Cetak Formulir (N)</strong> / <strong>Cetak Kartu Ujian (N)</strong>—untuk mencetak lembar verifikasi berkas F-PSB beserta tautan/pratinjau lampiran digital maupun Kartu Peserta Ujian Masuk (nomor tes, ruang, jadwal materi uji, pas foto, dan kolom paraf penguji).
                            </p>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 space-y-1.5">
                            <strong className="text-gray-800 flex items-center gap-1.5 font-bold">
                                <i className="bi bi-megaphone-fill text-teal-700"></i> Dokumen Pengumuman Kelulusan (PDF) &amp; Modul Surat
                            </strong>
                            <p className="text-[11px] text-gray-600 leading-relaxed">
                                Klik tombol <strong>Pengumuman (PDF)</strong> untuk menerbitkan daftar resmi kategori <em>Diterima</em>, <em>Cadangan</em>, dan <em>Tidak Diterima</em>. Mendukung filter Tahun Ajaran &amp; Jenjang, pengurutan ranking nilai ujian, kustomisasi catatan/petunjuk daftar ulang, serta <strong>simpan otomatis ke Arsip Surat Keluar</strong> di Modul Surat (tersinkronisasi ke Cloud).
                            </p>
                        </div>
                    </div>
                </div>
            )
        },
        {
            title: '6. Integrasi Lintas Modul: Santri Aktif, Keuangan, Data Lain & WhatsApp Center',
            color: 'emerald',
            content: (
                <div className="space-y-3 text-sm text-gray-700">
                    <p className="text-xs text-gray-600 leading-relaxed">
                        Saat panitia mengklik <strong>Terima Santri</strong> pada satu peserta atau melakukan <strong>Ubah Status Massal &rarr; Diterima</strong>, sistem mengeksekusi migrasi atomik ke seluruh modul terkait:
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div className="bg-emerald-50/70 p-3 rounded-xl border border-emerald-200 space-y-1.5">
                            <strong className="text-emerald-950 font-bold flex items-center gap-1.5">
                                <i className="bi bi-person-check-fill text-emerald-700"></i> 1. Buku Induk Santri &amp; Pengaman Lintas Jenjang
                            </strong>
                            <ul className="list-disc pl-4 text-[11px] text-emerald-900 space-y-1">
                                <li>Otomatis membuat data Santri Aktif, men-generate <strong>NIS berurutan</strong>, dan mencatat <code>nis</code> serta <code>santriId</code> balik ke pendaftar agar status migrasi terpantau.</li>
                                <li><strong>Pencegahan Duplikasi &amp; Lintas Jenjang:</strong> Mendeteksi bila calon santri sudah pernah masuk ke <code>db.santri</code> (berdasar ID, NIK, NISN, atau Nama+Tgl Lahir). Jika seleksi massal mencampur pendaftar lintas jenjang, tersedia pengaturan/peringatan khusus agar jenjang dan kelas tujuan masing-masing anak tidak saling tertimpa.</li>
                            </ul>
                        </div>

                        <div className="bg-teal-50/70 p-3 rounded-xl border border-teal-200 space-y-1.5">
                            <strong className="text-teal-950 font-bold flex items-center gap-1.5">
                                <i className="bi bi-card-list text-teal-700"></i> 2. Migrasi Data Kustom &amp; Lampiran ke Tab Data Lain
                            </strong>
                            <ul className="list-disc pl-4 text-[11px] text-teal-900 space-y-1">
                                <li>Ringkasan riwayat PSB (Nomor Registrasi, TA Masuk, Jalur Pendaftaran, Ceklis Berkas, Skor Ujian, Catatan Penguji) serta seluruh jawaban <code>customData</code> ikut disalin ke profil Santri.</li>
                                <li>Ditampilkan rapi di <strong>Detail Santri &rarr; Tab Data Lain</strong> menggunakan label asli pertanyaan formulir lengkap dengan tombol aman untuk membuka berkas lampiran Drive/R2/Supabase.</li>
                            </ul>
                        </div>

                        <div className="bg-amber-50/70 p-3 rounded-xl border border-amber-200 space-y-1.5">
                            <strong className="text-amber-950 font-bold flex items-center gap-1.5">
                                <i className="bi bi-cash-coin text-amber-700"></i> 3. Tagihan Daftar Ulang &amp; Laporan Tunggakan Akurat
                            </strong>
                            <ul className="list-disc pl-4 text-[11px] text-amber-900 space-y-1">
                                <li>Panitia dapat langsung menerbitkan tagihan biaya masuk / uang pangkal daftar ulang beserta input <strong>Batas Tanggal Daftar Ulang (<code>jatuhTempo</code>)</strong>.</li>
                                <li>Di modul <strong>Keuangan &amp; Laporan Tunggakan</strong>, piutang daftar ulang menggunakan tanggal jatuh tempo/tahun ajaran tujuan sehingga tidak prematur terbaca sebagai tunggakan macet sebelum batas waktunya lewat.</li>
                            </ul>
                        </div>

                        <div className="bg-blue-50/70 p-3 rounded-xl border border-blue-200 space-y-1.5">
                            <strong className="text-blue-950 font-bold flex items-center gap-1.5">
                                <i className="bi bi-whatsapp text-blue-700"></i> 4. WhatsApp Center &amp; Ringkasan Dashboard Utama
                            </strong>
                            <ul className="list-disc pl-4 text-[11px] text-blue-900 space-y-1">
                                <li>Di menu <strong>WhatsApp Communication Center</strong>, seluruh pendaftar PSB tampil sebagai audiens khusus dengan nomor HP &amp; nama wali yang sudah dibersihkan otomatis serta mendukung variabel dinamis PSB untuk siaran info ujian/kelulusan.</li>
                                <li>Ringkasan metrik PSB tahun aktif juga otomatis tampil pada widget <strong>Dashboard Utama</strong> aplikasi.</li>
                            </ul>
                        </div>
                    </div>
                </div>
            )
        },
        {
            title: '7. SOP Kerja Multi-Admin (Hub & Spoke) & Kebijakan Penyimpanan Pasca-PSB',
            color: 'teal',
            content: (
                <div className="space-y-3.5 text-sm text-gray-700">
                    {/* Hub and Spoke */}
                    <div className="bg-gradient-to-br from-teal-900 to-slate-900 p-4 rounded-xl text-white space-y-3 shadow-sm">
                        <div className="flex items-center justify-between">
                            <span className="px-2.5 py-0.5 rounded-full bg-teal-400/20 text-teal-300 text-[10px] font-mono font-bold tracking-wide uppercase border border-teal-400/30">
                                Arsitektur Multi-Posko Terdistribusi
                            </span>
                            <span className="text-[11px] text-teal-200/80 flex items-center gap-1">
                                <i className="bi bi-broadcast"></i> Firebase Realtime / Dropbox Sync
                            </span>
                        </div>
                        <div>
                            <h4 className="font-bold text-base text-white flex items-center gap-2">
                                <i className="bi bi-diagram-3-fill text-teal-400"></i> Pembagian Peran &amp; SOP Sinkronisasi Tim Posko
                            </h4>
                            <p className="text-xs text-slate-300 leading-relaxed mt-1">
                                Didukung cache offline lokal (IndexedDB) dan sinkronisasi <strong>Hub &amp; Spoke</strong>, posko tetap berjalan lancar saat jaringan pondok terputus lalu melakukan rekonsiliasi otomatis ketika internet pulih.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 text-xs">
                            <div className="bg-white/10 p-2.5 rounded-lg border border-white/15 space-y-1">
                                <strong className="text-teal-300 block">1. Koordinator PSB (Hub Master)</strong>
                                <p className="text-[11px] text-slate-300">Mengatur TA PSB Aktif, kuota, konfigurasi backend Cloud, menarik data Cloud harian, serta mengesahkan SK Pengumuman Kelulusan &amp; Arsip Historis.</p>
                            </div>
                            <div className="bg-white/10 p-2.5 rounded-lg border border-white/15 space-y-1">
                                <strong className="text-emerald-300 block">2. Meja Verifikasi, Penguji &amp; Kasir (Spokes)</strong>
                                <p className="text-[11px] text-slate-300">Mencetak F-PSB &amp; Kartu Ujian, memverifikasi berkas Drive/R2/Supabase, menginput skor ujian seleksi, dan menindaklanjuti tagihan daftar ulang.</p>
                            </div>
                        </div>
                    </div>

                    {/* Pasca-PSB */}
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-2 text-xs text-blue-950">
                        <strong className="text-blue-900 text-sm font-bold flex items-center gap-2">
                            <i className="bi bi-info-circle-fill text-blue-600"></i> Kebijakan Penyimpanan Pasca-PSB &amp; Rotasi Tahun Baru
                        </strong>
                        <p className="leading-relaxed text-blue-900 text-[11px]">
                            Setelah masa PSB selesai, <strong>data pendaftar di Rekap PSB tidak mendesak untuk dihapus</strong> karena berkas berat (KK/Akta/Foto) berada di Google Drive / R2 / Supabase Storage dan data teks hanya memakan ~1–2 MB. Jika nantinya data pendaftar di Rekap PSB dihapus saat rotasi tahun baru, <strong>data santri yang sudah diterima di Buku Induk Santri tetap aman dan tidak ikut terhapus</strong>.
                        </p>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-2.5 text-xs text-gray-700">
                        <strong className="text-gray-900 font-bold block text-xs flex items-center gap-1.5">
                            <i className="bi bi-card-checklist text-teal-700"></i> SOP 4 Langkah Penutupan Gelombang / Tahun Ajaran PSB
                        </strong>
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-center pt-1">
                            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 space-y-1">
                                <span className="w-5 h-5 mx-auto bg-teal-700 text-white rounded-full flex items-center justify-center text-[10px] font-bold">1</span>
                                <strong className="text-slate-900 block text-[11px]">Terima Santri</strong>
                                <p className="text-[10px] text-gray-500">Pastikan seluruh peserta lulus sudah dikonversi ke Santri Aktif.</p>
                            </div>
                            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 space-y-1">
                                <span className="w-5 h-5 mx-auto bg-teal-700 text-white rounded-full flex items-center justify-center text-[10px] font-bold">2</span>
                                <strong className="text-slate-900 block text-[11px]">Kunci Arsip</strong>
                                <p className="text-[10px] text-gray-500">Simpan ringkasan ke <em>Arsip &amp; Dokumen PSB</em> untuk komparasi multi-tahun.</p>
                            </div>
                            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 space-y-1">
                                <span className="w-5 h-5 mx-auto bg-teal-700 text-white rounded-full flex items-center justify-center text-[10px] font-bold">3</span>
                                <strong className="text-slate-900 block text-[11px]">Ekspor Excel &amp; ZIP</strong>
                                <p className="text-[10px] text-gray-500">Unduh cadangan Excel Rekap &amp; tombol <em>Arsip ZIP</em> berkas lokal.</p>
                            </div>
                            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 space-y-1">
                                <span className="w-5 h-5 mx-auto bg-teal-700 text-white rounded-full flex items-center justify-center text-[10px] font-bold">4</span>
                                <strong className="text-slate-900 block text-[11px]">Rotasi TA Baru</strong>
                                <p className="text-[10px] text-gray-500">Ubah <em>TA PSB Aktif</em> (dan buat link GAS baru bila ingin Sheet terpisah).</p>
                            </div>
                        </div>
                    </div>
                </div>
            )
        }
    ]
};
