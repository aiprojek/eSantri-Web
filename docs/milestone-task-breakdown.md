# Milestone Task Breakdown

Dokumen ini menurunkan [development-milestones.md](/home/abdullah-home/Documents/GitHub/eSantri-Web/docs/development-milestones.md) menjadi daftar task teknis yang lebih kecil dan siap dipecah ke issue/PR.

Status yang dipakai:

- `[ ]` belum dikerjakan
- `[-]` sebagian
- `[x]` selesai

## Milestone 1

Fokus: runtime lokal, release desktop, dan ketegasan mode build.

### 1.1 Release Tauri lokal penuh

- [-] Pastikan release Tauri memuat aset CSS/JS lokal, bukan CDN.
- [-] Audit semua generator HTML/export yang masih membaca stylesheet dinamis dari runtime aktif.
- [ ] Uji build Tauri di mode release dan verifikasi semua ikon, font, dan halaman utama tampil normal tanpa internet.

Definition of done:

- installer desktop berjalan tanpa request jaringan untuk UI inti
- tampilan desktop identik dengan web production lokal

### 1.2 CSP dan mode build

- [x] Tetapkan CSP release desktop yang eksplisit di `src-tauri/tauri.conf.json`.
- [x] Pisahkan mode config:
  - `hybrid-preview`
  - `web-production`
  - `tauri-production`
- [x] Dokumentasikan apa yang boleh hidup di masing-masing mode.

Definition of done:

- mode build tidak lagi ambigu
- reviewer bisa melihat dengan cepat mode mana yang sedang diubah

### 1.3 Smoke test release

- [x] Tulis checklist smoke test:
  - login lokal
  - login Google
  - pairing
  - portal publik
  - offline cache
- [-] Simpan hasil verifikasi terakhir ke dokumen release atau PR.
  - Referensi hasil terbaru: `docs/release-smoke-verification-2026-05-01.md`

Definition of done:

- setiap release punya bukti verifikasi minimum

## Milestone 2

Fokus: boundary cloud, permission migration, dan real-world verification.

### 2.1 Deploy dan uji `firestore.rules`

- [ ] Deploy rules terbaru ke project Firebase aktif.
- [ ] Uji `invite -> join tenant` dengan dua akun berbeda.
- [ ] Uji akses portal publik tanpa hak tenant internal.
- [-] Catat hasil verifikasi dan edge case.
  - Template verifikasi siap: `docs/p1-firebase-boundary-verification.md`

Definition of done:

- rules yang ada di repo sama dengan rules yang hidup di project nyata

### 2.2 Permission versioning

- [x] Tambahkan `permissionVersion` pada user/role config.
- [x] Buat migration untuk akun lama saat app start.
- [x] Pastikan modul baru mengikuti fallback `deny-by-default`.
- [x] Tambahkan indikator audit untuk user legacy yang belum termigrasi.

Definition of done:

- role lama tidak diam-diam mendapat akses baru

### 2.3 Matriks boundary

- [ ] Dokumentasikan boundary yang dianggap nyata:
  - operator antar-user lokal
  - tenant cloud
  - portal publik
- [ ] Dokumentasikan tradeoff yang memang sengaja diterima:
  - secret cloud di client
  - offline ownership
  - local-first sync

Definition of done:

- tim tidak lagi mencampur tradeoff arsitektural dengan bug boundary

## Milestone 3

Fokus: target performa setelah refactor lazy-loading besar selesai.

### 3.1 Budget performa internal

- [ ] Tetapkan budget untuk:
  - entry shell utama
  - shell `Settings`
  - shell `PSB`
  - shell `Reports`
  - first-open `TabCloud`
- [ ] Simpan angka baseline hasil build terakhir.
- [ ] Tentukan toleransi regresi per PR.

Definition of done:

- tim punya angka target, bukan sekadar “terasa berat”

### 3.2 Vendor besar tersisa

- [ ] Audit `vendor-firebase-auth`:
  - flow mana yang memang wajib
  - flow mana yang bisa tetap on-demand
- [ ] Audit `vendor-firebase-firestore`:
  - fitur realtime yang benar-benar butuh full Firestore
  - fitur yang cukup pakai lite
- [ ] Audit `vendor-xlsx` dan `vendor-jspdf`:
  - fitur mana yang paling sering dipakai
  - apakah perlu alternatif export yang lebih ringan
- [ ] Audit `vendor-charts`:
  - apakah semua chart perlu dimuat penuh di area analitik

Definition of done:

- setiap vendor besar tersisa punya justifikasi atau backlog reduksi

### 3.3 Pengukuran otomatis

- [ ] Tambahkan output ukuran chunk ke CI atau script verifikasi lokal.
- [ ] Simpan summary build sebagai artefak sederhana.

Definition of done:

- regresi ukuran bundle bisa terlihat sebelum rilis

## Milestone 4

Fokus: UI consistency, responsive hardening, dan pola filter santri lintas modul.

### 4.1 Design system ringan

- [ ] Bentuk library komponen dasar:
  - `PageHeader`
  - `SectionCard`
  - `FilterBar`
  - `StatCard`
  - `DataTableShell`
  - `EmptyState`
  - `MobileActionBar`
- [ ] Samakan skala:
  - radius
  - shadow
  - border
  - heading
  - spacing
- [ ] Tetapkan varian warna untuk aksi:
  - primary
  - success
  - warning
  - danger

Definition of done:

- halaman baru tidak lagi membangun UI dari nol

### 4.2 Responsive hardening

- [ ] Audit halaman dengan tabel besar dan buat strategi mobile:
  - card list
  - stacked row
  - horizontal scroll terkontrol
- [ ] Audit shell aplikasi:
  - sidebar
  - toggle mobile
  - sticky header
  - safe area bawah untuk tombol tetap
- [ ] Uji halaman prioritas di lebar:
  - 360px
  - 390px
  - 768px
  - 1024px

Definition of done:

- halaman inti usable di ponsel tanpa pinch-zoom dan tanpa tombol tertutup

### 4.3 Standardisasi filter santri

- [x] Buat satu komponen/hook bersama untuk filter santri lintas modul.
- [x] Minimal dukungan default:
  - `search`
  - `jenjang/marhalah`
  - `kelas`
  - `rombel`
  - `status`
- [-] Opsi tambahan per modul:
  - `gender`
  - `gedung`
  - `status pembayaran`
  - lainnya
- [-] Terapkan ke modul prioritas:
  - `SantriList`
  - `StatusPembayaranView`
  - `UangSakuView`
  - `WhatsAppCenter`
  - `SuratMenyurat`
  - `Asrama`

Definition of done:

- fitur yang menyaring data santri tidak lagi punya perilaku filter berbeda-beda tanpa alasan

## Milestone 5

Fokus: reset fondasi visual aplikasi agar mengikuti [dashboard-ui.md](/home/abdullah-home/Documents/GitHub/eSantri-Web/docs/ui/dashboard-ui.md) dengan baseline kerja di [ui-migration-baseline.md](/home/abdullah-home/Documents/GitHub/eSantri-Web/docs/ui/ui-migration-baseline.md).

### 5.1 Foundation reset

- [x] Tambahkan semantic tokens di `index.css`.
- [x] Ganti scrollbar terang dengan versi yang sesuai dark surface.
- [x] Tambahkan font family IBM Plex Sans ke fondasi app.
- [x] Extend `tailwind.config.js` dengan:
  - semantic colors
  - surface levels
  - text tokens
  - radius
  - shadow

Definition of done:

- komponen inti tidak lagi mengandalkan `bg-white`, `text-gray-*`, dan `teal-*` sebagai fondasi visual utama

### 5.2 Shell rebuild

- [x] Rombak `App.tsx` menjadi shell `sidebar + top bar + content canvas`.
- [x] Rombak `Sidebar.tsx` ke gaya dashboard gelap yang lebih modular.
- [x] Buat `TopBar/AppHeader` untuk desktop dan mobile.
- [x] Pastikan mobile memakai sheet/sidebar yang jelas, bukan hanya desktop yang digeser.

Definition of done:

- shell aplikasi nyaman dipakai di desktop dan ponsel tanpa terasa seperti dua UI yang ditempel

### 5.3 Shared component rebuild

- [x] Rebuild `PageHeader` dengan hierarchy gelap dan action area yang konsisten.
- [x] Rebuild `SectionCard` dengan varian:
  - default
  - metric
  - table
  - filter
- [x] Rebuild `SantriFilterBar` agar sesuai surface baru dan state filter aktif lebih jelas.
- [-] Tambahkan `StatCard` dan `DataTableShell` sebagai pattern resmi.

Definition of done:

- halaman berikutnya bisa dibangun dari komponen shared tanpa improvisasi visual lokal

### 5.4 Dashboard as reference screen

- [-] Jadikan `Dashboard.tsx` sebagai screen pertama yang selesai penuh.
- [-] Finalkan pattern:
  - tab analytics
  - metric cards
  - info panel
  - quick actions
  - loading state
- [-] Uji desktop dan mobile untuk dashboard sebelum rollout ke modul lain.

Definition of done:

- dashboard menjadi acuan visual yang bisa ditiru halaman lain

### 5.5 Rollout priority

- [-] Terapkan style baru ke:
  - `SantriList`
  - `StatusPembayaranView`
  - `UangSakuView`
  - `WhatsAppCenter`
  - `Asrama`
  - `Settings`
- [-] Pastikan tidak ada campuran white-card lama dan panel baru dalam satu halaman.

Definition of done:

- halaman prioritas konsisten satu sama lain dan konsisten terhadap dashboard

## Backlog Cepat

Task ini kecil, tapi dampaknya tinggi dan bisa dikerjakan paralel:

- [ ] Tambahkan filter `rombel` pada drawer mobile `SantriList`
- [ ] Tambahkan filter `rombel` dan `status santri` pada mobile `StatusPembayaranView`
- [ ] Tambahkan filter `status` pada `UangSakuView`
- [ ] Tambahkan filter `status` pada `WhatsAppCenter`
- [ ] Tampilkan kontrol `kelas` dan `rombel` yang sudah ada state-nya di `Asrama`
- [ ] Pisahkan mode “hanya santri aktif” vs “semua status” pada `SuratMenyurat`

## Prioritas Eksekusi (Update 1 Mei 2026)

### P0

- [-] `1.1` finalisasi validasi Tauri release offline + audit generator export yang masih menarik style dinamis.
- [x] `1.2` CSP release + mode build formal (`hybrid-preview`, `web-production`, `tauri-production`).
- [-] `1.3` checklist smoke test release + bukti verifikasi per rilis.

### P1

- [ ] `2.1` deploy dan verifikasi rules Firebase di project aktif.
- [x] `2.2` permission versioning + migrasi akun legacy.
- [x] `2.2` indikator audit user legacy yang belum termigrasi.

### P2

- [ ] `3.1` budget performa + baseline bundle.
- [ ] `3.2` audit vendor besar tersisa.
- [ ] `3.3` otomasi pelaporan ukuran chunk di CI.
- [ ] `4.2` sweep responsive hardening final untuk halaman tabel besar yang tersisa.

## Matriks Progres Halaman (Dashboard -> Tentang)

Tujuan bagian ini: menyelaraskan progres implementasi lapangan dengan checklist milestone yang lebih ketat.

Status:

- `Selesai`: perubahan UI/fungsi utama halaman sudah berjalan dan usable.
- `Sebagian`: sudah berubah, tetapi masih ada gap standardisasi/QA lintas layar/ekspor.
- `Belum`: belum disentuh signifikan atau masih dominan pola lama.

### Ringkasan Per Halaman

- `Dashboard`: **Sebagian** (navigasi dan kartu utama sudah ditata ulang; masih perlu finalisasi pattern dashboard sebagai acuan global).
- `Santri`: **Sebagian** (filter reusable, mobile card, bulk editor meningkat; masih perlu QA konsistensi final dan hardening edge-case).
- `Tahfizh`: **Sebagian** (penyesuaian UI berjalan; masih perlu penyelarasan penuh komponen shared dan mobile flow).
- `Absensi`: **Sebagian** (perbaikan mobile dan alur jurnal sudah dibenahi; butuh verifikasi regresi lintas skenario).
- `Kesehatan`: **Sebagian** (mobile spacing/list membaik; integrasi operasional ke absensi perlu verifikasi lanjut).
- `BK`: **Sebagian** (struktur dan visual membaik; perlu audit konsistensi terakhir).
- `Asrama`: **Sebagian** (filter dan UI utama sudah dibenahi; masih ada item filter/UX kecil yang perlu dirapikan).
- `Buku Tamu`: **Sebagian** (UI/fungsi sudah diaudit; masih perlu sweep konsistensi token/komponen).
- `PSB`: **Sebagian** (hybrid flow sudah hidup; masih ada stabilisasi export/preview/operasional multi skenario).
- `WhatsApp Center`: **Sebagian** (template CRUD dan penyederhanaan UX sudah masuk; perlu final pass untuk alur broadcast agar tidak ambigu).
- `Surat`: **Sebagian** (tab + modal sudah dibenahi; perlu final consistency pass).
- `Laporan`: **Sebagian** (banyak perbaikan export/print; masih ada kasus per modul yang butuh penyamaan engine output).
- `Akademik/Kurikulum/Rapor`: **Sebagian** (refactor berjalan; export layout dan UX mobile masih ada sisa tuning).
- `Perpustakaan`: **Sebagian** (arah UI sudah disesuaikan; perlu validasi penuh lintas layar).
- `Kalender`: **Sebagian** (integrasi pengaturan print dan tahun ajaran sudah dikerjakan; masih sensitif di beberapa kombinasi mode cetak).
- `Data Master`: **Sebagian** (fitur tahun ajaran dan tab data berkembang; perlu finalisasi konsistensi panduan + QA fungsional).
- `Keuangan`: **Sebagian** (tab prioritas sudah banyak dibenahi; masih perlu sweep tabel mobile model kartu di semua subtab tersisa).
- `Buku Kas`: **Sebagian** (struktur dan visual meningkat; masih perlu konsistensi export/report action di beberapa skenario).
- `Koperasi`: **Sebagian** (beberapa tab sudah dibenahi; masih perlu sweep 1 putaran penuh tab tersisa).
- `Sarpras`: **Sebagian** (tab/header/filter/action sudah dibenahi; export HTML/PDF/Word/Excel masih perlu diseragamkan tuntas).
- `Audit Log`: **Sebagian** (sudah diaudit; butuh final pass konsistensi UI dan filter UX).
- `Pusat Sync`: **Sebagian** (fungsi utama ada; perlu verifikasi role/boundary dan UX status sinkronisasi).
- `Pengaturan`: **Sebagian** (tab besar sudah pecah/lazy load; masih perlu final hardening permission, backup-restore report, dan QA multi-user).
- `Tentang`: **Sebagian** (navigasi dan konten sudah dibenahi; tinggal polishing konsistensi minor).

### Catatan Penting

- Secara implementasi harian, progres halaman **sudah besar**.
- Checklist milestone banyak yang masih `[-]/[ ]` karena menunggu:
  - standarisasi lintas semua halaman (bukan per halaman),
  - bukti verifikasi formal release/security,
  - penutupan task arsitektural (CSP/mode build/permission migration).

## Daftar Urgensi Lanjutan (Operasional)

### Urgensi 1 (P0) - wajib sebelum siklus rilis berikutnya

- [ ] Finalisasi `release hardening`: CSP Tauri + mode build formal + smoke test terdokumentasi.
- [ ] Selesaikan `single export engine policy` untuk modul yang masih beda hasil antara preview/print/html/pdf/word.
- [ ] Tutup gap UI yang berdampak operasional mobile (tabel yang belum usable, kontrol aksi berhimpit, overflow).

### Urgensi 2 (P1) - wajib sebelum ekspansi user/staff lebih luas

- [x] Permission versioning + migration untuk user lama.
- [x] Laporan hasil restore/migrasi (menampilkan apa yang sukses diupdate dan apa yang perlu tindak lanjut).
- [ ] Verifikasi nyata Firebase rules (invite/join/portal/pairing) di environment produksi.
  - Checklist siap: `docs/p1-firebase-boundary-verification.md`

### Urgensi 3 (P2) - stabilisasi kualitas jangka menengah

- [ ] Budget performa + baseline ukuran bundle/chunk.
- [ ] Audit vendor besar tersisa + keputusan optimasi lanjutan.
- [ ] Sweep akhir konsistensi komponen shared (`StatCard`, `DataTableShell`) di seluruh modul utama.

## Cara Pakai

1. pilih 1 subbagian kecil
2. turunkan jadi 1 PR
3. cantumkan verifikasi nyata
4. update status checklist setelah merge
