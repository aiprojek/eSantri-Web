
# eSantri Web - Manajemen Data Santri

![eSantri Web Logo](public/icon.svg)

[![Lisensi](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)
[![GitHub Repo](https://img.shields.io/badge/GitHub-Repo-black.svg?logo=github)](https://github.com/aiprojek/eSantri-Web)

**eSantri Web** adalah aplikasi berbasis web yang dirancang untuk membantu administrasi Pondok Pesantren dalam mengelola data santri secara efisien. Aplikasi ini mengutamakan privasi dan kecepatan, dengan kemampuan **offline-first**.

## 🎯 Skenario Penggunaan

> **PERHATIAN**: Aplikasi ini dirancang untuk penggunaan **terpusat oleh satu orang (administrator) di satu komputer/laptop**. Semua data disimpan secara lokal di *cache* browser Anda (IndexedDB) dan **tidak dapat diakses** dari komputer lain secara bersamaan, kecuali Anda mengaktifkan fitur **Sinkronisasi Cloud**.

## ✨ Fitur Unggulan

-   **Dashboard Interaktif**: Ringkasan visual data santri, keuangan, dan keasramaan.
-   **Penerimaan Santri Baru (PSB)**: Modul pendaftaran, seleksi, hingga input data otomatis.
-   **Database Santri Terpusat**: Kelola data lengkap santri, orang tua/wali, dan riwayat status.
-   **Surat Menyurat Otomatis**: Template surat resmi, izin, dan pemberitahuan dengan *Magic Draft (AI)*.
-   **Laporan & PDF**: Cetak Biodata, Kuitansi, Rapor, dan Kartu Santri (Vector/High Quality).
-   **Manajemen Keuangan**: Tagihan massal, pembayaran SPP, dan buku kas umum.
-   **Cloud Sync**: Sinkronisasi data ke **Dropbox** (Metode Hub & Spoke untuk kolaborasi tim).
-   **Generator NIS Otomatis**: Pembuatan Nomor Induk Santri yang fleksibel.

## 🛠️ Tumpukan Teknologi (Tech Stack)

Aplikasi ini dibangun menggunakan teknologi modern untuk menjamin performa dan kemudahan pengembangan:

-   **Frontend Framework**: [React 18](https://react.dev/)
-   **Language**: [TypeScript](https://www.typescriptlang.org/) (Keamanan tipe data)
-   **Build Tool**: [Vite](https://vitejs.dev/) (Build super cepat)
-   **Styling**: [Tailwind CSS](https://tailwindcss.com/)
-   **Local Database**: [Dexie.js](https://dexie.org/) (IndexedDB Wrapper)
-   **Cloud Integration**: Dropbox API (via HTTP Fetch)
-   **PDF Engine**: `jspdf` & `html2canvas`

## ⚠️ Konfigurasi Mode: Hybrid vs Produksi

Secara default, kode sumber ini dikonfigurasi dalam **Mode Hybrid** agar dapat berjalan langsung di lingkungan preview (seperti Google AI Studio atau StackBlitz) tanpa perlu proses instalasi `npm` yang rumit.

### 1. Mode Hybrid (Saat Ini - Default)
Menggunakan **CDN** untuk memuat Tailwind CSS dan Icon secara *runtime*.
*   **Kelebihan:** Bisa langsung dijalankan/dipreview tanpa build step.
*   **Kekurangan:** Membutuhkan koneksi internet saat pertama kali dibuka (untuk memuat style CDN).

### 2. Mode Produksi (Siap Deploy / 100% Offline)
Jika Anda ingin men-deploy aplikasi ini ke hosting (Vercel/Netlify) atau menjalankannya di komputer pesantren tanpa internet sama sekali, lakukan langkah berikut **sebelum build**:

1.  **Edit `index.html`**: 
    *   Hapus atau komentari blok script di bawah komentar `<!-- HYBRID MODE: CDN Imports ... -->`.
2.  **Edit `index.tsx`**: 
    *   Uncomment (hapus tanda `//`) pada baris:
        ```typescript
        import './index.css';
        import 'bootstrap-icons/font/bootstrap-icons.css';
        ```
3.  **Jalankan Build**: Gunakan perintah `npm run build`.

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

### 4. Menjalankan Hasil Build (Preview Produksi)
Anda bisa menggunakan `serve` atau membuka file `dist/index.html`.
```bash
npx serve dist
```

## 🛡️ Keamanan Data

Data tersimpan 100% lokal di browser Anda. Sangat disarankan untuk:
1.  Mengaktifkan **Sinkronisasi Otomatis** ke Dropbox di menu Pengaturan.
2.  Atau melakukan backup manual rutin via tombol "Unduh Cadangan Data".

## 📜 Lisensi

Proyek ini dilisensikan di bawah **GNU General Public License v3.0**.
