// FIX: Switched from a class-based Dexie definition to a direct instance with type casting.
// This resolves typing errors where methods like `version()` and `transaction()` were not found on the `db` instance,
// which can occur in certain TypeScript build environments. This direct approach ensures `db` is
// correctly recognized as a full Dexie instance with all its methods.
import Dexie, { type Table } from 'dexie';
import { type PondokSettings, type Santri, type Tagihan, type Pembayaran, type SaldoSantri, type TransaksiSaldo, type TransaksiKas } from './types';

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
};

db.version(6).stores({
  santri: '++id, nis, namaLengkap, kamarId',
  settings: '++id',
  tagihan: '++id, santriId, &[santriId+biayaId+tahun+bulan], status',
  pembayaran: '++id, santriId, tanggal, disetorKeKas',
  saldoSantri: 'santriId',
  transaksiSaldo: '++id, santriId, tanggal',
  transaksiKas: '++id, tanggal, jenis, kategori',
}).upgrade(() => {
    // This upgrade is for adding the 'disetorKeKas' index to the 'pembayaran' table.
    // Dexie handles adding new indexes automatically when an upgrade function is present,
    // so no data migration code is needed here. This ensures smooth upgrades for existing users.
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