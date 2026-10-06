import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../../db';
import { TransaksiKoperasi } from '../../../types';
import { formatRupiah } from '../../../utils/formatters';
import { useAppContext } from '../../../AppContext';
import { useFinanceContext } from '../../../contexts/FinanceContext';
import { generateKoperasiId } from '../Shared';

interface KasbonDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    transaction: TransaksiKoperasi | null;
}

export const KasbonDetailModal: React.FC<KasbonDetailModalProps> = ({ isOpen, onClose, transaction }) => {
    const { showToast, currentUser } = useAppContext();
    const { saldoSantriList } = useFinanceContext();
    const [bayarAmount, setBayarAmount] = useState<string>('');
    const [metode, setMetode] = useState<'Tunai' | 'Tabungan' | 'Non-Tunai'>('Tunai');
    const [catatan, setCatatan] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Fetch payment history for this transaction
    const history = useLiveQuery(async () => {
        if (!transaction) return [];
        const list = await db.pembayaranHutang.where('transaksiId').equals(transaction.id).toArray();
        return list.filter(p => !p.deleted);
    }, [transaction]);

    if (!isOpen || !transaction) return null;

    const sisaTagihan = transaction.sisaTagihan ?? transaction.totalFinal;
    const isLunas = sisaTagihan <= 0;

    // Check Santri Balance if buyer is Santri
    const santriBalance = transaction.tipePembeli === 'Santri' && transaction.pembeliId
        ? (saldoSantriList.find(s => s.santriId === transaction.pembeliId)?.saldo || 0)
        : 0;

    const handlePay = async (e: React.FormEvent) => {
        e.preventDefault();
        const amount = parseFloat(bayarAmount);
        
        if (!amount || amount <= 0) {
            showToast('Masukkan nominal pembayaran yang valid.', 'error');
            return;
        }
        if (amount > sisaTagihan) {
            showToast('Nominal melebihi sisa hutang!', 'error');
            return;
        }
        if (metode === 'Tabungan') {
            if (transaction.tipePembeli !== 'Santri' || !transaction.pembeliId) {
                showToast('Metode Tabungan hanya untuk Santri.', 'error');
                return;
            }
            if (santriBalance < amount) {
                showToast('Saldo tabungan santri tidak mencukupi.', 'error');
                return;
            }
        }

        setIsSubmitting(true);
        try {
            const now = Date.now();
            const nowIso = new Date().toISOString();
            const operatorName = currentUser?.fullName || 'Admin';

            await (db as any).transaction('rw', [db.transaksiKoperasi, db.pembayaranHutang, db.keuanganKoperasi, db.saldoSantri, db.transaksiSaldo, db.produkKoperasi], async () => {
                // 1. Record Payment History
                await db.pembayaranHutang.put({
                    id: generateKoperasiId(),
                    transaksiId: transaction.id,
                    tanggal: nowIso,
                    jumlah: amount,
                    metode: metode,
                    operator: operatorName,
                    catatan: catatan,
                    deleted: false,
                    lastModified: now
                } as any);

                // 2. Update Transaction Status
                const newSisa = sisaTagihan - amount;
                const newStatus = newSisa <= 0 ? 'Lunas' : 'Belum Lunas';
                const currentTrans = await db.transaksiKoperasi.get(transaction.id);
                if (currentTrans) {
                    await db.transaksiKoperasi.put({
                        ...currentTrans,
                        sisaTagihan: newSisa,
                        statusTransaksi: newStatus,
                        bayar: (currentTrans.bayar || 0) + amount,
                        lastModified: now
                    });
                }

                // 3. Deduct Santri Balance if using Tabungan
                if (metode === 'Tabungan' && transaction.pembeliId) {
                    const currentSaldo = await db.saldoSantri.get(transaction.pembeliId);
                    const newBalance = (currentSaldo?.saldo || 0) - amount;
                    await db.saldoSantri.put({
                        santriId: transaction.pembeliId,
                        saldo: newBalance,
                        limitHarian: currentSaldo?.limitHarian,
                        lastModified: now
                    });
                    await db.transaksiSaldo.put({
                        id: generateKoperasiId(),
                        santriId: transaction.pembeliId,
                        tanggal: nowIso,
                        jenis: 'Penarikan',
                        jumlah: amount,
                        saldoSetelah: newBalance,
                        keterangan: `Bayar Kasbon Koperasi #${transaction.id}`,
                        operator: operatorName,
                        deleted: false,
                        lastModified: now
                    } as any);
                }

                // 4. Record Income to Keuangan Koperasi (Tagged by metode so Cash vs Tabungan is separated)
                let totalEstProfit = 0;
                for (const item of transaction.items) {
                    const prod = await db.produkKoperasi.get(item.produkId);
                    const cost = prod ? prod.hargaBeli : (item.harga * 0.8);
                    totalEstProfit += (item.harga - cost) * item.qty;
                }
                if (transaction.potonganDiskon) totalEstProfit -= transaction.potonganDiskon;

                const paymentRatio = amount / transaction.totalFinal;
                const realizedProfit = Math.round(totalEstProfit * paymentRatio);

                await db.keuanganKoperasi.put({
                    id: generateKoperasiId(),
                    tanggal: nowIso,
                    jenis: 'Pemasukan',
                    kategori: 'Pelunasan Hutang',
                    deskripsi: `Cicilan/Pelunasan Nota #${transaction.id} (${transaction.namaPembeli}) - ${metode}`,
                    jumlah: amount,
                    laba: realizedProfit,
                    metode: metode === 'Tabungan' ? 'Non-Tunai (Tabungan)' : metode === 'Non-Tunai' ? 'Transfer' : 'Tunai',
                    transaksiId: transaction.id,
                    operator: operatorName,
                    deleted: false,
                    lastModified: now
                } as any);
            });

            showToast('Pembayaran berhasil dicatat!', 'success');
            setBayarAmount('');
            setCatatan('');
            if (sisaTagihan - amount <= 0) {
                onClose();
            }
        } catch (error: any) {
            showToast(error.message || 'Gagal memproses pembayaran.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[80] flex justify-center items-end sm:items-center p-0 sm:p-4">
            <div className="bg-white rounded-t-2xl sm:rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[90vh]">
                <div className="p-4 bg-red-700 text-white flex justify-between items-center shrink-0">
                    <div>
                        <h3 className="font-bold text-base sm:text-lg">Detail Kasbon / Hutang</h3>
                        <p className="text-xs text-red-100 tabular-nums">Nota #{transaction.id.toString().slice(-6)} · {new Date(transaction.tanggal).toLocaleDateString('id-ID')}</p>
                    </div>
                    <button onClick={onClose} className="w-9 h-9 rounded-lg hover:bg-white/10 flex items-center justify-center"><i className="bi bi-x-lg"></i></button>
                </div>

                <div className="flex-grow overflow-y-auto p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
                    {/* Left: Transaction Info & History */}
                    <div className="space-y-4">
                        <div className="bg-gray-50 p-3 rounded-lg border">
                            <div className="text-xs text-gray-500 uppercase font-bold">Peminjam</div>
                            <div className="font-bold text-gray-800 text-lg">{transaction.namaPembeli}</div>
                            <span className="text-[10px] bg-gray-200 px-2 py-0.5 rounded text-gray-700">{transaction.tipePembeli}</span>
                            {transaction.catatanPembayaran && (
                                <div className="mt-2 text-xs text-gray-600 italic border-t pt-1">
                                    Catatan: "{transaction.catatanPembayaran}"
                                </div>
                            )}
                        </div>

                        <div>
                            <h4 className="font-bold text-xs text-gray-500 uppercase mb-2">Item Dibeli</h4>
                            <div className="bg-white border rounded-lg max-h-32 overflow-y-auto divide-y text-xs">
                                {transaction.items.map((item, idx) => (
                                    <div key={idx} className="p-2 flex justify-between">
                                        <span>{item.qty}x {item.nama}</span>
                                        <span className="font-medium">{formatRupiah(item.subtotal)}</span>
                                    </div>
                                ))}
                            </div>
                            <div className="flex justify-between font-bold text-sm mt-2 px-1">
                                <span>Total Awal:</span>
                                <span>{formatRupiah(transaction.totalFinal)}</span>
                            </div>
                        </div>

                        <div>
                            <h4 className="font-bold text-xs text-gray-500 uppercase mb-2">Riwayat Cicilan</h4>
                            <div className="bg-white border rounded-lg max-h-40 overflow-y-auto divide-y text-xs">
                                {history && history.length > 0 ? history.map((h) => (
                                    <div key={h.id} className="p-2">
                                        <div className="flex justify-between font-bold text-gray-700">
                                            <span>{new Date(h.tanggal).toLocaleDateString('id-ID')}</span>
                                            <span className="text-green-600">{formatRupiah(h.jumlah)}</span>
                                        </div>
                                        <div className="flex justify-between text-[10px] text-gray-500 mt-0.5">
                                            <span>Via: {h.metode} ({h.operator})</span>
                                            <span>{h.catatan}</span>
                                        </div>
                                    </div>
                                )) : (
                                    <div className="p-4 text-center text-gray-400">Belum ada pembayaran cicilan.</div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right: Payment Form */}
                    <div className="flex flex-col justify-between bg-gray-50 p-4 rounded-xl border">
                        {!isLunas ? (
                            <form onSubmit={handlePay} className="space-y-4">
                                <div className="text-center p-3 bg-red-100 rounded-lg border border-red-200 text-red-900">
                                    <div className="text-xs uppercase font-bold">Sisa Tagihan</div>
                                    <div className="text-2xl font-black">{formatRupiah(sisaTagihan)}</div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Metode Bayar</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {(['Tunai', 'Tabungan', 'Non-Tunai'] as const).map(m => (
                                            <button
                                                type="button"
                                                key={m}
                                                disabled={m === 'Tabungan' && transaction.tipePembeli !== 'Santri'}
                                                onClick={() => setMetode(m)}
                                                className={`py-1.5 text-xs font-bold rounded border ${metode === m ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-gray-600 hover:bg-gray-100'} ${m === 'Tabungan' && transaction.tipePembeli !== 'Santri' ? 'opacity-50 cursor-not-allowed' : ''}`}
                                            >
                                                {m}
                                            </button>
                                        ))}
                                    </div>
                                    {metode === 'Tabungan' && (
                                        <div className="text-xs text-blue-600 mt-1 font-medium">
                                            Saldo Santri: {formatRupiah(santriBalance)}
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Nominal Bayar</label>
                                    <div className="relative">
                                        <input 
                                            type="number" 
                                            value={bayarAmount} 
                                            onChange={e => setBayarAmount(e.target.value)} 
                                            className="w-full border rounded-lg p-2.5 text-lg font-bold text-right pr-20" 
                                            placeholder="0"
                                            max={sisaTagihan}
                                        />
                                        <button 
                                            type="button" 
                                            onClick={() => setBayarAmount(sisaTagihan.toString())}
                                            className="absolute right-2 top-2 bottom-2 px-2 bg-gray-200 hover:bg-gray-300 text-xs font-bold rounded text-gray-700"
                                        >
                                            LUNASI
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Catatan</label>
                                    <input 
                                        type="text" 
                                        value={catatan} 
                                        onChange={e => setCatatan(e.target.value)} 
                                        className="w-full border rounded-lg p-2 text-sm bg-white" 
                                        placeholder="Keterangan cicilan..."
                                    />
                                </div>

                                <button 
                                    type="submit" 
                                    disabled={isSubmitting}
                                    className="w-full py-3 bg-teal-600 text-white font-bold rounded-lg shadow hover:bg-teal-700 disabled:bg-gray-400 mt-4"
                                >
                                    {isSubmitting ? 'Memproses...' : 'Simpan Pembayaran'}
                                </button>
                            </form>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-center py-8">
                                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-3xl mb-3">
                                    <i className="bi bi-check-lg"></i>
                                </div>
                                <h3 className="font-bold text-lg text-green-800">HUTANG LUNAS</h3>
                                <p className="text-xs text-gray-500">Seluruh tagihan pada nota ini telah diselesaikan.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
