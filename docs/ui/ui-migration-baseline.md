# UI Migration Baseline

## Context and Goals

Dokumen ini menjadi baseline migrasi UI eSantri Web setelah evaluasi bahwa refaktor UI sebelumnya belum mengikuti arah visual yang diinginkan. Pegangan utama desain adalah [dashboard-ui.md](/home/abdullah-home/Documents/GitHub/eSantri-Web/docs/ui/dashboard-ui.md).

Tujuan migrasi:

- menyatukan bahasa visual aplikasi ke arah `cloud-platform dashboard`
- memperbaiki konsistensi desktop dan mobile tanpa kehilangan kepadatan informasi
- mengurangi campuran gaya lama `white card + teal utility app`
- membangun fondasi token dan komponen inti sebelum merombak halaman satu per satu

Catatan brand:

- eSantri tetap memakai identitas warna utama `putih + teal`
- `dashboard-ui.md` dipakai sebagai referensi struktur, hirarki, modularitas, dan konsistensi komponen
- referensi itu tidak boleh diterjemahkan mentah sebagai dark theme penuh untuk eSantri

## Design Intent

eSantri harus terasa seperti dashboard operasional modern yang padat data, bersih, tegas, dan nyaman dipakai lama di desktop maupun ponsel, dengan identitas visual tetap terang dan berbasis teal.

## Current Gap Summary

### Foundation Gaps

- [index.css](/home/abdullah-home/Documents/GitHub/eSantri-Web/index.css) hampir belum punya fondasi visual selain Tailwind base dan scrollbar terang.
- [tailwind.config.js](/home/abdullah-home/Documents/GitHub/eSantri-Web/tailwind.config.js) belum mendefinisikan token warna, tipografi, radius, shadow, atau semantic surface.
- aplikasi masih dominan `bg-white`, `text-gray-*`, dan `teal-*`, tetapi belum ditata sebagai semantic design system yang konsisten.

### Shell Gaps

- [App.tsx](/home/abdullah-home/Documents/GitHub/eSantri-Web/App.tsx) masih memakai shell utilitarian standar tanpa top bar terpadu.
- [Sidebar.tsx](/home/abdullah-home/Documents/GitHub/eSantri-Web/components/Sidebar.tsx) masih bergaya sidebar hijau solid dengan hierarki visual lama.
- mobile behavior masih berangkat dari paradigma desktop dengan sidebar geser, bukan shell responsif yang dirancang sejak awal.

### Dashboard Gaps

- [Dashboard.tsx](/home/abdullah-home/Documents/GitHub/eSantri-Web/components/Dashboard.tsx) masih sangat `white card analytics`.
- kartu statistik, aksi cepat, dan informasi pondok belum mengikuti anatomi panel modular dengan surface bertingkat versi brand terang eSantri.
- tab `Ikhtisar` dan `Analitik` belum memakai token/tab pattern yang konsisten dengan arah cloud dashboard versi eSantri.

### Shared Component Gaps

- [PageHeader.tsx](/home/abdullah-home/Documents/GitHub/eSantri-Web/components/common/PageHeader.tsx) dan [SectionCard.tsx](/home/abdullah-home/Documents/GitHub/eSantri-Web/components/common/SectionCard.tsx) berguna secara struktur, tetapi visualnya masih gaya terang dan belum layak dijadikan fondasi akhir.
- [SantriFilterBar.tsx](/home/abdullah-home/Documents/GitHub/eSantri-Web/components/common/SantriFilterBar.tsx) membantu konsistensi fitur, tetapi styling-nya belum sejalan dengan design system target.

## Non-Negotiable Foundations

Migrasi berikutnya harus dimulai dari fondasi ini, bukan langsung mempercantik halaman.

### Tokens

- warna harus memakai semantic tokens, bukan raw `teal-*` atau `gray-*` langsung di komponen utama
- minimal token awal:
  - `--bg-app`
  - `--bg-app-subtle`
  - `--bg-surface`
  - `--bg-surface-elevated`
  - `--bg-panel`
  - `--border-subtle`
  - `--border-strong`
  - `--text-primary`
  - `--text-secondary`
  - `--text-muted`
  - `--accent-primary`
  - `--accent-primary-hover`
  - `--success`
  - `--warning`
  - `--danger`
  - `--focus-ring`

Default arah warna:

- background utama tetap terang atau off-white
- teal tetap menjadi warna brand primer untuk aksi utama, highlight, state aktif, dan identitas sistem
- navy atau dark ink boleh dipakai sebagai teks kuat atau permukaan sekunder, bukan identitas utama seluruh layar

### Typography

- IBM Plex Sans harus menjadi font utama aplikasi
- skala teks dasar mengikuti panduan:
  - 12 untuk label/meta
  - 14 untuk form/table secondary text
  - 16 untuk body utama
  - 20 untuk section heading
  - 24 untuk page heading
  - 32 untuk hero metric tertentu

### Spacing

- semua shell dan komponen inti harus kembali ke ritme 8pt
- padding acak seperti `p-5`, `p-6`, `rounded-2xl` tetap boleh dipakai, tapi harus dinormalisasi ke aturan komponen, bukan improvisasi lokal

### Motion

- animasi hanya dipakai untuk state change, drawer, tab, dan feedback
- tidak boleh ada motion dekoratif yang tidak menambah kejelasan
- harus menghormati `prefers-reduced-motion`

## Target Component Model

### App Shell

- layout utama harus terdiri dari `sidebar + top bar + content canvas`
- desktop:
  - sidebar tetap, boleh sedikit lebih padat dari canvas tetapi masih satu keluarga dengan brand terang eSantri
  - top bar memuat judul konteks, pencarian global bila relevan, dan utilitas akun/sync
- mobile:
  - top bar wajib jadi titik masuk utama
  - sidebar berubah menjadi sheet yang jelas dan aman disentuh

### Surface Hierarchy

Harus ada 4 level permukaan yang konsisten:

- `app background`
- `sidebar/background rail`
- `content surface`
- `elevated panel/card`

Setiap level harus bisa dibedakan lewat kombinasi warna, border, dan shadow halus, bukan hanya warna acak. Pada eSantri, hirarki ini tetap harus terasa terang, bersih, dan tidak berubah menjadi tema gelap penuh.

### Page Header

Header halaman berikutnya harus:

- menampilkan title, deskripsi singkat, dan area aksi
- mendukung mode `single column` di mobile
- boleh memakai aksen teal, tetapi dengan aturan yang konsisten
- memakai hierarchy terang yang tegas dengan meta text lembut

### Section Card

Card berikutnya harus:

- mendukung mode `default`, `metric`, `table`, dan `filter`
- memakai surface terang atau off-white berlapis, border halus, dan shadow lembut
- header card harus konsisten untuk title, description, actions

### Filters

Filter santri tetap dipertahankan sebagai komponen reusable, tetapi tampilannya harus berubah menjadi:

- filter bar ringkas di desktop
- sheet/drawer yang lebih rapi di mobile
- field, select, dan reset action memakai ukuran sentuh minimum 44px
- status aktif filter harus terlihat jelas
- palette default tetap putih dengan aksen teal, bukan drawer gelap penuh

## Accessibility Requirements

Setiap tahap migrasi UI harus lolos kriteria ini:

- contrast minimum WCAG 2.2 AA
- semua tombol, tab, select, dan input memiliki `focus-visible` yang tegas
- target sentuh minimal 44px pada mobile
- urutan tab keyboard logis
- icon-only button harus punya label aksesibel
- drawer dan modal harus trap focus dan bisa ditutup dengan `Esc`
- skeleton/loading/error state harus terbaca dan konsisten

## Migration Strategy

### Phase 1: Foundation Reset

- tambahkan token global di `index.css`
- extend `tailwind.config.js` dengan semantic colors, font family, radius, shadow
- tetapkan class utilitas dasar untuk canvas, surface, panel, border, dan text
- pastikan token baru memelihara identitas `putih + teal`

### Phase 2: Shell Rebuild

- rombak `Sidebar.tsx`
- tambahkan `TopBar` atau `AppHeader`
- sesuaikan layout utama di `App.tsx`

### Phase 3: Shared Components Rebuild

- bangun ulang `PageHeader`
- bangun ulang `SectionCard`
- restyle `SantriFilterBar`
- buat pattern tombol, tabs, metric card, dan table shell

### Phase 4: Dashboard First

- jadikan `Dashboard.tsx` sebagai halaman acuan
- finalkan style metric cards, tab analytics, info panel, dan quick actions
- setelah dashboard matang, baru turunkan pattern ke modul lain

### Phase 5: Module-by-Module Rollout

Prioritas awal:

- Santri
- Keuangan
- WhatsApp Center
- Asrama
- PSB
- Settings

## Anti-Patterns and Prohibited Implementations

- jangan menambah komponen shared baru dengan palette hard-coded yang tidak mengikuti token
- jangan memakai `teal-*` mentah sebagai identitas halaman baru tanpa semantic token
- jangan mencampur panel gelap penuh dengan card putih dalam satu screen
- jangan melakukan refaktor visual per halaman tanpa token global lebih dulu
- jangan hanya memperkecil desktop layout untuk mobile tanpa memikirkan ulang struktur interaksi

Larangan khusus:

- jangan menyalin mentah dark theme dari referensi dashboard ke eSantri
- jangan menghilangkan identitas teal sebagai warna brand utama

## Migration Notes for Existing Components

### Keep Concept, Replace Visual

Komponen berikut boleh dipertahankan secara struktur/logika, tetapi visualnya harus diganti:

- `PageHeader`
- `SectionCard`
- `SantriFilterBar`

### Replace Layout Pattern

Komponen berikut perlu perombakan lebih dalam:

- `Sidebar`
- `Dashboard`
- shell utama di `App.tsx`

## QA Checklist

- apakah halaman memakai semantic tokens, bukan raw utility warna lama
- apakah sidebar, top bar, content, dan panel punya hierarchy surface yang jelas
- apakah halaman tetap nyaman pada lebar `360px`, `768px`, `1024px`, dan `1440px`
- apakah semua aksi utama terlihat jelas tanpa harus mengorbankan kepadatan data
- apakah header, filter, table shell, dan empty state memakai bahasa desain yang sama
- apakah state hover, focus, active, disabled, loading, dan error terlihat jelas
- apakah drawer/filter mobile nyaman disentuh satu tangan
- apakah tidak ada campuran `white utility card` lama dan panel gelap penuh yang tidak sesuai brand eSantri
