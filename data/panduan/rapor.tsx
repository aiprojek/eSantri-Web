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
                                <i className="bi bi-diagram-3-fill text-blue-600"></i> Model A: Desentralisasi Tanpa Login (Form HTML Mandiri)
                            </h5>
                            <p className="text-gray-600 leading-relaxed">
                                Guru mata pelajaran <strong>tidak perlu akun login</strong> ke aplikasi. Bagian Kurikulum membuat formulir HTML per rombel/mapel, dikirim lewat WhatsApp/Email, diisi guru secara offline di HP atau laptop, lalu kode hasilnya diimpor admin sekali klik.
                            </p>
                        </div>
                        <div className="bg-teal-50/80 p-3 rounded-xl border border-teal-200 space-y-1.5">
                            <h5 className="font-bold text-teal-900 flex items-center gap-1.5 text-xs">
                                <i className="bi bi-people-fill text-teal-600"></i> Model B: Multi-Admin & Kolaborasi Staf / Wali Kelas
                            </h5>
                            <p className="text-gray-600 leading-relaxed">
                                Wali kelas dan staf akademik login menggunakan akun mandiri masing-masing. Mereka langsung mengisi nilai santri, mengecek Leger Nilai kelasnya, dan mencetak lembar rapor santri dengan sinkronisasi realtime/cloud.
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
                                <strong className="block text-gray-800 font-semibold text-xs mt-1">Otoritas Master &amp; Template</strong>
                                <ul className="list-disc pl-4 text-gray-600 space-y-1 text-[11px]">
                                    <li>Menetapkan Tahun Ajaran &amp; Semester aktif.</li>
                                    <li>Mendesain template lembar kerja &amp; rumus bobot.</li>
                                    <li>Mengunci template sebelum masa input dimulai.</li>
                                    <li>Eksekusi *Merge* dan *Publish* master data.</li>
                                </ul>
                            </div>

                            <div className="bg-white p-3 rounded-xl border border-teal-200 shadow-2xs space-y-1">
                                <span className="inline-block px-2 py-0.5 rounded bg-teal-100 text-teal-800 font-bold text-[10px] uppercase">
                                    Wali Kelas (Staf Akademik)
                                </span>
                                <strong className="block text-gray-800 font-semibold text-xs mt-1">Input Nilai &amp; Leger Kelas</strong>
                                <ul className="list-disc pl-4 text-gray-600 space-y-1 text-[11px]">
                                    <li>Fokus pada rombel binaannya masing-masing.</li>
                                    <li>Mengisi catatan sikap, spiritual &amp; ekstrakurikuler.</li>
                                    <li>Review ketuntasan KKM pada Leger Nilai.</li>
                                    <li>Mencetak buku rapor santri kelasnya.</li>
                                </ul>
                            </div>

                            <div className="bg-white p-3 rounded-xl border border-indigo-200 shadow-2xs space-y-1">
                                <span className="inline-block px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 font-bold text-[10px] uppercase">
                                    Guru Mata Pelajaran
                                </span>
                                <strong className="block text-gray-800 font-semibold text-xs mt-1">Pengisian Nilai Spesifik</strong>
                                <ul className="list-disc pl-4 text-gray-600 space-y-1 text-[11px]">
                                    <li>Menerima form HTML per rombel/mapel.</li>
                                    <li>Mengisi nilai dari HP tanpa perlu akun sistem.</li>
                                    <li>Mengirimkan kode string hasil isian ke kurikulum.</li>
                                    <li>Tidak mengubah susunan santri atau master kelas.</li>
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
                                <i className="bi bi-grid-3x3 text-indigo-600"></i> Seleksi Rentang Multi-Sel &amp; Pita Format
                            </strong>
                            <p className="text-gray-600 leading-relaxed">
                                Klik dan seret (drag) mouse atau tekan <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded font-mono text-[10px]">Shift + Klik</kbd> untuk memilih beberapa kotak sel sekaligus. Pita aksi melayang (*floating ribbon*) akan muncul otomatis untuk:
                            </p>
                            <ul className="list-disc pl-4 space-y-1 text-gray-600">
                                <li><strong>Border Massal:</strong> Border Semua, Border Luar Saja, atau Hapus Border dalam 1 klik.</li>
                                <li><strong>Format Teks:</strong> Tebal (Bold), Miring (Italic), Rata Kiri/Tengah/Kanan, dan Warna Latar.</li>
                                <li><strong>Merge / Unmerge:</strong> Menggabungkan atau memisahkan blok sel terseleksi secara instan.</li>
                            </ul>
                        </div>
                    </div>

                    {/* Page Break Guide & Dynamic Repeater */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                        <div className="p-3 bg-indigo-50/70 rounded-xl border border-indigo-200 space-y-1.5">
                            <strong className="text-indigo-950 flex items-center gap-1.5 font-bold">
                                <i className="bi bi-file-earmark-break text-indigo-600"></i> Panduan Batas Halaman (Page Break Guide A4 &amp; F4)
                            </strong>
                            <p className="text-gray-600 leading-relaxed">
                                Nyalakan toggle <strong>"Batas Halaman"</strong> di toolbar. Garis putus-putus merah/oranye interaktif (<code>✂ BATAS HALAMAN 1</code>) akan muncul di baris penanda batas cetak 1 lembar (~980px untuk kertas A4, ~1100px untuk F4/Folio). Ini mencegah tabel terpotong jelek ke halaman kedua saat dicetak.
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
            title: '4. Generate Formulir Guru & Input Desentralisasi',
            color: 'teal',
            content: (
                <div className="space-y-3 text-sm">
                    <p className="text-gray-700 leading-relaxed">
                        Jika memilih jalur pengisian mandiri oleh guru mata pelajaran tanpa perlu membuat akun login:
                    </p>
                    <ol className="list-decimal pl-5 space-y-1.5 text-xs text-gray-600">
                        <li>Buka tab <strong>Generate Form</strong> pada menu Rapor.</li>
                        <li>Pilih <strong>Jenjang</strong>, <strong>Tingkat Kelas</strong>, <strong>Rombel</strong>, dan <strong>Template Rapor</strong> yang akan diisi.</li>
                        <li>Pilih integrasi pengiriman: <strong>WhatsApp Web</strong>, <strong>Google Sheets</strong>, atau <strong>Standar HTML Offline</strong>.</li>
                        <li>Klik <strong>Download Formulir Guru</strong> (.html) lalu bagikan file tersebut ke grup pengajar atau guru bersangkutan.</li>
                    </ol>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                        <div className="bg-white p-2.5 rounded-lg border shadow-2xs">
                            <h6 className="font-bold text-teal-800 flex items-center gap-1 mb-1">
                                <i className="bi bi-phone text-teal-600"></i> Tampilan Form Kartu (Mobile)
                            </h6>
                            <p className="text-gray-600">Bagus untuk HP. Menampilkan 1 santri per kartu dengan tombol navigasi mudah dan pencarian instan.</p>
                        </div>
                        <div className="bg-white p-2.5 rounded-lg border shadow-2xs">
                            <h6 className="font-bold text-indigo-800 flex items-center gap-1 mb-1">
                                <i className="bi bi-display text-indigo-600"></i> Tampilan Tabel Leger (Desktop)
                            </h6>
                            <p className="text-gray-600">Bagus untuk laptop. Menampilkan tabel matriks dengan freeze-header & kolom santri terkunci saat discroll.</p>
                        </div>
                    </div>
                </div>
            )
        },
        {
            title: '5. Input Nilai Langsung & Leger Nilai (Wali Kelas & Admin)',
            color: 'green',
            content: (
                <div className="space-y-3 text-sm">
                    <p className="text-gray-700 leading-relaxed">
                        Bagi staf akademik atau wali kelas yang memiliki akses sistem:
                    </p>
                    <ul className="list-disc pl-5 space-y-1.5 text-xs text-gray-600">
                        <li><strong>Tab Input Nilai:</strong> Pilih rombel aktif, cari nama santri, dan masukkan nilai langsung pada kolom yang disediakan. Setiap nilai tersimpan otomatis dan divalidasi bobotnya.</li>
                        <li><strong>Tab Leger Nilai:</strong> Tinjau rekapitulasi seluruh mata pelajaran dalam format matriks satu kelas. Di sini wali kelas dapat mengecek rata-rata nilai santri, peringkat paralel/kelas, dan ketuntasan KKM.</li>
                        <li><strong>Ekspor Leger:</strong> Leger nilai dapat diunduh langsung dalam format Excel atau dicetak sebagai arsip resmi madrasah.</li>
                    </ul>
                </div>
            )
        },
        {
            title: '6. Review Data & Filter Multi-Kriteria Lanjutan',
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
            title: '7. Pengesahan Nilai, Distribusi WhatsApp & Cetak Rapor',
            color: 'orange',
            content: (
                <div className="space-y-4 text-sm">
                    <p className="text-gray-700 leading-relaxed">
                        Tahap akhir penerbitan hasil belajar santri dengan standar pengamanan dan kemudahan distribusi modern:
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
                                <i className="bi bi-printer-fill text-blue-600"></i> Mode Cetak Masal (Batch Printing 1 Rombel)
                            </strong>
                            <p className="text-gray-600 leading-relaxed">
                                Tidak perlu mencetak satu per satu santri:
                            </p>
                            <ul className="list-disc pl-4 space-y-1 text-gray-600 text-[11px]">
                                <li>Klik tombol <strong>"Cetak Masal Rombel"</strong> pada tab Cetak Rapor.</li>
                                <li>Sistem menyatukan seluruh lembar rapor santri dalam satu dokumen cetak dengan instruksi pemisah halaman cetak (<code>page-break-after: always</code>) otomatis.</li>
                                <li>Dapat langsung dikirim ke printer fisik berkecepatan tinggi atau disimpan sebagai satu file PDF utuh per kelas.</li>
                            </ul>
                        </div>
                    </div>
                </div>
            )
        }
    ]
};
