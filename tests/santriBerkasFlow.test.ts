import 'fake-indexeddb/auto';
import { webcrypto } from 'node:crypto';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../db';
import { computeSha256Hex } from '../services/psbBerkasFetcher';
import { lockDeviceVault, setupE2eeConfig, unlockWithPassword } from '../services/e2eeService';
import {
    applyLocalFotoBerkasToSantri,
    BERKAS_UNSUPPORTED_BACKEND_LABEL,
    buildPsbArchiveZip,
    canAccessSantriBerkas,
    decryptSantriBerkasBlob,
    deleteAllLocalBerkasForSantri,
    deleteCloudCopiesForPendaftarList,
    deleteCloudCopyForSantriBerkas,
    deleteLocalSantriBerkas,
    deleteOrphanSantriBerkas,
    exportBerkasBackupZip,
    getBerkasStorageStats,
    getSantriBerkasByPendaftar,
    getSantriBerkasBySantri,
    inspectBerkasBackupZip,
    isBerkasEligibleForCloudDeletion,
    linkPendaftarBerkasToSantri,
    redownloadSingleSantriBerkas,
    restoreBerkasBackupZip,
    savePendaftarAttachmentsToDevice,
} from '../services/santriBerkasService';
import { loadJsZip } from '../utils/lazyCloudServices';
import type { Pendaftar, PondokSettings, Santri, User } from '../types';

const PNG_BYTES = new Uint8Array([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
]);

const JPEG_BYTES = new Uint8Array([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46,
    0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01,
]);

const PDF_BYTES = new Uint8Array([
    0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34,
    0x0a, 0x25, 0xe2, 0xe3, 0xcf, 0xd3, 0x0a,
]);

const createMemoryStorage = (): Storage => {
    const store = new Map<string, string>();
    return {
        get length() {
            return store.size;
        },
        clear() {
            store.clear();
        },
        getItem(key: string) {
            return store.has(key) ? store.get(key)! : null;
        },
        key(index: number) {
            return Array.from(store.keys())[index] ?? null;
        },
        removeItem(key: string) {
            store.delete(key);
        },
        setItem(key: string, value: string) {
            store.set(String(key), String(value));
        },
    };
};

class NodeFileReaderShim {
    result: string | ArrayBuffer | null = null;
    onload: ((ev?: any) => void) | null = null;
    onerror: ((ev?: any) => void) | null = null;

    readAsDataURL(blob: Blob) {
        blob.arrayBuffer()
            .then((buf) => {
                const b64 = Buffer.from(buf).toString('base64');
                const mime = blob.type || 'application/octet-stream';
                this.result = `data:${mime};base64,${b64}`;
                this.onload?.({ target: this });
            })
            .catch((err) => {
                this.onerror?.(err);
            });
    }
}

const makeUser = (overrides: Partial<User> = {}): User => ({
    id: 1,
    username: 'admin-uji',
    passwordHash: 'hash',
    fullName: 'Admin Penguji',
    role: 'admin',
    permissions: {},
    ...overrides,
});

const makeSettings = (overrides: Partial<PondokSettings> = {}): PondokSettings =>
    ({
        namaPonpes: 'Ponpes Pengujian',
        alamat: 'Jl. Uji No. 1',
        jenjang: [{ id: 1, nama: 'MTs' }],
        kelas: [{ id: 1, nama: 'VII', jenjangId: 1 }],
        rombel: [{ id: 1, nama: 'VII-A', kelasId: 1 }],
        gedungAsrama: [],
        kamar: [],
        psbConfig: {
            tahunAjaranAktif: '2026/2027',
            targetKuota: 100,
            nomorHpAdmin: '081234567890',
            pesanSukses: 'Sukses',
            activeGelombang: 1,
            biayaPendaftaran: 0,
            infoRekening: '-',
            activeFields: [],
            requiredDocuments: [],
            backendProvider: 'gas',
            googleScriptUrl: 'https://script.google.com/macros/s/AKfycbFlowTest/exec',
            cloudAdminKey: 'adm_test_secret_admin_key_for_flow_tests_123456',
            customFields: [
                { id: 'uploadKk', label: 'Kartu Keluarga', type: 'file', required: true },
                { id: 'uploadIjazah', label: 'Ijazah Terakhir', type: 'file', required: false },
                { id: 'pasFoto', label: 'Pas Foto', type: 'file', required: false },
            ],
        },
        ...overrides,
    }) as unknown as PondokSettings;

const makePendaftar = (overrides: Partial<Pendaftar> = {}): Pendaftar => ({
    id: 101,
    nis: '',
    nomorRegistrasi: 'PSB-2026-REG-4K8M9Q',
    namaLengkap: 'Ahmad Fauzi Ramadhan',
    jenisKelamin: 'Laki-laki',
    tempatLahir: 'Bandung',
    tanggalLahir: '2012-05-01',
    kewarganegaraan: 'WNI',
    alamat: { detail: 'Jl. Pesantren' },
    namaAyah: 'Bapak Ahmad',
    namaIbu: 'Ibu Siti',
    jenjangId: 1,
    kelasId: 1,
    rombelId: 1,
    tanggalMasuk: '2026-07-01',
    tanggalDaftar: '2026-06-01T08:00:00.000Z',
    status: 'Baru',
    jenisSantri: 'Mondok - Baru',
    customData: '{}',
    ...overrides,
});

const makeSantri = (overrides: Partial<Santri> = {}): Santri => ({
    id: 501,
    nis: '2026001',
    namaLengkap: 'Ahmad Fauzi Ramadhan',
    jenisKelamin: 'Laki-laki',
    tempatLahir: 'Bandung',
    tanggalLahir: '2012-05-01',
    kewarganegaraan: 'WNI',
    alamat: { detail: 'Jl. Pesantren' },
    namaAyah: 'Bapak Ahmad',
    namaIbu: 'Ibu Siti',
    jenjangId: 1,
    kelasId: 1,
    rombelId: 1,
    tanggalMasuk: '2026-07-01',
    status: 'Aktif',
    jenisSantri: 'Mondok - Baru',
    fotoUrl: 'https://placehold.co/150x200/e2e8f0/334155?text=Foto',
    ...overrides,
});

const createGasFetchMock = (filesById: Record<string, { name: string; mime: string; bytes: Uint8Array }>) => {
    return vi.fn(async (_url: string, init?: RequestInit) => {
        const body = JSON.parse(String(init?.body || '{}'));
        const entry = filesById[body.fileId];
        if (!entry) {
            return new Response(JSON.stringify({ result: 'error', error: 'File tidak ditemukan' }), {
                status: 404,
            });
        }
        const sha256 = await computeSha256Hex(entry.bytes);
        return new Response(
            JSON.stringify({
                result: 'success',
                name: entry.name,
                mime: entry.mime,
                size: entry.bytes.byteLength,
                sha256,
                data: Buffer.from(entry.bytes).toString('base64'),
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
    }) as unknown as typeof fetch;
};

describe('santriBerkas End-to-End Offline Attachment Flows (Butir 3.10)', () => {
    beforeAll(() => {
        const ls = createMemoryStorage();
        const ss = createMemoryStorage();
        (globalThis as any).localStorage = ls;
        (globalThis as any).sessionStorage = ss;
        (globalThis as any).CustomEvent = class CustomEventShim {
            type: string;
            detail: any;
            constructor(type: string, init?: { detail?: any }) {
                this.type = type;
                this.detail = init?.detail;
            }
        };
        (globalThis as any).window = {
            crypto: webcrypto,
            localStorage: ls,
            sessionStorage: ss,
            indexedDB: globalThis.indexedDB,
            dispatchEvent: () => true,
        };
        if (!(globalThis as any).crypto?.subtle) {
            (globalThis as any).crypto = webcrypto;
        }
        (globalThis as any).FileReader = NodeFileReaderShim;
    });

    beforeEach(async () => {
        (globalThis as any).localStorage.clear();
        (globalThis as any).sessionStorage.clear();
        lockDeviceVault();
        await db.open();
        await db.santriBerkas.clear();
        await db.santri.clear();
        await db.pendaftar.clear();
        await db.auditLogs.clear();
    });

    afterEach(() => {
        vi.restoreAllMocks();
        lockDeviceVault();
    });

    it('pulls GAS attachments idempotently, compresses images to JPEG, keeps PDFs raw, and supports raw toggle', async () => {
        const admin = makeUser();
        const settings = makeSettings();
        const kkId = '1FileKkIdAbCdEfGhIjKlMnOpQrSt0001';
        const ijId = '1FileIjazahAbCdEfGhIjKlMnOpQr0002';

        const pendaftar = makePendaftar({
            id: 101,
            customData: JSON.stringify({
                uploadKk: `https://drive.google.com/file/d/${kkId}/view`,
                uploadIjazah: `https://drive.google.com/file/d/${ijId}/view`,
            }),
        });
        await db.pendaftar.put(pendaftar);

        const mockFetch = createGasFetchMock({
            [kkId]: { name: 'kk-santri.png', mime: 'image/png', bytes: PNG_BYTES },
            [ijId]: { name: 'ijazah-santri.pdf', mime: 'application/pdf', bytes: PDF_BYTES },
        });
        const mockCompressor = vi.fn(async () => new Blob([JPEG_BYTES], { type: 'image/jpeg' }));

        const first = await savePendaftarAttachmentsToDevice([pendaftar], {
            settings,
            currentUser: admin,
            fetcherConfig: { fetchImpl: mockFetch, baseBackoffMs: 0 },
            canvasCompressor: mockCompressor,
        });

        expect(first.totalAttachments).toBe(2);
        expect(first.saved).toBe(2);
        expect(first.failed).toBe(0);
        expect(mockCompressor).toHaveBeenCalledTimes(1);

        const savedRows = await getSantriBerkasByPendaftar(101, admin);
        expect(savedRows).toHaveLength(2);
        const kkRow = savedRows.find((r) => r.fieldId === 'uploadKk')!;
        const ijRow = savedRows.find((r) => r.fieldId === 'uploadIjazah')!;

        expect(kkRow.mime).toBe('image/jpeg');
        expect(kkRow.asliTanpaKompresi).toBe(false);
        expect(kkRow.sha256).toBe(await computeSha256Hex(JPEG_BYTES));
        expect(kkRow.sumberSha256).toBe(await computeSha256Hex(PNG_BYTES));

        expect(ijRow.mime).toBe('application/pdf');
        expect(ijRow.sha256).toBe(await computeSha256Hex(PDF_BYTES));

        // Re-running with same parameters is idempotent (skips instead of duplicating rows)
        const second = await savePendaftarAttachmentsToDevice([pendaftar], {
            settings,
            currentUser: admin,
            fetcherConfig: { fetchImpl: mockFetch, baseBackoffMs: 0 },
            canvasCompressor: mockCompressor,
        });
        expect(second.skipped).toBe(2);
        expect(second.saved).toBe(0);
        expect(await db.santriBerkas.count()).toBe(2);

        // Switching to simpanAsliTanpaKompresi re-evaluates & updates in-place without duplicating
        const rawPass = await savePendaftarAttachmentsToDevice([pendaftar], {
            settings,
            currentUser: admin,
            simpanAsliTanpaKompresi: true,
            fetcherConfig: { fetchImpl: mockFetch, baseBackoffMs: 0 },
            canvasCompressor: mockCompressor,
        });
        expect(rawPass.saved).toBe(2);
        expect(rawPass.skipped).toBe(0);
        expect(await db.santriBerkas.count()).toBe(2);

        const kkRawRow = (await getSantriBerkasByPendaftar(101, admin)).find((r) => r.fieldId === 'uploadKk')!;
        expect(kkRawRow.mime).toBe('image/png');
        expect(kkRawRow.asliTanpaKompresi).toBe(true);
        expect(kkRawRow.sha256).toBe(await computeSha256Hex(PNG_BYTES));
    });

    it('links pendaftar attachments to santriId without overwriting fotoUrl until explicitly applied', async () => {
        const admin = makeUser();
        const settings = makeSettings();
        const fotoId = '1FilePasFotoAbCdEfGhIjKlMnOp0003';

        const pendaftar = makePendaftar({
            id: 201,
            customData: JSON.stringify({
                pasFoto: `https://drive.google.com/open?id=${fotoId}`,
            }),
        });
        const santri = makeSantri({ id: 501 });
        await db.pendaftar.put(pendaftar);
        await db.santri.put(santri);

        const mockFetch = createGasFetchMock({
            [fotoId]: { name: 'pas-foto.jpg', mime: 'image/jpeg', bytes: JPEG_BYTES },
        });
        await savePendaftarAttachmentsToDevice([pendaftar], {
            settings,
            currentUser: admin,
            simpanAsliTanpaKompresi: true,
            fetcherConfig: { fetchImpl: mockFetch, baseBackoffMs: 0 },
        });

        const linkedCount = await linkPendaftarBerkasToSantri(201, 501, admin);
        expect(linkedCount).toBe(1);

        // Must NEVER auto-overwrite santri.fotoUrl upon linking
        const santriAfterLink = await db.santri.get(501);
        expect(santriAfterLink?.fotoUrl).toBe('https://placehold.co/150x200/e2e8f0/334155?text=Foto');

        const berkasList = await getSantriBerkasBySantri(501, 201, admin);
        expect(berkasList).toHaveLength(1);
        expect(berkasList[0].santriId).toBe(501);

        // Explicit user choice applies local photo to santri.fotoUrl
        const appliedDataUrl = await applyLocalFotoBerkasToSantri(501, berkasList[0].id!, admin, settings);
        expect(appliedDataUrl).toMatch(/^data:image\/jpeg;base64,/);

        const santriAfterApply = await db.santri.get(501);
        expect(santriAfterApply?.fotoUrl).toBe(appliedDataUrl);
    });

    it('marks unsupported providers (cloudflare_r2, supabase) without calling fetch', async () => {
        const admin = makeUser();
        const settings = makeSettings({
            psbConfig: {
                ...makeSettings().psbConfig!,
                backendProvider: 'cloudflare_r2',
            },
        });
        const pendaftar = makePendaftar({
            id: 202,
            customData: JSON.stringify({
                uploadKk: 'https://r2-worker.example.com/?action=file&key=berkas/kk.pdf',
            }),
        });
        await db.pendaftar.put(pendaftar);

        const mockFetch = vi.fn() as unknown as typeof fetch;
        const summary = await savePendaftarAttachmentsToDevice([pendaftar], {
            settings,
            currentUser: admin,
            fetcherConfig: { fetchImpl: mockFetch, baseBackoffMs: 0 },
        });

        expect(mockFetch).not.toHaveBeenCalled();
        expect(summary.unsupported).toBe(1);
        expect(summary.failed).toBe(0);

        const rows = await getSantriBerkasByPendaftar(202, admin);
        expect(rows[0].statusUnduh).toBe('tidak_didukung');
        expect(rows[0].pesanError).toBe(BERKAS_UNSUPPORTED_BACKEND_LABEL);
    });

    it('encrypts local blobs with HKDF berkas-local when unlocked and fails closed (status=cloud, no plaintext) when E2EE is locked', async () => {
        const admin = makeUser();
        const { config: e2eeConfig } = await setupE2eeConfig('SandiPondokSuperAman2026!');
        const settings = makeSettings({ e2eeConfig });

        const kkId = '1FileE2eeKkAbCdEfGhIjKlMnOp0004';
        const ijId = '1FileE2eeIjAbCdEfGhIjKlMnOp0005';
        const pendaftar = makePendaftar({
            id: 301,
            customData: JSON.stringify({
                uploadKk: `https://drive.google.com/file/d/${kkId}/view`,
                uploadIjazah: `https://drive.google.com/file/d/${ijId}/view`,
            }),
        });
        await db.pendaftar.put(pendaftar);

        const mockFetch = createGasFetchMock({
            [kkId]: { name: 'kk.png', mime: 'image/png', bytes: PNG_BYTES },
            [ijId]: { name: 'ijazah.pdf', mime: 'application/pdf', bytes: PDF_BYTES },
        });

        // 1. Pull while E2EE unlocked -> encrypted locally with HKDF berkas-local
        const resUnlocked = await savePendaftarAttachmentsToDevice([pendaftar], {
            settings,
            currentUser: admin,
            simpanAsliTanpaKompresi: true,
            fetcherConfig: { fetchImpl: mockFetch, baseBackoffMs: 0 },
        });
        expect(resUnlocked.saved).toBe(2);

        const rows = await getSantriBerkasByPendaftar(301, admin);
        const pdfRow = rows.find((r) => r.fieldId === 'uploadIjazah')!;
        expect(pdfRow.terenkripsi).toBe(true);
        expect(pdfRow.encryptionMeta?.kdf).toBe('hkdf-sha256');
        expect(pdfRow.encryptionMeta?.context).toBe('berkas-local');
        expect(pdfRow.sha256).toBe(await computeSha256Hex(PDF_BYTES));
        const storedCipherBytes = new Uint8Array(await pdfRow.blob!.arrayBuffer());
        expect(storedCipherBytes).not.toEqual(PDF_BYTES);

        // Decrypt while unlocked -> returns exact original PDF bytes
        const decryptedBlob = await decryptSantriBerkasBlob(pdfRow, settings, admin);
        expect(decryptedBlob.type).toBe('application/pdf');
        expect(new Uint8Array(await decryptedBlob.arrayBuffer())).toEqual(PDF_BYTES);

        // 2. Lock Device Vault -> preview fails, new pull refuses plaintext and marks status 'cloud'
        lockDeviceVault();
        await expect(decryptSantriBerkasBlob(pdfRow, settings, admin)).rejects.toThrow(/E2EE_LOCKED/);

        const pendaftarLocked = makePendaftar({
            id: 302,
            customData: JSON.stringify({
                uploadIjazah: `https://drive.google.com/file/d/${ijId}/view`,
            }),
        });
        await db.pendaftar.put(pendaftarLocked);
        const resLocked = await savePendaftarAttachmentsToDevice([pendaftarLocked], {
            settings,
            currentUser: admin,
            fetcherConfig: { fetchImpl: mockFetch, baseBackoffMs: 0 },
        });
        expect(resLocked.lockedWaitingUnlock).toBe(1);
        expect(resLocked.saved).toBe(0);

        const lockedRows = await getSantriBerkasByPendaftar(302, admin);
        expect(lockedRows).toHaveLength(1);
        expect(lockedRows[0].statusUnduh).toBe('cloud');
        expect(lockedRows[0].blob).toBeUndefined();

        // Unlock again to verify redownload succeeds once unlocked
        await unlockWithPassword(e2eeConfig, 'SandiPondokSuperAman2026!');
        const redownloaded = await redownloadSingleSantriBerkas(lockedRows[0].id!, {
            settings,
            currentUser: admin,
            fetcherConfig: { fetchImpl: mockFetch, baseBackoffMs: 0 },
        });
        expect(redownloaded.statusUnduh).toBe('tersimpan');
        expect(redownloaded.terenkripsi).toBe(true);
    });

    it('builds safe PSB ZIP archives with MIME extensions and safe vs friendly folder names', async () => {
        const admin = makeUser();
        const settings = makeSettings();
        const kkId = '1FileZipKkAbCdEfGhIjKlMnOpQr0006';
        const ijId = '1FileZipIjAbCdEfGhIjKlMnOpQr0007';

        const pendaftar = makePendaftar({
            id: 401,
            nomorRegistrasi: 'PSB-2026-REG-ZIP123',
            namaLengkap: 'Ahmad Fauzi Ramadhan',
            customData: JSON.stringify({
                uploadKk: `https://drive.google.com/file/d/${kkId}/view`,
                uploadIjazah: `https://drive.google.com/file/d/${ijId}/view`,
            }),
        });
        await db.pendaftar.put(pendaftar);

        const mockFetch = createGasFetchMock({
            [kkId]: { name: 'kk-foto.png', mime: 'image/png', bytes: PNG_BYTES },
            [ijId]: { name: 'ijazah.pdf', mime: 'application/pdf', bytes: PDF_BYTES },
        });
        await savePendaftarAttachmentsToDevice([pendaftar], {
            settings,
            currentUser: admin,
            fetcherConfig: { fetchImpl: mockFetch, baseBackoffMs: 0 },
            canvasCompressor: async () => new Blob([JPEG_BYTES], { type: 'image/jpeg' }),
        });

        const safeRes = await buildPsbArchiveZip([pendaftar], {
            settings,
            currentUser: admin,
            useFriendlyName: false,
        });
        expect(safeRes.fileCount).toBe(2);

        const JSZip = await loadJsZip();
        const safeZip = await JSZip.loadAsync(safeRes.zipBlob);
        const safePaths = Object.keys(safeZip.files).filter((k) => !safeZip.files[k].dir);
        expect(safePaths).toContain('PSB-2026-REG-ZIP123_AFR/kartu-keluarga.jpg');
        expect(safePaths).toContain('PSB-2026-REG-ZIP123_AFR/ijazah-terakhir.pdf');

        const friendlyRes = await buildPsbArchiveZip([pendaftar], {
            settings,
            currentUser: admin,
            useFriendlyName: true,
        });
        const friendlyZip = await JSZip.loadAsync(friendlyRes.zipBlob);
        const friendlyPaths = Object.keys(friendlyZip.files).filter((k) => !friendlyZip.files[k].dir);
        expect(friendlyPaths).toContain('Ahmad Fauzi Ramadhan (PSB-2026-REG-ZIP123)/Ahmad Fauzi Ramadhan - Kartu Keluarga.jpg');
        expect(friendlyPaths).toContain('Ahmad Fauzi Ramadhan (PSB-2026-REG-ZIP123)/Ahmad Fauzi Ramadhan - Ijazah Terakhir.pdf');
    });

    it('exports and restores separate berkas ZIP backup (plain & AES-GCM encrypted), re-encrypts locally, and rejects tampering/locked E2EE', async () => {
        const admin = makeUser();
        const { config: e2eeConfig } = await setupE2eeConfig('MasterPassBackupBerkas2026!');
        const settings = makeSettings({ e2eeConfig });

        const kkId = '1FileBkpKkAbCdEfGhIjKlMnOpQr0008';
        const ijId = '1FileBkpIjAbCdEfGhIjKlMnOpQr0009';
        const pendaftar = makePendaftar({
            id: 505,
            santriId: 705,
            customData: JSON.stringify({
                uploadKk: `https://drive.google.com/file/d/${kkId}/view`,
                uploadIjazah: `https://drive.google.com/file/d/${ijId}/view`,
            }),
        });
        await db.pendaftar.put(pendaftar);
        await db.santri.put(makeSantri({ id: 705 }));

        const mockFetch = createGasFetchMock({
            [kkId]: { name: 'kk.jpg', mime: 'image/jpeg', bytes: JPEG_BYTES },
            [ijId]: { name: 'ijazah.pdf', mime: 'application/pdf', bytes: PDF_BYTES },
        });
        await savePendaftarAttachmentsToDevice([pendaftar], {
            settings,
            currentUser: admin,
            simpanAsliTanpaKompresi: true,
            fetcherConfig: { fetchImpl: mockFetch, baseBackoffMs: 0 },
        });

        const exported = await exportBerkasBackupZip({
            settings,
            currentUser: admin,
            password: 'zip-secret-password',
        });
        expect(exported.fileCount).toBe(2);
        expect(exported.encrypted).toBe(true);
        expect(exported.zipBlob).toBeTruthy();

        const inspected = await inspectBerkasBackupZip(exported.zipBlob!);
        expect(inspected.encrypted).toBe(true);
        expect(inspected.entryCount).toBe(2);

        // Wrong ZIP password rejected cleanly
        await expect(
            restoreBerkasBackupZip(exported.zipBlob!, {
                settings,
                currentUser: admin,
                password: 'wrong-password',
            })
        ).rejects.toThrow(/Password cadangan berkas ZIP salah/i);

        // Fails closed if active E2EE vault is locked
        lockDeviceVault();
        await expect(
            restoreBerkasBackupZip(exported.zipBlob!, {
                settings,
                currentUser: admin,
                password: 'zip-secret-password',
            })
        ).rejects.toThrow(/E2EE_LOCKED/);

        // Unlock and restore into clean santriBerkas table -> automatically re-encrypted locally
        await unlockWithPassword(e2eeConfig, 'MasterPassBackupBerkas2026!');
        await db.santriBerkas.clear();

        const restored = await restoreBerkasBackupZip(exported.zipBlob!, {
            settings,
            currentUser: admin,
            password: 'zip-secret-password',
        });
        expect(restored.restored).toBe(2);
        expect(restored.rejected).toBe(0);

        const afterRestore = await getSantriBerkasBySantri(705, 505, admin);
        expect(afterRestore).toHaveLength(2);
        for (const row of afterRestore) {
            expect(row.terenkripsi).toBe(true);
            const pt = await decryptSantriBerkasBlob(row, settings, admin);
            const ptBytes = new Uint8Array(await pt.arrayBuffer());
            expect(await computeSha256Hex(ptBytes)).toBe(row.sha256);
        }

        // Plain ZIP export + SHA-256 tamper rejection test
        const plainExport = await exportBerkasBackupZip({ settings, currentUser: admin });
        const plainMeta = await inspectBerkasBackupZip(plainExport.zipBlob!);
        const JSZip = await loadJsZip();
        const tamperedZip = await JSZip.loadAsync(plainExport.zipBlob!);
        const firstEntry = plainMeta.manifest.entries[0];
        // Corrupt file bytes while preserving MIME magic bytes so SHA-256 mismatch is triggered
        const validHeaderBytes = firstEntry.mime === 'application/pdf' ? PDF_BYTES : JPEG_BYTES;
        tamperedZip.file(firstEntry.path, new Uint8Array([...validHeaderBytes, 0x99]));
        const tamperedBlob: Blob = await tamperedZip.generateAsync({ type: 'blob' });

        await db.santriBerkas.clear();
        const tamperedRes = await restoreBerkasBackupZip(tamperedBlob, {
            settings,
            currentUser: admin,
        });
        expect(tamperedRes.rejected).toBe(1);
        expect(tamperedRes.restored).toBe(1);
    });

    it('cascades sample deletion by santriId and detects/cleans orphan attachments', async () => {
        const admin = makeUser();
        await db.santri.bulkPut([
            makeSantri({ id: 601, namaLengkap: 'Santri Aktif' }),
            makeSantri({ id: 602, namaLengkap: 'Santri Sampel' }),
        ]);

        const nowIso = new Date().toISOString();
        const sha = await computeSha256Hex(PDF_BYTES);
        const pdfBlob = new Blob([PDF_BYTES], { type: 'application/pdf' });

        await db.santriBerkas.bulkAdd([
            {
                santriId: 601,
                jenis: 'kk',
                fieldId: 'uploadKk',
                mime: 'application/pdf',
                ukuran: PDF_BYTES.byteLength,
                sha256: sha,
                blob: pdfBlob,
                sumber: 'gas',
                sumberRef: 'ref1',
                statusUnduh: 'tersimpan',
                terenkripsi: false,
                createdAt: nowIso,
                lastModified: Date.now(),
            },
            {
                santriId: 602,
                jenis: 'kk',
                fieldId: 'uploadKk',
                mime: 'application/pdf',
                ukuran: PDF_BYTES.byteLength,
                sha256: sha,
                blob: pdfBlob,
                sumber: 'gas',
                sumberRef: 'ref2',
                statusUnduh: 'tersimpan',
                terenkripsi: false,
                createdAt: nowIso,
                lastModified: Date.now(),
            },
            {
                santriId: 9999, // Tidak ada di db.santri -> berkas yatim
                jenis: 'ijazah',
                fieldId: 'uploadIjazah',
                mime: 'application/pdf',
                ukuran: PDF_BYTES.byteLength,
                sha256: sha,
                blob: pdfBlob,
                sumber: 'gas',
                sumberRef: 'ref3',
                statusUnduh: 'tersimpan',
                terenkripsi: false,
                createdAt: nowIso,
                lastModified: Date.now(),
            },
        ]);

        // Simulasikan cascade delete sample data berdasarkan santriId sampel (602)
        await db.santriBerkas.where('santriId').anyOf([602]).delete();
        await db.santri.delete(602);

        const statsBefore = await getBerkasStorageStats();
        expect(statsBefore.storedRows).toBe(2);
        expect(statsBefore.orphanCount).toBe(1);

        const cleaned = await deleteOrphanSantriBerkas(admin);
        expect(cleaned.deletedCount).toBe(1);
        expect(cleaned.freedBytes).toBe(PDF_BYTES.byteLength);

        const remaining = await getSantriBerkasBySantri(601, undefined, admin);
        expect(remaining).toHaveLength(1);
        expect(remaining[0].santriId).toBe(601);
    });

    it('enforces strict RBAC across service layer and records auditLogs actions', async () => {
        const admin = makeUser({ id: 1, username: 'admin-rbac', role: 'admin' });
        const psbWriteStaff = makeUser({
            id: 2,
            username: 'staff-psb',
            role: 'staff',
            permissions: { psb: 'write', santri: 'read' },
        });
        const santriWriteStaff = makeUser({
            id: 3,
            username: 'staff-santri',
            role: 'staff',
            permissions: { psb: 'read', santri: 'write' },
        });
        const readOnlyStaff = makeUser({
            id: 4,
            username: 'staff-read',
            role: 'staff',
            permissions: { psb: 'read', santri: 'read', pengaturan: 'write' },
        });
        const noAccessStaff = makeUser({
            id: 5,
            username: 'staff-none',
            role: 'staff',
            permissions: {},
        });

        expect(canAccessSantriBerkas(admin)).toBe(true);
        expect(canAccessSantriBerkas(psbWriteStaff)).toBe(true);
        expect(canAccessSantriBerkas(santriWriteStaff)).toBe(true);
        expect(canAccessSantriBerkas(readOnlyStaff)).toBe(false);
        expect(canAccessSantriBerkas(noAccessStaff)).toBe(false);
        expect(canAccessSantriBerkas(null)).toBe(false);

        const settings = makeSettings();
        const kkId = '1FileRbacKkAbCdEfGhIjKlMnOp0010';
        const pendaftar = makePendaftar({
            id: 801,
            customData: JSON.stringify({
                uploadKk: `https://drive.google.com/file/d/${kkId}/view`,
            }),
        });
        await db.pendaftar.put(pendaftar);
        await db.santri.put(makeSantri({ id: 801 }));

        const mockFetch = createGasFetchMock({
            [kkId]: { name: 'kk.jpg', mime: 'image/jpeg', bytes: JPEG_BYTES },
        });

        // Denied users fail at every service entry point
        for (const deniedUser of [readOnlyStaff, noAccessStaff, null] as Array<User | null>) {
            await expect(
                savePendaftarAttachmentsToDevice([pendaftar], { settings, currentUser: deniedUser })
            ).rejects.toThrow(/Akses ditolak/);
            await expect(getSantriBerkasByPendaftar(801, deniedUser)).rejects.toThrow(/Akses ditolak/);
            await expect(getSantriBerkasBySantri(801, 801, deniedUser)).rejects.toThrow(/Akses ditolak/);
            await expect(linkPendaftarBerkasToSantri(801, 801, deniedUser)).rejects.toThrow(/Akses ditolak/);
            await expect(buildPsbArchiveZip([pendaftar], { settings, currentUser: deniedUser })).rejects.toThrow(/Akses ditolak/);
            await expect(exportBerkasBackupZip({ settings, currentUser: deniedUser })).rejects.toThrow(/Akses ditolak/);
            await expect(deleteOrphanSantriBerkas(deniedUser)).rejects.toThrow(/Akses ditolak/);
        }

        // Allowed staff pulls, previews, deletes, and populates auditLogs
        await savePendaftarAttachmentsToDevice([pendaftar], {
            settings,
            currentUser: psbWriteStaff,
            simpanAsliTanpaKompresi: true,
            fetcherConfig: { fetchImpl: mockFetch, baseBackoffMs: 0 },
        });

        const rows = await getSantriBerkasByPendaftar(801, santriWriteStaff);
        expect(rows).toHaveLength(1);
        const berkasId = rows[0].id!;

        await decryptSantriBerkasBlob(rows[0], settings, santriWriteStaff);

        await expect(deleteLocalSantriBerkas(berkasId, readOnlyStaff)).rejects.toThrow(/Akses ditolak/);
        await expect(deleteAllLocalBerkasForSantri(801, readOnlyStaff)).rejects.toThrow(/Akses ditolak/);
        await expect(applyLocalFotoBerkasToSantri(801, berkasId, readOnlyStaff, settings)).rejects.toThrow(/Akses ditolak/);

        await linkPendaftarBerkasToSantri(801, 801, santriWriteStaff);
        // Gunakan deleteAllLocalBerkasForSantri (recordId 'santri-801') agar tidak bentrok dengan jendela deduplikasi 1.5s lihat_berkas (berkasId)
        const deletedAllCount = await deleteAllLocalBerkasForSantri(801, santriWriteStaff);
        expect(deletedAllCount).toBe(1);
        expect(await getSantriBerkasBySantri(801, 801, admin)).toHaveLength(0);

        const logs = await db.auditLogs.toArray();
        const berkasLogs = logs.filter((l) => l.table_name === 'santriBerkas');
        expect(berkasLogs.some((l) => l.new_data?.action === 'tarik_lampiran')).toBe(true);
        expect(berkasLogs.some((l) => l.new_data?.action === 'lihat_berkas')).toBe(true);
        expect(berkasLogs.some((l) => l.operation === 'DELETE')).toBe(true);
    });

    it('deletes cloud copy only when local verified offline copy exists, preserves local blob, blocks redownload, and audits (Butir 3.9)', async () => {
        const admin = makeUser({ id: 1, username: 'admin-cloud-del', role: 'admin' });
        const readOnly = makeUser({
            id: 2,
            username: 'staff-ro',
            role: 'staff',
            permissions: { psb: 'read', santri: 'read' },
        });
        const settings = makeSettings();

        const kkId = '1FileCloudDelKkAbCdEfGhIjKlMn0011';
        const ijId = '1FileCloudDelIjAbCdEfGhIjKlMn0012';
        const deletedRemoteIds: string[] = [];

        const dualFetch = vi.fn(async (url: string, init?: RequestInit) => {
            const body = JSON.parse(String(init?.body || '{}'));
            if (body.action === 'getFile') {
                const fileId = body.fileId;
                const bytes = fileId === kkId ? PNG_BYTES : PDF_BYTES;
                const mime = fileId === kkId ? 'image/png' : 'application/pdf';
                const sha256 = await computeSha256Hex(bytes);
                return new Response(
                    JSON.stringify({
                        result: 'success',
                        name: fileId === kkId ? 'kk.png' : 'ijazah.pdf',
                        mime,
                        size: bytes.byteLength,
                        sha256,
                        data: Buffer.from(bytes).toString('base64'),
                    }),
                    { status: 200 }
                );
            }
            if (body.action === 'deleteFile') {
                expect(body.adminKey).toBe(settings.psbConfig!.cloudAdminKey);
                deletedRemoteIds.push(body.fileId);
                return new Response(
                    JSON.stringify({
                        result: 'success',
                        success: true,
                        trashed: true,
                        fileId: body.fileId,
                    }),
                    { status: 200 }
                );
            }
            throw new Error(`Unexpected GAS action for ${url}: ${body.action}`);
        }) as unknown as typeof fetch;

        const pendaftar = makePendaftar({
            id: 901,
            customData: JSON.stringify({
                uploadKk: `https://drive.google.com/file/d/${kkId}/view`,
                uploadIjazah: `https://drive.google.com/file/d/${ijId}/view`,
            }),
        });
        await db.pendaftar.put(pendaftar);

        // Insert a cloud-only (unpulled) row -> MUST refuse cloud deletion
        const unpulledId = await db.santriBerkas.add({
            pendaftarId: 902,
            jenis: 'kk',
            fieldId: 'uploadKk',
            fieldLabel: 'Kartu Keluarga',
            mime: '',
            ukuran: 0,
            sha256: '',
            sumber: 'gas',
            sumberRef: `https://drive.google.com/file/d/${kkId}/view`,
            statusUnduh: 'cloud',
            terenkripsi: false,
            createdAt: new Date().toISOString(),
            lastModified: Date.now(),
        });

        await expect(
            deleteCloudCopyForSantriBerkas(unpulledId, {
                settings,
                currentUser: admin,
                fetcherConfig: { fetchImpl: dualFetch, baseBackoffMs: 0 },
            })
        ).rejects.toThrow(/tersimpan offline/i);
        expect(deletedRemoteIds).toHaveLength(0);

        // Pull attachments for pendaftar 901 first
        await savePendaftarAttachmentsToDevice([pendaftar], {
            settings,
            currentUser: admin,
            simpanAsliTanpaKompresi: true,
            fetcherConfig: { fetchImpl: dualFetch, baseBackoffMs: 0 },
        });

        const savedRows = await getSantriBerkasByPendaftar(901, admin);
        const kkRow = savedRows.find((r) => r.fieldId === 'uploadKk')!;
        expect(isBerkasEligibleForCloudDeletion(kkRow).eligible).toBe(true);

        // RBAC check
        await expect(
            deleteCloudCopyForSantriBerkas(kkRow.id!, {
                settings,
                currentUser: readOnly,
                fetcherConfig: { fetchImpl: dualFetch, baseBackoffMs: 0 },
            })
        ).rejects.toThrow(/Akses ditolak/);

        // Single cloud deletion succeeds & preserves local offline Blob + SHA-256
        const updatedKk = await deleteCloudCopyForSantriBerkas(kkRow.id!, {
            settings,
            currentUser: admin,
            fetcherConfig: { fetchImpl: dualFetch, baseBackoffMs: 0 },
        });
        expect(deletedRemoteIds).toEqual([kkId]);
        expect(updatedKk.cloudDeletedAt).toBeTruthy();
        expect(updatedKk.statusUnduh).toBe('tersimpan');
        expect(updatedKk.sha256).toBe(await computeSha256Hex(PNG_BYTES));
        expect(updatedKk.blob).toBeDefined();
        expect(isBerkasEligibleForCloudDeletion(updatedKk).eligible).toBe(false);

        // Attempting redownload after cloudDeletedAt does not clobber local copy
        await expect(
            redownloadSingleSantriBerkas(kkRow.id!, {
                settings,
                currentUser: admin,
                fetcherConfig: { fetchImpl: dualFetch, baseBackoffMs: 0 },
            })
        ).rejects.toThrow(/Salinan cloud.*sudah dihapus/i);

        // Bulk cloud deletion over pendaftar [901, 902]: skips already-deleted kk (901), skips cloud-only 902, deletes remaining ij (901)
        const bulkSummary = await deleteCloudCopiesForPendaftarList([901, 902], {
            settings,
            currentUser: admin,
            fetcherConfig: { fetchImpl: dualFetch, baseBackoffMs: 0 },
        });
        expect(bulkSummary.deleted).toBe(1);
        expect(bulkSummary.skippedAlreadyDeleted).toBe(1);
        expect(bulkSummary.skippedNotSavedLocally).toBe(1);
        expect(bulkSummary.failed).toBe(0);
        expect(deletedRemoteIds).toEqual([kkId, ijId]);

        // Verify local preview/decrypt still works after cloud copy deletion
        const ijAfter = (await getSantriBerkasByPendaftar(901, admin)).find((r) => r.fieldId === 'uploadIjazah')!;
        const localPdf = await decryptSantriBerkasBlob(ijAfter, settings, admin);
        expect(new Uint8Array(await localPdf.arrayBuffer())).toEqual(PDF_BYTES);

        const auditLogs = await db.auditLogs.toArray();
        expect(auditLogs.some((l) => l.table_name === 'santriBerkas' && l.new_data?.action === 'hapus_salinan_cloud')).toBe(true);
        expect(auditLogs.some((l) => l.table_name === 'santriBerkas' && l.new_data?.action === 'hapus_salinan_cloud_massal')).toBe(true);
    });

    it('resolves newly accepted pendaftar via indexed santriId without SchemaError and pulls attachments', async () => {
        const admin = makeUser({ id: 1, username: 'admin-tab-berkas', role: 'admin' });
        const settings = makeSettings();
        const acceptedSantriId = 9501;
        const kkId = '1FileAcceptedSantriKk0011223344';

        await db.santri.put(makeSantri({ id: acceptedSantriId, namaLengkap: 'Santri Baru PSB' }));
        await db.pendaftar.put(
            makePendaftar({
                id: 951,
                santriId: acceptedSantriId,
                status: 'Diterima',
                deleted: false,
                customData: JSON.stringify({
                    uploadKk: `https://drive.google.com/file/d/${kkId}/view`,
                }),
            })
        );

        const matchingPendaftar = await db.pendaftar.where('santriId').equals(acceptedSantriId).toArray();
        const linkedPendaftar = matchingPendaftar.find((p) => !p.deleted) || matchingPendaftar[0] || null;
        expect(linkedPendaftar).not.toBeNull();
        expect(linkedPendaftar?.id).toBe(951);

        const mockFetch = createGasFetchMock({
            [kkId]: { name: 'kk.png', mime: 'image/png', bytes: PNG_BYTES },
        });
        const pullSummary = await savePendaftarAttachmentsToDevice([linkedPendaftar!], {
            settings,
            currentUser: admin,
            simpanAsliTanpaKompresi: true,
            onlyFailedOrCloud: true,
            fetcherConfig: { fetchImpl: mockFetch, baseBackoffMs: 0 },
        });
        expect(pullSummary.saved).toBe(1);

        await linkPendaftarBerkasToSantri(linkedPendaftar!.id, acceptedSantriId, admin);
        const berkasList = await getSantriBerkasBySantri(acceptedSantriId, linkedPendaftar!.id, admin);
        expect(berkasList).toHaveLength(1);
        expect(berkasList[0].santriId).toBe(acceptedSantriId);
        expect(berkasList[0].statusUnduh).toBe('tersimpan');
    });

    it('preserves pendaftarId for HKDF decryption and transfers plaintext/E2EE santriBerkas + unpulled refs on exact-duplicate linking', async () => {
        const admin = makeUser({ id: 1, username: 'admin-dup-berkas', role: 'admin' });
        const { config: e2eeConfig } = await setupE2eeConfig('DupLinkMasterKey2026!');
        const plainSettings = makeSettings();
        const e2eeSettings = makeSettings({ e2eeConfig });

        const existingSantriId = 8801;
        await db.santri.put(
            makeSantri({
                id: existingSantriId,
                namaLengkap: 'Muhammad Rizki',
                tanggalLahir: '2012-03-14',
            })
        );

        // Scenario A: plaintext pre-pulled berkas on pendaftar 881 before linking
        const kkPlainId = '1FileDupPlainKkAbCdEfGhIjKlMn001';
        const pendaftarPlain = makePendaftar({
            id: 881,
            namaLengkap: 'Muhammad Rizki',
            tanggalLahir: '2012-03-14',
            customData: JSON.stringify({
                uploadKk: `https://drive.google.com/file/d/${kkPlainId}/view`,
            }),
        });
        await db.pendaftar.put(pendaftarPlain);

        const plainFetch = createGasFetchMock({
            [kkPlainId]: { name: 'kk-plain.jpg', mime: 'image/jpeg', bytes: JPEG_BYTES },
        });
        await savePendaftarAttachmentsToDevice([pendaftarPlain], {
            settings: plainSettings,
            currentUser: admin,
            simpanAsliTanpaKompresi: true,
            fetcherConfig: { fetchImpl: plainFetch, baseBackoffMs: 0 },
        });

        const linkedPlainCount = await linkPendaftarBerkasToSantri(pendaftarPlain.id, existingSantriId, admin);
        expect(linkedPlainCount).toBe(1);

        const plainRowsAfterLink = await getSantriBerkasBySantri(existingSantriId, pendaftarPlain.id, admin);
        expect(plainRowsAfterLink).toHaveLength(1);
        expect(plainRowsAfterLink[0].santriId).toBe(existingSantriId);
        expect(plainRowsAfterLink[0].pendaftarId).toBe(pendaftarPlain.id);
        const decryptedPlain = await decryptSantriBerkasBlob(plainRowsAfterLink[0], plainSettings, admin);
        expect(new Uint8Array(await decryptedPlain.arrayBuffer())).toEqual(JPEG_BYTES);

        // Scenario B: E2EE pre-pulled berkas + unpulled ref on duplicate pendaftar 882
        await db.santriBerkas.clear();
        const kkE2eeId = '1FileDupE2eeKkAbCdEfGhIjKlMn0002';
        const ijUnpulledId = '1FileDupE2eeIjAbCdEfGhIjKlMn0003';
        const pendaftarE2ee = makePendaftar({
            id: 882,
            namaLengkap: 'Muhammad Rizki',
            tanggalLahir: '2012-03-14',
            customData: JSON.stringify({
                uploadKk: `https://drive.google.com/file/d/${kkE2eeId}/view`,
                uploadIjazah: `https://drive.google.com/file/d/${ijUnpulledId}/view`,
            }),
        });
        await db.pendaftar.put(pendaftarE2ee);

        // Pull only uploadKk initially (before duplicate linking)
        const partialFetch = createGasFetchMock({
            [kkE2eeId]: { name: 'kk-e2ee.png', mime: 'image/png', bytes: PNG_BYTES },
        });
        await savePendaftarAttachmentsToDevice(
            [{ ...pendaftarE2ee, customData: JSON.stringify({ uploadKk: `https://drive.google.com/file/d/${kkE2eeId}/view` }) }],
            {
                settings: e2eeSettings,
                currentUser: admin,
                simpanAsliTanpaKompresi: true,
                fetcherConfig: { fetchImpl: partialFetch, baseBackoffMs: 0 },
            }
        );

        const linkedE2eeCount = await linkPendaftarBerkasToSantri(pendaftarE2ee.id, existingSantriId, admin);
        expect(linkedE2eeCount).toBe(1);

        // Simulate PsbRekap exact-duplicate acceptance pulling remaining unpulled attachments with updated santriId
        const fullFetch = createGasFetchMock({
            [kkE2eeId]: { name: 'kk-e2ee.png', mime: 'image/png', bytes: PNG_BYTES },
            [ijUnpulledId]: { name: 'ijazah-e2ee.pdf', mime: 'application/pdf', bytes: PDF_BYTES },
        });
        const linkedPull = await savePendaftarAttachmentsToDevice(
            [{ ...pendaftarE2ee, santriId: existingSantriId, status: 'Diterima' }],
            {
                settings: e2eeSettings,
                currentUser: admin,
                simpanAsliTanpaKompresi: true,
                onlyFailedOrCloud: true,
                fetcherConfig: { fetchImpl: fullFetch, baseBackoffMs: 0 },
            }
        );
        expect(linkedPull.saved).toBe(1);
        expect(linkedPull.skipped).toBe(1);

        const finalRows = await getSantriBerkasBySantri(existingSantriId, pendaftarE2ee.id, admin);
        expect(finalRows).toHaveLength(2);
        for (const row of finalRows) {
            expect(row.santriId).toBe(existingSantriId);
            expect(row.pendaftarId).toBe(pendaftarE2ee.id);
            expect(row.terenkripsi).toBe(true);
            const pt = await decryptSantriBerkasBlob(row, e2eeSettings, admin);
            const expected = row.fieldId === 'uploadKk' ? PNG_BYTES : PDF_BYTES;
            expect(new Uint8Array(await pt.arrayBuffer())).toEqual(expected);
        }
    });
});

