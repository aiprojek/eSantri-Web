import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useForm } from 'react-hook-form';
import { db } from '../../db';
import { useAppContext } from '../../AppContext';
import { useFinanceContext } from '../../contexts/FinanceContext';
import { KeuanganKoperasi, Diskon } from '../../types';
import { formatRupiah } from '../../utils/formatters';
import { exportToExcel } from '../../utils/exportUtils';
import { generateKoperasiId } from './Shared';

export const KoperasiFinance: React.FC = () => {
    const { showToast, currentUser, showConfirmation } = useAppContext();
    const { onAddTransaksiKas, transaksiKasList, coaList } = useFinanceContext();
    const [subTab, setSubTab] = useState<'cashflow' | 'profit' | 'discounts'>('cashflow');
    
    // Cashflow State
    const records = useLiveQuery(() => db.keuanganKoperasi.filter(k => !k.deleted).reverse().toArray(), [], []);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const { register, handleSubmit, reset } = useForm<KeuanganKoperasi>();

    // Setor ke Buku Kas Pondok Modal State
    const [isSetorPondokOpen, setIsSetorPondokOpen] = useState(false);
    const [setorNominal, setSetorNominal] = useState<string>('');
    const [setorRekening, setSetorRekening] = useState<string>('Kas Tunai');
    const [setorKeterangan, setSetorKeterangan] = useState<string>('');
    const [isSubmittingSetor, setIsSubmittingSetor] = useState(false);

    // Filter State for Profit Analysis
    const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

    // Discount State
    const discounts = useLiveQuery(() => db.diskon.filter(d => !d.deleted).toArray(), [], []);
    const [newDiscount, setNewDiscount] = useState<Partial<Diskon>>({ nama: '', tipe: 'Nominal', nilai: 0, aktif: true });

    // --- CALCULATIONS ---

    // Overall Cashflow Balance (Separated by Physical Cash/Transfer vs Non-Cash Tabungan)
    const summary = useMemo(() => {
        return records.reduce((acc, curr) => {
            const isTabungan = curr.metode === 'Non-Tunai (Tabungan)' || curr.deskripsi.includes('(Tabungan)');
            if (curr.jenis === 'Pemasukan') {
                acc.income += curr.jumlah;
                if (isTabungan) {
                    acc.incomeTabungan += curr.jumlah;
                } else {
                    acc.incomeCash += curr.jumlah;
                }
            } else {
                acc.expense += curr.jumlah;
                if (curr.isDisetorKePondok || curr.kategori === 'Setor ke Kas Pondok') {
                    acc.disetorKePondok += curr.jumlah;
                }
            }
            return acc;
        }, { income: 0, incomeCash: 0, incomeTabungan: 0, expense: 0, disetorKePondok: 0 });
    }, [records]);

    const saldoKasTunaiLaci = summary.incomeCash - summary.expense;

    // Filtered Profit Analysis
    const profitAnalysis = useMemo(() => {
        const filtered = records.filter(r => {
            const d = r.tanggal.split('T')[0];
            return d >= startDate && d <= endDate;
        });

        let grossSales = 0;
        let grossProfit = 0; // Margin from sales (Revenue - COGS)
        let operationalExpense = 0; // Non-COGS expenses (Listrik, Gaji, Plastik, etc.)
        let stockPurchaseExpense = 0; // Kulakan (Cashflow out, not direct P&L expense in accrual, but important for cash)
        let setoranPondok = 0;

        filtered.forEach(r => {
            if (r.jenis === 'Pemasukan') {
                grossSales += r.jumlah;
                if (r.laba !== undefined) {
                    grossProfit += r.laba;
                } else if (r.kategori !== 'Penjualan') {
                    grossProfit += r.jumlah;
                }
            } else {
                if (r.kategori === 'Kulakan / Beli Stok') {
                    stockPurchaseExpense += r.jumlah;
                } else if (r.isDisetorKePondok || r.kategori === 'Setor ke Kas Pondok') {
                    setoranPondok += r.jumlah;
                } else {
                    operationalExpense += r.jumlah;
                }
            }
        });

        const netProfit = grossProfit - operationalExpense;

        return { grossSales, grossProfit, operationalExpense, stockPurchaseExpense, setoranPondok, netProfit, count: filtered.length };
    }, [records, startDate, endDate]);

    const posKasOptions = useMemo(() => {
        const base = ['Kas Tunai', 'Bank Syariah', 'Bank Konvensional'];
        const dynamic = transaksiKasList.map(t => t.rekening).filter((r): r is string => Boolean(r));
        return Array.from(new Set([...base, ...dynamic]));
    }, [transaksiKasList]);

    // --- HANDLERS ---

    const onSubmitFinance = async (data: KeuanganKoperasi) => {
        await db.keuanganKoperasi.put({
            ...data,
            id: generateKoperasiId(),
            jumlah: Number(data.jumlah),
            metode: 'Tunai',
            operator: currentUser?.fullName || 'Admin',
            tanggal: new Date(data.tanggal).toISOString(),
            deleted: false,
            lastModified: Date.now()
        });
        showToast('Catatan keuangan disimpan.', 'success');
        setIsModalOpen(false);
        reset();
    };

    const handleDeleteFinance = (item: KeuanganKoperasi) => {
        showConfirmation('Hapus Catatan?', `Yakin ingin menghapus catatan "${item.deskripsi}"?`, async () => {
            await db.keuanganKoperasi.put({
                ...item,
                deleted: true,
                lastModified: Date.now()
            });
            showToast('Catatan dihapus.', 'success');
        }, { confirmColor: 'red' });
    };

    const handleSetorKePondok = async (e: React.FormEvent) => {
        e.preventDefault();
        const amount = parseFloat(setorNominal);
        if (!amount || amount <= 0) {
            showToast('Masukkan nominal setoran yang valid.', 'error');
            return;
        }
        if (amount > saldoKasTunaiLaci) {
            showToast(`Nominal melebihi Saldo Kas Tunai Koperasi yang tersedia (${formatRupiah(saldoKasTunaiLaci)}).`, 'error');
            return;
        }

        setIsSubmittingSetor(true);
        try {
            const now = Date.now();
            const nowIso = new Date().toISOString();
            const operatorName = currentUser?.fullName || 'Bendahara Koperasi';
            const ket = setorKeterangan.trim() || `Setoran Hasil Usaha Koperasi & Kantin (${startDate} s/d ${endDate})`;

            // Find COA 404 (Hasil Usaha Koperasi & Kantin) if available
            const koperasiCoa = coaList.find(c => c.kode === '404' || c.nama.toLowerCase().includes('koperasi'));

            // 1. Catat Pengeluaran (Setoran) di Keuangan Koperasi
            await db.keuanganKoperasi.put({
                id: generateKoperasiId(),
                tanggal: nowIso,
                jenis: 'Pengeluaran',
                kategori: 'Setor ke Kas Pondok',
                deskripsi: `${ket} -> [${setorRekening}]`,
                jumlah: amount,
                metode: 'Tunai',
                isDisetorKePondok: true,
                operator: operatorName,
                deleted: false,
                lastModified: now
            } as any);

            // 2. Catat Pemasukan di Buku Kas Umum Pondok
            await onAddTransaksiKas({
                jenis: 'Pemasukan',
                kategori: koperasiCoa ? `${koperasiCoa.kode} - ${koperasiCoa.nama}` : '404 - Hasil Usaha Koperasi & Kantin',
                rekening: setorRekening,
                deskripsi: ket,
                jumlah: amount,
                penanggungJawab: operatorName
            });

            showToast(`Berhasil menyetorkan ${formatRupiah(amount)} ke Buku Kas Pondok (${setorRekening}).`, 'success');
            setIsSetorPondokOpen(false);
            setSetorNominal('');
            setSetorKeterangan('');
        } catch (error: any) {
            showToast(error.message || 'Gagal memproses setoran ke Buku Kas Pondok.', 'error');
        } finally {
            setIsSubmittingSetor(false);
        }
    };

    const handleAddDiscount = async () => {
        if (!newDiscount.nama || !newDiscount.nilai) return;
        await db.diskon.put({
            ...(newDiscount as Diskon),
            id: generateKoperasiId(),
            deleted: false,
            lastModified: Date.now()
        });
        setNewDiscount({ nama: '', tipe: 'Nominal', nilai: 0, aktif: true });
        showToast('Diskon ditambahkan.', 'success');
    };

    const toggleDiscount = async (d: Diskon) => {
        await db.diskon.put({
            ...d,
            aktif: !d.aktif,
            lastModified: Date.now()
        });
    };

    const deleteDiscount = async (d: Diskon) => {
        await db.diskon.put({
            ...d,
            deleted: true,
            lastModified: Date.now()
        });
        showToast('Diskon dihapus.', 'info');
    };

    const handleExportFinance = () => {
        const data = records.map(r => ({
            'Tanggal': new Date(r.tanggal).toLocaleDateString('id-ID'),
            'Jenis': r.jenis,
            'Kategori': r.kategori,
            'Metode': r.metode || 'Tunai',
            'Deskripsi': r.deskripsi,
            'Jumlah': r.jumlah,
            'Estimasi Laba': r.laba || 0,
            'Operator': r.operator
        }));
        exportToExcel(data, `Keuangan_Koperasi_${new Date().toISOString().split('T')[0]}`);
    };

    return (
        <div className="space-y-5 sm:space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center border-b border-slate-200 pb-3 gap-3">
                <div className="flex gap-2 overflow-x-auto scrollbar-none">
                    <button onClick={() => setSubTab('cashflow')} className={`px-3 py-2 min-h-[40px] rounded-lg text-xs sm:text-sm font-bold whitespace-nowrap transition-colors ${subTab === 'cashflow' ? 'bg-teal-600 text-white shadow-2xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>Arus Kas (Cashflow)</button>
                    <button onClick={() => setSubTab('profit')} className={`px-3 py-2 min-h-[40px] rounded-lg text-xs sm:text-sm font-bold whitespace-nowrap transition-colors ${subTab === 'profit' ? 'bg-teal-600 text-white shadow-2xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>Analisa Laba Rugi</button>
                    <button onClick={() => setSubTab('discounts')} className={`px-3 py-2 min-h-[40px] rounded-lg text-xs sm:text-sm font-bold whitespace-nowrap transition-colors ${subTab === 'discounts' ? 'bg-teal-600 text-white shadow-2xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>Manajemen Diskon</button>
                </div>
                <button
                    onClick={() => {
                        setSetorNominal(Math.max(0, Math.min(profitAnalysis.netProfit, saldoKasTunaiLaci)).toString());
                        setIsSetorPondokOpen(true);
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 min-h-[40px] rounded-xl text-xs font-bold shadow-xs flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap"
                >
                    <i className="bi bi-bank2"></i> Setor Hasil ke Buku Kas Pondok
                </button>
            </div>

            {subTab === 'cashflow' && (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                        <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200 text-emerald-900">
                            <div className="text-xs font-bold">Pemasukan Tunai / QRIS</div>
                            <div className="text-xl font-bold mt-1 tabular-nums">{formatRupiah(summary.incomeCash)}</div>
                            <div className="text-[11px] text-emerald-700 mt-1">Uang masuk fisik / transfer</div>
                        </div>
                        <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-200 text-indigo-900">
                            <div className="text-xs font-bold">Penjualan via Tabungan</div>
                            <div className="text-xl font-bold mt-1 tabular-nums">{formatRupiah(summary.incomeTabungan)}</div>
                            <div className="text-[11px] text-indigo-700 mt-1">Otomatis potong saldo santri</div>
                        </div>
                        <div className="bg-red-50 p-4 rounded-xl border border-red-200 text-red-900">
                            <div className="text-xs font-bold">Total Pengeluaran & Setor</div>
                            <div className="text-xl font-bold mt-1 tabular-nums">{formatRupiah(summary.expense)}</div>
                            {summary.disetorKePondok > 0 && (
                                <div className="text-[11px] text-red-700 mt-1 tabular-nums">Termasuk setor pondok: {formatRupiah(summary.disetorKePondok)}</div>
                            )}
                        </div>
                        <div className="bg-teal-50 p-4 rounded-xl border border-teal-200 text-teal-950">
                            <div className="text-xs font-bold">Saldo Kas Tunai Koperasi</div>
                            <div className="text-xl font-black mt-1 tabular-nums">{formatRupiah(saldoKasTunaiLaci)}</div>
                            <div className="text-[11px] text-teal-700 mt-1 tabular-nums">Total Akumulasi (+Tabungan): {formatRupiah(summary.income - summary.expense)}</div>
                        </div>
                    </div>

                    <div className="bg-white p-4 rounded-xl shadow-xs border border-slate-200">
                        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 mb-4">
                            <h3 className="font-bold text-slate-800">Jurnal Keuangan Koperasi</h3>
                            <div className="flex gap-2">
                                <button onClick={handleExportFinance} className="min-h-[40px] bg-emerald-600 text-white px-3.5 py-2 rounded-lg text-xs font-bold hover:bg-emerald-700 flex items-center justify-center gap-1.5">
                                    <i className="bi bi-file-earmark-excel"></i> Export
                                </button>
                                <button onClick={() => { reset({ tanggal: new Date().toISOString().slice(0, 16) }); setIsModalOpen(true); }} className="flex-1 sm:flex-initial min-h-[40px] bg-teal-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-teal-700 flex items-center justify-center gap-2">
                                    <i className="bi bi-plus-lg"></i> Catat Transaksi
                                </button>
                            </div>
                        </div>

                        {/* Desktop Table */}
                        <div className="hidden md:block overflow-x-auto max-h-96">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 text-slate-600 text-xs sticky top-0 border-b border-slate-200">
                                    <tr>
                                        <th className="p-3">Tanggal</th>
                                        <th className="p-3">Kategori</th>
                                        <th className="p-3">Deskripsi</th>
                                        <th className="p-3 text-center">Metode</th>
                                        <th className="p-3 text-right">Masuk</th>
                                        <th className="p-3 text-right">Keluar</th>
                                        <th className="p-3">Operator</th>
                                        <th className="p-3 text-center">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {records.map(r => (
                                        <tr key={r.id} className="hover:bg-slate-50">
                                            <td className="p-3 text-slate-500 text-xs tabular-nums">{new Date(r.tanggal).toLocaleDateString('id-ID')}</td>
                                            <td className="p-3 text-xs font-medium text-slate-700">{r.kategori}</td>
                                            <td className="p-3 text-slate-800">{r.deskripsi}</td>
                                            <td className="p-3 text-center text-xs text-slate-600">
                                                {r.metode || 'Tunai'}
                                            </td>
                                            <td className="p-3 text-right font-semibold text-emerald-600 tabular-nums">{r.jenis === 'Pemasukan' ? formatRupiah(r.jumlah) : '-'}</td>
                                            <td className="p-3 text-right font-semibold text-red-600 tabular-nums">{r.jenis === 'Pengeluaran' ? formatRupiah(r.jumlah) : '-'}</td>
                                            <td className="p-3 text-xs text-slate-400">{r.operator}</td>
                                            <td className="p-3 text-center">
                                                <button onClick={() => handleDeleteFinance(r)} className="w-8 h-8 text-red-500 hover:bg-red-50 rounded-lg inline-flex items-center justify-center" title="Hapus Catatan">
                                                    <i className="bi bi-trash"></i>
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {records.length === 0 && (
                                        <tr><td colSpan={8} className="p-8 text-center text-slate-400">Belum ada catatan keuangan.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile Card List */}
                        <div className="md:hidden space-y-2.5 max-h-[500px] overflow-y-auto pr-0.5">
                            {records.map(r => (
                                <div key={r.id} className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 flex justify-between items-start gap-2">
                                    <div className="min-w-0 flex-grow">
                                        <div className="text-[11px] text-slate-500 tabular-nums">
                                            {new Date(r.tanggal).toLocaleDateString('id-ID')} · {r.kategori} · {r.metode || 'Tunai'}
                                        </div>
                                        <div className="text-sm font-semibold text-slate-800 mt-0.5 break-words">{r.deskripsi}</div>
                                        <div className="text-[11px] text-slate-400 mt-1">Oleh: {r.operator}</div>
                                    </div>
                                    <div className="text-right shrink-0 flex flex-col items-end gap-1">
                                        <div className={`text-sm font-bold tabular-nums ${r.jenis === 'Pemasukan' ? 'text-emerald-600' : 'text-red-600'}`}>
                                            {r.jenis === 'Pemasukan' ? '+' : '-'}{formatRupiah(r.jumlah)}
                                        </div>
                                        <button
                                            onClick={() => handleDeleteFinance(r)}
                                            className="w-8 h-8 rounded-lg text-red-500 hover:bg-red-50 flex items-center justify-center"
                                            aria-label="Hapus catatan"
                                        >
                                            <i className="bi bi-trash text-xs"></i>
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {records.length === 0 && (
                                <div className="p-6 text-center text-sm text-slate-400">Belum ada catatan keuangan.</div>
                            )}
                        </div>
                    </div>
                </>
            )}

            {subTab === 'profit' && (
                <div className="space-y-6 animate-fade-in">
                    <div className="bg-white p-4 rounded-lg shadow border flex flex-wrap gap-4 items-end">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">Dari Tanggal</label>
                            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="border rounded p-2 text-sm" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">Sampai Tanggal</label>
                            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="border rounded p-2 text-sm" />
                        </div>
                        <div className="text-xs text-gray-500 italic ml-auto max-w-md text-right">
                            * Laba Kotor dihitung dari (Harga Jual - Harga Beli saat transaksi) dikurangi diskon. Laba Bersih adalah Laba Kotor dikurangi Biaya Operasional (selain kulakan stok & setoran kas pondok).
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-white p-5 rounded-xl border shadow-sm">
                            <p className="text-xs text-gray-500 uppercase font-bold">Total Omzet Penjualan</p>
                            <p className="text-2xl font-bold text-gray-800 mt-1">{formatRupiah(profitAnalysis.grossSales)}</p>
                            <span className="text-[10px] text-green-600 bg-green-50 px-2 py-0.5 rounded mt-2 inline-block">Pendapatan Kotor</span>
                        </div>
                        <div className="bg-white p-5 rounded-xl border shadow-sm border-l-4 border-l-teal-500">
                            <p className="text-xs text-teal-600 uppercase font-bold">Margin / Laba Kotor</p>
                            <p className="text-2xl font-bold text-teal-700 mt-1">{formatRupiah(profitAnalysis.grossProfit)}</p>
                            <span className="text-[10px] text-gray-400 mt-2 inline-block">Omzet dikurangi HPP (Modal Barang)</span>
                        </div>
                        <div className="bg-white p-5 rounded-xl border shadow-sm border-l-4 border-l-red-500">
                            <p className="text-xs text-red-600 uppercase font-bold">Biaya Operasional</p>
                            <p className="text-2xl font-bold text-red-700 mt-1">{formatRupiah(profitAnalysis.operationalExpense)}</p>
                            <span className="text-[10px] text-gray-400 mt-2 inline-block">Gaji, Listrik, Plastik, Lainnya</span>
                        </div>
                        <div className="bg-gradient-to-br from-indigo-600 to-purple-700 p-5 rounded-xl text-white shadow-lg">
                            <p className="text-xs text-indigo-100 uppercase font-bold">Estimasi Laba Bersih (Net Profit)</p>
                            <p className="text-3xl font-extrabold mt-1">{formatRupiah(profitAnalysis.netProfit)}</p>
                            <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded mt-2 inline-block text-white">Laba Kotor - Operasional</span>
                        </div>
                    </div>

                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 flex flex-wrap justify-between items-center text-sm text-blue-900 gap-4">
                        <div>
                            <span className="font-bold"><i className="bi bi-info-circle-fill mr-2"></i>Info Belanja Stok (Kulakan):</span>
                            <span className="ml-2">Pengeluaran untuk pembelian stok barang pada periode ini (tidak mengurangi laba secara langsung karena menjadi aset stok): <strong>{formatRupiah(profitAnalysis.stockPurchaseExpense)}</strong></span>
                        </div>
                        {profitAnalysis.setoranPondok > 0 && (
                            <div className="bg-white px-3 py-1.5 rounded border border-blue-200 text-xs font-bold text-emerald-700">
                                Telah Disetor ke Kas Pondok: {formatRupiah(profitAnalysis.setoranPondok)}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {subTab === 'discounts' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white p-4 rounded-lg shadow border h-fit">
                        <h4 className="font-bold text-gray-700 mb-3">Buat Diskon / Promo Baru</h4>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">Nama Promo</label>
                                <input type="text" value={newDiscount.nama} onChange={e => setNewDiscount({...newDiscount, nama: e.target.value})} className="w-full border rounded p-2 text-sm" placeholder="Contoh: Jumat Berkah, Diskon Guru" />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Tipe Potongan</label>
                                    <select value={newDiscount.tipe} onChange={e => setNewDiscount({...newDiscount, tipe: e.target.value as any})} className="w-full border rounded p-2 text-sm">
                                        <option value="Nominal">Nominal (Rp)</option>
                                        <option value="Persen">Persen (%)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Nilai</label>
                                    <input type="number" value={newDiscount.nilai} onChange={e => setNewDiscount({...newDiscount, nilai: Number(e.target.value)})} className="w-full border rounded p-2 text-sm" />
                                </div>
                            </div>
                            <button onClick={handleAddDiscount} className="w-full bg-teal-600 text-white py-2 rounded font-bold text-sm hover:bg-teal-700">Simpan Diskon</button>
                        </div>
                    </div>

                    <div className="md:col-span-2 bg-white p-4 rounded-lg shadow border">
                        <h4 className="font-bold text-gray-700 mb-3">Daftar Diskon Aktif</h4>
                        <div className="space-y-2">
                            {discounts.map(d => (
                                <div key={d.id} className="flex justify-between items-center p-3 border rounded hover:bg-gray-50">
                                    <div>
                                        <div className="font-bold text-gray-800">{d.nama}</div>
                                        <div className="text-xs text-teal-600 font-bold">Potongan: {d.tipe === 'Persen' ? `${d.nilai}%` : formatRupiah(d.nilai)}</div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <button onClick={() => toggleDiscount(d)} className={`px-3 py-1 rounded text-xs font-bold ${d.aktif ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'}`}>
                                            {d.aktif ? 'Aktif' : 'Non-Aktif'}
                                        </button>
                                        <button onClick={() => deleteDiscount(d)} className="text-red-500 hover:text-red-700"><i className="bi bi-trash"></i></button>
                                    </div>
                                </div>
                            ))}
                            {discounts.length === 0 && <p className="text-center text-gray-400 text-sm py-4">Belum ada diskon dibuat.</p>}
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Catat Keuangan */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-60 z-[70] flex justify-center items-center p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
                        <div className="p-4 border-b flex justify-between items-center bg-gray-50 rounded-t-lg">
                            <h3 className="font-bold text-gray-800">Catat Transaksi Keuangan</h3>
                            <button onClick={() => setIsModalOpen(false)}><i className="bi bi-x-lg"></i></button>
                        </div>
                        <form onSubmit={handleSubmit(onSubmitFinance)} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1">Tanggal</label>
                                <input type="datetime-local" {...register('tanggal', { required: true })} className="w-full border rounded p-2 text-sm" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1">Jenis Transaksi</label>
                                <select {...register('jenis')} className="w-full border rounded p-2 text-sm">
                                    <option value="Pengeluaran">Pengeluaran (Biaya/Kulakan)</option>
                                    <option value="Pemasukan">Pemasukan Lain (Non-Penjualan)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1">Kategori</label>
                                <input list="fin-cats" {...register('kategori', { required: true })} className="w-full border rounded p-2 text-sm" placeholder="Pilih atau ketik..." />
                                <datalist id="fin-cats">
                                    <option value="Kulakan / Beli Stok" />
                                    <option value="Gaji Penjaga" />
                                    <option value="Listrik & Air" />
                                    <option value="Perlengkapan (Plastik/Kertas)" />
                                    <option value="Lain-lain" />
                                </datalist>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1">Nominal (Rp)</label>
                                <input type="number" {...register('jumlah', { required: true })} className="w-full border rounded p-2 text-sm" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1">Deskripsi / Keterangan</label>
                                <textarea {...register('deskripsi', { required: true })} className="w-full border rounded p-2 text-sm" rows={2}></textarea>
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border rounded text-sm">Batal</button>
                                <button type="submit" className="px-4 py-2 bg-teal-600 text-white rounded text-sm font-bold">Simpan</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Setor Hasil Usaha ke Buku Kas Pondok */}
            {isSetorPondokOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-60 z-[80] flex justify-center items-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="p-4 bg-emerald-700 text-white flex justify-between items-center">
                            <h3 className="font-bold flex items-center gap-2">
                                <i className="bi bi-bank2"></i> Setor Hasil Usaha ke Buku Kas Pondok
                            </h3>
                            <button onClick={() => setIsSetorPondokOpen(false)}><i className="bi bi-x-lg"></i></button>
                        </div>
                        <form onSubmit={handleSetorKePondok} className="p-6 space-y-4">
                            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-xs text-emerald-900 space-y-1">
                                <div className="flex justify-between">
                                    <span>Saldo Kas Tunai Koperasi Tersedia:</span>
                                    <strong className="text-emerald-800">{formatRupiah(saldoKasTunaiLaci)}</strong>
                                </div>
                                <div className="flex justify-between">
                                    <span>Estimasi Laba Bersih Periode Ini:</span>
                                    <strong className="text-indigo-700">{formatRupiah(profitAnalysis.netProfit)}</strong>
                                </div>
                                <p className="text-[11px] text-emerald-700 pt-1 border-t border-emerald-200/70">
                                    Setoran ini akan otomatis mengurangi Kas Tunai Koperasi dan mencatat Pemasukan pada <strong>Buku Kas Umum Pondok</strong> (Akun COA 404 - Hasil Usaha Koperasi & Kantin).
                                </p>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">Pos Rekening Tujuan di Buku Kas Pondok *</label>
                                <select
                                    value={setorRekening}
                                    onChange={e => setSetorRekening(e.target.value)}
                                    className="w-full border rounded-lg p-2.5 text-sm bg-white font-medium"
                                >
                                    {posKasOptions.map(pos => (
                                        <option key={pos} value={pos}>{pos}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">Nominal Setoran (Rp) *</label>
                                <input
                                    type="number"
                                    required
                                    min={1}
                                    max={Math.max(0, saldoKasTunaiLaci)}
                                    value={setorNominal}
                                    onChange={e => setSetorNominal(e.target.value)}
                                    className="w-full border rounded-lg p-2.5 text-lg font-bold text-right"
                                    placeholder="0"
                                />
                                <div className="flex gap-2 mt-1.5 justify-end">
                                    {profitAnalysis.netProfit > 0 && profitAnalysis.netProfit <= saldoKasTunaiLaci && (
                                        <button
                                            type="button"
                                            onClick={() => setSetorNominal(profitAnalysis.netProfit.toString())}
                                            className="text-[11px] bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-1 rounded font-bold hover:bg-indigo-100"
                                        >
                                            Senilai Laba Bersih ({formatRupiah(profitAnalysis.netProfit)})
                                        </button>
                                    )}
                                    {saldoKasTunaiLaci > 0 && (
                                        <button
                                            type="button"
                                            onClick={() => setSetorNominal(saldoKasTunaiLaci.toString())}
                                            className="text-[11px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-1 rounded font-bold hover:bg-emerald-100"
                                        >
                                            Seluruh Kas Tunai ({formatRupiah(saldoKasTunaiLaci)})
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">Keterangan Setoran</label>
                                <input
                                    type="text"
                                    value={setorKeterangan}
                                    onChange={e => setSetorKeterangan(e.target.value)}
                                    placeholder={`Setoran Hasil Usaha Koperasi (${startDate} s/d ${endDate})`}
                                    className="w-full border rounded-lg p-2.5 text-sm"
                                />
                            </div>

                            <div className="flex justify-end gap-2 pt-2 border-t">
                                <button type="button" onClick={() => setIsSetorPondokOpen(false)} className="px-4 py-2 border rounded-lg text-sm">Batal</button>
                                <button
                                    type="submit"
                                    disabled={isSubmittingSetor || saldoKasTunaiLaci <= 0}
                                    className="px-5 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2"
                                >
                                    <i className="bi bi-check2-circle"></i> {isSubmittingSetor ? 'Memproses...' : 'Proses Setoran'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
