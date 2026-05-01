# UI Consistency And Santri Filter Audit

Dokumen ini berfungsi sebagai pegangan audit UI dan audit filter data santri lintas modul.

## Ringkasan

Secara umum, aplikasi ini sudah kaya fitur dan shell utamanya bekerja, tetapi pola UI berkembang per halaman tanpa sistem komponen yang cukup kuat. Dampaknya terasa di dua area:

- konsistensi visual dan perilaku desktop/mobile belum seragam
- filter data santri belum punya standar lintas modul

## Temuan Prioritas Tinggi

### 1. Filter santri belum distandardisasi lintas modul

`SantriList` sudah memakai hook bersama yang mendukung `search`, `jenjang`, `kelas`, `rombel`, `status`, `gender`, dan lokasi. Tetapi mayoritas modul lain masih menulis filter lokal sendiri-sendiri.

Contoh:

- `SantriList` memakai `useSantriFilter` di [components/SantriList.tsx](/home/abdullah-home/Documents/GitHub/eSantri-Web/components/SantriList.tsx)
- hook bersama ada di [hooks/useSantriFilter.ts](/home/abdullah-home/Documents/GitHub/eSantri-Web/hooks/useSantriFilter.ts)
- `WhatsAppCenter`, `SuratMenyurat`, `UangSakuView`, `StatusPembayaranView`, `Asrama`, `TahfizhInput`, dan `CheckoutModal` masih punya logika filter terpisah

Risiko:

- perilaku filter berbeda antar halaman tanpa alasan bisnis yang jelas
- bug filter harus diperbaiki berulang di banyak tempat
- user kesulitan membangun mental model yang konsisten

### 2. Beberapa modul penting belum memenuhi cakupan filter minimum santri

Target minimum audit ini adalah filter santri harus bisa mencakup:

- `jenjang/marhalah`
- `kelas`
- `rombel`
- `status`

Modul yang belum memenuhi:

- `WhatsAppCenter`: hanya `jenjang`, `kelas`, `rombel`; tidak ada `status`
- `UangSakuView`: ada `jenjang`, `kelas`, `rombel`, `gender`; tidak ada `status`
- `SuratMenyurat`: ada `jenjang`, `kelas`, `rombel`, tetapi data dipaksa `Aktif` tanpa kontrol status
- `Asrama` penempatan: state filter punya `kelas` dan `rombel`, tetapi UI hanya menampilkan `gender` dan `jenjang`
- `TahfizhInput`: filter eksplisit tidak punya kontrol `status`, walau data dipaksa `Aktif`
- `Koperasi CheckoutModal`: filter eksplisit tidak punya kontrol `status`, walau data dipaksa `Aktif`
- `PsbRekap`: konteksnya pendaftar, jadi memang hanya `jenjang`; ini bukan temuan untuk filter santri aktif

### 3. Mobile filter drawer dan desktop filter bar belum setara

Beberapa halaman punya drawer mobile yang tidak setara dengan filter desktop.

Contoh:

- `SantriList` desktop punya `status`, tetapi drawer mobile tidak punya `rombel`
- `StatusPembayaranView` desktop punya `rombel`, tetapi drawer mobile tidak punya `rombel` maupun `status santri`
- `UangSakuView` drawer mobile hanya menampilkan sebagian filter desktop

Risiko:

- hasil filter berbeda tergantung perangkat
- user mobile kehilangan kontrol penting yang tersedia di desktop

### 4. Shell aplikasi masih terasa desktop-first

Shell utama masih berbasis sidebar tetap dengan tombol hamburger melayang dan `main` yang hanya diberi `md:ml-64`.

Referensi:

- [App.tsx](/home/abdullah-home/Documents/GitHub/eSantri-Web/App.tsx)
- [components/Sidebar.tsx](/home/abdullah-home/Documents/GitHub/eSantri-Web/components/Sidebar.tsx)

Masalah yang muncul:

- tombol toggle mobile melayang di atas konten dan berpotensi menimpa header halaman
- tidak ada top app bar mobile yang konsisten
- tablet portrait berada di area transisi yang terasa sempit

## Temuan Prioritas Menengah

### 5. Pola header halaman tidak seragam

Sebagian halaman memakai header besar dan CTA rapi, sebagian lagi hanya `h2` sederhana di dalam card.

Contoh perbedaan:

- `SantriList` punya header halaman yang jelas
- `UangSakuView` langsung mulai dari judul card
- `StatusPembayaranView` memakai card utama sebagai shell halaman
- `WhatsAppCenter` memakai hero-style header yang berbeda sendiri

Akibatnya:

- perpindahan antar halaman terasa seperti pindah aplikasi
- hirarki visual tidak konsisten

### 6. Banyak tabel desktop belum punya pola mobile yang jelas

Beberapa halaman masih sangat tabel-sentris:

- `SantriList`
- `WhatsAppCenter`
- `StatusPembayaranView`
- `UangSakuView`
- banyak daftar di area keuangan dan admin

Sebagian masih aman karena ada scroll horizontal, tetapi belum berarti nyaman di ponsel.

### 7. Token visual belum stabil

Masih banyak variasi yang dipakai campur:

- radius: `rounded-lg`, `rounded-xl`, `rounded-2xl`, `rounded-[2rem]`
- shadow: `shadow-sm`, `shadow-md`, `shadow-lg`, `shadow-xl`
- heading scale dan berat font berbeda antar halaman
- warna aksi primer kadang `teal`, kadang `blue`, kadang `green` tanpa pola level aksi

### 8. Halaman mobile masih sering memakai fixed action bar ad hoc

Beberapa modul sudah bagus memakai pola tombol bawah, tetapi implementasinya belum konsisten.

Contoh:

- `TahfizhInput` punya action bar mobile bawah
- halaman lain tetap mengandalkan tombol di atas atau di dalam tabel

## Matriks Filter Santri

Keterangan:

- `Ya`: ada kontrol eksplisit atau cakupan nyata
- `Parsial`: sebagian ada, atau status dipaksa tanpa kontrol
- `Tidak`: tidak ada

| Modul | Jenjang | Kelas | Rombel | Status | Catatan |
| --- | --- | --- | --- | --- | --- |
| `SantriList` | Ya | Ya | Ya | Ya | paling lengkap, basis standar saat ini |
| `StatusPembayaranView` | Ya | Ya | Ya | Tidak | yang ada hanya `statusTunggakan`, bukan status santri |
| `UangSakuView` | Ya | Ya | Ya | Tidak | hanya `Aktif` dari logika data |
| `WhatsAppCenter` | Ya | Ya | Ya | Tidak | cocok untuk perluasan status wali/alumni |
| `SuratMenyurat` | Ya | Ya | Ya | Parsial | data dipaksa `Aktif`, tidak ada kontrol status |
| `Asrama` penempatan | Ya | Parsial | Parsial | Parsial | state ada, UI belum tampil penuh; data dipaksa `Aktif` |
| `TahfizhInput` | Ya | Ya | Ya | Parsial | data dipaksa `Aktif` |
| `TahfizhHistory` | Ya | Ya | Ya | Parsial | data dipaksa `Aktif` |
| `Koperasi CheckoutModal` | Ya | Ya | Ya | Parsial | data dipaksa `Aktif` |
| `Absensi` | Ya | Ya | Ya | Parsial | konteksnya memang santri aktif per rombel |
| `CetakPerpus` | Ya | Tidak | Tidak | Parsial | hanya aktif + jenjang |

## Modul Prioritas Untuk Standardisasi Filter

Urutan yang saya sarankan:

1. `SantriList`
2. `StatusPembayaranView`
3. `UangSakuView`
4. `WhatsAppCenter`
5. `SuratMenyurat`
6. `Asrama`

Alasannya:

- frekuensi pakai tinggi
- melibatkan operator harian
- paling terasa bedanya di desktop vs ponsel

## Rekomendasi UI

### Fase 1

Target: quick wins tanpa ganti arsitektur besar.

- buat komponen `FilterBar` dan `MobileFilterDrawer` yang benar-benar dipakai ulang
- samakan isi drawer mobile dengan desktop filter
- tambahkan filter `status` pada modul yang sudah memakai filter santri
- tambahkan `rombel` pada drawer mobile yang masih kurang
- tampilkan `kelas` dan `rombel` yang sudah ada state-nya di `Asrama`

### Fase 2

Target: konsistensi shell dan halaman inti.

- buat `PageHeader` standar untuk judul, subjudul, CTA, dan actions
- buat `SectionCard` standar untuk blok konten utama
- buat `DataTableShell` dengan mode desktop table dan mobile list/card
- rapikan top spacing dan sticky header halaman
- bentuk pola warna aksi yang konsisten

### Fase 3

Target: desain sistem ringan untuk pertumbuhan fitur.

- tetapkan token radius, shadow, border, heading, dan spacing
- audit ulang semua halaman utama:
  - `Santri`
  - `Keuangan`
  - `PSB`
  - `Settings`
  - `Reports`
- buat checklist review UI untuk PR

## Rekomendasi Teknis

- jadikan `hooks/useSantriFilter.ts` sebagai basis filter lintas modul, lalu pecah menjadi:
  - hook data/filter
  - komponen UI filter
- dukung mode:
  - `status optional`
  - `defaultStatus`
  - `allowGender`
  - `allowLocation`
- pisahkan antara:
  - filter dataset
  - preset bisnis seperti “hanya santri aktif”

Dengan begitu, halaman seperti `TahfizhInput` bisa tetap default ke `Aktif`, tetapi masih punya mekanisme yang konsisten jika nanti perlu melihat `Hiatus` atau `Lulus`.

## Definition Of Done Yang Disarankan

- filter santri inti di modul prioritas selalu punya `jenjang`, `kelas`, `rombel`, `status`
- drawer mobile dan filter desktop setara
- halaman utama punya pola header dan card shell yang konsisten
- tabel besar punya strategi mobile yang jelas
