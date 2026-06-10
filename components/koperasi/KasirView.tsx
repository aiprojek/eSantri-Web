import React, { useState, useEffect, useRef } from 'react';
import { useLiveQuery } from "dexie-react-hooks";
import { db } from '../../db';
import { useAppContext } from '../../AppContext';
import { useSantriContext } from '../../contexts/SantriContext';
import { useFinanceContext } from '../../contexts/FinanceContext';
import { Santri, SaldoSantri } from '../../types';
import { SmartAvatar } from '../reports/modules/Common';

export const KasirView: React.FC = () => {
    const { showToast } = useAppContext();
    const { santriList } = useSantriContext();
    const { saldoSantriList, onAddTransaksiSaldo } = useFinanceContext();

    const [scannedNis, setScannedNis] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedSantri, setSelectedSantri] = useState<Santri | null>(null);
    const [santriSaldo, setSantriSaldo] = useState<SaldoSantri | null>(null);
    const [transactionType, setTransactionType] = useState<'Setor' | 'Tarik'>('Setor');
    const [jumlah, setJumlah] = useState('');
    const [keterangan, setKeterangan] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    const inputRef = useRef<HTMLInputElement>(null);

    // Auto-focus input on mount
    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    // Find saldo when selectedSantri changes
    useEffect(() => {
        if (selectedSantri) {
            const saldo = saldoSantriList.find(s => s.santriId === selectedSantri.id);
            setSantriSaldo(saldo || null);
        } else {
            setSantriSaldo(null);
        }
    }, [selectedSantri, saldoSantriList]);

    const handleNisScan = (nis: string) => {
        const found = santriList.find(s => s.nis === nis && s.status === 'Aktif');
        if (found) {
            setSelectedSantri(found);
            setScannedNis('');
            setJumlah('');
            setKeterangan('');
        } else {
            showToast(`NIS "${nis}" tidak ditemukan atau tidak aktif`, 'error');
            setSelectedSantri(null);
        }
    };

    const handleSubmit = async () => {
        if (!selectedSantri) {
            showToast('Pilih santrisri terlebih dahulu', 'error');
            return;
        }

        const nominal = parseFloat(jumlah);
        if (isNaN(nominal) || nominal <= 0) {
            showToast('Masukkan jumlah yang valid', 'error');
            return;
        }

        if (transactionType === 'Tarik' && nominal > (santriSaldo?.saldo || 0)) {
            showToast('Saldo tidak cukup untuk penarikan', 'error');
            return;
        }

        setIsProcessing(true);
        try {
            await onAddTransaksiSaldo({
                santriId: selectedSantri.id,
                jenis: transactionType === 'Setor' ? 'Deposit' as const : 'Penarikan' as const,
                jumlah: nominal,
                keterangan: keterangan || `Transaksi Kasir ${transactionType}`
            });

            showToast(`${transactionType === 'Setor' ? 'Setoran' : 'Penarikan'} berhasil!`, 'success');
            setJumlah('');
            setKeterangan('');
            setSelectedSantri(null);
            inputRef.current?.focus();
        } catch (error) {
            console.error('Gagal transaksi:', error);
            showToast('Gagal menyimpan transaksi', 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    // Quick amount buttons
    const quickAmounts = [10000, 20000, 50000, 100000];

    return (
        <div className="max-w-2xl mx-auto p-4 space-y-6">
            {/* Header */}
            <div className="bg-gradient-to-r from-teal-600 to-teal-700 text-white rounded-xl p-6 shadow-lg">
                <div className="flex items-center gap-3 mb-2">
                    <i className="bi bi-person-badge text-3xl"></i>
                    <div>
                        <h2 className="text-xl font-bold">Mode Kasir</h2>
                        <p className="text-teal-100 text-sm">Setor / Tarik Tabungan Santri</p>
                    </div>
                </div>
            </div>

            {/* NIS Scanner Input */}
            <div className="bg-white rounded-xl p-4 border shadow-sm">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                    <i className="bi bi-upc-scan mr-1"></i> Scan atau Input NIS
                </label>
                <input
                    ref={inputRef}
                    type="text"
                    value={scannedNis}
                    onChange={(e) => setScannedNis(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            handleNisScan(scannedNis);
                        }
                    }}
                    placeholder="Tekan Enter setelah scan atau ketik NIS..."
                    className="w-full text-lg font-mono p-3 border-2 border-slate-200 rounded-lg focus:border-teal-500 focus:outline-none"
                    autoComplete="off"
                />
            </div>

            {/* Search Alternative */}
            <div className="bg-white rounded-xl p-4 border shadow-sm">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                    <i className="bi bi-search mr-1"></i> Atau Cari Santri
                </label>
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Ketik nama atau NIS..."
                    className="w-full p-2 border rounded-lg"
                    autoComplete="off"
                />
                {searchQuery && (
                    <div className="mt-2 max-h-48 overflow-y-auto border rounded-lg">
                        {santriList
                            .filter(s => s.status === 'Aktif' && (
                                s.namaLengkap.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                s.nis.includes(searchQuery)
                            ))
                            .slice(0, 10)
                            .map(s => (
                                <div
                                    key={s.id}
                                    onClick={() => {
                                        setSelectedSantri(s);
                                        setSearchQuery('');
                                    }}
                                    className="flex items-center gap-3 p-3 hover:bg-teal-50 cursor-pointer border-b last:border-b-0"
                                >
                                    <SmartAvatar santri={s} variant="modern" className="w-10 h-10 rounded-full" forcePlaceholder />
                                    <div>
                                        <div className="font-medium">{s.namaLengkap}</div>
                                        <div className="text-xs text-slate-500">{s.nis}</div>
                                    </div>
                                </div>
                            ))}
                    </div>
                )}
            </div>

            {/* Selected Santri Card */}
            {selectedSantri && (
                <div className="bg-white rounded-xl border-2 border-teal-500 shadow-md overflow-hidden">
                    <div className="bg-teal-500 text-white p-3 flex justify-between items-center">
                        <span className="font-bold flex items-center gap-2">
                            <i className="bi bi-check-circle-fill"></i> Santri Terpilih
                        </span>
                        <button
                            onClick={() => setSelectedSantri(null)}
                            className="text-teal-100 hover:text-white"
                        >
                            <i className="bi bi-x-circle"></i> Batal
                        </button>
                    </div>
                    <div className="p-4 flex items-center gap-4">
                        <SmartAvatar santri={selectedSantri} variant="classic" className="w-20 h-24 rounded-lg shadow" />
                        <div className="flex-grow">
                            <h3 className="text-lg font-bold text-slate-800">{selectedSantri.namaLengkap}</h3>
                            <p className="text-slate-600 font-mono">{selectedSantri.nis}</p>
                            <div className="mt-2 flex items-center gap-2">
                                <span className="text-sm text-slate-500">Saldo:</span>
                                <span className={`text-xl font-bold ${(santriSaldo?.saldo || 0) > 0 ? 'text-teal-600' : 'text-slate-400'}`}>
                                    Rp {(santriSaldo?.saldo || 0).toLocaleString('id-ID')}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Transaction Form */}
                    <div className="p-4 bg-slate-50 border-t space-y-4">
                        {/* Transaction Type Toggle */}
                        <div className="flex gap-2">
                            <button
                                onClick={() => setTransactionType('Setor')}
                                className={`flex-1 py-3 rounded-lg font-bold transition-colors ${
                                    transactionType === 'Setor'
                                        ? 'bg-teal-600 text-white'
                                        : 'bg-white text-slate-600 border border-slate-300 hover:bg-slate-100'
                                }`}
                            >
                                <i className="bi bi-plus-circle mr-2"></i>Setor
                            </button>
                            <button
                                onClick={() => setTransactionType('Tarik')}
                                className={`flex-1 py-3 rounded-lg font-bold transition-colors ${
                                    transactionType === 'Tarik'
                                        ? 'bg-orange-500 text-white'
                                        : 'bg-white text-slate-600 border border-slate-300 hover:bg-slate-100'
                                }`}
                            >
                                <i className="bi bi-dash-circle mr-2"></i>Tarik
                            </button>
                        </div>

                        {/* Quick Amount Buttons */}
                        <div>
                            <label className="block text-sm font-medium text-slate-600 mb-2">Jumlah</label>
                            <div className="grid grid-cols-4 gap-2 mb-2">
                                {quickAmounts.map(amount => (
                                    <button
                                        key={amount}
                                        onClick={() => setJumlah(String(amount))}
                                        className="py-2 px-3 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm font-medium text-slate-700 border"
                                    >
                                        {amount >= 1000 ? `${amount / 1000}rb` : amount}
                                    </button>
                                ))}
                            </div>
                            <input
                                type="number"
                                value={jumlah}
                                onChange={(e) => setJumlah(e.target.value)}
                                placeholder="Atau ketik nominal..."
                                className="w-full p-3 border-2 border-slate-200 rounded-lg focus:border-teal-500 focus:outline-none text-lg font-mono text-right"
                            />
                        </div>

                        {/* Keterangan */}
                        <div>
                            <label className="block text-sm font-medium text-slate-600 mb-2">Keterangan (opsional)</label>
                            <input
                                type="text"
                                value={keterangan}
                                onChange={(e) => setKeterangan(e.target.value)}
                                placeholder="Contoh: setor tabungan mingguan"
                                className="w-full p-3 border rounded-lg"
                            />
                        </div>

                        {/* Submit Button */}
                        <button
                            onClick={handleSubmit}
                            disabled={isProcessing || !jumlah}
                            className={`w-full py-4 rounded-lg font-bold text-lg transition-colors ${
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
                <div className="text-center text-slate-400 py-8">
                    <i className="bi bi-upc-scan text-5xl mb-3 block"></i>
                    <p>Scan barcode atau ketik NIS untuk memulai transaksi</p>
                </div>
            )}
        </div>
    );
};