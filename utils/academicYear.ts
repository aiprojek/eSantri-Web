import { AcademicYearConfig, PondokSettings } from '../types';

export const deriveAcademicYearLabel = (date: Date = new Date()): string => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const startYear = month >= 6 ? year : year - 1; // Tahun ajaran mulai Juli
    return `${startYear}/${startYear + 1}`;
};

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

export const formatAcademicYearDisplay = (
    settings: Pick<PondokSettings, 'academicYears' | 'psbConfig'>,
    masehiLabel: string
): string => {
    const years = getAcademicYearsFromSettings(settings);
    const matched = years.find((item) => item.labelMasehi === masehiLabel);
    if (matched?.hijriEnabled && matched.labelHijriah?.trim()) {
        return `Tahun Ajaran ${matched.labelHijriah.trim()}H / ${matched.labelMasehi.trim()}M`;
    }
    return `Tahun Ajaran ${masehiLabel}`;
};
