import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';

export const useAcademicRaporYears = (): string[] => {
    const keys = useLiveQuery(async () => {
        const unique = await db.raporRecords.orderBy('tahunAjaran').uniqueKeys();
        return unique.map((key) => String(key)).filter(Boolean);
    }, []) || [];

    return useMemo(() => Array.from(new Set(keys)).sort().reverse(), [keys]);
};
