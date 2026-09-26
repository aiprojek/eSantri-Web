import React, { useState, useMemo } from 'react';
import { Santri, PondokSettings, TahfizhRecord } from '../../types';
import { useAppContext } from '../../AppContext';
import { useSantriContext } from '../../contexts/SantriContext';
import { QURAN_JUZ_DATA, getSurahsInJuz } from '../../data/quran';
import { TahfizhBeritaAcaraTemplate, MunaqosyahScoreBreakdown } from './TahfizhBeritaAcaraTemplate';
import { printToPdfNative } from '../../utils/pdfGenerator';

interface TahfizhMunaqosyahExamModalProps {
    isOpen: boolean;
    onClose: () => void;
    santri: Santri;
    initialJuz?: number;
    defaultJuz?: number;
    records?: TahfizhRecord[];
    muhaffizhName?: string;
}

const PRESET_SESI = [
    "Tasmi' 1 Kali Duduk (Juz 'Amma)",
    "Tasmi' 1 Kali Duduk 1 Juz",
    "Tasmi' Akbar 5 Juz",
    "Tasmi' Akbar 10 Juz",
    "Khatam Akbar 30 Juz",
    "Ujian Kenaikan Juz / Marhalah",
    "Ujian Tahfizh Akhir Semester Ganjil",
    "Ujian Tahfizh Akhir Semester Genap",
    "Munaqosyah Syahadah Tahfizh",
];

export const TahfizhMunaqosyahExamModal: React.FC<TahfizhMunaqosyahExamModalProps> = ({
    isOpen,
    onClose,
    santri,
    initialJuz = 30,
    defaultJuz,
    muhaffizhName,
}) => {
    const { settings, showToast } = useAppContext();
    const { onSaveTahfizh } = useSantriContext();

    // Lookups
    const halaqah = useMemo(() => {
        return settings.kelompokHalaqah?.find(h => h.id === santri.halaqahId || h.santriIds?.includes(santri.id));
    }, [settings.kelompokHalaqah, santri.halaqahId, santri.id]);

    const defaultPenguji = useMemo(() => {
        if (muhaffizhName) return muhaffizhName;
        if (halaqah?.muhaffizhId) {
            const found = settings.tenagaPengajar.find(t => t.id === halaqah.muhaffizhId);
            if (found) return found.nama;
        }
        return settings.tenagaPengajar[0]?.nama || 'Ustadz Penguji';
    }, [muhaffizhName, halaqah, settings.tenagaPengajar]);

    // Exam Form State
    const effectiveInitialJuz = defaultJuz ?? initialJuz;
    const [sesiUjian, setSesiUjian] = useState<string>(PRESET_SESI[0]);
    const [selectedJuz, setSelectedJuz] = useState<number>(effectiveInitialJuz);
    const [selectedSurah, setSelectedSurah] = useState<string>("An-Naba'");
    const [ayatAwal, setAyatAwal] = useState<number>(1);
    const [ayatAkhir, setAyatAkhir] = useState<number>(40);
    const [tanggal, setTanggal] = useState<string>(new Date().toISOString().split('T')[0]);
    const [pengujiNama, setPengujiNama] = useState<string>(defaultPenguji);
    const [pengujiId, setPengujiId] = useState<number>(halaqah?.muhaffizhId || settings.tenagaPengajar[0]?.id || 0);

    // Live Scoring rubric
    // Max points: Itqan=40, Tajwid=30, Fashahah=20, Adab=10 (Total 100)
    const [minorTawaqquf, setMinorTawaqquf] = useState<number>(0); // -2 pts each
    const [majorFathulAyat, setMajorFathulAyat] = useState<number>(0); // -5 pts each
    const [salahTajwid, setSalahTajwid] = useState<number>(0); // -1 pt each
    const [salahMakhraj, setSalahMakhraj] = useState<number>(0); // -1 pt each
    const [adabScore, setAdabScore] = useState<number>(10); // 0-10
    const [catatanPenguji, setCatatanPenguji] = useState<string>('Alhamdulillah tuntas dengan kelancaran dan tajwid yang memuaskan.');

    // Tab view inside modal: "Form Penilaian" vs "Cetak Berita Acara"
    const [activeTab, setActiveTab] = useState<'form' | 'print'>('form');

    // Surahs in selected juz
    const surahsInJuz = useMemo(() => {
        return getSurahsInJuz(selectedJuz);
    }, [selectedJuz]);

    // Calculate Scores
    const itqanScore = Math.max(0, 40 - (minorTawaqquf * 2 + majorFathulAyat * 5));
    const tajwidScore = Math.max(0, 30 - (salahTajwid * 1));
    const fashahahScore = Math.max(0, 20 - (salahMakhraj * 1));
    const totalScore = itqanScore + tajwidScore + fashahahScore + adabScore;

    // Determine Predikat & Status
    const { predikat, statusKelulusan } = useMemo(() => {
        if (totalScore >= 90) return { predikat: 'Mumtaz (Istimewa)', statusKelulusan: 'LULUS' as const };
        if (totalScore >= 80) return { predikat: 'Jayyid Jiddan (Amat Baik)', statusKelulusan: 'LULUS' as const };
        if (totalScore >= 70) return { predikat: 'Jayyid (Baik)', statusKelulusan: 'LULUS' as const };
        if (totalScore >= 60) return { predikat: 'Maqbul (Cukup)', statusKelulusan: 'LULUS BERSYARAT' as const };
        return { predikat: 'Rasib (Perlu Mengulang)', statusKelulusan: 'BELUM LULUS' as const };
    }, [totalScore]);

    // Build Exam Data structure
    const examData: MunaqosyahScoreBreakdown = {
        sesiUjian,
        juz: selectedJuz,
        materiUjian: `${selectedSurah} (${ayatAwal}-${ayatAkhir})`,
        tanggal,
        pengujiNama,
        pengujiJabatan: 'Dewan Penguji Tahfizh',
        itqanScore,
        itqanMax: 40,
        tajwidScore,
        tajwidMax: 30,
        fashahahScore,
        fashahahMax: 20,
        adabScore,
        adabMax: 10,
        totalScore,
        predikat,
        statusKelulusan,
        catatanPenguji,
        minorTawaqquf,
        majorFathulAyat,
        salahTajwid,
        salahMakhraj,
    };

    if (!isOpen) return null;

    // Reset Counter
    const handleResetRubric = () => {
        setMinorTawaqquf(0);
        setMajorFathulAyat(0);
        setSalahTajwid(0);
        setSalahMakhraj(0);
        setAdabScore(10);
    };

    // Save record to context
    const handleSaveExamRecord = async () => {
        let convertedPredikat: TahfizhRecord['predikat'] = 'Lancar';
        if (totalScore >= 90) convertedPredikat = 'Sangat Lancar';
        else if (totalScore >= 70) convertedPredikat = 'Lancar';
        else if (totalScore >= 60) convertedPredikat = 'Kurang Lancar';
        else convertedPredikat = 'Belum Lulus';

        let sesiRecord: TahfizhRecord['sesiUjian'] = 'Munaqosyah Khusus';
        if (sesiUjian.toLowerCase().includes('ganjil')) sesiRecord = 'Ganjil';
        else if (sesiUjian.toLowerCase().includes('genap')) sesiRecord = 'Genap';

        await onSaveTahfizh({
            id: Date.now(),
            santriId: santri.id,
            tanggal,
            tipe: 'Ujian Hafalan',
            sesiUjian: sesiRecord,
            juz: selectedJuz,
            surah: selectedSurah,
            ayatAwal,
            ayatAkhir,
            predikat: convertedPredikat,
            nilaiAngka: totalScore,
            catatan: `[${sesiUjian}] Nilai: ${totalScore}/100 (${predikat}). Penguji: ${pengujiNama}. ${catatanPenguji}`,
            muhaffizhId: pengujiId || undefined,
            halaqahId: santri.halaqahId || undefined,
        });

        showToast(`Hasil Ujian Munaqosyah Juz ${selectedJuz} (${totalScore} - ${predikat}) berhasil disimpan!`, 'success');
        setActiveTab('print');
    };

    const handlePrintBeritaAcara = () => {
        printToPdfNative('tahfizh-berita-acara-doc', `Berita_Acara_Munaqosyah_Juz_${selectedJuz}_${santri.namaLengkap.replace(/\s+/g, '_')}`);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3.5 sm:p-5 md:p-6 backdrop-blur-xs animate-fade-in overflow-y-auto">
            <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[95vh]">
                {/* Modal Header */}
                <div className="bg-gradient-to-r from-teal-800 via-emerald-800 to-teal-900 p-4 text-white flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center text-xl text-teal-200 shadow-inner">
                            <i className="bi bi-patch-check-fill"></i>
                        </div>
                        <div>
                            <h3 className="font-bold text-base">Lembar Penilaian Ujian Munaqosyah / Tasmi' Tahfizh</h3>
                            <p className="text-xs text-teal-100">
                                Santri: <strong>{santri.namaLengkap}</strong> {santri.nis ? `(${santri.nis})` : ''} • Halaqah: {halaqah?.nama || 'Reguler'}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {/* Tab Switcher */}
                        <div className="flex bg-black/20 p-0.5 rounded-lg text-xs font-bold">
                            <button
                                type="button"
                                onClick={() => setActiveTab('form')}
                                className={`px-3 py-1.5 rounded-md transition-all ${
                                    activeTab === 'form' ? 'bg-white text-teal-900 shadow-xs' : 'text-white/80 hover:text-white'
                                }`}
                            >
                                <i className="bi bi-pencil-square mr-1"></i> Input Nilai
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveTab('print')}
                                className={`px-3 py-1.5 rounded-md transition-all ${
                                    activeTab === 'print' ? 'bg-white text-teal-900 shadow-xs' : 'text-white/80 hover:text-white'
                                }`}
                            >
                                <i className="bi bi-printer mr-1"></i> Berita Acara
                            </button>
                        </div>

                        <button
                            onClick={onClose}
                            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors ml-2"
                        >
                            <i className="bi bi-x-lg"></i>
                        </button>
                    </div>
                </div>

                {activeTab === 'form' ? (
                    <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
                        {/* Section 1: Data Ujian */}
                        <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-200">
                            <h4 className="text-xs font-bold text-gray-800 uppercase mb-2.5 flex items-center gap-1.5">
                                <i className="bi bi-info-circle-fill text-teal-600"></i>
                                1. Konfigurasi Sesi & Materi Ujian
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div>
                                    <label className="block text-[11px] font-bold text-gray-700 mb-1">Jenis Sesi Ujian:</label>
                                    <select
                                        value={sesiUjian}
                                        onChange={(e) => setSesiUjian(e.target.value)}
                                        className="w-full p-2 bg-white border border-gray-300 rounded-lg text-xs font-semibold text-gray-800 focus:ring-2 focus:ring-teal-500"
                                    >
                                        {PRESET_SESI.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-[11px] font-bold text-gray-700 mb-1">Pilih Juz yang Diujikan:</label>
                                    <select
                                        value={selectedJuz}
                                        onChange={(e) => {
                                            const j = Number(e.target.value);
                                            setSelectedJuz(j);
                                            const surahs = getSurahsInJuz(j);
                                            if (surahs.length > 0) {
                                                setSelectedSurah(surahs[0].name);
                                                setAyatAwal(1);
                                                setAyatAkhir(surahs[0].ayat);
                                            }
                                        }}
                                        className="w-full p-2 bg-white border border-teal-500 rounded-lg text-xs font-bold text-teal-900 focus:ring-2 focus:ring-teal-500"
                                    >
                                        {QURAN_JUZ_DATA.map(j => (
                                            <option key={j.juz} value={j.juz}>Juz {j.juz} ({j.name})</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-[11px] font-bold text-gray-700 mb-1">Surah & Rentang Ayat:</label>
                                    <div className="flex gap-1.5">
                                        <select
                                            value={selectedSurah}
                                            onChange={(e) => {
                                                setSelectedSurah(e.target.value);
                                                const s = surahsInJuz.find(sur => sur.name === e.target.value);
                                                if (s) {
                                                    setAyatAwal(1);
                                                    setAyatAkhir(s.ayat);
                                                }
                                            }}
                                            className="w-2/3 p-2 bg-white border border-gray-300 rounded-lg text-xs font-medium"
                                        >
                                            {surahsInJuz.map(s => (
                                                <option key={s.number} value={s.name}>QS. {s.name} ({s.ayat} ayat)</option>
                                            ))}
                                        </select>
                                        <input
                                            type="number"
                                            value={ayatAwal}
                                            onChange={(e) => setAyatAwal(Number(e.target.value))}
                                            className="w-16 p-2 bg-white border border-gray-300 rounded-lg text-xs text-center font-bold"
                                            title="Ayat Awal"
                                            min={1}
                                        />
                                        <span className="self-center text-xs text-gray-400">-</span>
                                        <input
                                            type="number"
                                            value={ayatAkhir}
                                            onChange={(e) => setAyatAkhir(Number(e.target.value))}
                                            className="w-16 p-2 bg-white border border-gray-300 rounded-lg text-xs text-center font-bold"
                                            title="Ayat Akhir"
                                            min={1}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 pt-2.5 border-t border-gray-200">
                                <div>
                                    <label className="block text-[11px] font-bold text-gray-700 mb-1">Dewan Penguji (Nama & Gelar):</label>
                                    <div className="flex gap-1.5">
                                        <select
                                            value={pengujiId}
                                            onChange={(e) => {
                                                const id = Number(e.target.value);
                                                setPengujiId(id);
                                                const teacher = settings.tenagaPengajar.find(t => t.id === id);
                                                if (teacher) setPengujiNama(teacher.nama);
                                            }}
                                            className="w-1/2 p-2 bg-white border border-gray-300 rounded-lg text-xs"
                                        >
                                            {settings.tenagaPengajar.map(t => (
                                                <option key={t.id} value={t.id}>{t.nama}</option>
                                            ))}
                                        </select>
                                        <input
                                            type="text"
                                            value={pengujiNama}
                                            onChange={(e) => setPengujiNama(e.target.value)}
                                            placeholder="Nama Penguji Manual"
                                            className="w-1/2 p-2 bg-white border border-gray-300 rounded-lg text-xs font-semibold text-gray-800"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[11px] font-bold text-gray-700 mb-1">Tanggal Ujian:</label>
                                    <input
                                        type="date"
                                        value={tanggal}
                                        onChange={(e) => setTanggal(e.target.value)}
                                        className="w-full p-2 bg-white border border-gray-300 rounded-lg text-xs font-bold"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Section 2: Interactive Scoring Board */}
                        <div className="bg-gradient-to-br from-slate-900 to-teal-950 text-white p-4 rounded-2xl shadow-lg border border-teal-800 space-y-4">
                            <div className="flex items-center justify-between border-b border-teal-800/80 pb-3">
                                <div>
                                    <h4 className="font-bold text-sm text-teal-200 flex items-center gap-2">
                                        <i className="bi bi-calculator-fill text-amber-400"></i>
                                        Lembar Kalkulasi Penilaian Terstandar
                                    </h4>
                                    <p className="text-[11px] text-teal-300/80">Gunakan tombol (+ / -) untuk mencatat kesalahan saat santri membacakan hafalan.</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleResetRubric}
                                    className="px-2.5 py-1 bg-white/10 hover:bg-white/20 text-teal-200 hover:text-white rounded-lg text-xs font-medium transition-colors"
                                >
                                    <i className="bi bi-arrow-counterclockwise mr-1"></i> Reset Nilai
                                </button>
                            </div>

                            {/* Scoring Rubric Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                {/* 1. Itqan / Kelancaran */}
                                <div className="bg-white/10 p-3.5 rounded-xl border border-white/10 space-y-2.5">
                                    <div className="flex justify-between items-center">
                                        <span className="font-bold text-xs text-amber-300 uppercase tracking-wider">
                                            1. Kelancaran & Al-Itqan
                                        </span>
                                        <span className="text-xs font-black bg-amber-400/20 text-amber-300 px-2 py-0.5 rounded-md">
                                            {itqanScore} / 40 Poin
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                        {/* Minor: Tawaqquf (-2) */}
                                        <div className="bg-black/30 p-2.5 rounded-lg flex flex-col justify-between">
                                            <span className="text-[11px] text-gray-300">Tersendat / Tawaqquf (-2):</span>
                                            <div className="flex items-center justify-between mt-1">
                                                <button
                                                    type="button"
                                                    onClick={() => setMinorTawaqquf(Math.max(0, minorTawaqquf - 1))}
                                                    className="w-7 h-7 bg-white/10 hover:bg-white/20 rounded-md font-bold text-sm flex items-center justify-center active:scale-95"
                                                >
                                                    -
                                                </button>
                                                <span className="font-black text-amber-400 text-sm">{minorTawaqquf}x</span>
                                                <button
                                                    type="button"
                                                    onClick={() => setMinorTawaqquf(minorTawaqquf + 1)}
                                                    className="w-7 h-7 bg-amber-500 hover:bg-amber-400 text-black rounded-md font-black text-sm flex items-center justify-center active:scale-95 shadow-xs"
                                                >
                                                    +
                                                </button>
                                            </div>
                                        </div>

                                        {/* Mayor: Fathul Ayat (-5) */}
                                        <div className="bg-black/30 p-2.5 rounded-lg flex flex-col justify-between">
                                            <span className="text-[11px] text-gray-300">Lupa / Fathul Ayat (-5):</span>
                                            <div className="flex items-center justify-between mt-1">
                                                <button
                                                    type="button"
                                                    onClick={() => setMajorFathulAyat(Math.max(0, majorFathulAyat - 1))}
                                                    className="w-7 h-7 bg-white/10 hover:bg-white/20 rounded-md font-bold text-sm flex items-center justify-center active:scale-95"
                                                >
                                                    -
                                                </button>
                                                <span className="font-black text-rose-400 text-sm">{majorFathulAyat}x</span>
                                                <button
                                                    type="button"
                                                    onClick={() => setMajorFathulAyat(majorFathulAyat + 1)}
                                                    className="w-7 h-7 bg-rose-500 hover:bg-rose-400 text-white rounded-md font-black text-sm flex items-center justify-center active:scale-95 shadow-xs"
                                                >
                                                    +
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* 2. Tajwid */}
                                <div className="bg-white/10 p-3.5 rounded-xl border border-white/10 space-y-2.5">
                                    <div className="flex justify-between items-center">
                                        <span className="font-bold text-xs text-teal-300 uppercase tracking-wider">
                                            2. Tajwid & Ahkamul Huruf
                                        </span>
                                        <span className="text-xs font-black bg-teal-400/20 text-teal-300 px-2 py-0.5 rounded-md">
                                            {tajwidScore} / 30 Poin
                                        </span>
                                    </div>

                                    <div className="bg-black/30 p-2.5 rounded-lg flex items-center justify-between">
                                        <div>
                                            <p className="text-xs text-gray-200 font-semibold">Kekeliruan Tajwid (-1/kali):</p>
                                            <p className="text-[10px] text-gray-400">Ghunnah, Mad, Qalqalah, Ikhfa, Idgham</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setSalahTajwid(Math.max(0, salahTajwid - 1))}
                                                className="w-7 h-7 bg-white/10 hover:bg-white/20 rounded-md font-bold text-sm flex items-center justify-center active:scale-95"
                                            >
                                                -
                                            </button>
                                            <span className="font-black text-teal-300 text-sm min-w-5 text-center">{salahTajwid}</span>
                                            <button
                                                type="button"
                                                onClick={() => setSalahTajwid(salahTajwid + 1)}
                                                className="w-7 h-7 bg-teal-500 hover:bg-teal-400 text-black rounded-md font-black text-sm flex items-center justify-center active:scale-95 shadow-xs"
                                            >
                                                +
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* 3. Fashahah */}
                                <div className="bg-white/10 p-3.5 rounded-xl border border-white/10 space-y-2.5">
                                    <div className="flex justify-between items-center">
                                        <span className="font-bold text-xs text-cyan-300 uppercase tracking-wider">
                                            3. Fashahah & Makharijul Huruf
                                        </span>
                                        <span className="text-xs font-black bg-cyan-400/20 text-cyan-300 px-2 py-0.5 rounded-md">
                                            {fashahahScore} / 20 Poin
                                        </span>
                                    </div>

                                    <div className="bg-black/30 p-2.5 rounded-lg flex items-center justify-between">
                                        <div>
                                            <p className="text-xs text-gray-200 font-semibold">Kekeliruan Makhraj (-1/kali):</p>
                                            <p className="text-[10px] text-gray-400">Makhraj huruf, Sifat huruf, Waqaf & Ibtida'</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setSalahMakhraj(Math.max(0, salahMakhraj - 1))}
                                                className="w-7 h-7 bg-white/10 hover:bg-white/20 rounded-md font-bold text-sm flex items-center justify-center active:scale-95"
                                            >
                                                -
                                            </button>
                                            <span className="font-black text-cyan-300 text-sm min-w-5 text-center">{salahMakhraj}</span>
                                            <button
                                                type="button"
                                                onClick={() => setSalahMakhraj(salahMakhraj + 1)}
                                                className="w-7 h-7 bg-cyan-500 hover:bg-cyan-400 text-black rounded-md font-black text-sm flex items-center justify-center active:scale-95 shadow-xs"
                                            >
                                                +
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* 4. Adab & Tartil */}
                                <div className="bg-white/10 p-3.5 rounded-xl border border-white/10 space-y-2.5">
                                    <div className="flex justify-between items-center">
                                        <span className="font-bold text-xs text-purple-300 uppercase tracking-wider">
                                            4. Adab & Irama Tartil
                                        </span>
                                        <span className="text-xs font-black bg-purple-400/20 text-purple-300 px-2 py-0.5 rounded-md">
                                            {adabScore} / 10 Poin
                                        </span>
                                    </div>

                                    <div className="bg-black/30 p-2.5 rounded-lg space-y-1.5">
                                        <div className="flex justify-between text-xs text-gray-300">
                                            <span>Skor Adab & Kekhusyukan:</span>
                                            <span className="font-bold text-purple-300">{adabScore} Poin</span>
                                        </div>
                                        <input
                                            type="range"
                                            min={0}
                                            max={10}
                                            value={adabScore}
                                            onChange={(e) => setAdabScore(Number(e.target.value))}
                                            className="w-full accent-purple-400"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Total Score Summary Card */}
                            <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-inner">
                                <div className="flex items-center gap-3.5">
                                    <div className="w-14 h-14 rounded-2xl bg-white text-emerald-900 font-black text-2xl flex flex-col items-center justify-center shadow-md">
                                        <span>{totalScore}</span>
                                        <span className="text-[9px] font-normal tracking-tight text-gray-500 uppercase -mt-1">/ 100</span>
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-lg font-black text-white">{predikat}</span>
                                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
                                                statusKelulusan === 'LULUS' ? 'bg-emerald-300 text-emerald-950' : 
                                                statusKelulusan === 'LULUS BERSYARAT' ? 'bg-amber-300 text-amber-950' : 'bg-rose-400 text-white'
                                            }`}>
                                                {statusKelulusan}
                                            </span>
                                        </div>
                                        <p className="text-xs text-emerald-100">
                                            Itqan: {itqanScore} • Tajwid: {tajwidScore} • Fashahah: {fashahahScore} • Adab: {adabScore}
                                        </p>
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    onClick={handleSaveExamRecord}
                                    className="px-5 py-2.5 bg-white text-emerald-900 hover:bg-emerald-50 rounded-xl font-bold text-xs shadow-md flex items-center justify-center gap-2 transition-all active:scale-95"
                                >
                                    <i className="bi bi-cloud-arrow-up-fill text-emerald-700"></i>
                                    <span>Simpan Hasil Ujian</span>
                                </button>
                            </div>
                        </div>

                        {/* Section 3: Catatan Penguji */}
                        <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                                Catatan & Rekomendasi Dewan Penguji:
                            </label>
                            <textarea
                                rows={2}
                                value={catatanPenguji}
                                onChange={(e) => setCatatanPenguji(e.target.value)}
                                placeholder="Tuliskan catatan kelulusan, tajwid yang perlu diasah, atau rekomendasi juz berikutnya..."
                                className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs text-gray-800 focus:ring-2 focus:ring-teal-500 focus:bg-white"
                            ></textarea>
                        </div>
                    </div>
                ) : (
                    /* Tab Berita Acara Print Preview */
                    <div className="p-4 overflow-y-auto space-y-3 flex-1 bg-gray-100">
                        <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-gray-200 shadow-xs">
                            <div className="flex items-center gap-2 text-xs font-bold text-gray-700">
                                <i className="bi bi-file-earmark-check-fill text-teal-600 text-base"></i>
                                Pratinjau Berita Acara & Lembar Penilaian Resmi (A4 Siap Cetak / PDF)
                            </div>
                            <button
                                type="button"
                                onClick={handlePrintBeritaAcara}
                                className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl font-bold text-xs flex items-center gap-2 shadow-sm transition-all"
                            >
                                <i className="bi bi-printer"></i>
                                Cetak / Unduh PDF
                            </button>
                        </div>

                        <div className="flex justify-center overflow-x-auto pb-4">
                            <div id="tahfizh-berita-acara-doc" className="shadow-2xl bg-white border border-gray-300 scale-90 sm:scale-100 origin-top">
                                <TahfizhBeritaAcaraTemplate
                                    santri={santri}
                                    settings={settings}
                                    examData={examData}
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* Footer */}
                <div className="p-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl font-bold text-xs transition-colors"
                    >
                        Tutup
                    </button>

                    {activeTab === 'form' ? (
                        <button
                            type="button"
                            onClick={handleSaveExamRecord}
                            className="px-5 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl font-bold text-xs flex items-center gap-2 shadow-sm transition-all"
                        >
                            <i className="bi bi-check-circle-fill"></i>
                            Simpan & Buka Berita Acara
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={handlePrintBeritaAcara}
                            className="px-5 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl font-bold text-xs flex items-center gap-2 shadow-sm transition-all"
                        >
                            <i className="bi bi-printer"></i>
                            Cetak Berita Acara
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
