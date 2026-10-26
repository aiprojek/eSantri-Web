import { AcademicYearConfig, PondokSettings } from '../types';
import { getHijriDate } from './formatters';

export const deriveAcademicYearLabel = (date: Date = new Date()): string => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const startYear = month >= 6 ? year : year - 1; // Tahun ajaran mulai Juli
    return `${startYear}/${startYear + 1}`;
};

export const deriveHijriAcademicYearRaw = (
    masehiStartYear: number,
    masehiEndYear?: number,
    masehiStartMonth: number = 7,
    masehiEndMonth: number = 6,
    hijriAdjustment: number = 0
): { raw: string; startHijri: number; endHijri: number } => {
    const sYear = Number(masehiStartYear) || new Date().getFullYear();
    const eYear = Number(masehiEndYear) || (sYear + 1);
    const startDate = new Date(sYear, Math.max(0, Math.min(11, (masehiStartMonth || 7) - 1)), 15);
    const endDate = new Date(eYear, Math.max(0, Math.min(11, (masehiEndMonth || 6) - 1)), 20);

    const hStartInfo = getHijriDate(startDate, hijriAdjustment);
    const hEndInfo = getHijriDate(endDate, hijriAdjustment);

    const parsedStart = parseInt(String(hStartInfo.year || '').replace(/\D/g, ''), 10);
    const parsedEnd = parseInt(String(hEndInfo.year || '').replace(/\D/g, ''), 10);

    const approxStart = Math.round((sYear - 622) * (365.2425 / 354.367));
    const startHijri = !isNaN(parsedStart) && parsedStart > 1300 ? parsedStart : approxStart;
    const endHijri = (!isNaN(parsedEnd) && parsedEnd > startHijri) ? parsedEnd : (startHijri + 1);

    return {
        raw: `${startHijri}/${endHijri}`,
        startHijri,
        endHijri
    };
};

export interface ResolvedAcademicYearInfo {
    masehi: string;               // contoh: "2026/2027"
    masehiWithSuffix: string;     // contoh: "2026/2027 M"
    hijriah: string;              // contoh: "1448/1449 H"
    hijriahRaw: string;           // contoh: "1448/1449"
    gabungan: string;             // contoh: "1448/1449 H / 2026/2027 M"
    gabunganMasehiFirst: string;  // contoh: "2026/2027 M / 1448/1449 H"
    otomatis: string;             // mengikuti toggle Hijriah di Data Master (gabungan bila aktif, masehi bila nonaktif)
    hijriEnabled: boolean;
    semester: 'Ganjil' | 'Genap';
}

export const getAcademicYearsFromSettings = (
    settings?: Pick<PondokSettings, 'academicYears' | 'psbConfig'> | null
): AcademicYearConfig[] => {
    const configuredYears = settings?.academicYears || [];
    if (configuredYears.length > 0) {
        return configuredYears.map((item) => ({
            ...item,
            // migrate old shape gracefully
            labelMasehi: (item as any).labelMasehi || (item as any).label || deriveAcademicYearLabel(),
            masehiStartMonth: (item as any).masehiStartMonth || (item as any).startMonth || 7,
            masehiStartYear: (item as any).masehiStartYear || (item as any).startYear || new Date().getFullYear(),
            masehiEndMonth: (item as any).masehiEndMonth || (item as any).endMonth || 6,
            masehiEndYear: (item as any).masehiEndYear || (item as any).endYear || (new Date().getFullYear() + 1),
        }));
    }

    const fallbackLabel = settings?.psbConfig?.tahunAjaranAktif?.trim() || deriveAcademicYearLabel();
    const [startYearRaw, endYearRaw] = fallbackLabel.split('/');
    const startYear = Number(startYearRaw) || new Date().getFullYear();
    const endYear = Number(endYearRaw) || startYear + 1;

    return [
        {
            id: 'ta-fallback',
            labelMasehi: fallbackLabel,
            masehiStartMonth: 7,
            masehiStartYear: startYear,
            masehiEndMonth: 6,
            masehiEndYear: endYear,
            isActive: true,
        },
    ];
};

export const getAcademicYearOptions = (
    settings?: Pick<PondokSettings, 'academicYears' | 'psbConfig'> | null,
    extraYears: string[] = []
): string[] => {
    const fromSettings = getAcademicYearsFromSettings(settings).map((item) => item.labelMasehi.trim()).filter(Boolean);
    return Array.from(new Set([...fromSettings, ...extraYears.map((item) => item.trim()).filter(Boolean)])).sort().reverse();
};

export const getDefaultAcademicYear = (
    settings?: Pick<PondokSettings, 'academicYears' | 'psbConfig'> | null
): string => {
    const years = getAcademicYearsFromSettings(settings);
    const active = years.find((item) => item.isActive);
    return active?.labelMasehi?.trim() || years[0]?.labelMasehi?.trim() || deriveAcademicYearLabel();
};

export const resolveAcademicYearLabels = (
    settings?: Partial<PondokSettings> | null,
    overrideMasehiLabel?: string | null,
    overrideSemester?: 'Ganjil' | 'Genap' | null
): ResolvedAcademicYearInfo => {
    const years = getAcademicYearsFromSettings(settings as any);
    const activeYearCfg = years.find((item) => item.isActive) || years[0];
    const legacyTahunAktif = typeof settings?.tahunAjaranAktif === 'string' ? settings.tahunAjaranAktif.trim() : '';

    const rawMasehi = (
        overrideMasehiLabel?.trim() ||
        activeYearCfg?.labelMasehi?.trim() ||
        legacyTahunAktif ||
        getDefaultAcademicYear(settings as any) ||
        deriveAcademicYearLabel()
    );

    const cleanMasehi = rawMasehi.replace(/\s*M$/i, '').trim() || rawMasehi;
    const masehiWithSuffix = /\bM$/i.test(rawMasehi) ? rawMasehi : `${cleanMasehi} M`;

    const matched = years.find((item) => item.labelMasehi?.trim() === rawMasehi || item.labelMasehi?.trim() === cleanMasehi) || activeYearCfg;

    // Parse start/end Masehi years from label (e.g. "2026/2027") or matched config
    const yearParts = cleanMasehi.match(/(\d{4})\D+(\d{4})/);
    const startMasehiYear = yearParts ? Number(yearParts[1]) : (matched?.masehiStartYear || new Date().getFullYear());
    const endMasehiYear = yearParts ? Number(yearParts[2]) : (matched?.masehiEndYear || (startMasehiYear + 1));

    let hijriahRaw = '';
    const manualHijri = matched?.labelHijriah?.trim() || '';
    if (manualHijri) {
        hijriahRaw = manualHijri.replace(/\s*H$/i, '').trim();
    } else if (matched?.hijriEnabled && matched?.hijriStartYear) {
        hijriahRaw = (matched.hijriEndYear && matched.hijriEndYear !== matched.hijriStartYear)
            ? `${matched.hijriStartYear}/${matched.hijriEndYear}`
            : `${matched.hijriStartYear}`;
    } else {
        const derived = deriveHijriAcademicYearRaw(
            startMasehiYear,
            endMasehiYear,
            matched?.masehiStartMonth || 7,
            matched?.masehiEndMonth || 6,
            settings?.hijriAdjustment || 0
        );
        hijriahRaw = derived.raw;
    }

    const hijriah = /\bH$/i.test(hijriahRaw) ? hijriahRaw : `${hijriahRaw} H`;
    const gabungan = `${hijriah} / ${masehiWithSuffix}`;
    const gabunganMasehiFirst = `${masehiWithSuffix} / ${hijriah}`;
    const hijriEnabled = Boolean(matched?.hijriEnabled);
    const otomatis = hijriEnabled ? gabungan : cleanMasehi;

    const legacySem = settings?.semesterAktif;
    const semester: 'Ganjil' | 'Genap' = (
        overrideSemester ||
        matched?.semesterAktif ||
        (legacySem === 'Genap' ? 'Genap' : legacySem === 'Ganjil' ? 'Ganjil' : undefined) ||
        'Ganjil'
    );

    return {
        masehi: cleanMasehi,
        masehiWithSuffix,
        hijriah,
        hijriahRaw,
        gabungan,
        gabunganMasehiFirst,
        otomatis,
        hijriEnabled,
        semester
    };
};

export const formatAcademicYearDisplay = (
    settings: Pick<PondokSettings, 'academicYears' | 'psbConfig'>,
    masehiLabel: string
): string => {
    const info = resolveAcademicYearLabels(settings, masehiLabel);
    if (info.hijriEnabled) {
        return `Tahun Ajaran ${info.gabungan}`;
    }
    return `Tahun Ajaran ${info.masehi}`;
};
