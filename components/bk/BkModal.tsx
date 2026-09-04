import React, { useState, useMemo, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { BkSession, BkKategori, Santri } from '../../types';
import { useAppContext } from '../../AppContext';
import { useSantriContext } from '../../contexts/SantriContext';

interface BkModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: Omit<BkSession, 'id'>) => Promise<void>;
    onUpdate: (data: BkSession) => Promise<void>;
    initialData: BkSession | null;
}

const PIHAK_OPTIONS = [
    'Musyrif Asrama',
    'Wali Kelas',
    'Orang Tua / Wali',
    'Bagian Pengasuhan',
    'Guru Mapel / Tahfizh',
    'Layanan Medis / UKS',
];

export const BkModal: React.FC<BkModalProps> = ({
    isOpen,
    onClose,
    onSave,
    onUpdate,
    initialData,
}) => {
    const { santriList } = useSantriContext();
    const { currentUser } = useAppContext();
    const { register, handleSubmit, reset, setValue, watch } = useForm<BkSession>();

    const [searchSantri, setSearchSantri] = useState('');
    const [selectedSantriId, setSelectedSantriId] = useState<number | null>(null);
    const [selectedPihak, setSelectedPihak] = useState<string[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    const filteredSantri = useMemo(() => {
        if (!searchSantri || selectedSantriId) return [];
        const q = searchSantri.toLowerCase();
        return santriList
            .filter(
                (s) =>
                    s.status === 'Aktif' &&
                    (s.namaLengkap.toLowerCase().includes(q) || s.nis.includes(q))
            )
            .slice(0, 6);
    }, [santriList, searchSantri, selectedSantriId]);

    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                reset({
                    ...initialData,
                    status: initialData.status || 'Baru',
                    privasi: initialData.privasi || 'Rahasia',
                    konselor: initialData.konselor || currentUser?.fullName || '',
                    kategori: initialData.kategori || 'Pribadi',
                    tanggalBerikutnya: initialData.tanggalBerikutnya || '',
                    komitmenSantri: initialData.komitmenSantri || '',
                });
                setSelectedSantriId(initialData.santriId);
                setSelectedPihak(initialData.pihakTerlibat || []);
                const s = santriList.find((sa) => sa.id === initialData.santriId);
                setSearchSantri(s ? `${s.namaLengkap} (${s.nis})` : '');
            } else {
                reset({
                    tanggal: new Date().toISOString().split('T')[0],
                    kategori: 'Pribadi',
                    status: 'Baru',
                    privasi: 'Rahasia',
                    konselor: currentUser?.fullName || 'Petugas BK',
                    keluhan: '',
                    penanganan: '',
                    hasil: '',
                    komitmenSantri: '',
                    tanggalBerikutnya: '',
                });
                setSelectedSantriId(null);
                setSelectedPihak([]);
                setSearchSantri('');
            }
        }
    }, [isOpen, initialData, reset, currentUser, santriList]);

    const togglePihak = (item: string) => {
        setSelectedPihak((prev) =>
            prev.includes(item) ? prev.filter((p) => p !== item) : [...prev, item]
        );
    };

    const onSubmit = async (data: BkSession) => {
        if (!selectedSantriId) {
            alert('Pilih santri terlebih dahulu.');
            return;
        }

        setIsSaving(true);
        try {
            const finalData = {
                ...data,
                santriId: selectedSantriId,
                pihakTerlibat: selectedPihak,
            };

            if (initialData?.id) {
                await onUpdate({ ...finalData, id: initialData.id });
            } else {
                await onSave(finalData);
            }
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[70] flex justify-center items-center p-3 sm:p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden my-auto border border-emerald-100">
                {/* Header */}
                <div className="px-6 py-4 bg-gradient-to-r from-emerald-700 via-emerald-800 to-teal-800 text-white flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-xl shadow-inner">
                            <i className="bi bi-person-heart"></i>
                        </div>
                        <div>
                            <h3 className="text-base font-bold">
                                {initialData ? 'Edit Sesi Konseling' : 'Catat Sesi Bimbingan & Konseling Baru'}
                            </h3>
                            <p className="text-xs text-emerald-100">
                                Dokumentasi pembinaan dan layanan bimbingan konseling santri
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition cursor-pointer"
                    >
                        <i className="bi bi-x-lg text-sm"></i>
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit(onSubmit)} className="p-6 overflow-y-auto flex-grow space-y-4 text-xs">
                    {/* Santri Selection */}
                    <div className="relative">
                        <label className="block text-[11px] font-bold text-gray-700 mb-1">
                            Pilih Santri <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                            <input
                                type="text"
                                value={searchSantri}
                                onChange={(e) => {
                                    setSearchSantri(e.target.value);
                                    setSelectedSantriId(null);
                                }}
                                className={`w-full border rounded-xl p-2.5 text-xs transition ${
                                    selectedSantriId
                                        ? 'bg-emerald-50/70 border-emerald-500 font-semibold text-gray-800'
                                        : 'bg-white border-gray-300'
                                }`}
                                placeholder="Ketik nama atau NIS santri..."
                                autoComplete="off"
                                required
                            />
                            {selectedSantriId ? (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSelectedSantriId(null);
                                        setSearchSantri('');
                                    }}
                                    className="absolute right-3 top-2.5 text-xs text-gray-400 hover:text-red-600 cursor-pointer"
                                    title="Ganti Santri"
                                >
                                    <i className="bi bi-x-circle-fill"></i> Ganti
                                </button>
                            ) : (
                                <i className="bi bi-search absolute right-3 top-2.5 text-gray-400"></i>
                            )}
                        </div>

                        {searchSantri && !selectedSantriId && filteredSantri.length > 0 && (
                            <div className="absolute z-20 w-full bg-white border border-gray-200 shadow-xl rounded-xl mt-1 max-h-48 overflow-y-auto divide-y">
                                {filteredSantri.map((s) => (
                                    <div
                                        key={s.id}
                                        onClick={() => {
                                            setSelectedSantriId(s.id);
                                            setSearchSantri(`${s.namaLengkap} (${s.nis})`);
                                        }}
                                        className="p-2.5 hover:bg-emerald-50 cursor-pointer flex justify-between items-center transition"
                                    >
                                        <div>
                                            <p className="font-bold text-gray-800">{s.namaLengkap}</p>
                                            <p className="text-[11px] text-gray-500">NIS: {s.nis}</p>
                                        </div>
                                        <span className="text-xs text-emerald-600 font-semibold">Pilih &rarr;</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[11px] font-bold text-gray-700 mb-1">Tanggal Konseling</label>
                            <input
                                type="date"
                                {...register('tanggal', { required: true })}
                                className="w-full border border-gray-300 rounded-xl p-2.5 text-xs bg-white focus:ring-2 focus:ring-emerald-500 outline-hidden"
                            />
                        </div>
                        <div>
                            <label className="block text-[11px] font-bold text-gray-700 mb-1">Kategori Masalah</label>
                            <select
                                {...register('kategori', { required: true })}
                                className="w-full border border-gray-300 rounded-xl p-2.5 text-xs bg-white font-semibold focus:ring-2 focus:ring-emerald-500 outline-hidden"
                            >
                                <option value="Pribadi">Masalah Pribadi (Emosi / Mental)</option>
                                <option value="Sosial">Masalah Sosial / Hubungan Teman</option>
                                <option value="Belajar">Kesulitan Belajar & Akademik</option>
                                <option value="Keluarga">Masalah Keluarga / Orang Tua</option>
                                <option value="Ibadah">Ibadah & Spiritual (Shalat/Dzikir)</option>
                                <option value="Homesick">Homesick / Penyesuaian Asrama Baru</option>
                                <option value="Kedisiplinan">Kedisiplinan & Tata Tertib Pondok</option>
                                <option value="Perundungan">Indikasi Perundungan (Bullying)</option>
                                <option value="Karir">Rencana Karir & Studi Lanjut</option>
                                <option value="Lainnya">Lainnya</option>
                            </select>
                        </div>
                    </div>

                    {/* Checkbox Pihak Terlibat */}
                    <div>
                        <label className="block text-[11px] font-bold text-gray-700 mb-1.5">
                            Koordinasi / Pihak yang Dilibatkan:
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {PIHAK_OPTIONS.map((item) => {
                                const isChecked = selectedPihak.includes(item);
                                return (
                                    <button
                                        key={item}
                                        type="button"
                                        onClick={() => togglePihak(item)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition flex items-center gap-1.5 cursor-pointer ${
                                            isChecked
                                                ? 'bg-emerald-50 border-emerald-500 text-emerald-700 font-bold'
                                                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                                        }`}
                                    >
                                        <i className={`bi bi-${isChecked ? 'check-square-fill text-emerald-600' : 'square'}`}></i>
                                        {item}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Uraian Keluhan */}
                    <div>
                        <label className="block text-[11px] font-bold text-gray-700 mb-1">
                            Uraian Keluhan / Pokok Permasalahan <span className="text-red-500">*</span>
                        </label>
                        <textarea
                            {...register('keluhan', { required: true })}
                            rows={3}
                            className="w-full border border-gray-300 rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-emerald-500 outline-hidden"
                            placeholder="Ceritakan latar belakang, temuan fakta, atau pengaduan masalah santri..."
                        />
                    </div>

                    {/* Penanganan / Nasihat */}
                    <div>
                        <label className="block text-[11px] font-bold text-gray-700 mb-1">
                            Arahan, Nasihat & Penanganan dari Konselor <span className="text-red-500">*</span>
                        </label>
                        <textarea
                            {...register('penanganan', { required: true })}
                            rows={3}
                            className="w-full border border-gray-300 rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-emerald-500 outline-hidden"
                            placeholder="Tuliskan bimbingan, nasehat islami, langkah pembinaan, atau kesepakatan solusi..."
                        />
                    </div>

                    {/* Komitmen Santri */}
                    <div>
                        <label className="block text-[11px] font-bold text-gray-700 mb-1">
                            <i className="bi bi-pen mr-1 text-emerald-600"></i>
                            Pernyataan / Komitmen Santri (Opsional)
                        </label>
                        <input
                            type="text"
                            {...register('komitmenSantri')}
                            className="w-full border border-gray-300 rounded-xl p-2.5 text-xs bg-white focus:ring-2 focus:ring-emerald-500 outline-hidden"
                            placeholder="Contoh: Bersedia mematuhi jam tidur asrama dan meminta maaf kepada rekan sekamar..."
                        />
                    </div>

                    {/* Hasil sementara & Jadwal Kontrol */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[11px] font-bold text-gray-700 mb-1">Hasil Evaluasi / Tindak Lanjut</label>
                            <input
                                type="text"
                                {...register('hasil')}
                                className="w-full border border-gray-300 rounded-xl p-2.5 text-xs bg-white focus:ring-2 focus:ring-emerald-500 outline-hidden"
                                placeholder="Contoh: Suasana hati membaik, perlu dipantau seminggu ke depan"
                            />
                        </div>
                        <div>
                            <label className="block text-[11px] font-bold text-gray-700 mb-1">
                                <i className="bi bi-calendar-check mr-1 text-emerald-600"></i>
                                Rencana Jadwal Kontrol Berikutnya (Opsional)
                            </label>
                            <input
                                type="date"
                                {...register('tanggalBerikutnya')}
                                className="w-full border border-gray-300 rounded-xl p-2.5 text-xs bg-white focus:ring-2 focus:ring-emerald-500 outline-hidden"
                            />
                        </div>
                    </div>

                    {/* Status, Privasi, Konselor */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-gray-100">
                        <div>
                            <label className="block text-[11px] font-bold text-gray-700 mb-1">Status Kasus</label>
                            <select
                                {...register('status')}
                                className="w-full border border-gray-300 rounded-xl p-2 text-xs bg-gray-50 font-bold text-gray-700 focus:ring-2 focus:ring-emerald-500 outline-hidden"
                            >
                                <option value="Baru">Baru (Belum ada tindakan lanjutan)</option>
                                <option value="Proses">Sedang Diproses (Aktif dibimbing)</option>
                                <option value="Pemantauan">Dalam Pemantauan (Observasi)</option>
                                <option value="Selesai">Selesai / Tuntas</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-[11px] font-bold text-gray-700 mb-1">Tingkat Privasi</label>
                            <select
                                {...register('privasi')}
                                className="w-full border border-gray-300 rounded-xl p-2 text-xs bg-gray-50 font-bold text-rose-700 focus:ring-2 focus:ring-emerald-500 outline-hidden"
                            >
                                <option value="Biasa">Biasa (Terbuka staf pengasuhan)</option>
                                <option value="Rahasia">Rahasia (Terbatas Guru BK)</option>
                                <option value="Sangat Rahasia">Sangat Rahasia (Sensitif / Disamarkan)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-[11px] font-bold text-gray-700 mb-1">Konselor</label>
                            <input
                                type="text"
                                {...register('konselor')}
                                className="w-full border border-gray-300 rounded-xl p-2 text-xs bg-gray-100 text-gray-700 focus:ring-2 focus:ring-emerald-500 outline-hidden"
                            />
                        </div>
                    </div>
                </form>

                {/* Footer */}
                <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 border border-gray-300 rounded-xl text-gray-600 bg-white hover:bg-gray-100 text-xs font-semibold cursor-pointer"
                    >
                        Batal
                    </button>
                    <button
                        type="button"
                        onClick={handleSubmit(onSubmit)}
                        disabled={isSaving}
                        className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs disabled:opacity-50 flex items-center gap-1.5 cursor-pointer transition"
                    >
                        <i className="bi bi-check-lg"></i>
                        {isSaving ? 'Menyimpan...' : 'Simpan Sesi BK'}
                    </button>
                </div>
            </div>
        </div>
    );
};
