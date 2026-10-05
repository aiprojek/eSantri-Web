
import React, { useState, useMemo } from 'react';
import { useAppContext } from '../../AppContext';
import { useSantriContext } from '../../contexts/SantriContext';
import { useFinanceContext } from '../../contexts/FinanceContext';
import { formatRupiah } from '../../utils/formatters';
import { SectionCard } from '../common/SectionCard';
import { EmptyState } from '../common/EmptyState';

interface SetoranKasViewProps {
    canWrite: boolean;
}

const REKENING_LIST = [
    'Kas Tunai Bendahara',
    'Bank Syariah Indonesia (BSI)',
    'Bank Muamalat',
    'Bank BRI / Mandiri',
    'Kas Kecil Operasional',
];

export const SetoranKasView: React.FC<SetoranKasViewProps> = ({ canWrite }) => {
    const { showToast, showConfirmation, currentUser } = useAppContext();
    const { santriList } = useSantriContext();
    const { pembayaranList, onSetorKeKas } = useFinanceContext();
    
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const btnPrimary = "rounded-md bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-700 active:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60";
    const [filterMetode, setFilterMetode] = useState<'Semua' | 'Tunai' | 'Transfer' | 'Potong Saldo'>('Semua');
    const [filterTanggal, setFilterTanggal] = useState(new Date().toISOString().split('T')[0]);
    const [semuaTanggal, setSemuaTanggal] = useState(true);
    const [rekeningTujuan, setRekeningTujuan] = useState('Kas Tunai Bendahara');

    // Data Derived
    const pendingPayments = useMemo(() => {
        return pembayaranList.filter(p => 
            !p.disetorKeKas && 
            (filterMetode === 'Semua' || p.metode === filterMetode) &&
            (semuaTanggal || p.tanggal.startsWith(filterTanggal))
        ).sort((a,b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());
    }, [pembayaranList, filterMetode, filterTanggal, semuaTanggal]);

    const totalUnsettledAll = useMemo(() => {
        return pembayaranList.filter(p => !p.disetorKeKas).reduce((s, p) => s + p.jumlah, 0);
    }, [pembayaranList]);

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
        const dateLabel = semuaTanggal ? 'Semua Periode' : new Date(filterTanggal).toLocaleDateString('id-ID');
        const note = `Setoran Penerimaan ${methodLabel} (${dateLabel} - ${selectedIds.length} Transaksi)`;
        const pj = currentUser?.fullName || currentUser?.username || 'Bendahara';

        showConfirmation(
            'Konfirmasi Setoran Kas',
            `Anda akan menyetorkan total ${formatRupiah(totalSelected)} ke Pos "${rekeningTujuan}" di Buku Kas Umum.\n\nKeterangan: "${note}"`,
            async () => {
                try {
                    await onSetorKeKas(selectedIds, totalSelected, new Date().toISOString(), pj, note, rekeningTujuan);
                    showToast(`Setoran berhasil dicatat ke ${rekeningTujuan}.`, 'success');
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
            title="Setoran Kas (Closing Harian & Rekonsiliasi)"
            description="Pindahkan pembayaran santri yang masih berada di laci kasir ke Pos Rekening / Buku Kas Umum."
            contentClassName="space-y-4 p-5 sm:p-6"
        >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-amber-50 px-4 py-3 rounded-xl border border-amber-200">
                    <p className="text-xs text-amber-700 font-bold uppercase">Total Belum Disetor (Semua Hari)</p>
                    <p className="text-xl font-bold text-amber-900 mt-0.5">{formatRupiah(totalUnsettledAll)}</p>
                </div>
                <div className="bg-slate-50 px-4 py-3 rounded-xl border border-slate-200">
                    <p className="text-xs text-slate-600 font-bold uppercase">Potensi Sesuai Filter ({pendingPayments.length} Tx)</p>
                    <p className="text-xl font-bold text-slate-800 mt-0.5">{formatRupiah(totalNominal)}</p>
                </div>
                <div className="bg-green-50 px-4 py-3 rounded-xl border border-green-200">
                    <p className="text-xs text-green-700 font-bold uppercase">Total Dipilih Akan Disetor</p>
                    <p className="text-xl font-bold text-green-800 mt-0.5">{formatRupiah(totalSelected)}</p>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="app-toolbar flex-wrap gap-3">
                <div>
                    <label className="app-label mb-1.5 block pl-1">Periode Tanggal</label>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => { setSemuaTanggal(!semuaTanggal); setSelectedIds([]); }}
                            className={`h-10 px-3 rounded-md text-xs font-semibold border transition-colors ${semuaTanggal ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'}`}
                        >
                            Semua Tanggal
                        </button>
                        {!semuaTanggal && (
                            <input 
                                type="date" 
                                value={filterTanggal} 
                                onChange={e => { setFilterTanggal(e.target.value); setSelectedIds([]); }} 
                                className="app-input h-10 rounded-md px-3 text-sm"
                            />
                        )}
                    </div>
                </div>
                <div>
                    <label className="app-label mb-1.5 block pl-1">Metode Pembayaran</label>
                    <div className="overflow-hidden rounded-md border border-app-border bg-white flex">
                        {(['Semua', 'Tunai', 'Transfer', 'Potong Saldo'] as const).map(m => (
                            <button
                                key={m}
                                onClick={() => { setFilterMetode(m); setSelectedIds([]); }}
                                className={`h-10 px-3.5 text-xs font-semibold transition-colors ${filterMetode === m ? 'bg-teal-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
                            >
                                {m}
                            </button>
                        ))}
                    </div>
                </div>
                {canWrite && (
                    <div className="ml-auto flex flex-wrap items-end gap-2">
                        <div>
                            <label className="app-label mb-1.5 block pl-1">Pos Kas / Rekening Tujuan</label>
                            <select
                                value={rekeningTujuan}
                                onChange={e => setRekeningTujuan(e.target.value)}
                                className="app-select h-10 px-3 text-xs font-semibold min-w-[210px]"
                            >
                                {REKENING_LIST.map(r => <option key={r} value={r}>{r}</option>)}
                            </select>
                        </div>
                        <button 
                            onClick={handleProcessSetoran} 
                            disabled={selectedIds.length === 0}
                            className={`${btnPrimary} h-10`}
                        >
                            <i className="bi bi-box-arrow-in-down mr-1.5"></i>
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
                                <p className="text-xs text-slate-500">{new Date(p.tanggal).toLocaleDateString('id-ID', {day: '2-digit', month: 'short', year: 'numeric'})}</p>
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
                            <span className={`rounded-full border px-2 py-1 ${p.metode === 'Tunai' ? 'bg-green-50 text-green-700 border-green-200' : p.metode === 'Transfer' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-purple-50 text-purple-700 border-purple-200'}`}>{p.metode}</span>
                            <span className="font-mono font-semibold text-slate-800">{formatRupiah(p.jumlah)}</span>
                        </div>
                    </div>
                ))}
                {pendingPayments.length === 0 && (
                    <EmptyState
                        icon="bi-check-circle"
                        title="Semua setoran sudah bersih"
                        description="Tidak ada pembayaran pada filter ini yang belum dipindahkan ke Buku Kas."
                        compact
                    />
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
                            <th className="px-4 py-3 text-left font-medium text-slate-600">Tanggal</th>
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
                                    {new Date(p.tanggal).toLocaleDateString('id-ID', {day: '2-digit', month: 'short', year: 'numeric'})}
                                </td>
                                <td className="px-4 py-3 font-medium text-slate-800">
                                    {getSantriName(p.santriId)}
                                    {p.catatan && <div className="text-xs font-normal italic text-slate-500">{p.catatan}</div>}
                                </td>
                                <td className="px-4 py-3">
                                    <span className={`px-2.5 py-1 text-xs font-medium rounded-full border ${p.metode === 'Tunai' ? 'bg-green-50 text-green-700 border-green-200' : p.metode === 'Transfer' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-purple-50 text-purple-700 border-purple-200'}`}>
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
                                        description="Tidak ada pembayaran pada filter ini yang belum dipindahkan ke Buku Kas."
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

