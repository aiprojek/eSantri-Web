# Panduan Pengguna & SOP Multi-Admin: Modul Sertifikat & Piagam Kustom
Sistem Informasi Manajemen Pondok Pesantren (eSantri Web)

---

## 1. Gambaran Umum & Ruang Lingkup Fitur
Menu **Pendidikan > Sertifikat & Piagam** dirancang untuk mewadahi penerbitan syahadah, ijazah kegiatan khusus, dan piagam penghargaan pondok pesantren di luar mutaba'ah harian modul Tahfizh reguler, namun tetap **tercatat secara resmi ke dalam Arsip & Buku Agenda Surat Keluar**.

### Kegiatan Pondok yang Diwadahi:
1. **Syahadah Hafalan Mutun Ilmiyah**: *Tuhfatul Athfal*, *Muqaddimah Al-Jazariyah*, *Arba'in An-Nawawiyah*, *Aqidatul Awam*, *Al-Ajurrumiyah*, *Al-Imrithi*, *Alfiyah Ibnu Malik*, dll.
2. **Syahadah Tasmi' / Tahfizh Mandiri**: Ujian sekali duduk (*Tasmi' Bil Ghaib* 1, 5, 10, 15, atau 30 Juz), daurah karantina tahfizh liburan, atau program tahfizh mandiri di luar halaqah reguler.
3. **Sertifikat Khatam Kitab & Daurah Ilmiyah**: Khatam kajian kitab turats, daurah bahasa Arab/Inggris, pelatihan dakwah/pengabdian santri akhir.
4. **Piagam Kejuaraan & Prestasi Santri**: Juara lomba MQK, Khitobah/Pidato 3 Bahasa, Cerdas Cermat Diniyah, Kaligrafi, Pospeda, dan *Santri Teladan*.
5. **Piagam Apresiasi Asatidz, Pemateri & Panitia**: Penghargaan masa khidmat pengajar, pemateri tamu daurah, dewan juri, atau panitia haflah.

---

## 2. Matriks Hak Akses (RBAC Multi-Admin)
Fitur ini memiliki pengaturan hak akses mandiri di menu **Pengaturan > Keamanan & Pengguna** pada baris modul **`Sertifikat & Piagam`** (`sertifikat`), terpisah dari Rapor/Akademik maupun Surat Menyurat sehingga Admin Utama dapat mendelegasikan wewenang secara presisi:

| Level Akses (`sertifikat`) | Contoh Peran / Kepanitiaan | Wewenang di Modul Sertifikat & Piagam |
| :--- | :--- | :--- |
| **Administrator (`role: admin`)** | Admin Utama / Pimpinan | Akses penuh otomatis ke seluruh fitur, template kustom pondok, Buku Agenda, dan publikasi Master Cloud. |
| **Edit (`write`)** | Lajnah Ilmiyah, Lajnah Tahfizh, Panitia Daurah/Lomba, TU | Menerbitkan sertifikat & piagam, menyusun redaksi AI, menyimpan template kustom, cetak massal, dan mencatat Buku Agenda. |
| **Lihat (`read`)** | Wali Kelas, Staf Pemeriksa, Pendamping | Melihat pratinjau template dan mencetak ulang sertifikat yang sudah tercatat di Buku Agenda tanpa mengubah master. |
| **Blokir (`none`)** | Kasir Koperasi, Pos Security, Guru Mapel Biasa | Menu **Sertifikat & Piagam** disembunyikan sepenuhnya dari sidebar pengguna. |

---

## 3. Standar Operasional Prosedur (SOP) Multi-Admin & Sinkronisasi Cloud

### A. Tiga Komponen Data yang Disinkronkan
1. **`arsipSurat` (Buku Agenda & Snapshot Sertifikat)**:
   - Setiap sertifikat yang diterbitkan menyimpan data agenda (`nomorSurat`, `tanggalBuat`, `tujuan`, `perihal`, `jenisDokumen: 'sertifikat'`) beserta `sertifikatSnapshot` utuh.
   - Menggunakan `generateSyncSafeId()` berbasis waktu + *device salt* sehingga **ID record dijamin tidak pernah bertabrakan** meskipun banyak laptop menginput secara bersamaan maupun offline.
2. **`settings.sertifikatTemplates` (Template Kustom Pondok)**:
   - Disimpan di dalam dokumen pengaturan pondok (`settings`) sehingga template kegiatan rutin dapat digunakan seragam di semua komputer staf.
3. **`digitalAssets` (Aset TTD Digital Ustadz & Stempel)**:
   - Tanda tangan PNG transparan milik Mudir/Asatidz dan gambar stempel tersinkronisasi penuh melalui tabel `digitalAssets`.

---

### B. Standar Kode Klasifikasi Penomoran Anti-Tabrakan (Wajib Dipatuhi!)
Ketika beberapa divisi mencetak dokumen pada waktu berdekatan, **pisahkan Kode Klasifikasi** pada kolom *Kode Klasifikasi Nomor* agar urutan nomor otomatis tidak saling berebut:

- **Tata Usaha (Surat Resmi Umum)**: `SRT-UM/PP` -> contoh: `015/SRT-UM/PP/XI/2026`
- **Lajnah Ilmiyah (Syahadah Mutun)**: `SYH-MTN/PP` -> contoh: `001/SYH-MTN/PP/XI/2026`
- **Lajnah Tahfizh (Syahadah Tasmi')**: `SYH-TFZ/PP` -> contoh: `001/SYH-TFZ/PP/XI/2026`
- **Kurikulum / Panitia Daurah**: `SRT-DRH/PP` -> contoh: `001/SRT-DRH/PP/XI/2026`
- **Kesantrian / Panitia Lomba**: `PGM-LMB/PP` -> contoh: `001/PGM-LMB/PP/XI/2026`

> **Proteksi Anti-Duplikat Otomatis**: Jika operator mencetak ulang sertifikat karena kertas miring atau tinta kurang jelas (dengan *Nomor Sertifikat* dan *Nama Penerima* yang sama), sistem otomatis memperbarui record arsip tersebut dan **tidak menduplikasi baris** di Buku Agenda.

---

### C. SOP Berdasarkan Arsitektur Sinkronisasi Pondok

#### Skenario 1: Mode Firebase Realtime Cloud (Rekomendasi Utama)
Ideal apabila kantor pendidikan, ruang tahfizh, dan kantor TU terhubung internet/WiFi pesantren.
1. **Persiapan Aset Terpusat**: Sebelum masa haflah/ujian, Admin Utama memastikan nama Mudir, daftar Tenaga Pengajar, serta **TTD Digital & Stempel** di menu **Pengaturan** sudah lengkap.
2. **Penerbitan Langsung**: Saat staf Lajnah Ilmiyah/Tahfizh menekan tombol **Cetak**, **Unduh PDF**, atau **Simpan Arsip**, arsip sertifikat langsung terkirim ke Firestore dalam 1–2 detik.
3. **Visibilitas Lintas Bagian**: Staf TU di ruangan lain langsung melihat arsip sertifikat tersebut di Buku Agenda tanpa perlu kirim file manual, dapat mengirim notifikasi WhatsApp ke wali santri, atau mencetak ulang bila diperlukan.
4. **Ketahanan Sinyal Putus Sesaat**: Jika koneksi internet terputus sementara, pencetakan tetap berjalan lancar dari database lokal (*IndexedDB*) dan otomatis tersinkron ke Firebase begitu jaringan pulih.
5. **Pengelolaan Template Kustom**: Karena `settings` adalah dokumen konfigurasi induk tunggal, penunjukan pembuatan/edit *Template Kustom Standar Pondok* sebaiknya dipusatkan pada 1 Koordinator Pendidikan atau Admin Utama.

#### Skenario 2: Mode Hub-and-Spoke (Dropbox / WebDAV — Hybrid & Semi-Offline)
Ideal untuk kepanitiaan di aula, gedung asrama, atau lokasi daurah yang tidak memiliki jaringan internet stabil.
1. **Tahap Pra-Acara (SPOKE / Laptop Panitia)**:
   - Login saat masih terjangkau internet agar **Auto-Pull** mengunduh data santri, aset TTD digital, dan Buku Agenda terbaru (atau klik manual **Ambil Master Data**).
2. **Tahap Penerbitan di Lokasi Acara (SPOKE — Offline)**:
   - Cetak sertifikat perorangan atau massal menggunakan **Kode Klasifikasi Khusus Kepanitiaan** (misal `SYH-MTN/PP` atau `PGM-MQK/PP`) agar penomoran mandiri panitia tidak pernah bentrok dengan surat keluar Kantor TU.
3. **Tahap Setor Data Selesai Acara (SPOKE -> Cloud Inbox)**:
   - Begitu laptop terhubung internet kembali, klik ikon Cloud di kanan atas aplikasi -> pilih **"Kirim Perubahan (Upload Staff Changes)"** sebelum *Logout*. Sistem akan memberi peringatan otomatis apabila staf mencoba *Logout* saat masih ada data sertifikat yang belum disetor.
4. **Tahap Penggabungan Buku Agenda (HUB / Admin Utama)**:
   - Admin Utama membuka menu **Pusat Sinkronisasi** -> memeriksa rincian paket staf (*Arsip Surat Keluar*) -> klik **"Gabungkan Perubahan (Merge)"** -> lalu **WAJIB klik "Publikasikan Master Data (Publish Master)"** agar Buku Agenda gabungan terdistribusi ke seluruh staf.
5. **Aturan Khusus Template pada Hub-and-Spoke**:
   - Buat/ubah *Template Kustom Pondok* di komputer **HUB (Admin Utama)** lalu publikasikan melalui *Publish Master*, karena dokumen `settings` disinkronkan menggunakan waktu perubahan terbaru (*last-modified wins*), sedangkan data `arsipSurat` dari perangkat **SPOKE** digabung secara aman per-record tanpa saling menimpa.

#### Skenario 3: Disiplin Keamanan Sesi Komputer Bersama & Cold Backup
1. Pada laptop kepanitiaan yang dipakai bergantian, **petugas WAJIB klik Logout** setelah selesai bertugas agar jejak *Audit Log* mencatat akun penerbit sertifikat secara akurat.
2. Admin Utama disarankan mengunduh **Backup JSON** di menu **Pengaturan > Backup & Restore** setelah acara wisuda/haflah selesai sebagai cadangan arsip jangka panjang (*cold storage*).

---

## 4. Panduan Operasional Pembuatan & Pencetakan Sertifikat

### Langkah 1: Pilih Preset Kegiatan & Tema Visual
1. Buka menu **Pendidikan > Sertifikat & Piagam**.
2. Pada tab **Buat & Cetak Sertifikat** (atau tab **Template & Preset**), pilih salah satu dari 6 preset kegiatan pondok atau muat Template Kustom yang pernah disimpan.
3. Pilih 1 dari **5 Tema Desain A4 Landscape**:
   - **Klasik Pesantren**: Nuansa kertas krem hangat dengan bingkai ganda warna emas klasik.
   - **Modern Geometris**: Latar putih bersih dengan aksen sudut zamrud modern.
   - **Ornamen Samping**: Pita aksen vertikal elegan di sisi kiri dokumen.
   - **Eksklusif Malam**: Latar biru gelap (*navy slate*) mewah dengan tipografi emas untuk syahadah utama/wisuda.
   - **Ceria Berwarna**: Aksen warna hangat dan ramah untuk marhalah ula / TPQ / lomba anak.

### Langkah 2: Menyusun Isi Pesan (Manual atau AI Generator)
1. Untuk menyusun cepat dengan AI, klik tombol **"Susun Redaksi AI"** di bagian atas halaman.
2. Pilih **Kategori Kegiatan**, tulis deskripsi capaian/acara secara spesifik (misal: *"Menyelesaikan hafalan Matan Tuhfatul Athfal 61 bait dengan predikat Mumtaz pada Ujian Akhir Semester Ganjil"*), dan pilih **Gaya Bahasa** (*Formal Pesantren*, *Islami & Doa*, atau *Akademik Modern*).
3. Klik **Buat Redaksi** -> periksa hasilnya -> klik **Terapkan ke Sertifikat**. Seluruh kolom *Judul*, *Subjudul*, *Capaian Utama*, dan *Pesan Apresiasi/Doa* langsung terisi rapi dan dapat disunting kembali bila diperlukan.
4. Anda juga dapat memanfaatkan **Chip Cepat** di bawah kolom Capaian & Predikat (daftar kitab mutun populer, juz tasmi', juara lomba, dan predikat Arab/Indonesia).

### Langkah 3: Memilih Penerima Sertifikat (3 Mode)
1. **Mode 1 Santri**:
   - Pilih santri aktif melalui kolom pencarian; data NIS, Jenjang, Kelas/Rombel, dan Nama Wali akan ditarik otomatis sesuai atribut identitas yang dicentang.
2. **Mode Massal (Banyak Santri)**:
   - Gunakan filter Jenjang, Kelas, dan Rombel untuk memilih puluhan santri sekaligus.
   - Aktifkan fitur **"Kustomisasi Capaian / Predikat per Santri"** apabila setiap santri dalam rombongan memiliki capaian berbeda (contoh: Ahmad lulus *Jazariyah* predikat *Mumtaz*, Zaid lulus *Tuhfatul Athfal* predikat *Jayyid Jiddan*, atau Juara 1, 2, dan 3 dalam satu sesi cetak).
   - Nomor sertifikat akan **diurutkan otomatis** (`001/...`, `002/...`, `003/...`) untuk setiap penerima!
3. **Mode Manual / Non-Santri**:
   - Gunakan untuk mencetak piagam ustadz, pemateri luar, dewan juri, atau panitia. Tersedia tombol ambil cepat dari daftar **Tenaga Pengajar** pondok.

### Langkah 4: Konfigurasi Titimangsa, Penanda Tangan & Stempel
1. **Penanggalan**: Pilih format tanggal **Masehi**, **Hijriah**, atau **Ganda (Hijriah & Masehi)** lengkap dengan penggeser koreksi hari Hijriah (`-2` s/d `+2` hari) untuk menyesuaikan rukyat lokal.
2. **1 atau 2 Penanda Tangan**:
   - Pilih jumlah penanda tangan (1 di kanan/tengah atau 2 sejajar kiri–kanan).
   - Mode pengisian mendukung otomatis **Mudir / Pimpinan Pondok**, **Muhaffizh Halaqah** (menyesuaikan halaqah masing-masing santri saat cetak massal!), **Wali Kelas** (menyesuaikan rombel masing-masing santri!), pilih spesifik dari **Daftar Ustadz**, atau **Ketik Manual**.
3. **TTD Digital & Stempel**:
   - Centang **Tampilkan TTD Digital** untuk menyematkan tanda tangan transparan milik ustadz terkait secara ketat (tidak akan pernah salah mengambil TTD milik guru lain).
   - Pilih mode **Stempel**: *Otomatis*, *Segel Resmi SVG Melingkar* (teks lengkung bawah dapat diubah bebas seperti `★ LAJNAH ILMIYAH ★`, `★ LAJNAH TAHFIZH ★`, `★ PANITIA DAURAH ★`), *Gambar Stempel Pondok*, atau *Tanpa Stempel* (bila ingin distempel basah setelah dicetak).

### Langkah 5: Pencetakan Presisi & Pengelolaan Buku Agenda
1. Klik **"Cetak Sertifikat"** (direkomendasikan untuk kualitas vektor tajam) atau **"Unduh PDF"**.
2. Pada jendela dialog cetak browser, pastikan pengaturan berikut:
   - **Paper Size**: `A4`
   - **Layout / Orientation**: `Landscape`
   - **Margins**: `None` (Tidak Ada)
   - **Scale**: `100%` / `Default`
   - **Background Graphics**: **WAJIB DICENTANG** agar latar krem/gelap dan bingkai warna tercetak sempurna di kertas piagam (*Linen / Concorde / Art Carton*).
3. Setiap sertifikat yang dicetak atau diunduh otomatis masuk ke tab **Arsip & Buku Agenda** dan juga muncul di **Surat Menyurat > Arsip Surat** (gunakan filter **"Hanya Sertifikat & Piagam"** untuk memilah khusus sertifikat, mengirim pesan WhatsApp ke wali santri, mengekspor rekap Excel, mencetak Buku Agenda TU, atau mencetak ulang sertifikat kapan saja).
