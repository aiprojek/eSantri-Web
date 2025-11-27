# eSantri Web - Manajemen Data Santri

![eSantri Web Logo](public/icon.svg)

[![Lisensi](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)
[![GitHub Repo](https://img.shields.io/badge/GitHub-Repo-black.svg?logo=github)](https://github.com/aiprojek/eSantri-Web)

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
-   **Surat Menyurat Otomatis**: Buat surat resmi, izin, atau pemberitahuan dengan sistem template dan *mail merge*. Surat otomatis terisi data santri, siap cetak, dan tersimpan dalam arsip digital.
-   **Laporan Profesional**: Cetak lebih dari 15 jenis dokumen (Biodata, Kuitansi, Rapor, dll) dengan tata letak rapi, kop surat otomatis, dan footer identitas aplikasi. Mendukung ekspor PDF dan HTML.
-   **Manajemen Keuangan Terintegrasi**: Fitur lengkap mulai dari pembuatan tagihan massal, pencatatan pembayaran, manajemen uang saku, hingga notifikasi tunggakan via WhatsApp.
-   **Manajemen Keasramaan**: Atur data gedung, kamar, musyrif/ah, dan penempatan santri di asrama dengan mudah.
-   **Buku Kas Umum**: Catat semua pemasukan dan pengeluaran umum pondok untuk laporan arus kas yang transparan.
-   **Generator NIS Otomatis**: Buat Nomor Induk Santri secara otomatis dengan tiga metode yang dapat diatur sesuai kebutuhan.
-   **Ekspor & Impor Massal**: Tambah dan perbarui data santri dalam jumlah besar dengan mudah melalui file CSV.
-   **Pengaturan Fleksibel**: Kustomisasi struktur pendidikan, komponen biaya, format NIS, hingga redaksi surat tagihan.
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

4.  **Surat Menyurat**: Gunakan menu `Surat Menyurat` untuk membuat template surat dan mencetak surat massal atau perorangan dengan mudah.

5.  **Cetak Laporan**: Kunjungi halaman `Laporan & Cetak` untuk mencetak berbagai dokumen administratif yang dibutuhkan.

6.  **Backup Data (Sangat Penting!)**: Secara berkala, buka halaman `Pengaturan` -> `Cadangkan & Pulihkan Data`, lalu klik **Unduh Cadangan Data**. Simpan file backup di tempat yang aman.

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
-   **Editor**: React Quill (Rich Text Editor)
-   **Export**: jsPDF, html2canvas

## 📦 Panduan Build Lokal (Local Build Guide)

Secara default, aplikasi ini memuat beberapa pustaka (seperti React) dari CDN (*Content Delivery Network*), yang memerlukan koneksi internet saat pertama kali dibuka. Untuk menjalankan aplikasi ini sepenuhnya offline, ikuti langkah-langkah berikut.

**Prasyarat:**
Pastikan Anda memiliki [Node.js](https://nodejs.org/) (yang sudah termasuk `npm`) terinstal di komputer Anda.

**Langkah 1: Unduh Dependensi**

Buka terminal atau command prompt di direktori root proyek (folder tempat file `index.html` berada) dan jalankan perintah berikut untuk mengunduh semua pustaka yang diperlukan ke dalam folder `node_modules`:

```bash
npm install react react-dom dexie react-hook-form react-quill jspdf html2canvas
```

**Langkah 2: Perbarui `index.html`**

Buka file `index.html` dan modifikasi bagian `<script type="importmap">`. Ganti URL CDN dengan path lokal ke file di dalam folder `node_modules` yang baru saja Anda buat.

**Ganti ini:**
```html
<script type="importmap">
{
  "imports": {
    "react-dom/": "https://aistudiocdn.com/react-dom@^19.2.0/",
    "react": "https://aistudiocdn.com/react@^19.2.0",
    "react/": "https://aistudiocdn.com/react@^19.2.0/",
    "dexie": "https://cdn.jsdelivr.net/npm/dexie@4.0.7/dist/dexie.mjs",
    "react-hook-form": "https://cdn.jsdelivr.net/npm/react-hook-form/dist/index.esm.mjs",
    "jspdf": "https://esm.sh/jspdf@2.5.1",
    "html2canvas": "https://esm.sh/html2canvas@1.4.1",
    "react-quill": "https://aistudiocdn.com/react-quill@^2.0.0"
  }
}
</script>
```

**Menjadi ini:**
```html
<script type="importmap">
{
  "imports": {
    "react-dom/": "/node_modules/react-dom/",
    "react": "/node_modules/react/index.js",
    "react/": "/node_modules/react/",
    "dexie": "/node_modules/dexie/dist/dexie.mjs",
    "react-hook-form": "/node_modules/react-hook-form/dist/index.esm.mjs",
    "jspdf": "/node_modules/jspdf/dist/jspdf.es.min.js",
    "html2canvas": "/node_modules/html2canvas/dist/html2canvas.esm.js",
    "react-quill": "/node_modules/react-quill/lib/index.js"
  }
}
</script>
```

**Langkah 3: Jalankan Server Lokal**

Karena browser membatasi pemuatan modul ES6 langsung dari sistem file (`file:///...`), Anda perlu menjalankan server web lokal. Cara termudah adalah menggunakan `http-server`.

Jalankan perintah berikut di terminal dari direktori root proyek:

```bash
npx http-server -c-1
```

- `npx` akan menjalankan paket `http-server` tanpa perlu menginstalnya secara global.
- `-c-1` adalah flag untuk menonaktifkan cache, yang penting untuk pengembangan agar perubahan langsung terlihat.

**Langkah 4: Akses Aplikasi**

Setelah server berjalan, buka browser Anda dan kunjungi alamat yang ditampilkan di terminal, biasanya:

**http://localhost:8080**

Sekarang aplikasi berjalan sepenuhnya dari komputer Anda tanpa ketergantungan pada CDN.

## 📜 Lisensi

Proyek ini dilisensikan di bawah **GNU General Public License v3.0**.

## 📞 Kontak & Dukungan

-   **Diskusi & Laporan Bug**: [GitHub Issues](https://github.com/aiprojek/eSantri-Web/issues)
-   **Komunitas Telegram**: [Diskusi eSantri Web](https://t.me/aiprojek_community/32)
-   **Dukung Pengembang**: [Traktir Kopi](https://lynk.id/aiprojek/s/bvBJvdA)
