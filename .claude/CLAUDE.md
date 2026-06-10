# Laporan Pemahaman eSantri-Web

Dokumen ini berisi pemahaman menyeluruh tentang arsitektur aplikasi eSantri-Web dan harus digunakan sebagai referensi utama sebelum implementasi fitur baru.

---

## 1. FUNDAMENTAL UI & DESIGN SYSTEM

### 1.1 Arsitektur CSS

Aplikasi menggunakan **custom design system** berbasis Tailwind CSS dengan prefix `app-` untuk komponen yang konsisten:

**Layout Classes:**

- `app-shell` - Root application shell (gradient background)
- `app-canvas` - Content canvas area
- `app-sidebar` - Sidebar navigation (teal gradient)
- `app-topbar` - Top bar header

**Panel Classes:**

- `app-panel` - Card/panel component
- `app-panel-elevated` - Elevated card variant
- `app-panel-soft` - Soft/inset panel variant
- `app-overlay` - Modal/drawer backdrop (blur effect)
- `app-modal` - Modal dialog
- `app-toolbar` - Filter/action toolbar

**Form Classes:**

- `app-input` - Text input field
- `app-select` - Select dropdown
- `app-button-primary` / `app-button-secondary` / `app-button-danger` / `app-button-ghost`
- `app-label` - Uppercase label with tracking

**Typography Classes:**

- `app-text` - Primary text
- `app-text-muted` - Muted text color
- `app-text-secondary` - Secondary text color

**Utility Classes:**

- `app-scrollbar` - Custom styled scrollbar
- `app-table-shell` / `app-table` - Table container and styling
- `app-icon-button` - Icon-only button

### 1.2 Warna & Tema

**Color Palette (CSS Variables):**

```css
/* Backgrounds */
--bg-app: #f4fbfa /* Light mint base */ --bg-app-accent: #e7f6f3
  /* Accent surface */ --bg-sidebar: #0f766e /* Teal-700 (sidebar) */
  --bg-surface: rgba(255, 255, 255, 0.94) /* Borders */
  --border-subtle: rgba(15, 118, 110, 0.12)
  --border-strong: rgba(15, 118, 110, 0.22) /* Text */ --text-primary: #0f172a
  /* Slate-900 */ --text-secondary: #334155 /* Slate-700 */
  --text-muted: #64748b /* Slate-500 */ /* Accents */ --accent-primary: #0c5cab
  /* Blue primary */ --accent-secondary: #0f766e /* Teal-600 */
  --accent-success: #10b981 /* Emerald */ --accent-warning: #f59e0b /* Amber */
  --accent-danger: #ef4444 /* Red */;
```

**Summary:**

- **Primary Accent**: Teal `#0f766e` (sidebar, buttons, active states)
- **Secondary Accent**: Blue `#0c5cab` (CTAs, links)
- **Background**: Light mint `#f4fbfa` dengan white surfaces
- **Semantic Colors**: Green (success), Amber (warning), Red (danger)

### 1.3 Common Components Library

```
components/common/
├── HeaderTabs.tsx        → Tab navigation dengan mobile dropdown
├── PageHeader.tsx        → Header page dengan eyebrow, tabs, actions
├── SectionCard.tsx       → Card wrapper dengan header, title, actions
├── Pagination.tsx         → Navigasi halaman dengan ellipsis
├── SantriFilterBar.tsx   → Filter cascading (jenjang→kelas→rombel)
├── MobileFilterDrawer.tsx→ Bottom sheet untuk mobile filters
├── EmptyState.tsx         → Empty data state dengan icon
├── LoadingFallback.tsx    → Full-page spinner loading
├── ErrorBoundary.tsx     → Class-based React error boundary
├── ConfirmModal.tsx      → Konfirmasi via context (showConfirmation)
├── PrintHeader.tsx       → Print-specific header styling
├── SimpleEditor.tsx      → Lightweight rich text editor
└── QuillEditor.tsx       → Quill editor (placeholder, belum dipakai)
```

---

## 2. DATABASE & CONTEXT ARCHITECTURE

### 2.1 IndexedDB Tables (41 Tables)

Database `eSantriDB` version 50, menggunakan Dexie.js:

| Table               | Primary Key   | Purpose                             |
| ------------------- | ------------- | ----------------------------------- |
| `santri`            | `id`          | Data pelajar (foto, alamat, status) |
| `settings`          | `id`          | Konfigurasi pondok (single row)     |
| `tagihan`           | `id`          | Tagihan bulanan                     |
| `pembayaran`        | `id`          | Pembayaran                          |
| `saldoSantri`       | `santriId`    | Saldo tabungan per pelajar          |
| `transaksiSaldo`    | `id`          | Riwayat setor/tarik tabungan        |
| `transaksiKas`      | `id`          | Buku kas umum                       |
| `chartOfAccounts`   | `id`          | Akun pembukuan                      |
| `suratTemplates`    | `id`          | Template surat                      |
| `arsipSurat`        | `id`          | Arsip surat keluar                  |
| `pendaftar`         | `id`          | Pendaftar PSB                       |
| `auditLogs`         | `id` (string) | Audit trail perubahan               |
| `users`             | `id`          | Akun user                           |
| `raporRecords`      | `id`          | Catatan rapor                       |
| `absensi`           | `id`          | Kehadiran harian                    |
| `jurnalMengajar`    | `id`          | Jurnal mengajar guru                |
| `tahfizh`           | `id`          | Hafalan Quran                       |
| `inventaris`        | `id`          | Aset pondok                         |
| `calendarEvents`    | `id`          | Kalender acara                      |
| `buku`              | `id`          | Katalog buku perpustakaan           |
| `sirkulasi`         | `id`          | Peminjaman buku                     |
| `obat`              | `id`          | Inventaris obat                     |
| `kesehatanRecords`  | `id`          | Kunjungan kesehatan                 |
| `bkSessions`        | `id`          | Sesi BK                             |
| `bukuTamu`          | `id`          | Buku tamu                           |
| `jadwalPelajaran`   | `id`          | Jadwal pelajaran                    |
| `arsipJadwal`       | `id`          | Arsip jadwal                        |
| `payrollRecords`    | `id`          | Gaji guru                           |
| `piketSchedules`    | `id`          | Jadwal piket                        |
| `produkKoperasi`    | `id`          | Produk kantin/koperasi              |
| `transaksiKoperasi` | `id`          | Penjualan                           |
| `riwayatStok`       | `id`          | Perubahan stok                      |
| `keuanganKoperasi`  | `id`          | Keuangan operasional                |
| `pendingOrders`     | `id`          | Pesanan pending                     |
| `diskon`            | `id`          | Aturan diskon                       |
| `suppliers`         | `id`          | Supplier/vendor                     |
| `pembayaranHutang`  | `id`          | Pelunasan hutang                    |
| `warehouses`        | `id`          | Lokasi gudang                       |
| `stockTransfers`    | `id`          | Transfer antar gudang               |
| `digitalAssets`     | `id` (string) | TTD, Stempel, Kop Surat             |

### 2.2 Context Providers (6 Provider)

**Provider Hierarchy:**

```tsx
<UIProvider>
  <SettingsProvider>
    <FirebaseProvider>
      <AuthProvider>
        <SantriProvider>
          <FinanceProvider>
            <AppProvider>
              <AppContent />
            </AppProvider>
          </FinanceProvider>
        </SantriProvider>
      </AuthProvider>
    </FirebaseProvider>
  </SettingsProvider>
</UIProvider>
```

**SettingsContext:**

- Konfigurasi pondok (nama, logo, biaya)
- Master data (jenjang, kelas, rombel, tenagaPengajar, mataPelajaran)
- Cloud sync config

**AuthContext:**

- Multi-user mode / single admin virtual
- Session management
- Permission checking

**SantriContext:**

- CRUD Santri & Pendaftar
- Absensi, Tahfizh, Kesehatan, BK
- Audit logging

**FinanceContext:**

- Tagihan & Pembayaran
- SaldoSantri & TransaksiSaldo
- TransaksiKas

**UIContext:**

- Toast notifications (showToast)
- Confirmation dialogs (showConfirmation)
- Alert modals (showAlert)

**FirebaseContext:**

- Firebase authentication
- Real-time cloud sync

### 2.3 Entity Relationships

```
Settings (1) ──contains──> [jenjang[], kelas[], rombel[], tenagaPengajar[], biaya[]]

Santri (N) <──belongs to── (jenjang, kelas, rombel, kamar)
  ├── Tagihan (N) ──> Pembayaran (N)
  │     └── SaldoSantri (1) ──> TransaksiSaldo (N)
  ├── Absensi (N) ──per tanggal
  ├── Tahfizh (N)
  ├── RaporRecord (N) ──per semester
  └── Sirkulasi (N) ──perpustakaan

TransaksiKas <──ditampung── Pembayaran (saat disetor ke kas)

ProdukKoperasi ──> Suppliers, Warehouse, Diskon
  └── TransaksiKoperasi ──> RiwayatStok, PembayaranHutang
```

---

## 3. MODULE ARCHITECTURE (26 Pages)

### 3.1 Navigation Groups

```
KESISWAAN          → Santri, Absensi, Tahfizh, Kesehatan, BK, Keasramaan
PENDIDIKAN        → Kurikulum, Rapor, Perpustakaan, Kalender, DataMaster
ADMINISTRASI       → Buku Tamu, PSB, Surat Menyurat, WhatsApp, Laporan
KEUANGAN & ASET   → Keuangan, Buku Kas, Cooperativa, Sarpras
SISTEM            → Audit Log, Portal, Pengaturan, Sync Admin, Tentang
```

### 3.2 Lazy Loading Pattern

Semua page di-load dengan `React.lazy()` untuk code splitting:

```tsx
const Dashboard = React.lazy(() => import("./components/Dashboard"));
const SantriList = React.lazy(() => import("./components/SantriList"));
```

### 3.3 Permission-Based Access

```tsx
case Page.Koperasi:
  return checkAccess('koperasi') ? <Koperasi /> : <AccessDenied />;
```

---

## 4. WORKFLOW PATTERNS

### 4.1 CRUD Pattern

```
User Action → Modal Form → Validation → Context Method → IndexedDB → UI Update (LiveQuery)
```

**Contoh: Tambah Santri**

```tsx
// 1. Modal form dengan react-hook-form
const { handleSubmit } = useForm<Santri>();

// 2. Submit handler
onSubmit(async (data) => {
  await onAddSantri(data); // Context method
  setShowModal(false);
});

// 3. Context method (SantriContext)
onAddSantri: async (data) => {
  const id = await db.santri.add({ ...data, lastModified: Date.now() });
  await logActivity("santri", "CREATE", id.toString());
};
```

### 4.2 Konfirmasi Pattern

```tsx
const { showConfirmation } = useAppContext();

showConfirmation(
  "Hapus Data?",
  "Aksi ini tidak bisa dibatalkan.",
  async () => {
    await db.santri.delete(id);
  },
  { confirmText: "Ya, Hapus", confirmColor: "red" },
);
```

### 4.3 Tab Pattern untuk Halaman Kompleks

```tsx
<PageHeader
  tabs={<HeaderTabs value={activeTab} onChange={setActiveTab} tabs={TABS} />}
/>;
{
  activeTab === "katalog" && <KatalogBuku />;
}
{
  activeTab === "sirkulasi" && <Sirkulasi />;
}
{
  activeTab === "cetak" && <CetakPerpus />;
}
```

### 4.4 Export/Print Pattern (Facade Pattern)

```
PrintExportFacade
├── printDialog()           → Native browser print (VECTOR PDF)
├── downloadPdfImage()      → html2canvas + jsPDF (BITMAP)
├── downloadPdfAutoTable()  → Table extraction → jsPDF
├── downloadExcelVisual()   → XLSX with formatting
├── downloadHtml()         → Standalone HTML
└── downloadWord()          → Word export
```

---

## 5. CRITICAL PATTERNS UNTUK IMPLEMENTASI

### 5.1 SmartAvatar Pattern - WAJIB PAHAM

```tsx
// ❌ SALAH - akan error TypeScript
<SmartAvatar Santosri={santri} variant="..." />

// ✅ BENAR
<SmartAvatar santri={santri} variant="..." />
```

**Props yang WAJIB:**

- `santri` (lowercase, bukan Santosri) - Data Santri
- `variant` - 'classic' | 'modern' | 'vertical' | 'dark' | 'ceria' (TIDAK ada 'bold')

### 5.2 SectionCard Pattern

```tsx
<SectionCard>
  <div className="flex justify-between items-center mb-4">
    <div>
      <h3 className="text-lg font-bold text-app-text">Judul</h3>
      <p className="text-sm text-app-textMuted">Deskripsi</p>
    </div>
    <button className="app-button-primary">
      <i className="bi bi-plus-circle mr-2"></i>Tambah
    </button>
  </div>
  {/* Filter tabs */}
  {/* Content grid or table */}
</SectionCard>
```

### 5.3 Toast & Confirmation Pattern

```tsx
const { showToast, showConfirmation } = useAppContext();

// Toast
showToast("Berhasil menyimpan!", "success");

// Confirmation
showConfirmation(
  "Hapus Data?",
  "Aksi tidak bisa dibatalkan.",
  async () => {
    /* action */
  },
  { confirmText: "Ya, Hapus", confirmColor: "red" },
);
```

### 5.4 useLiveQuery Pattern

```tsx
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../db";

// Auto-sync dengan IndexedDB
const products =
  useLiveQuery(
    () => db.produkKoperasi.filter((p) => !p.deleted).toArray(),
    [],
  ) || [];
```

### 5.5 Settings Integration Pattern

```tsx
import { useAppContext } from "../../AppContext";

export const MyComponent: React.FC = () => {
  const { settings } = useAppContext();

  // Ambil tenaga pengajar aktif
  const activeTeachers = useMemo(
    () =>
      settings.tenagaPengajar.filter(
        (t) => !t.riwayatJabatan.some((r) => r.tanggalSelesai),
      ),
    [settings.tenagaPengajar],
  );
};
```

---

## 6. ALUR DATA ANTAR MODUL

### 6.1 Alur Keuangan

```
Settings.biaya[]
      │
      ▼
Generate Tagihan Bulanan
      │
      ▼
Pembayaran (pelunasan)
      │
      ├──disetor ke kas?──> TransaksiKas (Pemasukan)
      │
      └──Tabungan──> SaldoSantri + TransaksiSaldo
```

### 6.2 Alur Perpustakaan

```
Buku[] (katalog)
      │
      ▼
Sirkulasi (pinjam buku) → decrement stok
      │
      ▼
Pengembalian → increment stok + hitung denda
```

### 6.3 Alur Cooperativa

```
ProdukKoperasi[]
      │
      ▼
TransaksiKoperasi (penjualan)
      │
      ├── Tunai/Transfer ──> TransaksiKas
      ├── Tabungan ──> SaldoSantri
      └── Hutang ──> PembayaranHutang
            │
            ▼
        WarehouseStok decrement
```

### 6.4 Alur Akademik

```
Settings.jenjang/kelas/rombel[]
      │
      ▼
JadwalPelajaran[] (per rombel, hari, jam)
      │
      ▼
Absensi (harian) + JurnalMengajar
      │
      ▼
Tahfizh (hafalan)
      │
      ▼
RaporRecord (per semester)
```

---

## 7. PERATURAN IMPLEMENTASI

### 7.1 SEBELUM Implementasi

1. **Baca dokumen ini** - Pastikan paham arsitektur
2. **Cek existing patterns** - Gunakan komponen yang sudah ada
3. **Identifikasi Context** - Cek data dari context mana
4. **Design review** - Pakai design system classes

### 7.2 Design System Checklist

- [ ] Pakai `app-button-primary` bukan `bg-teal-600`
- [ ] Pakai `app-input` bukan `border rounded p-2`
- [ ] Pakai `app-card` atau `SectionCard` untuk card wrapper
- [ ] Pakai `app-label` untuk label form
- [ ] Pakai `app-text` / `app-textMuted` untuk text styling

### 7.3 Component Pattern Checklist

- [ ] Pakai `SectionCard` untuk section wrapper
- [ ] Pakai `HeaderTabs` untuk tab navigation
- [ ] Pakai `PageHeader` untuk page header
- [ ] Pakai `showConfirmation` dari AppContext untuk konfirmasi
- [ ] Pakai `useLiveQuery` untuk data dari IndexedDB

### 7.3 Naming Convention Checklist

- [ ] SmartAvatar props: `santri` (lowercase)
- [ ] SmartAvatar variant: tanpa 'bold'
- [ ] State handlers: `handleX`, `onX`
- [ ] Component files: PascalCase

### 7.4 Type Safety Checklist

- [ ] Deklarasikan interface untuk props
- [ ] Pakai type dari `types.ts` jika ada
- [ ] Hindari `any` type
- [ ] Export interface yang reusable

---

## 8. KESIMPULAN

eSantri-Web adalah **offline-first full-stack application** dengan:

1. **Frontend**: React + TypeScript + Tailwind CSS
2. **State**: React Context + Dexie IndexedDB (LiveQuery reactive)
3. **Sync**: Multi-cloud support (None, Dropbox/WebDAV, Firebase)
4. **Arsitektur**: Lazy-loaded pages + granular permission system
5. **Data**: 41 tabel IndexedDB dengan relationships kompleks

**Kunci sukses implementasi:**

- Pakai design system yang ada
- Pakai components yang reusable
- Konsultasi user sebelum eksekusi
- Test dengan `npm run build`
