# Setup Portal Wali (Google Sheets + GAS)

Dokumen ini menjelaskan arsitektur portal wali terbaru: tanpa Firebase, full Google Sheets + Google Apps Script (GAS).

## Ringkasan Arsitektur

1. Aplikasi eSantri menyimpan data lokal seperti biasa.
2. Admin klik `Update Data Portal` di menu Cloud.
3. eSantri mengirim payload ringkas portal ke endpoint GAS.
4. GAS menyimpan payload di Google Sheet.
5. Halaman publik `/portal/{portalId}` membaca data dari GAS.

## Konfigurasi di eSantri

Isi di `Pengaturan > Portal Wali`:

- `Portal ID` (contoh: `ponpes-alikhlas`)
- `URL Web App GAS` (akhiran `/exec`)
- `PUBLIC_KEY` (**Kunci Kirim Publik** — bukan rahasia; tertanam di formulir/portal HTML sebagai anti-penyalahgunaan &amp; sarana rotasi)
- `ADMIN_KEY` (**Kunci Admin Rahasia**, min. 32 karakter acak — hanya disimpan di pengaturan lokal Admin &amp; Script Properties GAS; **tidak pernah** masuk ke HTML formulir/portal)

Lalu buka `Pengaturan > Cloud` dan klik `Update Data Portal`.

## Script GAS Siap Tempel (`SCRIPT_VERSION = 4`)

File referensi:

- `docs/portal-gas-template.gs`

Konstanta &amp; Script Properties penting di script:

- `PORTAL_ID_DEFAULT = 'ganti-portal-id-di-sini'`
- `PUBLIC_KEY` (disimpan ke Script Properties) — wajib untuk kirim pendaftaran PSB (`submit` / `submitPortalPsb`)
- `ADMIN_KEY` (disimpan ke Script Properties) — wajib untuk **semua aksi baca/ubah/hapus** (`list`, `getPsbSubmissions`, `getFile`, `deleteFile`, `upsertPortalConfig`). Bersifat *fail-closed* (ditolak jika kosong atau sama dengan `PUBLIC_KEY`).
- `DEFAULT_DRIVE_FOLDER_ID` (disimpan ke Script Properties sebagai `DRIVE_FOLDER_ID`; `driveFolderId`/`folderId` dari body request diabaikan).

Langkah setup awal &amp; pembaruan skrip:

1. Buat Google Sheet baru (atau buka project Apps Script yang sudah ada).
2. Buka `Extensions > Apps Script`.
3. Paste isi file `portal-gas-template.gs` (atau salin langsung dari generator aplikasi yang sudah menanam `PUBLIC_KEY` &amp; `ADMIN_KEY`).
4. Deploy pertama kali sebagai `Web App` (`Execute as: Me`, `Who has access: Anyone`).
5. **Saat memperbarui skrip yang sudah ter-deploy:** jangan buat deployment baru — klik **Deploy &gt; Manage deployments &gt; Edit &gt; Version: New version** agar URL `/exec` tetap sama.
6. Jalankan fungsi manual `makeExistingFilesPrivate()` satu kali di editor Apps Script (`Run > makeExistingFilesPrivate`) untuk mengubah izin berkas Drive PSB lama menjadi privat (`PRIVATE`).
7. **Terbitkan ulang formulir HTML PSB / Portal** setiap kali mengubah `PUBLIC_KEY` agar tautan/formulir publik memakai kunci terbaru.

> **Penting — Kebijakan Lampiran PSB:** Berkas lampiran PSB (KK, akta kelahiran, ijazah, pas foto) diunggah **mentah (tidak dienkripsi E2EE)** agar tetap dapat dibuka dan diverifikasi di Google Drive atau backend pilihan panitia. Biodata pendaftar tetap terlindungi bila E2EE aktif, dan berkas Drive mewarisi izin privat folder tujuan (tidak lagi diset `ANYONE_WITH_LINK`).

## Kontrak Endpoint GAS

Endpoint GET (tanpa rahasia):

- `?action=version` → probe versi skrip (`{ success: true, scriptVersion: 4 }`) tanpa membocorkan kunci
- `?action=getPortalPublicInfo&portalId=...&publicKey=...` → hanya profil &amp; pengumuman publik (tanpa data santri/pendaftar)

Endpoint POST:

- `action=upsertPortalConfig` (wajib `adminKey` di body POST) — sinkron data portal dari Admin
- `action=list` / `action=getPsbSubmissions` (wajib `adminKey` di body POST) — tarik daftar pendaftar PSB
- `action=getFile` (wajib `adminKey` di body POST, `fileId`/`fileUrl`) — unduh berkas dari dalam folder tujuan PSB (maks. 5 MB, allowlist MIME PDF/JPEG/PNG/WebP + SHA-256)
- `action=deleteFile` (wajib `adminKey` di body POST, `fileId`/`fileUrl`) — pindahkan berkas di dalam folder tujuan PSB ke tempat sampah Drive
- `action=submitPortalPsb` (wajib `publicKey` di body POST) — simpan pendaftaran &amp; unggah lampiran tervalidasi (penamaan standar `<nomorRegistrasi>_<INISIAL>_<jenis>-<rand4>.<ext>`)

Payload contoh `upsertPortalConfig`:

```json
{
  "action": "upsertPortalConfig",
  "portalId": "ponpes-alikhlas",
  "adminKey": "adm_rahasia_minimal_32_karakter...",
  "payload": {
    "metadata": {},
    "settings": {},
    "santriSummary": []
  }
}
```

Payload contoh `submitPortalPsb`:

```json
{
  "action": "submitPortalPsb",
  "portalId": "ponpes-alikhlas",
  "publicKey": "pub_kunci_kirim_publik",
  "fields": { "namaLengkap": "..." },
  "submittedAt": "2026-05-05T00:00:00.000Z"
}
```

## Catatan Keamanan Tautan

- Untuk tautan portal berbasis GAS manual, kirim token pada URL fragment (`#token=...`) atau gunakan kunci terenkripsi pada fragment (`#k=ep2_...`), misalnya `https://domain-anda/?portal=true&gas=...#token=...` atau `https://domain-anda/?portal=true#k=ep2_...`. Fragment (`#`) tidak dikirim ke server web dan tidak tercatat di log/header `Referer`, dan **tidak pernah memuat `ADMIN_KEY`**.
- Tautan lama dengan parameter query (`?token=...` atau `?k=...`) tetap didukung untuk kompatibilitas sementara; setelah dibaca oleh aplikasi, parameter sensitif tersebut otomatis dihapus dari URL melalui `history.replaceState`.
- Jika `?gas` maupun `#k` tidak ada, portal akan memakai cache lokal bila pernah dibuka sebelumnya atau gagal load bila belum tersedia.
- Rekomendasi operasional: selalu bagikan URL portal yang dihasilkan dari menu `Pengaturan > Portal Wali` (menggunakan `#k=ep2_...`).
