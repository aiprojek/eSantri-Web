
import React, { useState, useMemo, useEffect } from 'react';
import { Santri, SaldoSantri, Diskon, PondokSettings } from '../../../types';
import { formatRupiah } from '../../../utils/formatters';

interface CheckoutModalProps {
    isOpen: boolean;
    onClose: () => void;
    totalAmount: number;
    santriList: Santri[];
    saldoList: SaldoSantri[];
    discounts: Diskon[];
    settings: PondokSettings;
    onProcess: (data: any) => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({ 
    isOpen, onClose, totalAmount, santriList, saldoList, discounts, settings, onProcess 
}) => {
    // --- LOCAL STATE ---
    const [customerType, setCustomerType] = useState<'Santri' | 'Umum' | 'Guru'>('Santri');
    const [selectedSantriId, setSelectedSantriId] = useState<number | null>(null);
    const [buyerName, setBuyerName] = useState('');
    const [buyerPhone, setBuyerPhone] = useState('');
    const [paymentMethod, setPaymentMethod] = useState<'Tunai' | 'Tabungan' | 'Non-Tunai' | 'Hutang'>('Tunai');
    const [cashReceived, setCashReceived] = useState(0);
    const [paymentRef, setPaymentRef] = useState('');
    const [selectedDiskonId, setSelectedDiskonId] = useState<number | null>(null);
    const [saveChangeToBalance, setSaveChangeToBalance] = useState(false);
    
    // Filters for Santri
    const [santriSearchTerm, setSantriSearchTerm] = useState('');
    const [filterJenjang, setFilterJenjang] = useState<number>(0);
    const [filterKelas, setFilterKelas] = useState<number>(0);
    const [filterRombel, setFilterRombel] = useState<number>(0);

    // Reset state on open
    useEffect(() => {
        if (isOpen) {
            setCustomerType('Santri');
            setSelectedSantriId(null);
            setBuyerName('');
            setBuyerPhone('');
            setPaymentMethod('Tunai');
            setCashReceived(0);
            setPaymentRef('');
            setSelectedDiskonId(null);
            setSaveChangeToBalance(false);
            setSantriSearchTerm('');
        }
    }, [isOpen]);

    // --- COMPUTED VALUES ---
    const discountAmount = useMemo(() => {
        if (!selectedDiskonId) return 0;
        const disc = discounts.find(d => d.id === selectedDiskonId);
        if (!disc) return 0;
        if (disc.tipe === 'Nominal') return Math.min(disc.nilai, totalAmount);
        return Math.floor(totalAmount * (disc.nilai / 100));
    }, [selectedDiskonId, totalAmount, discounts]);

    const finalTotal = Math.max(0, totalAmount - discountAmount);
    const kembalian = Math.max(0, cashReceived - finalTotal);

    const filteredSantriList = useMemo(() => {
        return santriList.filter(s => {
            if (s.status !== 'Aktif') return false;
            if (filterJenjang && s.jenjangId !== filterJenjang) return false;
            if (filterKelas && s.kelasId !== filterKelas) return false;
            if (filterRombel && s.rombelId !== filterRombel) return false;
            if (santriSearchTerm) {
                const lower = santriSearchTerm.toLowerCase();
                return s.namaLengkap.toLowerCase().includes(lower) || s.nis.includes(lower);
            }
            return true;
        }).slice(0, 20);
    }, [santriList, filterJenjang, filterKelas, filterRombel, santriSearchTerm]);

    // --- HANDLERS ---
    const handleProcess = () => {
        // Validation
        if (customerType === 'Santri' && !selectedSantriId) {
            alert("Pilih santri terlebih dahulu."); return;
        }
        if (customerType === 'Umum' && paymentMethod === 'Hutang' && (!buyerName || !buyerPhone)) {
            alert("Nama dan No. HP wajib diisi untuk hutang umum."); return;
        }
        if (paymentMethod === 'Tunai' && cashReceived < finalTotal) {
            alert("Uang tunai kurang."); return;
        }

        // Construct Data Payload
        const payload = {
            customerType,
            selectedSantriId,
            buyerName,
            buyerPhone,
            paymentMethod,
            cashReceived,
            paymentRef,
            selectedDiskonId,
            saveChangeToBalance,
            discountAmount,
            finalTotal,
            kembalian
        };

        onProcess(payload);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-[80] flex justify-center items-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden animate-scale-up">
                <div className="p-4 border-b bg-teal-700 text-white flex justify-between items-center shrink-0">
                    <h3 className="font-bold text-lg"><i className="bi bi-wallet2 mr-2"></i> Checkout & Pembayaran</h3>
                    <button onClick={onClose}><i className="bi bi-x-lg text-lg"></i></button>
                </div>
                <div className="flex flex-col lg:flex-row flex-grow overflow-hidden">
                    {/* LEFT PANEL: CUSTOMER INFO */}
                    <div className="w-full lg:w-1/2 p-5 border-r bg-gray-50 flex flex-col overflow-hidden">
                        <div className="mb-4">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Tipe Pelanggan</label>
                            <div className="flex p-1 bg-gray-200 rounded-lg">
                                {(['Santri', 'Guru', 'Umum'] as const).map(type => (
                                    <button 
                                        key={type} 
                                        onClick={() => { setCustomerType(type); setSelectedSantriId(null); }} 
                                        className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${customerType === type ? 'bg-white shadow text-teal-700' : 'text-gray-500 hover:text-gray-700'}`}
                                    >
                                        {type}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {customerType === 'Santri' ? (
                            <div className="flex flex-col flex-grow min-h-0">
                                <div className="grid grid-cols-3 gap-2 mb-2">
                                    <select onChange={e => {setFilterJenjang(Number(e.target.value)); setFilterKelas(0); setFilterRombel(0);}} className="border rounded p-1 text-xs"><option value={0}>Jenjang</option>{settings.jenjang.map(j => <option key={j.id} value={j.id}>{j.nama}</option>)}</select>
                                    <select onChange={e => setFilterKelas(Number(e.target.value))} className="border rounded p-1 text-xs"><option value={0}>Kelas</option>{settings.kelas.filter(k => !filterJenjang || k.jenjangId === filterJenjang).map(k => <option key={k.id} value={k.id}>{k.nama}</option>)}</select>
                                    <select onChange={e => setFilterRombel(Number(e.target.value))} className="border rounded p-1 text-xs"><option value={0}>Rombel</option>{settings.rombel.filter(r => !filterKelas || r.kelasId === filterKelas).map(r => <option key={r.id} value={r.id}>{r.nama}</option>)}</select>
                                </div>
                                <div className="relative mb-2">
                                    <input type="text" value={santriSearchTerm} onChange={e => setSantriSearchTerm(e.target.value)} className="w-full border rounded p-2 pl-8 text-sm" placeholder="Cari Nama Santri..." />
                                    <i className="bi bi-search absolute left-2.5 top-2.5 text-gray-400"></i>
                                </div>
                                <div className="flex-grow overflow-y-auto border rounded bg-white">
                                    {filteredSantriList.map(s => (
                                        <div key={s.id} onClick={() => setSelectedSantriId(s.id)} className={`p-2 border-b cursor-pointer hover:bg-teal-50 flex justify-between items-center ${selectedSantriId === s.id ? 'bg-teal-100' : ''}`}>
                                            <div>
                                                <div className="font-bold text-sm text-gray-800">{s.namaLengkap}</div>
                                                <div className="text-xs text-gray-500">{settings.rombel.find(r=>r.id===s.rombelId)?.nama}</div>
                                            </div>
                                            {selectedSantriId === s.id && <i className="bi bi-check-circle-fill text-teal-600"></i>}
                                        </div>
                                    ))}
                                </div>
                                {selectedSantriId && (
                                    <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
                                        Saldo Santri: <strong>{formatRupiah(saldoList.find(s => s.santriId === selectedSantriId)?.saldo || 0)}</strong>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1">Nama Pembeli</label>
                                <input type="text" value={buyerName} onChange={e => setBuyerName(e.target.value)} className="w-full border rounded p-2 text-sm mb-2" placeholder="Nama..." />
                                {paymentMethod === 'Hutang' && (
                                    <>
                                        <label className="block text-xs font-bold text-red-600 mb-1">No. HP (Wajib untuk Hutang)</label>
                                        <input type="text" value={buyerPhone} onChange={e => setBuyerPhone(e.target.value)} className="w-full border rounded p-2 text-sm border-red-200" placeholder="08..." />
                                    </>
                                )}
                            </div>
                        )}
                    </div>

                    {/* RIGHT PANEL: PAYMENT */}
                    <div className="w-full lg:w-1/2 p-5 flex flex-col bg-white">
                        <div className="text-center mb-6">
                            <div className="text-gray-500 text-xs uppercase mb-1">Total Belanja</div>
                            <div className="text-3xl font-bold text-gray-800">{formatRupiah(totalAmount)}</div>
                        </div>

                        {/* Discount */}
                        <div className="mb-4">
                            <label className="block text-xs font-bold text-gray-600 mb-1">Diskon / Voucher</label>
                            <select value={selectedDiskonId || ''} onChange={e => setSelectedDiskonId(Number(e.target.value) || null)} className="w-full border rounded p-2 text-sm bg-yellow-50 focus:ring-yellow-500">
                                <option value="">- Tidak Ada -</option>
                                {discounts.map(d => (
                                    <option key={d.id} value={d.id}>{d.nama} ({d.tipe === 'Nominal' ? formatRupiah(d.nilai) : `${d.nilai}%`})</option>
                                ))}
                            </select>
                            {discountAmount > 0 && <div className="text-right text-sm text-green-600 font-bold mt-1">- {formatRupiah(discountAmount)}</div>}
                        </div>

                        <div className="border-t border-b py-3 mb-4 flex justify-between items-center bg-gray-50 px-2 rounded">
                            <span className="font-bold text-gray-700">Total Akhir:</span>
                            <span className="text-2xl font-bold text-teal-700">{formatRupiah(finalTotal)}</span>
                        </div>

                        {/* Payment Method */}
                        <div className="mb-4">
                            <label className="block text-xs font-bold text-gray-600 mb-2">Metode Pembayaran</label>
                            <div className="grid grid-cols-4 gap-2">
                                <button onClick={() => setPaymentMethod('Tunai')} className={`py-2 text-xs font-bold rounded border ${paymentMethod === 'Tunai' ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-600'}`}>Tunai</button>
                                <button onClick={() => setPaymentMethod('Non-Tunai')} className={`py-2 text-xs font-bold rounded border ${paymentMethod === 'Non-Tunai' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600'}`}>Qris/Trf</button>
                                <button onClick={() => setPaymentMethod('Tabungan')} disabled={customerType !== 'Santri'} className={`py-2 text-xs font-bold rounded border ${paymentMethod === 'Tabungan' ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-gray-600 disabled:bg-gray-100 disabled:text-gray-300'}`}>Tabungan</button>
                                <button onClick={() => setPaymentMethod('Hutang')} className={`py-2 text-xs font-bold rounded border ${paymentMethod === 'Hutang' ? 'bg-red-600 text-white border-red-600' : 'bg-white text-gray-600'}`}>Hutang</button>
                            </div>
                        </div>

                        {paymentMethod === 'Tunai' && (
                            <div className="mb-4">
                                <label className="block text-xs font-bold text-gray-600 mb-1">Uang Diterima</label>
                                <input type="number" value={cashReceived || ''} onChange={e => setCashReceived(Number(e.target.value))} className="w-full border-2 border-gray-300 rounded-lg p-3 text-xl font-bold text-gray-800 focus:border-teal-500 focus:outline-none" placeholder="0" />
                                <div className="grid grid-cols-4 gap-2 mt-2">
                                    {[10000, 20000, 50000, 100000].map(amt => (
                                        <button key={amt} onClick={() => setCashReceived(amt)} className="bg-gray-100 hover:bg-gray-200 border rounded py-1 text-xs font-medium text-gray-700">{amt/1000}k</button>
                                    ))}
                                    <button onClick={() => setCashReceived(finalTotal)} className="col-span-4 bg-blue-50 text-blue-700 border border-blue-200 py-1 text-xs font-bold rounded hover:bg-blue-100">Uang Pas</button>
                                </div>
                            </div>
                        )}
                        
                        {(paymentMethod === 'Non-Tunai' || paymentMethod === 'Hutang') && (
                                <div className="mb-4">
                                    <label className="block text-xs font-bold text-gray-600 mb-1">{paymentMethod === 'Hutang' ? 'Catatan Kasbon' : 'Ref / Nama Bank'}</label>
                                    <input type="text" value={paymentRef} onChange={e => setPaymentRef(e.target.value)} className="w-full border rounded-lg p-2 text-sm" placeholder={paymentMethod === 'Hutang' ? 'Janji bayar tgl...' : 'BCA / Mandiri'} />
                                </div>
                        )}

                        {paymentMethod === 'Tunai' && (
                            <div className="bg-gray-50 p-4 rounded-lg border mb-4">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-600">Kembalian:</span>
                                    <span className={`font-bold text-lg ${cashReceived >= finalTotal ? 'text-green-600' : 'text-red-500'}`}>
                                        {formatRupiah(Math.max(0, cashReceived - finalTotal))}
                                    </span>
                                </div>
                                {customerType === 'Santri' && cashReceived > finalTotal && (
                                    <div className="mt-3 pt-3 border-t border-gray-200">
                                        <label className="flex items-center cursor-pointer gap-2 select-none">
                                            <input type="checkbox" checked={saveChangeToBalance} onChange={e => setSaveChangeToBalance(e.target.checked)} className="w-5 h-5 text-teal-600 rounded focus:ring-teal-500"/>
                                            <span className="text-sm font-medium text-teal-800">Simpan kembalian ke Tabungan?</span>
                                        </label>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="mt-auto">
                            <button 
                                onClick={handleProcess} 
                                className="w-full py-4 bg-gradient-to-r from-teal-600 to-green-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1 active:translate-y-0 flex justify-center items-center gap-2"
                            >
                                <i className="bi bi-printer-fill"></i> PROSES & CETAK
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
