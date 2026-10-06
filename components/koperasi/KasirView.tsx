import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useAppContext } from '../../AppContext';
import { useSantriContext } from '../../contexts/SantriContext';
import { useFinanceContext } from '../../contexts/FinanceContext';
import { Santri } from '../../types';
import { formatRupiah } from '../../utils/formatters';

export const KasirView: React.FC = () => {
    const { showToast, currentUser } = useAppContext();
    const { santriList } = useSantriContext();
    const { saldoSantriList, transaksiSaldoList, onAddTransaksiSaldo } = useFinanceContext();
    const [scanInput, setScanInput] = useState('');
    const [selectedSantri, setSelectedSantri] = useState<Santri | null>(null);
    const [transactionType, setTransactionType] = useState<'Setor' | 'Tarik'>('Tarik');
    const [jumlah, setJumlah] = useState('');
    const [keterangan, setKeterangan] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    // Auto-focus on barcode input
    useEffect(() => {
        if (!selectedSantri) {
            inputRef.current?.focus();
        }
    }, [selectedSantri]);

    const matchingSantriList = useMemo(() => {
        const q = scanInput.trim().toLowerCase();
        if (!q || selectedSantri) return [];
        return santriList
            .filter(s => s.status === 'Aktif' && (s.nis.toLowerCase().includes(q) || s.namaLengkap.toLowerCase().includes(q)))
            .slice(0, 6);
    }, [scanInput, santriList, selectedSantri]);

    const handleBarcodeSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!scanInput.trim()) return;

        const q = scanInput.trim().toLowerCase();
        const exactMatch = santriList.find(
            s => s.nis.toLowerCase() === q || s.id.toString() === q
        );
        const target = exactMatch || matchingSantriList[0];

        if (target) {
            setSelectedSantri(target);
            setScanInput('');
            showToast(`Santri dipilih: ${target.namaLengkap}`, 'success');
        } else {
            showToast('Santri tidak ditemukan! Periksa NIS/Nama.', 'error');
        }
    };

    const getSaldo = (santriId: number): number => {
        const record = saldoSantriList.find(s => s.santriId === santriId);
        return record?.saldo || 0;
    };

    const getLimitHarian = (santriId: number): number => {
        const record = saldoSantriList.find(s => s.santriId === santriId);
        return record?.limitHarian || 0;
    };

    const usedToday = useMemo(() => {
        if (!selectedSantri) return 0;
        const todayStr = new Date().toDateString();
        return transaksiSaldoList
            .filter(t => !t.deleted && t.santriId === selectedSantri.id && t.jenis === 'Penarikan' && new Date(t.tanggal).toDateString() === todayStr)
            .reduce((sum, t) => sum + t.jumlah, 0);
    }, [selectedSantri, transaksiSaldoList]);

    const handleQuickAmount = (amount: number) => {
        setJumlah(amount.toString());
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedSantri) return;

        const amount = parseFloat(jumlah);
        if (isNaN(amount) || amount <= 0) {
            showToast('Masukkan jumlah yang valid!', 'error');
            return;
        }

        const currentSaldo = getSaldo(selectedSantri.id);
        if (transactionType === 'Tarik' && amount > currentSaldo) {
            showToast('Saldo tidak mencukupi!', 'error');
            return;
        }

        setIsProcessing(true);
        try {
            await onAddTransaksiSaldo({
                santriId: selectedSantri.id,
                jenis: transactionType === 'Setor' ? 'Deposit' : 'Penarikan',
                jumlah: amount,
                keterangan: keterangan || (transactionType === 'Setor' ? 'Setor Tunai (Kasir Cepat)' : 'Penarikan Tunai / Jajan (Kasir Cepat)'),
                operator: currentUser?.fullName || currentUser?.username || 'Kasir'
            });

            const newSaldo = transactionType === 'Setor' ? currentSaldo + amount : currentSaldo - amount;
            showToast(`${transactionType} Rp ${amount.toLocaleString('id-ID')} berhasil! Saldo: Rp ${newSaldo.toLocaleString('id-ID')}`, 'success');
            
            // Reset form for next customer
            setJumlah('');
            setKeterangan('');
            setSelectedSantri(null);
            inputRef.current?.focus();
        } catch (error) {
            showToast((error as Error).message || 'Gagal memproses transaksi.', 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleClear = () => {
        setSelectedSantri(null);
        setScanInput('');
        setJumlah('');
        setKeterangan('');
        inputRef.current?.focus();
    };

    const quickAmounts = [5000, 10000, 15000, 20000, 25000, 50000];
    const limitHarian = selectedSantri ? getLimitHarian(selectedSantri.id) : 0;
    const sisaLimit = limitHarian > 0 ? Math.max(0, limitHarian - usedToday) : null;

    return (
        <div className="max-w-2xl mx-auto">
            {/* Header */}
            <div className="bg-gradient-to-r from-teal-600 to-emerald-600 text-white p-4 sm:p-6 rounded-t-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                        <h2 className="text-lg sm:text-2xl font-bold flex items-center gap-2">
                            <i className="bi bi-upc-scan"></i> Mode Kasir Cepat (Tabungan)
                        </h2>
                        <p className="text-teal-100 text-xs sm:text-sm mt-1">Scan barcode kartu santri atau ketik NIS/Nama untuk transaksi instan (terintegrasi Limit Harian)</p>
                    </div>
                    {selectedSantri && (
                        <button onClick={handleClear} className="min-h-[40px] bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-xs sm:text-sm font-bold shrink-0 flex items-center justify-center gap-1.5">
                            <i className="bi bi-arrow-counterclockwise"></i> Ganti Santri
                        </button>
                    )}
                </div>
            </div>

            {/* Barcode / Name Search Input */}
            <div className="bg-white p-3.5 sm:p-4 border-b border-slate-200 shadow-2xs relative">
                <form onSubmit={handleBarcodeSubmit} className="flex gap-2">
                    <div className="relative flex-grow">
                        <i className="bi bi-upc-scan absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-lg"></i>
                        <input
                            ref={inputRef}
                            type="text"
                            value={scanInput}
                            onChange={(e) => setScanInput(e.target.value)}
                            placeholder="Scan Barcode atau ketik NIS / Nama Santri..."
                            className="w-full pl-10 pr-9 py-2.5 min-h-[46px] border-2 border-teal-500 rounded-xl text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-teal-500"
                            autoFocus
                        />
                        {scanInput && (
                            <button
                                type="button"
                                onClick={() => setScanInput('')}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full text-slate-400 hover:text-slate-600 flex items-center justify-center"
                            >
                                <i className="bi bi-x-circle-fill"></i>
                            </button>
                        )}
                    </div>
                    <button type="submit" className="min-h-[46px] bg-teal-600 hover:bg-teal-700 text-white px-4 sm:px-6 rounded-xl font-bold text-sm shrink-0 flex items-center gap-1.5">
                        <i className="bi bi-search"></i> <span className="hidden sm:inline">Cari</span>
                    </button>
                </form>

                {/* Live Autocomplete Dropdown for Touch / Tablet Users */}
                {matchingSantriList.length > 0 && (
                    <div className="absolute left-3.5 right-3.5 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-30 divide-y divide-slate-100 max-h-64 overflow-y-auto">
                        {matchingSantriList.map(s => {
                            const sSaldo = getSaldo(s.id);
                            return (
                                <button
                                    key={s.id}
                                    type="button"
                                    onClick={() => {
                                        setSelectedSantri(s);
                                        setScanInput('');
                                    }}
                                    className="w-full p-3 hover:bg-teal-50 text-left flex items-center justify-between gap-3 transition-colors"
                                >
                                    <div className="min-w-0">
                                        <div className="font-bold text-sm text-slate-800 truncate">{s.namaLengkap}</div>
                                        <div className="text-xs text-slate-500">NIS: {s.nis}</div>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <div className="text-[10px] text-slate-400">Saldo</div>
                                        <div className="text-xs font-bold text-teal-700 tabular-nums">{formatRupiah(sSaldo)}</div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Selected Santri Info */}
            {selectedSantri && (
                <div className="bg-white p-4 sm:p-6 border-b rounded-b-xl shadow-xs">
                    <div className="flex items-center gap-3.5 sm:gap-4">
                        <img
                            src={selectedSantri.fotoUrl || 'https://via.placeholder.com/80x100/e2e8f0/64748b?text=Foto'}
                            alt={selectedSantri.namaLengkap}
                            className="w-16 h-20 sm:w-20 sm:h-24 object-cover rounded-xl border-2 border-teal-500 shrink-0"
                        />
                        <div className="flex-grow min-w-0">
                            <h3 className="text-base sm:text-xl font-bold text-slate-800 truncate">{selectedSantri.namaLengkap}</h3>
                            <p className="text-slate-500 text-xs sm:text-sm">NIS: {selectedSantri.nis}</p>
                            <div className="mt-2 inline-block bg-gradient-to-r from-teal-500 to-emerald-500 text-white px-3.5 py-1.5 rounded-xl">
                                <span className="text-[11px] block opacity-85">Saldo Saat Ini</span>
                                <span className="text-lg sm:text-2xl font-bold tabular-nums">Rp {getSaldo(selectedSantri.id).toLocaleString('id-ID')}</span>
                            </div>
                        </div>
                    </div>

                    {limitHarian > 0 && (
                        <div className="mt-4 p-3 bg-teal-50 border border-teal-200 rounded-xl grid grid-cols-3 text-center sm:text-left text-xs gap-2">
                            <div>
                                <span className="text-teal-700 block text-[11px]">Limit Harian</span>
                                <strong className="text-teal-900 tabular-nums">{formatRupiah(limitHarian)}</strong>
                            </div>
                            <div>
                                <span className="text-teal-700 block text-[11px]">Terpakai</span>
                                <strong className="text-orange-700 tabular-nums">{formatRupiah(usedToday)}</strong>
                            </div>
                            <div>
                                <span className="text-teal-700 block text-[11px]">Sisa Kuota</span>
                                <strong className={`tabular-nums ${sisaLimit === 0 ? 'text-red-600' : 'text-emerald-700'}`}>{formatRupiah(sisaLimit || 0)}</strong>
                            </div>
                        </div>
                    )}

                    {/* Transaction Form */}
                    <div className="mt-5 space-y-4">
                        {/* Type Toggle */}
                        <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
                            <button
                                type="button"
                                onClick={() => setTransactionType('Tarik')}
                                className={`min-h-[44px] py-2.5 rounded-lg font-bold text-sm text-center transition-all ${
                                    transactionType === 'Tarik'
                                        ? 'bg-orange-500 text-white shadow-xs'
                                        : 'text-slate-600 hover:bg-slate-200'
                                }`}
                            >
                                <i className="bi bi-cart-dash mr-1.5"></i> Tarik / Belanja
                            </button>
                            <button
                                type="button"
                                onClick={() => setTransactionType('Setor')}
                                className={`min-h-[44px] py-2.5 rounded-lg font-bold text-sm text-center transition-all ${
                                    transactionType === 'Setor'
                                        ? 'bg-teal-600 text-white shadow-xs'
                                        : 'text-slate-600 hover:bg-slate-200'
                                }`}
                            >
                                <i className="bi bi-wallet2 mr-1.5"></i> Setor / Top-Up
                            </button>
                        </div>

                        {/* Quick Amount Buttons */}
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Nominal Cepat</label>
                            <div className="grid grid-cols-3 gap-2">
                                {quickAmounts.map((amt) => (
                                    <button
                                        key={amt}
                                        type="button"
                                        onClick={() => handleQuickAmount(amt)}
                                        className={`min-h-[42px] py-2 px-2.5 rounded-xl border text-xs sm:text-sm font-bold tabular-nums transition-all active:scale-95 ${
                                            jumlah === amt.toString()
                                                ? 'border-teal-500 bg-teal-50 text-teal-700'
                                                : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                                        }`}
                                    >
                                        Rp {amt.toLocaleString('id-ID')}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Custom Amount */}
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Jumlah (Rp)</label>
                            <input
                                type="number"
                                value={jumlah}
                                onChange={(e) => setJumlah(e.target.value)}
                                placeholder="0"
                                className="w-full p-3 border-2 border-slate-300 rounded-xl text-xl sm:text-2xl font-bold text-center tabular-nums focus:outline-none focus:border-teal-500"
                            />
                        </div>

                        {/* Notes */}
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Keterangan (opsional)</label>
                            <input
                                type="text"
                                value={keterangan}
                                onChange={(e) => setKeterangan(e.target.value)}
                                placeholder="Contoh: setor tabungan mingguan"
                                className="w-full p-3 min-h-[44px] border border-slate-300 rounded-xl text-sm"
                            />
                        </div>

                        {/* Submit Button */}
                        <button
                            onClick={handleSubmit}
                            disabled={isProcessing || !jumlah}
                            className={`w-full min-h-[48px] py-3.5 rounded-xl font-bold text-base sm:text-lg transition-all active:scale-[0.99] shadow-xs ${
                                transactionType === 'Setor'
                                    ? 'bg-teal-600 hover:bg-teal-700 text-white'
                                    : 'bg-orange-500 hover:bg-orange-600 text-white'
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                            {isProcessing ? (
                                <><i className="bi bi-arrow-repeat animate-spin mr-2"></i>Memproses...</>
                            ) : (
                                <>{transactionType === 'Setor' ? <><i className="bi bi-plus-circle mr-2"></i>Konfirmasi Setoran</> : <><i className="bi bi-dash-circle mr-2"></i>Konfirmasi Penarikan</>} Rp {parseFloat(jumlah || '0').toLocaleString('id-ID')}</>
                            )}
                        </button>
                    </div>
                </div>
            )}

            {/* Help Text */}
            {!selectedSantri && (
                <div className="bg-white rounded-b-xl border border-t-0 border-slate-200 text-center text-slate-400 py-10 px-4">
                    <i className="bi bi-upc-scan text-5xl mb-3 block text-teal-600/40"></i>
                    <p className="text-sm font-medium text-slate-600">Scan kartu santri atau ketik Nama / NIS di atas</p>
                    <p className="text-xs text-slate-400 mt-1">Mendukung pencarian nama langsung untuk perangkat Tablet & Ponsel</p>
                </div>
            )}
        </div>
    );
};
