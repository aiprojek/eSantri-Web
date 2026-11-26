import { PortalConfig, PsbConfig, SantriBerkasSumber } from '../types';
import { deleteObject, getBlob, getDownloadURL, getFirebaseStorage, ref as storageRef } from '../firebaseStorage';
import { isSafeHttpUrl } from '../utils/safePreview';

export const PSB_BERKAS_MAX_BYTES = 5 * 1024 * 1024; // 5 MB
export const PSB_BERKAS_DEFAULT_CONCURRENCY = 3;
export const PSB_BERKAS_MAX_ATTEMPTS = 3;

export const PSB_BERKAS_ALLOWED_MIMES = new Set<string>([
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
]);

export const MIME_EXTENSION_MAP: Record<string, string> = {
    'application/pdf': '.pdf',
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
};

export const UNSUPPORTED_PROVIDER_BERKAS_MESSAGE = 'belum didukung: menunggu pembaruan skrip backend';

export class UnsupportedProviderBerkasError extends Error {
    code = 'BERKAS_PROVIDER_UNSUPPORTED' as const;
    provider: SantriBerkasSumber;

    constructor(provider: SantriBerkasSumber, message: string = UNSUPPORTED_PROVIDER_BERKAS_MESSAGE) {
        super(message);
        this.name = 'UnsupportedProviderBerkasError';
        this.provider = provider;
    }
}

export class PermanentBerkasFetchError extends Error {
    code: string;

    constructor(message: string, code: string = 'BERKAS_PERMANENT_ERROR') {
        super(message);
        this.name = 'PermanentBerkasFetchError';
        this.code = code;
    }
}

export interface PsbBerkasFetcherConfig {
    psbConfig?: PsbConfig;
    portalConfig?: PortalConfig;
    sumberOverride?: SantriBerkasSumber;
    maxAttempts?: number;
    baseBackoffMs?: number;
    fetchImpl?: typeof fetch;
    firebaseAdapter?: {
        getBlobFromRef: (fileRef: string) => Promise<{ bytes: Uint8Array; mime?: string; name?: string }>;
    };
    firebaseDeleteAdapter?: {
        deleteFromRef: (fileRef: string) => Promise<void>;
    };
}

export interface DeleteCloudBerkasResult {
    deleted: boolean;
    provider: SantriBerkasSumber;
    trashed?: boolean;
    fileId?: string;
}

export interface FetchedBerkasResult {
    blob: Blob;
    mime: string;
    name: string;
    sha256?: string;
    sumber?: SantriBerkasSumber;
}

export function normalizeAllowedMime(rawMime?: string | null, fileName?: string): string {
    const cleaned = String(rawMime || '')
        .split(';')[0]
        .trim()
        .toLowerCase();
    if (cleaned === 'image/jpg') return 'image/jpeg';
    if (PSB_BERKAS_ALLOWED_MIMES.has(cleaned)) return cleaned;

    if (!cleaned || cleaned === 'application/octet-stream' || cleaned === 'binary/octet-stream') {
        const ext = String(fileName || '').split('.').pop()?.toLowerCase() || '';
        if (ext === 'pdf') return 'application/pdf';
        if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
        if (ext === 'png') return 'image/png';
        if (ext === 'webp') return 'image/webp';
    }
    return cleaned;
}

export function getExtensionFromMime(mime?: string | null): string {
    const normalized = normalizeAllowedMime(mime);
    return MIME_EXTENSION_MAP[normalized] || '.bin';
}

export function matchesAllowedMagicBytes(bytes: Uint8Array, mime: string): boolean {
    if (bytes.length < 4) return false;

    if (mime === 'application/pdf') {
        // %PDF
        return bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46;
    }
    if (mime === 'image/jpeg') {
        // FF D8 FF
        return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    }
    if (mime === 'image/png') {
        // 89 50 4E 47 0D 0A 1A 0A
        return (
            bytes.length >= 8 &&
            bytes[0] === 0x89 &&
            bytes[1] === 0x50 &&
            bytes[2] === 0x4e &&
            bytes[3] === 0x47 &&
            bytes[4] === 0x0d &&
            bytes[5] === 0x0a &&
            bytes[6] === 0x1a &&
            bytes[7] === 0x0a
        );
    }
    if (mime === 'image/webp') {
        // RIFF....WEBP
        return (
            bytes.length >= 12 &&
            bytes[0] === 0x52 &&
            bytes[1] === 0x49 &&
            bytes[2] === 0x46 &&
            bytes[3] === 0x46 &&
            bytes[8] === 0x57 &&
            bytes[9] === 0x45 &&
            bytes[10] === 0x42 &&
            bytes[11] === 0x50
        );
    }
    return false;
}

export function validateFetchedBerkasBytes(
    bytes: Uint8Array,
    rawMime?: string | null,
    fileName?: string
): { mime: string; size: number } {
    if (!(bytes instanceof Uint8Array) || bytes.byteLength <= 0) {
        throw new PermanentBerkasFetchError('Berkas yang diunduh kosong (0 byte).', 'EMPTY_FILE');
    }
    if (bytes.byteLength > PSB_BERKAS_MAX_BYTES) {
        throw new PermanentBerkasFetchError(
            `Ukuran berkas melebihi batas maksimal 5 MB (${(bytes.byteLength / (1024 * 1024)).toFixed(2)} MB).`,
            'FILE_TOO_LARGE'
        );
    }

    const mime = normalizeAllowedMime(rawMime, fileName);
    if (!PSB_BERKAS_ALLOWED_MIMES.has(mime)) {
        throw new PermanentBerkasFetchError(
            `Tipe berkas tidak diizinkan (${mime || 'tidak diketahui'}). Hanya PDF, JPEG, PNG, dan WebP yang diperbolehkan.`,
            'MIME_NOT_ALLOWED'
        );
    }

    if (!matchesAllowedMagicBytes(bytes, mime)) {
        throw new PermanentBerkasFetchError(
            `Konten berkas tidak sesuai dengan tipe ${mime} (kemungkinan tautan HTML login/error atau file rusak).`,
            'MAGIC_BYTES_MISMATCH'
        );
    }

    return { mime, size: bytes.byteLength };
}

export async function computeSha256Hex(input: Uint8Array | Blob | ArrayBuffer): Promise<string> {
    if (!globalThis.crypto?.subtle) {
        throw new Error('Web Crypto API tidak tersedia untuk menghitung hash SHA-256.');
    }
    let buffer: ArrayBuffer;
    if (input instanceof Blob) {
        buffer = await input.arrayBuffer();
    } else if (input instanceof ArrayBuffer) {
        buffer = input;
    } else {
        const copy = new Uint8Array(input.byteLength);
        copy.set(input);
        buffer = copy.buffer;
    }
    const digest = await globalThis.crypto.subtle.digest('SHA-256', buffer);
    return Array.from(new Uint8Array(digest))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
}

export function base64ToUint8Array(base64Str: string): Uint8Array {
    const clean = String(base64Str || '')
        .replace(/^data:[^;]+;base64,/i, '')
        .replace(/\s+/g, '');
    if (!clean) {
        throw new PermanentBerkasFetchError('Data base64 berkas kosong.', 'EMPTY_BASE64');
    }
    let bin: string;
    if (typeof atob === 'function') {
        bin = atob(clean);
    } else {
        bin = Buffer.from(clean, 'base64').toString('binary');
    }
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) {
        bytes[i] = bin.charCodeAt(i);
    }
    return bytes;
}

export function extractDriveFileId(refOrUrl: string): string | null {
    const trimmed = String(refOrUrl || '').trim();
    if (!trimmed) return null;
    if (/^[a-zA-Z0-9_-]{20,80}$/.test(trimmed)) {
        return trimmed;
    }
    try {
        const u = new URL(trimmed);
        if (u.hostname.includes('drive.google.com') || u.hostname.includes('docs.google.com')) {
            const idParam = u.searchParams.get('id');
            if (idParam && /^[a-zA-Z0-9_-]{15,80}$/.test(idParam)) return idParam;
            const pathMatch = u.pathname.match(/\/d\/([a-zA-Z0-9_-]{15,80})/);
            if (pathMatch?.[1]) return pathMatch[1];
        }
    } catch {
        // bukan URL penuh
    }
    return null;
}

export function detectBerkasProvider(
    fileRef: string,
    config?: PsbBerkasFetcherConfig
): SantriBerkasSumber {
    if (config?.sumberOverride) {
        return config.sumberOverride;
    }

    const trimmed = String(fileRef || '').trim();
    const lower = trimmed.toLowerCase();

    if (lower.startsWith('data:')) {
        return 'lokal';
    }
    if (
        lower.includes('drive.google.com') ||
        lower.includes('docs.google.com') ||
        /^[a-zA-Z0-9_-]{20,80}$/.test(trimmed)
    ) {
        return 'gas';
    }
    if (
        lower.includes('firebasestorage.googleapis.com') ||
        lower.startsWith('gs://') ||
        lower.startsWith('tenants/') ||
        lower.startsWith('psb/')
    ) {
        return 'firebase';
    }
    if (lower.includes('/storage/v1/object/')) {
        return 'supabase';
    }
    if (lower.includes('action=file') && lower.includes('key=')) {
        const configuredProvider = config?.psbConfig?.backendProvider;
        return configuredProvider === 'cloudflare_r2' ? 'cloudflare_r2' : 'cloudflare_d1';
    }

    const backendProvider = config?.psbConfig?.backendProvider;
    if (backendProvider) {
        return backendProvider;
    }
    if (config?.psbConfig?.submissionMethod === 'portal' && config?.portalConfig?.provider === 'firebase') {
        return 'firebase';
    }
    if (config?.portalConfig?.gasEndpoint || config?.psbConfig?.googleScriptUrl) {
        return 'gas';
    }
    return 'gas';
}

export function isBerkasProviderSupported(provider: SantriBerkasSumber): boolean {
    return provider === 'gas' || provider === 'firebase' || provider === 'lokal';
}

export function resolveGasCredentials(config?: PsbBerkasFetcherConfig): { endpointUrl: string; adminKey: string } {
    const psb = config?.psbConfig;
    const portal = config?.portalConfig;
    let endpointUrl = (psb?.googleScriptUrl || portal?.gasEndpoint || '').trim();
    let adminKey = (psb?.cloudAdminKey || portal?.gasAdminKey || '').trim();

    if ((!endpointUrl || !adminKey) && Array.isArray(psb?.templates)) {
        for (const tpl of psb.templates) {
            if (!tpl) continue;
            if (!endpointUrl && tpl.googleScriptUrl) endpointUrl = tpl.googleScriptUrl.trim();
            if (!adminKey && tpl.cloudAdminKey) adminKey = tpl.cloudAdminKey.trim();
            if (endpointUrl && adminKey) break;
        }
    }

    return { endpointUrl, adminKey };
}

function makeBlobFromBytes(bytes: Uint8Array, mime: string): Blob {
    const copy = new Uint8Array(bytes.byteLength);
    copy.set(bytes);
    return new Blob([copy], { type: mime });
}

function inferNameFromRef(fileRef: string, mime: string, providedName?: string): string {
    const cleanProvided = String(providedName || '').trim();
    if (cleanProvided) return cleanProvided;

    try {
        const u = new URL(fileRef);
        const seg = decodeURIComponent(u.pathname.split('/').filter(Boolean).pop() || '');
        if (seg && seg.length <= 120) return seg;
    } catch {
        // bukan URL HTTP
    }
    const cleanPathPart = String(fileRef || '').split('?')[0].split('/').filter(Boolean).pop() || 'lampiran';
    if (cleanPathPart.includes('.')) return cleanPathPart.slice(0, 120);
    return `lampiran${getExtensionFromMime(mime)}`;
}

async function fetchViaGas(
    fileRef: string,
    config: PsbBerkasFetcherConfig,
    fetchImpl: typeof fetch
): Promise<FetchedBerkasResult> {
    const { endpointUrl, adminKey } = resolveGasCredentials(config);
    if (!endpointUrl || !isSafeHttpUrl(endpointUrl)) {
        throw new PermanentBerkasFetchError(
            'URL Web App Google Apps Script belum dikonfigurasi atau tidak valid.',
            'GAS_URL_MISSING'
        );
    }
    if (!adminKey) {
        throw new PermanentBerkasFetchError(
            'Kunci Admin GAS (ADMIN_KEY) belum diisi di Pengaturan Koneksi Cloud PSB.',
            'GAS_ADMIN_KEY_MISSING'
        );
    }

    const driveId = extractDriveFileId(fileRef);
    const response = await fetchImpl(endpointUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
            action: 'getFile',
            adminKey,
            fileId: driveId || fileRef,
            fileUrl: fileRef,
        }),
    });

    if (!response.ok) {
        if (response.status >= 400 && response.status < 500 && response.status !== 429) {
            throw new PermanentBerkasFetchError(`Server GAS menolak permintaan (HTTP ${response.status}).`, 'GAS_HTTP_4XX');
        }
        throw new Error(`Gagal menghubungi Google Apps Script (HTTP ${response.status}).`);
    }

    const json: any = await response.json();
    if (!json || json.result === 'error' || json.success === false) {
        const msg = String(json?.error || json?.message || 'Gagal mengambil berkas dari Google Drive.');
        const lowerMsg = msg.toLowerCase();
        if (
            lowerMsg.includes('admin_key') ||
            lowerMsg.includes('akses ditolak') ||
            lowerMsg.includes('tidak ditemukan') ||
            lowerMsg.includes('tidak diizinkan') ||
            lowerMsg.includes('melebihi batas') ||
            lowerMsg.includes('format id')
        ) {
            throw new PermanentBerkasFetchError(msg, 'GAS_REJECTED');
        }
        throw new Error(msg);
    }

    if (typeof json.data !== 'string' || !json.data) {
        throw new PermanentBerkasFetchError('Respons getFile GAS tidak menyertakan payload base64.', 'GAS_EMPTY_PAYLOAD');
    }

    const bytes = base64ToUint8Array(json.data);
    const { mime } = validateFetchedBerkasBytes(bytes, json.mime, json.name);
    const computedSha256 = await computeSha256Hex(bytes);

    const serverSha = typeof json.sha256 === 'string' ? json.sha256.trim().toLowerCase() : '';
    if (serverSha) {
        if (!/^[a-f0-9]{64}$/.test(serverSha) || serverSha !== computedSha256) {
            throw new PermanentBerkasFetchError(
                'Checksum SHA-256 berkas dari Google Drive tidak cocok dengan data yang diterima.',
                'SHA256_MISMATCH'
            );
        }
    }

    return {
        blob: makeBlobFromBytes(bytes, mime),
        mime,
        name: inferNameFromRef(fileRef, mime, json.name),
        sha256: computedSha256,
        sumber: 'gas',
    };
}

async function fetchViaFirebase(
    fileRef: string,
    config: PsbBerkasFetcherConfig,
    fetchImpl: typeof fetch
): Promise<FetchedBerkasResult> {
    let bytes: Uint8Array;
    let rawMime: string | undefined;
    let rawName: string | undefined;

    if (config.firebaseAdapter) {
        const res = await config.firebaseAdapter.getBlobFromRef(fileRef);
        bytes = res.bytes;
        rawMime = res.mime;
        rawName = res.name;
    } else {
        const fbStorage = getFirebaseStorage();
        let fetchedViaSdkBlob = false;
        let sdkBytes: Uint8Array | null = null;

        if (fbStorage) {
            const targetRef = storageRef(fbStorage, fileRef);
            try {
                const blob = await getBlob(targetRef, PSB_BERKAS_MAX_BYTES);
                sdkBytes = new Uint8Array(await blob.arrayBuffer());
                rawMime = blob.type;
                rawName = targetRef.name;
                fetchedViaSdkBlob = true;
            } catch (blobErr: any) {
                const code = String(blobErr?.code || '');
                if (code === 'storage/unauthorized' || code === 'storage/unauthenticated') {
                    throw new PermanentBerkasFetchError(
                        'Akses Firebase Storage ditolak: pastikan Anda login dengan akun admin tenant yang sah.',
                        'FIREBASE_UNAUTHORIZED'
                    );
                }
                if (code === 'storage/object-not-found') {
                    throw new PermanentBerkasFetchError(
                        'Berkas tidak ditemukan di Firebase Storage.',
                        'FIREBASE_NOT_FOUND'
                    );
                }
                // Fallback ke getDownloadURL + fetch bila getBlob gagal karena CORS/lingkungan
                try {
                    const dlUrl = isSafeHttpUrl(fileRef) ? fileRef : await getDownloadURL(targetRef);
                    const httpRes = await fetchImpl(dlUrl, { method: 'GET' });
                    if (!httpRes.ok) {
                        if (httpRes.status === 403 || httpRes.status === 404) {
                            throw new PermanentBerkasFetchError(
                                `Gagal mengunduh dari Firebase Storage (HTTP ${httpRes.status}).`,
                                'FIREBASE_HTTP_4XX'
                            );
                        }
                        throw new Error(`HTTP ${httpRes.status} saat mengunduh dari Firebase Storage.`);
                    }
                    sdkBytes = new Uint8Array(await httpRes.arrayBuffer());
                    rawMime = httpRes.headers.get('content-type') || undefined;
                    rawName = targetRef.name;
                    fetchedViaSdkBlob = true;
                } catch (dlErr) {
                    if (dlErr instanceof PermanentBerkasFetchError) throw dlErr;
                    throw dlErr;
                }
            }
        }

        if (!fetchedViaSdkBlob || !sdkBytes) {
            if (!isSafeHttpUrl(fileRef)) {
                throw new PermanentBerkasFetchError(
                    'Firebase Storage SDK belum siap atau referensi berkas tidak valid.',
                    'FIREBASE_NOT_READY'
                );
            }
            const httpRes = await fetchImpl(fileRef, { method: 'GET' });
            if (!httpRes.ok) {
                if (httpRes.status >= 400 && httpRes.status < 500 && httpRes.status !== 429) {
                    throw new PermanentBerkasFetchError(
                        `Gagal mengunduh berkas Firebase (HTTP ${httpRes.status}).`,
                        'FIREBASE_HTTP_4XX'
                    );
                }
                throw new Error(`Gagal mengunduh berkas Firebase (HTTP ${httpRes.status}).`);
            }
            sdkBytes = new Uint8Array(await httpRes.arrayBuffer());
            rawMime = httpRes.headers.get('content-type') || undefined;
        }
        bytes = sdkBytes;
    }

    const { mime } = validateFetchedBerkasBytes(bytes, rawMime, rawName);
    const sha256 = await computeSha256Hex(bytes);

    return {
        blob: makeBlobFromBytes(bytes, mime),
        mime,
        name: inferNameFromRef(fileRef, mime, rawName),
        sha256,
        sumber: 'firebase',
    };
}

async function fetchViaLocalDataUrl(dataUrl: string): Promise<FetchedBerkasResult> {
    const match = String(dataUrl || '').match(/^data:([^;]+);base64,([a-zA-Z0-9+/=\s]+)$/i);
    if (!match) {
        throw new PermanentBerkasFetchError('Format data URL lampiran tidak valid.', 'INVALID_DATA_URL');
    }
    const rawMime = match[1];
    const bytes = base64ToUint8Array(match[2]);
    const { mime } = validateFetchedBerkasBytes(bytes, rawMime);
    const sha256 = await computeSha256Hex(bytes);
    return {
        blob: makeBlobFromBytes(bytes, mime),
        mime,
        name: `lampiran${getExtensionFromMime(mime)}`,
        sha256,
        sumber: 'lokal',
    };
}

export async function fetchBerkas(
    fileRef: string,
    config: PsbBerkasFetcherConfig = {}
): Promise<FetchedBerkasResult> {
    const trimmedRef = String(fileRef || '').trim();
    if (!trimmedRef) {
        throw new PermanentBerkasFetchError('Referensi berkas kosong.', 'EMPTY_REF');
    }

    const provider = detectBerkasProvider(trimmedRef, config);

    // Provider yang belum memakai ADMIN_KEY / sesi admin harus gagal eksplisit tanpa memalsukan URL publik
    if (provider === 'cloudflare_d1' || provider === 'cloudflare_r2' || provider === 'supabase') {
        throw new UnsupportedProviderBerkasError(provider, UNSUPPORTED_PROVIDER_BERKAS_MESSAGE);
    }

    if (provider === 'lokal') {
        return fetchViaLocalDataUrl(trimmedRef);
    }

    const fetchImpl = config.fetchImpl || globalThis.fetch.bind(globalThis);
    const maxAttempts = Math.max(1, Math.min(5, config.maxAttempts ?? PSB_BERKAS_MAX_ATTEMPTS));
    const baseBackoffMs = Math.max(0, config.baseBackoffMs ?? 500);

    let lastError: unknown;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            if (provider === 'gas') {
                return await fetchViaGas(trimmedRef, config, fetchImpl);
            }
            if (provider === 'firebase') {
                return await fetchViaFirebase(trimmedRef, config, fetchImpl);
            }
            throw new UnsupportedProviderBerkasError(provider, UNSUPPORTED_PROVIDER_BERKAS_MESSAGE);
        } catch (err) {
            lastError = err;
            if (err instanceof UnsupportedProviderBerkasError || err instanceof PermanentBerkasFetchError) {
                throw err;
            }
            if (attempt < maxAttempts && baseBackoffMs > 0) {
                const waitMs = baseBackoffMs * Math.pow(2, attempt - 1);
                await new Promise((resolve) => setTimeout(resolve, waitMs));
            }
        }
    }

    throw lastError instanceof Error
        ? lastError
        : new Error('Gagal mengunduh berkas setelah beberapa kali percobaan.');
}

async function deleteViaGas(
    fileRef: string,
    config: PsbBerkasFetcherConfig,
    fetchImpl: typeof fetch
): Promise<DeleteCloudBerkasResult> {
    const { endpointUrl, adminKey } = resolveGasCredentials(config);
    if (!endpointUrl || !isSafeHttpUrl(endpointUrl)) {
        throw new PermanentBerkasFetchError(
            'URL Web App Google Apps Script belum dikonfigurasi atau tidak valid.',
            'GAS_URL_MISSING'
        );
    }
    if (!adminKey) {
        throw new PermanentBerkasFetchError(
            'Kunci Admin GAS (ADMIN_KEY) belum diisi di Pengaturan Koneksi Cloud PSB.',
            'GAS_ADMIN_KEY_MISSING'
        );
    }

    const driveId = extractDriveFileId(fileRef);
    const response = await fetchImpl(endpointUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
            action: 'deleteFile',
            adminKey,
            fileId: driveId || fileRef,
            fileUrl: fileRef,
        }),
    });

    if (!response.ok) {
        if (response.status >= 400 && response.status < 500 && response.status !== 429) {
            throw new PermanentBerkasFetchError(`Server GAS menolak penghapusan (HTTP ${response.status}).`, 'GAS_HTTP_4XX');
        }
        throw new Error(`Gagal menghubungi Google Apps Script saat menghapus berkas (HTTP ${response.status}).`);
    }

    const json: any = await response.json();
    if (!json || json.result === 'error' || json.success === false) {
        const msg = String(json?.error || json?.message || 'Gagal menghapus berkas di Google Drive.');
        const lowerMsg = msg.toLowerCase();
        if (
            lowerMsg.includes('admin_key') ||
            lowerMsg.includes('akses ditolak') ||
            lowerMsg.includes('tidak ditemukan') ||
            lowerMsg.includes('tidak diizinkan') ||
            lowerMsg.includes('luar folder') ||
            lowerMsg.includes('format id')
        ) {
            throw new PermanentBerkasFetchError(msg, 'GAS_DELETE_REJECTED');
        }
        throw new Error(msg);
    }

    return {
        deleted: true,
        provider: 'gas',
        trashed: Boolean(json.trashed ?? true),
        fileId: String(json.fileId || driveId || ''),
    };
}

async function deleteViaFirebase(
    fileRef: string,
    config: PsbBerkasFetcherConfig
): Promise<DeleteCloudBerkasResult> {
    if (config.firebaseDeleteAdapter) {
        await config.firebaseDeleteAdapter.deleteFromRef(fileRef);
        return { deleted: true, provider: 'firebase' };
    }

    const fbStorage = getFirebaseStorage();
    if (!fbStorage) {
        throw new PermanentBerkasFetchError(
            'Firebase Storage SDK belum siap untuk menghapus berkas.',
            'FIREBASE_NOT_READY'
        );
    }

    try {
        const targetRef = storageRef(fbStorage, fileRef);
        await deleteObject(targetRef);
        return { deleted: true, provider: 'firebase' };
    } catch (err: any) {
        const code = String(err?.code || '');
        if (code === 'storage/unauthorized' || code === 'storage/unauthenticated') {
            throw new PermanentBerkasFetchError(
                'Akses Firebase Storage ditolak: pastikan Anda login dengan akun admin tenant yang sah.',
                'FIREBASE_UNAUTHORIZED'
            );
        }
        if (code === 'storage/object-not-found') {
            throw new PermanentBerkasFetchError(
                'Berkas sudah tidak ditemukan atau sudah terhapus di Firebase Storage.',
                'FIREBASE_NOT_FOUND'
            );
        }
        if (code === 'storage/invalid-url' || code === 'storage/invalid-argument') {
            throw new PermanentBerkasFetchError(
                'Referensi URL/path Firebase Storage tidak valid.',
                'FIREBASE_INVALID_REF'
            );
        }
        throw err;
    }
}

export async function deleteCloudBerkas(
    fileRef: string,
    config: PsbBerkasFetcherConfig = {}
): Promise<DeleteCloudBerkasResult> {
    const trimmedRef = String(fileRef || '').trim();
    if (!trimmedRef) {
        throw new PermanentBerkasFetchError('Referensi berkas cloud kosong.', 'EMPTY_REF');
    }

    const provider = detectBerkasProvider(trimmedRef, config);

    if (provider === 'cloudflare_d1' || provider === 'cloudflare_r2' || provider === 'supabase') {
        throw new UnsupportedProviderBerkasError(provider, UNSUPPORTED_PROVIDER_BERKAS_MESSAGE);
    }

    if (provider === 'lokal') {
        throw new PermanentBerkasFetchError(
            'Berkas lokal (data URL) tidak memiliki salinan di penyimpanan cloud.',
            'NO_CLOUD_COPY'
        );
    }

    const fetchImpl = config.fetchImpl || globalThis.fetch.bind(globalThis);
    const maxAttempts = Math.max(1, Math.min(5, config.maxAttempts ?? PSB_BERKAS_MAX_ATTEMPTS));
    const baseBackoffMs = Math.max(0, config.baseBackoffMs ?? 500);

    let lastError: unknown;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            if (provider === 'gas') {
                return await deleteViaGas(trimmedRef, config, fetchImpl);
            }
            if (provider === 'firebase') {
                return await deleteViaFirebase(trimmedRef, config);
            }
            throw new UnsupportedProviderBerkasError(provider, UNSUPPORTED_PROVIDER_BERKAS_MESSAGE);
        } catch (err) {
            lastError = err;
            if (err instanceof UnsupportedProviderBerkasError || err instanceof PermanentBerkasFetchError) {
                throw err;
            }
            if (attempt < maxAttempts && baseBackoffMs > 0) {
                const waitMs = baseBackoffMs * Math.pow(2, attempt - 1);
                await new Promise((resolve) => setTimeout(resolve, waitMs));
            }
        }
    }

    throw lastError instanceof Error
        ? lastError
        : new Error('Gagal menghapus salinan cloud berkas setelah beberapa kali percobaan.');
}

export async function runWithConcurrency<T, R>(
    items: T[],
    worker: (item: T, index: number) => Promise<R>,
    concurrency: number = PSB_BERKAS_DEFAULT_CONCURRENCY
): Promise<R[]> {
    if (items.length === 0) return [];
    const limit = Math.max(1, Math.floor(concurrency));
    const results: R[] = new Array(items.length);
    let cursor = 0;

    const runWorker = async () => {
        while (true) {
            const current = cursor;
            cursor++;
            if (current >= items.length) break;
            results[current] = await worker(items[current], current);
        }
    };

    const workers = Array.from({ length: Math.min(limit, items.length) }, () => runWorker());
    await Promise.all(workers);
    return results;
}
