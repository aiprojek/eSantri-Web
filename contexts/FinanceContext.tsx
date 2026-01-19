
import React, { createContext, useContext } from 'react';
import { useLiveQuery } from "dexie-react-hooks";
import { Tagihan, Pembayaran, SaldoSantri, TransaksiSaldo, TransaksiKas } from '../types';
import { db } from '../db';
import { generateTagihanBulanan, generateTagihanAwal } from '../services/financeService';
import { useSettingsContext } from '../AppContext';

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

  // Live Queries - Only run when this component is mounted
  // Fix: Use filter instead of where('deleted') because 'deleted' field is not indexed in db.ts
  const tagihanList = useLiveQuery(() => db.tagihan.filter((t: Tagihan) => !t.deleted).toArray(), []) || [];
  const pembayaranList = useLiveQuery(() => db.pembayaran.filter((p: Pembayaran) => !p.deleted).toArray(), []) || [];
  const saldoSantriList = useLiveQuery(() => db.saldoSantri.toArray(), []) || [];
  const transaksiSaldoList = useLiveQuery(() => db.transaksiSaldo.toArray(), []) || [];
  const transaksiKasList = useLiveQuery(() => db.transaksiKas.toArray(), []) || [];

  const addTimestamp = (data: any) => ({ ...data, lastModified: Date.now() });
  const generateUniqueId = () => parseInt(`${Date.now()}${Math.floor(Math.random() * 1000)}`.slice(0, 16));

  const onGenerateTagihanBulanan = async (tahun: number, bulan: number) => {
    // Fetch santri directly from DB to avoid context dependency
    const santriList = await db.santri.filter((s: any) => !s.deleted).toArray();
    const { result, newTagihan } = await generateTagihanBulanan(db, settings, santriList, tahun, bulan);
    const withTs = newTagihan.map(t => addTimestamp({ ...t, id: generateUniqueId() }));
    await db.tagihan.bulkPut(withTs);
    return result;
  };

  const onGenerateTagihanAwal = async () => {
    // Fetch santri directly from DB to avoid context dependency
    const santriList = await db.santri.filter((s: any) => !s.deleted).toArray();
    const { result, newTagihan } = await generateTagihanAwal(db, settings, santriList);
    const withTs = newTagihan.map(t => addTimestamp({ ...t, id: generateUniqueId() }));
    await db.tagihan.bulkPut(withTs);
    return result;
  };

  const onAddPembayaran = async (data: Omit<Pembayaran, 'id'>) => {
    const id = generateUniqueId();
    await db.pembayaran.put(addTimestamp({ ...data, id }) as Pembayaran);
    
    // Update status tagihan
    for (const tid of data.tagihanIds) {
        const tagihan = await db.tagihan.get(tid);
        if (tagihan) {
            await db.tagihan.put({ ...tagihan, status: 'Lunas', tanggalLunas: data.tanggal, pembayaranId: id, lastModified: Date.now() });
        }
    }
  };

  const onAddTransaksiSaldo = async (data: Omit<TransaksiSaldo, 'id' | 'saldoSetelah' | 'tanggal'>) => {
    const currentSaldo = saldoSantriList.find(s => s.santriId === data.santriId)?.saldo || 0;
    let saldoSetelah = currentSaldo;
    if (data.jenis === 'Deposit') saldoSetelah += data.jumlah;
    else {
        if (currentSaldo < data.jumlah) throw new Error('Saldo tidak mencukupi.');
        saldoSetelah -= data.jumlah;
    }
    const id = generateUniqueId();
    await db.transaksiSaldo.put(addTimestamp({ ...data, saldoSetelah, tanggal: new Date().toISOString(), id }) as TransaksiSaldo);
    await db.saldoSantri.put(addTimestamp({ santriId: data.santriId, saldo: saldoSetelah }));
  };

  const onAddTransaksiKas = async (data: Omit<TransaksiKas, 'id' | 'saldoSetelah' | 'tanggal'>) => {
    // Note: This logic assumes chronological insertion. For strict accounting, we might need more complex logic.
    const lastKas = await db.transaksiKas.orderBy('tanggal').last();
    let saldoSetelah = lastKas ? lastKas.saldoSetelah : 0;
    if (data.jenis === 'Pemasukan') saldoSetelah += data.jumlah;
    else saldoSetelah -= data.jumlah;

    const id = generateUniqueId();
    await db.transaksiKas.put(addTimestamp({ ...data, saldoSetelah, tanggal: new Date().toISOString(), id }) as TransaksiKas);
  };

  const onSetorKeKas = async (pembayaranIds: number[], total: number, tanggal: string, pj: string, catatan: string) => {
      await onAddTransaksiKas({
          jenis: 'Pemasukan',
          kategori: 'Setoran Pembayaran Santri',
          deskripsi: catatan,
          jumlah: total,
          penanggungJawab: pj
      });
      
      const payments = await db.pembayaran.bulkGet(pembayaranIds);
      const updated = payments.filter(p => p).map(p => ({ ...p, disetorKeKas: true, lastModified: Date.now() }));
      await db.pembayaran.bulkPut(updated as Pembayaran[]);
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
