
import React, { useMemo } from 'react';
import { useFinanceContext } from '../../../contexts/FinanceContext';
import { Santri, Pembayaran } from '../../../types';
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

    const totalLunas = useMemo(() => riwayatPembayaran.reduce((s, p) => s + p.jumlah, 0), [riwayatPembayaran]);
    const totalTunggakan = useMemo(() => riwayatTagihan.filter(t => t.status === 'Belum Lunas').reduce((s, t) => s + t.nominal, 0), [riwayatTagihan]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-[60] flex justify-center items-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="p-5 border-b bg-slate-50 flex justify-between items-center">
                    <div>
                        <h3 className="text-lg font-bold text-slate-800">Riwayat Keuangan — {santri.namaLengkap}</h3>
                        <p className="text-xs text-slate-500">NIS: {santri.nis}</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100"><i className="bi bi-x-lg"></i></button>
                </div>

                <div className="grid grid-cols-2 gap-4 px-5 pt-4">
                    <div className="bg-teal-50 border border-teal-200 rounded-xl p-3">
                        <span className="text-xs text-teal-700 font-medium block">Total Pembayaran Diterima</span>
                        <span className="text-lg font-bold text-teal-800">{formatRupiah(totalLunas)}</span>
                    </div>
                    <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                        <span className="text-xs text-red-700 font-medium block">Sisa Tunggakan Aktif</span>
                        <span className="text-lg font-bold text-red-700">{formatRupiah(totalTunggakan)}</span>
                    </div>
                </div>

                <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-6 max-h-[65vh] overflow-y-auto">
                    <div>
                        <h4 className="font-semibold text-sm text-slate-700 mb-2">Riwayat Pembayaran ({riwayatPembayaran.length})</h4>
                        <div className="border border-slate-200 rounded-xl max-h-96 overflow-y-auto divide-y divide-slate-100">
                            {riwayatPembayaran.length > 0 ? riwayatPembayaran.map(p => (
                                <div key={p.id} className="p-3 flex justify-between items-center hover:bg-slate-50">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <p className="font-bold text-teal-700">{formatRupiah(p.jumlah)}</p>
                                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-medium">{p.metode}</span>
                                        </div>
                                        <p className="text-xs text-gray-500 mt-0.5">{new Date(p.tanggal).toLocaleDateString('id-ID', {day:'2-digit', month:'long', year:'numeric'})}</p>
                                        {p.catatan && <p className="text-xs text-slate-600 italic mt-0.5">"{p.catatan}"</p>}
                                    </div>
                                    <button onClick={() => onPrint(p)} className="px-2.5 py-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 text-xs font-semibold flex items-center gap-1" title="Cetak Kuitansi">
                                        <i className="bi bi-printer-fill"></i> Kuitansi
                                    </button>
                                </div>
                            )) : <p className="p-6 text-center text-sm text-gray-400">Belum ada riwayat pembayaran.</p>}
                        </div>
                    </div>
                     <div>
                        <h4 className="font-semibold text-sm text-slate-700 mb-2">Riwayat & Status Tagihan ({riwayatTagihan.length})</h4>
                        <div className="border border-slate-200 rounded-xl max-h-96 overflow-y-auto divide-y divide-slate-100">
                           {riwayatTagihan.length > 0 ? riwayatTagihan.map(t => (
                                <div key={t.id} className="p-3 flex justify-between items-center hover:bg-slate-50">
                                    <div>
                                        <p className="font-semibold text-sm text-slate-800">{t.deskripsi}</p>
                                        <p className="text-xs font-medium text-slate-600">{formatRupiah(t.nominal)}</p>
                                        {t.isCicilan && t.nominalAwal && (
                                            <p className="text-[11px] text-amber-700 mt-0.5">
                                                Cicilan dari total {formatRupiah(t.nominalAwal)}
                                            </p>
                                        )}
                                    </div>
                                    <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${t.status === 'Lunas' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{t.status}</span>
                                </div>
                            )) : <p className="p-6 text-center text-sm text-gray-400">Belum ada riwayat tagihan.</p>}
                        </div>
                    </div>
                </div>
                 <div className="p-4 border-t bg-slate-50 flex justify-end"><button onClick={onClose} className="px-5 py-2 text-sm font-medium rounded-lg border bg-white hover:bg-slate-100">Tutup</button></div>
            </div>
        </div>
    );
};

