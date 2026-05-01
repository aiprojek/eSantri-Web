# Development Milestones

Dokumen ini menurunkan [client-side-development-audit.md](/home/abdullah-home/Documents/GitHub/eSantri-Web/docs/client-side-development-audit.md) menjadi checklist kerja yang bisa dipakai untuk eksekusi roadmap.

Dokumen pendamping:

- [milestone-task-breakdown.md](/home/abdullah-home/Documents/GitHub/eSantri-Web/docs/milestone-task-breakdown.md)
- [ui-consistency-and-santri-filter-audit.md](/home/abdullah-home/Documents/GitHub/eSantri-Web/docs/ui-consistency-and-santri-filter-audit.md)
- [ui/ui-migration-baseline.md](/home/abdullah-home/Documents/GitHub/eSantri-Web/docs/ui/ui-migration-baseline.md)
- [psb-hybrid-operational-guide.md](/home/abdullah-home/Documents/GitHub/eSantri-Web/docs/psb-hybrid-operational-guide.md)

Status yang dipakai:

- `[ ]` belum dikerjakan
- `[-]` sedang berjalan / sebagian selesai
- `[x]` selesai

## Milestone 1

Fokus: stabilitas runtime lokal, boundary dasar, dan validasi release desktop/offline.

- [x] Rekonsiliasi sesi login lokal dengan tabel `users`.
- [x] Ubah permission fallback ke `deny-by-default`.
- [x] Batasi service worker ke request aman dan aset lokal.
- [x] Hapus ketergantungan CDN dari runtime utama aplikasi web.
- [-] Validasi release desktop/Tauri dengan aset lokal penuh.
- [x] Tegaskan CSP release desktop agar tidak lagi longgar secara default.
- [x] Pisahkan mode build formal:
  - `hybrid-preview`
  - `web-production`
  - `tauri-production`
- [-] Uji smoke flow:
  - login lokal
  - login Google
  - pairing
  - portal publik
  - offline cache

Definition of done:

- build web dan desktop memakai aset lokal
- tidak ada CDN inti di runtime release
- smoke test minimal dijalankan dan terdokumentasi

## Milestone 2

Fokus: boundary tenant cloud, pairing, dan konsistensi permission.

- [x] Pisahkan data portal publik dari data tenant internal.
- [x] Pisahkan runtime Firebase:
  - auth
  - firestore lite
  - storage
  - pairing
  - portal
  - realtime sync
- [x] Rework pairing Firebase ke invite-based flow.
- [ ] Deploy dan verifikasi `firestore.rules` terbaru di environment nyata.
- [x] Tambahkan versioning permission untuk role.
- [x] Tambahkan migration permission untuk akun lama.
- [-] Tambahkan test/cek manual untuk:
  - invite tenant
  - join tenant
  - akses portal publik
  - staff pairing dari perangkat baru
  - Template verifikasi disiapkan: `docs/p1-firebase-boundary-verification.md`

Definition of done:

- pairing tenant tidak bisa dilakukan hanya dengan mengetahui `tenantId`
- role lama tidak otomatis mendapat akses modul baru
- portal publik membaca data dari path publik khusus

## Milestone 3

Fokus: optimasi performa feature loading dan isolasi runtime berat.

- [x] Lazy-load library berat:
  - `xlsx`
  - `jspdf`
  - `jspdf-autotable`
  - `html2canvas`
  - `jszip`
- [x] Lazy-load jalur sync/cloud utama.
- [x] Pecah `Settings` per tab.
- [x] Pecah `PSB` per subfitur.
- [x] Pecah `TabCloud` per provider dan panel.
- [x] Pecah `PsbRekap` dari modal berat.
- [x] Ubah upload dokumen PSB admin menjadi runtime on-demand.
- [ ] Review vendor besar yang tersisa:
  - `vendor-firebase-auth`
  - `vendor-firebase-firestore`
  - `vendor-xlsx`
  - `vendor-jspdf`
  - `vendor-charts`
- [ ] Tentukan target performa internal:
  - entry utama
  - page shell `Settings`
  - page shell `PSB`
  - first-load `cloud`

Definition of done:

- fitur berat hanya dimuat saat diperlukan
- vendor besar yang tersisa punya alasan keberadaan yang jelas
- ada target ukuran bundle yang dipantau tim

## Milestone 4

Fokus: penguatan proses engineering dan release hygiene.

- [ ] Tambahkan checklist release security untuk web/Tauri.
- [ ] Tambahkan checklist review PR berbasis audit ke proses tim.
- [ ] Tambahkan dokumentasi model trust perangkat/operator.
- [ ] Tambahkan catatan arsitektur:
  - apa yang dianggap tradeoff valid
  - apa yang dianggap boundary nyata
  - apa yang tidak dijanjikan arsitektur client-side
- [ ] Tambahkan dokumen verifikasi manual pasca-release.

Definition of done:

- reviewer punya checklist tetap
- release punya langkah verifikasi yang berulang
- dokumentasi menjelaskan batas keamanan secara jujur

## Milestone 5

Fokus: reset fondasi visual dan migrasi UI berdasarkan design guide dashboard.

- [x] Tetapkan fondasi token global untuk app background, surface, panel, border, text, dan accent.
- [x] Extend Tailwind dengan semantic color, font, radius, dan shadow yang mengikuti guide.
- [x] Rombak shell utama:
  - sidebar
  - top bar
  - content canvas
- [-] Bangun ulang komponen shared:
  - `PageHeader`
  - `SectionCard`
  - `SantriFilterBar`
  - `StatCard`
  - `DataTableShell`
- [-] Jadikan dashboard sebagai halaman acuan design system baru.
- [-] Setelah dashboard matang, rollout ke modul prioritas:
  - `Santri`
  - `Keuangan`
  - `WhatsApp Center`
  - `Asrama`
  - `PSB`
  - `Settings`

Definition of done:

- shell aplikasi mengikuti hierarchy surface yang konsisten
- desktop dan mobile memakai pola interaksi yang sama jelasnya
- halaman prioritas tidak lagi mencampur gaya terang lama dan style dashboard baru

## Backlog Lanjutan

Area ini bernilai, tetapi bukan prioritas sebelum milestone di atas stabil:

- [ ] evaluasi apakah `firebase-auth` bisa dipersempit lagi dari sisi flow UX
- [ ] evaluasi apakah `vendor-charts` perlu dibatasi ke area analitik tertentu
- [ ] evaluasi apakah sebagian operasi Firebase realtime perlu Firestore penuh di semua skenario
- [ ] buat pengukuran bundle otomatis di CI

## Prioritas Eksekusi (Update 1 Mei 2026)

### P0 (harus diselesaikan dulu)

- [ ] Validasi release desktop/Tauri offline penuh + verifikasi aset lokal end-to-end.
- [ ] Tegaskan CSP release desktop di `src-tauri/tauri.conf.json`.
- [ ] Tetapkan mode build formal `hybrid-preview`, `web-production`, `tauri-production` dan pastikan workflow release memakainya.
- [ ] Uji smoke flow rilis dan simpan buktinya:
  - login lokal
  - login Google
  - pairing
  - portal publik
  - offline cache

### P1 (berikutnya, boundary dan reliability)

- [ ] Deploy + verifikasi `firestore.rules` di environment Firebase nyata.
- [x] Tambahkan `permissionVersion` + migration permission akun lama.
- [-] Tambahkan verifikasi/manual test untuk `invite -> join tenant`, `portal publik`, dan pairing staff device baru.
  - Template verifikasi: `docs/p1-firebase-boundary-verification.md`
- [x] Tambahkan laporan hasil restore/migration (apa yang terupdate dan apa yang butuh tindak lanjut).

### P2 (stabilisasi jangka menengah)

- [ ] Tetapkan budget performa internal dan baseline ukuran bundle.
- [ ] Audit vendor besar tersisa (`firebase-auth`, `firestore`, `xlsx`, `jspdf`, `charts`) berdasarkan data build.
- [ ] Tambahkan pengukuran ukuran chunk otomatis di CI.
- [ ] Finalisasi konsistensi visual lintas halaman yang belum selesai migrasi penuh.

## Cara Pakai

Untuk setiap milestone:

1. buat issue/PR kecil per item
2. update status checklist saat merge
3. catat verifikasi yang benar-benar dijalankan
4. jangan tandai selesai jika baru refactor kode tanpa verifikasi perilaku
