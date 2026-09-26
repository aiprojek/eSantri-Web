import React, { useState } from 'react';
import { TenagaPengajar, PondokSettings } from '../../../types';

interface TeacherAvailabilityModalProps {
    isOpen: boolean;
    onClose: () => void;
    teacher: TenagaPengajar;
    settings: PondokSettings;
    onSaveTeacher: (updatedTeacher: TenagaPengajar) => void;
}

export const TeacherAvailabilityModal: React.FC<TeacherAvailabilityModalProps> = ({
    isOpen,
    onClose,
    teacher,
    settings,
    onSaveTeacher,
}) => {
    const [hariMasuk, setHariMasuk] = useState<number[]>(teacher.hariMasuk || []);
    const [jamMasuk, setJamMasuk] = useState<number[]>(teacher.jamMasuk || []);
    const [availableRombelIds, setAvailableRombelIds] = useState<number[]>(teacher.availableRombelIds || []);
    const [availableKelasIds, setAvailableKelasIds] = useState<number[]>(teacher.availableKelasIds || []);
    const [kodeGuru, setKodeGuru] = useState<string>(teacher.kodeGuru || '');

    if (!isOpen) return null;

    const days = [
        { val: 1, label: 'Senin' },
        { val: 2, label: 'Selasa' },
        { val: 3, label: 'Rabu' },
        { val: 4, label: 'Kamis' },
        { val: 5, label: 'Jumat' },
        { val: 6, label: 'Sabtu' },
        { val: 0, label: 'Ahad' },
    ];

    // Determine max Jam from settings.jamPelajaran or default 1-10
    const maxJamFromConfig = (settings.jamPelajaran || []).reduce((max, j) => Math.max(max, j.urutan), 8);
    const jamList = Array.from({ length: Math.max(8, maxJamFromConfig) }, (_, i) => i + 1);

    const toggleDay = (dayVal: number) => {
        setHariMasuk(prev => 
            prev.includes(dayVal) ? prev.filter(d => d !== dayVal) : [...prev, dayVal]
        );
    };

    const toggleJam = (jamVal: number) => {
        setJamMasuk(prev => 
            prev.includes(jamVal) ? prev.filter(j => j !== jamVal) : [...prev, jamVal]
        );
    };

    const toggleRombel = (rombelId: number) => {
        setAvailableRombelIds(prev => 
            prev.includes(rombelId) ? prev.filter(id => id !== rombelId) : [...prev, rombelId]
        );
    };

    const toggleKelas = (kelasId: number) => {
        setAvailableKelasIds(prev => 
            prev.includes(kelasId) ? prev.filter(id => id !== kelasId) : [...prev, kelasId]
        );
    };

    const handleSelectAllDays = () => {
        if (hariMasuk.length === days.length) {
            setHariMasuk([]);
        } else {
            setHariMasuk(days.map(d => d.val));
        }
    };

    const handleSelectAllJams = () => {
        if (jamMasuk.length === jamList.length) {
            setJamMasuk([]);
        } else {
            setJamMasuk([...jamList]);
        }
    };

    const handleSave = () => {
        const updated: TenagaPengajar = {
            ...teacher,
            kodeGuru: kodeGuru.trim() ? kodeGuru.trim().toUpperCase() : undefined,
            hariMasuk: hariMasuk.length > 0 ? hariMasuk : undefined,
            jamMasuk: jamMasuk.length > 0 ? jamMasuk : undefined,
            availableRombelIds: availableRombelIds.length > 0 ? availableRombelIds : undefined,
            availableKelasIds: availableKelasIds.length > 0 ? availableKelasIds : undefined,
        };
        onSaveTeacher(updated);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden animate-scale-up border border-gray-100">
                {/* Header */}
                <div className="p-5 border-b bg-gradient-to-r from-teal-900 via-teal-800 to-emerald-900 text-white flex justify-between items-start">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs bg-white/20 px-2 py-0.5 rounded font-bold uppercase tracking-wider text-teal-100">
                                Kesanggupan Pengajar
                            </span>
                            {kodeGuru && (
                                <span className="text-xs font-mono font-black bg-white/10 px-1.5 py-0.5 rounded text-white">
                                    {kodeGuru}
                                </span>
                            )}
                        </div>
                        <h3 className="text-lg font-black mt-1">{teacher.nama}</h3>
                        <p className="text-xs text-teal-100 mt-0.5">
                            Atur kesanggupan hari masuk, jam mengajar, dan batasan kelas/rombel untuk penjadwalan.
                        </p>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
                    >
                        <i className="bi bi-x-lg text-lg"></i>
                    </button>
                </div>

                {/* Body */}
                <div className="p-5 space-y-5 max-h-[75vh] overflow-y-auto">
                    {/* Kode Guru Singkat */}
                    <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div>
                            <label className="block text-xs font-bold text-gray-800">Kode Guru / Inisial</label>
                            <span className="text-[11px] text-gray-500">Digunakan pada matriks jadwal dan cetak slip</span>
                        </div>
                        <input
                            type="text"
                            maxLength={6}
                            value={kodeGuru}
                            onChange={e => setKodeGuru(e.target.value.toUpperCase())}
                            placeholder="Contoh: USM, AHM"
                            className="w-32 px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-mono font-black tracking-wider text-gray-800 focus:ring-2 focus:ring-teal-500"
                        />
                    </div>

                    {/* Hari Kesanggupan Mengajar */}
                    <div className="bg-blue-50/60 p-4 rounded-xl border border-blue-200 space-y-3">
                        <div className="flex items-center justify-between">
                            <div>
                                <label className="text-xs font-black text-blue-900 flex items-center gap-1.5">
                                    <i className="bi bi-calendar-check text-blue-600"></i>
                                    <span>Kesanggupan Hari Mengajar</span>
                                </label>
                                <p className="text-[11px] text-blue-700 mt-0.5">
                                    {hariMasuk.length === 0 
                                        ? 'Bisa mengajar di semua hari (tanpa batasan hari)' 
                                        : `Terpilih ${hariMasuk.length} hari kesanggupan mengajar`}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={handleSelectAllDays}
                                className="text-[11px] font-bold text-blue-700 hover:text-blue-900 bg-white px-2 py-1 rounded border border-blue-200"
                            >
                                {hariMasuk.length === days.length ? 'Reset' : 'Pilih Semua'}
                            </button>
                        </div>

                        <div className="flex flex-wrap gap-2 pt-1">
                            {days.map(day => {
                                const isSelected = hariMasuk.includes(day.val);
                                return (
                                    <button
                                        key={day.val}
                                        type="button"
                                        onClick={() => toggleDay(day.val)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                                            isSelected 
                                                ? 'bg-blue-600 text-white border-blue-600 shadow-xs' 
                                                : 'bg-white text-gray-700 border-gray-300 hover:bg-blue-50'
                                        }`}
                                    >
                                        {day.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Jam Ke (Urutan Jam Pelajaran) */}
                    <div className="bg-purple-50/60 p-4 rounded-xl border border-purple-200 space-y-3">
                        <div className="flex items-center justify-between">
                            <div>
                                <label className="text-xs font-black text-purple-900 flex items-center gap-1.5">
                                    <i className="bi bi-clock-history text-purple-600"></i>
                                    <span>Kesanggupan Jam Masuk (Jam Ke-)</span>
                                </label>
                                <p className="text-[11px] text-purple-700 mt-0.5">
                                    {jamMasuk.length === 0 
                                        ? 'Bisa mengajar di semua jam KBM (tanpa batasan jam)' 
                                        : `Bisa pada Jam Ke: ${jamMasuk.sort((a,b)=>a-b).join(', ')}`}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={handleSelectAllJams}
                                className="text-[11px] font-bold text-purple-700 hover:text-purple-900 bg-white px-2 py-1 rounded border border-purple-200"
                            >
                                {jamMasuk.length === jamList.length ? 'Reset' : 'Pilih Semua'}
                            </button>
                        </div>

                        <div className="flex flex-wrap gap-2 pt-1">
                            {jamList.map(jam => {
                                const isSelected = jamMasuk.includes(jam);
                                return (
                                    <button
                                        key={jam}
                                        type="button"
                                        onClick={() => toggleJam(jam)}
                                        className={`w-9 h-9 rounded-lg text-xs font-black border transition-all flex items-center justify-center ${
                                            isSelected 
                                                ? 'bg-purple-600 text-white border-purple-600 shadow-xs' 
                                                : 'bg-white text-gray-700 border-gray-300 hover:bg-purple-50'
                                        }`}
                                        title={`Jam Ke-${jam}`}
                                    >
                                        {jam}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Batasan Rombel / Kelas Khusus (Opsional) */}
                    <details className="bg-emerald-50/50 rounded-xl border border-emerald-200 p-4 group">
                        <summary className="text-xs font-black text-emerald-900 flex items-center justify-between cursor-pointer">
                            <span className="flex items-center gap-1.5">
                                <i className="bi bi-door-open-fill text-emerald-600"></i>
                                <span>Batasan Mengajar di Rombel Tertentu (Opsional)</span>
                            </span>
                            <i className="bi bi-chevron-down transition-transform group-open:rotate-180 text-emerald-700"></i>
                        </summary>
                        <p className="text-[11px] text-emerald-800 mt-2 mb-3 leading-relaxed">
                            Jika guru hanya ditugaskan mengajar di rombel tertentu saja, centang rombel di bawah. Jika tidak dicentang sama sekali, guru diizinkan mengajar di semua rombel sesuai mapel yang diampunya.
                        </p>

                        <div className="space-y-3 pt-1">
                            {settings.jenjang.map(j => {
                                const kelasInJenjang = settings.kelas.filter(k => k.jenjangId === j.id);
                                const rombelInJenjang = settings.rombel.filter(r => kelasInJenjang.some(k => k.id === r.kelasId));
                                if (rombelInJenjang.length === 0) return null;

                                return (
                                    <div key={j.id} className="bg-white p-2.5 rounded-lg border border-emerald-100">
                                        <div className="text-[11px] font-bold text-gray-700 mb-2">{j.nama}</div>
                                        <div className="flex flex-wrap gap-1.5">
                                            {rombelInJenjang.map(r => {
                                                const isSelected = availableRombelIds.includes(r.id);
                                                return (
                                                    <button
                                                        key={r.id}
                                                        type="button"
                                                        onClick={() => toggleRombel(r.id)}
                                                        className={`px-2.5 py-1 rounded-md text-[11px] font-bold border transition-colors ${
                                                            isSelected
                                                                ? 'bg-emerald-600 text-white border-emerald-600'
                                                                : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-emerald-50'
                                                        }`}
                                                    >
                                                        {r.nama}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </details>
                </div>

                {/* Footer */}
                <div className="p-4 border-t flex justify-between items-center bg-gray-50">
                    <span className="text-[11px] text-gray-500">
                        Otomatis tersimpan & dibaca oleh Generator Jadwal.
                    </span>
                    <div className="flex gap-2">
                        <button 
                            type="button" 
                            onClick={onClose} 
                            className="px-4 py-2 border border-gray-300 rounded-lg text-xs font-bold text-gray-700 hover:bg-gray-100 transition-colors"
                        >
                            Batal
                        </button>
                        <button 
                            type="button" 
                            onClick={handleSave} 
                            className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-black shadow-sm flex items-center gap-1.5 transition-colors"
                        >
                            <i className="bi bi-check-circle-fill"></i>
                            <span>Simpan Kesanggupan</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
