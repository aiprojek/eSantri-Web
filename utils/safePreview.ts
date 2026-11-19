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
