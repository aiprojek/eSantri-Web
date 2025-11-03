# eSantri Web - Manajemen Data Santri

![eSantri Web Logo](public/icon.svg)

[![Lisensi](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)
[![GitHub Repo](https://img.shields.io/badge/GitHub-Repo-black.svg?logo=github)](https://github.com/aiprojek/esantri-app)

**eSantri Web** adalah aplikasi berbasis web yang dirancang untuk membantu administrasi Pondok Pesantren dalam mengelola data santri secara efisien. Aplikasi ini bersifat **offline-first**, artinya semua data disimpan secara lokal di browser Anda, memungkinkan penggunaan tanpa koneksi internet dan menjamin privasi data sepenuhnya.

## 🎯 Skenario Penggunaan & Peringatan Penting

> **PERHATIAN**: Aplikasi ini dirancang untuk penggunaan **terpusat oleh satu orang (administrator) di satu komputer/laptop**. Semua data disimpan secara lokal di *cache* browser Anda (IndexedDB) dan **tidak dapat diakses** dari komputer lain atau oleh pengguna lain secara bersamaan.
>
> Skenario ini sempurna untuk administrator tunggal, tetapi **tidak cocok untuk tim** yang membutuhkan kolaborasi atau akses data bersamaan.

## 💡 Kolaborasi Unik di Balik eSantri Web

Aplikasi eSantri Web lahir dari sebuah kolaborasi inovatif antara manusia dan kecerdasan buatan (AI). Proyek ini adalah bukti sinergi yang kuat antara visi dan keahlian domain dari pengguna dengan kemampuan eksekusi teknis dari AI.

-   **Peran Manusia**: Sebagai **Visioner dan Project Manager**. Manusia memberikan ide inti, mengarahkan alur pengembangan, meminta fitur-fitur spesifik, melakukan pengujian, dan memastikan aplikasi ini benar-benar menjawab kebutuhan nyata di administrasi pondok pesantren. Andalah ahli di bidangnya.

-   **Peran AI**: Sebagai **Senior Frontend Engineer**. Saya bertugas menerjemahkan visi dan permintaan Anda menjadi kode yang fungsional, bersih, dan memiliki desain UI/UX yang baik. Saya menangani implementasi teknis, mulai dari struktur data, logika aplikasi, hingga tampilan antarmuka, dengan mengikuti praktik terbaik dalam rekayasa perangkat lunak.

Kerja sama ini memungkinkan eSantri Web dikembangkan dengan cepat dan efisien, menggabungkan pemahaman mendalam tentang dunia pesantren dengan eksekusi teknis yang canggih.

## ✨ Fitur Unggulan

-   **Dashboard Interaktif**: Ringkasan visual data santri, keuangan, dan keasramaan secara cepat dan mudah dipahami.
-   **Database Santri Terpusat**: Kelola data lengkap santri, orang tua/wali, riwayat status, prestasi, hingga pelanggaran di satu tempat.
-   **Manajemen Keuangan Terintegrasi**: Fitur lengkap mulai dari pembuatan tagihan massal, pencatatan pembayaran, manajemen uang saku, hingga notifikasi tunggakan.
-   **Manajemen Keasramaan**: Atur data gedung, kamar, musyrif/ah, dan penempatan santri di asrama dengan mudah.
-   **Buku Kas Umum**: Catat semua pemasukan dan pengeluaran umum pondok untuk laporan arus kas yang transparan.
-   **Generator NIS Otomatis**: Buat Nomor Induk Santri secara otomatis dengan tiga metode yang dapat diatur sesuai kebutuhan.
-   **Laporan & Cetak Lengkap**: Cetak lebih dari 15 jenis dokumen penting seperti biodata, kartu santri, lembar nilai, absensi, rapor, formulir izin, hingga laporan keuangan.
-   **Ekspor & Impor Massal**: Tambah dan perbarui data santri dalam jumlah besar dengan mudah melalui file CSV.
-   **Pengaturan Fleksibel**: Kustomisasi struktur pendidikan, komponen biaya, format NIS, hingga redaksi surat tagihan dan pesan WhatsApp.
-   **Fungsi Offline Penuh**: Aplikasi tetap berjalan lancar dan semua data aman meski tanpa koneksi internet.

## 🚀 Panduan Cepat

1.  **Pengaturan Awal (Wajib)**: Buka halaman `Pengaturan` dan `Keuangan`. Konfigurasikan semua data master terlebih dahulu, seperti:
    -   Informasi Umum & Logo Pondok
    -   Struktur Pendidikan (Jenjang, Kelas, Rombel)
    -   Data Tenaga Pendidik (Mudir, Wali Kelas)
    -   Komponen Biaya (SPP, Uang Pangkal, dll.)
    -   Generator NIS

2.  **Kelola Data Santri**: Masuk ke halaman `Data Santri` untuk menambah, mengedit, atau menghapus data santri. Manfaatkan fitur **Impor CSV** untuk menambah data dalam jumlah besar.

3.  **Kelola Keuangan**: Gunakan menu `Keuangan` untuk:
    -   **Generate Tagihan** bulanan atau tagihan awal.
    -   **Catat Pembayaran** santri.
    -   Kirim **Surat Tagihan** atau notifikasi **WhatsApp** untuk tunggakan.
    -   Kelola **Uang Saku** (saldo titipan).

4.  **Cetak Laporan**: Kunjungi halaman `Laporan & Cetak` untuk mencetak berbagai dokumen administratif yang dibutuhkan.

5.  **Backup Data (Sangat Penting!)**: Secara berkala, buka halaman `Pengaturan` -> `Cadangkan & Pulihkan Data`, lalu klik **Unduh Cadangan Data**. Simpan file backup di tempat yang aman.

## 🛡️ Keamanan Data & Backup

Karena data tersimpan 100% lokal di browser Anda, risiko kehilangan data ada jika terjadi kerusakan pada perangkat atau *cache browser* dibersihkan.

Untuk mencegah hal ini, **sangat disarankan** untuk melakukan backup data secara rutin melalui menu **`Pengaturan` -> `Cadangkan & Pulihkan Data`**. Simpan file backup (*.json*) di lokasi yang aman seperti Google Drive, Flashdisk, atau media penyimpanan lainnya.

## 👨‍💻 Untuk Pengembang (Developers)

Aplikasi ini bersifat *open-source* dengan lisensi GNU GPL v3. Bagi yang ingin mengembangkannya lebih lanjut agar dapat digunakan oleh banyak admin (*multi-user*), disarankan untuk mengintegrasikannya dengan *backend* (server-side) dan database terpusat (seperti MySQL, PostgreSQL, dll.).

Kode sumber lengkap dapat diakses di repositori GitHub kami.

## 🛠️ Tumpukan Teknologi

-   **Frontend**: React, TypeScript
-   **Styling**: Tailwind CSS, Bootstrap Icons
-   **Local Storage**: Dexie.js (IndexedDB Wrapper)
-   **Form Management**: React Hook Form

## 📜 Lisensi

Proyek ini dilisensikan di bawah **GNU General Public License v3.0**.

## 📞 Kontak & Dukungan

-   **Diskusi & Laporan Bug**: [GitHub Issues](https://github.com/aiprojek/esantri-app/issues)
-   **Komunitas Telegram**: [Diskusi eSantri Web](https://t.me/aiprojek_community/32)
-   **Dukung Pengembang**: [Traktir Kopi](https://lynk.id/aiprojek/s/bvBJvdA)