
import React, { useState, useMemo } from 'react';
import { useAppContext } from '../../AppContext';
import { useSantriContext } from '../../contexts/SantriContext';
import { useFinanceContext } from '../../contexts/FinanceContext';
import { Pembayaran, Santri } from '../../types';
import { formatRupiah } from '../../utils/formatters';
import { SectionCard } from '../common/SectionCard';
import { EmptyState } from '../common/EmptyState';

interface SetoranKasViewProps {
    canWrite: boolean;
}

export const SetoranKasView: React.FC<SetoranKasViewProps> = ({ canWrite }) => {
    const { showToast, showConfirmation } = useAppContext();
    const { santriList } = useSantriContext();
    const { pembayaranList, onSetorKeKas } = useFinanceContext();
    
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const btnPrimary = "rounded-md bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-700 active:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60";
    const [filterMetode, setFilterMetode] = useState<'Semua' | 'Tunai' | 'Transfer'>('Tunai'); // Default Tunai karena prioritas kasir
    const [filterTanggal, setFilterTanggal] = useState(new Date().toISOString().split('T')[0]);

    // Data Derived
    const pendingPayments = useMemo(() => {
        return pembayaranList.filter(p => 
            !p.disetorKeKas && 
            (filterMetode === 'Semua' || p.metode === filterMetode) &&
            p.tanggal.startsWith(filterTanggal)
        ).sort((a,b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());
    }, [pembayaranList, filterMetode, filterTanggal]);

    const totalNominal = useMemo(() => {
        return pendingPayments.reduce((sum, p) => sum + p.jumlah, 0);
    }, [pendingPayments]);

    const totalSelected = useMemo(() => {
        return pendingPayments
            .filter(p => selectedIds.includes(p.id))
            .reduce((sum, p) => sum + p.jumlah, 0);
    }, [pendingPayments, selectedIds]);

    // Handlers
    const handleSelectAll = () => {
        if (selectedIds.length === pendingPayments.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(pendingPayments.map(p => p.id));
        }
    };

    const handleSelectOne = (id: number) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    const handleProcessSetoran = () => {
        if (selectedIds.length === 0) {
            showToast('Pilih minimal satu transaksi.', 'error');
            return;
        }

        const methodLabel = filterMetode === 'Semua' ? 'Gabungan' : filterMetode;
        const note = `Setoran Penerimaan ${methodLabel} Tgl ${new Date(filterTanggal).toLocaleDateString('id-ID')} (${selectedIds.length} Transaksi)`;

        showConfirmation(
            'Konfirmasi Setoran Kas',
            `Anda akan memasukkan total ${formatRupiah(totalSelected)} ke Buku Kas Umum sebagai Pemasukan. \n\nKeterangan: "${note}"`,
            async () => {
                try {
                    await onSetorKeKas(selectedIds, totalSelected, new Date().toISOString(), 'Admin', note);
                    showToast('Setoran berhasil dicatat di Buku Kas.', 'success');
                    setSelectedIds([]);
                } catch (error) {
                    showToast('Gagal memproses setoran.', 'error');
                }
            },
            { confirmText: 'Ya, Setor Sekarang', confirmColor: 'green' }
        );
    };

    const getSantriName = (id: number) => santriList.find(s => s.id === id)?.namaLengkap || 'Hamba Allah';

    return (
        <SectionCard
            title="Setoran Kas (Closing Harian)"
            description="Pindahkan pembayaran yang diterima ke Buku Kas Umum berdasarkan tanggal dan metode pembayaran."
            contentClassName="space-y-4 p-5 sm:p-6"
        >
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                {canWrite && (
                    <div className="bg-green-50 px-4 py-2 rounded-lg border border-green-200 text-right">
                        <p className="text-xs text-green-600 font-bold uppercase">Total Dipilih</p>
                        <p className="text-xl font-bold text-green-800">{formatRupiah(totalSelected)}</p>
                    </div>
                )}
            </div>

            {/* Filter Bar */}
            <div className="app-toolbar">
                <div>
                    <label className="app-label mb-1.5 block pl-1">Tanggal Transaksi</label>
                    <input 
                        type="date" 
                        value={filterTanggal} 
                        onChange={e => { setFilterTanggal(e.target.value); setSelectedIds([]); }} 
                        className="app-input h-10 rounded-md px-3 text-sm"
                    />
                </div>
                <div>
                    <label className="app-label mb-1.5 block pl-1">Metode Pembayaran</label>
                    <div className="overflow-hidden rounded-md border border-app-border bg-white">
                        {(['Tunai', 'Transfer', 'Semua'] as const).map(m => (
                            <button
                                key={m}
                                onClick={() => { setFilterMetode(m); setSelectedIds([]); }}
                                className={`h-10 px-4 text-sm font-medium transition-colors ${filterMetode === m ? 'bg-teal-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
                            >
                                {m}
                            </button>
                        ))}
                    </div>
                </div>
                {canWrite && (
                    <div className="ml-auto">
                        <button 
                            onClick={handleProcessSetoran} 
                            disabled={selectedIds.length === 0}
                            className={btnPrimary}
                        >
                            Setor ke Buku Kas
                        </button>
                    </div>
                )}
            </div>

            {/* Table */}
            <div className="app-table-shell">
            <div className="space-y-3 p-3 md:hidden">
                {pendingPayments.map(p => (
                    <div key={p.id} className={`rounded-2xl border p-3 ${selectedIds.includes(p.id) ? 'border-teal-300 bg-teal-50/60' : 'border-slate-200 bg-white'}`}>
                        <div className="mb-2 flex items-start justify-between gap-2">
                            <div>
                                <p className="text-sm font-semibold text-slate-800">{getSantriName(p.santriId)}</p>
                                <p className="text-xs text-slate-500">{new Date(p.tanggal).toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'})}</p>
                            </div>
                            <input
                                type="checkbox"
                                checked={selectedIds.includes(p.id)}
                                onChange={() => handleSelectOne(p.id)}
                                disabled={!canWrite}
                                className="h-4 w-4 text-teal-600"
                            />
                        </div>
                        {p.catatan && <p className="mb-2 text-xs italic text-slate-500">{p.catatan}</p>}
                        <div className="flex items-center justify-between text-xs">
                            <span className={`rounded-full border px-2 py-1 ${p.metode === 'Tunai' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>{p.metode}</span>
                            <span className="font-mono font-semibold text-slate-800">{formatRupiah(p.jumlah)}</span>
                        </div>
                    </div>
                ))}
                {pendingPayments.length === 0 && (
                    <EmptyState
                        icon="bi-check-circle"
                        title="Semua setoran sudah bersih"
                        description="Tidak ada pembayaran pada tanggal dan metode ini yang belum dipindahkan ke Buku Kas."
                        compact
                    />
                )}
                {pendingPayments.length > 0 && (
                    <div className="rounded-xl bg-slate-50 p-3 text-sm font-semibold text-slate-800">
                        Total Potensi Setoran: {formatRupiah(totalNominal)}
                    </div>
                )}
            </div>
            <div className="app-scrollbar hidden overflow-hidden md:block">
                <table className="app-table min-w-full divide-y divide-slate-200 text-sm">
                    <thead>
                        <tr>
                            <th className="px-4 py-3 w-10 text-center">
                                <input 
                                    type="checkbox" 
                                    checked={pendingPayments.length > 0 && selectedIds.length === pendingPayments.length} 
                                    onChange={handleSelectAll}
                                    disabled={!canWrite || pendingPayments.length === 0}
                                    className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500"
                                />
                            </th>
                            <th className="px-4 py-3 text-left font-medium text-slate-600">Waktu</th>
                            <th className="px-4 py-3 text-left font-medium text-slate-600">Nama Santri</th>
                            <th className="px-4 py-3 text-left font-medium text-slate-600">Metode</th>
                            <th className="px-4 py-3 text-right font-medium text-slate-600">Jumlah</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                        {pendingPayments.map(p => (
                            <tr key={p.id} className={selectedIds.includes(p.id) ? 'bg-blue-50' : 'hover:bg-teal-50/40'}>
                                <td className="px-4 py-3 text-center">
                                    <input 
                                        type="checkbox" 
                                        checked={selectedIds.includes(p.id)} 
                                        onChange={() => handleSelectOne(p.id)}
                                        disabled={!canWrite}
                                        className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500"
                                    />
                                </td>
                                <td className="whitespace-nowrap px-4 py-3 text-slate-500">
                                    {new Date(p.tanggal).toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'})}
                                </td>
                                <td className="px-4 py-3 font-medium text-slate-800">
                                    {getSantriName(p.santriId)}
                                    {p.catatan && <div className="text-xs font-normal italic text-slate-500">{p.catatan}</div>}
                                </td>
                                <td className="px-4 py-3">
                                    <span className={`px-2 py-1 text-xs rounded-full border ${p.metode === 'Tunai' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                                        {p.metode}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-right font-mono font-medium text-slate-800">
                                    {formatRupiah(p.jumlah)}
                                </td>
                            </tr>
                        ))}
                        {pendingPayments.length === 0 && (
                            <tr>
                                <td colSpan={5} className="p-0">
                                    <EmptyState
                                        icon="bi-check-circle"
                                        title="Semua setoran sudah bersih"
                                        description="Tidak ada pembayaran pada tanggal dan metode ini yang belum dipindahkan ke Buku Kas."
                                        compact
                                    />
                                </td>
                            </tr>
                        )}
                    </tbody>
                    {pendingPayments.length > 0 && (
                        <tfoot className="bg-slate-50">
                            <tr>
                                <td colSpan={4} className="px-4 py-3 text-right font-bold text-slate-700">Total Potensi Setoran:</td>
                                <td className="px-4 py-3 text-right font-bold text-slate-900">{formatRupiah(totalNominal)}</td>
                            </tr>
                        </tfoot>
                    )}
                </table>
            </div>
            </div>
        </SectionCard>
    );
};
