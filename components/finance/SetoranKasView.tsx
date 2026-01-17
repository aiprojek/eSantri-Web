
import React, { useState, useMemo } from 'react';
import { useAppContext } from '../../AppContext';
import { useSantriContext } from '../../contexts/SantriContext';
import { useFinanceContext } from '../../contexts/FinanceContext';
import { Pembayaran, Santri } from '../../types';
import { formatRupiah } from '../../utils/formatters';

interface SetoranKasViewProps {
    canWrite: boolean;
}

export const SetoranKasView: React.FC<SetoranKasViewProps> = ({ canWrite }) => {
    const { showToast, showConfirmation } = useAppContext();
    const { santriList } = useSantriContext();
    const { pembayaranList, onSetorKeKas } = useFinanceContext();
    
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
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
        <div className="bg-white p-6 rounded-lg shadow-md space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-xl font-bold text-gray-700">Setoran Kas (Closing Harian)</h2>
                    <p className="text-sm text-gray-500">Pindahkan uang pembayaran santri yang diterima ke Buku Kas Umum.</p>
                </div>
                {canWrite && (
                    <div className="bg-green-50 px-4 py-2 rounded-lg border border-green-200 text-right">
                        <p className="text-xs text-green-600 font-bold uppercase">Total Dipilih</p>
                        <p className="text-xl font-bold text-green-800">{formatRupiah(totalSelected)}</p>
                    </div>
                )}
            </div>

            {/* Filter Bar */}
            <div className="flex flex-wrap items-end gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">Tanggal Transaksi</label>
                    <input 
                        type="date" 
                        value={filterTanggal} 
                        onChange={e => { setFilterTanggal(e.target.value); setSelectedIds([]); }} 
                        className="bg-white border border-gray-300 rounded-md text-sm p-2"
                    />
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">Metode Pembayaran</label>
                    <div className="flex bg-white rounded-md border border-gray-300 overflow-hidden">
                        {(['Tunai', 'Transfer', 'Semua'] as const).map(m => (
                            <button
                                key={m}
                                onClick={() => { setFilterMetode(m); setSelectedIds([]); }}
                                className={`px-4 py-2 text-sm font-medium transition-colors ${filterMetode === m ? 'bg-teal-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
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
                            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg text-sm font-bold shadow-sm disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            <i className="bi bi-box-arrow-in-down"></i> Setor ke Buku Kas
                        </button>
                    </div>
                )}
            </div>

            {/* Table */}
            <div className="border rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-100">
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
                            <th className="px-4 py-3 text-left font-medium text-gray-600">Waktu</th>
                            <th className="px-4 py-3 text-left font-medium text-gray-600">Nama Santri</th>
                            <th className="px-4 py-3 text-left font-medium text-gray-600">Metode</th>
                            <th className="px-4 py-3 text-right font-medium text-gray-600">Jumlah</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                        {pendingPayments.map(p => (
                            <tr key={p.id} className={selectedIds.includes(p.id) ? 'bg-blue-50' : 'hover:bg-gray-50'}>
                                <td className="px-4 py-3 text-center">
                                    <input 
                                        type="checkbox" 
                                        checked={selectedIds.includes(p.id)} 
                                        onChange={() => handleSelectOne(p.id)}
                                        disabled={!canWrite}
                                        className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500"
                                    />
                                </td>
                                <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                                    {new Date(p.tanggal).toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'})}
                                </td>
                                <td className="px-4 py-3 font-medium text-gray-800">
                                    {getSantriName(p.santriId)}
                                    {p.catatan && <div className="text-xs text-gray-500 font-normal italic">{p.catatan}</div>}
                                </td>
                                <td className="px-4 py-3">
                                    <span className={`px-2 py-1 text-xs rounded-full border ${p.metode === 'Tunai' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                                        {p.metode}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-right font-mono font-medium text-gray-800">
                                    {formatRupiah(p.jumlah)}
                                </td>
                            </tr>
                        ))}
                        {pendingPayments.length === 0 && (
                            <tr>
                                <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                                    <div className="flex flex-col items-center">
                                        <i className="bi bi-check-circle-fill text-4xl text-green-300 mb-2"></i>
                                        <p className="font-medium">Semua Bersih!</p>
                                        <p className="text-xs mt-1">Tidak ada pembayaran tanggal ini yang belum disetor ke kas.</p>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                    {pendingPayments.length > 0 && (
                        <tfoot className="bg-gray-50">
                            <tr>
                                <td colSpan={4} className="px-4 py-3 text-right font-bold text-gray-700">Total Potensi Setoran:</td>
                                <td className="px-4 py-3 text-right font-bold text-gray-900">{formatRupiah(totalNominal)}</td>
                            </tr>
                        </tfoot>
                    )}
                </table>
            </div>
        </div>
    );
};
