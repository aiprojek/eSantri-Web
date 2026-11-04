
import React, { createContext, useContext } from 'react';
import { useLiveQuery } from "dexie-react-hooks";
import { Tagihan, Pembayaran, SaldoSantri, TransaksiSaldo, TransaksiKas, ChartOfAccount } from '../types';
import { db } from '../db';
import { generateTagihanBulanan, generateTagihanAwal } from '../services/financeService';
import { useSettingsContext } from './SettingsContext';
import { generateSyncSafeId } from '../utils/idGenerator';
import { logActivity } from '../services/logService';

const DEFAULT_PESANTREN_COA: Array<Omit<ChartOfAccount, 'id'>> = [
  { kode: '401', nama: 'Syahriah / SPP Santri', kategori: 'Pendapatan' },
  { kode: '402', nama: 'Infaq & Donasi Muhsinin', kategori: 'Pendapatan' },
  { kode: '403', nama: 'Wakaf & Hibah Pembangunan', kategori: 'Pendapatan' },
  { kode: '404', nama: 'Hasil Usaha Koperasi & Kantin', kategori: 'Pendapatan' },
  { kode: '405', nama: 'Bantuan Pemerintah / BOS', kategori: 'Pendapatan' },
  { kode: '501', nama: 'Konsumsi & Dapur Santri', kategori: 'Beban' },
  { kode: '502', nama: 'Listrik, Air & Internet', kategori: 'Beban' },
  { kode: '503', nama: 'Gaji & Bisyarah Asatidz', kategori: 'Beban' },
  { kode: '504', nama: 'Pemeliharaan Gedung & Asrama', kategori: 'Beban' },
  { kode: '505', nama: 'ATK & Kesekretariatan', kategori: 'Beban' },
  { kode: '506', nama: 'Kesehatan Santri (Poskestren)', kategori: 'Beban' },
  { kode: '507', nama: 'Kegiatan & Ekstrakurikuler Santri', kategori: 'Beban' },
];

interface TransaksiSaldoOptions {
  catatKeKas?: boolean;
  rekeningKas?: string;
  penanggungJawab?: string;
}

interface FinanceContextType {
  tagihanList: Tagihan[];
  pembayaranList: Pembayaran[];
  saldoSantriList: SaldoSantri[];
  transaksiSaldoList: TransaksiSaldo[];
  transaksiKasList: TransaksiKas[];
  coaList: ChartOfAccount[];
  onGenerateTagihanBulanan: (tahun: number, bulan: number) => Promise<{ generated: number; skipped: number }>;
  onGenerateTagihanAwal: () => Promise<{ generated: number; skipped: number }>;
  onAddPembayaran: (data: Omit<Pembayaran, 'id'>, partialAmounts?: Record<number, number>) => Promise<Pembayaran>;
  onVoidPembayaran: (pembayaranId: number, alasan: string, operator?: string) => Promise<void>;
  onDeleteTagihan: (tagihanId: number, alasan?: string) => Promise<void>;
  onDiscountTagihan: (tagihanId: number, potonganNominal: number, keterangan: string) => Promise<void>;
  onMarkPembayaranSettled: (pembayaranIds: number[], catatan?: string) => Promise<void>;
  onAddTransaksiSaldo: (data: Omit<TransaksiSaldo, 'id' | 'saldoSetelah' | 'tanggal'>, options?: TransaksiSaldoOptions) => Promise<void>;
  onUpdateLimitHarian: (santriId: number, limitHarian: number) => Promise<void>;
  onAddTransaksiKas: (data: Omit<TransaksiKas, 'id' | 'saldoSetelah' | 'tanggal'> & { tanggal?: string }) => Promise<void>;
  onUpdateTransaksiKas: (id: number, data: Partial<Omit<TransaksiKas, 'id'>>) => Promise<void>;
  onDeleteTransaksiKas: (id: number) => Promise<void>;
  onMutasiKas: (fromRekening: string, toRekening: string, jumlah: number, deskripsi: string, pj: string, tanggal?: string) => Promise<void>;
  onSetorKeKas: (pembayaranIds: number[], total: number, tanggal: string, pj: string, catatan: string, rekeningTujuan?: string) => Promise<void>;
  onSaveCoa: (coa: Omit<ChartOfAccount, 'id'> & { id?: number }) => Promise<void>;
  onDeleteCoa: (id: number) => Promise<void>;
  onSeedDefaultCoa: () => Promise<number>;
}

const FinanceContext = createContext<FinanceContextType | null>(null);

export const FinanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { settings } = useSettingsContext();

  const tagihanList = useLiveQuery(() => db.tagihan.filter((t: Tagihan) => !t.deleted).toArray(), []) || [];
  const pembayaranList = useLiveQuery(() => db.pembayaran.filter((p: Pembayaran) => !p.deleted).toArray(), []) || [];
  const saldoSantriList = useLiveQuery(() => db.saldoSantri.filter((s: any) => !s.deleted).toArray(), []) || [];
  const transaksiSaldoList = useLiveQuery(() => db.transaksiSaldo.filter((t: any) => !t.deleted).toArray(), []) || [];
  const transaksiKasList = useLiveQuery(() => db.transaksiKas.filter((t: TransaksiKas) => !t.deleted).toArray(), []) || [];
  const coaList = useLiveQuery(() => db.chartOfAccounts.filter((c: ChartOfAccount) => !c.deleted).toArray(), []) || [];

  const addTimestamp = (data: any) => ({ ...data, lastModified: Date.now() });
  const generateUniqueId = () => generateSyncSafeId();

  const calculateActiveKasSaldo = async (upToDateIso?: string, excludeId?: number): Promise<number> => {
    const allActive = await db.transaksiKas.filter((t: TransaksiKas) => !t.deleted && t.id !== excludeId).toArray();
    const cutoffMs = upToDateIso ? new Date(upToDateIso).getTime() : null;
    return allActive
      .filter((t: TransaksiKas) => {
        if (cutoffMs === null || Number.isNaN(cutoffMs)) return true;
        return new Date(t.tanggal).getTime() <= cutoffMs;
      })
      .reduce((acc, t) => acc + (t.jenis === 'Pemasukan' ? t.jumlah : -t.jumlah), 0);
  };

  const getDeterministicCoaId = (kode: string): number => {
    const clean = kode.trim().toUpperCase();
    if (/^\d+$/.test(clean)) {
      return 100000 + parseInt(clean, 10);
    }
    let hash = 0;
    for (let i = 0; i < clean.length; i++) {
      hash = ((hash << 5) - hash) + clean.charCodeAt(i);
      hash |= 0;
    }
    return 200000 + Math.abs(hash % 800000);
  };

  const onGenerateTagihanBulanan = async (tahun: number, bulan: number) => {
    const santriList = await db.santri.filter((s: any) => !s.deleted).toArray();
    const { result, newTagihan } = await generateTagihanBulanan(db, settings, santriList, tahun, bulan);
    const withTs = newTagihan.map(t => addTimestamp({ ...t, id: generateUniqueId(), deleted: false }));
    await db.tagihan.bulkPut(withTs);
    if (withTs.length > 0) {
      await logActivity('INSERT', 'tagihan', `bulanan-${tahun}-${bulan}`, null, { tahun, bulan, generated: result.generated });
    }
    return result;
  };

  const onGenerateTagihanAwal = async () => {
    const santriList = await db.santri.filter((s: any) => !s.deleted).toArray();
    const { result, newTagihan } = await generateTagihanAwal(db, settings, santriList);
    const withTs = newTagihan.map(t => addTimestamp({ ...t, id: generateUniqueId(), deleted: false }));
    await db.tagihan.bulkPut(withTs);
    if (withTs.length > 0) {
      await logActivity('INSERT', 'tagihan', `awal-${Date.now()}`, null, { generated: result.generated });
    }
    return result;
  };

  const onAddPembayaran = async (data: Omit<Pembayaran, 'id'>, partialAmounts?: Record<number, number>): Promise<Pembayaran> => {
    const id = generateUniqueId();
    const savedPembayaran = addTimestamp({ ...data, id, deleted: false }) as Pembayaran;

    await (db as any).transaction('rw', db.pembayaran, db.tagihan, db.saldoSantri, db.transaksiSaldo, async () => {
        // Validate all target bills inside transaction before mutating balances
        for (const tid of data.tagihanIds) {
            const tagihan = await db.tagihan.get(tid);
            if (!tagihan || tagihan.deleted) {
                throw new Error('Salah satu tagihan tidak ditemukan atau telah dihapus.');
            }
            if (tagihan.status === 'Lunas') {
                throw new Error(`Tagihan "${tagihan.deskripsi}" sudah berstatus Lunas.`);
            }
            const paidAmount = partialAmounts?.[tid] !== undefined ? Number(partialAmounts[tid]) : tagihan.nominal;
            if (Number.isNaN(paidAmount) || paidAmount <= 0 || paidAmount > tagihan.nominal) {
                throw new Error(`Nominal pembayaran untuk "${tagihan.deskripsi}" tidak valid.`);
            }
        }

        if (data.metode === 'Potong Saldo') {
            const santriSaldo = await db.saldoSantri.get(data.santriId);
            const currentSaldo = santriSaldo && !santriSaldo.deleted ? santriSaldo.saldo : 0;
            if (currentSaldo < data.jumlah) {
                throw new Error(`Saldo uang saku tidak mencukupi (Saldo: Rp ${currentSaldo.toLocaleString('id-ID')}).`);
            }
            const newSaldo = currentSaldo - data.jumlah;
            await db.saldoSantri.put({
                ...(santriSaldo || { santriId: data.santriId }),
                santriId: data.santriId,
                saldo: newSaldo,
                deleted: false,
                lastModified: Date.now()
            });
            await db.transaksiSaldo.put({
                id: generateUniqueId(),
                santriId: data.santriId,
                tanggal: new Date().toISOString(),
                jenis: 'Penarikan',
                jumlah: data.jumlah,
                keterangan: `Potong Saldo untuk Pembayaran Tagihan${data.catatan ? ` (${data.catatan})` : ''}`,
                saldoSetelah: newSaldo,
                deleted: false,
                lastModified: Date.now()
            } as TransaksiSaldo);
        }

        await db.pembayaran.put(savedPembayaran);

        for (const tid of data.tagihanIds) {
            const tagihan = await db.tagihan.get(tid);
            if (tagihan) {
                const paidAmount = partialAmounts?.[tid] !== undefined ? Number(partialAmounts[tid]) : tagihan.nominal;
                if (paidAmount > 0 && paidAmount < tagihan.nominal) {
                    const sisaNominal = tagihan.nominal - paidAmount;
                    const originalTotal = tagihan.nominalAwal || tagihan.nominal;
                    const totalPaidSoFar = (tagihan.sudahDicicil || 0) + paidAmount;
                    const baseDesc = tagihan.deskripsi.replace(/ \(Cicilan.*\)$/, '');

                    // Mark paid portion as Lunas
                    await db.tagihan.put({
                        ...tagihan,
                        deskripsi: `${baseDesc} (Cicilan Rp ${paidAmount.toLocaleString('id-ID')})`,
                        nominal: paidAmount,
                        nominalAwal: originalTotal,
                        sudahDicicil: totalPaidSoFar,
                        isCicilan: true,
                        status: 'Lunas',
                        tanggalLunas: data.tanggal,
                        pembayaranId: id,
                        deleted: false,
                        lastModified: Date.now()
                    });

                    // Create remaining unpaid portion
                    await db.tagihan.put({
                        id: generateUniqueId(),
                        santriId: tagihan.santriId,
                        biayaId: tagihan.biayaId,
                        deskripsi: baseDesc,
                        bulan: tagihan.bulan,
                        tahun: tagihan.tahun,
                        nominal: sisaNominal,
                        nominalAwal: originalTotal,
                        sudahDicicil: totalPaidSoFar,
                        isCicilan: true,
                        status: 'Belum Lunas',
                        deleted: false,
                        lastModified: Date.now()
                    });
                } else {
                    await db.tagihan.put({
                        ...tagihan,
                        status: 'Lunas',
                        tanggalLunas: data.tanggal,
                        pembayaranId: id,
                        deleted: false,
                        lastModified: Date.now()
                    });
                }
            }
        }
    });

    await logActivity('INSERT', 'pembayaran', id, null, savedPembayaran);
    return savedPembayaran;
  };

  const onVoidPembayaran = async (pembayaranId: number, alasan: string, operator: string = 'Bendahara') => {
    const cleanReason = alasan.trim();
    if (!cleanReason) {
      throw new Error('Alasan pembatalan pembayaran wajib diisi.');
    }

    let oldPembayaran: Pembayaran | undefined;
    await (db as any).transaction('rw', [db.pembayaran, db.tagihan, db.saldoSantri, db.transaksiSaldo, db.transaksiKas], async () => {
      const existingPay = await db.pembayaran.get(pembayaranId);
      if (!existingPay || existingPay.deleted) {
        throw new Error('Data pembayaran tidak ditemukan atau sudah dibatalkan.');
      }
      oldPembayaran = existingPay;
      const nowTs = Date.now();
      const nowIso = new Date().toISOString();

      // 1. Soft-delete pembayaran record
      await db.pembayaran.put({
        ...existingPay,
        catatan: `${existingPay.catatan ? `${existingPay.catatan} | ` : ''}[DIBATALKAN: ${cleanReason}]`,
        deleted: true,
        lastModified: nowTs
      });

      // 2. Revert associated Tagihan records (including merging split cicilan slices safely)
      const allSantriTagihan = await db.tagihan
        .where('santriId')
        .equals(existingPay.santriId)
        .filter((t: Tagihan) => !t.deleted)
        .toArray();

      const paidTagihanList = allSantriTagihan.filter(
        (t: Tagihan) => existingPay.tagihanIds.includes(t.id) || t.pembayaranId === pembayaranId
      );

      for (const paidTagihan of paidTagihanList) {
        if (paidTagihan.isCicilan) {
          const unpaidRemainder = allSantriTagihan.find(
            (t: Tagihan) =>
              t.id !== paidTagihan.id &&
              !t.deleted &&
              t.status === 'Belum Lunas' &&
              t.biayaId === paidTagihan.biayaId &&
              t.bulan === paidTagihan.bulan &&
              t.tahun === paidTagihan.tahun &&
              t.isCicilan
          );

          if (unpaidRemainder) {
            const restoredNominal = unpaidRemainder.nominal + paidTagihan.nominal;
            const restoredSudahDicicil = Math.max(0, (unpaidRemainder.sudahDicicil || 0) - paidTagihan.nominal);
            await db.tagihan.put({
              ...unpaidRemainder,
              nominal: restoredNominal,
              sudahDicicil: restoredSudahDicicil,
              isCicilan: restoredSudahDicicil > 0,
              lastModified: nowTs
            });
            await db.tagihan.put({
              ...paidTagihan,
              deleted: true,
              lastModified: nowTs
            });
            // Update in-memory reference in case multiple slices existed
            unpaidRemainder.nominal = restoredNominal;
            unpaidRemainder.sudahDicicil = restoredSudahDicicil;
            unpaidRemainder.isCicilan = restoredSudahDicicil > 0;
            continue;
          }
        }

        const baseDesc = paidTagihan.deskripsi.replace(/ \(Cicilan.*\)$/, '');
        const prevSudahDicicil = paidTagihan.isCicilan
          ? Math.max(0, (paidTagihan.sudahDicicil || 0) - paidTagihan.nominal)
          : 0;

        await db.tagihan.put({
          ...paidTagihan,
          deskripsi: baseDesc,
          status: 'Belum Lunas',
          tanggalLunas: undefined,
          pembayaranId: undefined,
          sudahDicicil: prevSudahDicicil > 0 ? prevSudahDicicil : undefined,
          isCicilan: prevSudahDicicil > 0,
          lastModified: nowTs
        });
      }

      // 3. Refund Saldo Uang Saku if paid via Potong Saldo
      if (existingPay.metode === 'Potong Saldo') {
        const santriSaldo = await db.saldoSantri.get(existingPay.santriId);
        const currentSaldo = santriSaldo && !santriSaldo.deleted ? santriSaldo.saldo : 0;
        const newSaldo = currentSaldo + existingPay.jumlah;
        await db.saldoSantri.put({
          ...(santriSaldo || { santriId: existingPay.santriId }),
          santriId: existingPay.santriId,
          saldo: newSaldo,
          deleted: false,
          lastModified: nowTs
        });
        await db.transaksiSaldo.put({
          id: generateUniqueId(),
          santriId: existingPay.santriId,
          tanggal: nowIso,
          jenis: 'Deposit',
          jumlah: existingPay.jumlah,
          keterangan: `Refund Pembatalan Pembayaran Tagihan #${String(pembayaranId).slice(-6)} (${cleanReason})`,
          saldoSetelah: newSaldo,
          operator,
          deleted: false,
          lastModified: nowTs
        } as TransaksiSaldo);
      }

      // 4. Reverse Buku Kas Umum if already deposited (disetorKeKas === true) and not merely a non-cash marker
      if (existingPay.disetorKeKas && existingPay.metode !== 'Potong Saldo') {
        const lastSaldo = await calculateActiveKasSaldo(nowIso);
        const reversalRekening = existingPay.metode === 'Transfer' ? 'Bank Syariah Indonesia (BSI)' : 'Kas Tunai Bendahara';
        await db.transaksiKas.put({
          id: generateUniqueId(),
          tanggal: nowIso,
          jenis: 'Pengeluaran',
          kategori: 'Koreksi / Pembatalan Pembayaran',
          deskripsi: `Jurnal Balik Pembatalan Kuitansi #${String(pembayaranId).slice(-6)} (${cleanReason})`,
          jumlah: existingPay.jumlah,
          saldoSetelah: lastSaldo - existingPay.jumlah,
          penanggungJawab: operator,
          rekening: reversalRekening,
          deleted: false,
          lastModified: nowTs
        } as TransaksiKas);
      }
    });

    if (oldPembayaran) {
      await logActivity('DELETE', 'pembayaran', pembayaranId, oldPembayaran, { alasan: cleanReason, operator }, operator);
    }
  };

  const onDeleteTagihan = async (tagihanId: number, alasan?: string) => {
    const existing = await db.tagihan.get(tagihanId);
    if (!existing || existing.deleted) return;
    if (existing.status === 'Lunas') {
      throw new Error('Tagihan yang sudah lunas tidak dapat dihapus langsung. Batalkan pembayarannya terlebih dahulu.');
    }
    const deletedRecord: Tagihan = {
      ...existing,
      deleted: true,
      lastModified: Date.now()
    };
    await db.tagihan.put(deletedRecord);
    await logActivity('DELETE', 'tagihan', tagihanId, existing, { alasan: alasan || 'Hapus tagihan belum lunas' });
  };

  const onDiscountTagihan = async (tagihanId: number, potonganNominal: number, keterangan: string) => {
    const existing = await db.tagihan.get(tagihanId);
    if (!existing || existing.deleted) {
      throw new Error('Tagihan tidak ditemukan.');
    }
    if (existing.status === 'Lunas') {
      throw new Error('Tagihan yang sudah lunas tidak dapat diberi potongan.');
    }
    if (Number.isNaN(potonganNominal) || potonganNominal <= 0 || potonganNominal > existing.nominal) {
      throw new Error('Nominal potongan harus lebih dari Rp 0 dan tidak melebihi sisa tagihan.');
    }

    const cleanNote = keterangan.trim() || 'Potongan / Beasiswa';
    const nowTs = Date.now();
    const originalTotal = existing.nominalAwal || existing.nominal;
    const sisaBaru = existing.nominal - potonganNominal;

    const updatedRecord: Tagihan = sisaBaru === 0
      ? {
          ...existing,
          nominal: 0,
          nominalAwal: originalTotal,
          deskripsi: `${existing.deskripsi} [Beasiswa Penuh: ${cleanNote}]`,
          status: 'Lunas',
          tanggalLunas: new Date().toISOString().split('T')[0],
          lastModified: nowTs
        }
      : {
          ...existing,
          nominal: sisaBaru,
          nominalAwal: originalTotal,
          deskripsi: `${existing.deskripsi} [Potongan Rp ${potonganNominal.toLocaleString('id-ID')}: ${cleanNote}]`,
          lastModified: nowTs
        };

    await db.tagihan.put(updatedRecord);
    await logActivity('UPDATE', 'tagihan', tagihanId, existing, updatedRecord);
  };

  const onMarkPembayaranSettled = async (pembayaranIds: number[], catatan?: string) => {
    const nowTs = Date.now();
    await (db as any).transaction('rw', db.pembayaran, async () => {
      for (const pid of pembayaranIds) {
        const existingPay = await db.pembayaran.get(pid);
        if (existingPay && !existingPay.deleted) {
          await db.pembayaran.put({
            ...existingPay,
            disetorKeKas: true,
            catatan: catatan ? `${existingPay.catatan ? `${existingPay.catatan} | ` : ''}${catatan}` : existingPay.catatan,
            lastModified: nowTs
          });
        }
      }
    });
    if (pembayaranIds.length > 0) {
      await logActivity('UPDATE', 'pembayaran', `settle-${pembayaranIds[0]}`, null, { count: pembayaranIds.length, catatan });
    }
  };

  const onAddTransaksiSaldo = async (
    data: Omit<TransaksiSaldo, 'id' | 'saldoSetelah' | 'tanggal'>,
    options?: TransaksiSaldoOptions
  ) => {
    if (!data.jumlah || data.jumlah <= 0) {
      throw new Error('Nominal transaksi harus lebih dari Rp 0.');
    }

    const txId = generateUniqueId();
    let createdTx: TransaksiSaldo | null = null;

    await (db as any).transaction('rw', [db.saldoSantri, db.transaksiSaldo, db.transaksiKas], async () => {
        const nowTs = Date.now();
        const nowIso = new Date().toISOString();
        const santriSaldo = await db.saldoSantri.get(data.santriId);
        const currentSaldo = santriSaldo && !santriSaldo.deleted ? santriSaldo.saldo : 0;

        if (data.jenis === 'Penarikan' && currentSaldo < data.jumlah) {
            throw new Error(`Saldo uang saku tidak mencukupi (Saldo saat ini: Rp ${currentSaldo.toLocaleString('id-ID')}).`);
        }

        const newSaldo = data.jenis === 'Deposit' ? currentSaldo + data.jumlah : currentSaldo - data.jumlah;

        await db.saldoSantri.put({
            ...(santriSaldo || {}),
            santriId: data.santriId,
            saldo: newSaldo,
            deleted: false,
            lastModified: nowTs
        });

        createdTx = {
            ...data,
            id: txId,
            tanggal: nowIso,
            saldoSetelah: newSaldo,
            deleted: false,
            lastModified: nowTs
        } as TransaksiSaldo;
        await db.transaksiSaldo.put(createdTx);

        if (options?.catatKeKas) {
            const lastKasSaldo = await calculateActiveKasSaldo(nowIso);
            const jenisKas = data.jenis === 'Deposit' ? 'Pemasukan' : 'Pengeluaran';
            const updatedKasSaldo = jenisKas === 'Pemasukan' ? lastKasSaldo + data.jumlah : lastKasSaldo - data.jumlah;
            await db.transaksiKas.put({
                id: generateUniqueId(),
                tanggal: nowIso,
                jenis: jenisKas,
                kategori: data.jenis === 'Deposit' ? 'Titipan Uang Saku Masuk' : 'Penarikan Uang Saku Santri',
                deskripsi: `${data.jenis} Uang Saku Santri #${data.santriId}${data.keterangan ? ` — ${data.keterangan}` : ''}`,
                jumlah: data.jumlah,
                saldoSetelah: updatedKasSaldo,
                penanggungJawab: options.penanggungJawab || data.operator || 'Bendahara',
                rekening: options.rekeningKas || 'Kas Tunai Bendahara',
                deleted: false,
                lastModified: nowTs
            } as TransaksiKas);
        }
    });

    if (createdTx) {
      await logActivity('INSERT', 'transaksiSaldo', txId, null, createdTx);
    }
  };

  const onUpdateLimitHarian = async (santriId: number, limitHarian: number) => {
      const existing = await db.saldoSantri.get(santriId);
      await db.saldoSantri.put({
          ...(existing || {}),
          santriId,
          saldo: existing ? existing.saldo : 0,
          limitHarian: limitHarian > 0 ? limitHarian : 0,
          deleted: false,
          lastModified: Date.now()
      });
  };

  const onAddTransaksiKas = async (data: Omit<TransaksiKas, 'id' | 'saldoSetelah' | 'tanggal'> & { tanggal?: string }) => {
      const createdId = generateUniqueId();
      let createdRecord: TransaksiKas | null = null;
      await (db as any).transaction('rw', db.transaksiKas, async () => {
          const targetIso = data.tanggal || new Date().toISOString();
          const lastSaldo = await calculateActiveKasSaldo(targetIso);
          let newSaldo = lastSaldo;
          if (data.jenis === 'Pemasukan') newSaldo += data.jumlah;
          else newSaldo -= data.jumlah;

          createdRecord = {
              ...data,
              rekening: data.rekening || 'Kas Tunai Bendahara',
              id: createdId,
              tanggal: targetIso,
              saldoSetelah: newSaldo,
              deleted: false,
              lastModified: Date.now()
          } as TransaksiKas;
          await db.transaksiKas.put(createdRecord);
      });
      if (createdRecord) {
          await logActivity('INSERT', 'transaksiKas', createdId, null, createdRecord);
      }
  };

  const onUpdateTransaksiKas = async (id: number, data: Partial<Omit<TransaksiKas, 'id'>>) => {
      let oldRecord: TransaksiKas | undefined;
      let newRecord: TransaksiKas | null = null;
      await (db as any).transaction('rw', db.transaksiKas, async () => {
          const existing = await db.transaksiKas.get(id);
          if (!existing) throw new Error('Transaksi tidak ditemukan.');
          oldRecord = existing;
          const merged = {
              ...existing,
              ...data,
              id,
              rekening: data.rekening || existing.rekening || 'Kas Tunai Bendahara',
          };
          const priorSaldo = await calculateActiveKasSaldo(merged.tanggal, id);
          const updatedSaldo = priorSaldo + (merged.jenis === 'Pemasukan' ? merged.jumlah : -merged.jumlah);
          newRecord = {
              ...merged,
              saldoSetelah: updatedSaldo,
              deleted: false,
              lastModified: Date.now()
          } as TransaksiKas;
          await db.transaksiKas.put(newRecord);
      });
      if (newRecord) {
          await logActivity('UPDATE', 'transaksiKas', id, oldRecord || null, newRecord);
      }
  };

  const onDeleteTransaksiKas = async (id: number) => {
      let oldRecord: TransaksiKas | undefined;
      let deletedRecord: TransaksiKas | null = null;
      await (db as any).transaction('rw', db.transaksiKas, async () => {
          const existing = await db.transaksiKas.get(id);
          if (!existing) return;
          oldRecord = existing;
          deletedRecord = {
              ...existing,
              id,
              deleted: true,
              lastModified: Date.now()
          } as TransaksiKas;
          await db.transaksiKas.put(deletedRecord);
      });
      if (deletedRecord) {
          await logActivity('DELETE', 'transaksiKas', id, oldRecord || null, deletedRecord);
      }
  };

  const onMutasiKas = async (fromRekening: string, toRekening: string, jumlah: number, deskripsi: string, pj: string, tanggal?: string) => {
      await (db as any).transaction('rw', db.transaksiKas, async () => {
          const baseDate = tanggal ? new Date(tanggal) : new Date();
          const nowIso = baseDate.toISOString();
          const inIso = new Date(baseDate.getTime() + 10).toISOString();
          const currentTotalSaldo = await calculateActiveKasSaldo(nowIso);

          const outId = generateUniqueId();
          await db.transaksiKas.put({
              id: outId,
              tanggal: nowIso,
              jenis: 'Pengeluaran',
              kategori: 'Mutasi Kas Keluar',
              deskripsi: `[Mutasi ke ${toRekening}] ${deskripsi}`,
              jumlah,
              saldoSetelah: currentTotalSaldo - jumlah,
              penanggungJawab: pj,
              rekening: fromRekening,
              deleted: false,
              lastModified: Date.now()
          } as TransaksiKas);

          const inId = generateUniqueId();
          await db.transaksiKas.put({
              id: inId,
              tanggal: inIso,
              jenis: 'Pemasukan',
              kategori: 'Mutasi Kas Masuk',
              deskripsi: `[Mutasi dari ${fromRekening}] ${deskripsi}`,
              jumlah,
              saldoSetelah: currentTotalSaldo,
              penanggungJawab: pj,
              rekening: toRekening,
              deleted: false,
              lastModified: Date.now() + 1
          } as TransaksiKas);
      });
      await logActivity('INSERT', 'transaksiKas', `mutasi-${Date.now()}`, null, { fromRekening, toRekening, jumlah, deskripsi }, pj);
  };

  const onSetorKeKas = async (pembayaranIds: number[], total: number, tanggal: string, pj: string, catatan: string, rekeningTujuan: string = 'Kas Tunai Bendahara') => {
      const kasId = generateUniqueId();
      await (db as any).transaction('rw', db.pembayaran, db.transaksiKas, async () => {
          const nowTs = Date.now();
          // 1. Mark payments as deposited using full put() for multi-admin sync safety
          for (const pid of pembayaranIds) {
              const existingPay = await db.pembayaran.get(pid);
              if (existingPay) {
                  await db.pembayaran.put({
                      ...existingPay,
                      disetorKeKas: true,
                      lastModified: nowTs
                  });
              }
          }

          // 2. Add Kas Entry
          const targetIso = tanggal || new Date().toISOString();
          const lastSaldo = await calculateActiveKasSaldo(targetIso);
          const newSaldo = lastSaldo + total;

          await db.transaksiKas.put({
              id: kasId,
              tanggal: targetIso,
              jenis: 'Pemasukan',
              kategori: 'Setoran Pembayaran Santri',
              deskripsi: catatan,
              jumlah: total,
              saldoSetelah: newSaldo,
              penanggungJawab: pj,
              rekening: rekeningTujuan,
              deleted: false,
              lastModified: nowTs
          } as TransaksiKas);
      });
      await logActivity('INSERT', 'transaksiKas', kasId, null, { pembayaranIds, total, rekeningTujuan, catatan }, pj);
  };

  const onSaveCoa = async (coa: Omit<ChartOfAccount, 'id'> & { id?: number }) => {
      const normalizedKode = coa.kode.trim();
      const existingByKode = await db.chartOfAccounts
          .where('kode')
          .equals(normalizedKode)
          .first();

      if (existingByKode && !existingByKode.deleted && coa.id && existingByKode.id !== coa.id) {
          throw new Error(`Kode akun "${normalizedKode}" sudah digunakan oleh akun "${existingByKode.nama}".`);
      }

      const id = coa.id || existingByKode?.id || getDeterministicCoaId(normalizedKode);
      await db.chartOfAccounts.put({
          ...coa,
          kode: normalizedKode,
          id,
          deleted: false,
          lastModified: Date.now()
      });
  };

  const onDeleteCoa = async (id: number) => {
      await (db as any).transaction('rw', db.chartOfAccounts, async () => {
          const existing = await db.chartOfAccounts.get(id);
          if (!existing) return;
          await db.chartOfAccounts.put({
              ...existing,
              id,
              deleted: true,
              lastModified: Date.now()
          });
      });
  };

  const onSeedDefaultCoa = async (): Promise<number> => {
      const existing = await db.chartOfAccounts.toArray();
      const existingByKode = new Map<string, ChartOfAccount>(existing.map((c: ChartOfAccount) => [c.kode.trim(), c]));
      const toInsert: ChartOfAccount[] = [];
      const nowTs = Date.now();

      for (const item of DEFAULT_PESANTREN_COA) {
          const found = existingByKode.get(item.kode);
          if (!found || found.deleted) {
              const deterministicId = found?.id || (100000 + parseInt(item.kode, 10));
              toInsert.push({
                  ...item,
                  id: deterministicId,
                  deleted: false,
                  lastModified: nowTs
              });
          }
      }

      if (toInsert.length > 0) {
          await db.chartOfAccounts.bulkPut(toInsert);
      }
      return toInsert.length;
  };

  return (
    <FinanceContext.Provider value={{
      tagihanList,
      pembayaranList,
      saldoSantriList,
      transaksiSaldoList,
      transaksiKasList,
      coaList,
      onGenerateTagihanBulanan,
      onGenerateTagihanAwal,
      onAddPembayaran,
      onVoidPembayaran,
      onDeleteTagihan,
      onDiscountTagihan,
      onMarkPembayaranSettled,
      onAddTransaksiSaldo,
      onUpdateLimitHarian,
      onAddTransaksiKas,
      onUpdateTransaksiKas,
      onDeleteTransaksiKas,
      onMutasiKas,
      onSetorKeKas,
      onSaveCoa,
      onDeleteCoa,
      onSeedDefaultCoa
    }}>
      {children}
    </FinanceContext.Provider>
  );
};

export const useFinanceContext = () => {
  const context = useContext(FinanceContext);
  if (!context) throw new Error('useFinanceContext must be used within FinanceProvider');
  return context;
};
