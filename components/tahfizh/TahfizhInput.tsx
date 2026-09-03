import React, { useState, useMemo, useEffect } from 'react';
import { useAppContext } from '../../AppContext';
import { useSantriContext } from '../../contexts/SantriContext';
import { TahfizhRecord } from '../../types';
import { QURAN_DATA, QURAN_JUZ_DATA, getJuzForSurah, getSurahsInJuz } from '../../data/quran';
import { MobileFilterDrawer } from '../common/MobileFilterDrawer';
import { TahfizhBatchHalaqahInput } from './TahfizhBatchHalaqahInput';
import { QuranMushafViewer } from './QuranMushafViewer';
import { calculateTahfizhSmartScore } from '../../utils/tahfizhScoring';

export const TahfizhInput: React.FC = () => {
    const { settings, showToast, currentUser } = useAppContext();
    const { santriList, tahfizhList, onSaveTahfizh } = useSantriContext();
    
    // --- WORKFLOW MODE ---
    const [inputMode, setInputMode] = useState<'single' | 'batch'>('single');

    // --- STATE ---
    const [santriId, setSantriId] = useState<number>(0);
    const [searchSantri, setSearchSantri] = useState('');
    const [isSantriPickerOpen, setIsSantriPickerOpen] = useState(false);
    const [isMushafOpen, setIsMushafOpen] = useState(false);
    
    // Filters
    const [filterHalaqah, setFilterHalaqah] = useState<number>(0);
    const [filterJenjang, setFilterJenjang] = useState<number>(0);
    const [filterKelas, setFilterKelas] = useState<number>(0);
    const [filterRombel, setFilterRombel] = useState<number>(0);

    const [tipe, setTipe] = useState<TahfizhRecord['tipe']>('Ziyadah');
    const [sesiUjian, setSesiUjian] = useState<TahfizhRecord['sesiUjian']>('Ganjil');
    const [juz, setJuz] = useState<number>(30); // Default Juz 30
    const [surahIndex, setSurahIndex] = useState<number>(77); // Default An-Naba (Index 77 in 0-based array is 78-AnNaba)
    const [ayatStart, setAyatStart] = useState<number>(1);
    const [ayatEnd, setAyatEnd] = useState<number>(5);
    const [predikat, setPredikat] = useState<TahfizhRecord['predikat']>('Lancar');
    const [catatan, setCatatan] = useState('');
    
    // Evaluasi Setoran: Teguran & Kesalahan
    const [jumlahTeguran, setJumlahTeguran] = useState<number>(0);
    const [jumlahKesalahan, setJumlahKesalahan] = useState<number>(0);
    const [kategoriKesalahan, setKategoriKesalahan] = useState<{
        tajwid: number;
        makhraj: number;
        kelancaran: number;
        terlewat: number;
    }>({ tajwid: 0, makhraj: 0, kelancaran: 0, terlewat: 0 });
    const [rincianKesalahan, setRincianKesalahan] = useState<string>('');
    const [autoPredikatEnabled, setAutoPredikatEnabled] = useState<boolean>(true);
    const [customNilai, setCustomNilai] = useState<number | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    // --- DERIVED DATA ---
    const availableKelas = useMemo(() => {
        if (!filterJenjang) return [];
        return settings.kelas.filter(k => k.jenjangId === filterJenjang);
    }, [filterJenjang, settings.kelas]);

    const availableRombel = useMemo(() => {
        if (!filterKelas) return [];
        return settings.rombel.filter(r => r.kelasId === filterKelas);
    }, [filterKelas, settings.rombel]);

    const filteredSantri = useMemo(() => {
        return santriList
            .filter(s => {
                // Status Filter
                if (s.status !== 'Aktif') return false;
                
                // Search Filter
                if (searchSantri) {
                    const lower = searchSantri.toLowerCase();
                    if (!s.namaLengkap.toLowerCase().includes(lower) && !s.nis.includes(lower)) return false;
                }

                // Halaqah filter
                if (filterHalaqah && s.halaqahId !== filterHalaqah) return false;

                // Dropdown Filters
                if (filterJenjang && s.jenjangId !== filterJenjang) return false;
                if (filterKelas && s.kelasId !== filterKelas) return false;
                if (filterRombel && s.rombelId !== filterRombel) return false;

                return true;
            })
            .sort((a, b) => a.namaLengkap.localeCompare(b.namaLengkap));
    }, [santriList, searchSantri, filterHalaqah, filterJenjang, filterKelas, filterRombel]);

    const selectedSantri = useMemo(() => santriList.find(s => s.id === santriId), [santriList, santriId]);
    const currentSurah = QURAN_DATA[surahIndex] || QURAN_DATA[0];

    const selectedSantriRecentRecords = useMemo(() => {
        if (!santriId) return [];
        return tahfizhList
            .filter(record => record.santriId === santriId)
            .sort((a, b) => {
                const byDate = new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime();
                if (byDate !== 0) return byDate;
                return b.id - a.id;
            })
            .slice(0, 4);
    }, [tahfizhList, santriId]);

    const latestSantriRecord = selectedSantriRecentRecords[0] || null;

    // --- AUTO SURAH / JUZ SYNC ---
    const handleSurahChange = (newSurahIdx: number) => {
        setSurahIndex(newSurahIdx);
        const surah = QURAN_DATA[newSurahIdx];
        if (surah) {
            const autoJuz = getJuzForSurah(surah.number, 1);
            setJuz(autoJuz);
            setAyatStart(1);
            setAyatEnd(Math.min(5, surah.ayat));
        }
    };

    const handleJuzChange = (newJuz: number) => {
        setJuz(newJuz);
        const surahsInChosenJuz = getSurahsInJuz(newJuz);
        if (surahsInChosenJuz.length > 0) {
            const currentSurahInJuz = surahsInChosenJuz.find(s => s.number === currentSurah.number);
            if (!currentSurahInJuz) {
                const firstSurah = surahsInChosenJuz[0];
                const newIdx = QURAN_DATA.findIndex(s => s.number === firstSurah.number);
                if (newIdx >= 0) {
                    setSurahIndex(newIdx);
                    setAyatStart(1);
                    setAyatEnd(Math.min(5, firstSurah.ayat));
                }
            }
        }
    };

    const handleAutoContinueLast = () => {
        if (!latestSantriRecord) return;
        const foundSurahIdx = QURAN_DATA.findIndex(s => s.name === latestSantriRecord.surah);
        if (foundSurahIdx >= 0) {
            const surahData = QURAN_DATA[foundSurahIdx];
            if (latestSantriRecord.ayatAkhir < surahData.ayat) {
                setSurahIndex(foundSurahIdx);
                const nextStart = latestSantriRecord.ayatAkhir + 1;
                setAyatStart(nextStart);
                setAyatEnd(Math.min(surahData.ayat, nextStart + 4));
                setJuz(getJuzForSurah(surahData.number, nextStart));
            } else if (foundSurahIdx < 113) {
                const nextSurah = QURAN_DATA[foundSurahIdx + 1];
                setSurahIndex(foundSurahIdx + 1);
                setAyatStart(1);
                setAyatEnd(Math.min(nextSurah.ayat, 5));
                setJuz(getJuzForSurah(nextSurah.number, 1));
            }
            showToast(`Otomatis melanjutkan ayat dari setoran sebelumnya.`, 'info');
        }
    };

    const ayatValidationWarning = useMemo(() => {
        if (ayatStart < 1) return 'Ayat mulai minimal 1.';
        if (ayatStart > currentSurah.ayat) return `Ayat mulai melebihi total ayat surah (${currentSurah.ayat}).`;
        if (ayatEnd < ayatStart) return 'Ayat akhir tidak boleh lebih kecil dari ayat mulai.';
        if (ayatEnd > currentSurah.ayat) return `Ayat akhir melebihi total ayat surah (${currentSurah.ayat}).`;
        return null;
    }, [ayatStart, ayatEnd, currentSurah]);

    const quickRangeSizes = [3, 5, 10, 20];

    // Calculate Smart Score & Recommendation
    const smartScore = useMemo(() => {
        return calculateTahfizhSmartScore({
            surahNumber: currentSurah.number,
            surahName: currentSurah.name,
            ayatAwal: ayatStart,
            ayatAkhir: ayatEnd,
            totalSurahAyat: currentSurah.ayat,
            jumlahTeguran,
            jumlahKesalahan,
            kategoriKesalahan
        });
    }, [currentSurah, ayatStart, ayatEnd, jumlahTeguran, jumlahKesalahan, kategoriKesalahan]);

    const effectiveNilai = customNilai !== null ? customNilai : smartScore.score;

    // Automatically synchronize predikat with smart score recommendation if enabled
    useEffect(() => {
        if (autoPredikatEnabled) {
            setPredikat(smartScore.predikat);
        }
    }, [smartScore.predikat, autoPredikatEnabled]);

    // Calculate auto predikat based on teguran & kesalahan
    const updateEvaluasiCounters = (
        teguranDelta: number,
        kesalahanDelta: number,
        kategoriUpdate?: Partial<typeof kategoriKesalahan>
    ) => {
        const newTeguran = Math.max(0, jumlahTeguran + teguranDelta);
        const newKesalahan = Math.max(0, jumlahKesalahan + kesalahanDelta);
        setJumlahTeguran(newTeguran);
        setJumlahKesalahan(newKesalahan);
        setCustomNilai(null); // Reset manual score override on counter adjustment

        if (kategoriUpdate) {
            setKategoriKesalahan(prev => ({
                ...prev,
                ...kategoriUpdate
            }));
        }
    };

    const handleAddQuickTag = (tag: string) => {
        setRincianKesalahan(prev => {
            const trimmed = prev.trim();
            if (!trimmed) return tag;
            if (trimmed.includes(tag)) return trimmed;
            return `${trimmed}; ${tag}`;
        });
    };

    const handleResetEvaluasi = () => {
        setJumlahTeguran(0);
        setJumlahKesalahan(0);
        setKategoriKesalahan({ tajwid: 0, makhraj: 0, kelancaran: 0, terlewat: 0 });
        setRincianKesalahan('');
        setCustomNilai(null);
    };

    // --- HANDLERS ---
    const persistTahfizhRecord = async (): Promise<boolean> => {
        if (!santriId) {
            showToast('Pilih santri terlebih dahulu.', 'error');
            return false;
        }
        if (ayatValidationWarning) {
            showToast(ayatValidationWarning, 'error');
            return false;
        }

        setIsSaving(true);
        try {
            const newRecord: TahfizhRecord = {
                id: Date.now(),
                santriId,
                tanggal: new Date().toISOString().split('T')[0],
                tipe,
                sesiUjian: tipe === 'Ujian Hafalan' ? sesiUjian : undefined,
                juz,
                surah: currentSurah.name,
                ayatAwal: ayatStart,
                ayatAkhir: ayatEnd,
                predikat,
                nilaiAngka: effectiveNilai,
                catatan: catatan.trim() || undefined,
                jumlahTeguran: jumlahTeguran > 0 ? jumlahTeguran : undefined,
                jumlahKesalahan: jumlahKesalahan > 0 ? jumlahKesalahan : undefined,
                kategoriKesalahan: (jumlahTeguran > 0 || jumlahKesalahan > 0) ? kategoriKesalahan : undefined,
                rincianKesalahan: rincianKesalahan.trim() || undefined,
                muhaffizhId: currentUser?.id,
                halaqahId: selectedSantri?.halaqahId || undefined,
            };

            await onSaveTahfizh(newRecord);
            showToast('Setoran berhasil disimpan!', 'success');
            return true;
        } catch (error) {
            showToast('Gagal menyimpan.', 'error');
            return false;
        } finally {
            setIsSaving(false);
        }
    };

    const applyPostSaveState = (resetSantri: boolean) => {
        if (resetSantri) {
            setSantriId(0);
            setSearchSantri('');
        }
        if (ayatEnd < currentSurah.ayat) {
            setAyatStart(ayatEnd + 1);
            setAyatEnd(Math.min(ayatEnd + 5, currentSurah.ayat));
        } else if (surahIndex < 113) {
            setSurahIndex(surahIndex + 1);
            setAyatStart(1);
            setAyatEnd(5);
        }
        setCatatan('');
        handleResetEvaluasi();
    };

    const handleSave = async (resetSantri: boolean) => {
        const isSaved = await persistTahfizhRecord();
        if (!isSaved) return;
        applyPostSaveState(resetSantri);
    };

    const handleSaveAndNextSantri = async () => {
        if (!santriId) {
            showToast('Pilih santri terlebih dahulu.', 'error');
            return;
        }
        const currentIndex = filteredSantri.findIndex(s => s.id === santriId);
        if (currentIndex < 0 || currentIndex === filteredSantri.length - 1) {
            showToast('Santri berikutnya tidak tersedia pada filter saat ini.', 'info');
            return;
        }
        const isSaved = await persistTahfizhRecord();
        if (!isSaved) return;
        applyPostSaveState(false);
        setSantriId(filteredSantri[currentIndex + 1].id);
        showToast('Berhasil simpan. Berpindah ke santri berikutnya.', 'success');
    };

    const handleQuickRange = (rangeSize: number) => {
        const normalizedStart = Math.max(1, Math.min(ayatStart, currentSurah.ayat));
        setAyatStart(normalizedStart);
        setAyatEnd(Math.min(currentSurah.ayat, normalizedStart + rangeSize - 1));
    };

    const handleSendWa = () => {
        if (!selectedSantri) return;
        const phone = selectedSantri.teleponWali || selectedSantri.telepon;
        if (!phone) {
            showToast('Nomor WhatsApp wali santri belum terdaftar di data santri.', 'error');
            return;
        }

        const cleanPhone = phone.replace(/[^0-9]/g, '').replace(/^0/, '62');
        let detailEvaluasi = '';
        if (jumlahTeguran > 0 || jumlahKesalahan > 0 || rincianKesalahan.trim() || effectiveNilai) {
            detailEvaluasi = `• *Nilai*: ${effectiveNilai} / 100 (${predikat})\n` +
                (jumlahTeguran > 0 || jumlahKesalahan > 0 ? `• *Evaluasi*: ${jumlahTeguran}x Teguran, ${jumlahKesalahan}x Kesalahan\n` : '');
            if (rincianKesalahan.trim()) {
                detailEvaluasi += `• *Rincian Koreksi*: ${rincianKesalahan.trim()}\n`;
            }
        }

        const pesan = `*LAPORAN MUTABA'AH TAHFIZH SANTRI*\n` +
            `Assalamu'alaikum Warahmatullahi Wabarakatuh.\n\n` +
            `Kepada Yth. Orang Tua / Wali dari *${selectedSantri.namaLengkap}* (NIS: ${selectedSantri.nis})\n\n` +
            `Alhamdulillah, ananda telah menyelesaikan setoran hafalan Al-Qur'an pada hari ini:\n` +
            `• *Jenis*: ${tipe}\n` +
            `• *Capaian*: Juz ${juz}, QS. ${currentSurah.name} (Ayat ${ayatStart} - ${ayatEnd})\n` +
            detailEvaluasi +
            (catatan ? `• *Catatan Ustadz*: ${catatan}\n\n` : `\n`) +
            `Semoga Allah senantiasa memberkahi hafalan ananda dan menjadikannya ahlul Qur'an.\n\n` +
            `_${settings.namaPonpes}_`;

        window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(pesan)}`, '_blank');
    };

    const PredikatButton: React.FC<{ value: TahfizhRecord['predikat'], label: string, color: string }> = ({ value, label, color }) => (
        <button
            type="button"
            onClick={() => setPredikat(value)}
            className={`flex-1 py-3 px-2 rounded-xl text-xs sm:text-sm font-bold border-2 transition-all ${
                predikat === value 
                ? `bg-${color}-600 text-white border-${color}-600 shadow-md transform scale-105` 
                : `bg-white text-gray-600 border-gray-200 hover:border-${color}-300 hover:bg-${color}-50`
            }`}
        >
            {label}
        </button>
    );

    const handleResetSantriFilter = () => {
        setSearchSantri('');
        setFilterHalaqah(0);
        setFilterJenjang(0);
        setFilterKelas(0);
        setFilterRombel(0);
    };

    const handleSelectAyatFromMushaf = (
        surahName: string,
        start: number,
        end: number,
        assessmentData?: {
            totalTeguran: number;
            totalKesalahan: number;
            kategoriKesalahan: { tajwid: number; makhraj: number; kelancaran: number; terlewat: number };
            rincianKesalahan: string;
            catatanOtomatis: string;
        }
    ) => {
        const idx = QURAN_DATA.findIndex(s => s.name.toLowerCase() === surahName.toLowerCase());
        if (idx !== -1) {
            setSurahIndex(idx);
            const derivedJuz = getJuzForSurah(QURAN_DATA[idx].number, start);
            setJuz(derivedJuz);
        }
        setAyatStart(start);
        setAyatEnd(end);

        if (assessmentData) {
            setJumlahTeguran(assessmentData.totalTeguran);
            setJumlahKesalahan(assessmentData.totalKesalahan);
            setKategoriKesalahan(assessmentData.kategoriKesalahan);
            if (assessmentData.rincianKesalahan) {
                setRincianKesalahan(assessmentData.rincianKesalahan);
            }
            if (assessmentData.catatanOtomatis) {
                setCatatan(prev => {
                    const trimmed = prev.trim();
                    if (!trimmed) return assessmentData.catatanOtomatis;
                    return `${trimmed}\n${assessmentData.catatanOtomatis}`;
                });
            }
            setCustomNilai(null); // Recalculate smart score
            showToast(`Mushaf terhubung: ${assessmentData.totalTeguran} teguran, ${assessmentData.totalKesalahan} kesalahan disinkronkan.`, 'success');
        }
    };

    return (
        <div className="space-y-4">
            {/* Top Workflow Mode Switcher */}
            <div className="flex items-center justify-between bg-white p-2 sm:p-2.5 rounded-2xl border border-gray-200 shadow-sm">
                <div className="flex items-center gap-1.5 sm:gap-2">
                    <button
                        type="button"
                        onClick={() => setInputMode('single')}
                        className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                            inputMode === 'single'
                                ? 'bg-teal-600 text-white shadow-md'
                                : 'text-gray-600 hover:bg-gray-100'
                        }`}
                    >
                        <i className="bi bi-person-fill"></i>
                        <span>Input Perorangan</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setInputMode('batch')}
                        className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                            inputMode === 'batch'
                                ? 'bg-teal-600 text-white shadow-md'
                                : 'text-gray-600 hover:bg-gray-100'
                        }`}
                    >
                        <i className="bi bi-table"></i>
                        <span>Tabel Cepat Halaqah</span>
                    </button>
                </div>

                <div className="text-xs text-gray-500 hidden md:block">
                    {inputMode === 'single' ? 'Form detail interaktif satu per satu' : 'Entri massal seluruh kelompok halaqah'}
                </div>
            </div>

            {/* If Batch Mode is selected */}
            {inputMode === 'batch' ? (
                <TahfizhBatchHalaqahInput />
            ) : (
                /* Single Form Input */
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full pb-24 lg:pb-0">
                    {/* LEFT COLUMN: SANTRI SELECTION */}
                    <div className="hidden lg:flex lg:col-span-4 bg-white p-4 rounded-2xl shadow-sm border border-gray-200 flex-col h-[calc(100vh-180px)]">
                        <div className="mb-4 space-y-3">
                            <h3 className="font-bold text-gray-700 flex items-center gap-2">
                                <i className="bi bi-people-fill text-teal-600"></i> Pilih Santri
                            </h3>
                            
                            {/* Halaqah Filter */}
                            {(settings.kelompokHalaqah || []).length > 0 && (
                                <select
                                    value={filterHalaqah}
                                    onChange={(e) => setFilterHalaqah(Number(e.target.value))}
                                    className="w-full bg-teal-50/70 border border-teal-200 text-xs font-semibold text-teal-900 rounded-lg p-2"
                                >
                                    <option value={0}>Semua Kelompok Halaqah</option>
                                    {(settings.kelompokHalaqah || []).map(h => (
                                        <option key={h.id} value={h.id}>{h.nama}</option>
                                    ))}
                                </select>
                            )}

                            {/* Filters */}
                            <div className="grid grid-cols-2 gap-2">
                                <select 
                                    value={filterJenjang} 
                                    onChange={(e) => { setFilterJenjang(Number(e.target.value)); setFilterKelas(0); setFilterRombel(0); }} 
                                    className="bg-gray-50 border border-gray-300 text-xs rounded-lg p-2"
                                >
                                    <option value={0}>Semua Jenjang</option>
                                    {settings.jenjang.map(j => <option key={j.id} value={j.id}>{j.nama}</option>)}
                                </select>
                                <select 
                                    value={filterKelas} 
                                    onChange={(e) => { setFilterKelas(Number(e.target.value)); setFilterRombel(0); }} 
                                    disabled={!filterJenjang}
                                    className="bg-gray-50 border border-gray-300 text-xs rounded-lg p-2 disabled:bg-gray-100"
                                >
                                    <option value={0}>Semua Kelas</option>
                                    {availableKelas.map(k => <option key={k.id} value={k.id}>{k.nama}</option>)}
                                </select>
                            </div>
                            <select 
                                value={filterRombel} 
                                onChange={(e) => setFilterRombel(Number(e.target.value))} 
                                disabled={!filterKelas}
                                className="w-full bg-gray-50 border border-gray-300 text-xs rounded-lg p-2 disabled:bg-gray-100"
                            >
                                <option value={0}>Semua Rombel</option>
                                {availableRombel.map(r => <option key={r.id} value={r.id}>{r.nama}</option>)}
                            </select>

                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Cari nama / NIS..."
                                    value={searchSantri}
                                    onChange={(e) => setSearchSantri(e.target.value)}
                                    className="w-full p-2 pl-9 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none text-sm"
                                />
                                <i className="bi bi-search absolute left-3 top-2.5 text-gray-400"></i>
                            </div>
                        </div>
                        
                        {/* Scrollable List */}
                        <div className="flex-grow overflow-y-auto border rounded-xl bg-gray-50 custom-scrollbar max-h-[300px] lg:max-h-none">
                            {filteredSantri.length > 0 ? (
                                <div className="divide-y divide-gray-100">
                                    {filteredSantri.map(s => (
                                        <button
                                            key={s.id}
                                            onClick={() => setSantriId(s.id)}
                                            className={`w-full text-left px-3.5 py-2.5 flex items-center gap-3 transition-colors ${santriId === s.id ? 'bg-teal-100 border-l-4 border-teal-600' : 'hover:bg-white'}`}
                                        >
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border shrink-0 ${santriId === s.id ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-gray-500 border-gray-300'}`}>
                                                {s.namaLengkap.charAt(0)}
                                            </div>
                                            <div className="min-w-0">
                                                <p className={`font-bold text-sm truncate ${santriId === s.id ? 'text-teal-900' : 'text-gray-700'}`}>{s.namaLengkap}</p>
                                                <p className="text-xs text-gray-500 truncate">{settings.rombel.find(r=>r.id === s.rombelId)?.nama || 'Tanpa Kelas'}</p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <div className="p-8 text-center text-gray-500 text-sm">
                                    <i className="bi bi-search text-2xl mb-2 block opacity-50"></i>
                                    Tidak ada data
                                </div>
                            )}
                        </div>
                    </div>

                    {/* RIGHT COLUMN: FORM INPUT */}
                    <div className="lg:col-span-8 flex flex-col gap-4">
                        <div className="lg:hidden bg-white p-3 rounded-2xl shadow-sm border border-gray-200 space-y-3">
                            <button
                                onClick={() => setIsSantriPickerOpen(true)}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-teal-50 text-teal-700 border border-teal-200 rounded-xl font-bold text-sm shadow-sm"
                            >
                                <i className="bi bi-people-fill"></i>
                                <span>{selectedSantri ? 'Ganti Santri' : 'Pilih Santri'}</span>
                            </button>
                            <p className="text-[11px] text-gray-500">
                                {selectedSantri
                                    ? `Terpilih: ${selectedSantri.namaLengkap} • ${settings.rombel.find(r => r.id === selectedSantri.rombelId)?.nama || 'Tanpa Kelas'}`
                                    : 'Belum ada santri terpilih.'}
                            </p>
                        </div>

                        {/* Selected Santri Info Banner */}
                        {selectedSantri ? (
                            <div className="bg-teal-700 text-white p-4 rounded-2xl shadow-md flex justify-between items-center animate-fade-in-down">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur flex items-center justify-center text-xl font-bold border border-white/30">
                                        {selectedSantri.namaLengkap.charAt(0)}
                                    </div>
                                    <div>
                                        <h2 className="font-bold text-lg leading-tight">{selectedSantri.namaLengkap}</h2>
                                        <p className="text-teal-100 text-xs">
                                            NIS: {selectedSantri.nis} • {settings.rombel.find(r=>r.id === selectedSantri.rombelId)?.nama || 'Tanpa Rombel'}
                                            {selectedSantri.halaqahId && (
                                                <span className="ml-1.5 px-1.5 py-0.5 bg-teal-800 rounded font-medium">
                                                    {(settings.kelompokHalaqah || []).find(h => h.id === selectedSantri.halaqahId)?.nama}
                                                </span>
                                            )}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={handleSendWa}
                                        className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold shadow flex items-center gap-1.5 transition-all"
                                        title="Kirim Info via WhatsApp"
                                    >
                                        <i className="bi bi-whatsapp"></i>
                                        <span className="hidden sm:inline">Kirim WA</span>
                                    </button>
                                    <button onClick={() => setSantriId(0)} className="lg:hidden text-white/80 hover:text-white p-1">
                                        <i className="bi bi-x-lg text-lg"></i>
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-gray-50 border-2 border-dashed border-gray-300 p-6 rounded-2xl text-center text-gray-500 hidden lg:block">
                                <i className="bi bi-arrow-left-circle text-2xl mb-2 block text-teal-600"></i>
                                Pilih santri dari daftar di sebelah kiri untuk mulai mencatat hafalan Al-Qur'an.
                            </div>
                        )}

                        {/* Recent History & Smart Continuation Banner */}
                        {selectedSantri && (
                            <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm space-y-3">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                                        Riwayat Terakhir & Sambung Otomatis
                                    </h3>
                                    {latestSantriRecord && (
                                        <button
                                            type="button"
                                            onClick={handleAutoContinueLast}
                                            className="px-3 py-1 bg-amber-50 text-amber-800 border border-amber-300 rounded-lg text-xs font-bold hover:bg-amber-100 flex items-center gap-1 transition-all"
                                        >
                                            <i className="bi bi-lightning-charge-fill text-amber-600"></i>
                                            <span>Lanjut Ayat Berikutnya</span>
                                        </button>
                                    )}
                                </div>

                                {selectedSantriRecentRecords.length > 0 ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {selectedSantriRecentRecords.slice(0, 2).map(record => (
                                            <div key={record.id} className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-3 py-2 text-xs">
                                                <div>
                                                    <span className={`font-bold mr-1.5 px-1.5 py-0.5 rounded text-[10px] ${
                                                        record.tipe === 'Ziyadah' ? 'bg-green-100 text-green-700' :
                                                        record.tipe === 'Murojaah' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
                                                    }`}>
                                                        {record.tipe}
                                                    </span>
                                                    <span className="font-semibold text-gray-800">
                                                        Juz {record.juz}, QS. {record.surah} ({record.ayatAwal}-{record.ayatAkhir})
                                                    </span>
                                                </div>
                                                <span className="text-[10px] text-gray-500">{record.tanggal}</span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-xs text-gray-400 italic">Belum ada riwayat setoran sebelumnya untuk santri ini.</p>
                                )}
                            </div>
                        )}

                        <div className={`space-y-4 ${!selectedSantri ? 'opacity-50 pointer-events-none lg:pointer-events-auto lg:opacity-100' : ''}`}>
                            {/* Jenis Setoran */}
                            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200">
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-3 tracking-wider">Jenis Setoran</label>
                                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                                    {([
                                        { value: 'Ziyadah', icon: 'bi-plus-circle' },
                                        { value: 'Murojaah', icon: 'bi-arrow-repeat' },
                                        { value: "Tasmi'", icon: 'bi-volume-up' },
                                        { value: 'Ujian Hafalan', icon: 'bi-award' }
                                    ] as const).map(({ value, icon }) => (
                                        <button
                                            key={value}
                                            type="button"
                                            onClick={() => setTipe(value)}
                                            className={`flex min-h-12 items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-center text-xs font-bold transition-all sm:text-sm ${
                                                tipe === value
                                                ? value === 'Ujian Hafalan' ? 'bg-amber-500 text-white border-amber-500 shadow-md ring-2 ring-amber-200'
                                                : 'bg-teal-600 text-white border-teal-600 shadow-md ring-2 ring-teal-200'
                                                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                                            }`}
                                        >
                                            <i className={`bi ${icon}`}></i>
                                            <span>{value}</span>
                                        </button>
                                    ))}
                                </div>

                                {tipe === 'Ujian Hafalan' && (
                                    <div className="mt-3">
                                        <label className="block text-xs font-medium text-gray-700 mb-1">Sesi Ujian / Munaqosyah</label>
                                        <select
                                            value={sesiUjian}
                                            onChange={(e) => setSesiUjian(e.target.value as TahfizhRecord['sesiUjian'])}
                                            className="w-full p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-sm focus:ring-amber-500 focus:border-amber-500 font-semibold text-amber-900"
                                        >
                                            <option value="Ganjil">Ujian Semester Ganjil</option>
                                            <option value="Genap">Ujian Semester Genap</option>
                                            <option value="Munaqosyah Khusus">Munaqosyah / Tasmi' Khusus</option>
                                        </select>
                                    </div>
                                )}
                            </div>

                            {/* Detail Hafalan with Auto Sync */}
                            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200">
                                <div className="flex items-center justify-between mb-3">
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Detail Hafalan</label>
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setIsMushafOpen(true)}
                                            className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100 rounded-xl text-xs font-bold transition-all shadow-2xs"
                                        >
                                            <i className="bi bi-book-half text-emerald-600"></i> Buka Teks Mushaf
                                        </button>
                                        <span className="hidden sm:inline text-[11px] text-teal-700 font-medium">Auto-Sync Juz ↔ Surah</span>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">Juz</label>
                                            <select 
                                                value={juz} 
                                                onChange={(e) => handleJuzChange(Number(e.target.value))} 
                                                className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm font-bold text-teal-900 focus:ring-teal-500 focus:border-teal-500"
                                            >
                                                {Array.from({length: 30}, (_, i) => 30 - i).map(j => (
                                                    <option key={j} value={j}>Juz {j}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">Surah</label>
                                            <select 
                                                value={surahIndex} 
                                                onChange={(e) => handleSurahChange(Number(e.target.value))} 
                                                className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm font-semibold focus:ring-teal-500 focus:border-teal-500"
                                            >
                                                {QURAN_DATA.map((s, idx) => (
                                                    <option key={idx} value={idx}>{s.number}. {s.name} ({s.ayat} ayat)</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                    
                                    <div className="flex flex-col justify-end">
                                        <label className="block text-xs font-medium text-gray-700 mb-1">Rentang Ayat</label>
                                        <div className="flex items-center gap-3 bg-gray-50 p-2 rounded-xl border border-gray-200">
                                            <div className="flex-1">
                                                <div className="flex items-center">
                                                    <button type="button" onClick={() => setAyatStart(Math.max(1, ayatStart - 1))} className="w-8 h-8 flex items-center justify-center bg-white rounded-l-lg border border-r-0 hover:bg-gray-100 text-teal-700"><i className="bi bi-dash"></i></button>
                                                    <input type="number" value={ayatStart} onChange={(e) => setAyatStart(Number(e.target.value))} className="w-full h-8 border-y text-center font-bold text-gray-800 text-sm focus:outline-none" />
                                                    <button type="button" onClick={() => setAyatStart(Math.min(currentSurah.ayat, ayatStart + 1))} className="w-8 h-8 flex items-center justify-center bg-white rounded-r-lg border border-l-0 hover:bg-gray-100 text-teal-700"><i className="bi bi-plus"></i></button>
                                                </div>
                                                <div className="text-[9px] text-center text-gray-500 mt-1">Mulai</div>
                                            </div>
                                            <span className="text-gray-400 font-bold"><i className="bi bi-arrow-right"></i></span>
                                            <div className="flex-1">
                                                <div className="flex items-center">
                                                    <button type="button" onClick={() => setAyatEnd(Math.max(ayatStart, ayatEnd - 1))} className="w-8 h-8 flex items-center justify-center bg-white rounded-l-lg border border-r-0 hover:bg-gray-100 text-teal-700"><i className="bi bi-dash"></i></button>
                                                    <input type="number" value={ayatEnd} onChange={(e) => setAyatEnd(Number(e.target.value))} className="w-full h-8 border-y text-center font-bold text-gray-800 text-sm focus:outline-none" />
                                                    <button type="button" onClick={() => setAyatEnd(Math.min(currentSurah.ayat, ayatEnd + 1))} className="w-8 h-8 flex items-center justify-center bg-white rounded-r-lg border border-l-0 hover:bg-gray-100 text-teal-700"><i className="bi bi-plus"></i></button>
                                                </div>
                                                <div className="text-[9px] text-center text-gray-500 mt-1">Sampai</div>
                                            </div>
                                        </div>
                                        <div className="text-right text-[10px] text-gray-500 mt-1">
                                            Total: {currentSurah.ayat} Ayat
                                        </div>
                                        <div className="mt-2 flex flex-wrap gap-1.5">
                                            {quickRangeSizes.map(size => (
                                                <button
                                                    key={size}
                                                    type="button"
                                                    onClick={() => handleQuickRange(size)}
                                                    className="rounded-lg border border-teal-200 bg-teal-50 px-2.5 py-1 text-[11px] font-semibold text-teal-700 hover:bg-teal-100"
                                                >
                                                    +{size} Ayat
                                                </button>
                                            ))}
                                        </div>
                                        {ayatValidationWarning && (
                                            <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                                                <i className="bi bi-exclamation-triangle-fill mr-1"></i>
                                                {ayatValidationWarning}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Pencatatan Evaluasi Setoran: Teguran & Kesalahan */}
                            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                                            Catatan Teguran & Kesalahan Setoran
                                        </label>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <label className="text-[11px] text-gray-500 flex items-center gap-1.5 cursor-pointer">
                                            <input 
                                                type="checkbox" 
                                                checked={autoPredikatEnabled} 
                                                onChange={(e) => setAutoPredikatEnabled(e.target.checked)}
                                                className="rounded border-gray-300 text-teal-600 focus:ring-teal-500 w-3.5 h-3.5"
                                            />
                                            <span>Saran Predikat Otomatis</span>
                                        </label>
                                        {(jumlahTeguran > 0 || jumlahKesalahan > 0 || rincianKesalahan.trim()) && (
                                            <button
                                                type="button"
                                                onClick={handleResetEvaluasi}
                                                className="text-[10px] text-red-600 hover:text-red-800 font-semibold px-2 py-0.5 rounded bg-red-50 hover:bg-red-100 transition-colors"
                                                title="Reset counter teguran & kesalahan"
                                            >
                                                <i className="bi bi-arrow-counterclockwise mr-1"></i>Reset
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Counter Teguran / Tawaqquf */}
                                    <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/40 space-y-2.5">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                                                    <i className="bi bi-exclamation-triangle-fill text-amber-500"></i>
                                                    Teguran (Tawaqquf / Ragu)
                                                </span>
                                                <p className="text-[10px] text-amber-700">Lupa sambungan ayat / diingatkan ustadz</p>
                                            </div>
                                            {/* Counter Controls */}
                                            <div className="flex items-center gap-1 bg-white border border-amber-300 rounded-xl p-1 shadow-2xs">
                                                <button
                                                    type="button"
                                                    onClick={() => updateEvaluasiCounters(-1, 0)}
                                                    className="w-7 h-7 flex items-center justify-center rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-800 font-bold active:scale-95 transition-all text-xs"
                                                >
                                                    <i className="bi bi-dash"></i>
                                                </button>
                                                <span className="w-8 text-center font-black text-amber-950 text-sm">
                                                    {jumlahTeguran}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => updateEvaluasiCounters(1, 0, { kelancaran: kategoriKesalahan.kelancaran + 1 })}
                                                    className="w-7 h-7 flex items-center justify-center rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold active:scale-95 transition-all text-xs"
                                                >
                                                    <i className="bi bi-plus"></i>
                                                </button>
                                            </div>
                                        </div>

                                        {/* Sub-kategori Teguran Quick Chips */}
                                        <div className="flex flex-wrap gap-1 pt-1 border-t border-amber-200/60">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    updateEvaluasiCounters(1, 0, { kelancaran: kategoriKesalahan.kelancaran + 1 });
                                                    handleAddQuickTag('Tawaqquf / Macet');
                                                }}
                                                className="text-[10px] font-semibold bg-white border border-amber-300 text-amber-900 hover:bg-amber-100 px-2 py-0.5 rounded-lg transition-colors"
                                            >
                                                + Tawaqquf/Macet ({kategoriKesalahan.kelancaran})
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    updateEvaluasiCounters(1, 0);
                                                    handleAddQuickTag('Ragu Awal Ayat');
                                                }}
                                                className="text-[10px] font-semibold bg-white border border-amber-300 text-amber-900 hover:bg-amber-100 px-2 py-0.5 rounded-lg transition-colors"
                                            >
                                                + Ragu Awal Ayat
                                            </button>
                                        </div>
                                    </div>

                                    {/* Counter Kesalahan / Khatha' */}
                                    <div className="p-3.5 rounded-xl border border-rose-200 bg-rose-50/40 space-y-2.5">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <span className="text-xs font-bold text-rose-900 flex items-center gap-1.5">
                                                    <i className="bi bi-x-circle-fill text-rose-500"></i>
                                                    Kesalahan (Tajwid / Huruf)
                                                </span>
                                                <p className="text-[10px] text-rose-700">Salah harakat, mad, makhraj, ayat tertukar</p>
                                            </div>
                                            {/* Counter Controls */}
                                            <div className="flex items-center gap-1 bg-white border border-rose-300 rounded-xl p-1 shadow-2xs">
                                                <button
                                                    type="button"
                                                    onClick={() => updateEvaluasiCounters(0, -1)}
                                                    className="w-7 h-7 flex items-center justify-center rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-800 font-bold active:scale-95 transition-all text-xs"
                                                >
                                                    <i className="bi bi-dash"></i>
                                                </button>
                                                <span className="w-8 text-center font-black text-rose-950 text-sm">
                                                    {jumlahKesalahan}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => updateEvaluasiCounters(0, 1, { tajwid: kategoriKesalahan.tajwid + 1 })}
                                                    className="w-7 h-7 flex items-center justify-center rounded-lg bg-rose-500 hover:bg-rose-600 text-white font-bold active:scale-95 transition-all text-xs"
                                                >
                                                    <i className="bi bi-plus"></i>
                                                </button>
                                            </div>
                                        </div>

                                        {/* Sub-kategori Kesalahan Quick Chips */}
                                        <div className="flex flex-wrap gap-1 pt-1 border-t border-rose-200/60">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    updateEvaluasiCounters(0, 1, { tajwid: kategoriKesalahan.tajwid + 1 });
                                                    handleAddQuickTag('Tajwid');
                                                }}
                                                className="text-[10px] font-semibold bg-white border border-rose-300 text-rose-900 hover:bg-rose-100 px-2 py-0.5 rounded-lg transition-colors"
                                            >
                                                + Tajwid ({kategoriKesalahan.tajwid})
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    updateEvaluasiCounters(0, 1, { makhraj: kategoriKesalahan.makhraj + 1 });
                                                    handleAddQuickTag('Makhraj Huruf');
                                                }}
                                                className="text-[10px] font-semibold bg-white border border-rose-300 text-rose-900 hover:bg-rose-100 px-2 py-0.5 rounded-lg transition-colors"
                                            >
                                                + Makhraj ({kategoriKesalahan.makhraj})
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    updateEvaluasiCounters(0, 1, { terlewat: kategoriKesalahan.terlewat + 1 });
                                                    handleAddQuickTag('Ayat Tertukar/Terlewat');
                                                }}
                                                className="text-[10px] font-semibold bg-white border border-rose-300 text-rose-900 hover:bg-rose-100 px-2 py-0.5 rounded-lg transition-colors"
                                            >
                                                + Tertukar ({kategoriKesalahan.terlewat})
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Rincian Kesalahan Spesifik & Quick Insertion Chips */}
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <label className="block text-xs font-semibold text-gray-700">
                                            Rincian Koreksi & Kesalahan Spesifik (Ayat / Tajwid)
                                        </label>
                                        <span className="text-[10px] text-gray-400">Klik chip untuk memasukkan cepat</span>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5">
                                        {[
                                            'Mad Thabi\'i/Mad Jaiz',
                                            'Ghunnah/Idgham',
                                            'Ikhfa Kurang Dengung',
                                            'Qalqalah Kurang Jelas',
                                            'Makhraj Ain/Haa',
                                            'Waqaf & Ibtida\'',
                                            'Harakat Tertukar',
                                            'Ayat Terlewat'
                                        ].map((chip) => (
                                            <button
                                                key={chip}
                                                type="button"
                                                onClick={() => handleAddQuickTag(chip)}
                                                className="text-[10px] font-medium bg-gray-50 border border-gray-200 text-gray-700 hover:bg-teal-50 hover:text-teal-800 hover:border-teal-300 px-2 py-1 rounded-lg transition-all"
                                            >
                                                + {chip}
                                            </button>
                                        ))}
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="Contoh: Ayat 4 mad jaiz kurang panjang; Ayat 12 tawaqquf..."
                                        value={rincianKesalahan}
                                        onChange={(e) => setRincianKesalahan(e.target.value)}
                                        className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs focus:ring-teal-500 focus:border-teal-500"
                                    />
                                </div>
                            </div>

                            {/* Penilaian, Estimasi Nilai Cerdas & Predikat */}
                            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="w-2.5 h-2.5 rounded-full bg-teal-500"></span>
                                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                                            Rekomendasi Nilai & Predikat Cerdas
                                        </label>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {autoPredikatEnabled && (
                                            <span className="text-[10px] text-teal-800 bg-teal-50 px-2.5 py-0.5 rounded-full font-bold border border-teal-200">
                                                Otomatis Sinkron Predikat
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Smart Grade Recommendation Box */}
                                <div className="p-4 rounded-xl border border-teal-200 bg-gradient-to-br from-teal-50/70 to-emerald-50/50 space-y-3">
                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center border shadow-xs ${
                                                effectiveNilai >= 85
                                                    ? 'bg-emerald-600 text-white border-emerald-700'
                                                    : effectiveNilai >= 75
                                                    ? 'bg-blue-600 text-white border-blue-700'
                                                    : effectiveNilai >= 65
                                                    ? 'bg-amber-500 text-white border-amber-600'
                                                    : 'bg-rose-600 text-white border-rose-700'
                                            }`}>
                                                <span className="text-xl font-black font-mono leading-none">{effectiveNilai}</span>
                                                <span className="text-[9px] font-bold uppercase tracking-wider opacity-80 mt-0.5">/ 100</span>
                                            </div>

                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-bold text-gray-800">
                                                        Estimasi Nilai Setoran:
                                                    </span>
                                                    <span className={`text-xs px-2 py-0.5 rounded-lg font-black border ${
                                                        smartScore.predikat === 'Sangat Lancar'
                                                            ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                                                            : smartScore.predikat === 'Lancar'
                                                            ? 'bg-blue-100 text-blue-900 border-blue-300'
                                                            : smartScore.predikat === 'Kurang Lancar'
                                                            ? 'bg-amber-100 text-amber-900 border-amber-300'
                                                            : 'bg-rose-100 text-rose-900 border-rose-300'
                                                    }`}>
                                                        {smartScore.predikat}
                                                    </span>
                                                </div>
                                                <p className="text-[11px] text-gray-600 mt-0.5">
                                                    Dihitung proporsional: <span className="font-semibold text-teal-800">{smartScore.surahCategoryText}</span> (QS. {currentSurah.name} • {smartScore.totalAyatDisetor} ayat disetor).
                                                </p>
                                            </div>
                                        </div>

                                        {/* Score Fine Tuning */}
                                        <div className="flex items-center gap-2 bg-white/90 p-2 rounded-xl border border-teal-200 shadow-2xs">
                                            <label className="text-[11px] font-bold text-gray-600 whitespace-nowrap">
                                                Ubah Manual:
                                            </label>
                                            <input
                                                type="number"
                                                min={0}
                                                max={100}
                                                value={effectiveNilai}
                                                onChange={(e) => setCustomNilai(Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
                                                className="w-16 p-1 text-center font-mono font-bold text-sm bg-gray-50 border border-teal-300 rounded-lg focus:ring-1 focus:ring-teal-500"
                                            />
                                            {customNilai !== null && customNilai !== smartScore.score && (
                                                <button
                                                    type="button"
                                                    onClick={() => setCustomNilai(null)}
                                                    className="text-[10px] text-teal-800 hover:text-teal-950 font-bold bg-teal-100 hover:bg-teal-200 px-2 py-1 rounded-lg transition-colors"
                                                    title="Kembalikan ke nilai rekomendasi sistem"
                                                >
                                                    Reset ({smartScore.score})
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Smart Hint & Explanation */}
                                    <div className="pt-2 border-t border-teal-200/60 text-xs text-teal-950 space-y-1">
                                        <div className="flex items-start gap-1.5">
                                            <i className="bi bi-lightbulb-fill text-amber-500 text-sm shrink-0 mt-0.5"></i>
                                            <p className="leading-relaxed">
                                                {smartScore.explanation}
                                            </p>
                                        </div>
                                        {smartScore.penaltiText && (
                                            <p className="text-[11px] text-amber-900 font-semibold pl-5">
                                                Rincian Penalti: {smartScore.penaltiText}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <label className="block text-xs font-bold text-gray-600">
                                            Pilihan Predikat
                                        </label>
                                    </div>
                                    <div className="flex gap-2 overflow-x-auto pb-1">
                                        <PredikatButton value="Sangat Lancar" label="Mumtaz (A)" color="green" />
                                        <PredikatButton value="Lancar" label="Jayyid (B)" color="blue" />
                                        <PredikatButton value="Kurang Lancar" label="Maqbul (C)" color="yellow" />
                                        <PredikatButton value="Belum Lulus" label="Rosib (D)" color="red" />
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <label className="block text-xs font-bold text-gray-600">
                                        Catatan Tambahan Ustadz / Muhaffizh
                                    </label>
                                    <textarea
                                        rows={2}
                                        placeholder="Catatan motivasi, adab halaqah, muroja'ah di rumah, atau evaluasi ayat spesifik..."
                                        value={catatan}
                                        onChange={(e) => setCatatan(e.target.value)}
                                        className="w-full p-3 bg-gray-50 border border-gray-300 rounded-xl text-sm focus:ring-teal-500 focus:border-teal-500"
                                    ></textarea>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="grid grid-cols-1 gap-3 pt-2 md:grid-cols-3">
                                <button
                                    type="button"
                                    onClick={() => handleSave(true)}
                                    disabled={isSaving || !santriId}
                                    className="py-3 bg-white border-2 border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-colors text-sm disabled:opacity-50"
                                >
                                    Simpan & Ganti Santri
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleSave(false)}
                                    disabled={isSaving || !santriId}
                                    className="py-3 bg-teal-600 text-white font-bold rounded-xl shadow-lg hover:bg-teal-700 hover:shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2 disabled:bg-gray-400 disabled:shadow-none disabled:transform-none"
                                >
                                    {isSaving ? 'Menyimpan...' : <><i className="bi bi-check-circle-fill"></i> Simpan Setoran</>}
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSaveAndNextSantri}
                                    disabled={isSaving || !santriId}
                                    className="py-3 bg-blue-600 text-white font-bold rounded-xl shadow hover:bg-blue-700 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:bg-gray-400"
                                >
                                    <i className="bi bi-skip-forward-fill"></i> Setoran Berikutnya
                                </button>
                            </div>
                        </div>
                    </div>

                    <MobileFilterDrawer
                        isOpen={isSantriPickerOpen}
                        onClose={() => setIsSantriPickerOpen(false)}
                        title="Pilih Santri Tahfizh"
                        onReset={handleResetSantriFilter}
                        onApply={() => setIsSantriPickerOpen(false)}
                    >
                        <div className="space-y-4">
                            {(settings.kelompokHalaqah || []).length > 0 && (
                                <select
                                    value={filterHalaqah}
                                    onChange={(e) => setFilterHalaqah(Number(e.target.value))}
                                    className="w-full bg-teal-50 border border-teal-200 text-xs font-semibold text-teal-900 rounded-lg p-3"
                                >
                                    <option value={0}>Semua Kelompok Halaqah</option>
                                    {(settings.kelompokHalaqah || []).map(h => (
                                        <option key={h.id} value={h.id}>{h.nama}</option>
                                    ))}
                                </select>
                            )}
                            <div className="grid grid-cols-2 gap-2">
                                <select
                                    value={filterJenjang}
                                    onChange={(e) => { setFilterJenjang(Number(e.target.value)); setFilterKelas(0); setFilterRombel(0); }}
                                    className="bg-gray-50 border border-gray-300 text-xs rounded-lg p-3"
                                >
                                    <option value={0}>Semua Jenjang</option>
                                    {settings.jenjang.map(j => <option key={j.id} value={j.id}>{j.nama}</option>)}
                                </select>
                                <select
                                    value={filterKelas}
                                    onChange={(e) => { setFilterKelas(Number(e.target.value)); setFilterRombel(0); }}
                                    disabled={!filterJenjang}
                                    className="bg-gray-50 border border-gray-300 text-xs rounded-lg p-3 disabled:bg-gray-100"
                                >
                                    <option value={0}>Semua Kelas</option>
                                    {availableKelas.map(k => <option key={k.id} value={k.id}>{k.nama}</option>)}
                                </select>
                            </div>
                            <select
                                value={filterRombel}
                                onChange={(e) => setFilterRombel(Number(e.target.value))}
                                disabled={!filterKelas}
                                className="w-full bg-gray-50 border border-gray-300 text-xs rounded-lg p-3 disabled:bg-gray-100"
                            >
                                <option value={0}>Semua Rombel</option>
                                {availableRombel.map(r => <option key={r.id} value={r.id}>{r.nama}</option>)}
                            </select>
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Cari nama / NIS..."
                                    value={searchSantri}
                                    onChange={(e) => setSearchSantri(e.target.value)}
                                    className="w-full p-3 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none text-sm"
                                />
                                <i className="bi bi-search absolute left-3 top-3.5 text-gray-400"></i>
                            </div>
                        </div>

                        <div className="mt-2 max-h-[42vh] overflow-y-auto border rounded-xl bg-gray-50 custom-scrollbar">
                            {filteredSantri.length > 0 ? (
                                <div className="divide-y divide-gray-100">
                                    {filteredSantri.map(s => (
                                        <button
                                            key={s.id}
                                            onClick={() => { setSantriId(s.id); setIsSantriPickerOpen(false); }}
                                            className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-colors ${santriId === s.id ? 'bg-teal-100 border-l-4 border-teal-600' : 'hover:bg-white'}`}
                                        >
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border shrink-0 ${santriId === s.id ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-gray-500 border-gray-300'}`}>
                                                {s.namaLengkap.charAt(0)}
                                            </div>
                                            <div className="min-w-0">
                                                <p className={`font-bold text-sm truncate ${santriId === s.id ? 'text-teal-900' : 'text-gray-700'}`}>{s.namaLengkap}</p>
                                                <p className="text-xs text-gray-500 truncate">{settings.rombel.find(r => r.id === s.rombelId)?.nama || 'Tanpa Kelas'}</p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <div className="p-8 text-center text-gray-500 text-sm">
                                    <i className="bi bi-search text-2xl mb-2 block opacity-50"></i>
                                    Tidak ada data
                                </div>
                            )}
                        </div>
                    </MobileFilterDrawer>

                    {/* Mobile Bottom Action Bar */}
                    <div className="lg:hidden fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200 shadow-lg z-50">
                        <button
                            type="button"
                            onClick={() => handleSave(false)}
                            disabled={isSaving || !santriId}
                            className="w-full py-3 bg-teal-600 text-white font-bold rounded-xl shadow flex items-center justify-center gap-2 disabled:bg-gray-400"
                        >
                            {isSaving ? 'Menyimpan...' : <><i className="bi bi-save"></i> Simpan Setoran</>}
                        </button>
                    </div>
                </div>
            )}

            {/* Quran Mushaf Viewer Modal */}
            <QuranMushafViewer
                isOpen={isMushafOpen}
                onClose={() => setIsMushafOpen(false)}
                initialSurah={currentSurah.name}
                initialAyatAwal={ayatStart}
                initialAyatAkhir={ayatEnd}
                onSelectAyatRange={handleSelectAyatFromMushaf}
            />
        </div>
    );
};
