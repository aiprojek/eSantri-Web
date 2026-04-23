## Ringkasan

Jelaskan perubahan utama secara singkat:

- 

## Jenis Perubahan

Centang yang relevan:

- [ ] Bug fix
- [ ] Refactor
- [ ] Performa / bundle split
- [ ] Security / boundary hardening
- [ ] Cloud / sync
- [ ] Portal publik
- [ ] Release / build / Tauri
- [ ] Dokumentasi

## Checklist Review

### Boundary dan Permission

- [ ] Perubahan ini tidak mempercayai state sensitif mentah dari `localStorage`
- [ ] Tidak ada fallback permission `allow-by-default`
- [ ] Modul/fitur baru punya default permission eksplisit
- [ ] Entry point admin-only tetap tervalidasi konsisten

### Cloud dan Pairing

- [ ] Tidak ada path cloud baru yang mencampur data publik dan privat
- [ ] Pairing / membership baru tidak hanya bergantung pada `tenantId`
- [ ] Secret atau session sementara diperlakukan sebagai kredensial sensitif
- [ ] Perubahan sync mempertimbangkan konflik, replay, dan perangkat staff lama

### Runtime dan Build

- [ ] Perubahan ini tidak menambah ketergantungan CDN ke runtime utama
- [ ] Request non-`GET` tidak tertangkap service worker
- [ ] Jika menyentuh release desktop/Tauri, mode build dan CSP ikut diverifikasi
- [ ] Jika menambah dependency berat, pemuatan sudah dibuat lazy bila memungkinkan

### Portal Publik

- [ ] Portal publik hanya membaca data yang memang dirancang untuk publik
- [ ] Tidak ada metadata internal tenant yang ikut terekspos ke jalur publik

## Verifikasi

Tuliskan apa yang benar-benar dijalankan:

- [ ] `npm run lint`
- [ ] `npm run build`
- [ ] Uji manual login lokal
- [ ] Uji manual login Google
- [ ] Uji manual pairing
- [ ] Uji manual portal publik
- [ ] Uji manual offline/cache

Catatan hasil verifikasi:

- 

## Risiko Tersisa

Sebutkan risiko, gap test, atau hal yang sengaja ditunda:

- 

## Referensi

Jika perubahan ini mengikuti audit/roadmap, tautkan:

- [client-side-development-audit.md](/home/abdullah-home/Documents/GitHub/eSantri-Web/docs/client-side-development-audit.md)
- [development-milestones.md](/home/abdullah-home/Documents/GitHub/eSantri-Web/docs/development-milestones.md)
