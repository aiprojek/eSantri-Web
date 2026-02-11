
# eSantri Web - Manajemen Data Santri

![eSantri Web Logo](public/icon.svg)

[![Lisensi](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)
[![GitHub Repo](https://img.shields.io/badge/GitHub-Repo-black.svg?logo=github)](https://github.com/aiprojek/eSantri-Web)

**eSantri Web** adalah aplikasi berbasis web yang dirancang untuk membantu administrasi Pondok Pesantren dalam mengelola data santri secara efisien. Aplikasi ini mengutamakan privasi, kecepatan, dan kemampuan **offline-first** yang tangguh.

## 🎯 Skenario Penggunaan

> **PERHATIAN**: Aplikasi ini dirancang dengan konsep **Local-First**. Semua data disimpan secara lokal di browser (IndexedDB). Untuk kolaborasi tim, gunakan fitur **Sinkronisasi Cloud** yang telah dioptimalkan dengan kompresi data.

## ✨ Fitur Unggulan

### 🏢 Administrasi & Manajemen
-   **Dashboard Interaktif**: Ringkasan visual data santri, keuangan, dan keasramaan.
-   **Database Santri Terpusat**: Kelola data lengkap santri, orang tua/wali, dan riwayat status.
-   **Surat Menyurat Otomatis**: Template surat resmi dengan *Magic Draft (AI)* dan arsip digital.
-   **Laporan & PDF**: Cetak Biodata, Kuitansi, Rapor, dan Kartu Santri (Vector/High Quality).

### 💰 Keuangan & Bisnis
-   **Manajemen Keuangan**: Tagihan massal, pembayaran SPP, dan buku kas umum.
-   **Koperasi & Kantin (POS)**: Kasir toko dengan dukungan barcode scanner dan printer thermal Bluetooth.
-   **Penggajian (Payroll)**: Hitung honor guru otomatis berdasarkan jam mengajar.

### 🚀 Teknologi & Performa (Baru)
-   **Cloud Sync Terkompresi**: Sinkronisasi ke Dropbox/WebDAV kini menggunakan **Kompresi GZIP**. Hemat kuota internet hingga 90% dan lebih stabil di jaringan lambat.
-   **Pagination Database**: Menangani puluhan ribu data transaksi dan log tanpa membuat aplikasi berat (*lag*).
-   **PWA & Offline Mode**: Instal aplikasi ke Desktop/HP. Fitur "Unduh Aset" memungkinkan aplikasi berjalan 100% tanpa koneksi internet.
-   **PSB Online**: Formulir pendaftaran digital dengan integrasi WhatsApp dan Google Sheet.

## 🛠️ Tumpukan Teknologi (Tech Stack)

Aplikasi ini dibangun menggunakan teknologi modern untuk menjamin performa tinggi:

-   **Frontend**: [React 18](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
-   **Build Tool**: [Vite](https://vitejs.dev/)
-   **Database Lokal**: [Dexie.js](https://dexie.org/) (IndexedDB Wrapper)
-   **Styling**: [Tailwind CSS](https://tailwindcss.com/)
-   **Compression**: Native Browser `CompressionStream` (GZIP)
-   **PDF Engine**: `jspdf` & `html2canvas`

## ⚠️ Konfigurasi Mode: Hybrid vs Produksi

Secara default, kode sumber ini dikonfigurasi dalam **Mode Hybrid** agar dapat berjalan langsung di lingkungan preview (seperti Google AI Studio atau StackBlitz).

### 1. Mode Hybrid (Default)
Menggunakan **CDN** untuk memuat Tailwind CSS dan Icon.
*   **Kelebihan:** Bisa langsung dijalankan (`npm run dev`) tanpa build step yang rumit.
*   **Kekurangan:** Membutuhkan internet saat pertama kali dibuka (untuk memuat CDN).

### 2. Mode Produksi (Siap Deploy / 100% Offline)
Jika ingin digunakan di pesantren yang minim internet, lakukan langkah ini sebelum build:

1.  **Edit `index.html`**: Hapus atau komentari blok script CDN.
2.  **Edit `index.tsx`**: Uncomment (aktifkan) baris import CSS lokal.
3.  **Jalankan Build**: `npm run build`.

## 📦 Cara Instalasi

**Prasyarat:** [Node.js](https://nodejs.org/) terinstal.

```bash
# 1. Instalasi Dependensi
npm install

# 2. Menjalankan Mode Pengembangan
npm run dev

# 3. Build Aplikasi (Menjadi File Statis)
npm run build

# 4. Preview Hasil Build
npx serve dist
```

## 🛡️ Keamanan & Backup

Data tersimpan 100% lokal. Sangat disarankan untuk:
1.  Mengaktifkan **Sinkronisasi Otomatis** ke Dropbox di menu Pengaturan (Data akan dienkripsi dan dikompresi).
2.  Melakukan backup manual rutin via tombol "Unduh Cadangan Data".

## 📜 Lisensi

Proyek ini dilisensikan di bawah **GNU General Public License v3.0**.
