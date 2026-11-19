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
- `Token API` opsional (jika GAS Anda memakai token)

Lalu buka `Pengaturan > Cloud` dan klik `Update Data Portal`.

## Script GAS Siap Tempel

File referensi:

- `docs/portal-gas-template.gs`

Penanda yang wajib diperhatikan di script:

- `PORTAL_ID_DEFAULT = 'ganti-portal-id-di-sini'`
- `API_TOKEN = ''`

Langkah setup cepat:

1. Buat Google Sheet baru.
2. Buka `Extensions > Apps Script`.
3. Paste isi file `portal-gas-template.gs`.
4. Deploy sebagai `Web App` (`Execute as: Me`, `Who has access: Anyone`).
5. Salin URL deployment `/exec`.
6. Tempel URL itu ke `URL Web App GAS` di `Pengaturan > Portal Wali`.

Jika Anda ingin mode token:

1. Isi `API_TOKEN` di script GAS.
2. Isi nilai token yang sama di `Token API` pada aplikasi eSantri.

## Kontrak Endpoint GAS

Endpoint GET:

- `?action=getPortalConfig&portalId=...&apiKey=...`

Response:

```json
{
  "success": true,
  "data": { "namaPonpes": "...", "portalConfig": {}, "psbConfig": {} }
}
```

Endpoint POST:

- `action=upsertPortalConfig` untuk sinkron data portal dari aplikasi
- `action=submitPortalPsb` untuk simpan pendaftaran dari form publik

Payload contoh `upsertPortalConfig`:

```json
{
  "action": "upsertPortalConfig",
  "portalId": "ponpes-alikhlas",
  "apiKey": "opsional",
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
  "apiKey": "opsional",
  "fields": { "namaLengkap": "..." },
  "submittedAt": "2026-05-05T00:00:00.000Z"
}
```

## Catatan Keamanan Tautan

- Untuk tautan portal berbasis GAS manual, kirim token pada URL fragment (`#token=...`) atau gunakan kunci terenkripsi pada fragment (`#k=ep2_...`), misalnya `https://domain-anda/?portal=true&gas=...#token=...` atau `https://domain-anda/?portal=true#k=ep2_...`. Fragment (`#`) tidak dikirim ke server web dan tidak tercatat di log/header `Referer`.
- Tautan lama dengan parameter query (`?token=...` atau `?k=...`) tetap didukung untuk kompatibilitas sementara; setelah dibaca oleh aplikasi, parameter sensitif tersebut otomatis dihapus dari URL melalui `history.replaceState`.
- Jika `?gas` maupun `#k` tidak ada, portal akan memakai cache lokal bila pernah dibuka sebelumnya atau gagal load bila belum tersedia.
- Rekomendasi operasional: selalu bagikan URL portal yang dihasilkan dari menu `Pengaturan > Portal Wali` (menggunakan `#k=ep2_...`).
