
import React from 'react';
import { kurikulumPanduan } from './panduan/kurikulum';
import { raporPanduan } from './panduan/rapor';
import { akademikPanduan } from './panduan/akademik';
import { perpustakaanPanduan } from './panduan/perpustakaan';
import { kalenderPanduan } from './panduan/kalender';
import { financePanduan } from './panduan/finance';
import { bukukasPanduan } from './panduan/bukukas';
import { koperasiPanduan } from './panduan/koperasi';

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
                title: 'Ikhtisar & Tahapan Memulai eSantri Web',
                content: (
                    <div className="space-y-3 text-sm text-gray-700">
                        {/* Roadmap Implementasi */}
                        <div className="bg-purple-50 p-4 rounded-xl border border-purple-200 text-xs text-purple-950 space-y-2">
                            <h5 className="font-bold flex items-center gap-2 text-purple-900 text-sm">
                                <i className="bi bi-compass-fill text-purple-600 text-base"></i>
                                Tahapan Kronologis Penerapan Sistem di Pesantren
                            </h5>
                            <p className="leading-relaxed text-gray-700">
                                Agar implementasi eSantri Web di lingkungan pondok pesantren berjalan rapi, patuhi 5 tahapan berurutan berikut:
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 pt-1 text-center font-medium">
                                <div className="bg-white p-2 rounded-lg border border-purple-200 shadow-2xs">
                                    <span className="w-5 h-5 mx-auto bg-purple-600 text-white rounded-full flex items-center justify-center text-[10px] font-bold mb-1">1</span>
                                    <strong className="text-purple-950 block text-[11px]">Profil Lembaga</strong>
                                    <span className="text-[10px] text-gray-500">Identitas & Logo</span>
                                </div>
                                <div className="bg-white p-2 rounded-lg border border-purple-200 shadow-2xs">
                                    <span className="w-5 h-5 mx-auto bg-purple-600 text-white rounded-full flex items-center justify-center text-[10px] font-bold mb-1">2</span>
                                    <strong className="text-purple-950 block text-[11px]">Data Master</strong>
                                    <span className="text-[10px] text-gray-500">Kelas & Guru</span>
                                </div>
                                <div className="bg-white p-2 rounded-lg border border-purple-200 shadow-2xs">
                                    <span className="w-5 h-5 mx-auto bg-purple-600 text-white rounded-full flex items-center justify-center text-[10px] font-bold mb-1">3</span>
                                    <strong className="text-purple-950 block text-[11px]">Multi-User</strong>
                                    <span className="text-[10px] text-gray-500">Kunci & Akun Staf</span>
                                </div>
                                <div className="bg-white p-2 rounded-lg border border-purple-200 shadow-2xs">
                                    <span className="w-5 h-5 mx-auto bg-purple-600 text-white rounded-full flex items-center justify-center text-[10px] font-bold mb-1">4</span>
                                    <strong className="text-purple-950 block text-[11px]">Pairing Cloud</strong>
                                    <span className="text-[10px] text-gray-500">Koneksi Perangkat</span>
                                </div>
                                <div className="bg-white p-2 rounded-lg border border-purple-200 shadow-2xs">
                                    <span className="w-5 h-5 mx-auto bg-purple-600 text-white rounded-full flex items-center justify-center text-[10px] font-bold mb-1">5</span>
                                    <strong className="text-purple-950 block text-[11px]">Operasional</strong>
                                    <span className="text-[10px] text-gray-500">SOP Input & Sync</span>
                                </div>
                            </div>
                        </div>

                        {/* Anjuran Penggunaan Multi-Admin */}
                        <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 text-xs text-amber-950 space-y-2.5">
                            <h5 className="font-bold flex items-center gap-2 text-amber-900 text-sm">
                                <i className="bi bi-shield-check text-amber-600 text-base"></i>
                                Mengapa Pesantren Wajib Mengaktifkan Sistem Multi-Admin?
                            </h5>
                            <p className="leading-relaxed text-gray-700">
                                Ketika pondok pesantren mulai mengaktifkan banyak modul secara bersamaan (seperti <strong>Data Santri</strong>, <strong>Absensi KBM &amp; Asrama</strong>, <strong>Mutaba'ah Tahfizh</strong>, <strong>Poskestren / Medis</strong>, dan <strong>Bimbingan Konseling</strong>), <strong>SANGAT DIANJURKAN</strong> mengaktifkan sistem Multi-Admin / Multi-User dan sinkronisasi. Pembagian akun mandiri untuk setiap penanggung jawab memberikan manfaat vital:
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                                <div className="bg-white p-2.5 rounded-lg border border-amber-200/80 shadow-2xs space-y-1">
                                    <strong className="text-amber-900 flex items-center gap-1.5 font-semibold text-[11px]">
                                        <i className="bi bi-diagram-2 text-amber-600"></i> Beban Input Terdistribusi
                                    </strong>
                                    <p className="text-[10px] text-gray-600 leading-relaxed">
                                        Mencegah antrean panjang dan beban menumpuk di satu komputer TU. Ustadz, musyrif, perawat klinik, dan konselor menginput langsung dari lokasi tugas masing-masing.
                                    </p>
                                </div>
                                <div className="bg-white p-2.5 rounded-lg border border-amber-200/80 shadow-2xs space-y-1">
                                    <strong className="text-amber-900 flex items-center gap-1.5 font-semibold text-[11px]">
                                        <i className="bi bi-shield-lock text-amber-600"></i> Kerahasiaan &amp; Privasi Terjaga
                                    </strong>
                                    <p className="text-[10px] text-gray-600 leading-relaxed">
                                        Data rekam medis santri dan catatan konseling BK bersifat rahasia dan terlindungi, hanya dapat diakses oleh petugas medis dan guru BK berwenang.
                                    </p>
                                </div>
                                <div className="bg-white p-2.5 rounded-lg border border-amber-200/80 shadow-2xs space-y-1">
                                    <strong className="text-amber-900 flex items-center gap-1.5 font-semibold text-[11px]">
                                        <i className="bi bi-lightning-charge text-amber-600"></i> Kecepatan &amp; Akurasi Data
                                    </strong>
                                    <p className="text-[10px] text-gray-600 leading-relaxed">
                                        Data kehadiran santri, mutaba'ah hafalan, dan perizinan selalu mutakhir setiap hari tanpa perlu menunggu rekapitulasi berkas manual di akhir pekan.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            },
            {
                title: 'Tahap 1: Konfigurasi Identitas & Data Master Lembaga',
                content: (
                    <div className="space-y-3 text-sm">
                        <p className="text-gray-700">
                            Sebelum membuka akses bagi staf pengajar dan pengasuh, Super Admin wajib mengonfigurasi identitas pondok dan fondasi data master lembaga:
                        </p>
                        <ol className="list-decimal pl-5 space-y-2 bg-gray-50 p-3.5 rounded-xl border border-gray-200 text-xs text-gray-700">
                            <li>
                                <strong>Identitas Yayasan &amp; Pesantren:</strong> Buka menu <strong>Pengaturan &gt; Umum</strong>. Lengkapi Nama Pesantren, Nama Yayasan, Alamat, Nomor Kontak/Telepon, Website, dan Pimpinan Pondok.
                            </li>
                            <li>
                                <strong>Unggah Logo Resmi:</strong> Unggah berkas logo pesantren di menu Pengaturan Umum. Logo ini otomatis dicantumkan di kop surat resmi, slip pembayaran SPP / kuitansi keuangan, kartu santri, dan sampul Buku Rapor.
                            </li>
                            <li>
                                <strong>Struktur Pendidikan (Marhalah &amp; Rombel):</strong> Buka menu <strong>Data Master &gt; Struktur Pendidikan</strong>.
                                <ul className="list-disc pl-4 mt-1 text-[11px] text-gray-600 space-y-0.5">
                                    <li>Isi <strong>Jenjang (Marhalah)</strong> terlebih dahulu (misal: Salafiyah Ula, Wustho, Ulya, MTs, MA).</li>
                                    <li>Isi <strong>Tingkat Kelas</strong> yang menginduk ke jenjang tersebut (Kelas 1, 2, 3 atau 7, 8, 9).</li>
                                    <li>Isi <strong>Rombel (Rombongan Belajar)</strong> sebagai unit kelas riil santri (misal: 7A, 7B, Ula-1) dan tentukan <strong>Wali Kelas</strong> yang bertugas.</li>
                                </ul>
                            </li>
                            <li>
                                <strong>Data Tenaga Pendidik &amp; Guru:</strong> Buka menu <strong>Data Master &gt; Tenaga Pendidik</strong>. Gunakan tombol <strong>"Tambah Banyak (Tabel)"</strong> untuk memasukkan daftar asatidz, NIP/NIY, jabatan, ketersediaan hari mengajar, dan kompetensi mata pelajaran secara massal.
                            </li>
                        </ol>
                        <div className="p-2.5 bg-blue-50 border-l-4 border-blue-500 rounded text-blue-900 text-xs flex items-center gap-2">
                            <i className="bi bi-info-circle-fill text-blue-600 shrink-0"></i>
                            <span>
                                <strong>Tips Efisiensi:</strong> Masukkan data guru selengkap mungkin di tahap ini, karena daftar guru akan langsung dikonversi menjadi akun login staf dengan sekali klik di langkah berikutnya.
                            </span>
                        </div>
                    </div>
                )
            },
            {
                title: 'Tahap 2: Aktivasi Mode Multi-User & Kunci Pemulihan Darurat',
                content: (
                    <div className="space-y-3 text-sm">
                        <p className="text-gray-700">
                            Secara default, instalasi baru berjalan dalam mode <em>Admin Tunggal (tanpa login)</em>. Untuk mengamankan sistem dan membagi wewenang petugas, aktifkan Mode Multi-User:
                        </p>

                        <div className="bg-indigo-50 p-3.5 rounded-xl border border-indigo-200 text-xs text-indigo-950 space-y-2">
                            <h6 className="font-bold flex items-center gap-1.5 text-indigo-900 text-xs">
                                <i className="bi bi-toggle-on text-indigo-600 text-sm"></i>
                                Cara Mengaktifkan Mode Multi-User
                            </h6>
                            <ol className="list-decimal pl-4 space-y-1 text-gray-700">
                                <li>Buka menu <strong>Pengaturan &gt; User &amp; Keamanan</strong> (atau <em>Pengaturan &gt; Akun</em>).</li>
                                <li>Nyalakan toggle <strong>"Aktifkan Mode Multi-User"</strong>.</li>
                                <li>Sistem otomatis membuatkan akun Super Admin default dengan username: <code>admin</code> dan password awal: <code>admin123</code>. Segera perbarui kata sandi admin ini.</li>
                            </ol>
                        </div>

                        {/* Emergency Recovery Key Box */}
                        <div className="bg-red-50 p-3.5 rounded-xl border border-red-200 text-xs text-red-950 space-y-2">
                            <div className="flex items-center justify-between">
                                <strong className="font-bold text-red-900 flex items-center gap-1.5 text-xs">
                                    <i className="bi bi-key-fill text-red-600"></i> KUNCI PEMULIHAN DARURAT (EMERGENCY RECOVERY KEY)
                                </strong>
                                <span className="px-2 py-0.5 rounded-full bg-red-200 text-red-900 text-[10px] font-black uppercase">Wajib Dicatat</span>
                            </div>
                            <p className="text-[11px] text-gray-700 leading-relaxed">
                                Saat pertama kali Mode Multi-User diaktifkan, sistem akan memunculkan jendela dialog berisi <strong>Kunci Pemulihan Darurat</strong> dengan format unik <code>ESANTRI-XXXX-XXXX-XXXX</code> (12 karakter alfanumerik).
                            </p>
                            <div className="p-2.5 bg-white rounded-lg border border-red-200 text-center font-mono font-bold text-red-700 tracking-wider text-xs shadow-2xs">
                                Contoh Format: ESANTRI-8K9P-M2W4-7TRX
                            </div>
                            <ul className="list-disc pl-4 text-[11px] text-gray-700 space-y-1">
                                <li><strong>SOP Penyimpanan:</strong> Pimpinan Pondok atau Kepala Yayasan wajib mencatat kunci ini di buku catatan fisik atau brankas terpisah dari perangkat komputer operasional.</li>
                                <li><strong>Cara Penggunaan:</strong> Jika seluruh kata sandi admin lupa dan staff kehilangan akses, buka halaman login &rarr; klik <em>"Lupa Password?"</em> &rarr; pilih <em>"Pakai Kunci Pemulihan Darurat"</em> &rarr; masukkan kode untuk langsung mereset password Super Admin tanpa merusak atau menghapus database santri.</li>
                            </ul>
                        </div>
                    </div>
                )
            },
            {
                title: 'Tahap 3: Manajemen Akun Staf & Penerapan Role Preset',
                content: (
                    <div className="space-y-3 text-sm">
                        <p className="text-gray-700">
                            Pondok pesantren tidak perlu membuat akun pengajar satu per satu secara manual. Gunakan fasilitas pembuatan akun massal terintegrasi:
                        </p>

                        <div className="bg-teal-50 p-3.5 rounded-xl border border-teal-200 text-xs text-teal-950 space-y-2">
                            <h6 className="font-bold flex items-center gap-1.5 text-teal-900 text-xs">
                                <i className="bi bi-people-fill text-teal-600 text-sm"></i>
                                Pembuatan Akun Massal: "Ambil dari Data Guru"
                            </h6>
                            <p className="text-gray-700">
                                Di menu <strong>Pengaturan &gt; Akun &amp; Pengguna</strong>, klik tombol <strong>"Ambil dari Data Guru"</strong>. Sistem membuka tabel konversi massal:
                            </p>
                            <ul className="list-disc pl-4 space-y-1 text-gray-700 text-[11px]">
                                <li><strong>Auto-Generate Username:</strong> Nama guru otomatis dibersihkan dari gelar akademik (misal: <em>Dr., S.Pd, Lc, M.Pd</em>) menjadi username standar tanpa spasi.</li>
                                <li><strong>Password Awal Default:</strong> Diatur seragam ke <code>123456</code> (dapat langsung disesuaikan di tabel sebelum disimpan).</li>
                                <li><strong>Pertanyaan Keamanan Otomatis:</strong> Diatur ke pertanyaan: <em>"Apa nama aplikasi ini?"</em> dengan jawaban: <code>esantri</code> untuk fasilitas lupa password mandiri.</li>
                            </ul>
                        </div>

                        {/* 7 Preset Role */}
                        <div className="space-y-2">
                            <h6 className="font-bold text-gray-800 text-xs">
                                7 Pilihan Template Wewenang (Role Presets) yang Tersedia di Sistem:
                            </h6>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                <div className="p-2.5 bg-white rounded-lg border border-gray-200 shadow-2xs space-y-1">
                                    <strong className="text-purple-900 flex items-center gap-1.5 font-semibold text-[11px]">
                                        <i className="bi bi-shield-shaded text-purple-600"></i> 1. Super Administrator
                                    </strong>
                                    <p className="text-[10px] text-gray-600">Akses penuh semua modul, konfigurasi yayasan, manajemen akun, audit log, dan izin Pusat Sinkronisasi.</p>
                                </div>
                                <div className="p-2.5 bg-white rounded-lg border border-gray-200 shadow-2xs space-y-1">
                                    <strong className="text-blue-900 flex items-center gap-1.5 font-semibold text-[11px]">
                                        <i className="bi bi-people-fill text-blue-600"></i> 2. Kesantrian / Pengasuhan
                                    </strong>
                                    <p className="text-[10px] text-gray-600">Akses tulis ke Data Santri, Absensi, Tahfizh, Asrama, Poskestren, Bimbingan Konseling, dan Buku Tamu.</p>
                                </div>
                                <div className="p-2.5 bg-white rounded-lg border border-gray-200 shadow-2xs space-y-1">
                                    <strong className="text-emerald-900 flex items-center gap-1.5 font-semibold text-[11px]">
                                        <i className="bi bi-cash-stack text-emerald-600"></i> 3. Bendahara / Keuangan
                                    </strong>
                                    <p className="text-[10px] text-gray-600">Akses tulis ke Pembayaran SPP/Tagihan, Buku Kas Pondok, dan Koperasi. Data santri berstatus hanya baca (read-only).</p>
                                </div>
                                <div className="p-2.5 bg-white rounded-lg border border-gray-200 shadow-2xs space-y-1">
                                    <strong className="text-indigo-900 flex items-center gap-1.5 font-semibold text-[11px]">
                                        <i className="bi bi-mortarboard-fill text-indigo-600"></i> 4. Tata Usaha / Akademik
                                    </strong>
                                    <p className="text-[10px] text-gray-600">Akses tulis ke Modul Akademik (Jadwal &amp; Nilai), Surat Menyurat, PSB/Pendaftaran, Kalender, dan Santri.</p>
                                </div>
                                <div className="p-2.5 bg-white rounded-lg border border-gray-200 shadow-2xs space-y-1">
                                    <strong className="text-amber-900 flex items-center gap-1.5 font-semibold text-[11px]">
                                        <i className="bi bi-building text-amber-600"></i> 5. Sarpras &amp; Aset
                                    </strong>
                                    <p className="text-[10px] text-gray-600">Akses tulis khusus ke modul Sarana Prasarana, Inventaris Gedung &amp; Kamar, serta Kalender Kegiatan.</p>
                                </div>
                                <div className="p-2.5 bg-white rounded-lg border border-gray-200 shadow-2xs space-y-1">
                                    <strong className="text-rose-900 flex items-center gap-1.5 font-semibold text-[11px]">
                                        <i className="bi bi-book text-rose-600"></i> 6. Perpustakaan
                                    </strong>
                                    <p className="text-[10px] text-gray-600">Akses tulis ke Sirkulasi Peminjaman Buku, Katalog Kitab/Pustaka, dan Pengembalian Santri.</p>
                                </div>
                                <div className="p-2.5 bg-white rounded-lg border border-teal-200 bg-teal-50/40 shadow-2xs space-y-1 sm:col-span-2">
                                    <strong className="text-teal-900 flex items-center gap-1.5 font-semibold text-[11px]">
                                        <i className="bi bi-person-check-fill text-teal-600"></i> 7. Wali Kelas / Guru Pengampu (Standar Pengajar)
                                    </strong>
                                    <p className="text-[10px] text-gray-600">Akses tulis Absensi KBM, Nilai Akademik, Mutaba'ah Tahfizh, dan Laporan Rapor. Modul kesehatan dan konseling hanya baca.</p>
                                </div>
                            </div>
                        </div>

                        <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-xs space-y-1.5">
                            <strong className="text-gray-900 flex items-center gap-1.5 font-semibold">
                                <i className="bi bi-sliders text-gray-700"></i> Kustomisasi Izin Modular &amp; Hak Akses Pusat Sinkronisasi:
                            </strong>
                            <p className="text-[11px] text-gray-600">
                                Klik tombol <strong>"Atur / Kustom"</strong> pada baris user untuk menyesuaikan izin per modul dengan 3 opsi: <code>Penuh (Tulis/Edit)</code>, <code>Hanya Lihat (Baca)</code>, atau <code>Diblokir (None)</code>.
                            </p>
                            <p className="text-[11px] text-amber-800">
                                <strong>Perhatian Hak Sync Admin:</strong> Kolom centang <em>"Akses Pusat Sinkronisasi"</em> menentukan apakah staf tersebut dapat membuka halaman penggabungan data (Hub Merge). Berikan izin ini hanya kepada Admin Pusat di kantor TU.
                            </p>
                        </div>
                    </div>
                )
            },
            {
                title: 'Tahap 4: Pilihan Arsitektur Sinkronisasi (Firebase vs Hub & Spoke)',
                content: (
                    <div className="space-y-3 text-sm">
                        <p className="text-gray-700">
                            eSantri Web dirancang fleksibel untuk segala kondisi koneksi pondok. Pilih salah satu dari dua arsitektur sinkronisasi berikut:
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="bg-teal-50/70 p-3.5 rounded-xl border border-teal-200 space-y-2">
                                <div className="flex items-center justify-between border-b border-teal-200/70 pb-1.5">
                                    <h6 className="font-bold text-teal-900 flex items-center gap-1.5 text-xs">
                                        <i className="bi bi-cloud-check-fill text-teal-600 text-sm"></i> Model A: Firebase Real-Time Cloud
                                    </h6>
                                    <span className="px-1.5 py-0.5 rounded text-[9px] bg-emerald-100 text-emerald-800 font-bold uppercase">Online Aktif</span>
                                </div>
                                <p className="text-xs text-gray-600 leading-relaxed">
                                    Menyinkronkan data seketika antar-laptop dan smartphone staf secara otomatis tanpa perlu kirim atau gabung file manual.
                                </p>
                                <div className="space-y-1 text-[11px] text-gray-700">
                                    <div className="flex items-start gap-1.5">
                                        <i className="bi bi-check2-circle text-teal-600 mt-0.5"></i>
                                        <span><strong>Kapan Dipilih:</strong> Pondok dengan koneksi WiFi stabil di kantor, kelas, asrama, dan poskestren.</span>
                                    </div>
                                    <div className="flex items-start gap-1.5">
                                        <i className="bi bi-check2-circle text-teal-600 mt-0.5"></i>
                                        <span><strong>Keunggulan:</strong> Live Dashboard pimpinan selalu terupdate detik itu juga, dan terhubung ke Portal Wali Santri.</span>
                                    </div>
                                    <div className="flex items-start gap-1.5">
                                        <i className="bi bi-check2-circle text-teal-600 mt-0.5"></i>
                                        <span><strong>Ketahanan Offline:</strong> Tetap bisa menginput saat WiFi putus sesaat; data otomatis terunggah saat sinyal pulih.</span>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-indigo-50/70 p-3.5 rounded-xl border border-indigo-200 space-y-2">
                                <div className="flex items-center justify-between border-b border-indigo-200/70 pb-1.5">
                                    <h6 className="font-bold text-indigo-900 flex items-center gap-1.5 text-xs">
                                        <i className="bi bi-diagram-3-fill text-indigo-600 text-sm"></i> Model B: Hub &amp; Spoke (Dropbox / WebDAV)
                                    </h6>
                                    <span className="px-1.5 py-0.5 rounded text-[9px] bg-indigo-100 text-indigo-800 font-bold uppercase">Hybrid / Offline</span>
                                </div>
                                <p className="text-xs text-gray-600 leading-relaxed">
                                    Pola 1 komputer kantor TU sebagai Pusat Induk (Hub) dan laptop/HP pengajar di asrama/kelas sebagai Cabang Penginput (Spoke).
                                </p>
                                <div className="space-y-1 text-[11px] text-gray-700">
                                    <div className="flex items-start gap-1.5">
                                        <i className="bi bi-check2-circle text-indigo-600 mt-0.5"></i>
                                        <span><strong>Kapan Dipilih:</strong> Sudut masjid/asrama halaqah atau klinik berada di titik yang minim atau tanpa sinyal WiFi kontinu.</span>
                                    </div>
                                    <div className="flex items-start gap-1.5">
                                        <i className="bi bi-check2-circle text-indigo-600 mt-0.5"></i>
                                        <span><strong>Keunggulan:</strong> 100% offline-first. Staf bebas mencatat seharian di laptop lokal tanpa kuota internet.</span>
                                    </div>
                                    <div className="flex items-start gap-1.5">
                                        <i className="bi bi-check2-circle text-indigo-600 mt-0.5"></i>
                                        <span><strong>Alur Kerja:</strong> Sore hari staf mengirimkan berkas perubahan ke folder Inbox cloud untuk digabungkan oleh Admin Pusat.</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            },
            {
                title: 'Tahap 5: Menghubungkan Perangkat Staf via Pairing Code 1-Klik',
                content: (
                    <div className="space-y-3 text-sm">
                        <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl text-teal-950 text-xs flex items-start gap-2.5">
                            <i className="bi bi-qr-code-scan text-teal-600 shrink-0 text-base mt-0.5"></i>
                            <div>
                                <strong className="font-bold text-teal-900 block mb-0.5">Kemudahan Pairing Code Tanpa Setup Rumit:</strong>
                                Anda <strong>TIDAK PERLU</strong> membuat akun Dropbox Developer atau memasukkan API Key/Secret manual di setiap laptop guru. Cukup buat satu koneksi di komputer Admin Utama, lalu bagikan <strong>Pairing Code</strong> terenkripsi kepada seluruh staf.
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                            <div className="p-3 bg-white rounded-lg border border-gray-200 shadow-2xs space-y-1.5">
                                <h6 className="font-bold text-gray-900 flex items-center gap-1.5 text-xs">
                                    <span className="w-5 h-5 bg-purple-600 text-white rounded-full flex items-center justify-center text-[10px]">A</span>
                                    Langkah di Komputer Admin Utama (Hub):
                                </h6>
                                <ol className="list-decimal pl-4 space-y-1 text-gray-600 text-[11px]">
                                    <li>Buka menu <strong>Pengaturan &gt; Cloud &amp; Sinkronisasi</strong>.</li>
                                    <li>Pastikan penyedia cloud (Dropbox, WebDAV, atau Firebase) sudah dalam status <strong>"Terhubung"</strong>.</li>
                                    <li>Klik tombol <strong>"Bagikan Akses ke Staff (Pairing Code)"</strong>.</li>
                                    <li>Sistem menyalin kode pairing panjang berformat <code>ESANTRI-CLOUD-...</code> ke clipboard.</li>
                                    <li>Kirimkan kode tersebut ke grup WhatsApp guru atau simpan di flashdisk kantor.</li>
                                </ol>
                            </div>

                            <div className="p-3 bg-white rounded-lg border border-gray-200 shadow-2xs space-y-1.5">
                                <h6 className="font-bold text-gray-900 flex items-center gap-1.5 text-xs">
                                    <span className="w-5 h-5 bg-teal-600 text-white rounded-full flex items-center justify-center text-[10px]">B</span>
                                    Langkah di Laptop / HP Staf Pengajar (Spoke):
                                </h6>
                                <ol className="list-decimal pl-4 space-y-1 text-gray-600 text-[11px]">
                                    <li>Buka eSantri Web di browser laptop staf.</li>
                                    <li>Buka menu <strong>Pengaturan &gt; Cloud &amp; Sinkronisasi</strong>.</li>
                                    <li>Tempel (Paste) kode pada kotak <strong>"Masukkan Pairing Code dari Admin"</strong>.</li>
                                    <li>Klik tombol <strong>"Hubungkan Perangkat"</strong>.</li>
                                    <li>Perangkat staf otomatis tersambung ke penyimpanan cloud pondok secara instan.</li>
                                </ol>
                            </div>
                        </div>

                        <p className="text-[11px] text-gray-500 italic">
                            *Untuk Firebase: Staf cukup memasukkan Pairing Code lalu login dengan akun Google masing-masing untuk bergabung ke tenant pesantren secara otomatis.
                        </p>
                    </div>
                )
            },
            {
                title: '⚡ SOP Operasional Model 1: Real-Time Cloud (Firebase)',
                content: (
                    <div className="space-y-3 text-sm">
                        <div className="bg-teal-50 p-3.5 rounded-lg border border-teal-200 text-xs text-teal-950 space-y-2">
                            <h5 className="font-bold flex items-center gap-1.5 text-teal-900">
                                <i className="bi bi-broadcast text-teal-600"></i> SOP Wajib Operasional Real-Time Live Sync
                            </h5>
                            <p className="text-gray-700">
                                Model <strong>Real-Time Cloud</strong> mengalirkan data seketika antar-perangkat petugas yang terhubung internet. Patuhi 4 aturan kerja berikut:
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="bg-white p-3 rounded-lg border border-teal-100 shadow-2xs space-y-1.5">
                                <h6 className="font-bold text-xs text-teal-900 flex items-center gap-1">
                                    <span className="w-5 h-5 bg-teal-600 text-white rounded-full inline-flex items-center justify-center text-[10px]">1</span>
                                    Login Mandiri Setiap Petugas
                                </h6>
                                <p className="text-[11px] text-gray-600 leading-relaxed">
                                    Setiap ustadz, musyrif, petugas medis, dan konselor login menggunakan akun masing-masing di laptop/HP pribadinya. Nama pencatat otomatis tersemat dalam riwayat aktivitas sistem untuk transparansi jejak kerja.
                                </p>
                            </div>

                            <div className="bg-white p-3 rounded-lg border border-teal-100 shadow-2xs space-y-1.5">
                                <h6 className="font-bold text-xs text-teal-900 flex items-center gap-1">
                                    <span className="w-5 h-5 bg-teal-600 text-white rounded-full inline-flex items-center justify-center text-[10px]">2</span>
                                    Sinkronisasi Otomatis Detik Itu Juga
                                </h6>
                                <p className="text-[11px] text-gray-600 leading-relaxed">
                                    Begitu tombol <em>"Simpan"</em> diklik pada modul apa pun (Absensi KBM, Setoran Tahfizh, Pasien Poskestren, BK), data langsung terunggah ke Cloud. Pimpinan pondok dapat memantau grafik dashboard secara langsung tanpa menunggu laporan akhir pekan.
                                </p>
                            </div>

                            <div className="bg-white p-3 rounded-lg border border-teal-100 shadow-2xs space-y-1.5">
                                <h6 className="font-bold text-xs text-teal-900 flex items-center gap-1">
                                    <span className="w-5 h-5 bg-teal-600 text-white rounded-full inline-flex items-center justify-center text-[10px]">3</span>
                                    Ketahanan Saat Internet Terputus (Offline-Resilience)
                                </h6>
                                <p className="text-[11px] text-gray-600 leading-relaxed">
                                    Bila koneksi WiFi pondok mendadak terputus, staf tetap dapat melanjutkan penginputan secara lancar. Sistem menyimpan data di penyimpanan lokal perangkat, dan otomatis mengirimkannya ke Cloud seketika koneksi pulih kembali.
                                </p>
                            </div>

                            <div className="bg-white p-3 rounded-lg border border-teal-100 shadow-2xs space-y-1.5">
                                <h6 className="font-bold text-xs text-teal-900 flex items-center gap-1">
                                    <span className="w-5 h-5 bg-teal-600 text-white rounded-full inline-flex items-center justify-center text-[10px]">4</span>
                                    Pembagian Partisi Kerja Tim
                                </h6>
                                <p className="text-[11px] text-gray-600 leading-relaxed">
                                    Meskipun sistem sinkron secara langsung, terapkan pembagian tugas yang jelas: Ustadz mengabsen rombel kelasnya sendiri, Muhaffizh menguji halaqahnya sendiri, dan Petugas Medis melayani pasien di kliniknya. Hindari dua orang mengedit baris data santri yang sama secara bersamaan.
                                </p>
                            </div>
                        </div>
                    </div>
                )
            },
            {
                title: '⚡ SOP Operasional Model 2: Hub & Spoke (Dropbox / WebDAV)',
                content: (
                    <div className="space-y-3 text-sm">
                        <div className="bg-indigo-50 p-3.5 rounded-lg border border-indigo-200 text-xs text-indigo-950 space-y-2">
                            <h5 className="font-bold flex items-center gap-1.5 text-indigo-900">
                                <i className="bi bi-arrow-repeat text-indigo-600"></i> SOP 4 Langkah Wajib Hub &amp; Spoke (Pencegah Data Tertimpa)
                            </h5>
                            <p className="text-gray-700">
                                Dalam model <strong>Hub &amp; Spoke</strong>, satu komputer bertindak sebagai <strong>Admin Pusat (Hub)</strong> dan perangkat staf/guru sebagai <strong>Cabang (Spoke)</strong>. Patuhi urutan 4 langkah wajib harian berikut:
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="bg-white p-3 rounded-lg border border-indigo-100 shadow-2xs space-y-1.5">
                                <h6 className="font-bold text-xs text-indigo-800 flex items-center gap-1">
                                    <span className="w-5 h-5 bg-indigo-600 text-white rounded-full inline-flex items-center justify-center text-[10px]">1</span>
                                    Staf / Guru Mengirim Data (Spoke Upload)
                                </h6>
                                <p className="text-[11px] text-gray-600">
                                    Setelah selesai mencatat setoran Tahfizh, Absensi, atau Rekam Medis di laptop masing-masing, staf mengeklik tombol <strong>"Kirim Perubahan ke Admin"</strong> di bar atas/menu Sinkronisasi. Berkas data terkompresi GZIP otomatis masuk ke folder cloud <code>inbox_staff</code>.
                                </p>
                            </div>

                            <div className="bg-white p-3 rounded-lg border border-indigo-100 shadow-2xs space-y-1.5">
                                <h6 className="font-bold text-xs text-indigo-800 flex items-center gap-1">
                                    <span className="w-5 h-5 bg-indigo-600 text-white rounded-full inline-flex items-center justify-center text-[10px]">2</span>
                                    Admin Pusat Menggabung Data (Hub Merge)
                                </h6>
                                <p className="text-[11px] text-gray-600">
                                    Admin Utama membuka menu <strong>Pusat Sinkronisasi &gt; Inbox Perubahan Staff</strong> &gt; Klik <strong>"Segarkan"</strong> &gt; Klik <strong>"Gabung"</strong> pada berkas kiriman staf. Sistem memadukan data baru secara cerdas berdasarkan perbandingan waktu modifikasi terakhir (<code>lastModified</code>).
                                </p>
                            </div>

                            <div className="bg-white p-3 rounded-lg border border-amber-200 bg-amber-50/50 shadow-2xs space-y-1.5">
                                <h6 className="font-bold text-xs text-amber-900 flex items-center gap-1">
                                    <span className="w-5 h-5 bg-amber-600 text-white rounded-full inline-flex items-center justify-center text-[10px]">3</span>
                                    Admin Publikasikan Master (WAJIB)
                                </h6>
                                <p className="text-[11px] text-gray-700 font-medium">
                                    Setelah seluruh berkas staf digabungkan, Admin Utama <strong>WAJIB menekan tombol "Publikasikan Master"</strong>. Tindakan ini memperbarui berkas database induk (<code>master_data.json</code>) di Cloud agar siap diambil oleh seluruh staf.
                                </p>
                            </div>

                            <div className="bg-white p-3 rounded-lg border border-teal-200 bg-teal-50/50 shadow-2xs space-y-1.5">
                                <h6 className="font-bold text-xs text-teal-900 flex items-center gap-1">
                                    <span className="w-5 h-5 bg-teal-600 text-white rounded-full inline-flex items-center justify-center text-[10px]">4</span>
                                    Staf Memperoleh Master Data Terbaru (Otomatis saat Login)
                                </h6>
                                <p className="text-[11px] text-gray-700">
                                    <strong>⚡ Otomatis Saat Login:</strong> Begitu staf memasukkan username &amp; password dan berhasil masuk, sistem <em>secara otomatis menarik master data terbaru</em> dari Cloud di latar belakang (dan memperbaruinya tiap 5 menit jika Auto-Sync aktif). Staf tidak diwajibkan menarik manual setiap pagi!
                                </p>
                                <p className="text-[11px] text-gray-500">
                                    <strong>Tombol Manual "Ambil Master Data" di Modal:</strong> Hanya digunakan sebagai penyegaran cadangan jika laptop baru terhubung internet di tengah hari atau ada instruksi pembaruan mendadak dari Admin TU tanpa perlu logout.
                                </p>
                            </div>
                        </div>

                        {/* Visual Conflict Resolution Box */}
                        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-900 space-y-1">
                            <strong className="flex items-center gap-1 font-bold"><i className="bi bi-exclamation-triangle-fill text-red-600"></i> Penanganan Bentrok Data (Visual Conflict Resolver):</strong>
                            <p className="text-[11px] text-gray-700 leading-relaxed">
                                Jika Admin dan Staf mengedit record data santri atau transaksi keuangan yang sama pada jam yang sama, jendela <strong>Resolusi Konflik</strong> akan otomatis muncul saat tombol Gabung diklik. Admin dapat membandingkan data secara berdampingan (*side-by-side*) dan memilih:
                            </p>
                            <ul className="list-disc pl-5 mt-1 space-y-0.5 text-gray-700 text-[11px]">
                                <li><strong>Gunakan Versi Lokal (Admin):</strong> Mempertahankan nilai yang tersimpan di komputer Hub.</li>
                                <li><strong>Gunakan Versi Staff:</strong> Mengganti nilai dengan perubahan yang diajukan oleh staf.</li>
                                <li><strong>Pilih Per Field (Mix &amp; Match):</strong> Memilih baris atribut tertentu (misal: alamat ambil dari versi staf, status SPP ambil dari versi admin).</li>
                            </ul>
                        </div>
                    </div>
                )
            },
            {
                title: 'Tahap 6: Pemeliharaan: Keamanan Sesi, Reset Password, Backup & AI',
                content: (
                    <div className="space-y-3 text-sm">
                        <p className="text-gray-700">
                            Panduan teknis bagi operator sistem untuk disiplin keamanan sesi akun, pemulihan akses staf, keamanan cadangan berkas, dan aktivasi kecerdasan buatan:
                        </p>

                        {/* SOP Sesi Akun & Lupa Logout */}
                        <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-xl space-y-2">
                            <h6 className="font-bold text-amber-950 flex items-center gap-1.5 text-xs">
                                <i className="bi bi-shield-lock-fill text-amber-700"></i> SOP Keamanan Sesi Akun: Aturan jika Akun Lupa Logout
                            </h6>
                            <p className="text-[11px] text-gray-700 leading-relaxed">
                                Sistem eSantri Web secara default mempertahankan sesi login agar guru tidak perlu berulang kali mengetik kata sandi saat membuka browser. Namun di lingkungan pesantren yang memakai komputer bersama, perhatikan aturan penting berikut:
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs pt-1">
                                <div className="p-2.5 bg-white rounded-lg border border-amber-200 shadow-2xs space-y-1">
                                    <strong className="text-amber-950 block font-semibold text-[11px]">
                                        <i className="bi bi-laptop text-teal-600"></i> 1. Laptop / HP Pribadi Guru
                                    </strong>
                                    <p className="text-[11px] text-gray-600">
                                        Boleh dibiarkan tetap login. Data otomatis diperbarui di latar belakang (tiap 5 menit di Hub &amp; Spoke, atau seketika di Firebase). Anda tidak perlu khawatir data usang.
                                    </p>
                                </div>
                                <div className="p-2.5 bg-white rounded-lg border border-amber-200 shadow-2xs space-y-1">
                                    <strong className="text-amber-950 block font-semibold text-[11px]">
                                        <i className="bi bi-display text-rose-600"></i> 2. Komputer Bersama (Kantor TU / UKS / Pos Jaga)
                                    </strong>
                                    <p className="text-[11px] text-gray-600">
                                        <strong>WAJIB LOGOUT setelah selesai tugas!</strong> Jika Anda lupa logout, input data guru berikutnya akan tercatat atas nama akun Anda (mencemari jejak audit/audit trail) dan data sensitif (rekam medis/BK) berisiko bocor.
                                    </p>
                                </div>
                            </div>
                            <div className="rounded-lg bg-white/90 p-2 border border-amber-100 text-[11px] text-gray-700 space-y-1">
                                <p>
                                    <strong>👉 Menemukan Komputer Masih Login Akun Rekan?</strong> Jangan langsung menginput data! Klik tombol <strong>Logout (Keluar)</strong> di pojok profil terlebih dahulu, lalu login menggunakan akun Anda sendiri.
                                </p>
                                <p>
                                    <strong>👉 Tindakan Darurat Admin (Force Logout):</strong> Jika staf kehilangan perangkat atau lupa logout di warung internet/tempat umum, Super Admin dapat membuka menu <em>Pengaturan &gt; Akun Pengguna &gt; Reset Password</em> staf tersebut. Sesi pada perangkat lama akan otomatis terputus saat sinkronisasi berikutnya.
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                            <div className="p-3 bg-white rounded-lg border border-indigo-200 shadow-2xs space-y-1.5">
                                <h6 className="font-bold text-indigo-900 flex items-center gap-1.5 text-xs">
                                    <i className="bi bi-person-lock text-indigo-600"></i> Prosedur Lupa &amp; Reset Password Staf
                                </h6>
                                <p className="text-[11px] text-gray-600">
                                    <strong>1. Mandiri:</strong> Staf klik <em>"Lupa Password?"</em> di layar login, lalu jawab Pertanyaan Keamanan.
                                </p>
                                <p className="text-[11px] text-gray-600">
                                    <strong>2. Oleh Admin:</strong> Admin mereset password di menu <em>Pengaturan &gt; Akun</em> &rarr; Klik <em>"Publikasikan Master"</em>. Di laptop staf, klik tombol <strong>"Update Data Akun dari Cloud"</strong> di layar login untuk menarik password baru tanpa perlu login dulu.
                                </p>
                            </div>

                            <div className="p-3 bg-white rounded-lg border border-teal-200 shadow-2xs space-y-1.5">
                                <h6 className="font-bold text-teal-900 flex items-center gap-1.5 text-xs">
                                    <i className="bi bi-file-earmark-arrow-down text-teal-600"></i> SOP Backup &amp; Restore JSON
                                </h6>
                                <p className="text-[11px] text-gray-600">
                                    Lakukan unduh berkas cadangan (<strong>Backup JSON</strong>) rutin setiap hari Sabtu/Ahad di menu <em>Pengaturan &gt; Backup &amp; Restore</em>.
                                </p>
                                <p className="text-[11px] text-gray-600">
                                    Saat restore dilakukan, sistem menampilkan <strong>Laporan Hasil Restore</strong> yang merinci jumlah tabel dan data yang berhasil dipulihkan.
                                </p>
                            </div>
                        </div>

                        {/* Konfigurasi AI */}
                        <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-xs space-y-1.5">
                            <h6 className="font-bold text-gray-900 flex items-center gap-1.5 text-xs">
                                <i className="bi bi-robot text-purple-600"></i> Konfigurasi Asisten Cerdas AI (BYOK OpenAI / Gemini)
                            </h6>
                            <p className="text-[11px] text-gray-600 leading-relaxed">
                                Fitur AI eSantri (Pembuat Draf Surat, Analisis Insight Dashboard, dan Generator Poster PSB) dapat menggunakan mode gratis (Pollinations) atau API Key Anda sendiri (BYOK: OpenAI, Google Gemini, OpenRouter) di menu <strong>Pengaturan &gt; Umum &gt; AI Assistant</strong>.
                            </p>
                            <p className="text-[11px] text-gray-500">
                                Pengaturan AI bersifat global lembaga; seluruh staf non-admin otomatis dapat menggunakan fitur AI sesuai wewenang modulnya tanpa perlu memasukkan kunci API di laptop masing-masing.
                            </p>
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
                            <strong>Data Master</strong> adalah pondasi operasional seluruh modul di eSantri Web (Santri, Absensi, Jadwal, Nilai, Rapor, Asrama, hingga Keuangan). 
                            Pastikan data master dikonfigurasi secara urut dan lengkap sebelum memulai aktivitas harian.
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-xs">
                            <div className="bg-white p-2.5 rounded border border-teal-100 shadow-2xs">
                                <span className="font-bold text-teal-800 flex items-center gap-1.5 mb-1"><i className="bi bi-diagram-3-fill text-teal-600"></i> 1. Struktur Pendidikan</span>
                                <p className="text-[11px] text-gray-600">Jenjang (Marhalah) &rarr; Tingkat Kelas &rarr; Rombel & Wali Kelas.</p>
                            </div>
                            <div className="bg-white p-2.5 rounded border border-teal-100 shadow-2xs">
                                <span className="font-bold text-teal-800 flex items-center gap-1.5 mb-1"><i className="bi bi-person-workspace text-teal-600"></i> 2. Tenaga Pendidik & Staf</span>
                                <p className="text-[11px] text-gray-600">Guru (asatidz) & staf kependidikan, kontak WA, & kompetensi mapel.</p>
                            </div>
                            <div className="bg-white p-2.5 rounded border border-teal-100 shadow-2xs">
                                <span className="font-bold text-teal-800 flex items-center gap-1.5 mb-1"><i className="bi bi-book-half text-teal-600"></i> 3. Mata Pelajaran</span>
                                <p className="text-[11px] text-gray-600">Passing Grade (KKM), multi-modul/kitab, & plotting pengampu.</p>
                            </div>
                            <div className="bg-white p-2.5 rounded border border-teal-100 shadow-2xs">
                                <span className="font-bold text-teal-800 flex items-center gap-1.5 mb-1"><i className="bi bi-calendar-event text-teal-600"></i> 4. Tahun Ajaran & Semester</span>
                                <p className="text-[11px] text-gray-600">Penetapan TA aktif & semester berjalan (Ganjil/Genap).</p>
                            </div>
                            <div className="bg-white p-2.5 rounded border border-teal-100 shadow-2xs sm:col-span-2 lg:col-span-2">
                                <span className="font-bold text-teal-800 flex items-center gap-1.5 mb-1"><i className="bi bi-buildings-fill text-teal-600"></i> 5. Fasilitas & Asrama</span>
                                <p className="text-[11px] text-gray-600">Gedung asrama putra/putri, kamar santri, daya tampung (kapasitas bed), serta pembina/musyrif kamar.</p>
                            </div>
                        </div>
                        <div className="bg-white/80 p-2.5 rounded border border-teal-200 text-xs text-teal-900 flex items-start gap-2">
                            <i className="bi bi-shield-check text-teal-700 text-base shrink-0 mt-0.5"></i>
                            <div>
                                <strong className="font-semibold block">Audit Integritas Data Master Otomatis</strong>
                                <p className="text-[11px] text-teal-800 mt-0.5">
                                    Sistem memindai potensi data yang belum lengkap secara otomatis: rombel tanpa wali kelas, mapel tanpa guru pengampu, jenjang tanpa kode NIS, pendidik tanpa kontak HP, dan kamar asrama yang melebihi kapasitas (overcapacity), lengkap dengan tombol pintas tindakan perbaikan.
                                </p>
                            </div>
                        </div>
                    </div>
                )
            },
            {
                title: '1. Struktur Pendidikan: Jenjang, Kelas, Rombel & Kuota Kapasitas',
                content: (
                    <div className="space-y-3 text-sm">
                        <p>Hierarki pendidikan diatur secara terstruktur bertingkat:</p>
                        <ol className="list-decimal pl-5 space-y-2 bg-gray-50 p-3 rounded-lg border text-xs text-gray-700">
                            <li>
                                <strong>Jenjang (Marhalah):</strong> Menentukan unit tingkatan utama lembaga (misal: <em>Salafiyah Ula, Wustho, Ulya, MTs, SMP, MA, SMK</em>). Wajib mengisi <strong>Kode Jenjang</strong> karena digunakan sebagai prefiks generator Nomor Induk Santri (NIS) otomatis.
                            </li>
                            <li>
                                <strong>Tingkat Kelas:</strong> Mengelompokkan tingkat kelas yang menginduk ke Jenjang tertentu (misal: <em>Kelas 1, 2, 3</em> atau <em>Kelas VII, VIII, IX</em>).
                            </li>
                            <li>
                                <strong>Rombel (Rombongan Belajar / Kelas Paralel):</strong> Unit kelas riil tempat santri belajar (misal: <em>Kelas 7A, 7B, Ula-1 Putra</em>). Di sini Anda menetapkan <strong>Wali Kelas</strong> serta <strong>Kapasitas Maksimal</strong> santri.
                            </li>
                        </ol>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                            <div className="bg-emerald-50 border border-emerald-200 p-2.5 rounded-lg text-emerald-900">
                                <strong className="flex items-center gap-1.5"><i className="bi bi-bar-chart-fill text-emerald-600"></i> Visualisasi Kapasitas Real-time</strong>
                                <p className="text-[11px] text-emerald-800 mt-1">Setiap kartu rombel menampilkan progress bar kapasitas: hijau (kuota aman), kuning (&gt;80% penuh), dan merah (penuh/melebihi kuota).</p>
                            </div>
                            <div className="bg-indigo-50 border border-indigo-200 p-2.5 rounded-lg text-indigo-900">
                                <strong className="flex items-center gap-1.5"><i className="bi bi-copy text-indigo-600"></i> Fitur Kloning Rombel</strong>
                                <p className="text-[11px] text-indigo-800 mt-1">Duplikasi rombel dengan 1 klik untuk mempercepat pembuatan rombel paralel baru dengan kapasitas dan setelan yang sama.</p>
                            </div>
                        </div>
                    </div>
                )
            },
            {
                title: '2. Tenaga Pendidik & Staf: Pendidik, Kependidikan, Kontak WA & Pengampu',
                content: (
                    <div className="space-y-3 text-sm">
                        <p>Kelola data asatidz/guru pengampu dan staf tenaga kependidikan secara terpadu:</p>
                        <ul className="list-disc pl-5 space-y-1.5 text-xs text-gray-700">
                            <li><strong>Kategori Pegawai:</strong> Pembedaan jelas antara <strong>Tenaga Pendidik (Guru/Asatidz)</strong> dan <strong>Tenaga Kependidikan (Staf TU, Kasir, Satpam, BK, Pengasuhan, dll)</strong>.</li>
                            <li><strong>Kontak WhatsApp Terhubung:</strong> Setiap baris pendidik dilengkapi tombol pintas WhatsApp untuk menghubungi guru atau staf secara langsung dengan satu klik.</li>
                            <li><strong>Kompetensi Mapel &amp; Sinkronisasi 2 Arah:</strong> Tentukan mata pelajaran yang diampu. Perubahan pengampu di menu <em>Kurikulum &gt; Plotting Pengampu</em> otomatis tersinkronisasi realtime ke Data Master guru ini, begitu pula sebaliknya.</li>
                            <li><strong>Jadwal & Ketersediaan Mengajar:</strong> Atur hari masuk dan jam pelajaran kesanggupan mengajar yang menjadi acuan anti-bentrok pada jadwal pelajaran otomatis.</li>
                            <li><strong>Pembuatan Akun Login Instan:</strong> Data guru/staf dapat langsung dijadikan akun pengguna aplikasi melalui menu <em>Pengaturan &gt; Akun &amp; Pengguna &gt; Ambil dari Data Guru</em>.</li>
                        </ul>
                    </div>
                )
            },
            {
                title: '3. Mata Pelajaran (Registri Awal vs Pusat Kurikulum)',
                content: (
                    <div className="space-y-2 text-sm">
                        <div className="bg-emerald-50 border-l-4 border-emerald-500 p-3 rounded-lg text-xs text-emerald-900 space-y-1.5">
                            <h5 className="font-bold flex items-center gap-1.5">
                                <i className="bi bi-arrow-repeat text-emerald-700"></i> Sinkronisasi Terpadu &amp; Rekomendasi Alur
                            </h5>
                            <p>
                                Data Mata Pelajaran di <strong>Data Master</strong> dan <strong>Kurikulum</strong> terhubung ke basis data yang sama secara otomatis. 
                                Anda <strong>TIDAK PERLU</strong> mengaturnya di dua tempat terpisah.
                            </p>
                            <p className="font-medium">
                                💡 <em>Saran Alur:</em> Tab Data Master ini dijadikan <strong>registri inventaris awal</strong> saat pertama kali mendaftarkan marhalah. 
                                Selanjutnya, seluruh operasional harian (KKM, alokasi jam/pekan, rumpun, silabus bab, kloning antar-jenjang, dan audit duplikasi) 
                                dipusatkan di menu <strong>Akademik &gt; Kurikulum &gt; Mata Pelajaran &amp; Silabus</strong>.
                            </p>
                        </div>
                        <p className="text-xs text-gray-700">Fitur pada registri Mata Pelajaran:</p>
                        <ol className="list-decimal pl-5 space-y-1.5 text-xs text-gray-700">
                            <li>Buka <strong>Data Master &gt; Mata Pelajaran</strong>, gunakan dropdown <strong>Menu Aksi</strong> untuk Tambah Manual atau Tambah Massal.</li>
                            <li>Tentukan <strong>Kode Mapel</strong>, <strong>Nama Mapel</strong>, <strong>Jenjang</strong>, dan <strong>KKM (Passing Grade)</strong>.</li>
                            <li><strong>Multi-Entri Modul/Kitab:</strong> Jika satu mapel menggunakan lebih dari 1 kitab/buku, ketikkan satu baris per item (atau gunakan tanda titik koma <code>;</code> pada mode Tambah Massal).</li>
                            <li><strong>Filter Status Pengampu:</strong> Filter cepat untuk memantau mapel mana saja yang sudah memiliki guru pengampu dan yang belum terpetakan.</li>
                        </ol>
                    </div>
                )
            },
            {
                title: '4. Tahun Ajaran & Semester Berjalan',
                content: (
                    <div className="space-y-3 text-sm">
                        <p>Mengatur periode kalender akademik pondok:</p>
                        <ul className="list-disc pl-5 space-y-1.5 text-xs text-gray-700">
                            <li><strong>Tahun Ajaran Aktif:</strong> Hanya 1 tahun ajaran aktif yang menjadi basis pencatatan santri baru, keuangan, dan arsip riwayat.</li>
                            <li><strong>Penetapan Semester Aktif (Ganjil / Genap):</strong> Tombol pemilihan semester aktif (Semester 1 / Ganjil atau Semester 2 / Genap) yang langsung mengontrol filter default nilai, pencatatan absensi harian, dan kalkulasi rapor tanpa perlu berpindah menu.</li>
                            <li><strong>Tampilan Adaptif Desktop & Mobile:</strong> Tabel lengkap di layar komputer dan kartu accordion yang ringkas di layar smartphone.</li>
                        </ul>
                    </div>
                )
            },
            {
                title: '5. Fasilitas & Asrama: Gedung, Kamar, Kapasitas & Okupansi',
                content: (
                    <div className="space-y-3 text-sm">
                        <p>Manajemen sarana keasramaan santri secara terpadu:</p>
                        <ul className="list-disc pl-5 space-y-1.5 text-xs text-gray-700">
                            <li><strong>Master Gedung Asrama:</strong> Mendaftarkan gedung asrama putra maupun putri, blok/lantai, serta penanggung jawab (Kepala Asrama).</li>
                            <li><strong>Master Kamar & Kapasitas Bed:</strong> Setiap kamar memiliki nama/nomor, daya tampung maksimal tempat tidur (kapasitas bed), serta penugasan Pembina/Musyrif kamar.</li>
                            <li><strong>Indikator Okupansi Real-time:</strong> Sistem menghitung otomatis jumlah santri aktif yang menempati kamar berdasarkan relasi data santri. Kamar dengan status <em>Tersedia</em>, <em>Penuh</em>, atau <em>Over-kapasitas</em> langsung terdeteksi pada kartu kamar dan audit integritas.</li>
                            <li><strong>Ekspor Rekap Fasilitas (.xlsx):</strong> Rekapitulasi gedung, daftar kamar, kapasitas, dan okupansi dapat diekspor langsung ke spreadsheet Excel.</li>
                        </ul>
                    </div>
                )
            },
            {
                title: '6. Navigasi Efisien: 1 Tombol Dropdown Terpadu (Menu Aksi)',
                content: (
                    <div className="space-y-3 text-sm">
                        <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg text-xs text-slate-800 space-y-2">
                            <h5 className="font-bold flex items-center gap-1.5 text-slate-900">
                                <i className="bi bi-grid-fill text-teal-600"></i> Standardisasi Tombol Aksi Bersih &amp; Rapi
                            </h5>
                            <p>
                                Untuk menjaga tata letak antarmuka tetap bersih, profesional, dan nyaman digunakan di desktop maupun smartphone, 
                                tiga tombol yang sebelumnya terpisah (<em>Tambah Manual</em>, <em>Tambah Massal</em>, dan <em>Ekspor</em>) kini disatukan ke dalam 
                                <strong>1 Tombol Dropdown: Menu Aksi</strong> di setiap tab Data Master:
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                                <div className="bg-white p-2.5 rounded border border-slate-200">
                                    <strong className="text-teal-700 block text-[11px] mb-1"><i className="bi bi-plus-circle-fill"></i> Tambah Manual</strong>
                                    <p className="text-[10px] text-gray-600">Membuka formulir modal untuk input 1 data baru secara detail dan terstruktur.</p>
                                </div>
                                <div className="bg-white p-2.5 rounded border border-slate-200">
                                    <strong className="text-indigo-700 block text-[11px] mb-1"><i className="bi bi-table"></i> Tambah Massal</strong>
                                    <p className="text-[10px] text-gray-600">Membuka spreadsheet editor cepat dengan navigasi keyboard dan dukungan copy-paste dari Excel.</p>
                                </div>
                                <div className="bg-white p-2.5 rounded border border-slate-200">
                                    <strong className="text-emerald-700 block text-[11px] mb-1"><i className="bi bi-file-earmark-excel-fill"></i> Ekspor Excel</strong>
                                    <p className="text-[10px] text-gray-600">Mengunduh seluruh baris data master aktif ke format dokumen spreadsheet (.xlsx) resmi.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            },
            {
                title: '7. SOP Standar Multi-Admin Data Master: Protokol Cloud Real-Time & Hub-and-Spoke',
                content: (
                    <div className="space-y-4 text-sm text-gray-700">
                        <div className="bg-teal-50 p-4 rounded-xl border border-teal-200 space-y-2 text-xs">
                            <h4 className="font-bold text-teal-950 flex items-center gap-2 text-sm">
                                <i className="bi bi-shield-lock-fill text-teal-600 text-base"></i>
                                Standar Operasional Prosedur (SOP) Tata Kelola Data Master Multi-Admin
                            </h4>
                            <p className="text-teal-900 leading-relaxed">
                                Data Master merupakan fondasi utama relasi database (Jenjang &rarr; Kelas &rarr; Rombel &rarr; Santri &rarr; Nilai &rarr; Tagihan &rarr; Kamar Asrama). 
                                Kesalahan penamaan atau penghapusan data secara sembarangan oleh salah satu admin dapat memicu data yatim (<em>orphan records</em>) di modul lain. 
                                Pesantren wajib mematuhi standar kerja multi-admin berikut sesuai model koneksi yang digunakan:
                            </p>
                        </div>

                        {/* Model A: Cloud Real-Time */}
                        <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-2">
                            <div className="flex items-center justify-between border-b border-emerald-200 pb-1.5">
                                <h5 className="font-bold text-emerald-900 flex items-center gap-1.5 text-xs">
                                    <span className="w-5 h-5 rounded-full bg-emerald-200 text-emerald-800 flex items-center justify-center text-[10px] font-black">A</span>
                                    Model A: Cloud Real-Time (Firebase Firestore Terpadu)
                                </h5>
                                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase">Online Aktif</span>
                            </div>
                            <p className="text-xs text-gray-600">
                                Berlaku saat pesantren menggunakan koneksi Firebase terpusat dan seluruh admin terhubung ke jaringan internet/WiFi pondok secara realtime.
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                <div className="p-2.5 bg-white rounded-lg border border-emerald-100 shadow-2xs space-y-1">
                                    <strong className="text-emerald-950 block font-semibold">
                                        <i className="bi bi-cloud-check text-emerald-600"></i> Distribusi Perubahan Instan (Auto-Broadcast)
                                    </strong>
                                    <p className="text-[11px] text-gray-600 leading-relaxed">
                                        Saat Admin Pusat menekan tombol <strong>Simpan Perubahan</strong>, dokumen <code>tenants/{'{tenantId}'}/settings/main</code> otomatis diperbarui dan disebarkan ke seluruh laptop staf dalam hitungan detik via Firestore realtime listener tanpa perlu refresh halaman.
                                    </p>
                                </div>
                                <div className="p-2.5 bg-white rounded-lg border border-emerald-100 shadow-2xs space-y-1">
                                    <strong className="text-emerald-950 block font-semibold">
                                        <i className="bi bi-person-lines-fill text-emerald-600"></i> Aturan Pembagian Peran Tab (Anti-Konflik)
                                    </strong>
                                    <p className="text-[11px] text-gray-600 leading-relaxed">
                                        Untuk mencegah bentrok edit bersamaan (<em>Last-Write-Wins</em>), bagi wewenang admin secara ketat: Admin Akademik mengelola Struktur & TA, Kurikulum mengelola Mapel & Jam Guru, Admin TU mengelola Biodata Guru/Staf, dan Pengasuhan mengelola Fasilitas Asrama.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Model B: Hub-and-Spoke */}
                        <div className="p-3.5 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-2">
                            <div className="flex items-center justify-between border-b border-indigo-200 pb-1.5">
                                <h5 className="font-bold text-indigo-900 flex items-center gap-1.5 text-xs">
                                    <span className="w-5 h-5 rounded-full bg-indigo-200 text-indigo-800 flex items-center justify-center text-[10px] font-black">B</span>
                                    Model B: Cloud Hub-and-Spoke (Offline-First / Mode Pengepul)
                                </h5>
                                <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-[10px] font-bold uppercase">Hybrid / Dropbox / WebDAV</span>
                            </div>
                            <p className="text-xs text-gray-600">
                                Digunakan saat laptop staf/tata usaha marhalah bekerja secara mandiri (offline) atau lokasi jaringan antar kantor cabang terpisah.
                            </p>
                            <div className="space-y-2 text-xs">
                                <div className="p-2.5 bg-white rounded-lg border border-indigo-100">
                                    <strong className="text-indigo-950 font-bold flex items-center gap-1.5">
                                        <i className="bi bi-hdd-network text-indigo-600"></i> 1. Komputer HUB (Kantor Sekretariat / Kepala TU Pusat):
                                    </strong>
                                    <p className="text-[11px] text-gray-600 mt-1">
                                        Menjadi <strong>Single Source of Truth</strong> untuk seluruh kode jenjang, nama kelas, rombel, tahun ajaran, dan data guru. Komputer HUB adalah satu-satunya pihak yang berwenang menambah, menghapus, atau merombak struktur. Setelah selesai, Admin HUB melakukan <strong>Publikasikan Master Data</strong> ke Cloud.
                                    </p>
                                </div>
                                <div className="p-2.5 bg-white rounded-lg border border-indigo-100">
                                    <strong className="text-indigo-950 font-bold flex items-center gap-1.5">
                                        <i className="bi bi-laptop text-indigo-600"></i> 2. Komputer SPOKE (Laptop TU Marhalah, Kasir, atau Wali Kelas):
                                    </strong>
                                    <p className="text-[11px] text-gray-600 mt-1">
                                        Spoke menarik master data dengan tombol <strong>Tarik Master Data</strong>. Sistem secara otomatis memproteksi pengaturan pairing, token, dan peran lokal Spoke sehingga kredensial koneksi tidak tertimpa oleh akun Hub.
                                    </p>
                                </div>
                                <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-950 space-y-1">
                                    <strong className="font-bold flex items-center gap-1.5">
                                        <i className="bi bi-arrow-repeat text-amber-700"></i> Siklus Wajib Sinkronisasi Hub & Spoke:
                                    </strong>
                                    <ol className="list-decimal pl-4 space-y-1 text-gray-700">
                                        <li><strong>Inisialisasi Awal Tahun:</strong> Komputer HUB menyelesaikan seluruh Data Master, lalu menerbitkan Master Data ke Cloud. Seluruh laptop Spoke melakukan <em>Tarik Master Data</em> sebelum menginput santri atau nilai.</li>
                                        <li><strong>Larangan Modifikasi Struktur di Spoke:</strong> Spoke DILARANG KERAS mengubah nama jenjang atau menghapus rombel secara sepihak agar ID relasi tetap sinkron dengan server pusat.</li>
                                        <li><strong>Unggah Transaksi Harian:</strong> Spoke mengunggah mutasi harian (data santri, absensi, tagihan) via tombol <em>Kirim Perubahan Staf</em>. Admin HUB memverifikasi dan menggabungkannya ke Master Data Utama.</li>
                                    </ol>
                                </div>
                            </div>
                        </div>

                        {/* Matriks Peran & RBAC Data Master */}
                        <div className="border border-gray-200 rounded-xl p-3 bg-white space-y-2 text-xs">
                            <strong className="text-gray-900 flex items-center gap-1.5 font-bold uppercase tracking-wider">
                                <i className="bi bi-people-fill text-teal-600"></i> Matriks Otoritas Pengelolaan Data Master (RBAC):
                            </strong>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse border border-gray-200 text-[11px]">
                                    <thead className="bg-gray-100 font-semibold text-gray-700">
                                        <tr>
                                            <th className="border border-gray-200 p-1.5">Peran / Jabatan</th>
                                            <th className="border border-gray-200 p-1.5">Kewenangan Data Master</th>
                                            <th className="border border-gray-200 p-1.5">Batasan Operasional</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 text-gray-600">
                                        <tr>
                                            <td className="border border-gray-200 p-1.5 font-semibold text-gray-900">Super Admin / Mudir</td>
                                            <td className="border border-gray-200 p-1.5">Membuat Jenjang, Tingkat Kelas, Rombel, Tahun Ajaran, Fasilitas Asrama, dan konversi akun staf.</td>
                                            <td className="border border-gray-200 p-1.5 text-emerald-700 font-medium">Kuasa Mutlak (Pusat HUB)</td>
                                        </tr>
                                        <tr>
                                            <td className="border border-gray-200 p-1.5 font-semibold text-gray-900">Tim Kurikulum / Akademik</td>
                                            <td className="border border-gray-200 p-1.5">Mengatur kompetensi mata pelajaran, KKM, kesanggupan mengajar hari/jam, dan silabus.</td>
                                            <td className="border border-gray-200 p-1.5 text-blue-700 font-medium">Khusus Mapel &amp; Guru</td>
                                        </tr>
                                        <tr>
                                            <td className="border border-gray-200 p-1.5 font-semibold text-gray-900">Bagian Kesantrian / Pengasuhan</td>
                                            <td className="border border-gray-200 p-1.5">Mengatur gedung asrama, kapasitas kamar, dan penugasan musyrif kamar santri.</td>
                                            <td className="border border-gray-200 p-1.5 text-indigo-700 font-medium">Khusus Asrama &amp; Kamar</td>
                                        </tr>
                                        <tr>
                                            <td className="border border-gray-200 p-1.5 font-semibold text-gray-900">Petugas Tata Usaha (TU)</td>
                                            <td className="border border-gray-200 p-1.5">Mengisi biodata asatidz, NIP/NIY, kontak nomor HP/WA, dan riwayat jabatan kepegawaian.</td>
                                            <td className="border border-gray-200 p-1.5 text-amber-700 font-medium">Biodata &amp; Kepegawaian</td>
                                        </tr>
                                        <tr>
                                            <td className="border border-gray-200 p-1.5 font-semibold text-gray-900">Wali Kelas &amp; Dewan Guru</td>
                                            <td className="border border-gray-200 p-1.5">Melihat daftar rombel, jadwal, dan profil penugasan.</td>
                                            <td className="border border-gray-200 p-1.5 text-gray-500">Read-Only (Hanya Lihat)</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Checklist Pra-KBM */}
                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl space-y-1.5 text-xs text-blue-950">
                            <strong className="flex items-center gap-1.5 font-bold text-blue-900">
                                <i className="bi bi-card-checklist text-blue-600"></i> Checklist Audit Integritas Data Master Sebelum Memulai KBM:
                            </strong>
                            <ul className="list-disc pl-5 space-y-1 text-[11px] text-gray-700">
                                <li>Pastikan seluruh <strong>Jenjang (Marhalah)</strong> telah memiliki <em>Kode Jenjang</em> untuk penomoran NIS otomatis.</li>
                                <li>Pastikan setiap <strong>Rombel</strong> telah memiliki <em>Wali Kelas</em> definitif dan kuota kapasitas terisi.</li>
                                <li>Pastikan seluruh <strong>Mata Pelajaran</strong> telah terisi KKM dan guru pengampu kompeten.</li>
                                <li>Pastikan <strong>Tahun Ajaran Aktif</strong> dan <strong>Semester Berjalan</strong> (Ganjil/Genap) sudah ditetapkan.</li>
                                <li>Pastikan seluruh <strong>Kamar Asrama</strong> tidak berstatus <em>Over-kapasitas</em> dan musyrif kamar telah diplot.</li>
                                <li>Lakukan <strong>Ekspor Excel (.xlsx)</strong> di setiap tab sebagai salinan cadangan arsip fisik lembaga.</li>
                            </ul>
                        </div>

                        {/* Pencegahan Kerusakan Relasi Data */}
                        <div className="p-3 bg-red-50 border border-red-200 rounded-xl space-y-1 text-xs text-red-950">
                            <strong className="flex items-center gap-1.5 font-bold text-red-900">
                                <i className="bi bi-exclamation-octagon-fill text-red-600"></i> Aturan Ketat Pencegahan Kerusakan Relasi (Foreign Key Safety):
                            </strong>
                            <p className="text-[11px] text-gray-700 leading-relaxed">
                                Dilarang menghapus Rombel, Jenjang, atau Kamar yang masih memiliki santri aktif atau catatan nilai historis. Jika rombel/kamar sudah tidak digunakan pada semester baru, biarkan tanpa santri atau lakukan mutasi santri terlebih dahulu, jangan dihapus sembarangan agar buku rapor dan riwayat transaksi alumni tetap dapat diakses dengan sempurna.
                            </p>
                        </div>
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
        badge: 6,
        badgeColor: 'teal',
        title: 'Manajemen Santri',
        steps: [
            {
                title: 'SOP Kerja Multi-Admin: Real-Time Sync vs Hub-and-Spoke',
                content: (
                    <div className="space-y-3 text-sm">
                        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-950 text-xs flex items-start gap-2.5">
                            <i className="bi bi-exclamation-triangle-fill text-amber-600 shrink-0 text-base mt-0.5"></i>
                            <div>
                                <strong className="font-bold text-amber-900 block mb-0.5">Pentingnya Tata Kelola Multi-Admin Pendataan Santri:</strong>
                                Data santri adalah basis primer seluruh sistem (digunakan oleh Absensi, Tahfizh, Kesehatan, BK, Rapor, hingga Tagihan). Penerimaan Santri Baru (PSB), pembagian kelas, mutasi, dan verifikasi berkas keluarga memerlukan pembagian kerja multi-admin yang disiplin agar tidak terjadi duplikasi NIS atau NIK santri.
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
                                Sangat ideal bila panitia PSB dan staf tata usaha terhubung jaringan WiFi kantor atau internet stabil.
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-xs">
                                <div className="p-2.5 bg-white rounded-lg border border-teal-100 shadow-2xs">
                                    <strong className="text-teal-950 block mb-1 font-semibold">
                                        <i className="bi bi-person-badge text-teal-600"></i> Akun Khusus Panitia &amp; TU
                                    </strong>
                                    <p className="text-[11px] text-gray-600">
                                        Admin membatasi hak akses ubah data induk hanya untuk staf administrasi kesiswaan/TU. Asatidz dan musyrif cukup memiliki hak baca (read-only) untuk keperluan absensi.
                                    </p>
                                </div>
                                <div className="p-2.5 bg-white rounded-lg border border-teal-100 shadow-2xs">
                                    <strong className="text-teal-950 block mb-1 font-semibold">
                                        <i className="bi bi-broadcast text-teal-600"></i> Pembaruan Seketika Lintas Modul
                                    </strong>
                                    <p className="text-[11px] text-gray-600">
                                        Saat panitia menambah santri baru atau mengubah rombel kelas, perubahan otomatis langsung terdistribusi ke tablet ustadz di kelas, poskestren, dan halaqah tahfizh.
                                    </p>
                                </div>
                                <div className="p-2.5 bg-white rounded-lg border border-teal-100 shadow-2xs">
                                    <strong className="text-teal-950 block mb-1 font-semibold">
                                        <i className="bi bi-diagram-3 text-teal-600"></i> Partisi Kerja Input Santri
                                    </strong>
                                    <p className="text-[11px] text-gray-600">
                                        Saat input massal santri baru, bagi tugas tim per jenjang/marhalah (misal: Admin 1 menginput MTs, Admin 2 menginput MA) untuk menghindari penginputan ganda.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Model B */}
                        <div className="p-3.5 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-2">
                            <div className="flex items-center justify-between border-b border-indigo-200/70 pb-1.5">
                                <h5 className="font-bold text-indigo-900 flex items-center gap-1.5 text-xs">
                                    <span className="w-5 h-5 rounded-full bg-indigo-200 text-indigo-800 flex items-center justify-center text-[10px] font-black">2</span>
                                    Model B: Hub-and-Spoke (Offline-First / Dropbox / File Cadangan)
                                </h5>
                                <span className="ml-auto px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-[10px] font-bold uppercase">Hybrid / Offline</span>
                            </div>
                            <p className="text-xs text-gray-600">
                                Solusi terbaik jika meja registrasi pendaftaran santri baru berada di tenda lapangan yang belum terjangkau koneksi internet kontinu.
                            </p>
                            <div className="space-y-2 pt-1 text-xs">
                                <div className="p-2 bg-white rounded-lg border border-indigo-100">
                                    <strong className="text-indigo-950">A. Peran HUB (Pusat Master Santri di Kantor TU):</strong>
                                    <p className="text-[11px] text-gray-600 mt-0.5">
                                        Komputer utama kantor TU memegang otoritas tertinggi nomor induk (NIS), penetapan rombel kelas, dan arsip data keluarga santri.
                                    </p>
                                </div>
                                <div className="p-2 bg-white rounded-lg border border-indigo-100">
                                    <strong className="text-indigo-950">B. Peran SPOKE (Laptop Petugas Registrasi / Lapangan):</strong>
                                    <p className="text-[11px] text-gray-600 mt-0.5">
                                        Panitia pendaftaran menginput formulir biodata santri baru menggunakan formulir atau tabel bulk editor tanpa memerlukan koneksi internet.
                                    </p>
                                </div>
                                <div className="p-2 bg-white rounded-lg border border-indigo-100">
                                    <strong className="text-indigo-950">C. Alur Penggabungan (Merging) Data Santri:</strong>
                                    <div className="mt-1.5 p-2 bg-teal-50/80 border border-teal-200 rounded text-[11px] text-teal-950">
                                        <strong>⚡ Otomatis Saat Login (Auto-Pull):</strong> Begitu panitia PSB/staf login di pagi hari, sistem <em>secara otomatis menarik master data terbaru</em> dari Cloud di latar belakang. Anda tidak perlu menarik manual setiap saat. Gunakan tombol modal <em>"Ambil Master Data"</em> hanya jika laptop Anda baru tersambung internet di tengah hari atau ada pengumuman pembaruan mendadak dari Kantor TU.
                                    </div>
                                    <ol className="list-decimal pl-4 mt-2 space-y-1 text-[11px] text-gray-600">
                                        <li>Petugas menginput berkas pendaftaran santri baru secara mandiri di posko registrasi (offline).</li>
                                        <li>Setelah sesi pendaftaran selesai atau saat laptop terhubung WiFi, petugas mengeklik <strong>"Kirim Perubahan (Upload Staff Changes)"</strong> di menu Sinkronisasi.</li>
                                        <li>Admin Utama di Kantor TU membuka menu Sinkronisasi dan mengeklik <strong>"Gabungkan Perubahan Staff (Merge Changes)"</strong>. Sistem menyatukan data santri baru secara cerdas dan aman.</li>
                                        <li>Admin Pusat mengeklik <strong>"Terbitkan Master Data (Publish Master)"</strong> agar seluruh perangkat staf pondok lainnya memperoleh daftar santri terbaru.</li>
                                    </ol>
                                </div>
                            </div>
                        </div>

                        {/* SOP Sesi & Audit Trail Santri */}
                        <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-xs space-y-1.5">
                            <strong className="text-amber-950 flex items-center gap-1.5 font-bold">
                                <i className="bi bi-shield-lock-fill text-amber-700"></i> SOP Keamanan Sesi Akun &amp; Disiplin Logout Panitia:
                            </strong>
                            <p className="text-[11px] text-gray-700 leading-relaxed">
                                Formulir santri mencakup data kependudukan sensitif (NIK, NISN, nomor HP wali, dan dokumen keluarga). Pada meja pendaftaran yang digunakan bergantian, <strong>petugas WAJIB mengeklik "Logout (Keluar)"</strong> saat pergantian shift. Setiap santri yang ditambahkan akan merekam akun petugas aktif sebagai pembuat data (*audit trail*). Jika menemukan laptop masih terbuka dengan akun panitia lain, klik Logout terlebih dahulu lalu login dengan akun Anda sendiri.
                            </p>
                        </div>
                    </div>
                )
            },
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
                title: 'Opsi Kustomisasi Data Strategis Sisi Depan (Fleksibilitas Penuh)',
                content: (
                    <div className="space-y-2 text-sm">
                        <p>Menu Laporan Kartu Santri menyediakan kustomisasi data yang sangat fleksibel untuk kebutuhan resmi maupun internal:</p>
                        <ul className="list-disc pl-5 space-y-1 bg-gray-50 p-2.5 rounded-xl border border-gray-200 text-xs text-gray-700">
                            <li><strong>Pemisahan Jenjang &amp; Kelas:</strong> Anda dapat menampilkan Jenjang (misal: MTs/MA) dan Kelas (misal: VII/A) secara terpisah atau digabung sesuai format yang diinginkan.</li>
                            <li><strong>Identitas Kependudukan &amp; Akademik:</strong> Pilihan menampilkan NIS, NISN (Kemdikbud), NIK (Dukcapil), dan Nama Hijrah / Kunyah santri.</li>
                            <li><strong>Informasi Keasramaan:</strong> Menampilkan Gedung Asrama &amp; Kamar tempat santri bermukim.</li>
                            <li><strong>Data Kesehatan &amp; Pribadi:</strong> Pilihan memunculkan Tempat Tanggal Lahir (TTL), Golongan Darah, dan Status Santri (Mukim / Non-Mukim).</li>
                            <li><strong>Kontak &amp; Wali:</strong> Menampilkan nama Orang Tua / Wali beserta nomor kontak darurat / HP wali santri.</li>
                            <li><strong>Tahun Masuk &amp; Angkatan:</strong> Menampilkan tahun angkatan santri secara otomatis dari data tanggal masuk.</li>
                            <li><strong>Smart Font Scaling:</strong> Semua data diproteksi dengan algoritma penskalaan ukuran teks otomatis sehingga tidak bertumpuk atau terpotong pada semua 5 variasi desain kartu (Klasik, Modern, ID Card Vertikal, Dark Premium, Ceria).</li>
                            <li><strong>Masa Berlaku (Valid Until):</strong> Kartu dapat diset mencetak label "Berlaku Selama Menjadi Santri", atau hingga masa kelulusan (otomatis dihitung).</li>
                        </ul>
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
        id: 'kesehatan',
        badge: 6,
        badgeColor: 'red',
        title: "Poskestren & Kesehatan Santri",
        steps: [
            {
                title: 'SOP Kerja Multi-Admin: Real-Time Sync vs Hub-and-Spoke',
                content: (
                    <div className="space-y-3 text-sm">
                        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-950 text-xs flex items-start gap-2.5">
                            <i className="bi bi-exclamation-triangle-fill text-amber-600 shrink-0 text-base mt-0.5"></i>
                            <div>
                                <strong className="font-bold text-amber-900 block mb-0.5">Pentingnya Tata Kelola Multi-Admin di Poskestren:</strong>
                                Jangan biarkan Admin Kantor TU menginput seluruh data kesehatan sendirian. Poskestren beroperasi optimal saat didelegasikan langsung ke Petugas Medis / UKS di klinik pondok. Sistem mendukung 2 arsitektur sinkronisasi: <strong>Real-Time Cloud (Firebase)</strong> dan <strong>Hub-and-Spoke (Offline / Dropbox / File Cadangan)</strong>. Ikuti SOP di bawah ini agar pencatatan medis dan mutasi stok obat akurat tanpa tumpang tindih.
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
                                Sangat ideal bila ruang klinik/Poskestren terjangkau jaringan WiFi pondok atau internet stabil.
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-xs">
                                <div className="p-2.5 bg-white rounded-lg border border-teal-100 shadow-2xs">
                                    <strong className="text-teal-950 block mb-1 font-semibold">
                                        <i className="bi bi-person-badge text-teal-600"></i> Akun Khusus Petugas Medis
                                    </strong>
                                    <p className="text-[11px] text-gray-600">
                                        Admin membuat akun khusus dengan izin akses dibatasi hanya ke modul <strong>Kesehatan</strong>. Data keuangan, tagihan, dan catatan BK santri tetap terlindungi secara privat.
                                    </p>
                                </div>
                                <div className="p-2.5 bg-white rounded-lg border border-teal-100 shadow-2xs">
                                    <strong className="text-teal-950 block mb-1 font-semibold">
                                        <i className="bi bi-broadcast text-teal-600"></i> Sinkronisasi Instan Antar-Device
                                    </strong>
                                    <p className="text-[11px] text-gray-600">
                                        Saat petugas menyimpan pemeriksaan atau meresepkan obat di laptop klinik, data langsung masuk ke cloud. Admin pusat dan pengasuh dapat memantau santri yang sakit secara langsung.
                                    </p>
                                </div>
                                <div className="p-2.5 bg-white rounded-lg border border-teal-100 shadow-2xs">
                                    <strong className="text-teal-950 block mb-1 font-semibold">
                                        <i className="bi bi-link-45deg text-teal-600"></i> Auto-Link Absensi &amp; Portal Wali
                                    </strong>
                                    <p className="text-[11px] text-gray-600">
                                        Status Rawat Inap atau Rujuk RS otomatis menandai presensi <strong>Sakit (S)</strong> pada absensi KBM hari itu dan status terkini terhubung ke Portal Wali Santri.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Model B */}
                        <div className="p-3.5 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-2">
                            <div className="flex items-center justify-between border-b border-indigo-200/70 pb-1.5">
                                <h5 className="font-bold text-indigo-900 flex items-center gap-1.5 text-xs">
                                    <span className="w-5 h-5 rounded-full bg-indigo-200 text-indigo-800 flex items-center justify-center text-[10px] font-black">2</span>
                                    Model B: Hub-and-Spoke (Offline-First / Dropbox / File Cadangan)
                                </h5>
                                <span className="ml-auto px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-[10px] font-bold uppercase">Hybrid / Offline</span>
                            </div>
                            <p className="text-xs text-gray-600">
                                Solusi terbaik jika gedung Poskestren/UKS berada di sudut asrama yang belum terjangkau koneksi internet kontinu.
                            </p>
                            <div className="space-y-2 pt-1 text-xs">
                                <div className="p-2 bg-white rounded-lg border border-indigo-100">
                                    <strong className="text-indigo-950">A. Peran HUB (Pusat Data Induk di Kantor Tata Usaha):</strong>
                                    <p className="text-[11px] text-gray-600 mt-0.5">
                                        Memegang basis data master lengkap (seluruh santri, master obat, stok induk, dan riwayat rekam medis).
                                    </p>
                                </div>
                                <div className="p-2 bg-white rounded-lg border border-indigo-100">
                                    <strong className="text-indigo-950">B. Peran SPOKE (Laptop Petugas di Ruang Poskestren):</strong>
                                    <p className="text-[11px] text-gray-600 mt-0.5">
                                        Petugas klinik membuka aplikasi dan melayani santri sakit tanpa memerlukan koneksi internet (semua tersimpan aman di penyimpanan laptop lokal).
                                    </p>
                                </div>
                                <div className="p-2 bg-white rounded-lg border border-indigo-100">
                                    <strong className="text-indigo-950">C. Alur Penggabungan (Merging) Harian Poskestren:</strong>
                                    <div className="mt-1.5 p-2 bg-teal-50/80 border border-teal-200 rounded text-[11px] text-teal-950">
                                        <strong>⚡ Otomatis Saat Login (Auto-Pull):</strong> Begitu petugas medis login saat mulai jam dinas, sistem <em>secara otomatis menarik master santri dan stok obat terbaru</em> dari Cloud di latar belakang. Tidak perlu tarik manual setiap pagi! Tombol <em>"Ambil Master Data"</em> di modal hanya sebagai cadangan jika koneksi baru terhubung atau ada penambahan stok obat mendadak di gudang pusat.
                                    </div>
                                    <ol className="list-decimal pl-4 mt-2 space-y-1 text-[11px] text-gray-600">
                                        <li>Petugas mencatat pemeriksaan dan resep obat santri sepanjang jam jaga secara offline di klinik.</li>
                                        <li>Saat pergantian shift atau saat laptop terhubung WiFi/tethering, petugas membuka menu Sinkronisasi lalu klik <strong>"Kirim Perubahan (Upload Staff Changes)"</strong>.</li>
                                        <li>Admin Utama di Kantor TU membuka menu Sinkronisasi dan mengeklik <strong>"Gabungkan Perubahan Staff (Merge Changes)"</strong>. Sistem membandingkan waktu perubahan terakhir sehingga rekam medis baru masuk dan stok obat terpotong aman tanpa menimpa data modul lain.</li>
                                        <li>Admin Pusat mengeklik <strong>"Terbitkan Master Data (Publish Master)"</strong> agar seluruh perangkat staf lainnya memperoleh data stok dan kesehatan termutakhir.</li>
                                    </ol>
                                </div>
                            </div>
                        </div>

                        {/* SOP Sesi & Kerahasiaan Medis */}
                        <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-xs space-y-1.5">
                            <strong className="text-amber-950 flex items-center gap-1.5 font-bold">
                                <i className="bi bi-shield-lock-fill text-amber-700"></i> SOP Keamanan Sesi Akun &amp; Kerahasiaan Rekam Medis Santri:
                            </strong>
                            <p className="text-[11px] text-gray-700 leading-relaxed">
                                Rekam medis santri, riwayat penyakit menular, dan riwayat alergi obat bersifat rahasia medis. Komputer ruang UKS/Poskestren yang sering ditinggal piket <strong>WAJIB DI-LOGOUT</strong> begitu petugas selesai jam dinas. Jangan membiarkan akun medis terbuka di meja klinik karena santri atau orang lain dapat melihat riwayat penyakit santri lain. Jika menemukan komputer UKS masih login akun shift sebelumnya, klik Logout terlebih dahulu lalu masuk dengan akun Anda sendiri agar resep obat tercatat atas penanggung jawab yang tepat (*audit trail*).
                            </p>
                        </div>
                    </div>
                )
            },
            {
                title: '1. Pengelolaan Stok Obat, Batas Minimum & Peringatan Kadaluarsa',
                content: (
                    <div className="space-y-3 text-sm">
                        <p>
                            Modul inventori obat di Poskestren memastikan ketersediaan pertolongan pertama santri terpantau akurat secara real-time:
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="bg-white p-3 rounded-lg border border-red-100 shadow-2xs space-y-1.5">
                                <h6 className="font-bold text-xs text-red-800 flex items-center gap-1.5">
                                    <i className="bi bi-capsule text-red-600"></i> Input & Kategori Obat
                                </h6>
                                <p className="text-[11px] text-gray-600">
                                    Buka menu <strong>Kesehatan &gt; Stok Obat</strong> &gt; Klik <strong>"Tambah Obat"</strong>. Masukkan nama obat, jenis (Tablet, Sirup, Kapsul, Salep, dll), stok awal, satuan (strip/botol/pcs), ambang batas <em>Stok Minimum</em> (default 5), serta <em>Tanggal Kadaluarsa (Expired Date)</em>.
                                </p>
                            </div>
                            <div className="bg-white p-3 rounded-lg border border-amber-100 shadow-2xs space-y-1.5">
                                <h6 className="font-bold text-xs text-amber-800 flex items-center gap-1.5">
                                    <i className="bi bi-exclamation-triangle-fill text-amber-600"></i> Deteksi Kritis & Kadaluarsa
                                </h6>
                                <p className="text-[11px] text-gray-600">
                                    Gunakan tab filter cepat <strong>"Stok Kritis"</strong> untuk memantau obat yang hampir habis, dan <strong>"Kadaluarsa"</strong> untuk mengamankan obat yang telah lewat tanggal berlakunya. Sistem juga memotong stok otomatis saat obat diresepkan.
                                </p>
                            </div>
                        </div>
                    </div>
                )
            },
            {
                title: '2. Alur Pemeriksaan Medis, Tanda Vital & Resep Obat',
                content: (
                    <div className="space-y-3 text-sm">
                        <div className="bg-blue-50 p-3 rounded-lg border border-blue-200 text-xs text-blue-900 space-y-1.5">
                            <h6 className="font-bold flex items-center gap-1.5 text-blue-900">
                                <i className="bi bi-heart-pulse text-blue-600"></i> Rekam Medis Standar Klinis Poskestren
                            </h6>
                            <p className="text-gray-700">
                                Saat santri datang memeriksakan diri ke klinik, petugas mengklik <strong>"Pemeriksaan Baru"</strong> lalu mengisi:
                            </p>
                        </div>
                        <ul className="list-disc pl-5 space-y-1.5 text-xs text-gray-700">
                            <li><strong>Identitas Santri:</strong> Pilih nama santri (sistem otomatis menampilkan NIS, kamar, dan kelas).</li>
                            <li><strong>Tanda Vital (Vital Signs):</strong> Input <em>Suhu Tubuh (°C)</em> (otomatis mendeteksi demam), <em>Tensi Darah (mmHg)</em>, dan <em>Berat Badan (kg)</em>.</li>
                            <li><strong>Anamnesa & Diagnosa:</strong> Catat keluhan utama santri dan tentukan diagnosa penyakit.</li>
                            <li><strong>Tindakan & Resep Obat:</strong> Berikan tindakan medis serta tambahkan obat dari inventori Poskestren lengkap dengan dosis (misal: <em>3x1 sesudah makan</em>). Stok obat berkurang otomatis saat rekam medis disimpan.</li>
                            <li><strong>Status Penanganan:</strong> Pilih antara <em>Rawat Jalan</em>, <em>Rawat Inap (Pondok)</em>, atau <em>Rujuk RS/Klinik Luar</em> (disertai nama Faskes Rujukan & alasan rujukan).</li>
                        </ul>
                    </div>
                )
            },
            {
                title: '3. Live Preview & Cetak Dokumen Medis Resmi (Sakit, Rujukan, Izin Pulang)',
                content: (
                    <div className="space-y-3 text-sm">
                        <p>
                            Poskestren kini dilengkapi fitur <strong>Live Preview Interaktif (*Side-by-Side*)</strong> untuk mencetak dokumen resmi pondok:
                        </p>
                        <div className="space-y-2">
                            <div className="bg-gray-50 p-2.5 rounded border border-gray-200 text-xs space-y-1">
                                <strong className="text-gray-800 flex items-center gap-1">
                                    <i className="bi bi-file-earmark-medical text-teal-600"></i> 1. Surat Keterangan Sakit (Format Ringkas A5)
                                </strong>
                                <p className="text-gray-600">Diberikan kepada santri untuk dispensasi istirahat di kamar dan izin KBM sekolah/madrasah.</p>
                            </div>
                            <div className="bg-gray-50 p-2.5 rounded border border-gray-200 text-xs space-y-1">
                                <strong className="text-gray-800 flex items-center gap-1">
                                    <i className="bi bi-hospital text-blue-600"></i> 2. Surat Pengantar Rujukan Medis (Format Resmi A4)
                                </strong>
                                <p className="text-gray-600">Mencantumkan faskes tujuan (Puskesmas/RSUD), indikasi medis, tanda vital lengkap, serta nama petugas/ustadz pendamping.</p>
                            </div>
                            <div className="bg-gray-50 p-2.5 rounded border border-gray-200 text-xs space-y-1">
                                <strong className="text-gray-800 flex items-center gap-1">
                                    <i className="bi bi-house-heart text-amber-600"></i> 3. Surat Rekomendasi Pulang Sakit (Format Resmi A4)
                                </strong>
                                <p className="text-gray-600">Untuk santri yang membutuhkan rawat jalan di rumah, memuat durasi istirahat, tanggal perkiraan kembali ke pondok, serta kolom tanda tangan penjemput/wali santri.</p>
                            </div>
                        </div>
                        <div className="bg-teal-50 p-3 rounded-lg border border-teal-200 text-xs text-teal-900 space-y-1">
                            <p className="font-semibold flex items-center gap-1">
                                <i className="bi bi-sliders text-teal-700"></i> Kustomisasi Bebas Sebelum Cetak:
                            </p>
                            <p className="text-gray-700">
                                Di panel preview, petugas dapat mengubah nomor surat resmi, tanggal/kota terbit, nama petugas pemeriksa, maupun pimpinan pondok tanpa mengubah data master. Setiap dokumen memiliki footer standar resmi: <em>"Dokumen resmi [Nama Pondok] - dibuat dengan Esantri Web by AI Projek | aiprojek01.my.id"</em>.
                            </p>
                        </div>
                    </div>
                )
            },
            {
                title: '4. Integrasi Absensi & Notifikasi WhatsApp Otomatis ke Wali Santri',
                content: (
                    <div className="space-y-3 text-sm">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="bg-white p-3 rounded-lg border border-purple-100 shadow-2xs space-y-1.5">
                                <h6 className="font-bold text-xs text-purple-800 flex items-center gap-1.5">
                                    <i className="bi bi-calendar-check text-purple-600"></i> Sinkronisasi Presensi Otomatis
                                </h6>
                                <p className="text-[11px] text-gray-600">
                                    Jika status santri diatur <strong>Rawat Inap (Pondok)</strong> atau <strong>Rujuk RS/Klinik</strong>, sistem otomatis menyinkronkan data presensi santri menjadi <strong>Sakit (S)</strong> pada absensi KBM hari tersebut.
                                </p>
                            </div>
                            <div className="bg-white p-3 rounded-lg border border-emerald-100 shadow-2xs space-y-1.5">
                                <h6 className="font-bold text-xs text-emerald-800 flex items-center gap-1.5">
                                    <i className="bi bi-whatsapp text-emerald-600"></i> Notifikasi WhatsApp Resmi 1-Klik
                                </h6>
                                <p className="text-[11px] text-gray-600">
                                    Klik tombol WhatsApp pada baris rekam medis untuk langsung membuka template pesan resmi yang memuat diagnosa, tanda vital, terapi obat, dan anjuran dokter ke nomor HP wali santri.
                                </p>
                            </div>
                        </div>
                    </div>
                )
            },
            {
                title: '5 Aturan Emas Menjaga Keutuhan & Keamanan Data Poskestren',
                content: (
                    <div className="space-y-2 text-xs text-gray-700">
                        <p className="text-sm font-medium text-gray-800">
                            Patuhi 5 panduan utama berikut agar data medis santri dan persediaan obat selalu valid, sinkron, dan aman:
                        </p>
                        <ul className="space-y-2.5 pt-1">
                            <li className="flex items-start gap-2.5 p-2.5 bg-gray-50 rounded-lg border border-gray-200">
                                <i className="bi bi-check-circle-fill text-red-600 shrink-0 text-sm mt-0.5"></i>
                                <div>
                                    <strong className="text-gray-900 block">1. Isolasi Akun Petugas Medis (Role Staff):</strong>
                                    <span className="text-gray-600 text-[11px]">Jangan gunakan akun Super Admin di laptop klinik umum. Berikan akun khusus bertipe Staff dengan hak akses modul Kesehatan saja untuk menjaga privasi data sensitif pondok.</span>
                                </div>
                            </li>
                            <li className="flex items-start gap-2.5 p-2.5 bg-gray-50 rounded-lg border border-gray-200">
                                <i className="bi bi-check-circle-fill text-red-600 shrink-0 text-sm mt-0.5"></i>
                                <div>
                                    <strong className="text-gray-900 block">2. Satu Santri Satu Petugas Pemeriksa:</strong>
                                    <span className="text-gray-600 text-[11px]">Jangan membuka dan menyimpan form pemeriksaan santri yang sama dari dua komputer berbeda pada saat bersamaan untuk mencegah benturan riwayat resep.</span>
                                </div>
                            </li>
                            <li className="flex items-start gap-2.5 p-2.5 bg-gray-50 rounded-lg border border-gray-200">
                                <i className="bi bi-check-circle-fill text-red-600 shrink-0 text-sm mt-0.5"></i>
                                <div>
                                    <strong className="text-gray-900 block">3. Disiplin Input Resep &amp; Mutasi Obat:</strong>
                                    <span className="text-gray-600 text-[11px]">Selalu catat pemberian obat melalui form resep di rekam medis agar stok terpotong otomatis dan riwayat pemakaian obat per santri tercatat jelas.</span>
                                </div>
                            </li>
                            <li className="flex items-start gap-2.5 p-2.5 bg-gray-50 rounded-lg border border-gray-200">
                                <i className="bi bi-check-circle-fill text-red-600 shrink-0 text-sm mt-0.5"></i>
                                <div>
                                    <strong className="text-gray-900 block">4. Koordinasi Kepulangan &amp; Rujukan:</strong>
                                    <span className="text-gray-600 text-[11px]">Jika santri dirujuk atau direkomendasikan pulang, cetak Surat Rujukan / Surat Pulang dan berkoordinasi dengan bagian Keamanan/Satpam (Buku Tamu) saat penjemputan wali santri.</span>
                                </div>
                            </li>
                            <li className="flex items-start gap-2.5 p-2.5 bg-gray-50 rounded-lg border border-gray-200">
                                <i className="bi bi-check-circle-fill text-red-600 shrink-0 text-sm mt-0.5"></i>
                                <div>
                                    <strong className="text-gray-900 block">5. Download Cadangan (Backup JSON) Rutin:</strong>
                                    <span className="text-gray-600 text-[11px]">Admin Pusat wajib mendownload cadangan data di menu <em>Pengaturan &gt; Backup &amp; Restore</em> secara mingguan sebagai arsip perlindungan data offline.</span>
                                </div>
                            </li>
                        </ul>
                    </div>
                )
            }
        ]
    },
    {
        id: 'bukutamu',
        badge: 4,
        badgeColor: 'teal',
        title: 'Buku Tamu & Keamanan Gerbang (Satpam)',
        steps: [
            {
                title: 'SOP Kerja Multi-Admin: Real-Time Sync vs Hub-and-Spoke',
                content: (
                    <div className="space-y-3 text-sm">
                        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-950 text-xs flex items-start gap-2.5">
                            <i className="bi bi-shield-exclamation text-amber-600 shrink-0 text-base mt-0.5"></i>
                            <div>
                                <strong className="font-bold text-amber-900 block mb-0.5">Pentingnya Tata Kelola Multi-Admin di Pos Keamanan (Satpam):</strong>
                                Pos Satpam beroperasi 24 jam dengan pergantian regu jaga (Shift Pagi, Siang, Malam). Penggunaan akun mandiri dan penerapan arsitektur sinkronisasi yang terstandarisasi memastikan riwayat tamu, titipan identitas fisik, dan paket kurir tercatat tertib tanpa risiko data saling menimpa. Sistem mendukung 2 arsitektur sinkronisasi: <strong>Real-Time Cloud (Firebase)</strong> dan <strong>Hub-and-Spoke (Offline / Dropbox / File Cadangan)</strong>.
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
                                Sangat ideal bila pos satpam gerbang utama dan gerbang asrama terjangkau jaringan WiFi pos atau koneksi internet stabil.
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-xs">
                                <div className="p-2.5 bg-white rounded-lg border border-teal-100 shadow-2xs">
                                    <strong className="text-teal-950 block mb-1 font-semibold">
                                        <i className="bi bi-person-badge text-teal-600"></i> Akun Khusus Petugas Satpam
                                    </strong>
                                    <p className="text-[11px] text-gray-600">
                                        Admin membuat akun khusus regu keamanan dengan wewenang dibatasi hanya pada modul <strong>Buku Tamu</strong>. Data keuangan SPP, catatan BK rahasia, dan nilai santri tetap terlindungi.
                                    </p>
                                </div>
                                <div className="p-2.5 bg-white rounded-lg border border-teal-100 shadow-2xs">
                                    <strong className="text-teal-950 block mb-1 font-semibold">
                                        <i className="bi bi-broadcast text-teal-600"></i> Sinkronisasi Detik Itu Juga
                                    </strong>
                                    <p className="text-[11px] text-gray-600">
                                        Setiap kali tamu check-in, check-out, atau paket kurir masuk, data langsung tersinkronisasi ke cloud dalam hitungan detik. Pimpinan pondok dan pengasuhan dapat memantau mobilitas gerbang secara langsung.
                                    </p>
                                </div>
                                <div className="p-2.5 bg-white rounded-lg border border-teal-100 shadow-2xs">
                                    <strong className="text-teal-950 block mb-1 font-semibold">
                                        <i className="bi bi-shield-check text-teal-600"></i> Partisi Multi-Gerbang &amp; Pos
                                    </strong>
                                    <p className="text-[11px] text-gray-600">
                                        Jika pondok memiliki Gerbang Utama (Putra) dan Gerbang Putri/Asrama, petugas di masing-masing pos mencatat tamu secara mandiri dan serentak tanpa bentrok nomor badge.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Model B */}
                        <div className="p-3.5 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-2">
                            <div className="flex items-center justify-between border-b border-indigo-200/70 pb-1.5">
                                <h5 className="font-bold text-indigo-900 flex items-center gap-1.5 text-xs">
                                    <span className="w-5 h-5 rounded-full bg-indigo-200 text-indigo-800 flex items-center justify-center text-[10px] font-black">2</span>
                                    Model B: Hub-and-Spoke (Offline-First / Dropbox / File Cadangan)
                                </h5>
                                <span className="ml-auto px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-[10px] font-bold uppercase">Hybrid / Offline</span>
                            </div>
                            <p className="text-xs text-gray-600">
                                Solusi terbaik jika pos gerbang berada di area yang sinyal internetnya minim atau saat koneksi WiFi pos padam.
                            </p>
                            <div className="space-y-2 pt-1 text-xs">
                                <div className="p-2 bg-white rounded-lg border border-indigo-100">
                                    <strong className="text-indigo-950">A. Peran HUB (Pusat Data Induk di Kantor TU / Kamtib):</strong>
                                    <p className="text-[11px] text-gray-600 mt-0.5">
                                        Komputer utama di kantor tata usaha atau koordinator ketertiban memegang otoritas basis data induk santri, wali, pengajar, dan arsip riwayat kunjungan.
                                    </p>
                                </div>
                                <div className="p-2 bg-white rounded-lg border border-indigo-100">
                                    <strong className="text-indigo-950">B. Peran SPOKE (Laptop / Tablet Petugas di Pos Satpam):</strong>
                                    <p className="text-[11px] text-gray-600 mt-0.5">
                                        Petugas keamanan mencatat registrasi tamu, pemberian badge, dan penerimaan paket di peramban pos jaga tanpa memerlukan kuota internet (tersimpan aman di database lokal).
                                    </p>
                                </div>
                                <div className="p-2 bg-white rounded-lg border border-indigo-100">
                                    <strong className="text-indigo-950">C. Alur Penggabungan (Merging) Data Tamu &amp; Paket:</strong>
                                    <div className="mt-1.5 p-2 bg-teal-50/80 border border-teal-200 rounded text-[11px] text-teal-950">
                                        <strong>⚡ Otomatis Saat Login (Auto-Pull):</strong> Begitu petugas satpam login di awal shift, sistem <em>secara otomatis menarik master data santri terbaru</em> dari Cloud di latar belakang. Kontak wali santri dan data rombel langsung terbarui tanpa perlu menarik manual. Tombol <em>"Ambil Master Data"</em> di modal hanya sebagai cadangan bila koneksi baru tersambung di tengah hari.
                                    </div>
                                    <ol className="list-decimal pl-4 mt-2 space-y-1 text-[11px] text-gray-600">
                                        <li>Petugas mencatat tamu berkunjung, penahanan KTP/SIM, dan penerimaan paket logistik secara mandiri di pos jaga (offline).</li>
                                        <li>Saat pergantian regu jaga atau ketika laptop terhubung jaringan internet, petugas mengeklik <strong>"Kirim Perubahan (Upload Staff Changes)"</strong> di menu Sinkronisasi.</li>
                                        <li>Admin Utama di Kantor TU mengeklik <strong>"Gabungkan Perubahan Staff (Merge Changes)"</strong>. Sistem menyatukan seluruh mutasi buku tamu dan paket secara cerdas dan aman tanpa menimpa data modul lain.</li>
                                        <li>Admin Pusat mengeklik <strong>"Terbitkan Master Data (Publish Master)"</strong> agar seluruh perangkat pos lainnya memperoleh data termutakhir.</li>
                                    </ol>
                                </div>
                            </div>
                        </div>

                        {/* SOP Sesi & Audit Trail Satpam */}
                        <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-xs space-y-1.5">
                            <strong className="text-amber-950 flex items-center gap-1.5 font-bold">
                                <i className="bi bi-shield-lock-fill text-amber-700"></i> SOP Keamanan Sesi Akun &amp; Disiplin Pergantian Shift Satpam:
                            </strong>
                            <p className="text-[11px] text-gray-700 leading-relaxed">
                                Setiap pencatatan tamu masuk, serah-terima paket titipan, maupun pengembalian kartu identitas fisik (KTP/SIM) merekam akun petugas aktif sebagai penanggung jawab (*audit trail*). Pada pos jaga yang beroperasi 24 jam dengan sistem regu jaga (Shift Pagi, Siang, Malam), <strong>petugas regu lama WAJIB mengeklik "Logout (Keluar)"</strong> saat serah-terima tugas selesai, dan petugas regu baru login menggunakan akun pribadinya sendiri. Jangan biarkan akun petugas lama tetap aktif untuk regu berikutnya agar akuntabilitas dan jejak pemeriksaan di gerbang tetap akurat saat diaudit pimpinan atau terjadi insiden kehilangan.
                            </p>
                        </div>

                        {/* Petunjuk Tambahan Operasional Pos Gerbang */}
                        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5 text-xs">
                            <h6 className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                                <i className="bi bi-info-circle-fill text-teal-600"></i>
                                Petunjuk Tambahan Operasional Pos Gerbang 24 Jam &amp; Penanganan Khusus:
                            </h6>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-gray-700 text-[11px]">
                                <div className="p-2.5 bg-white rounded-lg border border-slate-200 shadow-2xs space-y-1">
                                    <strong className="text-slate-900 flex items-center gap-1 font-semibold">
                                        <i className="bi bi-tv text-indigo-600"></i> Pemantauan Live Ruang Komandan &amp; Pengasuhan
                                    </strong>
                                    <p className="text-gray-600 leading-relaxed">
                                        Komandan regu keamanan, pimpinan pondok, dan pengasuhan santri dapat memantau daftar tamu aktif yang masih berada di dalam area pesantren secara real-time dari ruang kerja masing-masing tanpa perlu menelpon atau menginterupsi kesibukan pos jaga.
                                    </p>
                                </div>
                                <div className="p-2.5 bg-white rounded-lg border border-slate-200 shadow-2xs space-y-1">
                                    <strong className="text-slate-900 flex items-center gap-1 font-semibold">
                                        <i className="bi bi-journal-check text-emerald-600"></i> Pengganti Buku Mutasi Fisik Konvensional
                                    </strong>
                                    <p className="text-gray-600 leading-relaxed">
                                        Seluruh riwayat tamu, status tahanan identitas, hingga log penerimaan dan serah-terima paket kurir tersimpan rapi secara digital. Hal ini mengeliminasi risiko kertas mutasi pos robek, tercecer, atau tulisan tangan petugas tidak terbaca.
                                    </p>
                                </div>
                            </div>
                            <div className="p-2 bg-teal-50 border border-teal-200 rounded-lg text-teal-950 text-[11px] flex items-center gap-2">
                                <i className="bi bi-wifi-off text-teal-700 shrink-0"></i>
                                <span><strong>Ketahanan Offline:</strong> Jika jaringan WiFi pos satpam mendadak drop, satpam tetap dapat menginput data tamu dan paket tanpa terganggu. Sistem otomatis mengunggah seluruh antrean data seketika koneksi pulih.</span>
                            </div>
                        </div>
                    </div>
                )
            },
            {
                title: 'Alur Registrasi Tamu, Nomor Badge & Tahanan Identitas',
                content: (
                    <div className="space-y-3 text-sm">
                        <ol className="list-decimal pl-5 space-y-2 text-xs text-gray-700 leading-relaxed">
                            <li>
                                <strong>Sapa &amp; Verifikasi:</strong> Petugas menyapa tamu dengan ramah dan menanyakan keperluan. Klik <strong>"Registrasi Tamu / Paket"</strong> &gt; pilih jenis <em>"Tamu Berkunjung"</em>.
                            </li>
                            <li>
                                <strong>Pencarian Santri:</strong> Untuk kategori <em>Wali Santri</em>, ketik nama atau NIS santri di kolom pencarian. Sistem otomatis mengisi kontak wali santri dari basis data induk.
                            </li>
                            <li>
                                <strong>Pemberian Badge Visitor (Otomatis Reset Tiap Hari &amp; Manual):</strong>
                                <ul className="list-disc pl-4 mt-1 space-y-1 text-gray-600">
                                    <li><strong>Mode Otomatis (Reset Harian):</strong> Sistem otomatis menghitung urutan tamu hari ini (contoh: <code>B-01</code> untuk tamu ke-1, <code>B-02</code> untuk tamu ke-2) dan <em>otomatis reset kembali ke nomor 01 setiap pergantian hari jam 00:00</em>. Tersedia pilihan awalan kode: <code>B-</code> (Standar), <code>VIP-</code> (Dinas/Khusus), <code>W-</code> (Wali), <code>T-</code> (Umum).</li>
                                    <li><strong>Opsi Slot Fisik Standby:</strong> Jika pos satpam memiliki 10-30 kartu fisik berulang dan tamu sebelumnya sudah check-out, satpam dapat memilih tombol cepat <em>"Pakai slot standby"</em> untuk memanfaatkan kartu fisik yang sedang menganggur di meja pos.</li>
                                    <li><strong>Mode Manual / Khusus:</strong> Klik toggle <em>"Manual / Khusus"</em> untuk bebas mengetik nomor badge fisik kustom (misal: <code>VIP-01</code>, <code>KONTRAKTOR-A</code>, <code>07</code>). Kolom input nomor badge juga tetap dapat diedit langsung sewaktu-waktu.</li>
                                </ul>
                            </li>
                            <li>
                                <strong>Tahanan Identitas Fisik:</strong> Wajib meminta dan menahan kartu identitas fisik (KTP/SIM) di kotak penyimpanan pos satpam sampai tamu menyelesaikan kunjungan.
                            </li>
                            <li>
                                <strong>Cetak Tiket Pass Tamu (Kertas A6) &amp; Kirim Badge WA:</strong>
                                <ul className="list-disc pl-4 mt-1 space-y-1 text-gray-600">
                                    <li><strong>Standar Cetak Kertas A6 (105 × 148 mm):</strong> Desain tiket pass dikhususkan untuk ukuran A6 (seperempat lembar HVS A4). Sangat hemat kertas, pas diselipkan di saku atau mika gantungan ID card tamu, dan memuat kop lembaga, nomor registrasi, nomor badge, data rombongan, tata tertib, serta tanda tangan petugas.</li>
                                    <li><strong>Alternatif Tanpa Printer (Kirim Badge via WhatsApp):</strong> Jika pos satpam tidak memiliki printer atau sedang kehabisan kertas/tinta, satpam cukup klik <strong>"Kirim Badge WA"</strong>. Sistem otomatis mengirim pesan resmi berisi Kartu Izin Masuk / Visitor Pass digital lengkap langsung ke nomor WhatsApp tamu atau wali santri.</li>
                                </ul>
                            </li>
                        </ol>
                    </div>
                )
            },
            {
                title: 'SOP Titipan Paket Logistik & Notifikasi WhatsApp 1-Klik',
                content: (
                    <div className="space-y-3 text-sm">
                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-950 text-xs">
                            <strong className="block font-bold mb-1">
                                <i className="bi bi-box-seam-fill text-blue-600 mr-1"></i> Alur Penerimaan Paket (Kurir / Wali Santri):
                            </strong>
                            Ketika kurir ekspedisi (J&amp;T, SiCepat, Shopee Xpress, Pos, JNE) atau wali santri menitipkan barang:
                            <ul className="list-disc pl-4 mt-1.5 space-y-1">
                                <li>Pilih jenis registrasi <strong>"Titipan Paket / Logistik"</strong>.</li>
                                <li>Cari nama santri atau ustadz penerima, pilih nama kurir ekspedisi, dan masukkan deskripsi barang singkat (misal: pakaian, bekal makanan, buku).</li>
                                <li>Paket otomatis masuk ke tab <strong>"Titipan Paket Pos"</strong> dengan status <em>"Di Pos Satpam"</em>.</li>
                                <li>Klik tombol <strong>"Beri Tahu Penerima via WA"</strong> untuk mengirim notifikasi instan ke nomor wali/santri agar segera diambil di pos.</li>
                                <li>Saat santri datang mengambil barang, klik <strong>"Serahkan (Tandai Sudah Diambil)"</strong> sebagai bukti serah terima resmi.</li>
                            </ul>
                        </div>
                    </div>
                )
            },
            {
                title: 'Monitoring Overstay, Pergantian Shift & Ekspor Laporan',
                content: (
                    <div className="space-y-3 text-sm">
                        <ul className="list-disc pl-5 space-y-2 text-xs text-gray-700 leading-relaxed">
                            <li>
                                <strong>Peringatan Visual Overstay:</strong> Tamu dengan durasi kunjung &gt;2 jam akan ditandai dengan kartu warna kuning waspada, dan jika &gt;3 jam akan muncul label merah berkedip <code>⚠️ OVERSTAY</code>. Petugas wajib menghubungi tamu via WhatsApp atau mengecek lokasi tamu.
                            </li>
                            <li>
                                <strong>Check-Out Tamu:</strong> Saat tamu pulang, klik <strong>"Check-Out (Kembalikan Badge)"</strong>. Pastikan nomor badge visitor diterima kembali dan kartu identitas fisik (KTP/SIM) diserahkan kembali kepada tamu.
                            </li>
                            <li>
                                <strong>Serah Terima Shift Jaga:</strong> Saat pergantian regu, petugas shift lama menyerahkan sisa badge dan identitas yang masih ada di pos kepada petugas shift baru dengan mencocokkan daftar di tab <em>"Tamu Aktif"</em> dan <em>"Titipan Paket"</em>.
                            </li>
                            <li>
                                <strong>Rekapitulasi &amp; Ekspor:</strong> Buka tab <em>"Riwayat &amp; Rekapitulasi"</em> untuk mengekspor rekaman ke <strong>Excel (.xlsx)</strong> atau klik <strong>"Cetak Laporan"</strong> untuk mencetak dokumen buku ekspedisi resmi bertandatangan Komandan Satpam.
                            </li>
                        </ul>
                    </div>
                )
            }
        ]
    },
    {
        id: 'bk',
        badge: 4,
        badgeColor: 'teal',
        title: 'Bimbingan Konseling (BK)',
        steps: [
            {
                title: 'SOP Kerja Multi-Admin: Real-Time Sync vs Hub-and-Spoke',
                content: (
                    <div className="space-y-3 text-sm">
                        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-950 text-xs flex items-start gap-2.5">
                            <i className="bi bi-shield-exclamation text-amber-600 shrink-0 text-base mt-0.5"></i>
                            <div>
                                <strong className="font-bold text-amber-900 block mb-0.5">Pentingnya Tata Kelola Multi-Admin Bimbingan Konseling:</strong>
                                Layanan Bimbingan Konseling memuat catatan pribadi santri yang sensitif. Pembagian akun mandiri dan penerapan arsitektur sinkronisasi yang jelas melindungi kerahasiaan santri dan memastikan catatan tindak lanjut tersimpan aman tanpa tertimpa. Sistem mendukung 2 arsitektur sinkronisasi: <strong>Real-Time Cloud (Firebase)</strong> dan <strong>Hub-and-Spoke (Offline / Dropbox / File Cadangan)</strong>.
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
                                Sangat ideal bila ruang konseling/BK terjangkau jaringan WiFi pondok atau internet stabil.
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-xs">
                                <div className="p-2.5 bg-white rounded-lg border border-teal-100 shadow-2xs">
                                    <strong className="text-teal-950 block mb-1 font-semibold">
                                        <i className="bi bi-person-badge text-teal-600"></i> Akun Khusus Guru BK
                                    </strong>
                                    <p className="text-[11px] text-gray-600">
                                        Admin membuat akun khusus konselor dengan izin akses dibatasi hanya ke modul <strong>Bimbingan Konseling</strong>. Akun umum di kantor TU tidak dapat membuka catatan sesi privat santri.
                                    </p>
                                </div>
                                <div className="p-2.5 bg-white rounded-lg border border-teal-100 shadow-2xs">
                                    <strong className="text-teal-950 block mb-1 font-semibold">
                                        <i className="bi bi-broadcast text-teal-600"></i> Sinkronisasi Detik Itu Juga
                                    </strong>
                                    <p className="text-[11px] text-gray-600">
                                        Saat konselor menyimpan catatan sesi atau evaluasi sikap, data langsung masuk ke cloud. Riwayat pembinaan tersimpan aman tanpa perlu kirim berkas manual.
                                    </p>
                                </div>
                                <div className="p-2.5 bg-white rounded-lg border border-teal-100 shadow-2xs">
                                    <strong className="text-teal-950 block mb-1 font-semibold">
                                        <i className="bi bi-shield-lock text-teal-600"></i> Partisi Privasi Kasus
                                    </strong>
                                    <p className="text-[11px] text-gray-600">
                                        Gunakan 3 tingkat privasi (Biasa, Rahasia, Sangat Rahasia) agar koordinasi kasus santri bersama Musyrif atau Pimpinan tepat sasaran tanpa membocorkan rahasia.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Model B */}
                        <div className="p-3.5 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-2">
                            <div className="flex items-center justify-between border-b border-indigo-200/70 pb-1.5">
                                <h5 className="font-bold text-indigo-900 flex items-center gap-1.5 text-xs">
                                    <span className="w-5 h-5 rounded-full bg-indigo-200 text-indigo-800 flex items-center justify-center text-[10px] font-black">2</span>
                                    Model B: Hub-and-Spoke (Offline-First / Dropbox / File Cadangan)
                                </h5>
                                <span className="ml-auto px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-[10px] font-bold uppercase">Hybrid / Offline</span>
                            </div>
                            <p className="text-xs text-gray-600">
                                Solusi terbaik jika ruang BK berada di sudut gedung pesantren yang belum terjangkau koneksi internet kontinu.
                            </p>
                            <div className="space-y-2 pt-1 text-xs">
                                <div className="p-2 bg-white rounded-lg border border-indigo-100">
                                    <strong className="text-indigo-950">A. Peran HUB (Pusat Data Induk di Kantor Tata Usaha):</strong>
                                    <p className="text-[11px] text-gray-600 mt-0.5">
                                        Memegang basis data master lengkap (data induk santri, riwayat perizinan, dan arsip dokumen pondok).
                                    </p>
                                </div>
                                <div className="p-2 bg-white rounded-lg border border-indigo-100">
                                    <strong className="text-indigo-950">B. Peran SPOKE (Laptop Konselor di Ruang BK):</strong>
                                    <p className="text-[11px] text-gray-600 mt-0.5">
                                        Guru BK mencatat sesi bimbingan santri di laptop ruang BK secara tenang dan rahasia tanpa memerlukan koneksi internet (semua tersimpan aman di penyimpanan laptop lokal).
                                    </p>
                                </div>
                                <div className="p-2 bg-white rounded-lg border border-indigo-100">
                                    <strong className="text-indigo-950">C. Alur Penggabungan (Merging) Konseling:</strong>
                                    <div className="mt-1.5 p-2 bg-teal-50/80 border border-teal-200 rounded text-[11px] text-teal-950">
                                        <strong>⚡ Otomatis Saat Login (Auto-Pull):</strong> Begitu Guru BK login di ruang konseling, sistem <em>secara otomatis menarik master santri dan catatan kejadian terbaru</em> dari Cloud di latar belakang. Tidak perlu tarik manual setiap pagi! Tombol <em>"Ambil Master Data"</em> di modal hanya sebagai cadangan jika koneksi baru terhubung atau ada laporan pelanggaran mendadak yang baru diinput pengasuhan.
                                    </div>
                                    <ol className="list-decimal pl-4 mt-2 space-y-1 text-[11px] text-gray-600">
                                        <li>Guru BK mencatat sesi pembinaan dan tindak lanjut santri di laptop ruang BK secara offline.</li>
                                        <li>Saat terhubung internet atau WiFi pondok, konselor membuka menu Sinkronisasi lalu klik <strong>"Kirim Perubahan (Upload Staff Changes)"</strong>.</li>
                                        <li>Admin Utama di Kantor TU membuka menu Sinkronisasi dan mengeklik <strong>"Gabungkan Perubahan Staff (Merge Changes)"</strong>. Sistem menyatukan catatan konseling terbaru secara aman dan rahasia tanpa menimpa data modul lain.</li>
                                        <li>Admin Pusat mengeklik <strong>"Terbitkan Master Data (Publish Master)"</strong> agar seluruh perangkat staf lainnya memperoleh data termutakhir.</li>
                                    </ol>
                                </div>
                            </div>
                        </div>

                        {/* SOP Sesi & Kerahasiaan BK */}
                        <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-xs space-y-1.5">
                            <strong className="text-amber-950 flex items-center gap-1.5 font-bold">
                                <i className="bi bi-shield-lock-fill text-amber-700"></i> SOP Keamanan Sesi Akun &amp; Perlindungan Privasi Konseling Santri:
                            </strong>
                            <p className="text-[11px] text-gray-700 leading-relaxed">
                                Curahan hati santri, konflik keluarga, dan catatan pelanggaran disiplin dalam modul BK merupakan data dengan kerahasiaan tingkat tinggi. Guru BK <strong>WAJIB MENGEKLIK LOGOUT</strong> jika meninggalkan laptop konseling, terutama bila laptop tersebut dibawa ke ruang guru atau digunakan bergantian. Jika akun tertinggal dalam keadaan login, risiko pembacaan catatan privat santri oleh pihak tak berwenang sangat fatal. Jika konselor lain akan menggunakan laptop, klik Logout terlebih dahulu agar resume pembinaan tercatat atas nama konselor yang menangani (*audit trail*).
                            </p>
                        </div>
                    </div>
                )
            },
            {
                title: 'Kerahasiaan & Pembagian Tingkat Privasi Kasus',
                color: 'red',
                content: (
                    <div className="space-y-3 text-sm">
                        <p className="text-xs text-gray-700">
                            Setiap sesi bimbingan konseling dapat dikelompokkan ke dalam 3 tingkat kerahasiaan untuk memudahkan koordinasi yang tepat:
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                            <div className="p-3 bg-white rounded-lg border border-gray-200 shadow-2xs space-y-1">
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                                    Biasa
                                </span>
                                <p className="text-gray-600 text-[11px] leading-relaxed pt-1">
                                    Untuk masalah ringan seperti adaptasi kamar, motivasi belajar, atau kedisiplinan harian yang dapat dikoordinasikan bersama wali kelas dan musyrif asrama.
                                </p>
                            </div>
                            <div className="p-3 bg-white rounded-lg border border-gray-200 shadow-2xs space-y-1">
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                                    Rahasia
                                </span>
                                <p className="text-gray-600 text-[11px] leading-relaxed pt-1">
                                    Untuk permasalahan khusus, konflik santri, atau pelanggaran tata tertib yang hanya diketahui oleh Konselor, Wali Kelas, dan Kepala Pengasuhan.
                                </p>
                            </div>
                            <div className="p-3 bg-white rounded-lg border border-gray-200 shadow-2xs space-y-1">
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                                    Sangat Rahasia
                                </span>
                                <p className="text-gray-600 text-[11px] leading-relaxed pt-1">
                                    Untuk permasalahan mendalam atau masalah keluarga yang bersifat sangat pribadi dan penanganannya hanya dilakukan oleh Konselor utama atau Pimpinan Pondok.
                                </p>
                            </div>
                        </div>
                    </div>
                )
            },
            {
                title: 'Alur Pelayanan & Pemantauan Perkembangan Santri',
                color: 'teal',
                content: (
                    <div className="space-y-3 text-sm">
                        <ol className="list-decimal pl-5 space-y-2 text-xs text-gray-700">
                            <li>
                                <strong>Pencatatan Sesi Konseling Baru:</strong>
                                <p className="text-[11px] text-gray-600 mt-0.5">
                                    Buka menu <strong>Bimbingan Konseling</strong> &gt; klik <strong>"Catat Sesi Baru"</strong>. Pilih nama santri, tanggal konseling, nama konselor, dan kategori masalah (Pribadi, Sosial, Belajar, Disiplin, Ibadah, Keluarga, atau Karir &amp; Minat Bakat).
                                </p>
                            </li>
                            <li>
                                <strong>Koordinasi Pihak Terkait:</strong>
                                <p className="text-[11px] text-gray-600 mt-0.5">
                                    Tentukan pihak yang dilibatkan dalam bimbingan, seperti Musyrif Asrama, Wali Kelas, Orang Tua/Wali, Petugas Poskestren, atau Keamanan Pondok.
                                </p>
                            </li>
                            <li>
                                <strong>Komitmen Santri &amp; Jadwal Kontrol:</strong>
                                <p className="text-[11px] text-gray-600 mt-0.5">
                                    Tuliskan hasil kesepakatan perbaikan sikap santri dan tentukan tanggal kontrol berikutnya untuk evaluasi lanjutan.
                                </p>
                            </li>
                            <li>
                                <strong>Pencatatan Riwayat Tindak Lanjut (Follow-Up):</strong>
                                <p className="text-[11px] text-gray-600 mt-0.5">
                                    Gunakan tombol <strong>"Follow-up / Lanjutan"</strong> pada kartu konseling untuk mencatat setiap perkembangan santri secara berkala tanpa menghapus catatan sesi sebelumnya. Status santri dapat disesuaikan bertahap: <em>Baru &rarr; Proses &rarr; Pemantauan &rarr; Selesai</em>.
                                </p>
                            </li>
                        </ol>
                    </div>
                )
            },
            {
                title: 'Penerbitan Surat Resmi & Pengiriman Pesan WhatsApp',
                color: 'teal',
                content: (
                    <div className="space-y-3 text-sm">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                            <div className="p-3 bg-white border border-teal-200 rounded-xl space-y-1.5 shadow-2xs">
                                <h6 className="font-bold text-teal-900 flex items-center gap-1.5">
                                    <i className="bi bi-file-earmark-text text-teal-600 text-sm"></i> Format Surat Konseling
                                </h6>
                                <p className="text-gray-600 text-[11px] leading-relaxed">
                                    Klik tombol <strong>"Cetak Surat"</strong> pada kartu sesi bimbingan untuk memilih format dokumen resmi:
                                </p>
                                <ul className="text-gray-600 text-[11px] space-y-1 pl-3 list-disc">
                                    <li><strong>Surat Undangan Wali Santri:</strong> Untuk mengundang orang tua/wali hadir musyawarah di pondok.</li>
                                    <li><strong>Surat Panggilan Santri:</strong> Untuk memanggil santri hadir ke ruang konseling.</li>
                                    <li><strong>Berita Acara Konseling:</strong> Risalah tertulis hasil pembinaan dan komitmen santri.</li>
                                </ul>
                            </div>

                            <div className="p-3 bg-white border border-green-200 rounded-xl space-y-1.5 shadow-2xs">
                                <h6 className="font-bold text-green-900 flex items-center gap-1.5">
                                    <i className="bi bi-whatsapp text-green-600 text-sm"></i> Notifikasi WhatsApp Cepat
                                </h6>
                                <p className="text-gray-600 text-[11px] leading-relaxed">
                                    Pada jendela pratinjau surat, klik tombol <strong>"Kirim Pesan WhatsApp Resmi"</strong> untuk langsung menghubungi orang tua/wali santri:
                                </p>
                                <ul className="text-gray-600 text-[11px] space-y-1 pl-3 list-disc">
                                    <li>Nomor WhatsApp wali santri otomatis terisi sesuai data profil santri.</li>
                                    <li>Template pesan resmi sudah tersusun rapi dan sopan.</li>
                                    <li>Tersedia tombol untuk mengirim langsung via WhatsApp atau menyalin teks pesan.</li>
                                </ul>
                            </div>
                        </div>
                    </div>
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
                                Di pondok pesantren dengan puluhan ustadz/musyrif yang mengabsen serentak di kelas dan asrama, sistem mendukung 2 arsitektur utama: <strong>Real-Time Cloud (Firebase)</strong> dan <strong>Hub-and-Spoke (Offline / Dropbox / File Cadangan)</strong>. Ikuti SOP di bawah ini agar data absensi tidak saling menimpa.
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
                                        Setiap pengajar login menggunakan akun masing-masing. Nama pencatat otomatis direkam di riwayat aktivitas sistem untuk audit jejak kerja.
                                    </p>
                                </div>
                                <div className="p-2.5 bg-white rounded-lg border border-teal-100 shadow-2xs">
                                    <strong className="text-teal-950 block mb-1 font-semibold">
                                        <i className="bi bi-broadcast text-teal-600"></i> Sinkronisasi Detik Itu Juga
                                    </strong>
                                    <p className="text-[11px] text-gray-600">
                                        Saat guru menekan "Simpan Data Absensi", data tersimpan di penyimpanan lokal dan langsung tersinkronisasi ke Cloud. Pimpinan pondok dapat memantau kehadiran santri secara langsung.
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
                                    Model B: Hub-and-Spoke (Offline-First / Dropbox / File Cadangan)
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
                                    <div className="mt-1.5 p-2 bg-teal-50/80 border border-teal-200 rounded text-[11px] text-teal-950">
                                        <strong>⚡ Otomatis Saat Login (Auto-Pull):</strong> Begitu ustadz/guru login di jam mengajar pertama, sistem <em>secara otomatis menarik master data santri &amp; rombel terbaru</em> dari Cloud di latar belakang. Status santri yang sedang Sakit di Poskestren atau Izin di Kesantrian otomatis terdeteksi tanpa perlu tarik manual. Tombol <em>"Ambil Master Data"</em> di modal hanya sebagai cadangan jika laptop baru terhubung WiFi atau ada perubahan rombel darurat di siang hari.
                                    </div>
                                    <ol className="list-decimal pl-4 mt-2 space-y-1 text-[11px] text-gray-600">
                                        <li>Guru mengabsen santri secara mandiri di kelas (tanpa perlu paket data).</li>
                                        <li>Saat KBM selesai atau ketika mendapat sinyal, guru mengeklik <strong>"Kirim Perubahan (Upload Staff Changes)"</strong> di menu Sinkronisasi Cloud, atau mengirim file ekspor ke Admin.</li>
                                        <li>Admin Utama di Hub mengeklik <strong>"Gabungkan Perubahan Staff (Merge Changes)"</strong>. Sistem membandingkan waktu perubahan terakhir dan menyatukan seluruh absensi tanpa menimpa data rombel lain.</li>
                                        <li>Admin Pusat mengeklik <strong>"Terbitkan Master Data (Publish Master)"</strong> untuk mendistribusikan data termutakhir ke seluruh staf.</li>
                                    </ol>
                                </div>
                            </div>
                        </div>

                        {/* SOP Sesi & Audit Presensi */}
                        <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-xs space-y-1.5">
                            <strong className="text-amber-950 flex items-center gap-1.5 font-bold">
                                <i className="bi bi-shield-lock-fill text-amber-700"></i> SOP Keamanan Sesi Akun &amp; Validitas Jejak Presensi (Audit Trail):
                            </strong>
                            <p className="text-[11px] text-gray-700 leading-relaxed">
                                Setiap presensi yang disimpan merekam identitas akun ustadz yang sedang aktif. Di ruang kelas atau kantor guru yang menggunakan komputer inventaris bersama, <strong>guru WAJIB LOGOUT setelah jam pelajaran selesai</strong>. Jika akun dibiarkan aktif, guru jam berikutnya akan mengabsen menggunakan akun Anda, sehingga data kehadiran santri tercatat atas nama guru yang salah saat diaudit pimpinan. Jika menemukan komputer kelas masih terbuka akun guru lain, klik Logout terlebih dahulu lalu login dengan akun Anda sendiri.
                            </p>
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
                title: 'SOP Kerja Multi-Admin: Real-Time Sync vs Hub-and-Spoke',
                content: (
                    <div className="space-y-3 text-sm">
                        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-950 text-xs flex items-start gap-2.5">
                            <i className="bi bi-exclamation-triangle-fill text-amber-600 shrink-0 text-base mt-0.5"></i>
                            <div>
                                <strong className="font-bold text-amber-900 block mb-0.5">Pentingnya Tata Kelola Multi-Admin di Program Tahfizh:</strong>
                                Di pondok pesantren dengan puluhan halaqah yang menyimak ratusan santri serentak setiap subuh dan ashar di masjid, sistem mendukung 2 arsitektur utama: <strong>Real-Time Cloud (Firebase)</strong> dan <strong>Hub-and-Spoke (Offline / Dropbox / File Cadangan)</strong>. Ikuti SOP di bawah ini agar setiap ustadz muhaffizh dapat mencatat mutaba'ah secara mandiri dan lancar tanpa risiko data tertimpa.
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
                                Sangat ideal bila masjid atau ruang halaqah terjangkau jaringan WiFi pondok atau paket data internet.
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-xs">
                                <div className="p-2.5 bg-white rounded-lg border border-teal-100 shadow-2xs">
                                    <strong className="text-teal-950 block mb-1 font-semibold">
                                        <i className="bi bi-person-badge text-teal-600"></i> Akun Mandiri Ustadz Muhaffizh
                                    </strong>
                                    <p className="text-[11px] text-gray-600">
                                        Setiap pengajar halaqah login dengan akun masing-masing dan langsung diarahkan ke daftar anggota halaqah binaannya sendiri.
                                    </p>
                                </div>
                                <div className="p-2.5 bg-white rounded-lg border border-teal-100 shadow-2xs">
                                    <strong className="text-teal-950 block mb-1 font-semibold">
                                        <i className="bi bi-broadcast text-teal-600"></i> Sinkronisasi Detik Itu Juga
                                    </strong>
                                    <p className="text-[11px] text-gray-600">
                                        Saat ustadz menekan simpan setoran, mutaba'ah hafalan otomatis tersimpan di cloud, grafik capaian juz terakumulasi, dan data tampil di Portal Wali Santri.
                                    </p>
                                </div>
                                <div className="p-2.5 bg-white rounded-lg border border-teal-100 shadow-2xs">
                                    <strong className="text-teal-950 block mb-1 font-semibold">
                                        <i className="bi bi-diagram-3 text-teal-600"></i> Partisi Kerja Per Halaqah
                                    </strong>
                                    <p className="text-[11px] text-gray-600">
                                        Setiap ustadz fokus pada santri halaqahnya sendiri sehingga mutaba'ah tidak saling bertabrakan. Pengurus pusat memantau rekap keseluruhan secara langsung.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Model B */}
                        <div className="p-3.5 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-2">
                            <div className="flex items-center justify-between border-b border-indigo-200/70 pb-1.5">
                                <h5 className="font-bold text-indigo-900 flex items-center gap-1.5 text-xs">
                                    <span className="w-5 h-5 rounded-full bg-indigo-200 text-indigo-800 flex items-center justify-center text-[10px] font-black">2</span>
                                    Model B: Hub-and-Spoke (Offline-First / Dropbox / File Cadangan)
                                </h5>
                                <span className="ml-auto px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-[10px] font-bold uppercase">Hybrid / Offline</span>
                            </div>
                            <p className="text-xs text-gray-600">
                                Solusi terbaik jika masjid atau sudut asrama halaqah berada di area yang minim sinyal internet.
                            </p>
                            <div className="space-y-2 pt-1 text-xs">
                                <div className="p-2 bg-white rounded-lg border border-indigo-100">
                                    <strong className="text-indigo-950">A. Peran HUB (Pusat Koordinator Tahfizh di Kantor TU):</strong>
                                    <p className="text-[11px] text-gray-600 mt-0.5">
                                        Komputer utama di kantor TU yang memegang salinan master plotting halaqah, target juz, dan penerbitan Buku Rapor Tahfizh semesteran.
                                    </p>
                                </div>
                                <div className="p-2 bg-white rounded-lg border border-indigo-100">
                                    <strong className="text-indigo-950">B. Peran SPOKE (Laptop/HP Ustadz di Masjid atau Asrama):</strong>
                                    <p className="text-[11px] text-gray-600 mt-0.5">
                                        Ustadz menyimak hafalan santri di sudut masjid secara lancar dan cepat tanpa memerlukan koneksi internet (semua tersimpan aman di penyimpanan lokal).
                                    </p>
                                </div>
                                <div className="p-2 bg-white rounded-lg border border-indigo-100">
                                    <strong className="text-indigo-950">C. Alur Penggabungan (Merging) Tahfizh:</strong>
                                    <div className="mt-1.5 p-2 bg-teal-50/80 border border-teal-200 rounded text-[11px] text-teal-950">
                                        <strong>⚡ Otomatis Saat Login (Auto-Pull):</strong> Begitu ustadz muhaffizh login saat halaqah subuh/ashar dimulai, sistem <em>secara otomatis menarik master data santri &amp; riwayat hafalan terakhir</em> dari Cloud di latar belakang. Muhaffizh tidak perlu repot mencari menu sinkronisasi sebelum menyimak setoran! Tombol <em>"Ambil Master Data"</em> di modal hanya sebagai cadangan jika laptop baru tersambung internet atau ada santri pindah halaqah mendadak.
                                    </div>
                                    <ol className="list-decimal pl-4 mt-2 space-y-1 text-[11px] text-gray-600">
                                        <li>Ustadz mencatat setoran sabaq, sabqi, dan manzil selama halaqah berlangsung secara offline.</li>
                                        <li>Selesai sesi halaqah atau saat terhubung WiFi pondok, ustadz membuka menu Sinkronisasi dan mengeklik <strong>"Kirim Perubahan (Upload Staff Changes)"</strong>.</li>
                                        <li>Admin Utama di Kantor TU membuka menu Sinkronisasi dan mengeklik <strong>"Gabungkan Perubahan Staff (Merge Changes)"</strong>. Sistem menyatukan catatan mutaba'ah santri tanpa menimpa data halaqah lain.</li>
                                        <li>Admin Pusat mengeklik <strong>"Terbitkan Master Data (Publish Master)"</strong> agar data kemajuan hafalan santri terdistribusi ke seluruh pengurus pondok.</li>
                                    </ol>
                                </div>
                            </div>
                        </div>

                        {/* SOP Sesi & Audit Tahfizh */}
                        <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-xs space-y-1.5">
                            <strong className="text-amber-950 flex items-center gap-1.5 font-bold">
                                <i className="bi bi-shield-lock-fill text-amber-700"></i> SOP Keamanan Sesi Akun &amp; Validitas Penyimak Setoran (Audit Trail):
                            </strong>
                            <p className="text-[11px] text-gray-700 leading-relaxed">
                                Setiap setoran juz, surat, dan ayat yang tersimpan otomatis merekam akun muhaffizh yang menyimak. Pada laptop atau tablet inventaris pondok yang digunakan bergantian di masjid, <strong>ustadz muhaffizh WAJIB mengeklik "Logout (Keluar)"</strong> begitu sesi halaqah berakhir. Jika akun dibiarkan aktif, muhaffizh halaqah berikutnya akan mencatat setoran santri binaannya di bawah nama akun Anda, sehingga data penguji pada Buku Rapor Tahfizh santri menjadi keliru. Jika menemukan perangkat halaqah masih aktif dengan akun rekan lain, klik Logout terlebih dahulu lalu login dengan akun Anda sendiri.
                            </p>
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
    kurikulumPanduan,
    raporPanduan,
    akademikPanduan,
    financePanduan,
    bukukasPanduan,
    koperasiPanduan,
    {
        id: 'asrama',
        badge: 10,
        badgeColor: 'orange',
        title: 'Keasramaan & Pengasuhan',
        steps: [
            {
                title: 'SOP Kerja Multi-Admin: Real-Time Sync vs Hub-and-Spoke',
                content: (
                    <div className="space-y-3 text-sm">
                        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-950 text-xs flex items-start gap-2.5">
                            <i className="bi bi-exclamation-triangle-fill text-amber-600 shrink-0 text-base mt-0.5"></i>
                            <div>
                                <strong className="font-bold text-amber-900 block mb-0.5">Pentingnya Tata Kelola Multi-Admin Keasramaan &amp; Pengasuhan:</strong>
                                Di pondok pesantren dengan asrama putra (banin) dan putri (banat) yang terpisah secara fisik serta puluhan musyrif/musyrifah piket harian, sistem mendukung 2 arsitektur sinkronisasi utama: <strong>Real-Time Cloud (Firebase)</strong> dan <strong>Hub-and-Spoke (Offline / Dropbox / File Cadangan)</strong>. Ikuti tata kelola di bawah ini agar penempatan kamar, mutasi santri, sidak kebersihan, dan jurnal pengasuhan berjalan tertib tanpa bentrok data antar-gedung.
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
                                Sangat ideal bila pos piket asrama atau kantor musyrif terjangkau jaringan WiFi pondok atau internet seluler stabil.
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-xs">
                                <div className="p-2.5 bg-white rounded-lg border border-teal-100 shadow-2xs">
                                    <strong className="text-teal-950 block mb-1 font-semibold">
                                        <i className="bi bi-person-badge text-teal-600"></i> Akun Mandiri Musyrif
                                    </strong>
                                    <p className="text-[11px] text-gray-600">
                                        Setiap musyrif login dengan akun masing-masing (hak akses modul <strong>Keasramaan</strong>). Setiap mutasi kamar, sidak nadhafah, dan catatan jurnal otomatis tercatat atas nama musyrif pembuat (<em>audit trail</em>).
                                    </p>
                                </div>
                                <div className="p-2.5 bg-white rounded-lg border border-teal-100 shadow-2xs">
                                    <strong className="text-teal-950 block mb-1 font-semibold">
                                        <i className="bi bi-broadcast text-teal-600"></i> Sinkron Instan Lintas Divisi
                                    </strong>
                                    <p className="text-[11px] text-gray-600">
                                        Santri yang dirawat inap di Poskestren atau izin pulang di pos keamanan langsung memunculkan lencana status khusus (<em>🏥 Rawat Inap</em> / <em>📋 Izin Pulang</em>) pada kartu kamar asrama secara otomatis.
                                    </p>
                                </div>
                                <div className="p-2.5 bg-white rounded-lg border border-teal-100 shadow-2xs">
                                    <strong className="text-teal-950 block mb-1 font-semibold">
                                        <i className="bi bi-building-lock text-teal-600"></i> Partisi Gedung Putra &amp; Putri
                                    </strong>
                                    <p className="text-[11px] text-gray-600">
                                        Musyrif Putra mengelola Gedung Banin, Musyrifah mengelola Gedung Banat. Sistem memvalidasi kesesuaian gender santri dan sisa kapasitas kasur kamar secara otomatis untuk mencegah tumpang tindih.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Model B */}
                        <div className="p-3.5 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-2">
                            <div className="flex items-center justify-between border-b border-indigo-200/70 pb-1.5">
                                <h5 className="font-bold text-indigo-900 flex items-center gap-1.5 text-xs">
                                    <span className="w-5 h-5 rounded-full bg-indigo-200 text-indigo-800 flex items-center justify-center text-[10px] font-black">2</span>
                                    Model B: Hub-and-Spoke (Offline-First / Dropbox / File Cadangan)
                                </h5>
                                <span className="ml-auto px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-[10px] font-bold uppercase">Hybrid / Offline</span>
                            </div>
                            <p className="text-xs text-gray-600">
                                Solusi terbaik jika gedung asrama santri berada di lokasi yang belum terjangkau koneksi internet kontinu saat jam piket malam.
                            </p>
                            <div className="space-y-2 pt-1 text-xs">
                                <div className="p-2 bg-white rounded-lg border border-indigo-100">
                                    <strong className="text-indigo-950">A. Peran HUB (Pusat Data Induk di Kantor Pengasuhan / Tata Usaha):</strong>
                                    <p className="text-[11px] text-gray-600 mt-0.5">
                                        Komputer Utama memegang basis data master lengkap (data santri, struktur gedung, kamar, fasilitas, dan riwayat mutasi santri).
                                    </p>
                                </div>
                                <div className="p-2 bg-white rounded-lg border border-indigo-100">
                                    <strong className="text-indigo-950">B. Peran SPOKE (Laptop / Tablet Musyrif di Meja Piket Asrama):</strong>
                                    <p className="text-[11px] text-gray-600 mt-0.5">
                                        Musyrif piket membuka aplikasi di pos asrama untuk mengecek penghuni, melakukan mutasi lokal, menilai kebersihan kamar, dan mencatat jurnal harian tanpa perlu koneksi internet (semua tersimpan aman di penyimpanan lokal).
                                    </p>
                                </div>
                                <div className="p-2 bg-white rounded-lg border border-indigo-100">
                                    <strong className="text-indigo-950">C. Alur Penggabungan (Merging) Harian Asrama:</strong>
                                    <div className="mt-1.5 p-2 bg-teal-50/80 border border-teal-200 rounded text-[11px] text-teal-950">
                                        <strong>⚡ Otomatis Saat Login (Auto-Pull):</strong> Begitu musyrif login saat memulai piket asrama, sistem <em>secara otomatis menarik master santri, status kamar, dan perizinan terbaru</em> dari Cloud di latar belakang. Tidak perlu tarik manual setiap pagi! Tombol <em>"Ambil Master Data"</em> di modal sinkronisasi hanya sebagai cadangan jika laptop baru terhubung WiFi atau ada mutasi santri mendadak dari bagian administrasi pusat.
                                    </div>
                                    <ol className="list-decimal pl-4 mt-2 space-y-1 text-[11px] text-gray-600">
                                        <li>Musyrif mencatat sidak nadhafah, jurnal kegiatan, dan mutasi kamar santri sepanjang jam piket secara offline di pos jaga.</li>
                                        <li>Saat pergantian shift atau saat perangkat terhubung ke WiFi pondok, musyrif membuka menu Sinkronisasi lalu klik <strong>"Kirim Perubahan (Upload Staff Changes)"</strong>.</li>
                                        <li>Admin Pengasuhan Pusat / TU membuka menu Sinkronisasi dan mengeklik <strong>"Gabungkan Perubahan Staff (Merge Changes)"</strong>. Sistem menyatukan mutasi kamar dan jurnal terbaru secara aman tanpa menimpa data modul lain.</li>
                                        <li>Admin Pusat mengeklik <strong>"Terbitkan Master Data (Publish Master)"</strong> agar seluruh perangkat musyrif lainnya memperoleh pemetaan kamar terkini.</li>
                                    </ol>
                                </div>
                            </div>
                        </div>

                        {/* Golden Rules */}
                        <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-xs space-y-2">
                            <strong className="text-amber-950 flex items-center gap-1.5 font-bold">
                                <i className="bi bi-shield-check text-amber-700"></i> 3 Pantangan Keras &amp; Aturan Disiplin Multi-Admin Keasramaan:
                            </strong>
                            <ol className="list-decimal pl-4 space-y-1 text-[11px] text-gray-700">
                                <li>
                                    <strong>Disiplin Partisi Wilayah:</strong> Musyrif Asrama Putra dilarang mengedit penempatan kamar di Gedung Putri, dan sebaliknya, guna menjaga privasi dan ketertiban administrasi.
                                </li>
                                <li>
                                    <strong>Koordinasi Mutasi Antar-Gedung:</strong> Pemindahan santri lintas komplek asrama wajib dikoordinasikan dengan Pengasuhan Pusat agar status kamar lama dilepas sebelum ditempatkan di kamar baru.
                                </li>
                                <li>
                                    <strong>Wajib Logout di Perangkat Piket Bersama:</strong> Tablet atau PC di pos piket asrama yang digunakan bergantian antar-regu jaga <strong>WAJIB DI-LOGOUT</strong> setiap pergantian shift agar catatan sidak kamar dan jurnal tidak tercatat atas nama musyrif yang keliru pada jejak audit trail.
                                </li>
                            </ol>
                        </div>
                    </div>
                )
            },
            {
                title: 'Manajemen Gedung, Kamar & Fasilitas',
                content: (
                    <ul className="list-disc pl-5 space-y-1 text-sm mt-1">
                        <li>Buka tab <strong>Gedung &amp; Kamar</strong>. Tambahkan gedung asrama dengan membedakan kategori <em>Putra (Banin)</em> atau <em>Putri (Banat)</em>.</li>
                        <li>Tambahkan kamar dengan spesifikasi lengkap: <strong>Nama Kamar</strong>, <strong>Lantai</strong>, <strong>Kapasitas Kasur</strong>, penugasan <strong>Musyrif Pembina</strong>, serta <strong>Ketua Kamar (Rais Ghorfah)</strong>.</li>
                        <li><strong>Inventarisasi Fasilitas:</strong> Catat daftar fasilitas (ranjang susun, lemari, kipas angin) serta status kelayakan fisik (<em>Baik</em>, <em>Cukup</em>, atau <em>Perlu Perbaikan</em>).</li>
                        <li><strong>Cetak Label Pintu Kamar (Door Tag):</strong> Klik tombol <em>Label Pintu</em> untuk mencetak lembar resmi siap tempel di pintu kamar (lengkap dengan kop pondok, nama musyrif, ketua kamar, dan daftar nomor urut penghuni).</li>
                    </ul>
                )
            },
            {
                title: 'Penempatan Cepat & Mutasi Santri (1-Klik)',
                content: (
                    <ul className="list-disc pl-5 space-y-1 text-sm mt-1">
                        <li><strong>Penempatan Santri Baru:</strong> Pada tab <em>Penempatan &amp; Mutasi</em>, centang santri dari kolom kiri "Santri Tanpa Kamar", lalu klik tombol <em>Tempatkan</em> pada kartu kamar tujuan. Sistem otomatis memvalidasi kesesuaian gender dan sisa kapasitas kasur.</li>
                        <li><strong>Pencarian Lokasi Santri:</strong> Gunakan kotak pencarian cepat di bagian atas untuk menemukan posisi kamar santri mana saja secara instan.</li>
                        <li><strong>Mutasi / Pindah Kamar Cepat:</strong> Klik ikon <em>Pindah</em> pada baris santri untuk memindahkan santri ke kamar lain dalam satu klik tanpa harus mengeluarkan dan mencari ulang santri.</li>
                        <li><strong>Tunjuk Ketua Kamar (Rais Ghorfah):</strong> Klik ikon bintang di samping nama santri untuk menetapkannya sebagai penanggung jawab ketertiban kamar.</li>
                        <li><strong>Kosongkan Kamar Massal:</strong> Gunakan tombol <em>Kosongkan</em> pada header kartu kamar untuk mereset seluruh penghuni kamar menjelang pergantian semester atau renovasi kamar.</li>
                    </ul>
                )
            },
            {
                title: 'Inspeksi Kebersihan Kamar (Sidak Nadhafah)',
                content: (
                    <ul className="list-disc pl-5 space-y-1 text-sm mt-1">
                        <li>Buka tab <strong>Jurnal &amp; Inspeksi &gt; Inspeksi Kebersihan Kamar</strong>.</li>
                        <li>Pilih tanggal sidak dan kamar yang dinilai, lalu tentukan nilai (0-100) untuk 3 kriteria utama: <em>Kebersihan Lantai &amp; Ruangan</em>, <em>Kerapian Kasur &amp; Lemari</em>, dan <em>Kedisiplinan &amp; Ketertiban</em>.</li>
                        <li>Sistem otomatis menghitung skor rata-rata dan menentukan predikat nilai: <strong>Mumtaz</strong> (≥90), <strong>Jayyid Jiddan</strong> (≥80), <strong>Jayyid</strong> (≥70), <strong>Maqbul</strong> (≥60), atau <strong>Rasib</strong> (&lt;60).</li>
                        <li>Hasil sidak otomatis membentuk <strong>Peringkat Kamar Terbersih (Top 5)</strong> di Dashboard Asrama untuk penentuan piala bergilir atau penghargaan kamar teladan pekanan.</li>
                    </ul>
                )
            },
            {
                title: 'Jurnal Pembinaan & Catatan Harian Musyrif',
                content: (
                    <ul className="list-disc pl-5 space-y-1 text-sm mt-1">
                        <li>Buka sub-tab <strong>Jurnal Pembinaan &amp; Catatan Musyrif</strong> untuk mendokumentasikan rutinitas pengasuhan harian.</li>
                        <li>Pilih kategori kegiatan: <em>Kebersihan (Roan)</em>, <em>Kedisiplinan (Bangun Subuh/Jam Malam)</em>, <em>Pembinaan Adab</em>, <em>Kunjungan Wali Santri</em>, atau <em>P3K Ringan Kamar</em>.</li>
                        <li>Tuliskan uraian kejadian secara objektif beserta arahan/tindakan yang telah diambil musyrif pembina.</li>
                        <li>Riwayat jurnal tersimpan rapi dan dapat ditinjau oleh pimpinan pondok atau bagian kepengasuhan santri pusat.</li>
                    </ul>
                )
            },
            {
                title: 'SOP Keamanan Sesi & Logout di Perangkat Piket',
                color: 'red',
                content: (
                    <div className="bg-rose-50 p-3 rounded-xl border border-rose-200 text-xs text-rose-950 space-y-2">
                        <strong><i className="bi bi-shield-exclamation text-rose-600 mr-1"></i> SOP Wajib bagi Musyrif Piket Asrama:</strong>
                        <ul className="list-disc pl-5 space-y-1">
                            <li><strong>Perangkat Bersama:</strong> Jika musyrif menggunakan PC / tablet piket asrama yang dipakai bergantian antar regu jaga, <strong>WAJIB LOGOUT</strong> setiap kali pergantian shift atau meninggalkan meja piket.</li>
                            <li><strong>Cegah Salah Akun:</strong> Jangan biarkan sesi akun Anda terbuka agar mutasi kamar, sidak kebersihan, dan catatan jurnal tidak tercatat atas nama musyrif yang salah pada audit trail.</li>
                            <li><strong>Jika Lupa Logout:</strong> Buka menu profil akun di pojok kanan atas, klik <strong>Keluar / Logout</strong>, atau lakukan <em>Clear Data Sesi</em> jika berpindah perangkat.</li>
                        </ul>
                    </div>
                )
            }
        ]
    },
    {
        id: 'admin',
        badge: 11,
        badgeColor: 'teal',
        title: 'Penerimaan Santri Baru (PSB)',
        steps: [
            {
                title: 'Ikhtisar Arsitektur Penerimaan Santri Baru (PSB)',
                content: (
                    <div className="space-y-3 text-sm text-gray-700">
                        <div className="bg-teal-50 p-4 rounded-xl border border-teal-200 text-xs text-teal-950 space-y-2.5">
                            <h5 className="font-bold flex items-center gap-2 text-teal-900 text-sm">
                                <i className="bi bi-compass-fill text-teal-700 text-base"></i>
                                Alur 6 Tahap Penerimaan Santri Baru di Pesantren
                            </h5>
                            <p className="leading-relaxed text-gray-700">
                                Modul PSB eSantri Web dirancang untuk menangani pendaftaran santri baru secara fleksibel (Offline di posko pondok, Online via Google Sheets &amp; Drive, maupun Semi-Online via WhatsApp):
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-6 gap-2 pt-1 text-center font-medium">
                                <div className="bg-white p-2 rounded-lg border border-teal-200 shadow-2xs">
                                    <span className="w-5 h-5 mx-auto bg-teal-700 text-white rounded-full flex items-center justify-center text-[10px] font-bold mb-1">1</span>
                                    <strong className="text-teal-950 block text-[11px]">Desain Form</strong>
                                    <span className="text-[10px] text-gray-500">Susun Kolom &amp; Tema</span>
                                </div>
                                <div className="bg-white p-2 rounded-lg border border-teal-200 shadow-2xs">
                                    <span className="w-5 h-5 mx-auto bg-teal-700 text-white rounded-full flex items-center justify-center text-[10px] font-bold mb-1">2</span>
                                    <strong className="text-teal-950 block text-[11px]">Deploy Script</strong>
                                    <span className="text-[10px] text-gray-500">Spreadsheet &amp; GAS</span>
                                </div>
                                <div className="bg-white p-2 rounded-lg border border-teal-200 shadow-2xs">
                                    <span className="w-5 h-5 mx-auto bg-teal-700 text-white rounded-full flex items-center justify-center text-[10px] font-bold mb-1">3</span>
                                    <strong className="text-teal-950 block text-[11px]">Publikasi Form</strong>
                                    <span className="text-[10px] text-gray-500">File HTML Mandiri</span>
                                </div>
                                <div className="bg-white p-2 rounded-lg border border-teal-200 shadow-2xs">
                                    <span className="w-5 h-5 mx-auto bg-teal-700 text-white rounded-full flex items-center justify-center text-[10px] font-bold mb-1">4</span>
                                    <strong className="text-teal-950 block text-[11px]">Tarik Data</strong>
                                    <span className="text-[10px] text-gray-500">Sync Google Sheet</span>
                                </div>
                                <div className="bg-white p-2 rounded-lg border border-teal-200 shadow-2xs">
                                    <span className="w-5 h-5 mx-auto bg-teal-700 text-white rounded-full flex items-center justify-center text-[10px] font-bold mb-1">5</span>
                                    <strong className="text-teal-950 block text-[11px]">Cetak &amp; Ujian</strong>
                                    <span className="text-[10px] text-gray-500">Kartu &amp; Berkas F-PSB</span>
                                </div>
                                <div className="bg-white p-2 rounded-lg border border-teal-200 shadow-2xs">
                                    <span className="w-5 h-5 mx-auto bg-teal-700 text-white rounded-full flex items-center justify-center text-[10px] font-bold mb-1">6</span>
                                    <strong className="text-teal-950 block text-[11px]">Kelulusan</strong>
                                    <span className="text-[10px] text-gray-500">Konversi ke Santri</span>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                            <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-2xs space-y-1">
                                <span className="font-bold text-teal-800 flex items-center gap-1.5 text-xs">
                                    <i className="bi bi-cloud-arrow-up-fill text-teal-600"></i> Mode Hybrid (Rekomendasi)
                                </span>
                                <p className="text-[11px] text-gray-600 leading-relaxed">
                                    Data formulir tersimpan otomatis ke Google Spreadsheet panitia, berkas digital (KK, Foto, Akta) masuk ke Google Drive, dan konfirmasi pendaftaran disiapkan via WhatsApp.
                                </p>
                            </div>
                            <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-2xs space-y-1">
                                <span className="font-bold text-teal-800 flex items-center gap-1.5 text-xs">
                                    <i className="bi bi-file-earmark-spreadsheet-fill text-teal-600"></i> Mode Google Sheet Murni
                                </span>
                                <p className="text-[11px] text-gray-600 leading-relaxed">
                                    Cocok jika panitia hanya ingin menerima data langsung ke tabel Google Spreadsheet tanpa mewajibkan pengiriman notifikasi WhatsApp ke HP panitia.
                                </p>
                            </div>
                            <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-2xs space-y-1">
                                <span className="font-bold text-teal-800 flex items-center gap-1.5 text-xs">
                                    <i className="bi bi-whatsapp text-emerald-600"></i> Mode WhatsApp / Offline
                                </span>
                                <p className="text-[11px] text-gray-600 leading-relaxed">
                                    Pendaftar mengirimkan kode teks <code>PSB_START...PSB_END</code> ke WhatsApp resmi pondok, lalu panitia memasukkannya via tombol <em>Impor WA</em> di aplikasi.
                                </p>
                            </div>
                        </div>
                    </div>
                )
            },
            {
                title: '1. Desain Formulir Online & Pembuatan File HTML Mandiri',
                content: (
                    <div className="space-y-3 text-sm text-gray-700">
                        <p>
                            Menu <strong>PSB &gt; Desain Formulir Online</strong> memungkinkan panitia menyusun formulir pendaftaran interaktif yang dapat dibagikan kepada calon wali santri:
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                            <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 space-y-2">
                                <strong className="text-gray-800 flex items-center gap-1.5 font-bold">
                                    <i className="bi bi-sliders2 text-teal-700"></i> Kustomisasi Bidang &amp; Berkas
                                </strong>
                                <ul className="list-disc pl-4 space-y-1 text-gray-600 text-[11px]">
                                    <li>Pilih kolom aktif (Biodata Santri, NISN, NIK, Tempat/Tanggal Lahir, Alamat).</li>
                                    <li>Pilih identitas orang tua/wali dan nomor WhatsApp untuk notifikasi.</li>
                                    <li><strong>Petunjuk Isian (Field Hints):</strong> Tentukan teks petunjuk di bawah setiap pertanyaan (contoh: <em>"10 digit angka NISN resmi"</em>, <em>"Nomor WhatsApp aktif wali untuk konfirmasi berkas"</em>) agar format isian wali santri seragam.</li>
                                    <li>Atur dokumen yang wajib diunggah (Kartu Keluarga, Akta Kelahiran, Pas Foto 3x4, Ijazah, KIP/PKH).</li>
                                    <li>Gunakan <strong>Template Formulir</strong> berbeda per jenjang pendidikan (misal: Form MTs vs Form MA).</li>
                                </ul>
                            </div>
                            <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 space-y-2">
                                <strong className="text-gray-800 flex items-center gap-1.5 font-bold">
                                    <i className="bi bi-palette-fill text-teal-700"></i> Tema Desain &amp; File Standalone
                                </strong>
                                <ul className="list-disc pl-4 space-y-1 text-gray-600 text-[11px]">
                                    <li>Pilih tema tampilan formulir: <em>Klasik Tradisional</em>, <em>Modern Tech</em>, <em>Bold Clean</em>, atau <em>Ceria (TPQ/TK)</em>.</li>
                                    <li>Klik tombol <strong>Download Formulir (.html)</strong> untuk mendapatkan 1 file mandiri.</li>
                                    <li>File HTML mandiri dapat diupload ke website resmi pondok, disematkan dalam iframe, atau dibagikan langsung ke grup WhatsApp wali calon santri tanpa perlu sewa server web berbayar.</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                )
            },
            {
                title: '2. Panduan Pasang Google Apps Script (GAS) Web App',
                content: (
                    <div className="space-y-3 text-sm text-gray-700">
                        <div className="bg-teal-50 p-3.5 rounded-xl border border-teal-200 text-xs text-teal-950 space-y-1.5">
                            <div className="font-bold flex items-center gap-1.5 text-teal-900">
                                <i className="bi bi-shield-lock-fill text-teal-700"></i>
                                Mengapa Menggunakan Google Apps Script?
                            </div>
                            <p className="text-[11px] text-gray-700 leading-relaxed">
                                Google Apps Script (GAS) berfungsi sebagai jembatan gratis dan aman antara formulir online HTML dengan Google Spreadsheet &amp; Google Drive panitia. Satu script GAS dapat melayani banyak jenis formulir pendaftaran sekaligus tanpa repot.
                            </p>
                        </div>

                        <div className="bg-gray-50 border border-gray-200 rounded-xl p-3.5 space-y-2.5 text-xs">
                            <h6 className="font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                                <i className="bi bi-list-ol text-teal-700"></i> Langkah Demi Langkah Pemasangan:
                            </h6>
                            <ol className="list-decimal pl-4 space-y-2 text-gray-700 text-[11px] leading-relaxed">
                                <li>
                                    <strong>Buka Spreadsheet Panitia:</strong> Buat 1 Google Spreadsheet kosong di akun Google panitia PSB (misal bernama <em>"Database PSB eSantri 2026"</em>).
                                </li>
                                <li>
                                    <strong>Buka Script Editor:</strong> Klik menu <strong>Ekstensi (Extensions) &gt; Apps Script</strong>.
                                </li>
                                <li>
                                    <strong>Salin Kode Script:</strong> Buka tab <strong>Desain Formulir Online</strong> di aplikasi eSantri, klik <em>Kode Script GAS &amp; Panduan Alur</em>, lalu klik <strong>Salin Kode Script</strong>. Hapus semua kode default di file <code>Code.gs</code> Google Spreadsheet, lalu tempelkan kode yang telah disalin.
                                </li>
                                <li>
                                    <strong>Deployment sebagai Web App:</strong>
                                    <div className="mt-1 p-2.5 bg-white rounded-lg border border-gray-300 space-y-1 text-gray-800">
                                        <p>• Klik tombol biru <strong>Deploy &gt; Deployment Baru (New Deployment)</strong> di pojok kanan atas.</p>
                                        <p>• Pada ikon gerigi jenis deployment, pilih <strong>Aplikasi Web (Web App)</strong>.</p>
                                        <p>• Kolom <em>Deskripsi</em>: Isi dengan <code>Web App PSB Pesantren</code>.</p>
                                        <p>• Kolom <em>Jalankan sebagai (Execute as)</em>: Pilih <strong>Saya (email akun Google Anda)</strong>.</p>
                                        <p>• Kolom <em>Siapa yang memiliki akses (Who has access)</em>: Wajib pilih <strong className="text-teal-900 bg-teal-100 px-1 rounded">Siapa Saja (Anyone)</strong>.</p>
                                    </div>
                                </li>
                                <li>
                                    <strong>Otorisasi Akses:</strong> Klik <strong>Deploy</strong>. Jika muncul jendela <em>Authorization Required</em>, klik <em>Review Permissions</em> &gt; pilih akun Google Anda &gt; klik <em>Advanced (Lanjutan)</em> &gt; klik <em>Go to ... (unsafe) / Buka script</em> &gt; klik <strong>Allow (Izinkan)</strong>.
                                </li>
                                <li>
                                    <strong>Salin URL Deployment:</strong> Salin URL Web App yang berakhiran <code>/exec</code>, lalu tempelkan ke kolom URL di tab <em>Desain Formulir</em> atau modal <em>Koneksi Google Sheet</em> di tab Rekap.
                                </li>
                            </ol>
                        </div>
                    </div>
                )
            },
            {
                title: '3. Konfigurasi Folder Google Drive untuk Berkas Pendaftar',
                content: (
                    <div className="space-y-3 text-sm text-gray-700">
                        <div className="bg-amber-50 p-3.5 rounded-xl border border-amber-200 text-xs text-amber-950 space-y-1.5">
                            <div className="font-bold flex items-center gap-1.5 text-amber-900">
                                <i className="bi bi-folder-symlink-fill text-amber-600"></i>
                                Mengapa Perlu Menentukan Folder Khusus di Google Drive?
                            </div>
                            <p className="text-[11px] text-gray-700 leading-relaxed">
                                Secara bawaan, jika ID folder tidak ditentukan, berkas yang diunggah calon santri (KK, Ijazah, Foto, Akta) akan tersimpan di halaman utama <em>"Drive Saya"</em>. Menentukan folder khusus (misal <code>Berkas PSB 2026</code>) membuat arsip pendaftaran rapi, mudah dibagikan kepada sesama panitia posko, dan tidak tercampur berkas pribadi.
                            </p>
                        </div>

                        <div className="bg-gray-50 border border-gray-200 rounded-xl p-3.5 space-y-2 text-xs">
                            <h6 className="font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                                <i className="bi bi-gear-wide-connected text-teal-700"></i> Cara Mengarahkan Berkas ke Folder Tertentu:
                            </h6>
                            <ol className="list-decimal pl-4 space-y-2 text-gray-700 text-[11px]">
                                <li>
                                    Buka Google Drive (<a href="https://drive.google.com" target="_blank" rel="noreferrer" className="text-teal-700 underline font-semibold">drive.google.com</a>) dengan akun Google yang sama.
                                </li>
                                <li>
                                    Klik <strong>Baru &gt; Folder Baru</strong>, beri nama misalnya <strong>"Berkas PSB 2026"</strong>.
                                </li>
                                <li>
                                    Buka folder tersebut, lalu perhatikan address bar browser Anda. Salin serangkaian kode unik setelah <code>folders/</code>:
                                    <div className="mt-1 p-2 bg-white rounded-lg border border-gray-300 font-mono text-[11px] text-gray-800 break-all">
                                        drive.google.com/drive/folders/<span className="bg-amber-100 font-bold text-amber-950 px-1 rounded">1a2B3c4D5e_CONTOH_ID_FOLDER_6f7G</span>
                                    </div>
                                </li>
                                <li>
                                    Kembali ke editor Google Apps Script (<code>Code.gs</code>), cari baris di bagian atas fungsi <code>doPost</code>:
                                    <div className="mt-1 p-2 bg-slate-900 text-emerald-300 font-mono text-[11px] rounded-lg">
                                        var folderId = <span className="text-amber-300">"1a2B3c4D5e_CONTOH_ID_FOLDER_6f7G"</span>;
                                    </div>
                                </li>
                                <li>
                                    Klik <strong>Simpan (ikon disket)</strong>, lalu klik <strong>Deploy &gt; Kelola Deployment &gt; Edit (ikon pensil) &gt; Versi: Baru &gt; Deploy</strong> agar perubahan folder aktif.
                                </li>
                            </ol>
                        </div>

                        <div className="bg-teal-50 p-3 rounded-xl border border-teal-200 text-xs space-y-1">
                            <span className="font-bold text-teal-900 flex items-center gap-1.5">
                                <i className="bi bi-magic text-teal-700"></i> Otomasi Cerdas Berkas Pendaftar:
                            </span>
                            <ul className="list-disc pl-4 text-[11px] text-teal-950 space-y-1">
                                <li><strong>Penamaan Otomatis (Smart Naming):</strong> Berkas otomatis direname rapi sesuai jenis dokumen dan nama santri, misal <code>kk-muhammad-fauzi-20260908-143022.pdf</code>.</li>
                                <li><strong>Izin Akses Terbuka (Public View):</strong> Tautan berkas otomatis disetel agar dapat dibuka langsung oleh panitia di modal verifikasi formulir fisik tanpa hambatan login akun.</li>
                            </ul>
                        </div>
                    </div>
                )
            },
            {
                title: '4. Sinkronisasi & Penarikan Data Pendaftar (Tarik Google Sheet)',
                content: (
                    <div className="space-y-3 text-sm text-gray-700">
                        <p>
                            Setelah calon santri mengisi formulir online, data akan tersimpan di Google Spreadsheet. Panitia dapat menarik data tersebut ke dalam aplikasi eSantri Web kapan saja:
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                            <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 space-y-1.5">
                                <strong className="text-gray-800 flex items-center gap-1.5 font-bold">
                                    <i className="bi bi-arrow-repeat text-teal-700"></i> Tombol "Tarik Google Sheet"
                                </strong>
                                <p className="text-[11px] text-gray-600 leading-relaxed">
                                    Buka tab <strong>Rekap PSB</strong>, lalu klik tombol <em>"Tarik Google Sheet"</em>. Sistem akan menghubungi Web App Google Apps Script dan mengunduh seluruh baris data baru secara real-time.
                                </p>
                            </div>
                            <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 space-y-1.5">
                                <strong className="text-gray-800 flex items-center gap-1.5 font-bold">
                                    <i className="bi bi-database-check text-teal-700"></i> Dukungan Kolom Kustom (Custom Fields)
                                </strong>
                                <p className="text-[11px] text-gray-600 leading-relaxed">
                                    Jika formulir pendaftaran Anda memuat pertanyaan khusus (seperti <em>Ukuran Seragam, Riwayat Penyakit, Golongan Darah, Catatan Khusus</em>), data tersebut otomatis disimpan ke properti <code>customData</code> dan ikut tercetak di lembar formulir fisik.
                                </p>
                            </div>
                        </div>

                        <div className="bg-blue-50 border border-blue-200 p-3 rounded-xl text-xs text-blue-950">
                            <strong>💡 Keamanan Anti-Duplikasi:</strong> Sistem eSantri secara cerdas memeriksa NISN dan NIK pendaftar. Jika pendaftar sudah pernah ditarik sebelumnya, data pendaftar tidak akan terduplikasi di aplikasi.
                        </div>
                    </div>
                )
            },
            {
                title: '5. Cetak Berkas Fisik (F-PSB) & Kartu Ujian Masuk',
                content: (
                    <div className="space-y-3 text-sm text-gray-700">
                        <p>
                            Untuk kebutuhan operasional posko pendaftaran di pesantren, eSantri menyediakan fitur cetak dokumen resmi berstandar cetak:
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                            <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 space-y-1.5">
                                <strong className="text-gray-800 flex items-center gap-1.5 font-bold">
                                    <i className="bi bi-file-earmark-text-fill text-teal-700"></i> Formulir Resmi Pendaftaran (F-PSB)
                                </strong>
                                <p className="text-[11px] text-gray-600 leading-relaxed">
                                    Klik tombol cetak formulir pada baris pendaftar. Menghasilkan lembar F-PSB lengkap dengan kop pesantren, nomor registrasi, pas foto, biodata santri &amp; wali, tabel data tambahan kustom, serta <strong>Checklist Verifikasi Berkas Fisik</strong> untuk panitia meja verifikasi.
                                </p>
                            </div>
                            <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 space-y-1.5">
                                <strong className="text-gray-800 flex items-center gap-1.5 font-bold">
                                    <i className="bi bi-card-heading text-teal-700"></i> Kartu Peserta Ujian Masuk
                                </strong>
                                <p className="text-[11px] text-gray-600 leading-relaxed">
                                    Menghasilkan kartu tanda peserta ujian seleksi berukuran saku. Memuat nomor tes, ruang ujian, jadwal materi ujian (Baca Kitab, Tahfizh, Potensi Akademik), pas foto, barcode registrasi, dan kolom paraf penguji.
                                </p>
                            </div>
                        </div>
                    </div>
                )
            },
            {
                title: '6. Standar Alur Kerja Multi-Admin (Arsitektur Hub & Spoke & SOP Firebase Realtime)',
                color: 'teal',
                content: (
                    <div className="space-y-3.5 text-sm text-gray-700">
                        {/* Hub and Spoke Architecture Diagram & Concept */}
                        <div className="bg-gradient-to-br from-teal-900 to-slate-900 p-4 rounded-xl text-white space-y-3 shadow-sm">
                            <div className="flex items-center justify-between">
                                <span className="px-2.5 py-0.5 rounded-full bg-teal-400/20 text-teal-300 text-[10px] font-mono font-bold tracking-wide uppercase border border-teal-400/30">
                                    Arsitektur Sistem Terdistribusi
                                </span>
                                <span className="text-[11px] text-teal-200/80 flex items-center gap-1">
                                    <i className="bi bi-broadcast"></i> WebSocket Real-Time Sync
                                </span>
                            </div>
                            <div>
                                <h4 className="font-bold text-base text-white flex items-center gap-2">
                                    <i className="bi bi-diagram-3-fill text-teal-400"></i> Topologi Hub &amp; Spoke Multi-Admin PSB
                                </h4>
                                <p className="text-xs text-slate-300 leading-relaxed mt-1">
                                    Untuk menangani ratusan pendaftar serentak tanpa tabrakan data, eSantri Web menerapkan model <strong>Hub and Spoke</strong> terhubung ke cloud database real-time:
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 text-xs">
                                <div className="bg-white/10 p-3 rounded-lg border border-white/15 space-y-1.5 backdrop-blur-xs">
                                    <div className="flex items-center gap-1.5 text-teal-300 font-bold">
                                        <i className="bi bi-hdd-network-fill text-sm"></i>
                                        <span>HUB (Pusat Data &amp; Server Realtime)</span>
                                    </div>
                                    <p className="text-[11px] text-slate-300 leading-relaxed">
                                        Berperan sebagai <em>Single Source of Truth (SSOT)</em>. Menerima mutasi data secara stream dari semua posko, memvalidasi kuota jenjang, mengelola counter nomor registrasi atomik, dan menyalurkan delta-update ke seluruh spoke dalam &lt; 100ms.
                                    </p>
                                </div>
                                <div className="bg-white/10 p-3 rounded-lg border border-white/15 space-y-1.5 backdrop-blur-xs">
                                    <div className="flex items-center gap-1.5 text-emerald-300 font-bold">
                                        <i className="bi bi-laptop-fill text-sm"></i>
                                        <span>SPOKES (Terminal Laptop/Tablet Posko)</span>
                                    </div>
                                    <p className="text-[11px] text-slate-300 leading-relaxed">
                                        Setiap meja/staf (Resepsionis, Verifikator Berkas, Penguji Ujian, Bendahara) adalah <em>Spoke Node</em> mandiri. Didukung <em>Offline-First Cache</em> (IndexedDB/LocalStorage) sehingga jika internet pondok goyang, input formulir dan nilai tetap lancar tanpa macet.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Matriks Peran Multi-Admin */}
                        <div className="bg-teal-50 p-4 rounded-xl border border-teal-200 text-xs space-y-3">
                            <strong className="text-teal-900 font-bold block text-sm flex items-center gap-2">
                                <i className="bi bi-people-fill text-teal-700"></i> Matriks Peran &amp; Pembagian Kerja Tim Posko PSB
                            </strong>
                            <p className="text-[11px] text-gray-700 leading-relaxed">
                                Pembagian peran terarah memastikan setiap admin memiliki wewenang fokus sesuai meja pelayanannya:
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                                <div className="bg-white p-3 rounded-lg border border-teal-200 shadow-2xs space-y-1">
                                    <span className="font-bold text-teal-950 flex items-center gap-1.5 text-xs">
                                        <i className="bi bi-person-badge-fill text-teal-700"></i> 1. Ketua / Koordinator PSB (Hub Master)
                                    </span>
                                    <ul className="list-disc pl-4 text-[11px] text-gray-600 space-y-0.5">
                                        <li>Menentukan kuota penerimaan per jenjang dan batas tanggal gelombang pendaftaran.</li>
                                        <li>Mengonfigurasi skrip sync Google Sheets / cloud realtime database.</li>
                                        <li>Menetapkan ambang kelulusan seleksi, menandatangani SK resmi, dan ekspor laporan final.</li>
                                    </ul>
                                </div>
                                <div className="bg-white p-3 rounded-lg border border-teal-200 shadow-2xs space-y-1">
                                    <span className="font-bold text-teal-950 flex items-center gap-1.5 text-xs">
                                        <i className="bi bi-clipboard2-check-fill text-blue-700"></i> 2. Meja Verifikasi &amp; Resepsionis Posko
                                    </span>
                                    <ul className="list-disc pl-4 text-[11px] text-gray-600 space-y-0.5">
                                        <li>Menerima wali santri di posko, mencocokkan kelengkapan berkas fisik (KK, Akta, Ijazah).</li>
                                        <li>Mencetak formulir pendaftaran fisik F-PSB dan Kartu Tanda Peserta Ujian Seleksi.</li>
                                        <li>Melakukan approval berkas dan mengirim notifikasi konfirmasi via WhatsApp panitia.</li>
                                    </ul>
                                </div>
                                <div className="bg-white p-3 rounded-lg border border-teal-200 shadow-2xs space-y-1">
                                    <span className="font-bold text-teal-950 flex items-center gap-1.5 text-xs">
                                        <i className="bi bi-journal-bookmark-fill text-purple-700"></i> 3. Meja Penguji Seleksi &amp; Asatidz (Examiner)
                                    </span>
                                    <ul className="list-disc pl-4 text-[11px] text-gray-600 space-y-0.5">
                                        <li>Menguji materi: Tahfizh Qur'an, Tajwid, Fashahah, Baca Kitab/Imla, dan Potensi Akademik.</li>
                                        <li>Menginput nilai ujian seleksi per mata uji (kalkulasi rata-rata otomatis terupdate ke Hub).</li>
                                        <li>Memberikan catatan rekomendasi penempatan asrama/halaqah khusus santri berprestasi.</li>
                                    </ul>
                                </div>
                                <div className="bg-white p-3 rounded-lg border border-teal-200 shadow-2xs space-y-1">
                                    <span className="font-bold text-teal-950 flex items-center gap-1.5 text-xs">
                                        <i className="bi bi-cash-coin text-emerald-700"></i> 4. Meja Kasir &amp; Bendahara PSB
                                    </span>
                                    <ul className="list-disc pl-4 text-[11px] text-gray-600 space-y-0.5">
                                        <li>Memverifikasi bukti transfer infak formulir dari pendaftaran online.</li>
                                        <li>Menerima pembayaran tunai biaya pendaftaran dan uang pangkal daftar ulang di kasir posko.</li>
                                        <li>Mencetak kuitansi pembayaran resmi berkode registrasi santri.</li>
                                    </ul>
                                </div>
                            </div>
                        </div>

                        {/* SOP Real-Time Multi-Admin */}
                        <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3 text-xs">
                            <strong className="text-gray-900 font-bold block text-sm flex items-center gap-2">
                                <i className="bi bi-shield-check text-emerald-600 text-base"></i> Standar Operasional Prosedur (SOP) Sinkronisasi Real-Time
                            </strong>
                            
                            <div className="space-y-2.5">
                                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                                    <span className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                                        <span className="w-5 h-5 rounded-full bg-teal-700 text-white flex items-center justify-center text-[11px] font-bold">1</span>
                                        SOP Pencegahan Tabrakan Nomor Registrasi (Anti-Collision ID)
                                    </span>
                                    <p className="text-[11px] text-gray-600 pl-6 leading-relaxed">
                                        Nomor registrasi diterbitkan dengan format terstandar berurutan berbasis tahun, jenjang, dan sequence counter di tingkat Hub (misal: <code>REG-2026-MTS-0089</code>). Saat dua posko mendaftarkan calon santri di detik yang sama, sistem menggunakan timestamp UNIX berpresisi milidetik sehingga tidak terjadi duplikasi registrasi.
                                    </p>
                                </div>

                                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                                    <span className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                                        <span className="w-5 h-5 rounded-full bg-teal-700 text-white flex items-center justify-center text-[11px] font-bold">2</span>
                                        SOP Penanganan Konflik Data (Field-Level Patching &amp; LWW)
                                    </span>
                                    <p className="text-[11px] text-gray-600 pl-6 leading-relaxed">
                                        Sistem menggunakan metode perbaruan tingkat field (Field-Level Patching), bukan menimpa satu baris penuh. Jika Meja Verifikasi mengupdate status berkas sementara Meja Penguji menginput nilai ujian santri yang sama, kedua pembaruan otomatis digabungkan tanpa saling menimpa. Jika field yang sama diubah bersamaan, timestamp terakhir (Last Write Wins) dengan riwayat jejak audit (Audit Trail) diberlakukan.
                                    </p>
                                </div>

                                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                                    <span className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                                        <span className="w-5 h-5 rounded-full bg-teal-700 text-white flex items-center justify-center text-[11px] font-bold">3</span>
                                        SOP Rekonsiliasi Akhir Hari (End-of-Day Reconciliation)
                                    </span>
                                    <p className="text-[11px] text-gray-600 pl-6 leading-relaxed">
                                        Setiap hari kerja pada pukul 17.00 WIB sebelum posko tutup, Koordinator PSB melakukan rekonsiliasi dengan menekan tombol <strong>Tarik Sheet</strong> untuk memastikan seluruh data Google Spreadsheet selaras, mencocokkan rekap kas masuk bendahara, lalu menekan <strong>Unduh Arsip ZIP</strong> untuk membuat backup harian berkas digital.
                                    </p>
                                </div>

                                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                                    <span className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                                        <span className="w-5 h-5 rounded-full bg-teal-700 text-white flex items-center justify-center text-[11px] font-bold">4</span>
                                        Protokol Darurat Kegagalan Internet Posko (Offline Failover)
                                    </span>
                                    <p className="text-[11px] text-gray-600 pl-6 leading-relaxed">
                                        Jika jaringan internet posko pondok padam total, seluruh terminal Spoke tetap dapat menerima pendaftaran dan menginput nilai secara offline di browser. Saat internet kembali aktif, terminal secara otomatis mem-push antrean data lokal ke Hub cloud database secara transparan.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Konversi Otomatis */}
                        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 space-y-1.5 text-xs">
                            <strong className="text-emerald-950 font-bold flex items-center gap-1.5">
                                <i className="bi bi-check2-circle text-emerald-700 text-base"></i> Konversi Otomatis Menjadi Santri Aktif &amp; Keuangan
                            </strong>
                            <p className="text-[11px] text-emerald-900 leading-relaxed">
                                Begitu proses seleksi tuntas dan pendaftar dinyatakan lulus, satu klik tombol <strong>"Terima Santri"</strong> di tab Rekap akan:
                            </p>
                            <ol className="list-decimal pl-4 text-[11px] text-emerald-900 space-y-1">
                                <li>Memasukkan calon santri ke <strong>Database Master Santri Aktif</strong> lengkap dengan NIS baru.</li>
                                <li>Menerbitkan tagihan uang pangkal / daftar ulang di Modul Keuangan santri baru.</li>
                                <li>Membuka draf pengumuman kelulusan resmi via WhatsApp kepada wali santri secara otomatis.</li>
                            </ol>
                        </div>
                    </div>
                )
            },
            {
                title: '7. Export Laporan Pengumuman Hasil Seleksi (PDF) & Kustomisasi Catatan',
                content: (
                    <div className="space-y-3 text-sm text-gray-700">
                        <p className="leading-relaxed">
                            Untuk keperluan publikasi pengumuman hasil seleksi kepada calon wali santri dan arsip resmi posko, eSantri Web menyediakan fitur <strong>Dokumen Pengumuman Kelulusan PDF</strong> berstandar cetak:
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                            <div className="bg-white p-3 rounded-xl border border-teal-200 shadow-2xs space-y-1">
                                <strong className="text-teal-900 text-xs flex items-center gap-1.5">
                                    <i className="bi bi-file-earmark-check-fill text-teal-600"></i> Tabel Santri DITERIMA
                                </strong>
                                <p className="text-[11px] text-gray-600 leading-relaxed">
                                    Menampilkan daftar peserta lulus, nomor registrasi, asal sekolah, nilai ujian, serta petunjuk daftar ulang dan narahubung panitia.
                                </p>
                            </div>
                            <div className="bg-white p-3 rounded-xl border border-amber-200 shadow-2xs space-y-1">
                                <strong className="text-amber-900 text-xs flex items-center gap-1.5">
                                    <i className="bi bi-clock-history text-amber-600"></i> Tabel CADANGAN
                                </strong>
                                <p className="text-[11px] text-gray-600 leading-relaxed">
                                    Menampilkan peserta cadangan yang berpeluang dipanggil jika terdapat kuota yang mengundurkan diri beserta tenggat waktu konfirmasi.
                                </p>
                            </div>
                            <div className="bg-white p-3 rounded-xl border border-red-200 shadow-2xs space-y-1">
                                <strong className="text-red-900 text-xs flex items-center gap-1.5">
                                    <i className="bi bi-file-earmark-x-fill text-red-600"></i> Tabel TIDAK DITERIMA
                                </strong>
                                <p className="text-[11px] text-gray-600 leading-relaxed">
                                    Menampilkan calon santri yang belum memenuhi kriteria dengan redaksi santun, doa, dan arahan gelombang berikutnya atau pengembalian berkas.
                                </p>
                            </div>
                        </div>

                        <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-3.5 space-y-2 text-xs">
                            <strong className="text-amber-950 font-bold flex items-center gap-1.5">
                                <i className="bi bi-pencil-square text-amber-600"></i> Fitur Kustomisasi Catatan Pengumuman (Editable Notes)
                            </strong>
                            <p className="text-[11px] text-gray-700 leading-relaxed">
                                Klik tombol <strong>"Edit Catatan Tabel"</strong> pada bagian atas modal dokumen pengumuman untuk menyesuaikan isi catatan resmi:
                            </p>
                            <ul className="list-disc pl-4 text-[11px] text-gray-700 space-y-1">
                                <li><strong>Poin Petunjuk Santri Diterima:</strong> Bebas menambah, mengedit, atau menghapus poin jadwal pembayaran, berkas yang wajib dibawa saat sowan, dan kontak narahubung posko.</li>
                                <li><strong>Catatan Santri Cadangan &amp; Ditolak:</strong> Redaksi dapat disesuaikan dengan kultur dan kebijakan pesantren.</li>
                                <li><strong>Catatan Tambahan Panitia:</strong> Kolom catatan bebas untuk informasi pengarahan wali santri atau jadwal kedatangan santri ke asrama.</li>
                            </ul>
                        </div>

                        <ul className="list-disc pl-5 space-y-1 text-xs text-gray-600">
                            <li><strong>Filter Terarah:</strong> Cetak per jenjang (MTs, MA, dll.), per gelombang, atau gabungan seluruh pendaftar.</li>
                            <li><strong>Urutan Fleksibel:</strong> Urutkan berdasarkan Ranking Nilai Ujian (tertinggi ke terendah), Nomor Registrasi, atau Nama Santri (A-Z).</li>
                            <li><strong>Legalitas Pesantren:</strong> Dilengkapi Kop Surat Resmi Pondok Pesantren, Nomor Surat Keputusan, dan kolom tanda tangan Ketua Panitia serta Pimpinan Lembaga.</li>
                        </ul>
                    </div>
                )
            }
        ]
    },
    {
        id: 'surat',
        badge: 14,
        badgeColor: 'blue',
        title: 'Surat Menyurat & Tata Kelola Dokumen',
        steps: [
            {
                title: '1. Standardisasi Template Resmi, Variabel Cerdas & Magic AI Draft',
                content: (
                    <div className="space-y-3 text-sm text-gray-700">
                        <p className="leading-relaxed">
                            Modul <strong>Surat Menyurat</strong> dirancang khusus untuk mempercepat tata kelola administrasi korespondensi resmi pondok pesantren, menghilangkan ketik berulang dan menjamin konsistensi format kedinasan:
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                            <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-2xs space-y-1">
                                <strong className="text-blue-900 text-xs flex items-center gap-1.5 font-semibold">
                                    <i className="bi bi-collection-fill text-blue-600"></i> Template Baku Pesantren
                                </strong>
                                <p className="text-[11px] text-gray-600 leading-relaxed">
                                    Tersedia template baku bawaan: Surat Izin Pulang, Keterangan Aktif Santri, Panggilan Wali, Keterangan Berkelakuan Baik, Permohonan Dispensasi, Rekomendasi Beasiswa, Cuti Belajar, Peringatan Kedisiplinan, dan Undangan Pertemuan.
                                </p>
                            </div>
                            <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-2xs space-y-1">
                                <strong className="text-blue-900 text-xs flex items-center gap-1.5 font-semibold">
                                    <i className="bi bi-123 text-emerald-600"></i> Smart Auto-Numbering
                                </strong>
                                <p className="text-[11px] text-gray-600 leading-relaxed">
                                    Pola penomoran baku <code>NOMOR/KODE/NAMA-PONDOK/BULAN-ROMAWI/TAHUN</code>. Sistem menghitung nomor urut dari arsip bulan berjalan otomatis serta menyediakan tombol regenerasi nomor sewaktu-waktu.
                                </p>
                            </div>
                            <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-2xs space-y-1">
                                <strong className="text-blue-900 text-xs flex items-center gap-1.5 font-semibold">
                                    <i className="bi bi-magic text-purple-600"></i> Variable Inserter &amp; AI
                                </strong>
                                <p className="text-[11px] text-gray-600 leading-relaxed">
                                    Panel chip variabel terkategori (Data Santri, Akademik, Asrama, Orang Tua/Wali, Kelembagaan) yang dapat disisipkan dalam 1 klik, didukung fitur Magic Draft berbasis AI untuk menyusun redaksi resmi secara instan.
                                </p>
                            </div>
                        </div>

                        <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl space-y-1.5 text-xs text-blue-950">
                            <strong className="font-semibold flex items-center gap-1.5 text-blue-900">
                                <i className="bi bi-tags-fill text-blue-600"></i> Variabel Otomatis Populer yang Tersedia:
                            </strong>
                            <div className="flex flex-wrap gap-1.5 text-[11px]">
                                <span className="bg-white px-2 py-0.5 rounded-md border border-blue-200 text-blue-800 font-mono font-medium">{'{NAMA_SANTRI}'}</span>
                                <span className="bg-white px-2 py-0.5 rounded-md border border-blue-200 text-blue-800 font-mono font-medium">{'{NIS}'}</span>
                                <span className="bg-white px-2 py-0.5 rounded-md border border-blue-200 text-blue-800 font-mono font-medium">{'{TTL}'}</span>
                                <span className="bg-white px-2 py-0.5 rounded-md border border-blue-200 text-blue-800 font-mono font-medium">{'{KELAS}'}</span>
                                <span className="bg-white px-2 py-0.5 rounded-md border border-blue-200 text-blue-800 font-mono font-medium">{'{ASRAMA}'}</span>
                                <span className="bg-white px-2 py-0.5 rounded-md border border-blue-200 text-blue-800 font-mono font-medium">{'{KAMAR}'}</span>
                                <span className="bg-white px-2 py-0.5 rounded-md border border-blue-200 text-blue-800 font-mono font-medium">{'{ORTU_WALI}'}</span>
                                <span className="bg-white px-2 py-0.5 rounded-md border border-blue-200 text-blue-800 font-mono font-medium">{'{NO_HP}'}</span>
                                <span className="bg-white px-2 py-0.5 rounded-md border border-blue-200 text-blue-800 font-mono font-medium">{'{NOMOR_SURAT}'}</span>
                                <span className="bg-white px-2 py-0.5 rounded-md border border-blue-200 text-blue-800 font-mono font-medium">{'{PIMPINAN_PONDOK}'}</span>
                                <span className="bg-white px-2 py-0.5 rounded-md border border-blue-200 text-blue-800 font-mono font-medium">{'{WALI_KELAS}'}</span>
                                <span className="bg-white px-2 py-0.5 rounded-md border border-blue-200 text-blue-800 font-mono font-medium">{'{MUSYRIF}'}</span>
                            </div>
                        </div>
                    </div>
                )
            },
            {
                title: '2. Studio Surat Interaktif (In-Paper Studio), Zoom Presisi & Drawer Pengaturan',
                content: (
                    <div className="space-y-3 text-sm text-gray-700">
                        <p className="leading-relaxed">
                            Editor surat kini menggunakan layout <strong>In-Paper Studio</strong> modern dengan kanvas A4 proporsional penuh, menghilangkan ruang sempit dan tombol berhimpitan:
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                            <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs space-y-2">
                                <h5 className="font-semibold text-slate-900 text-xs flex items-center gap-1.5">
                                    <i className="bi bi-pencil-square text-teal-600"></i> Edit Langsung pada Kertas (WYSIWYG)
                                </h5>
                                <p className="text-[11px] text-gray-600 leading-relaxed">
                                    Klik langsung pada area nomor surat, perihal/judul, paragraf isi, hingga kalimat penutup di lembar kertas. Dilengkapi floating format toolbar (Bold, Italic, Underline, Bullet/Number List, Rata Kiri/Tengah/Kanan/Justify).
                                </p>
                            </div>
                            <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs space-y-2">
                                <h5 className="font-semibold text-slate-900 text-xs flex items-center gap-1.5">
                                    <i className="bi bi-zoom-in text-blue-600"></i> Zoom Controller Multi-Skala
                                </h5>
                                <p className="text-[11px] text-gray-600 leading-relaxed">
                                    Atur tingkat perbesaran kanvas (75%, 90%, 100%, 125%, 150%, atau Sesuaikan Lebar Layar) untuk kenyamanan mengetik. Zoom hanya mempengaruhi tampilan kerja di monitor dan secara otomatis di-reset saat cetak/ekspor PDF sehingga hasil tetap tajam dan presisi 100% ukuran A4.
                                </p>
                            </div>
                            <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs space-y-2">
                                <h5 className="font-semibold text-slate-900 text-xs flex items-center gap-1.5">
                                    <i className="bi bi-sliders2-vertical text-purple-600"></i> Drawer Pengaturan Format Slide-Over
                                </h5>
                                <p className="text-[11px] text-gray-600 leading-relaxed">
                                    Pengaturan teknis dokumen dibuka melalui panel laci geser (Drawer) di sisi kanan tanpa memotong atau memperkecil kertas kerja. Berisi pengaturan nomor, kota/tanggal surat, margin cetak, kop blanko, penanda tangan, stempel, dan mengetahui.
                                </p>
                            </div>
                        </div>
                    </div>
                )
            },
            {
                title: '3. Penanda Tangan Cerdas: Mode Otomatis (Data Master Pesantren) vs Manual & TTD Digital',
                content: (
                    <div className="space-y-3 text-sm text-gray-700">
                        <p className="leading-relaxed">
                            Penetapan penanda tangan surat kini mendukung mode <strong>Otomatis (Ambil dari Data)</strong> dan <strong>Manual (Tulis Bebas)</strong> untuk fleksibilitas maksimal:
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                            <div className="bg-teal-50/50 p-3.5 rounded-xl border border-teal-200 shadow-2xs space-y-2">
                                <h5 className="font-semibold text-teal-900 text-xs flex items-center gap-1.5">
                                    <i className="bi bi-person-check-fill text-teal-600"></i> Mode Otomatis (Terhubung ke Data Master)
                                </h5>
                                <ul className="list-disc pl-4 space-y-1 text-[11px] text-teal-950 leading-relaxed">
                                    <li><strong>Pimpinan Pondok / Mudir 'Aam:</strong> Otomatis mengambil nama lengkap dan NIP pimpinan dari profil Pengaturan Pesantren.</li>
                                    <li><strong>Ustadz / Tenaga Pengajar:</strong> Pilih langsung dari daftar ustadz terdaftar; nama, gelar, dan NIP otomatis sinkron.</li>
                                    <li><strong>Wali Kelas Dinamis:</strong> Otomatis mendeteksi wali kelas berdasarkan rombel santri terkait (sangat ampuh saat cetak massal satu kelas).</li>
                                    <li><strong>Musyrif Asrama Dinamis:</strong> Otomatis mendeteksi ustadz pembina asrama/kamar tempat santri tinggal.</li>
                                    <li><strong>Aset TTD Digital:</strong> Sistem otomatis mendeteksi dan menautkan tanda tangan digital dari modul <em>Aset Digital</em> yang cocok dengan nama pejabat.</li>
                                    <li><strong>Toggle NIP:</strong> Opsi menyembunyikan atau menampilkan baris NIP di bawah nama pejabat.</li>
                                </ul>
                            </div>
                            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-2">
                                <h5 className="font-semibold text-slate-900 text-xs flex items-center gap-1.5">
                                    <i className="bi bi-pencil-fill text-amber-600"></i> Mode Manual (Tulis Bebas) &amp; Tata Letak
                                </h5>
                                <ul className="list-disc pl-4 space-y-1 text-[11px] text-slate-700 leading-relaxed">
                                    <li><strong>Input Kustom:</strong> Tulis bebas nama pejabat eksternal, gelar, jabatan khusus, maupun nomor identitas kustom (NIK/NUPTK/NIP).</li>
                                    <li><strong>Unggah TTD Mandiri:</strong> Opsi mengunggah gambar tanda tangan transparan langsung untuk surat terkait.</li>
                                    <li><strong>Preset Tata Letak Pejabat:</strong> Tersedia pilihan 1 Penanda Tangan (kanan bawah), 2 Penanda Tangan (kiri &amp; kanan berdampingan), atau 3 Penanda Tangan proporsional.</li>
                                    <li><strong>Kolom "Mengetahui":</strong> Pilihan opsional menampilkan tanda tangan Mengetahui (Wali Santri, Kepala Asrama, Ketua Yayasan) di tengah atas.</li>
                                    <li><strong>Stempel Lembaga Digital:</strong> Pilihan stempel resmi pondok dari Aset Digital dengan penempatan otomatis pada pejabat terkait berotasi kedinasan natural (-12°).</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                )
            },
            {
                title: '4. Fleksibilitas Kop Blanko (Pre-Printed Paper) & Cetak Massal (Mail Merge)',
                content: (
                    <div className="space-y-3 text-sm text-gray-700">
                        <p className="leading-relaxed">
                            Mendukung beragam kebutuhan fisik percetakan di pesantren, baik pencetakan digital dari kertas polos maupun pencetakan pada kertas resmi yang telah memiliki kop fisik berwarna:
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                            <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs space-y-2">
                                <h5 className="font-semibold text-slate-900 text-xs flex items-center gap-1.5">
                                    <i className="bi bi-file-earmark-break-fill text-indigo-600"></i> Mode Cetak Kop Blanko (Pre-Printed)
                                </h5>
                                <p className="text-[11px] text-gray-600 leading-relaxed">
                                    Jika pesantren menggunakan kertas fisik berkop cetak warna/foil, aktifkan opsi <strong>"Kop Blanko"</strong> pada Drawer Format. Kop digital pada layar akan disembunyikan saat dicetak, dan jarak margin atas (<em>top margin offset</em>) dapat disesuaikan dalam satuan sentimeter (cm) dengan slider presisi agar naskah surat tepat berada di bawah kop fisik.
                                </p>
                            </div>
                            <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs space-y-2">
                                <h5 className="font-semibold text-slate-900 text-xs flex items-center gap-1.5">
                                    <i className="bi bi-filetype-pdf text-rose-600"></i> Multi-Format Export Berstandar Tinggi
                                </h5>
                                <p className="text-[11px] text-gray-600 leading-relaxed">
                                    Mendukung cetak langsung peramban (Native Print), ekspor PDF beresolusi tinggi (PDF Generator), unduh naskah Dokumen Microsoft Word (<em>.docx</em>) untuk pengeditan lanjutan di desktop, dan salinan halaman web statis (<em>.html</em>).
                                </p>
                            </div>
                        </div>

                        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs space-y-2">
                            <strong className="font-semibold text-slate-900 flex items-center gap-1.5">
                                <i className="bi bi-printer-fill text-blue-600"></i> Prosedur Cetak Massal (Mail Merge):
                            </strong>
                            <ol className="list-decimal pl-5 space-y-1 text-[11px] text-gray-600">
                                <li>Pilih template surat yang diinginkan pada daftar template.</li>
                                <li>Pilih mode <strong>"Surat Massal (Per Rombel/Kelas/Asrama)"</strong> lalu centang daftar santri sasaran.</li>
                                <li>Klik tombol <strong>"Tinjau &amp; Cetak Surat"</strong>. Sistem akan merender halaman masing-masing santri secara otomatis termasuk menyesuaikan nama wali kelas atau musyrif santri terkait.</li>
                                <li>Pilih cetak langsung atau simpan sebagai PDF gabungan beresolusi tinggi dengan batas margin A4 presisi.</li>
                            </ol>
                        </div>
                    </div>
                )
            },
            {
                title: '5. Pengelolaan Buku Agenda Surat Keluar & Pencatatan Otomatis (Auto-Archive)',
                content: (
                    <div className="space-y-3 text-sm text-gray-700">
                        <p className="leading-relaxed">
                            Setiap kali surat dicetak atau diterbitkan, sistem secara otomatis mengabadikan salinannya ke dalam <strong>Buku Agenda Surat Keluar</strong> untuk menjamin tertib administrasi tanpa perlu input ganda:
                        </p>
                        
                        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs space-y-1.5 text-emerald-950">
                            <strong className="font-bold flex items-center gap-1.5 text-emerald-900">
                                <i className="bi bi-journal-check text-emerald-600 text-sm"></i> Pencatatan Otomatis saat Cetak &amp; Unduh Dokumen:
                            </strong>
                            <p className="leading-relaxed text-emerald-900/90">
                                Saat Anda menekan tombol <strong>Cetak</strong> atau mengunduh berkas (<strong>PDF, Word, HTML</strong>), sistem otomatis memasukkan nomor surat, perihal, nama santri/penerima, tanggal, dan naskah lengkap ke dalam tabel Agenda Surat Keluar. Anda dapat melihat dan mengatur fitur ini melalui tombol toggle <strong>"Agenda Otomatis"</strong> di toolbar atas. Sistem cerdas juga mencegah duplikasi jika nomor surat dan santri yang sama sudah terdaftar.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                            <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-2xs space-y-1">
                                <strong className="text-slate-900 text-xs flex items-center gap-1.5 font-semibold">
                                    <i className="bi bi-journal-bookmark-fill text-emerald-600"></i> Buku Agenda Digital Lengkap
                                </strong>
                                <p className="text-[11px] text-gray-600 leading-relaxed">
                                    Merekam nomor urut, kode surat, perihal, tujuan, tanggal pembuatan, snapshot tanda tangan terselesaikan, hingga naskah lengkap saat surat diterbitkan.
                                </p>
                            </div>
                            <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-2xs space-y-1">
                                <strong className="text-slate-900 text-xs flex items-center gap-1.5 font-semibold">
                                    <i className="bi bi-file-earmark-excel-fill text-emerald-700"></i> Ekspor Excel &amp; Cetak Agenda
                                </strong>
                                <p className="text-[11px] text-gray-600 leading-relaxed">
                                    Dapat mencetak Buku Register Tata Usaha format resmi berkop lembaga dan mengekspor seluruh rekaman buku agenda ke berkas Excel (.xlsx) sekali klik.
                                </p>
                            </div>
                            <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-2xs space-y-1">
                                <strong className="text-slate-900 text-xs flex items-center gap-1.5 font-semibold">
                                    <i className="bi bi-whatsapp text-emerald-600"></i> Notifikasi WhatsApp Terpadu
                                </strong>
                                <p className="text-[11px] text-gray-600 leading-relaxed">
                                    Setelah surat tercatat di arsip, Anda dapat langsung mengirim pemberitahuan resmi instan ke nomor HP santri, ayah, ibu, atau wali dengan naskah dinamis.
                                </p>
                            </div>
                        </div>
                    </div>
                )
            },
            {
                title: '6. SOP Kerja Multi-Admin: Real-Time Sync (Firebase) vs Hub-and-Spoke',
                color: 'teal',
                content: (
                    <div className="space-y-3.5 text-sm text-gray-700">
                        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-950 text-xs flex items-start gap-2.5">
                            <i className="bi bi-shield-check text-amber-600 shrink-0 text-base mt-0.5"></i>
                            <div>
                                <strong className="font-bold text-amber-900 block mb-0.5">Pentingnya SOP Multi-Admin Surat Menyurat Pesantren:</strong>
                                Di lingkungan pesantren, pembuatan surat sering dilakukan oleh divisi berbeda secara simultan (misal: <em>Tata Usaha Pusat</em> membuat Surat Keterangan Santri, <em>Musyrif Asrama</em> menerbitkan Surat Izin Pulang, dan <em>Guru BK</em> membuat Surat Panggilan Wali). Agar nomor surat tidak bertabrakan (duplikasi nomor) dan buku agenda selalu terpadu, patuhi SOP arsitektur kerja di bawah ini.
                            </div>
                        </div>

                        {/* Model A */}
                        <div className="p-3.5 bg-teal-50/70 border border-teal-200 rounded-xl space-y-2.5">
                            <div className="flex items-center justify-between border-b border-teal-200/70 pb-1.5">
                                <h5 className="font-bold text-teal-900 flex items-center gap-1.5 text-xs">
                                    <span className="w-5 h-5 rounded-full bg-teal-600 text-white flex items-center justify-center text-[10px] font-black">A</span>
                                    Model A: Cloud Real-Time (Firebase Firestore)
                                </h5>
                                <span className="px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 text-[10px] font-bold uppercase tracking-wider">Disarankan / Online Penuh</span>
                            </div>
                            <p className="text-xs text-gray-600 leading-relaxed">
                                Seluruh unit (TU Pusat, Asrama Putra, Asrama Putri, Pos Satpam, Ruang BK) terhubung ke internet dan masuk ke akun staff masing-masing.
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs">
                                <div className="bg-white p-2.5 rounded-lg border border-teal-200/80 space-y-1 shadow-2xs">
                                    <strong className="text-teal-900 font-semibold flex items-center gap-1 text-[11px]">
                                        <i className="bi bi-arrow-repeat text-teal-600"></i> Alur Kerja &amp; Integritas Penomoran
                                    </strong>
                                    <ul className="list-disc pl-4 space-y-1 text-[10px] text-gray-600 leading-relaxed">
                                        <li>Generator nomor membaca koleksi <code>arsipSurat</code> langsung dari cloud database.</li>
                                        <li>Saat Musyrif menerbitkan Surat Izin Pulang di asrama, nomor langsung tercatat dan nomor berikutnya otomatis terpakai untuk staf lain.</li>
                                        <li>Buku agenda di laptop Kepala TU dan Pos Satpam langsung terbarui secara instan tanpa reload browser.</li>
                                    </ul>
                                </div>
                                <div className="bg-white p-2.5 rounded-lg border border-teal-200/80 space-y-1 shadow-2xs">
                                    <strong className="text-teal-900 font-semibold flex items-center gap-1 text-[11px]">
                                        <i className="bi bi-exclamation-octagon text-amber-600"></i> Prosedur Saat Internet Terputus
                                    </strong>
                                    <ul className="list-disc pl-4 space-y-1 text-[10px] text-gray-600 leading-relaxed">
                                        <li>Sistem beralih ke IndexedDB lokal offline; staf tetap dapat mencetak surat mendesak.</li>
                                        <li>Begitu perangkat kembali tersambung ke WiFi/internet, sistem otomatis menyinkronkan rekaman arsip ke cloud tanpa intervensi manual.</li>
                                    </ul>
                                </div>
                            </div>
                        </div>

                        {/* Model B */}
                        <div className="p-3.5 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-2.5">
                            <div className="flex items-center justify-between border-b border-indigo-200/70 pb-1.5">
                                <h5 className="font-bold text-indigo-900 flex items-center gap-1.5 text-xs">
                                    <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-black">B</span>
                                    Model B: Hub-and-Spoke (Offline-First / Dropbox / File Cadangan)
                                </h5>
                                <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-[10px] font-bold uppercase tracking-wider">Hybrid / Tanpa Internet Rutin</span>
                            </div>
                            <p className="text-xs text-gray-600 leading-relaxed">
                                Diterapkan jika kantor asrama atau pos jaga tidak memiliki koneksi internet kontinu. Komputer Tata Usaha Pusat bertindak sebagai <strong>HUB (Pusat)</strong>, sedangkan komputer pos jaga/asrama bertindak sebagai <strong>SPOKE (Cabang)</strong>.
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs">
                                <div className="bg-white p-2.5 rounded-lg border border-indigo-200/80 space-y-1 shadow-2xs">
                                    <strong className="text-indigo-900 font-semibold flex items-center gap-1 text-[11px]">
                                        <i className="bi bi-hash text-indigo-600"></i> Aturan Sub-Kode Penomoran Unik
                                    </strong>
                                    <p className="text-[10px] text-gray-600 leading-relaxed">
                                        Untuk menghindari tabrakan nomor urut saat bekerja offline, tetapkan kode klasifikasi surat yang berbeda untuk tiap unit:
                                    </p>
                                    <ul className="list-disc pl-4 space-y-0.5 text-[10px] text-gray-600 font-mono">
                                        <li>TU Pusat: .../TU/PP-AI/...</li>
                                        <li>Pengasuhan Asrama: .../ASR/PP-AI/...</li>
                                        <li>Bimbingan Konseling: .../BK/PP-AI/...</li>
                                        <li>Pos Keamanan / Izin: .../KMN/PP-AI/...</li>
                                    </ul>
                                </div>
                                <div className="bg-white p-2.5 rounded-lg border border-indigo-200/80 space-y-1 shadow-2xs">
                                    <strong className="text-indigo-900 font-semibold flex items-center gap-1 text-[11px]">
                                        <i className="bi bi-clock-history text-indigo-600"></i> SOP Rekonsiliasi Harian
                                    </strong>
                                    <ol className="list-decimal pl-4 space-y-1 text-[10px] text-gray-600 leading-relaxed">
                                        <li><strong>Pagi (07.30):</strong> Staf Spoke melakukan <em>"Tarik Data Master"</em> dari cloud/flashdisk.</li>
                                        <li><strong>Sepanjang Hari:</strong> Pelayanan cetak surat izin &amp; pengarsipan berjalan offline.</li>
                                        <li><strong>Sore (16.00):</strong> Staf Spoke mengunggah file perubahan (<em>"Upload Staff Changes"</em>).</li>
                                        <li><strong>Tutup Kantor:</strong> Admin Pusat mengecek inbox data dan melakukan <em>"Publish Master"</em>.</li>
                                    </ol>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            },
            {
                title: '7. Matriks Wewenang & Rekomendasi Alur Surat Pesantren',
                content: (
                    <div className="space-y-3 text-sm text-gray-700">
                        <p className="leading-relaxed text-xs">
                            Panduan pembagian kewenangan (RACI) penerbitan dokumen resmi di lingkungan pondok pesantren:
                        </p>
                        <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-2xs bg-white text-xs">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-gray-200 text-slate-700 font-semibold text-[11px]">
                                        <th className="p-2.5">Jenis Surat</th>
                                        <th className="p-2.5">Unit Pembuat</th>
                                        <th className="p-2.5">Penanda Tangan</th>
                                        <th className="p-2.5">Tembusan Wajib</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 text-[11px] text-gray-600">
                                    <tr>
                                        <td className="p-2.5 font-medium text-slate-800">Surat Keterangan Aktif / Pindah</td>
                                        <td className="p-2.5">Tata Usaha Pusat</td>
                                        <td className="p-2.5">Kepala Madrasah / Mudir</td>
                                        <td className="p-2.5">Arsip TU, Wali Santri</td>
                                    </tr>
                                    <tr>
                                        <td className="p-2.5 font-medium text-slate-800">Surat Izin Pulang / Sakit</td>
                                        <td className="p-2.5">Pengasuhan / Musyrif</td>
                                        <td className="p-2.5">Kepala Asrama / Poskestren</td>
                                        <td className="p-2.5">Pos Satpam, Wali Santri via WA</td>
                                    </tr>
                                    <tr>
                                        <td className="p-2.5 font-medium text-slate-800">Surat Panggilan Orang Tua</td>
                                        <td className="p-2.5">Guru BK / Kedisiplinan</td>
                                        <td className="p-2.5">Guru BK &amp; Pengasuh</td>
                                        <td className="p-2.5">Wali Kelas, Kepala Asrama</td>
                                    </tr>
                                    <tr>
                                        <td className="p-2.5 font-medium text-slate-800">Undangan Pertemuan Wali</td>
                                        <td className="p-2.5">Sekretariat Pimpinan</td>
                                        <td className="p-2.5">Pimpinan Pondok Pesantren</td>
                                        <td className="p-2.5">Buku Agenda, WhatsApp Center</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        <div className="p-3 bg-slate-100 rounded-xl text-slate-700 text-xs flex items-center gap-2">
                            <i className="bi bi-info-circle-fill text-blue-600 text-base shrink-0"></i>
                            <span>
                                <strong>Tips Pengarsipan:</strong> Disarankan untuk mencetak Buku Agenda Surat Keluar setiap akhir bulan dan menyimpannya bersama berkas fisik bernomor di ordner arsip kantor tata usaha.
                            </span>
                        </div>
                    </div>
                )
            }
        ]
    },
    kalenderPanduan,
    perpustakaanPanduan,
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
                        <li><strong>Keuangan:</strong> Manajemen tagihan (SPP/Uang Pangkal), pembayaran, tabungan santri, dan penggajian guru.</li>
                        <li><strong>Buku Kas:</strong> Pencatatan arus kas masuk/keluar pondok multi-pos rekening, Bagan Akun (COA), dan cetak BKM/BKK.</li>
                        <li><strong>Koperasi &amp; Kantin:</strong> Sistem POS layar sentuh, Kasir Tabungan cepat, Multi-Gudang, Vendor/Supplier, Kasbon &amp; cicilan, Void/Retur, cetak struk Printer Thermal Bluetooth, dan Laba Rugi terintegrasi Buku Kas.</li>
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
        title: 'Modul Laporan Umum & Dokumen Administrasi',
        steps: [
            {
                title: '1. Struktur 4 Kategori Laporan & Ekosistem Dokumen Pesantren',
                color: 'teal',
                content: (
                    <div className="space-y-3 text-sm text-gray-700">
                        <p className="leading-relaxed">
                            Modul <strong>Laporan</strong> mengintegrasikan seluruh data operasional pesantren ke dalam format cetak resmi dan ekspor digital yang terbagi ke dalam 4 kategori utama:
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                            <div className="bg-indigo-50/60 p-3.5 rounded-xl border border-indigo-200 text-xs space-y-1.5">
                                <h5 className="font-bold text-indigo-900 flex items-center gap-1.5">
                                    <i className="bi bi-speedometer2 text-indigo-600 text-sm"></i> 1. Laporan Utama &amp; Dashboard Eksekutif
                                </h5>
                                <ul className="list-disc pl-4 space-y-1 text-indigo-950/90 leading-relaxed">
                                    <li><strong>Snapshot Operasional Harian:</strong> Ringkasan 1 lembar untuk Mudir/Pimpinan mencakup absensi, layanan kesehatan, kas harian, dan mutasi santri.</li>
                                    <li><strong>Early Warning Santri:</strong> Deteksi dini santri berisiko tinggi dari kombinasi absensi, pelanggaran BK, kesehatan, dan tunggakan.</li>
                                    <li><strong>Ringkasan Dashboard &amp; Keuangan:</strong> Rekap grafik santri aktif, kamar asrama terisi, dan arus kas berjalan.</li>
                                    <li><strong>Cohort Santri:</strong> Analisis retensi dan ketahanan santri per tahun masuk/angkatan.</li>
                                    <li><strong>Kinerja Pengajar:</strong> Rekap kepatuhan pengisian jurnal kelas dan jam mengajar ustadz.</li>
                                    <li><strong>Laporan Mutasi:</strong> Rekap mutasi masuk, pindah cabang, keluar, dan alumni kelulusan.</li>
                                </ul>
                            </div>

                            <div className="bg-teal-50/60 p-3.5 rounded-xl border border-teal-200 text-xs space-y-1.5">
                                <h5 className="font-bold text-teal-900 flex items-center gap-1.5">
                                    <i className="bi bi-mortarboard-fill text-teal-600 text-sm"></i> 2. Akademik &amp; Kesiswaan
                                </h5>
                                <ul className="list-disc pl-4 space-y-1 text-teal-950/90 leading-relaxed">
                                    <li><strong>Daftar Santri &amp; Biodata Lengkap:</strong> Lembar data profil lengkap santri berfoto siap cetak.</li>
                                    <li><strong>Lembar Absensi Bulanan (Grid 1-31):</strong> Format presisi absensi kelas harian tanggal 1 sampai 31.</li>
                                    <li><strong>Rekap Jurnal Mengajar:</strong> Matriks materi pelajaran, kehadiran guru, dan catatan kelas.</li>
                                    <li><strong>Perkembangan Tahfizh:</strong> Rekap target juz, total setoran lancar, dan mutaba’ah hafalan.</li>
                                    <li><strong>Rekap Kesehatan &amp; BK:</strong> Riwayat keluhan medis, diagnosis klinik, dan catatan konseling santri.</li>
                                    <li><strong>Rapor Lengkap (PDF) &amp; Serah Terima:</strong> Cetak buku rapor resmi dan tanda terima wali santri.</li>
                                    <li><strong>Kepatuhan Administrasi:</strong> Audit kelengkapan berkas fisik &amp; data induk santri.</li>
                                </ul>
                            </div>

                            <div className="bg-blue-50/60 p-3.5 rounded-xl border border-blue-200 text-xs space-y-1.5">
                                <h5 className="font-bold text-blue-900 flex items-center gap-1.5">
                                    <i className="bi bi-cash-stack text-blue-600 text-sm"></i> 3. Keuangan &amp; Administrasi Permanen
                                </h5>
                                <ul className="list-disc pl-4 space-y-1 text-blue-950/90 leading-relaxed">
                                    <li><strong>Matriks Tunggakan SPP:</strong> Matriks status bayar 12 bulan (Juli-Juni) per rombel dengan rekap nominal lunas/tertunggak.</li>
                                    <li><strong>Buku Induk Santri:</strong> Lembar arsip permanen santri berstandar EMIS Kemenag lengkap dari riwayat ayah, ibu, hingga riwayat kesehatan.</li>
                                    <li><strong>Rekening Koran Santri:</strong> Rincian transaksi tabungan, saku digital, dan tagihan berkala.</li>
                                    <li><strong>Buku Arus Kas Umum:</strong> Rekap pemasukan dan pengeluaran kas pesantren berstandar akuntansi.</li>
                                    <li><strong>Kartu Santri &amp; Stiker Label:</strong> Pembuatan kartu tanda santri dan label nama berpola stiker.</li>
                                </ul>
                            </div>

                            <div className="bg-slate-100 p-3.5 rounded-xl border border-slate-300 text-xs space-y-1.5">
                                <h5 className="font-bold text-slate-900 flex items-center gap-1.5">
                                    <i className="bi bi-box-seam-fill text-slate-700 text-sm"></i> 4. Penunjang, Asrama &amp; Ekspor EMIS
                                </h5>
                                <ul className="list-disc pl-4 space-y-1 text-slate-800 leading-relaxed">
                                    <li><strong>Ekspor Format EMIS Kemenag:</strong> Berkas Excel (.xlsx) dengan pemetaan kolom yang disesuaikan untuk diunggah ke portal EMIS Kemenag.</li>
                                    <li><strong>Data Penghuni Asrama &amp; Kamar:</strong> Distribusi santri per gedung asrama, musyrif pembina, dan kapasitas kamar.</li>
                                    <li><strong>Surat Izin Pulang:</strong> Formulir resmi izin libur / kepulangan santri dengan QR verifikasi pos keamanan.</li>
                                    <li><strong>Ekspor Kontak Wali (CSV/Excel):</strong> Daftar kontak nomor HP wali santri untuk diimpor ke Google Contacts atau kontak smartphone broadcast.</li>
                                    <li><strong>Funnel Efektivitas PSB:</strong> Rasio konversi pendaftaran baru dari status mendaftar, seleksi, lunas, hingga resmi mukim.</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                )
            },
            {
                title: '2. Filter Cerdas, Kustomisasi Data & Pencarian Fleksibel',
                content: (
                    <div className="space-y-3 text-sm text-gray-700">
                        <p className="leading-relaxed">
                            Panel filter di sebelah kiri menyediakan penyaringan data berjenjang untuk menghasilkan dokumen yang akurat dan terfokus:
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                            <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs space-y-1.5">
                                <strong className="font-semibold text-slate-900 flex items-center gap-1.5">
                                    <i className="bi bi-funnel-fill text-teal-600"></i> Filter Hirarki Pendidikan
                                </strong>
                                <p className="text-gray-600 leading-relaxed text-[11px]">
                                    Pilih <strong>Jenjang (Marhalah)</strong>, <strong>Tingkat Kelas</strong>, dan <strong>Rombel</strong> secara otomatis berantai (dependen). Pilihan rombel hanya akan menampilkan kelas yang sesuai jenjang terpilih.
                                </p>
                            </div>
                            <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs space-y-1.5">
                                <strong className="font-semibold text-slate-900 flex items-center gap-1.5">
                                    <i className="bi bi-person-gear text-indigo-600"></i> Filter Demografi &amp; Status
                                </strong>
                                <p className="text-gray-600 leading-relaxed text-[11px]">
                                    Filter berdasarkan <strong>Gender</strong> (Putra / Putri), <strong>Status Santri</strong> (Aktif, Mutasi, Lulus, Dikeluarkan), <strong>Jenis Santri</strong> (Mukim Asrama / Non-Mukim Pulang-Pergi), dan <strong>Gedung Asrama</strong>.
                                </p>
                            </div>
                            <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs space-y-1.5">
                                <strong className="font-semibold text-slate-900 flex items-center gap-1.5">
                                    <i className="bi bi-sort-alpha-down text-purple-600"></i> Pengurutan &amp; Pencarian
                                </strong>
                                <p className="text-gray-600 leading-relaxed text-[11px]">
                                    Urutkan data berdasarkan Nama Lengkap (A-Z), NIS, atau Kelas. Kolom pencarian instan memudahkan menemukan santri atau data tertentu tanpa perlu scroll panjang.
                                </p>
                            </div>
                        </div>
                    </div>
                )
            },
            {
                title: '3. Pratinjau Dokumen Cerdas (Smart Zoom, Fit to Width & Page Count)',
                content: (
                    <div className="space-y-3 text-sm text-gray-700">
                        <p className="leading-relaxed">
                            Panel pratinjau lembar kerja dilengkapi mesin penampil dokumen presisi:
                        </p>
                        <ul className="list-disc pl-5 space-y-1.5 text-xs text-gray-700">
                            <li>
                                <strong>Smart Fit to Width:</strong> Dokumen otomatis menyesuaikan lebar viewport monitor saat pertama kali dibuka, menjamin dokumen terbaca jelas baik di layar laptop 13 inci maupun monitor desktop lebar.
                            </li>
                            <li>
                                <strong>Zoom Controller Multi-Tingkat:</strong> Pengguna dapat memperbesar/memperkecil skala tampilan (75%, 100%, 125%) secara bebas tanpa merusak layout asli cetak. Saat diekspor ke PDF atau dicetak, sistem otomatis mengembalikan skala ke 100% ukuran fisik.
                            </li>
                            <li>
                                <strong>Indikator Estimasi Halaman (Page Counter):</strong> Panel atas menampilkan total estimasi lembar dokumen yang akan tercetak, membantu staf menghitung kebutuhan kertas fisik sebelum proses print dijalankan.
                            </li>
                        </ul>
                    </div>
                )
            },
            {
                title: '4. Multi-Format Ekspor Berstandar Tinggi (Print, PDF Vektor, Excel & CSV)',
                color: 'teal',
                content: (
                    <div className="space-y-3 text-sm text-gray-700">
                        <p className="leading-relaxed">
                            Menu <strong>"Unduh / Cetak"</strong> menyediakan berbagai format keluaran sesuai kebutuhan administrasi:
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                            <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs space-y-1.5">
                                <strong className="font-semibold text-slate-900 flex items-center gap-1.5">
                                    <i className="bi bi-printer-fill text-blue-600"></i> Cetak Langsung (Native Print) &amp; PDF Visual (Vektor)
                                </strong>
                                <p className="text-gray-600 leading-relaxed text-[11px]">
                                    Pilih opsi ini untuk mencetak langsung ke mesin printer atau menyimpan via dialog peramban <em>"Save as PDF"</em>. Menghasilkan naskah vektor beresolusi tinggi dengan teks tajam yang dapat diseleksi dan tidak buram/pecah saat dizoom.
                                </p>
                            </div>
                            <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs space-y-1.5">
                                <strong className="font-semibold text-slate-900 flex items-center gap-1.5">
                                    <i className="bi bi-file-earmark-excel-fill text-emerald-700"></i> Ekspor Excel (.xlsx) Siap Pakai
                                </strong>
                                <p className="text-gray-600 leading-relaxed text-[11px]">
                                    Tersedia untuk Laporan EMIS, Arus Kas Umum, Ringkasan Keuangan, Daftar Santri, Kontak Wali, dan Matriks Tunggakan. Berkas Excel diformat rapi dengan judul kolom, garis kisi tabel, dan format angka mata uang otomatis.
                                </p>
                            </div>
                            <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs space-y-1.5">
                                <strong className="font-semibold text-slate-900 flex items-center gap-1.5">
                                    <i className="bi bi-filetype-csv text-teal-600"></i> Ekspor Kontak CSV (Smartphone Sync)
                                </strong>
                                <p className="text-gray-600 leading-relaxed text-[11px]">
                                    Menghasilkan berkas CSV standar vCard/Google Contacts untuk mengekspor nomor HP seluruh wali santri sekali klik sehingga dapat diimpor langsung ke kontak HP admin/musyrif.
                                </p>
                            </div>
                            <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs space-y-1.5">
                                <strong className="font-semibold text-slate-900 flex items-center gap-1.5">
                                    <i className="bi bi-file-earmark-image text-rose-600"></i> PDF Gambar (Raster Standar)
                                </strong>
                                <p className="text-gray-600 leading-relaxed text-[11px]">
                                    Opsi alternatif pembuatan PDF berbasis render gambar instan langsung dari peramban jika perangkat tidak memiliki driver printer PDF bawaan.
                                </p>
                            </div>
                        </div>
                    </div>
                )
            },
            {
                title: '5. Kustomisasi Kartu Santri & ID Card (Fleksibilitas Data Strategis)',
                content: (
                    <div className="space-y-3 text-sm text-gray-700">
                        <p className="leading-relaxed">
                            Pencetakan Kartu Identitas Santri kini dirancang dengan fleksibilitas data maksimal dan tata letak cerdas:
                        </p>
                        <div className="bg-teal-50/70 p-3.5 rounded-xl border border-teal-200 text-xs space-y-2">
                            <strong className="font-bold text-teal-950 flex items-center gap-1.5">
                                <i className="bi bi-person-vcard-fill text-teal-700 text-sm"></i> Keunggulan Fitur Kartu Santri Terbaru:
                            </strong>
                            <ul className="list-disc pl-4 space-y-1 text-teal-900 text-[11px] leading-relaxed">
                                <li><strong>Pemisahan Jenjang &amp; Kelas:</strong> Anda dapat menampilkan Jenjang (misal: MTs/MA) dan Kelas (misal: VII/A) secara terpisah atau digabung sesuai format yang diinginkan.</li>
                                <li><strong>Data Strategis Lengkap:</strong> Pilihan mandiri memunculkan NIS, NISN, NIK, Nama Hijrah / Kunyah, Asrama &amp; Kamar, TTL, Golongan Darah, Status Mukim/Non-Mukim, Orang Tua/Wali, Kontak Darurat, dan Tahun Masuk/Angkatan.</li>
                                <li><strong>Smart Font Scaling:</strong> Algoritma kalkulasi ukuran font dinamis memastikan teks panjang pada nama pesantren, nama santri, maupun alamat domisili tidak akan terpotong (...) atau menabrak batas kartu.</li>
                                <li><strong>5 Desain Visual Modern:</strong> Tersedia desain <em>Klasik Elegan, Modern Minimalis, ID Card Vertikal (Portrait), Dark Premium,</em> dan <em>Ceria / TPQ</em>.</li>
                                <li><strong>Layout 2 Sisi Fleksibel:</strong> Pilihan format cetak berdampingan (untuk plastik ID Card) atau halaman terpisah depan-belakang (untuk mesin cetak PVC Duplex).</li>
                            </ul>
                        </div>
                    </div>
                )
            },
            {
                title: '6. SOP Pembuatan Laporan & Cetak Massal yang Efektif',
                content: (
                    <ol className="list-decimal pl-5 space-y-1.5 text-xs text-gray-700 bg-gray-50 p-3.5 rounded-xl border border-gray-200 leading-relaxed">
                        <li>Buka menu <strong>Laporan</strong>, pilih kategori dan jenis laporan yang dibutuhkan pada halaman pemilihan.</li>
                        <li>Tentukan filter <strong>Tahun Ajaran</strong>, <strong>Jenjang</strong>, dan <strong>Rombel</strong> pada panel filter sisi kiri.</li>
                        <li>Periksa opsi khusus pada tab <em>Pilihan Laporan</em> (misal: centang data yang ingin ditampilkan pada kartu santri, atau pilih format tanda tangan).</li>
                        <li>Klik <strong>Tampilkan Preview</strong> untuk memuat lembar kerja dan periksa hasilnya pada panel pratinjau.</li>
                        <li>Gunakan tombol <strong>Cetak / Unduh</strong> di toolbar atas: pilih <em>Cetak Langsung</em> atau <em>PDF Visual</em> untuk hasil terbaik, atau pilih <em>Ekspor Excel</em> untuk pengolahan angka lanjutan di spreadsheet.</li>
                    </ol>
                )
            },
            {
                title: 'Catatan Interpretasi Data Strategis',
                color: 'orange',
                content: (
                    <div className="bg-orange-50 p-3 rounded-xl border border-orange-200 text-xs text-orange-950 space-y-1">
                        <strong className="font-bold flex items-center gap-1.5 text-orange-900">
                            <i className="bi bi-info-circle-fill text-orange-600"></i> Panduan Pengambilan Keputusan:
                        </strong>
                        <p className="leading-relaxed">
                            Laporan strategis seperti <em>Early Warning Santri</em>, <em>Kelas/Asrama Bermasalah</em>, dan <em>Snapshot Operasional</em> bersifat <strong>indikatif analitis</strong> untuk membantu pimpinan memetakan prioritas pembinaan. Tindakan lanjutan tetap mengedepankan musyawarah terpadu antara dewan pengasuhan, wali kelas, guru BK, dan orang tua santri.
                        </p>
                    </div>
                )
            }
        ]
    },
    {
        id: 'whatsapp',
        badge: 'PRO',
        badgeColor: 'teal',
        title: 'WhatsApp Communication Center & SOP Multi-Admin',
        steps: [
            {
                title: 'Arsitektur Saluran: Mode Manual (wa.me) vs Gateway API',
                color: 'teal',
                content: (
                    <div className="space-y-3 text-sm text-gray-700">
                        <div className="bg-teal-50 p-4 rounded-xl border border-teal-200 space-y-2">
                            <h4 className="font-bold text-teal-900 flex items-center gap-2">
                                <i className="bi bi-gear-wide-connected text-teal-600"></i>
                                Konsep Saluran Komunikasi Ganda (Hybrid Routing)
                            </h4>
                            <p className="leading-relaxed">
                                Sistem menyediakan dua jalur pengiriman pesan yang dapat dipilih sesuai kebutuhan operasional lembaga:
                            </p>
                            <ul className="list-disc pl-5 space-y-1.5 text-xs text-teal-900">
                                <li>
                                    <strong>1. Jalur Manual (wa.me / WhatsApp Web / Desktop):</strong> Default sistem. Pesan otomatis disusun dengan data riil lalu diarahkan ke aplikasi WhatsApp Anda. 100% gratis, aman tanpa risiko pemblokiran nomor, dan tidak membutuhkan API pihak ketiga.
                                </li>
                                <li>
                                    <strong>2. Jalur Gateway API (Fonnte, Wablas, atau Custom REST API):</strong> Mengirim pesan secara otomatis di latar belakang melalui server gateway berizin resmi. Cocok untuk pengiriman massal ratusan pesan tanpa perlu membuka jendela browser satu per satu.
                                </li>
                            </ul>
                        </div>

                        <div className="bg-white p-3.5 rounded-xl border border-gray-200 space-y-2">
                            <h5 className="font-bold text-gray-800 text-xs uppercase tracking-wider">Cara Mengatur WhatsApp Gateway:</h5>
                            <ol className="list-decimal pl-5 space-y-1.5 text-xs text-gray-600">
                                <li>Klik tombol <strong>Saluran: Manual / API</strong> di sudut kanan atas halaman WhatsApp Center.</li>
                                <li>Pilih penyedia gateway yang Anda gunakan (<strong>Fonnte</strong>, <strong>Wablas</strong>, atau <strong>Custom REST API</strong>).</li>
                                <li>Masukkan <strong>API Key / Token Otentikasi</strong> dan <strong>Nomor WhatsApp Pengirim (Sender)</strong>.</li>
                                <li>Klik tombol <strong>Uji Koneksi Gateway</strong> untuk memverifikasi apakah token Anda aktif dan terhubung.</li>
                                <li>Klik <strong>Simpan Pengaturan</strong>. Jika gateway aktif, seluruh pengiriman otomatis diarahkan via API. Jika gateway dinonaktifkan atau gagal koneksi, sistem otomatis melakukan fallback aman ke mode manual (wa.me).</li>
                            </ol>
                        </div>

                        <div className="bg-amber-50 p-3 rounded-lg border-l-4 border-amber-500 text-xs text-amber-800">
                            <strong>Normalisasi Otomatis Nomor:</strong> Sistem secara otomatis membersihkan dan mengubah format nomor telepon lokal (misal: <code>0812-3456-7890</code> atau <code>+62 812...</code>) menjadi format internasional standar WhatsApp (<code>6281234567890</code>).
                        </div>
                    </div>
                )
            },
            {
                title: 'Manajemen Audiens: Santri Aktif & Tagihan vs Pendaftar PSB',
                color: 'blue',
                content: (
                    <div className="space-y-3 text-sm text-gray-700">
                        <p className="leading-relaxed">
                            WhatsApp Center kini memisahkan target komunikasi menjadi dua tab audiens yang terisolasi secara rapi:
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="bg-white p-3.5 rounded-xl border border-blue-200 shadow-2xs space-y-2">
                                <div className="flex items-center gap-2 text-blue-700 font-bold text-sm">
                                    <i className="bi bi-people-fill"></i>
                                    <span>Tab 1: Santri Aktif & Tagihan</span>
                                </div>
                                <p className="text-xs text-gray-600 leading-relaxed">
                                    Dikhususkan untuk komunikasi wali santri aktif. Terhubung langsung dengan basis data keuangan riil (<code>db.tagihan</code>).
                                </p>
                                <ul className="list-disc pl-4 space-y-1 text-xs text-gray-600">
                                    <li>Filter presisi: Status Santri, Marhalah/Jenjang, Kelas, Rombel.</li>
                                    <li>Menghitung otomatis akumulasi tunggakan belum lunas per santri.</li>
                                    <li>Lencana status: <strong>Rp 0 (Lunas)</strong> atau total nominal tunggakan beserta rincian item tagihan.</li>
                                </ul>
                            </div>

                            <div className="bg-white p-3.5 rounded-xl border border-emerald-200 shadow-2xs space-y-2">
                                <div className="flex items-center gap-2 text-emerald-700 font-bold text-sm">
                                    <i className="bi bi-person-badge-fill"></i>
                                    <span>Tab 2: Pendaftar PSB Baru</span>
                                </div>
                                <p className="text-xs text-gray-600 leading-relaxed">
                                    Dikhususkan untuk calon santri dan wali pendaftar. Terhubung langsung dengan basis data pendaftaran PSB (<code>db.pendaftar</code>).
                                </p>
                                <ul className="list-disc pl-4 space-y-1 text-xs text-gray-600">
                                    <li>Filter khusus: Status PSB (Baru, Terverifikasi, Ujian, Lulus, Diterima), Gelombang, Jalur Masuk, dan Kelengkapan Berkas Fisik (Lengkap 5/5).</li>
                                    <li>Mendukung notifikasi jadwal & ruang ujian seleksi, pengingat berkas fisik posko, dan pengumuman kelulusan.</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                )
            },
            {
                title: 'Template Cerdas, Variabel Dinamis & Chip Sisipan',
                color: 'green',
                content: (
                    <div className="space-y-3 text-sm text-gray-700">
                        <div className="bg-green-50 p-3 rounded-xl border border-green-200 text-xs text-green-900 leading-relaxed">
                            <strong>Tombol Chip Variabel:</strong> Anda tidak perlu menghafal atau mengetik manual tag kurung siku. Cukup klik tombol chip variabel di atas kotak editor teks, maka variabel akan otomatis tersisip tepat di posisi kursor Anda.
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-xs text-left border-collapse border border-gray-200 rounded-lg overflow-hidden">
                                <thead className="bg-gray-100 text-gray-700 font-bold">
                                    <tr>
                                        <th className="p-2 border border-gray-200">Kategori</th>
                                        <th className="p-2 border border-gray-200">Tag Variabel</th>
                                        <th className="p-2 border border-gray-200">Data Pengganti Riil</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 bg-white">
                                    <tr>
                                        <td className="p-2 font-medium text-gray-900 border border-gray-200" rowSpan={3}>Identitas Santri</td>
                                        <td className="p-2 font-mono text-teal-700 border border-gray-200">[nama_santri], [nis]</td>
                                        <td className="p-2 text-gray-600 border border-gray-200">Nama lengkap & Nomor Induk Santri</td>
                                    </tr>
                                    <tr>
                                        <td className="p-2 font-mono text-teal-700 border border-gray-200">[ortu]</td>
                                        <td className="p-2 text-gray-600 border border-gray-200">Nama Ayah, Ibu, atau Wali yang terdata</td>
                                    </tr>
                                    <tr>
                                        <td className="p-2 font-mono text-teal-700 border border-gray-200">[kelas], [rombel], [asrama]</td>
                                        <td className="p-2 text-gray-600 border border-gray-200">Kelas, rombel, dan gedung/kamar asrama santri</td>
                                    </tr>
                                    <tr>
                                        <td className="p-2 font-medium text-gray-900 border border-gray-200" rowSpan={3}>Keuangan & Tagihan</td>
                                        <td className="p-2 font-mono text-teal-700 border border-gray-200">[tunggakan], [nominal]</td>
                                        <td className="p-2 text-gray-600 border border-gray-200">Total nominal tunggakan belum lunas (format Rupiah)</td>
                                    </tr>
                                    <tr>
                                        <td className="p-2 font-mono text-teal-700 border border-gray-200">[rincian_tagihan]</td>
                                        <td className="p-2 text-gray-600 border border-gray-200">Daftar nama pos tagihan yang belum dibayar</td>
                                    </tr>
                                    <tr>
                                        <td className="p-2 font-mono text-teal-700 border border-gray-200">[bulan], [tanggal]</td>
                                        <td className="p-2 text-gray-600 border border-gray-200">Nama bulan kalender & tanggal saat ini</td>
                                    </tr>
                                    <tr>
                                        <td className="p-2 font-medium text-gray-900 border border-gray-200" rowSpan={3}>Penerimaan Santri (PSB)</td>
                                        <td className="p-2 font-mono text-teal-700 border border-gray-200">[no_reg], [status_psb]</td>
                                        <td className="p-2 text-gray-600 border border-gray-200">Nomor registrasi pendaftaran & status seleksi</td>
                                    </tr>
                                    <tr>
                                        <td className="p-2 font-mono text-teal-700 border border-gray-200">[jalur], [gelombang]</td>
                                        <td className="p-2 text-gray-600 border border-gray-200">Jalur pendaftaran & gelombang masuk</td>
                                    </tr>
                                    <tr>
                                        <td className="p-2 font-mono text-teal-700 border border-gray-200">[status_berkas], [ruang_ujian], [tanggal_ujian]</td>
                                        <td className="p-2 text-gray-600 border border-gray-200">Kelengkapan berkas fisik & jadwal ujian masuk</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                )
            },
            {
                title: 'Wizard Antrean Pengiriman Massal (Dispatch Queue Modal)',
                color: 'purple',
                content: (
                    <div className="space-y-3 text-sm text-gray-700">
                        <div className="bg-purple-50 p-4 rounded-xl border border-purple-200 space-y-2">
                            <h4 className="font-bold text-purple-900 flex items-center gap-2">
                                <i className="bi bi-stack text-purple-600"></i>
                                Mengapa Menggunakan Dispatch Queue?
                            </h4>
                            <p className="text-xs text-purple-900 leading-relaxed">
                                Fitur lama yang membuka puluhan tab browser sekaligus sering diblokir oleh sistem anti-popup browser (hanya tab pertama yang terbuka) dan menyebabkan memori komputer penuh. <strong>Dispatch Queue Wizard</strong> memproses pengiriman satu per satu secara teratur, aman, dan transparan.
                            </p>
                        </div>

                        <div className="bg-white p-3.5 rounded-xl border border-gray-200 space-y-2">
                            <h5 className="font-bold text-gray-800 text-xs uppercase tracking-wider">Alur Kerja Antrean Pengiriman:</h5>
                            <ol className="list-decimal pl-5 space-y-1.5 text-xs text-gray-600">
                                <li>Centang santri atau calon santri yang akan dihubungi, lalu klik tombol <strong>Kirim Ke [X] Penerima</strong>.</li>
                                <li>Modal antrean akan terbuka menampilkan <strong>Progress Bar</strong>, nomor urut penerima aktif, dan pratinjau pesan lengkap.</li>
                                <li>
                                    <strong>Tombol "Kirim & Lanjut":</strong> Mengirim pesan ke penerima saat ini dan langsung berpindah ke penerima berikutnya dalam antrean.
                                </li>
                                <li>
                                    <strong>Tombol "Lewati":</strong> Melewati kontak saat ini jika nomor bermasalah atau belum ingin dihubungi tanpa membatalkan antrean penerima lainnya.
                                </li>
                                <li>
                                    <strong>Tombol "Tutup":</strong> Menghentikan antrean kapan saja jika ingin menyelesaikan sisa kontak di waktu lain.
                                </li>
                            </ol>
                        </div>
                    </div>
                )
            },
            {
                title: 'Riwayat Terakhir & Audit Trail Pengiriman',
                color: 'indigo',
                content: (
                    <div className="space-y-3 text-sm text-gray-700">
                        <p className="leading-relaxed">
                            Untuk menjaga transparansi dan akuntabilitas komunikasi lembaga, setiap pesan yang dikirimkan (baik via manual wa.me maupun gateway API) otomatis direkam ke sistem audit:
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="bg-gray-50 p-3 rounded-lg border text-xs space-y-1">
                                <span className="font-bold text-gray-800 block">Lencana Riwayat Kontak di Tabel</span>
                                <p className="text-gray-600">
                                    Kolom <strong>Riwayat Terakhir</strong> di tabel kontak menampilkan lencana waktu (misal: <em>Hari ini 09:15</em> atau <em>12 Agt</em>) beserta saluran yang digunakan. Arahkan kursor untuk melihat nama petugas pengirim.
                                </p>
                            </div>
                            <div className="bg-gray-50 p-3 rounded-lg border text-xs space-y-1">
                                <span className="font-bold text-gray-800 block">Log Audit Sistem Terpusat</span>
                                <p className="text-gray-600">
                                    Tercatat otomatis di modul audit (<code>whatsapp_logs</code>) meliputi nama penerima, nomor tujuan, saluran pengiriman, draf pesan, serta username admin yang mengeksekusi.
                                </p>
                            </div>
                        </div>
                    </div>
                )
            },
            {
                title: 'SOP Multi-Admin: Protokol Sinkronisasi Cloud Real-Time & Hub-and-Spoke',
                color: 'orange',
                content: (
                    <div className="space-y-4 text-sm text-gray-700">
                        <div className="bg-orange-50 p-4 rounded-xl border border-orange-200 space-y-2">
                            <h4 className="font-bold text-orange-950 flex items-center gap-2">
                                <i className="bi bi-diagram-3-fill text-orange-600"></i>
                                Penyelarasan Multi-Admin: Real-Time Cloud vs Hub-and-Spoke
                            </h4>
                            <p className="text-xs text-orange-900 leading-relaxed">
                                Pengiriman WhatsApp Center melibatkan koordinasi antar-divisi (Bendahara, Panitia PSB, Wali Kelas, Musyrif). eSantri Web mendukung dua arsitektur kerja multi-admin: <strong>Model A: Cloud Real-Time (Firebase)</strong> dan <strong>Model B: Hub-and-Spoke (Offline-First / Hybrid)</strong>. Ikuti tata kelola di bawah ini agar data tagihan akurat dan tidak terjadi pengiriman pesan ganda.
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
                                Diterapkan jika seluruh komputer admin dan posko terhubung internet / WiFi pondok secara stabil.
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                <div className="p-2.5 bg-white rounded-lg border border-teal-100 shadow-2xs space-y-1">
                                    <strong className="text-teal-950 block font-semibold">
                                        <i className="bi bi-broadcast text-teal-600"></i> Lencana Riwayat Kontak Instan
                                    </strong>
                                    <p className="text-[11px] text-gray-600 leading-relaxed">
                                        Saat Admin Keuangan mengirim tagihan ke Santri A, log riwayat (<code>whatsapp_logs</code>) langsung tersinkronisasi ke Cloud. Laptop staf lain langsung menampilkan lencana <em>"Dihubungi Hari ini"</em> detik itu juga, sehingga mencegah duplikasi pengiriman.
                                    </p>
                                </div>
                                <div className="p-2.5 bg-white rounded-lg border border-teal-100 shadow-2xs space-y-1">
                                    <strong className="text-teal-950 block font-semibold">
                                        <i className="bi bi-wallet2 text-teal-600"></i> Nilai Tagihan Terkini (No Fake Debt)
                                    </strong>
                                    <p className="text-[11px] text-gray-600 leading-relaxed">
                                        Pembayaran yang diinput kasir langsung terbarui secara real-time. Variabel <code>[tunggakan]</code> di perangkat staf manapun otomatis menampilkan saldo lunas, menghindari risiko menagih santri yang sudah membayar.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Model B: Hub-and-Spoke */}
                        <div className="p-3.5 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-2">
                            <div className="flex items-center justify-between border-b border-indigo-200/70 pb-1.5">
                                <h5 className="font-bold text-indigo-900 flex items-center gap-1.5 text-xs">
                                    <span className="w-5 h-5 rounded-full bg-indigo-200 text-indigo-800 flex items-center justify-center text-[10px] font-black">B</span>
                                    Model B: Hub-and-Spoke (Offline-First / Hybrid / File Sync)
                                </h5>
                                <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-[10px] font-bold uppercase">Hybrid / Offline</span>
                            </div>
                            <p className="text-xs text-gray-600">
                                Diterapkan jika posko PSB, asrama, atau kelas berada di area tanpa koneksi internet kontinu, atau pondok menggunakan sinkronisasi berkala via file/Dropbox.
                            </p>
                            <div className="space-y-2 text-xs">
                                <div className="p-2 bg-white rounded-lg border border-indigo-100">
                                    <strong className="text-indigo-950">1. Peran Komputer HUB (Pusat di Kantor TU / Keuangan):</strong>
                                    <p className="text-[11px] text-gray-600 mt-0.5">
                                        <strong>Pusatkan Broadcast Massal di HUB.</strong> Pengiriman siaran ratusan tagihan SPP bulanan atau maklumat akbar wajib dieksekusi dari komputer HUB yang memegang master data tunggakan paling mutakhir.
                                    </p>
                                </div>
                                <div className="p-2 bg-white rounded-lg border border-indigo-100">
                                    <strong className="text-indigo-950">2. Peran Laptop SPOKE (Posko PSB, Ruang BK, Kamar Asrama):</strong>
                                    <p className="text-[11px] text-gray-600 mt-0.5">
                                        Perangkat Spoke hanya mengirim pesan personal operasional (misal: panitia di meja posko mengabari 1 calon santri yang sedang mendaftar, atau ustadz mengabari 1 santri sakit).
                                    </p>
                                </div>
                                <div className="p-2 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-950 space-y-1">
                                    <strong>⚡ Aturan Sinkronisasi Spoke (Tarik Dulu, Baru Kirim, Lalu Unggah):</strong>
                                    <ol className="list-decimal pl-4 space-y-0.5 text-gray-700">
                                        <li><strong>Sebelum Broadcast:</strong> Spoke wajib klik <em>"Ambil Master Data (Auto-Pull)"</em> agar data tagihan dan nomor kontak bukan versi kedaluwarsa.</li>
                                        <li><strong>Setelah Broadcast:</strong> Spoke wajib membuka Pusat Sinkronisasi dan klik <em>"Kirim Perubahan (Upload Staff Changes)"</em> agar riwayat kontak terkirim ke HUB dan tidak dihubungi ulang oleh staf lain.</li>
                                        <li><strong>Admin HUB:</strong> Melakukan <em>"Gabungkan Perubahan (Merge Changes)"</em> dan menerbitkan Master Data terbaru.</li>
                                    </ol>
                                </div>
                            </div>
                        </div>

                        {/* 4 Pilar Operasional Umum */}
                        <div className="space-y-2.5">
                            <h5 className="font-bold text-gray-800 text-xs uppercase tracking-wider">4 Pilar Disiplin Komunikasi Pesantren:</h5>

                            <div className="border border-gray-200 rounded-xl p-3 bg-white space-y-1 text-xs">
                                <strong className="text-teal-700 flex items-center gap-1.5 font-bold">
                                    <i className="bi bi-clock-history"></i> 1. Jam Kirim & Quiet Hours
                                </strong>
                                <p className="text-gray-600 leading-relaxed">
                                    Siaran massal, tagihan SPP, dan informasi pendaftaran hanya dikirim pada rentang <strong>08.00 – 16.30 WIB</strong> di hari kerja. Dilarang mengirimkan notifikasi keuangan di malam hari atau saat jam ibadah santri.
                                </p>
                            </div>

                            <div className="border border-gray-200 rounded-xl p-3 bg-white space-y-1 text-xs">
                                <strong className="text-teal-700 flex items-center gap-1.5 font-bold">
                                    <i className="bi bi-person-check-fill"></i> 2. Matriks Peran & Hak Akses Template
                                </strong>
                                <p className="text-gray-600 leading-relaxed">
                                    Bendahara berwenang atas template <code>TAGIHAN</code> dan <code>KWITANSI</code>; Panitia PSB atas formulir dan ujian; Wali Kelas/Asrama atas <code>ABSENSI</code> dan <code>TAHFIZH</code>; serta Pimpinan/Humas atas <code>PENGUMUMAN</code> umum.
                                </p>
                            </div>

                            <div className="border border-gray-200 rounded-xl p-3 bg-white space-y-1 text-xs">
                                <strong className="text-teal-700 flex items-center gap-1.5 font-bold">
                                    <i className="bi bi-check-circle-fill"></i> 3. Checklist Sebelum Kirim
                                </strong>
                                <p className="text-gray-600 leading-relaxed">
                                    Cek lencana riwayat kontak di tabel, pastikan target penerima telah difilter dengan tepat, dan lakukan uji coba 1 pesan ke nomor internal sebelum menjalankan antrean massal.
                                </p>
                            </div>

                            <div className="border border-gray-200 rounded-xl p-3 bg-white space-y-1 text-xs">
                                <strong className="text-teal-700 flex items-center gap-1.5 font-bold">
                                    <i className="bi bi-headset"></i> 4. Penanganan Balasan Wali Santri
                                </strong>
                                <p className="text-gray-600 leading-relaxed">
                                    Tentukan petugas piket yang memegang ponsel fisik nomor pengirim WhatsApp untuk merespons pertanyaan wali santri secara cepat, santun, dan mengedepankan tabayyun.
                                </p>
                            </div>
                        </div>
                    </div>
                )
            }
        ]
    }
];
