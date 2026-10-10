import React, { useState, useEffect, useMemo } from 'react';
import { Pendaftar, PondokSettings } from '../../../types';
import { getPsbRegistrationNumber, openWhatsappChat, generatePsbAcceptanceMessage, healPendaftarRecord, getPendaftarPhone, getPendaftarWaliName } from '../utils/psbUtils';

export interface PsbPlacementOption {
    jenjangId: number;
    kelasId: number;
    rombelId: number;
    jenisSantri: 'Mondok - Baru' | 'Mondok - Lama' | 'Laju - Baru' | 'Laju - Lama';
    perPendaftar?: Record<number, { jenjangId: number; kelasId: number; rombelId: number }>;
}

export interface PsbBillingOption {
    createBilling: boolean;
    biayaId: number;
    nominal: number;
    deskripsi: string;
}

interface PsbAcceptanceModalProps {
    isOpen: boolean;
    onClose: () => void;
    pendaftar?: Pendaftar | null;
    pendaftarList?: Pendaftar[];
    settings: PondokSettings;
    onConfirmed: (
        pendaftarOrList: Pendaftar | Pendaftar[],
        billingOption?: PsbBillingOption,
        placementOption?: PsbPlacementOption
    ) => Promise<void>;
}

export const PsbAcceptanceModal: React.FC<PsbAcceptanceModalProps> = ({
    isOpen,
    onClose,
    pendaftar: rawPendaftar,
    pendaftarList: rawPendaftarList,
    settings,
    onConfirmed
}) => {
    const items = useMemo(() => {
        const list = rawPendaftarList && rawPendaftarList.length > 0
            ? rawPendaftarList
            : rawPendaftar
                ? [rawPendaftar]
                : [];
        return list.map(p => healPendaftarRecord(p));
    }, [rawPendaftar, rawPendaftarList]);

    const firstPendaftar = items[0] || null;
    const isBulk = items.length > 1;

    const waliPhone = getPendaftarPhone(firstPendaftar);
    const waliName = getPendaftarWaliName(firstPendaftar);

    // Academic Placement State (Jenjang, Kelas, Rombel)
    const [selectedJenjangId, setSelectedJenjangId] = useState<number>(0);
    const [selectedKelasId, setSelectedKelasId] = useState<number>(0);
    const [selectedRombelId, setSelectedRombelId] = useState<number>(0);
    const [jenisSantri, setJenisSantri] = useState<'Mondok - Baru' | 'Mondok - Lama' | 'Laju - Baru' | 'Laju - Lama'>('Mondok - Baru');
    const [perPendaftarPlacement, setPerPendaftarPlacement] = useState<Record<number, { jenjangId: number; kelasId: number; rombelId: number }>>({});

    // Billing & Notification State
    const [createBilling, setCreateBilling] = useState<boolean>(true);
    const [selectedBiayaId, setSelectedBiayaId] = useState<number>(0);
    const [nominal, setNominal] = useState<number>(0);
    const [deskripsi, setDeskripsi] = useState<string>('');
    const [sendWa, setSendWa] = useState<boolean>(true);
    const [batasDaftarUlang, setBatasDaftarUlang] = useState<string>('');
    const [rekeningTujuan, setRekeningTujuan] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

    // Filtered Kelas & Rombel for primary placement selector
    const availableKelas = useMemo(() => {
        if (!selectedJenjangId) return [];
        return settings.kelas.filter(k => k.jenjangId === selectedJenjangId);
    }, [settings.kelas, selectedJenjangId]);

    const availableRombel = useMemo(() => {
        if (!selectedKelasId) return [];
        return settings.rombel.filter(r => r.kelasId === selectedKelasId);
    }, [settings.rombel, selectedKelasId]);

    // List of fees related to entry / enrollment
    const enrollmentFees = useMemo(() => {
        if (!settings.biaya) return [];
        return settings.biaya.filter(b =>
            !selectedJenjangId || !b.jenjangId || b.jenjangId === selectedJenjangId
        );
    }, [settings.biaya, selectedJenjangId]);

    // Helper to get default Kelas & Rombel for a given jenjangId
    const getDefaultPlacementForJenjang = (jId: number) => {
        const validJenjangId = jId || settings.jenjang[0]?.id || 0;
        const firstKelas = settings.kelas.find(k => k.jenjangId === validJenjangId);
        const firstKelasId = firstKelas?.id || 0;
        const firstRombel = firstKelasId ? settings.rombel.find(r => r.kelasId === firstKelasId) : undefined;
        return {
            jenjangId: validJenjangId,
            kelasId: firstKelasId,
            rombelId: firstRombel?.id || 0
        };
    };

    useEffect(() => {
        if (!isOpen || !firstPendaftar) return;

        // 1. Initialize default Jenjang, Kelas, Rombel from firstPendaftar
        const defaultPlace = getDefaultPlacementForJenjang(firstPendaftar.jenjangId);
        setSelectedJenjangId(defaultPlace.jenjangId);
        setSelectedKelasId(defaultPlace.kelasId);
        setSelectedRombelId(defaultPlace.rombelId);
        setJenisSantri((firstPendaftar as any).jenisSantri || 'Mondok - Baru');

        // Initialize per-pendaftar placement map for bulk mode
        const initialMap: Record<number, { jenjangId: number; kelasId: number; rombelId: number }> = {};
        items.forEach(p => {
            initialMap[p.id] = getDefaultPlacementForJenjang(p.jenjangId);
        });
        setPerPendaftarPlacement(initialMap);

        // 2. Auto select first entry/annual fee or first available fee
        const feesForJenjang = (settings.biaya || []).filter(b =>
            !defaultPlace.jenjangId || !b.jenjangId || b.jenjangId === defaultPlace.jenjangId
        );
        const match = feesForJenjang.find(b =>
            b.nama.toLowerCase().includes('pangkal') ||
            b.nama.toLowerCase().includes('daftar') ||
            b.nama.toLowerCase().includes('masuk') ||
            b.jenis === 'Sekali Bayar'
        ) || feesForJenjang[0];

        if (match) {
            setSelectedBiayaId(match.id);
            setNominal(match.nominal);
            setDeskripsi(isBulk ? `Daftar Ulang Santri Baru (${match.nama})` : `Daftar Ulang Santri Baru (${match.nama}) - ${firstPendaftar.namaLengkap}`);
        } else {
            setSelectedBiayaId(0);
            setNominal(1500000);
            setDeskripsi(isBulk ? `Daftar Ulang Santri Baru` : `Daftar Ulang Santri Baru - ${firstPendaftar.namaLengkap}`);
        }

        // Set default deadline: 14 days from today
        const d = new Date();
        d.setDate(d.getDate() + 14);
        setBatasDaftarUlang(d.toISOString().split('T')[0]);

        setRekeningTujuan(settings.telepon ? `Hubungi Bendahara / POSKO (${settings.telepon})` : 'Rekening Resmi Pesantren');
        setCreateBilling(true);
        setSendWa(!isBulk && !!waliPhone);
    }, [isOpen, firstPendaftar?.id, isBulk]);

    if (!isOpen || items.length === 0 || !firstPendaftar) return null;

    const handleJenjangChange = (newJenjangId: number) => {
        const defaults = getDefaultPlacementForJenjang(newJenjangId);
        setSelectedJenjangId(defaults.jenjangId);
        setSelectedKelasId(defaults.kelasId);
        setSelectedRombelId(defaults.rombelId);
        // Apply to all in bulk map
        const nextMap: Record<number, { jenjangId: number; kelasId: number; rombelId: number }> = {};
        items.forEach(p => {
            nextMap[p.id] = { ...defaults };
        });
        setPerPendaftarPlacement(nextMap);
    };

    const handleKelasChange = (newKelasId: number) => {
        setSelectedKelasId(newKelasId);
        const firstRombel = settings.rombel.find(r => r.kelasId === newKelasId);
        const newRombelId = firstRombel?.id || 0;
        setSelectedRombelId(newRombelId);
        // Apply to all in bulk map that share this jenjang
        setPerPendaftarPlacement(prev => {
            const next = { ...prev };
            items.forEach(p => {
                next[p.id] = {
                    jenjangId: selectedJenjangId,
                    kelasId: newKelasId,
                    rombelId: newRombelId
                };
            });
            return next;
        });
    };

    const handleRombelChange = (newRombelId: number) => {
        setSelectedRombelId(newRombelId);
        setPerPendaftarPlacement(prev => {
            const next = { ...prev };
            items.forEach(p => {
                next[p.id] = {
                    jenjangId: selectedJenjangId,
                    kelasId: selectedKelasId,
                    rombelId: newRombelId
                };
            });
            return next;
        });
    };

    const jenjang = settings.jenjang.find(j => j.id === selectedJenjangId)?.nama || '-';
    const noReg = firstPendaftar.nomorRegistrasi || getPsbRegistrationNumber(firstPendaftar, jenjang);

    const handleSelectBiaya = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const id = parseInt(e.target.value);
        setSelectedBiayaId(id);
        const item = settings.biaya.find(b => b.id === id);
        if (item) {
            setNominal(item.nominal);
            setDeskripsi(isBulk ? `Daftar Ulang Santri Baru (${item.nama})` : `Daftar Ulang Santri Baru (${item.nama}) - ${firstPendaftar.namaLengkap}`);
        }
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            const placementOption: PsbPlacementOption = {
                jenjangId: selectedJenjangId,
                kelasId: selectedKelasId,
                rombelId: selectedRombelId,
                jenisSantri,
                perPendaftar: perPendaftarPlacement
            };

            const billingOption: PsbBillingOption = {
                createBilling,
                biayaId: selectedBiayaId,
                nominal,
                deskripsi: deskripsi || (isBulk ? 'Daftar Ulang Santri Baru' : `Daftar Ulang - ${firstPendaftar.namaLengkap}`)
            };

            await onConfirmed(isBulk ? items : firstPendaftar, billingOption, placementOption);

            if (!isBulk && sendWa && waliPhone) {
                const msg = generatePsbAcceptanceMessage(firstPendaftar, settings, {
                    nominalDaftarUlang: createBilling ? nominal : undefined,
                    batasWaktu: batasDaftarUlang,
                    rekeningPembayaran: rekeningTujuan
                });
                openWhatsappChat(waliPhone, msg);
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
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col overflow-hidden my-auto border border-gray-100 animate-in fade-in zoom-in duration-150">
                {/* Modal Header */}
                <div className="p-4 sm:p-5 border-b bg-green-700 text-white flex justify-between items-center">
                    <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-xl font-bold shrink-0">
                            <i className="bi bi-person-check-fill"></i>
                        </div>
                        <div>
                            <h3 className="text-base sm:text-lg font-bold">
                                {isBulk
                                    ? `Terima & Migrasi Massal (${items.length} Calon Santri)`
                                    : 'Konfirmasi Penerimaan & Penempatan Kelas Santri'}
                            </h3>
                            <p className="text-xs text-green-100">
                                Pilih Kelas & Rombel secara langsung untuk mempercepat migrasi ke Data Santri Aktif
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-green-200 hover:text-white hover:bg-green-600 transition-colors"
                    >
                        <i className="bi bi-x-lg text-lg"></i>
                    </button>
                </div>

                <div className="p-5 space-y-4 max-h-[78vh] overflow-y-auto">
                    {/* Ringkasan Data Calon Santri */}
                    {isBulk ? (
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs">
                            <div className="flex items-center justify-between mb-2">
                                <span className="font-bold text-slate-700 flex items-center gap-1.5">
                                    <i className="bi bi-people-fill text-green-700"></i>
                                    Daftar Calon Santri yang Akan Diterima ({items.length} Orang):
                                </span>
                                <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded-full font-bold text-[11px]">
                                    Siap Migrasi
                                </span>
                            </div>
                            <div className="max-h-28 overflow-y-auto divide-y divide-slate-200/70 bg-white rounded-lg border border-slate-200 px-3 py-1">
                                {items.map((p, i) => {
                                    const jNama = settings.jenjang.find(j => j.id === p.jenjangId)?.nama || '-';
                                    const reg = p.nomorRegistrasi || getPsbRegistrationNumber(p, jNama);
                                    return (
                                        <div key={p.id} className="py-1.5 flex items-center justify-between gap-2">
                                            <div className="truncate font-semibold text-slate-800">
                                                {i + 1}. {p.namaLengkap}
                                                <span className="ml-2 font-mono text-[10px] text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200">
                                                    {reg}
                                                </span>
                                            </div>
                                            <span className="text-[11px] text-slate-500 shrink-0">{jNama}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ) : (
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1 text-xs">
                            <div className="flex justify-between items-center mb-1 pb-1 border-b border-slate-200">
                                <span className="font-semibold text-slate-500">No. Registrasi</span>
                                <span className="font-mono font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                                    {noReg}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Nama Lengkap:</span>
                                <span className="font-bold text-slate-900">{firstPendaftar.namaLengkap}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Jenjang Pendaftaran:</span>
                                <span className="font-semibold text-slate-800">{jenjang} ({firstPendaftar.jalurPendaftaran || 'Reguler'})</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Wali / No. HP:</span>
                                <span className="text-slate-800">{waliName} ({waliPhone || '-'})</span>
                            </div>
                        </div>
                    )}

                    {/* Penempatan Kelas & Rombel Langsung */}
                    <div className="border-2 border-emerald-300 bg-emerald-50/60 rounded-xl p-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <i className="bi bi-diagram-3-fill text-emerald-700 text-base"></i>
                                <div>
                                    <h4 className="text-xs sm:text-sm font-bold text-emerald-950">
                                        Penempatan Kelas & Rombel Langsung
                                    </h4>
                                    <p className="text-[11px] text-emerald-800">
                                        Santri otomatis masuk ke Kelas dan Rombel ini begitu dinyatakan diterima.
                                    </p>
                                </div>
                            </div>
                            <span className="bg-emerald-700 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                                Migrasi Cepat
                            </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-xs">
                            <div>
                                <label className="block font-bold text-gray-700 mb-1">
                                    1. Jenjang Pendidikan <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={selectedJenjangId}
                                    onChange={e => handleJenjangChange(Number(e.target.value))}
                                    className="w-full bg-white border border-emerald-300 rounded-lg p-2 text-xs font-semibold text-gray-900 focus:ring-2 focus:ring-emerald-500"
                                >
                                    <option value={0}>-- Pilih Jenjang --</option>
                                    {settings.jenjang.map(j => (
                                        <option key={j.id} value={j.id}>{j.nama}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block font-bold text-gray-700 mb-1">
                                    2. Kategori Status Santri
                                </label>
                                <select
                                    value={jenisSantri}
                                    onChange={e => setJenisSantri(e.target.value as any)}
                                    className="w-full bg-white border border-emerald-300 rounded-lg p-2 text-xs font-semibold text-gray-900 focus:ring-2 focus:ring-emerald-500"
                                >
                                    <option value="Mondok - Baru">Mondok - Baru (Mukim)</option>
                                    <option value="Laju - Baru">Laju - Baru (Non-Mukim)</option>
                                    <option value="Mondok - Lama">Mondok - Lama (Lanjutan)</option>
                                    <option value="Laju - Lama">Laju - Lama (Lanjutan)</option>
                                </select>
                            </div>

                            <div>
                                <label className="block font-bold text-gray-700 mb-1">
                                    3. Pilih Kelas <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={selectedKelasId}
                                    onChange={e => handleKelasChange(Number(e.target.value))}
                                    disabled={!selectedJenjangId || availableKelas.length === 0}
                                    className="w-full bg-white border border-emerald-300 rounded-lg p-2 text-xs font-bold text-emerald-950 focus:ring-2 focus:ring-emerald-500 disabled:bg-gray-100"
                                >
                                    <option value={0}>
                                        {availableKelas.length === 0 ? '-- Belum Ada Kelas di Jenjang Ini --' : '-- Pilih Kelas --'}
                                    </option>
                                    {availableKelas.map(k => (
                                        <option key={k.id} value={k.id}>{k.nama}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block font-bold text-gray-700 mb-1">
                                    4. Pilih Rombel <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={selectedRombelId}
                                    onChange={e => handleRombelChange(Number(e.target.value))}
                                    disabled={!selectedKelasId || availableRombel.length === 0}
                                    className="w-full bg-white border border-emerald-300 rounded-lg p-2 text-xs font-bold text-emerald-950 focus:ring-2 focus:ring-emerald-500 disabled:bg-gray-100"
                                >
                                    <option value={0}>
                                        {availableRombel.length === 0 ? '-- Belum Ada Rombel di Kelas Ini --' : '-- Pilih Rombel --'}
                                    </option>
                                    {availableRombel.map(r => (
                                        <option key={r.id} value={r.id}>
                                            {r.nama} {r.kapasitas ? `(Kapasitas: ${r.kapasitas})` : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>
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
                                    Otomatis Buat Tagihan Daftar Ulang / Uang Pangkal {isBulk ? `(${items.length} Santri)` : ''}
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
                                            Nominal Tagihan per Santri (Rp):
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

                    {/* Opsi Kirim WhatsApp (Single Mode) */}
                    {!isBulk && (
                        <div className="border border-gray-200 bg-gray-50/70 rounded-xl p-4 space-y-2 text-xs">
                            <label className="flex items-start gap-3 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={sendWa}
                                    onChange={e => setSendWa(e.target.checked)}
                                    disabled={!waliPhone}
                                    className="mt-0.5 w-4 h-4 rounded text-green-600 focus:ring-green-500 border-gray-300 disabled:opacity-50"
                                />
                                <div>
                                    <span className="font-bold text-gray-800 flex items-center gap-1.5">
                                        <i className="bi bi-whatsapp text-green-600 text-sm"></i>
                                        Kirim Pengumuman Kelulusan Resmi via WhatsApp ke Wali
                                    </span>
                                    <span className="text-[11px] text-gray-500 block">
                                        {waliPhone
                                            ? `Nomor Wali/Orang Tua: ${waliPhone}`
                                            : 'Nomor HP Wali/Orang Tua belum diisi pada formulir pendaftaran'}
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
                    )}
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
                                {isBulk
                                    ? `Terima & Migrasi ${items.length} Santri`
                                    : 'Terima & Masukkan ke Kelas'}
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};
