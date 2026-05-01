import { useEffect, useMemo, useState } from 'react';
import { PondokSettings } from '../types';
import { getAcademicYearOptions, getDefaultAcademicYear } from '../utils/academicYear';
import { useAcademicRaporYears } from './useAcademicRaporYears';

export const useAcademicPeriodFilter = (
    settings: PondokSettings,
    initialSemester: 'Ganjil' | 'Genap' = 'Ganjil'
) => {
    const defaultAcademicYear = useMemo(() => getDefaultAcademicYear(settings), [settings]);
    const archiveYears = useAcademicRaporYears();
    const availableYears = useMemo(
        () => getAcademicYearOptions(settings, archiveYears),
        [settings, archiveYears]
    );
    const [filterTahun, setFilterTahun] = useState(defaultAcademicYear);
    const [filterSemester, setFilterSemester] = useState<'Ganjil' | 'Genap'>(initialSemester);

    useEffect(() => {
        if (availableYears.length > 0 && !availableYears.includes(filterTahun)) {
            setFilterTahun(availableYears[0]);
            return;
        }
        if (availableYears.length === 0 && !filterTahun.trim()) {
            setFilterTahun(defaultAcademicYear);
        }
    }, [availableYears, defaultAcademicYear, filterTahun]);

    return {
        filterTahun,
        setFilterTahun,
        filterSemester,
        setFilterSemester,
        availableYears,
        defaultAcademicYear,
    };
};
