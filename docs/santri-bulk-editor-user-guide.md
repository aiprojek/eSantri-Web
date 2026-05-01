# Panduan Manajemen Santri (Harian + Bulk)

Dokumen ini menyatukan alur kerja halaman Santri dari proses harian sampai pengolahan massal agar penggunaan lebih runtut.

## 1) Alur Harian Manajemen Santri

Gunakan halaman `Santri` untuk:

- tambah santri satu per satu (`Tambah Santri`)
- cari/filter data santri (nama, jenjang, kelas, rombel, status)
- edit data per santri
- proses operasional seperti pindah kelas, ubah status, dan pengarsipan alumni

## 2) Kapan Pakai Bulk Editor

Gunakan `Tambah Massal` / `Edit Massal` saat:

- onboarding santri banyak sekaligus
- update data kelas/status/identitas dalam jumlah besar
- migrasi data dari Excel/CSV/EMIS

## 3) Urutan Kerja Rekomendasi di Bulk Editor

1. Pilih `Preset Template Import`:
   - `Auto` (fleksibel)
   - `Internal eSantri`
   - `EMIS / Nama Umum`
   - `Simple`
2. Pilih `Validation Profile`:
   - `Basic` (default)
   - `Strict` (wajib data kunci lebih ketat)
3. Masukkan data:
   - `Smart Import` (`.csv/.xlsx/.xls`)
   - `Paste Excel` (modal)
   - paste langsung ke sel (`Ctrl+V`)
4. Rapikan dan validasi:
   - `Lompat ke Error`
   - `Perbaiki Otomatis`
5. Cek ringkasan kualitas data, lalu `Simpan Semua`.

## 4) Fitur Spreadsheet

- Copy range: klik sel awal, `Shift+klik` sel akhir, `Ctrl+C`
- Paste range: klik sel tujuan, `Ctrl+V`
- Reset seleksi: `Esc`
- Undo/Redo: tombol toolbar atau `Ctrl+Z`, `Ctrl+Y` / `Ctrl+Shift+Z`
- Indikator: badge jumlah sel terpilih

## 5) Validasi Data

Validasi utama:

- `Nama Lengkap` wajib
- `NIS` angka
- `NIK` 16 digit angka
- `Tanggal Lahir` & `Tanggal Masuk` format `dd/mm/yyyy`
- `Jenjang/Kelas/Rombel` wajib dan konsisten
- `Status` hanya: `Aktif`, `Hiatus`, `Lulus`, `Keluar/Pindah`

Catatan:

- `Basic`: aturan inti operasional
- `Strict`: menambah kewajiban data kunci (`NIS`, `NIK`, `Tanggal Lahir`)

## 6) Data Quality & Audit

Panel quality menampilkan:

- total baris
- valid / invalid
- duplikat NIS
- duplikat NIK

Panel audit trail menampilkan aktivitas terakhir:

- import/paste/edit
- auto-fix
- undo/redo
- simpan / simpan ditolak / simpan gagal

## 7) Rekomendasi Update Panduan Manajemen Santri (In-App)

Agar tetap selaras fitur terbaru, panduan in-app sebaiknya selalu menegaskan:

- alur kerja bertahap: `input -> validasi -> quality check -> simpan`
- kapan memilih profile `Basic` vs `Strict`
- kapan memilih preset `Auto/Internal/EMIS/Simple`
- SOP cepat operator: `paste -> auto-fix -> jump error -> save`

## 8) Catatan Praktis

- Mobile sudah mendukung alur bulk, tetapi volume besar tetap paling nyaman di desktop.
- Gunakan `Reset Filter` bila hasil pencarian grid terasa “hilang” karena filter lama masih aktif.
