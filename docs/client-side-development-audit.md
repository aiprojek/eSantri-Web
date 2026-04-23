# Client-Side Development Audit

Dokumen ini adalah pegangan pengembangan untuk eSantri Web dengan threat model yang sesuai arsitektur aplikasi saat ini:

- Aplikasi bersifat `local-first` dan `client-side owned`.
- Data utama berada di perangkat pengguna.
- Kredensial cloud dimiliki dan dikontrol pengguna aplikasi.
- Sinkronisasi cloud memakai pola hub-and-spoke tanpa backend sentral milik vendor.
- Multi-user lokal adalah fitur operasional di perangkat/browser yang dipercaya, bukan boundary keamanan setara SaaS zero-trust.

Dokumen ini sengaja membedakan:

- tradeoff yang memang valid dalam arsitektur sekarang,
- risiko yang tetap nyata walaupun aplikasi full client-side,
- prioritas implementasi untuk pengembangan berikutnya.

Dokumen pendamping:

- Checklist implementasi: [development-milestones.md](/home/abdullah-home/Documents/GitHub/eSantri-Web/docs/development-milestones.md)
- Template review PR: [.github/pull_request_template.md](/home/abdullah-home/Documents/GitHub/eSantri-Web/.github/pull_request_template.md)

## Prinsip Dasar

Saat menilai perubahan baru, gunakan prinsip ini:

1. Jangan menganggap semua hal harus dipindahkan ke backend.
2. Jangan menganggap fitur client-side otomatis aman hanya karena tidak ada server.
3. Jika aplikasi menjanjikan role, permission, pairing, atau tenant boundary, maka boundary itu tetap harus konsisten walaupun enforcement utamanya di klien.
4. Pisahkan dengan tegas antara:
   - `tradeoff operasional`,
   - `batas keamanan antar-user`,
   - `batas keamanan antar-organisasi/tenant`,
   - `keandalan sync dan rilisan`.

## Keputusan Arsitektur Yang Diterima

Hal-hal berikut dianggap sah dan tidak perlu "diperbaiki" hanya karena berbeda dari pola SaaS:

- Penyimpanan kredensial cloud di sisi klien.
- Penggunaan Dexie/IndexedDB sebagai source of truth lokal.
- Backup penuh dalam bentuk JSON yang bisa diunduh pengguna.
- Sync langsung dari browser ke Dropbox, WebDAV, atau Firebase.
- Session login lokal yang dirancang untuk perangkat milik operator sendiri.

Konsekuensinya:

- Dokumentasi harus jujur menjelaskan bahwa keamanan perangkat/browser menjadi tanggung jawab operator.
- Fitur yang sensitif harus diberi label yang jelas: aman untuk perangkat pribadi/terkontrol, bukan untuk shared computer yang hostile.

## Batas Yang Harus Tetap Dijaga

Walaupun aplikasi client-side, area berikut tetap harus diperlakukan sebagai boundary nyata.

### 1. Boundary Antar-User Lokal

Jika aplikasi mengaktifkan `multiUserMode`, maka:

- user biasa tidak boleh bisa naik menjadi admin hanya dengan mengedit state klien,
- modul yang tidak diberi izin tidak boleh otomatis terbuka,
- session harus diverifikasi ke data user lokal yang aktual, bukan dipercaya mentah dari `localStorage`.

Implikasi desain:

- `localStorage` boleh dipakai untuk persistensi sesi, tetapi isinya tidak boleh dianggap sebagai sumber kebenaran final.
- Saat app start, session perlu direkonsiliasi dengan tabel `users` di Dexie.
- Jika user tidak ditemukan atau fingerprint sesi tidak valid, paksa logout.

### 2. Boundary Antar-Tenant Cloud

Untuk mode Firebase, tenant boundary adalah boundary antar-organisasi. Karena itu:

- proses join tenant tidak boleh cukup dengan mengetahui `tenantId`,
- membership tenant harus memiliki bukti otorisasi tambahan,
- data portal publik harus dipisahkan dari data internal tenant.

Implikasi desain:

- pairing code harus dianggap sebagai secret sementara, bukan sekadar ID target,
- rules Firestore harus memisahkan dokumen publik dan dokumen privat,
- flow portal publik jangan bergantung pada path tenant internal yang sama dengan data operasional.

### 3. Boundary Rilisan Desktop/Offline

Untuk rilisan Tauri atau mode "100% offline":

- aset build tidak boleh bergantung pada CDN runtime,
- CSP tidak boleh dibiarkan `null` tanpa alasan kuat,
- service worker tidak boleh mengganggu traffic sync dinamis.

Implikasi desain:

- mode hybrid dan mode release harus benar-benar terpisah,
- pipeline release harus memaksa mode aset lokal,
- caching harus dibatasi ke aset statis dan request `GET`.

## Temuan Prioritas

### Quick Wins

Perbaikan kecil-menengah yang dampaknya tinggi dan bisa dilakukan tanpa mengubah arsitektur dasar.

1. Ubah fallback permission menjadi `deny-by-default`.
   Status: selesai.
2. Saat boot aplikasi, validasi `currentUser` dari `localStorage` terhadap Dexie `users`.
   Status: selesai.
3. Pisahkan data portal publik dari dokumen tenant internal.
   Status: selesai.
4. Batasi service worker hanya untuk request `GET` dan origin statis yang dikenal.
   Status: selesai.
5. Tambahkan guard build/release agar mode Tauri tidak memakai CDN.
   Status: sebagian selesai. Runtime web utama sudah lokal; hardening release Tauri masih perlu divalidasi end-to-end.

### Medium Fixes

Perbaikan yang butuh refactor terbatas tapi masih kompatibel dengan model client-side.

1. Buat format sesi lokal yang menyimpan `userId`, `issuedAt`, dan `sessionVersion`, lalu verifikasi ke record user saat startup.
   Status: sebagian selesai. Session sudah direkonsiliasi ke Dexie; format sesi masih bisa diperkuat lagi.
2. Tambahkan versioning permission agar akun lama tidak otomatis mendapat akses ke modul baru.
   Status: belum.
3. Desain ulang pairing Firebase agar membership memakai kode pairing yang berubah, terbatas waktu, dan diverifikasi oleh rule/data pairing khusus.
   Status: selesai untuk flow dasar invite/join tenant.
4. Pisahkan struktur Firestore menjadi:
   - data publik portal,
   - metadata pairing,
   - data internal tenant.
     Status: selesai untuk pemisahan runtime dan path publik utama.
5. Buat mode build eksplisit:
   - `hybrid-preview`,
   - `web-production`,
   - `tauri-production`.
     Status: belum tuntas sebagai mode formal build script, walau perilaku runtime utama sudah mengarah ke sini.

### Hard Problems

Area yang memang sulit bila tetap mempertahankan arsitektur full client-side.

1. Mencegah operator yang benar-benar menguasai browser/device dari memanipulasi data lokal sepenuhnya.
2. Menyediakan security boundary yang setara server-authoritative tanpa backend sentral.
3. Menjaga kerahasiaan penuh secret cloud di lingkungan browser.

Untuk area ini, target realistisnya adalah:

- menaikkan biaya serangan,
- memperjelas asumsi trust,
- mengurangi kerusakan operasional,
- bukan menjanjikan keamanan absolut.

## Status Implementasi Saat Ini

Berikut ringkasan perubahan penting yang sudah masuk ke kode setelah audit awal ini dibuat.

### Boundary Lokal dan Permission

- Session lokal tidak lagi dipercaya mentah dari `localStorage`; startup sekarang merekonsiliasi sesi ke Dexie `users`.
- Fallback permission sudah diubah ke `deny-by-default`, sehingga modul baru tidak otomatis terbuka ke role lama.
- Mode multi-user lokal sekarang lebih konsisten sebagai boundary operasional, walau belum server-authoritative.

### Runtime Lokal dan Offline

- Runtime utama sudah dipindah ke aset lokal; ketergantungan CDN inti untuk aplikasi utama sudah dihapus.
- Service worker dibatasi untuk aset lokal dan request aman, serta tidak lagi aktif mengganggu mode dev.
- Jalur HTML standalone yang penting sudah dibersihkan dari CDN dan memakai stylesheet lokal aplikasi.

### Firebase Boundary dan Struktur Runtime

- Pairing Firebase sudah dipisah ke runtime khusus dan memakai invite flow, bukan sekadar join by `tenantId`.
- Portal publik sudah dipisah ke koleksi publik khusus dan tidak lagi membaca dokumen tenant internal secara langsung.
- Runtime Firebase sekarang dipisah menjadi:
  - app init,
  - auth,
  - firestore lite,
  - storage,
  - pairing runtime,
  - portal runtime,
  - realtime runtime.

Implikasinya:

- mode portal publik dan pairing tidak lagi ikut menarik Firestore penuh,
- auth Firebase tidak lagi menjadi ketergantungan helper umum,
- startup path untuk user non-Firebase menjadi lebih ringan dan lebih jelas boundary-nya.

### Pemecahan Chunk dan Lazy Loading

Optimasi bundling yang sudah masuk:

- library berat `xlsx`, `jspdf`, `jspdf-autotable`, `html2canvas`, `jszip`, dan sync cloud sudah lazy-load per fitur,
- `Dashboard`, `Reports`, `Akademik`, `Settings`, dan `PSB` sudah dipecah per tab/subfitur,
- `TabCloud` sudah dipecah per provider dan per panel,
- `PsbRekap` sudah dipisah dari modal edit tunggal dan bulk editor,
- upload dokumen PSB admin sekarang runtime on-demand.

Hasil praktisnya:

- entry utama tetap kecil, sekitar `92 kB`,
- area cloud/Firebase tidak lagi membebani jalur startup umum,
- biaya fitur besar bergeser ke saat fitur itu benar-benar dipakai.

### Sisa Risiko yang Masih Relevan

- `vendor-firebase-auth`, `vendor-firebase-firestore`, `vendor-xlsx`, `vendor-jspdf`, dan `vendor-charts` tetap besar secara absolut.
- Ukuran vendor besar itu sekarang lebih terkendali karena sudah keluar dari startup path, tetapi belum hilang.
- Release mode desktop/Tauri masih perlu validasi akhir untuk memastikan CSP, asset mode, dan workflow benar-benar sejalan dengan target offline penuh.
- Versioning permission dan migrasi role lama masih belum ada.

## Aturan Pengembangan Berikutnya

Setiap perubahan baru sebaiknya dicek terhadap aturan berikut.

### Auth dan Permission

- Jangan pernah percaya penuh pada objek user dari `localStorage`.
- Jangan gunakan fallback `true` saat key permission tidak ditemukan.
- Modul baru wajib menentukan default permission eksplisit untuk semua role template.
- Fitur admin-only harus punya validasi yang konsisten di semua entry point UI.

### Sync dan Pairing

- Pairing code harus diperlakukan sebagai kredensial sementara.
- Jangan campur data publik dan data internal tenant dalam path yang sama.
- Jangan tambahkan rule cloud yang `allow write if isAuthenticated()` untuk resource membership tanpa pembatas tambahan.
- Semua perubahan sync baru harus diuji terhadap konflik, replay, dan perangkat staff yang tertinggal versinya.

### Build dan Release

- Jangan rilis desktop app yang masih mengambil CSS/JS inti dari CDN.
- Jangan ubah workflow release tanpa memverifikasi mode build yang benar-benar dipakai Tauri.
- CSP yang longgar harus dianggap pengecualian sementara, bukan default permanen.

### Service Worker

- Cache hanya aset statis.
- Jangan cache request `POST`, request sync cloud, atau response yang mengandung data sensitif.
- Setiap penambahan resource baru harus jelas apakah layak di-precache atau cukup runtime fetch.

### Portal Publik

- Portal publik hanya boleh membaca data yang memang dirancang untuk publik.
- Konfigurasi publik harus ditulis ke koleksi/dokumen publik khusus.
- Jangan biarkan portal membaca dokumen yang juga membawa konfigurasi internal sync atau metadata sensitif.

## Backlog Rekomendasi

Berikut urutan backlog yang direkomendasikan.

### Fase 1

- Validasi release desktop/Tauri dengan aset lokal penuh dan CSP yang tegas.
- Rapikan mode build formal:
  - `hybrid-preview`,
  - `web-production`,
  - `tauri-production`.
- Uji smoke flow lokal:
  - login lokal,
  - login Google,
  - pairing,
  - portal publik,
  - offline cache.

### Fase 2

- Tambahkan versioning permission dan migration untuk role lama.
- Audit vendor besar yang tersisa:
  - `vendor-firebase-auth`,
  - `vendor-firebase-firestore`,
  - `vendor-xlsx`,
  - `vendor-jspdf`,
  - `vendor-charts`.
- Evaluasi area yang masih layak dipecah secara action-based, bukan page-based.

### Fase 3

- Tambahkan dokumentasi model kepercayaan perangkat.
- Tambahkan checklist release security untuk Tauri/web.
- Tambahkan pengujian smoke untuk login, sync, portal, dan build mode.

## Prioritas Berikutnya Yang Disarankan

Setelah rangkaian refactor ini, urutan kerja yang paling masuk akal bukan lagi memecah UI kecil-kecil, tetapi:

1. Finalisasi jalur release desktop/offline.
2. Tambahkan permission versioning dan migrasi role.
3. Verifikasi rule dan deploy Firebase di environment nyata.
4. Baru setelah itu evaluasi apakah vendor besar tertentu layak dikecilkan lebih jauh.

## Checklist Review Untuk PR Berikutnya

Gunakan checklist ini saat mereview fitur baru:

- Apakah fitur baru memperluas akses role tertentu tanpa default permission eksplisit?
- Apakah ada state sensitif baru yang dipercaya mentah dari `localStorage`?
- Apakah ada endpoint cloud/path Firestore baru yang mencampur data publik dan privat?
- Apakah ada request non-GET yang bisa tertangkap service worker?
- Apakah fitur baru tetap jalan pada mode offline/release tanpa CDN?
- Apakah perubahan ini menambah asumsi trust baru yang belum didokumentasikan?

## Referensi Repo Saat Audit Ini Dibuat

Area penting yang menjadi dasar audit ini:

- `contexts/AuthContext.tsx`
- `App.tsx`
- `contexts/FirebaseContext.tsx`
- `services/firebaseSyncService.ts`
- `services/syncService.ts`
- `contexts/SettingsContext.tsx`
- `components/portal/PublicPortal.tsx`
- `firestore.rules`
- `sw.js`
- `index.html`
- `index.tsx`
- `.github/workflows/release.yml`
- `src-tauri/tauri.conf.json`

Area tambahan yang sekarang juga penting karena refactor lanjutan:

- `firebaseApp.ts`
- `firebaseAuth.ts`
- `firebaseLite.ts`
- `firebaseStorage.ts`
- `firebaseErrors.ts`
- `utils/lazyFirebaseRuntimes.ts`
- `services/firebasePairingRuntime.ts`
- `services/firebasePortalRuntime.ts`
- `services/firebaseRealtimeRuntime.ts`
- `services/firebasePsbUploadRuntime.ts`
- `components/settings/cloud/`

## Ringkasan Praktis

eSantri Web tidak perlu diubah menjadi SaaS untuk menjadi lebih baik. Fokus yang tepat adalah:

- pertahankan local-first,
- perjelas trust boundary,
- keras pada tenant boundary,
- lebih disiplin pada mode release,
- dan perlakukan multi-user lokal sebagai boundary operasional yang tetap harus konsisten.
