// FIX: Switched from a class-based Dexie definition to a direct instance with type casting.
// This resolves typing errors where methods like `version()` and `transaction()` were not found on the `db` instance,
// which can occur in certain TypeScript build environments. This direct approach ensures `db` is
// correctly recognized as a full Dexie instance with all its methods.
import Dexie, { type Table } from 'dexie';
import { type PondokSettings, type Santri, type Tagihan, type Pembayaran, type SaldoSantri, type TransaksiSaldo, type TransaksiKas, type SuratTemplate, type ArsipSurat } from './types';

// Define a type for settings that includes the internal ID from Dexie
export type PondokSettingsWithId = PondokSettings & { id?: number };

export const db = new Dexie('eSantriDB') as Dexie & {
    santri: Table<Santri, number>;
    settings: Table<PondokSettingsWithId, number>;
    tagihan: Table<Tagihan, number>;
    pembayaran: Table<Pembayaran, number>;
    saldoSantri: Table<SaldoSantri, number>; // santriId is the key
    transaksiSaldo: Table<TransaksiSaldo, number>;
    transaksiKas: Table<TransaksiKas, number>;
    suratTemplates: Table<SuratTemplate, number>;
    arsipSurat: Table<ArsipSurat, number>;
};

db.version(14).stores({
  santri: '++id, nis, namaLengkap, kamarId',
  settings: '++id',
  tagihan: '++id, santriId, &[santriId+biayaId+tahun+bulan], status',
  pembayaran: '++id, santriId, tanggal, disetorKeKas',
  saldoSantri: 'santriId',
  transaksiSaldo: '++id, santriId, tanggal',
  transaksiKas: '++id, tanggal, jenis, kategori',
  suratTemplates: '++id, nama, kategori',
  arsipSurat: '++id, nomorSurat, tujuan, tanggalBuat, kategori',
});

db.version(13).stores({
  santri: '++id, nis, namaLengkap, kamarId',
  settings: '++id',
  tagihan: '++id, santriId, &[santriId+biayaId+tahun+bulan], status',
  pembayaran: '++id, santriId, tanggal, disetorKeKas',
  saldoSantri: 'santriId',
  transaksiSaldo: '++id, santriId, tanggal',
  transaksiKas: '++id, tanggal, jenis, kategori',
  suratTemplates: '++id, nama, kategori',
  arsipSurat: '++id, nomorSurat, tujuan, tanggalBuat',
}).upgrade(tx => {
    // 13: Add stampConfig and signatureUrl to surat module
});

db.version(12).stores({
  santri: '++id, nis, namaLengkap, kamarId',
  settings: '++id',
  tagihan: '++id, santriId, &[santriId+biayaId+tahun+bulan], status',
  pembayaran: '++id, santriId, tanggal, disetorKeKas',
  saldoSantri: 'santriId',
  transaksiSaldo: '++id, santriId, tanggal',
  transaksiKas: '++id, tanggal, jenis, kategori',
  suratTemplates: '++id, nama, kategori',
  arsipSurat: '++id, nomorSurat, tujuan, tanggalBuat',
}).upgrade(tx => {
    // 12: Add tempatTanggalConfig to templates and archives
});

db.version(11).stores({
  santri: '++id, nis, namaLengkap, kamarId',
  settings: '++id',
  tagihan: '++id, santriId, &[santriId+biayaId+tahun+bulan], status',
  pembayaran: '++id, santriId, tanggal, disetorKeKas',
  saldoSantri: 'santriId',
  transaksiSaldo: '++id, santriId, tanggal',
  transaksiKas: '++id, tanggal, jenis, kategori',
  suratTemplates: '++id, nama, kategori',
  arsipSurat: '++id, nomorSurat, tujuan, tanggalBuat',
});

db.version(10).stores({
  santri: '++id, nis, namaLengkap, kamarId',
  settings: '++id',
  tagihan: '++id, santriId, &[santriId+biayaId+tahun+bulan], status',
  pembayaran: '++id, santriId, tanggal, disetorKeKas',
  saldoSantri: 'santriId',
  transaksiSaldo: '++id, santriId, tanggal',
  transaksiKas: '++id, tanggal, jenis, kategori',
  suratTemplates: '++id, nama, kategori',
  arsipSurat: '++id, nomorSurat, tujuan, tanggalBuat',
});

db.version(9).stores({
  santri: '++id, nis, namaLengkap, kamarId',
  settings: '++id',
  tagihan: '++id, santriId, &[santriId+biayaId+tahun+bulan], status',
  pembayaran: '++id, santriId, tanggal, disetorKeKas',
  saldoSantri: 'santriId',
  transaksiSaldo: '++id, santriId, tanggal',
  transaksiKas: '++id, tanggal, jenis, kategori',
  suratTemplates: '++id, nama, kategori',
  arsipSurat: '++id, nomorSurat, tujuan, tanggalBuat',
});

db.version(8).stores({
  santri: '++id, nis, namaLengkap, kamarId',
  settings: '++id',
  tagihan: '++id, santriId, &[santriId+biayaId+tahun+bulan], status',
  pembayaran: '++id, santriId, tanggal, disetorKeKas',
  saldoSantri: 'santriId',
  transaksiSaldo: '++id, santriId, tanggal',
  transaksiKas: '++id, tanggal, jenis, kategori',
  suratTemplates: '++id, nama, kategori',
  arsipSurat: '++id, nomorSurat, tujuan, tanggalBuat',
}).upgrade(tx => {
    // Upgrade to ensure existing templates have valid structure if needed
});

db.version(7).stores({
  santri: '++id, nis, namaLengkap, kamarId',
  settings: '++id',
  tagihan: '++id, santriId, &[santriId+biayaId+tahun+bulan], status',
  pembayaran: '++id, santriId, tanggal, disetorKeKas',
  saldoSantri: 'santriId',
  transaksiSaldo: '++id, santriId, tanggal',
  transaksiKas: '++id, tanggal, jenis, kategori',
  suratTemplates: '++id, nama, kategori',
  arsipSurat: '++id, nomorSurat, tujuan, tanggalBuat',
});

db.version(6).stores({
  santri: '++id, nis, namaLengkap, kamarId',
  settings: '++id',
  tagihan: '++id, santriId, &[santriId+biayaId+tahun+bulan], status',
  pembayaran: '++id, santriId, tanggal, disetorKeKas',
  saldoSantri: 'santriId',
  transaksiSaldo: '++id, santriId, tanggal',
  transaksiKas: '++id, tanggal, jenis, kategori',
});

db.version(5).stores({
  santri: '++id, nis, namaLengkap, kamarId',
  settings: '++id',
  tagihan: '++id, santriId, &[santriId+biayaId+tahun+bulan], status',
  pembayaran: '++id, santriId, tanggal',
  saldoSantri: 'santriId',
  transaksiSaldo: '++id, santriId, tanggal',
  transaksiKas: '++id, tanggal, jenis, kategori',
});

db.version(4).stores({
  santri: '++id, nis, namaLengkap, kamarId',
  settings: '++id',
  tagihan: '++id, santriId, &[santriId+biayaId+tahun+bulan], status',
  pembayaran: '++id, santriId, tanggal',
  saldoSantri: 'santriId', // Primary key is santriId
  transaksiSaldo: '++id, santriId, tanggal',
});

db.version(3).stores({
  santri: '++id, nis, namaLengkap, kamarId',
  settings: '++id', // Will only store one object, auto-incrementing key
  tagihan: '++id, santriId, &[santriId+biayaId+tahun+bulan], status',
  pembayaran: '++id, santriId, tanggal',
}).upgrade(tx => {
  // Upgrade logic from version 2 to 3. If version 2 is already there, this will run.
  // The 'kamarId' index is new in version 3. No data migration needed, just schema update.
  return tx.table('santri').toCollection().modify(santri => {
    if (santri.kamarId === undefined) {
      // you can set a default value if needed, but for now undefined is fine
    }
  });
});

db.version(2).stores({
  santri: '++id, nis, namaLengkap',
  settings: '++id', // Will only store one object, auto-incrementing key
  tagihan: '++id, santriId, &[santriId+biayaId+tahun+bulan], status',
  pembayaran: '++id, santriId, tanggal',
});