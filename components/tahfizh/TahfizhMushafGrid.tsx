import React, { useState, useMemo } from 'react';
import { TahfizhRecord } from '../../types';
import { QURAN_JUZ_DATA, QURAN_DATA, getSurahsInJuz, getSurahsInJuzRange } from '../../data/quran';

interface TahfizhMushafGridProps {
    records: TahfizhRecord[];
    targetJuz?: number; // e.g. 2 or 30
    interactive?: boolean;
    onSelectJuz?: (juz: number) => void;
    onOpenMunaqosyah?: (juz: number) => void;
}

type GridViewMode = 'grid30' | 'perSurah' | 'radar' | 'surahs';

export const TahfizhMushafGrid: React.FC<TahfizhMushafGridProps> = ({
    records,
    targetJuz = 30,
    interactive = true,
    onSelectJuz,
    onOpenMunaqosyah,
}) => {
    const [viewMode, setViewMode] = useState<GridViewMode>('grid30');
    const [selectedJuzDetail, setSelectedJuzDetail] = useState<number | null>(null);
    const [perSurahRentangMode, setPerSurahRentangMode] = useState<'single' | 'range'>('single');
    const [selectedJuzPerSurah, setSelectedJuzPerSurah] = useState<number>(targetJuz && targetJuz <= 30 ? targetJuz : 30);
    const [selectedJuzPerSurahEnd, setSelectedJuzPerSurahEnd] = useState<number>(targetJuz && targetJuz <= 30 ? targetJuz : 30);
    const [selectedSurahModal, setSelectedSurahModal] = useState<{ number: number; name: string; ayat: number } | null>(null);

    // Calculate status and metrics for each Juz 1 to 30
    const juzStatusMap = useMemo(() => {
        const now = new Date();
        const map = new Map<number, {
            juz: number;
            status: 'mutqin' | 'ziyadah' | 'murojaah' | 'belum';
            totalSetoran: number;
            ziyadahCount: number;
            murojaahCount: number;
            examPassed: boolean;
            examRecords: TahfizhRecord[];
            latestRecord?: TahfizhRecord;
            daysSinceLastReview: number | null;
            needsMurajaah: boolean;
            hasWeakness: boolean;
            weaknessReason?: string;
        }>();

        for (let j = 1; j <= 30; j++) {
            const juzRecords = records.filter(r => r.juz === j);
            if (juzRecords.length === 0) {
                map.set(j, {
                    juz: j,
                    status: 'belum',
                    totalSetoran: 0,
                    ziyadahCount: 0,
                    murojaahCount: 0,
                    examPassed: false,
                    examRecords: [],
                    daysSinceLastReview: null,
                    needsMurajaah: false,
                    hasWeakness: false,
                });
                continue;
            }

            const sorted = [...juzRecords].sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());
            const latest = sorted[0];
            const examRecords = juzRecords.filter(r => r.tipe === 'Ujian Hafalan');
            const examPassed = examRecords.some(r => r.predikat !== 'Belum Lulus');
            const ziyadahCount = juzRecords.filter(r => r.tipe === 'Ziyadah').length;
            const murojaahCount = juzRecords.filter(r => r.tipe === 'Murojaah' || r.tipe === "Tasmi'").length;

            let status: 'mutqin' | 'ziyadah' | 'murojaah' | 'belum' = 'belum';
            if (examPassed) {
                status = 'mutqin';
            } else if (ziyadahCount > 0) {
                status = 'ziyadah';
            } else if (murojaahCount > 0) {
                status = 'murojaah';
            }

            // Days calculation
            let daysSinceLastReview: number | null = null;
            let needsMurajaah = false;
            let hasWeakness = false;
            let weaknessReason = '';

            if (latest?.tanggal) {
                const diffTime = Math.abs(now.getTime() - new Date(latest.tanggal).getTime());
                daysSinceLastReview = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                if (daysSinceLastReview > 30) {
                    needsMurajaah = true;
                    weaknessReason = `Sudah ${daysSinceLastReview} hari tidak disetor / dimuraja'ah`;
                }
            }

            if (latest?.predikat === 'Kurang Lancar' || latest?.predikat === 'Belum Lulus') {
                hasWeakness = true;
                needsMurajaah = true;
                weaknessReason = `Setoran terakhir berstatus "${latest.predikat}"`;
            }

            map.set(j, {
                juz: j,
                status,
                totalSetoran: juzRecords.length,
                ziyadahCount,
                murojaahCount,
                examPassed,
                examRecords,
                latestRecord: latest,
                daysSinceLastReview,
                needsMurajaah,
                hasWeakness,
                weaknessReason,
            });
        }
        return map;
    }, [records]);

    // Summary calculation
    const totalMutqin = Array.from(juzStatusMap.values()).filter(v => v.status === 'mutqin').length;
    const totalZiyadah = Array.from(juzStatusMap.values()).filter(v => v.status === 'ziyadah' || v.status === 'mutqin').length;
    const totalActiveJuz = Array.from(juzStatusMap.values()).filter(v => v.status !== 'belum').length;
    const progressPercent = Math.min(100, Math.round((totalZiyadah / (targetJuz || 30)) * 100));

    // Radar Items: Inactive or Weak Juz
    const radarAlerts = useMemo(() => {
        return Array.from(juzStatusMap.values()).filter(v => v.status !== 'belum' && v.needsMurajaah);
    }, [juzStatusMap]);

    const getStatusStyle = (status: 'mutqin' | 'ziyadah' | 'murojaah' | 'belum', hasAlert = false) => {
        if (hasAlert) {
            return 'bg-amber-100 text-amber-950 border-amber-400 ring-2 ring-amber-400/50 hover:bg-amber-200';
        }
        switch (status) {
            case 'mutqin':
                return 'bg-emerald-600 text-white border-emerald-700 hover:bg-emerald-500 shadow-xs';
            case 'ziyadah':
                return 'bg-teal-500 text-white border-teal-600 hover:bg-teal-400 shadow-xs';
            case 'murojaah':
                return 'bg-blue-500 text-white border-blue-600 hover:bg-blue-400';
            case 'belum':
            default:
                return 'bg-gray-100 text-gray-400 border-gray-200 hover:bg-gray-200';
        }
    };

    const handleJuzClick = (juzNum: number) => {
        setSelectedJuzDetail(juzNum);
        if (onSelectJuz) onSelectJuz(juzNum);
    };

    return (
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-200 shadow-sm space-y-4">
            {/* Top Bar: Title, Target Metric & View Mode Switcher */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3.5">
                <div>
                    <div className="flex items-center gap-2">
                        <h4 className="font-bold text-gray-800 flex items-center gap-2 text-sm">
                            <i className="bi bi-grid-3x3-gap-fill text-teal-600"></i> Peta Hafalan 30 Juz & Radar Hafalan
                        </h4>
                        {radarAlerts.length > 0 && (
                            <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 border border-amber-300">
                                <i className="bi bi-exclamation-triangle-fill text-amber-600"></i>
                                {radarAlerts.length} Juz Perlu Muraja'ah
                            </span>
                        )}
                    </div>
                    <p className="text-[11px] text-gray-500">Visualisasi 30 Juz, radar muraja'ah, dan rincian surah.</p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {/* View Mode Toggle */}
                    <div className="flex bg-gray-100 p-0.5 rounded-xl text-xs font-semibold">
                        <button
                            type="button"
                            onClick={() => setViewMode('grid30')}
                            className={`px-3 py-1.5 rounded-lg transition-all ${
                                viewMode === 'grid30' ? 'bg-white text-teal-900 font-bold shadow-xs' : 'text-gray-600 hover:text-gray-900'
                            }`}
                        >
                            Grid 30 Juz
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewMode('perSurah')}
                            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 ${
                                viewMode === 'perSurah' ? 'bg-white text-emerald-900 font-bold shadow-xs' : 'text-gray-600 hover:text-gray-900'
                            }`}
                        >
                            <i className="bi bi-card-checklist text-emerald-600"></i> Per Surat (Juz)
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewMode('radar')}
                            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 ${
                                viewMode === 'radar' ? 'bg-white text-amber-900 font-bold shadow-xs' : 'text-gray-600 hover:text-gray-900'
                            }`}
                        >
                            <i className="bi bi-activity text-amber-600"></i> Radar Muraja'ah
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewMode('surahs')}
                            className={`px-3 py-1.5 rounded-lg transition-all ${
                                viewMode === 'surahs' ? 'bg-white text-teal-900 font-bold shadow-xs' : 'text-gray-600 hover:text-gray-900'
                            }`}
                        >
                            114 Surah
                        </button>
                    </div>

                    {/* Progress Percentage */}
                    <div className="text-right pl-2 border-l border-gray-200">
                        <div className="text-xs font-black text-teal-900">
                            {totalZiyadah} / {targetJuz} Juz <span className="text-[10px] text-gray-500 font-normal">({progressPercent}%)</span>
                        </div>
                        <div className="w-24 bg-gray-100 h-2 rounded-full overflow-hidden mt-0.5 border border-gray-200">
                            <div 
                                className="h-full bg-gradient-to-r from-teal-500 to-emerald-500 transition-all duration-500"
                                style={{ width: `${progressPercent}%` }}
                            ></div>
                        </div>
                    </div>
                </div>
            </div>

            {/* View 1: 30 Juz Grid */}
            {viewMode === 'grid30' && (
                <div className="space-y-3">
                    <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5 sm:gap-2">
                        {Array.from({ length: 30 }, (_, i) => i + 1).map((juzNum) => {
                            const info = juzStatusMap.get(juzNum);
                            const hasAlert = info?.needsMurajaah || false;
                            const isSelected = selectedJuzDetail === juzNum;

                            return (
                                <button
                                    key={juzNum}
                                    type="button"
                                    onClick={() => handleJuzClick(juzNum)}
                                    title={`Juz ${juzNum}: ${info?.status.toUpperCase()} (${info?.totalSetoran || 0} setoran)${hasAlert ? ` - ${info?.weaknessReason}` : ''}`}
                                    className={`h-12 rounded-xl border flex flex-col items-center justify-center transition-all relative ${getStatusStyle(info?.status || 'belum', hasAlert)} ${isSelected ? 'ring-3 ring-teal-700 font-black' : ''} ${interactive ? 'cursor-pointer active:scale-95' : 'cursor-default'}`}
                                >
                                    <span className="text-xs font-black leading-none">{juzNum}</span>
                                    <span className="text-[8px] uppercase tracking-tighter opacity-80 mt-0.5 font-sans">
                                        {info?.status === 'mutqin' ? 'Mutqin' : info?.status === 'ziyadah' ? 'Ziyadah' : info?.status === 'murojaah' ? 'Murojaah' : 'Belum'}
                                    </span>
                                    
                                    {/* Alert / Weakness Indicator */}
                                    {hasAlert && (
                                        <span className="absolute -top-1.5 -left-1.5 w-4 h-4 bg-amber-500 text-white rounded-full flex items-center justify-center text-[9px] shadow-xs animate-pulse">
                                            <i className="bi bi-clock-history"></i>
                                        </span>
                                    )}

                                    {/* Setoran count pill */}
                                    {info && info.totalSetoran > 0 && (
                                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-white text-gray-800 text-[8px] font-bold rounded-full flex items-center justify-center shadow-xs border border-gray-300">
                                            {info.totalSetoran}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {/* Legend */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-100 text-[11px] text-gray-600">
                        <div className="flex flex-wrap items-center gap-3">
                            <span className="flex items-center gap-1.5">
                                <span className="w-3 h-3 rounded bg-emerald-600 inline-block border border-emerald-700"></span>
                                <span>Mutqin / Lulus Ujian ({totalMutqin})</span>
                            </span>
                            <span className="flex items-center gap-1.5">
                                <span className="w-3 h-3 rounded bg-teal-500 inline-block border border-teal-600"></span>
                                <span>Ziyadah ({totalZiyadah})</span>
                            </span>
                            <span className="flex items-center gap-1.5">
                                <span className="w-3 h-3 rounded bg-blue-500 inline-block border border-blue-600"></span>
                                <span>Muroja'ah</span>
                            </span>
                            <span className="flex items-center gap-1.5">
                                <span className="w-3 h-3 rounded bg-amber-200 border border-amber-400 inline-block"></span>
                                <span>Perlu Penguatan</span>
                            </span>
                            <span className="flex items-center gap-1.5">
                                <span className="w-3 h-3 rounded bg-gray-100 inline-block border border-gray-300"></span>
                                <span>Belum ({30 - totalActiveJuz})</span>
                            </span>
                        </div>
                        <div className="text-[11px] text-gray-500">
                            💡 Klik kotak Juz untuk melihat rincian surah & status kelulusan.
                        </div>
                    </div>
                </div>
            )}

            {/* View 2: Peta Hafalan Per Surat (Juz Tertentu atau Rentang Juz - Cocok untuk Ibtidaiyah / Target 1-2 Juz) */}
            {viewMode === 'perSurah' && (
                <div className="space-y-3 animate-fade-in">
                    {/* Juz Selector & Context Header */}
                    <div className="p-3.5 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl border border-emerald-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 bg-emerald-600 text-white rounded-md font-black text-xs">
                                    PETA PER SURAT
                                </span>
                                <h5 className="font-bold text-xs sm:text-sm text-emerald-950">
                                    Rincian Progres Hafalan Surat per Juz & Rentang Juz
                                </h5>
                            </div>
                            <p className="text-[11px] text-emerald-800 mt-0.5">
                                Cocok untuk pemula, kelas ibtidaiyah, atau target bertahap (1 juz, Juz 30-29, dsb) agar capaian tiap surat terpantau detail.
                            </p>
                        </div>

                        {/* Mode Single vs Range */}
                        <div className="flex flex-wrap items-center gap-2">
                            <div className="inline-flex rounded-lg border border-emerald-300 bg-white p-0.5 text-xs shadow-2xs">
                                <button
                                    type="button"
                                    onClick={() => setPerSurahRentangMode('single')}
                                    className={`px-2.5 py-1 rounded-md font-bold transition-all ${
                                        perSurahRentangMode === 'single'
                                            ? 'bg-emerald-700 text-white shadow-xs'
                                            : 'text-emerald-900 hover:bg-emerald-50'
                                    }`}
                                >
                                    1 Juz Saja
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPerSurahRentangMode('range')}
                                    className={`px-2.5 py-1 rounded-md font-bold transition-all ${
                                        perSurahRentangMode === 'range'
                                            ? 'bg-emerald-700 text-white shadow-xs'
                                            : 'text-emerald-900 hover:bg-emerald-50'
                                    }`}
                                >
                                    Rentang Juz (Misal 30-29)
                                </button>
                            </div>

                            {perSurahRentangMode === 'single' ? (
                                <div className="flex items-center gap-1.5">
                                    <label className="text-xs font-bold text-emerald-950 shrink-0">Juz:</label>
                                    <select
                                        value={selectedJuzPerSurah}
                                        onChange={(e) => {
                                            const val = Number(e.target.value);
                                            setSelectedJuzPerSurah(val);
                                            setSelectedJuzPerSurahEnd(val);
                                        }}
                                        className="px-2.5 py-1 bg-white border border-emerald-400 rounded-xl text-xs font-bold text-emerald-950 shadow-xs focus:ring-2 focus:ring-emerald-500"
                                    >
                                        {Array.from({ length: 30 }, (_, i) => i + 1).map(j => {
                                            const surahs = getSurahsInJuz(j);
                                            return (
                                                <option key={j} value={j}>
                                                    Juz {j} ({surahs.length} Surat)
                                                </option>
                                            );
                                        })}
                                    </select>
                                </div>
                            ) : (
                                <div className="flex items-center gap-1.5">
                                    <label className="text-xs font-bold text-emerald-950 shrink-0">Dari:</label>
                                    <select
                                        value={selectedJuzPerSurah}
                                        onChange={(e) => setSelectedJuzPerSurah(Number(e.target.value))}
                                        className="px-2 py-1 bg-white border border-emerald-400 rounded-lg text-xs font-bold text-emerald-950"
                                    >
                                        {Array.from({ length: 30 }, (_, i) => i + 1).map(j => (
                                            <option key={j} value={j}>Juz {j}</option>
                                        ))}
                                    </select>
                                    <span className="text-xs font-bold text-emerald-900">s/d</span>
                                    <select
                                        value={selectedJuzPerSurahEnd}
                                        onChange={(e) => setSelectedJuzPerSurahEnd(Number(e.target.value))}
                                        className="px-2 py-1 bg-white border border-emerald-400 rounded-lg text-xs font-bold text-emerald-950"
                                    >
                                        {Array.from({ length: 30 }, (_, i) => i + 1).map(j => (
                                            <option key={j} value={j}>Juz {j}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Quick Juz Shortcuts */}
                    <div className="flex flex-wrap items-center gap-1.5 text-xs">
                        <span className="text-[11px] text-gray-500 font-semibold mr-1">Pilihan Cepat:</span>
                        {perSurahRentangMode === 'single' ? (
                            [
                                { j: 30, label: "Juz 30 (Juz 'Amma - 37 Surat)" },
                                { j: 29, label: "Juz 29 (Tabarak - 11 Surat)" },
                                { j: 28, label: "Juz 28 (Qadd Sami' - 9 Surat)" },
                                { j: 1, label: "Juz 1 (Al-Fatihah & Al-Baqarah)" },
                                { j: 2, label: "Juz 2 (Al-Baqarah)" },
                            ].map(s => (
                                <button
                                    key={s.j}
                                    type="button"
                                    onClick={() => {
                                        setSelectedJuzPerSurah(s.j);
                                        setSelectedJuzPerSurahEnd(s.j);
                                    }}
                                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all ${
                                        selectedJuzPerSurah === s.j
                                            ? 'bg-emerald-700 text-white border-emerald-800 shadow-xs scale-102'
                                            : 'bg-white text-emerald-900 border-emerald-200 hover:bg-emerald-50'
                                    }`}
                                >
                                    {s.label}
                                </button>
                            ))
                        ) : (
                            [
                                { s: 30, e: 29, label: "Juz 30 - 29 (2 Juz - 48 Surat)" },
                                { s: 30, e: 28, label: "Juz 30 - 28 (3 Juz - 57 Surat)" },
                                { s: 1, e: 2, label: "Juz 1 - 2 (2 Juz Awal)" },
                                { s: 1, e: 3, label: "Juz 1 - 3 (3 Juz Awal)" },
                                { s: 1, e: 5, label: "Juz 1 - 5 (5 Juz Awal)" },
                            ].map(r => {
                                const isCurrent = (selectedJuzPerSurah === r.s && selectedJuzPerSurahEnd === r.e) || (selectedJuzPerSurah === r.e && selectedJuzPerSurahEnd === r.s);
                                return (
                                    <button
                                        key={r.label}
                                        type="button"
                                        onClick={() => {
                                            setSelectedJuzPerSurah(r.s);
                                            setSelectedJuzPerSurahEnd(r.e);
                                        }}
                                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all ${
                                            isCurrent
                                                ? 'bg-emerald-700 text-white border-emerald-800 shadow-xs scale-102'
                                                : 'bg-white text-emerald-900 border-emerald-200 hover:bg-emerald-50'
                                        }`}
                                    >
                                        {r.label}
                                    </button>
                                );
                            })
                        )}
                    </div>

                    {/* Surah List in Selected Juz Range */}
                    {(() => {
                        const minJ = Math.min(selectedJuzPerSurah, selectedJuzPerSurahEnd);
                        const maxJ = Math.max(selectedJuzPerSurah, selectedJuzPerSurahEnd);
                        const surahsInSelectedJuz = getSurahsInJuzRange(minJ, maxJ);
                        
                        let countMutqin = 0;
                        let countZiyadah = 0;
                        let countBelum = 0;

                        const surahStats = surahsInSelectedJuz.map(surah => {
                            const normalizeStr = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
                            const targetNorm = normalizeStr(surah.name);

                            const surahRecs = records.filter(r => {
                                const rNorm = normalizeStr(r.surah || '');
                                return (
                                    rNorm === targetNorm || 
                                    rNorm.includes(targetNorm) || 
                                    targetNorm.includes(rNorm)
                                );
                            });

                            const isMutqin = surahRecs.some(r => r.tipe === 'Ujian Hafalan' && r.predikat !== 'Belum Lulus');
                            const isZiyadah = surahRecs.some(r => r.tipe === 'Ziyadah' || r.tipe === "Tasmi'");
                            const isMurojaahOnly = !isMutqin && !isZiyadah && surahRecs.some(r => r.tipe === 'Murojaah');
                            
                            let status: 'mutqin' | 'ziyadah' | 'murojaah' | 'belum' = 'belum';
                            if (isMutqin) {
                                status = 'mutqin';
                                countMutqin++;
                            } else if (isZiyadah) {
                                status = 'ziyadah';
                                countZiyadah++;
                            } else if (isMurojaahOnly) {
                                status = 'murojaah';
                                countZiyadah++;
                            } else {
                                countBelum++;
                            }

                            const latestRec = surahRecs.sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime())[0];

                            return {
                                surah,
                                records: surahRecs,
                                status,
                                latestRec
                            };
                        });

                        const percentInJuz = Math.round(((countMutqin + countZiyadah) / surahsInSelectedJuz.length) * 100) || 0;
                        const headerTitle = minJ === maxJ 
                            ? `Juz ${minJ}` 
                            : `Juz ${minJ} s/d Juz ${maxJ}`;

                        return (
                            <div className="space-y-3">
                                {/* Selected Juz Mini Summary */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                                    <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-200">
                                        <div className="text-[10px] text-gray-500 font-bold uppercase">Total Surat ({headerTitle})</div>
                                        <div className="text-base font-black text-gray-900 mt-0.5">{surahsInSelectedJuz.length} Surat</div>
                                    </div>
                                    <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200">
                                        <div className="text-[10px] text-emerald-800 font-bold uppercase">Lulus Ujian / Mutqin</div>
                                        <div className="text-base font-black text-emerald-700 mt-0.5">{countMutqin} Surat</div>
                                    </div>
                                    <div className="p-2.5 bg-teal-50 rounded-xl border border-teal-200">
                                        <div className="text-[10px] text-teal-800 font-bold uppercase">Ziyadah Disetor</div>
                                        <div className="text-base font-black text-teal-700 mt-0.5">{countZiyadah} Surat</div>
                                    </div>
                                    <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200">
                                        <div className="text-[10px] text-amber-800 font-bold uppercase">Belum Disetor</div>
                                        <div className="text-base font-black text-amber-700 mt-0.5">{countBelum} Surat</div>
                                    </div>
                                </div>

                                {/* Progress Bar in Selected Juz */}
                                <div className="p-2.5 bg-white rounded-xl border border-gray-200">
                                    <div className="flex justify-between items-center text-xs mb-1">
                                        <span className="font-bold text-gray-700">Progres Capaian {headerTitle}:</span>
                                        <span className="font-extrabold text-emerald-800">{countMutqin + countZiyadah} / {surahsInSelectedJuz.length} Surat ({percentInJuz}%)</span>
                                    </div>
                                    <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden border border-gray-200">
                                        <div 
                                            className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-500"
                                            style={{ width: `${percentInJuz}%` }}
                                        ></div>
                                    </div>
                                </div>

                                {/* Surah Cards Grid */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-96 overflow-y-auto pr-1">
                                    {surahStats.map(({ surah, records: surahRecs, status, latestRec }) => {
                                        let cardBg = 'bg-white border-gray-200 hover:border-gray-300';
                                        let badgeBg = 'bg-gray-100 text-gray-700 border-gray-200';
                                        let badgeText = 'Belum Setor';

                                        if (status === 'mutqin') {
                                            cardBg = 'bg-emerald-50/70 border-emerald-300 hover:border-emerald-500 shadow-2xs';
                                            badgeBg = 'bg-emerald-600 text-white border-emerald-700';
                                            badgeText = '✓ Mutqin / Lulus';
                                        } else if (status === 'ziyadah') {
                                            cardBg = 'bg-teal-50/70 border-teal-300 hover:border-teal-500 shadow-2xs';
                                            badgeBg = 'bg-teal-600 text-white border-teal-700';
                                            badgeText = `Ziyadah (${surahRecs.length}x)`;
                                        } else if (status === 'murojaah') {
                                            cardBg = 'bg-blue-50/70 border-blue-300 hover:border-blue-500 shadow-2xs';
                                            badgeBg = 'bg-blue-600 text-white border-blue-700';
                                            badgeText = `Muroja'ah (${surahRecs.length}x)`;
                                        }

                                        return (
                                            <div
                                                key={surah.number}
                                                onClick={() => setSelectedSurahModal(surah)}
                                                className={`p-3 rounded-xl border flex flex-col justify-between cursor-pointer transition-all hover:shadow-sm ${cardBg}`}
                                            >
                                                <div>
                                                    <div className="flex items-start justify-between gap-1 mb-1.5">
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="w-5 h-5 rounded-md bg-gray-800 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                                                                {surah.number}
                                                            </span>
                                                            <h6 className="font-bold text-xs text-gray-900">
                                                                QS. {surah.name}
                                                            </h6>
                                                        </div>
                                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badgeBg}`}>
                                                            {badgeText}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center justify-between text-[11px] text-gray-500">
                                                        <span>{surah.ayat} Ayat</span>
                                                        <span>Total Setor: <strong className="text-gray-800">{surahRecs.length}x</strong></span>
                                                    </div>
                                                </div>

                                                <div className="pt-2 mt-2 border-t border-gray-200/70 flex items-center justify-between text-[10px]">
                                                    {latestRec ? (
                                                        <span className="text-gray-600 truncate">
                                                            <i className="bi bi-clock-history mr-1 text-teal-600"></i>
                                                            {latestRec.tanggal} ({latestRec.tipe})
                                                        </span>
                                                    ) : (
                                                        <span className="text-gray-400 italic">Belum ada setoran</span>
                                                    )}
                                                    <span className="text-teal-700 font-bold hover:underline">
                                                        Detail →
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })()}
                </div>
            )}

            {/* Selected Surah Modal Detail */}
            {selectedSurahModal && (
                <div className="p-4 bg-gray-900 text-white rounded-2xl border border-gray-700 shadow-xl space-y-3 animate-fade-in">
                    <div className="flex items-start justify-between">
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="px-2.5 py-0.5 bg-emerald-500 text-emerald-950 rounded-md font-black text-xs">
                                    SURAT KE-{selectedSurahModal.number}
                                </span>
                                <h5 className="font-bold text-sm text-emerald-100">
                                    QS. {selectedSurahModal.name} ({selectedSurahModal.ayat} Ayat)
                                </h5>
                            </div>
                            <p className="text-xs text-gray-400 mt-1">
                                Rincian seluruh riwayat setoran & ujian untuk surat ini.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setSelectedSurahModal(null)}
                            className="w-7 h-7 bg-white/10 hover:bg-white/20 text-white rounded-lg flex items-center justify-center"
                        >
                            <i className="bi bi-x"></i>
                        </button>
                    </div>

                    {/* Filtered records for this surah */}
                    {(() => {
                        const normalizeStr = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
                        const targetNorm = normalizeStr(selectedSurahModal.name);
                        const surahRecs = records.filter(r => {
                            const rNorm = normalizeStr(r.surah || '');
                            return rNorm === targetNorm || rNorm.includes(targetNorm) || targetNorm.includes(rNorm);
                        }).sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());

                        if (surahRecs.length === 0) {
                            return (
                                <div className="p-3 bg-black/40 rounded-xl text-center text-xs text-gray-400">
                                    Belum ada catatan setoran untuk QS. {selectedSurahModal.name}.
                                </div>
                            );
                        }

                        return (
                            <div className="space-y-1.5 max-h-40 overflow-y-auto text-xs">
                                {surahRecs.map((r) => (
                                    <div key={r.id || r.tanggal} className="bg-black/40 p-2.5 rounded-xl flex items-center justify-between border border-gray-800">
                                        <div>
                                            <div className="font-bold text-emerald-300">
                                                [{r.tanggal}] {r.tipe} • Ayat {r.ayatAwal} - {r.ayatAkhir}
                                            </div>
                                            {r.catatan && (
                                                <div className="text-[11px] text-gray-300 italic mt-0.5">
                                                    "{r.catatan}"
                                                </div>
                                            )}
                                        </div>
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                            r.predikat === 'Sangat Lancar' ? 'bg-emerald-500/20 text-emerald-300' :
                                            r.predikat === 'Lancar' ? 'bg-teal-500/20 text-teal-300' : 'bg-amber-500/20 text-amber-300'
                                        }`}>
                                            {r.predikat}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        );
                    })()}
                </div>
            )}

            {/* View 3: Radar Muraja'ah & Wilayah Perlu Penguatan */}
            {viewMode === 'radar' && (
                <div className="space-y-3 animate-fade-in">
                    <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <i className="bi bi-radar text-amber-700 text-lg"></i>
                            <div>
                                <h5 className="font-bold text-xs text-amber-950">Radar Muraja'ah & Evaluasi Kesiapan</h5>
                                <p className="text-[11px] text-amber-800">
                                    Mendeteksi Juz yang belum disetor &gt;30 hari atau nilai setoran terakhir kurang lancar agar tidak hilang dari hafalan.
                                </p>
                            </div>
                        </div>
                    </div>

                    {radarAlerts.length === 0 ? (
                        <div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                            <i className="bi bi-check-circle-fill text-3xl text-emerald-500 block mb-2"></i>
                            <p className="text-sm font-bold text-gray-800">Semua Hafalan Aktif Terjaga dengan Baik!</p>
                            <p className="text-xs text-gray-500">Tidak ada juz aktif yang terlantar atau melewati batas 30 hari tanpa muraja'ah.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            {radarAlerts.map(alert => {
                                const boundary = QURAN_JUZ_DATA.find(b => b.juz === alert.juz);
                                return (
                                    <div 
                                        key={alert.juz}
                                        className="p-3 bg-white rounded-xl border border-amber-300 shadow-xs hover:border-amber-500 transition-all flex flex-col justify-between"
                                    >
                                        <div className="flex items-start justify-between gap-2 mb-2">
                                            <div>
                                                <div className="flex items-center gap-1.5">
                                                    <span className="w-6 h-6 rounded-lg bg-amber-500 text-white font-bold text-xs flex items-center justify-center">
                                                        {alert.juz}
                                                    </span>
                                                    <h6 className="font-bold text-xs text-gray-900">
                                                        Juz {alert.juz}
                                                    </h6>
                                                    <span className="text-[10px] bg-amber-100 text-amber-900 px-2 py-0.5 rounded font-semibold">
                                                        {alert.status.toUpperCase()}
                                                    </span>
                                                </div>
                                                <p className="text-[11px] text-gray-500 mt-1">
                                                    {boundary?.name || `Juz ${alert.juz}`}
                                                </p>
                                            </div>
                                            <span className="text-amber-700 text-xs font-bold bg-amber-50 px-2 py-1 rounded-md border border-amber-200">
                                                ⚠️ Perlu Muraja'ah
                                            </span>
                                        </div>

                                        <div className="p-2 bg-amber-50/70 rounded-lg text-xs text-amber-900 mb-2.5">
                                            <div className="font-medium flex items-center gap-1">
                                                <i className="bi bi-info-circle"></i> {alert.weaknessReason}
                                            </div>
                                            {alert.latestRecord && (
                                                <div className="text-[11px] text-amber-800/80 mt-0.5">
                                                    Terakhir: {alert.latestRecord.tanggal} ({alert.latestRecord.tipe} - {alert.latestRecord.predikat})
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex items-center justify-end gap-2 pt-1 border-t border-gray-100">
                                            <button
                                                type="button"
                                                onClick={() => handleJuzClick(alert.juz)}
                                                className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-medium"
                                            >
                                                Lihat Rincian
                                            </button>
                                            {onOpenMunaqosyah && (
                                                <button
                                                    type="button"
                                                    onClick={() => onOpenMunaqosyah(alert.juz)}
                                                    className="px-2.5 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs"
                                                >
                                                    <i className="bi bi-patch-check"></i> Uji Munaqosyah
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* View 3: 114 Surahs Breakdown */}
            {viewMode === 'surahs' && (
                <div className="space-y-3 animate-fade-in">
                    <div className="max-h-72 overflow-y-auto pr-1">
                        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
                            {QURAN_DATA.map(surah => {
                                const surahRecords = records.filter(r => r.surah.toLowerCase() === surah.name.toLowerCase());
                                const isDisetor = surahRecords.length > 0;
                                const isLulus = surahRecords.some(r => r.tipe === 'Ujian Hafalan' && r.predikat !== 'Belum Lulus');
                                const latest = surahRecords[0];

                                let bgClass = 'bg-gray-50 text-gray-400 border-gray-200';
                                if (isLulus) {
                                    bgClass = 'bg-emerald-50 text-emerald-950 border-emerald-400';
                                } else if (isDisetor) {
                                    bgClass = 'bg-teal-50 text-teal-950 border-teal-400';
                                }

                                return (
                                    <div
                                        key={surah.number}
                                        className={`p-2 rounded-xl border flex flex-col justify-between text-xs transition-all ${bgClass}`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="font-bold text-[11px]">{surah.number}. {surah.name}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-[10px] text-gray-500 mt-1">
                                            <span>{surah.ayat} ayat</span>
                                            {isLulus ? (
                                                <span className="font-bold text-emerald-700">Mutqin</span>
                                            ) : isDisetor ? (
                                                <span className="font-bold text-teal-700">{surahRecords.length}x</span>
                                            ) : (
                                                <span>-</span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* Selected Juz Detail Inspector Modal / Drawer */}
            {selectedJuzDetail !== null && (
                <div className="p-4 bg-teal-950 text-white rounded-2xl border border-teal-800 shadow-xl space-y-3 animate-fade-in">
                    <div className="flex items-start justify-between">
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="px-2.5 py-0.5 bg-teal-500 text-teal-950 rounded-md font-black text-xs">
                                    JUZ {selectedJuzDetail}
                                </span>
                                <h5 className="font-bold text-sm text-teal-100">
                                    {QURAN_JUZ_DATA.find(b => b.juz === selectedJuzDetail)?.name || `Juz ${selectedJuzDetail}`}
                                </h5>
                            </div>
                            <p className="text-xs text-teal-300/80 mt-1">
                                Status: <strong className="uppercase text-white">{juzStatusMap.get(selectedJuzDetail)?.status}</strong> • Total Setoran: <strong className="text-white">{juzStatusMap.get(selectedJuzDetail)?.totalSetoran || 0} kali</strong>
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            {onOpenMunaqosyah && (
                                <button
                                    type="button"
                                    onClick={() => onOpenMunaqosyah(selectedJuzDetail)}
                                    className="px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-amber-950 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
                                >
                                    <i className="bi bi-patch-check-fill"></i> Uji Munaqosyah Juz Ini
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={() => setSelectedJuzDetail(null)}
                                className="w-7 h-7 bg-white/10 hover:bg-white/20 text-white rounded-lg flex items-center justify-center"
                            >
                                <i className="bi bi-x"></i>
                            </button>
                        </div>
                    </div>

                    {/* Surahs in this juz */}
                    <div>
                        <div className="text-[11px] font-bold text-teal-300 uppercase mb-1.5">
                            Daftar Surah dalam Juz {selectedJuzDetail}:
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                            {getSurahsInJuz(selectedJuzDetail).map(surah => {
                                const surahRecords = records.filter(r => r.juz === selectedJuzDetail && r.surah.toLowerCase() === surah.name.toLowerCase());
                                return (
                                    <span
                                        key={surah.number}
                                        className={`px-2.5 py-1 rounded-lg text-xs border ${
                                            surahRecords.length > 0
                                                ? 'bg-teal-800/90 text-white border-teal-600 font-semibold'
                                                : 'bg-white/10 text-teal-200/70 border-white/10'
                                        }`}
                                    >
                                        QS. {surah.name} ({surah.ayat} ayat) {surahRecords.length > 0 ? `• ${surahRecords.length}x setoran` : ''}
                                    </span>
                                );
                            })}
                        </div>
                    </div>

                    {/* Recent Setoran in this Juz */}
                    {records.filter(r => r.juz === selectedJuzDetail).length > 0 ? (
                        <div className="pt-2 border-t border-teal-800/80">
                            <div className="text-[11px] font-bold text-teal-300 uppercase mb-1">
                                Riwayat Setoran Terakhir Juz Ini:
                            </div>
                            <div className="space-y-1 max-h-32 overflow-y-auto text-xs">
                                {records
                                    .filter(r => r.juz === selectedJuzDetail)
                                    .sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime())
                                    .slice(0, 5)
                                    .map(r => (
                                        <div key={r.id || r.tanggal} className="bg-black/30 p-2 rounded-lg flex items-center justify-between">
                                            <div>
                                                <span className="font-semibold text-teal-200">[{r.tanggal}]</span> {r.tipe} - QS. {r.surah} ({r.ayatAwal}-{r.ayatAkhir})
                                            </div>
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                                r.predikat === 'Sangat Lancar' ? 'bg-emerald-500/20 text-emerald-300' :
                                                r.predikat === 'Lancar' ? 'bg-teal-500/20 text-teal-300' : 'bg-amber-500/20 text-amber-300'
                                            }`}>
                                                {r.predikat}
                                            </span>
                                        </div>
                                    ))}
                            </div>
                        </div>
                    ) : (
                        <p className="text-xs text-teal-300/60 italic pt-2 border-t border-teal-800/80">
                            Belum ada catatan setoran pada Juz ini.
                        </p>
                    )}
                </div>
            )}
        </div>
    );
};
