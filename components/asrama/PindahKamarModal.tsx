import React, { useState, useMemo } from 'react';
import { Santri, Kamar, GedungAsrama } from '../../types';

interface PindahKamarModalProps {
    isOpen: boolean;
    onClose: () => void;
    santri: Santri | null;
    currentKamar: Kamar | null;
    currentGedung: GedungAsrama | null;
    allKamar: Kamar[];
    allGedung: GedungAsrama[];
    santriList: Santri[];
    onConfirmPindah: (santri: Santri, targetKamarId: number) => Promise<void>;
}

export const PindahKamarModal: React.FC<PindahKamarModalProps> = ({
    isOpen,
    onClose,
    santri,
    currentKamar,
    currentGedung,
    allKamar,
    allGedung,
    santriList,
    onConfirmPindah
}) => {
    const [selectedGedungId, setSelectedGedungId] = useState<number | ''>('');
    const [selectedKamarId, setSelectedKamarId] = useState<number | ''>('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Filter buildings matching santri's gender
    const compatibleGedung = useMemo(() => {
        if (!santri) return allGedung;
        const targetJenis = santri.jenisKelamin === 'Perempuan' ? 'Putri' : 'Putra';
        return allGedung.filter(g => g.jenis === targetJenis);
    }, [allGedung, santri]);

    // Map occupant count per room
    const penghuniPerKamar = useMemo(() => {
        const map = new Map<number, number>();
        santriList.forEach(s => {
            if (s.kamarId && s.status === 'Aktif') {
                map.set(s.kamarId, (map.get(s.kamarId) || 0) + 1);
            }
        });
        return map;
    }, [santriList]);

    // Available target rooms
    const availableKamarList = useMemo(() => {
        return allKamar.filter(k => {
            // Must belong to compatible gender building
            const gedung = allGedung.find(g => g.id === k.gedungId);
            if (!gedung) return false;
            if (santri) {
                const targetJenis = santri.jenisKelamin === 'Perempuan' ? 'Putri' : 'Putra';
                if (gedung.jenis !== targetJenis) return false;
            }
            // Filter by selected gedung if chosen
            if (selectedGedungId && k.gedungId !== selectedGedungId) return false;
            // Don't show current room as destination
            if (currentKamar && k.id === currentKamar.id) return false;
            return true;
        });
    }, [allKamar, allGedung, selectedGedungId, currentKamar, santri]);

    if (!isOpen || !santri) return null;

    const handlePindah = async () => {
        if (!selectedKamarId) return;
        const targetKamar = allKamar.find(k => k.id === selectedKamarId);
        if (!targetKamar) return;

        const currentCount = penghuniPerKamar.get(targetKamar.id) || 0;
        if (currentCount >= targetKamar.kapasitas) {
            alert(`Kamar ${targetKamar.nama} sudah penuh.`);
            return;
        }

        setIsSubmitting(true);
        try {
            await onConfirmPindah(santri, Number(selectedKamarId));
            onClose();
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-[70] flex justify-center items-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                {/* Header */}
                <div className="p-4 bg-teal-800 text-white flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <i className="bi bi-arrow-left-right text-xl text-teal-200"></i>
                        <div>
                            <h3 className="font-bold text-base">Pindah / Mutasi Kamar Santri</h3>
                            <p className="text-xs text-teal-100">Mutasi kamar santri cepat dan aman</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-white/80 hover:text-white p-1">
                        <i className="bi bi-x-lg"></i>
                    </button>
                </div>

                {/* Content */}
                <div className="p-5 space-y-4">
                    {/* Santri Info Banner */}
                    <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-between">
                        <div>
                            <p className="text-xs text-gray-500 font-medium">Santri:</p>
                            <h4 className="font-bold text-gray-800 text-sm">{santri.namaLengkap}</h4>
                            <p className="text-xs text-gray-500 font-mono">NIS: {santri.nis} &bull; {santri.jenisKelamin}</p>
                        </div>
                        <div className="text-right">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Kamar Saat Ini:</span>
                            <span className="inline-block px-2.5 py-1 bg-teal-100 text-teal-900 font-bold text-xs rounded-lg mt-0.5">
                                {currentKamar?.nama || 'Tanpa Kamar'}
                            </span>
                            {currentGedung && <p className="text-[11px] text-gray-500 mt-0.5">{currentGedung.nama}</p>}
                        </div>
                    </div>

                    {/* Filter Gedung Tujuan */}
                    <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">
                            Pilih Gedung Tujuan (Opsional):
                        </label>
                        <select
                            value={selectedGedungId}
                            onChange={e => {
                                setSelectedGedungId(e.target.value ? Number(e.target.value) : '');
                                setSelectedKamarId('');
                            }}
                            className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg text-xs font-medium text-gray-800 focus:ring-teal-500 focus:border-teal-500"
                        >
                            <option value="">Semua Gedung ({compatibleGedung.map(g => g.nama).join(', ')})</option>
                            {compatibleGedung.map(g => (
                                <option key={g.id} value={g.id}>{g.nama} ({g.jenis})</option>
                            ))}
                        </select>
                    </div>

                    {/* List of Available Target Rooms */}
                    <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">
                            Pilih Kamar Tujuan ({availableKamarList.length} kamar tersedia):
                        </label>
                        <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-xl divide-y divide-gray-100">
                            {availableKamarList.map(k => {
                                const count = penghuniPerKamar.get(k.id) || 0;
                                const isFull = count >= k.kapasitas;
                                const sisa = Math.max(0, k.kapasitas - count);
                                const isSelected = selectedKamarId === k.id;
                                const gedung = allGedung.find(g => g.id === k.gedungId);

                                return (
                                    <div
                                        key={k.id}
                                        onClick={() => !isFull && setSelectedKamarId(k.id)}
                                        className={`p-3 flex items-center justify-between transition-colors cursor-pointer ${
                                            isSelected
                                                ? 'bg-teal-50 border-l-4 border-teal-600'
                                                : isFull
                                                ? 'bg-gray-50/70 opacity-60 cursor-not-allowed'
                                                : 'hover:bg-gray-50'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <input
                                                type="radio"
                                                name="targetKamar"
                                                checked={isSelected}
                                                disabled={isFull}
                                                onChange={() => setSelectedKamarId(k.id)}
                                                className="text-teal-600 focus:ring-teal-500"
                                            />
                                            <div>
                                                <p className={`font-semibold text-xs ${isSelected ? 'text-teal-950' : 'text-gray-800'}`}>
                                                    {k.nama}
                                                </p>
                                                <p className="text-[11px] text-gray-500">
                                                    {gedung?.nama} &bull; {k.lantai || 'Lantai 1'}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span
                                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                                    isFull
                                                        ? 'bg-red-100 text-red-800'
                                                        : sisa <= 2
                                                        ? 'bg-amber-100 text-amber-900'
                                                        : 'bg-emerald-100 text-emerald-800'
                                                }`}
                                            >
                                                {isFull ? 'Penuh' : `Sisa ${sisa} Slot`} ({count}/{k.kapasitas})
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                            {availableKamarList.length === 0 && (
                                <div className="p-6 text-center text-gray-500 text-xs">
                                    Tidak ada kamar tujuan yang sesuai atau tersedia.
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 bg-white border border-gray-300 text-gray-700 hover:bg-gray-100 rounded-lg text-xs font-semibold"
                    >
                        Batal
                    </button>
                    <button
                        type="button"
                        onClick={handlePindah}
                        disabled={!selectedKamarId || isSubmitting}
                        className="px-4 py-2 bg-teal-700 hover:bg-teal-800 disabled:bg-gray-300 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm"
                    >
                        {isSubmitting ? (
                            <>Memproses...</>
                        ) : (
                            <>
                                <i className="bi bi-check-circle"></i> Pindahkan Sekarang
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};
