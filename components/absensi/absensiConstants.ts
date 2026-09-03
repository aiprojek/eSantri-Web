import { SesiAbsensi } from '../../types';

export const SESI_ABSENSI_LIST: SesiAbsensi[] = [
    'KBM Pagi',
    'Sholat Subuh',
    'Sholat Maghrib-Isya',
    'Halaqah Asrama',
    'Ekstrakurikuler',
    'Lainnya'
];

export interface AtRiskSantriInfo {
    santriId: number;
    namaLengkap: string;
    nis: string;
    alphaCount: number;
    sakitCount: number;
    izinCount: number;
    hadirCount: number;
    totalDays: number;
    attendanceRate: number; // percentage (0-100)
    reasons: string[];
}

export const getStatusBadgeColor = (status: 'H' | 'S' | 'I' | 'A') => {
    switch (status) {
        case 'H': return 'bg-green-50 text-green-700 border-green-200';
        case 'S': return 'bg-yellow-50 text-yellow-700 border-yellow-200';
        case 'I': return 'bg-blue-50 text-blue-700 border-blue-200';
        case 'A': return 'bg-red-50 text-red-700 border-red-200';
        default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
};

export const getStatusLabel = (status: 'H' | 'S' | 'I' | 'A') => {
    switch (status) {
        case 'H': return 'Hadir';
        case 'S': return 'Sakit';
        case 'I': return 'Izin';
        case 'A': return 'Alpha';
    }
};
