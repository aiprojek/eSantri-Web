import { describe, expect, it } from 'vitest';
import {
    calculateConstrainedDimensions,
    processFetchedBerkas,
    PSB_BERKAS_JPEG_QUALITY,
    PSB_BERKAS_MAX_IMAGE_SIDE,
} from '../services/psbBerkasProcessor';
import { computeSha256Hex } from '../services/psbBerkasFetcher';

const SAMPLE_PNG_BYTES = new Uint8Array([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
]);

const SAMPLE_JPEG_BYTES = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]);
const SAMPLE_PDF_BYTES = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]);

describe('psbBerkasProcessor Compression & Hash (Butir 3.3)', () => {
    it('constrains longest side to <= 1600 px while preserving aspect ratio', () => {
        const landscape = calculateConstrainedDimensions(3200, 1600, PSB_BERKAS_MAX_IMAGE_SIDE);
        expect(landscape).toEqual({ width: 1600, height: 800, resized: true });

        const portrait = calculateConstrainedDimensions(1200, 2400, PSB_BERKAS_MAX_IMAGE_SIDE);
        expect(portrait).toEqual({ width: 800, height: 1600, resized: true });

        const small = calculateConstrainedDimensions(1024, 768, PSB_BERKAS_MAX_IMAGE_SIDE);
        expect(small).toEqual({ width: 1024, height: 768, resized: false });
    });

    it('compresses images to JPEG 0.8 and computes final SHA-256 while retaining sumberSha256', async () => {
        const origBlob = new Blob([SAMPLE_PNG_BYTES], { type: 'image/png' });
        const origSha = await computeSha256Hex(origBlob);
        const compressedSha = await computeSha256Hex(SAMPLE_JPEG_BYTES);

        let capturedMaxSide = 0;
        let capturedQuality = 0;

        const out = await processFetchedBerkas(
            {
                blob: origBlob,
                mime: 'image/png',
                name: 'kk-scan.png',
                sha256: origSha,
            },
            {
                canvasCompressor: async (_blob, maxSide, quality) => {
                    capturedMaxSide = maxSide;
                    capturedQuality = quality;
                    return new Blob([SAMPLE_JPEG_BYTES], { type: 'image/jpeg' });
                },
            }
        );

        expect(capturedMaxSide).toBe(1600);
        expect(capturedQuality).toBe(PSB_BERKAS_JPEG_QUALITY);
        expect(out.compressed).toBe(true);
        expect(out.mime).toBe('image/jpeg');
        expect(out.name).toBe('kk-scan.jpg');
        expect(out.sha256).toBe(compressedSha);
        expect(out.sumberSha256).toBe(origSha);
    });

    it('stores original image uncompressed when simpanAsliTanpaKompresi=true and keeps PDF untouched', async () => {
        const origBlob = new Blob([SAMPLE_PNG_BYTES], { type: 'image/png' });
        const origSha = await computeSha256Hex(origBlob);

        const rawRes = await processFetchedBerkas(
            {
                blob: origBlob,
                mime: 'image/png',
                name: 'foto-asli.png',
                sha256: origSha,
            },
            { simpanAsliTanpaKompresi: true }
        );

        expect(rawRes.compressed).toBe(false);
        expect(rawRes.asliTanpaKompresi).toBe(true);
        expect(rawRes.mime).toBe('image/png');
        expect(rawRes.sha256).toBe(origSha);

        const pdfBlob = new Blob([SAMPLE_PDF_BYTES], { type: 'application/pdf' });
        const pdfSha = await computeSha256Hex(pdfBlob);
        const pdfRes = await processFetchedBerkas({
            blob: pdfBlob,
            mime: 'application/pdf',
            name: 'ijazah.pdf',
            sha256: pdfSha,
        });

        expect(pdfRes.compressed).toBe(false);
        expect(pdfRes.mime).toBe('application/pdf');
        expect(pdfRes.sha256).toBe(pdfSha);
    });

    it('rejects when fetched blob hash mismatches adapter-provided sha256', async () => {
        const origBlob = new Blob([SAMPLE_PNG_BYTES], { type: 'image/png' });
        await expect(
            processFetchedBerkas({
                blob: origBlob,
                mime: 'image/png',
                name: 'kk.png',
                sha256: 'f'.repeat(64),
            })
        ).rejects.toThrow(/SHA-256/i);
    });
});
