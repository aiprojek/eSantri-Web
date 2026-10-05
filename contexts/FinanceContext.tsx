
import React, { createContext, useContext } from 'react';
import { useLiveQuery } from "dexie-react-hooks";
import { Tagihan, Pembayaran, SaldoSantri, TransaksiSaldo, TransaksiKas } from '../types';
import { db } from '../db';
import { generateTagihanBulanan, generateTagihanAwal } from '../services/financeService';
import { useSettingsContext } from './SettingsContext';

interface FinanceContextType {
  tagihanList: Tagihan[];
  pembayaranList: Pembayaran[];
  saldoSantriList: SaldoSantri[];
  transaksiSaldoList: TransaksiSaldo[];
  transaksiKasList: TransaksiKas[];
  onGenerateTagihanBulanan: (tahun: number, bulan: number) => Promise<{ generated: number; skipped: number }>;
  onGenerateTagihanAwal: () => Promise<{ generated: number; skipped: number }>;
  onAddPembayaran: (data: Omit<Pembayaran, 'id'>, partialAmounts?: Record<number, number>) => Promise<Pembayaran>;
  onAddTransaksiSaldo: (data: Omit<TransaksiSaldo, 'id' | 'saldoSetelah' | 'tanggal'>) => Promise<void>;
  onUpdateLimitHarian: (santriId: number, limitHarian: number) => Promise<void>;
  onAddTransaksiKas: (data: Omit<TransaksiKas, 'id' | 'saldoSetelah' | 'tanggal'>) => Promise<void>;
  onMutasiKas: (fromRekening: string, toRekening: string, jumlah: number, deskripsi: string, pj: string) => Promise<void>;
  onSetorKeKas: (pembayaranIds: number[], total: number, tanggal: string, pj: string, catatan: string, rekeningTujuan?: string) => Promise<void>;
}

const FinanceContext = createContext<FinanceContextType | null>(null);

export const FinanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { settings } = useSettingsContext();

  const tagihanList = useLiveQuery(() => db.tagihan.filter((t: Tagihan) => !t.deleted).toArray(), []) || [];
  const pembayaranList = useLiveQuery(() => db.pembayaran.filter((p: Pembayaran) => !p.deleted).toArray(), []) || [];
  const saldoSantriList = useLiveQuery(() => db.saldoSantri.filter((s: any) => !s.deleted).toArray(), []) || [];
  const transaksiSaldoList = useLiveQuery(() => db.transaksiSaldo.filter((t: any) => !t.deleted).toArray(), []) || [];
  const transaksiKasList = useLiveQuery(() => db.transaksiKas.filter((t: TransaksiKas) => !t.deleted).toArray(), []) || [];

  const addTimestamp = (data: any) => ({ ...data, lastModified: Date.now() });
  const idCounterRef = React.useRef(0);
  const generateUniqueId = () => {
    idCounterRef.current = (idCounterRef.current + 1) % 1000;
    return Date.now() * 1000 + idCounterRef.current;
  };

  const calculateActiveKasSaldo = async (): Promise<number> => {
    const allActive = await db.transaksiKas.filter((t: TransaksiKas) => !t.deleted).toArray();
    return allActive.reduce((acc, t) => acc + (t.jenis === 'Pemasukan' ? t.jumlah : -t.jumlah), 0);
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

  const onAddTransaksiKas = async (data: Omit<TransaksiKas, 'id' | 'saldoSetelah' | 'tanggal'>) => {
      await (db as any).transaction('rw', db.transaksiKas, async () => {
          const lastSaldo = await calculateActiveKasSaldo();
          let newSaldo = lastSaldo;
          if (data.jenis === 'Pemasukan') newSaldo += data.jumlah;
          else newSaldo -= data.jumlah;

          await db.transaksiKas.put({
              ...data,
              rekening: data.rekening || 'Kas Tunai Bendahara',
              id: generateUniqueId(),
              tanggal: new Date().toISOString(),
              saldoSetelah: newSaldo,
              lastModified: Date.now()
          } as TransaksiKas);
      });
  };

  const onMutasiKas = async (fromRekening: string, toRekening: string, jumlah: number, deskripsi: string, pj: string) => {
      await (db as any).transaction('rw', db.transaksiKas, async () => {
          const nowIso = new Date().toISOString();
          const currentTotalSaldo = await calculateActiveKasSaldo();

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
              lastModified: Date.now()
          } as TransaksiKas);

          const inId = generateUniqueId();
          await db.transaksiKas.put({
              id: inId,
              tanggal: new Date(Date.now() + 10).toISOString(),
              jenis: 'Pemasukan',
              kategori: 'Mutasi Kas Masuk',
              deskripsi: `[Mutasi dari ${fromRekening}] ${deskripsi}`,
              jumlah,
              saldoSetelah: currentTotalSaldo,
              penanggungJawab: pj,
              rekening: toRekening,
              lastModified: Date.now() + 1
          } as TransaksiKas);
      });
  };

  const onSetorKeKas = async (pembayaranIds: number[], total: number, tanggal: string, pj: string, catatan: string, rekeningTujuan: string = 'Kas Tunai Bendahara') => {
      await (db as any).transaction('rw', db.pembayaran, db.transaksiKas, async () => {
          // 1. Mark payments as deposited
          for(const pid of pembayaranIds) {
              await db.pembayaran.update(pid, { disetorKeKas: true, lastModified: Date.now() });
          }

          // 2. Add Kas Entry
          const lastSaldo = await calculateActiveKasSaldo();
          const newSaldo = lastSaldo + total;

          await db.transaksiKas.put({
              id: generateUniqueId(),
              tanggal: tanggal || new Date().toISOString(),
              jenis: 'Pemasukan',
              kategori: 'Setoran Pembayaran Santri',
              deskripsi: catatan,
              jumlah: total,
              saldoSetelah: newSaldo,
              penanggungJawab: pj,
              rekening: rekeningTujuan,
              lastModified: Date.now()
          } as TransaksiKas);
      });
  };

  return (
    <FinanceContext.Provider value={{
      tagihanList,
      pembayaranList,
      saldoSantriList,
      transaksiSaldoList,
      transaksiKasList,
      onGenerateTagihanBulanan,
      onGenerateTagihanAwal,
      onAddPembayaran,
      onAddTransaksiSaldo,
      onUpdateLimitHarian,
      onAddTransaksiKas,
      onMutasiKas,
      onSetorKeKas
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
