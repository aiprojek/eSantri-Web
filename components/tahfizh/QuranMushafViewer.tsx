import React, { useState, useEffect, useMemo, useRef } from 'react';
import { QURAN_DATA, QURAN_JUZ_DATA, SurahDef, getSurahByName, getSurahByNumber, getJuzForSurah } from '../../data/quran';
import { 
    fetchSurahWithTranslation, 
    getQuranOfflineStatus, 
    downloadAllSurahsOffline, 
    clearOfflineQuran, 
    QuranOfflineStatus,
    AyahData 
} from '../../services/quranService';

export interface AyahAssessment {
    ayahNumber: number;
    teguranCount: number;
    kesalahanCount: number;
    notes: string[];
    tajwidCount?: number;
    makhrajCount?: number;
    kelancaranCount?: number;
    terlewatCount?: number;
}

interface QuranMushafViewerProps {
    isOpen?: boolean;
    onClose?: () => void;
    initialSurah?: string | number;
    initialAyatAwal?: number;
    initialAyatAkhir?: number;
    initialAyahAssessments?: Record<number, AyahAssessment>;
    onSelectAyatRange?: (
        surahName: string, 
        ayatAwal: number, 
        ayatAkhir: number,
        assessmentData?: {
            totalTeguran: number;
            totalKesalahan: number;
            catatanOtomatis: string;
            rincianKesalahan: string;
            kategoriKesalahan: { tajwid: number; makhraj: number; kelancaran: number; terlewat: number };
        }
    ) => void;
    isStandalonePage?: boolean;
}

// Helper to strip Basmallah from the 1st ayah of surahs (since Basmallah header is already displayed separately)
export const cleanBasmallahFromAyahText = (text: string, surahNum: number, ayahNum: number): string => {
    if (surahNum === 1 || surahNum === 9 || ayahNum !== 1) {
        return text;
    }
    const bismillahRegex = /^(?:بِسْمِ\s*[\u0600-\u06FF\s]*?الرَّحِي[مِ|مْ]|بِسْمِ\s*ٱللَّهِ\s*ٱلرَّحْمَٰنِ\s*ٱلرَّحِيمِ|بِسْمِ\s*اللَّهِ\s*الرَّحْمَٰنِ\s*الرَّحِيمِ|بِسْمِ\s*ٱللَّهِ\s*ٱلرَّحْمَـٰنِ\s*ٱلرَّحِيمِ|بِسْمِ\s*اللّٰهِ\s*الرَّحْمٰنِ\s*الرَّحِيْمِ|بِسْمِ\s*اللهِ\s*الرَّحْمٰنِ\s*الرَّحِيمِ)\s*/u;
    const cleaned = text.replace(bismillahRegex, '').trim();
    return cleaned.length > 0 ? cleaned : text;
};

export const cleanBasmallahFromTranslationText = (translation: string, surahNum: number, ayahNum: number): string => {
    if (surahNum === 1 || surahNum === 9 || ayahNum !== 1 || !translation) {
        return translation;
    }
    const idRegex = /^(?:Dengan\s+(?:menyebut\s+)?nama\s+Allah\s+Yang\s+Maha\s+Pengasih[,\s]+Maha\s+Penyayang[.\s]*|Dengan\s+nama\s+Allah[,\s]+Maha\s+Pengasih[,\s]+Maha\s+Penyayang[.\s]*)/i;
    const cleaned = translation.replace(idRegex, '').trim();
    return cleaned.length > 0 ? cleaned : translation;
};

export const QuranMushafViewer: React.FC<QuranMushafViewerProps> = ({
    isOpen = true,
    onClose,
    initialSurah,
    initialAyatAwal = 1,
    initialAyatAkhir = 10,
    initialAyahAssessments,
    onSelectAyatRange,
    isStandalonePage = false,
}) => {
    // Current Surah Selection
    const [selectedSurahNumber, setSelectedSurahNumber] = useState<number>(() => {
        if (typeof initialSurah === 'number') return initialSurah;
        if (typeof initialSurah === 'string') {
            const found = getSurahByName(initialSurah);
            return found ? found.number : 1;
        }
        return 78; // Default to An-Naba'
    });

    const [selectedJuz, setSelectedJuz] = useState<number>(30);
    const [searchSurahQuery, setSearchSurahQuery] = useState<string>('');

    const [ayatRange, setAyatRange] = useState<{ start: number; end: number }>({
        start: initialAyatAwal,
        end: initialAyatAkhir,
    });

    // Per-Ayah Assessment state: map of ayahNumber -> AyahAssessment
    const [assessments, setAssessments] = useState<Record<number, AyahAssessment>>(() => initialAyahAssessments || {});
    const [editingAyahNote, setEditingAyahNote] = useState<number | null>(null);
    const [tempNoteText, setTempNoteText] = useState<string>('');

    const [fontSize, setFontSize] = useState<number>(24);
    const [showTranslation, setShowTranslation] = useState<boolean>(true);
    const [loading, setLoading] = useState<boolean>(false);
    const [ayahs, setAyahs] = useState<AyahData[]>([]);
    const [surahMeta, setSurahMeta] = useState<{ name: string; englishName: string; numberOfAyahs: number } | null>(null);

    // Offline Quran Downloader State
    const [offlineStatus, setOfflineStatus] = useState<QuranOfflineStatus>({ downloadedCount: 0, totalSurahs: 114, isComplete: false });
    const [isDownloadingAll, setIsDownloadingAll] = useState<boolean>(false);
    const [downloadProgress, setDownloadProgress] = useState<{ current: number; total: number; percent: number; currentSurahName: string }>({
        current: 0,
        total: 114,
        percent: 0,
        currentSurahName: ''
    });
    const abortControllerRef = useRef<AbortController | null>(null);
    const [showOfflineModal, setShowOfflineModal] = useState<boolean>(false);

    // Helpers to manage per-ayah assessments
    const updateAyahCounter = (
        ayahNum: number, 
        teguranDelta: number, 
        kesalahanDelta: number, 
        category?: 'tajwid' | 'makhraj' | 'kelancaran' | 'terlewat',
        reasonNote?: string
    ) => {
        setAssessments(prev => {
            const current = prev[ayahNum] || {
                ayahNumber: ayahNum,
                teguranCount: 0,
                kesalahanCount: 0,
                notes: [],
                tajwidCount: 0,
                makhrajCount: 0,
                kelancaranCount: 0,
                terlewatCount: 0,
            };

            const newTeguran = Math.max(0, current.teguranCount + teguranDelta);
            const newKesalahan = Math.max(0, current.kesalahanCount + kesalahanDelta);
            const newNotes = [...current.notes];
            
            if (reasonNote && !newNotes.includes(reasonNote)) {
                newNotes.push(reasonNote);
            }

            const updated: AyahAssessment = {
                ...current,
                teguranCount: newTeguran,
                kesalahanCount: newKesalahan,
                notes: newNotes,
                tajwidCount: Math.max(0, (current.tajwidCount || 0) + (category === 'tajwid' ? 1 : 0)),
                makhrajCount: Math.max(0, (current.makhrajCount || 0) + (category === 'makhraj' ? 1 : 0)),
                kelancaranCount: Math.max(0, (current.kelancaranCount || 0) + (category === 'kelancaran' ? 1 : 0)),
                terlewatCount: Math.max(0, (current.terlewatCount || 0) + (category === 'terlewat' ? 1 : 0)),
            };

            if (updated.teguranCount === 0 && updated.kesalahanCount === 0 && updated.notes.length === 0) {
                const next = { ...prev };
                delete next[ayahNum];
                return next;
            }

            return {
                ...prev,
                [ayahNum]: updated,
            };
        });
    };

    const addCustomNoteToAyah = (ayahNum: number, note: string) => {
        if (!note.trim()) return;
        setAssessments(prev => {
            const current = prev[ayahNum] || {
                ayahNumber: ayahNum,
                teguranCount: 0,
                kesalahanCount: 0,
                notes: [],
            };
            return {
                ...prev,
                [ayahNum]: {
                    ...current,
                    notes: current.notes.includes(note.trim()) ? current.notes : [...current.notes, note.trim()]
                }
            };
        });
        setEditingAyahNote(null);
        setTempNoteText('');
    };

    const removeNoteFromAyah = (ayahNum: number, noteIndex: number) => {
        setAssessments(prev => {
            const current = prev[ayahNum];
            if (!current) return prev;
            const newNotes = current.notes.filter((_, idx) => idx !== noteIndex);
            return {
                ...prev,
                [ayahNum]: {
                    ...current,
                    notes: newNotes
                }
            };
        });
    };

    const handleClearAllAssessments = () => {
        setAssessments({});
    };

    // Calculate aggregated evaluation data
    const assessmentSummary = useMemo(() => {
        let totalTeguran = 0;
        let totalKesalahan = 0;
        let tajwid = 0;
        let makhraj = 0;
        let kelancaran = 0;
        let terlewat = 0;
        const notesList: string[] = [];
        const rincianList: string[] = [];

        const surahObj = getSurahByNumber(selectedSurahNumber);
        const surahNameDisplay = surahObj?.name ? `Surat ${surahObj.name}` : (surahMeta?.name ? `Surat ${surahMeta.name}` : 'Surat');

        Object.values(assessments).forEach(item => {
            totalTeguran += item.teguranCount;
            totalKesalahan += item.kesalahanCount;
            tajwid += item.tajwidCount || 0;
            makhraj += item.makhrajCount || 0;
            kelancaran += item.kelancaranCount || 0;
            terlewat += item.terlewatCount || 0;

            const ayahLabel = `${surahNameDisplay} ayat ${item.ayahNumber}`;
            const parts: string[] = [];
            if (item.teguranCount > 0) parts.push(`${item.teguranCount}x teguran`);
            if (item.kesalahanCount > 0) parts.push(`${item.kesalahanCount}x salah`);
            if (item.notes.length > 0) parts.push(item.notes.join(', '));

            if (parts.length > 0) {
                notesList.push(`${ayahLabel}: ${parts.join(' - ')}`);
                rincianList.push(`${ayahLabel} (${parts.join(', ')})`);
            }
        });

        return {
            totalTeguran,
            totalKesalahan,
            catatanOtomatis: notesList.join('; '),
            rincianKesalahan: rincianList.join('; '),
            kategoriKesalahan: { tajwid, makhraj, kelancaran, terlewat },
            assessedAyahsCount: Object.keys(assessments).length,
        };
    }, [assessments, selectedSurahNumber, surahMeta]);

    // Load Offline Status on mount
    const checkStatus = async () => {
        const stat = await getQuranOfflineStatus();
        setOfflineStatus(stat);
    };

    useEffect(() => {
        checkStatus();
    }, []);

    // Sync when props change
    useEffect(() => {
        if (isOpen) {
            let sNum = 1;
            if (typeof initialSurah === 'number') {
                sNum = initialSurah;
            } else if (typeof initialSurah === 'string') {
                const found = getSurahByName(initialSurah);
                if (found) sNum = found.number;
            }
            setSelectedSurahNumber(sNum);
            setAyatRange({ start: initialAyatAwal || 1, end: initialAyatAkhir || 10 });
        }
    }, [isOpen, initialSurah, initialAyatAwal, initialAyatAkhir]);

    // Fetch Surah Ayahs via quranService (IndexedDB + API)
    useEffect(() => {
        if (!isOpen) return;

        let isMounted = true;
        setLoading(true);

        fetchSurahWithTranslation(selectedSurahNumber)
            .then((data) => {
                if (!isMounted) return;
                const cleanedAyahs: AyahData[] = data.ayahs.map(a => ({
                    numberInSurah: a.numberInSurah,
                    text: cleanBasmallahFromAyahText(a.text, selectedSurahNumber, a.numberInSurah),
                    translation: cleanBasmallahFromTranslationText(a.translation || '', selectedSurahNumber, a.numberInSurah),
                    juz: a.juz
                }));
                setAyahs(cleanedAyahs);
                setSurahMeta({
                    name: data.name,
                    englishName: data.englishName,
                    numberOfAyahs: data.numberOfAyahs,
                });
                setLoading(false);
                checkStatus();
            })
            .catch((err) => {
                if (!isMounted) return;
                console.error('Failed to load surah:', err);
                // Fallback offline dummy view if completely offline with no cache
                const meta = getSurahByNumber(selectedSurahNumber);
                if (meta) {
                    const fallbackAyahs: AyahData[] = Array.from({ length: meta.ayat }, (_, i) => ({
                        numberInSurah: i + 1,
                        text: `(Ayat ${i + 1} belum terunduh secara lokal. Silakan klik tombol "Unduh & Simpan Lokal" saat terhubung internet.)`,
                        translation: `Ayat ${i + 1}`,
                    }));
                    setAyahs(fallbackAyahs);
                    setSurahMeta({
                        name: meta.name,
                        englishName: meta.name,
                        numberOfAyahs: meta.ayat,
                    });
                }
                setLoading(false);
            });

        return () => {
            isMounted = false;
        };
    }, [selectedSurahNumber, isOpen]);

    // Filtered Surah list by search or juz
    const filteredSurahList = useMemo(() => {
        return QURAN_DATA.filter((s) => {
            if (!searchSurahQuery) return true;
            const q = searchSurahQuery.toLowerCase();
            return (
                s.name.toLowerCase().includes(q) ||
                s.number.toString().includes(q)
            );
        });
    }, [searchSurahQuery]);

    // Handle Start Offline Download
    const handleStartDownloadAll = async () => {
        setIsDownloadingAll(true);
        abortControllerRef.current = new AbortController();

        try {
            await downloadAllSurahsOffline((p) => {
                setDownloadProgress(p);
            }, abortControllerRef.current.signal);
            await checkStatus();
            setShowOfflineModal(false);
        } catch (err: any) {
            console.warn('Download offline quran interrupted', err);
        } finally {
            setIsDownloadingAll(false);
        }
    };

    const handleCancelDownload = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        setIsDownloadingAll(false);
    };

    const handleClearOffline = async () => {
        if (window.confirm('Hapus seluruh simpanan data Al-Qur\'an dari memori lokal?')) {
            await clearOfflineQuran();
            await checkStatus();
        }
    };

    if (!isOpen) return null;

    const currentSurah = getSurahByNumber(selectedSurahNumber);

    const content = (
        <div className={`flex flex-col bg-white overflow-hidden ${isStandalonePage ? 'rounded-2xl border border-gray-200 shadow-sm h-[82vh]' : 'rounded-2xl shadow-2xl w-full max-w-5xl h-[92vh]'}`}>
            {/* Top Bar / Header */}
            <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white p-4 sm:px-6 flex flex-wrap justify-between items-center gap-3 shrink-0 shadow-md">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300 font-serif text-xl font-bold shadow-inner">
                        📖
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="font-bold text-base sm:text-lg text-white">
                                Mushaf Al-Qur'an & Penilaian Setoran
                            </h3>
                            {offlineStatus.isComplete ? (
                                <span className="bg-emerald-500/30 border border-emerald-400/40 text-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                                    <i className="bi bi-cloud-check-fill text-emerald-300"></i> Offline 114 Surah
                                </span>
                            ) : (
                                <span className="bg-amber-500/20 border border-amber-400/30 text-amber-200 text-[10px] font-medium px-2 py-0.5 rounded-full flex items-center gap-1">
                                    <i className="bi bi-hdd-fill"></i> {offlineStatus.downloadedCount}/114 Tersimpan
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-teal-200/80">
                            {currentSurah ? `Surah ke-${currentSurah.number} • ${currentSurah.name} • ${currentSurah.ayat} Ayat • Juz ${getJuzForSurah(currentSurah.number, 1)}` : "Teks Mushaf Standar Kemenag & Utsmani"}
                        </p>
                    </div>
                </div>

                {/* Right Header Action Buttons */}
                <div className="flex items-center gap-2">
                    {/* Offline Storage Manager Button */}
                    <button
                        type="button"
                        onClick={() => setShowOfflineModal(true)}
                        className="text-xs bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-200 px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all shadow-xs"
                        title="Unduh & Kelola Data Al-Qur'an Offline"
                    >
                        <i className="bi bi-download"></i>
                        <span className="hidden sm:inline">Unduh & Simpan Lokal</span>
                    </button>

                    {onSelectAyatRange && (
                        <button
                            type="button"
                            onClick={() => {
                                if (currentSurah) {
                                    onSelectAyatRange(currentSurah.name, ayatRange.start, ayatRange.end, assessmentSummary);
                                    if (onClose) onClose();
                                }
                            }}
                            className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-xs font-bold px-3.5 py-1.5 rounded-xl shadow-md flex items-center gap-1.5 transition-all"
                        >
                            <i className="bi bi-check2-circle text-sm"></i>
                            <span>Terapkan Nilai (Ayat {ayatRange.start}-{ayatRange.end})</span>
                        </button>
                    )}

                    {onClose && (
                        <button
                            type="button"
                            onClick={onClose}
                            className="text-gray-300 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-xl transition-colors"
                        >
                            <i className="bi bi-x-lg"></i>
                        </button>
                    )}
                </div>
            </div>

            {/* Assessment Quick Indicator Bar */}
            {(assessmentSummary.totalTeguran > 0 || assessmentSummary.totalKesalahan > 0 || assessmentSummary.assessedAyahsCount > 0) && (
                <div className="bg-gradient-to-r from-amber-500/10 via-rose-500/10 to-teal-500/10 border-b border-amber-200 px-4 py-2 flex flex-wrap items-center justify-between gap-2 shrink-0">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="font-bold text-gray-800 flex items-center gap-1.5">
                            <i className="bi bi-clipboard-check-fill text-teal-600"></i> Penilaian di Ayat Terpilih:
                        </span>
                        <span className="bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-md font-bold">
                            ⚠️ {assessmentSummary.totalTeguran} Teguran
                        </span>
                        <span className="bg-rose-100 text-rose-900 border border-rose-300 px-2 py-0.5 rounded-md font-bold">
                            ❌ {assessmentSummary.totalKesalahan} Kesalahan
                        </span>
                        {assessmentSummary.catatanOtomatis && (
                            <span className="text-[11px] text-gray-600 truncate max-w-xs md:max-w-md italic">
                                ({assessmentSummary.catatanOtomatis})
                            </span>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={handleClearAllAssessments}
                        className="text-[11px] text-rose-700 hover:text-rose-900 font-semibold px-2 py-0.5 rounded bg-rose-50 hover:bg-rose-100 border border-rose-200"
                    >
                        <i className="bi bi-trash mr-1"></i>Reset Penilaian Ayat
                    </button>
                </div>
            )}

            {/* Offline Manager Modal / Banner */}
            {showOfflineModal && (
                <div className="bg-amber-50 border-b border-amber-200 p-4 shrink-0 animate-slide-down">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <div>
                            <h4 className="text-xs font-extrabold text-amber-950 uppercase tracking-wider flex items-center gap-1.5">
                                <i className="bi bi-hdd-network-fill text-amber-700"></i>
                                Penyimpanan Al-Qur'an 100% Offline
                            </h4>
                            <p className="text-xs text-amber-900 mt-0.5">
                                Unduh seluruh 114 Surah beserta terjemahan ke memori browser (IndexedDB). Setelah diunduh, Mushaf dapat dibuka tanpa koneksi internet sama sekali.
                            </p>
                            <div className="flex items-center gap-3 mt-1 text-[11px] text-amber-800 font-mono">
                                <span>Status: <strong>{offlineStatus.downloadedCount} / 114 Surah</strong></span>
                                {offlineStatus.storageUsedKb && <span>• Ukuran: ~{offlineStatus.storageUsedKb} KB</span>}
                                {offlineStatus.lastUpdated && <span>• Terakhir: {offlineStatus.lastUpdated}</span>}
                            </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                            {isDownloadingAll ? (
                                <button
                                    type="button"
                                    onClick={handleCancelDownload}
                                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs"
                                >
                                    Batalkan
                                </button>
                            ) : (
                                <>
                                    <button
                                        type="button"
                                        onClick={handleStartDownloadAll}
                                        className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5 transition-colors"
                                    >
                                        <i className="bi bi-cloud-arrow-down-fill"></i>
                                        <span>{offlineStatus.isComplete ? 'Perbarui Semua Surah' : 'Unduh Semua 114 Surah'}</span>
                                    </button>
                                    {offlineStatus.downloadedCount > 0 && (
                                        <button
                                            type="button"
                                            onClick={handleClearOffline}
                                            className="px-3 py-2 bg-white text-rose-700 hover:bg-rose-50 border border-rose-300 font-bold text-xs rounded-xl transition-colors"
                                            title="Bersihkan memori lokal"
                                        >
                                            <i className="bi bi-trash"></i>
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => setShowOfflineModal(false)}
                                        className="px-3 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold text-xs rounded-xl transition-colors"
                                    >
                                        Tutup
                                    </button>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Progress Bar */}
                    {isDownloadingAll && (
                        <div className="mt-3 bg-white p-3 rounded-xl border border-amber-300 space-y-1.5 shadow-xs">
                            <div className="flex justify-between items-center text-xs font-bold text-amber-950">
                                <span>Mengunduh: {downloadProgress.currentSurahName}</span>
                                <span className="font-mono text-emerald-800">{downloadProgress.percent}% ({downloadProgress.current}/{downloadProgress.total})</span>
                            </div>
                            <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-emerald-600 rounded-full transition-all duration-200"
                                    style={{ width: `${downloadProgress.percent}%` }}
                                ></div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Filter and Control Bar */}
            <div className="p-3 bg-amber-50/50 border-b border-amber-100 flex flex-wrap items-center justify-between gap-3 shrink-0">
                {/* Surah Selector Dropdown & Search */}
                <div className="flex flex-wrap items-center gap-2 flex-grow">
                    <div className="w-44 sm:w-56">
                        <select
                            value={selectedSurahNumber}
                            onChange={(e) => {
                                const num = Number(e.target.value);
                                setSelectedSurahNumber(num);
                                setAyatRange({ start: 1, end: 10 });
                            }}
                            className="w-full p-2 bg-white border border-amber-300 rounded-xl text-xs sm:text-sm font-bold text-emerald-950 focus:ring-2 focus:ring-emerald-500 shadow-xs"
                        >
                            {QURAN_DATA.map((s) => (
                                <option key={s.number} value={s.number}>
                                    {s.number}. {s.name} - {s.ayat} Ayat
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Quick Juz Jump Dropdown */}
                    <div className="w-28 sm:w-36">
                        <select
                            value={selectedJuz}
                            onChange={(e) => {
                                const jNum = Number(e.target.value);
                                setSelectedJuz(jNum);
                                const foundJuz = QURAN_JUZ_DATA.find(j => j.juz === jNum);
                                if (foundJuz) {
                                    setSelectedSurahNumber(foundJuz.surahStart);
                                    setAyatRange({ start: foundJuz.ayatStart, end: Math.min(foundJuz.ayatStart + 9, getSurahByNumber(foundJuz.surahStart)?.ayat || 10) });
                                }
                            }}
                            className="w-full p-2 bg-white border border-amber-300 rounded-xl text-xs font-semibold text-emerald-900 shadow-xs"
                        >
                            {Array.from({ length: 30 }, (_, i) => 30 - i).map((j) => (
                                <option key={j} value={j}>
                                    Juz {j} {j === 30 ? "(Juz 'Amma)" : j === 29 ? "(Tabarak)" : ""}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Surah Navigation Buttons */}
                    <div className="flex items-center gap-1">
                        <button
                            type="button"
                            disabled={selectedSurahNumber <= 1}
                            onClick={() => {
                                setSelectedSurahNumber(prev => Math.max(1, prev - 1));
                                setAyatRange({ start: 1, end: 10 });
                            }}
                            className="p-2 rounded-xl bg-white border border-amber-200 text-gray-700 hover:bg-amber-100 disabled:opacity-40 text-xs font-bold shadow-xs"
                            title="Surah Sebelumnya"
                        >
                            <i className="bi bi-chevron-left"></i>
                        </button>
                        <button
                            type="button"
                            disabled={selectedSurahNumber >= 114}
                            onClick={() => {
                                setSelectedSurahNumber(prev => Math.min(114, prev + 1));
                                setAyatRange({ start: 1, end: 10 });
                            }}
                            className="p-2 rounded-xl bg-white border border-amber-200 text-gray-700 hover:bg-amber-100 disabled:opacity-40 text-xs font-bold shadow-xs"
                            title="Surah Selanjutnya"
                        >
                            <i className="bi bi-chevron-right"></i>
                        </button>
                    </div>
                </div>

                {/* Ayat Range Selection Inputs & Font Controls */}
                <div className="flex flex-wrap items-center gap-2">
                    {/* Range Ayat Inputs */}
                    <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-amber-300 shadow-xs text-xs">
                        <span className="font-bold text-emerald-900 px-1 text-[11px]">Ayat:</span>
                        <input
                            type="number"
                            min={1}
                            max={surahMeta?.numberOfAyahs || 286}
                            value={ayatRange.start}
                            onChange={(e) => setAyatRange(r => ({ ...r, start: Math.max(1, Number(e.target.value)) }))}
                            className="w-12 p-1 text-center bg-amber-50 border border-amber-200 rounded font-bold text-xs"
                        />
                        <span className="text-gray-400">s/d</span>
                        <input
                            type="number"
                            min={1}
                            max={surahMeta?.numberOfAyahs || 286}
                            value={ayatRange.end}
                            onChange={(e) => setAyatRange(r => ({ ...r, end: Math.min(surahMeta?.numberOfAyahs || 286, Number(e.target.value)) }))}
                            className="w-12 p-1 text-center bg-amber-50 border border-amber-200 rounded font-bold text-xs"
                        />
                    </div>

                    {/* Font Size Selector */}
                    <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-amber-200 shadow-xs">
                        <button
                            type="button"
                            onClick={() => setFontSize(s => Math.max(18, s - 3))}
                            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-xs font-bold text-gray-700"
                            title="Kecilkan Huruf"
                        >
                            A-
                        </button>
                        <span className="text-[11px] font-mono font-bold text-gray-600 px-1">{fontSize}px</span>
                        <button
                            type="button"
                            onClick={() => setFontSize(s => Math.min(42, s + 3))}
                            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-xs font-bold text-gray-700"
                            title="Besarkan Huruf"
                        >
                            A+
                        </button>
                    </div>

                    {/* Translation Toggle */}
                    <button
                        type="button"
                        onClick={() => setShowTranslation(!showTranslation)}
                        className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all shadow-xs ${
                            showTranslation
                                ? 'bg-teal-700 text-white border-teal-800'
                                : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                        }`}
                        title="Tampilkan / Sembunyikan Terjemahan Bahasa Indonesia"
                    >
                        <i className="bi bi-translate mr-1"></i> Terjemahan
                    </button>
                </div>
            </div>

            {/* Ayat Body Scroll Area */}
            <div className="flex-grow overflow-y-auto p-4 sm:p-6 bg-[#fcfaf5] space-y-4">
                {loading ? (
                    <div className="flex flex-col items-center justify-center h-64 space-y-3">
                        <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-sm font-semibold text-emerald-800">Memuat teks surah Utsmani...</p>
                    </div>
                ) : (
                    <div>
                        {/* Bismillah Header (except At-Taubah and Al-Fatihah) */}
                        {selectedSurahNumber !== 9 && selectedSurahNumber !== 1 && (
                            <div className="text-center py-4 mb-6 border-b border-amber-200">
                                <p className="font-serif text-2xl sm:text-3xl text-emerald-950 leading-loose" style={{ fontFamily: "'Traditional Arabic', 'Amiri', serif" }}>
                                    بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
                                </p>
                            </div>
                        )}

                        {/* Special notice for Surah At-Taubah (No Basmallah) */}
                        {selectedSurahNumber === 9 && (
                            <div className="text-center py-2.5 px-4 mb-6 bg-amber-100/70 border border-amber-300 rounded-xl text-amber-900 text-xs font-semibold">
                                <i className="bi bi-info-circle-fill mr-1.5 text-amber-700"></i>
                                Surah At-Taubah (Bara'ah) dibaca tanpa diawali kalimat Basmallah sesuai tuntunan mushaf resmi Utsmani.
                            </div>
                        )}

                        <div className="space-y-4">
                            {ayahs.map((ayah) => {
                                const isHighlighted = ayah.numberInSurah >= ayatRange.start && ayah.numberInSurah <= ayatRange.end;
                                const ayahAssessment = assessments[ayah.numberInSurah] || {
                                    ayahNumber: ayah.numberInSurah,
                                    teguranCount: 0,
                                    kesalahanCount: 0,
                                    notes: []
                                };
                                const hasEvaluation = ayahAssessment.teguranCount > 0 || ayahAssessment.kesalahanCount > 0 || ayahAssessment.notes.length > 0;

                                return (
                                    <div
                                        key={ayah.numberInSurah}
                                        id={`ayah-${ayah.numberInSurah}`}
                                        className={`p-4 rounded-2xl transition-all border ${
                                            isHighlighted
                                                ? 'bg-amber-50/90 border-amber-400 shadow-md ring-2 ring-emerald-500/20'
                                                : 'bg-white border-amber-100 hover:border-amber-300 hover:bg-amber-50/30 shadow-sm'
                                        }`}
                                    >
                                        {/* Ayah Header & Arabic Text */}
                                        <div className="flex justify-between items-start gap-4">
                                            {/* Ayat Number Badge & Selection Click */}
                                            <div className="shrink-0 flex flex-col items-center gap-1.5">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        if (ayah.numberInSurah < ayatRange.start) {
                                                            setAyatRange(r => ({ ...r, start: ayah.numberInSurah }));
                                                        } else {
                                                            setAyatRange(r => ({ ...r, end: ayah.numberInSurah }));
                                                        }
                                                    }}
                                                    title="Klik untuk memilih rentang setoran"
                                                    className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold font-mono border transition-all ${
                                                        isHighlighted
                                                            ? 'bg-emerald-700 text-amber-200 border-emerald-800 shadow-sm ring-2 ring-amber-400/40'
                                                            : 'bg-amber-100/80 text-emerald-900 border-amber-200 hover:bg-amber-200'
                                                    }`}
                                                >
                                                    {ayah.numberInSurah}
                                                </button>
                                                {isHighlighted && (
                                                    <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100/80 px-1 rounded">
                                                        Setoran
                                                    </span>
                                                )}
                                            </div>

                                            {/* Arabic Text */}
                                            <div className="flex-grow text-right">
                                                <p
                                                    className="text-gray-900 leading-[2.4] tracking-wide"
                                                    style={{
                                                        fontSize: `${fontSize}px`,
                                                        fontFamily: "'Amiri', 'Traditional Arabic', 'Scheherazade New', serif",
                                                        direction: 'rtl'
                                                    }}
                                                >
                                                    {ayah.text}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Indonesian Translation */}
                                        {showTranslation && ayah.translation && (
                                            <div className="mt-3 pt-2.5 border-t border-amber-200/50 text-xs sm:text-sm text-gray-600 italic">
                                                {ayah.translation}
                                            </div>
                                        )}

                                        {/* PER-AYAH ASSESSMENT FACILITY (Teguran, Kesalahan, Catatan Ayat) */}
                                        <div className="mt-3 pt-2.5 border-t border-gray-100 flex flex-wrap items-center justify-between gap-2">
                                            {/* Counter Controls */}
                                            <div className="flex flex-wrap items-center gap-2">
                                                {/* Teguran Counter */}
                                                <div className="flex items-center gap-1 bg-amber-50 border border-amber-300 rounded-xl p-1 shadow-2xs">
                                                    <span className="text-[11px] font-bold text-amber-900 px-1.5 flex items-center gap-1">
                                                        <i className="bi bi-exclamation-triangle-fill text-amber-600 text-xs"></i>
                                                        Teguran:
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => updateAyahCounter(ayah.numberInSurah, -1, 0)}
                                                        disabled={ayahAssessment.teguranCount === 0}
                                                        className="w-6 h-6 flex items-center justify-center rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold disabled:opacity-30 text-xs"
                                                    >
                                                        -
                                                    </button>
                                                    <span className="w-5 text-center font-black text-amber-950 text-xs font-mono">
                                                        {ayahAssessment.teguranCount}
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => updateAyahCounter(ayah.numberInSurah, 1, 0, 'kelancaran')}
                                                        className="w-6 h-6 flex items-center justify-center rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs"
                                                    >
                                                        +
                                                    </button>
                                                </div>

                                                {/* Kesalahan Counter */}
                                                <div className="flex items-center gap-1 bg-rose-50 border border-rose-300 rounded-xl p-1 shadow-2xs">
                                                    <span className="text-[11px] font-bold text-rose-900 px-1.5 flex items-center gap-1">
                                                        <i className="bi bi-x-circle-fill text-rose-600 text-xs"></i>
                                                        Salah:
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => updateAyahCounter(ayah.numberInSurah, 0, -1)}
                                                        disabled={ayahAssessment.kesalahanCount === 0}
                                                        className="w-6 h-6 flex items-center justify-center rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-900 font-bold disabled:opacity-30 text-xs"
                                                    >
                                                        -
                                                    </button>
                                                    <span className="w-5 text-center font-black text-rose-950 text-xs font-mono">
                                                        {ayahAssessment.kesalahanCount}
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => updateAyahCounter(ayah.numberInSurah, 0, 1, 'tajwid')}
                                                        className="w-6 h-6 flex items-center justify-center rounded-lg bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs"
                                                    >
                                                        +
                                                    </button>
                                                </div>

                                                {/* Quick Reason Chips */}
                                                <div className="flex flex-wrap items-center gap-1">
                                                    <button
                                                        type="button"
                                                        onClick={() => updateAyahCounter(ayah.numberInSurah, 1, 0, 'kelancaran', 'Tawaqquf/Macet')}
                                                        className="text-[10px] font-semibold bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-lg transition-colors"
                                                    >
                                                        + Macet
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => updateAyahCounter(ayah.numberInSurah, 0, 1, 'tajwid', 'Tajwid')}
                                                        className="text-[10px] font-semibold bg-white hover:bg-rose-100 text-rose-900 border border-rose-300 px-2 py-0.5 rounded-lg transition-colors"
                                                    >
                                                        + Tajwid
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => updateAyahCounter(ayah.numberInSurah, 0, 1, 'makhraj', 'Makhraj')}
                                                        className="text-[10px] font-semibold bg-white hover:bg-rose-100 text-rose-900 border border-rose-300 px-2 py-0.5 rounded-lg transition-colors"
                                                    >
                                                        + Makhraj
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => updateAyahCounter(ayah.numberInSurah, 0, 1, 'terlewat', 'Ayat Tertukar')}
                                                        className="text-[10px] font-semibold bg-white hover:bg-rose-100 text-rose-900 border border-rose-300 px-2 py-0.5 rounded-lg transition-colors"
                                                    >
                                                        + Tertukar
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Note Button */}
                                            <div>
                                                {editingAyahNote === ayah.numberInSurah ? (
                                                    <div className="flex items-center gap-1">
                                                        <input
                                                            type="text"
                                                            placeholder="Catatan koreksi ayat (cth: Mad Jaiz kurang panjang)..."
                                                            value={tempNoteText}
                                                            onChange={(e) => setTempNoteText(e.target.value)}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter') addCustomNoteToAyah(ayah.numberInSurah, tempNoteText);
                                                            }}
                                                            className="p-1 px-2 text-xs bg-white border border-teal-400 rounded-lg w-52 md:w-64 focus:ring-1 focus:ring-teal-500"
                                                            autoFocus
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => addCustomNoteToAyah(ayah.numberInSurah, tempNoteText)}
                                                            className="text-xs bg-teal-600 hover:bg-teal-700 text-white font-bold px-2 py-1 rounded-lg"
                                                        >
                                                            Simpan
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setEditingAyahNote(null);
                                                                setTempNoteText('');
                                                            }}
                                                            className="text-xs bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold px-2 py-1 rounded-lg"
                                                        >
                                                            Batal
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setEditingAyahNote(ayah.numberInSurah);
                                                            setTempNoteText('');
                                                        }}
                                                        className="text-[11px] font-semibold bg-white hover:bg-teal-50 text-teal-800 border border-teal-300 px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors"
                                                    >
                                                        <i className="bi bi-pencil-square"></i>
                                                        <span>+ Catatan Alasan</span>
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        {/* Notes display for this ayah */}
                                        {ayahAssessment.notes.length > 0 && (
                                            <div className="mt-2 flex flex-wrap gap-1.5 items-center">
                                                <span className="text-[10px] font-bold text-gray-500">Catatan Ayat:</span>
                                                {ayahAssessment.notes.map((note, nIdx) => (
                                                    <span
                                                        key={nIdx}
                                                        className="inline-flex items-center gap-1 text-[11px] bg-teal-50 border border-teal-200 text-teal-900 px-2 py-0.5 rounded-lg"
                                                    >
                                                        <span>{note}</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => removeNoteFromAyah(ayah.numberInSurah, nIdx)}
                                                            className="text-teal-600 hover:text-red-600 font-bold ml-0.5 text-xs"
                                                            title="Hapus catatan ini"
                                                        >
                                                            ×
                                                        </button>
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* Bottom Footer info */}
            <div className="bg-white border-t border-amber-200/60 p-3 px-4 flex flex-wrap justify-between items-center gap-3 text-xs text-gray-600 shrink-0">
                <div className="flex items-center gap-3">
                    <span className="font-semibold text-gray-800">
                        📍 Ayat terpilih: <strong className="text-teal-900 font-bold">{ayatRange.start} - {ayatRange.end}</strong>
                    </span>
                    {(assessmentSummary.totalTeguran > 0 || assessmentSummary.totalKesalahan > 0) && (
                        <span className="bg-amber-50 text-amber-900 border border-amber-300 px-2.5 py-1 rounded-lg font-bold text-xs">
                            ⚠️ {assessmentSummary.totalTeguran} Teguran • ❌ {assessmentSummary.totalKesalahan} Salah
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    {onSelectAyatRange && (
                        <button
                            type="button"
                            onClick={() => {
                                if (currentSurah) {
                                    onSelectAyatRange(currentSurah.name, ayatRange.start, ayatRange.end, assessmentSummary);
                                    if (onClose) onClose();
                                }
                            }}
                            className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-4 py-2 rounded-xl transition-all shadow-md flex items-center gap-1.5 active:scale-95"
                        >
                            <i className="bi bi-check2-circle text-base"></i>
                            <span>Terapkan Nilai & Ayat ke Form</span>
                        </button>
                    )}
                    {onClose && (
                        <button
                            type="button"
                            onClick={onClose}
                            className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold px-4 py-2 rounded-xl transition-colors"
                        >
                            Tutup
                        </button>
                    )}
                </div>
            </div>
        </div>
    );

    if (isStandalonePage) {
        return content;
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-[80] flex justify-center items-center p-2 sm:p-4 animate-fade-in">
            {content}
        </div>
    );
};
