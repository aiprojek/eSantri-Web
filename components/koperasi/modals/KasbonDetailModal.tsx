
import React, { useState } from 'react';
import { useLiveQuery } from "dexie-react-hooks";
import { db } from '../../../db';
import { useAppContext } from '../../../AppContext';
import { useFinanceContext } from '../../../contexts/FinanceContext';
import { TransaksiKoperasi, Santri, PembayaranHutang } from '../../../types';
import { formatRupiah, formatDateTime } from '../../../utils/formatters';

interface KasbonDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    transaksi: TransaksiKoperasi;
    santri?: Santri;
    saldoSantri: number;
}

export const KasbonDetailModal: React.FC<KasbonDetailModalProps> = ({ isOpen, onClose, transaksi, santri, saldoSantri }) => {
    const { showToast, currentUser } = useAppContext();
    const { onAddTransaksiSaldo, onAddTransaksiKas } = useFinanceContext();
    
    const pembayaranList = useLiveQuery(() => db.pembayaranHutang.where('transaksiId').equals(transaksi.id).toArray(), [transaksi.id]) || [];
    
    const [isPaying, setIsPaying] = useState(false);
    const [bayarAmount, setBayarAmount] = useState<number>(0);
    const [metode, setMetode] = useState<'Tunai' | 'Tabungan' | 'Non-Tunai'>('Tunai');
    const [catatan, setCatatan] = useState('');

    if (!isOpen) return null;

    const sisaHutang = transaksi.sisaTagihan ?? (transaksi.totalFinal - (transaksi.bayar || 0));

    const handleBayar = async () => {
        if (bayarAmount <= 0 || bayarAmount > sisaHutang) {
            showToast('Jumlah pembayaran tidak valid', 'error');
            return;
        }

        try {
            // 1. Validasi Saldo jika pakai Tabungan
            if (metode === 'Tabungan') {
                if (!santri) throw new Error("Data santri tidak ditemukan.");
                if (saldoSantri < bayarAmount) {
                    throw new Error(`Saldo tidak cukup. Sisa saldo: ${formatRupiah(saldoSantri)}`);
                }
                await onAddTransaksiSaldo({
                    santriId: santri.id,
                    jenis: 'Penarikan',
                    jumlah: bayarAmount,
                    keterangan: `Cicilan Kasbon #${transaksi.id}`
                });
            }

            // 2. Masukkan ke Arus Kas
            await onAddTransaksiKas({
                jenis: 'Pemasukan',
                kategori: 'Cicilan Kasbon Koperasi',
                deskripsi: `Cicilan Trx #${transaksi.id} oleh ${transaksi.namaPembeli} (${metode})`,
                jumlah: bayarAmount,
                penanggungJawab: currentUser?.fullName || 'Kasir'
            });

            // 3. Catat Riwayat Pembayaran
            await db.pembayaranHutang.add({
                id: Date.now(),
                transaksiId: transaksi.id,
                tanggal: new Date().toISOString(),
                jumlah: bayarAmount,
                metode,
                operator: currentUser?.fullName || 'Admin',
                catatan
            });

            // 4. Update Transaksi Koperasi
            const newBayar = (transaksi.bayar || 0) + bayarAmount;
            const newSisa = transaksi.totalFinal - newBayar;
            const isLunas = newSisa <= 0;

            await db.transaksiKoperasi.update(transaksi.id, {
                bayar: newBayar,
                sisaTagihan: newSisa,
                statusTransaksi: isLunas ? 'Lunas' : 'Belum Lunas',
                lastModified: Date.now()
            });

            showToast(isLunas ? 'Kasbon LUNAS!' : 'Pembayaran berhasil dicatat.', 'success');
            if (isLunas) onClose();
            else {
                setBayarAmount(0);
                setCatatan('');
                setIsPaying(false);
            }
        } catch (e: any) {
            showToast(e.message || 'Gagal memproses pembayaran.', 'error');
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-[80] flex justify-center items-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl h-[85vh] flex flex-col">
                <div className="p-4 border-b flex justify-between items-center bg-gray-50 rounded-t-lg">
                    <div>
                        <h3 className="font-bold text-gray-800">Detail & Pembayaran Kasbon</h3>
                        <p className="text-xs text-gray-500">Trx #{transaksi.id} - {formatDateTime(transaksi.tanggal)}</p>
                    </div>
                    <button onClick={onClose}><i className="bi bi-x-lg"></i></button>
                </div>

                <div className="flex-grow overflow-y-auto p-6 flex flex-col md:flex-row gap-6">
                    {/* Left Side: Info & History */}
                    <div className="flex-1 space-y-6">
                        <div className="bg-gray-50 p-4 rounded-lg border">
                            <h4 className="text-xs font-bold text-gray-500 uppercase mb-3">Informasi Transaksi</h4>
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">Pembeli:</span>
                                    <span className="font-bold">{transaksi.namaPembeli}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">Total Belanja:</span>
                                    <span className="font-bold">{formatRupiah(transaksi.totalFinal)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">Sudah Dibayar:</span>
                                    <span className="font-bold text-green-600">{formatRupiah(transaksi.bayar || 0)}</span>
                                </div>
                                <div className="flex justify-between text-lg pt-2 border-t border-dashed">
                                    <span className="font-bold text-gray-700">Sisa Hutang:</span>
                                    <span className="font-bold text-red-600">{formatRupiah(sisaHutang)}</span>
                                </div>
                            </div>
                        </div>

                        <div>
                            <h4 className="text-xs font-bold text-gray-500 uppercase mb-3">Riwayat Pembayaran</h4>
                            <div className="space-y-2">
                                {pembayaranList.map((p: PembayaranHutang) => (
                                    <div key={p.id} className="flex justify-between items-center p-3 bg-white border rounded-lg shadow-sm">
                                        <div>
                                            <div className="text-sm font-bold text-gray-800">{formatRupiah(p.jumlah)}</div>
                                            <div className="text-[10px] text-gray-500">{formatDateTime(p.tanggal)} • {p.metode}</div>
                                        </div>
                                        <div className="text-[10px] text-right text-gray-400 italic">Oleh: {p.operator}</div>
                                    </div>
                                ))}
                                {pembayaranList.length === 0 && <p className="text-sm text-gray-400 italic text-center py-4">Belum ada riwayat pembayaran.</p>}
                            </div>
                        </div>
                    </div>

                    {/* Right Side: Payment Form */}
                    <div className="w-full md:w-72 shrink-0">
                        {!isPaying ? (
                            <button 
                                onClick={() => { setBayarAmount(sisaHutang); setIsPaying(true); }}
                                className="w-full py-3 bg-teal-600 text-white rounded-lg font-bold hover:bg-teal-700 shadow-md flex items-center justify-center gap-2"
                            >
                                <i className="bi bi-plus-circle"></i> Bayar Cicilan
                            </button>
                        ) : (
                            <div className="bg-teal-50 p-4 rounded-lg border border-teal-200 space-y-4 animate-fade-in">
                                <h4 className="text-sm font-bold text-teal-800">Input Pembayaran</h4>
                                <div>
                                    <label className="block text-xs font-bold text-teal-700 mb-1">Jumlah Bayar</label>
                                    <input 
                                        type="number" 
                                        value={bayarAmount} 
                                        onChange={e => setBayarAmount(parseInt(e.target.value) || 0)}
                                        className="w-full border-teal-300 rounded p-2 text-lg font-bold text-teal-900"
                                        max={sisaHutang}
                                    />
                                    <div className="flex gap-1 mt-1">
                                        <button onClick={() => setBayarAmount(sisaHutang)} className="text-[10px] bg-teal-200 px-1.5 rounded hover:bg-teal-300">Lunas</button>
                                        <button onClick={() => setBayarAmount(Math.floor(sisaHutang/2))} className="text-[10px] bg-teal-200 px-1.5 rounded hover:bg-teal-300">Setengah</button>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-teal-700 mb-1">Metode</label>
                                    <select value={metode} onChange={e => setMetode(e.target.value as any)} className="w-full border-teal-300 rounded p-2 text-sm bg-white">
                                        <option value="Tunai">Tunai</option>
                                        <option value="Tabungan" disabled={!santri}>Tabungan Santri</option>
                                        <option value="Non-Tunai">Non-Tunai (Transfer)</option>
                                    </select>
                                    {metode === 'Tabungan' && <p className="text-[10px] text-blue-600 mt-1">Saldo: {formatRupiah(saldoSantri)}</p>}
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-teal-700 mb-1">Catatan</label>
                                    <input 
                                        type="text" 
                                        value={catatan} 
                                        onChange={e => setCatatan(e.target.value)}
                                        className="w-full border-teal-300 rounded p-2 text-sm"
                                        placeholder="Opsional..."
                                    />
                                </div>
                                <div className="flex gap-2 pt-2">
                                    <button onClick={() => setIsPaying(false)} className="flex-1 py-2 border border-teal-300 rounded text-sm text-teal-700 font-bold hover:bg-teal-100">Batal</button>
                                    <button onClick={handleBayar} className="flex-1 py-2 bg-teal-600 text-white rounded text-sm font-bold hover:bg-teal-700">Simpan</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-4 border-t bg-gray-50 flex justify-end rounded-b-lg">
                    <button onClick={onClose} className="px-6 py-2 border rounded text-sm font-bold bg-white hover:bg-gray-100">Tutup</button>
                </div>
            </div>
        </div>
    );
};
