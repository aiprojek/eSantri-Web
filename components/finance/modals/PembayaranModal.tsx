
import React, { useState, useMemo, useEffect } from 'react';
import { useAppContext } from '../../../AppContext';
import { useFinanceContext } from '../../../contexts/FinanceContext';
import { Santri } from '../../../types';
import { formatRupiah } from '../../../utils/formatters';

interface PembayaranModalProps {
    isOpen: boolean;
    onClose: () => void;
    santri: Santri;
}

export const PembayaranModal: React.FC<PembayaranModalProps> = ({ isOpen, onClose, santri }) => {
    const { showToast, showAlert, currentUser } = useAppContext();
    const { tagihanList, saldoSantriList, onAddPembayaran, onSetorKeKas } = useFinanceContext();
    const [selectedTagihanIds, setSelectedTagihanIds] = useState<number[]>([]);
    const [partialAmounts, setPartialAmounts] = useState<Record<number, number>>({});
    const [metode, setMetode] = useState<'Tunai' | 'Transfer' | 'Potong Saldo'>('Tunai');
    const [tanggal, setTanggal] = useState(new Date().toISOString().split('T')[0]);
    const [catatan, setCatatan] = useState('');
    const [langsungSetorKas, setLangsungSetorKas] = useState(false);
    const [rekeningTujuan, setRekeningTujuan] = useState('Kas Tunai Bendahara');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const saldoUangSaku = useMemo(() => {
        const found = saldoSantriList.find(s => s.santriId === santri.id);
        return found ? found.saldo : 0;
    }, [saldoSantriList, santri.id]);

    const tunggakan = useMemo(() => {
        return tagihanList
            .filter(t => t.santriId === santri.id && t.status === 'Belum Lunas')
            .sort((a, b) => a.tahun - b.tahun || a.bulan - b.bulan);
    }, [tagihanList, santri.id]);

    const totalTerpilih = useMemo(() => {
        return tunggakan
            .filter(t => selectedTagihanIds.includes(t.id))
            .reduce((sum, t) => {
                const customAmt = partialAmounts[t.id];
                const amt = customAmt !== undefined ? Number(customAmt) : t.nominal;
                return sum + (isNaN(amt) ? 0 : amt);
            }, 0);
    }, [tunggakan, selectedTagihanIds, partialAmounts]);

    useEffect(() => {
        if (!isOpen) {
            setSelectedTagihanIds([]);
            setPartialAmounts({});
            setCatatan('');
            setMetode('Tunai');
            setLangsungSetorKas(false);
        }
    }, [isOpen]);

    useEffect(() => {
        if (metode === 'Transfer') {
            setRekeningTujuan('Bank Syariah Indonesia (BSI)');
        } else {
            setRekeningTujuan('Kas Tunai Bendahara');
        }
    }, [metode]);

    if (!isOpen) return null;

    const handleSelectTagihan = (id: number, defaultNominal: number) => {
        setSelectedTagihanIds(prev => {
            if (prev.includes(id)) {
                const next = prev.filter(i => i !== id);
                setPartialAmounts(pa => {
                    const copy = { ...pa };
                    delete copy[id];
                    return copy;
                });
                return next;
            } else {
                setPartialAmounts(pa => ({ ...pa, [id]: defaultNominal }));
                return [...prev, id];
            }
        });
    };

    const handleSelectAll = () => {
        if (selectedTagihanIds.length === tunggakan.length) {
            setSelectedTagihanIds([]);
            setPartialAmounts({});
        } else {
            setSelectedTagihanIds(tunggakan.map(t => t.id));
            const nextPartial: Record<number, number> = {};
            tunggakan.forEach(t => {
                nextPartial[t.id] = partialAmounts[t.id] ?? t.nominal;
            });
            setPartialAmounts(nextPartial);
        }
    };

    const handlePartialAmountChange = (id: number, maxNominal: number, rawVal: string) => {
        const val = Math.max(0, Math.min(maxNominal, Number(rawVal) || 0));
        setPartialAmounts(prev => ({ ...prev, [id]: val }));
    };

    const isSaldoKurang = metode === 'Potong Saldo' && totalTerpilih > saldoUangSaku;

    const handleSave = async () => {
        if (selectedTagihanIds.length === 0 || totalTerpilih <= 0) {
            showAlert('Input Tidak Valid', 'Harap pilih minimal satu tagihan dengan nominal pembayaran lebih dari Rp 0.');
            return;
        }
        if (isSaldoKurang) {
            showAlert('Saldo Tidak Mencukupi', `Saldo uang saku ${santri.namaLengkap} (${formatRupiah(saldoUangSaku)}) tidak mencukupi untuk membayar total ${formatRupiah(totalTerpilih)}.`);
            return;
        }
        setIsSubmitting(true);
        try {
            const saved = await onAddPembayaran({
                santriId: santri.id,
                tagihanIds: selectedTagihanIds,
                jumlah: totalTerpilih,
                tanggal,
                metode,
                catatan,
                disetorKeKas: false,
            }, partialAmounts);

            if (langsungSetorKas && metode !== 'Potong Saldo') {
                const pj = currentUser?.fullName || currentUser?.username || 'Bendahara';
                const note = `Penerimaan Langsung (${metode}) a.n ${santri.namaLengkap}${catatan ? ` - ${catatan}` : ''}`;
                await onSetorKeKas([saved.id], totalTerpilih, new Date(tanggal).toISOString(), pj, note, rekeningTujuan);
            }

            showToast('Pembayaran berhasil dicatat.', 'success');
            onClose();
        } catch (e) {
            showAlert('Gagal Menyimpan', (e as Error).message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-[60] flex justify-center items-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="p-5 border-b bg-slate-50 flex justify-between items-center">
                    <div>
                        <h3 className="text-lg font-bold text-slate-800">Catat Pembayaran & Cicilan Tagihan</h3>
                        <p className="text-xs text-slate-500 mt-0.5">{santri.namaLengkap} ({santri.nis})</p>
                    </div>
                    <div className="text-right bg-teal-50 border border-teal-200 px-3 py-1.5 rounded-lg">
                        <span className="text-[11px] text-teal-700 block font-medium">Saldo Uang Saku</span>
                        <span className="text-sm font-bold text-teal-800">{formatRupiah(saldoUangSaku)}</span>
                    </div>
                </div>

                <div className="p-5 space-y-4 max-h-[68vh] overflow-y-auto">
                    <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-sm text-slate-700">Pilih Tagihan & Atur Nominal Bayar (Mendukung Cicilan):</h4>
                        {tunggakan.length > 0 && (
                            <button
                                type="button"
                                onClick={handleSelectAll}
                                className="text-xs font-semibold text-teal-600 hover:text-teal-800"
                            >
                                {selectedTagihanIds.length === tunggakan.length ? 'Batal Pilih Semua' : 'Pilih Semua Tagihan'}
                            </button>
                        )}
                    </div>

                    <div className="border border-slate-200 rounded-xl max-h-64 overflow-y-auto">
                        {tunggakan.length > 0 ? (
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50 text-xs text-slate-500 uppercase border-b">
                                    <tr>
                                        <th className="p-3 w-10 text-center">Pilih</th>
                                        <th className="p-3 text-left">Deskripsi Tagihan</th>
                                        <th className="p-3 text-right">Sisa Tagihan</th>
                                        <th className="p-3 text-right w-48">Nominal Dibayar (Rp)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {tunggakan.map(t => {
                                        const isSelected = selectedTagihanIds.includes(t.id);
                                        const currentInput = partialAmounts[t.id] ?? t.nominal;
                                        const isPartial = isSelected && currentInput > 0 && currentInput < t.nominal;

                                        return (
                                            <tr key={t.id} className={`transition-colors ${isSelected ? 'bg-teal-50/40' : 'hover:bg-slate-50'}`}>
                                                <td className="p-3 text-center">
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={() => handleSelectTagihan(t.id, t.nominal)}
                                                        className="h-4 w-4 text-teal-600 rounded"
                                                    />
                                                </td>
                                                <td className="p-3">
                                                    <div className="font-medium text-slate-800">{t.deskripsi}</div>
                                                    {t.isCicilan && t.nominalAwal && (
                                                        <div className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 inline-block px-2 py-0.5 rounded mt-1">
                                                            Tagihan Awal: {formatRupiah(t.nominalAwal)} &bull; Sudah Dicicil: {formatRupiah(t.sudahDicicil || 0)}
                                                        </div>
                                                    )}
                                                    {isPartial && (
                                                        <div className="text-[11px] text-blue-700 font-medium mt-0.5">
                                                            <i className="bi bi-pie-chart-fill mr-1"></i>
                                                            Cicilan — Sisa piutang baru: {formatRupiah(t.nominal - currentInput)}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="p-3 text-right font-semibold text-slate-700">
                                                    {formatRupiah(t.nominal)}
                                                </td>
                                                <td className="p-3 text-right">
                                                    {isSelected ? (
                                                        <div className="space-y-1">
                                                            <input
                                                                type="number"
                                                                min={1}
                                                                max={t.nominal}
                                                                value={currentInput}
                                                                onChange={e => handlePartialAmountChange(t.id, t.nominal, e.target.value)}
                                                                className="w-full text-right bg-white border border-teal-300 rounded-lg px-2.5 py-1.5 text-sm font-bold text-teal-800 focus:ring-2 focus:ring-teal-500"
                                                            />
                                                            <div className="flex justify-end gap-1 text-[10px]">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handlePartialAmountChange(t.id, t.nominal, String(Math.round(t.nominal / 2)))}
                                                                    className="px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded"
                                                                >
                                                                    50%
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handlePartialAmountChange(t.id, t.nominal, String(t.nominal))}
                                                                    className="px-1.5 py-0.5 bg-teal-100 hover:bg-teal-200 text-teal-700 rounded font-semibold"
                                                                >
                                                                    Penuh
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs text-slate-400 italic">Pilih untuk atur</span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        ) : (
                            <p className="text-center p-8 text-gray-500">Tidak ada tunggakan aktif.</p>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t">
                        <div>
                            <label className="block mb-1 text-xs font-semibold uppercase text-slate-600">Tanggal Bayar</label>
                            <input type="date" value={tanggal} onChange={e => setTanggal(e.target.value)} className="w-full bg-gray-50 border border-slate-300 p-2.5 rounded-lg text-sm" />
                        </div>
                        <div>
                            <label className="block mb-1 text-xs font-semibold uppercase text-slate-600">Metode Pembayaran</label>
                            <select value={metode} onChange={e => setMetode(e.target.value as any)} className="w-full bg-gray-50 border border-slate-300 p-2.5 rounded-lg text-sm font-medium">
                                <option value="Tunai">Tunai (Kasir / Laci Bendahara)</option>
                                <option value="Transfer">Transfer Bank</option>
                                <option value="Potong Saldo">Potong Saldo Uang Saku ({formatRupiah(saldoUangSaku)})</option>
                            </select>
                        </div>

                        {metode === 'Potong Saldo' && (
                            <div className={`md:col-span-2 p-3 rounded-lg border text-xs flex items-center justify-between ${isSaldoKurang ? 'bg-red-50 border-red-200 text-red-700' : 'bg-teal-50 border-teal-200 text-teal-800'}`}>
                                <div>
                                    <i className={`bi ${isSaldoKurang ? 'bi-exclamation-octagon-fill' : 'bi-wallet2'} mr-2`}></i>
                                    {isSaldoKurang
                                        ? `Saldo uang saku tidak mencukupi! Kurang ${formatRupiah(totalTerpilih - saldoUangSaku)}.`
                                        : `Saldo uang saku akan otomatis dipotong sebesar ${formatRupiah(totalTerpilih)}. Sisa saldo: ${formatRupiah(saldoUangSaku - totalTerpilih)}.`}
                                </div>
                            </div>
                        )}

                        {metode !== 'Potong Saldo' && (
                            <div className="md:col-span-2 bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2">
                                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={langsungSetorKas}
                                        onChange={e => setLangsungSetorKas(e.target.checked)}
                                        className="h-4 w-4 text-teal-600 rounded"
                                    />
                                    <span>Langsung bukukan ke Buku Kas Umum (tanpa antre di Setoran Harian)</span>
                                </label>
                                {langsungSetorKas && (
                                    <div className="pl-6 pt-1">
                                        <label className="block mb-1 text-xs text-slate-600">Pilih Pos Kas / Rekening Tujuan:</label>
                                        <select
                                            value={rekeningTujuan}
                                            onChange={e => setRekeningTujuan(e.target.value)}
                                            className="w-full md:w-72 bg-white border border-slate-300 p-2 rounded-lg text-xs font-semibold"
                                        >
                                            <option value="Kas Tunai Bendahara">Kas Tunai Bendahara</option>
                                            <option value="Bank Syariah Indonesia (BSI)">Bank Syariah Indonesia (BSI)</option>
                                            <option value="Bank Muamalat">Bank Muamalat</option>
                                            <option value="Bank BRI / Mandiri">Bank BRI / Mandiri</option>
                                            <option value="Kas Kecil Operasional">Kas Kecil Operasional</option>
                                        </select>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="md:col-span-2">
                            <label className="block mb-1 text-xs font-semibold uppercase text-slate-600">Catatan / Referensi Bukti Transfer (Opsional)</label>
                            <input type="text" value={catatan} onChange={e => setCatatan(e.target.value)} placeholder="Contoh: Cicilan ke-1 / Bukti TF BSI a.n Bpk Ahmad" className="w-full bg-gray-50 border border-slate-300 p-2.5 rounded-lg text-sm" />
                        </div>
                    </div>
                </div>

                <div className="p-4 border-t flex justify-between items-center bg-gray-50">
                    <div>
                        <span className="text-xs text-slate-500 uppercase font-semibold">Total Akan Dibayar ({selectedTagihanIds.length} Tagihan):</span>
                        <p className="font-bold text-xl text-teal-700">{formatRupiah(totalTerpilih)}</p>
                    </div>
                    <div className="space-x-2">
                        <button onClick={onClose} disabled={isSubmitting} className="px-5 py-2.5 text-sm font-medium rounded-lg border border-slate-300 bg-white hover:bg-slate-50">Batal</button>
                        <button
                            onClick={handleSave}
                            disabled={isSubmitting || totalTerpilih <= 0 || isSaldoKurang}
                            className="px-5 py-2.5 text-sm font-semibold rounded-lg bg-teal-700 hover:bg-teal-800 text-white disabled:bg-gray-300 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? 'Menyimpan...' : 'Simpan Pembayaran'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

