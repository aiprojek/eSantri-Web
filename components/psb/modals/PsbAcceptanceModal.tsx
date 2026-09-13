import React, { useState, useEffect, useMemo } from 'react';
import { Pendaftar, PondokSettings, Biaya } from '../../../types';
import { db } from '../../../db';
import { getPsbRegistrationNumber, openWhatsappChat, generatePsbAcceptanceMessage } from '../utils/psbUtils';

interface PsbAcceptanceModalProps {
    isOpen: boolean;
    onClose: () => void;
    pendaftar: Pendaftar | null;
    settings: PondokSettings;
    onConfirmed: (pendaftar: Pendaftar, billingOption?: {
        createBilling: boolean;
        biayaId: number;
        nominal: number;
        deskripsi: string;
    }) => Promise<void>;
}

export const PsbAcceptanceModal: React.FC<PsbAcceptanceModalProps> = ({
    isOpen,
    onClose,
    pendaftar,
    settings,
    onConfirmed
}) => {
    const [createBilling, setCreateBilling] = useState<boolean>(true);
    const [selectedBiayaId, setSelectedBiayaId] = useState<number>(0);
    const [nominal, setNominal] = useState<number>(0);
    const [deskripsi, setDeskripsi] = useState<string>('');
    const [sendWa, setSendWa] = useState<boolean>(true);
    const [batasDaftarUlang, setBatasDaftarUlang] = useState<string>('');
    const [rekeningTujuan, setRekeningTujuan] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

    // List of fees related to entry / enrollment
    const enrollmentFees = useMemo(() => {
        if (!settings.biaya) return [];
        return settings.biaya.filter(b => 
            !pendaftar?.jenjangId || !b.jenjangId || b.jenjangId === pendaftar.jenjangId
        );
    }, [settings.biaya, pendaftar?.jenjangId]);

    useEffect(() => {
        if (!isOpen || !pendaftar) return;

        // Auto select first entry/annual fee or first available fee
        const match = enrollmentFees.find(b => 
            b.nama.toLowerCase().includes('pangkal') || 
            b.nama.toLowerCase().includes('daftar') || 
            b.nama.toLowerCase().includes('masuk') ||
            b.jenis === 'Sekali Bayar'
        ) || enrollmentFees[0];

        if (match) {
            setSelectedBiayaId(match.id);
            setNominal(match.nominal);
            setDeskripsi(`Daftar Ulang Santri Baru (${match.nama}) - ${pendaftar.namaLengkap}`);
        } else {
            setSelectedBiayaId(0);
            setNominal(1500000);
            setDeskripsi(`Daftar Ulang Santri Baru - ${pendaftar.namaLengkap}`);
        }

        // Set default deadline: 14 days from today
        const d = new Date();
        d.setDate(d.getDate() + 14);
        setBatasDaftarUlang(d.toISOString().split('T')[0]);

        setRekeningTujuan(settings.telepon ? `Hubungi Bendahara / POSKO (${settings.telepon})` : 'Rekening Resmi Pesantren');
        setCreateBilling(true);
        setSendWa(!!pendaftar.nomorHpWali);
    }, [isOpen, pendaftar, enrollmentFees, settings.telepon]);

    if (!isOpen || !pendaftar) return null;

    const jenjang = settings.jenjang.find(j => j.id === pendaftar.jenjangId)?.nama || '-';
    const noReg = getPsbRegistrationNumber(pendaftar, jenjang);

    const handleSelectBiaya = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const id = parseInt(e.target.value);
        setSelectedBiayaId(id);
        const item = settings.biaya.find(b => b.id === id);
        if (item) {
            setNominal(item.nominal);
            setDeskripsi(`Daftar Ulang Santri Baru (${item.nama}) - ${pendaftar.namaLengkap}`);
        }
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            await onConfirmed(pendaftar, {
                createBilling,
                biayaId: selectedBiayaId,
                nominal,
                deskripsi: deskripsi || `Daftar Ulang - ${pendaftar.namaLengkap}`
            });

            if (sendWa && pendaftar.nomorHpWali) {
                const msg = generatePsbAcceptanceMessage(pendaftar, settings, {
                    nominalDaftarUlang: createBilling ? nominal : undefined,
                    batasWaktu: batasDaftarUlang,
                    rekeningPembayaran: rekeningTujuan
                });
                openWhatsappChat(pendaftar.nomorHpWali, msg);
            }

            onClose();
        } catch (error) {
            console.error('Failed to accept pendaftar', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-[80] flex justify-center items-center p-3 sm:p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl flex flex-col overflow-hidden my-auto border border-gray-100 animate-in fade-in zoom-in duration-150">
                {/* Modal Header */}
                <div className="p-4 sm:p-5 border-b bg-green-700 text-white flex justify-between items-center">
                    <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-xl font-bold">
                            <i className="bi bi-person-check-fill"></i>
                        </div>
                        <div>
                            <h3 className="text-base sm:text-lg font-bold">Konfirmasi Penerimaan Santri Baru</h3>
                            <p className="text-xs text-green-100">Proses santri lulus seleksi dan sinkronkan ke database santri</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-green-200 hover:text-white hover:bg-green-600 transition-colors"
                    >
                        <i className="bi bi-x-lg text-lg"></i>
                    </button>
                </div>

                <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
                    {/* Ringkasan Data Calon Santri */}
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1 text-xs">
                        <div className="flex justify-between items-center mb-1 pb-1 border-b border-slate-200">
                            <span className="font-semibold text-slate-500">No. Registrasi</span>
                            <span className="font-mono font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                                {noReg}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-500">Nama Lengkap:</span>
                            <span className="font-bold text-slate-900">{pendaftar.namaLengkap}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-500">Jenjang Tujuan:</span>
                            <span className="font-semibold text-slate-800">{jenjang} ({pendaftar.jalurPendaftaran || 'Reguler'})</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-500">Wali / No. HP:</span>
                            <span className="text-slate-800">{pendaftar.namaWali || pendaftar.namaAyah || '-'} ({pendaftar.nomorHpWali || '-'})</span>
                        </div>
                    </div>

                    {/* Checkbox Integrasi Modul Keuangan */}
                    <div className="border border-teal-200 bg-teal-50/50 rounded-xl p-4 space-y-3">
                        <label className="flex items-start gap-3 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={createBilling}
                                onChange={e => setCreateBilling(e.target.checked)}
                                className="mt-1 w-4 h-4 rounded text-teal-600 focus:ring-teal-500 border-gray-300"
                            />
                            <div>
                                <span className="font-bold text-sm text-teal-950 block">
                                    Otomatis Buat Tagihan Daftar Ulang / Uang Pangkal
                                </span>
                                <span className="text-xs text-teal-800 block">
                                    Menambahkan tagihan baru di Modul Keuangan santri agar siap dibayar / dicicil oleh wali.
                                </span>
                            </div>
                        </label>

                        {createBilling && (
                            <div className="space-y-3 pt-2 border-t border-teal-100 pl-7 text-xs">
                                <div>
                                    <label className="block font-semibold text-gray-700 mb-1">
                                        Komponen Biaya (dari Pengaturan Keuangan):
                                    </label>
                                    <select
                                        value={selectedBiayaId}
                                        onChange={handleSelectBiaya}
                                        className="w-full bg-white border border-gray-300 rounded-lg p-2 text-xs focus:ring-1 focus:ring-teal-500"
                                    >
                                        <option value={0}>-- Biaya Kustom / Lainnya --</option>
                                        {enrollmentFees.map(b => (
                                            <option key={b.id} value={b.id}>
                                                {b.nama} ({b.jenis}) - Rp {b.nominal.toLocaleString('id-ID')}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                    <div>
                                        <label className="block font-semibold text-gray-700 mb-1">
                                            Nominal Tagihan (Rp):
                                        </label>
                                        <input
                                            type="number"
                                            value={nominal}
                                            onChange={e => setNominal(Number(e.target.value))}
                                            className="w-full bg-white border border-gray-300 rounded-lg p-2 text-xs font-bold font-mono focus:ring-1 focus:ring-teal-500"
                                            placeholder="0"
                                        />
                                    </div>
                                    <div>
                                        <label className="block font-semibold text-gray-700 mb-1">
                                            Batas Waktu Pelunasan:
                                        </label>
                                        <input
                                            type="date"
                                            value={batasDaftarUlang}
                                            onChange={e => setBatasDaftarUlang(e.target.value)}
                                            className="w-full bg-white border border-gray-300 rounded-lg p-2 text-xs focus:ring-1 focus:ring-teal-500"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block font-semibold text-gray-700 mb-1">
                                        Deskripsi Tagihan:
                                    </label>
                                    <input
                                        type="text"
                                        value={deskripsi}
                                        onChange={e => setDeskripsi(e.target.value)}
                                        className="w-full bg-white border border-gray-300 rounded-lg p-2 text-xs focus:ring-1 focus:ring-teal-500"
                                        placeholder="Keterangan tagihan..."
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Opsi Kirim WhatsApp */}
                    <div className="border border-gray-200 bg-gray-50/70 rounded-xl p-4 space-y-2 text-xs">
                        <label className="flex items-start gap-3 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={sendWa}
                                onChange={e => setSendWa(e.target.checked)}
                                disabled={!pendaftar.nomorHpWali}
                                className="mt-0.5 w-4 h-4 rounded text-green-600 focus:ring-green-500 border-gray-300 disabled:opacity-50"
                            />
                            <div>
                                <span className="font-bold text-gray-800 flex items-center gap-1.5">
                                    <i className="bi bi-whatsapp text-green-600 text-sm"></i>
                                    Kirim Pengumuman Kelulusan Resmi via WhatsApp ke Wali
                                </span>
                                <span className="text-[11px] text-gray-500 block">
                                    {pendaftar.nomorHpWali 
                                        ? `Nomor Wali: ${pendaftar.nomorHpWali}`
                                        : 'Nomor HP Wali belum diisi pada formulir pendaftaran'}
                                </span>
                            </div>
                        </label>
                        {sendWa && (
                            <div className="pt-2 pl-7 space-y-2">
                                <div>
                                    <label className="block text-[11px] font-semibold text-gray-600 mb-0.5">
                                        Informasi Rekening / Kontak Pembayaran:
                                    </label>
                                    <input
                                        type="text"
                                        value={rekeningTujuan}
                                        onChange={e => setRekeningTujuan(e.target.value)}
                                        className="w-full bg-white border border-gray-300 rounded-lg p-1.5 text-xs"
                                        placeholder="BSI No. Rek 123456789 a.n Pondok"
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer Modal */}
                <div className="p-4 border-t bg-gray-50 flex justify-end gap-2.5">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="px-4 py-2 bg-white hover:bg-gray-100 text-gray-700 rounded-xl text-xs font-semibold border border-gray-300 transition-colors"
                    >
                        Batal
                    </button>
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-2 shadow-xs disabled:opacity-50"
                    >
                        {isSubmitting ? (
                            <>
                                <i className="bi bi-arrow-repeat animate-spin"></i>
                                Memproses...
                            </>
                        ) : (
                            <>
                                <i className="bi bi-check2-circle text-base"></i>
                                Terima & Daftarkan Santri
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};
