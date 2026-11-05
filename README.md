# eSantri Web - Sistem Informasi & Manajemen Pesantren Modern

<div align="center">
  <img src="public/icon.svg" alt="eSantri Web Logo" width="90" height="90" />
  <h3>eSantri Web</h3>
  <p><strong>Aplikasi Manajemen Pondok Pesantren Modern Berbasis Local-First, Offline-First &amp; Cloud Sync</strong></p>

  <p>
    <a href="https://www.gnu.org/licenses/gpl-3.0"><img src="https://img.shields.io/badge/License-GPLv3-blue.svg" alt="Lisensi GPLv3" /></a>
    <a href="https://github.com/aiprojek/eSantri-Web"><img src="https://img.shields.io/badge/GitHub-Repo-181717.svg?logo=github" alt="GitHub Repo" /></a>
    <img src="https://img.shields.io/badge/React-18.3-61dafb.svg?logo=react" alt="React 18" />
    <img src="https://img.shields.io/badge/TypeScript-5.5-3178c6.svg?logo=typescript" alt="TypeScript" />
    <img src="https://img.shields.io/badge/TailwindCSS-3.4-38bdf8.svg?logo=tailwindcss" alt="Tailwind CSS" />
    <img src="https://img.shields.io/badge/PWA-Ready-f59e0b.svg" alt="PWA Ready" />
  </p>
</div>

---

## 🧭 Riwayat Pengembangan

Aplikasi ini awalnya dibuat menggunakan **Google AI Studio**, lalu pengembangannya dilanjutkan dengan **Antigravity** agar proses pengembangan lebih fleksibel.

---

## 🎯 Konsep Utama: Local-First & Privasi Data

> **Prinsip Utama**: **eSantri Web** dirancang dengan arsitektur **Local-First**. Seluruh data operasional pesantren tersimpan 100% di browser lokal (IndexedDB via Dexie.js), sehingga aplikasi dapat berjalan sangat cepat dan dapat digunakan **tanpa koneksi internet (offline)**.
>
> Untuk kebutuhan kolaborasi multi-admin dan backup lintas perangkat, aplikasi menyediakan fitur **Sinkronisasi Cloud Terenkripsi & Terkompresi** (Firebase Firestore / WebDAV / Dropbox / Google Sheets Bridge) yang hemat bandwidth.

---

## ✨ Fitur & Modul Lengkap

### 🎓 1. Pendidikan & Kurikulum Pesantren
- **Database Santri & Identitas**: Pengelolaan biodata lengkap santri, NIS otomatis/manual, data orang tua/wali, mutasi kelas/rombel, dan pencetakan Kartu Santri Digital (5 pilihan tema vektor resolusi tinggi).
- **Akademik & Rapor Pesantren**: Manajemen mata pelajaran, KKM, kehadiran mengajar, nilai tugas/ujian, serta pencetakan Rapor Semester berstandar Kurikulum Merdeka & Kemenag (layout 2 halaman/portrait siap cetak).
- **Tahfizh Al-Qur'an Terpadu**:
  - Pencatatan setoran harian (Ziyadah & Muraja'ah) dengan Mushaf interaktif.
  - Ujian tasmi' sekali duduk dan rekap penilaian tajwid/fashahah.
  - Rapor Semester Tahfizh lengkap dengan peta capaian juz Al-Qur'an.
  - **Syahadah & Piagam Tahfizh**: 6 tema desain (Klasik Emas, Modern Tech, Merah Emas Nusantara, Dark Luxury, Ceria Madrasah, serta **Polos Blanko** untuk dicetak langsung pada kertas piagam fisik berornamen foil).
- **Sertifikat & Piagam Kustom (Fitur Baru)**:
  - Modul independen untuk kegiatan khusus pesantren: *Hafalan Mutun Ilmiyah*, *Tasmi' Mandiri*, *Khatam Kitab & Daurah*, *Juara Lomba*, *Santri Teladan*, dan *Apresiasi Asatidz/Dewan Juri*.
  - **AI Generator Redaksi**: Penyusunan kalimat apresiasi, doa, dan capaian otomatis menggunakan Google Gemini AI dengan pilihan gaya bahasa formal, islami, atau modern.
  - **Cetak Massal Cerdas**: Penomoran urut otomatis, tombol cepat urutan juara (Juara I, II, III...), chip preset predikat instan (*Mumtaz*, *Jayyid Jiddan*, *Jayyid*), dan pencatatan otomatis ke Buku Agenda Surat.
- **Absensi & Presensi Santri**: Pencatatan absensi harian per rombel/kelas dan asrama dengan rekapitulasi persentase kehadiran bulanan.
- **Perpustakaan Pesantren**: Manajemen katalog kitab/buku, barcode scanner ISBN, peminjaman & pengembalian, denda keterlambatan, dan kartu anggota perpustakaan.

### 🏢 2. Kesantrian & Tata Usaha
- **Surat Menyurat & Buku Agenda**: Generator surat resmi pesantren (Surat Keterangan Aktif, Izin Pulang, Undangan Wali, Dispensasi, dll.), penomoran otomatis buku agenda keluar/masuk, TTD digital pengasuh, dan segel stempel dinamis.
- **Kedisiplinan & Bimbingan Konseling (BK)**: Pencatatan pelanggaran tata tertib pesantren, sistem poin kedisiplinan, riwayat konseling santri, dan laporan pembinaan berkala.
- **Kesehatan Santri (Poskestren)**: Rekam medis klinik pesantren, pencatatan keluhan, diagnosa, terapi obat, riwayat istirahat/opname di asrama, dan surat rujukan rumah sakit.
- **Keasramaan & Gedung Kamar**: Visualisasi denah kamar, penempatan dan mutasi santri antar kamar/asrama, jurnal inspeksi kebersihan, dan cetak label pintu kamar santri.
- **Sarana & Prasarana (Sarpras)**: Inventaris aset gedung, perabotan, perangkat elektronik, pencatatan kondisi barang, dan pelaporan log perbaikan.
- **Buku Tamu Digital**: Pencatatan tamu wali santri dan tamu kedinasan lengkap dengan nomor WhatsApp, tujuan kunjungan, serta foto/tanda tangan digital.
- **Penerimaan Santri Baru (PSB)**: Formulir pendaftaran digital, verifikasi berkas calon santri, seleksi ujian masuk, cetak bukti formulir, dan ekspor data ke Excel.

### 💰 3. Keuangan & Usaha Pesantren
- **Manajemen SPP & Tagihan Santri**: Pembuatan tagihan massal bulanan, kuitansi pembayaran resmi siap cetak, pos pembayaran syahriyah/asrama/gedung, dan rekap tunggakan.
- **Buku Kas Umum Pondok**: Pencatatan arus kas masuk & keluar, filter per kategori dana, dan laporan keuangan berkala.
- **Koperasi & Kantin Santri (POS Kasir)**: Sistem kasir toko santri dengan dukungan scanner barcode, printer struk thermal Bluetooth, manajemen stok barang, dan laporan laba penjualan harian.

### 🌐 4. Portal Wali & Keamanan Multi-Admin
- **Portal Wali Santri**: Akses mandiri bagi orang tua untuk melihat perkembangan setoran tahfizh, kehadiran, tagihan SPP, dan catatan pembinaan ananda via antarmuka mobile-friendly.
- **Hak Akses User Berjenjang (RBAC)**: Pengaturan izin peran (Super Admin, Mudir/Pengasuh, Bagian Akademik, Muhaffizh, Bendahara Keuangan, Bagian Asrama, Petugas Kesehatan, dan Tamu) dengan validasi izin baca/tulis yang ketat.

---

## 🛠️ Tumpukan Teknologi (Tech Stack)

| Komponen | Teknologi | Keterangan |
| :--- | :--- | :--- |
| **Frontend Framework** | [React 18](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/) | Single Page Application (SPA) cepat dan aman tipe data |
| **Bundler & Dev Server** | [Vite 5](https://vitejs.dev/) | HMR kilat dan build produksi yang sangat teroptimasi |
| **Database Lokal** | [Dexie.js 4](https://dexie.org/) | Abstraksi IndexedDB berkinerja tinggi untuk local-first storage |
| **Styling & Desain** | [Tailwind CSS 3](https://tailwindcss.com/) + Bootstrap Icons | Tampilan antarmuka modern, responsif, dan ramah mobile |
| **PDF & Dokumen Vektor** | `jspdf`, `jspdf-autotable`, `html2canvas` | Mesin cetak presisi dokumen resmi A4 & kuitansi thermal |
| **Spreadsheet & Data** | `xlsx` (SheetJS) | Ekspor dan impor massal data santri, rapor, dan inventaris |
| **PWA & Offline** | Service Worker + Web App Manifest | Mendukung instalasi aplikasi di Windows, macOS, Android, dan iOS |
| **AI Assistant** | Google Gemini API via SDK | Penyusunan draf redaksi piagam dan surat resmi otomatis |

---

## 📁 Struktur Folder Proyek

```text
eSantri-Web/
├── components/          # Komponen UI modular per bidang fitur
│   ├── akademik/        # Komponen penilaian, KKM, dan input nilai rapor
│   ├── asrama/          # Manajemen gedung, kamar, dan inspeksi kebersihan
│   ├── bk/              # Modul Bimbingan Konseling dan poin pelanggaran
│   ├── bukutamu/        # Buku tamu digital pesantren
│   ├── datamaster/      # Pengaturan jenjang, rombel, guru, dan mapel
│   ├── finance/         # Tagihan SPP, kuitansi, dan buku kas pondok
│   ├── kalender/        # Kalender akademik dan agenda penanggalan Hijriah
│   ├── kesehatan/       # Rekam medis dan poskestren
│   ├── koperasi/        # POS kasir koperasi dan stok barang
│   ├── perpustakaan/    # Sirkulasi buku dan kartu anggota
│   ├── portal/          # Antarmuka monitoring wali santri
│   ├── psb/             # Penerimaan santri baru online
│   ├── reports/         # Modul cetak biodata, kuitansi, dan laporan eksekutif
│   ├── santri/          # Daftar santri, kartu santri, dan filter rombel
│   ├── sarpras/         # Inventaris aset dan fasilitas pesantren
│   ├── sertifikat/      # Kanvas cetak 6 tema sertifikat & piagam
│   ├── surat/           # Pembuat surat dinas dan penomoran agenda
│   ├── sync/            # Antarmuka sinkronisasi cloud & backup
│   ├── tahfizh/         # Setoran harian, mushaf, rapor & syahadah tahfizh
│   └── whatsapp/        # WhatsApp center pengumuman wali santri
├── contexts/            # React Context untuk state santri, keuangan, auth & UI
├── data/                # Data preset surat, piagam mutun, dan panduan SOP
├── docs/                # Buku panduan pengguna (SOP) dan dokumentasi modul
├── hooks/               # Custom React hooks (filter, filter periode, debounce)
├── public/              # Aset statis, ikon aplikasi PWA, dan manifest
├── services/            # Logika bisnis, sinkronisasi cloud, enkripsi, dan ekspor
├── utils/               # Formatter penanggalan Hijriah/Masehi, formula rapor, PDF
└── types.ts             # Definisi TypeScript model data seluruh aplikasi
```

---

## 📦 Panduan Instalasi & Menjalankan Proyek

### Prasyarat
- [Node.js](https://nodejs.org/) versi 18 atau lebih baru.
- npm atau yarn / pnpm.

### Langkah Menjalankan:
```bash
# 1. Kloning repositori ini
git clone https://github.com/aiprojek/eSantri-Web.git
cd eSantri-Web

# 2. Instal seluruh dependensi
npm install

# 3. Jalankan server pengembangan lokal
npm run dev

# 4. Buka di browser
# http://localhost:3000
```

### Build untuk Produksi:
```bash
# Validasi sintaks dan compile
npm run lint
npm run build

# Menjalankan preview build hasil dist
npm run preview
```

---

## 🛡️ Backup & Keamanan Data

Karena sistem mengusung konsep **Local-First**, data Anda aman berada di komputer Anda sendiri:
1. **Cadangan Rutin**: Lakukan backup manual secara berkala melalui tombol **"Unduh Cadangan Data"** di menu Pengaturan (menghasilkan berkas cadangan JSON terenkripsi).
2. **Sinkronisasi Multi-Admin**: Aktifkan fitur **Sinkronisasi Cloud** agar data antar admin/ustadz tersinkronisasi secara otomatis saat online.

---

## 📜 Lisensi & Kontribusi

Proyek ini dirilis di bawah lisensi **GNU General Public License v3.0 (GPLv3)**. Terbuka untuk kontribusi, saran perbaikan, dan kustomisasi sesuai kebutuhan pondok pesantren di seluruh Nusantara.
