import { Pendaftar, PondokSettings, Santri } from '../../../types';

const normalizeText = (value?: string | null): string =>
    String(value || '')
        .trim()
        .replace(/\s+/g, ' ')
        .toLowerCase();

const normalizeIdToken = (value?: string | null): string =>
    String(value || '')
        .trim()
        .replace(/[^a-zA-Z0-9]/g, '')
        .toLowerCase();

const SEQUENTIAL_DUMMY_IDS = [
    '01234567890123456789',
    '12345678901234567890',
    '98765432109876543210',
];

/**
 * Checks whether a NIK / NISN string is a meaningful identifier (not empty,
 * repeated placeholder chars like "0000000000000000", or trivial sequences like "12345678").
 */
export const isSignificantIdentifier = (value: string | undefined | null, minLength: number): boolean => {
    const token = normalizeIdToken(value);
    if (token.length < minLength) return false;
    if (/^(.)\1+$/.test(token)) return false;
    if (SEQUENTIAL_DUMMY_IDS.some((seq) => seq.includes(token))) return false;
    return true;
};

const areNamesCompatible = (a?: string | null, b?: string | null): boolean => {
    const na = normalizeText(a);
    const nb = normalizeText(b);
    if (!na || !nb) return false;
    if (na === nb) return true;
    const minLen = Math.min(na.length, nb.length);
    if (minLen >= 4 && (na.includes(nb) || nb.includes(na))) {
        return true;
    }
    return false;
};

export type DuplicateMatchReason = 'santriId' | 'nama_dob' | 'status_nama' | 'nik' | 'nisn';

export interface PsbDuplicateCheckResult {
    kind: 'none' | 'exact_duplicate' | 'identifier_conflict';
    matchedSantri?: Santri;
    reason?: DuplicateMatchReason;
}

export const checkPendaftarAgainstSantriPool = (
    pendaftar: Pendaftar,
    santriPool: Santri[],
    options?: { ignoreIdentifierConflict?: boolean }
): PsbDuplicateCheckResult => {
    const cleanNama = normalizeText(pendaftar.namaLengkap);
    const cleanDob = String(pendaftar.tanggalLahir || '').trim().slice(0, 10);
    const cleanNik = isSignificantIdentifier(pendaftar.nik, 8) ? normalizeIdToken(pendaftar.nik) : '';
    const cleanNisn = isSignificantIdentifier(pendaftar.nisn, 6) ? normalizeIdToken(pendaftar.nisn) : '';

    let conflictCandidate: { santri: Santri; reason: 'nik' | 'nisn' | 'status_nama' } | null = null;

    for (const s of santriPool) {
        if (!s || s.deleted) continue;

        if (pendaftar.santriId && s.id === pendaftar.santriId) {
            return { kind: 'exact_duplicate', matchedSantri: s, reason: 'santriId' };
        }

        const sNama = normalizeText(s.namaLengkap);
        const sDob = String(s.tanggalLahir || '').trim().slice(0, 10);

        if (cleanNama && cleanDob && sNama === cleanNama && sDob === cleanDob) {
            return { kind: 'exact_duplicate', matchedSantri: s, reason: 'nama_dob' };
        }

        if (pendaftar.status === 'Diterima' && cleanNama && sNama === cleanNama) {
            // If both DOBs exist and differ, they are different people.
            // If either DOB is empty, NEVER auto-link silently (risk of mis-linking common names like "Muhammad Rizki");
            // raise a confirmation conflict unless the admin explicitly overrides.
            if ((!cleanDob || !sDob) && !conflictCandidate) {
                conflictCandidate = { santri: s, reason: 'status_nama' };
            }
        }

        const sNik = isSignificantIdentifier(s.nik, 8) ? normalizeIdToken(s.nik) : '';
        if (cleanNik && sNik && sNik === cleanNik) {
            if (areNamesCompatible(pendaftar.namaLengkap, s.namaLengkap)) {
                return { kind: 'exact_duplicate', matchedSantri: s, reason: 'nik' };
            }
            if (!conflictCandidate || conflictCandidate.reason === 'status_nama') {
                conflictCandidate = { santri: s, reason: 'nik' };
            }
        }

        const sNisn = isSignificantIdentifier(s.nisn, 6) ? normalizeIdToken(s.nisn) : '';
        if (cleanNisn && sNisn && sNisn === cleanNisn) {
            if (areNamesCompatible(pendaftar.namaLengkap, s.namaLengkap)) {
                return { kind: 'exact_duplicate', matchedSantri: s, reason: 'nisn' };
            }
            if (!conflictCandidate || conflictCandidate.reason === 'status_nama') {
                conflictCandidate = { santri: s, reason: 'nisn' };
            }
        }
    }

    if (conflictCandidate && !options?.ignoreIdentifierConflict) {
        return {
            kind: 'identifier_conflict',
            matchedSantri: conflictCandidate.santri,
            reason: conflictCandidate.reason,
        };
    }

    return { kind: 'none' };
};

export interface PartitionedAcceptanceBatch {
    toMigrate: Pendaftar[];
    exactDuplicates: Array<{
        pendaftar: Pendaftar;
        matchedSantri: Santri;
        reason: DuplicateMatchReason;
    }>;
    identifierConflicts: Array<{
        pendaftar: Pendaftar;
        matchedSantri: Santri;
        reason: 'nik' | 'nisn' | 'status_nama';
    }>;
}

export const partitionPendaftarForAcceptance = (
    rawList: Pendaftar[],
    santriPool: Santri[],
    options?: { ignoreIdentifierConflict?: boolean }
): PartitionedAcceptanceBatch => {
    const toMigrate: Pendaftar[] = [];
    const exactDuplicates: PartitionedAcceptanceBatch['exactDuplicates'] = [];
    const identifierConflicts: PartitionedAcceptanceBatch['identifierConflicts'] = [];

    for (const p of rawList) {
        const res = checkPendaftarAgainstSantriPool(p, santriPool, options);
        if (res.kind === 'exact_duplicate' && res.matchedSantri && res.reason) {
            exactDuplicates.push({
                pendaftar: p,
                matchedSantri: res.matchedSantri,
                reason: res.reason,
            });
        } else if (
            res.kind === 'identifier_conflict' &&
            res.matchedSantri &&
            (res.reason === 'nik' || res.reason === 'nisn' || res.reason === 'status_nama')
        ) {
            identifierConflicts.push({
                pendaftar: p,
                matchedSantri: res.matchedSantri,
                reason: res.reason,
            });
        } else {
            toMigrate.push(p);
        }
    }

    return { toMigrate, exactDuplicates, identifierConflicts };
};

export const describeExistingSantriLocation = (santri: Santri, settings: PondokSettings): string => {
    const jenjangNama = settings.jenjang.find((j) => j.id === santri.jenjangId)?.nama;
    const kelasNama = settings.kelas.find((k) => k.id === santri.kelasId)?.nama;
    const rombelNama = settings.rombel.find((r) => r.id === santri.rombelId)?.nama;
    const placementParts = [jenjangNama, kelasNama, rombelNama].filter(Boolean);
    const placement = placementParts.length > 0 ? placementParts.join(' / ') : 'Belum ditempatkan';
    const nisInfo = santri.nis ? `NIS ${santri.nis}` : 'Belum punya NIS';
    return `${santri.namaLengkap} (${nisInfo}, Status: ${santri.status || 'Aktif'}, Kelas: ${placement})`;
};
