import React, { useState, useEffect, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../../db';
import { Santri, Diskon, SaldoSantri } from '../../../types';
import { formatRupiah } from '../../../utils/formatters';
import { useAppContext } from '../../../AppContext';
import { useFinanceContext } from '../../../contexts/FinanceContext';
import { getKoperasiSettings } from '../Shared';

interface CheckoutModalProps {
    isOpen: boolean;
    onClose: () => void;
    subTotal: number;
    santriList: Santri[];
    saldoSantriList: SaldoSantri[];
    discounts: Diskon[];
    onProcessCheckout: (data: {
        buyerType: 'Santri' | 'Guru' | 'Umum';
        selectedSantri: Santri | null;
        manualBuyerName: string;
        paymentMethod: 'Tunai' | 'Tabungan' | 'Non-Tunai' | 'Hutang';
        cashReceived: number;
        changeToBalance: boolean;
        paymentNote: string;
        selectedDiskonId: number | '';
        finalTotal: number;
        discountAmount: number;
        changeAmount: number;
        overrideLimitHarian?: boolean;
    }) => void;
    initialBuyerType?: 'Santri' | 'Guru' | 'Umum';
    initialBuyerName?: string;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({ 
    isOpen, onClose, subTotal, santriList, saldoSantriList, discounts, onProcessCheckout,
    initialBuyerType = 'Santri', initialBuyerName = ''
}) => {
    const { showToast, settings: pondokSettings } = useAppContext();
    const { transaksiSaldoList } = useFinanceContext();
    const koperasiSettings = useMemo(() => getKoperasiSettings(pondokSettings), [pondokSettings]);

    const [buyerType, setBuyerType] = useState<'Santri' | 'Guru' | 'Umum'>(initialBuyerType);
    const [selectedSantri, setSelectedSantri] = useState<Santri | null>(null);
    const [santriSearch, setSantriSearch] = useState('');
    const [manualBuyerName, setManualBuyerName] = useState(initialBuyerName);
    const [paymentMethod, setPaymentMethod] = useState<'Tunai' | 'Tabungan' | 'Non-Tunai' | 'Hutang'>('Tunai');
    const [cashReceived, setCashReceived] = useState<string>('');
    const [changeToBalance, setChangeToBalance] = useState(false);
    const [paymentNote, setPaymentNote] = useState('');
    const [selectedDiskonId, setSelectedDiskonId] = useState<number | ''>('');
    const [overrideLimitHarian, setOverrideLimitHarian] = useState(false);
    const [overrideLimitKasbon, setOverrideLimitKasbon] = useState(false);

    const unpaidTrans = useLiveQuery(
        () => db.transaksiKoperasi.filter(t => !t.deleted && t.statusTransaksi === 'Belum Lunas').toArray(),
        [],
        []
    );

    // Reset when opened
    useEffect(() => {
        if (isOpen) {
            setBuyerType(initialBuyerType);
            setManualBuyerName(initialBuyerName);
            setSelectedSantri(null);
            setSantriSearch('');
            setPaymentMethod('Tunai');
            setCashReceived('');
            setChangeToBalance(false);
            setPaymentNote('');
            setSelectedDiskonId('');
            setOverrideLimitHarian(false);
            setOverrideLimitKasbon(false);
        }
    }, [isOpen, initialBuyerType, initialBuyerName]);

    const selectedDiskon = useMemo(() => discounts.find(d => d.id === Number(selectedDiskonId)), [discounts, selectedDiskonId]);
    
    const discountAmount = useMemo(() => {
        if (!selectedDiskon) return 0;
        if (selectedDiskon.tipe === 'Persen') {
            return Math.round((subTotal * selectedDiskon.nilai) / 100);
        }
        return selectedDiskon.nilai;
    }, [subTotal, selectedDiskon]);

    const finalTotal = Math.max(0, subTotal - discountAmount);

    const santriSaldoObj = useMemo(() => {
        if (!selectedSantri) return undefined;
        return saldoSantriList.find(s => s.santriId === selectedSantri.id);
    }, [selectedSantri, saldoSantriList]);

    const santriBalance = santriSaldoObj?.saldo || 0;
    const limitHarian = santriSaldoObj?.limitHarian || 0;

    const usedToday = useMemo(() => {
        if (!selectedSantri) return 0;
        const todayStr = new Date().toDateString();
        return transaksiSaldoList
            .filter(t => !t.deleted && t.santriId === selectedSantri.id && t.jenis === 'Penarikan' && new Date(t.tanggal).toDateString() === todayStr)
            .reduce((sum, t) => sum + t.jumlah, 0);
    }, [selectedSantri, transaksiSaldoList]);

    const sisaLimitHarian = limitHarian > 0 ? Math.max(0, limitHarian - usedToday) : null;
    const isOverDailyLimit = limitHarian > 0 && (usedToday + finalTotal > limitHarian);

    const activeKasbonCustomer = useMemo(() => {
        if (buyerType === 'Santri' && selectedSantri) {
            return unpaidTrans
                .filter(t => t.pembeliId === selectedSantri.id)
                .reduce((sum, t) => sum + (t.sisaTagihan ?? t.totalFinal), 0);
        }
        if (manualBuyerName.trim()) {
            const lower = manualBuyerName.trim().toLowerCase();
            return unpaidTrans
                .filter(t => t.namaPembeli.toLowerCase() === lower)
                .reduce((sum, t) => sum + (t.sisaTagihan ?? t.totalFinal), 0);
        }
        return 0;
    }, [buyerType, selectedSantri, manualBuyerName, unpaidTrans]);

    const dpAmount = paymentMethod === 'Hutang' ? (parseFloat(cashReceived) || 0) : 0;
    const newKasbonAdded = paymentMethod === 'Hutang' ? Math.max(0, finalTotal - dpAmount) : 0;
    const plafonKasbon = koperasiSettings.defaultLimitKasbon || 0;
    const isOverKasbonLimit = plafonKasbon > 0 && (activeKasbonCustomer + newKasbonAdded > plafonKasbon);

    const changeAmount = useMemo(() => {
        if (paymentMethod !== 'Tunai') return 0;
        const cash = parseFloat(cashReceived) || 0;
        return Math.max(0, cash - finalTotal);
    }, [paymentMethod, cashReceived, finalTotal]);

    const filteredSantri = useMemo(() => {
        if (!santriSearch.trim()) return [];
        return santriList.filter(s => s.status === 'Aktif' && (s.namaLengkap.toLowerCase().includes(santriSearch.toLowerCase()) || s.nis.includes(santriSearch))).slice(0, 5);
    }, [santriList, santriSearch]);

    const handleProcess = () => {
        if (buyerType === 'Santri' && !selectedSantri) { showToast('Pilih santri terlebih dahulu.', 'error'); return; }
        if (buyerType !== 'Santri' && !manualBuyerName.trim()) { showToast('Masukkan nama pembeli.', 'error'); return; }
        
        const cashVal = parseFloat(cashReceived) || 0;

        if (paymentMethod === 'Tunai' && cashVal < finalTotal) { showToast('Uang tunai kurang!', 'error'); return; }
        if (paymentMethod === 'Tabungan') {
            if (buyerType !== 'Santri' || !selectedSantri) { showToast('Tabungan hanya untuk Santri.', 'error'); return; }
            if (santriBalance < finalTotal) { showToast('Saldo tabungan tidak mencukupi!', 'error'); return; }
            if (isOverDailyLimit && !overrideLimitHarian) {
                showToast(`Melebihi Limit Jajan Harian (${formatRupiah(limitHarian)}). Centang Otorisasi Kasir jika mendesak.`, 'error');
                return;
            }
        }
        if (paymentMethod === 'Hutang') {
            if (buyerType === 'Umum' && !manualBuyerName.trim()) {
                showToast('Nama pembeli wajib diisi untuk pencatatan hutang.', 'error');
                return;
            }
            if (cashVal >= finalTotal) {
                showToast('Jika bayar penuh, gunakan metode Tunai.', 'info');
                return;
            }
            if (isOverKasbonLimit && !overrideLimitKasbon) {
                showToast(`Melebihi Plafon Maksimal Kasbon (${formatRupiah(plafonKasbon)}). Centang Otorisasi Kasir jika diizinkan.`, 'error');
                return;
            }
        }

        onProcessCheckout({
            buyerType,
            selectedSantri,
            manualBuyerName,
            paymentMethod,
            cashReceived: cashVal,
            changeToBalance,
            paymentNote,
            selectedDiskonId,
            finalTotal,
            discountAmount,
            changeAmount,
            overrideLimitHarian
        });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-[75] flex justify-center items-end sm:items-center p-0 sm:p-4">
            <div className="bg-white rounded-t-2xl sm:rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[90vh]">
                <div className="px-4 py-3.5 bg-slate-800 text-white flex justify-between items-center shrink-0">
                    <h3 className="font-bold text-base sm:text-lg">Konfirmasi Pembayaran</h3>
                    <button onClick={onClose} className="w-9 h-9 rounded-lg hover:bg-white/10 flex items-center justify-center"><i className="bi bi-x-lg"></i></button>
                </div>
                <div className="flex-grow overflow-y-auto p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
                    {/* Left: Customer & Discount */}
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Tipe Pembeli</label>
                            <div className="flex bg-gray-100 p-1 rounded-lg">
                                {(['Santri', 'Guru', 'Umum'] as const).map(type => (
                                    <button 
                                        key={type} 
                                        onClick={() => { setBuyerType(type); setSelectedSantri(null); setManualBuyerName(''); if(type !== 'Santri' && paymentMethod === 'Tabungan') setPaymentMethod('Tunai'); }} 
                                        className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${buyerType === type ? 'bg-white shadow text-teal-700 font-bold' : 'text-gray-500'}`}
                                    >
                                        {type}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {buyerType === 'Santri' ? (
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Cari Santri</label>
                                {selectedSantri ? (
                                    <div className="p-3 bg-teal-50 border border-teal-200 rounded-lg space-y-2">
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <div className="font-bold text-teal-900">{selectedSantri.namaLengkap}</div>
                                                <div className="text-xs text-teal-600">{selectedSantri.nis}</div>
                                            </div>
                                            <button onClick={() => { setSelectedSantri(null); setOverrideLimitHarian(false); }} className="text-red-500 hover:text-red-700"><i className="bi bi-x-circle-fill"></i></button>
                                        </div>
                                        <div className="border-t border-teal-200/70 pt-2 text-xs space-y-1">
                                            <div className="flex justify-between">
                                                <span className="text-teal-700">Saldo Tabungan:</span>
                                                <span className="font-bold text-teal-900">{formatRupiah(santriBalance)}</span>
                                            </div>
                                            {limitHarian > 0 && (
                                                <>
                                                    <div className="flex justify-between">
                                                        <span className="text-teal-700">Limit Jajan Harian:</span>
                                                        <span className="font-medium text-teal-800">{formatRupiah(limitHarian)}</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-teal-700">Sisa Kuota Hari Ini:</span>
                                                        <span className={`font-bold ${(sisaLimitHarian || 0) < finalTotal ? 'text-red-600' : 'text-emerald-700'}`}>
                                                            {formatRupiah(sisaLimitHarian || 0)}
                                                        </span>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="relative">
                                        <input type="text" placeholder="Ketik Nama / NIS..." value={santriSearch} onChange={e => setSantriSearch(e.target.value)} className="w-full border rounded-lg p-2.5 text-sm" />
                                        {filteredSantri.length > 0 && (
                                            <div className="absolute z-10 w-full bg-white border rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto">
                                                {filteredSantri.map(s => (
                                                    <div key={s.id} onClick={() => { setSelectedSantri(s); setSantriSearch(''); }} className="p-2.5 hover:bg-gray-100 cursor-pointer text-sm border-b last:border-0">
                                                        <div className="font-bold">{s.namaLengkap}</div>
                                                        <div className="text-xs text-gray-500">{s.nis}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nama Pembeli {paymentMethod === 'Hutang' && <span className="text-red-500">*</span>}</label>
                                <input type="text" value={manualBuyerName} onChange={e => setManualBuyerName(e.target.value)} className="w-full border rounded-lg p-2.5 text-sm" placeholder={buyerType === 'Guru' ? 'Nama Ustadz/Guru...' : 'Nama Pembeli Umum...'} />
                            </div>
                        )}

                        <div className="pt-4 border-t">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Diskon / Promo</label>
                            <select value={selectedDiskonId} onChange={e => setSelectedDiskonId(e.target.value ? Number(e.target.value) : '')} className="w-full border rounded-lg p-2.5 text-sm bg-white">
                                <option value="">-- Tidak Ada Diskon --</option>
                                {discounts.map(d => (
                                    <option key={d.id} value={d.id}>{d.nama} ({d.tipe === 'Persen' ? `${d.nilai}%` : formatRupiah(d.nilai)})</option>
                                ))}
                            </select>
                        </div>

                        <div className="bg-gray-50 p-4 rounded-lg space-y-2 border">
                            <div className="flex justify-between text-sm"><span>Subtotal</span><span>{formatRupiah(subTotal)}</span></div>
                            {discountAmount > 0 && <div className="flex justify-between text-sm text-green-600 font-medium"><span>Diskon</span><span>- {formatRupiah(discountAmount)}</span></div>}
                            <div className="flex justify-between text-xl font-bold text-gray-800 border-t pt-2"><span>Total Akhir</span><span>{formatRupiah(finalTotal)}</span></div>
                        </div>
                    </div>

                    {/* Right: Payment Method */}
                    <div className="space-y-4 flex flex-col justify-between">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Metode Pembayaran</label>
                            <div className="grid grid-cols-2 gap-2">
                                <button onClick={() => setPaymentMethod('Tunai')} className={`p-2.5 rounded-lg border text-left flex items-center gap-2 transition-all ${paymentMethod === 'Tunai' ? 'border-teal-600 bg-teal-50 text-teal-900 font-bold' : 'hover:bg-gray-50'}`}>
                                    <i className="bi bi-cash-coin text-lg text-green-600"></i> <span className="text-sm">Tunai</span>
                                </button>
                                <button onClick={() => setPaymentMethod('Tabungan')} disabled={buyerType !== 'Santri'} className={`p-2.5 rounded-lg border text-left flex items-center gap-2 transition-all ${paymentMethod === 'Tabungan' ? 'border-teal-600 bg-teal-50 text-teal-900 font-bold' : 'hover:bg-gray-50'} ${buyerType !== 'Santri' ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                    <i className="bi bi-wallet2 text-lg text-blue-600"></i> <span className="text-sm">Tabungan</span>
                                </button>
                                <button onClick={() => setPaymentMethod('Non-Tunai')} className={`p-2.5 rounded-lg border text-left flex items-center gap-2 transition-all ${paymentMethod === 'Non-Tunai' ? 'border-teal-600 bg-teal-50 text-teal-900 font-bold' : 'hover:bg-gray-50'}`}>
                                    <i className="bi bi-qr-code text-lg text-purple-600"></i> <span className="text-sm">Transfer/QR</span>
                                </button>
                                <button onClick={() => setPaymentMethod('Hutang')} className={`p-2.5 rounded-lg border text-left flex items-center gap-2 transition-all ${paymentMethod === 'Hutang' ? 'border-red-600 bg-red-50 text-red-900 font-bold' : 'hover:bg-gray-50'}`}>
                                    <i className="bi bi-journal-minus text-lg text-red-600"></i> <span className="text-sm">Kasbon/Hutang</span>
                                </button>
                            </div>
                        </div>

                        {paymentMethod === 'Tunai' && (
                            <div className="space-y-3 bg-gray-50 p-4 rounded-lg border">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Uang Diterima</label>
                                    <input type="number" value={cashReceived} onChange={e => setCashReceived(e.target.value)} className="w-full border rounded-lg p-2 text-lg font-bold text-right" placeholder="0" autoFocus />
                                    <div className="flex gap-1.5 mt-2 justify-end flex-wrap">
                                        {[finalTotal, 10000, 20000, 50000, 100000].map((amt, idx) => (
                                            <button key={idx} type="button" onClick={() => setCashReceived(amt.toString())} className="text-xs font-semibold tabular-nums bg-white border border-slate-300 px-3 py-1.5 min-h-[36px] rounded-lg hover:bg-slate-100 active:scale-95 transition-transform">{amt === finalTotal ? 'Uang Pas' : formatRupiah(amt)}</button>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex justify-between items-center pt-2 border-t">
                                    <span className="font-bold text-gray-600">Kembalian</span>
                                    <span className="font-bold text-xl text-orange-600">{formatRupiah(changeAmount)}</span>
                                </div>
                                {buyerType === 'Santri' && changeAmount > 0 && (
                                    <div className="pt-2">
                                        <label className="flex items-center gap-2 cursor-pointer bg-blue-50 p-2 rounded border border-blue-200">
                                            <input type="checkbox" checked={changeToBalance} onChange={e => setChangeToBalance(e.target.checked)} className="rounded text-blue-600 focus:ring-blue-500" />
                                            <span className="text-xs font-bold text-blue-800">Masukkan kembalian ke Tabungan Santri</span>
                                        </label>
                                    </div>
                                )}
                            </div>
                        )}

                        {paymentMethod === 'Tabungan' && (
                            <div className="space-y-2">
                                <div className={`p-3 rounded-lg border text-sm ${santriBalance >= finalTotal ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
                                    {santriBalance >= finalTotal ? (
                                        <><i className="bi bi-check-circle-fill mr-2"></i> Saldo mencukupi. Sisa saldo nanti: <strong>{formatRupiah(santriBalance - finalTotal)}</strong></>
                                    ) : (
                                        <><i className="bi bi-exclamation-triangle-fill mr-2"></i> Saldo tidak cukup! Kurang: <strong>{formatRupiah(finalTotal - santriBalance)}</strong></>
                                    )}
                                </div>
                                {isOverDailyLimit && (
                                    <div className="p-3 rounded-lg border bg-amber-50 border-amber-300 text-amber-900 text-xs space-y-2">
                                        <div className="font-bold flex items-center gap-1.5 text-amber-800">
                                            <i className="bi bi-shield-exclamation text-base"></i> Melebihi Limit Jajan Harian!
                                        </div>
                                        <p>
                                            Pemakaian hari ini <strong>{formatRupiah(usedToday)}</strong> + belanja ini <strong>{formatRupiah(finalTotal)}</strong> melewati batas harian <strong>{formatRupiah(limitHarian)}</strong>.
                                        </p>
                                        <label className="flex items-center gap-2 cursor-pointer pt-1 border-t border-amber-200 font-bold text-amber-900">
                                            <input
                                                type="checkbox"
                                                checked={overrideLimitHarian}
                                                onChange={e => setOverrideLimitHarian(e.target.checked)}
                                                className="rounded text-amber-600 focus:ring-amber-500"
                                            />
                                            <span>Otorisasi Kasir: Izinkan Lewati Limit (Kebutuhan Khusus/Kitab)</span>
                                        </label>
                                    </div>
                                )}
                            </div>
                        )}

                        {paymentMethod === 'Non-Tunai' && (
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Catatan / No. Referensi</label>
                                <input type="text" value={paymentNote} onChange={e => setPaymentNote(e.target.value)} className="w-full border rounded-lg p-2 text-sm" placeholder="Contoh: Transfer BCA, QRIS..." />
                            </div>
                        )}

                        {paymentMethod === 'Hutang' && (
                            <div className="space-y-3 bg-red-50 p-4 rounded-lg border border-red-200">
                                <div className="text-xs text-red-800 font-bold mb-1">PENCATATAN HUTANG (KASBON)</div>
                                <div className="text-xs bg-white/80 p-2 rounded border border-red-100 space-y-1">
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Hutang Aktif Saat Ini:</span>
                                        <span className="font-bold text-red-600">{formatRupiah(activeKasbonCustomer)}</span>
                                    </div>
                                    {plafonKasbon > 0 && (
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Plafon Maksimal Kasbon:</span>
                                            <span className="font-medium text-gray-800">{formatRupiah(plafonKasbon)}</span>
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Uang Muka / Bayar Sebagian (Opsional)</label>
                                    <input type="number" value={cashReceived} onChange={e => setCashReceived(e.target.value)} className="w-full border rounded-lg p-2 text-sm bg-white" placeholder="0 (Jika hutang penuh)" />
                                </div>
                                <div className="flex justify-between items-center pt-2 border-t border-red-200 text-sm">
                                    <span className="font-bold text-red-700">Sisa Hutang Baru:</span>
                                    <span className="font-bold text-lg text-red-700">{formatRupiah(newKasbonAdded)}</span>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Catatan Jatuh Tempo / Ket.</label>
                                    <input type="text" value={paymentNote} onChange={e => setPaymentNote(e.target.value)} className="w-full border rounded-lg p-2 text-xs bg-white" placeholder="Misal: Bayar gajian bulan depan" />
                                </div>
                                {isOverKasbonLimit && (
                                    <div className="p-2.5 rounded border bg-amber-50 border-amber-300 text-amber-900 text-xs space-y-1.5">
                                        <div className="font-bold text-amber-800">
                                            <i className="bi bi-exclamation-triangle-fill mr-1"></i> Total Kasbon Melebihi Plafon ({formatRupiah(plafonKasbon)})!
                                        </div>
                                        <label className="flex items-center gap-2 cursor-pointer font-bold">
                                            <input
                                                type="checkbox"
                                                checked={overrideLimitKasbon}
                                                onChange={e => setOverrideLimitKasbon(e.target.checked)}
                                                className="rounded text-amber-600"
                                            />
                                            <span>Otorisasi Kasir: Tetap Izinkan Kasbon</span>
                                        </label>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="hidden md:block mt-auto pt-2">
                            <button 
                                onClick={handleProcess} 
                                className="w-full min-h-[48px] py-3.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl shadow-md transition-all active:scale-[0.99] flex justify-center items-center gap-2"
                            >
                                <i className="bi bi-printer-fill"></i> PROSES & CETAK
                            </button>
                        </div>
                    </div>
                </div>
                {/* Mobile Sticky Bottom CTA Footer */}
                <div className="md:hidden p-3.5 bg-white border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
                    <div>
                        <div className="text-[11px] text-slate-500">Total Tagihan</div>
                        <div className="text-lg font-bold text-slate-900 tabular-nums">{formatRupiah(finalTotal)}</div>
                    </div>
                    <button 
                        onClick={handleProcess} 
                        className="flex-1 min-h-[48px] py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl shadow-sm active:scale-[0.99] flex justify-center items-center gap-2"
                    >
                        <i className="bi bi-printer-fill"></i> PROSES & CETAK
                    </button>
                </div>
            </div>
        </div>
    );
};
