import React from 'react';
import { PanduanSectionData } from '../panduan';

export const kurikulumPanduan: PanduanSectionData = {
    id: 'kurikulum',
    badge: 'KBM',
    badgeColor: 'teal',
    title: 'Kurikulum & KBM Pesantren: Terpadu & SOP Multi-Admin',
    steps: [
        {
            title: '1. Alur Terpadu Kurikulum Pesantren (Struktur Rumpun & Master Plan)',
            color: 'teal',
            content: (
                <div className="space-y-3 text-sm text-gray-700">
                    <p className="leading-relaxed">
                        Modul <strong>Kurikulum Pesantren</strong> di eSantri Web dirancang sebagai pusat kendali akademik terpadu yang memadukan kurikulum khas pesantren (diniyah/kitab kuning) dan kurikulum formal nasional. Seluruh instrumen—mulai dari mata pelajaran, silabus, jadwal mingguan, beban guru, hingga jurnal KBM—terhubung secara otomatis.
                    </p>
                    <div className="bg-teal-50 border border-teal-200 p-3.5 rounded-xl space-y-2">
                        <h5 className="font-bold text-teal-900 text-xs flex items-center gap-1.5">
                            <i className="bi bi-diagram-3-fill text-teal-600"></i>
                            5 Pilar Rumpun Pelajaran Pesantren
                        </h5>
                        <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 text-center text-xs">
                            <div className="bg-white p-2.5 rounded-lg border border-teal-200 shadow-2xs">
                                <span className="font-bold text-teal-900 block text-xs">Diniyah / Kitab</span>
                                <span className="text-[10px] text-gray-500">Nahwu, Fiqih, Hadits, Akhlak</span>
                            </div>
                            <div className="bg-white p-2.5 rounded-lg border border-teal-200 shadow-2xs">
                                <span className="font-bold text-teal-900 block text-xs">Tahfizh & Tajwid</span>
                                <span className="text-[10px] text-gray-500">Ziyadah, Murajaah, Matan Tajwid</span>
                            </div>
                            <div className="bg-white p-2.5 rounded-lg border border-teal-200 shadow-2xs">
                                <span className="font-bold text-teal-900 block text-xs">Bahasa Asing</span>
                                <span className="text-[10px] text-gray-500">Bahasa Arab & Bahasa Inggris</span>
                            </div>
                            <div className="bg-white p-2.5 rounded-lg border border-teal-200 shadow-2xs">
                                <span className="font-bold text-teal-900 block text-xs">Umum / Nasional</span>
                                <span className="text-[10px] text-gray-500">Matematika, IPA, IPS, PKn</span>
                            </div>
                            <div className="bg-white p-2.5 rounded-lg border border-teal-200 shadow-2xs">
                                <span className="font-bold text-teal-900 block text-xs">Muatan Lokal</span>
                                <span className="text-[10px] text-gray-500">Kepesantrenan & Keterampilan</span>
                            </div>
                        </div>
                    </div>
                </div>
            )
        },
        {
            title: '2. Pengelolaan Mata Pelajaran, Silabus & Plotting Guru Pengampu Terpadu',
            color: 'emerald',
            content: (
                <div className="space-y-3 text-sm text-gray-700">
                    <div className="bg-emerald-50 border-l-4 border-emerald-600 p-3.5 rounded-xl text-xs text-emerald-950 space-y-1.5">
                        <h5 className="font-bold flex items-center gap-1.5 text-emerald-900 text-sm">
                            <i className="bi bi-check-circle-fill text-emerald-600"></i>
                            Pemberitahuan Penting: Penataan Terpusat Satu Pintu
                        </h5>
                        <p className="leading-relaxed">
                            Pengguna dan Tim Kurikulum <strong>TIDAK PERLU repot berpindah ke menu Data Master</strong> untuk memetakan guru pengampu maupun jam mengajar. Seluruh entri mata pelajaran, silabus, plotting pengampu, matriks mapel per kelas, hingga kesanggupan hari dan jam mengajar guru <strong>dikelola langsung di menu Kurikulum &gt; Mata Pelajaran &amp; Silabus</strong>. Seluruh data otomatis tersinkronisasi dua arah secara realtime dengan Data Master dan modul Jadwal Pelajaran.
                        </p>
                    </div>

                    {/* 3 Sub-Fitur Plotting Terpadu */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                        <div className="bg-white p-3 rounded-xl border border-emerald-200 shadow-2xs space-y-1">
                            <strong className="text-emerald-900 flex items-center gap-1.5 font-bold text-xs">
                                <i className="bi bi-journal-bookmark-fill text-emerald-600"></i> 1. Plotting per Mapel
                            </strong>
                            <p className="text-[11px] text-gray-600 leading-relaxed">
                                Menugaskan guru yang mengampu mata pelajaran tertentu. Lengkap dengan pintasan tombol <strong>"Hari &amp; Jam"</strong> untuk langsung mengatur waktu luang guru tanpa keluar dari modal.
                            </p>
                        </div>
                        <div className="bg-white p-3 rounded-xl border border-emerald-200 shadow-2xs space-y-1">
                            <strong className="text-emerald-900 flex items-center gap-1.5 font-bold text-xs">
                                <i className="bi bi-diagram-3-fill text-teal-600"></i> 2. Matriks Mapel per Rombel
                            </strong>
                            <p className="text-[11px] text-gray-600 leading-relaxed">
                                Memetakan beban mata pelajaran per kelas/rombel. Sistem secara cerdas menandai apakah pengampu diizinkan mengajar di rombel tersebut atau memiliki batasan kelas tertentu.
                            </p>
                        </div>
                        <div className="bg-white p-3 rounded-xl border border-emerald-200 shadow-2xs space-y-1">
                            <strong className="text-emerald-900 flex items-center gap-1.5 font-bold text-xs">
                                <i className="bi bi-calendar-check-fill text-cyan-600"></i> 3. Kesanggupan Asatidz
                            </strong>
                            <p className="text-[11px] text-gray-600 leading-relaxed">
                                Menentukan hari masuk mengajar (Senin–Ahad), urutan jam pelajaran bersedia (jam ke- berapa saja), serta batasan rombel spesifik (misal hanya kelas 7A/7B).
                            </p>
                        </div>
                    </div>

                    <ul className="list-disc pl-5 space-y-2 text-xs text-gray-700 bg-white p-3.5 rounded-xl border border-gray-200">
                        <li>
                            <strong>Target Bab / Silabus Semester:</strong> Masukkan daftar bab pokok, fasal kitab, atau submateri yang ditargetkan khatam per semester.
                        </li>
                        <li>
                            <strong>Integrasi Jurnal Mengajar Instan:</strong> Saat ustadz/guru mengisi jurnal kelas, daftar bab target ini otomatis muncul dalam bentuk tombol chip interaktif untuk menandai materi yang diajarkan tanpa perlu mengetik manual.
                        </li>
                        <li>
                            <strong>Kitab &amp; Alokasi Jam Tatap Muka (JTM):</strong> Cantumkan nama kitab kuning rujukan dan target jam per pekan untuk menjaga standar beban belajar santri.
                        </li>
                    </ul>
                </div>
            )
        },
        {
            title: '3. Penyusunan Jadwal KBM, Auto-Generate & Validasi Presisi Guru',
            color: 'indigo',
            content: (
                <div className="space-y-3 text-sm text-gray-700">
                    <p>
                        Penyusunan jadwal pelajaran mingguan dilakukan melalui grid interaktif di tab <strong>Jadwal Pelajaran</strong>, didukung generator otomatis dan validasi presisi:
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                        <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-lg">
                            <strong className="text-indigo-900 block mb-1">
                                <i className="bi bi-clock-history text-indigo-600"></i> 1. Konfigurasi Jam Belajar
                            </strong>
                            <p className="text-gray-600 text-[11px]">
                                Tentukan jumlah jam pelajaran per hari, waktu mulai &amp; selesai, serta durasi istirahat/shalat berjamaah.
                            </p>
                        </div>
                        <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-lg">
                            <strong className="text-indigo-900 block mb-1">
                                <i className="bi bi-shield-check text-indigo-600"></i> 2. Deteksi Bentrok &amp; Kesanggupan
                            </strong>
                            <p className="text-gray-600 text-[11px]">
                                Sistem otomatis memblokir bentrok jam mengajar dan memvalidasi kesanggupan guru (hari, jam pelajaran ke-, dan batasan kelas) lengkap dengan dialog peringatan cerdas.
                            </p>
                        </div>
                        <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-lg">
                            <strong className="text-indigo-900 block mb-1">
                                <i className="bi bi-magic text-indigo-600"></i> 3. Auto-Generate Cerdas
                            </strong>
                            <p className="text-gray-600 text-[11px]">
                                Buat jadwal otomatis dalam hitungan detik. Algoritma otomatis membaca pemetaan mapel rombel dan ketersediaan guru tanpa melanggar batasan kelas.
                            </p>
                        </div>
                    </div>
                </div>
            )
        },
        {
            title: '4. Matriks Jadwal Induk (Master Board Ruang Guru) & Rencana Pekan Efektif (RPE)',
            color: 'teal',
            content: (
                <div className="space-y-3 text-sm text-gray-700">
                    <p>
                        Menu <strong>Kurikulum &gt; Matriks Induk &amp; RPE</strong> menyediakan dua instrumen strategis untuk pengawasan pimpinan pondok:
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div className="bg-white p-3.5 rounded-xl border border-teal-200 shadow-2xs space-y-1.5">
                            <h5 className="font-bold text-teal-800 flex items-center gap-1.5">
                                <i className="bi bi-grid-3x3 text-teal-600"></i> Matriks Jadwal Induk (Master Board)
                            </h5>
                            <p className="text-gray-600 leading-relaxed">
                                Menampilkan pemetaan komprehensif seluruh rombel dalam satu hari sekaligus (Sumbu X: Rombel/Kelas, Sumbu Y: Jam Pelajaran). Memudahkan piket madrasah memantau ustadz yang sedang bertugas di tiap kelas dan siap dicetak dalam format Mading Ruang Guru (A4 Landscape).
                            </p>
                        </div>
                        <div className="bg-white p-3.5 rounded-xl border border-teal-200 shadow-2xs space-y-1.5">
                            <h5 className="font-bold text-teal-800 flex items-center gap-1.5">
                                <i className="bi bi-calculator text-teal-600"></i> Rencana Pekan Efektif (RPE Semester)
                            </h5>
                            <p className="text-gray-600 leading-relaxed">
                                Kalkulator cerdas untuk menghitung pekan efektif KBM riil setelah dikurangi libur awal/akhir Ramadhan, pekan ujian, dan agenda tahunan pesantren. Mengalikan jam alokasi per mapel untuk menyajikan Total Jam Efektif (JP) per semester secara akurat.
                            </p>
                        </div>
                    </div>
                </div>
            )
        },
        {
            title: '5. Analisis Beban Mengajar Guru & Cetak Slip Saku A5 Otomatis',
            color: 'purple',
            content: (
                <div className="space-y-3 text-sm text-gray-700">
                    <p>
                        Melalui tab <strong>Beban Mengajar &amp; Slip</strong>, pimpinan dan koordinator akademik dapat memastikan distribusi jam KBM merata:
                    </p>
                    <ul className="list-disc pl-5 space-y-2 text-xs text-gray-700 bg-purple-50/60 p-3.5 rounded-xl border border-purple-200">
                        <li>
                            <strong>Klasifikasi Beban Mengajar (JTM):</strong> Sistem membagi ustadz ke dalam 3 kategori: <em>Beban Ideal (12–24 jam/pekan)</em>, <em>Beban Tinggi (&gt;24 jam/pekan)</em>, dan <em>Beban Rendah (&lt;12 jam/pekan)</em>.
                        </li>
                        <li>
                            <strong>Penandatangan Slip Otomatis:</strong> Dokumen cetak slip saku mingguan guru langsung terisi nama pejabat penandatangan secara otomatis (Mudir Aam / Pimpinan Pondok / Kepala Bidang Kurikulum) beserta NIP/NIY dan kota penandatanganan tanpa ada lagi titik-titik kosong <code>( ... )</code>.
                        </li>
                        <li>
                            <strong>Fleksibilitas Penandatangan:</strong> Jika diperlukan pergantian penandatangan untuk marhalah tertentu, klik tombol <em>"Ubah Penandatangan"</em>. Konfigurasi tersimpan otomatis untuk pencetakan slip berikutnya.
                        </li>
                        <li>
                            <strong>Footer Terstandarisasi Resmi:</strong> Bagian bawah slip saku dan rekap beban memuat label resmi <code>eSantri Web by AI Projek | aiprojek01.my.id</code>.
                        </li>
                        <li>
                            <strong>Ekspor Excel (.xlsx):</strong> Rekapitulasi beban mengajar seluruh dewan guru dapat diunduh untuk lampiran laporan yayasan atau dasar penghitungan honor KBM.
                        </li>
                    </ul>
                </div>
            )
        },
        {
            title: '6. Audit, Solusi Redundansi Mapel & Kloning Kurikulum Antar-Jenjang',
            color: 'orange',
            content: (
                <div className="space-y-3 text-sm text-gray-700">
                    <p>
                        Menjaga integritas data kurikulum saat pesantren memiliki jenjang multi-tingkat (Wustha, Ulya, Tahfizh Al-Qur'an):
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div className="bg-white p-3 rounded-xl border border-orange-200 shadow-2xs space-y-1">
                            <strong className="text-orange-900 block font-semibold">
                                <i className="bi bi-tools text-orange-600"></i> Audit &amp; Konsolidasi Redundansi Mapel
                            </strong>
                            <p className="text-gray-600 leading-relaxed">
                                Jika terdapat mata pelajaran kembar atau duplikat di jenjang yang sama, tombol <em>"Audit &amp; Solusi Redundansi"</em> menyediakan opsi <em>"Gabungkan &amp; Konsolidasi Otomatis"</em>. Sistem memindahkan seluruh riwayat KBM, nilai santri, jurnal mengajar, dan jadwal ke mata pelajaran utama sebelum menghapus data ganda.
                            </p>
                        </div>
                        <div className="bg-white p-3 rounded-xl border border-orange-200 shadow-2xs space-y-1">
                            <strong className="text-orange-900 block font-semibold">
                                <i className="bi bi-files text-orange-600"></i> Kloning Kurikulum Antar-Jenjang
                            </strong>
                            <p className="text-gray-600 leading-relaxed">
                                Ingin mengadopsi kurikulum jenjang sebelumnya? Gunakan fitur <em>"Salin Kurikulum"</em> massal atau salin per mata pelajaran. Sistem menjamin ID setiap jenjang tetap terisolasi mandiri sehingga tidak menimbulkan kerancuan pada buku nilai dan rapor santri.
                            </p>
                        </div>
                    </div>
                </div>
            )
        },
        {
            title: '7. Manajemen Evaluasi & Jadwal Ujian (PTS, PAS, PAT, Munaqosyah & Pengawas)',
            color: 'cyan',
            content: (
                <div className="space-y-3 text-sm text-gray-700">
                    <p className="leading-relaxed">
                        Menu <strong>Kurikulum &gt; Jadwal Ujian</strong> menyediakan sistem manajemen asesmen komprehensif untuk seluruh rumpun evaluasi santri, mulai dari ujian semester, ujian diniyah, hingga munaqosyah tasmi tahfizh:
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                        <div className="bg-white p-3 rounded-xl border border-cyan-200 shadow-2xs space-y-1.5">
                            <strong className="text-cyan-900 flex items-center gap-1.5 font-bold text-xs">
                                <i className="bi bi-file-earmark-check text-cyan-600"></i> 1. Ragam Asesmen &amp; Smart Filter
                            </strong>
                            <p className="text-[11px] text-gray-600 leading-relaxed">
                                Mendukung PTS, PAS/SAS, PAT/SAT, Ujian Akhir Salafiyah, Try Out, serta <strong>Munaqosyah &amp; Tasmi Tahfizh</strong>. Dilengkapi <em>Smart Filter Rumpun</em> (Auto, Tahfizh/Munaqosyah, Diniyah, Umum) agar jadwal tertata rapi sesuai karakter ujian.
                            </p>
                        </div>
                        <div className="bg-white p-3 rounded-xl border border-cyan-200 shadow-2xs space-y-1.5">
                            <strong className="text-cyan-900 flex items-center gap-1.5 font-bold text-xs">
                                <i className="bi bi-journal-check text-teal-600"></i> 2. Topik Khusus Munaqosyah &amp; Tahfizh
                            </strong>
                            <p className="text-[11px] text-gray-600 leading-relaxed">
                                Untuk ujian Munaqosyah / Tasmi' Tahfizh, slot ujian tidak dipaksa memilih mapel formal biasa, melainkan fleksibel menginput <strong>Materi / Topik Ujian Khusus</strong> (contoh: <em>Juz 28–30 Bil Hifzhi</em>, <em>Matan Al-Jazariyah</em>, atau <em>Fathul Qorib Bab Thoharoh</em>).
                            </p>
                        </div>
                        <div className="bg-white p-3 rounded-xl border border-cyan-200 shadow-2xs space-y-1.5">
                            <strong className="text-cyan-900 flex items-center gap-1.5 font-bold text-xs">
                                <i className="bi bi-person-badge text-blue-600"></i> 3. Pengawas 1 &amp; Pengawas 2
                            </strong>
                            <p className="text-[11px] text-gray-600 leading-relaxed">
                                Setiap ruang dan sesi ujian dapat ditugaskan <strong>Pengawas 1</strong> (Penguji Utama) dan <strong>Pengawas 2</strong> (Penguji Pendamping / Panitia) dengan deteksi bentrok otomatis bila pengajar telah bertugas di ruang lain pada jam yang sama.
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                        <div className="p-3 bg-teal-50/70 border border-teal-200 rounded-xl space-y-1">
                            <strong className="text-teal-950 flex items-center gap-1.5 font-bold">
                                <i className="bi bi-magic text-teal-600"></i> Auto-Generate Cerdas Sesuai Jenis Ujian
                            </strong>
                            <p className="text-[11px] text-gray-600 leading-relaxed">
                                Tombol <strong>"Auto-Generate Jadwal"</strong> secara cerdas mengenali jenis ujian: bila memilih Munaqosyah / Tahfizh, sistem otomatis menyusun topik tahfizh dan memprioritaskan asatidz tahfizh tanpa memasukkan mapel umum. Begitu pula untuk PTS/PAS, generator memetakan mapel per rombel secara berimbang.
                            </p>
                        </div>
                        <div className="p-3 bg-cyan-50/70 border border-cyan-200 rounded-xl space-y-1">
                            <strong className="text-cyan-950 flex items-center gap-1.5 font-bold">
                                <i className="bi bi-printer-fill text-cyan-700"></i> Dokumen Resmi Siap Cetak &amp; Ekspor
                            </strong>
                            <p className="text-[11px] text-gray-600 leading-relaxed">
                                Cetak Jadwal Ujian per Jenjang / Rombel (A4 Portrait &amp; Landscape ber-Kop resmi), format Pengumuman Mading Santri, serta ekspor format Excel (.xlsx) untuk arsip panitia ujian.
                            </p>
                        </div>
                    </div>
                </div>
            )
        },
        {
            title: '8. SOP Multi-Admin: Protokol Tata Kelola Kurikulum, KBM & Evaluasi Ujian',
            color: 'red',
            content: (
                <div className="space-y-4 text-sm text-gray-700">
                    <div className="bg-red-50 p-4 rounded-xl border border-red-200 space-y-2">
                        <h4 className="font-bold text-red-950 flex items-center gap-2">
                            <i className="bi bi-shield-fill-check text-red-600"></i>
                            Standar Operasional Prosedur (SOP) Multi-Admin Kurikulum &amp; KBM Pesantren
                        </h4>
                        <p className="text-xs text-red-900 leading-relaxed">
                            Pengelolaan kurikulum, jadwal KBM, dan evaluasi ujian melibatkan koordinasi antara Pimpinan Pondok, Kepala Bidang Kurikulum, Panitia Ujian, Koordinator Jenjang, dan Petugas Tata Usaha. Agar tidak terjadi tumpang-tindih jadwal, bentrok pengampu/pengawas, dan desinkronisasi silabus, patuhi tata kelola kerja multi-admin berikut:
                        </p>
                    </div>

                    {/* Model A: Cloud Real-Time */}
                    <div className="p-3.5 bg-teal-50/70 border border-teal-200 rounded-xl space-y-2">
                        <div className="flex items-center justify-between border-b border-teal-200/70 pb-1.5">
                            <h5 className="font-bold text-teal-900 flex items-center gap-1.5 text-xs">
                                <span className="w-5 h-5 rounded-full bg-teal-200 text-teal-800 flex items-center justify-center text-[10px] font-black">A</span>
                                Model A: Cloud Real-Time (Firebase Firestore)
                            </h5>
                            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase">Online Aktif</span>
                        </div>
                        <p className="text-xs text-gray-600">
                            Digunakan saat ruang kantor pimpinan, ruang kurikulum, kepanitiaan ujian, dan ruang guru terhubung internet/WiFi pondok secara stabil.
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                            <div className="p-2.5 bg-white rounded-lg border border-teal-100 shadow-2xs space-y-1">
                                <strong className="text-teal-950 block font-semibold">
                                    <i className="bi bi-broadcast text-teal-600"></i> Jadwal &amp; Bentrok Terkunci Seketika
                                </strong>
                                <p className="text-[11px] text-gray-600 leading-relaxed">
                                    Saat Tim Kurikulum Jenjang Wustha menempatkan Ustadz A di Jam ke-1 hari Senin, jadwal tersebut langsung terkunci di Cloud. Tim Jenjang Ulya yang membuka grid jadwal pada saat bersamaan langsung melihat bahwa ustadz tersebut tidak tersedia, mencegah bentrok sejak detik pertama.
                                </p>
                            </div>
                            <div className="p-2.5 bg-white rounded-lg border border-teal-100 shadow-2xs space-y-1">
                                <strong className="text-teal-950 block font-semibold">
                                    <i className="bi bi-journal-check text-teal-600"></i> Jurnal KBM &amp; Ujian Real-Time di HP Guru
                                </strong>
                                <p className="text-[11px] text-gray-600 leading-relaxed">
                                    Guru yang mengisi jurnal mengajar atau mengawasi ujian di kelas langsung terbaca di dashboard monitoring ruang kurikulum/panitia. Koordinator kurikulum dapat memantau ketercapaian silabus dan absensi pengawas tanpa rekap manual.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Model B: Hub-and-Spoke */}
                    <div className="p-3.5 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-2">
                        <div className="flex items-center justify-between border-b border-indigo-200/70 pb-1.5">
                            <h5 className="font-bold text-indigo-900 flex items-center gap-1.5 text-xs">
                                <span className="w-5 h-5 rounded-full bg-indigo-200 text-indigo-800 flex items-center justify-center text-[10px] font-black">B</span>
                                Model B: Hub-and-Spoke (Offline-First / Penyusunan Bertahap)
                            </h5>
                            <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-[10px] font-bold uppercase">Hybrid / Offline</span>
                        </div>
                        <p className="text-xs text-gray-600">
                            Digunakan jika penyusunan kurikulum atau jadwal ujian dilakukan secara desentralisasi oleh koordinator marhalah/panitia di laptop masing-masing sebelum disahkan ke sistem utama.
                        </p>
                        <div className="space-y-2 text-xs">
                            <div className="p-2.5 bg-white rounded-lg border border-indigo-100">
                                <strong className="text-indigo-950">1. Peran Komputer HUB (Kantor Pimpinan / Kepala Kurikulum):</strong>
                                <p className="text-[11px] text-gray-600 mt-0.5">
                                    Menjadi satu-satunya otoritas yang mengunci dan menerbitkan Jadwal Induk, jadwal ujian resmi, mencetak slip saku resmi, serta mengekspor rekap beban mengajar guru.
                                </p>
                            </div>
                            <div className="p-2.5 bg-white rounded-lg border border-indigo-100">
                                <strong className="text-indigo-950">2. Peran Laptop SPOKE (Koordinator Jenjang / Panitia Ujian):</strong>
                                <p className="text-[11px] text-gray-600 mt-0.5">
                                    Menyusun draft silabus, memverifikasi kesiapan pengajar, atau merancang draft jadwal ujian. Setelah draft disetujui, data disatukan ke komputer HUB melalui menu Pengaturan Cadangan Data (Backup/Restore).
                                </p>
                            </div>
                            <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-950 space-y-1">
                                <strong>⚡ Aturan Sinkronisasi Spoke (Tarik Dulu, Susun, Sahkan ke HUB):</strong>
                                <ol className="list-decimal pl-4 space-y-0.5 text-gray-700">
                                    <li><strong>Sebelum Menyusun:</strong> Spoke mengunduh backup terkini dari komputer HUB agar daftar ustadz, rombel, dan alokasi mapel sinkron 100%.</li>
                                    <li><strong>Saat Menyusun:</strong> Setiap koordinator jenjang hanya mengedit kelas marhalahnya sendiri (misal: Wustha hanya mengedit kelas 7-9).</li>
                                    <li><strong>Pengesahan HUB:</strong> File draft diimpor ke komputer HUB, divalidasi dengan fitur Deteksi Bentrok Otomatis, lalu diterbitkan secara resmi.</li>
                                </ol>
                            </div>
                        </div>
                    </div>

                    {/* Matriks Peran & Hak Akses (RBAC) */}
                    <div className="border border-gray-200 rounded-xl p-3 bg-white space-y-2 text-xs">
                        <strong className="text-gray-900 flex items-center gap-1.5 font-bold text-xs uppercase tracking-wider">
                            <i className="bi bi-person-badge text-teal-600"></i> Matriks Peran &amp; Hak Akses Kurikulum (RBAC):
                        </strong>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse border border-gray-200 text-[11px]">
                                <thead className="bg-gray-100 font-semibold text-gray-700">
                                    <tr>
                                        <th className="border border-gray-200 p-1.5">Peran / Jabatan</th>
                                        <th className="border border-gray-200 p-1.5">Otoritas Kurikulum</th>
                                        <th className="border border-gray-200 p-1.5">Batasan Akses</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 text-gray-600">
                                    <tr>
                                        <td className="border border-gray-200 p-1.5 font-semibold text-gray-900">Mudir / Pimpinan Pondok</td>
                                        <td className="border border-gray-200 p-1.5">Menetapkan kebijakan kurikulum, beban mengajar maksimal, dan tanda tangan SK beban mengajar.</td>
                                        <td className="border border-gray-200 p-1.5 text-emerald-700 font-medium">Akses Penuh / Otoritas Tertinggi</td>
                                    </tr>
                                    <tr>
                                        <td className="border border-gray-200 p-1.5 font-semibold text-gray-900">Kepala Bidang Kurikulum</td>
                                        <td className="border border-gray-200 p-1.5">Membuat master mapel, kalender KBM, menyusun matriks jadwal induk, jadwal ujian, dan mengunci jadwal.</td>
                                        <td className="border border-gray-200 p-1.5 text-blue-700 font-medium">Pengelola Teknis Utama</td>
                                    </tr>
                                    <tr>
                                        <td className="border border-gray-200 p-1.5 font-semibold text-gray-900">Koordinator Jenjang / Panitia Ujian</td>
                                        <td className="border border-gray-200 p-1.5">Memverifikasi distribusi guru di marhalahnya, mengajukan draft silabus, RPE, dan plotting pengawas ujian.</td>
                                        <td className="border border-gray-200 p-1.5 text-indigo-700 font-medium">Khusus Marhalah Terkait</td>
                                    </tr>
                                    <tr>
                                        <td className="border border-gray-200 p-1.5 font-semibold text-gray-900">Dewan Asatidz / Guru</td>
                                        <td className="border border-gray-200 p-1.5">Menerima slip beban saku A5, melihat jadwal mengajar/mengawas, dan mengisi jurnal KBM harian.</td>
                                        <td className="border border-gray-200 p-1.5 text-gray-700">Lihat Jadwal Sendiri &amp; Jurnal</td>
                                    </tr>
                                    <tr>
                                        <td className="border border-gray-200 p-1.5 font-semibold text-gray-900">Petugas Piket KBM</td>
                                        <td className="border border-gray-200 p-1.5">Memantau keterisian jam di kelas dan mencatat guru berhalangan hadir / infaq jam pengganti.</td>
                                        <td className="border border-gray-200 p-1.5 text-amber-700 font-medium">Monitoring Harian</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* SOP Penanganan Konflik & Keamanan Komputer Bersama */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        <div className="border border-red-200 rounded-xl p-3 bg-red-50/50 space-y-1">
                            <strong className="text-red-950 flex items-center gap-1.5 font-bold">
                                <i className="bi bi-exclamation-triangle-fill text-red-600"></i> SOP Penanganan Bentrok Jadwal &amp; Pengawas
                            </strong>
                            <p className="text-[11px] text-gray-600 leading-relaxed">
                                Jika dua jenjang membutuhkan ustadz yang sama di jam yang sama, <strong>prioritas utama</strong> diberikan pada jenjang kelas akhir (Ulya 3 / Wustha 3) yang menghadapi ujian kelulusan, atau disepakati penugasan pengawas pengganti sebelum jadwal dikunci.
                            </p>
                        </div>
                        <div className="border border-blue-200 rounded-xl p-3 bg-blue-50/50 space-y-1">
                            <strong className="text-blue-950 flex items-center gap-1.5 font-bold">
                                <i className="bi bi-shield-lock-fill text-blue-600"></i> Disiplin Komputer Bersama di Ruang Guru
                            </strong>
                            <p className="text-[11px] text-gray-600 leading-relaxed">
                                Komputer di ruang guru yang dipakai bergantian wajib logout dari akun admin kurikulum setelah sesi penyusunan selesai. Jangan tinggalkan browser dalam mode edit terbuka agar jadwal yang sudah fix tidak tergeser tanpa sengaja.
                            </p>
                        </div>
                    </div>

                    {/* Protokol 4 Fase Rollout Semester Baru */}
                    <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl space-y-2 text-xs">
                        <h5 className="font-bold text-amber-950 flex items-center gap-1.5">
                            <i className="bi bi-calendar4-week text-amber-700"></i>
                            Protokol 4 Fase Rollout Kurikulum Semester Baru
                        </h5>
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-[11px]">
                            <div className="bg-white p-2 rounded-lg border border-amber-200">
                                <span className="font-bold text-amber-900 block">Fase 1 (H-30)</span>
                                <span className="text-gray-600">Validasi daftar mapel &amp; target bab silabus semester di tab Mata Pelajaran.</span>
                            </div>
                            <div className="bg-white p-2 rounded-lg border border-amber-200">
                                <span className="font-bold text-amber-900 block">Fase 2 (H-20)</span>
                                <span className="text-gray-600">Pemutakhiran data guru, ketersediaan hari mengajar, dan kompetensi mapel.</span>
                            </div>
                            <div className="bg-white p-2 rounded-lg border border-amber-200">
                                <span className="font-bold text-amber-900 block">Fase 3 (H-10)</span>
                                <span className="text-gray-600">Penyusunan grid jadwal &amp; verifikasi nihil-bentrok di Matriks Jadwal Induk.</span>
                            </div>
                            <div className="bg-white p-2 rounded-lg border border-amber-200">
                                <span className="font-bold text-amber-900 block">Fase 4 (H-3)</span>
                                <span className="text-gray-600">Cetak Slip Saku A5 untuk dewan ustadz &amp; pasang Matriks Induk di Ruang Guru.</span>
                            </div>
                        </div>
                    </div>
                </div>
            )
        }
    ]
};
