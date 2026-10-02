# Panduan Operasional & SOP Multi-Admin Perpustakaan Digital Pesantren (eSantri Web)

Dokumen ini merupakan panduan baku operasional, tata kelola kategori, kebijakan denda, sirkulasi peminjaman, serta Standar Operasional Prosedur (SOP) Multi-Admin berbasis **Real-Time Cloud (Firebase)** dan **Hub-and-Spoke (Offline-First / Hybrid Sync)** pada sistem eSantri Web.

---

## 1. Manajemen Master Kategori Koleksi Buku

### A. Penyimpanan Otomatis Kategori Manual
- **Apakah kategori baru yang ditambah manual akan tersimpan?**  
  **Ya, tersimpan otomatis secara permanen.** Begitu Anda mengetikkan nama kategori baru pada formulir Tambah Buku maupun Bulk Editor, sistem langsung mendaftarkannya ke basis data konfigurasi (`settings.perpusConfig.kategoriKoleksi`), tersimpan di IndexedDB lokal browser, dan tersinkronkan ke Cloud Firestore / File Backup.
- Pustakawan **tidak perlu menulis ulang secara manual** di masa mendatang, karena kategori tersebut langsung muncul pada daftar pilihan dropdown di seluruh modul katalog dan filter.

### B. Penghapusan & Reset Kategori Koleksi
- **Apakah kategori bisa dihapus jika sudah tidak diperlukan?**  
  **Bisa.** 
  1. Masuk ke menu **Pengaturan** (ikon roda gigi) > pilih tab **Sistem** > buka panel **Pengaturan Perpustakaan** (atau dari tab Perpustakaan > Pengaturan).
  2. Pada tabel **Daftar Kategori Koleksi**, klik ikon tempat sampah (Hapus) pada kategori yang ingin dihapus.
  3. Tersedia juga tombol **Reset Default** untuk mengembalikan daftar kategori ke 10 kategori standar pesantren.

---

## 2. Pengaturan Kebijakan Peminjaman & Nominal Denda

### Lokasi Pengaturan:
Menu **Pengaturan > Sistem / Perpustakaan** (atau sub-tab Pengaturan pada menu Perpustakaan).

### Parameter yang Dikonfigurasi:
1. **Nominal Denda Keterlambatan per Hari (Rp):**  
   Nominal denda per buku untuk setiap hari keterlambatan melewati tanggal jatuh tempo (contoh default: `Rp 1.000` atau `Rp 500`).
2. **Durasi Pinjam Standar (Hari):**  
   Jangka waktu peminjaman standar saat transaksi dibuat (contoh: `7 hari` atau `14 hari`). Tanggal jatuh tempo dihitung otomatis oleh sistem.
3. **Maksimal Pinjam per Santri (Buku):**  
   Batas kuota buku yang boleh dipinjam bersamaan oleh satu santri (contoh: `3 buku`). Mencegah santri menumpuk buku pinjaman.
4. **Batas Maksimal Perpanjangan:**  
   Batas frekuensi toleransi perpanjangan masa pinjam (contoh: `2 kali`).

### Rumus Kalkulasi Denda:
$$\text{Total Denda} = (\text{Jumlah Hari Terlambat}) \times \text{Tarif Denda per Hari} \times \text{Jumlah Buku}$$
Jika santri mengembalikan tepat waktu atau sebelum tanggal jatuh tempo, denda bernilai Rp 0.

---

## 3. Katalog Buku & Bulk Editor

1. **Tambah Buku Satuan:**
   - Masukkan Kode Buku / Barcode unik (atau klik Generate Otomatis).
   - Masukkan Judul, Penulis, Penerbit, Tahun Terbit, ISBN, Kategori Koleksi, Lokasi Rak (misal: `Rak A-02`), dan Jumlah Stok Fisik.
2. **Tambah Massal (Bulk Editor):**
   - Buka menu **Perpustakaan > Katalog Buku > Tambah Massal (Bulk Editor)**.
   - Mendukung copy-paste data tabel dari Microsoft Excel atau Google Sheets.
   - Dilengkapi validasi kode buku duplikat secara real-time.
   - Kategori baru yang dimasukkan otomatis tersimpan ke Master Kategori.

---

## 4. Alur Sirkulasi (Peminjaman & Pengembalian)

1. **Peminjaman:**
   - Scan barcode kartu santri atau cari nama/NIS santri.
   - Pilih buku yang status stoknya tersedia (`stok > 0`).
   - Sistem menetapkan tanggal jatuh tempo otomatis dan mengurangi stok buku katalog secara real-time.
2. **Pengembalian:**
   - Cari data peminjaman aktif santri.
   - Sistem mendeteksi keterlambatan secara otomatis, menghitung total denda.
   - Pustakawan memilih status pembayaran denda: **Lunas** atau **Belum Bayar**.
   - Pustakawan menentukan kondisi fisik buku: **Baik** (stok kembali ke rak), **Rusak** (catatan denda perbaikan), atau **Hilang** (buku dicatat hilang).
3. **Perpanjangan:**
   - Menambah durasi peminjaman santri selama belum melebihi batas maksimal perpanjangan.

---

## 5. Cetak Perlengkapan Perpustakaan

Tersedia di menu **Perpustakaan > Cetak Kartu & Label**:
- **Kartu Anggota Perpustakaan:** Format kartu ID santri dengan barcode NIS resmi, foto, dan nama kelas.
- **Label Punggung Buku (Spine Label / Call Number):** Berisi kode kategori, nomor rak, dan inisial buku untuk ditempel di punggung buku.
- **Label Barcode Buku:** Barcode Code128 siap cetak ke stiker label.
- **Slip Tanggal Kembali (Due Date Slip):** Tabel stempel tanggal kembali untuk ditempel di halaman belakang buku.

---

## 6. Standar Operasional Prosedur (SOP) Multi-Admin Perpustakaan

### Urgensi & Konteks Pesantren
Perpustakaan pondok pesantren biasanya memiliki meja kasir/komputer sirkulasi fisik di gedung perpustakaan yang terpisah dari kantor Tata Usaha (TU) dan kantor Bendahara. Pelayanan dijaga oleh staf pustakawan atau santri pengurus (OPPM/ISPA) secara bergantian (shift piket pagi, siang, dan malam). 

Sistem mendukung dua arsitektur kerja: **Model A: Cloud Real-Time Live Sync (Firebase)** dan **Model B: Hub-and-Spoke (Offline-First / Hybrid)**.

### Model A: Real-Time Live Sync (Firebase Firestore)
*Cocok jika komputer sirkulasi perpustakaan selalu terhubung ke jaringan internet / WiFi pondok yang stabil.*
1. **Akun Khusus Pustakawan:** Admin TU membuatkan akun staf dengan izin akses dibatasi hanya ke modul **Perpustakaan**. Staf tidak dapat mengakses buku kas umum atau catatan BK santri.
2. **Sinkronisasi Detik Itu Juga:** Setiap transaksi peminjaman, perpanjangan, dan pengembalian langsung masuk ke Cloud Firestore secara instan (*two-way live sync*).
3. **Data Santri Terpadu:** Santri baru yang diinput di TU atau santri yang telah mutasi keluar langsung terbaca statusnya di meja sirkulasi perpus.

### Model B: Arsitektur Hub-and-Spoke (Offline-First / Dropbox / WebDAV)
*Solusi jika gedung perpustakaan berada di area minim sinyal WiFi atau internet sering padam.*
1. **Peran HUB (Pusat Data Induk di Kantor TU):**
   - Memegang database induk (seluruh santri aktif, seluruh katalog buku, riwayat sirkulasi global).
   - Menjalankan *Publish Master Data* saat ada penambahan santri baru atau pembaruan katalog buku skala besar.
2. **Peran SPOKE (Komputer di Meja Sirkulasi Perpustakaan):**
   - Petugas melayani peminjaman dan pengembalian 100% secara offline tanpa internet menggunakan database lokal IndexedDB browser yang sangat cepat.
3. **Alur Kerja & Penggabungan (Merging) Harian:**
   - **Auto-Pull saat Login:** Saat laptop sirkulasi menyala dan terkoneksi internet sesaat, sistem menarik otomatis data santri terbaru di latar belakang.
   - **Pelayanan Peminjaman:** Seluruh transaksi dicatat secara offline di laptop sirkulasi.
   - **Kirim Perubahan (Upload Staff Changes):** Di akhir jam buka perpustakaan, pustakawan membuka menu Sinkronisasi dan mengeklik *Kirim Perubahan*.
   - **Penggabungan (Merge Changes) di HUB:** Admin TU mengeklik *Gabungkan Perubahan Staff*. Transaksi sirkulasi dan perubahan stok masuk ke database induk tanpa menimpa data divisi lain.

### Matriks Pembagian Peran Multi-Admin
| Peran | Perangkat / Lokasi | Wewenang Utama | Tanggung Jawab Sinkronisasi |
| :--- | :--- | :--- | :--- |
| **Admin Utama (TU)** | Server TU (HUB) | Kelola database induk, buat akun staf, backup sistem | *Merge Changes* & *Publish Master* |
| **Kepala Perpustakaan** | Ruang Perpus | Tentukan kebijakan denda, durasi pinjam, verifikasi stok fisik | Verifikasi stok & audit tahunan |
| **Petugas Sirkulasi (Piket)** | Meja Sirkulasi (SPOKE) | Layani pinjam, kembali, perpanjang, terima denda | *Upload Staff Changes* tiap akhir shift |
| **Santri Pengurus (OPPM)** | Meja Sirkulasi | Scan barcode, penataan rak buku, pengecekan fisik | Tidak mengubah pengaturan & denda |

### SOP Finansial Denda & Uang Ganti Rugi
1. Denda keterlambatan atau uang ganti rugi buku hilang yang diterima tunai di meja perpus wajib ditandai status **"Lunas"** pada sistem.
2. Setiap akhir pekan atau akhir bulan, total rekapitulasi penerimaan denda disetorkan ke Bendahara Pesantren atau dialokasikan untuk kas perawatan buku sesuai arahan pimpinan.

### 3 Pantangan Keras Multi-Admin Perpustakaan
1. **Dilarang meminjamkan buku tanpa input sirkulasi sistem:** Peminjaman manual di kertas berisiko tinggi buku hilang tak terlacak.
2. **Dilarang mengubah kode unik atau menghapus buku yang berstatus dipinjam:** Menghapus atau mengubah kode buku yang sedang dipinjam santri merusak relasi data sirkulasi saat pengembalian.
3. **Dilarang me-restore database lama sembarangan di komputer sirkulasi:** Melakukan restore cadangan lama tanpa sinkronisasi ke server HUB dapat menghapus transaksi peminjaman hari berjalan.

---

## 7. Audit Trail & Backup Rutin

- **Audit Log Otomatis (`db.auditLogs`):** Seluruh mutasi buku (INSERT, UPDATE, DELETE) dan transaksi sirkulasi (PINJAM, KEMBALI, PERPANJANG) otomatis mencatat nama staf/admin yang bertugas dan stempel waktu (*timestamp*).
- **Keamanan Sesi Akun:** Petugas piket wajib melakukan **Logout** saat pergantian jam jaga.
- **Backup Rutin:** Lakukan pengunduhan cadangan data secara teratur melalui menu **Pengaturan > Backup & Restore** untuk melindungi aset literasi pondok pesantren.
