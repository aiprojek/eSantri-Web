import { describe, expect, it, vi } from 'vitest';
import {
    computeSha256Hex,
    deleteCloudBerkas,
    detectBerkasProvider,
    fetchBerkas,
    PermanentBerkasFetchError,
    runWithConcurrency,
    UNSUPPORTED_PROVIDER_BERKAS_MESSAGE,
    UnsupportedProviderBerkasError,
} from '../services/psbBerkasFetcher';
import type { PsbConfig } from '../types';

const PNG_BYTES = new Uint8Array([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
]);

const PDF_BYTES = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]);

const basePsbConfig = (overrides: Partial<PsbConfig> = {}): PsbConfig => ({
    tahunAjaranAktif: '2026/2027',
    targetKuota: 100,
    nomorHpAdmin: '08123456789',
    pesanSukses: 'OK',
    activeGelombang: 1,
    biayaPendaftaran: 0,
    infoRekening: '-',
    activeFields: [],
    requiredDocuments: [],
    backendProvider: 'gas',
    googleScriptUrl: 'https://script.google.com/macros/s/AKfycbTest123/exec',
    cloudAdminKey: 'super-secret-admin-key-32-chars-minimum',
    ...overrides,
});

describe('psbBerkasFetcher (Butir 3.2)', () => {
    it('fetches GAS getFile via POST ADMIN_KEY, decodes base64, and verifies SHA-256', async () => {
        const expectedSha = await computeSha256Hex(PNG_BYTES);
        const b64 = Buffer.from(PNG_BYTES).toString('base64');

        const mockFetch = vi.fn(async (_url: string, init?: RequestInit) => {
            expect(init?.method).toBe('POST');
            const parsed = JSON.parse(String(init?.body || '{}'));
            expect(parsed.action).toBe('getFile');
            expect(parsed.adminKey).toBe('super-secret-admin-key-32-chars-minimum');
            expect(parsed.fileId).toBe('1AbCdEfGhIjKlMnOpQrStUvWxYz012345');
            return new Response(
                JSON.stringify({
                    result: 'success',
                    name: 'kk-santri.png',
                    mime: 'image/png',
                    size: PNG_BYTES.byteLength,
                    sha256: expectedSha,
                    data: b64,
                }),
                { status: 200, headers: { 'Content-Type': 'application/json' } }
            );
        }) as unknown as typeof fetch;

        const res = await fetchBerkas(
            'https://drive.google.com/file/d/1AbCdEfGhIjKlMnOpQrStUvWxYz012345/view',
            { psbConfig: basePsbConfig(), fetchImpl: mockFetch, baseBackoffMs: 0 }
        );

        expect(res.mime).toBe('image/png');
        expect(res.name).toBe('kk-santri.png');
        expect(res.sha256).toBe(expectedSha);
        expect(res.blob.size).toBe(PNG_BYTES.byteLength);
    });

    it('rejects mismatched SHA-256 from GAS without retrying permanent corruption errors', async () => {
        const b64 = Buffer.from(PNG_BYTES).toString('base64');
        const mockFetch = vi.fn(async () =>
            new Response(
                JSON.stringify({
                    result: 'success',
                    name: 'kk.png',
                    mime: 'image/png',
                    sha256: '0'.repeat(64),
                    data: b64,
                }),
                { status: 200 }
            )
        ) as unknown as typeof fetch;

        await expect(
            fetchBerkas('1AbCdEfGhIjKlMnOpQrStUvWxYz012345', {
                psbConfig: basePsbConfig(),
                fetchImpl: mockFetch,
                baseBackoffMs: 0,
            })
        ).rejects.toThrow(/SHA-256/i);
        expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('rejects disallowed MIME types, magic-byte mismatches (HTML spoofed as PDF), and files > 5 MB', async () => {
        const htmlBytes = Buffer.from('<html><body>Login</body></html>', 'utf8');
        const b64Html = htmlBytes.toString('base64');
        const mockHtmlFetch = vi.fn(async () =>
            new Response(
                JSON.stringify({
                    result: 'success',
                    name: 'doc.pdf',
                    mime: 'application/pdf',
                    data: b64Html,
                }),
                { status: 200 }
            )
        ) as unknown as typeof fetch;

        await expect(
            fetchBerkas('1AbCdEfGhIjKlMnOpQrStUvWxYz012345', {
                psbConfig: basePsbConfig(),
                fetchImpl: mockHtmlFetch,
                baseBackoffMs: 0,
            })
        ).rejects.toBeInstanceOf(PermanentBerkasFetchError);

        const bigBuf = Buffer.alloc(5 * 1024 * 1024 + 10, 0x25);
        bigBuf[0] = 0x25; bigBuf[1] = 0x50; bigBuf[2] = 0x44; bigBuf[3] = 0x46;
        const mockBigFetch = vi.fn(async () =>
            new Response(
                JSON.stringify({
                    result: 'success',
                    name: 'huge.pdf',
                    mime: 'application/pdf',
                    data: bigBuf.toString('base64'),
                }),
                { status: 200 }
            )
        ) as unknown as typeof fetch;

        await expect(
            fetchBerkas('1AbCdEfGhIjKlMnOpQrStUvWxYz012345', {
                psbConfig: basePsbConfig(),
                fetchImpl: mockBigFetch,
                baseBackoffMs: 0,
            })
        ).rejects.toThrow(/5 MB/i);
    });

    it('supports Firebase Storage adapter and retries transient failures up to 3 times', async () => {
        let calls = 0;
        const res = await fetchBerkas(
            'https://firebasestorage.googleapis.com/v0/b/test/o/tenants%2Ft1%2Fpsb%2Fijazah.pdf?alt=media',
            {
                psbConfig: basePsbConfig(),
                sumberOverride: 'firebase',
                baseBackoffMs: 0,
                firebaseAdapter: {
                    getBlobFromRef: async () => {
                        calls++;
                        if (calls < 3) throw new Error('Network temporary error');
                        return { bytes: PDF_BYTES, mime: 'application/pdf', name: 'ijazah.pdf' };
                    },
                },
            }
        );

        expect(calls).toBe(3);
        expect(res.mime).toBe('application/pdf');
        expect(res.sumber).toBe('firebase');
    });

    it('throws UnsupportedProviderBerkasError for cloudflare_d1, cloudflare_r2, and supabase without fetching public URL', async () => {
        const mockFetch = vi.fn() as unknown as typeof fetch;

        for (const provider of ['cloudflare_d1', 'cloudflare_r2', 'supabase'] as const) {
            await expect(
                fetchBerkas('https://worker.example.com/?action=file&key=berkas/kk.pdf', {
                    psbConfig: basePsbConfig({ backendProvider: provider }),
                    sumberOverride: provider,
                    fetchImpl: mockFetch,
                })
            ).rejects.toSatisfy(
                (err: unknown) =>
                    err instanceof UnsupportedProviderBerkasError &&
                    err.message === UNSUPPORTED_PROVIDER_BERKAS_MESSAGE
            );
        }

        expect(mockFetch).not.toHaveBeenCalled();
        expect(
            detectBerkasProvider('https://xyz.supabase.co/storage/v1/object/public/psb-berkas/kk.pdf')
        ).toBe('supabase');
    });

    it('limits parallel downloads via runWithConcurrency', async () => {
        let active = 0;
        let maxSeen = 0;
        const items = [1, 2, 3, 4, 5, 6, 7];

        const out = await runWithConcurrency(
            items,
            async (n) => {
                active++;
                maxSeen = Math.max(maxSeen, active);
                await new Promise((r) => setTimeout(r, 15));
                active--;
                return n * 2;
            },
            3
        );

        expect(maxSeen).toBeLessThanOrEqual(3);
        expect(out).toEqual([2, 4, 6, 8, 10, 12, 14]);
    });

    it('deletes GAS cloud file via POST action=deleteFile with ADMIN_KEY and handles Drive errors', async () => {
        const mockFetch = vi.fn(async (_url: string, init?: RequestInit) => {
            expect(init?.method).toBe('POST');
            const parsed = JSON.parse(String(init?.body || '{}'));
            expect(parsed.action).toBe('deleteFile');
            expect(parsed.adminKey).toBe('super-secret-admin-key-32-chars-minimum');
            expect(parsed.fileId).toBe('1AbCdEfGhIjKlMnOpQrStUvWxYz012345');
            return new Response(
                JSON.stringify({
                    result: 'success',
                    success: true,
                    trashed: true,
                    fileId: parsed.fileId,
                }),
                { status: 200 }
            );
        }) as unknown as typeof fetch;

        const res = await deleteCloudBerkas(
            'https://drive.google.com/file/d/1AbCdEfGhIjKlMnOpQrStUvWxYz012345/view',
            { psbConfig: basePsbConfig(), fetchImpl: mockFetch, baseBackoffMs: 0 }
        );
        expect(res).toEqual({
            deleted: true,
            provider: 'gas',
            trashed: true,
            fileId: '1AbCdEfGhIjKlMnOpQrStUvWxYz012345',
        });

        const deniedFetch = vi.fn(async () =>
            new Response(
                JSON.stringify({
                    result: 'error',
                    message: 'Akses ditolak: berkas berada di luar folder tujuan PSB.',
                }),
                { status: 200 }
            )
        ) as unknown as typeof fetch;

        await expect(
            deleteCloudBerkas('1AbCdEfGhIjKlMnOpQrStUvWxYz012345', {
                psbConfig: basePsbConfig(),
                fetchImpl: deniedFetch,
                baseBackoffMs: 0,
            })
        ).rejects.toBeInstanceOf(PermanentBerkasFetchError);
        expect(deniedFetch).toHaveBeenCalledTimes(1);
    });

    it('deletes Firebase Storage file with retry and rejects unsupported providers in deleteCloudBerkas', async () => {
        let attempts = 0;
        const deletedRefs: string[] = [];
        const res = await deleteCloudBerkas(
            'https://firebasestorage.googleapis.com/v0/b/test/o/tenants%2Ft1%2Fpsb%2Fkk.pdf?alt=media',
            {
                psbConfig: basePsbConfig(),
                sumberOverride: 'firebase',
                baseBackoffMs: 0,
                firebaseDeleteAdapter: {
                    deleteFromRef: async (refStr) => {
                        attempts++;
                        if (attempts < 2) throw new Error('Transient network hiccup');
                        deletedRefs.push(refStr);
                    },
                },
            }
        );

        expect(attempts).toBe(2);
        expect(res).toEqual({ deleted: true, provider: 'firebase' });
        expect(deletedRefs).toHaveLength(1);

        for (const provider of ['cloudflare_d1', 'cloudflare_r2', 'supabase'] as const) {
            await expect(
                deleteCloudBerkas('https://worker.example.com/?action=file&key=berkas/kk.pdf', {
                    psbConfig: basePsbConfig({ backendProvider: provider }),
                    sumberOverride: provider,
                })
            ).rejects.toBeInstanceOf(UnsupportedProviderBerkasError);
        }
    });
});
