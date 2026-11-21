import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import { sanitizePendaftar, sanitizePsbSubmissionFields } from '../utils/sanitizePendaftar';

/**
 * Mengambil daftar field `hasAll` dan `hasOnly` langsung dari `firestore.rules`
 * (`isValidPublicPendaftar`) agar pengujian selalu sinkron dengan rules sumber kebenaran.
 */
function parsePublicPendaftarRuleLists(): {
    requiredFields: string[];
    allowedFields: string[];
    alamatAllowedFields: string[];
    berkasAllowedFields: string[];
    nilaiAllowedFields: string[];
} {
    const rulesPath = path.resolve(process.cwd(), 'firestore.rules');
    const rulesText = fs.readFileSync(rulesPath, 'utf8');

    const extractQuotedStrings = (block: string): string[] => {
        const matches = block.match(/'([^']+)'/g) || [];
        return matches.map((m) => m.slice(1, -1));
    };

    const fnStart = rulesText.indexOf('function isValidPublicPendaftar(data)');
    expect(fnStart).toBeGreaterThan(-1);
    const fnSection = rulesText.slice(fnStart, fnStart + 2500);

    const hasAllMatch = fnSection.match(/data\.keys\(\)\.hasAll\(\[([\s\S]*?)\]\)/);
    const hasOnlyMatch = fnSection.match(/data\.keys\(\)\.hasOnly\(\[([\s\S]*?)\]\)/);
    expect(hasAllMatch).not.toBeNull();
    expect(hasOnlyMatch).not.toBeNull();

    const alamatStart = rulesText.indexOf('function isValidAlamatMap(addr)');
    const alamatOnlyMatch = rulesText.slice(alamatStart, alamatStart + 500).match(/addr\.keys\(\)\.hasOnly\(\[([\s\S]*?)\]\)/);
    expect(alamatOnlyMatch).not.toBeNull();

    const berkasStart = rulesText.indexOf('function isValidBerkasFisikMap(b)');
    const berkasOnlyMatch = rulesText.slice(berkasStart, berkasStart + 500).match(/b\.keys\(\)\.hasOnly\(\[([\s\S]*?)\]\)/);
    expect(berkasOnlyMatch).not.toBeNull();

    const nilaiStart = rulesText.indexOf('function isValidNilaiUjianMap(n)');
    const nilaiOnlyMatch = rulesText.slice(nilaiStart, nilaiStart + 600).match(/n\.keys\(\)\.hasOnly\(\[([\s\S]*?)\]\)/);
    expect(nilaiOnlyMatch).not.toBeNull();

    return {
        requiredFields: extractQuotedStrings(hasAllMatch![1]),
        allowedFields: extractQuotedStrings(hasOnlyMatch![1]),
        alamatAllowedFields: extractQuotedStrings(alamatOnlyMatch![1]),
        berkasAllowedFields: extractQuotedStrings(berkasOnlyMatch![1]),
        nilaiAllowedFields: extractQuotedStrings(nilaiOnlyMatch![1]),
    };
}

function assertMatchesIsValidPublicPendaftar(
    payload: Record<string, unknown>,
    lists: ReturnType<typeof parsePublicPendaftarRuleLists>
) {
    const keys = Object.keys(payload);

    // 18 field wajib (hasAll)
    expect(lists.requiredFields.length).toBe(18);
    for (const reqField of lists.requiredFields) {
        expect(keys).toContain(reqField);
    }

    // Tidak ada key di luar hasOnly
    for (const key of keys) {
        expect(lists.allowedFields).toContain(key);
    }

    // Validasi tipe & batas panjang field wajib
    expect(typeof payload.id).toBe('number');
    expect(Number.isFinite(payload.id)).toBe(true);

    expect(typeof payload.nis).toBe('string');
    expect((payload.nis as string).length).toBeLessThanOrEqual(100);

    expect(typeof payload.namaLengkap).toBe('string');
    expect((payload.namaLengkap as string).length).toBeGreaterThanOrEqual(1);
    expect((payload.namaLengkap as string).length).toBeLessThanOrEqual(200);

    expect(['Laki-laki', 'Perempuan']).toContain(payload.jenisKelamin);

    expect(typeof payload.tempatLahir).toBe('string');
    expect((payload.tempatLahir as string).length).toBeLessThanOrEqual(150);

    expect(typeof payload.tanggalLahir).toBe('string');
    expect((payload.tanggalLahir as string).length).toBeLessThanOrEqual(64);

    expect(['WNI', 'WNA', 'Keturunan']).toContain(payload.kewarganegaraan);

    // Alamat map validation (isValidAlamatMap)
    expect(payload.alamat).toBeTypeOf('object');
    expect(payload.alamat).not.toBeNull();
    expect(Array.isArray(payload.alamat)).toBe(false);
    const alamatObj = payload.alamat as Record<string, unknown>;
    for (const ak of Object.keys(alamatObj)) {
        expect(lists.alamatAllowedFields).toContain(ak);
        expect(typeof alamatObj[ak]).toBe('string');
    }
    if (typeof alamatObj.detail === 'string') expect(alamatObj.detail.length).toBeLessThanOrEqual(500);
    if (typeof alamatObj.desaKelurahan === 'string') expect(alamatObj.desaKelurahan.length).toBeLessThanOrEqual(200);
    if (typeof alamatObj.kecamatan === 'string') expect(alamatObj.kecamatan.length).toBeLessThanOrEqual(200);
    if (typeof alamatObj.kabupatenKota === 'string') expect(alamatObj.kabupatenKota.length).toBeLessThanOrEqual(200);
    if (typeof alamatObj.provinsi === 'string') expect(alamatObj.provinsi.length).toBeLessThanOrEqual(200);
    if (typeof alamatObj.kodePos === 'string') expect(alamatObj.kodePos.length).toBeLessThanOrEqual(20);

    expect(typeof payload.namaAyah).toBe('string');
    expect((payload.namaAyah as string).length).toBeLessThanOrEqual(200);

    expect(typeof payload.namaIbu).toBe('string');
    expect((payload.namaIbu as string).length).toBeLessThanOrEqual(200);

    expect(typeof payload.jenjangId).toBe('number');
    expect(typeof payload.kelasId).toBe('number');
    expect(typeof payload.rombelId).toBe('number');

    expect(typeof payload.tanggalMasuk).toBe('string');
    expect((payload.tanggalMasuk as string).length).toBeLessThanOrEqual(64);

    expect(typeof payload.jenisSantri).toBe('string');
    expect((payload.jenisSantri as string).length).toBeLessThanOrEqual(100);

    expect(typeof payload.tanggalDaftar).toBe('string');
    expect((payload.tanggalDaftar as string).length).toBeLessThanOrEqual(64);

    expect(payload.status).toBe('Baru');

    expect(typeof payload.customData).toBe('string');
    expect((payload.customData as string).length).toBeLessThanOrEqual(50000);

    if ('deleted' in payload) {
        expect(payload.deleted).toBe(false);
    }

    if ('berkasFisik' in payload && payload.berkasFisik) {
        const berkas = payload.berkasFisik as Record<string, unknown>;
        for (const bk of Object.keys(berkas)) {
            expect(lists.berkasAllowedFields).toContain(bk);
        }
    }

    if ('nilaiUjian' in payload && payload.nilaiUjian) {
        const nilai = payload.nilaiUjian as Record<string, unknown>;
        for (const nk of Object.keys(nilai)) {
            expect(lists.nilaiAllowedFields).toContain(nk);
        }
        if ('rekomendasi' in nilai) {
            expect(['Lulus', 'Dipertimbangkan', 'Tidak Lulus']).toContain(nilai.rekomendasi);
        }
    }
}

describe('PSB Public Payload vs firestore.rules (isValidPublicPendaftar)', () => {
    const ruleLists = parsePublicPendaftarRuleLists();

    it('memvalidasi payload mode E2EE standar + lampiran URL agar lolos semua aturan rules', () => {
        const now = Date.now();
        const isoNow = new Date(now).toISOString();
        const regNumber = `PSB-2026-REG-${String(now).slice(-4)}`;

        const mockEnvelope = JSON.stringify({
            __e2ee: 1,
            mode: 'hybrid_rsa',
            kid: 'kid-test-2026',
            iv: 'dGVzdGl2MTIzNDU2',
            ek: 'A'.repeat(344),
            ct: 'B'.repeat(2048),
        });

        const e2eeInput = {
            nomorRegistrasi: regNumber,
            tanggalDaftar: isoNow,
            tanggalMasuk: isoNow,
            status: 'Baru' as const,
            jalurPendaftaran: 'Reguler',
            gelombang: 1,
            jenjangId: 2,
            berkasFisik: {
                kk: false,
                akta: false,
                ijazahSkl: false,
                suratSehat: false,
                pasFoto: false,
                catatanBerkas: 'Pendaftaran Online via Portal Publik',
            },
            nilaiUjian: {
                rekomendasi: 'Dipertimbangkan' as const,
                ruangUjian: 'Posko PSB',
                catatanUjian: 'Pendaftaran online via portal publik (menunggu jadwal seleksi)',
            },
            lastModified: now,
            namaLengkap: '[TERENKRIPSI E2EE]',
            customData: JSON.stringify({
                __e2ee_bio: mockEnvelope,
                scan_kk: 'https://firebasestorage.googleapis.com/v0/b/demo/o/kk.jpg?alt=media',
            }),
            id: now,
        };

        const sanitized = sanitizePendaftar(e2eeInput);
        // Simulasikan serverTimestamp() yang ditambahkan tepat sebelum setDoc
        const docPayload: Record<string, unknown> = {
            ...sanitized,
            createdAt: { _methodName: 'serverTimestamp' },
        };

        assertMatchesIsValidPublicPendaftar(docPayload, ruleLists);
        const parsedCustom = JSON.parse(sanitized.customData || '{}');
        expect(parsedCustom.__e2ee_bio).toBe(mockEnvelope);
        expect(parsedCustom.scan_kk).toContain('https://firebasestorage.googleapis.com/');
    });

    it('mempertahankan __e2ee_bio berukuran besar (~40KB) dan menjaga customData <= 50000 saat ada beberapa field non-E2EE besar', () => {
        const bigCiphertextEnvelope = JSON.stringify({
            __e2ee: 1,
            mode: 'hybrid_rsa',
            kid: 'kid-test-large',
            iv: 'dGVzdGl2MTIzNDU2',
            ek: 'A'.repeat(344),
            ct: 'C'.repeat(39000),
        });

        const sanitized = sanitizePendaftar({
            id: 1732000001234,
            namaLengkap: '[TERENKRIPSI E2EE]',
            status: 'Baru',
            customData: JSON.stringify({
                __e2ee_bio: bigCiphertextEnvelope,
                extraNote1: 'Z'.repeat(6000),
                extraNote2: 'Y'.repeat(6000),
                extraNote3: 'W'.repeat(6000),
            }),
        });

        expect((sanitized.customData || '').length).toBeLessThanOrEqual(50000);
        const parsedCustom = JSON.parse(sanitized.customData || '{}');
        expect(parsedCustom.__e2ee_bio).toBe(bigCiphertextEnvelope);
        // Minimal satu field non-E2EE besar harus dipangkas agar muat di bawah 50KB
        const remainingExtras = ['extraNote1', 'extraNote2', 'extraNote3'].filter((k) => parsedCustom[k] !== undefined);
        expect(remainingExtras.length).toBeLessThan(3);

        assertMatchesIsValidPublicPendaftar({ ...sanitized }, ruleLists);
    });

    it('memvalidasi payload mode non-E2EE (termasuk input panjang & field tak dikenal) agar lolos rules', () => {
        const now = Date.now();
        const isoNow = new Date(now).toISOString();
        const cleanFields = sanitizePsbSubmissionFields({
            namaLengkap: 'Ahmad Fauzi '.repeat(25), // > 200 char, harus terpotong
            nis: 'N'.repeat(150), // > 100 char
            jenisKelamin: 'Laki-laki',
            tempatLahir: 'Bandung '.repeat(30), // > 150 char
            tanggalLahir: '2012-03-14',
            kewarganegaraan: 'WNI',
            namaAyah: 'Bapak Ahmad',
            namaIbu: 'Ibu Siti',
            status: 'Diterima', // mencoba menimpa status pada form publik
            deleted: true, // mencoba mengirim deleted: true
            unknownInjectedKey: 'harus terbuang',
            hobi: ['Membaca', 'Kaligrafi'],
            custom_asal_info: 'Website Resmi',
        });

        const safeNama = String(cleanFields.namaLengkap || '').trim() || 'Calon Santri';
        const sanitized = sanitizePendaftar({
            nomorRegistrasi: 'PSB-2026-REG-0001',
            tanggalDaftar: isoNow,
            tanggalMasuk: isoNow,
            gelombang: 1,
            jenjangId: 1,
            berkasFisik: {
                kk: false,
                akta: false,
                ijazahSkl: false,
                suratSehat: false,
                pasFoto: false,
                catatanBerkas: 'Pendaftaran Online via Portal Publik',
            },
            nilaiUjian: {
                rekomendasi: 'Dipertimbangkan',
                ruangUjian: 'Posko PSB',
                catatanUjian: 'Pendaftaran online via portal publik (menunggu jadwal seleksi)',
            },
            lastModified: now,
            ...cleanFields,
            namaLengkap: safeNama,
            status: 'Baru',
            deleted: false,
            customData: JSON.stringify({ asal_info: cleanFields.custom_asal_info }),
            id: now,
        });

        const docPayload: Record<string, unknown> = {
            ...sanitized,
            createdAt: { _methodName: 'serverTimestamp' },
        };

        assertMatchesIsValidPublicPendaftar(docPayload, ruleLists);
        expect((sanitized as any).unknownInjectedKey).toBeUndefined();
    });
});
