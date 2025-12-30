
# eSantri Web - Manajemen Data Santri

![eSantri Web Logo](public/icon.svg)

[![Lisensi](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)
[![GitHub Repo](https://img.shields.io/badge/GitHub-Repo-black.svg?logo=github)](https://github.com/aiprojek/eSantri-Web)

**eSantri Web** adalah aplikasi berbasis web yang dirancang untuk membantu administrasi Pondok Pesantren dalam mengelola data santri secara efisien. Aplikasi ini bersifat **offline-first**, artinya semua data disimpan secara lokal di browser Anda, memungkinkan penggunaan tanpa koneksi internet dan menjamin privasi data sepenuhnya.

## 🎯 Skenario Penggunaan & Peringatan Penting

> **PERHATIAN**: Aplikasi ini dirancang untuk penggunaan **terpusat oleh satu orang (administrator) di satu komputer/laptop**. Semua data disimpan secara lokal di *cache* browser Anda (IndexedDB) dan **tidak dapat diakses** dari komputer lain atau oleh pengguna lain secara bersamaan.
>
> Skenario ini sempurna untuk administrator tunggal, tetapi **tidak cocok untuk tim** yang membutuhkan kolaborasi atau akses data bersamaan, kecuali Anda mengaktifkan fitur **Supabase Cloud Sync**.

## ✨ Fitur Unggulan

-   **Dashboard Interaktif**: Ringkasan visual data santri, keuangan, dan keasramaan secara cepat dan mudah dipahami.
-   **Penerimaan Santri Baru (PSB)**: Modul lengkap untuk pendaftaran online, seleksi, hingga input data otomatis. Dilengkapi fitur *Impor WA* dan formulir online.
-   **Database Santri Terpusat**: Kelola data lengkap santri, orang tua/wali, riwayat status, prestasi, hingga pelanggaran di satu tempat.
-   **Surat Menyurat Otomatis**: Buat surat resmi, izin, atau pemberitahuan dengan sistem template dan *mail merge*. Dilengkapi **Magic Draft (AI)** untuk membuat isi surat otomatis.
-   **Laporan Profesional & Native PDF**: Cetak lebih dari 15 jenis dokumen (Biodata, Kuitansi, Rapor, dll) dengan hasil cetak vektor yang tajam (Native PDF Export).
-   **Manajemen Keuangan & Kas**: Fitur lengkap mulai dari tagihan massal, pembayaran, uang saku, hingga Laporan Arus Kas Umum.
-   **Audit Log & Keamanan**: Pantau setiap perubahan data (siapa, kapan, apa yang diubah). Mendukung sinkronisasi log ke cloud.
-   **Cloud Sync & Backup**:
    -   **Mode Backup (Legacy):** Simpan cadangan data ke **Dropbox** atau **Nextcloud/WebDAV**. Mendukung *Auto-Sync*.
    -   **Mode Realtime (Modern):** Integrasi dengan **Supabase** untuk penyimpanan data terpusat dan dukungan multi-admin.
-   **Generator NIS Otomatis**: Buat Nomor Induk Santri secara otomatis dengan tiga metode yang dapat diatur.
-   **Ekspor & Impor Massal**: Tambah dan perbarui data santri dalam jumlah besar dengan mudah melalui file CSV atau *Bulk Editor* (tabel interaktif).

## 🛠️ Teknologi yang Digunakan

Aplikasi ini dibangun menggunakan tumpukan teknologi modern (Modern Web Stack) untuk menjamin performa tinggi, kemudahan pengembangan, dan kemampuan offline:

-   **Core**: [React 18](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
-   **Build Tool**: [Vite](https://vitejs.dev/) (Sangat cepat dan ringan)
-   **Styling**: [Tailwind CSS](https://tailwindcss.com/)
-   **Local Database**: [Dexie.js](https://dexie.org/) (Wrapper untuk IndexedDB browser)
-   **Cloud Database (Opsional)**: [Supabase](https://supabase.com/) (PostgreSQL & Realtime)
-   **Cloud Storage**: Integrasi API [Dropbox](https://www.dropbox.com/) & WebDAV client
-   **PDF Generation**: `jspdf` & `html2canvas` (Client-side rendering)
-   **Icons**: Bootstrap Icons

## 🚀 Panduan Cepat

1.  **Pengaturan Awal (Wajib)**: Buka halaman `Pengaturan`. Konfigurasikan:
    -   Informasi Umum & Logo Pondok.
    -   Struktur Pendidikan (Jenjang, Kelas, Rombel).
    -   Data Tenaga Pendidik.
    -   Komponen Biaya & Generator NIS.

2.  **Penerimaan Santri (PSB)**: Buka menu `PSB`. Gunakan tab **Desain Formulir** untuk membuat formulir pendaftaran online. Data pendaftar dapat ditarik dari Cloud atau diimpor dari pesan WhatsApp.

3.  **Kelola Data Santri**: Masuk ke halaman `Data Santri` untuk menambah, mengedit, atau menghapus data. Gunakan **Editor Massal** untuk mempercepat input data banyak santri sekaligus.

4.  **Kelola Keuangan**: Gunakan menu `Keuangan` untuk generate tagihan bulanan, mencatat pembayaran, dan mengelola uang saku santri.

5.  **Cetak Laporan**: Kunjungi halaman `Laporan & Cetak` untuk mencetak Biodata, Kartu Santri, Rekening Koran, hingga Laporan Wali Kelas.

## 🛡️ Keamanan Data & Backup

Karena data tersimpan 100% lokal di browser Anda (kecuali jika menggunakan Supabase), risiko kehilangan data ada jika perangkat rusak atau cache browser dibersihkan.

**Sangat disarankan** untuk:
1.  Mengaktifkan **Sinkronisasi Otomatis** ke Dropbox/WebDAV di menu Pengaturan.
2.  Atau melakukan backup manual rutin via tombol "Sync Cloud" atau "Unduh Cadangan Data".

## 📦 Panduan Instalasi & Build (Offline)

Agar aplikasi dapat berjalan **sepenuhnya tanpa internet**, Anda harus melakukan proses *build*. Proses ini akan memaketkan semua library (React, dll) ke dalam file lokal.

**Prasyarat:**
Pastikan Anda memiliki [Node.js](https://nodejs.org/) terinstal di komputer Anda.

### 1. Instalasi Dependensi
Buka terminal/CMD di folder proyek dan jalankan:
```bash
npm install
```

### 2. Mode Pengembangan (Development)
Untuk menjalankan aplikasi saat sedang coding (butuh internet untuk download paket pertama kali):
```bash
npm run dev
```

### 3. Build untuk Produksi (Wajib untuk Offline)
Perintah ini akan membuat folder `dist` yang berisi aplikasi siap pakai yang **tidak membutuhkan internet**.
```bash
npm run build
```

### 4. Menjalankan Aplikasi Offline
Setelah proses build selesai, Anda bisa menjalankan aplikasi dari folder `dist`. Anda bisa menggunakan `http-server` atau `serve`.

```bash
# Contoh menggunakan npx serve
npx serve dist
```
Buka browser dan akses alamat yang muncul (biasanya `http://localhost:3000`). Aplikasi ini sekarang berjalan 100% offline.

## 📜 Lisensi

Proyek ini dilisensikan di bawah **GNU General Public License v3.0**.

## 📞 Kontak & Dukungan

-   **Diskusi & Laporan Bug**: [GitHub Issues](https://github.com/aiprojek/eSantri-Web/issues)
-   **Telegram**: [Diskusi eSantri Web](https://t.me/aiprojek_community/32)
