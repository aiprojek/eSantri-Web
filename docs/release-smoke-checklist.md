# Release Smoke Checklist

Checklist ini dipakai sebelum menandai rilis desktop/web sebagai siap pakai.

## A. Build & Packaging

- [ ] `npm run lint` lolos tanpa error.
- [ ] `npm run build:web-production` berhasil.
- [ ] `npm run build:tauri-production` berhasil.
- [ ] Draft release GitHub Actions terbentuk dan artefak bundling ada.

## B. Auth & Session

- [ ] Login lokal berhasil (admin).
- [ ] Login Google berhasil (jika Firebase aktif).
- [ ] Logout/login ulang tetap membaca permission user yang benar.

## C. Sync & Pairing

- [ ] Invite tenant berhasil dibuat.
- [ ] Join tenant dari akun kedua berhasil.
- [ ] Sync upload/download tidak error.
- [ ] Portal publik hanya membaca path publik (`publicPortals`), bukan data tenant internal.

## D. Offline & Runtime

- [ ] Aplikasi tetap bisa dibuka ulang tanpa internet.
- [ ] CSS/JS utama tetap termuat tanpa CDN.
- [ ] Service worker tidak mengganggu request sinkronisasi cloud.

## E. Export/Print (P0)

- [ ] Preview vs cetak konsisten untuk modul Laporan.
- [ ] Preview vs cetak konsisten untuk Sarpras.
- [ ] Export HTML dan Word memuat konten yang sama dengan area preview.
- [ ] PDF visual tidak blank.

## Catatan Verifikasi

- Tanggal:
- Penguji:
- Versi build:
- Temuan:
