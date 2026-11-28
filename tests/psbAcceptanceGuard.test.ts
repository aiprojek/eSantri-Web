import { describe, expect, it } from 'vitest';
import {
    checkPendaftarAgainstSantriPool,
    isSignificantIdentifier,
    partitionPendaftarForAcceptance,
} from '../components/psb/utils/psbAcceptanceGuard';
import type { Pendaftar, Santri } from '../types';

const makeSantri = (overrides: Partial<Santri> = {}): Santri =>
    ({
        id: 1,
        nis: '2026001',
        namaLengkap: 'Ahmad Fauzi',
        jenisKelamin: 'Laki-laki',
        tempatLahir: 'Bandung',
        tanggalLahir: '2012-05-01',
        kewarganegaraan: 'WNI',
        alamat: { detail: 'Jl. Pondok' },
        namaAyah: 'Ayah',
        namaIbu: 'Ibu',
        jenjangId: 1,
        kelasId: 1,
        rombelId: 1,
        tanggalMasuk: '2026-07-01',
        status: 'Aktif',
        jenisSantri: 'Mondok - Baru',
        ...overrides,
    }) as Santri;

const makePendaftar = (overrides: Partial<Pendaftar> = {}): Pendaftar =>
    ({
        id: 10,
        nis: '',
        namaLengkap: 'Budi Santoso',
        jenisKelamin: 'Laki-laki',
        tempatLahir: 'Garut',
        tanggalLahir: '2012-08-12',
        kewarganegaraan: 'WNI',
        alamat: { detail: 'Jl. Melati' },
        namaAyah: 'Ayah',
        namaIbu: 'Ibu',
        jenjangId: 1,
        tanggalDaftar: '2026-06-01',
        status: 'Baru',
        jenisSantri: 'Mondok - Baru',
        ...overrides,
    }) as Pendaftar;

describe('psbAcceptanceGuard', () => {
    it('ignores placeholder or dummy NIK/NISN values', () => {
        expect(isSignificantIdentifier('0000000000000000', 8)).toBe(false);
        expect(isSignificantIdentifier('11111111', 8)).toBe(false);
        expect(isSignificantIdentifier('1234567890', 8)).toBe(false);
        expect(isSignificantIdentifier('----------------', 8)).toBe(false);
        expect(isSignificantIdentifier('3201123456780001', 8)).toBe(true);
    });

    it('does not flag unrelated pendaftar sharing placeholder NIK as duplicate', () => {
        const pool = [makeSantri({ id: 1, namaLengkap: 'Ahmad Fauzi', nik: '0000000000000000', nisn: '123456' })];
        const candidate = makePendaftar({
            id: 20,
            namaLengkap: 'Budi Santoso',
            nik: '0000000000000000',
            nisn: '123456',
        });
        const res = checkPendaftarAgainstSantriPool(candidate, pool);
        expect(res.kind).toBe('none');
    });

    it('flags NIK collision with a different student name as identifier_conflict (overrideable)', () => {
        const pool = [makeSantri({ id: 1, namaLengkap: 'Ahmad Fauzi', nik: '3201010101010009' })];
        const candidate = makePendaftar({
            id: 21,
            namaLengkap: 'Budi Santoso',
            nik: '3201010101010009',
        });

        const res = checkPendaftarAgainstSantriPool(candidate, pool);
        expect(res.kind).toBe('identifier_conflict');
        expect(res.reason).toBe('nik');
        expect(res.matchedSantri?.id).toBe(1);

        const overridden = checkPendaftarAgainstSantriPool(candidate, pool, { ignoreIdentifierConflict: true });
        expect(overridden.kind).toBe('none');
    });

    it('detects genuine duplicates by santriId, nama+dob, or real nik+compatible nama while ignoring deleted santri', () => {
        const deletedSantri = makeSantri({ id: 99, namaLengkap: 'Budi Santoso', tanggalLahir: '2012-08-12', deleted: true });
        const activeSantri = makeSantri({ id: 2, namaLengkap: 'Zaid Abdurrahman', tanggalLahir: '2011-03-04', nik: '3201010101010002' });

        const freshPendaftar = makePendaftar({ id: 30, santriId: 99, namaLengkap: 'Budi Santoso', tanggalLahir: '2012-08-12' });
        const dupPendaftar = makePendaftar({ id: 31, namaLengkap: 'zaid abdurrahman', tanggalLahir: '2011-03-04' });

        const partitioned = partitionPendaftarForAcceptance([freshPendaftar, dupPendaftar], [deletedSantri, activeSantri]);
        expect(partitioned.toMigrate.map((p) => p.id)).toEqual([30]);
        expect(partitioned.exactDuplicates.map((d) => d.pendaftar.id)).toEqual([31]);
    });

    it('does not block status=Diterima namesake if dates of birth clearly differ', () => {
        const pool = [makeSantri({ id: 3, namaLengkap: 'Muhammad Ali', tanggalLahir: '2010-01-01' })];
        const namesake = makePendaftar({
            id: 40,
            status: 'Diterima',
            namaLengkap: 'Muhammad Ali',
            tanggalLahir: '2013-09-10',
        });
        const res = checkPendaftarAgainstSantriPool(namesake, pool);
        expect(res.kind).toBe('none');
    });

    it('never auto-links status=Diterima common names as exact_duplicate when either DOB is empty; requires confirmation override', () => {
        const pool = [makeSantri({ id: 4, namaLengkap: 'Muhammad Rizki', tanggalLahir: '' })];
        const candidateMissingSantriDob = makePendaftar({
            id: 41,
            status: 'Diterima',
            namaLengkap: 'Muhammad Rizki',
            tanggalLahir: '2012-04-15',
        });
        const candidateBothEmptyDob = makePendaftar({
            id: 42,
            status: 'Diterima',
            namaLengkap: 'Muhammad Rizki',
            tanggalLahir: '',
        });

        const res1 = checkPendaftarAgainstSantriPool(candidateMissingSantriDob, pool);
        expect(res1.kind).toBe('identifier_conflict');
        expect(res1.reason).toBe('status_nama');

        const res2 = checkPendaftarAgainstSantriPool(candidateBothEmptyDob, pool);
        expect(res2.kind).toBe('identifier_conflict');
        expect(res2.reason).toBe('status_nama');

        const batch = partitionPendaftarForAcceptance([candidateMissingSantriDob, candidateBothEmptyDob], pool);
        expect(batch.exactDuplicates).toHaveLength(0);
        expect(batch.identifierConflicts).toHaveLength(2);

        const overridden = partitionPendaftarForAcceptance([candidateMissingSantriDob], pool, {
            ignoreIdentifierConflict: true,
        });
        expect(overridden.toMigrate).toHaveLength(1);
        expect(overridden.exactDuplicates).toHaveLength(0);
    });
});
