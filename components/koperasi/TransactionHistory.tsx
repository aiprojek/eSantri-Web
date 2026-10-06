import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { useAppContext } from '../../AppContext';
import { TransaksiKoperasi } from '../../types';
import { formatRupiah } from '../../utils/formatters';
import { printThermalReceipt, generateKoperasiId } from './Shared';
import { exportToExcel } from '../../utils/exportUtils';

export const TransactionHistory: React.FC = () => {
    const { settings: pondokSettings, currentUser, showToast } = useAppContext();
    const transactions = useLiveQuery(() => db.transaksiKoperasi.filter(t => !t.deleted).reverse().toArray(), [], []);
    
    // Filters
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
    const [paymentFilter, setPaymentFilter] = useState('All');
    const [statusFilter, setStatusFilter] = useState('All');
    const [search, setSearch] = useState('');

    // Void / Return Modal State
    const [voidTarget, setVoidTarget] = useState<TransaksiKoperasi | null>(null);
    const [alasanBatal, setAlasanBatal] = useState('');
    const [isVoiding, setIsVoiding] = useState(false);

    const filteredTransactions = useMemo(() => {
        return transactions.filter(t => {
            const tDate = t.tanggal.split('T')[0];
            const matchDate = (!startDate || tDate >= startDate) && (!endDate || tDate <= endDate);
            const matchPayment = paymentFilter === 'All' || t.metodePembayaran === paymentFilter;
            const matchStatus = statusFilter === 'All' || t.statusTransaksi === statusFilter;
            const matchSearch = !search || t.namaPembeli.toLowerCase().includes(search.toLowerCase()) || t.id.toString().includes(search);
            return matchDate && matchPayment && matchStatus && matchSearch;
        });
    }, [transactions, startDate, endDate, paymentFilter, statusFilter, search]);

    const activeFiltered = useMemo(() => filteredTransactions.filter(t => t.statusTransaksi !== 'Dibatalkan'), [filteredTransactions]);

    const summary = useMemo(() => {
        return activeFiltered.reduce((acc, curr) => {
            acc.totalCount += 1;
            acc.totalOmzet += curr.totalFinal;
            if (curr.metodePembayaran === 'Tunai') acc.tunai += curr.totalFinal;
            else if (curr.metodePembayaran === 'Tabungan') acc.tabungan += curr.totalFinal;
            else if (curr.metodePembayaran === 'Hutang') acc.hutang += (curr.sisaTagihan ?? curr.totalFinal);
            else acc.nonTunai += curr.totalFinal;
            return acc;
        }, { totalCount: 0, totalOmzet: 0, tunai: 0, tabungan: 0, nonTunai: 0, hutang: 0 });
    }, [activeFiltered]);

    const handleReprint = (t: TransaksiKoperasi) => {
        printThermalReceipt(t, pondokSettings, showToast);
    };

    const handleExport = () => {
        const data = filteredTransactions.map(t => ({
            'ID': t.id,
            'Tanggal': new Date(t.tanggal).toLocaleString('id-ID'),
            'Pembeli': t.namaPembeli,
            'Tipe': t.tipePembeli,
            'Metode Bayar': t.metodePembayaran,
            'Status': t.statusTransaksi,
            'Total Belanja': t.totalBelanja,
            'Diskon': t.potonganDiskon || 0,
            'Total Akhir': t.totalFinal,
            'Sisa Hutang': t.sisaTagihan || 0,
            'Kasir': t.kasir,
            'Item': t.items.map(i => `${i.nama} (${i.qty})`).join(', '),
            'Keterangan Batal': t.alasanBatal || ''
        }));
        exportToExcel(data, `Laporan_Penjualan_${startDate}_${endDate}`);
    };

    const handleConfirmVoid = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!voidTarget) return;
        if (!alasanBatal.trim()) {
            showToast('Alasan pembatalan/retur wajib diisi.', 'error');
            return;
        }

        setIsVoiding(true);
        try {
            const now = Date.now();
            const nowIso = new Date().toISOString();
            const operatorName = currentUser?.fullName || currentUser?.username || 'Admin';

            await (db as any).transaction('rw', [db.transaksiKoperasi, db.produkKoperasi, db.riwayatStok, db.saldoSantri, db.transaksiSaldo, db.keuanganKoperasi, db.pembayaranHutang], async () => {
                // 1. Update transaction status to Dibatalkan
                await db.transaksiKoperasi.put({
                    ...voidTarget,
                    statusTransaksi: 'Dibatalkan',
                    sisaTagihan: 0,
                    alasanBatal: alasanBatal.trim(),
                    dibatalkanOleh: operatorName,
                    tanggalBatal: nowIso,
                    lastModified: now
                });

                // 2. Restore Stock (Total, Variant, and Warehouse)
                for (const item of voidTarget.items) {
                    const prod = await db.produkKoperasi.get(item.produkId);
                    if (prod) {
                        let updatedVarian = prod.varian ? [...prod.varian] : undefined;
                        let newStok = prod.stok + item.qty;

                        if (item.varian && prod.hasVarian && updatedVarian) {
                            const vIdx = updatedVarian.findIndex(v => v.nama === item.varian);
                            if (vIdx > -1) {
                                updatedVarian[vIdx] = {
                                    ...updatedVarian[vIdx],
                                    stok: updatedVarian[vIdx].stok + item.qty
                                };
                                newStok = updatedVarian.reduce((sum, v) => sum + v.stok, 0);
                            }
                        }

                        let updatedWarehouseStocks = prod.warehouseStocks ? { ...prod.warehouseStocks } : undefined;
                        if (voidTarget.warehouseId && updatedWarehouseStocks && updatedWarehouseStocks[voidTarget.warehouseId] !== undefined) {
                            updatedWarehouseStocks[voidTarget.warehouseId] += item.qty;
                        }

                        await db.produkKoperasi.put({
                            ...prod,
                            stok: newStok,
                            varian: updatedVarian,
                            warehouseStocks: updatedWarehouseStocks,
                            lastModified: now
                        });

                        await db.riwayatStok.put({
                            id: generateKoperasiId(),
                            produkId: prod.id,
                            warehouseId: voidTarget.warehouseId,
                            tanggal: nowIso,
                            tipe: 'Retur',
                            jumlah: item.qty,
                            stokAwal: prod.stok,
                            stokAkhir: newStok,
                            keterangan: `Retur/Batal Nota #${voidTarget.id}: ${alasanBatal.trim()}`,
                            operator: operatorName,
                            varian: item.varian,
                            deleted: false,
                            lastModified: now
                        });
                    }
                }

                // 3. Refund Santri Tabungan if paid via Tabungan (or reverse kembalianMasukSaldo if Tunai)
                if (voidTarget.tipePembeli === 'Santri' && voidTarget.pembeliId) {
                    const currentSaldo = await db.saldoSantri.get(voidTarget.pembeliId);
                    let balance = currentSaldo ? currentSaldo.saldo : 0;

                    if (voidTarget.metodePembayaran === 'Tabungan') {
                        const newBalance = balance + voidTarget.totalFinal;
                        await db.saldoSantri.put({
                            santriId: voidTarget.pembeliId,
                            saldo: newBalance,
                            limitHarian: currentSaldo?.limitHarian,
                            lastModified: now
                        });
                        await db.transaksiSaldo.put({
                            id: generateKoperasiId(),
                            santriId: voidTarget.pembeliId,
                            tanggal: nowIso,
                            jenis: 'Deposit',
                            jumlah: voidTarget.totalFinal,
                            saldoSetelah: newBalance,
                            keterangan: `Refund Pembatalan Belanja Koperasi #${voidTarget.id} (${alasanBatal.trim()})`,
                            operator: operatorName,
                            deleted: false,
                            lastModified: now
                        } as any);
                    } else if (voidTarget.metodePembayaran === 'Tunai' && voidTarget.kembalianMasukSaldo && voidTarget.kembali && voidTarget.kembali > 0) {
                        const newBalance = Math.max(0, balance - voidTarget.kembali);
                        await db.saldoSantri.put({
                            santriId: voidTarget.pembeliId,
                            saldo: newBalance,
                            limitHarian: currentSaldo?.limitHarian,
                            lastModified: now
                        });
                        await db.transaksiSaldo.put({
                            id: generateKoperasiId(),
                            santriId: voidTarget.pembeliId,
                            tanggal: nowIso,
                            jenis: 'Penarikan',
                            jumlah: voidTarget.kembali,
                            saldoSetelah: newBalance,
                            keterangan: `Koreksi Kembalian Batal Belanja #${voidTarget.id}`,
                            operator: operatorName,
                            deleted: false,
                            lastModified: now
                        } as any);
                    }
                }

                // 4. Soft-delete related KeuanganKoperasi entries so revenue & profit are reversed cleanly
                const relatedKeuangan = await db.keuanganKoperasi
                    .filter(k => !k.deleted && (k.transaksiId === voidTarget.id || k.deskripsi.includes(`#${voidTarget.id}`)))
                    .toArray();
                for (const k of relatedKeuangan) {
                    await db.keuanganKoperasi.put({
                        ...k,
                        deleted: true,
                        lastModified: now
                    });
                }

                // 5. Soft-delete related PembayaranHutang entries if any
                const relatedHutangPayments = await db.pembayaranHutang
                    .filter(p => !p.deleted && p.transaksiId === voidTarget.id)
                    .toArray();
                for (const p of relatedHutangPayments) {
                    await db.pembayaranHutang.put({
                        ...p,
                        deleted: true,
                        lastModified: now
                    });
                }
            });

            showToast(`Transaksi #${voidTarget.id.toString().slice(-6)} berhasil dibatalkan & stok dikembalikan.`, 'success');
            setVoidTarget(null);
            setAlasanBatal('');
        } catch (err: any) {
            showToast(err.message || 'Gagal membatalkan transaksi.', 'error');
        } finally {
            setIsVoiding(false);
        }
    };

    return (
        <div className="space-y-4 sm:space-y-6">
            {/* Filter Bar */}
            <div className="bg-white p-3.5 sm:p-4 rounded-xl shadow-xs border border-slate-200 flex flex-col lg:flex-row gap-3 lg:items-end justify-between">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:flex lg:flex-wrap gap-3 items-end flex-grow">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Dari Tanggal</label>
                        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full border border-slate-300 rounded-lg p-2 min-h-[40px] text-xs sm:text-sm"/>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Sampai Tanggal</label>
                        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full border border-slate-300 rounded-lg p-2 min-h-[40px] text-xs sm:text-sm"/>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Metode Bayar</label>
                        <select value={paymentFilter} onChange={e => setPaymentFilter(e.target.value)} className="w-full border border-slate-300 rounded-lg p-2 min-h-[40px] text-xs sm:text-sm bg-white">
                            <option value="All">Semua Metode</option>
                            <option value="Tunai">Tunai</option>
                            <option value="Tabungan">Tabungan Santri</option>
                            <option value="Non-Tunai">Non-Tunai / QRIS</option>
                            <option value="Hutang">Kasbon / Hutang</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Status Nota</label>
                        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="w-full border border-slate-300 rounded-lg p-2 min-h-[40px] text-xs sm:text-sm bg-white">
                            <option value="All">Semua Status</option>
                            <option value="Lunas">Lunas</option>
                            <option value="Belum Lunas">Belum Lunas (Hutang)</option>
                            <option value="Dibatalkan">Dibatalkan / Retur</option>
                        </select>
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                        <label className="block text-xs font-bold text-slate-500 mb-1">Cari Pembeli / ID</label>
                        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Nama / No Struk..." className="w-full border border-slate-300 rounded-lg p-2 min-h-[40px] text-sm"/>
                    </div>
                </div>
                <button onClick={handleExport} className="w-full lg:w-auto min-h-[40px] bg-emerald-600 text-white px-4 py-2 rounded-lg text-xs sm:text-sm font-bold flex items-center justify-center gap-2 hover:bg-emerald-700 shrink-0">
                    <i className="bi bi-file-earmark-spreadsheet"></i> Export Excel
                </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
                <div className="col-span-2 lg:col-span-1 bg-teal-600 text-white p-4 rounded-xl shadow-xs">
                    <div className="text-xs opacity-85">Total Omzet Bersih</div>
                    <div className="text-xl font-bold mt-1 tabular-nums">{formatRupiah(summary.totalOmzet)}</div>
                    <div className="text-xs mt-1 opacity-90 tabular-nums">{summary.totalCount} Transaksi Aktif</div>
                </div>
                <div className="bg-white p-3.5 sm:p-4 rounded-xl shadow-xs border border-slate-200 border-l-4 border-l-emerald-500">
                    <div className="text-xs text-slate-500 font-semibold">Penjualan Tunai</div>
                    <div className="text-base sm:text-lg font-bold text-slate-800 mt-1 tabular-nums">{formatRupiah(summary.tunai)}</div>
                </div>
                <div className="bg-white p-3.5 sm:p-4 rounded-xl shadow-xs border border-slate-200 border-l-4 border-l-blue-500">
                    <div className="text-xs text-slate-500 font-semibold">Potong Tabungan</div>
                    <div className="text-base sm:text-lg font-bold text-slate-800 mt-1 tabular-nums">{formatRupiah(summary.tabungan)}</div>
                </div>
                <div className="bg-white p-3.5 sm:p-4 rounded-xl shadow-xs border border-slate-200 border-l-4 border-l-purple-500">
                    <div className="text-xs text-slate-500 font-semibold">Transfer / QRIS</div>
                    <div className="text-base sm:text-lg font-bold text-slate-800 mt-1 tabular-nums">{formatRupiah(summary.nonTunai)}</div>
                </div>
                <div className="bg-white p-3.5 sm:p-4 rounded-xl shadow-xs border border-slate-200 border-l-4 border-l-red-500">
                    <div className="text-xs text-slate-500 font-semibold">Piutang / Kasbon</div>
                    <div className="text-base sm:text-lg font-bold text-red-600 mt-1 tabular-nums">{formatRupiah(summary.hutang)}</div>
                </div>
            </div>

            {/* Desktop Transaction Table */}
            <div className="hidden md:block bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-600 text-xs border-b border-slate-200">
                            <tr>
                                <th className="p-3">No. Struk</th>
                                <th className="p-3">Waktu</th>
                                <th className="p-3">Pembeli</th>
                                <th className="p-3">Detail Item</th>
                                <th className="p-3 text-right">Total</th>
                                <th className="p-3 text-center">Metode & Status</th>
                                <th className="p-3">Kasir</th>
                                <th className="p-3 text-center">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredTransactions.map(t => {
                                const isVoid = t.statusTransaksi === 'Dibatalkan';
                                return (
                                <tr key={t.id} className={`hover:bg-slate-50 ${isVoid ? 'bg-red-50/30 text-slate-400' : ''}`}>
                                    <td className="p-3 font-mono text-xs font-bold tabular-nums">
                                        #{t.id.toString().slice(-6)}
                                    </td>
                                    <td className="p-3 text-slate-500 text-xs tabular-nums">{new Date(t.tanggal).toLocaleString('id-ID')}</td>
                                    <td className="p-3">
                                        <div className={`font-medium ${isVoid ? 'line-through text-slate-500' : 'text-slate-900'}`}>{t.namaPembeli}</div>
                                        <div className="text-xs text-slate-500">{t.tipePembeli}</div>
                                    </td>
                                    <td className="p-3">
                                        <div className="text-xs text-slate-600 max-w-xs break-words">
                                            {t.items.map(i => `${i.nama} (x${i.qty})`).join(', ')}
                                        </div>
                                        {t.potonganDiskon ? <span className="text-[11px] text-emerald-600 font-bold tabular-nums">Diskon: -{formatRupiah(t.potonganDiskon)}</span> : null}
                                        {isVoid && (
                                            <div className="text-[11px] text-red-600 font-medium mt-1">
                                                <i className="bi bi-arrow-return-left mr-1"></i>
                                                Batal: {t.alasanBatal} (Oleh: {t.dibatalkanOleh})
                                            </div>
                                        )}
                                    </td>
                                    <td className={`p-3 text-right font-bold tabular-nums ${isVoid ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                                        {formatRupiah(t.totalFinal)}
                                    </td>
                                    <td className="p-3 text-center text-xs">
                                        <div className="font-semibold text-slate-700">{t.metodePembayaran}</div>
                                        {isVoid ? (
                                            <div className="text-[11px] font-bold text-red-600">Dibatalkan</div>
                                        ) : t.statusTransaksi === 'Belum Lunas' ? (
                                            <div className="text-[11px] font-bold text-amber-700 tabular-nums">Sisa: {formatRupiah(t.sisaTagihan || 0)}</div>
                                        ) : (
                                            <div className="text-[11px] text-emerald-600">Lunas</div>
                                        )}
                                    </td>
                                    <td className="p-3 text-xs text-slate-500">{t.kasir}</td>
                                    <td className="p-3 text-center">
                                        <div className="flex items-center justify-center gap-1.5">
                                            <button onClick={() => handleReprint(t)} className="w-9 h-9 text-slate-600 hover:text-teal-600 border border-slate-200 rounded-lg hover:bg-slate-100 flex items-center justify-center" title="Cetak Ulang Struk">
                                                <i className="bi bi-printer-fill"></i>
                                            </button>
                                            {!isVoid && (
                                                <button
                                                    onClick={() => { setVoidTarget(t); setAlasanBatal(''); }}
                                                    className="w-9 h-9 text-red-600 hover:text-red-700 border border-red-200 rounded-lg hover:bg-red-50 flex items-center justify-center"
                                                    title="Batalkan / Retur Transaksi (Kembalikan Stok & Saldo)"
                                                >
                                                    <i className="bi bi-arrow-counterclockwise"></i>
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            )})}
                            {filteredTransactions.length === 0 && (
                                <tr><td colSpan={8} className="p-8 text-center text-slate-400">Tidak ada data transaksi pada periode ini.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Mobile Transaction Cards */}
            <div className="md:hidden space-y-3">
                {filteredTransactions.map(t => {
                    const isVoid = t.statusTransaksi === 'Dibatalkan';
                    return (
                        <div key={t.id} className={`bg-white rounded-xl border p-3.5 shadow-2xs space-y-2.5 ${isVoid ? 'border-red-200 bg-red-50/20' : 'border-slate-200'}`}>
                            <div className="flex justify-between items-start gap-2">
                                <div>
                                    <div className="text-xs text-slate-500 font-mono tabular-nums">
                                        #{t.id.toString().slice(-6)} · {new Date(t.tanggal).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}
                                    </div>
                                    <div className={`font-bold text-sm mt-0.5 ${isVoid ? 'line-through text-slate-500' : 'text-slate-900'}`}>
                                        {t.namaPembeli} <span className="font-normal text-xs text-slate-500">· {t.tipePembeli}</span>
                                    </div>
                                </div>
                                <div className="text-right shrink-0">
                                    <div className={`font-bold text-base tabular-nums ${isVoid ? 'line-through text-slate-400' : 'text-teal-700'}`}>
                                        {formatRupiah(t.totalFinal)}
                                    </div>
                                    <div className="text-[11px] text-slate-500">
                                        {t.metodePembayaran} · {isVoid ? <span className="text-red-600 font-bold">Batal</span> : t.statusTransaksi}
                                    </div>
                                </div>
                            </div>

                            <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                                {t.items.map(i => `${i.nama} (x${i.qty})`).join(', ')}
                            </div>

                            {isVoid && (
                                <div className="text-xs text-red-600 font-medium">
                                    <i className="bi bi-arrow-return-left mr-1"></i>
                                    Alasan Batal: {t.alasanBatal} ({t.dibatalkanOleh})
                                </div>
                            )}

                            <div className="flex items-center justify-between pt-2 border-t border-slate-100 gap-2">
                                <span className="text-[11px] text-slate-400">Kasir: {t.kasir}</span>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => handleReprint(t)}
                                        className="min-h-[38px] px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5"
                                    >
                                        <i className="bi bi-printer-fill text-teal-600"></i> Struk
                                    </button>
                                    {!isVoid && (
                                        <button
                                            onClick={() => { setVoidTarget(t); setAlasanBatal(''); }}
                                            className="min-h-[38px] px-3 py-1.5 border border-red-200 rounded-lg text-xs font-semibold text-red-600 hover:bg-red-50 flex items-center gap-1.5"
                                        >
                                            <i className="bi bi-arrow-counterclockwise"></i> Retur
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
                {filteredTransactions.length === 0 && (
                    <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-sm text-slate-400">
                        Tidak ada data transaksi pada periode ini.
                    </div>
                )}
            </div>

            {/* Void / Retur Confirmation Modal */}
            {voidTarget && (
                <div className="fixed inset-0 bg-black bg-opacity-60 z-[80] flex justify-center items-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="p-4 bg-red-600 text-white flex justify-between items-center">
                            <h3 className="font-bold flex items-center gap-2">
                                <i className="bi bi-exclamation-octagon-fill"></i> Batalkan / Retur Transaksi #{voidTarget.id.toString().slice(-6)}
                            </h3>
                            <button onClick={() => setVoidTarget(null)}><i className="bi bi-x-lg"></i></button>
                        </div>
                        <form onSubmit={handleConfirmVoid} className="p-6 space-y-4">
                            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-900 space-y-1">
                                <div className="font-bold">Dampak Pembatalan (Otomatis & Atomik):</div>
                                <ul className="list-disc pl-4 space-y-0.5">
                                    <li>Stok untuk <strong>{voidTarget.items.length} jenis barang</strong> akan dikembalikan ke inventaris & tercatat di Riwayat Stok.</li>
                                    {voidTarget.metodePembayaran === 'Tabungan' && (
                                        <li>Saldo Tabungan <strong>{voidTarget.namaPembeli}</strong> sebesar <strong>{formatRupiah(voidTarget.totalFinal)}</strong> akan dikembalikan (Refund).</li>
                                    )}
                                    <li>Pemasukan & Laba pada Keuangan Koperasi untuk nota ini akan dibatalkan secara otomatis.</li>
                                </ul>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">Alasan Retur / Pembatalan *</label>
                                <input
                                    type="text"
                                    required
                                    value={alasanBatal}
                                    onChange={e => setAlasanBatal(e.target.value)}
                                    placeholder="Contoh: Salah input barang, santri tukar ukuran, dll..."
                                    className="w-full border rounded-lg p-2.5 text-sm"
                                    autoFocus
                                />
                            </div>

                            <div className="flex justify-end gap-2 pt-2 border-t">
                                <button type="button" onClick={() => setVoidTarget(null)} className="px-4 py-2 border rounded-lg text-sm font-medium hover:bg-gray-50">
                                    Kembali
                                </button>
                                <button
                                    type="submit"
                                    disabled={isVoiding}
                                    className="px-5 py-2 bg-red-600 text-white rounded-lg text-sm font-bold hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
                                >
                                    <i className="bi bi-arrow-counterclockwise"></i> {isVoiding ? 'Memproses...' : 'Konfirmasi Batalkan Nota'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
