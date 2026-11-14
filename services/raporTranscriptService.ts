import {
    MataPelajaran,
    PondokSettings,
    RaporRecord,
    RaporTemplate,
    Santri,
    TahfizhRecord
} from '../types';
import {
    calculatePredikat,
    classifyRaporInputField,
    PredikatResult
} from './raporCalculationService';
import { extractTemplateKeys } from './raporExcelService';
import {
    canonicalizeMapelLookupKey,
    computeDefaultKkmForPool,
    findMapelInMasterPool
} from '../utils/raporFormulaUtils';
import { loadXLSX } from '../utils/lazyClientLibs';
import { formatDate, resolveTempatRapor } from '../utils/formatters';
import { resolveMudirAamInfo } from '../utils/raporPlaceholderResolver';

export type TranscriptDocMode = 'transkrip' | 'buku_induk_6';
export type TranscriptJenjangScope = 'active_jenjang' | 'all';

export interface TranscriptPeriodSlot {
    slotId: string;
    tahunAjaran: string;
    semester: 'Ganjil' | 'Genap';
    semesterIndex: number; // 1-based
    romanLabel: string;    // I, II, III, IV, V, VI...
    shortLabel: string;    // Sem I, Sem II...
    kelasId?: number;
    kelasName: string;
    rombelId?: number;
    rombelName: string;
    jenjangId?: number;
    jenjangName: string;
    isPlaceholder: boolean;
}

export interface TranscriptCellScore {
    raw: string;
    numeric: number | null;
    isUntaughtDash: boolean;
}

export interface TranscriptSubjectRow {
    subjectId: string;
    mapelId?: number;
    kodeMapel?: string;
    nama: string;
    rumpun: string;
    kkm: number;
    sortOrder: number;
    scoresBySlot: Record<string, TranscriptCellScore>;
    numericCount: number;
    cumulativeSum: number;
    cumulativeAverage: number | null;
    cumulativePredikat: PredikatResult | null;
    isTuntas: boolean | null;
}

export interface TranscriptSemesterSummary {
    slotId: string;
    record: RaporRecord | null;
    numericCount: number;
    totalNilai: number;
    rataRata: number | null;
    predikat: PredikatResult | null;
    sakit: number;
    izin: number;
    alpha: number;
    totalAbsen: number;
    catatanWali: string;
    keputusan: string;
}

export interface TranscriptTahfizhSummary {
    totalRecords: number;
    distinctJuzCount: number;
    latestJuz?: number;
    latestSurah?: string;
    latestAyat?: string;
    latestPredikat?: string;
    averageScore?: number | null;
}

export interface StudentTranscriptData {
    santri: Santri;
    jenjangId?: number;
    jenjangName: string;
    kelasName: string;
    rombelName: string;
    slots: TranscriptPeriodSlot[];
    recordedSemesterCount: number;
    subjectRows: TranscriptSubjectRow[];
    semesterSummaries: Record<string, TranscriptSemesterSummary>;
    overallNumericSubjectCount: number;
    totalAccumulatedScore: number;
    cumulativeAverage: number | null;
    semesterMeanAverage: number | null;
    cumulativePredikat: PredikatResult | null;
    trendDelta: number | null;
    trendDirection: 'up' | 'down' | 'stable' | 'single' | 'none';
    totalSakit: number;
    totalIzin: number;
    totalAlpha: number;
    totalAbsen: number;
    latestKeputusan: string;
    tahfizhSummary: TranscriptTahfizhSummary | null;
    cohortRank: number;
}

const ROMAN_NUMERALS = [
    'I', 'II', 'III', 'IV', 'V', 'VI',
    'VII', 'VIII', 'IX', 'X', 'XI', 'XII'
];

export const toRomanSemester = (num: number): string => {
    if (num >= 1 && num <= ROMAN_NUMERALS.length) {
        return ROMAN_NUMERALS[num - 1];
    }
    return String(num);
};

export const parseAcademicStartYear = (tahunAjaran: string): number => {
    const cleaned = (tahunAjaran || '').trim();
    const match = cleaned.match(/(\d{4})/);
    return match ? parseInt(match[1], 10) : 0;
};

export const compareAcademicPeriodsChronologically = (
    a: { tahunAjaran: string; semester: string },
    b: { tahunAjaran: string; semester: string }
): number => {
    const yA = parseAcademicStartYear(a.tahunAjaran);
    const yB = parseAcademicStartYear(b.tahunAjaran);
    if (yA !== yB) return yA - yB;
    const tCmp = (a.tahunAjaran || '').localeCompare(b.tahunAjaran || '');
    if (tCmp !== 0) return tCmp;
    const sA = a.semester === 'Ganjil' ? 1 : 2;
    const sB = b.semester === 'Ganjil' ? 1 : 2;
    return sA - sB;
};

/**
 * Mencari template rapor yang paling spesifik untuk suatu RaporRecord historis
 */
export const findBestTemplateForRecord = (
    record: RaporRecord,
    templates: RaporTemplate[],
    settings: PondokSettings
): RaporTemplate | null => {
    if (!templates || templates.length === 0) return null;

    const rId = record.rombelId;
    const rombelObj = rId ? settings.rombel.find(r => r.id === rId) : undefined;
    const kId = record.kelasId || rombelObj?.kelasId;
    const kelasObj = kId ? settings.kelas.find(k => k.id === kId) : undefined;
    const jId = record.jenjangId || kelasObj?.jenjangId;

    // 1. Exact rombel match
    if (rId) {
        const byRombel = templates.find(t => t.rombelId === rId);
        if (byRombel) return byRombel;
    }
    // 2. Exact kelas match (without conflicting rombel lock)
    if (kId) {
        const byKelas = templates.find(t => t.kelasId === kId && !t.rombelId);
        if (byKelas) return byKelas;
    }
    // 3. Exact jenjang match (without conflicting kelas/rombel lock)
    if (jId) {
        const byJenjang = templates.find(t => t.jenjangId === jId && !t.kelasId && !t.rombelId);
        if (byJenjang) return byJenjang;
    }
    // 4. Universal template (unlocked)
    const universal = templates.find(t => !t.jenjangId && !t.kelasId && !t.rombelId);
    if (universal) return universal;

    // 5. Fallback to any template in same jenjang
    if (jId) {
        const anyInJenjang = templates.find(t => t.jenjangId === jId);
        if (anyInJenjang) return anyInJenjang;
    }

    return templates[0] || null;
};

const cleanDisplaySubjectLabel = (rawLabel: string): string => {
    const trimmed = (rawLabel || '').trim().replace(/^\$+/, '');
    if (!trimmed) return 'Mata Pelajaran';
    // Strip leading row numbering like "1. " or "10) " while keeping "B. Arab" intact
    const noNumber = trimmed.replace(/^[0-9٠-٩]{1,2}\s*[.)\-:]\s*/, '').trim();
    if (/^[A-Z0-9_]+$/.test(noNumber) && noNumber.includes('_')) {
        return noNumber
            .replace(/^(?:NILAI|ANGKA|SKOR|MAPEL)_+/i, '')
            .split('_')
            .filter(Boolean)
            .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
            .join(' ');
    }
    return noNumber || trimmed;
};

const buildTahfizhSummaryForSantri = (
    santriId: number,
    tahfizhRecords?: TahfizhRecord[],
    raporRecords?: RaporRecord[]
): TranscriptTahfizhSummary | null => {
    const list = (tahfizhRecords || [])
        .filter(t => !t.deleted && Number(t.santriId) === Number(santriId))
        .sort((a, b) => (b.tanggal || '').localeCompare(a.tanggal || '') || (b.id || 0) - (a.id || 0));

    if (list.length > 0) {
        const latest = list[0];
        const distinctJuz = new Set(list.map(t => t.juz).filter(Boolean));
        const numericScores = list
            .map(t => t.nilaiAngka)
            .filter((v): v is number => typeof v === 'number' && isFinite(v));
        const avgScore = numericScores.length > 0
            ? Math.round(((numericScores.reduce((acc, v) => acc + v, 0) / numericScores.length) + Number.EPSILON) * 100) / 100
            : null;

        return {
            totalRecords: list.length,
            distinctJuzCount: distinctJuz.size,
            latestJuz: latest.juz,
            latestSurah: latest.surah,
            latestAyat: latest.ayatAwal && latest.ayatAkhir ? `${latest.ayatAwal}-${latest.ayatAkhir}` : undefined,
            latestPredikat: latest.predikat,
            averageScore: avgScore
        };
    }

    // Fallback ke snapshot tahfizh pada RaporRecord terakhir jika tabel tahfizh kosong
    if (raporRecords && raporRecords.length > 0) {
        const sortedRecs = [...raporRecords].sort((a, b) => -compareAcademicPeriodsChronologically(a, b));
        for (const r of sortedRecs) {
            const snap = r.semester === 'Genap' ? (r.tahfizhGenap || r.tahfizhGanjil) : (r.tahfizhGanjil || r.tahfizhGenap);
            if (snap && (snap.lastSurah || snap.lastJuz)) {
                return {
                    totalRecords: 0,
                    distinctJuzCount: snap.lastJuz ? 1 : 0,
                    latestJuz: snap.lastJuz,
                    latestSurah: snap.lastSurah,
                    latestPredikat: snap.averagePredikat,
                    averageScore: null
                };
            }
        }
    }

    return null;
};

/**
 * Membangun data Transkrip Kumulatif / Buku Induk Nilai lintas semester untuk 1 santri
 */
export const buildStudentTranscript = (params: {
    santri: Santri;
    allRaporRecords: RaporRecord[];
    settings: PondokSettings;
    tahfizhRecords?: TahfizhRecord[];
    docMode?: TranscriptDocMode;
    jenjangScope?: TranscriptJenjangScope;
    targetJenjangId?: number;
    includeMasterCurriculumSubjects?: boolean;
}): Omit<StudentTranscriptData, 'cohortRank'> => {
    const {
        santri,
        allRaporRecords,
        settings,
        tahfizhRecords,
        docMode = 'transkrip',
        jenjangScope = 'active_jenjang',
        targetJenjangId,
        includeMasterCurriculumSubjects = false
    } = params;

    const currentRombel = settings.rombel.find(r => r.id === santri.rombelId);
    const currentKelas = currentRombel
        ? settings.kelas.find(k => k.id === currentRombel.kelasId)
        : settings.kelas.find(k => k.id === santri.kelasId);
    const currentJenjang = currentKelas
        ? settings.jenjang.find(j => j.id === currentKelas.jenjangId)
        : settings.jenjang.find(j => j.id === santri.jenjangId);

    const effectiveJenjangId = targetJenjangId ?? currentJenjang?.id ?? santri.jenjangId;
    const effectiveJenjangObj = effectiveJenjangId
        ? settings.jenjang.find(j => j.id === effectiveJenjangId)
        : currentJenjang;

    // 1. Deduplicate active RaporRecords for this santri per (tahunAjaran + semester)
    const dedupedByPeriod = new Map<string, RaporRecord>();
    for (const rec of allRaporRecords) {
        if (!rec || rec.deleted || Number(rec.santriId) !== Number(santri.id)) continue;

        if (jenjangScope === 'active_jenjang' && effectiveJenjangId) {
            const recRombel = rec.rombelId ? settings.rombel.find(r => r.id === rec.rombelId) : undefined;
            const recKelas = rec.kelasId
                ? settings.kelas.find(k => k.id === rec.kelasId)
                : recRombel
                ? settings.kelas.find(k => k.id === recRombel.kelasId)
                : undefined;
            const recJenjangId = rec.jenjangId || recKelas?.jenjangId;
            if (recJenjangId && Number(recJenjangId) !== Number(effectiveJenjangId)) {
                continue;
            }
        }

        const pKey = `${(rec.tahunAjaran || '').trim()}::${rec.semester}`;
        const prev = dedupedByPeriod.get(pKey);
        if (!prev || (rec.lastModified || 0) >= (prev.lastModified || 0)) {
            dedupedByPeriod.set(pKey, rec);
        }
    }

    const sortedRecords = Array.from(dedupedByPeriod.values()).sort(compareAcademicPeriodsChronologically);

    // 2. Construct Semester Slots
    const slots: TranscriptPeriodSlot[] = sortedRecords.map((rec, idx) => {
        const semIdx = idx + 1;
        const roman = toRomanSemester(semIdx);
        const rObj = rec.rombelId ? settings.rombel.find(r => r.id === rec.rombelId) : undefined;
        const kObj = rec.kelasId
            ? settings.kelas.find(k => k.id === rec.kelasId)
            : rObj
            ? settings.kelas.find(k => k.id === rObj.kelasId)
            : undefined;
        const jObj = rec.jenjangId
            ? settings.jenjang.find(j => j.id === rec.jenjangId)
            : kObj
            ? settings.jenjang.find(j => j.id === kObj.jenjangId)
            : effectiveJenjangObj;

        return {
            slotId: `${rec.tahunAjaran.trim()}::${rec.semester}`,
            tahunAjaran: rec.tahunAjaran.trim(),
            semester: rec.semester,
            semesterIndex: semIdx,
            romanLabel: roman,
            shortLabel: `Sem ${roman}`,
            kelasId: kObj?.id,
            kelasName: kObj?.nama || currentKelas?.nama || '-',
            rombelId: rObj?.id,
            rombelName: rObj?.nama || currentRombel?.nama || '-',
            jenjangId: jObj?.id,
            jenjangName: jObj?.nama || effectiveJenjangObj?.nama || '-',
            isPlaceholder: false
        };
    });

    const recordedSemesterCount = slots.length;

    // Jika mode Buku Induk 6 Semester, lengkapi slot hingga minimal 6 kolom (Sem I - VI)
    if (docMode === 'buku_induk_6' && slots.length < 6) {
        let baseStartYear = slots.length > 0
            ? parseAcademicStartYear(slots[0].tahunAjaran)
            : (santri.tanggalMasuk ? parseInt(santri.tanggalMasuk.slice(0, 4), 10) : new Date().getFullYear());
        if (!baseStartYear || isNaN(baseStartYear)) {
            baseStartYear = new Date().getFullYear();
        }

        for (let i = slots.length; i < 6; i++) {
            const semIdx = i + 1;
            const roman = toRomanSemester(semIdx);
            const yearOffset = Math.floor(i / 2);
            const semType: 'Ganjil' | 'Genap' = i % 2 === 0 ? 'Ganjil' : 'Genap';
            const estStart = baseStartYear + yearOffset;
            const estTahun = slots.length > 0 ? '' : `${estStart}/${estStart + 1}`;
            slots.push({
                slotId: `placeholder_sem_${semIdx}`,
                tahunAjaran: estTahun,
                semester: semType,
                semesterIndex: semIdx,
                romanLabel: roman,
                shortLabel: `Sem ${roman}`,
                kelasName: '-',
                rombelName: '-',
                jenjangId: effectiveJenjangId,
                jenjangName: effectiveJenjangObj?.nama || '-',
                isPlaceholder: true
            });
        }
    }

    // 3. Extract subjects & scores across all recorded semesters
    const templates = (settings.raporTemplates || []) as RaporTemplate[];
    const masterMapelList = settings.mataPelajaran || [];

    interface MutableSubjectAccum {
        subjectId: string;
        mapelId?: number;
        kodeMapel?: string;
        nama: string;
        rumpun: string;
        kkm: number;
        sortOrder: number;
        scoresBySlot: Record<string, TranscriptCellScore>;
    }

    const subjectAccumMap = new Map<string, MutableSubjectAccum>();
    let dynamicOrderCounter = 1000;

    // Pre-seed Master Mata Pelajaran jika diminta atau pada mode Buku Induk ketika belum ada record
    if (includeMasterCurriculumSubjects || (docMode === 'buku_induk_6' && sortedRecords.length === 0)) {
        const scopedMaster = effectiveJenjangId
            ? masterMapelList.filter(mp => !mp.jenjangId || Number(mp.jenjangId) === Number(effectiveJenjangId))
            : masterMapelList;
        const defaultKkm = computeDefaultKkmForPool(masterMapelList, effectiveJenjangId);

        scopedMaster.forEach((mp, idx) => {
            const subjectId = `mapel_${mp.id}`;
            subjectAccumMap.set(subjectId, {
                subjectId,
                mapelId: mp.id,
                kodeMapel: mp.kodeMapel,
                nama: mp.nama,
                rumpun: mp.rumpun || 'Umum',
                kkm: mp.kkm ?? defaultKkm,
                sortOrder: idx + 1,
                scoresBySlot: {}
            });
        });
    }

    const ensureSubjectEntry = (paramsEntry: {
        rawKey: string;
        label?: string;
        jenjangId?: number;
        explicitMapel?: MataPelajaran;
    }): MutableSubjectAccum => {
        const { rawKey, label, jenjangId, explicitMapel } = paramsEntry;
        const matchedMp =
            explicitMapel ||
            findMapelInMasterPool([label || '', rawKey].filter(Boolean), masterMapelList, jenjangId);

        const defaultKkm = computeDefaultKkmForPool(masterMapelList, jenjangId);

        if (matchedMp) {
            const subjectId = `mapel_${matchedMp.id}`;
            const existing = subjectAccumMap.get(subjectId);
            if (existing) return existing;

            const masterIdx = masterMapelList.findIndex(m => m.id === matchedMp.id);
            const created: MutableSubjectAccum = {
                subjectId,
                mapelId: matchedMp.id,
                kodeMapel: matchedMp.kodeMapel,
                nama: matchedMp.nama,
                rumpun: matchedMp.rumpun || 'Umum',
                kkm: matchedMp.kkm ?? defaultKkm,
                sortOrder: masterIdx >= 0 ? masterIdx + 1 : ++dynamicOrderCounter,
                scoresBySlot: {}
            };
            subjectAccumMap.set(subjectId, created);
            return created;
        }

        const displayLabel = cleanDisplaySubjectLabel(label || rawKey);
        const canon = canonicalizeMapelLookupKey(displayLabel) || canonicalizeMapelLookupKey(rawKey) || rawKey.toUpperCase();
        const subjectId = `custom_${canon}`;
        const existing = subjectAccumMap.get(subjectId);
        if (existing) {
            // Upgrade nama jika label baru lebih deskriptif daripada kode kapital
            if (/^[A-Z0-9_]+$/.test(existing.nama) && !/^[A-Z0-9_]+$/.test(displayLabel)) {
                existing.nama = displayLabel;
            }
            return existing;
        }

        const created: MutableSubjectAccum = {
            subjectId,
            nama: displayLabel,
            rumpun: 'Muatan Lokal',
            kkm: defaultKkm,
            sortOrder: ++dynamicOrderCounter,
            scoresBySlot: {}
        };
        subjectAccumMap.set(subjectId, created);
        return created;
    };

    const semesterSummaries: Record<string, TranscriptSemesterSummary> = {};

    sortedRecords.forEach((rec, idx) => {
        const slot = slots[idx];
        const slotId = slot.slotId;
        const recJenjangId = slot.jenjangId || effectiveJenjangId;
        const matchedTemplate = findBestTemplateForRecord(rec, templates, settings);

        const tplKeys = matchedTemplate ? extractTemplateKeys(matchedTemplate, 'all') : [];
        const tplKeyMetaMap = new Map<string, { label: string; type: string; inputMode?: any }>();
        tplKeys.forEach(tk => {
            tplKeyMetaMap.set(tk.key, { label: tk.label, type: tk.type, inputMode: tk.inputMode });
            tplKeyMetaMap.set(tk.key.toUpperCase(), { label: tk.label, type: tk.type, inputMode: tk.inputMode });
        });

        let customData: Record<string, any> = {};
        if (rec.customData) {
            try {
                customData = typeof rec.customData === 'string' ? JSON.parse(rec.customData) : rec.customData;
            } catch {
                customData = {};
            }
        }

        let semNumericCount = 0;
        let semTotalNilai = 0;

        // Pass A: Read ordered template keys first (preserves template curriculum order)
        const processedRawKeys = new Set<string>();
        tplKeys.forEach(tk => {
            const rawVal = customData[tk.key];
            processedRawKeys.add(tk.key);
            if (rawVal === undefined || rawVal === null) return;
            const strVal = String(rawVal).trim();
            if (strVal === '') return;

            const cls = classifyRaporInputField({
                key: tk.key,
                label: tk.label,
                type: tk.type,
                inputMode: tk.inputMode,
                mataPelajaran: masterMapelList,
                jenjangId: recJenjangId
            });
            if (!cls.isNumericScore) return;

            const subj = ensureSubjectEntry({
                rawKey: tk.key,
                label: tk.label,
                jenjangId: recJenjangId
            });

            if (strVal === '-') {
                if (!subj.scoresBySlot[slotId]) {
                    subj.scoresBySlot[slotId] = { raw: '-', numeric: null, isUntaughtDash: true };
                }
                return;
            }

            const num = Number(strVal.replace(',', '.'));
            if (!isNaN(num) && isFinite(num)) {
                subj.scoresBySlot[slotId] = { raw: strVal, numeric: num, isUntaughtDash: false };
                semTotalNilai += num;
                semNumericCount += 1;
            }
        });

        // Pass B: Read any extra customData keys not in current template (e.g., template edited later)
        Object.entries(customData).forEach(([rawKey, rawVal]) => {
            if (!rawKey || rawKey.startsWith('_') || processedRawKeys.has(rawKey)) return;
            if (rawVal === undefined || rawVal === null) return;
            const strVal = String(rawVal).trim();
            if (strVal === '') return;

            const meta = tplKeyMetaMap.get(rawKey) || tplKeyMetaMap.get(rawKey.toUpperCase());
            const cls = classifyRaporInputField({
                key: rawKey,
                label: meta?.label,
                type: meta?.type,
                inputMode: meta?.inputMode,
                mataPelajaran: masterMapelList,
                jenjangId: recJenjangId
            });
            if (!cls.isNumericScore) return;

            const subj = ensureSubjectEntry({
                rawKey,
                label: meta?.label,
                jenjangId: recJenjangId
            });

            // Jika sudah terisi nilai angka pada slot yang sama, jangan timpa dengan duplikat
            if (subj.scoresBySlot[slotId]?.numeric !== null && subj.scoresBySlot[slotId]?.numeric !== undefined) {
                return;
            }

            if (strVal === '-') {
                subj.scoresBySlot[slotId] = { raw: '-', numeric: null, isUntaughtDash: true };
                return;
            }

            const num = Number(strVal.replace(',', '.'));
            if (!isNaN(num) && isFinite(num)) {
                subj.scoresBySlot[slotId] = { raw: strVal, numeric: num, isUntaughtDash: false };
                semTotalNilai += num;
                semNumericCount += 1;
            }
        });

        // Pass C: Read structured `rec.nilai` array fallback
        if (Array.isArray(rec.nilai)) {
            rec.nilai.forEach(item => {
                if (!item || typeof item.nilaiAngka !== 'number' || !isFinite(item.nilaiAngka)) return;
                const mp = masterMapelList.find(m => Number(m.id) === Number(item.mapelId));
                const subj = ensureSubjectEntry({
                    rawKey: mp?.kodeMapel || mp?.nama || `MAPEL_${item.mapelId}`,
                    label: mp?.nama,
                    jenjangId: recJenjangId,
                    explicitMapel: mp
                });
                if (subj.scoresBySlot[slotId]?.numeric !== null && subj.scoresBySlot[slotId]?.numeric !== undefined) {
                    return;
                }
                subj.scoresBySlot[slotId] = {
                    raw: String(item.nilaiAngka),
                    numeric: item.nilaiAngka,
                    isUntaughtDash: false
                };
                semTotalNilai += item.nilaiAngka;
                semNumericCount += 1;
            });
        }

        // Attendance & decision resolution for this semester
        const findNum = (...keys: string[]): number | undefined => {
            for (const k of keys) {
                if (customData[k] !== undefined && String(customData[k]).trim() !== '' && String(customData[k]).trim() !== '-') {
                    const n = Number(String(customData[k]).trim().replace(',', '.'));
                    if (!isNaN(n) && isFinite(n)) return n;
                }
            }
            return undefined;
        };

        const findText = (...keys: string[]): string => {
            for (const k of keys) {
                if (customData[k] && String(customData[k]).trim() !== '') {
                    return String(customData[k]).trim();
                }
            }
            return '';
        };

        const sakit = rec.sakit ?? (findNum('SAKIT', 'sakit', 'S', 'ABSENSI_SAKIT') ?? 0);
        const izin = rec.izin ?? (findNum('IZIN', 'izin', 'I', 'ABSENSI_IZIN') ?? 0);
        const alpha = rec.alpha ?? (findNum('ALPHA', 'alpha', 'ALPA', 'alpa', 'A', 'ABSENSI_ALPHA') ?? 0);
        const catatanWali = rec.catatanWaliKelas || findText('CATATAN_WALI_KELAS', 'catatanWaliKelas', 'CATATAN_WALI', 'catatan_wali');
        const keputusan = rec.keputusan || findText('KEPUTUSAN', 'keputusan', 'STATUS_KELULUSAN');

        const cleanTotal = semNumericCount > 0
            ? Math.round((semTotalNilai + Number.EPSILON) * 10000) / 10000
            : 0;
        const semAvg = semNumericCount > 0
            ? Math.round(((cleanTotal / semNumericCount) + Number.EPSILON) * 10000) / 10000
            : null;

        semesterSummaries[slotId] = {
            slotId,
            record: rec,
            numericCount: semNumericCount,
            totalNilai: cleanTotal,
            rataRata: semAvg,
            predikat: semAvg !== null ? calculatePredikat(semAvg) : null,
            sakit,
            izin,
            alpha,
            totalAbsen: sakit + izin + alpha,
            catatanWali,
            keputusan
        };
    });

    // Populate empty summaries for placeholder slots in Buku Induk mode
    slots.forEach(slot => {
        if (!semesterSummaries[slot.slotId]) {
            semesterSummaries[slot.slotId] = {
                slotId: slot.slotId,
                record: null,
                numericCount: 0,
                totalNilai: 0,
                rataRata: null,
                predikat: null,
                sakit: 0,
                izin: 0,
                alpha: 0,
                totalAbsen: 0,
                catatanWali: '',
                keputusan: ''
            };
        }
    });

    // 4. Finalize Subject Rows & Cumulative Subject Averages
    const subjectRows: TranscriptSubjectRow[] = Array.from(subjectAccumMap.values())
        .sort((a, b) => a.sortOrder - b.sortOrder || a.nama.localeCompare(b.nama))
        .map(item => {
            let numericCount = 0;
            let cumulativeSum = 0;

            slots.forEach(slot => {
                const cell = item.scoresBySlot[slot.slotId];
                if (cell && typeof cell.numeric === 'number' && isFinite(cell.numeric)) {
                    cumulativeSum += cell.numeric;
                    numericCount += 1;
                }
            });

            cumulativeSum = numericCount > 0 ? Math.round((cumulativeSum + Number.EPSILON) * 10000) / 10000 : 0;
            const cumulativeAverage = numericCount > 0
                ? Math.round(((cumulativeSum / numericCount) + Number.EPSILON) * 10000) / 10000
                : null;
            const cumulativePredikat = cumulativeAverage !== null ? calculatePredikat(cumulativeAverage) : null;
            const isTuntas = cumulativeAverage !== null ? cumulativeAverage >= item.kkm - 1e-6 : null;

            return {
                subjectId: item.subjectId,
                mapelId: item.mapelId,
                kodeMapel: item.kodeMapel,
                nama: item.nama,
                rumpun: item.rumpun,
                kkm: item.kkm,
                sortOrder: item.sortOrder,
                scoresBySlot: item.scoresBySlot,
                numericCount,
                cumulativeSum,
                cumulativeAverage,
                cumulativePredikat,
                isTuntas
            };
        });

    // 5. Overall Cumulative Stats & Progression Trend
    const scoredSubjects = subjectRows.filter(r => r.cumulativeAverage !== null);
    const overallNumericSubjectCount = scoredSubjects.length;

    const cumulativeAverage = overallNumericSubjectCount > 0
        ? Math.round(
              ((scoredSubjects.reduce((acc, r) => acc + (r.cumulativeAverage || 0), 0) / overallNumericSubjectCount) +
                  Number.EPSILON) *
                  10000
          ) / 10000
        : null;

    const activeSemesterSummaries = slots
        .filter(s => !s.isPlaceholder)
        .map(s => semesterSummaries[s.slotId])
        .filter(sum => sum && sum.rataRata !== null);

    const semesterMeanAverage = activeSemesterSummaries.length > 0
        ? Math.round(
              ((activeSemesterSummaries.reduce((acc, s) => acc + (s.rataRata || 0), 0) / activeSemesterSummaries.length) +
                  Number.EPSILON) *
                  10000
          ) / 10000
        : null;

    const totalAccumulatedScore = scoredSubjects.reduce((acc, r) => acc + (r.cumulativeAverage || 0), 0);

    let trendDelta: number | null = null;
    let trendDirection: StudentTranscriptData['trendDirection'] = 'none';
    if (activeSemesterSummaries.length >= 2) {
        const firstAvg = activeSemesterSummaries[0].rataRata || 0;
        const lastAvg = activeSemesterSummaries[activeSemesterSummaries.length - 1].rataRata || 0;
        trendDelta = Math.round(((lastAvg - firstAvg) + Number.EPSILON) * 100) / 100;
        if (trendDelta > 0.25) trendDirection = 'up';
        else if (trendDelta < -0.25) trendDirection = 'down';
        else trendDirection = 'stable';
    } else if (activeSemesterSummaries.length === 1) {
        trendDirection = 'single';
    }

    const totalSakit = slots.reduce((acc, s) => acc + (semesterSummaries[s.slotId]?.sakit || 0), 0);
    const totalIzin = slots.reduce((acc, s) => acc + (semesterSummaries[s.slotId]?.izin || 0), 0);
    const totalAlpha = slots.reduce((acc, s) => acc + (semesterSummaries[s.slotId]?.alpha || 0), 0);

    const reversedActive = [...activeSemesterSummaries].reverse();
    const latestKeputusan = reversedActive.find(s => s.keputusan)?.keputusan || '';

    const tahfizhSummary = buildTahfizhSummaryForSantri(santri.id, tahfizhRecords, sortedRecords);

    return {
        santri,
        jenjangId: effectiveJenjangId,
        jenjangName: effectiveJenjangObj?.nama || '-',
        kelasName: currentKelas?.nama || '-',
        rombelName: currentRombel?.nama || '-',
        slots,
        recordedSemesterCount,
        subjectRows,
        semesterSummaries,
        overallNumericSubjectCount,
        totalAccumulatedScore: Math.round((totalAccumulatedScore + Number.EPSILON) * 10000) / 10000,
        cumulativeAverage,
        semesterMeanAverage,
        cumulativePredikat: cumulativeAverage !== null ? calculatePredikat(cumulativeAverage) : null,
        trendDelta,
        trendDirection,
        totalSakit,
        totalIzin,
        totalAlpha,
        totalAbsen: totalSakit + totalIzin + totalAlpha,
        latestKeputusan,
        tahfizhSummary
    };
};

/**
 * Membangun rekapitulasi transkrip lintas semester untuk satu kohort (Rombel / Kelas / Jenjang)
 * lengkap dengan pemeringkatan kumulatif yang adil (berbasis Rata-Rata Kumulatif, tie-breaker Total Skor).
 */
export const buildCohortTranscriptSummary = (params: {
    santriList: Santri[];
    allRaporRecords: RaporRecord[];
    settings: PondokSettings;
    tahfizhRecords?: TahfizhRecord[];
    docMode?: TranscriptDocMode;
    jenjangScope?: TranscriptJenjangScope;
    targetJenjangId?: number;
    includeMasterCurriculumSubjects?: boolean;
}): {
    students: StudentTranscriptData[];
    unionPeriods: Array<{ slotId: string; tahunAjaran: string; semester: 'Ganjil' | 'Genap'; label: string }>;
    cohortAverage: number;
    scoredStudentCount: number;
    maxSemestersRecorded: number;
    upwardTrendCount: number;
} => {
    const rawList = params.santriList.map(santri =>
        buildStudentTranscript({
            ...params,
            santri
        })
    );

    // Compute fair cohort cumulative rankings based on cumulativeAverage (tie-breaker: recordedSemesterCount & totalAccumulatedScore)
    const scored = rawList.filter(s => s.cumulativeAverage !== null);
    const sortedForRank = [...scored].sort((a, b) => {
        const avgDiff = (b.cumulativeAverage || 0) - (a.cumulativeAverage || 0);
        if (Math.abs(avgDiff) > 1e-6) return avgDiff;
        if (b.recordedSemesterCount !== a.recordedSemesterCount) {
            return b.recordedSemesterCount - a.recordedSemesterCount;
        }
        return b.totalAccumulatedScore - a.totalAccumulatedScore;
    });

    const rankMap = new Map<number, number>();
    let currentRank = 1;
    for (let i = 0; i < sortedForRank.length; i++) {
        if (i > 0) {
            const prev = sortedForRank[i - 1];
            const curr = sortedForRank[i];
            const tied =
                Math.abs((curr.cumulativeAverage || 0) - (prev.cumulativeAverage || 0)) <= 1e-6 &&
                Math.abs(curr.totalAccumulatedScore - prev.totalAccumulatedScore) <= 1e-6;
            if (!tied) currentRank = i + 1;
        }
        rankMap.set(sortedForRank[i].santri.id, currentRank);
    }

    const students: StudentTranscriptData[] = rawList.map(item => ({
        ...item,
        cohortRank: rankMap.get(item.santri.id) || 0
    }));

    // Collect chronological union of real recorded periods across cohort
    const periodMap = new Map<string, { slotId: string; tahunAjaran: string; semester: 'Ganjil' | 'Genap' }>();
    students.forEach(st => {
        st.slots.forEach(sl => {
            if (!sl.isPlaceholder && !periodMap.has(sl.slotId)) {
                periodMap.set(sl.slotId, {
                    slotId: sl.slotId,
                    tahunAjaran: sl.tahunAjaran,
                    semester: sl.semester
                });
            }
        });
    });

    const unionPeriods = Array.from(periodMap.values())
        .sort(compareAcademicPeriodsChronologically)
        .map((p, idx) => ({
            ...p,
            label: `${p.tahunAjaran} (${p.semester === 'Ganjil' ? 'Gjl' : 'Gnp'}) • Sem ${toRomanSemester(idx + 1)}`
        }));

    const cohortAverage = scored.length > 0
        ? Math.round(
              ((scored.reduce((acc, s) => acc + (s.cumulativeAverage || 0), 0) / scored.length) + Number.EPSILON) * 100
          ) / 100
        : 0;

    const maxSemestersRecorded = students.reduce((mx, s) => Math.max(mx, s.recordedSemesterCount), 0);
    const upwardTrendCount = students.filter(s => s.trendDirection === 'up').length;

    return {
        students,
        unionPeriods,
        cohortAverage,
        scoredStudentCount: scored.length,
        maxSemestersRecorded,
        upwardTrendCount
    };
};

/**
 * Ekspor Transkrip / Buku Induk 1 Santri ke Excel (.xlsx)
 */
export const exportStudentTranscriptToExcel = async (params: {
    data: StudentTranscriptData;
    settings: PondokSettings;
    docMode: TranscriptDocMode;
    decimalPlaces: 0 | 1 | 2;
    nomorDokumen?: string;
}): Promise<string> => {
    const { data, settings, docMode, decimalPlaces, nomorDokumen } = params;
    const XLSX = await loadXLSX();
    const wb = XLSX.utils.book_new();
    const fmt = (val: number | null) => (val !== null ? Number(val.toFixed(decimalPlaces)) : '-');

    const titleText =
        docMode === 'buku_induk_6'
            ? 'LEMBAR BUKU INDUK NILAI HASIL BELAJAR SANTRI'
            : 'TRANSKRIP NILAI AKADEMIK KUMULATIF SANTRI';

    const aoa: any[][] = [];
    aoa.push([(settings.namaPonpes || 'PONDOK PESANTREN').toUpperCase()]);
    aoa.push([titleText]);
    if (nomorDokumen?.trim()) {
        aoa.push([`Nomor Dokumen: ${nomorDokumen.trim()}`]);
    }
    aoa.push([]);

    aoa.push([
        'Nama Santri',
        `: ${data.santri.namaLengkap}`,
        '',
        'Marhalah / Jenjang',
        `: ${data.jenjangName}`
    ]);
    aoa.push([
        'NIS / NISN',
        `: ${data.santri.nis || '-'} / ${data.santri.nisn || '-'}`,
        '',
        'Kelas / Rombel Terakhir',
        `: ${data.kelasName} / ${data.rombelName}`
    ]);
    aoa.push([
        'Tempat, Tgl Lahir',
        `: ${data.santri.tempatLahir || '-'}, ${formatDate(data.santri.tanggalLahir)}`,
        '',
        'Status Santri',
        `: ${data.santri.status || 'Aktif'}`
    ]);
    aoa.push([]);

    const headers = [
        'No',
        'Mata Pelajaran',
        'Rumpun',
        'KKM',
        ...data.slots.map(s =>
            s.isPlaceholder
                ? `${s.shortLabel} (Belum Terisi)`
                : `${s.shortLabel} - ${s.tahunAjaran} ${s.semester} (${s.rombelName})`
        ),
        'Rata-Rata Kumulatif',
        'Predikat',
        'Ketuntasan'
    ];
    aoa.push(headers);

    data.subjectRows.forEach((row, idx) => {
        aoa.push([
            idx + 1,
            row.nama,
            row.rumpun,
            row.kkm,
            ...data.slots.map(s => {
                const c = row.scoresBySlot[s.slotId];
                if (!c) return '-';
                if (c.isUntaughtDash) return '-';
                return c.numeric !== null ? c.numeric : c.raw || '-';
            }),
            fmt(row.cumulativeAverage),
            row.cumulativePredikat ? `${row.cumulativePredikat.predikat} (${row.cumulativePredikat.predikatHuruf})` : '-',
            row.isTuntas === null ? '-' : row.isTuntas ? 'Tuntas' : 'Belum Tuntas'
        ]);
    });

    aoa.push([]);
    aoa.push([
        '',
        'JUMLAH NILAI SEMESTER',
        '',
        '',
        ...data.slots.map(s => {
            const sum = data.semesterSummaries[s.slotId];
            return sum && sum.numericCount > 0 ? fmt(sum.totalNilai) : '-';
        }),
        fmt(data.totalAccumulatedScore),
        '',
        ''
    ]);
    aoa.push([
        '',
        'RATA-RATA SEMESTER / IPK KUMULATIF',
        '',
        '',
        ...data.slots.map(s => {
            const sum = data.semesterSummaries[s.slotId];
            return sum && sum.rataRata !== null ? fmt(sum.rataRata) : '-';
        }),
        fmt(data.cumulativeAverage),
        data.cumulativePredikat ? `${data.cumulativePredikat.predikat} (${data.cumulativePredikat.predikatHuruf})` : '-',
        ''
    ]);
    aoa.push([
        '',
        'KETIDAKHADIRAN (S / I / A)',
        '',
        '',
        ...data.slots.map(s => {
            const sum = data.semesterSummaries[s.slotId];
            if (!sum || !sum.record) return '-';
            return `S:${sum.sakit} I:${sum.izin} A:${sum.alpha}`;
        }),
        `Total S:${data.totalSakit} I:${data.totalIzin} A:${data.totalAlpha}`,
        '',
        ''
    ]);

    aoa.push([]);
    const kota = resolveTempatRapor(settings, 'Pesantren');
    const mudirName = resolveMudirAamInfo(settings).nama;
    aoa.push(['', '', '', '', `${kota}, ${formatDate(new Date())}`]);
    aoa.push(['', '', '', '', 'Pimpinan Pondok / Kepala Madrasah,']);
    aoa.push([]);
    aoa.push([]);
    aoa.push(['', '', '', '', `(${mudirName})`]);

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws['!cols'] = headers.map((h, i) => {
        if (i === 0) return { wch: 5 };
        if (i === 1) return { wch: 30 };
        if (i === 2) return { wch: 15 };
        if (i === 3) return { wch: 8 };
        return { wch: Math.max(h.length + 2, 14) };
    });

    XLSX.utils.book_append_sheet(wb, ws, docMode === 'buku_induk_6' ? 'Buku Induk Nilai' : 'Transkrip Nilai');

    const cleanName = (data.santri.namaLengkap || 'Santri').replace(/[^a-zA-Z0-9]/g, '_');
    const prefix = docMode === 'buku_induk_6' ? 'Buku_Induk_Nilai' : 'Transkrip_Nilai';
    const fileName = `${prefix}_${cleanName}_${data.santri.nis || data.santri.id}.xlsx`;
    XLSX.writeFile(wb, fileName);
    return fileName;
};

/**
 * Ekspor Rekap Kumulatif Lintas Semester 1 Rombel / Angkatan ke Excel (.xlsx)
 */
export const exportCohortTranscriptToExcel = async (params: {
    students: StudentTranscriptData[];
    unionPeriods: Array<{ slotId: string; tahunAjaran: string; semester: 'Ganjil' | 'Genap'; label: string }>;
    cohortTitle: string;
    settings: PondokSettings;
    decimalPlaces: 0 | 1 | 2;
}): Promise<string> => {
    const { students, unionPeriods, cohortTitle, settings, decimalPlaces } = params;
    const XLSX = await loadXLSX();
    const wb = XLSX.utils.book_new();
    const fmt = (val: number | null) => (val !== null ? Number(val.toFixed(decimalPlaces)) : '');

    const aoa: any[][] = [];
    aoa.push([(settings.namaPonpes || 'PONDOK PESANTREN').toUpperCase()]);
    aoa.push(['REKAPITULASI TRANSKRIP & INDEKS PRESTASI KUMULATIF LINTAS SEMESTER']);
    aoa.push([`Cakupan Kohort: ${cohortTitle}`, '', '', `Tanggal Cetak: ${formatDate(new Date())}`]);
    aoa.push([]);

    const headers = [
        'Peringkat',
        'NIS',
        'NISN',
        'Nama Lengkap Santri',
        'Status',
        'Kelas / Rombel',
        'Jml Semester',
        ...unionPeriods.map(p => `${p.tahunAjaran} ${p.semester}`),
        'Rerata Kumulatif (IPK)',
        'Predikat Kumulatif',
        'Tren Nilai',
        'Total Sakit',
        'Total Izin',
        'Total Alpha'
    ];
    aoa.push(headers);

    students.forEach(st => {
        const trendText =
            st.trendDelta !== null
                ? `${st.trendDelta > 0 ? '+' : ''}${st.trendDelta.toFixed(decimalPlaces)}`
                : '-';
        aoa.push([
            st.cohortRank > 0 ? st.cohortRank : '-',
            st.santri.nis || '',
            st.santri.nisn || '-',
            st.santri.namaLengkap,
            st.santri.status || 'Aktif',
            `${st.kelasName} / ${st.rombelName}`,
            st.recordedSemesterCount,
            ...unionPeriods.map(p => {
                const sum = st.semesterSummaries[p.slotId];
                return sum && sum.rataRata !== null ? fmt(sum.rataRata) : '-';
            }),
            fmt(st.cumulativeAverage),
            st.cumulativePredikat ? `${st.cumulativePredikat.predikat} (${st.cumulativePredikat.predikatHuruf})` : '-',
            trendText,
            st.totalSakit,
            st.totalIzin,
            st.totalAlpha
        ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws['!cols'] = headers.map((h, idx) => {
        if (idx === 0) return { wch: 10 };
        if (idx === 1 || idx === 2) return { wch: 14 };
        if (idx === 3) return { wch: 28 };
        return { wch: Math.max(h.length + 3, 13) };
    });

    XLSX.utils.book_append_sheet(wb, ws, 'Rekap Kumulatif');

    const cleanCohort = (cohortTitle || 'Kohort').replace(/[^a-zA-Z0-9]/g, '_');
    const fileName = `Rekap_Transkrip_Lintas_Semester_${cleanCohort}.xlsx`;
    XLSX.writeFile(wb, fileName);
    return fileName;
};
