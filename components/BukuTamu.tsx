import React, { useState, useMemo, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useForm } from 'react-hook-form';
import { db } from '../db';
import { useAppContext } from '../AppContext';
import { useSantriContext } from '../contexts/SantriContext';
import { BukuTamu as BukuTamuType } from '../types';
import { PageHeader } from './common/PageHeader';
import { SectionCard } from './common/SectionCard';
import { EmptyState } from './common/EmptyState';
import { HeaderTabs } from './common/HeaderTabs';
import { TiketPassTamuModal, generateVisitorBadgeWaMessage } from './bukutamu/TiketPassTamuModal';
import { RekapBukuTamuPrintModal } from './bukutamu/RekapBukuTamuPrintModal';
import { exportBukuTamuToExcel } from '../services/excelService';

interface BukuTamuModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: Omit<BukuTamuType, 'id'>) => Promise<void>;
    todayGuestsCount: number;
    activeGuestBadges: string[];
}

const BukuTamuModal: React.FC<BukuTamuModalProps> = ({
    isOpen,
    onClose,
    onSave,
    todayGuestsCount,
    activeGuestBadges
}) => {
    const { santriList } = useSantriContext();
    const { currentUser, showAlert } = useAppContext();
    const { register, handleSubmit, reset, watch, setValue } = useForm<BukuTamuType>({
        defaultValues: {
            kategori: 'Wali Santri',
            tipeEntri: 'Kunjungan Langsung',
            jenisIdentitas: 'KTP',
            jumlahRombongan: 1,
            nomorBadge: 'B-01'
        }
    });

    const [badgeMode, setBadgeMode] = useState<'auto' | 'manual'>('auto');
    const [badgePrefix, setBadgePrefix] = useState<string>('B-');
    const [searchSantri, setSearchSantri] = useState('');
    const [selectedSantriId, setSelectedSantriId] = useState<number | null>(null);

    const watchTipeEntri = watch('tipeEntri', 'Kunjungan Langsung');
    const watchKategori = watch('kategori', 'Wali Santri');
    const watchNomorBadge = watch('nomorBadge', '');

    const getNextDailyBadge = (prefix: string = badgePrefix) => {
        const nextNum = todayGuestsCount + 1;
        return `${prefix}${nextNum.toString().padStart(2, '0')}`;
    };

    // Slot kartu fisik yang sedang standby (1-99) yang tidak sedang dipinjam
    const standbyPhysicalSlot = useMemo(() => {
        for (let i = 1; i <= 99; i++) {
            const candidate = `${badgePrefix}${i.toString().padStart(2, '0')}`;
            if (!activeGuestBadges.includes(candidate)) {
                return candidate;
            }
        }
        return `${badgePrefix}01`;
    }, [badgePrefix, activeGuestBadges]);

    useEffect(() => {
        if (isOpen && badgeMode === 'auto') {
            const nextBadge = getNextDailyBadge(badgePrefix);
            setValue('nomorBadge', nextBadge);
        }
    }, [isOpen, todayGuestsCount, badgePrefix, badgeMode, setValue]);

    useEffect(() => {
        if (watchKategori !== 'Wali Santri' && watchTipeEntri !== 'Titipan Paket') {
            setSelectedSantriId(null);
            setSearchSantri('');
        }
    }, [watchKategori, watchTipeEntri]);

    const filteredSantri = useMemo(() => {
        if (!searchSantri) return [];
        return santriList
            .filter(
                (s) =>
                    s.status === 'Aktif' &&
                    (s.namaLengkap.toLowerCase().includes(searchSantri.toLowerCase()) || s.nis.includes(searchSantri))
            )
            .slice(0, 5);
    }, [santriList, searchSantri]);

    const handleSelectSantri = (s: any) => {
        setSelectedSantriId(s.id);
        setSearchSantri(s.namaLengkap);

        if (watchTipeEntri === 'Kunjungan Langsung') {
            const currentName = watch('namaTamu');
            if (!currentName) {
                const parentName = s.namaWali || s.namaAyah || s.namaIbu;
                if (parentName) setValue('namaTamu', parentName);
            }
            const currentPhone = watch('noHp');
            if (!currentPhone) {
                const parentPhone = s.teleponWali || s.teleponAyah || s.teleponIbu;
                if (parentPhone) setValue('noHp', parentPhone);
            }
        } else {
            setValue('penerimaPaket', `${s.namaLengkap} (${s.nis})`);
        }
    };

    const handleSwitchBadgeMode = (mode: 'auto' | 'manual') => {
        setBadgeMode(mode);
        if (mode === 'auto') {
            setValue('nomorBadge', getNextDailyBadge(badgePrefix));
        }
    };

    const handleApplyDailyBadge = (prefix: string = badgePrefix) => {
        const badge = getNextDailyBadge(prefix);
        setValue('nomorBadge', badge);
    };

    const onSubmit = async (data: BukuTamuType) => {
        if (watchTipeEntri === 'Kunjungan Langsung' && watchKategori === 'Wali Santri' && !selectedSantriId) {
            showAlert('Santri Belum Dipilih', 'Untuk kategori Wali Santri, pilih santri yang dikunjungi.');
            return;
        }

        const now = new Date();
        const finalData: Omit<BukuTamuType, 'id'> = {
            ...data,
            nomorBadge: data.nomorBadge ? data.nomorBadge.trim().toUpperCase() : undefined,
            santriId: selectedSantriId || undefined,
            tanggal: now.toISOString().split('T')[0],
            jamMasuk: now.toISOString(),
            status: data.tipeEntri === 'Titipan Paket' ? 'Selesai' : 'Bertamu',
            statusPaket: data.tipeEntri === 'Titipan Paket' ? 'Di Pos Satpam' : undefined,
            petugas: currentUser?.fullName || 'Petugas Satpam',
            jumlahRombongan: Number(data.jumlahRombongan) || 1
        };

        await onSave(finalData);
        reset();
        setSelectedSantriId(null);
        setSearchSantri('');
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 z-[70] flex justify-center items-center p-3 sm:p-4 overflow-y-auto overscroll-contain">
            <div
                className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[92vh] sm:max-h-[88vh] flex flex-col overflow-hidden my-auto"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header Modal (Pinned at top) */}
                <div className="p-4 sm:p-5 border-b bg-teal-800 text-white flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-teal-700/80 text-teal-200 flex items-center justify-center text-xl shrink-0">
                            <i className="bi bi-shield-check"></i>
                        </div>
                        <div>
                            <h3 className="text-sm sm:text-base font-bold leading-tight">Registrasi Pos Satpam &amp; Keamanan</h3>
                            <p className="text-[11px] text-teal-100">Catat kunjungan tamu atau penerimaan paket logistik</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-white/80 hover:text-white p-1.5 rounded-lg hover:bg-teal-700/50 transition-colors"
                    >
                        <i className="bi bi-x-lg text-lg"></i>
                    </button>
                </div>

                {/* Form Body (Scrollable inside modal) */}
                <form id="bukuTamuForm" onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 overscroll-contain">
                    {/* Toggle Tipe Entri */}
                    <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">
                            Jenis Registrasi Pos Jaga:
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                type="button"
                                onClick={() => setValue('tipeEntri', 'Kunjungan Langsung')}
                                className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                                    watchTipeEntri === 'Kunjungan Langsung'
                                        ? 'bg-teal-700 text-white border-teal-800 shadow-sm'
                                        : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                                }`}
                            >
                                <i className="bi bi-person-walking text-base"></i>
                                <span>Tamu Berkunjung</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setValue('tipeEntri', 'Titipan Paket')}
                                className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                                    watchTipeEntri === 'Titipan Paket'
                                        ? 'bg-amber-600 text-white border-amber-700 shadow-sm'
                                        : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                                }`}
                            >
                                <i className="bi bi-box-seam text-base"></i>
                                <span>Titipan Paket / Logistik</span>
                            </button>
                        </div>
                    </div>

                    {watchTipeEntri === 'Kunjungan Langsung' ? (
                        <>
                            {/* Kategori Tamu */}
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">Kategori Tamu</label>
                                <select {...register('kategori')} className="w-full border rounded-xl p-2.5 text-sm bg-gray-50 font-medium focus:ring-2 focus:ring-teal-500">
                                    <option value="Wali Santri">Wali Santri</option>
                                    <option value="Tamu Dinas">Tamu Dinas / Lembaga</option>
                                    <option value="Vendor/Paket">Vendor / Rekanan</option>
                                    <option value="Alumni">Alumni</option>
                                    <option value="Lainnya">Lainnya</option>
                                </select>
                            </div>

                            {/* Section Nomor Badge Visitor */}
                            <div className="bg-teal-50/50 p-3 sm:p-3.5 rounded-xl border border-teal-200/80 space-y-2.5">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                                    <label className="text-xs font-bold text-teal-950 flex items-center gap-1.5">
                                        <i className="bi bi-person-badge-fill text-teal-700"></i>
                                        <span>Nomor Badge Visitor (Kartu Izin Masuk)</span>
                                    </label>
                                    {/* Toggle Mode: Otomatis (Reset Harian) vs Manual */}
                                    <div className="flex items-center bg-gray-200/80 p-0.5 rounded-lg text-[11px] self-start sm:self-auto">
                                        <button
                                            type="button"
                                            onClick={() => handleSwitchBadgeMode('auto')}
                                            className={`px-2.5 py-1 rounded-md font-bold transition-all flex items-center gap-1 ${
                                                badgeMode === 'auto'
                                                    ? 'bg-teal-700 text-white shadow-2xs'
                                                    : 'text-gray-600 hover:text-gray-900'
                                            }`}
                                        >
                                            <i className="bi bi-magic"></i>
                                            <span>Otomatis (Reset Harian)</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleSwitchBadgeMode('manual')}
                                            className={`px-2.5 py-1 rounded-md font-bold transition-all flex items-center gap-1 ${
                                                badgeMode === 'manual'
                                                    ? 'bg-teal-700 text-white shadow-2xs'
                                                    : 'text-gray-600 hover:text-gray-900'
                                            }`}
                                        >
                                            <i className="bi bi-pencil-square"></i>
                                            <span>Manual / Khusus</span>
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex gap-2">
                                        {badgeMode === 'auto' && (
                                            <select
                                                value={badgePrefix}
                                                onChange={(e) => {
                                                    const newPrefix = e.target.value;
                                                    setBadgePrefix(newPrefix);
                                                    handleApplyDailyBadge(newPrefix);
                                                }}
                                                className="border border-gray-300 rounded-xl px-2.5 py-2 text-xs font-bold bg-white text-teal-950 shrink-0 shadow-2xs focus:ring-teal-500"
                                                title="Pilih Awalan Kode Badge"
                                            >
                                                <option value="B-">B- (Standar)</option>
                                                <option value="VIP-">VIP- (Dinas / Khusus)</option>
                                                <option value="W-">W- (Wali Santri)</option>
                                                <option value="T-">T- (Tamu Umum)</option>
                                            </select>
                                        )}

                                        <div className="relative flex-1">
                                            <input
                                                type="text"
                                                {...register('nomorBadge')}
                                                placeholder={badgeMode === 'auto' ? getNextDailyBadge(badgePrefix) : 'Ketik nomor / kode badge (misal: VIP-01, 12, KONTRAKTOR)...'}
                                                className="w-full border border-gray-300 rounded-xl p-2.5 text-sm font-mono font-black text-teal-950 uppercase tracking-wider bg-white focus:ring-2 focus:ring-teal-500"
                                            />
                                        </div>

                                        {badgeMode === 'auto' && (
                                            <button
                                                type="button"
                                                onClick={() => handleApplyDailyBadge(badgePrefix)}
                                                className="px-3 py-2 bg-teal-100 hover:bg-teal-200 text-teal-900 border border-teal-300 rounded-xl text-xs font-bold transition-colors flex items-center gap-1 shrink-0"
                                                title="Reset &amp; Hitung Ulang Nomor Urut Hari Ini"
                                            >
                                                <i className="bi bi-arrow-clockwise text-sm"></i>
                                                <span className="hidden sm:inline">Reset Hari Ini</span>
                                            </button>
                                        )}
                                    </div>

                                    {/* Informasi Status Penomoran */}
                                    <div className="text-[11px] space-y-1 bg-white p-2 rounded-lg border border-teal-100">
                                        {badgeMode === 'auto' ? (
                                            <div className="flex flex-wrap items-center justify-between gap-1 text-teal-800">
                                                <span className="flex items-center gap-1 font-medium">
                                                    <i className="bi bi-calendar-event text-teal-600"></i>
                                                    <span>Urutan Kunjungan: <strong>Tamu ke-{todayGuestsCount + 1} hari ini</strong> (Reset otomatis tiap jam 00:00).</span>
                                                </span>
                                                {standbyPhysicalSlot !== watchNomorBadge && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setValue('nomorBadge', standbyPhysicalSlot)}
                                                        className="text-[10px] font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 px-2 py-0.5 rounded transition-colors"
                                                        title="Gunakan nomor kartu fisik terkecil yang sedang standby di meja pos"
                                                    >
                                                        Atau pakai slot standby: <strong>{standbyPhysicalSlot}</strong>
                                                    </button>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="text-amber-800 font-medium flex items-center gap-1">
                                                <i className="bi bi-info-circle-fill text-amber-600"></i>
                                                <span>Mode manual aktif: Bebas mengetik nomor kartu fisik, badge tamu kehormatan/VIP, atau kontraktor.</span>
                                            </div>
                                        )}

                                        {activeGuestBadges.length > 0 && (
                                            <div className="text-[10px] text-gray-500 truncate pt-0.5 border-t border-gray-100">
                                                Badge yang sedang dipinjam di dalam: <strong className="text-gray-700">{activeGuestBadges.slice(0, 5).join(', ')}{activeGuestBadges.length > 5 ? '...' : ''}</strong>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Section Identitas Fisik */}
                            <div className="p-3 bg-teal-50/60 border border-teal-100 rounded-xl space-y-3">
                                <span className="text-xs font-bold text-teal-900 block flex items-center gap-1.5">
                                    <i className="bi bi-card-heading text-teal-700"></i> Identitas Ditahan di Pos Gerbang
                                </span>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-[11px] font-semibold text-gray-600 mb-1">Jenis Kartu Identitas</label>
                                        <select {...register('jenisIdentitas')} className="w-full border rounded-lg p-2 text-xs bg-white">
                                            <option value="KTP">KTP (Kartu Tanda Penduduk)</option>
                                            <option value="SIM">SIM (A / C)</option>
                                            <option value="Kartu Pegawai">Kartu Pegawai / Dinas</option>
                                            <option value="Lainnya">Lainnya</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-semibold text-gray-600 mb-1">Nomor / Catatan Identitas (Opsional)</label>
                                        <input
                                            type="text"
                                            {...register('nomorIdentitas')}
                                            placeholder="Contoh: 3201... atau Nama di KTP"
                                            className="w-full border rounded-lg p-2 text-xs bg-white"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Search Santri if Wali Santri */}
                            {watchKategori === 'Wali Santri' && (
                                <div className="relative">
                                    <label className="block text-xs font-bold text-gray-600 mb-1">
                                        Cari Santri yang Dikunjungi <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={searchSantri}
                                        onChange={(e) => {
                                            setSearchSantri(e.target.value);
                                            setSelectedSantriId(null);
                                        }}
                                        className={`w-full border rounded-lg p-2.5 text-sm ${
                                            selectedSantriId ? 'bg-emerald-50 border-emerald-500 text-emerald-950 font-semibold' : ''
                                        }`}
                                        placeholder="Ketik nama atau NIS santri..."
                                        autoComplete="off"
                                    />
                                    {selectedSantriId && <i className="bi bi-check-circle-fill text-emerald-600 absolute right-3 top-8 text-base"></i>}
                                    {searchSantri && !selectedSantriId && filteredSantri.length > 0 && (
                                        <div className="absolute z-20 w-full bg-white border shadow-xl rounded-xl mt-1 max-h-48 overflow-y-auto">
                                            {filteredSantri.map((s) => (
                                                <div
                                                    key={s.id}
                                                    onClick={() => handleSelectSantri(s)}
                                                    className="p-2.5 hover:bg-teal-50 cursor-pointer text-sm border-b last:border-0 flex justify-between items-center"
                                                >
                                                    <div>
                                                        <div className="font-bold text-gray-800">{s.namaLengkap}</div>
                                                        <div className="text-xs text-gray-500">NIS: {s.nis} &bull; Wali: {s.namaWali || s.namaAyah || '-'}</div>
                                                    </div>
                                                    <span className="text-xs font-semibold px-2 py-0.5 bg-teal-100 text-teal-800 rounded">Pilih</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div className="sm:col-span-2">
                                    <label className="block text-xs font-bold text-gray-600 mb-1">Nama Tamu Pengunjung</label>
                                    <input
                                        type="text"
                                        {...register('namaTamu', { required: true })}
                                        className="w-full border rounded-lg p-2.5 text-sm font-semibold text-gray-800"
                                        placeholder="Nama Lengkap Tamu"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1">Jumlah Rombongan</label>
                                    <input
                                        type="number"
                                        min="1"
                                        {...register('jumlahRombongan')}
                                        className="w-full border rounded-lg p-2.5 text-sm text-center font-bold"
                                        placeholder="1"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1">No. WhatsApp / HP Tamu</label>
                                    <input
                                        type="tel"
                                        {...register('noHp')}
                                        className="w-full border rounded-lg p-2.5 text-sm"
                                        placeholder="08xxxxxxxxxx"
                                    />
                                </div>
                                {watchKategori !== 'Wali Santri' && (
                                    <div>
                                        <label className="block text-xs font-bold text-gray-600 mb-1">Bertemu Dengan</label>
                                        <input
                                            type="text"
                                            {...register('bertemuDengan')}
                                            className="w-full border rounded-lg p-2.5 text-sm"
                                            placeholder="Ustadz / Bagian / Pengasuh"
                                        />
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1">Keperluan Kunjungan</label>
                                <textarea
                                    {...register('keperluan', { required: true })}
                                    rows={2}
                                    className="w-full border rounded-lg p-2.5 text-sm"
                                    placeholder="Menjenguk santri, koordinasi kegiatan, silaturahmi..."
                                ></textarea>
                            </div>

                            {/* Data Kendaraan */}
                            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                                <label className="block text-xs font-bold text-gray-700 mb-2 flex items-center gap-1.5">
                                    <i className="bi bi-car-front-fill text-gray-600"></i> Data Kendaraan (Opsional)
                                </label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <select {...register('kendaraan')} className="w-full border rounded-lg p-2 text-xs bg-white">
                                            <option value="">- Tanpa Kendaraan / Jalan Kaki -</option>
                                            <option value="Motor">Sepeda Motor</option>
                                            <option value="Mobil">Mobil Pribadi</option>
                                            <option value="Truk/Box">Truk / Box</option>
                                            <option value="Bus">Bus Rombongan</option>
                                        </select>
                                    </div>
                                    <div>
                                        <input
                                            type="text"
                                            {...register('platNomor')}
                                            className="w-full border rounded-lg p-2 text-xs uppercase font-mono font-bold tracking-wider bg-white"
                                            placeholder="Plat Nomor (misal B 1234 CD)"
                                        />
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                        /* Form Khusus Titipan Paket / Logistik */
                        <div className="space-y-4">
                            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1">
                                <span className="font-bold flex items-center gap-1">
                                    <i className="bi bi-box-seam-fill text-amber-600"></i> Logistik Paket di Pos Satpam
                                </span>
                                <p>Paket akan dicatat dengan status <strong>"Di Pos Satpam"</strong> dan dapat diserahkan ke santri/ustadz sewaktu-waktu.</p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1">Kurir / Ekspedisi</label>
                                    <select {...register('namaKurirEkspedisi')} className="w-full border rounded-lg p-2.5 text-sm bg-gray-50">
                                        <option value="J&T Express">J&amp;T Express</option>
                                        <option value="SiCepat">SiCepat Express</option>
                                        <option value="Shopee Xpress">Shopee Xpress (SPX)</option>
                                        <option value="JNE Express">JNE Express</option>
                                        <option value="Pos Indonesia">Pos Indonesia</option>
                                        <option value="GoSend / GrabExpress">GoSend / GrabExpress</option>
                                        <option value="Wali Santri / Pribadi">Titipan Langsung Wali Santri</option>
                                        <option value="Lainnya">Lainnya</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1">No. Resi / Pelacak (Opsional)</label>
                                    <input
                                        type="text"
                                        {...register('noResi')}
                                        placeholder="Nomor resi pengiriman"
                                        className="w-full border rounded-lg p-2.5 text-sm font-mono uppercase"
                                    />
                                </div>
                            </div>

                            {/* Search Santri Penerima Paket */}
                            <div className="relative">
                                <label className="block text-xs font-bold text-gray-600 mb-1">
                                    Penerima Paket (Santri / Ustadz) <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={searchSantri}
                                    onChange={(e) => {
                                        setSearchSantri(e.target.value);
                                        setSelectedSantriId(null);
                                    }}
                                    className={`w-full border rounded-lg p-2.5 text-sm ${
                                        selectedSantriId ? 'bg-emerald-50 border-emerald-500 text-emerald-950 font-semibold' : ''
                                    }`}
                                    placeholder="Ketik nama santri atau ustadz..."
                                    autoComplete="off"
                                />
                                {selectedSantriId && <i className="bi bi-check-circle-fill text-emerald-600 absolute right-3 top-8 text-base"></i>}
                                {searchSantri && !selectedSantriId && filteredSantri.length > 0 && (
                                    <div className="absolute z-20 w-full bg-white border shadow-xl rounded-xl mt-1 max-h-48 overflow-y-auto">
                                        {filteredSantri.map((s) => (
                                            <div
                                                key={s.id}
                                                onClick={() => handleSelectSantri(s)}
                                                className="p-2.5 hover:bg-amber-50 cursor-pointer text-sm border-b last:border-0 flex justify-between items-center"
                                            >
                                                <div>
                                                    <div className="font-bold text-gray-800">{s.namaLengkap}</div>
                                                    <div className="text-xs text-gray-500">NIS: {s.nis}</div>
                                                </div>
                                                <span className="text-xs font-semibold px-2 py-0.5 bg-amber-100 text-amber-900 rounded">Pilih</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1">Nama Pengantar / Kurir</label>
                                    <input
                                        type="text"
                                        {...register('namaTamu', { required: true })}
                                        placeholder="Nama kurir atau pengantar"
                                        className="w-full border rounded-lg p-2.5 text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1">No. HP Pengantar (Opsional)</label>
                                    <input
                                        type="tel"
                                        {...register('noHp')}
                                        placeholder="08..."
                                        className="w-full border rounded-lg p-2.5 text-sm"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1">Keterangan / Deskripsi Barang</label>
                                <textarea
                                    {...register('deskripsiPaket', { required: true })}
                                    rows={2}
                                    placeholder="Contoh: Kardus bekal makanan &amp; pakaian, Paket seragam, Obat vitamin..."
                                    className="w-full border rounded-lg p-2.5 text-sm"
                                ></textarea>
                            </div>
                        </div>
                    )}

                </form>

                {/* Pinned Footer Modal */}
                <div className="p-3.5 sm:p-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between gap-3 shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2.5 rounded-xl border border-gray-300 hover:bg-gray-100 text-gray-700 text-xs font-bold transition-all"
                    >
                        Batal
                    </button>
                    <button
                        type="submit"
                        form="bukuTamuForm"
                        className="px-5 py-2.5 bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition-all flex items-center gap-2"
                    >
                        <i className="bi bi-check-circle-fill"></i>
                        <span>Simpan Registrasi Pos Jaga</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export const BukuTamu: React.FC = () => {
    const { currentUser, showToast, showConfirmation, showAlert, settings } = useAppContext();
    const { santriList } = useSantriContext();
    const [activeTab, setActiveTab] = useState<'active' | 'paket' | 'history'>('active');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('Semua');
    const [dateRangeStart, setDateRangeStart] = useState('');
    const [dateRangeEnd, setDateRangeEnd] = useState('');

    // Print Modals State
    const [selectedGuestForTicket, setSelectedGuestForTicket] = useState<BukuTamuType | null>(null);
    const [isRekapPrintOpen, setIsRekapPrintOpen] = useState(false);

    const records = useLiveQuery(() => db.bukuTamu.toArray(), []) || [];

    // Active Visitors in Premises
    const activeGuests = useMemo(() => {
        return records
            .filter((r) => r.status === 'Bertamu' && r.tipeEntri !== 'Titipan Paket')
            .sort((a, b) => new Date(b.jamMasuk).getTime() - new Date(a.jamMasuk).getTime());
    }, [records]);

    // Active Packages in Security Post
    const activePackages = useMemo(() => {
        return records
            .filter((r) => r.tipeEntri === 'Titipan Paket' && r.statusPaket !== 'Sudah Diambil')
            .sort((a, b) => new Date(b.jamMasuk).getTime() - new Date(a.jamMasuk).getTime());
    }, [records]);

    const todayGuestCount = useMemo(() => {
        const today = new Date().toISOString().split('T')[0];
        return records.filter((r) => r.tanggal === today).length;
    }, [records]);

    // Filtered History
    const historyRecords = useMemo(() => {
        return records
            .filter((r) => {
                // Must be finished visitor or taken package
                const isFinished = r.status === 'Selesai' || r.statusPaket === 'Sudah Diambil';
                if (!isFinished) return false;

                // Search term
                if (searchTerm) {
                    const term = searchTerm.toLowerCase();
                    const matchName = r.namaTamu.toLowerCase().includes(term);
                    const matchPlat = r.platNomor?.toLowerCase().includes(term);
                    const matchBadge = r.nomorBadge?.toLowerCase().includes(term);
                    const matchResi = r.noResi?.toLowerCase().includes(term);
                    const matchDesc = r.deskripsiPaket?.toLowerCase().includes(term);
                    if (!matchName && !matchPlat && !matchBadge && !matchResi && !matchDesc) return false;
                }

                // Category filter
                if (categoryFilter !== 'Semua') {
                    if (categoryFilter === 'Titipan Paket') {
                        if (r.tipeEntri !== 'Titipan Paket') return false;
                    } else if (r.kategori !== categoryFilter) {
                        return false;
                    }
                }

                // Date range filter
                if (dateRangeStart && r.tanggal < dateRangeStart) return false;
                if (dateRangeEnd && r.tanggal > dateRangeEnd) return false;

                return true;
            })
            .sort((a, b) => new Date(b.jamMasuk).getTime() - new Date(a.jamMasuk).getTime());
    }, [records, searchTerm, categoryFilter, dateRangeStart, dateRangeEnd]);

    const canWrite = currentUser?.role === 'admin' || currentUser?.permissions?.bukutamu === 'write';

    // Data pengunjung hari ini (reset setiap hari jam 00:00)
    const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

    const todayGuests = useMemo(() => {
        return records.filter((r) => r.tanggal === todayStr && r.tipeEntri !== 'Titipan Paket');
    }, [records, todayStr]);

    const activeGuestBadges = useMemo(() => {
        return activeGuests
            .map((g) => g.nomorBadge)
            .filter(Boolean) as string[];
    }, [activeGuests]);

    const handleAddGuest = async (data: Omit<BukuTamuType, 'id'>) => {
        if (!canWrite) return;
        const newId = await db.bukuTamu.add({ ...data, lastModified: Date.now() } as BukuTamuType);
        showToast('Registrasi pos berhasil disimpan', 'success');

        // Automatically offer ticket printing for regular visits
        if (data.tipeEntri !== 'Titipan Paket') {
            const addedRecord = { ...data, id: Number(newId) } as BukuTamuType;
            setSelectedGuestForTicket(addedRecord);
        }
    };

    const handleCheckOut = (guest: BukuTamuType) => {
        if (!canWrite) return;
        showConfirmation(
            'Check-Out Tamu Pengunjung',
            `Konfirmasi kepulangan tamu: ${guest.namaTamu}?\n\n⚠️ Pastikan Nomor Badge ${guest.nomorBadge || '-'} & Identitas Fisik (${guest.jenisIdentitas || 'KTP'}) telah dikembalikan ke tamu.`,
            async () => {
                await db.bukuTamu.update(guest.id, {
                    status: 'Selesai',
                    jamKeluar: new Date().toISOString(),
                    lastModified: Date.now()
                });
                showToast(`Tamu ${guest.namaTamu} berhasil check-out. Kartu badge kembali.`, 'success');
            },
            { confirmColor: 'blue', confirmText: 'Ya, Check-Out Tamu' }
        );
    };

    const handleMarkPackageReceived = (pkg: BukuTamuType) => {
        if (!canWrite) return;
        showConfirmation(
            'Serah Terima Paket',
            `Konfirmasi serah terima paket dari ${pkg.namaKurirEkspedisi || pkg.namaTamu}?\nBarang: "${pkg.deskripsiPaket || 'Paket'}"`,
            async () => {
                await db.bukuTamu.update(pkg.id, {
                    statusPaket: 'Sudah Diambil',
                    waktuDiambil: new Date().toISOString(),
                    lastModified: Date.now()
                });
                showToast('Paket berhasil ditandai sudah diambil', 'success');
            },
            { confirmColor: 'emerald', confirmText: 'Tandai Sudah Diambil' }
        );
    };

    const handleDeleteRecord = (item: BukuTamuType) => {
        if (!canWrite) return;
        showConfirmation(
            'Hapus Catatan Buku Tamu',
            `Apakah Anda yakin ingin menghapus catatan ${item.tipeEntri === 'Titipan Paket' ? 'paket' : 'kunjungan'} dari "${item.namaTamu}"?\n\nTindakan ini akan menghapus data dari sistem secara permanen.`,
            async () => {
                await db.bukuTamu.delete(item.id);
                showToast('Catatan buku tamu berhasil dihapus.', 'success');
            },
            { confirmColor: 'red', confirmText: 'Ya, Hapus Data' }
        );
    };

    const getDurationText = (startStr: string) => {
        const start = new Date(startStr);
        const now = new Date();
        const diffMs = now.getTime() - start.getTime();
        const diffMins = Math.max(0, Math.floor(diffMs / 60000));
        const hours = Math.floor(diffMins / 60);
        const mins = diffMins % 60;
        return { text: `${hours}j ${mins}m`, totalMins: diffMins };
    };

    const getSantri = (id?: number) => {
        if (!id) return null;
        return santriList.find((s) => s.id === id) || null;
    };

    // Quick WhatsApp contact & digital badge sending to guest
    const handleWaGuest = (guest: BukuTamuType) => {
        const phone = guest.noHp?.replace(/\D/g, '');
        if (!phone) {
            // Open ticket modal so satpam can enter phone number or copy badge text
            setSelectedGuestForTicket(guest);
            showAlert(
                'Nomor WhatsApp Belum Terisi',
                'Tamu ini belum mencantumkan nomor WA di formulir. Jendela tiket telah dibuka agar Anda dapat memasukkan nomor WA tujuan atau menyalin teks badge.'
            );
            return;
        }
        const cleanPhone = phone.startsWith('0') ? '62' + phone.substring(1) : phone;
        const santri = getSantri(guest.santriId);
        const msg = generateVisitorBadgeWaMessage(guest, settings, santri);
        window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');
        showToast('Membuka WhatsApp untuk mengirim kartu badge...', 'info');
    };

    // Quick WhatsApp notification for packages
    const handleWaPackageNotice = (pkg: BukuTamuType) => {
        const santri = getSantri(pkg.santriId);
        const rawPhone = santri?.teleponWali || santri?.teleponAyah || santri?.teleponIbu || pkg.noHp;
        const digits = rawPhone ? rawPhone.replace(/\D/g, '') : '';
        const cleanPhone = digits ? (digits.startsWith('0') ? '62' + digits.substring(1) : digits) : '';
        const targetName = santri ? santri.namaLengkap : pkg.penerimaPaket || 'Santri/Ustadz';

        const msg = `Assalamu'alaikum Wr. Wb.\n\nPemberitahuan dari Pos Keamanan ${settings.namaPonpes || 'Pesantren'}:\nAda titipan paket/barang untuk: *${targetName}*.\n\nKurir/Ekspedisi: ${
            pkg.namaKurirEkspedisi || pkg.namaTamu
        }\nDeskripsi: ${pkg.deskripsiPaket || 'Paket Kiriman'}\nStatus: *Sudah Tiba di Pos Satpam*\n\nSilakan diambil di Pos Gerbang Utama dengan menunjukkan identitas penerima. Jazakumullah khair.`;

        if (cleanPhone) {
            window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');
        } else {
            window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
        }
    };

    // Handle Excel Export
    const handleExportExcel = async () => {
        try {
            const fileName = `Rekap_Buku_Tamu_${new Date().toISOString().split('T')[0]}`;
            await exportBukuTamuToExcel(historyRecords, santriList, fileName);
            showToast('Data buku tamu berhasil diekspor ke Excel', 'success');
        } catch (err: any) {
            showAlert('Gagal Ekspor', err?.message || 'Terjadi kesalahan saat memproses ekspor Excel.');
        }
    };

    return (
        <div className="space-y-6 animate-fade-in font-sans">
            <PageHeader
                eyebrow="Administrasi &amp; Keamanan"
                title="Buku Tamu &amp; Logistik Pos Satpam"
                description="Manajemen izin kunjungan tamu, kontrol identitas badge visitor, dan serah terima paket logistik di gerbang pondok."
                actions={
                    canWrite ? (
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-teal-700 hover:bg-teal-800 text-white font-bold text-sm rounded-xl shadow-md transition-all"
                        >
                            <i className="bi bi-person-plus-fill text-lg"></i> Registrasi Tamu / Paket
                        </button>
                    ) : undefined
                }
                tabs={
                    <HeaderTabs
                        value={activeTab}
                        onChange={setActiveTab}
                        tabs={[
                            {
                                value: 'active',
                                label: 'Tamu Aktif (Di Dalam)',
                                mobileLabel: 'Tamu Aktif',
                                badge: (
                                    <span className="rounded-full bg-teal-100 text-teal-900 px-2 py-0.5 text-[11px] font-black">
                                        {activeGuests.length}
                                    </span>
                                )
                            },
                            {
                                value: 'paket',
                                label: 'Titipan Paket Pos',
                                mobileLabel: 'Titipan Paket',
                                badge: (
                                    <span
                                        className={`rounded-full px-2 py-0.5 text-[11px] font-black ${
                                            activePackages.length > 0 ? 'bg-amber-400 text-amber-950' : 'bg-gray-200 text-gray-700'
                                        }`}
                                    >
                                        {activePackages.length}
                                    </span>
                                )
                            },
                            {
                                value: 'history',
                                label: 'Riwayat & Rekapitulasi'
                            }
                        ]}
                    />
                }
            />

            {/* SOP Security Bar */}
            <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-950 shadow-2xs">
                <div className="flex items-start sm:items-center gap-2.5">
                    <i className="bi bi-shield-fill-exclamation text-amber-600 text-xl shrink-0"></i>
                    <div>
                        <strong className="font-bold uppercase tracking-wider block sm:inline mr-2">SOP Keamanan Gerbang Utama:</strong>
                        <span>
                            Wajib tahan identitas fisik (KTP/SIM) &amp; berikan Badge Visitor. Cek batas jam berkunjung maksimal 3 jam.
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <button
                        onClick={() => setIsRekapPrintOpen(true)}
                        className="px-3 py-1.5 bg-white border border-amber-300 hover:bg-amber-100 text-amber-900 font-bold rounded-lg text-xs flex items-center gap-1.5 shadow-2xs"
                    >
                        <i className="bi bi-printer"></i> Cetak Rekapitulasi
                    </button>
                </div>
            </div>

            {/* Summary Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-xl border border-teal-100 bg-teal-50/70 p-3.5">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-teal-700">Tamu di Dalam</div>
                    <div className="text-2xl font-black text-teal-950 mt-0.5">{activeGuests.length}</div>
                    <span className="text-[10px] text-teal-600 font-medium">Memegang Badge</span>
                </div>
                <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3.5">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-amber-700">Paket di Pos Satpam</div>
                    <div className="text-2xl font-black text-amber-950 mt-0.5">{activePackages.length}</div>
                    <span className="text-[10px] text-amber-600 font-medium">Belum Diambil</span>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-600">Aktivitas Hari Ini</div>
                    <div className="text-2xl font-black text-slate-800 mt-0.5">{todayGuestCount}</div>
                    <span className="text-[10px] text-slate-500 font-medium">Kunjungan/Titipan</span>
                </div>
                <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-3.5">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-blue-700">Total Arsip Kunjungan</div>
                    <div className="text-2xl font-black text-blue-900 mt-0.5">{records.length}</div>
                    <span className="text-[10px] text-blue-600 font-medium">Tersinkron Cloud</span>
                </div>
            </div>

            {/* Main Tabs Content */}
            {activeTab === 'active' && (
                <SectionCard
                    title="Tamu Aktif di Lingkungan Pondok"
                    description="Pantau pengunjung yang saat ini berada di area pondok, status badge visitor, serta durasi kunjungan."
                    contentClassName="p-4 sm:p-6"
                >
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {activeGuests.map((guest) => {
                            const santri = getSantri(guest.santriId);
                            const duration = getDurationText(guest.jamMasuk);
                            const isOverstay = duration.totalMins > 180; // > 3 jam
                            const isWarning = duration.totalMins >= 120 && !isOverstay;

                            return (
                                <div
                                    key={guest.id}
                                    className={`border-2 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all relative overflow-hidden flex flex-col justify-between ${
                                        isOverstay
                                            ? 'border-red-400 bg-red-50/30'
                                            : isWarning
                                            ? 'border-amber-300 bg-amber-50/20'
                                            : 'border-gray-200 bg-white'
                                    }`}
                                >
                                    {/* Top Status Badges */}
                                    <div className="flex items-center justify-between gap-2 mb-3">
                                        <span className="px-2.5 py-1 bg-teal-900 text-white font-mono font-black text-xs rounded-lg shadow-2xs">
                                            BADGE: {guest.nomorBadge || `T-${guest.id}`}
                                        </span>
                                        <div className="flex items-center gap-1.5">
                                            {isOverstay && (
                                                <span className="px-2 py-0.5 bg-red-600 text-white font-black text-[10px] rounded-full animate-pulse uppercase">
                                                    OVERSTAY
                                                </span>
                                            )}
                                            <span className="text-[11px] font-bold text-gray-500">
                                                {new Date(guest.jamMasuk).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Tamu Info */}
                                    <div className="space-y-2">
                                        <div className="flex items-start gap-2.5">
                                            <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-base shrink-0">
                                                <i className="bi bi-person-badge-fill"></i>
                                            </div>
                                            <div className="min-w-0">
                                                <h4 className="font-black text-gray-900 text-base leading-tight truncate">
                                                    {guest.namaTamu}
                                                </h4>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <span className="text-[11px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                                                        {guest.kategori}
                                                    </span>
                                                    {guest.jumlahRombongan && guest.jumlahRombongan > 1 && (
                                                        <span className="text-[10px] text-gray-500 font-semibold">
                                                            {guest.jumlahRombongan} Orang
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Target Santri / Tujuan */}
                                        <div className="bg-gray-50/90 p-2.5 rounded-xl border border-gray-100 text-xs space-y-1.5">
                                            {santri && (
                                                <div className="flex items-center justify-between">
                                                    <span className="text-gray-500 text-[11px]">Santri Dikunjungi:</span>
                                                    <span className="font-bold text-teal-950 truncate max-w-[170px]">{santri.namaLengkap}</span>
                                                </div>
                                            )}
                                            {guest.bertemuDengan && (
                                                <div className="flex items-center justify-between">
                                                    <span className="text-gray-500 text-[11px]">Bertemu:</span>
                                                    <span className="font-bold text-gray-800">{guest.bertemuDengan}</span>
                                                </div>
                                            )}
                                            <div className="text-[11px] text-gray-700 italic border-t border-gray-200 pt-1">
                                                "{guest.keperluan}"
                                            </div>
                                            {guest.jenisIdentitas && (
                                                <div className="text-[10px] text-gray-500 flex items-center gap-1 pt-0.5">
                                                    <i className="bi bi-card-checklist text-gray-400"></i>
                                                    Identitas ditahan: <strong>{guest.jenisIdentitas} {guest.nomorIdentitas ? `(${guest.nomorIdentitas})` : ''}</strong>
                                                </div>
                                            )}
                                            {guest.platNomor && (
                                                <div className="text-[10px] text-gray-500 flex items-center gap-1">
                                                    <i className="bi bi-car-front text-gray-400"></i>
                                                    Plat: <span className="font-mono font-bold text-gray-700">{guest.platNomor}</span> ({guest.kendaraan || 'Kendaraan'})
                                                </div>
                                            )}
                                        </div>

                                        {/* Durasi Info */}
                                        <div className={`flex items-center justify-between text-xs p-2 rounded-lg border ${
                                            isOverstay
                                                ? 'bg-red-100/80 border-red-200 text-red-900 font-bold'
                                                : isWarning
                                                ? 'bg-amber-100/80 border-amber-200 text-amber-900 font-medium'
                                                : 'bg-emerald-50 border-emerald-100 text-emerald-800 font-medium'
                                        }`}>
                                            <span className="flex items-center gap-1">
                                                <i className="bi bi-clock-history"></i> Durasi di Dalam:
                                            </span>
                                            <span className="font-black text-sm">{duration.text}</span>
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="mt-4 pt-3 border-t border-gray-100 space-y-2">
                                        <div className="grid grid-cols-2 gap-2">
                                            <button
                                                onClick={() => setSelectedGuestForTicket(guest)}
                                                className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5"
                                                title="Cetak Tiket Pass Tamu (Format Kertas A6)"
                                            >
                                                <i className="bi bi-printer"></i> Tiket Pass (A6)
                                            </button>
                                            <button
                                                onClick={() => handleWaGuest(guest)}
                                                className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5"
                                                title="Kirim Kartu Badge Digital Lengkap via WhatsApp"
                                            >
                                                <i className="bi bi-whatsapp text-emerald-600"></i> Kirim Badge WA
                                            </button>
                                        </div>

                                        {canWrite && (
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleCheckOut(guest)}
                                                    className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5"
                                                >
                                                    <i className="bi bi-box-arrow-right"></i> Check-Out (Kembalikan Badge)
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteRecord(guest)}
                                                    className="p-2 bg-gray-100 hover:bg-red-50 text-gray-500 hover:text-red-700 text-xs rounded-xl border border-gray-200 transition-colors"
                                                    title="Hapus / batalkan entri tamu ini"
                                                >
                                                    <i className="bi bi-trash"></i>
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}

                        {activeGuests.length === 0 && (
                            <div className="col-span-full">
                                <EmptyState
                                    icon="bi-shield-check"
                                    title="Tidak Ada Tamu Aktif"
                                    description="Seluruh tamu telah check-out dan mengembalikan kartu badge visitor ke pos gerbang."
                                />
                            </div>
                        )}
                    </div>
                </SectionCard>
            )}

            {/* Tab Titipan Paket Pos */}
            {activeTab === 'paket' && (
                <SectionCard
                    title="Titipan Paket &amp; Logistik di Pos Satpam"
                    description="Pantau paket kurir (J&T, SiCepat, SPX, JNE) atau kiriman wali santri yang menunggu diambil di pos gerbang."
                    contentClassName="p-4 sm:p-6"
                >
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {activePackages.map((pkg) => {
                            const santri = getSantri(pkg.santriId);
                            const namaPenerima = santri ? santri.namaLengkap : pkg.penerimaPaket || 'Santri/Ustadz';

                            return (
                                <div
                                    key={pkg.id}
                                    className="border-2 border-amber-200 bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                                >
                                    <div>
                                        <div className="flex items-center justify-between mb-3">
                                            <span className="px-2 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 font-extrabold text-[11px] rounded-md">
                                                {pkg.namaKurirEkspedisi || 'Ekspedisi / Kurir'}
                                            </span>
                                            <span className="text-[11px] text-gray-500 font-mono">
                                                {new Date(pkg.jamMasuk).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                                            </span>
                                        </div>

                                        <div className="flex items-start gap-3 mb-3">
                                            <div className="w-11 h-11 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center font-bold text-xl shrink-0">
                                                <i className="bi bi-box-seam-fill"></i>
                                            </div>
                                            <div className="min-w-0">
                                                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Untuk Penerima:</span>
                                                <h4 className="font-black text-gray-900 text-base leading-tight truncate">
                                                    {namaPenerima}
                                                </h4>
                                                {santri && (
                                                    <span className="text-xs text-teal-700 font-medium block">
                                                        NIS: {santri.nis}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="bg-amber-50/60 p-3 rounded-xl border border-amber-100 text-xs space-y-1.5 mb-3">
                                            <div>
                                                <span className="text-gray-500 block text-[10px] uppercase font-bold">Keterangan Barang:</span>
                                                <span className="font-semibold text-gray-900">{pkg.deskripsiPaket || 'Barang/Titipan'}</span>
                                            </div>
                                            {pkg.noResi && (
                                                <div className="flex items-center justify-between text-[11px]">
                                                    <span className="text-gray-500">No. Resi:</span>
                                                    <span className="font-mono font-bold text-gray-800">{pkg.noResi}</span>
                                                </div>
                                            )}
                                            <div className="flex items-center justify-between text-[11px] border-t border-amber-200/60 pt-1">
                                                <span className="text-gray-500">Pengantar:</span>
                                                <span className="font-medium text-gray-800">{pkg.namaTamu}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-2 pt-2 border-t border-gray-100">
                                        <button
                                            onClick={() => handleWaPackageNotice(pkg)}
                                            className="w-full py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5"
                                        >
                                            <i className="bi bi-whatsapp"></i> Beri Tahu Penerima via WA
                                        </button>
                                        {canWrite && (
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleMarkPackageReceived(pkg)}
                                                    className="flex-1 py-2 bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5"
                                                >
                                                    <i className="bi bi-check2-circle"></i> Serahkan (Tandai Sudah Diambil)
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteRecord(pkg)}
                                                    className="p-2 bg-gray-100 hover:bg-red-50 text-gray-500 hover:text-red-700 text-xs rounded-xl border border-gray-200 transition-colors"
                                                    title="Hapus entri paket ini"
                                                >
                                                    <i className="bi bi-trash"></i>
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}

                        {activePackages.length === 0 && (
                            <div className="col-span-full">
                                <EmptyState
                                    icon="bi-box-seam"
                                    title="Tidak Ada Paket Tertahan"
                                    description="Semua titipan paket dan logistik kurir di pos satpam telah diserahkan kepada santri atau guru penerima."
                                />
                            </div>
                        )}
                    </div>
                </SectionCard>
            )}

            {/* Tab Riwayat & Rekapitulasi */}
            {activeTab === 'history' && (
                <SectionCard
                    title="Riwayat Kunjungan &amp; Rekapitulasi Ekspedisi"
                    description="Telusuri seluruh catatan historis tamu yang telah keluar, titipan paket, dan ekspor data ke Excel atau cetak resmi."
                    contentClassName="p-4 sm:p-6"
                >
                    {/* Filter Bar */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
                        <div>
                            <label className="block text-[11px] font-bold text-gray-600 mb-1">Pencarian Data:</label>
                            <input
                                type="text"
                                placeholder="Nama, Plat Nomor, No. Resi, Badge..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full border rounded-xl p-2.5 text-xs bg-white focus:ring-teal-500"
                            />
                        </div>

                        <div>
                            <label className="block text-[11px] font-bold text-gray-600 mb-1">Filter Kategori:</label>
                            <select
                                value={categoryFilter}
                                onChange={(e) => setCategoryFilter(e.target.value)}
                                className="w-full border rounded-xl p-2.5 text-xs bg-white"
                            >
                                <option value="Semua">Semua Kategori</option>
                                <option value="Wali Santri">Wali Santri</option>
                                <option value="Tamu Dinas">Tamu Dinas</option>
                                <option value="Titipan Paket">Titipan Paket</option>
                                <option value="Vendor/Paket">Vendor</option>
                                <option value="Alumni">Alumni</option>
                                <option value="Lainnya">Lainnya</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-[11px] font-bold text-gray-600 mb-1">Dari Tanggal:</label>
                            <input
                                type="date"
                                value={dateRangeStart}
                                onChange={(e) => setDateRangeStart(e.target.value)}
                                className="w-full border rounded-xl p-2.5 text-xs bg-white"
                            />
                        </div>

                        <div>
                            <label className="block text-[11px] font-bold text-gray-600 mb-1">Sampai Tanggal:</label>
                            <input
                                type="date"
                                value={dateRangeEnd}
                                onChange={(e) => setDateRangeEnd(e.target.value)}
                                className="w-full border rounded-xl p-2.5 text-xs bg-white"
                            />
                        </div>
                    </div>

                    {/* Action Bar (Export Excel & Print) */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-4 border-b border-gray-200">
                        <div className="text-xs text-gray-500">
                            Menampilkan <strong>{historyRecords.length}</strong> catatan riwayat
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleExportExcel}
                                className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
                            >
                                <i className="bi bi-file-earmark-excel-fill"></i> Ekspor Excel
                            </button>
                            <button
                                onClick={() => setIsRekapPrintOpen(true)}
                                className="px-3.5 py-2 bg-teal-800 hover:bg-teal-900 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
                            >
                                <i className="bi bi-printer-fill"></i> Cetak Laporan
                            </button>
                        </div>
                    </div>

                    {/* Desktop Table View */}
                    <div className="hidden lg:block overflow-x-auto border border-gray-200 rounded-xl">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className="bg-teal-900 text-white uppercase text-[11px] font-bold tracking-wider">
                                    <th className="py-2.5 px-3">Tanggal</th>
                                    <th className="py-2.5 px-3">Badge</th>
                                    <th className="py-2.5 px-3">Nama Tamu / Kurir</th>
                                    <th className="py-2.5 px-3">Kategori</th>
                                    <th className="py-2.5 px-3">Tujuan / Keperluan</th>
                                    <th className="py-2.5 px-3">Kendaraan</th>
                                    <th className="py-2.5 px-3 text-center">Masuk</th>
                                    <th className="py-2.5 px-3 text-center">Keluar</th>
                                    <th className="py-2.5 px-3">Petugas</th>
                                    <th className="py-2.5 px-3 text-center">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 text-gray-800">
                                {historyRecords.map((item) => {
                                    const santri = getSantri(item.santriId);
                                    const jamMasuk = new Date(item.jamMasuk).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
                                    const jamKeluar = item.jamKeluar ? new Date(item.jamKeluar).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-';

                                    return (
                                        <tr key={item.id} className="hover:bg-teal-50/40">
                                            <td className="py-2 px-3 whitespace-nowrap text-gray-500">
                                                {new Date(item.tanggal).toLocaleDateString('id-ID')}
                                            </td>
                                            <td className="py-2 px-3 font-mono font-bold text-teal-900">
                                                {item.nomorBadge || '-'}
                                            </td>
                                            <td className="py-2 px-3 font-semibold text-gray-900">
                                                {item.namaTamu}
                                                {item.noHp && <span className="block text-[10px] text-gray-500 font-normal">{item.noHp}</span>}
                                            </td>
                                            <td className="py-2 px-3">
                                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-700 border">
                                                    {item.tipeEntri === 'Titipan Paket' ? 'Titipan Paket' : item.kategori}
                                                </span>
                                            </td>
                                            <td className="py-2 px-3 max-w-xs">
                                                <div>{item.keperluan}</div>
                                                {santri && (
                                                    <div className="text-[10px] text-teal-800 font-semibold">
                                                        Santri: {santri.namaLengkap}
                                                    </div>
                                                )}
                                                {item.bertemuDengan && (
                                                    <div className="text-[10px] text-gray-600">
                                                        Bertemu: {item.bertemuDengan}
                                                    </div>
                                                )}
                                                {item.deskripsiPaket && (
                                                    <div className="text-[10px] text-amber-800 font-medium">
                                                        Paket: {item.deskripsiPaket} ({item.statusPaket})
                                                    </div>
                                                )}
                                            </td>
                                            <td className="py-2 px-3 text-gray-600 text-[11px]">
                                                {item.platNomor ? `${item.platNomor} (${item.kendaraan || 'Kendaraan'})` : (item.kendaraan || '-')}
                                            </td>
                                            <td className="py-2 px-3 text-center font-mono text-emerald-800 font-semibold text-[11px]">
                                                {jamMasuk}
                                            </td>
                                            <td className="py-2 px-3 text-center font-mono text-red-700 font-semibold text-[11px]">
                                                {jamKeluar}
                                            </td>
                                            <td className="py-2 px-3 text-gray-500 text-[11px] truncate max-w-[90px]">
                                                {item.petugas}
                                            </td>
                                            <td className="py-2 px-3 text-center whitespace-nowrap">
                                                <div className="flex items-center justify-center gap-1">
                                                    {item.tipeEntri !== 'Titipan Paket' && (
                                                        <button
                                                            onClick={() => setSelectedGuestForTicket(item)}
                                                            className="p-1.5 text-gray-600 hover:text-teal-800 hover:bg-teal-50 rounded-lg transition-colors"
                                                            title="Cetak Ulang Tiket Pass Tamu"
                                                        >
                                                            <i className="bi bi-printer"></i>
                                                        </button>
                                                    )}
                                                    {canWrite && (
                                                        <button
                                                            onClick={() => handleDeleteRecord(item)}
                                                            className="p-1.5 text-gray-400 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                                                            title="Hapus Catatan Ini"
                                                        >
                                                            <i className="bi bi-trash"></i>
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}

                                {historyRecords.length === 0 && (
                                    <tr>
                                        <td colSpan={10} className="p-6 text-center text-gray-500">
                                            <EmptyState
                                                icon="bi-clock-history"
                                                title="Tidak Ada Catatan Riwayat"
                                                description="Riwayat tamu yang telah pulang atau paket yang telah diserahkan akan tercatat di sini."
                                            />
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile & Tablet Card List */}
                    <div className="space-y-3 lg:hidden">
                        {historyRecords.map((item) => {
                            const santri = getSantri(item.santriId);
                            const jamMasuk = new Date(item.jamMasuk).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
                            const jamKeluar = item.jamKeluar ? new Date(item.jamKeluar).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-';

                            return (
                                <div key={item.id} className="p-4 border rounded-xl bg-gray-50/70 space-y-2">
                                    <div className="flex justify-between items-start gap-2">
                                        <div>
                                            <span className="text-[10px] text-gray-500 font-semibold">
                                                {new Date(item.tanggal).toLocaleDateString('id-ID')}
                                            </span>
                                            <h4 className="font-bold text-gray-900 text-sm">{item.namaTamu}</h4>
                                        </div>
                                        <div className="flex flex-col items-end gap-1">
                                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white text-gray-800 border">
                                                {item.tipeEntri === 'Titipan Paket' ? 'Paket' : item.kategori}
                                            </span>
                                            {item.nomorBadge && (
                                                <span className="font-mono text-[10px] text-teal-800 font-black">
                                                    Badge {item.nomorBadge}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="text-xs text-gray-700">
                                        <p>{item.keperluan}</p>
                                        {santri && <p className="text-teal-800 font-bold">Santri: {santri.namaLengkap}</p>}
                                        {item.deskripsiPaket && <p className="text-amber-800 font-semibold">Paket: {item.deskripsiPaket}</p>}
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-gray-200">
                                        <div className="text-emerald-800">
                                            Masuk: <span className="font-mono font-bold">{jamMasuk}</span>
                                        </div>
                                        <div className="text-red-800 text-right">
                                            Keluar: <span className="font-mono font-bold">{jamKeluar}</span>
                                        </div>
                                    </div>

                                    <div className="flex justify-end gap-2 pt-2 border-t border-gray-200">
                                        {item.tipeEntri !== 'Titipan Paket' && (
                                            <button
                                                onClick={() => setSelectedGuestForTicket(item)}
                                                className="px-2.5 py-1 text-xs font-semibold text-teal-800 bg-teal-50 hover:bg-teal-100 rounded-lg flex items-center gap-1 border border-teal-200"
                                            >
                                                <i className="bi bi-printer"></i> Tiket
                                            </button>
                                        )}
                                        {canWrite && (
                                            <button
                                                onClick={() => handleDeleteRecord(item)}
                                                className="px-2.5 py-1 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 rounded-lg flex items-center gap-1 border border-red-200"
                                            >
                                                <i className="bi bi-trash"></i> Hapus
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}

                        {historyRecords.length === 0 && (
                            <EmptyState
                                icon="bi-clock-history"
                                title="Tidak Ada Catatan Riwayat"
                                description="Riwayat tamu yang telah pulang atau paket yang telah diserahkan akan tercatat di sini."
                            />
                        )}
                    </div>
                </SectionCard>
            )}

            {/* Check-In Modal */}
            <BukuTamuModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleAddGuest}
                todayGuestsCount={todayGuests.length}
                activeGuestBadges={activeGuestBadges}
            />

            {/* Ticket Pass Print Modal */}
            <TiketPassTamuModal
                isOpen={!!selectedGuestForTicket}
                onClose={() => setSelectedGuestForTicket(null)}
                guest={selectedGuestForTicket}
                settings={settings}
                santri={selectedGuestForTicket?.santriId ? getSantri(selectedGuestForTicket.santriId) : null}
            />

            {/* Official Report Print Modal */}
            <RekapBukuTamuPrintModal
                isOpen={isRekapPrintOpen}
                onClose={() => setIsRekapPrintOpen(false)}
                records={historyRecords}
                settings={settings}
                santriList={santriList}
                startDate={dateRangeStart}
                endDate={dateRangeEnd}
                selectedCategory={categoryFilter}
            />
        </div>
    );
};

export default BukuTamu;
