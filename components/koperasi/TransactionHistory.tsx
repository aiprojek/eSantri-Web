
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { db } from '../../db';
import { useAppContext } from '../../AppContext';
import { TransaksiKoperasi } from '../../types';
import { formatRupiah } from '../../utils/formatters';
import { exportKoperasiToExcel } from '../../services/excelService';
import { printToPdfNative } from '../../utils/pdfGenerator';
import { StrukPreview, DEFAULT_KOP_SETTINGS } from './Shared';
import { Pagination } from '../common/Pagination';

export const TransactionHistory: React.FC = () => {
    const { settings } = useAppContext();
    const [lastPrintedTrx, setLastPrintedTrx] = useState<TransaksiKoperasi | null>(null);

    // Date Filter - Default to Current Month
    const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

    // Pagination State
    const [transactions, setTransactions] = useState<TransaksiKoperasi[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const itemsPerPage = 20;

    // Derived Stats State (Separate from pagination)
    const [summaryStats, setSummaryStats] = useState({ omset: 0, count: 0, totalItemsSold: 0 });

    const fetchTransactions = useCallback(async () => {
        setIsLoading(true);
        try {
            const endDateTime = endDate + 'T23:59:59.999';
            const collection = db.transaksiKoperasi.where('tanggal').between(startDate, endDateTime, true, true).reverse();

            // 1. Get Count
            const count = await collection.count();
            setTotalItems(count);

            // 2. Get Page Data
            const offset = (currentPage - 1) * itemsPerPage;
            const data = await collection.offset(offset).limit(itemsPerPage).toArray();
            setTransactions(data);

            // 3. Calculate Summary Stats (Separate Query for Totals - Optimized)
            // Note: For huge datasets, doing .toArray() for stats might still be heavy. 
            // Ideally we should cache stats or use aggregation queries. 
            // For now, let's just count total records for stats, or fetch all just for the reduction (since reduction is fast in JS if keys are limited)
            // Optimization: Only fetch needed fields for stats if Dexie supports it, but Dexie returns objects.
            const allForStats = await db.transaksiKoperasi.where('tanggal').between(startDate, endDateTime, true, true).toArray();
            
            const omset = allForStats.reduce((sum, t) => sum + (Number(t.totalBelanja) || 0), 0);
            const totalItemsSold = allForStats.reduce((sum, t) => sum + t.items.reduce((iSum, i) => iSum + i.qty, 0), 0);
            
            setSummaryStats({ omset, count: allForStats.length, totalItemsSold });

        } catch (e) {
            console.error("Failed to fetch transactions", e);
        } finally {
            setIsLoading(false);
        }
    }, [startDate, endDate, currentPage]);

    useEffect(() => {
        setCurrentPage(1);
    }, [startDate, endDate]);

    useEffect(() => {
        fetchTransactions();
    }, [fetchTransactions]);

    const totalPages = Math.ceil(totalItems / itemsPerPage);

    const handlePrintStruk = (trx: TransaksiKoperasi) => {
        setLastPrintedTrx(trx);
        setTimeout(() => {
            printToPdfNative('history-receipt-area', `Struk_${trx.id}`);
        }, 300);
    };

     const handleExport = async () => {
         // Export ALL data in range, not just current page
         const endDateTime = endDate + 'T23:59:59.999';
         const allData = await db.transaksiKoperasi.where('tanggal').between(startDate, endDateTime, true, true).reverse().toArray();
         exportKoperasiToExcel(allData);
    };

    return (
        <div className="space-y-6 h-full flex flex-col">
            {/* MINI DASHBOARD (OPERATIONAL METRICS) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-xl border-l-4 border-green-500 shadow-sm">
                    <p className="text-gray-500 text-xs font-bold uppercase">Omset Penjualan</p>
                    <p className="text-2xl font-bold text-green-700">{formatRupiah(summaryStats.omset)}</p>
                    <p className="text-xs text-gray-400 mt-1">Total Uang Masuk (Periode Ini)</p>
                </div>
                <div className="bg-white p-4 rounded-xl border-l-4 border-blue-500 shadow-sm">
                    <p className="text-gray-500 text-xs font-bold uppercase">Volume Transaksi</p>
                    <p className="text-2xl font-bold text-blue-700">{summaryStats.count}</p>
                    <p className="text-xs text-gray-400 mt-1">Kali Transaksi</p>
                </div>
                <div className="bg-white p-4 rounded-xl border-l-4 border-purple-500 shadow-sm">
                    <p className="text-gray-500 text-xs font-bold uppercase">Barang Terjual</p>
                    <p className="text-2xl font-bold text-purple-700">{summaryStats.totalItemsSold}</p>
                    <p className="text-xs text-gray-400 mt-1">Unit / Pcs Item</p>
                </div>
            </div>

            {/* FILTER & LIST */}
            <div className="bg-white p-6 rounded-lg shadow-md flex-grow flex flex-col overflow-hidden">
                <div className="flex flex-col md:flex-row justify-between items-center mb-4 shrink-0 gap-3">
                    <div className="flex gap-2 items-center bg-gray-50 p-2 rounded border">
                        <span className="text-xs font-bold text-gray-500 uppercase mr-2">Filter Periode:</span>
                        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="border rounded p-1.5 text-sm" />
                        <span className="text-gray-400">-</span>
                        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="border rounded p-1.5 text-sm" />
                    </div>
                    <button onClick={handleExport} className="bg-green-600 text-white px-3 py-1.5 rounded text-xs font-bold hover:bg-green-700 flex items-center gap-2">
                        <i className="bi bi-file-earmark-spreadsheet"></i> Export Excel
                    </button>
                </div>
                
                <div className="flex-grow overflow-auto border rounded-lg relative">
                    {isLoading && <div className="absolute inset-0 bg-white/50 z-10 flex items-center justify-center"><span className="animate-spin h-6 w-6 border-2 border-teal-500 rounded-full border-t-transparent"></span></div>}
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-600 sticky top-0 z-10">
                            <tr>
                                <th className="p-3">Waktu</th>
                                <th className="p-3">Pembeli</th>
                                <th className="p-3">Metode</th>
                                <th className="p-3 text-right">Total</th>
                                <th className="p-3">Item</th>
                                <th className="p-3 text-center">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {transactions.map(t => (
                                <tr key={t.id} className="hover:bg-gray-50">
                                    <td className="p-3 whitespace-nowrap text-gray-500">{new Date(t.tanggal).toLocaleString('id-ID')}</td>
                                    <td className="p-3 font-medium">{t.namaPembeli} <span className="text-xs text-gray-400">({t.tipePembeli})</span></td>
                                    <td className="p-3">
                                        <span className={`px-2 py-0.5 rounded text-xs ${t.metodePembayaran === 'Tabungan' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>{t.metodePembayaran}</span>
                                    </td>
                                    <td className="p-3 text-right font-bold">{formatRupiah(t.totalBelanja)}</td>
                                    <td className="p-3 text-xs text-gray-500 truncate max-w-xs">{t.items.map(i => `${i.nama} x${i.qty}`).join(', ')}</td>
                                    <td className="p-3 text-center">
                                        <button onClick={() => handlePrintStruk(t)} className="text-gray-600 hover:text-black" title="Cetak Struk"><i className="bi bi-printer"></i></button>
                                    </td>
                                </tr>
                            ))}
                            {transactions.length === 0 && !isLoading && <tr><td colSpan={6} className="p-6 text-center text-gray-400">Tidak ada transaksi pada periode ini.</td></tr>}
                        </tbody>
                    </table>
                </div>

                <div className="mt-4 shrink-0">
                    <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
                </div>
            </div>

            <div className="hidden print:block">
                <div id="history-receipt-area">
                    {lastPrintedTrx && <StrukPreview transaksi={lastPrintedTrx} settings={localStorage.getItem('esantri_koperasi_settings') ? JSON.parse(localStorage.getItem('esantri_koperasi_settings')!) : DEFAULT_KOP_SETTINGS} />}
                </div>
            </div>
        </div>
    );
};
