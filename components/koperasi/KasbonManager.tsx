
import React, { useState, useMemo } from 'react';
import { useLiveQuery } from "dexie-react-hooks";
import { useForm } from 'react-hook-form';
import { db } from '../../db';
import { useAppContext } from '../../AppContext';
import { useFinanceContext } from '../../contexts/FinanceContext';
import { useSantriContext } from '../../contexts/SantriContext';
import { TransaksiKoperasi, Santri } from '../../types';
import { formatRupiah, formatDateTime } from '../../utils/formatters';

// --- MODAL PELUNASAN ---
interface PelunasanModalProps {
    isOpen: boolean;
    onClose: () => void;
    transaksi: TransaksiKoperasi;
    santri?: Santri; // Optional if Non-Santri
    saldoSantri: number;
}

const PelunasanModal: React.FC<PelunasanModalProps> = ({ isOpen, onClose, transaksi, santri, saldoSantri }) => {
    const { showToast, currentUser } = useAppContext();
    const { onAddTransaksiSaldo, onAddTransaksiKas } = useFinanceContext();
    const [metode, setMetode] = useState<'Tunai' | 'Tabungan'>('Tunai');
    const [isProcessing, setIsProcessing] = useState(false);

    if (!isOpen) return null;

    const jumlahTagihan = transaksi.totalFinal - (transaksi.bayar || 0);

    const handleBayar = async () => {
        setIsProcessing(true);
        try {
            // 1. Validasi Saldo jika pakai Tabungan
            if (metode === 'Tabungan') {
                if (!santri) throw new Error("Data santri tidak ditemukan.");
                if (saldoSantri < jumlahTagihan) {
                    throw new Error(`Saldo tidak cukup. Sisa saldo: ${formatRupiah(saldoSantri)}`);
                }

                // Potong Saldo
                await onAddTransaksiSaldo({
                    santriId: santri.id,
                    jenis: 'Penarikan',
                    jumlah: jumlahTagihan,
                    keterangan: `Pelunasan Kasbon #${transaksi.id} (${transaksi.items.length} item)`
                });
            }

            // 2. Masukkan ke Arus Kas (Pemasukan) karena uang diterima (baik fisik/digital)
            await onAddTransaksiKas({
                jenis: 'Pemasukan',
                kategori: 'Pelunasan Kasbon Koperasi',
                deskripsi: `Pelunasan Trx #${transaksi.id} oleh ${transaksi.namaPembeli} (${metode})`,
                jumlah: jumlahTagihan,
                penanggungJawab: currentUser?.fullName || 'Kasir'
            });

            // 3. Update Status Transaksi Koperasi
            await db.transaksiKoperasi.update(transaksi.id, {
                statusTransaksi: 'Lunas',
                metodePembayaran: metode, // Update metode ke metode pelunasan
                bayar: transaksi.totalFinal,
                kembali: 0,
                sisaTagihan: 0,
                lastModified: Date.now()
            });

            showToast('Kasbon berhasil dilunasi!', 'success');
            onClose();
        } catch (e: any) {
            showToast(e.message || 'Gagal memproses pelunasan.', 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-[80] flex justify-center items-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md animate-fade-in-down">
                <div className="p-5 border-b bg-red-50 rounded-t-lg">
                    <h3 className="text-lg font-bold text-red-800">Pelunasan Kasbon</h3>
                    <p className="text-sm text-red-600">Trx #{transaksi.id} - {formatDateTime(transaksi.tanggal)}</p>
                </div>
                <div className="p-6 space-y-5">
                    <div className="text-center">
                        <p className="text-sm text-gray-500">Total Tagihan</p>
                        <p className="text-3xl font-bold text-gray-800">{formatRupiah(jumlahTagihan)}</p>
                        <p className="text-sm font-medium text-gray-700 mt-2">{transaksi.namaPembeli}</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Metode Pembayaran</label>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => setMetode('Tunai')}
                                className={`py-3 px-4 rounded-lg border text-sm font-bold flex flex-col items-center gap-1 transition-all ${metode === 'Tunai' ? 'bg-green-50 border-green-500 text-green-700 ring-1 ring-green-500' : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'}`}
                            >
                                <i className="bi bi-cash-coin text-xl"></i>
                                Tunai (Cash)
                            </button>
                            <button
                                onClick={() => setMetode('Tabungan')}
                                disabled={!santri}
                                className={`py-3 px-4 rounded-lg border text-sm font-bold flex flex-col items-center gap-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${metode === 'Tabungan' ? 'bg-blue-50 border-blue-500 text-blue-700 ring-1 ring-blue-500' : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'}`}
                            >
                                <i className="bi bi-credit-card-2-front text-xl"></i>
                                Tabungan Santri
                            </button>
                        </div>
                    </div>

                    {metode === 'Tabungan' && santri && (
                        <div className={`p-3 rounded-lg border ${saldoSantri >= jumlahTagihan ? 'bg-blue-50 border-blue-200 text-blue-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
                            <div className="flex justify-between items-center text-sm">
                                <span>Saldo Tabungan:</span>
                                <span className="font-bold">{formatRupiah(saldoSantri)}</span>
                            </div>
                            {saldoSantri < jumlahTagihan && (
                                <p className="text-xs mt-1 font-bold"><i className="bi bi-exclamation-circle"></i> Saldo tidak mencukupi.</p>
                            )}
                        </div>
                    )}
                </div>
                <div className="p-4 border-t flex justify-end gap-2 bg-gray-50 rounded-b-lg">
                    <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg text-sm border" disabled={isProcessing}>Batal</button>
                    <button 
                        onClick={handleBayar} 
                        disabled={isProcessing || (metode === 'Tabungan' && saldoSantri < jumlahTagihan)}
                        className="px-6 py-2 bg-teal-600 text-white hover:bg-teal-700 rounded-lg text-sm font-bold shadow-sm disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {isProcessing ? <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span> : <i className="bi bi-check-lg"></i>}
                        Proses Pelunasan
                    </button>
                </div>
            </div>
        </div>
    );
};

export const KasbonManager: React.FC = () => {
    const { santriList } = useSantriContext();
    const { saldoSantriList } = useFinanceContext();
    
    // Get ALL transactions that are NOT 'Lunas'
    const debts = useLiveQuery(() => db.transaksiKoperasi.where('statusTransaksi').equals('Belum Lunas').toArray(), []) || [];
    
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedTrx, setSelectedTrx] = useState<TransaksiKoperasi | null>(null);

    const filteredDebts = useMemo(() => {
        return debts.filter(d => 
            d.namaPembeli.toLowerCase().includes(searchTerm.toLowerCase()) || 
            (d.catatanPembayaran && d.catatanPembayaran.toLowerCase().includes(searchTerm.toLowerCase()))
        ).sort((a,b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());
    }, [debts, searchTerm]);

    const totalPiutang = useMemo(() => filteredDebts.reduce((sum, d) => sum + (d.totalFinal - (d.bayar||0)), 0), [filteredDebts]);

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
                    <p className="text-xs text-red-500">{filteredDebts.length} Transaksi</p>
                </div>
            </div>

            <div className="flex gap-2 shrink-0">
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
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-600 sticky top-0">
                            <tr>
                                <th className="p-3">Tanggal</th>
                                <th className="p-3">Nama Pembeli</th>
                                <th className="p-3">Item</th>
                                <th className="p-3 text-right">Total Tagihan</th>
                                <th className="p-3 text-center">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {filteredDebts.map(trx => {
                                const { santri, saldo } = getSantriDetails(trx);
                                const debtAmount = trx.totalFinal - (trx.bayar || 0);
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
                                        <td className="p-3 text-right">
                                            <span className="font-bold text-red-600">{formatRupiah(debtAmount)}</span>
                                        </td>
                                        <td className="p-3 text-center">
                                            <button 
                                                onClick={() => setSelectedTrx(trx)}
                                                className="bg-teal-600 text-white px-3 py-1.5 rounded text-xs font-bold hover:bg-teal-700 shadow-sm flex items-center gap-1 mx-auto"
                                            >
                                                <i className="bi bi-cash-stack"></i> Lunasi
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                            {filteredDebts.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="p-10 text-center text-gray-400">
                                        <i className="bi bi-check-circle text-4xl mb-2 block text-green-300"></i>
                                        Tidak ada data kasbon yang belum lunas.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {selectedTrx && (
                <PelunasanModal 
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
