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
            title: '3. Desain Grid & Konfigurasi Rumus Rapor',
            color: 'indigo',
            content: (
                <div className="space-y-3 text-sm">
                    <p className="text-gray-700 leading-relaxed">
                        Menu <strong>Rapor &gt; Design &amp; Template</strong> memberikan kebebasan penuh dalam mengatur format lembar nilai:
                    </p>
                    <ul className="list-disc pl-5 space-y-1.5 text-xs text-gray-600">
                        <li><strong>Buat Template Baru atau Impor Excel:</strong> Anda dapat membuat struktur dari nol atau mengunggah format Excel yang sudah biasa digunakan madrasah/pesantren.</li>
                        <li><strong>Dukungan Multi-Sheet (Multi Lembar Kerja):</strong> Rapor dapat dibagi menjadi beberapa lembar, seperti: <em>Cover Rapor</em>, <em>Nilai Akademis</em>, <em>Tahfizh &amp; Al-Qur'an</em>, <em>Sikap &amp; Kedisiplinan</em>, hingga <em>Prestasi &amp; Ekstrakurikuler</em>.</li>
                        <li><strong>Variabel Dinamis Otomatis:</strong> Gunakan tag seperti <code>$NAMA</code>, <code>$NIS</code>, <code>$ROMBEL</code>, <code>$SEMESTER</code>, <code>$TAHUN_AJARAN</code>, atau buat kolom nilai kustom (misal: <code>$NILAI_HARIAN</code>, <code>$NILAI_PAS</code>).</li>
                        <li><strong>Rumus Terintegrasi:</strong> Mendukung formula otomatis seperti <code>AVERAGE($UH1, $UH2)</code>, pembobotan <code>(2*$UH + $PTS + $PAS)/4</code>, hingga perangkingan kelas otomatis dengan rumus <code>RANK($TOTAL)</code>.</li>
                    </ul>
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
            title: '7. Monitoring Progres & Cetak Rapor Fisik',
            color: 'orange',
            content: (
                <div className="space-y-3 text-sm">
                    <p className="text-gray-700 leading-relaxed">
                        Tahap akhir penerbitan rapor santri pondok pesantren:
                    </p>
                    <ol className="list-decimal pl-5 space-y-1.5 text-xs text-gray-600">
                        <li>
                            <strong>Cek Tab Progres Nilai (Monitoring):</strong> Pastikan seluruh rombel telah berstatus <span className="text-green-600 font-bold">Hijau (Lengkap 100%)</span>. Jika masih berwarna kuning atau merah, hubungi guru/wali kelas terkait.
                        </li>
                        <li>
                            <strong>Buka Tab Cetak Rapor:</strong> Pilih Jenjang, Rombel, dan format lembar rapor yang akan diterbitkan.
                        </li>
                        <li>
                            <strong>Pengaturan Penandatangan:</strong> Tentukan tanggal penerbitan rapor, nama Kepala Madrasah/Mudir, dan Wali Kelas lengkap dengan NIP/NIY.
                        </li>
                        <li>
                            <strong>Cetak / Simpan PDF:</strong> Cetak langsung ke printer atau pilih opsi <em>Save as PDF</em> untuk mendistribusikan e-Rapor kepada orang tua santri.
                        </li>
                    </ol>
                </div>
            )
        }
    ]
};
