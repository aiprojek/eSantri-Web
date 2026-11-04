import React from 'react';
import { PanduanSectionData } from '../panduan';

export const sertifikatPanduan: PanduanSectionData = {
    id: 'sertifikat',
    badge: 'Piagam',
    badgeColor: 'teal',
    title: 'Sertifikat & Piagam Kustom, AI Redaksi & SOP Multi-Admin',
    steps: [
        {
            title: '1. Fungsi Modul & Perbedaan dengan Syahadah Tahfizh Reguler',
            color: 'teal',
            content: (
                <div className="space-y-3 text-sm">
                    <p className="text-gray-700 leading-relaxed">
                        Menu <strong>Pendidikan &gt; Sertifikat &amp; Piagam</strong> dirancang khusus untuk mewadahi penerbitan dokumen penghargaan dan syahadah kegiatan pondok di luar alur mutaba&apos;ah harian modul Tahfizh reguler, namun tetap <strong>tercatat resmi ke dalam Buku Agenda / Arsip Surat Keluar</strong>.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                        <div className="bg-teal-50/80 p-3.5 rounded-xl border border-teal-200 space-y-1.5">
                            <h5 className="font-bold text-teal-900 flex items-center gap-1.5 text-xs">
                                <i className="bi bi-patch-check-fill text-teal-600"></i> Kegiatan yang Diwadahi Modul Ini
                            </h5>
                            <ul className="list-disc pl-4 space-y-1 text-gray-700 leading-relaxed">
                                <li><strong>Syahadah Hafalan Mutun Ilmiyah:</strong> Tuhfatul Athfal, Jazariyah, Arbain Nawawi, Aqidatul Awam, Jurumiyah, Imrithi, Alfiyah, dll.</li>
                                <li><strong>Syahadah Tasmi&apos; / Tahfizh Mandiri:</strong> Tasmi&apos; sekali duduk (1/5/10/30 Juz), daurah karantina tahfizh liburan, atau program tahfizh eksternal.</li>
                                <li><strong>Sertifikat Khatam Kitab &amp; Daurah:</strong> Sanad/ijazah kajian kitab kuning, daurah bahasa Arab/Inggris, pelatihan pengabdian.</li>
                                <li><strong>Piagam Kejuaraan &amp; Apresiasi:</strong> Juara lomba MQK, Khitobah, Pospeda, Santri Teladan, hingga Piagam Penghargaan Asatidz, Pemateri Tamu, dan Panitia.</li>
                            </ul>
                        </div>
                        <div className="bg-amber-50/80 p-3.5 rounded-xl border border-amber-200 space-y-1.5">
                            <h5 className="font-bold text-amber-900 flex items-center gap-1.5 text-xs">
                                <i className="bi bi-shield-check text-amber-600"></i> Hak Akses Mandiri per Akun (RBAC)
                            </h5>
                            <p className="text-gray-700 leading-relaxed">
                                Modul ini memiliki baris hak akses tersendiri di <strong>Pengaturan &gt; Keamanan &amp; Pengguna</strong> dengan nama modul <strong><code>Sertifikat &amp; Piagam</code></strong>:
                            </p>
                            <ul className="list-disc pl-4 space-y-1 text-gray-700 leading-relaxed">
                                <li><strong>Edit (Write):</strong> Bebas membuat sertifikat, memakai AI Redaksi, mencetak/unduh PDF, menyimpan template, dan mencatat ke Buku Agenda.</li>
                                <li><strong>Lihat (Read):</strong> Hanya melihat pratinjau dan mencetak ulang sertifikat yang sudah terbit di Arsip tanpa bisa mengubah template atau menerbitkan arsip baru.</li>
                                <li><strong>Blokir (None):</strong> Menyembunyikan menu Sertifikat &amp; Piagam sepenuhnya dari akun staf tersebut (misal guru mapel biasa yang hanya diberi akses Rapor).</li>
                            </ul>
                        </div>
                    </div>
                </div>
            ),
        },
        {
            title: '2. Standar Operasional Prosedur (SOP) Multi-Admin & Sinkronisasi Cloud',
            color: 'purple',
            content: (
                <div className="space-y-4 text-sm">
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-950 text-xs flex items-start gap-2.5">
                        <i className="bi bi-exclamation-triangle-fill text-amber-600 shrink-0 text-base mt-0.5"></i>
                        <div>
                            <strong className="font-bold text-amber-900 block mb-0.5">Kunci Tertib Administrasi Lintas Lajnah / Kepanitiaan:</strong>
                            Di akhir semester atau pekan haflah, sering kali <strong>Lajnah Ilmiyah</strong>, <strong>Lajnah Tahfizh</strong>, <strong>Panitia Lomba Kesantrian</strong>, dan <strong>Kantor TU</strong> menerbitkan dokumen secara bersamaan dari laptop berbeda. Patuhi standar arsitektur sinkronisasi dan aturan kode penomoran di bawah ini agar Buku Agenda tetap rapi dan bebas bentrok.
                        </div>
                    </div>

                    {/* Apa saja yang disinkronkan */}
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-2">
                        <strong className="text-slate-900 flex items-center gap-1.5 font-bold">
                            <i className="bi bi-database-check text-teal-600"></i> 3 Komponen Data Sertifikat yang Disinkronkan ke Cloud:
                        </strong>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                                <strong className="text-teal-900 block text-[11px]">1. Arsip &amp; Snapshot Utuh (<code>arsipSurat</code>)</strong>
                                <span className="text-[11px] text-gray-600">Menyimpan nomor agenda sekaligus snapshot penuh desain sertifikat. ID memakai <em>Sync-Safe ID</em> sehingga tidak pernah bentrok antar-laptop.</span>
                            </div>
                            <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                                <strong className="text-teal-900 block text-[11px]">2. Template Kustom (<code>settings</code>)</strong>
                                <span className="text-[11px] text-gray-600">Template kustom pondok tersimpan di pengaturan induk (<code>sertifikatTemplates</code>) agar dapat dipakai seragam oleh seluruh staf.</span>
                            </div>
                            <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                                <strong className="text-teal-900 block text-[11px]">3. TTD &amp; Stempel (<code>digitalAssets</code>)</strong>
                                <span className="text-[11px] text-gray-600">Gambar tanda tangan digital ustadz/mudir dan stempel khusus tersinkronisasi penuh lintas perangkat.</span>
                            </div>
                        </div>
                    </div>

                    {/* Model 1: Firebase Realtime */}
                    <div className="p-3.5 bg-teal-50/80 border border-teal-200 rounded-xl space-y-2.5">
                        <div className="flex items-center justify-between border-b border-teal-200/70 pb-2">
                            <h5 className="font-bold text-teal-950 flex items-center gap-2 text-xs md:text-sm">
                                <span className="w-5 h-5 rounded-full bg-teal-600 text-white flex items-center justify-center text-[10px] font-black">A</span>
                                SOP Mode Realtime (Firebase Cloud Firestore) — Rekomendasi Utama
                            </h5>
                            <span className="px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 text-[10px] font-bold uppercase tracking-wide">
                                Auto-Sync Instan
                            </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                            <div className="p-2.5 bg-white rounded-lg border border-teal-100 space-y-1">
                                <strong className="text-teal-950 block font-semibold text-[11px]">
                                    <i className="bi bi-cloud-check-fill text-teal-600"></i> Alur Penerbitan &amp; Buku Agenda Live:
                                </strong>
                                <ul className="list-disc pl-4 space-y-1 text-[11px] text-gray-600">
                                    <li>Saat staf mengeklik <strong>Cetak</strong>, <strong>Unduh PDF</strong>, atau <strong>Simpan Arsip</strong>, data sertifikat langsung terkirim ke Firestore dalam hitungan detik.</li>
                                    <li>Urutan nomor agenda otomatis di laptop staf lain langsung menyesuaikan dengan arsip terbaru yang baru saja terbit.</li>
                                    <li>Kantor TU dapat langsung melihat, mengirim WA ke wali, atau mencetak ulang sertifikat tersebut dari menu <em>Surat Menyurat &gt; Arsip Surat</em> tanpa minta file ulang ke panitia.</li>
                                </ul>
                            </div>
                            <div className="p-2.5 bg-white rounded-lg border border-teal-100 space-y-1">
                                <strong className="text-teal-950 block font-semibold text-[11px]">
                                    <i className="bi bi-sliders text-teal-600"></i> Disiplin Pengelolaan Template &amp; Aset:
                                </strong>
                                <ul className="list-disc pl-4 space-y-1 text-[11px] text-gray-600">
                                    <li>Unggah TTD Digital Mudir &amp; Asatidz terlebih dahulu di <strong>Pengaturan &gt; Aset TTD &amp; Stempel</strong> oleh Admin Utama sebelum musim cetak syahadah dimulai.</li>
                                    <li>Pembuatan/pengubahan <strong>Template Kustom Standar Pondok</strong> cukup dilakukan oleh 1 Koordinator Pendidikan agar tidak saling menimpa pengaturan secara bersamaan.</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {/* Model 2: Hub-and-Spoke */}
                    <div className="p-3.5 bg-indigo-50/80 border border-indigo-200 rounded-xl space-y-2.5">
                        <div className="flex items-center justify-between border-b border-indigo-200/70 pb-2">
                            <h5 className="font-bold text-indigo-950 flex items-center gap-2 text-xs md:text-sm">
                                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-black">B</span>
                                SOP Mode Hub-and-Spoke (Dropbox / WebDAV) — Hybrid &amp; Lapangan Offline
                            </h5>
                            <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-[10px] font-bold uppercase tracking-wide">
                                Semi-Offline
                            </span>
                        </div>
                        <ol className="list-decimal pl-5 space-y-1.5 text-xs text-gray-700 bg-white p-3 rounded-lg border border-indigo-100">
                            <li>
                                <strong>Sebelum Kegiatan (SPOKE / Laptop Panitia):</strong> Pastikan login saat terhubung internet agar <em>Auto-Pull</em> menarik data santri, TTD digital ustadz, dan nomor urut agenda terbaru (atau klik manual <strong>Ambil Master Data</strong>).
                            </li>
                            <li>
                                <strong>Saat Cetak di Aula / Offline (SPOKE):</strong> Gunakan <strong>Kode Klasifikasi Khusus Kepanitiaan</strong> (lihat Langkah 3 di bawah, misal <code>SYH-MTN</code> atau <code>PGM-MQK</code>) supaya nomor urut lokal panitia tidak bertabrakan dengan surat harian Kantor TU yang sedang berjalan di tempat lain.
                            </li>
                            <li>
                                <strong>Selesai Kegiatan — Wajib Setor ke Cloud (SPOKE):</strong> Hubungkan laptop ke internet, klik ikon Cloud di pojok kanan atas &rarr; pilih <strong>&quot;Kirim Perubahan (Upload Staff Changes)&quot;</strong> sebelum <em>Logout</em>.
                            </li>
                            <li>
                                <strong>Rekonsiliasi Buku Agenda Pusat (HUB / Admin Utama):</strong> Admin Utama membuka <strong>Pusat Sinkronisasi</strong> &rarr; klik <strong>&quot;Gabungkan Perubahan (Merge)&quot;</strong> pada kiriman panitia &rarr; <strong>WAJIB klik &quot;Publikasikan Master Data&quot;</strong> agar seluruh arsip sertifikat resmi menyatu di Buku Agenda Master.
                            </li>
                            <li>
                                <strong>Aturan Template pada Hub-and-Spoke:</strong> Karena dokumen Pengaturan Pondok bersifat tunggal (<em>last-modified wins</em>), buatlah <strong>Template Kustom Baru</strong> di komputer <strong>HUB (Admin Utama)</strong> lalu publikasikan ke staf. Perangkat <strong>SPOKE</strong> fokus menerbitkan arsip sertifikat yang digabung aman per-dokumen tanpa menimpa data staf lain.
                            </li>
                        </ol>
                    </div>
                </div>
            ),
        },
        {
            title: '3. Standar Kode Penomoran Anti-Tabrakan Antar-Divisi',
            color: 'orange',
            content: (
                <div className="space-y-3 text-sm">
                    <p className="text-gray-700 leading-relaxed text-xs">
                        Agar penomoran otomatis Buku Agenda tidak pernah ganda ketika beberapa bagian mencetak dokumen di hari yang sama, tetapkan <strong>Kode Klasifikasi Berbeda per Divisi</strong> pada kolom <em>Kode Klasifikasi</em>:
                    </p>
                    <div className="overflow-x-auto rounded-xl border border-orange-200">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-orange-50 text-orange-950 font-bold border-b border-orange-200">
                                <tr>
                                    <th className="p-2.5">Divisi / Penyelenggara</th>
                                    <th className="p-2.5">Kode Klasifikasi Standar</th>
                                    <th className="p-2.5">Contoh Nomor Terbit</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-orange-100 bg-white text-gray-700">
                                <tr>
                                    <td className="p-2.5 font-medium">Tata Usaha (Surat Umum)</td>
                                    <td className="p-2.5 font-mono text-teal-800">SRT-UM/PP</td>
                                    <td className="p-2.5 font-mono text-[11px]">014/SRT-UM/PP/XI/2026</td>
                                </tr>
                                <tr>
                                    <td className="p-2.5 font-medium">Lajnah Ilmiyah (Syahadah Mutun)</td>
                                    <td className="p-2.5 font-mono text-teal-800">SYH-MTN/PP</td>
                                    <td className="p-2.5 font-mono text-[11px]">001/SYH-MTN/PP/XI/2026</td>
                                </tr>
                                <tr>
                                    <td className="p-2.5 font-medium">Lajnah Tahfizh (Tasmi&apos; / Karantina)</td>
                                    <td className="p-2.5 font-mono text-teal-800">SYH-TFZ/PP</td>
                                    <td className="p-2.5 font-mono text-[11px]">001/SYH-TFZ/PP/XI/2026</td>
                                </tr>
                                <tr>
                                    <td className="p-2.5 font-medium">Kurikulum / Daurah Kitab</td>
                                    <td className="p-2.5 font-mono text-teal-800">SRT-DRH/PP</td>
                                    <td className="p-2.5 font-mono text-[11px]">001/SRT-DRH/PP/XI/2026</td>
                                </tr>
                                <tr>
                                    <td className="p-2.5 font-medium">Kesantrian / Panitia Lomba</td>
                                    <td className="p-2.5 font-mono text-teal-800">PGM-LMB/PP</td>
                                    <td className="p-2.5 font-mono text-[11px]">001/PGM-LMB/PP/XI/2026</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <div className="p-2.5 bg-teal-50 border border-teal-200 rounded-lg text-[11px] text-teal-950">
                        <strong>💡 Perlindungan Anti-Duplikat Otomatis:</strong> Apabila Anda mencetak ulang sertifikat yang sama karena tinta printer bergaris atau kertas miring (dengan Nomor Sertifikat dan Nama Penerima yang sama), sistem <strong>otomatis memperbarui arsip yang ada tanpa membuat baris ganda</strong> di Buku Agenda.
                    </div>
                </div>
            ),
        },
        {
            title: '4. Panduan Langkah-demi-Langkah Membuat Sertifikat & Menggunakan AI Redaksi',
            color: 'blue',
            content: (
                <div className="space-y-3 text-sm">
                    <ol className="list-decimal pl-5 space-y-2 text-xs text-gray-700">
                        <li>
                            <strong>Pilih Preset atau Tema Visual (5 Tema A4 Landscape):</strong>
                            <p className="text-[11px] text-gray-600 mt-0.5">
                                Klik salah satu preset cepat (<em>Mutun Ilmiyah, Tasmi&apos; Mandiri, Khatam Kitab, Juara Lomba, Santri Teladan, Apresiasi Asatidz</em>) lalu pilih satu dari 5 tema desain: <strong>Klasik Pesantren</strong> (krem emas), <strong>Modern Geometris</strong> (zamrud bersih), <strong>Ornamen Samping</strong> (aksen vertikal kiri), <strong>Eksklusif Malam</strong> (biru tua tinta emas), atau <strong>Ceria Berwarna</strong> (untuk marhalah ula/anak).
                            </p>
                        </li>
                        <li>
                            <strong>Gunakan Penyusun Redaksi AI (Opsional namun Sangat Cepat):</strong>
                            <p className="text-[11px] text-gray-600 mt-0.5">
                                Klik tombol <strong>&quot;Susun Redaksi AI&quot;</strong> di kanan atas. Pilih kategori kegiatan, ketik deskripsi singkat (contoh: <em>&quot;Lulus ujian sekali duduk Matan Al-Jazariyah 109 bait pada Daurah Ilmiyah Ramadhan 1448 H&quot;</em>), pilih gaya bahasa (<em>Formal Pesantren</em>, <em>Islami &amp; Doa</em>, atau <em>Akademik Modern</em>), lalu klik <strong>Buat Redaksi</strong>. AI otomatis mengisi Judul, Subjudul, Teks Capaian, dan Pesan Apresiasi/Doa yang proporsional agar pas 1 halaman.
                            </p>
                        </li>
                        <li>
                            <strong>Tentukan Mode Penerima (Tunggal, Massal, atau Manual/Non-Santri):</strong>
                            <ul className="list-disc pl-4 mt-1 space-y-1 text-[11px] text-gray-600">
                                <li><strong>1 Santri:</strong> Cari &amp; pilih santri aktif; NIS, Jenjang, Kelas/Rombel, dan Nama Wali terisi otomatis.</li>
                                <li><strong>Massal (Banyak Santri):</strong> Filter per Jenjang/Kelas/Rombel lalu centang banyak santri sekaligus. Aktifkan <em>&quot;Kustomisasi Capaian / Predikat per Santri&quot;</em> jika dalam satu rombongan tiap santri berbeda kitab mutun, berbeda juz, atau berbeda peringkat juara (Juara 1, 2, 3) — semuanya tercetak berurutan dalam satu klik!</li>
                                <li><strong>Manual / Non-Santri:</strong> Ketik nama bebas atau klik pintasan <em>&quot;Ambil dari Data Pengajar&quot;</em> untuk membuat piagam penghargaan ustadz, musyrif, juri, atau pemateri tamu.</li>
                            </ul>
                        </li>
                        <li>
                            <strong>Atur Penanda Tangan, TTD Digital &amp; Segel Stempel:</strong>
                            <p className="text-[11px] text-gray-600 mt-0.5">
                                Pilih <strong>1 atau 2 Penanda Tangan</strong> (otomatis menarik Mudir/Pimpinan, Muhaffizh Halaqah santri, Wali Kelas, pilih dari daftar Ustadz, atau ketik manual). Aktifkan <strong>TTD Digital</strong> (hanya memunculkan tanda tangan milik ustadz bersangkutan secara ketat) dan pilih <strong>Stempel Segel Resmi SVG</strong> (teks melingkar bawah dapat diubah seperti <code>★ LAJNAH ILMIYAH ★</code> atau <code>★ PANITIA DAURAH ★</code>) maupun stempel gambar pondok.
                            </p>
                        </li>
                        <li>
                            <strong>Simpan sebagai Template Kustom (Untuk Kegiatan Rutin):</strong>
                            <p className="text-[11px] text-gray-600 mt-0.5">
                                Klik <strong>&quot;Simpan Template&quot;</strong> agar seluruh susunan tema, redaksi, kode nomor, dan penanda tangan tersimpan di tab <em>Template &amp; Preset</em> dan siap dipakai kembali semester depan.
                            </p>
                        </li>
                    </ol>
                </div>
            ),
        },
        {
            title: '5. Tips Cetak Presisi Kertas Piagam (Linen/Art Carton) & Pengelolaan Buku Agenda',
            color: 'green',
            content: (
                <div className="space-y-3 text-sm">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                        <div className="bg-emerald-50/80 p-3.5 rounded-xl border border-emerald-200 space-y-1.5">
                            <h5 className="font-bold text-emerald-950 flex items-center gap-1.5">
                                <i className="bi bi-printer-fill text-emerald-600"></i> Setelan Dialog Print Browser Wajib
                            </h5>
                            <ul className="list-disc pl-4 space-y-1 text-gray-700 leading-relaxed">
                                <li><strong>Ukuran Kertas (Paper Size):</strong> <code>A4</code>.</li>
                                <li><strong>Orientasi (Layout):</strong> <code>Landscape</code> (otomatis diarahkan oleh sistem).</li>
                                <li><strong>Margin:</strong> Pilih <code>None (Tidak Ada)</code> atau <code>Default</code>, dan Skala <code>100% / Default</code>.</li>
                                <li><strong>Background Graphics (Grafis Latar Belakang):</strong> <strong>WAJIB DICENTANG</strong> agar warna krem klasik, biru tua (<em>Eksklusif Malam</em>), dan ornamen emas tercetak utuh di kertas linen/concorde/art carton.</li>
                            </ul>
                        </div>
                        <div className="bg-blue-50/80 p-3.5 rounded-xl border border-blue-200 space-y-1.5">
                            <h5 className="font-bold text-blue-950 flex items-center gap-1.5">
                                <i className="bi bi-journal-bookmark-fill text-blue-600"></i> Buku Agenda, WA Wali &amp; Cetak Ulang
                            </h5>
                            <ul className="list-disc pl-4 space-y-1 text-gray-700 leading-relaxed">
                                <li>Buka tab <strong>Arsip &amp; Buku Agenda</strong> untuk menelusuri seluruh sertifikat yang pernah diterbitkan.</li>
                                <li>Klik ikon <strong>Mata (Lihat)</strong> untuk membuka pratinjau penuh dan mencetak ulang sertifikat santri yang hilang/rusak kapan saja.</li>
                                <li>Klik ikon <strong>WhatsApp</strong> untuk mengabarkan kelulusan mutun/tasmi&apos;/juara lomba langsung ke orang tua santri.</li>
                                <li>Arsip sertifikat juga terintegrasi di menu <strong>Surat Menyurat &gt; Arsip Surat</strong> lengkap dengan filter khusus <em>Hanya Sertifikat &amp; Piagam</em>, ekspor Excel, dan cetak Buku Agenda resmi TU.</li>
                            </ul>
                        </div>
                    </div>
                </div>
            ),
        },
    ],
};
