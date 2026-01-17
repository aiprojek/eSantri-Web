
import React, { useMemo } from 'react';
import { useAppContext } from '../../../AppContext';
import { useFinanceContext } from '../../../contexts/FinanceContext';
import { Santri, Tagihan, Pembayaran } from '../../../types';
import { formatRupiah } from '../../../utils/formatters';

interface RiwayatKeuanganSantriModalProps {
    isOpen: boolean;
    onClose: () => void;
    santri: Santri;
    onPrint: (pembayaran: Pembayaran) => void;
}

export const RiwayatKeuanganSantriModal: React.FC<RiwayatKeuanganSantriModalProps> = ({ isOpen, onClose, santri, onPrint }) => {
    const { tagihanList, pembayaranList } = useFinanceContext();

    const riwayatPembayaran = useMemo(() => {
        return pembayaranList.filter(p => p.santriId === santri.id)
            .sort((a,b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());
    }, [pembayaranList, santri.id]);

    const riwayatTagihan = useMemo(() => {
        return tagihanList.filter(t => t.santriId === santri.id)
            .sort((a,b) => b.tahun - a.tahun || b.bulan - a.bulan);
    }, [tagihanList, santri.id]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-[60] flex justify-center items-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl" onClick={e => e.stopPropagation()}>
                <div className="p-5 border-b flex justify-between items-center"><h3 className="text-lg font-semibold text-gray-800">Riwayat Keuangan - {santri.namaLengkap}</h3><button onClick={onClose} className="text-gray-400"><i className="bi bi-x-lg"></i></button></div>
                <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-6 max-h-[70vh] overflow-y-auto">
                    <div>
                        <h4 className="font-semibold mb-2">Riwayat Pembayaran</h4>
                        <div className="border rounded-lg max-h-96 overflow-y-auto">
                            {riwayatPembayaran.length > 0 ? riwayatPembayaran.map(p => (
                                <div key={p.id} className="p-3 border-b last:border-b-0 flex justify-between items-center">
                                    <div>
                                        <p className="font-semibold text-teal-700">{formatRupiah(p.jumlah)}</p>
                                        <p className="text-xs text-gray-500">{new Date(p.tanggal).toLocaleDateString('id-ID', {day:'2-digit', month:'long', year:'numeric'})} - {p.metode}</p>
                                    </div>
                                    <button onClick={() => onPrint(p)} className="text-blue-600"><i className="bi bi-printer-fill"></i></button>
                                </div>
                            )) : <p className="p-4 text-center text-sm text-gray-400">Belum ada riwayat pembayaran.</p>}
                        </div>
                    </div>
                     <div>
                        <h4 className="font-semibold mb-2">Riwayat Tagihan</h4>
                        <div className="border rounded-lg max-h-96 overflow-y-auto">
                           {riwayatTagihan.length > 0 ? riwayatTagihan.map(t => (
                                <div key={t.id} className="p-3 border-b last:border-b-0 flex justify-between items-center">
                                    <div>
                                        <p className="font-semibold">{t.deskripsi}</p>
                                        <p className="text-xs text-gray-500">{formatRupiah(t.nominal)}</p>
                                    </div>
                                    <span className={`px-2 py-0.5 text-xs rounded-full ${t.status === 'Lunas' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{t.status}</span>
                                </div>
                            )) : <p className="p-4 text-center text-sm text-gray-400">Belum ada riwayat tagihan.</p>}
                        </div>
                    </div>
                </div>
                 <div className="p-4 border-t flex justify-end"><button onClick={onClose} className="px-5 py-2.5 text-sm rounded-lg border">Tutup</button></div>
            </div>
        </div>
    );
};
