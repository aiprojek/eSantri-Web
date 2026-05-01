# Release Smoke Verification - 1 Mei 2026

Dokumen ini mencatat hasil verifikasi terbaru untuk hardening P0.

## Hasil Verifikasi Otomatis

- [x] `npm run lint` lulus.
- [x] `npm run build:web-production` lulus.
- [x] `npm run build:tauri-production` lulus.

## Hasil Verifikasi Konfigurasi

- [x] Mode build formal tersedia di script npm:
  - `hybrid-preview`
  - `web-production`
  - `tauri-production`
- [x] Tauri `beforeBuildCommand` sudah mengarah ke `build:tauri-production`.
- [x] CSP Tauri tidak lagi `null` (sudah explicit policy).

## Hasil Verifikasi Jalur Export/Print (Engine Policy)

- [x] Modul `Reports` memakai engine unified `exportUtils`.
- [x] Modul `Sarpras` memakai engine unified untuk `print/html/word`.
- [x] Modul `Jadwal Pelajaran` memakai engine unified untuk `print/html/word`.
- [x] Modul `Surat` memakai engine unified untuk `print/html/word`.

## Verifikasi Manual yang Masih Wajib (Perangkat Nyata)

- [ ] Uji installer desktop benar-benar offline penuh (tanpa request jaringan untuk UI inti).
- [ ] Uji smoke flow operasional:
  - login lokal
  - login Google
  - pairing
  - portal publik
  - offline cache
- [ ] Uji visual hasil export pada browser target operator (Chrome/Firefox) untuk 2-3 laporan paling kritikal.

## Referensi

- Checklist baku: [release-smoke-checklist.md](/home/abdullah-home/Documents/GitHub/eSantri-Web/docs/release-smoke-checklist.md)
