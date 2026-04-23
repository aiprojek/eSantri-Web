# Development Milestones

Dokumen ini menurunkan [client-side-development-audit.md](/home/abdullah-home/Documents/GitHub/eSantri-Web/docs/client-side-development-audit.md) menjadi checklist kerja yang bisa dipakai untuk eksekusi roadmap.

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
- [ ] Tegaskan CSP release desktop agar tidak lagi longgar secara default.
- [ ] Pisahkan mode build formal:
  - `hybrid-preview`
  - `web-production`
  - `tauri-production`
- [ ] Uji smoke flow:
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
- [ ] Tambahkan versioning permission untuk role.
- [ ] Tambahkan migration permission untuk akun lama.
- [ ] Tambahkan test/cek manual untuk:
  - invite tenant
  - join tenant
  - akses portal publik
  - staff pairing dari perangkat baru

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

## Backlog Lanjutan

Area ini bernilai, tetapi bukan prioritas sebelum milestone di atas stabil:

- [ ] evaluasi apakah `firebase-auth` bisa dipersempit lagi dari sisi flow UX
- [ ] evaluasi apakah `vendor-charts` perlu dibatasi ke area analitik tertentu
- [ ] evaluasi apakah sebagian operasi Firebase realtime perlu Firestore penuh di semua skenario
- [ ] buat pengukuran bundle otomatis di CI

## Cara Pakai

Untuk setiap milestone:

1. buat issue/PR kecil per item
2. update status checklist saat merge
3. catat verifikasi yang benar-benar dijalankan
4. jangan tandai selesai jika baru refactor kode tanpa verifikasi perilaku
