# Panduan Pengguna: Modul Tahfizh & Rapor Hafalan Al-Qur'an
Sistem Informasi Manajemen Pondok Pesantren (eSantri Web)

---

## 1. Pendahuluan & Alur Kerja Terintegrasi
Modul Tahfizh pada eSantri Web dirancang untuk mendokumentasikan perjalanan menghafal Al-Qur'an santri secara komprehensif, mulai dari setoran harian (Ziyadah & Murojaah), evaluasi kualitas bacaan/tajwid/makhraj, ujian hafalan berkala per juz, hingga penerbitan Buku Rapor Semesteran dan Syahadah/Ijazah Hafalan resmi.

### 🌟 Fitur Utama Modul Tahfizh:
1. **Manajemen Halaqah & Plotting Cepat**: Pengelompokan santri per muhaffizh/ustadz pembimbing dengan dukungan filter cascading (Jenjang, Tingkat Kelas, Rombel).
2. **Pencatatan Harian Presisi**: Input Ziyadah dan Murojaah dengan perekaman metrik evaluasi kesalahan (Teguran/Tawaqquf, Lahn/Kesalahan, aspek Tajwid & Makhraj).
3. **Ujian Juz & Status Mutqin**: Fitur ujian kelayakan hafalan juz yang otomatis menandai status Mutqin pada Peta Capaian 30 Juz santri.
4. **Dokumen & Rapor Lengkap**:
   - **Buku Rapor Semesteran Tahfizh**: Layout standar A4 resmi lengkap dengan visualisasi Peta 30 Juz, akumulasi evaluasi, dan tanda tangan proporsional.
   - **Syahadah Tahfizh (Landscape)**: Sertifikat kelulusan juz bergaya kaligrafi elegan dengan titimangsa ganda (Masehi & Hijriah).
   - **Laporan Perkembangan & Mutaba'ah**: Riwayat setoran kronologis per santri.
   - **Rekapitulasi Halaqah & Muhaffizh**: Ikhtisar capaian kelas/halaqah untuk laporan pimpinan pondok.
5. **Performa Cetak Massal On-Demand**: Dokumen cetak massal hanya dirender saat tombol cetak/ekspor dipicu, menjaga aplikasi tetap cepat dan ringan meski mencetak ratusan santri.
6. **Sinkronisasi Fleksibel (Offline-First, Firebase Realtime, & Hub-and-Spoke)**: Bekerja lancar tanpa internet, realtime antar perangkat, maupun transfer paket berkas.

---

## 2. Manajemen Halaqah & Plotting Santri
Menu: **Tahfizh > Manajemen Halaqah**

### A. Membuat Kelompok Halaqah Baru
1. Klik tombol **"+ Tambah Halaqah"**.
2. Masukkan identitas kelompok:
   - **Nama Halaqah**: Contoh: *Halaqah Abu Bakar Ash-Shiddiq*, *Halaqah Ula Putra*.
   - **Ustadz Muhaffizh**: Pilih dari daftar Tenaga Pendidik.
   - **Target Hafalan**: Tentukan target standar capaian hafalan.
   - **Jadwal & Lokasi**: Tentukan waktu halaqah (Ba'da Shubuh, Ba'da Ashar, dll.) dan ruangan/masjid.
3. Klik **Simpan Halaqah**.

### B. Plotting Santri (Filter Cascading)
1. Buka menu **Manajemen Halaqah** lalu pilih tab **Plotting Anggota**.
2. Gunakan **Filter Cascading** di bagian atas untuk menyaring santri:
   - **Filter Jenjang**: Pilih Marhalah (misal: *Salafiyah Wustho / MTs*).
   - **Filter Kelas**: Pilih tingkat kelas (misal: *Kelas VII*).
   - **Filter Rombel**: Pilih rombel khusus (misal: *VII-A*).
3. Centang nama-nama santri yang menjadi bimbingan halaqah tersebut.
4. Klik tombol **"Simpan Anggota Halaqah"**.

---

## 3. Pencatatan Setoran Harian (Ziyadah & Murojaah)
Menu: **Tahfizh > Input Setoran / Riwayat Hafalan**

### A. Alur Pencatatan di Halaqah:
1. Pilih nama santri dari daftar halaqah (gunakan kolom pencarian untuk navigasi cepat).
2. Tentukan **Tipe Setoran**:
   - **Ziyadah (Hafalan Baru)**: Penambahan hafalan ayat/halaman baru yang belum pernah disetor.
   - **Murojaah (Pengulangan)**: Menjaga hafalan yang sudah pernah disetor sebelumnya.
3. Tentukan Rentang Ayat:
   - Pilih **Juz**, **Surah Awal & Ayat Awal**, serta **Surah Akhir & Ayat Akhir** (atau nomor halaman). Sistem akan otomatis menyarankan ayat lanjutan dari setoran terakhir santri.
4. Penilaian & Evaluasi Detail:
   - **Nilai Angka / Predikat**: Skala 0–100 atau predikat (*Mumtaz, Jayyid Jiddan, Jayyid, Maqbul*).
   - **Nilai Aspek (Opsional)**: Nilai kelancaran, tajwid, makhraj, dan adab.
   - **Pencatatan Kesalahan**:
     * **Jumlah Teguran (Tawaqquf)**: Pengingat atau bantuan awal ayat/kalimat dari pembimbing saat santri terhenti.
     * **Jumlah Kesalahan (Lahn/Ghalath)**: Kesalahan harakat, huruf, atau kalimat yang diperbaiki.
     * **Aspek Tajwid & Makhraj**: Centang/isi kategori kekeliruan (misal: *Ghunnah, Mad, Ikhfa, Idgham, Qalqalah, Huruf Halqiyah, Huruf Lisan*).
5. Klik **Simpan Setoran**. Data langsung tersimpan di database lokal IndexedDB dan otomatis dikirim ke cloud jika Firebase/Sync aktif.

---

## 4. Pelaksanaan Ujian Hafalan & Penandaan Status Mutqin
Menu: **Tahfizh > Input Ujian Hafalan**

1. Pilih santri yang akan menempuh ujian hafalan per juz atau per seperempat Al-Qur'an.
2. Pilih Tipe: **"Ujian Hafalan"**.
3. Tentukan **Juz yang Diujikan** (misal: *Juz 30* atau *Juz 1*).
4. Masukkan hasil pengujian:
   - Nilai kelancaran, tajwid, fashahah/makhraj, dan adab.
   - Catatan penguji dan rekomendasi kenaikan juz.
5. **Status Mutqin**:
   - Jika santri memenuhi standar kelulusan dan dinyatakan mutqin (hafalan kuat tanpa ragu), centang opsi **"Tandai Status Mutqin"**.
   - Sistem akan menandai nomor juz tersebut sebagai *Mutqin* pada profil santri dan visualisasi Peta 30 Juz di Rapor Semester.

---

## 5. Penerbitan & Pencetakan Dokumen Rapor / Syahadah
Menu: **Tahfizh > Riwayat & Dokumen > Cetak Dokumen Massal / Detail Santri**

### Pilihan Format Dokumen:
1. **Buku Rapor Semesteran Tahfizh (A4 Portrait)**:
   - **Identitas Santri & Pondok**: Dilengkapi kop resmi dan nomor induk.
   - **Peta Capaian Hafalan 30 Juz**: Kotak indikator Juz 1–30 dengan warna khusus:
     * Hijau/Teal: Juz Mutqin (Lulus Ujian).
     * Kuning/Amber: Juz Ziyadah (Sedang proses/pernah disetor).
     * Abu-abu: Belum ditempuh.
   - **Rekapitulasi Nilai & Rata-rata**: Nilai kelancaran, tajwid, dan adab.
   - **Akumulasi Evaluasi Semester**: Total teguran (tawaqquf) dan kesalahan serta aspek tajwid/makhraj yang perlu ditingkatkan.
   - **Tanda Tangan 3 Pihak**: Orang Tua / Wali, Muhaffizh Pembimbing, dan Mudir / Pimpinan Pondok dengan titimangsa rapi dalam satu baris.
2. **Syahadah Tahfizh (A4 Landscape)**:
   - Piagam ijazah hafalan juz resmi berbingkai kaligrafi estetis dengan titimangsa ganda (Masehi & Hijriah).
3. **Laporan Perkembangan Hafalan**:
   - Rekap daftar setoran harian santri dalam rentang tanggal tertentu untuk laporan berkala ke orang tua.
4. **Rekapitulasi per Rombel / Muhaffizh**:
   - Laporan tabel rekap capaian seluruh santri dalam satu kelas/halaqah untuk evaluasi manajerial pondok.

### Kustomisasi Titimangsa & Penandatangan:
- **Format Tanggal Dokumen**:
  - *Hanya Masehi*: contoh: `Cirebon, 20 Desember 2026`
  - *Hanya Hijriah*: contoh: `Cirebon, 11 Rajab 1448 H`
  - *Ganda (Hijriah & Masehi)*: contoh: `Cirebon, 11 Rajab 1448 H / 20 Desember 2026 M`
- **Penyesuaian Tanggal Hijriah**: Geser offset -2 s/d +2 hari jika terdapat perbedaan penetapan rukyat lokal, atau ketik teks manual sesuai kebutuhan.
- **Pilihan Penandatangan**:
  - Tanda tangan Muhaffizh: otomatis mengambil data guru pembimbing halaqah, wali kelas, atau kustom tulis manual.
  - Tanda tangan Mudir: otomatis mengambil pimpinan pondok dari pengaturan data master.

---

## 6. Sinkronisasi Data & Kolaborasi Tim (Multi-Admin)
Modul Tahfizh mendukung penuh tiga skenario kerja:

1. **Mode Offline (Standalone)**:
   - Ustadz dapat menginput setoran di halaqah masjid tanpa jaringan internet. Data aman di database peramban (IndexedDB).
2. **Mode Firebase Realtime (Rekomendasi)**:
   - Setiap setoran yang diinput muhaffizh langsung tersinkron secara real-time ke akun Admin dan portal wali santri.
3. **Mode Hub-and-Spoke (Dropbox / WebDAV)**:
   - Muhaffizh mengekspor perubahan melalui tombol **"Upload Perubahan Staf"**, dan Admin Utama menggabungkannya ke Master Data dengan satu klik (*Download & Merge Master*).
