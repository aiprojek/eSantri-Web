
import Dexie, { Table } from 'dexie';
import { Santri, PondokSettings, Tagihan, Pembayaran, SaldoSantri, TransaksiSaldo, TransaksiKas, SuratTemplate, ArsipSurat, Pendaftar, AuditLog, User, SyncHistory, RaporRecord, AbsensiRecord, TahfizhRecord, Inventaris, CalendarEvent, Buku, Sirkulasi, Obat, KesehatanRecord, BkSession, BukuTamu, JadwalPelajaran, ArsipJadwal, PayrollRecord, PiketSchedule, ProdukKoperasi, TransaksiKoperasi, RiwayatStok, KeuanganKoperasi, PendingOrder, ChartOfAccount, Diskon } from './types';

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
  chartOfAccounts!: Table<ChartOfAccount, number>; 
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
  obat!: Table<Obat, number>; 
  kesehatanRecords!: Table<KesehatanRecord, number>;
  bkSessions!: Table<BkSession, number>; 
  bukuTamu!: Table<BukuTamu, number>; 
  jadwalPelajaran!: Table<JadwalPelajaran, number>;
  arsipJadwal!: Table<ArsipJadwal, number>;
  payrollRecords!: Table<PayrollRecord, number>;
  piketSchedules!: Table<PiketSchedule, number>;
  produkKoperasi!: Table<ProdukKoperasi, number>; 
  transaksiKoperasi!: Table<TransaksiKoperasi, number>;
  riwayatStok!: Table<RiwayatStok, number>; 
  keuanganKoperasi!: Table<KeuanganKoperasi, number>;
  pendingOrders!: Table<PendingOrder, number>;
  diskon!: Table<Diskon, number>; // NEW

  constructor() {
    super('eSantriDB');
    (this as any).version(44).stores({ // Bump version
      santri: '++id, nis, namaLengkap, kamarId',
      settings: '++id',
      tagihan: '++id, santriId, &[santriId+biayaId+tahun+bulan], status',
      pembayaran: '++id, santriId, tanggal, disetorKeKas',
      saldoSantri: 'santriId',
      transaksiSaldo: '++id, santriId, tanggal',
      transaksiKas: '++id, tanggal, jenis, kategori',
      chartOfAccounts: '++id, kode, nama, kategori',
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
      obat: '++id, nama, jenis',
      kesehatanRecords: '++id, santriId, tanggal, status',
      bkSessions: '++id, santriId, tanggal, status, kategori',
      bukuTamu: '++id, tanggal, status, namaTamu',
      jadwalPelajaran: '++id, rombelId, [rombelId+hari+jamKe], guruId',
      arsipJadwal: '++id, tahunAjaran, semester, jenjangId',
      payrollRecords: '++id, guruId, [bulan+tahun], tanggalBayar',
      piketSchedules: '++id, tanggal, sholat',
      produkKoperasi: '++id, nama, barcode, kategori',
      transaksiKoperasi: '++id, tanggal, tipePembeli, statusTransaksi',
      riwayatStok: '++id, produkId, tanggal, tipe',
      keuanganKoperasi: '++id, tanggal, jenis',
      pendingOrders: '++id, customerName, timestamp',
      diskon: '++id, nama, aktif' // NEW
    }).upgrade(async (tx: any) => {
       // Migration logic if needed
    });
  }
}

export const db = new ESantriDatabase();
