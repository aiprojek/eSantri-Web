
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

## ⚙️ Konfigurasi Mode Build

Proyek ini sekarang memakai mode build formal:

- `hybrid-preview`: untuk simulasi pengembangan/preview.
- `web-production`: build web produksi.
- `tauri-production`: build desktop (Tauri) produksi.

Perintah:

- `npm run dev` (default: `hybrid-preview`)
- `npm run dev:web-production`
- `npm run dev:tauri-production`
- `npm run build:web-production`
- `npm run build:tauri-production`

Catatan:

- Runtime utama sudah memakai aset lokal, bukan CDN inti.
- Untuk verifikasi rilis, gunakan checklist: [docs/release-smoke-checklist.md](/home/abdullah-home/Documents/GitHub/eSantri-Web/docs/release-smoke-checklist.md)

## 📦 Cara Instalasi

**Prasyarat:** [Node.js](https://nodejs.org/) terinstal.

```bash
# 1. Instalasi Dependensi
npm install

# 2. Menjalankan Mode Pengembangan
npm run dev

# 3. Build Aplikasi Web Produksi
npm run build:web-production

# 4. Build Aplikasi Desktop Produksi (Tauri)
npm run build:tauri-production

# 5. Preview Hasil Build
npx serve dist
```

## 🛡️ Keamanan & Backup

Data tersimpan 100% lokal. Sangat disarankan untuk:
1.  Mengaktifkan **Sinkronisasi Otomatis** ke Dropbox di menu Pengaturan (Data akan dienkripsi dan dikompresi).
2.  Melakukan backup manual rutin via tombol "Unduh Cadangan Data".

## 📜 Lisensi

Proyek ini dilisensikan di bawah **GNU General Public License v3.0**.
