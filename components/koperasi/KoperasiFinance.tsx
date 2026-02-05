
import React, { useState, useMemo } from 'react';
import { useLiveQuery } from "dexie-react-hooks";
import { useForm } from 'react-hook-form';
import { db } from '../../db';
import { useAppContext } from '../../AppContext';
import { KeuanganKoperasi } from '../../types';
import { formatRupiah, formatDateTime } from '../../utils/formatters';

export const KoperasiFinance: React.FC = () => {
    const { showToast, showConfirmation, currentUser } = useAppContext();
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    // Live Queries
    const financeRecords = useLiveQuery(() => db.keuanganKoperasi.orderBy('tanggal').reverse().toArray(), []) || [];
    const salesRecords = useLiveQuery(() => db.transaksiKoperasi.toArray(), []) || [];
    const products = useLiveQuery(() => db.produkKoperasi.toArray(), []) || [];

    const { register, handleSubmit, reset, watch } = useForm<Omit<KeuanganKoperasi, 'id' | 'operator'>>();

    const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1);
    const [filterYear, setFilterYear] = useState(new Date().getFullYear());

    // --- Statistics Logic ---
    const stats = useMemo(() => {
        // Filter by Date
        const filteredFinance = financeRecords.filter(f => {
            const d = new Date(f.tanggal);
            return d.getMonth() + 1 === filterMonth && d.getFullYear() === filterYear;
        });

        const filteredSales = salesRecords.filter(s => {
            const d = new Date(s.tanggal);
            return d.getMonth() + 1 === filterMonth && d.getFullYear() === filterYear;
        });

        // 1. Calculate Gross Profit from Sales
        // Profit = (Sell Price - Buy Price) * Qty
        // Using current Buy Price (Approximation)
        const productBuyPriceMap = new Map(products.map(p => [p.id, p.hargaBeli]));
        let grossProfit = 0;
        let totalSalesOmset = 0;

        filteredSales.forEach(sale => {
            totalSalesOmset += sale.totalBelanja;
            sale.items.forEach(item => {
                const buyPrice = Number(productBuyPriceMap.get(item.produkId) || 0);
                const margin = Number(item.harga) - buyPrice;
                grossProfit += margin * Number(item.qty);
            });
        });

        // 2. Other Income & Expenses from KeuanganKoperasi
        const otherIncome = filteredFinance
            .filter(f => f.jenis === 'Pemasukan')
            .reduce((sum, f) => sum + f.jumlah, 0);

        const expenses = filteredFinance
            .filter(f => f.jenis === 'Pengeluaran')
            .reduce((sum, f) => sum + f.jumlah, 0);

        // 3. Net Profit
        const netProfit = grossProfit + otherIncome - expenses;

        return {
            totalSalesOmset,
            grossProfit,
            otherIncome,
            expenses,
            netProfit
        };
    }, [financeRecords, salesRecords, products, filterMonth, filterYear]);

    const handleSave = async (data: Omit<KeuanganKoperasi, 'id' | 'operator'>) => {
        try {
            await db.keuanganKoperasi.add({
                ...data,
                id: Date.now(),
                operator: currentUser?.fullName || 'Admin',
                lastModified: Date.now()
            });
            showToast('Transaksi berhasil dicatat.', 'success');
            setIsModalOpen(false);
            reset();
        } catch (error) {
            showToast('Gagal menyimpan.', 'error');
        }
    };

    const handleDelete = (id: number) => {
        showConfirmation('Hapus Transaksi?', 'Data ini akan dihapus permanen.', async () => {
            await db.keuanganKoperasi.delete(id);
            showToast('Transaksi dihapus.', 'success');
        }, { confirmColor: 'red' });
    };

    const watchJenis = watch('jenis', 'Pengeluaran');

    return (
        <div className="space-y-6 h-full flex flex-col">
            {/* Header & Filter */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-lg shadow-sm border">
                <div>
                    <h3 className="font-bold text-gray-800">Laporan Laba & Rugi</h3>
                    <p className="text-xs text-gray-500">Periode: {new Date(filterYear, filterMonth - 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}</p>
                </div>
                <div className="flex gap-2">
                    <select value={filterMonth} onChange={e => setFilterMonth(Number(e.target.value))} className="border rounded p-2 text-sm">
                        {Array.from({length: 12}, (_, i) => <option key={i} value={i+1}>{new Date(0, i).toLocaleDateString('id-ID', {month:'long'})}</option>)}
                    </select>
                    <select value={filterYear} onChange={e => setFilterYear(Number(e.target.value))} className="border rounded p-2 text-sm w-24">
                        {Array.from({length: 5}, (_, i) => <option key={i} value={new Date().getFullYear() - 2 + i}>{new Date().getFullYear() - 2 + i}</option>)}
                    </select>
                    <button onClick={() => { reset({ tanggal: new Date().toISOString().split('T')[0], jenis: 'Pengeluaran', jumlah: 0, deskripsi: '', kategori: '' }); setIsModalOpen(true); }} className="bg-teal-600 text-white px-4 py-2 rounded text-sm font-bold hover:bg-teal-700 flex items-center gap-2">
                        <i className="bi bi-plus-circle"></i> Catat Transaksi
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-lg border-l-4 border-blue-500 shadow-sm">
                    <p className="text-xs font-bold text-gray-500 uppercase">Laba Kotor Penjualan</p>
                    <p className="text-xl font-bold text-blue-600">{formatRupiah(stats.grossProfit)}</p>
                    <p className="text-[10px] text-gray-400">Dari omset {formatRupiah(stats.totalSalesOmset)}</p>
                </div>
                <div className="bg-white p-4 rounded-lg border-l-4 border-green-500 shadow-sm">
                    <p className="text-xs font-bold text-gray-500 uppercase">Pemasukan Lain</p>
                    <p className="text-xl font-bold text-green-600">{formatRupiah(stats.otherIncome)}</p>
                    <p className="text-[10px] text-gray-400">Non-Penjualan Barang</p>
                </div>
                <div className="bg-white p-4 rounded-lg border-l-4 border-red-500 shadow-sm">
                    <p className="text-xs font-bold text-gray-500 uppercase">Beban Operasional</p>
                    <p className="text-xl font-bold text-red-600">{formatRupiah(stats.expenses)}</p>
                    <p className="text-[10px] text-gray-400">Gaji, Listrik, Plastik, dll</p>
                </div>
                <div className={`bg-white p-4 rounded-lg border-l-4 shadow-sm ${stats.netProfit >= 0 ? 'border-teal-500' : 'border-orange-500'}`}>
                    <p className="text-xs font-bold text-gray-500 uppercase">Laba Bersih</p>
                    <p className={`text-xl font-bold ${stats.netProfit >= 0 ? 'text-teal-700' : 'text-orange-600'}`}>{formatRupiah(stats.netProfit)}</p>
                    <p className="text-[10px] text-gray-400">Profit Akhir Bulan Ini</p>
                </div>
            </div>

            {/* Transaction List */}
            <div className="bg-white rounded-lg shadow border flex-grow overflow-hidden flex flex-col">
                <div className="p-3 bg-gray-50 border-b font-bold text-gray-700 text-sm">Riwayat Pemasukan & Pengeluaran Operasional</div>
                <div className="overflow-auto flex-grow">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-white text-gray-600 border-b sticky top-0 z-10">
                            <tr>
                                <th className="p-3">Tanggal</th>
                                <th className="p-3">Kategori</th>
                                <th className="p-3">Keterangan</th>
                                <th className="p-3 text-right">Jumlah</th>
                                <th className="p-3 text-center">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {financeRecords.filter(f => {
                                const d = new Date(f.tanggal);
                                return d.getMonth() + 1 === filterMonth && d.getFullYear() === filterYear;
                            }).map(item => (
                                <tr key={item.id} className="hover:bg-gray-50">
                                    <td className="p-3 whitespace-nowrap text-gray-500">{formatDateTime(item.tanggal)}</td>
                                    <td className="p-3">
                                        <span className={`px-2 py-0.5 rounded text-xs border ${item.jenis === 'Pemasukan' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
                                            {item.kategori}
                                        </span>
                                    </td>
                                    <td className="p-3 text-gray-800">{item.deskripsi}</td>
                                    <td className={`p-3 text-right font-bold ${item.jenis === 'Pemasukan' ? 'text-green-600' : 'text-red-600'}`}>
                                        {item.jenis === 'Pemasukan' ? '+' : '-'} {formatRupiah(item.jumlah)}
                                    </td>
                                    <td className="p-3 text-center">
                                        <button onClick={() => handleDelete(item.id)} className="text-red-500 hover:text-red-700"><i className="bi bi-trash"></i></button>
                                    </td>
                                </tr>
                            ))}
                            {financeRecords.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-gray-400">Belum ada data keuangan operasional.</td></tr>}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-60 z-[70] flex justify-center items-center p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
                        <div className="p-4 border-b font-bold bg-gray-50 rounded-t-lg">Catat Transaksi Keuangan</div>
                        <form onSubmit={handleSubmit(handleSave)} className="p-5 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1">Tanggal</label>
                                <input type="date" {...register('tanggal', {required: true})} className="w-full border rounded p-2 text-sm" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1">Jenis</label>
                                    <select {...register('jenis')} className="w-full border rounded p-2 text-sm">
                                        <option value="Pengeluaran">Pengeluaran</option>
                                        <option value="Pemasukan">Pemasukan (Lainnya)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1">Jumlah (Rp)</label>
                                    <input type="number" {...register('jumlah', {required: true, valueAsNumber: true})} className="w-full border rounded p-2 text-sm" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1">Kategori</label>
                                <input list="cat-list" {...register('kategori', {required: true})} className="w-full border rounded p-2 text-sm" placeholder="cth: Listrik, Plastik, Gaji..." />
                                <datalist id="cat-list">
                                    {watchJenis === 'Pengeluaran' ? (
                                        <>
                                            <option value="Gaji Penjaga"/>
                                            <option value="Listrik & Air"/>
                                            <option value="Perlengkapan (Plastik/Kresek)"/>
                                            <option value="Transportasi"/>
                                            <option value="Maintenance Aset"/>
                                        </>
                                    ) : (
                                        <>
                                            <option value="Suntikan Modal"/>
                                            <option value="Hibah/Donasi"/>
                                            <option value="Bagi Hasil Pihak Ketiga"/>
                                        </>
                                    )}
                                </datalist>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1">Keterangan</label>
                                <textarea {...register('deskripsi', {required: true})} rows={2} className="w-full border rounded p-2 text-sm"></textarea>
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border rounded text-gray-600 text-sm">Batal</button>
                                <button type="submit" className="px-4 py-2 bg-teal-600 text-white rounded text-sm hover:bg-teal-700 font-bold">Simpan</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
