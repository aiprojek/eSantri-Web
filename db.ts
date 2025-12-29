
import Dexie, { Table } from 'dexie';
import { Santri, PondokSettings, Tagihan, Pembayaran, SaldoSantri, TransaksiSaldo, TransaksiKas, SuratTemplate, ArsipSurat, Pendaftar } from './types';

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

  constructor() {
    super('eSantriDB');
    (this as any).version(19).stores({
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
            } else {
                 // Default if psbConfig missing completely
                 s.psbConfig = {
                    tahunAjaranAktif: new Date().getFullYear() + '/' + (new Date().getFullYear() + 1),
                    targetKuota: 100,
                    nomorHpAdmin: '',
                    telegramUsername: '',
                    pesanSukses: 'Terima kasih telah mendaftar. Silakan hubungi admin untuk konfirmasi.',
                    activeGelombang: 1,
                    biayaPendaftaran: 0,
                    infoRekening: '',
                    activeFields: ['namaLengkap', 'nisn', 'jenisKelamin', 'tempatLahir', 'tanggalLahir', 'alamat', 'namaWali', 'nomorHpWali', 'asalSekolah'],
                    requiredDocuments: ['Kartu Keluarga (KK)', 'Akte Kelahiran', 'Pas Foto 3x4'],
                    designStyle: 'classic',
                    posterTitle: 'Penerimaan Santri Baru',
                    posterSubtitle: 'Tahun Ajaran 2025/2026',
                    posterInfo: 'Segera Daftarkan Putra/Putri Anda!',
                    customFields: [
                        { id: 'sec_1', type: 'section', label: 'SURAT PERNYATAAN', required: false },
                        { id: 'stmt_1', type: 'statement', label: 'Dengan ini saya menyatakan sanggup menaati segala peraturan pondok.', required: false },
                        { id: 'chk_1', type: 'checkbox', label: 'Persetujuan', options: ['Saya Setuju'], required: true }
                    ]
                };
            }
        });
    });
  }
}

export const db = new ESantriDatabase();
