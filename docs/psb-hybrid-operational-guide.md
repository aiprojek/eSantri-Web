# Panduan Operasional PSB Hybrid (Opsi A)

Panduan ini menjadi pegangan baku operasional PSB eSantri dengan alur:

- Form Publik -> Google Apps Script
- Data -> Google Sheet
- Berkas -> Google Drive
- Backup notifikasi -> WhatsApp Admin
- Rekap/seleksi -> eSantri

## Tujuan

- Menjalankan PSB online yang stabil tanpa membuka kredensial Dropbox/WebDAV ke publik.
- Menjaga alur sederhana untuk panitia.
- Menyediakan checklist verifikasi agar minim trial-error.

## Arsitektur Singkat

1. Calon santri mengisi form HTML yang digenerate dari menu PSB.
2. Form mengirim data ke endpoint Google Apps Script (`/exec`).
3. Script menyimpan data ke sheet target dan upload berkas ke Drive.
4. Untuk mode Hybrid, form juga menyiapkan backup pesan ke WhatsApp Admin.
5. Admin menarik data dari Google Sheet ke modul `PSB > Rekap`.
6. Backup database aplikasi tetap dikelola dari `Pengaturan > Sync Cloud` (Dropbox/WebDAV/Firebase) di sisi admin, bukan di form publik.

## Setup Pertama Kali (Wajib)

1. Buka `PSB > Form Builder`.
2. Pilih metode submit `Hybrid (Sheet + WA Backup)`.
3. Siapkan Google Sheet baru untuk pendaftar.
4. Buka `Extensions > Apps Script`, paste script dari helper di Form Builder.
5. Deploy sebagai Web App:
   - `Execute as`: `Me`
   - `Who has access`: `Anyone`
6. Salin URL deployment yang berakhiran `/exec`.
7. Tempel URL tersebut ke field Google Script URL di Form Builder.
8. Simpan konfigurasi.
9. Download file formulir HTML dari Form Builder.
10. Publikasikan form ke panitia/salur pendaftaran.

## Checklist Uji 5 Menit (Setiap Ada Perubahan Script/Form)

1. Isi 1 data pendaftar dummy dari form.
2. Upload minimal 1 file kecil (misal PDF/JPG).
3. Cek Google Sheet:
   - baris baru masuk
   - kolom data utama terisi
4. Cek Google Drive:
   - file terupload
   - nama file mengikuti format rename otomatis
5. Buka `PSB > Rekap`, jalankan ambil data dari Google Sheet.
6. Pastikan data dummy muncul di rekap.

Jika langkah 1-6 sukses, form aman dipakai operasional.

## SOP Operasional Harian

1. Panitia membagikan form PSB (link/file HTML).
2. Panitia memantau pendaftar dari `PSB > Rekap`.
3. Gunakan tombol sinkronisasi Google Sheet secara berkala.
4. Verifikasi berkas dari link dokumen yang masuk.
5. Lanjutkan proses seleksi/status di modul PSB sesuai alur pondok.

## SOP Operasional Mingguan

1. Ekspor arsip rekap pendaftar (CSV/Excel) untuk cadangan administrasi.
2. Unduh/arsip dokumen bila diperlukan.
3. Lakukan backup database eSantri dari menu backup/sync cloud admin.
4. Catat kendala operasional pada log internal panitia.

## Troubleshooting Cepat

### Data tidak masuk ke sheet

- Pastikan URL script menggunakan endpoint `/exec`, bukan `/dev`.
- Pastikan deployment terbaru sudah dipublish ulang setelah ubah script.
- Pastikan akses Web App adalah `Anyone`.

### Upload berkas gagal

- Cek ukuran file (maks 5MB per file dari form saat ini).
- Cek tipe file (umumnya PDF/JPG/PNG).
- Cek izin Drive pada akun pemilik script.

### Di form terlihat sukses tapi data belum ada

- Mode kirim browser memakai pendekatan yang tidak selalu memberi respon detail.
- Patokan valid: cek langsung baris di Sheet dan file di Drive.

### Nama file tidak berubah sesuai pola

- Biasanya script lama belum diganti.
- Paste ulang script terbaru dari Form Builder, lalu redeploy `/exec`.

## Batasan yang Perlu Dipahami

- Form publik tidak boleh memuat pairing code Dropbox/WebDAV.
- Kredensial cloud admin harus tetap di aplikasi admin, bukan di form publik.
- Jika nanti butuh upload langsung ke Dropbox/WebDAV secara publik, perlu backend relay terpisah.

## Multi Formulir & Multi GAS

- Anda boleh membuat lebih dari satu formulir PSB aktif (gelombang/jenjang berbeda).
- Setiap formulir bisa memakai URL GAS berbeda saat submit.
- Namun tombol `Ambil dari Google Sheet` di `PSB > Rekap` saat ini membaca URL GAS aktif global pada pengaturan PSB.

Rekomendasi operasional:

1. Pakai satu GAS utama untuk semua formulir.
2. Bedakan data per formulir lewat `sheetName` (otomatis dari nama template/form).
3. Jika tetap memakai banyak GAS, tarik data dilakukan bergantian dengan mengganti URL aktif sebelum sync.

Catatan metode WhatsApp:

- Multi formulir via WhatsApp tetap bisa dipakai selama pesan mengandung blok kode `PSB_START ... PSB_END` (atau backup `PSB_BACKUP_START ... PSB_BACKUP_END`).
- Admin tinggal copy-paste isi pesan ke menu `Impor WA` di Rekap PSB.

## Catatan Tanggung Jawab Panitia

- Operator wajib simpan akses akun Google pemilik script dengan aman.
- Setiap perubahan form/script harus melewati `Checklist Uji 5 Menit`.
- Jangan mengganti struktur field form tanpa uji sinkronisasi ke rekap.
