
import React, { useState, useMemo } from 'react';
import { useLiveQuery } from "dexie-react-hooks";
import { db } from '../../db';
import { useFinanceContext } from '../../contexts/FinanceContext';
import { useSantriContext } from '../../contexts/SantriContext';
import { TransaksiKoperasi } from '../../types';
import { formatRupiah } from '../../utils/formatters';
import { KasbonDetailModal } from './modals/KasbonDetailModal';

export const KasbonManager: React.FC = () => {
    const { santriList } = useSantriContext();
    const { saldoSantriList } = useFinanceContext();
    
    const [activeTab, setActiveTab] = useState<'pending' | 'settled'>('pending');
    
    // Get ALL transactions that are NOT 'Lunas'
    const debts = useLiveQuery(() => db.transaksiKoperasi.where('statusTransaksi').equals(activeTab === 'pending' ? 'Belum Lunas' : 'Lunas').toArray(), [activeTab]) || [];
    
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedTrx, setSelectedTrx] = useState<TransaksiKoperasi | null>(null);

    const filteredDebts = useMemo(() => {
        return debts.filter(d => 
            d.namaPembeli.toLowerCase().includes(searchTerm.toLowerCase()) || 
            (d.catatanPembayaran && d.catatanPembayaran.toLowerCase().includes(searchTerm.toLowerCase()))
        ).sort((a,b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());
    }, [debts, searchTerm]);

    const totalPiutang = useMemo(() => filteredDebts.reduce((sum, d) => sum + (d.sisaTagihan ?? (d.totalFinal - (d.bayar||0))), 0), [filteredDebts]);

    const getSantriDetails = (trx: TransaksiKoperasi) => {
        if (trx.tipePembeli === 'Santri' && trx.pembeliId) {
            const santri = santriList.find(s => s.id === trx.pembeliId);
            const saldo = saldoSantriList.find(s => s.santriId === trx.pembeliId)?.saldo || 0;
            return { santri, saldo };
        }
        return { santri: undefined, saldo: 0 };
    };

    return (
        <div className="space-y-6 h-full flex flex-col">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-red-50 p-4 rounded-lg border border-red-100 shadow-sm shrink-0">
                <div className="flex items-center gap-3">
                    <div className="bg-red-100 text-red-600 w-12 h-12 rounded-full flex items-center justify-center text-2xl">
                        <i className="bi bi-journal-minus"></i>
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-red-800">Daftar Piutang / Kasbon</h2>
                        <p className="text-xs text-red-600">Total Piutang Belum Terbayar</p>
                    </div>
                </div>
                <div className="text-right">
                    <span className="text-3xl font-bold text-red-700">{formatRupiah(totalPiutang)}</span>
                    <p className="text-xs text-red-500">{filteredDebts.length} Transaksi {activeTab === 'pending' ? 'Belum Lunas' : 'Sudah Lunas'}</p>
                </div>
            </div>

            <div className="flex flex-col md:flex-row gap-4 shrink-0">
                <div className="grid grid-cols-2 bg-white rounded-lg shadow-sm border p-1">
                    <button onClick={() => setActiveTab('pending')} className={`px-4 py-2 text-sm font-bold rounded-md transition-all ${activeTab === 'pending' ? 'bg-red-100 text-red-700' : 'text-gray-500 hover:bg-gray-50'}`}>Belum Lunas</button>
                    <button onClick={() => setActiveTab('settled')} className={`px-4 py-2 text-sm font-bold rounded-md transition-all ${activeTab === 'settled' ? 'bg-green-100 text-green-700' : 'text-gray-500 hover:bg-gray-50'}`}>Sudah Lunas</button>
                </div>
                <div className="relative flex-grow">
                    <input 
                        type="text" 
                        placeholder="Cari Nama Pembeli / Catatan..." 
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full pl-9 border rounded-lg p-2.5 text-sm"
                    />
                    <i className="bi bi-search absolute left-3 top-3 text-gray-400"></i>
                </div>
            </div>

            <div className="bg-white border rounded-lg shadow-sm overflow-hidden flex-grow flex flex-col">
                <div className="overflow-y-auto flex-grow">
                    <table className="hidden md:table w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-600 sticky top-0">
                            <tr>
                                <th className="p-3">Tanggal</th>
                                <th className="p-3">Nama Pembeli</th>
                                <th className="p-3">Item</th>
                                <th className="p-3 text-right">Total Tagihan</th>
                                <th className="p-3 text-right">Sisa Hutang</th>
                                <th className="p-3 text-center">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {filteredDebts.map(trx => {
                                const { santri, saldo } = getSantriDetails(trx);
                                const debtAmount = trx.sisaTagihan ?? (trx.totalFinal - (trx.bayar || 0));
                                return (
                                    <tr key={trx.id} className="hover:bg-red-50/30 transition-colors">
                                        <td className="p-3 whitespace-nowrap">
                                            <div className="font-medium text-gray-700">{new Date(trx.tanggal).toLocaleDateString('id-ID')}</div>
                                            <div className="text-xs text-gray-500">{new Date(trx.tanggal).toLocaleTimeString('id-ID', {hour:'2-digit', minute:'2-digit'})}</div>
                                        </td>
                                        <td className="p-3">
                                            <div className="font-bold text-gray-800">{trx.namaPembeli}</div>
                                            <div className="text-xs text-gray-500 flex gap-2">
                                                <span className="bg-gray-100 px-1.5 rounded">{trx.tipePembeli}</span>
                                                {santri && <span className="text-blue-600 font-medium">Saldo: {formatRupiah(saldo)}</span>}
                                            </div>
                                            {trx.catatanPembayaran && <div className="text-xs italic text-red-500 mt-0.5">Note: {trx.catatanPembayaran}</div>}
                                        </td>
                                        <td className="p-3 text-xs text-gray-600 max-w-xs truncate">
                                            {trx.items.map(i => `${i.nama} (${i.qty})`).join(', ')}
                                        </td>
                                        <td className="p-3 text-right text-gray-500">
                                            {formatRupiah(trx.totalFinal)}
                                        </td>
                                        <td className="p-3 text-right">
                                            <span className={`font-bold ${debtAmount > 0 ? 'text-red-600' : 'text-green-600'}`}>{formatRupiah(debtAmount)}</span>
                                        </td>
                                        <td className="p-3 text-center">
                                            <button 
                                                onClick={() => setSelectedTrx(trx)}
                                                className={`${activeTab === 'pending' ? 'bg-teal-600 hover:bg-teal-700' : 'bg-blue-600 hover:bg-blue-700'} text-white px-3 py-1.5 rounded text-xs font-bold shadow-sm flex items-center gap-1 mx-auto`}
                                            >
                                                <i className={`bi ${activeTab === 'pending' ? 'bi-cash-stack' : 'bi-eye'}`}></i> {activeTab === 'pending' ? 'Lunasi' : 'Detail'}
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                            {filteredDebts.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="p-10 text-center text-gray-400">
                                        <i className="bi bi-check-circle text-4xl mb-2 block text-green-300"></i>
                                        Tidak ada data kasbon {activeTab === 'pending' ? 'yang belum lunas' : 'yang sudah lunas'}.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                    <div className="md:hidden p-3 space-y-3">
                        {filteredDebts.map(trx => {
                            const { santri, saldo } = getSantriDetails(trx);
                            const debtAmount = trx.sisaTagihan ?? (trx.totalFinal - (trx.bayar || 0));
                            return (
                                <div key={trx.id} className="border rounded-lg p-3 bg-white">
                                    <div className="flex items-start justify-between gap-2">
                                        <div>
                                            <div className="text-xs text-gray-500">{new Date(trx.tanggal).toLocaleDateString('id-ID')} · {new Date(trx.tanggal).toLocaleTimeString('id-ID', {hour:'2-digit', minute:'2-digit'})}</div>
                                            <div className="font-semibold text-sm text-gray-800">{trx.namaPembeli}</div>
                                            <div className="text-[11px] text-gray-500">{trx.tipePembeli}{santri ? ` · Saldo ${formatRupiah(saldo)}` : ''}</div>
                                        </div>
                                        <button
                                            onClick={() => setSelectedTrx(trx)}
                                            className={`${activeTab === 'pending' ? 'bg-teal-600 hover:bg-teal-700' : 'bg-blue-600 hover:bg-blue-700'} text-white px-2.5 py-1.5 rounded text-[11px] font-bold`}
                                        >
                                            {activeTab === 'pending' ? 'Lunasi' : 'Detail'}
                                        </button>
                                    </div>
                                    <div className="mt-2 text-xs text-gray-600 truncate">{trx.items.map(i => `${i.nama} (${i.qty})`).join(', ')}</div>
                                    {trx.catatanPembayaran && <div className="mt-1 text-xs italic text-red-500 truncate">Note: {trx.catatanPembayaran}</div>}
                                    <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                                        <div className="rounded bg-gray-50 border border-gray-200 p-2">
                                            <div className="text-gray-500">Total</div>
                                            <div className="font-semibold text-gray-800">{formatRupiah(trx.totalFinal)}</div>
                                        </div>
                                        <div className="rounded bg-red-50 border border-red-200 p-2">
                                            <div className="text-red-600">Sisa Hutang</div>
                                            <div className={`font-bold ${debtAmount > 0 ? 'text-red-700' : 'text-green-700'}`}>{formatRupiah(debtAmount)}</div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        {filteredDebts.length === 0 && (
                            <div className="p-6 text-center text-sm text-gray-400 border rounded-lg">
                                Tidak ada data kasbon {activeTab === 'pending' ? 'yang belum lunas' : 'yang sudah lunas'}.
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {selectedTrx && (
                <KasbonDetailModal 
                    isOpen={!!selectedTrx} 
                    onClose={() => setSelectedTrx(null)} 
                    transaksi={selectedTrx}
                    santri={getSantriDetails(selectedTrx).santri}
                    saldoSantri={getSantriDetails(selectedTrx).saldo}
                />
            )}
        </div>
    );
};
