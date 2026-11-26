import { computeSha256Hex, FetchedBerkasResult, normalizeAllowedMime } from './psbBerkasFetcher';

export const PSB_BERKAS_MAX_IMAGE_SIDE = 1600;
export const PSB_BERKAS_JPEG_QUALITY = 0.8;

export type ImageBlobCompressor = (
    blob: Blob,
    maxSide: number,
    quality: number
) => Promise<Blob>;

export interface ProcessFetchedBerkasOptions {
    simpanAsliTanpaKompresi?: boolean;
    maxSide?: number;
    quality?: number;
    canvasCompressor?: ImageBlobCompressor;
}

export interface ProcessedBerkasResult {
    blob: Blob;
    mime: string;
    ukuran: number;
    sha256: string;
    sumberSha256?: string;
    compressed: boolean;
    asliTanpaKompresi: boolean;
    name: string;
}

export function calculateConstrainedDimensions(
    width: number,
    height: number,
    maxSide: number = PSB_BERKAS_MAX_IMAGE_SIDE
): { width: number; height: number; resized: boolean } {
    const safeW = Math.max(1, Math.round(width || 1));
    const safeH = Math.max(1, Math.round(height || 1));
    const longest = Math.max(safeW, safeH);
    if (longest <= maxSide) {
        return { width: safeW, height: safeH, resized: false };
    }
    const scale = maxSide / longest;
    return {
        width: Math.max(1, Math.round(safeW * scale)),
        height: Math.max(1, Math.round(safeH * scale)),
        resized: true,
    };
}

function replaceExtWithJpg(fileName: string): string {
    const clean = String(fileName || 'lampiran').trim() || 'lampiran';
    if (/\.[a-zA-Z0-9]+$/.test(clean)) {
        return clean.replace(/\.[a-zA-Z0-9]+$/, '.jpg');
    }
    return `${clean}.jpg`;
}

async function defaultBrowserCanvasCompressor(
    blob: Blob,
    maxSide: number,
    quality: number
): Promise<Blob> {
    if (typeof createImageBitmap === 'function') {
        const bitmap = await createImageBitmap(blob);
        try {
            const { width, height } = calculateConstrainedDimensions(bitmap.width, bitmap.height, maxSide);
            if (typeof document !== 'undefined') {
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    throw new Error('Gagal membuat konteks kanvas 2D untuk kompresi gambar.');
                }
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, width, height);
                ctx.drawImage(bitmap, 0, 0, width, height);
                const outBlob = await new Promise<Blob | null>((resolve) =>
                    canvas.toBlob((b) => resolve(b), 'image/jpeg', quality)
                );
                if (!outBlob) {
                    throw new Error('Gagal mengonversi gambar ke format JPEG.');
                }
                return outBlob;
            }
            if (typeof OffscreenCanvas !== 'undefined') {
                const offscreen = new OffscreenCanvas(width, height);
                const ctx = offscreen.getContext('2d');
                if (!ctx) {
                    throw new Error('Gagal membuat OffscreenCanvas 2D untuk kompresi gambar.');
                }
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, width, height);
                ctx.drawImage(bitmap, 0, 0, width, height);
                return await offscreen.convertToBlob({ type: 'image/jpeg', quality });
            }
        } finally {
            if (typeof bitmap.close === 'function') bitmap.close();
        }
    }

    if (typeof document === 'undefined' || typeof Image === 'undefined') {
        throw new Error('Lingkungan browser/canvas tidak tersedia untuk mengompresi gambar.');
    }

    const objectUrl = URL.createObjectURL(blob);
    try {
        const img = await new Promise<HTMLImageElement>((resolve, reject) => {
            const el = new Image();
            el.onload = () => resolve(el);
            el.onerror = () => reject(new Error('Gagal memuat berkas gambar ke kanvas.'));
            el.src = objectUrl;
        });
        const { width, height } = calculateConstrainedDimensions(
            img.naturalWidth || img.width,
            img.naturalHeight || img.height,
            maxSide
        );
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            throw new Error('Gagal membuat konteks kanvas 2D untuk kompresi gambar.');
        }
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        const outBlob = await new Promise<Blob | null>((resolve) =>
            canvas.toBlob((b) => resolve(b), 'image/jpeg', quality)
        );
        if (!outBlob) {
            throw new Error('Gagal mengekspor gambar terkompresi sebagai JPEG.');
        }
        return outBlob;
    } finally {
        URL.revokeObjectURL(objectUrl);
    }
}

export async function compressImageToJpegBlob(
    blob: Blob,
    options?: {
        maxSide?: number;
        quality?: number;
        canvasCompressor?: ImageBlobCompressor;
    }
): Promise<Blob> {
    const maxSide = options?.maxSide ?? PSB_BERKAS_MAX_IMAGE_SIDE;
    const quality = options?.quality ?? PSB_BERKAS_JPEG_QUALITY;
    const compressor = options?.canvasCompressor ?? defaultBrowserCanvasCompressor;
    const out = await compressor(blob, maxSide, quality);
    if (!out || out.size <= 0) {
        throw new Error('Hasil kompresi gambar kosong.');
    }
    return out.type === 'image/jpeg' ? out : new Blob([out], { type: 'image/jpeg' });
}

export async function processFetchedBerkas(
    fetched: FetchedBerkasResult,
    options: ProcessFetchedBerkasOptions = {}
): Promise<ProcessedBerkasResult> {
    const mime = normalizeAllowedMime(fetched.mime || fetched.blob.type, fetched.name);
    const actualFetchedSha256 = await computeSha256Hex(fetched.blob);

    if (fetched.sha256) {
        const expected = fetched.sha256.trim().toLowerCase();
        if (!/^[a-f0-9]{64}$/.test(expected) || expected !== actualFetchedSha256) {
            throw new Error(
                'Hash SHA-256 berkas unduhan tidak cocok dengan hash asal dari penyedia.'
            );
        }
    }

    const simpanAsli = Boolean(options.simpanAsliTanpaKompresi);
    const isCompressibleImage =
        mime === 'image/jpeg' || mime === 'image/png' || mime === 'image/webp';

    if (mime === 'application/pdf' || !isCompressibleImage || simpanAsli) {
        return {
            blob: fetched.blob,
            mime,
            ukuran: fetched.blob.size,
            sha256: actualFetchedSha256,
            sumberSha256: fetched.sha256 || actualFetchedSha256,
            compressed: false,
            asliTanpaKompresi: simpanAsli && isCompressibleImage,
            name: fetched.name,
        };
    }

    const compressedBlob = await compressImageToJpegBlob(fetched.blob, {
        maxSide: options.maxSide,
        quality: options.quality,
        canvasCompressor: options.canvasCompressor,
    });
    const finalSha256 = await computeSha256Hex(compressedBlob);

    return {
        blob: compressedBlob,
        mime: 'image/jpeg',
        ukuran: compressedBlob.size,
        sha256: finalSha256,
        sumberSha256: fetched.sha256 || actualFetchedSha256,
        compressed: true,
        asliTanpaKompresi: false,
        name: replaceExtWithJpg(fetched.name),
    };
}
