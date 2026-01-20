
import Dexie, { Table } from 'dexie';
import { Santri, PondokSettings, Tagihan, Pembayaran, SaldoSantri, TransaksiSaldo, TransaksiKas, SuratTemplate, ArsipSurat, Pendaftar, AuditLog, User, SyncHistory, RaporRecord, AbsensiRecord, TahfizhRecord, Inventaris, CalendarEvent, Buku, Sirkulasi, Obat, KesehatanRecord } from './types';

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
  tahfizh!: Table<TahfizhRecord, number>; 
  inventaris!: Table<Inventaris, number>; 
  calendarEvents!: Table<CalendarEvent, number>;
  buku!: Table<Buku, number>; 
  sirkulasi!: Table<Sirkulasi, number>;
  obat!: Table<Obat, number>; // NEW
  kesehatanRecords!: Table<KesehatanRecord, number>; // NEW

  constructor() {
    super('eSantriDB');
    (this as any).version(31).stores({ // Bumped to 31 for Kesehatan
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
      tahfizh: '++id, santriId, tanggal, tipe',
      inventaris: '++id, kode, nama, jenis, kategori, lokasi',
      calendarEvents: '++id, startDate, endDate, category',
      buku: '++id, kodeBuku, judul, kategori',
      sirkulasi: '++id, santriId, bukuId, status, tanggalPinjam',
      obat: '++id, nama, jenis', // NEW
      kesehatanRecords: '++id, santriId, tanggal, status' // NEW
    }).upgrade(async (tx: any) => {
       // Migration handled by Dexie
    });
  }
}

export const db = new ESantriDatabase();
