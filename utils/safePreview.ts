export const SAFE_IMG = /^data:image\/(png|jpe?g|webp|gif);base64,[A-Za-z0-9+/=]+$/;
export const SAFE_DOC = /^data:(application\/pdf|image\/(png|jpe?g|webp));base64,[A-Za-z0-9+/=]+$/;

export function isSafeHttpUrl(value: unknown): boolean {
    if (typeof value !== 'string') return false;
    const trimmed = value.trim();
    if (!trimmed) return false;
    try {
        const parsed = new URL(trimmed);
        return parsed.protocol === 'https:' || parsed.protocol === 'http:';
    } catch {
        return false;
    }
}

export function dataUrlToBlobUrl(dataUrl: string): string {
    const commaIdx = dataUrl.indexOf(',');
    if (commaIdx === -1) {
        throw new Error('Invalid data URL format');
    }
    const header = dataUrl.slice(0, commaIdx);
    const base64 = dataUrl.slice(commaIdx + 1);
    const mimeMatch = /^data:([^;]+);base64$/i.exec(header);
    const mime = mimeMatch?.[1] || 'application/octet-stream';

    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return URL.createObjectURL(new Blob([bytes], { type: mime }));
}

export const SAFE_BLOB_PREVIEW_MIMES = new Set<string>([
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
]);

export function isAllowedPreviewBlob(blob: Blob | null | undefined, fallbackMime?: string): boolean {
    if (!blob || blob.size <= 0) return false;
    const rawMime = (blob.type || fallbackMime || '').split(';')[0].trim().toLowerCase();
    const mime = rawMime === 'image/jpg' ? 'image/jpeg' : rawMime;
    return SAFE_BLOB_PREVIEW_MIMES.has(mime);
}

export function createSafeBlobPreviewUrl(blob: Blob, fallbackMime?: string): { url: string; mime: string } {
    const rawMime = (blob.type || fallbackMime || '').split(';')[0].trim().toLowerCase();
    const mime = rawMime === 'image/jpg' ? 'image/jpeg' : rawMime;
    if (!SAFE_BLOB_PREVIEW_MIMES.has(mime)) {
        throw new Error(`Tipe berkas tidak diizinkan untuk pratinjau (${mime || 'tidak diketahui'}).`);
    }
    const typedBlob = blob.type === mime ? blob : new Blob([blob], { type: mime });
    return {
        url: URL.createObjectURL(typedBlob),
        mime,
    };
}

export function openPreview(value: unknown, pattern: RegExp): boolean {
    if (typeof value !== 'string' || !pattern.test(value)) {
        return false;
    }
    try {
        const blobUrl = dataUrlToBlobUrl(value);
        window.open(blobUrl, '_blank', 'noopener,noreferrer');
        setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
        return true;
    } catch {
        return false;
    }
}

