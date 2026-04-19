
import Dexie, { Table } from 'dexie';
import { Santri, PondokSettings, Tagihan, Pembayaran, SaldoSantri, TransaksiSaldo, TransaksiKas, SuratTemplate, ArsipSurat, Pendaftar, AuditLog, User, SyncHistory, RaporRecord, AbsensiRecord, TahfizhRecord, Inventaris, CalendarEvent, Buku, Sirkulasi, Obat, KesehatanRecord, BkSession, BukuTamu, JadwalPelajaran, ArsipJadwal, PayrollRecord, PiketSchedule, ProdukKoperasi, TransaksiKoperasi, RiwayatStok, KeuanganKoperasi, PendingOrder, ChartOfAccount, Diskon, Supplier, PembayaranHutang, Warehouse, StockTransfer } from './types';

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
  diskon!: Table<Diskon, number>;
  suppliers!: Table<Supplier, number>;
  pembayaranHutang!: Table<PembayaranHutang, number>;
  warehouses!: Table<Warehouse, number>;
  stockTransfers!: Table<StockTransfer, number>;

  constructor() {
    super('eSantriDB');
    (this as any).version(48).stores({ // Bump version
      santri: '++id, nis, namaLengkap, kamarId, lastModified',
      settings: '++id, lastModified',
      tagihan: '++id, santriId, &[santriId+biayaId+tahun+bulan], status, lastModified',
      pembayaran: '++id, santriId, tanggal, disetorKeKas, lastModified',
      saldoSantri: 'santriId, lastModified',
      transaksiSaldo: '++id, santriId, tanggal, lastModified',
      transaksiKas: '++id, tanggal, jenis, kategori, lastModified',
      chartOfAccounts: '++id, kode, nama, kategori, lastModified',
      suratTemplates: '++id, nama, kategori, lastModified',
      arsipSurat: '++id, nomorSurat, tujuan, tanggalBuat, lastModified',
      pendaftar: '++id, namaLengkap, jenjangId, tanggalDaftar, status, lastModified',
      auditLogs: 'id, table_name, operation, created_at, lastModified',
      users: '++id, username, role, lastModified',
      syncHistory: 'id, fileId, mergedAt, lastModified',
      raporRecords: '++id, santriId, [santriId+tahunAjaran+semester], [tahunAjaran+semester], [tahunAjaran+semester+rombelId], rombelId, lastModified',
      absensi: '++id, santriId, [rombelId+tanggal], tanggal, lastModified',
      tahfizh: '++id, santriId, tanggal, tipe, lastModified',
      inventaris: '++id, kode, nama, jenis, kategori, lokasi, lastModified',
      calendarEvents: '++id, startDate, endDate, category, lastModified',
      buku: '++id, kodeBuku, judul, kategori, lastModified',
      sirkulasi: '++id, santriId, bukuId, status, tanggalPinjam, lastModified',
      obat: '++id, nama, jenis, lastModified',
      kesehatanRecords: '++id, santriId, tanggal, status, lastModified',
      bkSessions: '++id, santriId, tanggal, status, kategori, lastModified',
      bukuTamu: '++id, tanggal, status, namaTamu, lastModified',
      jadwalPelajaran: '++id, rombelId, [rombelId+hari+jamKe], guruId, lastModified',
      arsipJadwal: '++id, tahunAjaran, semester, jenjangId, lastModified',
      payrollRecords: '++id, guruId, [bulan+tahun], tanggalBayar, lastModified',
      piketSchedules: '++id, tanggal, sholat, lastModified',
      produkKoperasi: '++id, nama, barcode, kategori, supplierId, lastModified',
      transaksiKoperasi: '++id, tanggal, tipePembeli, statusTransaksi, pembeliId, lastModified',
      riwayatStok: '++id, produkId, tanggal, tipe, lastModified',
      keuanganKoperasi: '++id, tanggal, jenis, lastModified',
      pendingOrders: '++id, customerName, timestamp, lastModified',
      diskon: '++id, nama, aktif, lastModified',
      suppliers: '++id, nama, lastModified',
      pembayaranHutang: '++id, transaksiId, tanggal, lastModified',
      warehouses: '++id, nama, kode, isDefault, lastModified',
      stockTransfers: '++id, tanggal, produkId, dariWarehouseId, keWarehouseId, lastModified'
    })
.upgrade(async (tx: any) => {
       // Migration logic if needed
    });
  }
}

export const db = new ESantriDatabase();
