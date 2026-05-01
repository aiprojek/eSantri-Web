
import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { useAppContext } from '../AppContext';
import { useFinanceContext } from '../contexts/FinanceContext';
import { TransaksiKas } from '../types';
import { formatRupiah } from '../utils/formatters';
import { db } from '../db';
import { loadXLSX } from '../utils/lazyClientLibs';
import { Pagination } from './common/Pagination';
import { PageHeader } from './common/PageHeader';
import { SectionCard } from './common/SectionCard';
import { EmptyState } from './common/EmptyState';

const StatCard: React.FC<{ icon: string; title: string; value: string | number; color: string; textColor: string }> = ({ icon, title, value, color, textColor }) => (
    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-start gap-4 transition-transform hover:-translate-y-1">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color} flex-shrink-0`}>
            <i className={`${icon} text-lg`}></i>
        </div>
        <div>
            <p className="text-gray-500 text-xs font-medium uppercase tracking-wide">{title}</p>
            <p className={`text-xl font-bold ${textColor}`}>{value}</p>
        </div>
    </div>
);

interface TransaksiModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: Omit<TransaksiKas, 'id' | 'saldoSetelah' | 'tanggal'>) => Promise<void>;
    existingKategori: string[];
}

const TransaksiModal: React.FC<TransaksiModalProps> = ({ isOpen, onClose, onSave, existingKategori }) => {
    const { register, handleSubmit, formState: { errors, isSubmitting }, watch, reset } = useForm<Omit<TransaksiKas, 'id' | 'saldoSetelah' | 'tanggal'>>({
        defaultValues: { jenis: 'Pemasukan', kategori: '', deskripsi: '', jumlah: 0, penanggungJawab: '', }
    });
    const jenis = watch('jenis');
    useEffect(() => { if (isOpen) { reset(); } }, [isOpen, reset]);
    if (!isOpen) return null;
    const onSubmit = async (data: Omit<TransaksiKas, 'id' | 'saldoSetelah' | 'tanggal'>) => { await onSave(data); onClose(); };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-[60] flex justify-center items-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
                <form onSubmit={handleSubmit(onSubmit)}>
                    <div className="p-5 border-b"><h3 className="text-lg font-semibold text-gray-800">Tambah Transaksi Kas</h3></div>
                    <div className="p-5 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div><label className="block mb-1 text-sm font-medium text-gray-700">Jenis Transaksi</label><select {...register('jenis')} className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg w-full p-2.5"><option value="Pemasukan">Pemasukan</option><option value="Pengeluaran">Pengeluaran</option></select></div>
                            <div><label className="block mb-1 text-sm font-medium text-gray-700">Jumlah (Rp)</label><input type="number" {...register('jumlah', { required: 'Jumlah wajib diisi', valueAsNumber: true, min: { value: 1, message: 'Jumlah harus lebih dari 0' }})} className={`bg-gray-50 border text-gray-900 text-sm rounded-lg w-full p-2.5 ${errors.jumlah ? 'border-red-500' : 'border-gray-300'}`} />{errors.jumlah && <p className="text-xs text-red-600 mt-1">{errors.jumlah.message}</p>}</div>
                        </div>
                        <div><label className="block mb-1 text-sm font-medium text-gray-700">Kategori</label><input list="kategori-list" {...register('kategori', { required: 'Kategori wajib diisi' })} className={`bg-gray-50 border text-gray-900 text-sm rounded-lg w-full p-2.5 ${errors.kategori ? 'border-red-500' : 'border-gray-300'}`} placeholder="cth: Donasi, Operasional, Listrik" /><datalist id="kategori-list">{existingKategori.map(k => <option key={k} value={k} />)}</datalist>{errors.kategori && <p className="text-xs text-red-600 mt-1">{errors.kategori.message}</p>}</div>
                        <div><label className="block mb-1 text-sm font-medium text-gray-700">Deskripsi</label><textarea {...register('deskripsi', { required: 'Deskripsi wajib diisi' })} rows={3} className={`bg-gray-50 border text-gray-900 text-sm rounded-lg w-full p-2.5 ${errors.deskripsi ? 'border-red-500' : 'border-gray-300'}`}></textarea>{errors.deskripsi && <p className="text-xs text-red-600 mt-1">{errors.deskripsi.message}</p>}</div>
                         <div><label className="block mb-1 text-sm font-medium text-gray-700">Penanggung Jawab</label><input type="text" {...register('penanggungJawab', { required: 'Penanggung Jawab wajib diisi' })} className={`bg-gray-50 border text-gray-900 text-sm rounded-lg w-full p-2.5 ${errors.penanggungJawab ? 'border-red-500' : 'border-gray-300'}`}/>{errors.penanggungJawab && <p className="text-xs text-red-600 mt-1">{errors.penanggungJawab.message}</p>}</div>
                    </div>
                    <div className="p-4 border-t flex justify-end space-x-2">
                        <button type="button" onClick={onClose} className="text-gray-500 bg-white hover:bg-gray-100 rounded-lg border border-gray-200 text-sm font-medium px-5 py-2.5">Batal</button>
                        <button type="submit" disabled={isSubmitting} className={`text-white font-medium rounded-lg text-sm px-5 py-2.5 ${jenis === 'Pemasukan' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'} disabled:bg-gray-300`}>{isSubmitting ? 'Menyimpan...' : 'Simpan Transaksi'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const BukuKas: React.FC = () => {
    const { showToast, showAlert, currentUser } = useAppContext();
    const { onAddTransaksiKas } = useFinanceContext();
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    const canWrite = currentUser?.role === 'admin' || currentUser?.permissions?.bukukas === 'write';

    const [filters, setFilters] = useState({ startDate: '', endDate: '', jenis: '', kategori: '' });
    
    // Pagination State (Replacing full list load)
    const [transactions, setTransactions] = useState<TransaksiKas[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const itemsPerPage = 15;
    
    // Stats State (Calculated separately for full view)
    const [stats, setStats] = useState({ totalPemasukan: 0, totalPengeluaran: 0, saldoAkhir: 0 });
    const [existingKategori, setExistingKategori] = useState<string[]>([]);
    const [filteredRows, setFilteredRows] = useState<TransaksiKas[]>([]);
    const fetchRunIdRef = useRef(0);

    const applyDatePreset = (days: 0 | 7 | 30) => {
        const end = new Date();
        const start = new Date();
        if (days > 0) {
            start.setDate(end.getDate() - (days - 1));
        }
        const toInputDate = (d: Date) => d.toISOString().split('T')[0];
        setFilters(f => ({
            ...f,
            startDate: toInputDate(start),
            endDate: toInputDate(end),
        }));
    };

    const resetFilters = () => {
        setFilters({ startDate: '', endDate: '', jenis: '', kategori: '' });
    };

    const fetchTransactions = useCallback(async () => {
        const runId = ++fetchRunIdRef.current;
        setIsLoading(true);
        try {
            const startDate = filters.startDate ? new Date(`${filters.startDate}T00:00:00`).getTime() : null;
            const endDate = filters.endDate ? new Date(`${filters.endDate}T23:59:59`).getTime() : null;
            const kategoriQuery = filters.kategori.trim().toLowerCase();

            // Use indexed range by tanggal first, then apply remaining predicates in one pass.
            let baseCollection = db.transaksiKas.orderBy('tanggal').reverse();
            if (startDate !== null && endDate !== null) {
                baseCollection = db.transaksiKas.where('tanggal').between(
                    new Date(startDate).toISOString(),
                    new Date(endDate).toISOString(),
                    true,
                    true
                ).reverse();
            } else if (startDate !== null) {
                baseCollection = db.transaksiKas.where('tanggal').aboveOrEqual(new Date(startDate).toISOString()).reverse();
            } else if (endDate !== null) {
                baseCollection = db.transaksiKas.where('tanggal').belowOrEqual(new Date(endDate).toISOString()).reverse();
            }

            const allMatching = await baseCollection
                .filter(t => {
                    const jenisMatch = !filters.jenis || t.jenis === filters.jenis;
                    const kategoriMatch = !kategoriQuery || t.kategori.toLowerCase().includes(kategoriQuery);
                    return jenisMatch && kategoriMatch;
                })
                .toArray();

            if (runId !== fetchRunIdRef.current) return;

            const count = allMatching.length;
            setTotalItems(count);
            setFilteredRows(allMatching);

            const offset = (currentPage - 1) * itemsPerPage;
            setTransactions(allMatching.slice(offset, offset + itemsPerPage));

            let totalPemasukan = 0; let totalPengeluaran = 0;
            const uniqueCats = new Set<string>();
            
            allMatching.forEach(t => {
                if (t.jenis === 'Pemasukan') totalPemasukan += t.jumlah; else totalPengeluaran += t.jumlah;
                uniqueCats.add(t.kategori);
            });
            
            const absoluteLastTx = await db.transaksiKas.orderBy('tanggal').last();
            const saldoAkhir = absoluteLastTx?.saldoSetelah || 0;

            if (runId !== fetchRunIdRef.current) return;
            setStats({ totalPemasukan, totalPengeluaran, saldoAkhir });
            setExistingKategori(Array.from(uniqueCats));

        } catch (e) {
            console.error("Failed to fetch Buku Kas", e);
        } finally {
            if (runId === fetchRunIdRef.current) {
                setIsLoading(false);
            }
        }
    }, [currentPage, filters]);

    useEffect(() => {
        setCurrentPage(1);
    }, [filters]);

    useEffect(() => {
        fetchTransactions();
    }, [fetchTransactions]);

    const handleSave = async (data: Omit<TransaksiKas, 'id' | 'saldoSetelah' | 'tanggal'>) => {
        if (!canWrite) return;
        try { 
            await onAddTransaksiKas(data); 
            showToast('Transaksi berhasil ditambahkan.', 'success'); 
            fetchTransactions(); // Refresh list
        } catch (e) { 
            showAlert('Gagal Menyimpan', (e as Error).message); 
        }
    };

    const buildExportRows = () => {
        return filteredRows.map((t) => ({
            Tanggal: new Date(t.tanggal).toLocaleString('id-ID', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' }),
            Jenis: t.jenis,
            Kategori: t.kategori,
            Deskripsi: t.deskripsi,
            PenanggungJawab: t.penanggungJawab || '',
            Pemasukan: t.jenis === 'Pemasukan' ? t.jumlah : 0,
            Pengeluaran: t.jenis === 'Pengeluaran' ? t.jumlah : 0,
            SaldoSetelah: t.saldoSetelah,
        }));
    };

    const buildFileName = (ext: 'csv' | 'xlsx') => {
        const d = new Date();
        const stamp = `${String(d.getDate()).padStart(2, '0')}${String(d.getMonth() + 1).padStart(2, '0')}${d.getFullYear()}`;
        const suffix = [
            filters.startDate ? `from-${filters.startDate}` : '',
            filters.endDate ? `to-${filters.endDate}` : '',
            filters.jenis || 'semua-jenis',
            filters.kategori ? `kat-${filters.kategori.replace(/\s+/g, '-')}` : '',
        ].filter(Boolean).join('_');
        return `buku-kas_${suffix || 'semua-data'}_${stamp}.${ext}`;
    };

    const handleExportCsv = () => {
        if (filteredRows.length === 0) {
            showToast('Tidak ada data untuk diekspor.', 'info');
            return;
        }
        const rows = buildExportRows();
        const headers = Object.keys(rows[0]);
        const csv = [
            headers.join(','),
            ...rows.map(r => headers.map(h => {
                const v = String((r as any)[h] ?? '');
                return `"${v.replace(/"/g, '""')}"`;
            }).join(',')),
        ].join('\n');

        const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = buildFileName('csv');
        link.click();
        URL.revokeObjectURL(url);
        showToast('Ekspor CSV berhasil.', 'success');
    };

    const handleExportExcel = async () => {
        if (filteredRows.length === 0) {
            showToast('Tidak ada data untuk diekspor.', 'info');
            return;
        }
        try {
            const XLSX = await loadXLSX();
            const rows = buildExportRows();
            const ws = XLSX.utils.json_to_sheet(rows);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'BukuKas');
            XLSX.writeFile(wb, buildFileName('xlsx'));
            showToast('Ekspor Excel berhasil.', 'success');
        } catch (e) {
            showAlert('Ekspor Gagal', 'Terjadi kendala saat membuat file Excel.');
        }
    };

    return (
        <div className="w-full space-y-6">
            <PageHeader
                eyebrow="Keuangan & Aset"
                title="Buku Kas Umum"
                description="Catat dan pantau arus kas masuk serta keluar dengan filter, statistik, dan riwayat transaksi yang lebih rapi."
                actions={canWrite ? (<button onClick={() => setIsModalOpen(true)} className="app-button-primary px-4 py-2.5 text-sm"><i className="bi bi-plus-lg"></i> Tambah Transaksi</button>) : undefined}
            />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <StatCard title="Total Pemasukan (Filter)" value={formatRupiah(stats.totalPemasukan)} icon="bi-arrow-down-circle-fill" color="bg-green-100 text-green-600" textColor="text-green-600" />
                <StatCard title="Total Pengeluaran (Filter)" value={formatRupiah(stats.totalPengeluaran)} icon="bi-arrow-up-circle-fill" color="bg-red-100 text-red-600" textColor="text-red-600" />
                <StatCard title="Saldo Akhir (Aktual)" value={formatRupiah(stats.saldoAkhir)} icon="bi-wallet2" color="bg-blue-100 text-blue-600" textColor="text-blue-600" />
            </div>

            <SectionCard title="Transaksi Kas" description="Gunakan filter untuk menelusuri transaksi dan memantau posisi saldo." contentClassName="overflow-hidden">
                <div className="app-toolbar border-b border-app-border p-4">
                    <div className="mb-3 flex flex-wrap items-center gap-2 lg:mb-2">
                        <button type="button" onClick={() => applyDatePreset(0)} className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50">Hari Ini</button>
                        <button type="button" onClick={() => applyDatePreset(7)} className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50">7 Hari</button>
                        <button type="button" onClick={() => applyDatePreset(30)} className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50">30 Hari</button>
                        <button type="button" onClick={resetFilters} className="rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 transition-colors hover:bg-red-100">Reset Filter</button>
                        <button type="button" onClick={handleExportCsv} className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"><i className="bi bi-filetype-csv mr-1"></i>CSV</button>
                        <button type="button" onClick={handleExportExcel} className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-100"><i className="bi bi-file-earmark-spreadsheet mr-1"></i>Excel</button>
                    </div>
                    <div className="grid w-full grid-cols-1 gap-3 lg:grid-cols-4">
                        <div>
                            <label className="app-label mb-1.5 block pl-1">Tanggal Mulai</label>
                            <input type="date" value={filters.startDate} onChange={e => setFilters(f => ({...f, startDate: e.target.value}))} className="app-input h-10 w-full rounded-md px-3 text-sm"/>
                        </div>
                        <div>
                            <label className="app-label mb-1.5 block pl-1">Tanggal Akhir</label>
                            <input type="date" value={filters.endDate} onChange={e => setFilters(f => ({...f, endDate: e.target.value}))} className="app-input h-10 w-full rounded-md px-3 text-sm"/>
                        </div>
                        <div>
                            <label className="app-label mb-1.5 block pl-1">Jenis Transaksi</label>
                            <select value={filters.jenis} onChange={e => setFilters(f => ({...f, jenis: e.target.value}))} className="app-select h-10 w-full min-w-[140px] px-3 text-sm">
                                <option value="">Semua Jenis</option>
                                <option value="Pemasukan">Pemasukan</option>
                                <option value="Pengeluaran">Pengeluaran</option>
                            </select>
                        </div>
                        <div>
                            <label className="app-label mb-1.5 block pl-1">Kategori</label>
                            <input type="text" value={filters.kategori} onChange={e => setFilters(f => ({...f, kategori: e.target.value}))} placeholder="Cari kategori..." className="app-input h-10 w-full min-w-[180px] rounded-md px-3 text-sm"/>
                        </div>
                    </div>
                </div>

                <div className="app-table-shell min-h-[300px]">
                    <div className="space-y-3 p-3 md:hidden">
                        {transactions.map(t => (
                            <div key={t.id} className="rounded-2xl border border-slate-200 bg-white p-3">
                                <div className="mb-2 flex items-start justify-between gap-3">
                                    <div>
                                        <p className="text-xs text-slate-500">{new Date(t.tanggal).toLocaleString('id-ID', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })}</p>
                                        <p className="mt-1 text-sm font-semibold text-slate-800">{t.kategori}</p>
                                    </div>
                                    <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${t.jenis === 'Pemasukan' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                        {t.jenis}
                                    </span>
                                </div>
                                <p className="text-sm text-slate-700">{t.deskripsi}</p>
                                {t.penanggungJawab && <p className="mt-1 text-xs text-slate-500">Oleh: {t.penanggungJawab}</p>}
                                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                                    <div className="rounded-lg bg-slate-50 p-2">
                                        <p className="text-slate-500">Nominal</p>
                                        <p className={`font-semibold ${t.jenis === 'Pemasukan' ? 'text-green-700' : 'text-red-700'}`}>{formatRupiah(t.jumlah)}</p>
                                    </div>
                                    <div className="rounded-lg bg-slate-50 p-2">
                                        <p className="text-slate-500">Saldo Setelah</p>
                                        <p className="font-semibold text-slate-800">{formatRupiah(t.saldoSetelah)}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {transactions.length === 0 && !isLoading && (
                            <EmptyState icon="bi-inbox" title="Tidak ada transaksi" description="Tidak ada transaksi yang cocok dengan filter buku kas saat ini." />
                        )}
                    </div>

                    <div className="hidden overflow-x-auto md:block">
                    <table className="app-table text-left">
                        <thead className="sticky top-0 z-10 border-b border-app-border">
                            <tr>
                                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Tanggal</th>
                                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Kategori</th>
                                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Deskripsi</th>
                                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-right">Pemasukan</th>
                                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-right">Pengeluaran</th>
                                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-right">Saldo</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {transactions.map(t => (
                                <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-mono">{new Date(t.tanggal).toLocaleString('id-ID', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })}</td>
                                    <td className="px-6 py-4 whitespace-nowrap"><span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">{t.kategori}</span></td>
                                    <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate" title={t.deskripsi}>{t.deskripsi}{t.penanggungJawab && <div className="text-xs text-gray-400 mt-0.5">Oleh: {t.penanggungJawab}</div>}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-green-600">{t.jenis === 'Pemasukan' ? formatRupiah(t.jumlah) : '-'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-red-600">{t.jenis === 'Pengeluaran' ? formatRupiah(t.jumlah) : '-'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-gray-800">{formatRupiah(t.saldoSetelah)}</td>
                                </tr>
                            ))}
                             {transactions.length === 0 && !isLoading && <tr><td colSpan={6} className="p-4"><EmptyState icon="bi-inbox" title="Tidak ada transaksi" description="Tidak ada transaksi yang cocok dengan filter buku kas saat ini." /></td></tr>}
                        </tbody>
                    </table>
                    </div>
                </div>

                <div className="bg-gray-50 border-t border-gray-200 p-4">
                     <Pagination currentPage={currentPage} totalPages={Math.ceil(totalItems / itemsPerPage)} onPageChange={setCurrentPage} />
                </div>
            </SectionCard>
            {isModalOpen && <TransaksiModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSave} existingKategori={existingKategori} />}
        </div>
    );
};

export default BukuKas;
