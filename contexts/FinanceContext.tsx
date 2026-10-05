
import React, { createContext, useContext } from 'react';
import { useLiveQuery } from "dexie-react-hooks";
import { Tagihan, Pembayaran, SaldoSantri, TransaksiSaldo, TransaksiKas, ChartOfAccount } from '../types';
import { db } from '../db';
import { generateTagihanBulanan, generateTagihanAwal } from '../services/financeService';
import { useSettingsContext } from './SettingsContext';

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
  onAddTransaksiSaldo: (data: Omit<TransaksiSaldo, 'id' | 'saldoSetelah' | 'tanggal'>) => Promise<void>;
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
  const idCounterRef = React.useRef(0);
  const generateUniqueId = () => {
    idCounterRef.current = (idCounterRef.current + 1) % 1000;
    return Date.now() * 1000 + idCounterRef.current;
  };

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
    const withTs = newTagihan.map(t => addTimestamp({ ...t, id: generateUniqueId() }));
    await db.tagihan.bulkPut(withTs);
    return result;
  };

  const onGenerateTagihanAwal = async () => {
    const santriList = await db.santri.filter((s: any) => !s.deleted).toArray();
    const { result, newTagihan } = await generateTagihanAwal(db, settings, santriList);
    const withTs = newTagihan.map(t => addTimestamp({ ...t, id: generateUniqueId() }));
    await db.tagihan.bulkPut(withTs);
    return result;
  };

  const onAddPembayaran = async (data: Omit<Pembayaran, 'id'>, partialAmounts?: Record<number, number>): Promise<Pembayaran> => {
    const id = generateUniqueId();
    const savedPembayaran = addTimestamp({ ...data, id }) as Pembayaran;

    await (db as any).transaction('rw', db.pembayaran, db.tagihan, db.saldoSantri, db.transaksiSaldo, async () => {
        if (data.metode === 'Potong Saldo') {
            const santriSaldo = await db.saldoSantri.get(data.santriId);
            const currentSaldo = santriSaldo ? santriSaldo.saldo : 0;
            if (currentSaldo < data.jumlah) {
                throw new Error(`Saldo uang saku tidak mencukupi (Saldo: Rp ${currentSaldo.toLocaleString('id-ID')}).`);
            }
            const newSaldo = currentSaldo - data.jumlah;
            await db.saldoSantri.put({
                ...(santriSaldo || { santriId: data.santriId }),
                santriId: data.santriId,
                saldo: newSaldo,
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
                        lastModified: Date.now()
                    });
                } else {
                    await db.tagihan.put({
                        ...tagihan,
                        status: 'Lunas',
                        tanggalLunas: data.tanggal,
                        pembayaranId: id,
                        lastModified: Date.now()
                    });
                }
            }
        }
    });

    return savedPembayaran;
  };

  const onAddTransaksiSaldo = async (data: Omit<TransaksiSaldo, 'id' | 'saldoSetelah' | 'tanggal'>) => {
    const santriSaldo = await db.saldoSantri.get(data.santriId);
    const currentSaldo = santriSaldo ? santriSaldo.saldo : 0;
    
    let newSaldo = currentSaldo;
    if (data.jenis === 'Deposit') newSaldo += data.jumlah;
    else newSaldo -= data.jumlah;

    await (db as any).transaction('rw', db.saldoSantri, db.transaksiSaldo, async () => {
        await db.saldoSantri.put({
            ...(santriSaldo || {}),
            santriId: data.santriId,
            saldo: newSaldo,
            lastModified: Date.now()
        });
        await db.transaksiSaldo.put({
            ...data,
            id: generateUniqueId(),
            tanggal: new Date().toISOString(),
            saldoSetelah: newSaldo,
            lastModified: Date.now()
        } as TransaksiSaldo);
    });
  };

  const onUpdateLimitHarian = async (santriId: number, limitHarian: number) => {
      const existing = await db.saldoSantri.get(santriId);
      await db.saldoSantri.put({
          ...(existing || {}),
          santriId,
          saldo: existing ? existing.saldo : 0,
          limitHarian: limitHarian > 0 ? limitHarian : 0,
          lastModified: Date.now()
      });
  };

  const onAddTransaksiKas = async (data: Omit<TransaksiKas, 'id' | 'saldoSetelah' | 'tanggal'> & { tanggal?: string }) => {
      await (db as any).transaction('rw', db.transaksiKas, async () => {
          const targetIso = data.tanggal || new Date().toISOString();
          const lastSaldo = await calculateActiveKasSaldo(targetIso);
          let newSaldo = lastSaldo;
          if (data.jenis === 'Pemasukan') newSaldo += data.jumlah;
          else newSaldo -= data.jumlah;

          await db.transaksiKas.put({
              ...data,
              rekening: data.rekening || 'Kas Tunai Bendahara',
              id: generateUniqueId(),
              tanggal: targetIso,
              saldoSetelah: newSaldo,
              deleted: false,
              lastModified: Date.now()
          } as TransaksiKas);
      });
  };

  const onUpdateTransaksiKas = async (id: number, data: Partial<Omit<TransaksiKas, 'id'>>) => {
      await (db as any).transaction('rw', db.transaksiKas, async () => {
          const existing = await db.transaksiKas.get(id);
          if (!existing) throw new Error('Transaksi tidak ditemukan.');
          const merged = {
              ...existing,
              ...data,
              id,
              rekening: data.rekening || existing.rekening || 'Kas Tunai Bendahara',
          };
          const priorSaldo = await calculateActiveKasSaldo(merged.tanggal, id);
          const updatedSaldo = priorSaldo + (merged.jenis === 'Pemasukan' ? merged.jumlah : -merged.jumlah);
          await db.transaksiKas.put({
              ...merged,
              saldoSetelah: updatedSaldo,
              deleted: false,
              lastModified: Date.now()
          } as TransaksiKas);
      });
  };

  const onDeleteTransaksiKas = async (id: number) => {
      await (db as any).transaction('rw', db.transaksiKas, async () => {
          const existing = await db.transaksiKas.get(id);
          if (!existing) return;
          await db.transaksiKas.put({
              ...existing,
              id,
              deleted: true,
              lastModified: Date.now()
          } as TransaksiKas);
      });
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
  };

  const onSetorKeKas = async (pembayaranIds: number[], total: number, tanggal: string, pj: string, catatan: string, rekeningTujuan: string = 'Kas Tunai Bendahara') => {
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
              id: generateUniqueId(),
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
