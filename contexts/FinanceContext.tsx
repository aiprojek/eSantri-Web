
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
  onAddPembayaran: (data: Omit<Pembayaran, 'id'>) => Promise<void>;
  onAddTransaksiSaldo: (data: Omit<TransaksiSaldo, 'id' | 'saldoSetelah' | 'tanggal'>) => Promise<void>;
  onAddTransaksiKas: (data: Omit<TransaksiKas, 'id' | 'saldoSetelah' | 'tanggal'>) => Promise<void>;
  onSetorKeKas: (pembayaranIds: number[], total: number, tanggal: string, pj: string, catatan: string) => Promise<void>;
}

const FinanceContext = createContext<FinanceContextType | null>(null);

export const FinanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { settings } = useSettingsContext();

  const tagihanList = useLiveQuery(() => db.tagihan.filter((t: Tagihan) => !t.deleted).toArray(), []) || [];
  const pembayaranList = useLiveQuery(() => db.pembayaran.filter((p: Pembayaran) => !p.deleted).toArray(), []) || [];
  const saldoSantriList = useLiveQuery(() => db.saldoSantri.toArray(), []) || [];
  const transaksiSaldoList = useLiveQuery(() => db.transaksiSaldo.toArray(), []) || [];
  const transaksiKasList = useLiveQuery(() => db.transaksiKas.toArray(), []) || [];

  const addTimestamp = (data: any) => ({ ...data, lastModified: Date.now() });
  const generateUniqueId = () => parseInt(`${Date.now()}${Math.floor(Math.random() * 1000)}`.slice(0, 16));

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

  const onAddPembayaran = async (data: Omit<Pembayaran, 'id'>) => {
    const id = generateUniqueId();
    await db.pembayaran.put(addTimestamp({ ...data, id }) as Pembayaran);
    
    for (const tid of data.tagihanIds) {
        const tagihan = await db.tagihan.get(tid);
        if (tagihan) {
            await db.tagihan.put({ ...tagihan, status: 'Lunas', tanggalLunas: data.tanggal, pembayaranId: id, lastModified: Date.now() });
        }
    }
  };

  const onAddTransaksiSaldo = async (data: Omit<TransaksiSaldo, 'id' | 'saldoSetelah' | 'tanggal'>) => {
    const santriSaldo = await db.saldoSantri.get(data.santriId);
    const currentSaldo = santriSaldo ? santriSaldo.saldo : 0;
    
    let newSaldo = currentSaldo;
    if (data.jenis === 'Deposit') newSaldo += data.jumlah;
    else newSaldo -= data.jumlah;

    await (db as any).transaction('rw', db.saldoSantri, db.transaksiSaldo, async () => {
        await db.saldoSantri.put({ santriId: data.santriId, saldo: newSaldo, lastModified: Date.now() });
        await db.transaksiSaldo.add({
            ...data,
            id: generateUniqueId(),
            tanggal: new Date().toISOString(),
            saldoSetelah: newSaldo,
            lastModified: Date.now()
        } as TransaksiSaldo);
    });
  };

  const onAddTransaksiKas = async (data: Omit<TransaksiKas, 'id' | 'saldoSetelah' | 'tanggal'>) => {
      const lastTx = await db.transaksiKas.orderBy('tanggal').last();
      const lastSaldo = lastTx ? lastTx.saldoSetelah : 0;
      let newSaldo = lastSaldo;
      if (data.jenis === 'Pemasukan') newSaldo += data.jumlah;
      else newSaldo -= data.jumlah;

      await db.transaksiKas.add({
          ...data,
          id: generateUniqueId(),
          tanggal: new Date().toISOString(),
          saldoSetelah: newSaldo,
          lastModified: Date.now()
      } as TransaksiKas);
  };

  const onSetorKeKas = async (pembayaranIds: number[], total: number, tanggal: string, pj: string, catatan: string) => {
      await (db as any).transaction('rw', db.pembayaran, db.transaksiKas, async () => {
          // 1. Mark payments as deposited
          for(const pid of pembayaranIds) {
              await db.pembayaran.update(pid, { disetorKeKas: true, lastModified: Date.now() });
          }

          // 2. Add Kas Entry
          const lastTx = await db.transaksiKas.orderBy('tanggal').last();
          const lastSaldo = lastTx ? lastTx.saldoSetelah : 0;
          const newSaldo = lastSaldo + total;

          await db.transaksiKas.add({
              id: generateUniqueId(),
              tanggal: tanggal || new Date().toISOString(),
              jenis: 'Pemasukan',
              kategori: 'Setoran Pembayaran Santri',
              deskripsi: catatan,
              jumlah: total,
              saldoSetelah: newSaldo,
              penanggungJawab: pj,
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
      onAddTransaksiKas,
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
