
# eSantri Web - Manajemen Data Santri

![eSantri Web Logo](public/icon.svg)

[![Lisensi](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)
[![GitHub Repo](https://img.shields.io/badge/GitHub-Repo-black.svg?logo=github)](https://github.com/aiprojek/eSantri-Web)

**eSantri Web** adalah aplikasi berbasis web yang dirancang untuk membantu administrasi Pondok Pesantren dalam mengelola data santri secara efisien. Aplikasi ini mengutamakan privasi dan kecepatan, dengan kemampuan **offline-first**.

## 🎯 Skenario Penggunaan

> **PERHATIAN**: Aplikasi ini dirancang untuk penggunaan **terpusat oleh satu orang (administrator) di satu komputer/laptop**. Semua data disimpan secara lokal di *cache* browser Anda (IndexedDB) dan **tidak dapat diakses** dari komputer lain secara bersamaan, kecuali Anda mengaktifkan fitur **Supabase Cloud Sync**.

## ✨ Fitur Unggulan

-   **Dashboard Interaktif**: Ringkasan visual data santri, keuangan, dan keasramaan.
-   **Penerimaan Santri Baru (PSB)**: Modul pendaftaran, seleksi, hingga input data otomatis.
-   **Database Santri Terpusat**: Kelola data lengkap santri, orang tua/wali, dan riwayat status.
-   **Surat Menyurat Otomatis**: Template surat resmi, izin, dan pemberitahuan dengan *Magic Draft (AI)*.
-   **Laporan & PDF**: Cetak Biodata, Kuitansi, Rapor, dan Kartu Santri (Vector/High Quality).
-   **Manajemen Keuangan**: Tagihan massal, pembayaran SPP, dan buku kas umum.
-   **Cloud Sync**: Sinkronisasi data ke **Dropbox**, **WebDAV**, atau **Supabase** (Realtime).
-   **Generator NIS Otomatis**: Pembuatan Nomor Induk Santri yang fleksibel.

## 🛠️ Tumpukan Teknologi (Tech Stack)

Aplikasi ini dibangun menggunakan teknologi modern untuk menjamin performa dan kemudahan pengembangan:

-   **Frontend Framework**: [React 18](https://react.dev/)
-   **Language**: [TypeScript](https://www.typescriptlang.org/) (Keamanan tipe data)
-   **Build Tool**: [Vite](https://vitejs.dev/) (Build super cepat)
-   **Styling**: [Tailwind CSS](https://tailwindcss.com/)
-   **Local Database**: [Dexie.js](https://dexie.org/) (IndexedDB Wrapper)
-   **Cloud Integration**: Dropbox API, WebDAV, Supabase Client
-   **PDF Engine**: `jspdf` & `html2canvas`

## ⚠️ Mode Preview vs Mode Offline (Produksi)

Secara default, kode sumber ini dikonfigurasi untuk **Mode Preview** agar dapat berjalan langsung di lingkungan seperti Google AI Studio atau StackBlitz tanpa perlu instalasi lokal yang rumit.

### 1. Mode Preview (Saat Ini)
Menggunakan **CDN (Content Delivery Network)** untuk memuat Tailwind CSS dan Icon.
*   **Kelebihan:** Bisa langsung dijalankan di browser tanpa `npm install`.
*   **Kekurangan:** Membutuhkan koneksi internet saat pertama kali dibuka untuk memuat gaya (CSS).

### 2. Mode Produksi (100% Offline)
Jika Anda ingin men-deploy aplikasi ini di komputer pesantren yang **sama sekali tidak ada internet**, lakukan langkah berikut sebelum build:

1.  **Edit `index.html`**: Hapus baris `<script src="cdn.tailwindcss...">` dan `<link ... bootstrap-icons ...>`.
2.  **Edit `index.tsx`**: Uncomment (aktifkan) baris `import './index.css';` dan `import 'bootstrap-icons/...';`.
3.  Jalankan perintah build di bawah ini.

## 📦 Panduan Instalasi & Build

**Prasyarat:** Pastikan [Node.js](https://nodejs.org/) sudah terinstal.

### 1. Instalasi Dependensi
```bash
npm install
```

### 2. Menjalankan Mode Pengembangan
```bash
npm run dev
```

### 3. Build Aplikasi (Menjadi File Statis)
Perintah ini akan memaketkan aplikasi ke dalam folder `dist`.
```bash
npm run build
```

### 4. Menjalankan Hasil Build
Anda bisa menggunakan `serve` atau membuka file `dist/index.html` melalui web server lokal.
```bash
npx serve dist
```

## 🛡️ Keamanan Data

Data tersimpan 100% lokal di browser Anda. Sangat disarankan untuk:
1.  Mengaktifkan **Sinkronisasi Otomatis** ke Dropbox/WebDAV di menu Pengaturan.
2.  Atau melakukan backup manual rutin via tombol "Unduh Cadangan Data".

## 📜 Lisensi

Proyek ini dilisensikan di bawah **GNU General Public License v3.0**.
