import React, { useState, useEffect, useMemo } from 'react';
import { Santri, PondokSettings, TahfizhRecord } from '../../types';
import { getSemesterDateRange, ExtractedTemplateKey } from '../../services/raporExcelService';
import { db } from '../../db';
import { useAppContext } from '../../AppContext';

export interface StudentTahfizhAggregate {
    totalSetoran: number;
    ziyadahCount: number;
    murojaahCount: number;
    lastJuz: number;
    lastSurah: string;
    lastAyatRange: string;
    capaianText: string;
    avgScore: number | null;
    predikatDominan: string;
    catatanRingkas: string;
}

export interface TahfizhSyncPayload {
    aggregates: Record<number, StudentTahfizhAggregate>;
    mappedGrades: Record<number, Record<string, string>>;
}

interface RaporTahfizhSyncModalProps {
    isOpen: boolean;
    onClose: () => void;
    santriList: Santri[];
    rombelName: string;
    tahunAjaran: string;
    semester: 'Ganjil' | 'Genap';
    settings?: PondokSettings | null;
    inputKeys: ExtractedTemplateKey[];
    onSyncSuccess: (payload: TahfizhSyncPayload, autoSaveToDb: boolean) => Promise<void>;
}

function predikatToScore(predikat: TahfizhRecord['predikat']): number {
    if (predikat === 'Sangat Lancar') return 95;
    if (predikat === 'Lancar') return 85;
    if (predikat === 'Kurang Lancar') return 72;
    return 60;
}

function scoreToPredikat(score: number): string {
    if (score >= 90) return 'Sangat Lancar';
    if (score >= 80) return 'Lancar';
    if (score >= 70) return 'Kurang Lancar';
    return 'Perlu Bimbingan';
}

export const RaporTahfizhSyncModal: React.FC<RaporTahfizhSyncModalProps> = ({
    isOpen,
    onClose,
    santriList,
    rombelName,
    tahunAjaran,
    semester,
    settings,
    inputKeys,
    onSyncSuccess
}) => {
    const { showToast } = useAppContext();
    const defaultRange = getSemesterDateRange(tahunAjaran, semester, settings);

    const [startDate, setStartDate] = useState(defaultRange.startDate);
    const [endDate, setEndDate] = useState(defaultRange.endDate);
    const [isScanning, setIsScanning] = useState(false);
    const [isApplying, setIsApplying] = useState(false);
    const [aggregates, setAggregates] = useState<Record<number, StudentTahfizhAggregate>>({});
    const [autoSaveToDb, setAutoSaveToDb] = useState(false);

    // Mapping target key di template (opsional jika template memakai nama variabel kustom)
    const [nilaiTargetKey, setNilaiTargetKey] = useState<string>('');
    const [capaianTargetKey, setCapaianTargetKey] = useState<string>('');
    const [predikatTargetKey, setPredikatTargetKey] = useState<string>('');
    const [setoranTargetKey, setSetoranTargetKey] = useState<string>('');

    useEffect(() => {
        if (isOpen) {
            const range = getSemesterDateRange(tahunAjaran, semester, settings);
            setStartDate(range.startDate);
            setEndDate(range.endDate);

            // Auto-detect matching keys in template
            const findMatch = (patterns: string[]) =>
                inputKeys.find(k => patterns.some(p => k.key.toUpperCase().includes(p)))?.key || '';

            setNilaiTargetKey(findMatch(['NILAI_TAHFIZH', 'TAHFIZH_NILAI', 'TAHFIZH', 'HAFALAN']));
            setCapaianTargetKey(findMatch(['CAPAIAN_TAHFIZH', 'SURAH_TERAKHIR', 'JUZ_TERAKHIR', 'BATAS_HAFALAN']));
            setPredikatTargetKey(findMatch(['PREDIKAT_TAHFIZH', 'KELANCARAN_TAHFIZH']));
            setSetoranTargetKey(findMatch(['TOTAL_SETORAN', 'JUMLAH_SETORAN']));

            handleScan(range.startDate, range.endDate);
        }
    }, [isOpen, tahunAjaran, semester, inputKeys]);

    const handleScan = async (start: string, end: string) => {
        setIsScanning(true);
        try {
            const santriIdSet = new Set(santriList.map(s => s.id));
            const allRecords = await db.tahfizh
                .where('tanggal')
                .between(start, end, true, true)
                .toArray();

            const bySantri = new Map<number, TahfizhRecord[]>();
            allRecords.forEach(r => {
                if (santriIdSet.has(r.santriId)) {
                    const list = bySantri.get(r.santriId) || [];
                    list.push(r);
                    bySantri.set(r.santriId, list);
                }
            });

            const nextAgg: Record<number, StudentTahfizhAggregate> = {};
            santriList.forEach(s => {
                const logs = (bySantri.get(s.id) || []).sort((a, b) => a.tanggal.localeCompare(b.tanggal));
                if (logs.length === 0) {
                    nextAgg[s.id] = {
                        totalSetoran: 0,
                        ziyadahCount: 0,
                        murojaahCount: 0,
                        lastJuz: 0,
                        lastSurah: '',
                        lastAyatRange: '',
                        capaianText: '-',
                        avgScore: null,
                        predikatDominan: '-',
                        catatanRingkas: ''
                    };
                    return;
                }

                const ziyadahLogs = logs.filter(l => l.tipe === 'Ziyadah');
                const murojaahLogs = logs.filter(l => l.tipe === 'Murojaah');
                // Utamakan Ziyadah terakhir untuk batas capaian hafalan baru, fallback ke setoran terakhir apapun
                const latestRef = ziyadahLogs.length > 0 ? ziyadahLogs[ziyadahLogs.length - 1] : logs[logs.length - 1];

                const scores = logs.map(l => (typeof l.nilaiAngka === 'number' && l.nilaiAngka > 0 ? l.nilaiAngka : predikatToScore(l.predikat)));
                const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
                const pred = scoreToPredikat(avg);

                const ayatStr = latestRef.ayatAwal && latestRef.ayatAkhir
                    ? `${latestRef.ayatAwal}-${latestRef.ayatAkhir}`
                    : String(latestRef.ayatAkhir || latestRef.ayatAwal || '');
                const capaianText = `Juz ${latestRef.juz}, QS. ${latestRef.surah}${ayatStr ? `: ${ayatStr}` : ''}`;

                nextAgg[s.id] = {
                    totalSetoran: logs.length,
                    ziyadahCount: ziyadahLogs.length,
                    murojaahCount: murojaahLogs.length,
                    lastJuz: latestRef.juz,
                    lastSurah: latestRef.surah,
                    lastAyatRange: ayatStr,
                    capaianText,
                    avgScore: avg,
                    predikatDominan: pred,
                    catatanRingkas: latestRef.catatan || `Total ${logs.length} setoran (${ziyadahLogs.length} Ziyadah, ${murojaahLogs.length} Murojaah)`
                };
            });

            setAggregates(nextAgg);
        } catch (err: any) {
            showToast('Gagal memindai data Tahfizh: ' + err.message, 'error');
        } finally {
            setIsScanning(false);
        }
    };

    const studentsWithLogsCount = useMemo(
        () => Object.values(aggregates).filter(a => a.totalSetoran > 0).length,
        [aggregates]
    );

    if (!isOpen) return null;

    const handleApply = async () => {
        setIsApplying(true);
        try {
            const mappedGrades: Record<number, Record<string, string>> = {};
            santriList.forEach(s => {
                const agg = aggregates[s.id];
                if (!agg || agg.totalSetoran === 0) return;

                const entry: Record<string, string> = {
                    // Simpan ke key standar agar tag dinamis $CAPAIAN_TAHFIZH, $NILAI_TAHFIZH, dll otomatis terisi
                    CAPAIAN_TAHFIZH: agg.capaianText,
                    TOTAL_SETORAN_TAHFIZH: `${agg.totalSetoran} Setoran`,
                    PREDIKAT_TAHFIZH: agg.predikatDominan
                };
                if (agg.avgScore !== null) {
                    entry.NILAI_TAHFIZH = String(agg.avgScore);
                }

                // Isi juga ke variabel input template yang dipetakan guru
                if (nilaiTargetKey && agg.avgScore !== null) {
                    entry[nilaiTargetKey] = String(agg.avgScore);
                }
                if (capaianTargetKey) {
                    entry[capaianTargetKey] = agg.capaianText;
                }
                if (predikatTargetKey) {
                    entry[predikatTargetKey] = agg.predikatDominan;
                }
                if (setoranTargetKey) {
                    entry[setoranTargetKey] = String(agg.totalSetoran);
                }

                mappedGrades[s.id] = entry;
            });

            await onSyncSuccess({ aggregates, mappedGrades }, autoSaveToDb);
            showToast(
                `Data Tahfizh diterapkan untuk ${studentsWithLogsCount} santri yang memiliki riwayat setoran.`,
                'success'
            );
            onClose();
        } catch (err: any) {
            showToast('Gagal menerapkan data Tahfizh: ' + err.message, 'error');
        } finally {
            setIsApplying(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="px-6 py-4 bg-gradient-to-r from-teal-800 to-cyan-800 text-white flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center">
                            <i className="bi bi-journal-bookmark-fill text-lg text-teal-200"></i>
                        </div>
                        <div>
                            <h3 className="font-black text-base tracking-tight">Tarik Data Tahfizh Otomatis</h3>
                            <p className="text-xs text-teal-100">
                                {rombelName || 'Rombel'} • Semester {semester} {tahunAjaran}
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
                    >
                        <i className="bi bi-x-lg text-sm"></i>
                    </button>
                </div>

                {/* Body */}
                <div className="p-5 overflow-y-auto space-y-4 flex-1">
                    {/* Rentang Tanggal */}
                    <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                                Dari Tanggal
                            </label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={e => {
                                    setStartDate(e.target.value);
                                    handleScan(e.target.value, endDate);
                                }}
                                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-800"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                                Sampai Tanggal
                            </label>
                            <input
                                type="date"
                                value={endDate}
                                onChange={e => {
                                    setEndDate(e.target.value);
                                    handleScan(startDate, e.target.value);
                                }}
                                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-800"
                            />
                        </div>
                    </div>

                    {/* Pemetaan Kolom Template */}
                    {inputKeys.length > 0 && (
                        <div className="p-3.5 bg-teal-50/50 border border-teal-200/80 rounded-xl space-y-2.5">
                            <div className="text-xs font-bold text-teal-900 flex items-center justify-between">
                                <span>Pemetaan ke Kolom Input Template (Opsional)</span>
                                <span className="text-[10px] font-normal text-teal-700">
                                    Tag <code>$CAPAIAN_TAHFIZH</code> &amp; <code>$NILAI_TAHFIZH</code> tetap terisi otomatis
                                </span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                                        Isi Nilai Angka Tahfizh ke Kolom:
                                    </label>
                                    <select
                                        value={nilaiTargetKey}
                                        onChange={e => setNilaiTargetKey(e.target.value)}
                                        className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-xs font-semibold bg-white"
                                    >
                                        <option value="">-- Tidak Dipetakan ke Kolom Input --</option>
                                        {inputKeys.map(k => (
                                            <option key={k.key} value={k.key}>
                                                ${k.key} ({k.label})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                                        Isi Capaian Surah/Juz ke Kolom:
                                    </label>
                                    <select
                                        value={capaianTargetKey}
                                        onChange={e => setCapaianTargetKey(e.target.value)}
                                        className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-xs font-semibold bg-white"
                                    >
                                        <option value="">-- Tidak Dipetakan ke Kolom Input --</option>
                                        {inputKeys.map(k => (
                                            <option key={k.key} value={k.key}>
                                                ${k.key} ({k.label})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                                        Isi Predikat Kelancaran ke Kolom:
                                    </label>
                                    <select
                                        value={predikatTargetKey}
                                        onChange={e => setPredikatTargetKey(e.target.value)}
                                        className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-xs font-semibold bg-white"
                                    >
                                        <option value="">-- Tidak Dipetakan ke Kolom Input --</option>
                                        {inputKeys.map(k => (
                                            <option key={k.key} value={k.key}>
                                                ${k.key} ({k.label})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                                        Isi Jumlah Setoran ke Kolom:
                                    </label>
                                    <select
                                        value={setoranTargetKey}
                                        onChange={e => setSetoranTargetKey(e.target.value)}
                                        className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-xs font-semibold bg-white"
                                    >
                                        <option value="">-- Tidak Dipetakan ke Kolom Input --</option>
                                        {inputKeys.map(k => (
                                            <option key={k.key} value={k.key}>
                                                ${k.key} ({k.label})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Ringkasan Hasil Pindai */}
                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                        <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex items-center justify-between text-xs">
                            <span className="font-bold text-slate-700">
                                Pratinjau Rekap Setoran ({studentsWithLogsCount} dari {santriList.length} Santri Memiliki Catatan)
                            </span>
                            {isScanning && (
                                <span className="text-teal-600 font-bold flex items-center gap-1">
                                    <span className="w-3 h-3 border-2 border-teal-600 border-t-transparent rounded-full animate-spin"></span>
                                    Memindai...
                                </span>
                            )}
                        </div>
                        <div className="max-h-52 overflow-y-auto divide-y divide-slate-100 bg-white">
                            {santriList.map(s => {
                                const agg = aggregates[s.id];
                                const hasData = agg && agg.totalSetoran > 0;
                                return (
                                    <div key={s.id} className="px-4 py-2.5 flex items-center justify-between gap-3 text-xs">
                                        <div className="min-w-0">
                                            <div className="font-bold text-slate-800 truncate">{s.namaLengkap}</div>
                                            <div className="text-[11px] text-slate-500 truncate">
                                                {hasData ? agg.capaianText : 'Belum ada log setoran di rentang tanggal ini'}
                                            </div>
                                        </div>
                                        {hasData ? (
                                            <div className="flex items-center gap-1.5 shrink-0">
                                                <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-semibold text-[10px]">
                                                    {agg.totalSetoran}x
                                                </span>
                                                <span className="bg-teal-50 text-teal-800 border border-teal-200 px-2 py-0.5 rounded font-black font-mono text-[11px]">
                                                    {agg.avgScore} ({agg.predikatDominan})
                                                </span>
                                            </div>
                                        ) : (
                                            <span className="text-[10px] text-slate-400 italic shrink-0">Kosong</span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer text-xs font-semibold text-slate-700">
                        <input
                            type="checkbox"
                            checked={autoSaveToDb}
                            onChange={e => setAutoSaveToDb(e.target.checked)}
                            className="rounded text-teal-600 focus:ring-teal-500 w-4 h-4"
                        />
                        <span>Langsung simpan perubahan ke database rapor setelah diterapkan</span>
                    </label>
                </div>

                {/* Footer */}
                <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2 shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200"
                    >
                        Batal
                    </button>
                    <button
                        type="button"
                        disabled={isScanning || isApplying || studentsWithLogsCount === 0}
                        onClick={handleApply}
                        className="px-5 py-2 rounded-xl text-xs font-black bg-teal-600 hover:bg-teal-700 text-white shadow-sm disabled:opacity-40 flex items-center gap-1.5"
                    >
                        <i className="bi bi-check2-circle"></i>
                        <span>Terapkan Data Tahfizh ({studentsWithLogsCount} Santri)</span>
                    </button>
                </div>
            </div>
        </div>
    );
};
