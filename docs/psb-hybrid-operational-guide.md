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

### Test Koneksi GAS selalu gagal meski `PUBLIC_KEY` dan `ADMIN_KEY` sudah diisi

- **Wajib `New version` saat update script:** Jika Anda mengedit `Code.gs` pada deployment yang sudah ada, klik **Deploy > Manage deployments > Edit (ikon pensil) > Version: New version > Deploy**. Menekan Save saja tidak memperbarui URL `/exec`.
- **Izin Web App:** Pastikan `Execute as: Me` dan `Who has access: Anyone` (`Siapa saja`), bukan `Only myself`.
- **Terikat ke Google Sheets:** Pastikan script dibuat lewat **Google Spreadsheet > Ekstensi > Apps Script** (bukan project Apps Script kosong/standalone).
- **Script Properties lama:** Mulai skrip v4 dengan pelacakan `*_SEED`, memperbarui `DEFAULT_PUBLIC_KEY` / `DEFAULT_ADMIN_KEY` di `Code.gs` otomatis menyegarkan `Script Properties` setelah deploy versi baru. Jika Anda sebelumnya menyetel `ADMIN_KEY` secara manual di **Project Settings > Script Properties**, pastikan nilainya persis sama dengan kolom `ADMIN_KEY` di aplikasi dan jangan lupa klik **Simpan Konfigurasi** di modal aplikasi.

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

## Keamanan Firebase Storage Rules & `getDownloadURL` (Jika Menggunakan Firebase)

Jika pondok menggunakan mode **Firebase** (`tenants/{tenantId}/psb/{fileName}`):

1. **Template Rules di Repo (`storage.rules` & `firebase.json`)**:
   - `storage.rules` menerapkan pola *default-deny* untuk seluruh bucket, lalu mengizinkan `create` lampiran PSB per tenant (`tenants/{tenantId}/psb/{fileName}`) dengan batas ukuran **maksimal 5 MB**, tipe MIME terbatas pada `application/pdf`, `image/jpeg`, `image/png`, dan `image/webp`, serta menolak penimpaan file (`allow update: if false`).
   - Akses `get`, `list`, dan `delete` di Storage dibatasi hanya untuk anggota tenant yang terautentikasi (`isTenantMember(tenantId)`).
2. **Perilaku & Risiko Token `getDownloadURL`**:
   - Fungsi `getDownloadURL()` menghasilkan tautan HTTPS berisi parameter `?alt=media&token=...` agar admin dapat langsung mempratinjau dokumen/foto.
   - Siapa pun yang memperoleh URL lengkap beserta token tersebut dapat mengunduh berkas selama token belum dicabut di Firebase Console Storage (meskipun akses `list`/direktori tetap diblokir).
   - **Praktik aman:** Jangan pernah membagikan tautan `getDownloadURL` lampiran PSB ke publik/pihak luar. Setelah berkas selesai diverifikasi atau diarsipkan secara offline, hapus/cabut token file lama bila sudah tidak diperlukan.
3. **Deploy Manual via Firebase CLI** *(perubahan di repo belum diterapkan otomatis ke proyek cloud Anda)*:
   ```bash
   firebase login
   firebase use <ID_PROJECT_FIREBASE_ANDA>
   firebase deploy --only firestore:rules,storage
   ```

## Catatan Keamanan Lampiran PSB (Tidak Dienkripsi E2EE)

- Sesuai keputusan desain produk agar panitia dapat langsung mempratinjau dan memverifikasi dokumen dari Google Drive / Storage / backend, **berkas lampiran PSB (KK, akta kelahiran, ijazah/SKL, pas foto) diunggah dalam bentuk mentah (tidak dienkripsi E2EE)**.
- Saat modul E2EE PSB diaktifkan, perlindungan E2EE berlaku pada **biodata dan isian teks** (`__e2ee_bio`), disertai verifikasi pin fingerprint public key.
- Untuk menjaga kerahasiaan lampiran mentah:
  1. Gunakan skrip GAS v4+ (tidak memberi izin `ANYONE_WITH_LINK`, hanya mengikuti izin folder tujuan privat akun panitia).
  2. Batasi akses folder Google Drive / R2 / Supabase / Firebase Console hanya untuk admin yang berwenang.
  3. Arsipkan dokumen secara berkala lalu pindahkan ke tempat sampah / hapus file sementara di cloud jika masa seleksi telah selesai.

## Konfigurasi CORS Bucket Firebase Storage (Wajib untuk Unduh Berkas Offline)

Agar fitur **"Simpan lampiran ke perangkat"** maupun ekspor ZIP pada backend **Firebase** dapat membaca isi berkas lewat Firebase Storage SDK (`getBlob` / `getDownloadURL`), bucket Cloud Storage perlu mengizinkan permintaan `GET`/`HEAD` dari origin aplikasi admin Anda:

1. Buat file `cors.json`:
   ```json
   [
     {
       "origin": ["https://DOMAIN_APLIKASI_ANDA", "http://localhost:3000"],
       "method": ["GET", "HEAD"],
       "maxAgeSeconds": 3600
     }
   ]
   ```
2. Terapkan ke bucket Firebase Storage (ganti `<NAMA_BUCKET>` sesuai `storageBucket` di konfigurasi Firebase):
   ```bash
   gsutil cors set cors.json gs://<NAMA_BUCKET>
   ```
3. **Status Provider Lain:**
   - **Google Apps Script + Drive (`gas`):** Didukung penuh melalui aksi `POST action=getFile` dengan `ADMIN_KEY` dan verifikasi checksum `sha256`.
   - **Cloudflare D1/R2 & Supabase:** Belum didukung untuk penarikan lampiran offline sampai pembaruan autentikasi skrip backend (`X-API-Key: ADMIN_KEY` / `createSignedUrl` dengan sesi admin) selesai diterapkan.

## Keamanan Akses Lokal & Enkripsi `santriBerkas` (Offline IndexedDB)

Lampiran yang ditarik ke penyimpanan perangkat disimpan pada tabel lokal `santriBerkas` di IndexedDB dan **dikecualikan** dari seluruh jalur sinkronisasi cloud (Firebase, Dropbox, WebDAV) maupun ekspor/impor JSON reguler.

1. **Enkripsi Lokal E2EE (`berkas-local`, Fail-Closed):**
   - Jika E2EE aktif, isi berkas dienkripsi di perangkat menggunakan kunci turunan **HKDF-SHA256** (`info: berkas-local`) dari Master Key Device Vault sebelum ditulis ke `santriBerkas`.
   - Checksum `sha256` selalu dihitung dari isi asli (*plaintext*) sebelum enkripsi agar integritas tetap dapat diverifikasi saat ekspor/pemulihan.
   - Bila E2EE aktif tetapi Master Password sedang terkunci saat penarikan berlangsung, aplikasi **menolak menyimpan plaintext** dan menandai status entri sebagai `cloud` (*Menunggu buka kunci Master Password E2EE*).
2. **Pembatas Hak Akses Sisi Klien (Client-Side Boundary):**
   - Akses melihat, mempratinjau, mengunduh ulang, menerapkan `fotoUrl`, mencadangkan/memulihkan `.ZIP`, dan menghapus `santriBerkas` dibatasi baik di antarmuka maupun di lapisan layanan (`santriBerkasService`) hanya untuk `role === 'admin'`, `permissions.psb === 'write'`, atau `permissions.santri === 'write'`, disertai pencatatan di `auditLogs` (`logActivity`).
   - **Batasan Penting:** Karena eSantri adalah aplikasi SPA lokal-pertama (*client-side*), pengecekan peran dan hak akses di aplikasi merupakan **pembatas antarmuka/layanan di sisi klien (*client-side boundary*), bukan batas keamanan kriptografis atau server yang keras**. Skrip *same-origin* atau pengguna dengan akses fisik penuh ke DevTools/IndexedDB tetap dapat mengakses penyimpanan browser, sehingga kunci perlindungan kriptografis sejati bergantung pada pengaktifan E2EE dan penguncian sesi Device Vault saat perangkat ditinggalkan.
3. **Mitigasi Same-Origin, Sanitasi, dan Pratinjau Aman:**
   - Seluruh hasil unduhan divalidasi MIME allowlist (`image/jpeg`, `image/png`, `image/webp`, `application/pdf`), *magic bytes*, serta batas ukuran maks **5 MB** untuk menolak spoofing HTML/skrip.
   - Pratinjau berkas dilakukan di modal *in-app* melalui `createSafeBlobPreviewUrl` dengan pembersihan `URL.revokeObjectURL`, tanpa membuka tab baru berisiko (`window.open`), serta didukung konfigurasi CSP Tauri (`object-src 'none'; frame-src 'self' blob:`) agar pratinjau PDF lokal tetap aman tanpa melonggarkan eksekusi skrip.

## Hapus Salinan Cloud (Pasca Verifikasi & Cadangan Offline)

Untuk mengurangi risiko penyimpanan berkas mentah berkepanjangan di cloud/Drive setelah masa seleksi selesai:

1. **Prasyarat Wajib (Ditolak Jika Belum Terpenuhi):**
   - Salinan cloud **hanya boleh dihapus** untuk entri `santriBerkas` yang sudah berstatus `tersimpan`, memiliki payload `Blob` lokal non-kosong, dan memiliki checksum `sha256` 64-heksadesimal yang valid.
   - Pastikan Anda sudah mengekspor cadangan **Arsip ZIP Berkas** (atau ZIP cadangan terenkripsi di `Pengaturan > Backup`) sebelum menghapus salinan cloud.
2. **Perilaku per Provider:**
   - **GAS + Google Drive (`gas`):** Mengirim `POST action=deleteFile` disertai `ADMIN_KEY`; memindahkan file di dalam folder tujuan PSB ke **Trash Google Drive** (`file.setTrashed(true)`).
   - **Firebase Storage (`firebase`):** Memanggil `deleteObject` pada Storage SDK sesuai aturan `storage.rules` (`allow delete: if isTenantMember(tenantId)`). Penghapusan bersifat permanen di bucket Storage.
   - **Cloudflare D1/R2 & Supabase:** Tetap menolak dengan status **belum didukung oleh backend ini**.
3. **Pelestarian Salinan Lokal & Audit:**
   - Menghapus salinan cloud hanya menandai `cloudDeletedAt` pada metadata lokal dan **tidak menghapus** berkas offline pada tabel `santriBerkas`. Setiap penghapusan dicatat di `auditLogs`.

