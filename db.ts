
import Dexie, { Table } from 'dexie';
import { Santri, PondokSettings, Tagihan, Pembayaran, SaldoSantri, TransaksiSaldo, TransaksiKas, SuratTemplate, ArsipSurat, Pendaftar, AuditLog, User, SyncHistory, RaporRecord, AbsensiRecord, TahfizhRecord } from './types';

export interface PondokSettingsWithId extends PondokSettings {
  id?: number;
}

export class ESantriDatabase extends Dexie {
  santri!: Table<Santri, number>;
  settings!: Table<PondokSettingsWithId, number>;
  tagihan!: Table<Tagihan, number>;
  pembayaran!: Table<Pembayaran, number>;
  saldoSantri!: Table<SaldoSantri, number>;
  transaksiSaldo!: Table<TransaksiSaldo, number>;
  transaksiKas!: Table<TransaksiKas, number>;
  suratTemplates!: Table<SuratTemplate, number>;
  arsipSurat!: Table<ArsipSurat, number>;
  pendaftar!: Table<Pendaftar, number>;
  auditLogs!: Table<AuditLog, string>; 
  users!: Table<User, number>; 
  syncHistory!: Table<SyncHistory, string>; 
  raporRecords!: Table<RaporRecord, number>;
  absensi!: Table<AbsensiRecord, number>;
  tahfizh!: Table<TahfizhRecord, number>; // NEW

  constructor() {
    super('eSantriDB');
    (this as any).version(27).stores({ // Bumped version to 27
      santri: '++id, nis, namaLengkap, kamarId',
      settings: '++id',
      tagihan: '++id, santriId, &[santriId+biayaId+tahun+bulan], status',
      pembayaran: '++id, santriId, tanggal, disetorKeKas',
      saldoSantri: 'santriId',
      transaksiSaldo: '++id, santriId, tanggal',
      transaksiKas: '++id, tanggal, jenis, kategori',
      suratTemplates: '++id, nama, kategori',
      arsipSurat: '++id, nomorSurat, tujuan, tanggalBuat',
      pendaftar: '++id, namaLengkap, jenjangId, tanggalDaftar, status',
      auditLogs: 'id, table_name, operation, created_at',
      users: '++id, username, role',
      syncHistory: 'id, fileId, mergedAt',
      raporRecords: '++id, santriId, [santriId+tahunAjaran+semester], [tahunAjaran+semester], rombelId',
      absensi: '++id, santriId, [rombelId+tanggal], tanggal',
      tahfizh: '++id, santriId, tanggal, tipe' // NEW TABLE
    }).upgrade(async (tx: any) => {
       // Migration
       // Nothing specific needed for new table creation
    });
  }
}

export const db = new ESantriDatabase();
