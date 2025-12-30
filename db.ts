
import Dexie, { Table } from 'dexie';
import { Santri, PondokSettings, Tagihan, Pembayaran, SaldoSantri, TransaksiSaldo, TransaksiKas, SuratTemplate, ArsipSurat, Pendaftar, AuditLog } from './types';

// PondokSettings needs an ID for Dexie to handle it as a collection of 1 (or more)
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
  auditLogs!: Table<AuditLog, string>; // Local Audit Log Table

  constructor() {
    super('eSantriDB');
    (this as any).version(20).stores({
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
      auditLogs: 'id, table_name, operation, created_at', // New Table
    }).upgrade(async (tx: any) => {
       // Migration: Update settings to include customFields if missing
       await tx.table('settings').toCollection().modify((s: any) => {
            if (s.psbConfig) {
                if (!s.psbConfig.customFields) {
                    // Migration from old suratPernyataan to customFields
                    const fields = [];
                    if (s.psbConfig.suratPernyataan && s.psbConfig.suratPernyataan.aktif) {
                        fields.push({
                            id: 'section_' + Date.now(),
                            type: 'section',
                            label: s.psbConfig.suratPernyataan.judul || 'SURAT PERNYATAAN',
                            required: false
                        });
                        fields.push({
                            id: 'statement_' + Date.now(),
                            type: 'statement',
                            label: s.psbConfig.suratPernyataan.isi || '',
                            required: false
                        });
                        fields.push({
                            id: 'checkbox_' + Date.now(),
                            type: 'checkbox',
                            label: 'Saya menyatakan bahwa data yang saya isikan adalah benar dan saya menyetujui pernyataan di atas.',
                            options: ['Setuju'],
                            required: true
                        });
                    }
                    s.psbConfig.customFields = fields;
                }
            }
        });
    });
  }
}

export const db = new ESantriDatabase();
