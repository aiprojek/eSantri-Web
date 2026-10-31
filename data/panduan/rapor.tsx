import React from 'react';
import { PanduanSectionData } from '../panduan';

export const raporPanduan: PanduanSectionData = {
    id: 'rapor',
    badge: 'Nilai',
    badgeColor: 'blue',
    title: 'Rapor Digital, Manajemen Nilai & SOP Multi-Admin',
    steps: [
        {
            title: '1. Arsitektur Penilaian & Pilihan Alur Kerja Rapor',
            color: 'blue',
            content: (
                <div className="space-y-3 text-sm">
                    <p className="text-gray-700 leading-relaxed">
                        Sistem Rapor Digital eSantri dirancang sangat fleksibel untuk mengakomodasi berbagai model operasional penilaian di pondok pesantren:
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                        <div className="bg-blue-50/80 p-3 rounded-xl border border-blue-200 space-y-1.5">
                            <h5 className="font-bold text-blue-900 flex items-center gap-1.5 text-xs">
                                <i className="bi bi-diagram-3-fill text-blue-600"></i> Model A: Desentralisasi Tanpa Login (1 Link GAS Multi-Tab &amp; Form HTML)
                            </h5>
                            <p className="text-gray-600 leading-relaxed">
                                Guru mata pelajaran <strong>tidak perlu akun login</strong> ke aplikasi. Bagian Kurikulum membuat formulir HTML (per rombel atau 1 file se-Jenjang), diisi guru di HP/laptop lalu dikirim ke <strong>1 Link Google Sheet Terpadu</strong> atau kode WhatsApp, kemudian ditarik ke aplikasi cukup <strong>1 klik lewat tombol Tarik Nilai GAS</strong>—lengkap dengan <strong>Portal Audit Tanpa Login (.html)</strong> untuk pengecekan pimpinan.
                            </p>
                        </div>
                        <div className="bg-teal-50/80 p-3 rounded-xl border border-teal-200 space-y-1.5">
                            <h5 className="font-bold text-teal-900 flex items-center gap-1.5 text-xs">
                                <i className="bi bi-people-fill text-teal-600"></i> Model B: Multi-Admin &amp; Kolaborasi Staf / Wali Kelas
                            </h5>
                            <p className="text-gray-600 leading-relaxed">
                                Wali kelas dan staf akademik login menggunakan akun mandiri masing-masing. Mereka dapat menginput nilai langsung, menarik setoran guru mapel khusus rombel binaannya dari GAS/WA, mengecek Leger Nilai, dan mencetak rapor santri secara reaktif.
                            </p>
                        </div>
                    </div>
                </div>
            )
        },
        {
            title: '2. Standar Operasional Prosedur (SOP) Multi-Admin: Realtime vs Hub-and-Spoke',
            color: 'purple',
            content: (
                <div className="space-y-4 text-sm">
                    <p className="text-gray-700 leading-relaxed">
                        Pengelolaan nilai rapor yang melibatkan banyak guru, wali kelas, dan bagian kurikulum memerlukan SOP sinkronisasi yang jelas. eSantri Web menyediakan 2 standar arsitektur:
                    </p>

                    {/* Format Standar 1: Realtime Mode */}
                    <div className="p-3.5 bg-teal-50/80 border border-teal-200 rounded-xl space-y-2.5">
                        <div className="flex items-center justify-between border-b border-teal-200/70 pb-2">
                            <h5 className="font-bold text-teal-950 flex items-center gap-2 text-xs md:text-sm">
                                <span className="w-5 h-5 rounded-full bg-teal-600 text-white flex items-center justify-center text-[10px] font-black">1</span>
                                Standar Format A: Mode Realtime (Firebase Cloud Hub)
                            </h5>
                            <span className="px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 text-[10px] font-bold uppercase tracking-wide">
                                Realtime &amp; Otomatis
                            </span>
                        </div>
                        <p className="text-xs text-gray-700 leading-relaxed">
                            Ideal digunakan jika seluruh perangkat (laptop Admin Kurikulum, laptop para Wali Kelas, dan tablet ruang guru) terhubung koneksi internet/WiFi pesantren yang stabil.
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 text-xs">
                            <div className="p-2.5 bg-white rounded-lg border border-teal-100 shadow-2xs space-y-1">
                                <strong className="text-teal-950 flex items-center gap-1.5 font-semibold text-[11px]">
                                    <i className="bi bi-cloud-check-fill text-teal-600"></i> Alur Kerja Input &amp; Auto-Sync:
                                </strong>
                                <ul className="list-disc pl-4 space-y-1 text-[11px] text-gray-600">
                                    <li>Setiap nilai atau catatan wali kelas yang diinput akan <strong>langsung tersimpan otomatis</strong> ke Firebase Cloud dalam hitungan detik.</li>
                                    <li>Monitoring kelengkapan nilai di meja Admin Kurikulum akan langsung ter-update (dari merah/kuning menjadi hijau) tanpa perlu refresh browser.</li>
                                    <li>Jika terjadi gangguan jaringan sesaat, sistem menyimpan ke IndexedDB lokal dan otomatis menyinkronkan begitu internet tersambung kembali.</li>
                                </ul>
                            </div>
                            <div className="p-2.5 bg-white rounded-lg border border-teal-100 shadow-2xs space-y-1">
                                <strong className="text-teal-950 flex items-center gap-1.5 font-semibold text-[11px]">
                                    <i className="bi bi-diagram-3-fill text-teal-600"></i> Partisi Kerja Anti-Tabrakan:
                                </strong>
                                <ul className="list-disc pl-4 space-y-1 text-[11px] text-gray-600">
                                    <li><strong>1 Rombel = 1 Wali Kelas:</strong> Jangan membuka dan menginput rombel yang sama dari dua perangkat berbeda pada detik yang sama.</li>
                                    <li>Jika 2 guru mapel mengisi nilai santri pada rombel yang sama, gunakan partisi mapel yang berbeda agar tidak saling menimpa nilai.</li>
                                    <li>Admin Kurikulum dapat mengklik <em>"Tarik Data Cloud"</em> di panel Pengaturan Cloud sewaktu-waktu untuk rekonsiliasi menyeluruh.</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {/* Format Standar 2: Hub-and-Spoke */}
                    <div className="p-3.5 bg-indigo-50/80 border border-indigo-200 rounded-xl space-y-2.5">
                        <div className="flex items-center justify-between border-b border-indigo-200/70 pb-2">
                            <h5 className="font-bold text-indigo-950 flex items-center gap-2 text-xs md:text-sm">
                                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-black">2</span>
                                Standar Format B: Mode Hub-and-Spoke (Offline-First / Cloud Pairing / File Cadangan)
                            </h5>
                            <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-[10px] font-bold uppercase tracking-wide">
                                Hybrid / Terjadwal
                            </span>
                        </div>
                        <p className="text-xs text-gray-700 leading-relaxed">
                            Standar utama jika para guru/wali kelas bekerja di rumah atau area asrama tanpa internet terus-menerus. Laptop Kantor Kurikulum bertindak sebagai <strong>HUB (Pusat)</strong> dan laptop masing-masing guru bertindak sebagai <strong>SPOKE (Cabang)</strong>.
                        </p>

                        <div className="space-y-2 pt-1 text-xs">
                            <div className="p-2.5 bg-white rounded-lg border border-indigo-100 space-y-1">
                                <strong className="text-indigo-950 flex items-center gap-1.5 font-semibold text-[11px]">
                                    <i className="bi bi-hdd-network-fill text-indigo-600"></i> Peran HUB (Laptop Kantor Kurikulum / Super Admin):
                                </strong>
                                <p className="text-[11px] text-gray-600 leading-relaxed">
                                    Membuat dan mengunci desain rapor, menetapkan rumus bobot nilai, serta menerbitkan paket master data awal kepada seluruh staf. Menjadi muara penggabungan (*merge*) seluruh berkas nilai dari staf.
                                </p>
                            </div>

                            <div className="p-2.5 bg-white rounded-lg border border-indigo-100 space-y-1">
                                <strong className="text-indigo-950 flex items-center gap-1.5 font-semibold text-[11px]">
                                    <i className="bi bi-laptop-fill text-indigo-600"></i> Peran SPOKE (Laptop Mandiri Wali Kelas &amp; Guru):
                                </strong>
                                <p className="text-[11px] text-gray-600 leading-relaxed">
                                    Menginput nilai santri secara bebas di rumah atau ruang kelas tanpa internet. Data tersimpan aman di penyimpanan lokal browser (IndexedDB).
                                </p>
                            </div>

                            <div className="p-2.5 bg-white rounded-lg border border-indigo-100 space-y-1.5">
                                <strong className="text-indigo-950 flex items-center gap-1.5 font-semibold text-[11px]">
                                    <i className="bi bi-arrow-repeat text-indigo-600"></i> Alur Siklus Penggabungan (Merging Cycle) Musim Rapor:
                                </strong>
                                <ol className="list-decimal pl-4 space-y-1 text-[11px] text-gray-600">
                                    <li><strong>Tahap 1 - Ambil Master Awal:</strong> Di awal pekan penilaian, guru menyambungkan laptop ke internet/tethering dan login. Sistem melakukan <em>Auto-Pull</em> master data template rapor &amp; daftar santri terbaru dari HUB.</li>
                                    <li><strong>Tahap 2 - Input Offline di Rumah/Kelas:</strong> Guru menginput nilai ulangan, tugas, kehadiran, dan catatan santri secara mandiri.</li>
                                    <li><strong>Tahap 3 - Kirim Perubahan (Upload Spoke):</strong> Setelah penginputan selesai atau saat tersambung WiFi, guru membuka menu <em>Sinkronisasi &gt; Kirim Perubahan (Upload Staff Changes)</em>.</li>
                                    <li><strong>Tahap 4 - Penggabungan di HUB (Merge Changes):</strong> Admin Kurikulum membuka menu <em>Sinkronisasi &gt; Gabungkan Perubahan Staff (Merge Changes)</em>. Nilai dari seluruh guru dirajut menjadi satu database utuh tanpa menimpa data santri lainnya.</li>
                                    <li><strong>Tahap 5 - Publikasi Master Akhir (Publish Master):</strong> Setelah semua nilai terverifikasi 100%, Admin mengeklik <em>"Terbitkan Master Data (Publish Master)"</em> agar seluruh wali kelas dapat menarik rekap final untuk mencetak rapor.</li>
                                </ol>
                            </div>
                        </div>
                    </div>

                    {/* Matriks Peran & Wewenang */}
                    <div className="pt-1">
                        <h6 className="font-bold text-gray-800 text-xs mb-2 flex items-center gap-1.5">
                            <i className="bi bi-person-badge-fill text-purple-600"></i> Matriks Peran &amp; Wewenang Akun Rapor:
                        </h6>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                            <div className="bg-white p-3 rounded-xl border border-purple-200 shadow-2xs space-y-1">
                                <span className="inline-block px-2 py-0.5 rounded bg-purple-100 text-purple-800 font-bold text-[10px] uppercase">
                                    Super Admin / Kurikulum
                                </span>
                                <strong className="block text-gray-800 font-semibold text-xs mt-1">Otoritas Master, GAS &amp; Template</strong>
                                <ul className="list-disc pl-4 text-gray-600 space-y-1 text-[11px]">
                                    <li>Menetapkan Tahun Ajaran, Semester &amp; 1 Link GAS Pondok.</li>
                                    <li>Mendesain template rapor, rumus &amp; menerbitkan Form/Portal HTML.</li>
                                    <li>Menarik nilai seluruh rombel via <strong>Tarik Nilai GAS</strong>.</li>
                                    <li>Mengunci nilai rombel, *Merge* &amp; *Publish* master data.</li>
                                </ul>
                            </div>

                            <div className="bg-white p-3 rounded-xl border border-teal-200 shadow-2xs space-y-1">
                                <span className="inline-block px-2 py-0.5 rounded bg-teal-100 text-teal-800 font-bold text-[10px] uppercase">
                                    Wali Kelas (Staf Akademik)
                                </span>
                                <strong className="block text-gray-800 font-semibold text-xs mt-1">Input, Tarik Rombel &amp; Cetak</strong>
                                <ul className="list-disc pl-4 text-gray-600 space-y-1 text-[11px]">
                                    <li>Fokus otomatis hanya pada rombel binaannya masing-masing.</li>
                                    <li>Bisa klik <strong>Tarik Nilai GAS / Import WA</strong> (otomatis terfilter khusus rombel ampuannya).</li>
                                    <li>Tarik presensi &amp; tahfizh, isi catatan sikap, serta review Leger.</li>
                                    <li>Memverifikasi nilai &amp; mencetak buku rapor santri kelasnya.</li>
                                </ul>
                            </div>

                            <div className="bg-white p-3 rounded-xl border border-indigo-200 shadow-2xs space-y-1">
                                <span className="inline-block px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 font-bold text-[10px] uppercase">
                                    Guru Mapel &amp; Tim Audit
                                </span>
                                <strong className="block text-gray-800 font-semibold text-xs mt-1">Setor Nilai &amp; Cek Tanpa Login</strong>
                                <ul className="list-disc pl-4 text-gray-600 space-y-1 text-[11px]">
                                    <li>Guru membuka file HTML Ledger di HP/laptop tanpa akun login.</li>
                                    <li>Kirim nilai ke Google Sheet (1 klik) atau salin blok kode WA.</li>
                                    <li>Kepala Madrasah / Pengurus memantau rekap &amp; mapel kosong lewat file <strong>Portal Audit (.html)</strong> tanpa login.</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {/* Disiplin Keamanan & Sesi */}
                    <div className="bg-amber-50 border-l-4 border-amber-500 p-3 rounded-r-xl text-xs text-amber-950 space-y-1.5">
                        <strong className="flex items-center gap-1.5 font-bold text-amber-900">
                            <i className="bi bi-shield-lock-fill text-base"></i> Aturan Disiplin Sesi Akun &amp; Audit Trail Nilai:
                        </strong>
                        <ol className="list-decimal pl-4 space-y-1 text-gray-700">
                            <li><strong>Kepatuhan Logout Saat Pergantian Perangkat:</strong> Di ruang guru atau laboratorium komputer yang dipakai bersama, staf <strong>WAJIB LOGOUT</strong> setelah selesai input. Setiap perubahan nilai merekam ID staf yang login (*Audit Trail*).</li>
                            <li><strong>Kunci Desain Template (Freeze Template):</strong> Dilarang mengedit struktur kolom atau rumus pada menu <em>Desain Rapor</em> saat musim input nilai sedang berjalan aktif.</li>
                            <li><strong>Backup Mandiri JSON Mingguan:</strong> Admin Kurikulum wajib mengunduh cadangan (*Backup JSON*) di <em>Pengaturan &gt; Backup</em> setiap hari Jumat selama musim ujian/rapor.</li>
                        </ol>
                    </div>
                </div>
            )
        },
        {
            title: '3. Desain Grid, Alat Editing Lanjutan & Variabel Kurikulum Merdeka',
            color: 'indigo',
            content: (
                <div className="space-y-4 text-sm">
                    <p className="text-gray-700 leading-relaxed">
                        Menu <strong>Rapor &gt; Design &amp; Template</strong> menyediakan spreadsheet visual berfitur lengkap untuk menyusun format lembar nilai, ijazah, maupun syahadah:
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                        <div className="p-3 bg-white rounded-xl border border-indigo-200 shadow-2xs space-y-1.5">
                            <strong className="text-indigo-900 flex items-center gap-1.5 font-bold">
                                <i className="bi bi-arrow-counterclockwise text-indigo-600"></i> Riwayat Undo &amp; Redo (25 Langkah)
                            </strong>
                            <p className="text-gray-600 leading-relaxed">
                                Bebas bereksperimen tanpa khawatir salah format. Gunakan tombol panah di toolbar atau pintasan keyboard:
                            </p>
                            <ul className="list-disc pl-4 space-y-1 text-gray-600">
                                <li><kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded font-mono text-[10px]">Ctrl + Z</kbd> : Membatalkan perubahan terakhir (Undo).</li>
                                <li><kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded font-mono text-[10px]">Ctrl + Y</kbd> atau <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded font-mono text-[10px]">Ctrl + Shift + Z</kbd> : Mengulang kembali perubahan (Redo).</li>
                            </ul>
                        </div>

                        <div className="p-3 bg-white rounded-xl border border-indigo-200 shadow-2xs space-y-1.5">
                            <strong className="text-indigo-900 flex items-center gap-1.5 font-bold">
                                <i className="bi bi-grid-3x3 text-indigo-600"></i> Seleksi Multi-Sel, Format Huruf &amp; AutoSum
                            </strong>
                            <p className="text-gray-600 leading-relaxed">
                                Klik dan seret (drag) mouse atau tekan <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded font-mono text-[10px]">Shift + Klik</kbd> untuk memilih banyak sel sekaligus. Pita aksi melayang (<em>floating ribbon</em>) menyediakan:
                            </p>
                            <ul className="list-disc pl-4 space-y-1 text-gray-600">
                                <li><strong>Blok Sel ke Formula ala Excel:</strong> Saat mengetik rumus (misal <code>=SUM(</code> atau <code>=RATA2(</code>), langsung klik atau seret blok sel di tabel untuk menyisipkan rentang <code>D6:D15</code> secara otomatis.</li>
                                <li><strong>Tombol Cepat <code>Σ Jumlah</code> &amp; <code>x̄ Rerata</code>:</strong> Blok deretan sel nilai lalu klik <strong>Σ Jumlah</strong> atau <strong>x̄ Rerata</strong> untuk membuat rumus otomatis di sel bawah/kanan.</li>
                                <li><strong>Format Huruf Instan (<code>AA</code> / <code>aa</code> / <code>Aa</code> / <code>Ab.</code>):</strong> Ubah teks menjadi HURUF BESAR, huruf kecil, Kapital Tiap Kata, atau Kapital Awal Kalimat dalam 1 klik.</li>
                            </ul>
                        </div>
                    </div>

                    {/* Fill Series, AutoFill & Kunci Referensi Rumus ($) */}
                    <div className="p-3.5 bg-teal-50/70 rounded-xl border border-teal-200 space-y-2 text-xs">
                        <strong className="text-teal-950 flex items-center gap-1.5 font-bold">
                            <i className="bi bi-plus-square-dotted text-teal-600"></i> Fill Series (Deret Otomatis), Tarik Rumus &amp; Kunci Referensi Sel (<code>$</code> / <code>F4</code>)
                        </strong>
                        <p className="text-gray-700 leading-relaxed">
                            Pilih satu atau beberapa sel, lalu arahkan kursor ke <strong>kotak kecil di pojok kanan bawah seleksi (Fill Handle)</strong> hingga berubah menjadi tanda tambah (<code>+</code>). Seret ke bawah, atas, kanan, atau kiri — atau <strong>klik ganda (double-click)</strong> kotak tersebut untuk mengisi otomatis sampai baris terakhir tabel:
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-[11px]">
                            <div className="p-2.5 bg-white rounded-lg border border-teal-200 space-y-1">
                                <strong className="text-teal-900 block">1. Lanjut Deret (Fill Series) Pintar</strong>
                                <ul className="list-disc pl-4 space-y-0.5 text-gray-600">
                                    <li><strong>Nomor &amp; Pola Angka:</strong> Blok <code>1</code> &amp; <code>2</code> (atau angka <code>1</code> pada kolom Nomor) lalu tarik untuk menghasilkan <code>3, 4, 5...</code> (termasuk angka Arab <code>١, ٢, ٣...</code>). Angka tunggal seperti KKM <code>75</code> otomatis disalin tetap <code>75</code> (tahan <kbd className="px-1 py-0.5 bg-gray-100 border border-gray-300 rounded font-mono text-[10px]">Ctrl</kbd> saat menarik jika ingin diurutkan <code>76, 77...</code>).</li>
                                    <li><strong>Teks Bernomor &amp; Kode Input:</strong> <code>UH 1</code> &rarr; <code>UH 2, UH 3</code>, <code>1.</code> &rarr; <code>2., 3.</code>, serta kunci nilai <code>$UH1</code> &rarr; <code>$UH2</code>.</li>
                                    <li><strong>Kalender Pesantren &amp; Umum:</strong> Nama Hari (<code>Senin</code>–<code>Minggu</code> / <code>Ahad</code>–<code>Sabtu</code>), Bulan Masehi (<code>Januari</code>–<code>Desember</code>), dan Bulan Hijriah (<code>Muharram</code>–<code>Dzulhijjah</code>).</li>
                                </ul>
                            </div>
                            <div className="p-2.5 bg-white rounded-lg border border-teal-200 space-y-1">
                                <strong className="text-teal-900 block">2. Tarik Rumus &amp; Kunci Komponen <code>$</code> (Tombol <code>F4</code>)</strong>
                                <ul className="list-disc pl-4 space-y-0.5 text-gray-600">
                                    <li><strong>Relatif Otomatis:</strong> Menarik <code>=RATA2_KELAS(D6)</code> atau <code>=PREDIKAT(D6, C6)</code> ke bawah otomatis menjadi <code>D7</code>, <code>D8</code>, dst. (termasuk menggeser kode input <code>$MAPEL</code> baris berikutnya).</li>
                                    <li><strong>Kunci Absolut &amp; Campuran (<code>$</code>):</strong> Tekan <kbd className="px-1 py-0.5 bg-gray-100 border border-gray-300 rounded font-mono text-[10px]">F4</kbd> atau klik tombol <strong>$ Kunci (F4)</strong> saat mengedit rumus untuk memutar kunci: <code>D6</code> &rarr; <code>$D$6</code> (kunci penuh) &rarr; <code>D$6</code> (kunci baris) &rarr; <code>$D6</code> (kunci kolom). Contoh rasio kumulatif: <code>=SUM($D$6:D6)</code>.</li>
                                    <li><strong>Pintasan &amp; Opsi Pasca-Tarik:</strong> Gunakan <kbd className="px-1 py-0.5 bg-gray-100 border border-gray-300 rounded font-mono text-[10px]">Ctrl + D</kbd> (Isi Bawah), <kbd className="px-1 py-0.5 bg-gray-100 border border-gray-300 rounded font-mono text-[10px]">Ctrl + R</kbd> (Isi Kanan), atau pilih mode pada bilah <strong>Opsi AutoFill</strong> (<em>Seri &amp; Lanjut Rumus</em>, <em>Urutkan Angka</em>, <em>Salin Persis</em>, <em>Format Saja</em>).</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {/* Page Break Guide & Dynamic Repeater */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                        <div className="p-3 bg-indigo-50/70 rounded-xl border border-indigo-200 space-y-1.5">
                            <strong className="text-indigo-950 flex items-center gap-1.5 font-bold">
                                <i className="bi bi-file-earmark-break text-indigo-600"></i> Fit Halaman ala Excel &amp; Oper Multi-Halaman Otomatis
                            </strong>
                            <p className="text-gray-600 leading-relaxed">
                                Pada panel <strong>Setelan Lembar</strong> &amp; <strong>Preview Cetak</strong>, tersedia mode <strong>Fit Dokumen ke 1 Halaman</strong>, <strong>Fit Lebar ke X Halaman</strong> (1–4 hal), <strong>Fit Tinggi ke Y Halaman</strong> (Otomatis / 1–5 hal), serta <strong>Skala Manual (%)</strong>. Jika tidak dipaksa 1 halaman, sisa baris bagian bawah otomatis di-oper rapi ke <strong>Halaman 2, 3, dst.</strong> lengkap dengan opsi <strong>Ulangi Judul Tabel</strong> dan penanda garis <code>BATAS HALAMAN</code> di kanvas.
                            </p>
                        </div>

                        <div className="p-3 bg-indigo-50/70 rounded-xl border border-indigo-200 space-y-1.5">
                            <strong className="text-indigo-950 flex items-center gap-1.5 font-bold">
                                <i className="bi bi-table text-indigo-600"></i> Baris Dinamis Mata Pelajaran (+ Mapel)
                            </strong>
                            <p className="text-gray-600 leading-relaxed">
                                Cukup buat 1 baris template mata pelajaran, lalu klik tombol <strong>"+ Mapel"</strong>. Sistem otomatis menyalin struktur kolom (Nomor, Nama Mapel, KKM, Nilai, Deskripsi) sesuai jumlah mata pelajaran di rombel santri.
                            </p>
                        </div>
                    </div>

                    {/* Integrasi KKM Data Master & Deteksi Mapel Manual */}
                    <div className="p-3.5 bg-amber-50/80 rounded-xl border border-amber-200 space-y-2 text-xs">
                        <strong className="text-amber-950 flex items-center gap-1.5 font-bold">
                            <i className="bi bi-bullseye text-amber-600"></i> Integrasi KKM Otomatis dari Data Master &amp; Deteksi Nama Mapel Manual
                        </strong>
                        <p className="text-gray-700 leading-relaxed">
                            Standar KKM di Rapor kini terhubung langsung dengan <strong>Data Master &gt; Akademik &amp; Kurikulum &gt; Mata Pelajaran</strong> (difilter cerdas sesuai Jenjang, Kelas, dan Rombel aktif) baik ketika tabel dibuat otomatis maupun diketik manual:
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-[11px]">
                            <div className="p-2.5 bg-white rounded-lg border border-amber-200 space-y-1">
                                <strong className="text-amber-900 block">1. Kolom KKM Dinamis (<code>$KKM</code>)</strong>
                                <p className="text-gray-600 leading-relaxed">
                                    Saat memakai <strong>Generate dari Kurikulum</strong>, kolom KKM otomatis menggunakan mode <strong>KKM Dinamis (<code>$KKM</code>)</strong>. Jika suatu saat angka KKM di Data Master diubah, seluruh tampilan Rapor, Leger, dan Cetak langsung ikut diperbarui tanpa mengedit ulang grid.
                                </p>
                            </div>
                            <div className="p-2.5 bg-white rounded-lg border border-amber-200 space-y-1">
                                <strong className="text-amber-900 block">2. Deteksi Mapel Ketikan Manual</strong>
                                <p className="text-gray-600 leading-relaxed">
                                    Walaupun nama mata pelajaran ditulis manual oleh user (misal <code>1. Fiqih Ibadah</code>, nama kitab <code>Al-Jurumiyah</code>, singkatan/kode mapel, variasi ejaan <em>Fiqih/Fikih</em>, atau kode input <code>$NAHWU</code>), tag <code>$KKM</code> &amp; rumus <code>=KKM(B6)</code> otomatis memindai baris tersebut dan mencocokkan KKM-nya ke Data Master. Jika mapel kustom belum terdaftar di Data Master, sistem otomatis memakai KKM standar rata-rata jenjang/kelas.
                                </p>
                            </div>
                            <div className="p-2.5 bg-white rounded-lg border border-amber-200 space-y-1">
                                <strong className="text-amber-900 block">3. Indikator Live di Panel Properti</strong>
                                <p className="text-gray-600 leading-relaxed">
                                    Klik sel berisi <code>$KKM</code> atau <code>=KKM(...)</code> di <strong>Desain Rapor</strong> untuk melihat kartu diagnostik <strong>Integrasi KKM Data Master</strong> pada panel kanan — menampilkan mata pelajaran Data Master apa yang berhasil dikenali pada baris itu beserta angka KKM-nya.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Tag Kurikulum Merdeka */}
                    <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-2 text-xs">
                        <strong className="text-gray-900 flex items-center gap-1.5 font-bold">
                            <i className="bi bi-tags-fill text-indigo-600"></i> Variabel Otomatis &amp; Tag Kurikulum Merdeka (CP / TP)
                        </strong>
                        <p className="text-gray-600 leading-relaxed">
                            Ketik simbol <code>$</code> pada sel untuk memilih variabel otomatis. Sistem telah dilengkapi tag resmi Kurikulum Merdeka dan rapor pesantren modern:
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                            <div className="p-2 bg-white rounded border border-gray-200">
                                <code>$DESKRIPSI_CAPAIAN_TERTINGGI</code>
                                <p className="text-gray-500 mt-0.5">Otomatis merangkum kompetensi capaian pembelajaran yang paling dikuasai santri.</p>
                            </div>
                            <div className="p-2 bg-white rounded border border-gray-200">
                                <code>$DESKRIPSI_CAPAIAN_TERENDAH</code>
                                <p className="text-gray-500 mt-0.5">Otomatis menghasilkan rekomendasi bimbingan pada kompetensi yang perlu ditingkatkan.</p>
                            </div>
                            <div className="p-2 bg-white rounded border border-gray-200">
                                <code>$DESKRIPSI_KOMPETENSI</code>
                                <p className="text-gray-500 mt-0.5">Ringkasan narasi pencapaian kompetensi gabungan untuk kolom catatan mapel.</p>
                            </div>
                            <div className="p-2 bg-white rounded border border-gray-200">
                                <code>$STATUS_KELULUSAN</code>
                                <p className="text-gray-500 mt-0.5">Keterangan kenaikan kelas / kelulusan santri (misal: "Naik ke Kelas VIII").</p>
                            </div>
                        </div>
                    </div>
                </div>
            )
        },
        {
            title: '4. Referensi Lengkap Rumus Formula & Kode Pemanggil Dinamis ($TAG)',
            color: 'purple',
            content: (
                <div className="space-y-4 text-sm">
                    <p className="text-gray-700 leading-relaxed">
                        Gunakan rumus diawali tanda <code>=</code> (pada sel bertipe <strong>Rumus / Formula</strong> maupun teks biasa) dan kode variabel diawali tanda <code>$</code> (pada sel <strong>Data Dinamis</strong> atau di dalam kalimat/rumus) untuk mengotomatiskan seluruh isi rapor:
                    </p>

                    {/* A. Rumus Hitung Nilai & Blok Sel Excel */}
                    <div className="p-3.5 bg-amber-50/70 rounded-xl border border-amber-200 space-y-2 text-xs">
                        <strong className="text-amber-950 flex items-center gap-1.5 font-bold">
                            <i className="bi bi-calculator-fill text-amber-600"></i> A. Rumus Perhitungan Nilai, Predikat &amp; Konversi Angka (Mendukung Blok Sel ala Excel)
                        </strong>
                        <p className="text-gray-600 text-[11px]">
                            Anda dapat memanggil nilai menggunakan <strong>rentang koordinat sel</strong> (cukup klik/seret sel saat mengetik rumus, contoh <code>D6:D15</code>) maupun menggunakan <strong>kode variabel mapel</strong> (contoh <code>$NAHWU, $SHARAF</code>). Saat rumus ditarik ke bawah/samping (<em>AutoFill</em>), koordinat akan menyesuaikan otomatis kecuali dikunci dengan tanda <code>$</code> menggunakan tombol <kbd className="px-1 py-0.5 bg-white border border-amber-300 rounded font-mono text-[10px]">F4</kbd> (<code>$D$6</code> kunci baris &amp; kolom, <code>D$6</code> kunci baris, <code>$D6</code> kunci kolom):
                        </p>
                        <div className="overflow-x-auto">
                            <table className="w-full text-[11px] bg-white rounded-lg border border-amber-200 overflow-hidden">
                                <thead className="bg-amber-100/80 text-amber-950">
                                    <tr>
                                        <th className="text-left p-2 font-bold border-b border-amber-200">Contoh Penulisan Rumus</th>
                                        <th className="text-left p-2 font-bold border-b border-amber-200">Fungsi &amp; Hasil Otomatis</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-amber-100 text-gray-700">
                                    <tr>
                                        <td className="p-2 font-mono text-amber-900 whitespace-nowrap">=SUM(D6:D15)</td>
                                        <td className="p-2">Menjumlahkan seluruh nilai pada blok sel <code>D6</code> sampai <code>D15</code> (alias: <code>=JUMLAH(...)</code>, <code>=TOTAL(...)</code>).</td>
                                    </tr>
                                    <tr>
                                        <td className="p-2 font-mono text-amber-900 whitespace-nowrap">=RATA2(D6:D15)</td>
                                        <td className="p-2">Menghitung nilai rata-rata santri dari blok sel atau daftar variabel (alias: <code>=AVERAGE(...)</code>, <code>=RERATA(...)</code>).</td>
                                    </tr>
                                    <tr>
                                        <td className="p-2 font-mono text-amber-900 whitespace-nowrap">=RATA2_KELAS(D6)</td>
                                        <td className="p-2">
                                            Menghitung <strong>rerata kelas untuk suatu mata pelajaran</strong> dari seluruh santri di rombel. Cukup klik sel nilai mapel (misal <code>D6</code>) atau tulis kode variabelnya <code>=RATA2_KELAS($FIQIH)</code>. Mendukung jumlah desimal opsional (<code>=RATA2_KELAS(D6, 1)</code>), pemanggilan tanpa argumen <code>=RATA2_KELAS()</code> / <code>$RATA_RATA_KELAS</code> untuk rata-rata umum kelas, serta alias <code>=RERATA_KELAS(...)</code> dan <code>=NRK(...)</code>.
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="p-2 font-mono text-amber-900 whitespace-nowrap">=MAX(D6:D15) / =MIN(D6:D15)</td>
                                        <td className="p-2">Mengambil nilai tertinggi (<code>MAX</code>) atau terendah (<code>MIN</code>) dari blok sel nilai.</td>
                                    </tr>
                                    <tr>
                                        <td className="p-2 font-mono text-amber-900 whitespace-nowrap">=ROUND(D16, 1)</td>
                                        <td className="p-2">Membulatkan angka desimal (contoh <code>1</code> angka di belakang koma, atau <code>0</code> untuk bilangan bulat).</td>
                                    </tr>
                                    <tr>
                                        <td className="p-2 font-mono text-amber-900 whitespace-nowrap">=PREDIKAT(D6, &quot;huruf&quot;)</td>
                                        <td className="p-2">Konversi nilai ke predikat: <code>&quot;huruf&quot;</code> (A–E), <code>&quot;pesantren&quot;</code> (Mumtaz–Rasib), <code>&quot;arab_script&quot;</code> (ممتاز), atau <code>&quot;deskripsi&quot;</code> (Sangat Baik–Perlu Bimbingan).</td>
                                    </tr>
                                    <tr>
                                        <td className="p-2 font-mono text-amber-900 whitespace-nowrap">=TERBILANG(D6)</td>
                                        <td className="p-2">Mengubah angka menjadi huruf Bahasa Indonesia (contoh: <code>85</code> &rarr; <em>Delapan Puluh Lima</em>).</td>
                                    </tr>
                                    <tr>
                                        <td className="p-2 font-mono text-amber-900 whitespace-nowrap">=ARAB(D6)</td>
                                        <td className="p-2">Mengubah angka Latin menjadi angka Arab Timur (contoh: <code>85</code> &rarr; <code>٨٥</code>).</td>
                                    </tr>
                                    <tr>
                                        <td className="p-2 font-mono text-amber-900 whitespace-nowrap">=KKM(B6) / =KKM()</td>
                                        <td className="p-2">
                                            Mengambil <strong>standar KKM resmi dari Data Master</strong> untuk mata pelajaran pada sel <code>B6</code> (atau tanpa argumen <code>=KKM()</code> untuk mendeteksi otomatis mapel di baris yang sama). Mendukung nama mapel manual, nama kitab, kode mapel, maupun variabel seperti <code>=KKM($FIQIH)</code>, serta nilai cadangan opsional <code>=KKM(B6, 75)</code> bila mapel kustom belum ada di Data Master (alias: <code>=NILAI_KKM(...)</code>, <code>=STANDAR_KKM(...)</code>).
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="p-2 font-mono text-amber-900 whitespace-nowrap">=IF(D6&gt;=KKM(B6), &quot;Tuntas&quot;, &quot;Remidi&quot;)</td>
                                        <td className="p-2">Logika perbandingan syarat terhadap KKM dinamis Data Master maupun angka tetap seperti <code>=IF(D6&gt;=75, &quot;Tuntas&quot;, &quot;Remidi&quot;)</code> (mendukung <code>&gt;=</code>, <code>&lt;=</code>, <code>&gt;</code>, <code>&lt;</code>, <code>=</code>, <code>&lt;&gt;</code>; alias: <code>=JIKA(...)</code>).</td>
                                    </tr>
                                    <tr>
                                        <td className="p-2 font-mono text-amber-900 whitespace-nowrap">=RANK($TOTAL_NILAI, &quot;rombel&quot;)</td>
                                        <td className="p-2">Menampilkan peringkat santri di dalam rombel secara otomatis.</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* B. Rumus Teks, Spasi & Tahun Ajaran */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                        <div className="p-3.5 bg-indigo-50/70 rounded-xl border border-indigo-200 space-y-2">
                            <strong className="text-indigo-950 flex items-center gap-1.5 font-bold">
                                <i className="bi bi-fonts text-indigo-600"></i> B. Rumus Gabung Teks (Spasi Terjaga) &amp; Format Huruf
                            </strong>
                            <ul className="space-y-1.5 text-[11px] text-gray-700">
                                <li>
                                    <code className="text-indigo-900 font-bold">=CONCAT(&quot;Semester &quot;, $SEMESTER, &quot; T.A. &quot;, TAHUN_AJAR())</code>
                                    <p className="text-gray-600">Menggabungkan teks &amp; rumus/variabel. Spasi di dalam tanda kutip (termasuk <code>&quot; &quot;</code>) dipertahankan utuh agar kata tidak menyambung.</p>
                                </li>
                                <li>
                                    <code className="text-indigo-900 font-bold">=CONCAT_SPASI(&quot;Kelas&quot;, $KELAS, $ROMBEL)</code>
                                    <p className="text-gray-600">Menggabungkan beberapa teks/variabel dan otomatis menyisipkan 1 spasi rapi di antara kata.</p>
                                </li>
                                <li>
                                    <code className="text-indigo-900 font-bold">=&quot;Marhalah &quot; &amp; $JENJANG</code>
                                    <p className="text-gray-600">Alternatif penggabungan cepat menggunakan operator <code>&amp;</code> seperti di Excel.</p>
                                </li>
                                <li>
                                    <code className="text-indigo-900 font-bold">=UPPER($NAMA)</code> / <code className="text-indigo-900 font-bold">=LOWER(...)</code> / <code className="text-indigo-900 font-bold">=PROPER(...)</code> / <code className="text-indigo-900 font-bold">=SENTENCE(...)</code>
                                    <p className="text-gray-600">Mengubah hasil teks menjadi HURUF BESAR, huruf kecil, Kapital Tiap Kata, atau Kapital Awal Kalimat.</p>
                                </li>
                            </ul>
                        </div>

                        <div className="p-3.5 bg-teal-50/70 rounded-xl border border-teal-200 space-y-2">
                            <strong className="text-teal-950 flex items-center gap-1.5 font-bold">
                                <i className="bi bi-calendar-range text-teal-600"></i> C. Tahun Ajaran (Masehi, Hijriah &amp; Gabungan) &amp; Semester
                            </strong>
                            <ul className="space-y-1.5 text-[11px] text-gray-700">
                                <li>
                                    <code className="text-teal-900 font-bold">=TAHUN_AJAR()</code> atau <code className="text-teal-900 font-bold">$TAHUN_AJAR</code>
                                    <p className="text-gray-600">Otomatis mengikuti pengaturan Tahun Ajaran Aktif di Data Master (Masehi atau Gabungan bila opsi Hijriah aktif).</p>
                                </li>
                                <li>
                                    <code className="text-teal-900 font-bold">=TAHUN_AJAR_MASEHI()</code> atau <code className="text-teal-900 font-bold">$TAHUN_AJAR_MASEHI</code>
                                    <p className="text-gray-600">Khusus Masehi (<code>2026/2027</code>). Gunakan <code>=TAHUN_AJAR_MASEHI(&quot;m&quot;)</code> untuk akhiran <code>M</code> atau <code>&quot;arab&quot;</code> untuk angka Arab.</p>
                                </li>
                                <li>
                                    <code className="text-teal-900 font-bold">=TAHUN_AJAR_HIJRIAH()</code> atau <code className="text-teal-900 font-bold">$TAHUN_AJAR_HIJRIAH</code>
                                    <p className="text-gray-600">Khusus Hijriah (<code>1448/1449 H</code>). Gunakan argumen <code>&quot;polos&quot;</code> (tanpa H) atau <code>&quot;arab&quot;</code> (<code>١٤٤٨/١٤٤٩ هـ</code>).</p>
                                </li>
                                <li>
                                    <code className="text-teal-900 font-bold">=TAHUN_AJAR_GABUNGAN()</code> atau <code className="text-teal-900 font-bold">$TAHUN_AJAR_GABUNGAN</code>
                                    <p className="text-gray-600">Gabungan Hijriah &amp; Masehi (<code>1448/1449 H / 2026/2027 M</code>), atau <code>&quot;masehi_dulu&quot;</code> untuk Masehi di depan.</p>
                                </li>
                                <li>
                                    <code className="text-teal-900 font-bold">=SEMESTER()</code> / <code className="text-teal-900 font-bold">=SEMESTER(&quot;angka&quot;)</code> / <code className="text-teal-900 font-bold">=SEMESTER(&quot;romawi&quot;)</code>
                                    <p className="text-gray-600">Menampilkan semester aktif dalam bentuk teks (<code>Ganjil</code>/<code>Genap</code>), angka (<code>1</code>/<code>2</code>), atau Romawi (<code>I</code>/<code>II</code>).</p>
                                </li>
                            </ul>
                        </div>
                    </div>

                    {/* D. Rumus Titimangsa (Tempat & Tanggal Penandatanganan Rapor: Gabungan & Sendiri-Sendiri) */}
                    <div className="p-3.5 bg-emerald-50/70 rounded-xl border border-emerald-200 space-y-2.5 text-xs">
                        <strong className="text-emerald-950 flex items-center gap-1.5 font-bold">
                            <i className="bi bi-calendar-check-fill text-emerald-600"></i> D. Rumus Titimangsa (Tempat &amp; Tanggal Penandatanganan Rapor — Hijriah, Masehi &amp; Gabungan)
                        </strong>
                        <p className="text-gray-700 text-[11px] leading-relaxed">
                            Seluruh rumus di bawah ini terhubung langsung ke pengaturan <strong>Titimangsa (Tempat, Tanggal &amp; Format Kalender)</strong> pada tab <strong>Cetak Rapor</strong>. Anda dapat memanggilnya sebagai <strong>Titimangsa Utuh (Kota + Tanggal)</strong> maupun <strong>Sendiri-Sendiri (Tempat saja / Tanggal saja)</strong>:
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-[11px]">
                            <div className="p-2.5 bg-white rounded-lg border border-emerald-200 space-y-1.5">
                                <strong className="text-emerald-900 block">1. Titimangsa Lengkap (Tempat + Tanggal)</strong>
                                <ul className="space-y-1 text-gray-700">
                                    <li>
                                        <code className="text-emerald-900 font-bold">=TITIMANGSA()</code> atau <code className="text-emerald-900 font-bold">$TITIMANGSA</code>
                                        <p className="text-gray-600">Otomatis mengikuti pilihan format di Cetak Rapor (Masehi / Hijriah / Hijriah &amp; Masehi). Mendukung argumen mode seperti <code>=TITIMANGSA(&quot;gabungan&quot;)</code>, <code>&quot;dua_baris&quot;</code>, <code>&quot;masehi_dulu&quot;</code>, atau kota kustom <code>=TITIMANGSA(&quot;gabungan&quot;, &quot;Kudus&quot;)</code>.</p>
                                    </li>
                                    <li>
                                        <code className="text-emerald-900 font-bold">=TITIMANGSA_GABUNGAN()</code> / <code className="text-emerald-900 font-bold">$TITIMANGSA_GABUNGAN</code>
                                        <p className="text-gray-600">Khusus gabungan Hijriah &amp; Masehi (contoh: <code>Banyumas, 5 Muharram 1448 H / 20 Juni 2026 M</code>). Tersedia opsi <code>&quot;masehi_dulu&quot;</code>, <code>&quot;dua_baris&quot;</code> (Hijriah &amp; Masehi atas-bawah), serta <code>&quot;arab&quot;</code>.</p>
                                    </li>
                                    <li>
                                        <code className="text-emerald-900 font-bold">=TITIMANGSA_MASEHI()</code> / <code className="text-emerald-900 font-bold">$TITIMANGSA_MASEHI</code>
                                        <p className="text-gray-600">Khusus Masehi (<code>Banyumas, 20 Juni 2026</code>; opsi <code>&quot;m&quot;</code>, <code>&quot;singkat&quot;</code>, <code>&quot;arab&quot;</code>).</p>
                                    </li>
                                    <li>
                                        <code className="text-emerald-900 font-bold">=TITIMANGSA_HIJRIAH()</code> / <code className="text-emerald-900 font-bold">$TITIMANGSA_HIJRIAH</code>
                                        <p className="text-gray-600">Khusus Hijriah (<code>Banyumas, 5 Muharram 1448 H</code>; opsi <code>&quot;polos&quot;</code>, <code>&quot;arab&quot;</code>).</p>
                                    </li>
                                </ul>
                            </div>

                            <div className="p-2.5 bg-white rounded-lg border border-emerald-200 space-y-1.5">
                                <strong className="text-emerald-900 block">2. Rumus Sendiri-Sendiri (Tempat / Tanggal Terpisah)</strong>
                                <ul className="space-y-1 text-gray-700">
                                    <li>
                                        <code className="text-emerald-900 font-bold">=TEMPAT_RAPOR()</code> atau <code className="text-emerald-900 font-bold">$TEMPAT_RAPOR</code>
                                        <p className="text-gray-600">Menampilkan nama kota/tempat pengeluaran rapor saja (alias: <code>=KOTA_RAPOR()</code>, <code>=TEMPAT_TTD()</code>). Cocok untuk baris <em>&quot;Ditetapkan di : =TEMPAT_RAPOR()&quot;</em>.</p>
                                    </li>
                                    <li>
                                        <code className="text-emerald-900 font-bold">=TANGGAL_RAPOR()</code> atau <code className="text-emerald-900 font-bold">$TANGGAL_RAPOR</code>
                                        <p className="text-gray-600">Menampilkan tanggal saja sesuai format aktif di Cetak Rapor. Cocok untuk baris <em>&quot;Pada tanggal : =TANGGAL_RAPOR()&quot;</em>.</p>
                                    </li>
                                    <li>
                                        <code className="text-emerald-900 font-bold">=TANGGAL_RAPOR_GABUNGAN()</code> / <code className="text-emerald-900 font-bold">$TANGGAL_RAPOR_GABUNGAN</code>
                                        <p className="text-gray-600">Tanggal gabungan tanpa nama kota (<code>5 Muharram 1448 H / 20 Juni 2026 M</code>; opsi <code>&quot;masehi_dulu&quot;</code>, <code>&quot;dua_baris&quot;</code>, <code>&quot;arab&quot;</code>).</p>
                                    </li>
                                    <li>
                                        <code className="text-emerald-900 font-bold">=TANGGAL_RAPOR_MASEHI()</code> &amp; <code className="text-emerald-900 font-bold">=TANGGAL_RAPOR_HIJRIAH()</code>
                                        <p className="text-gray-600">Tanggal Masehi saja (<code>20 Juni 2026</code>) atau Tanggal Hijriah saja (<code>5 Muharram 1448 H</code>) bila diletakkan pada 2 baris sel berbeda.</p>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {/* E. Kode Pemanggil Pejabat, Pengampu Khusus, TTD, Stempel & Biodata */}
                    <div className="p-3.5 bg-purple-50/70 rounded-xl border border-purple-200 space-y-2.5 text-xs">
                        <strong className="text-purple-950 flex items-center gap-1.5 font-bold">
                            <i className="bi bi-person-check-fill text-purple-600"></i> E. Kode Pemanggil Pejabat, Pengampu Khusus, TTD + Stempel &amp; Biodata
                        </strong>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-[11px]">
                            <div className="p-2.5 bg-white rounded-lg border border-purple-200 space-y-1">
                                <strong className="text-purple-900 block">1. Wali Kelas Rombel</strong>
                                <div className="font-mono text-[10px] text-purple-800 space-y-0.5">
                                    <div>$NAMA_WALI_KELAS</div>
                                    <div>$NIP_WALI_KELAS</div>
                                    <div>$TTD_WALI_KELAS</div>
                                    <div>$TTD_STEMPEL_WALI_KELAS</div>
                                </div>
                                <p className="text-gray-500 text-[10px]">Otomatis dari Wali Kelas rombel santri pada <strong>Data Master &gt; Struktur Pendidikan &gt; Rombel</strong>.</p>
                            </div>
                            <div className="p-2.5 bg-white rounded-lg border border-indigo-200 space-y-1">
                                <strong className="text-indigo-900 block">2. Pengampu / Guru Khusus</strong>
                                <div className="font-mono text-[10px] text-indigo-800 space-y-0.5">
                                    <div>$JABATAN_PENGAMPU</div>
                                    <div>$NAMA_PENGAMPU</div>
                                    <div>$NIP_PENGAMPU</div>
                                    <div>$TTD_PENGAMPU</div>
                                    <div>$TTD_STEMPEL_PENGAMPU</div>
                                </div>
                                <p className="text-gray-500 text-[10px]">Fleksibel per template (1 guru semua rombel, beda tiap rombel, atau ikut Muhaffizh halaqah; mendukung slot <code>_2</code>, <code>_3</code>).</p>
                            </div>
                            <div className="p-2.5 bg-white rounded-lg border border-purple-200 space-y-1">
                                <strong className="text-purple-900 block">3. Mudir Marhalah (Jenjang)</strong>
                                <div className="font-mono text-[10px] text-purple-800 space-y-0.5">
                                    <div>$NAMA_MUDIR_MARHALAH</div>
                                    <div>$NIP_MUDIR_MARHALAH</div>
                                    <div>$TTD_MUDIR_MARHALAH</div>
                                    <div>$TTD_STEMPEL_MUDIR_MARHALAH</div>
                                </div>
                                <p className="text-gray-500 text-[10px]">Otomatis dari Mudir Marhalah &amp; Stempel Marhalah (<code>$STEMPEL_MARHALAH</code>) pada <strong>Data Master &gt; Jenjang</strong>.</p>
                            </div>
                            <div className="p-2.5 bg-white rounded-lg border border-purple-200 space-y-1">
                                <strong className="text-purple-900 block">4. Mudir Aam / Pimpinan</strong>
                                <div className="font-mono text-[10px] text-purple-800 space-y-0.5">
                                    <div>$NAMA_MUDIR</div>
                                    <div>$NIP_MUDIR</div>
                                    <div>$TTD_MUDIR</div>
                                    <div>$TTD_STEMPEL_MUDIR</div>
                                </div>
                                <p className="text-gray-500 text-[10px]">Otomatis dari Pimpinan Pondok pada <strong>Pengaturan &gt; Umum</strong> beserta Stempel <code>$STEMPEL_PONPES</code>.</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] pt-1">
                            <div className="p-2.5 bg-white rounded-lg border border-amber-200">
                                <strong className="text-amber-900 block mb-0.5">Kode Pemanggil KKM Data Master</strong>
                                <p className="text-gray-600 leading-relaxed">
                                    <code>$KKM</code> / <code>$MAPEL_KKM</code> (deteksi otomatis mapel di baris tersebut, termasuk mapel ketikan manual), <code>$KKM_STANDAR</code> (rata-rata KKM standar kelas/jenjang), serta <code>$KKM_&lt;MAPEL&gt;</code> spesifik per mapel (contoh: <code>$KKM_FIQIH</code>, <code>$KKM_NAHWU</code>, <code>$KKM_MATEMATIKA</code>).
                                </p>
                            </div>
                            <div className="p-2.5 bg-white rounded-lg border border-gray-200">
                                <strong className="text-gray-800 block mb-0.5">Biodata Santri, Halaqah &amp; Kehadiran</strong>
                                <p className="text-gray-600 leading-relaxed">
                                    <code>$NAMA</code>, <code>$NIS</code>, <code>$NISN</code>, <code>$TTL</code>, <code>$JENIS_KELAMIN</code>, <code>$NAMA_AYAH</code>, <code>$NAMA_IBU</code>, <code>$NAMA_WALI</code>, <code>$JENJANG</code>, <code>$KELAS</code>, <code>$ROMBEL</code>, <code>$HALAQAH</code>, <code>$NAMA_MUHAFFIZH</code>, <code>$NIP_MUHAFFIZH</code>, <code>$TTD_MUHAFFIZH</code>, <code>$SAKIT</code>, <code>$IZIN</code>, <code>$ALPHA</code>, <code>$TOTAL_ABSEN</code>, <code>$CATATAN_WALI_KELAS</code>, <code>$KEPUTUSAN</code>.
                                </p>
                            </div>
                            <div className="p-2.5 bg-white rounded-lg border border-gray-200">
                                <strong className="text-gray-800 block mb-0.5">Identitas Lembaga, Logo, Stempel &amp; Titimangsa</strong>
                                <p className="text-gray-600 leading-relaxed">
                                    <code>$NAMA_PONPES</code>, <code>$NAMA_YAYASAN</code>, <code>$ALAMAT_PONPES</code>, <code>$NSPP</code>, <code>$NPSN</code>, <code>$LOGO_PONPES</code>, <code>$LOGO_YAYASAN</code>, <code>$STEMPEL_PONPES</code>, <code>$STEMPEL_MARHALAH</code>, <code>$TITIMANGSA</code>, <code>$TITIMANGSA_GABUNGAN</code>, <code>$TEMPAT_RAPOR</code>, <code>$TANGGAL_RAPOR</code>.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )
        },
        {
            title: '5. Teknis Tanda Tangan Digital (TTD), Stempel di Atas TTD & Pengampu Khusus (Hadits/Mutun)',
            color: 'indigo',
            content: (
                <div className="space-y-4 text-sm">
                    <p className="text-gray-700 leading-relaxed">
                        Sistem pengesahan visual rapor dirancang presisi agar sesuai dengan tata naskah resmi pesantren—mulai dari integrasi aset TTD langsung di Data Master, tumpukan stempel di atas tanda tangan, hingga penugasan pengampu khusus lintas rombel:
                    </p>

                    {/* 1. Integrasi Langsung Data Master & Isolasi Ketat */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                        <div className="p-3.5 bg-teal-50/80 rounded-xl border border-teal-200 space-y-2">
                            <strong className="text-teal-950 flex items-center gap-1.5 font-bold">
                                <i className="bi bi-cloud-upload-fill text-teal-600"></i> 1. Unggah Cepat TTD &amp; Stempel dari Data Master
                            </strong>
                            <p className="text-gray-700 text-[11px] leading-relaxed">
                                Anda tidak perlu berpindah-pindah menu untuk mendaftarkan tanda tangan pengurus maupun stempel unit pendidikan:
                            </p>
                            <ul className="list-disc pl-4 space-y-1 text-[11px] text-gray-600">
                                <li><strong>TTD Ustadz / Pejabat:</strong> Buka <strong>Data Master &gt; Tenaga Pendidik</strong>, edit atau tambah guru, lalu <em>drag &amp; drop</em> gambar TTD langsung pada kartu pengajar. Aset otomatis terdaftar dan tersinkron dua arah ke <strong>Pengaturan &gt; Aset Digital</strong> berdasarkan ID guru.</li>
                                <li><strong>Stempel Marhalah &amp; Pondok:</strong> Unggah Stempel Marhalah langsung pada <strong>Data Master &gt; Struktur Pendidikan &gt; Jenjang</strong> (dan Stempel Pondok di <strong>Pengaturan &gt; Aset Digital</strong>).</li>
                                <li><strong>Auto-Hapus Background Putih:</strong> Saat mengunggah foto TTD/stempel di atas kertas putih, fitur penghapus latar belakang otomatis menjadikannya PNG transparan bersih.</li>
                            </ul>
                        </div>

                        <div className="p-3.5 bg-amber-50/80 rounded-xl border border-amber-200 space-y-2">
                            <strong className="text-amber-950 flex items-center gap-1.5 font-bold">
                                <i className="bi bi-shield-check text-amber-600"></i> 2. Aturan Isolasi TTD Ketat (Anti Salah Panggil)
                            </strong>
                            <p className="text-gray-700 text-[11px] leading-relaxed">
                                Sistem memisahkan identitas tanda tangan setiap jabatan secara ketat demi keabsahan dokumen akademik:
                            </p>
                            <ul className="list-disc pl-4 space-y-1 text-[11px] text-gray-600">
                                <li><strong>Tidak Pernah Meminjam TTD Pejabat Lain:</strong> Jika Wali Kelas atau Guru Pengampu pada suatu rombel <strong>belum mengunggah TTD digital</strong>, maka sel <code>$TTD_WALI_KELAS</code> / <code>$TTD_PENGAMPU</code> otomatis <strong>dikosongkan (putih bersih)</strong> untuk tanda tangan basah—sistem tidak akan memanggil TTD Mudir sebagai pengganti.</li>
                                <li><strong>Tautan ID Akurat:</strong> Pencocokan TTD mengutamakan ID Tenaga Pendidik di Data Master sehingga perubahan gelar penulisan nama tidak memutus relasi tanda tangan.</li>
                            </ul>
                        </div>
                    </div>

                    {/* 2. Teknis Stempel di Atas TTD (Overlay) */}
                    <div className="p-3.5 bg-rose-50/70 rounded-xl border border-rose-200 space-y-2.5 text-xs">
                        <div className="flex items-center justify-between border-b border-rose-200/80 pb-2">
                            <strong className="text-rose-950 flex items-center gap-1.5 font-bold">
                                <i className="bi bi-patch-check-fill text-rose-600"></i> 3. Teknis Stempel Tumpuk di Atas TTD (Misal di Atas TTD Mudir Marhalah / Mudir Aam)
                            </strong>
                            <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 text-[10px] font-bold uppercase">
                                Layer Stempel di Atas
                            </span>
                        </div>
                        <p className="text-gray-700 text-[11px] leading-relaxed">
                            Sebagaimana lazimnya dokumen resmi pesantren di mana cap/stempel dibubuhkan <strong>di atas tanda tangan Mudir Marhalah atau Pimpinan Pondok</strong> (sedikit bergeser ke sisi kiri tanda tangan), tersedia <strong>2 cara mudah</strong> yang menghasilkan tampilan identik di Kanvas Desain, Preview, maupun Cetak PDF:
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-[11px]">
                            <div className="p-2.5 bg-white rounded-lg border border-rose-200 space-y-1">
                                <strong className="text-rose-900 block">Cara A — Pakai Tag Gabungan Siap Pakai (1 Klik)</strong>
                                <p className="text-gray-600">
                                    Pilih kategori <strong>Tanda Tangan, Stempel &amp; Logo</strong> lalu masukkan tag gabungan pada sel tanda tangan:
                                </p>
                                <ul className="list-disc pl-4 space-y-0.5 text-gray-700 font-mono text-[10px]">
                                    <li>$TTD_STEMPEL_MUDIR_MARHALAH <span className="font-sans text-gray-500">(TTD + Stempel Marhalah)</span></li>
                                    <li>$TTD_STEMPEL_MUDIR <span className="font-sans text-gray-500">(TTD + Stempel Pondok)</span></li>
                                    <li>$TTD_STEMPEL_WALI_KELAS <span className="font-sans text-gray-500">(TTD Wali + Stempel)</span></li>
                                    <li>$TTD_STEMPEL_PENGAMPU <span className="font-sans text-gray-500">(TTD Pengampu + Stempel)</span></li>
                                </ul>
                            </div>

                            <div className="p-2.5 bg-white rounded-lg border border-rose-200 space-y-1">
                                <strong className="text-rose-900 block">Cara B — Aktifkan Toggle &quot;Stempel di Atas TTD&quot; di Properti Sel</strong>
                                <p className="text-gray-600">
                                    Klik sel mana pun yang berisi <code>$TTD_MUDIR_MARHALAH</code>, <code>$TTD_MUDIR</code>, <code>$TTD_PENGAMPU</code>, atau <code>$TTD_PENGAJAR:...</code>, lalu nyalakan saklar <strong>&quot;Tumpuk Stempel di Atas TTD&quot;</strong> di panel kanan untuk mengatur detail:
                                </p>
                                <ul className="list-disc pl-4 space-y-0.5 text-gray-600">
                                    <li><strong>Sumber Stempel:</strong> <em>Otomatis Sesuai Jabatan</em>, <em>Stempel Pondok</em>, <em>Stempel Marhalah</em>, atau pilih aset stempel tertentu.</li>
                                    <li><strong>Posisi &amp; Ukuran:</strong> Pilih posisi <strong>Kiri TTD (Standar Resmi)</strong>, <strong>Tengah</strong>, atau <strong>Kanan</strong>, serta ukuran <strong>Kecil / Sedang / Besar</strong>.</li>
                                    <li><strong>Efek Tinta Transparan &amp; Opsi Kosong:</strong> Stempel dirender di lapisan atas TTD dengan bauran tinta alami (guratan tanda tangan di bawahnya tetap tembus terlihat). Jika TTD digital belum ada, area otomatis dikosongkan untuk TTD &amp; cap basah kecuali opsi <em>&quot;Tetap cetak stempel meskipun TTD kosong&quot;</em> dicentang.</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {/* 3. Skema Pengampu / Guru Khusus (Hadits, Mutun, Tahfizh) */}
                    <div className="p-3.5 bg-indigo-50/80 rounded-xl border border-indigo-200 space-y-2.5 text-xs">
                        <div className="flex items-center justify-between border-b border-indigo-200/80 pb-2">
                            <strong className="text-indigo-950 flex items-center gap-1.5 font-bold">
                                <i className="bi bi-person-workspace text-indigo-600"></i> 4. Skema TTD Pengampu / Guru Khusus (Rapor Hafalan Hadits, Mutun &amp; Tahfizh)
                            </strong>
                            <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 text-[10px] font-bold uppercase">
                                Global / Per-Rombel / Halaqah
                            </span>
                        </div>
                        <p className="text-gray-700 text-[11px] leading-relaxed">
                            Untuk rapor khusus kepesantrenan (seperti <em>Rapor Hafalan Hadits Arbain/Umdatul Ahkam</em>, <em>Rapor Mutun Ilmiyah</em>, atau <em>Rapor Tahfizh</em>) yang ditandatangani oleh guru pengampu khusus di luar Wali Kelas, gunakan rangkaian tag <code>$JABATAN_PENGAMPU</code>, <code>$TTD_PENGAMPU</code> (atau <code>$TTD_STEMPEL_PENGAMPU</code>), <code>$NAMA_PENGAMPU</code>, dan <code>$NIP_PENGAMPU</code>:
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                            <div className="p-2.5 bg-white rounded-lg border border-indigo-200 space-y-1">
                                <span className="inline-block px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800 font-bold text-[9px] uppercase">Mode 1: 1 Guru Semua Rombel</span>
                                <p className="text-gray-600">Cocok bila koordinator/pengampu mutun atau hadits hanya 1 ustadz yang sama untuk seluruh rombel pada template tersebut.</p>
                            </div>
                            <div className="p-2.5 bg-white rounded-lg border border-indigo-200 space-y-1">
                                <span className="inline-block px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 font-bold text-[9px] uppercase">Mode 2: Berbeda Tiap Rombel</span>
                                <p className="text-gray-600">Tiap rombel (misal 7A, 7B, 8A) dapat dipilih guru pengampu yang berbeda-beda dalam 1 template rapor yang sama, lengkap dengan opsi Guru Cadangan.</p>
                            </div>
                            <div className="p-2.5 bg-white rounded-lg border border-indigo-200 space-y-1">
                                <span className="inline-block px-1.5 py-0.5 rounded bg-teal-100 text-teal-800 font-bold text-[9px] uppercase">Mode 3: Muhaffizh Halaqah</span>
                                <p className="text-gray-600">Otomatis memanggil nama, NIP, dan TTD ustadz pengampu kelompok halaqah masing-masing santri (bisa juga memakai <code>$NAMA_MUHAFFIZH</code> &amp; <code>$TTD_MUHAFFIZH</code>).</p>
                            </div>
                        </div>
                        <div className="bg-white/90 border border-indigo-200 rounded-lg p-2.5 text-[11px] text-gray-700 space-y-1">
                            <p>
                                <strong>Cara Mengatur &amp; Multi-Pengampu:</strong> Panel pengaturan Pengampu otomatis muncul saat Anda mengeklik sel bertag <code>$..._PENGAMPU</code> di <strong>Desain Rapor</strong>, di tab <strong>Lembar &amp; Kertas</strong>, maupun langsung melalui tombol <strong>&quot;Atur Pengampu&quot;</strong> di halaman <strong>Cetak Rapor</strong>.
                            </p>
                            <p className="text-gray-600">
                                Jika dalam 1 rapor terdapat <strong>2 pengampu/penguji sekaligus</strong> (misal Pengampu Materi &amp; Penguji Tasmi&apos;), klik <strong>+ Tambah Pengampu Ke-2</strong> lalu gunakan tag akhiran angka <code>$JABATAN_PENGAMPU_2</code>, <code>$TTD_PENGAMPU_2</code>, <code>$NAMA_PENGAMPU_2</code>, dan <code>$NIP_PENGAMPU_2</code>. Untuk menunjuk 1 orang guru tetap secara langsung tanpa konfigurasi slot, tersedia pula pilihan <strong>Guru Spesifik</strong> (<code>$NAMA_PENGAJAR_ID</code> &amp; <code>$TTD_PENGAJAR:ID</code>).
                            </p>
                        </div>
                    </div>
                </div>
            )
        },
        {
            title: '6. Ekosistem 1 Link GAS Multi-Tab, Portal Audit Tanpa Login & SOP Tarik Nilai GAS ke Aplikasi',
            color: 'teal',
            content: (
                <div className="space-y-4 text-sm">
                    <p className="text-gray-700 leading-relaxed">
                        Ekosistem formulir eksternal Rapor kini terintegrasi penuh dari hulu ke hilir: mulai dari <strong>1 Link Google Apps Script (GAS) Terpadu v3.0</strong> untuk seluruh rombel &amp; template, <strong>Portal Audit Tanpa Login (.html)</strong>, hingga penarikan kembali nilai ke dalam aplikasi cukup <strong>1 klik</strong>.
                    </p>

                    {/* 1. Setup 1x GAS Terpadu v3.0 */}
                    <div className="p-3.5 bg-teal-50/80 border border-teal-200 rounded-xl space-y-2.5 text-xs">
                        <div className="flex items-center justify-between border-b border-teal-200/80 pb-1.5">
                            <strong className="text-teal-950 flex items-center gap-1.5 font-bold">
                                <i className="bi bi-hdd-network-fill text-teal-600"></i> 1. Konfigurasi 1 Link GAS Terpadu v3.0 untuk Semua Rombel (Cukup Setup 1x)
                            </strong>
                            <span className="px-2 py-0.5 rounded bg-teal-100 text-teal-800 text-[10px] font-bold uppercase">
                                Auto Multi-Tab
                            </span>
                        </div>
                        <ol className="list-decimal pl-4 space-y-1 text-gray-700 text-[11px]">
                            <li><strong>Pasang Kode Skrip v3.0:</strong> Buat 1 Google Spreadsheet kosong &rarr; klik <em>Extensions &gt; Apps Script</em> &rarr; salin kode dari tombol <strong>Salin Kode GAS Terpadu v3.0</strong> (tersedia di tab <em>Generate Form</em> maupun di ikon pengaturan <code>⚙</code> sebelah tombol <em>Tarik Nilai GAS</em>). <em>Catatan: Jika sebelumnya memakai skrip versi lama, perbarui dan buat New Deployment agar fitur baca koreksi sel manual ikut aktif.</em></li>
                            <li><strong>Deploy Web App:</strong> Klik <em>Deploy &gt; New deployment</em> &rarr; pilih jenis <strong>Web app</strong> &rarr; atur <em>Execute as: Me</em> dan <em>Who has access: Anyone</em> &rarr; salin <strong>Web App URL</strong> (berakhiran <code>/exec</code>).</li>
                            <li><strong>Simpan Default Pondok:</strong> Tempel URL tersebut lalu klik <strong>Simpan Default Pondok</strong>. URL otomatis tersimpan dan dipakai bersama oleh generator <strong>Formulir Ledger Guru</strong>, generator <strong>Portal Audit</strong>, serta tombol <strong>Tarik Nilai GAS</strong> di seluruh tab Rapor.</li>
                            <li><strong>Otomatis Buat Tab Baru per Rombel &amp; Template:</strong> Setiap kali guru mengirim nilai dari file HTML, GAS otomatis mengarahkannya ke tab (worksheet) masing-masing, misalnya <code>(25-26 Ganjil) VII-A - Rapor Diniyah</code>, dan menggabungkan kiriman beberapa guru mapel pada baris santri yang sama (<em>Smart Merge</em>).</li>
                        </ol>
                    </div>

                    {/* 2. Dua Jenis File HTML Mandiri */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-1.5">
                            <h6 className="font-bold text-teal-900 flex items-center gap-1.5">
                                <i className="bi bi-pencil-square text-teal-600"></i> Mode A: Formulir Input / Ledger Guru (.html)
                            </h6>
                            <p className="text-gray-600 text-[11px] leading-relaxed">
                                Dibagikan ke guru mapel/penguji (bisa per rombel, rentang tingkat kelas, atau 1 file gabungan se-Marhalah). Guru mengisi secara nyaman di HP (<strong>Form Kartu</strong>) atau laptop (<strong>Tabel Leger</strong>) lengkap dengan rumus otomatis, lalu menekan <strong>Kirim ke Cloud G-Sheet</strong> atau menyalin blok kode WhatsApp.
                            </p>
                        </div>
                        <div className="bg-white p-3 rounded-xl border border-indigo-200 shadow-2xs space-y-1.5">
                            <h6 className="font-bold text-indigo-900 flex items-center gap-1.5">
                                <i className="bi bi-clipboard2-data-fill text-indigo-600"></i> Mode B: Portal Audit &amp; Rekap Leger Tanpa Login (.html)
                            </h6>
                            <p className="text-gray-600 text-[11px] leading-relaxed">
                                Dibagikan kepada Pimpinan Pondok, Mudir Marhalah, atau Panitia Ujian yang tidak memegang login aplikasi. Cukup dibuka di browser HP/laptop untuk memantau <strong>Progres Setoran per Rombel</strong>, <strong>Audit Mapel Kosong</strong>, hingga <strong>Tabel Leger Lengkap (Rumus, KKM, Ranking &amp; Ekspor Excel/Cetak)</strong> secara langsung dari Google Sheet yang sama.
                            </p>
                        </div>
                    </div>

                    {/* 3. SOP Tarik Nilai GAS & Import WA ke Aplikasi */}
                    <div className="p-3.5 bg-blue-50/80 border border-blue-200 rounded-xl space-y-2.5 text-xs">
                        <div className="flex items-center justify-between border-b border-blue-200/80 pb-1.5">
                            <strong className="text-blue-950 flex items-center gap-1.5 font-bold">
                                <i className="bi bi-cloud-arrow-down-fill text-blue-600"></i> 2. Cara Menarik Nilai dari GAS &amp; WhatsApp Masuk ke Aplikasi (Tombol Split Cepat)
                            </strong>
                            <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-bold uppercase">
                                Sinkron Reaktif
                            </span>
                        </div>
                        <p className="text-gray-700 text-[11px] leading-relaxed">
                            Nilai yang masuk ke Google Sheet tidak berhenti di Spreadsheet saja—tarik kapan pun ke dalam database aplikasi menggunakan tombol <strong><code>[Tarik Nilai GAS | ⚙]</code></strong> dan <strong><code>Import WA</code></strong> yang tersedia di header halaman <strong>Rapor / Akademik</strong> maupun di toolbar tab <em>Progres Nilai</em>, <em>Input Nilai</em>, <em>Leger Nilai</em>, dan <em>Review Data</em>:
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-[11px]">
                            <div className="p-2.5 bg-white rounded-lg border border-blue-200 space-y-1">
                                <strong className="text-blue-900 block">A. Klik Tombol Utama &quot;Tarik Nilai GAS&quot; (1-Klik Instan)</strong>
                                <ul className="list-disc pl-4 space-y-0.5 text-gray-600">
                                    <li>Langsung menarik dan menggabungkan nilai terbaru dari seluruh tab Google Sheet sesuai Tahun Ajaran &amp; Semester aktif tanpa membuka dialog rumit.</li>
                                    <li><strong>Khusus Wali Kelas:</strong> Sistem otomatis membatasi penarikan hanya untuk santri pada rombel binaan Wali Kelas yang sedang login.</li>
                                    <li><strong>Baca Koreksi Manual di Sheet:</strong> Jika Admin mengedit angka nilai langsung pada sel kolom <code>[KODE_MAPEL]</code> di Google Sheet, perubahan angka tersebut otomatis ikut terserap ke aplikasi.</li>
                                </ul>
                            </div>
                            <div className="p-2.5 bg-white rounded-lg border border-blue-200 space-y-1">
                                <strong className="text-blue-900 block">B. Klik Ikon Pengaturan (⚙) atau &quot;Import WA&quot;</strong>
                                <ul className="list-disc pl-4 space-y-0.5 text-gray-600">
                                    <li><strong>Tombol &quot;Cek Isi Sheet&quot;:</strong> Mengintip daftar tab worksheet, jumlah baris kiriman, dan jumlah santri unik di Google Sheet sebelum data ditarik.</li>
                                    <li><strong>Filter Selektif:</strong> Tarik khusus untuk 1 Rombel tertentu, 1 Template tertentu (misal hanya Rapor Mutun), atau lintas seluruh periode.</li>
                                    <li><strong>Multi-Paste Kode WA:</strong> Tempel beberapa chat setoran guru (<code>RAPOR_V2_START...RAPOR_V2_END</code>) sekaligus dalam satu kotak—sistem merajutnya otomatis tanpa menimpa mapel guru lain.</li>
                                </ul>
                            </div>
                        </div>
                        <div className="bg-white/90 border border-blue-200 rounded-lg p-2.5 text-[11px] text-gray-700 space-y-1.5">
                            <div>
                                <i className="bi bi-lightning-charge-fill text-amber-500 mr-1"></i>
                                <strong>Pembaruan Layar Otomatis &amp; Proteksi Draf:</strong> Begitu penarikan selesai, persentase di <em>Progres Nilai</em>, angka di <em>Input Nilai</em>, rekap <em>Leger Nilai</em>, hingga daftar <em>Cetak Rapor</em> langsung diperbarui seketika tanpa perlu me-<em>refresh</em> browser. Jika Anda sedang mengetik nilai yang belum disimpan di tab Input Nilai, sistem akan memunculkan konfirmasi pengaman terlebih dahulu.
                            </div>
                            <div className="pt-1 border-t border-blue-100">
                                <i className="bi bi-arrow-left-right text-teal-600 mr-1"></i>
                                <strong>Sinkronisasi Dua Arah Saat Revisi Salah Input (Aplikasi &harr; GAS &harr; HTML):</strong>
                                <ul className="list-disc pl-4 mt-0.5 space-y-0.5 text-gray-600">
                                    <li><strong>Revisi dari Leger Input Aplikasi:</strong> Setiap kali Wali Kelas/Admin memperbaiki atau mengosongkan angka yang keliru di tab <em>Input Nilai</em> lalu klik <strong>Simpan Nilai</strong>, perubahan tersebut <strong>otomatis dikirim balik (Auto-Push) ke Google Sheet GAS</strong> sehingga data di <em>Portal Audit Tanpa Login</em> ikut ter-update (tersedia juga tombol manual <strong>Kirim GAS</strong> jika sebelumnya menginput saat <em>offline</em>).</li>
                                    <li><strong>Revisi dari File HTML Ledger:</strong> Buka file HTML &rarr; klik <strong>Muat Cloud</strong> &rarr; perbaiki atau kosongkan nilai yang keliru &rarr; klik <strong>Kirim ke Cloud G-Sheet</strong> (baris di GAS otomatis diperbarui), lalu klik <strong>Tarik Nilai GAS</strong> di aplikasi untuk menyelaraskan ke aplikasi (selama rapor rombel belum berstatus <em>Disahkan &amp; Terkunci</em>).</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            )
        },
        {
            title: '7. Input Nilai Langsung & Leger Nilai (Desktop & Mobile)',
            color: 'green',
            content: (
                <div className="space-y-3 text-sm">
                    <p className="text-gray-700 leading-relaxed">
                        Bagi wali kelas maupun staf akademik yang mengelola nilai langsung di dalam aplikasi, tersedia fitur percepatan input dan peninjauan leger yang adaptif untuk laptop maupun HP:
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                        <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-200 space-y-1.5">
                            <strong className="text-emerald-950 flex items-center gap-1.5 font-bold">
                                <i className="bi bi-pencil-square text-emerald-600"></i> Tab Input Nilai &amp; Aksi Cepat
                            </strong>
                            <ul className="list-disc pl-4 space-y-1 text-gray-600 text-[11px]">
                                <li><strong>2 Mode Input:</strong> Pilih <strong>Tabel Leger</strong> di laptop (mendukung tombol panah/Enter &amp; <em>paste</em> langsung blok sel dari Excel/Sheets) atau <strong>Form Kartu (Mobile)</strong> untuk pengisian nyaman di layar HP.</li>
                                <li><strong>Tarik Eksternal &amp; Internal Terpadu:</strong> Tersedia tombol langsung <strong>Tarik Nilai GAS</strong> &amp; <strong>Import WA</strong> untuk mengambil setoran guru mapel, ditambah <strong>Tarik Presensi Otomatis</strong> (Sakit/Izin/Alfa), <strong>Tarik Data Tahfizh</strong>, serta <strong>Isi Cepat Catatan &amp; Keputusan</strong>.</li>
                                <li><strong>Auto-Draft &amp; Pelindung Ketikan:</strong> Dilengkapi pemulihan draf lokal otomatis jika tab tertutup, proteksi konfirmasi sebelum menarik data cloud saat masih ada ketikan belum disimpan, serta penanda nilai di bawah KKM atau di luar <code>0–100</code>.</li>
                            </ul>
                        </div>

                        <div className="p-3 bg-teal-50/70 rounded-xl border border-teal-200 space-y-1.5">
                            <strong className="text-teal-950 flex items-center gap-1.5 font-bold">
                                <i className="bi bi-table text-teal-600"></i> Tab Leger Nilai &amp; Kenyamanan Layar HP
                            </strong>
                            <ul className="list-disc pl-4 space-y-1 text-gray-600 text-[11px]">
                                <li><strong>Mode Tabel vs Kartu Santri:</strong> Di layar HP, alihkan tampilan ke <strong>Kartu Santri</strong> untuk melihat daftar nilai, rata-rata, dan peringkat secara vertikal tanpa geser ke samping.</li>
                                <li><strong>Tombol Kunci Kolom (Freeze):</strong> Saat memakai mode <strong>Tabel</strong> di HP, kolom nama otomatis dilepas agar ruang nilai tetap lega, dan dapat dikunci/dilepas kapan saja lewat tombol <strong>Kunci Kolom</strong>.</li>
                                <li><strong>Multi-Sheet, Rincian &amp; Ekspor:</strong> Pindah lembar kerja rapor dengan mudah, klik <strong>Rincian</strong> untuk mengecek kolom mapel yang masih kosong, tarik pembaruan nilai dari GAS secara langsung, atau unduh Leger ke Excel/Cetak.</li>
                            </ul>
                        </div>
                    </div>
                </div>
            )
        },
        {
            title: '8. Review Data & Filter Multi-Kriteria Lanjutan',
            color: 'cyan',
            content: (
                <div className="space-y-3 text-sm">
                    <p className="text-gray-700 leading-relaxed">
                        Tab <strong>Review Data</strong> menyediakan sarana audit arsip nilai secara menyeluruh sebelum proses cetak rapor fisik:
                    </p>
                    <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 text-xs space-y-2 text-gray-700">
                        <div className="font-bold text-gray-900 flex items-center gap-1.5">
                            <i className="bi bi-sliders text-teal-600 text-sm"></i> Fasilitas Filter Komprehensif:
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                            <div className="bg-white p-2 rounded border border-gray-150">
                                <strong>Hirarki Akademik:</strong> Filter berdasarkan Jenjang (Marhalah), Tingkat Kelas, Rombel, serta Mode Rentang Kelas (Multi-Tingkat sekaligus).
                            </div>
                            <div className="bg-white p-2 rounded border border-gray-150">
                                <strong>Lembar Spesifik:</strong> Filter berdasarkan Template Rapor dan pilihan Lembar Kerja (Multi-Sheet) tertentu.
                            </div>
                            <div className="bg-white p-2 rounded border border-gray-150">
                                <strong>Status Kelengkapan:</strong> Kartu metrik instan untuk memfilter santri dengan nilai <em>Lengkap (100%)</em>, <em>Sebagian (1-99%)</em>, atau <em>Kosong (0%)</em>.
                            </div>
                            <div className="bg-white p-2 rounded border border-gray-150">
                                <strong>Pencarian &amp; Pengurutan:</strong> Pencarian live santri/NIS dan urutkan berdasarkan Nama, Kelengkapan Tertinggi/Terendah, atau Tanggal Rapor.
                            </div>
                        </div>
                    </div>
                </div>
            )
        },
        {
            title: '9. Pengesahan Nilai, Tata Letak Cetak & Distribusi WhatsApp',
            color: 'orange',
            content: (
                <div className="space-y-4 text-sm">
                    <p className="text-gray-700 leading-relaxed">
                        Tahap akhir penerbitan hasil belajar santri dengan standar pengamanan nilai, fleksibilitas tata letak cetak, dan kemudahan distribusi modern:
                    </p>

                    {/* Alur Pengesahan & Penguncian Nilai */}
                    <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-xl space-y-2.5 text-xs">
                        <div className="flex items-center justify-between border-b border-amber-200 pb-2">
                            <strong className="text-amber-950 font-bold flex items-center gap-1.5">
                                <i className="bi bi-shield-lock-fill text-amber-700"></i> SOP 3 Tahap Pengesahan &amp; Penguncian Nilai (Approval Workflow)
                            </strong>
                            <span className="px-2 py-0.5 rounded bg-amber-200 text-amber-900 font-bold text-[10px] uppercase">
                                Keamanan Nilai
                            </span>
                        </div>
                        <p className="text-gray-700 leading-relaxed">
                            Mencegah perubahan nilai sepihak menjelang atau setelah hari pembagian rapor melalui kontrol status per rombel:
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                            <div className="p-2.5 bg-white rounded-lg border border-amber-200 shadow-2xs space-y-1">
                                <span className="inline-block px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-bold text-[9px] uppercase">1. Draf (Terbuka)</span>
                                <p className="text-gray-600">Guru mata pelajaran dan wali kelas masih bebas mengedit nilai ulangan, kehadiran, dan catatan santri.</p>
                            </div>
                            <div className="p-2.5 bg-white rounded-lg border border-blue-200 shadow-2xs space-y-1">
                                <span className="inline-block px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 font-bold text-[9px] uppercase">2. Terverifikasi Wali</span>
                                <p className="text-gray-600">Wali kelas selesai memeriksa kebenaran nilai seluruh santri dan menyatakan siap diajukan ke Pimpinan/Mudir.</p>
                            </div>
                            <div className="p-2.5 bg-white rounded-lg border border-emerald-200 shadow-2xs space-y-1">
                                <span className="inline-block px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[9px] uppercase">3. Disahkan &amp; Terkunci</span>
                                <p className="text-gray-600">Nilai resmi dikunci total oleh Kepala Madrasah/Super Admin. Seluruh form input dibekukan agar tidak ada manipulasi data.</p>
                            </div>
                        </div>
                    </div>

                    {/* Kontrol Tata Letak Cetak & Titimangsa */}
                    <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5 text-xs">
                        <strong className="text-slate-900 font-bold flex items-center gap-1.5">
                            <i className="bi bi-sliders2 text-indigo-600"></i> Pengaturan Tata Letak Cetak, Pengampu Cepat, Titimangsa &amp; Seleksi Cerdas
                        </strong>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                            <div className="p-2.5 bg-white rounded-lg border border-slate-200 space-y-1">
                                <strong className="text-slate-800 block">Titimangsa &amp; Bilah &quot;Atur Pengampu&quot;</strong>
                                <p className="text-gray-600">Atur kota &amp; tanggal rapor lalu klik <strong>Set Default</strong>. Jika template memakai tag <code>$..._PENGAMPU</code>, bilah status <strong>Pengampu Khusus</strong> otomatis tampil lengkap dengan indikator kesiapan TTD dan tombol <strong>Atur Pengampu</strong> langsung dari halaman cetak.</p>
                            </div>
                            <div className="p-2.5 bg-white rounded-lg border border-slate-200 space-y-1">
                                <strong className="text-slate-800 block">Fit Halaman Presisi (A4/F4 &amp; Multi-Halaman)</strong>
                                <p className="text-gray-600">Pilih kertas <strong>A4/F4</strong> (Tegak/Mendatar), lalu atur <strong>Fit Dokumen 1 Halaman</strong>, <strong>Fit Lebar ke X Halaman</strong>, <strong>Fit Tinggi ke Y Halaman</strong>, atau <strong>Skala Manual (%)</strong>. Garis border paling kanan tabel dijamin tetap utuh saat mode Fit 1 Halaman, dan ukuran serta warna huruf footer otomatis proporsional mengikuti ukuran font rapor.</p>
                            </div>
                            <div className="p-2.5 bg-white rounded-lg border border-slate-200 space-y-1">
                                <strong className="text-slate-800 block">Panel Atur Lanjutan &amp; Ulangi Header</strong>
                                <p className="text-gray-600">Sesuaikan <strong>Kop Rapor</strong>, <strong>Judul Rapor (1–3 baris)</strong>, <strong>Header Biodata</strong>, <strong>Ulangi Judul Tabel di Halaman Lanjutan</strong>, Margin, serta <strong>Batas Ranking</strong> (<em>Semua / Top 3 / Top 5 / Top 10 / Off</em>).</p>
                            </div>
                            <div className="p-2.5 bg-white rounded-lg border border-slate-200 space-y-1">
                                <strong className="text-slate-800 block">Seleksi Santri Siap Cetak</strong>
                                <p className="text-gray-600">Filter kesiapan nilai santri dan gunakan tombol <strong>Pilih Hanya yang Lengkap 100%</strong> untuk menyeleksi santri yang nilainya sudah tuntas secara instan.</p>
                            </div>
                        </div>
                    </div>

                    {/* Distribusi WhatsApp & Cetak Masal */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                        <div className="p-3 bg-emerald-50/80 rounded-xl border border-emerald-200 space-y-1.5">
                            <strong className="text-emerald-950 flex items-center gap-1.5 font-bold">
                                <i className="bi bi-whatsapp text-emerald-600"></i> Kirim Ringkasan Rapor via WhatsApp ke Orang Tua
                            </strong>
                            <p className="text-gray-600 leading-relaxed">
                                Wali kelas dapat mengirimkan ringkasan nilai belajar langsung ke nomor Ayah, Ibu, atau Wali Santri dengan 1 klik:
                            </p>
                            <ul className="list-disc pl-4 space-y-1 text-gray-600 text-[11px]">
                                <li>Klik tombol hijau <strong>"Kirim WA"</strong> di daftar santri atau di dalam jendela pratinjau rapor.</li>
                                <li>Pilih nomor tujuan (otomatis mendeteksi nomor kontak HP di data santri).</li>
                                <li>Teks pesan sudah tersusun rapi dengan salam pesantren, rekapitulasi nilai, peringkat, catatan wali kelas, dan tautan e-Rapor.</li>
                            </ul>
                        </div>

                        <div className="p-3 bg-blue-50/80 rounded-xl border border-blue-200 space-y-1.5">
                            <strong className="text-blue-950 flex items-center gap-1.5 font-bold">
                                <i className="bi bi-printer-fill text-blue-600"></i> Pratinjau &amp; Mode Cetak Masal (1 Rombel)
                            </strong>
                            <p className="text-gray-600 leading-relaxed">
                                Mendukung pratinjau responsif di laptop maupun HP tanpa perlu mencetak satu per satu:
                            </p>
                            <ul className="list-disc pl-4 space-y-1 text-gray-600 text-[11px]">
                                <li>Gunakan tombol <strong>Cetak Terpilih</strong> atau <strong>Cetak Masal Rombel</strong> pada tab Cetak Rapor.</li>
                                <li>Sistem menyatukan seluruh lembar rapor santri dalam satu dokumen dengan pemisah halaman (<code>page-break-after: always</code>) otomatis.</li>
                                <li>Dapat langsung dikirim ke printer fisik atau disimpan sebagai satu file PDF utuh per kelas.</li>
                            </ul>
                        </div>
                    </div>
                </div>
            )
        }
    ]
};
