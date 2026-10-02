import React from 'react';
import { PanduanSectionData } from '../panduan';

export const kalenderPanduan: PanduanSectionData = {
    id: 'kalender',
    badge: 12,
    badgeColor: 'yellow',
    title: 'Kalender Akademik & Jadwal Piket Ibadah Santri',
    steps: [
        {
            title: '1. SOP Kerja Multi-Admin: Real-Time Sync (Cloud) vs Hub-and-Spoke (Offline)',
            color: 'teal',
            content: (
                <div className="space-y-3 text-sm text-gray-700">
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-950 text-xs flex items-start gap-2.5">
                        <i className="bi bi-exclamation-triangle-fill text-amber-600 shrink-0 text-base mt-0.5"></i>
                        <div>
                            <strong className="font-bold text-amber-900 block mb-0.5">Urgensi Tata Kelola Multi-Admin pada Kalender &amp; Piket Ibadah:</strong>
                            Kalender Pesantren merupakan simpul koordinasi lintas bagian: <strong>Bagian Kurikulum/Akademik</strong> (KBM, Ujian PTS/PAS, Libur Semester), <strong>Bagian Ubudiyah/Takmir Masjid</strong> (Piket Muadzin, Imam Santri, Sholat Berjamaah), <strong>Bagian Pengasuhan</strong> (Perpulangan Santri, PHBI, Acara Asrama), dan <strong>Sekretariat/Pimpinan</strong> (Rapat Pleno, Haflah, Wisuda). Penerapan protokol multi-admin yang disiplin mencegah bentrok jadwal kegiatan dan menjamin rotasi petugas ibadah santri berlangsung adil tanpa duplikasi penugasan.
                        </div>
                    </div>

                    {/* Model A: Real-Time Live Sync */}
                    <div className="p-3.5 bg-teal-50/70 border border-teal-200 rounded-xl space-y-2">
                        <div className="flex items-center justify-between border-b border-teal-200/70 pb-1.5">
                            <h5 className="font-bold text-teal-900 flex items-center gap-1.5 text-xs">
                                <span className="w-5 h-5 rounded-full bg-teal-200 text-teal-800 flex items-center justify-center text-[10px] font-black">1</span>
                                Model A: Real-Time Live Sync (Firebase Firestore)
                            </h5>
                            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase">Online Aktif</span>
                        </div>
                        <p className="text-xs text-gray-600">
                            Sangat direkomendasikan jika kantor administrasi, ruang asatidz, dan pos pengurus asrama terhubung koneksi WiFi pesantren atau internet stabil.
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-xs">
                            <div className="p-2.5 bg-white rounded-lg border border-teal-100 shadow-2xs">
                                <strong className="text-teal-950 block mb-1 font-semibold flex items-center gap-1">
                                    <i className="bi bi-people-fill text-teal-600"></i> Partisi Tugas Antar Bidang
                                </strong>
                                <p className="text-[11px] text-gray-600">
                                    Staf Kurikulum mengelola tanggal ujian dan KBM; Staf Ubudiyah mengelola piket adzan dan imam sholat santri; Pimpinan pondok dapat memantau jadwal secara menyeluruh dari gawai masing-masing.
                                </p>
                            </div>
                            <div className="p-2.5 bg-white rounded-lg border border-teal-100 shadow-2xs">
                                <strong className="text-teal-950 block mb-1 font-semibold flex items-center gap-1">
                                    <i className="bi bi-broadcast text-teal-600"></i> Pembaruan Seketika Lintas Perangkat
                                </strong>
                                <p className="text-[11px] text-gray-600">
                                    Setiap penambahan agenda baru atau pergantian santri piket di komputer kantor langsung tersinkronisasi ke tablet asatidz dan mading digital masjid tanpa perlu reload halaman.
                                </p>
                            </div>
                            <div className="p-2.5 bg-white rounded-lg border border-teal-100 shadow-2xs">
                                <strong className="text-teal-950 block mb-1 font-semibold flex items-center gap-1">
                                    <i className="bi bi-shield-check text-teal-600"></i> Hak Akses Bertingkat (RBAC)
                                </strong>
                                <p className="text-[11px] text-gray-600">
                                    Hanya akun dengan hak akses tulis (<em>write</em>) pada modul Kalender yang dapat menambah atau mengacak jadwal piket. Staf umum dan santri hanya dapat melihat (<em>read-only</em>).
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Model B: Hub-and-Spoke */}
                    <div className="p-3.5 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-2">
                        <div className="flex items-center justify-between border-b border-indigo-200/70 pb-1.5">
                            <h5 className="font-bold text-indigo-900 flex items-center gap-1.5 text-xs">
                                <span className="w-5 h-5 rounded-full bg-indigo-200 text-indigo-800 flex items-center justify-center text-[10px] font-black">2</span>
                                Model B: Hub-and-Spoke (Offline-First / File Cadangan / Sinkronisasi Berkala)
                            </h5>
                            <span className="ml-auto px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-[10px] font-bold uppercase">Hybrid / Offline</span>
                        </div>
                        <p className="text-xs text-gray-600">
                            Pilihan tepat jika area masjid, pos asrama, atau area santri belum terjangkau internet kontinu. Seluruh penugasan tetap dapat diisi secara offline di lapangan.
                        </p>
                        <div className="space-y-2 pt-1 text-xs">
                            <div className="p-2.5 bg-white rounded-lg border border-indigo-100">
                                <strong className="text-indigo-950 flex items-center gap-1.5">
                                    <i className="bi bi-building-fill text-indigo-600"></i> A. Peran HUB (Pusat Kalender di Kantor Sekretariat / TU):
                                </strong>
                                <p className="text-[11px] text-gray-600 mt-0.5">
                                    Komputer induk di Kantor Sekretariat memegang otoritas kalender resmi pondok: penetapan libur semester, tanggal penting hisab Hijriah, format kop surat resmi, pejabat penanda tangan, serta butir ketentuan sholat berjamaah.
                                </p>
                            </div>
                            <div className="p-2.5 bg-white rounded-lg border border-indigo-100">
                                <strong className="text-indigo-950 flex items-center gap-1.5">
                                    <i className="bi bi-laptop-fill text-indigo-600"></i> B. Peran SPOKE (Laptop Takmir Masjid / Pengurus Asrama):
                                </strong>
                                <p className="text-[11px] text-gray-600 mt-0.5">
                                    Pengurus masjid atau asrama menyusun jadwal piket harian, rotasi muadzin pekanan, atau draf agenda lomba santri di pos masing-masing tanpa memerlukan koneksi internet.
                                </p>
                            </div>
                            <div className="p-2.5 bg-white rounded-lg border border-indigo-100">
                                <strong className="text-indigo-950 flex items-center gap-1.5">
                                    <i className="bi bi-arrow-repeat text-indigo-600"></i> C. Alur Penggabungan (Merging) &amp; Publikasi Jadwal:
                                </strong>
                                <div className="mt-1.5 p-2 bg-teal-50/80 border border-teal-200 rounded text-[11px] text-teal-950">
                                    <strong>⚡ Sinkronisasi Cerdas Saat Login:</strong> Setiap kali staf terhubung ke jaringan internet dan login ke sistem, aplikasi secara otomatis memeriksa dan memperbarui master data kalender di latar belakang.
                                </div>
                                <ol className="list-decimal pl-4 mt-2 space-y-1 text-[11px] text-gray-600">
                                    <li>Pengurus masjid mengacak atau menyusun jadwal piket di laptop pos (offline).</li>
                                    <li>Saat terhubung WiFi atau hotspot, pengurus mengeklik <strong>"Kirim Perubahan (Upload Changes)"</strong> di panel Sinkronisasi.</li>
                                    <li>Admin Pusat (Hub) memverifikasi dan mengeklik <strong>"Gabungkan Perubahan (Merge Changes)"</strong> untuk mengesahkan jadwal piket tersebut ke basis data utama.</li>
                                    <li>Admin Pusat mengeklik <strong>"Terbitkan Master Data (Publish Master)"</strong> sehingga jadwal yang sudah sah terdistribusi ke seluruh perangkat pondok.</li>
                                </ol>
                            </div>
                        </div>
                    </div>

                    {/* SOP Disiplin & Audit Trail */}
                    <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-xs space-y-1.5">
                        <strong className="text-amber-950 flex items-center gap-1.5 font-bold">
                            <i className="bi bi-shield-lock-fill text-amber-700"></i> SOP Keamanan Sesi &amp; Audit Trail Perubahan Agenda:
                        </strong>
                        <p className="text-[11px] text-gray-700 leading-relaxed">
                            Setiap penambahan agenda, perubahan tanggal kegiatan, pengacakan otomatis jadwal piket, hingga pengosongan jadwal dicatat secara otomatis dalam <strong>Log Aktivitas Sistem (Audit Trail)</strong> lengkap dengan stempel waktu dan identitas akun pembuat. Pastikan staf selalu logout setelah selesai bertugas di komputer bersama di kantor atau masjid.
                        </p>
                    </div>
                </div>
            )
        },
        {
            title: '2. Kalender Akademik: Sistem Dual Penanggalan (Masehi & Hijriah Algoritmik)',
            color: 'teal',
            content: (
                <div className="space-y-3 text-sm text-gray-700">
                    <p className="leading-relaxed">
                        eSantri Web mengusung teknologi <strong>Dual Calendar Engine</strong> yang menggabungkan kalender Masehi (Gregorian) dan penanggalan Hijriah (Qomariyah) secara berdampingan pada setiap sel tanggal.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div className="bg-white p-3.5 rounded-xl border border-blue-200 shadow-2xs space-y-1.5">
                            <div className="flex items-center gap-2 text-blue-900 font-bold">
                                <i className="bi bi-calendar3 text-blue-600 text-sm"></i>
                                <span>Penanggalan Acuan Masehi</span>
                            </div>
                            <p className="text-gray-600 text-[11px] leading-relaxed">
                                Angka masehi ditampilkan besar dan tebal, sedangkan tanggal Hijriah ditampilkan dengan angka Arab di sudut kanan atas. Sangat cocok untuk administrasi dinas, kementerian, dan jadwal KBM umum.
                            </p>
                        </div>
                        <div className="bg-white p-3.5 rounded-xl border border-teal-200 shadow-2xs space-y-1.5">
                            <div className="flex items-center gap-2 text-teal-900 font-bold">
                                <i className="bi bi-moon-stars text-teal-600 text-sm"></i>
                                <span>Penanggalan Acuan Hijriah</span>
                            </div>
                            <p className="text-gray-600 text-[11px] leading-relaxed">
                                Angka Arab Hijriah ditampilkan besar dengan tipografi kaligrafi pesantren, sedangkan tanggal Masehi tampil sebagai rujukan sekunder. Sangat pas untuk kalender diniyah dan ibadah pondok.
                            </p>
                        </div>
                    </div>

                    <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl space-y-2 text-xs">
                        <h5 className="font-bold text-teal-900 flex items-center gap-1.5">
                            <i className="bi bi-brightness-high-fill text-teal-700"></i>
                            Deteksi Otomatis Jadwal Puasa Sunnah &amp; Wajib
                        </h5>
                        <p className="text-gray-700 text-[11px] leading-relaxed">
                            Bila opsi <strong>"Puasa Sunnah"</strong> diaktifkan, sistem secara otomatis memberi tanda warna dan ikon pada sel kalender:
                        </p>
                        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                            <li className="flex items-center gap-2 p-1.5 bg-white rounded-lg border border-amber-200">
                                <i className="bi bi-moon-stars-fill text-amber-600"></i>
                                <span><strong>Puasa Ramadhan:</strong> Blok kuning/emas (1 - 29/30 Ramadhan).</span>
                            </li>
                            <li className="flex items-center gap-2 p-1.5 bg-white rounded-lg border border-emerald-200">
                                <i className="bi bi-droplet-fill text-emerald-600"></i>
                                <span><strong>Senin-Kamis:</strong> Ikon tetesan hijau di setiap hari Senin &amp; Kamis.</span>
                            </li>
                            <li className="flex items-center gap-2 p-1.5 bg-white rounded-lg border border-blue-200">
                                <i className="bi bi-brightness-high-fill text-blue-500"></i>
                                <span><strong>Ayyamul Bidh:</strong> Blok biru muda pada 13, 14, 15 tiap bulan Hijriah.</span>
                            </li>
                            <li className="flex items-center gap-2 p-1.5 bg-white rounded-lg border border-purple-200">
                                <i className="bi bi-star-fill text-purple-600"></i>
                                <span><strong>Puasa Khusus:</strong> Tasu'a-Asyura (9-10 Muharram) &amp; Arafah (9 Dzulhijjah).</span>
                            </li>
                        </ul>
                    </div>

                    <div className="p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-600">
                        <i className="bi bi-info-circle-fill text-gray-500 mr-1.5"></i>
                        <strong>Kalibrasi Ru'yatul Hilal:</strong> Algoritma hisab telah disesuaikan dengan kriteria umum MABIMS. Jika awal bulan Hijriah berbeda 1 hari karena hisab lokal, Super Admin dapat menyetel penyesuaian (-1 s/d +1 hari) di menu <em>Pengaturan Pondok &gt; Pengaturan Umum &gt; Kalibrasi Hijriah</em>.
                    </div>
                </div>
            )
        },
        {
            title: '3. Filter Kalender Standar Aplikasi Mobile & Desktop',
            color: 'teal',
            content: (
                <div className="space-y-3 text-sm text-gray-700">
                    <p className="leading-relaxed">
                        Sistem filter kalender telah distandarisasi untuk kenyamanan operasional di seluruh perangkat:
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div className="bg-white p-3.5 rounded-xl border border-teal-200 shadow-2xs space-y-2">
                            <span className="px-2 py-0.5 rounded bg-teal-100 text-teal-800 font-bold text-[10px] uppercase">
                                Mode Smartphone (Ponsel)
                            </span>
                            <h5 className="font-bold text-teal-900 text-sm">Mobile Filter Drawer (Bottom Sheet)</h5>
                            <p className="text-gray-600 leading-relaxed text-[11px]">
                                Di layar ponsel, filter tidak lagi menumpuk dan memakan ruang layar. Cukup ketuk tombol <strong>[ Filter (n) ]</strong> di bilah atas untuk memunculkan laci filter dari bawah. Anda dapat mengatur pencarian, kategori agenda, marhalah, dan kalender acuan dengan satu sentuhan.
                            </p>
                        </div>
                        <div className="bg-white p-3.5 rounded-xl border border-blue-200 shadow-2xs space-y-2">
                            <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-bold text-[10px] uppercase">
                                Mode Tablet &amp; Komputer (Desktop)
                            </span>
                            <h5 className="font-bold text-blue-900 text-sm">Inline Search &amp; Dropdown Bertingkat</h5>
                            <p className="text-gray-600 leading-relaxed text-[11px]">
                                Di layar tablet dan komputer, kolom pencarian, tombol pengalihan Masehi/Hijriah, pemilih Kelas &amp; Rombel, serta barisan chip kategori tampil sejajar dan rapi tanpa wrapping yang berantakan.
                            </p>
                        </div>
                    </div>

                    <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-2 text-xs">
                        <strong className="font-bold text-gray-800 block">Fitur Pendukung Saringan Agenda:</strong>
                        <ul className="list-disc pl-4 space-y-1 text-[11px] text-gray-600">
                            <li><strong>Kategori Agenda Cepat:</strong> Filter instan dengan chip horizontal (<em>Semua, Kegiatan, Ujian, Libur, Rapat, Lainnya</em>) lengkap dengan lencana jumlah kegiatan aktif.</li>
                            <li><strong>Filter Bertingkat Marhalah:</strong> Pilih <em>Jenjang</em> (misal: MTs) $\rightarrow$ pilihan <em>Kelas</em> otomatis menyesuaikan $\rightarrow$ pilihan <em>Rombel</em> terfilter spesifik.</li>
                            <li><strong>Active Filter Badges:</strong> Setiap filter yang aktif muncul sebagai lencana yang dapat dihapus satu per satu dengan mengetuk ikon <strong>✕</strong> atau tombol <strong>Reset Semua</strong>.</li>
                        </ul>
                    </div>
                </div>
            )
        },
        {
            title: '4. Penginputan Agenda: Tunggal vs Massal (Bulk Grid)',
            color: 'teal',
            content: (
                <div className="space-y-3 text-sm text-gray-700">
                    <p className="leading-relaxed">
                        eSantri Web menyediakan dua metode penginputan agenda agar tim kurikulum dan pengasuhan dapat bekerja cepat:
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div className="bg-white p-3.5 rounded-xl border border-teal-200 shadow-2xs space-y-2">
                            <div className="flex items-center gap-2 font-bold text-teal-900 text-sm">
                                <i className="bi bi-plus-circle-fill text-teal-600"></i>
                                <span>Input Tunggal (Satu per Satu)</span>
                            </div>
                            <ol className="list-decimal pl-4 space-y-1 text-[11px] text-gray-600">
                                <li>Klik tombol <strong>+ Tambah Agenda</strong> di bilah atas kalender, atau klik langsung pada kotak tanggal yang dituju.</li>
                                <li>Isi judul agenda, deskripsi, tanggal mulai, dan tanggal selesai.</li>
                                <li>Tentukan <strong>Kategori</strong> (Kegiatan, Ujian, Libur, Rapat, Lainnya) dan warna pembeda.</li>
                                <li>(Opsional) Tentukan target khusus: Jenjang, Kelas, atau Rombel tertentu.</li>
                                <li>Klik <strong>Simpan Agenda</strong>.</li>
                            </ol>
                        </div>

                        <div className="bg-white p-3.5 rounded-xl border border-blue-200 shadow-2xs space-y-2">
                            <div className="flex items-center gap-2 font-bold text-blue-900 text-sm">
                                <i className="bi bi-table text-blue-600"></i>
                                <span>Input Massal (Bulk Grid Editor)</span>
                            </div>
                            <p className="text-[11px] text-gray-600 leading-relaxed">
                                Sangat efisien saat awal tahun ajaran baru ketika Anda harus memasukkan puluhan jadwal semesteran sekaligus:
                            </p>
                            <ol className="list-decimal pl-4 space-y-1 text-[11px] text-gray-600">
                                <li>Klik tombol <strong>Bulk Agenda</strong> di bilah atas.</li>
                                <li>Sebuah jendela tabel editor interaktif akan muncul.</li>
                                <li>Isi baris demi baris (Judul, Tanggal, Kategori) atau salin data dari spreadsheet.</li>
                                <li>Klik <strong>Simpan Semua Baris</strong> untuk menyuntikkan seluruh agenda sekaligus ke sistem.</li>
                            </ol>
                        </div>
                    </div>
                </div>
            )
        },
        {
            title: '5. Ekspor Dokumen Resmi & Sinkronisasi Kalender (.ics)',
            color: 'teal',
            content: (
                <div className="space-y-3 text-sm text-gray-700">
                    <p className="leading-relaxed">
                        Agenda akademik pesantren dapat dibagikan dan dicetak dalam berbagai format resmi:
                    </p>
                    <div className="space-y-2 text-xs">
                        <div className="p-3 bg-white rounded-xl border border-teal-200 shadow-2xs flex items-start gap-3">
                            <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center shrink-0 text-base">
                                <i className="bi bi-calendar-check-fill"></i>
                            </div>
                            <div className="space-y-1">
                                <strong className="font-bold text-teal-950 text-xs block">
                                    Ekspor iCalendar Standard (.ics)
                                </strong>
                                <p className="text-[11px] text-gray-600 leading-relaxed">
                                    Klik tombol <strong>.ics ({'{jumlah}'})</strong> untuk mengunduh berkas kalender standar industri. Berkas ini dapat langsung dibuka dan disinkronkan ke <strong>Google Calendar</strong>, <strong>Apple Calendar</strong> (iPhone/iPad/Mac), maupun <strong>Microsoft Outlook</strong> oleh para asatidz dan wali santri.
                                </p>
                            </div>
                        </div>

                        <div className="p-3 bg-white rounded-xl border border-blue-200 shadow-2xs flex items-start gap-3">
                            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 text-base">
                                <i className="bi bi-file-earmark-pdf-fill"></i>
                            </div>
                            <div className="space-y-1">
                                <strong className="font-bold text-blue-950 text-xs block">
                                    Cetak Dokumen Resmi &amp; PDF Vektor Tajam
                                </strong>
                                <p className="text-[11px] text-gray-600 leading-relaxed">
                                    Klik <strong>Cetak &amp; Export</strong> untuk membuka jendela format cetak. Sistem menyediakan dokumen kalender berkualitas tinggi:
                                </p>
                                <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-gray-600">
                                    <li><strong>Export PDF Vektor:</strong> Teks tajam beresolusi tinggi, angka Arab Hijriah asli, lampiran daftar agenda kegiatan resmi, serta kolom tanggal dan tanda tangan pimpinan/kepala kepesantrenan.</li>
                                    <li><strong>Cetak Langsung:</strong> Format cetak dokumen standar A4/F4 langsung ke printer kantor.</li>
                                    <li><strong>Export Dokumen HTML:</strong> Berkas dokumen mandiri yang dapat dibuka dan dicetak di komputer mana saja tanpa memerlukan koneksi internet.</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            )
        },
        {
            title: '6. Manajemen Jadwal Piket Ibadah Santri (Muadzin & Imam Badal)',
            color: 'teal',
            content: (
                <div className="space-y-3 text-sm text-gray-700">
                    <p className="leading-relaxed">
                        Tab <strong>Jadwal Piket Ibadah</strong> dirancang khusus untuk membina kedisiplinan dan kepemimpinan ibadah santri dalam mengumandangkan adzan serta memimpin sholat berjamaah di masjid pondok.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div className="bg-white p-3.5 rounded-xl border border-teal-200 shadow-2xs space-y-2">
                            <h5 className="font-bold text-teal-900 text-sm flex items-center gap-1.5">
                                <i className="bi bi-calendar4-week text-teal-600"></i>
                                Tampilan Mingguan (Weekly Matrix)
                            </h5>
                            <p className="text-gray-600 text-[11px] leading-relaxed">
                                Menampilkan jadwal 1 pekan penuh (Ahad sampai Sabtu) untuk 5 waktu sholat fardhu (Subuh, Dzuhur, Ashar, Maghrib, dan Isya). Setiap waktu sholat menyediakan 2 slot penugasan santri:
                            </p>
                            <div className="space-y-1 pt-1 text-[11px]">
                                <div className="flex items-center gap-2">
                                    <span className="px-1.5 py-0.2 bg-teal-600 text-white rounded font-bold text-[10px]">M</span>
                                    <span><strong>Slot Muadzin:</strong> Santri bertugas mengumandangkan adzan &amp; iqomah.</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="px-1.5 py-0.2 bg-amber-600 text-white rounded font-bold text-[10px]">I</span>
                                    <span><strong>Slot Imam:</strong> Santri senior bertugas sebagai imam latihan / badal ustadz.</span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white p-3.5 rounded-xl border border-blue-200 shadow-2xs space-y-2">
                            <h5 className="font-bold text-blue-900 text-sm flex items-center gap-1.5">
                                <i className="bi bi-calendar2-day text-blue-600"></i>
                                Tampilan Harian (Daily View)
                            </h5>
                            <p className="text-gray-600 text-[11px] leading-relaxed">
                                Menampilkan rincian petugas muadzin dan imam khusus pada hari yang dipilih. Tampilan ini sangat pas untuk dicetak atau ditampilkan di layar pengumuman masjid untuk jadwal hari berjalan.
                            </p>
                            <div className="p-2 bg-blue-50 border border-blue-200 rounded-lg text-[11px] text-blue-900">
                                <i className="bi bi-check-circle-fill text-blue-600 mr-1"></i>
                                Dilengkapi tombol cepat <strong>Kemarin</strong>, <strong>Hari Ini</strong>, dan <strong>Besok</strong> untuk navigasi kilat di gawai pengurus.
                            </div>
                        </div>
                    </div>

                    <div className="p-3.5 bg-teal-50 border border-teal-200 rounded-xl space-y-2 text-xs">
                        <h5 className="font-bold text-teal-900 flex items-center gap-1.5">
                            <i className="bi bi-magic text-teal-600 text-sm"></i>
                            Fitur Cerdas: "Auto Isi 1 Minggu" &amp; "Auto Isi Hari Ini"
                        </h5>
                        <p className="text-gray-700 text-[11px] leading-relaxed">
                            Pengurus masjid tidak perlu memilih santri satu per satu secara manual. Cukup klik <strong>Auto Isi</strong>, maka sistem akan menjalankan algoritma rotasi cerdas:
                        </p>
                        <ul className="list-disc pl-4 space-y-1 text-[11px] text-gray-700">
                            <li>Memilih santri putra berstatus aktif dari data santri pesantren.</li>
                            <li>Memprioritaskan santri yang belum bertugas pada pekan berjalan agar distribusi piket merata dan adil.</li>
                            <li>Slot yang sudah diisi manual sebelumnya tidak akan ditimpa oleh pengacak otomatis.</li>
                            <li>Bila ingin mereset seluruh penugasan pekan tersebut, gunakan tombol <strong>Kosongkan</strong>.</li>
                        </ul>
                    </div>
                </div>
            )
        },
        {
            title: '7. Format Cetak Resmi & Unduh PDF Data Jadwal Piket (Landscape)',
            color: 'teal',
            content: (
                <div className="space-y-3 text-sm text-gray-700">
                    <p className="leading-relaxed">
                        Jadwal piket ibadah santri dapat dicetak sebagai dokumen pengumuman resmi yang elegan dan berwibawa:
                    </p>
                    <div className="p-3.5 bg-white rounded-xl border border-teal-200 shadow-2xs space-y-2 text-xs">
                        <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                            <h5 className="font-bold text-teal-900 flex items-center gap-1.5 text-sm">
                                <i className="bi bi-sliders2 text-teal-600"></i>
                                Pengaturan Khusus Format Cetak Piket
                            </h5>
                            <span className="text-[10px] text-teal-700 bg-teal-50 px-2 py-0.5 rounded font-bold border border-teal-200">
                                Tombol: Format Cetak
                            </span>
                        </div>
                        <p className="text-gray-600 text-[11px] leading-relaxed">
                            Ketuk tombol <strong>Format Cetak</strong> di bilah atas untuk membuka modal pengaturan format resmi:
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-[11px]">
                            <div className="p-2 bg-gray-50 rounded-lg border border-gray-200">
                                <strong className="text-gray-900 block font-semibold mb-0.5">Tempat Penerbitan:</strong>
                                <span className="text-gray-600">Menentukan nama kota/tempat terbit jadwal (misal: Jombang, Kudus, dll).</span>
                            </div>
                            <div className="p-2 bg-gray-50 rounded-lg border border-gray-200">
                                <strong className="text-gray-900 block font-semibold mb-0.5">Pejabat Pengesah:</strong>
                                <span className="text-gray-600">Mengatur nama lengkap &amp; jabatan penanda tangan (misal: Kepala Bagian Ubudiyah).</span>
                            </div>
                            <div className="p-2 bg-gray-50 rounded-lg border border-gray-200">
                                <strong className="text-gray-900 block font-semibold mb-0.5">Ketentuan Sholat:</strong>
                                <span className="text-gray-600">Menambah atau mengedit butir tata tertib santri piket (hadir 10 menit sebelum adzan, berpakaian sopan, dll).</span>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl space-y-1">
                            <strong className="text-blue-950 font-bold flex items-center gap-1.5">
                                <i className="bi bi-file-earmark-pdf-fill text-blue-600"></i>
                                Unduh PDF Data (Landscape Vektor)
                            </strong>
                            <p className="text-[11px] text-gray-600 leading-relaxed">
                                Menghasilkan berkas PDF vektor horizontal beresolusi tinggi dengan tabel jadwal 7 hari, kop pesantren, butir ketentuan sholat, serta tanda tangan pengesahan resmi. Sangat tajam saat dicetak dalam ukuran A4 maupun disebarkan ke grup WhatsApp pengurus.
                            </p>
                        </div>
                        <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl space-y-1">
                            <strong className="text-gray-900 font-bold flex items-center gap-1.5">
                                <i className="bi bi-printer-fill text-gray-700"></i>
                                Cetak Langsung A4
                            </strong>
                            <p className="text-[11px] text-gray-600 leading-relaxed">
                                Membuka dialog print browser untuk pencetakan instan ke mesin printer fisik kantor untuk langsung ditempel di mading masjid atau asrama.
                            </p>
                        </div>
                    </div>
                </div>
            )
        }
    ]
};
