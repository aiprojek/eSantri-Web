# Panduan Singkat Data Master

Panduan ini merangkum pembaruan terbaru pada modul `Data Master`.

## 1) Indikator Perubahan Belum Disimpan

- Pada halaman Data Master, sistem sekarang menandai saat ada perubahan yang belum disimpan.
- Tombol simpan:
  - `Simpan Perubahan` jika ada perubahan.
  - `Tidak Ada Perubahan` jika tidak ada perubahan.

## 2) Tahun Ajaran (Mobile)

- Di mobile, daftar Tahun Ajaran kini tampil sebagai kartu (accordion), bukan tabel lebar.
- Ketuk kartu untuk melihat detail:
  - Rentang Masehi
  - Rentang Hijriah (jika aktif)
  - Aksi: `Jadikan Aktif`, `Edit`, `Hapus`

## 3) Mata Pelajaran Multi Modul/Link

Sekarang satu mata pelajaran bisa punya lebih dari satu:

- Modul/Kitab
- Link Unduh
- Link Beli

### Input dari form tambah/edit mapel

- Gunakan satu baris per item.
- Contoh Modul:
  - `Safinatun Najah`
  - `Fathul Qarib`
- Contoh Link Unduh:
  - `https://contoh-ebook-1`
  - `https://contoh-ebook-2`

### Input dari Tambah/Edit Massal

- Pisahkan item dengan tanda `;`
- Contoh:
  - Modul: `Safinatun Najah;Fathul Qarib`
  - Link Unduh: `https://a;https://b`

## 4) Catatan Kompatibilitas

- Data lama tetap aman.
- Field lama (`modul`, `linkUnduh`, `linkPembelian`) tetap dibaca.
- Sistem otomatis mengisi list baru bila data lama masih format tunggal.
