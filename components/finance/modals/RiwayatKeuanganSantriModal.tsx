import React, { useMemo, useState } from 'react';
import { useAppContext } from '../../../AppContext';
import { useFinanceContext } from '../../../contexts/FinanceContext';
import { Santri, Pembayaran, Tagihan } from '../../../types';
import { formatRupiah } from '../../../utils/formatters';

interface RiwayatKeuanganSantriModalProps {
    isOpen: boolean;
    onClose: () => void;
    santri: Santri;
    onPrint: (pembayaran: Pembayaran) => void;
    canWrite?: boolean;
}

export const RiwayatKeuanganSantriModal: React.FC<RiwayatKeuanganSantriModalProps> = ({
    isOpen,
    onClose,
    santri,
    onPrint,
    canWrite = false
}) => {
    const { showToast, showConfirmation, currentUser } = useAppContext();
    const { tagihanList, pembayaranList, onVoidPembayaran, onDeleteTagihan, onDiscountTagihan } = useFinanceContext();

    const [voidTarget, setVoidTarget] = useState<Pembayaran | null>(null);
    const [alasanVoid, setAlasanVoid] = useState('');
    const [isProcessingVoid, setIsProcessingVoid] = useState(false);

    const [discountTarget, setDiscountTarget] = useState<Tagihan | null>(null);
    const [discountNominal, setDiscountNominal] = useState<number>(0);
    const [discountNote, setDiscountNote] = useState('');
    const [isProcessingDiscount, setIsProcessingDiscount] = useState(false);

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

    const handleConfirmVoid = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!voidTarget || !alasanVoid.trim()) return;
        setIsProcessingVoid(true);
        try {
            const operator = currentUser?.fullName || currentUser?.username || 'Bendahara';
            await onVoidPembayaran(voidTarget.id, alasanVoid.trim(), operator);
            showToast('Pembayaran berhasil dibatalkan dan tagihan dikembalikan.', 'success');
            setVoidTarget(null);
            setAlasanVoid('');
        } catch (err: any) {
            showToast(err.message || 'Gagal membatalkan pembayaran.', 'error');
        } finally {
            setIsProcessingVoid(false);
        }
    };

    const handleConfirmDiscount = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!discountTarget || discountNominal <= 0) return;
        setIsProcessingDiscount(true);
        try {
            await onDiscountTagihan(discountTarget.id, discountNominal, discountNote.trim() || 'Potongan / Beasiswa');
            showToast('Potongan / beasiswa tagihan berhasil diterapkan.', 'success');
            setDiscountTarget(null);
            setDiscountNominal(0);
            setDiscountNote('');
        } catch (err: any) {
            showToast(err.message || 'Gagal menerapkan potongan.', 'error');
        } finally {
            setIsProcessingDiscount(false);
        }
    };

    const handleDeleteUnpaidBill = (tagihan: Tagihan) => {
        showConfirmation(
            'Hapus Tagihan Belum Lunas?',
            `Tagihan "${tagihan.deskripsi}" sebesar ${formatRupiah(tagihan.nominal)} akan dihapus dari daftar tunggakan ${santri.namaLengkap}.`,
            async () => {
                try {
                    await onDeleteTagihan(tagihan.id, 'Dihapus manual melalui Riwayat Keuangan Santri');
                    showToast('Tagihan berhasil dihapus.', 'success');
                } catch (err: any) {
                    showToast(err.message || 'Gagal menghapus tagihan.', 'error');
                }
            },
            { confirmText: 'Ya, Hapus Tagihan', confirmColor: 'red' }
        );
    };

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
                        <span className="text-lg font-bold text-teal-800 tabular-nums">{formatRupiah(totalLunas)}</span>
                    </div>
                    <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                        <span className="text-xs text-red-700 font-medium block">Sisa Tunggakan Aktif</span>
                        <span className="text-lg font-bold text-red-700 tabular-nums">{formatRupiah(totalTunggakan)}</span>
                    </div>
                </div>

                <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-6 max-h-[65vh] overflow-y-auto">
                    <div>
                        <h4 className="font-semibold text-sm text-slate-700 mb-2">Riwayat Pembayaran ({riwayatPembayaran.length})</h4>
                        <div className="border border-slate-200 rounded-xl max-h-96 overflow-y-auto divide-y divide-slate-100">
                            {riwayatPembayaran.length > 0 ? riwayatPembayaran.map(p => (
                                <div key={p.id} className="p-3 flex justify-between items-start gap-2 hover:bg-slate-50">
                                    <div>
                                        <div className="flex flex-wrap items-center gap-1.5">
                                            <p className="font-bold text-teal-700 tabular-nums">{formatRupiah(p.jumlah)}</p>
                                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-medium">{p.metode}</span>
                                            {p.disetorKeKas && (
                                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">
                                                    Tercatat Kas
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-gray-500 mt-0.5">{new Date(p.tanggal).toLocaleDateString('id-ID', {day:'2-digit', month:'long', year:'numeric'})}</p>
                                        {p.catatan && <p className="text-xs text-slate-600 italic mt-0.5">"{p.catatan}"</p>}
                                    </div>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                        <button onClick={() => onPrint(p)} className="px-2.5 py-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 text-xs font-semibold flex items-center gap-1" title="Cetak Kuitansi">
                                            <i className="bi bi-printer-fill"></i> Kuitansi
                                        </button>
                                        {canWrite && (
                                            <button
                                                type="button"
                                                onClick={() => { setVoidTarget(p); setAlasanVoid(''); }}
                                                className="px-2 py-1.5 rounded-lg border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 text-xs font-semibold"
                                                title="Batalkan / Void Pembayaran"
                                            >
                                                <i className="bi bi-arrow-counterclockwise"></i>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )) : <p className="p-6 text-center text-sm text-gray-400">Belum ada riwayat pembayaran.</p>}
                        </div>
                    </div>
                     <div>
                        <h4 className="font-semibold text-sm text-slate-700 mb-2">Riwayat &amp; Status Tagihan ({riwayatTagihan.length})</h4>
                        <div className="border border-slate-200 rounded-xl max-h-96 overflow-y-auto divide-y divide-slate-100">
                           {riwayatTagihan.length > 0 ? riwayatTagihan.map(t => (
                                <div key={t.id} className="p-3 flex justify-between items-start gap-2 hover:bg-slate-50">
                                    <div>
                                        <p className="font-semibold text-sm text-slate-800">{t.deskripsi}</p>
                                        <p className="text-xs font-medium text-slate-600 tabular-nums">{formatRupiah(t.nominal)}</p>
                                        {t.isCicilan && t.nominalAwal && (
                                            <p className="text-[11px] text-amber-700 mt-0.5 tabular-nums">
                                                Cicilan dari total {formatRupiah(t.nominalAwal)}
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                                        <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${t.status === 'Lunas' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{t.status}</span>
                                        {canWrite && t.status === 'Belum Lunas' && (
                                            <div className="flex items-center gap-1">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setDiscountTarget(t);
                                                        setDiscountNominal(Math.min(50000, t.nominal));
                                                        setDiscountNote('');
                                                    }}
                                                    className="px-2 py-1 rounded border border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100 text-[11px] font-semibold"
                                                    title="Beri Potongan / Beasiswa"
                                                >
                                                    <i className="bi bi-percent mr-0.5"></i>Potongan
                                                </button>
                                                {!t.sudahDicicil && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDeleteUnpaidBill(t)}
                                                        className="px-2 py-1 rounded border border-red-200 bg-white text-red-600 hover:bg-red-50 text-[11px] font-semibold"
                                                        title="Hapus Tagihan"
                                                    >
                                                        <i className="bi bi-trash"></i>
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )) : <p className="p-6 text-center text-sm text-gray-400">Belum ada riwayat tagihan.</p>}
                        </div>
                    </div>
                </div>
                 <div className="p-4 border-t bg-slate-50 flex justify-end"><button onClick={onClose} className="px-5 py-2 text-sm font-medium rounded-lg border bg-white hover:bg-slate-100">Tutup</button></div>
            </div>

            {/* Void Pembayaran Modal */}
            {voidTarget && (
                <div className="fixed inset-0 bg-black/60 z-[70] flex justify-center items-center p-4" onClick={() => setVoidTarget(null)}>
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="p-4 bg-red-600 text-white flex justify-between items-center">
                            <h4 className="font-bold text-sm flex items-center gap-2">
                                <i className="bi bi-exclamation-octagon-fill"></i>
                                Batalkan Pembayaran {formatRupiah(voidTarget.jumlah)}
                            </h4>
                            <button onClick={() => setVoidTarget(null)}><i className="bi bi-x-lg"></i></button>
                        </div>
                        <form onSubmit={handleConfirmVoid} className="p-5 space-y-4">
                            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-900 space-y-1">
                                <p className="font-bold">Koreksi Akuntansi Otomatis:</p>
                                <ul className="list-disc pl-4 space-y-0.5">
                                    <li>Tagihan terkait dikembalikan menjadi <strong>Belum Lunas</strong> (cicilan digabung kembali secara utuh).</li>
                                    {voidTarget.metode === 'Potong Saldo' && (
                                        <li>Saldo Uang Saku santri dikembalikan sebesar <strong>{formatRupiah(voidTarget.jumlah)}</strong>.</li>
                                    )}
                                    {voidTarget.disetorKeKas && voidTarget.metode !== 'Potong Saldo' && (
                                        <li>Jurnal balik koreksi sebesar <strong>{formatRupiah(voidTarget.jumlah)}</strong> dicatat otomatis ke Buku Kas Umum.</li>
                                    )}
                                </ul>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Alasan Pembatalan *</label>
                                <input
                                    type="text"
                                    required
                                    value={alasanVoid}
                                    onChange={e => setAlasanVoid(e.target.value)}
                                    placeholder="Contoh: Salah pilih santri / salah input nominal"
                                    className="w-full border border-slate-300 rounded-lg p-2.5 text-sm"
                                    autoFocus
                                />
                            </div>
                            <div className="flex justify-end gap-2 pt-2 border-t">
                                <button type="button" onClick={() => setVoidTarget(null)} className="px-4 py-2 border rounded-lg text-xs font-semibold hover:bg-slate-50">Batal</button>
                                <button type="submit" disabled={isProcessingVoid || !alasanVoid.trim()} className="px-4 py-2 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700 disabled:opacity-50">
                                    {isProcessingVoid ? 'Memproses...' : 'Konfirmasi Batalkan'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Potongan / Beasiswa Modal */}
            {discountTarget && (
                <div className="fixed inset-0 bg-black/60 z-[70] flex justify-center items-center p-4" onClick={() => setDiscountTarget(null)}>
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="p-4 bg-amber-600 text-white flex justify-between items-center">
                            <h4 className="font-bold text-sm flex items-center gap-2">
                                <i className="bi bi-award-fill"></i>
                                Potongan / Beasiswa Tagihan
                            </h4>
                            <button onClick={() => setDiscountTarget(null)}><i className="bi bi-x-lg"></i></button>
                        </div>
                        <form onSubmit={handleConfirmDiscount} className="p-5 space-y-4">
                            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs">
                                <p className="font-semibold text-slate-800">{discountTarget.deskripsi}</p>
                                <p className="text-slate-600 mt-0.5">Sisa Tagihan Saat Ini: <strong className="tabular-nums">{formatRupiah(discountTarget.nominal)}</strong></p>
                            </div>
                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <label className="text-xs font-bold text-slate-700">Nominal Potongan (Rp) *</label>
                                    <button
                                        type="button"
                                        onClick={() => setDiscountNominal(discountTarget.nominal)}
                                        className="text-[11px] font-semibold text-teal-700 hover:underline"
                                    >
                                        Beasiswa Penuh (100%)
                                    </button>
                                </div>
                                <input
                                    type="number"
                                    min={1}
                                    max={discountTarget.nominal}
                                    required
                                    value={discountNominal}
                                    onChange={e => setDiscountNominal(Math.min(discountTarget.nominal, Math.max(0, Number(e.target.value) || 0)))}
                                    className="w-full border border-slate-300 rounded-lg p-2.5 text-sm font-bold tabular-nums"
                                />
                                <p className="text-[11px] text-slate-500 mt-1 tabular-nums">
                                    Tagihan setelah potongan: <strong>{formatRupiah(Math.max(0, discountTarget.nominal - discountNominal))}</strong>
                                    {discountNominal === discountTarget.nominal && ' (Otomatis Lunas Beasiswa)'}
                                </p>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Keterangan SK / Alasan Potongan *</label>
                                <input
                                    type="text"
                                    required
                                    value={discountNote}
                                    onChange={e => setDiscountNote(e.target.value)}
                                    placeholder="Contoh: Beasiswa Tahfizh / Potongan Kakak-Beradik"
                                    className="w-full border border-slate-300 rounded-lg p-2.5 text-sm"
                                />
                            </div>
                            <div className="flex justify-end gap-2 pt-2 border-t">
                                <button type="button" onClick={() => setDiscountTarget(null)} className="px-4 py-2 border rounded-lg text-xs font-semibold hover:bg-slate-50">Batal</button>
                                <button type="submit" disabled={isProcessingDiscount || discountNominal <= 0 || !discountNote.trim()} className="px-4 py-2 bg-amber-600 text-white rounded-lg text-xs font-bold hover:bg-amber-700 disabled:opacity-50">
                                    {isProcessingDiscount ? 'Menyimpan...' : 'Terapkan Potongan'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

