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

## Catatan

- Query `?gas=...` pada URL portal masih didukung.
- Jika `?gas` tidak ada, portal akan gagal load kecuali URL GAS tersedia di browser (localStorage).
- Rekomendasi operasional: selalu bagikan URL portal yang sudah mengandung parameter `gas`.
