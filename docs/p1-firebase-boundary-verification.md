# P1 Firebase Boundary Verification

Dokumen ini dipakai untuk menutup item P1 yang butuh verifikasi environment nyata Firebase:

- deploy `firestore.rules`
- uji alur `invite -> join tenant`
- uji boundary `portal publik`
- uji pairing staff di perangkat baru

## 1) Persiapan

Prasyarat:

- project Firebase produksi/staging sudah aktif
- akun owner tenant dan akun staff penguji tersedia
- CLI Firebase login (`firebase login`) pada mesin penguji

Perintah deploy rules:

```bash
firebase deploy --only firestore:rules
```

Catat:

- Project ID:
- Waktu deploy:
- Commit hash:

## 2) Checklist Verifikasi

### A. Invite -> Join Tenant

1. Owner membuat invite dari aplikasi.
2. Staff join menggunakan invite valid.
3. Staff hanya mendapat akses tenant yang diundang.
4. Invite kadaluarsa ditolak.

Status:

- [ ] Lulus
- [ ] Gagal

Catatan:

### B. Portal Publik Boundary

1. Buka portal publik tanpa login.
2. Pastikan data yang tampil hanya dari path `publicPortals/{tenantId}`.
3. Pastikan data internal tenant tidak bisa terbaca publik.

Status:

- [ ] Lulus
- [ ] Gagal

Catatan:

### C. Pairing Staff Perangkat Baru

1. Staff login di perangkat baru.
2. Lakukan pairing/sync sesuai flow aplikasi.
3. Pastikan data yang tersinkron mengikuti role/permission staff.
4. Pastikan staff tidak bisa mengakses path tenant lain.

Status:

- [ ] Lulus
- [ ] Gagal

Catatan:

## 3) Bukti Uji Minimal

- Screenshot invite berhasil dibuat
- Screenshot join staff berhasil
- Screenshot akses ditolak untuk data tenant lain (jika diuji)
- Screenshot portal publik
- Potongan log error jika ada kegagalan

## 4) Ringkasan Hasil

- Verifikasi tanggal:
- Penguji:
- Hasil akhir:
  - [ ] Siap tutup P1
  - [ ] Perlu perbaikan lanjutan

