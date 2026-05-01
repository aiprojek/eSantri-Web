import { db } from '../db';
import { RaporRecord } from '../types';

export const getRaporRecordsByPeriod = async (
    tahunAjaran: string,
    semester: 'Ganjil' | 'Genap'
): Promise<RaporRecord[]> => {
    return db.raporRecords
        .where('[tahunAjaran+semester]')
        .equals([tahunAjaran, semester])
        .toArray();
};

export const getRaporRecordsByPeriodAndRombel = async (
    tahunAjaran: string,
    semester: 'Ganjil' | 'Genap',
    rombelId: number
): Promise<RaporRecord[]> => {
    return db.raporRecords
        .where('[tahunAjaran+semester+rombelId]')
        .equals([tahunAjaran, semester, rombelId])
        .toArray();
};
