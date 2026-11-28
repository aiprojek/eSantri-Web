import { PsbCloudProvider } from '../types';
import { obfuscateSecretToCodeArray } from './raporCloudService';
import { buildStandaloneHybridEncryptJsHelper, decryptAnyEnvelope, tryParseE2eeEnvelope } from './e2eeService';

export interface PsbCloudProviderMeta {
    id: PsbCloudProvider;
    name: string;
    shortName: string;
    storageLabel: string;
    attachmentLabel: string;
    endpointLabel: string;
    endpointPlaceholder: string;
    requiresApiKey: boolean;
    supportsApiKey: boolean;
    apiKeyLabel: string;
    apiKeyPlaceholder: string;
    apiKeyHelp: string;
    usesDriveFolder: boolean;
    usesSupabaseBucket: boolean;
    scriptButtonLabel: string;
    scriptBadge: string;
    helperSummary: string;
}

export const getPsbCloudProviderMeta = (
    provider?: PsbCloudProvider | string
): PsbCloudProviderMeta => {
    switch (provider) {
        case 'cloudflare_d1':
            return {
                id: 'cloudflare_d1',
                name: 'Cloudflare D1 + R2',
                shortName: 'CF D1+R2',
                storageLabel: 'Cloudflare D1 SQLite',
                attachmentLabel: 'Cloudflare R2 Bucket',
                endpointLabel: 'URL Cloudflare Worker PSB (D1 + R2)',
                endpointPlaceholder: 'https://psb-api.namapondok.workers.dev',
                requiresApiKey: false,
                supportsApiKey: true,
                apiKeyLabel: 'Worker API Key / Secret (Opsional)',
                apiKeyPlaceholder: 'Kosongkan jika publik, atau isi X-API-Key Worker',
                apiKeyHelp: 'Jika Worker memakai env API_KEY untuk keamanan, isi token yang sama agar formulir HTML dan Rekap eSantri terautentikasi.',
                usesDriveFolder: false,
                usesSupabaseBucket: false,
                scriptButtonLabel: 'Kode Worker Cloudflare D1 + R2 & Panduan',
                scriptBadge: 'CF Worker D1+R2',
                helperSummary: 'Data teks pendaftar masuk ke tabel SQLite Cloudflare D1; berkas upload (KK/Akta/Foto) disimpan langsung ke Cloudflare R2 Bucket.'
            };
        case 'cloudflare_r2':
            return {
                id: 'cloudflare_r2',
                name: 'Cloudflare R2',
                shortName: 'CF R2',
                storageLabel: 'Cloudflare R2 Object Storage',
                attachmentLabel: 'Cloudflare R2 Bucket',
                endpointLabel: 'URL Cloudflare Worker R2 PSB',
                endpointPlaceholder: 'https://psb-r2.namapondok.workers.dev',
                requiresApiKey: false,
                supportsApiKey: true,
                apiKeyLabel: 'Worker API Key / Secret (Opsional)',
                apiKeyPlaceholder: 'Kosongkan jika publik, atau isi X-API-Key Worker',
                apiKeyHelp: 'Opsional. Isi jika Worker diproteksi dengan environment variable API_KEY.',
                usesDriveFolder: false,
                usesSupabaseBucket: false,
                scriptButtonLabel: 'Kode Worker Cloudflare R2 & Panduan',
                scriptBadge: 'CF Worker R2 Only',
                helperSummary: 'Tanpa database SQL terpisah: data pendaftar & seluruh berkas lampiran disimpan langsung di 1 Bucket Cloudflare R2 (Gratis 10 GB/bln).'
            };
        case 'supabase':
            return {
                id: 'supabase',
                name: 'Supabase + Storage',
                shortName: 'Supabase',
                storageLabel: 'Supabase PostgreSQL',
                attachmentLabel: 'Supabase Storage Bucket',
                endpointLabel: 'URL Project Supabase (atau URL REST /rest/v1/psb_submissions)',
                endpointPlaceholder: 'https://xyzcompany.supabase.co',
                requiresApiKey: true,
                supportsApiKey: true,
                apiKeyLabel: 'Supabase Anon / Public Key (Wajib)',
                apiKeyPlaceholder: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
                apiKeyHelp: 'Tempel Project anon public key dari Supabase Dashboard > Settings > API.',
                usesDriveFolder: false,
                usesSupabaseBucket: true,
                scriptButtonLabel: 'SQL Tabel PSB & Storage Bucket Supabase',
                scriptBadge: 'PostgreSQL + Storage',
                helperSummary: 'Data pendaftar disimpan di tabel PostgreSQL psb_submissions; berkas lampiran otomatis diunggah ke Supabase Storage Bucket.'
            };
        case 'gas':
        default:
            return {
                id: 'gas',
                name: 'Google Apps Script + Drive',
                shortName: 'GAS + Drive',
                storageLabel: 'Google Sheet',
                attachmentLabel: 'Google Drive Folder',
                endpointLabel: 'URL Google Apps Script (Web App /exec)',
                endpointPlaceholder: 'https://script.google.com/macros/s/.../exec',
                requiresApiKey: false,
                supportsApiKey: false,
                apiKeyLabel: 'API Key',
                apiKeyPlaceholder: '',
                apiKeyHelp: '',
                usesDriveFolder: true,
                usesSupabaseBucket: false,
                scriptButtonLabel: 'Kode Script GAS (Code.gs v3.1) & Panduan Drive',
                scriptBadge: 'v3.1 Smart Multi-Sheet & GDrive',
                helperSummary: 'Data masuk ke Google Sheets (tab per formulir/jenjang) & berkas tersimpan rapi di Folder Google Drive pilihan panitia. Buat GAS baru per tahun ajaran agar arsip antar-tahun terpisah.'
            };
    }
};

export const isPsbCloudEndpointValid = (
    rawUrl: string,
    provider: PsbCloudProvider = 'gas'
): boolean => {
    const trimmed = (rawUrl || '').trim();
    if (!trimmed) return false;
    if (provider === 'gas') {
        return /^https:\/\/script\.google\.com\/(?:a\/(?:macros\/[^/\s]+\/|[^/\s]+\/macros\/)|macros\/)s\/[^/\s]+\/exec(?:\?.*)?$/i.test(trimmed);
    }
    return /^https?:\/\/[^\s/$.?#].[^\s]*$/i.test(trimmed);
};

export const extractPsbSupabaseBaseUrl = (rawUrl: string): string => {
    const clean = (rawUrl || '').trim().replace(/\/+$/, '');
    if (!clean) return '';
    return clean
        .replace(/\/rest\/v1\/.*$/i, '')
        .replace(/\/storage\/v1\/.*$/i, '')
        .replace(/\/+$/, '');
};

export const normalizePsbCloudEndpoint = (
    rawUrl: string,
    provider: PsbCloudProvider = 'gas'
): string => {
    const clean = (rawUrl || '').trim();
    if (!clean) return '';
    if (provider === 'supabase') {
        const noSlash = clean.replace(/\/+$/, '');
        if (/\/rest\/v1\//i.test(noSlash)) return noSlash;
        return `${extractPsbSupabaseBaseUrl(noSlash)}/rest/v1/psb_submissions`;
    }
    return clean;
};

const buildSupabaseHeaders = (apiKey?: string, extra?: Record<string, string>): Record<string, string> => {
    const key = (apiKey || '').trim();
    const headers: Record<string, string> = { ...(extra || {}) };
    if (key) {
        headers['apikey'] = key;
        headers['Authorization'] = `Bearer ${key}`;
    }
    return headers;
};

const buildWorkerHeaders = (apiKey?: string, contentType?: string): Record<string, string> => {
    const headers: Record<string, string> = {};
    if (contentType) headers['Content-Type'] = contentType;
    const key = (apiKey || '').trim();
    if (key) {
        headers['X-API-Key'] = key;
        headers['Authorization'] = `Bearer ${key}`;
    }
    return headers;
};

/**
 * Menormalkan berbagai bentuk baris respons (GAS array, CF D1 rows, CF R2 records, Supabase rows with data_json)
 * menjadi objek flat siap diproses oleh importer di PsbRekap.
 */
export const normalizePsbCloudRows = (rawJson: any): any[] => {
    const rawList = Array.isArray(rawJson)
        ? rawJson
        : rawJson && Array.isArray(rawJson.records)
        ? rawJson.records
        : rawJson && Array.isArray(rawJson.data)
        ? rawJson.data
        : [];

    const out: any[] = [];
    for (const row of rawList) {
        if (!row || typeof row !== 'object') continue;
        // Lewati chunk portal config lama jika masih tersisa di Sheet lama
        if (row.partCount !== undefined && row.payloadPart1 !== undefined && !row.namaLengkap && !row.data_json) {
            continue;
        }

        const unpacked: Record<string, any> = { ...row };
        const nestedSources = [row.data_json, row.rawJson];
        for (const src of nestedSources) {
            if (!src) continue;
            try {
                const parsed = typeof src === 'string' ? JSON.parse(src) : src;
                if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                    Object.keys(parsed).forEach((k) => {
                        if (unpacked[k] === undefined || unpacked[k] === '') {
                            unpacked[k] = parsed[k];
                        }
                    });
                }
            } catch {
                // Abaikan JSON nested korup
            }
        }
        delete unpacked.data_json;
        delete unpacked.rawJson;

        if (!unpacked.tanggalDaftar && (row.created_at || row.Timestamp || row.submitted_at)) {
            unpacked.tanggalDaftar = row.created_at || row.Timestamp || row.submitted_at;
        }
        if (!unpacked.tahunAjaranAktif && row.tahun_ajaran) {
            unpacked.tahunAjaranAktif = row.tahun_ajaran;
        }
        if (!unpacked.jenjangId && row.jenjang_id) {
            unpacked.jenjangId = row.jenjang_id;
        }
        if (!unpacked.namaLengkap && row.nama_lengkap) {
            unpacked.namaLengkap = row.nama_lengkap;
        }
        if (!unpacked.sheetName && row.sheet_name) {
            unpacked.sheetName = row.sheet_name;
        }

        out.push(unpacked);
    }
    return out;
};

export interface PsbCloudDecryptReport {
    rows: any[];
    failedCount: number;
    failedReasons: string[];
    rejectedPlaintextRows: any[];
    rejectedPlaintextCount: number;
}

export const decryptPsbCloudRowsWithReport = async (
    rows: any[],
    activeKeyId?: string | null,
    options?: { requireEncrypted?: boolean; allowPlaintext?: boolean }
): Promise<PsbCloudDecryptReport> => {
    const result: any[] = [];
    const failedReasons: string[] = [];
    const rejectedPlaintextRows: any[] = [];
    let encryptedCount = 0;
    let lockedActiveError: Error | null = null;
    let firstLockedError: Error | null = null;
    const requireEncrypted = Boolean(options?.requireEncrypted && !options?.allowPlaintext);

    for (const row of rows) {
        if (!row || typeof row !== 'object') continue;
        const envBio = tryParseE2eeEnvelope(row.__e2ee_bio);
        let envCustomBio: ReturnType<typeof tryParseE2eeEnvelope> = null;
        let parsedCustomObj: Record<string, any> | null = null;
        if (!envBio && typeof row.customData === 'string' && row.customData.includes('__e2ee_bio')) {
            try {
                const parsedCustom = JSON.parse(row.customData);
                if (parsedCustom && typeof parsedCustom === 'object') {
                    envCustomBio = tryParseE2eeEnvelope(parsedCustom.__e2ee_bio);
                    if (envCustomBio) parsedCustomObj = parsedCustom;
                }
            } catch {
                // abaikan customData non-JSON
            }
        }
        const envRow = tryParseE2eeEnvelope(row);
        const env = envBio || envCustomBio || envRow;
        if (!env) {
            if (requireEncrypted) {
                rejectedPlaintextRows.push(row);
            } else {
                result.push(row);
            }
            continue;
        }
        encryptedCount++;
        try {
            if (envBio) {
                const plainBio = await decryptAnyEnvelope<Record<string, any>>(envBio, { expectedContext: 'psb' });
                const merged = { ...row, ...plainBio };
                delete merged.__e2ee_bio;
                result.push(merged);
            } else if (envCustomBio && parsedCustomObj) {
                const plainBio = await decryptAnyEnvelope<Record<string, any>>(envCustomBio, { expectedContext: 'psb' });
                const { __e2ee_bio: _drop, ...restCustom } = parsedCustomObj;
                const merged = {
                    ...row,
                    ...plainBio,
                    customData: JSON.stringify(restCustom),
                };
                result.push(merged);
            } else if (envRow) {
                const plainRow = await decryptAnyEnvelope<Record<string, any>>(
                    envRow,
                    envRow.mode === 'hybrid_rsa' ? { expectedContext: 'psb' } : undefined
                );
                result.push(plainRow);
            }
        } catch (err: any) {
            const msg = String(err?.message || 'Gagal mendekripsi data PSB.');
            if (msg.includes('E2EE_LOCKED')) {
                if (!firstLockedError) firstLockedError = err instanceof Error ? err : new Error(msg);
                if (activeKeyId && env.kid === activeKeyId && !lockedActiveError) {
                    lockedActiveError = err instanceof Error ? err : new Error(msg);
                }
            }
            failedReasons.push(`${row.namaLengkap || row.id || 'Baris PSB'} (${env.kid || '-'}): ${msg}`);
        }
    }

    if (lockedActiveError) {
        throw lockedActiveError;
    }
    if (encryptedCount > 0 && failedReasons.length === encryptedCount && result.length === 0 && firstLockedError) {
        throw firstLockedError;
    }

    return {
        rows: result,
        failedCount: failedReasons.length,
        failedReasons,
        rejectedPlaintextRows,
        rejectedPlaintextCount: rejectedPlaintextRows.length,
    };
};

export const decryptPsbCloudRows = async (
    rows: any[],
    activeKeyId?: string | null,
    options?: { requireEncrypted?: boolean; allowPlaintext?: boolean }
): Promise<any[]> => {
    const report = await decryptPsbCloudRowsWithReport(rows, activeKeyId, options);
    return report.rows;
};

export const CURRENT_PSB_GAS_SCRIPT_VERSION = 4;

const KEY_CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';

const generateRandomKeyString = (length: number): string => {
    const cryptoObj = typeof globalThis !== 'undefined' ? (globalThis as any).crypto : undefined;
    if (cryptoObj && typeof cryptoObj.getRandomValues === 'function') {
        const bytes = new Uint8Array(length * 2);
        cryptoObj.getRandomValues(bytes);
        let out = '';
        for (let i = 0; i < bytes.length && out.length < length; i++) {
            out += KEY_CHARSET[bytes[i] % KEY_CHARSET.length];
        }
        return out.slice(0, length);
    }
    let fallback = '';
    while (fallback.length < length) {
        fallback += KEY_CHARSET[Math.floor(Math.random() * KEY_CHARSET.length)];
    }
    return fallback.slice(0, length);
};

export const generatePsbPublicKey = (): string => `pub_${generateRandomKeyString(24)}`;

export const generatePsbAdminKey = (publicKeyToAvoid?: string): string => {
    const avoid = (publicKeyToAvoid || '').trim();
    for (let i = 0; i < 5; i++) {
        const candidate = `adm_${generateRandomKeyString(36)}`; // total 40 chars (>= 32)
        if (candidate !== avoid && candidate.length >= 32) {
            return candidate;
        }
    }
    return `adm_${generateRandomKeyString(40)}`;
};

export interface PsbGasProbeResult {
    isLegacyGas: boolean;
    scriptVersion: number | null;
    probedAt: number;
    service?: string;
    versionErrorMessage?: string;
}

const psbGasProbeCache = new Map<string, PsbGasProbeResult>();

export const clearPsbGasProbeCache = (endpointUrl?: string): void => {
    if (!endpointUrl) {
        psbGasProbeCache.clear();
        return;
    }
    psbGasProbeCache.delete(endpointUrl.trim());
};

const isNetworkFetchError = (err: unknown): boolean => {
    const msg = String((err as any)?.message || '').toLowerCase();
    const name = String((err as any)?.name || '');
    return (
        name === 'TypeError' &&
        (msg.includes('failed to fetch') ||
            msg.includes('networkerror') ||
            msg.includes('load failed') ||
            msg.includes('fetch'))
    ) || msg.includes('failed to fetch') || msg.includes('networkerror');
};

const formatGasNetworkError = (stage: 'probe' | 'post' | 'get'): Error => {
    const stageLabel =
        stage === 'probe'
            ? 'pemeriksaan versi (?action=version)'
            : stage === 'post'
            ? 'verifikasi ADMIN_KEY (POST list)'
            : 'pengambilan data GET';
    return new Error(
        `Tidak dapat menghubungi Google Apps Script pada tahap ${stageLabel} (diblokir CORS / jaringan).\n` +
            `Pastikan di editor Apps Script:\n` +
            `1) Web App sudah di-deploy dengan "Execute as: Me" dan "Who has access: Anyone (Siapa saja)" (bukan "Only myself").\n` +
            `2) URL yang ditempel adalah URL Web App (/exec) aktif.\n` +
            `3) Browser/ekstensi privasi (misal Brave Shields / AdBlock) tidak memblokir redirect ke script.googleusercontent.com.`
    );
};

const detectHtmlGasError = (rawText: string, contentType?: string | null): string | null => {
    const trimmed = String(rawText || '').trim();
    const ct = String(contentType || '').toLowerCase();
    const looksHtml =
        ct.includes('text/html') ||
        /^<!doctype\s+html/i.test(trimmed) ||
        /^<html[\s>]/i.test(trimmed);
    if (!looksHtml) return null;

    if (/accounts\.google\.com|ServiceLogin|Sign in|Masuk\s*-\s*Akun Google/i.test(trimmed)) {
        return (
            'Google Apps Script mengarahkan ke halaman login Google. ' +
            'Pastikan Web App di-deploy dengan "Who has access: Anyone (Siapa saja)".'
        );
    }
    if (/Authorization is required|izin diperlukan|perlu otorisasi/i.test(trimmed)) {
        return (
            'Script Google Apps Script belum diotorisasi. Buka editor Apps Script lalu klik Run > makeExistingFilesPrivate ' +
            'atau Deploy ulang untuk menyetujui izin akses.'
        );
    }
    if (/Script function not found:\s*doGet/i.test(trimmed)) {
        return (
            'Fungsi doGet tidak ditemukan pada deployment GAS di URL ini. ' +
            'Salin ulang seluruh kode script lalu Deploy > Manage deployments > Edit > Version: New version.'
        );
    }
    return (
        'Server Google Apps Script mengembalikan halaman HTML, bukan JSON. ' +
        'Periksa URL /exec, izin akses "Anyone (Siapa saja)", dan pastikan deployment memakai Version: New version.'
    );
};

export const probePsbGasVersion = async (endpointUrl: string): Promise<PsbGasProbeResult> => {
    const cleanUrl = (endpointUrl || '').trim();
    const cached = psbGasProbeCache.get(cleanUrl);
    if (cached) {
        return cached;
    }

    const probeUrl = new URL(cleanUrl);
    probeUrl.searchParams.set('action', 'version');

    let res: Response;
    try {
        res = await fetch(probeUrl.toString(), { method: 'GET' });
    } catch (err) {
        if (isNetworkFetchError(err)) {
            throw formatGasNetworkError('probe');
        }
        throw err;
    }

    if (!res.ok) {
        throw new Error(`Gagal menghubungi Google Apps Script (HTTP ${res.status}).`);
    }

    const rawText = await res.text();
    const contentType = res.headers?.get ? res.headers.get('content-type') : '';

    let parsed: any = null;
    try {
        parsed = JSON.parse(rawText);
    } catch {
        const htmlErr = detectHtmlGasError(rawText, contentType);
        if (htmlErr) {
            throw new Error(htmlErr);
        }
        const result: PsbGasProbeResult = { isLegacyGas: true, scriptVersion: null, probedAt: Date.now() };
        psbGasProbeCache.set(cleanUrl, result);
        return result;
    }

    if (
        !Array.isArray(parsed) &&
        parsed &&
        typeof parsed === 'object' &&
        typeof parsed.scriptVersion === 'number' &&
        parsed.scriptVersion >= CURRENT_PSB_GAS_SCRIPT_VERSION
    ) {
        const result: PsbGasProbeResult = {
            isLegacyGas: false,
            scriptVersion: parsed.scriptVersion,
            probedAt: Date.now(),
            service: typeof parsed.service === 'string' ? parsed.service : undefined,
        };
        psbGasProbeCache.set(cleanUrl, result);
        return result;
    }

    const versionErrorMessage =
        !Array.isArray(parsed) &&
        parsed &&
        typeof parsed === 'object' &&
        (parsed.success === false || parsed.result === 'error')
            ? String(parsed.message || parsed.error || '').trim() || undefined
            : undefined;

    const legacyResult: PsbGasProbeResult = {
        isLegacyGas: true,
        scriptVersion: !Array.isArray(parsed) && parsed && typeof parsed.scriptVersion === 'number' ? parsed.scriptVersion : null,
        probedAt: Date.now(),
        versionErrorMessage,
    };
    psbGasProbeCache.set(cleanUrl, legacyResult);
    return legacyResult;
};

export interface PsbCloudConnectionParams {
    endpointUrl: string;
    backendProvider?: PsbCloudProvider;
    apiKey?: string;
    publicKey?: string;
    adminKey?: string;
    includeDiagnostics?: boolean;
}

export interface PsbGasDiagnostics {
    hasPublicKey?: boolean;
    hasAdminKey?: boolean;
    keysEqual?: boolean;
    hasSpreadsheet?: boolean;
    hasDriveFolder?: boolean;
    driveFolderAccessible?: boolean | null;
}

export interface PsbCloudFetchResult {
    rows: any[];
    isLegacyGas: boolean;
    scriptVersion: number | null;
    diagnostics?: PsbGasDiagnostics;
}

export const fetchPsbFromCloudWithMeta = async (
    params: PsbCloudConnectionParams
): Promise<PsbCloudFetchResult> => {
    const provider: PsbCloudProvider = params.backendProvider || 'gas';
    const baseUrl = normalizePsbCloudEndpoint(params.endpointUrl, provider);
    if (!baseUrl) {
        throw new Error('URL Endpoint Cloud PSB belum diisi.');
    }

    if (provider === 'supabase') {
        if (!(params.apiKey || '').trim()) {
            throw new Error('Supabase Anon / Public Key wajib diisi.');
        }
        const sep = baseUrl.includes('?') ? '&' : '?';
        const res = await fetch(`${baseUrl}${sep}select=*&order=created_at.asc`, {
            method: 'GET',
            headers: buildSupabaseHeaders(params.apiKey)
        });
        if (!res.ok) {
            const errTxt = await res.text().catch(() => '');
            throw new Error(`Gagal mengambil data dari Supabase (HTTP ${res.status})${errTxt ? ': ' + errTxt.slice(0, 140) : ''}`);
        }
        const rawJson = await res.json();
        return { rows: normalizePsbCloudRows(rawJson), isLegacyGas: false, scriptVersion: null };
    }

    if (provider === 'gas') {
        const meta = getPsbCloudProviderMeta(provider);
        const probe = await probePsbGasVersion(baseUrl);

        if (!probe.isLegacyGas) {
            const adminKey = (params.adminKey || '').trim();
            if (!adminKey) {
                throw new Error('Kunci Admin GAS (ADMIN_KEY) belum diisi di Pengaturan Koneksi Cloud PSB.');
            }
            const publicKey = (params.publicKey || '').trim();
            if (publicKey && adminKey === publicKey) {
                throw new Error('ADMIN_KEY tidak boleh sama dengan PUBLIC_KEY.');
            }

            let response: Response;
            try {
                response = await fetch(baseUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                    body: JSON.stringify({
                        action: 'list',
                        adminKey,
                        ...(params.includeDiagnostics ? { includeDiagnostics: true } : {}),
                    }),
                });
            } catch (err) {
                if (isNetworkFetchError(err)) {
                    throw formatGasNetworkError('post');
                }
                throw err;
            }

            if (!response.ok) {
                throw new Error(`Gagal menghubungi ${meta.name} (HTTP ${response.status}).`);
            }

            const rawPostText = await response.text();
            let parsed: any;
            try {
                parsed = JSON.parse(rawPostText);
            } catch {
                const htmlErr = detectHtmlGasError(rawPostText, response.headers?.get ? response.headers.get('content-type') : '');
                if (htmlErr) {
                    throw new Error(htmlErr);
                }
                throw new Error(`Respons POST ${meta.name} bukan JSON yang valid (${rawPostText.slice(0, 120)}).`);
            }

            if (parsed && (parsed.result === 'error' || parsed.success === false)) {
                if (
                    parsed.errorCode === 'UNAUTHORIZED' ||
                    parsed.errorCode === 'ADMIN_KEY_MISMATCH' ||
                    parsed.errorCode === 'MISSING_ADMIN_KEY' ||
                    parsed.errorCode === 'ADMIN_EQUALS_PUBLIC'
                ) {
                    throw new Error(
                        'Akses ditolak GAS: kredensial ADMIN_KEY tidak valid atau belum siap di Script GAS.\n' +
                            'Pastikan:\n' +
                            '1) ADMIN_KEY dan PUBLIC_KEY di Script GAS terisi dan tidak sama.\n' +
                            '2) Setelah menyalin kode baru ke Code.gs, wajib klik Deploy > Manage deployments > Edit > Version: New version.\n' +
                            '3) Nilai ADMIN_KEY di Apps Script (Code.gs / Script Properties) sama persis dengan kolom ADMIN_KEY di aplikasi.'
                    );
                }
                throw new Error(parsed.error || parsed.message || `Server ${meta.name} menolak akses baca data.`);
            }
            if (Array.isArray(parsed) || (parsed && (Array.isArray(parsed.records) || Array.isArray(parsed.data)))) {
                const diag: PsbGasDiagnostics | undefined =
                    parsed && parsed.diagnostics && typeof parsed.diagnostics === 'object'
                        ? parsed.diagnostics
                        : undefined;
                if (diag && diag.hasSpreadsheet === false) {
                    throw new Error(
                        'Project Google Apps Script di URL ini tidak terikat ke Google Sheets (getActiveSpreadsheet() kosong). ' +
                            'Buka file Google Spreadsheet Anda lalu masuk via Ekstensi > Apps Script, tempel kode script, dan deploy ulang.'
                    );
                }
                return {
                    rows: normalizePsbCloudRows(parsed),
                    isLegacyGas: false,
                    scriptVersion: probe.scriptVersion,
                    diagnostics: diag,
                };
            }
            throw new Error(`Format respons ${meta.name} bukan daftar pendaftar.`);
        }

        // Jalur fallback GET untuk script GAS versi lama (JANGAN kirim POST list ke script lama)
        let response: Response;
        try {
            response = await fetch(baseUrl, { method: 'GET' });
        } catch (err) {
            if (isNetworkFetchError(err)) {
                throw formatGasNetworkError('get');
            }
            throw err;
        }
        if (!response.ok) {
            throw new Error(`Gagal menghubungi ${meta.name} (HTTP ${response.status}).`);
        }

        const rawGetText = await response.text();
        let parsed: any;
        try {
            parsed = JSON.parse(rawGetText);
        } catch {
            const htmlErr = detectHtmlGasError(rawGetText, response.headers?.get ? response.headers.get('content-type') : '');
            if (htmlErr) {
                throw new Error(htmlErr);
            }
            throw new Error(`Respons ${meta.name} bukan JSON valid (${rawGetText.slice(0, 120)}).`);
        }

        // Kompatibilitas dengan script Portal GAS v2 lama jika user mengarahkannya ke endpoint Portal
        if (!Array.isArray(parsed) && parsed && typeof parsed === 'object' && !Array.isArray(parsed.records)) {
            const subUrl = new URL(baseUrl);
            subUrl.searchParams.set('action', 'getPsbSubmissions');
            const legacyKey = (params.publicKey || params.apiKey || '').trim();
            if (legacyKey) {
                subUrl.searchParams.set('apiKey', legacyKey);
            }
            const subRes = await fetch(subUrl.toString(), { method: 'GET' });
            if (subRes.ok) {
                const subText = await subRes.text();
                try {
                    const subParsed = JSON.parse(subText);
                    if (Array.isArray(subParsed) || Array.isArray(subParsed?.records)) {
                        parsed = subParsed;
                    }
                } catch {
                    // abaikan non-JSON dari endpoint lama
                }
            }
        }

        if (Array.isArray(parsed) || (parsed && (Array.isArray(parsed.records) || Array.isArray(parsed.data)))) {
            return {
                rows: normalizePsbCloudRows(parsed),
                isLegacyGas: true,
                scriptVersion: probe.scriptVersion,
            };
        }
        if (parsed && (parsed.result === 'error' || parsed.success === false)) {
            const rawErr = String(parsed.error || parsed.message || probe.versionErrorMessage || '').trim();
            throw new Error(
                `Deployment GAS pada URL ini masih menjalankan script versi lama dan belum mengenali v${CURRENT_PSB_GAS_SCRIPT_VERSION} (${rawErr || 'GET ditolak'}). ` +
                    `Jika Anda sudah menempel script terbaru ke Code.gs, klik Deploy > Manage deployments > Edit (ikon pensil) > pilih Version: "New version" lalu Deploy.`
            );
        }

        throw new Error(
            `Format respons ${meta.name} bukan daftar pendaftar dan belum melaporkan scriptVersion >= ${CURRENT_PSB_GAS_SCRIPT_VERSION}. ` +
                `Pastikan Anda sudah menyalin script terbaru dan melakukan Deploy > Manage deployments > Edit > Version: New version.`
        );
    }

    const response = await fetch(baseUrl, { method: 'GET', headers: buildWorkerHeaders(params.apiKey) });
    const meta = getPsbCloudProviderMeta(provider);
    if (!response.ok) {
        throw new Error(`Gagal menghubungi ${meta.name} (HTTP ${response.status}).`);
    }

    const parsed = await response.json();
    if (Array.isArray(parsed) || (parsed && (Array.isArray(parsed.records) || Array.isArray(parsed.data)))) {
        return { rows: normalizePsbCloudRows(parsed), isLegacyGas: false, scriptVersion: null };
    }
    if (parsed && parsed.result === 'error') {
        throw new Error(parsed.error || parsed.message || `Server ${meta.name} mengembalikan error.`);
    }

    throw new Error(`Format respons ${meta.name} bukan daftar pendaftar.`);
};

export const fetchPsbFromCloudAdapter = async (
    params: PsbCloudConnectionParams
): Promise<any[]> => {
    const res = await fetchPsbFromCloudWithMeta(params);
    return res.rows;
};

export const testPsbCloudConnection = async (
    params: PsbCloudConnectionParams
): Promise<{ ok: boolean; rowCount: number; message: string; isLegacyGas?: boolean; scriptVersion?: number | null }> => {
    const provider: PsbCloudProvider = params.backendProvider || 'gas';
    const cleanUrl = (params.endpointUrl || '').trim();
    if (!cleanUrl) {
        throw new Error('Masukkan URL Endpoint Cloud terlebih dahulu.');
    }
    if (!isPsbCloudEndpointValid(cleanUrl, provider)) {
        if (provider === 'gas') {
            throw new Error('Format URL GAS belum valid. URL Web App harus berakhiran "/exec" (bukan link editor atau /dev).');
        }
        throw new Error('Format URL Endpoint harus diawali https:// yang valid.');
    }
    if (provider === 'supabase' && !(params.apiKey || '').trim()) {
        throw new Error('Masukkan Supabase Anon / Public Key terlebih dahulu.');
    }
    if (provider === 'gas') {
        const cleanAdmin = (params.adminKey || '').trim();
        const cleanPub = (params.publicKey || '').trim();
        if (!cleanAdmin) {
            throw new Error('Masukkan Kunci Admin (ADMIN_KEY) terlebih dahulu sebelum menguji koneksi GAS.');
        }
        if (cleanPub && cleanAdmin === cleanPub) {
            throw new Error('ADMIN_KEY tidak boleh sama dengan PUBLIC_KEY.');
        }
        clearPsbGasProbeCache(cleanUrl);
    }

    const res = await fetchPsbFromCloudWithMeta({
        endpointUrl: cleanUrl,
        backendProvider: provider,
        apiKey: params.apiKey,
        publicKey: params.publicKey,
        adminKey: params.adminKey,
        includeDiagnostics: provider === 'gas',
    });

    const meta = getPsbCloudProviderMeta(provider);
    const warnings: string[] = [];
    if (res.isLegacyGas) {
        warnings.push('PERINGATAN: Script GAS masih versi lama (data dapat terbaca lewat GET publik). Segera perbarui script & deploy versi baru.');
    }
    if (res.diagnostics) {
        if (res.diagnostics.hasPublicKey === false) {
            warnings.push('Catatan: PUBLIC_KEY belum diset di Script GAS — formulir publik tidak dapat mengirim pendaftar sebelum PUBLIC_KEY diisi.');
        }
        if (res.diagnostics.hasDriveFolder && res.diagnostics.driveFolderAccessible === false) {
            warnings.push('Peringatan: Folder Google Drive induk yang dikonfigurasi tidak dapat diakses oleh akun GAS; unggahan akan otomatis masuk ke folder My Drive/berkas-psb-<tahun>.');
        }
    }
    const warningNote = warnings.length > 0 ? ' ' + warnings.join(' ') : '';
    return {
        ok: true,
        rowCount: res.rows.length,
        message: `Terhubung ke ${meta.name}! Terbaca ${res.rows.length} baris data pendaftar.${warningNote}`,
        isLegacyGas: res.isLegacyGas,
        scriptVersion: res.scriptVersion,
    };
};

/* ============================================================================
 * HELPER JS MANDIRI UNTUK FILE HTML FORMULIR PSB OFFLINE/STANDALONE
 * Mendukung upload lampiran ke Google Drive (via GAS), Cloudflare R2, & Supabase Storage
 * ============================================================================ */
export const buildPsbStandaloneCloudHelperJs = (options: {
    provider: PsbCloudProvider;
    endpointObfuscatedExpr: string;
    driveFolderObfuscatedExpr?: string;
    apiKey?: string;
    publicKey?: string;
    supabaseBucket?: string;
    tahunAjaranAktif?: string;
    jenjangId?: number;
    sheetName: string;
    fieldLabelMapJson: string;
    e2eePublicKey?: string;
    e2eeKeyId?: string;
    e2eeFingerprint?: string;
}): string => {
    const providerLiteral = JSON.stringify(options.provider || 'gas');
    const embeddedClientKey =
        options.provider === 'gas'
            ? (options.publicKey || '').trim()
            : (options.apiKey || '').trim();
    const apiKeyBytesJson = JSON.stringify(obfuscateSecretToCodeArray(embeddedClientKey));
    const bucketLiteral = JSON.stringify((options.supabaseBucket || 'psb-berkas').trim() || 'psb-berkas');
    const taLiteral = JSON.stringify(options.tahunAjaranAktif || '');
    const jenjangLiteral = JSON.stringify(options.jenjangId ? String(options.jenjangId) : '');
    const sheetLiteral = JSON.stringify(options.sheetName || 'Pendaftar Baru');
    const e2eeSnippet =
        options.e2eePublicKey && options.e2eeKeyId
            ? buildStandaloneHybridEncryptJsHelper(
                  options.e2eePublicKey,
                  options.e2eeKeyId,
                  'psb',
                  options.e2eeFingerprint
              )
            : '';

    return `
${e2eeSnippet}
const FIELD_LABEL_MAP = ${options.fieldLabelMapJson};
const PSB_CLOUD_PROVIDER = ${providerLiteral};
const PSB_SUPABASE_BUCKET = ${bucketLiteral};
const PSB_TAHUN_AJARAN = ${taLiteral};
const PSB_JENJANG_ID = ${jenjangLiteral};
const PSB_SHEET_NAME = ${sheetLiteral};

function _dParam(str){
    if(!str) return '';
    try{
        return decodeURIComponent(atob(str.split('').reverse().join('')));
    }catch(e){
        return str;
    }
}
const _SEC_TARGET_EP = _dParam(${options.endpointObfuscatedExpr});
const _SEC_API_KEY = (function(bytes){
    if(!Array.isArray(bytes) || bytes.length === 0) return '';
    const salt = 43;
    let out = '';
    for(let i = 0; i < bytes.length; i++){
        out += String.fromCharCode(bytes[i] ^ (salt + (i % 19)));
    }
    return out.trim();
})(${apiKeyBytesJson});

// Proteksi inspeksi kasual di file HTML standalone
try{
    document.addEventListener('contextmenu', function(e){
        if(e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT')) return;
        e.preventDefault();
    });
    document.addEventListener('keydown', function(e){
        if(e.keyCode === 123 || (e.ctrlKey && e.shiftKey && (e.keyCode === 73 || e.keyCode === 74)) || (e.ctrlKey && (e.keyCode === 85 || e.keyCode === 83))){
            e.preventDefault();
        }
    });
}catch(e){}

function resolveFieldKey(rawKey){
    if(FIELD_LABEL_MAP[rawKey]) return FIELD_LABEL_MAP[rawKey];
    const noBracket = rawKey.replace(/\\[\\]$/, '');
    if(FIELD_LABEL_MAP[noBracket]) return FIELD_LABEL_MAP[noBracket];
    if(rawKey.startsWith('custom_')) return rawKey.replace(/^custom_/, '').replace(/\\[\\]$/, '');
    return rawKey;
}

function psbRandomCode(len){
    const chars = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
    const bytes = new Uint8Array(len);
    if(typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function'){
        crypto.getRandomValues(bytes);
    }else{
        for(let i = 0; i < len; i++) bytes[i] = Math.floor(Math.random() * 256);
    }
    let out = '';
    for(let i = 0; i < len; i++) out += chars[bytes[i] & 31];
    return out;
}

function psbMakeRegNumber(year){
    const y = year || new Date().getFullYear();
    return 'PSB-' + y + '-REG-' + psbRandomCode(6);
}

function psbMakeInitials(nama){
    const s = String(nama || '').trim();
    if(!s || s.toUpperCase() === '[TERENKRIPSI E2EE]') return 'X';
    const cleaned = s.normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').replace(/[^a-zA-Z0-9\\s]/g, ' ').trim();
    if(!cleaned) return 'X';
    const tokens = cleaned.split(/\\s+/).filter(Boolean);
    let out = '';
    for(let i = 0; i < tokens.length && i < 3; i++){
        out += tokens[i].charAt(0).toUpperCase();
    }
    return out || 'X';
}

function psbSlug(val){
    return String(val || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'santri';
}

function psbDocPrefix(fieldKey, fileName, fieldLabel){
    const s = (String(fieldKey || '') + ' ' + String(fileName || '') + ' ' + String(fieldLabel || '')).toLowerCase();
    if(s.indexOf('kartu keluarga') !== -1 || s.indexOf('kk') !== -1) return 'kk';
    if(s.indexOf('akta') !== -1) return 'akta';
    if(s.indexOf('ijazah') !== -1) return 'ijazah';
    if(s.indexOf('rapor') !== -1) return 'rapor';
    if(s.indexOf('foto') !== -1) return 'foto';
    if(s.indexOf('kip') !== -1) return 'kip';
    if(s.indexOf('ktp') !== -1) return 'ktp';
    return 'dokumen';
}

function psbExt(fileName, mimeType){
    const o = String(fileName || '');
    const dot = o.lastIndexOf('.');
    if(dot > -1 && dot < o.length - 1){
        const ext = o.substring(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, '');
        if(ext) return ext === 'jpeg' ? 'jpg' : ext;
    }
    if(mimeType === 'application/pdf') return 'pdf';
    if(mimeType === 'image/jpeg' || mimeType === 'image/jpg') return 'jpg';
    if(mimeType === 'image/png') return 'png';
    if(mimeType === 'image/webp') return 'webp';
    return '';
}

function psbMakeFileName(regNo, nama, jenisBerkas, ext){
    const inisial = psbMakeInitials(nama);
    const slugJenis = String(jenisBerkas || 'dokumen').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 24) || 'dokumen';
    const cleanExt = String(ext || '').trim().toLowerCase().replace(/^\\./, '').replace(/[^a-z0-9]/g, '');
    const base = String(regNo || psbMakeRegNumber()) + '_' + inisial + '_' + slugJenis + '-' + psbRandomCode(4);
    return cleanExt ? (base + '.' + cleanExt) : base;
}

function validatePsbForm(form){
    if(!form.checkValidity()){
        form.reportValidity();
        return false;
    }
    // Validasi grup checkbox kustom yang ditandai wajib (data-required-group="true")
    const reqGroups = form.querySelectorAll('[data-required-checkbox-group="true"]');
    for(let i = 0; i < reqGroups.length; i++){
        const grp = reqGroups[i];
        const checked = grp.querySelectorAll('input[type="checkbox"]:checked');
        if(checked.length === 0){
            const lbl = grp.getAttribute('data-group-label') || 'Pilihan wajib';
            alert('Harap pilih minimal satu opsi pada: ' + lbl);
            const firstCb = grp.querySelector('input[type="checkbox"]');
            if(firstCb) firstCb.focus();
            return false;
        }
    }
    return true;
}

function readFileAsBase64Obj(file, fieldLabel){
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve({
            name: file.name,
            mime: file.type || 'application/octet-stream',
            data: reader.result,
            isFile: true,
            fieldLabel: fieldLabel || ''
        });
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

function getSupabaseBaseFromEndpoint(ep){
    const clean = String(ep || '').trim().replace(/\\/+$/, '');
    return clean.replace(/\\/rest\\/v1\\/.*$/i, '').replace(/\\/storage\\/v1\\/.*$/i, '').replace(/\\/+$/, '');
}

async function uploadFileToSupabaseStorage(baseUrl, bucketName, file, targetKey, fieldLabel, regNumber, santriName){
    const yearFolder = psbSlug(PSB_TAHUN_AJARAN || String(new Date().getFullYear()));
    const prefix = psbDocPrefix(targetKey, file.name, fieldLabel);
    const fileName = psbMakeFileName(regNumber, santriName, prefix, psbExt(file.name, file.type));
    const objectPath = yearFolder + '/' + fileName;
    const uploadUrl = baseUrl + '/storage/v1/object/' + encodeURIComponent(bucketName) + '/' + objectPath;

    const headers = {
        'Content-Type': file.type || 'application/octet-stream',
        'x-upsert': 'true'
    };
    if(_SEC_API_KEY){
        headers['apikey'] = _SEC_API_KEY;
        headers['Authorization'] = 'Bearer ' + _SEC_API_KEY;
    }

    const res = await fetch(uploadUrl, {
        method: 'POST',
        headers: headers,
        body: file
    });
    if(!res.ok){
        const errText = await res.text().catch(() => '');
        throw new Error('Gagal unggah berkas "' + (fieldLabel || file.name) + '" ke Supabase Storage (HTTP ' + res.status + ')' + (errText ? ': ' + errText.slice(0, 100) : ''));
    }
    return baseUrl + '/storage/v1/object/public/' + encodeURIComponent(bucketName) + '/' + objectPath;
}

async function collectPsbFormPayload(form){
    const formData = new FormData(form);
    const data = {};
    const pendingFiles = [];

    for(const [key, value] of formData.entries()){
        const targetKey = resolveFieldKey(key);
        if(value instanceof File){
            if(value.size > 0){
                if(value.size > 5 * 1024 * 1024){
                    alert('File "' + value.name + '" terlalu besar (Maksimal 5MB).');
                    throw new Error('File too large');
                }
                const inputEl = form.querySelector('[name="' + key + '"]');
                const fieldLabel = FIELD_LABEL_MAP[key] || inputEl?.closest('div')?.querySelector('label')?.textContent?.replace('*', '')?.trim() || targetKey;
                pendingFiles.push({ targetKey: targetKey, file: value, fieldLabel: fieldLabel });
            }
        }else{
            if(data[targetKey]){
                data[targetKey] = data[targetKey] + ', ' + value;
            }else{
                data[targetKey] = value;
            }
        }
    }

    data.nomorRegistrasi = psbMakeRegNumber();
    data.tanggalDaftar = new Date().toISOString();
    data.jenjangId = PSB_JENJANG_ID;
    data.tahunAjaranAktif = PSB_TAHUN_AJARAN;
    data.sheetName = PSB_SHEET_NAME;

    return { data: data, pendingFiles: pendingFiles };
}

async function buildEncryptedPsbWirePayload(rawData, attachmentKeys) {
    if (typeof window.__esantriEncryptHybrid !== 'function') {
        return rawData;
    }
    const metaKeys = ['nomorRegistrasi', 'tanggalDaftar', 'jenjangId', 'tahunAjaranAktif', 'sheetName', 'status'];
    const wirePayload = {};
    const sensitiveBio = {};
    const attSet = {};
    for (let i = 0; i < attachmentKeys.length; i++) {
        attSet[attachmentKeys[i]] = true;
    }

    const keys = Object.keys(rawData);
    for (let i = 0; i < keys.length; i++) {
        const k = keys[i];
        const v = rawData[k];
        if (metaKeys.indexOf(k) !== -1 || attSet[k] || (v && typeof v === 'object' && v.isFile)) {
            wirePayload[k] = v;
        } else {
            sensitiveBio[k] = v;
        }
    }

    const envelope = await window.__esantriEncryptHybrid(sensitiveBio);
    wirePayload.__e2ee_bio = JSON.stringify(envelope);
    wirePayload.namaLengkap = '[TERENKRIPSI E2EE]';
    return wirePayload;
}

async function dispatchPsbToCloud(form){
    if(!_SEC_TARGET_EP){
        throw new Error('Endpoint Cloud belum diatur oleh panitia di Desain Formulir.');
    }
    const collected = await collectPsbFormPayload(form);
    const data = collected.data;
    const pendingFiles = collected.pendingFiles;
    const attachmentKeys = pendingFiles.map(function(pf){ return pf.targetKey; });
    const santriName = data.namaLengkap || data.namaSantri || 'santri';

    if(PSB_CLOUD_PROVIDER === 'supabase'){
        const sbBase = getSupabaseBaseFromEndpoint(_SEC_TARGET_EP);
        if(!sbBase) throw new Error('URL Supabase tidak valid.');
        const restUrl = /\\/rest\\/v1\\//i.test(_SEC_TARGET_EP) ? _SEC_TARGET_EP : (sbBase + '/rest/v1/psb_submissions');

        for(let i = 0; i < pendingFiles.length; i++){
            const pf = pendingFiles[i];
            data[pf.targetKey] = await uploadFileToSupabaseStorage(
                sbBase,
                PSB_SUPABASE_BUCKET,
                pf.file,
                pf.targetKey,
                pf.fieldLabel,
                data.nomorRegistrasi,
                typeof window.__esantriEncryptHybrid === 'function' ? '' : santriName
            );
        }

        const wireData = await buildEncryptedPsbWirePayload(data, attachmentKeys);
        const headers = {
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
        };
        if(_SEC_API_KEY){
            headers['apikey'] = _SEC_API_KEY;
            headers['Authorization'] = 'Bearer ' + _SEC_API_KEY;
        }
        const rowId = 'psb_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
        const rowPayload = {
            id: rowId,
            tahun_ajaran: PSB_TAHUN_AJARAN,
            jenjang_id: PSB_JENJANG_ID,
            sheet_name: PSB_SHEET_NAME,
            nama_lengkap: wireData.namaLengkap || santriName,
            data_json: wireData,
            created_at: wireData.tanggalDaftar
        };

        const res = await fetch(restUrl, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(rowPayload)
        });
        if(!res.ok){
            const errTxt = await res.text().catch(() => '');
            throw new Error('Gagal menyimpan ke Supabase (HTTP ' + res.status + ')' + (errTxt ? ': ' + errTxt.slice(0, 120) : ''));
        }
        return { success: true, data: data };
    }

    // GAS, Cloudflare D1+R2, Cloudflare R2 -> decode files as base64 object
    await Promise.all(pendingFiles.map(function(pf){
        return readFileAsBase64Obj(pf.file, pf.fieldLabel).then(function(fileObj){
            data[pf.targetKey] = fileObj;
        });
    }));

    const wireData = await buildEncryptedPsbWirePayload(data, attachmentKeys);

    if(PSB_CLOUD_PROVIDER === 'gas'){
        if(!_SEC_API_KEY){
            throw new Error('Kunci kirim formulir (PUBLIC_KEY) belum diatur. Silakan terbitkan ulang formulir dari aplikasi eSantri Web.');
        }
        wireData.action = 'submit';
        wireData.publicKey = _SEC_API_KEY;
        try{
            const res = await fetch(_SEC_TARGET_EP, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify(wireData)
            });
            if(res && res.type !== 'opaque'){
                if(!res.ok) throw new Error('HTTP ' + res.status);
                const txt = await res.text().catch(() => '');
                if(txt){
                    try{
                        const parsed = JSON.parse(txt);
                        if(parsed && (parsed.result === 'error' || parsed.success === false)){
                            throw new Error(parsed.message || parsed.error || 'Server Google Apps Script menolak kiriman.');
                        }
                    }catch(jsonErr){
                        if(jsonErr && jsonErr.message && (jsonErr.message.indexOf('Server') !== -1 || jsonErr.message.indexOf('terbitkan') !== -1 || jsonErr.message.indexOf('PUBLIC_KEY') !== -1)) throw jsonErr;
                    }
                }
            }
            return { success: true, data: data };
        }catch(fetchErr){
            // Hanya fallback no-cors jika terkena CORS preflight/redirect pada WebView lama
            if(fetchErr && fetchErr.name === 'TypeError'){
                await fetch(_SEC_TARGET_EP, {
                    method: 'POST',
                    mode: 'no-cors',
                    headers: { 'Content-Type': 'text/plain' },
                    body: JSON.stringify(wireData)
                });
                return { success: true, data: data };
            }
            throw fetchErr;
        }
    }

    // Cloudflare D1+R2 & Cloudflare R2
    const workerHeaders = { 'Content-Type': 'application/json' };
    if(_SEC_API_KEY){
        workerHeaders['X-API-Key'] = _SEC_API_KEY;
        workerHeaders['Authorization'] = 'Bearer ' + _SEC_API_KEY;
    }
    const res = await fetch(_SEC_TARGET_EP, {
        method: 'POST',
        headers: workerHeaders,
        body: JSON.stringify(wireData)
    });
    if(!res.ok){
        const errBody = await res.json().catch(() => null);
        throw new Error((errBody && (errBody.error || errBody.message)) || ('Gagal mengirim ke server (HTTP ' + res.status + ')'));
    }
    const json = await res.json().catch(() => ({}));
    if(json && (json.result === 'error' || json.success === false)){
        throw new Error(json.error || json.message || 'Terjadi kesalahan di Worker Cloud.');
    }
    return { success: true, data: data };
}
`;
};

/* ============================================================================
 * 1. GOOGLE APPS SCRIPT v3.1 (Fokus HTML Formulir + Google Drive + Multi-Tab)
 * ============================================================================ */
const escapeGasLiteral = (val: string = ''): string =>
    String(val || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"').trim();

export const buildPsbGasScriptV31 = (
    cleanDriveFolderId: string = '',
    defaultPublicKey: string = '',
    defaultAdminKey: string = ''
): string => {
    const safeFolderId = escapeGasLiteral(cleanDriveFolderId);
    const safePublicKey = escapeGasLiteral(defaultPublicKey);
    const safeAdminKey = escapeGasLiteral(defaultAdminKey);
    return `/* GOOGLE APPS SCRIPT FOR ESANTRI WEB - SMART PSB v3.1 (Formulir HTML + Google Drive + Multi-Sheet) */
var SCRIPT_VERSION = 4;
var PSB_INTERNAL_SHEETS = ['_psb_portal_config', 'portals', 'portal_sync_logs'];
var DEFAULT_DRIVE_FOLDER_ID = "${safeFolderId}";
var DEFAULT_PUBLIC_KEY = "${safePublicKey}";
var DEFAULT_ADMIN_KEY = "${safeAdminKey}";

function extractCleanFolderId(rawInput) {
  if (!rawInput) return "";
  var trimmed = String(rawInput).trim();
  if (!trimmed) return "";
  var folderMatch = trimmed.match(/\\/folders\\/([a-zA-Z0-9_-]{10,})/);
  if (folderMatch && folderMatch[1]) return folderMatch[1];
  var idParamMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]{10,})/);
  if (idParamMatch && idParamMatch[1]) return idParamMatch[1];
  var clean = trimmed.split('?')[0].split('#')[0].replace(/\\/+$/, '');
  if (/^[a-zA-Z0-9_-]{15,}$/.test(clean)) return clean;
  return "";
}

function resolveConfiguredDriveFolderId() {
  var props = PropertiesService.getScriptProperties();
  var fromProp = extractCleanFolderId(props.getProperty('DRIVE_FOLDER_ID') || '');
  var fromDefault = extractCleanFolderId(DEFAULT_DRIVE_FOLDER_ID);
  var seed = extractCleanFolderId(props.getProperty('DRIVE_FOLDER_ID_SEED') || '');
  if (fromDefault && (!fromProp || fromDefault !== seed)) {
    try {
      props.setProperty('DRIVE_FOLDER_ID', fromDefault);
      props.setProperty('DRIVE_FOLDER_ID_SEED', fromDefault);
    } catch (e) {}
    return fromDefault;
  }
  if (!fromDefault && seed && fromProp === seed) {
    try {
      props.deleteProperty('DRIVE_FOLDER_ID');
      props.deleteProperty('DRIVE_FOLDER_ID_SEED');
    } catch (e) {}
    return '';
  }
  return fromProp || fromDefault;
}

function resolveConfiguredScriptKey(propName, defaultVal) {
  var props = PropertiesService.getScriptProperties();
  var fromProp = String(props.getProperty(propName) || '').trim();
  var fromDefault = String(defaultVal || '').trim();
  var seedPropName = propName + '_SEED';
  var fromSeed = String(props.getProperty(seedPropName) || '').trim();
  if (fromDefault && (!fromProp || fromDefault !== fromSeed)) {
    try {
      props.setProperty(propName, fromDefault);
      props.setProperty(seedPropName, fromDefault);
    } catch (e) {}
    return fromDefault;
  }
  return fromProp || fromDefault;
}

function resolvePublicKey() {
  return resolveConfiguredScriptKey('PUBLIC_KEY', DEFAULT_PUBLIC_KEY);
}

function resolveAdminKey() {
  return resolveConfiguredScriptKey('ADMIN_KEY', DEFAULT_ADMIN_KEY);
}

function diagnoseAdminKey(providedKey) {
  var adm = resolveAdminKey();
  var pub = resolvePublicKey();
  if (!adm || adm === pub || String(providedKey || '').trim() !== adm) {
    return {
      ok: false,
      errorCode: 'UNAUTHORIZED',
      message: 'Akses ditolak: kredensial admin tidak valid atau konfigurasi belum siap.'
    };
  }
  return { ok: true };
}

function verifyAdminKey(providedKey) {
  return diagnoseAdminKey(providedKey).ok;
}

function buildAuthenticatedAdminDiagnostics() {
  var pub = resolvePublicKey();
  var adm = resolveAdminKey();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var folderId = resolveConfiguredDriveFolderId();
  var driveFolderAccessible = null;
  if (folderId) {
    try {
      DriveApp.getFolderById(folderId).getName();
      driveFolderAccessible = true;
    } catch (e) {
      driveFolderAccessible = false;
    }
  }
  return {
    hasPublicKey: Boolean(pub),
    hasAdminKey: Boolean(adm),
    keysEqual: Boolean(adm && adm === pub),
    hasSpreadsheet: Boolean(ss),
    hasDriveFolder: Boolean(folderId),
    driveFolderAccessible: driveFolderAccessible
  };
}

function verifyPublicSubmitKey(providedKey) {
  var pub = resolvePublicKey();
  if (!pub) {
    return {
      ok: false,
      message: 'PUBLIC_KEY belum dikonfigurasi di script GAS. Salin script terbaru dan terbitkan ulang formulir.'
    };
  }
  if (String(providedKey || '').trim() !== pub) {
    return {
      ok: false,
      message: 'Kunci formulir (PUBLIC_KEY) tidak valid atau sudah diganti. Silakan terbitkan ulang formulir PSB.'
    };
  }
  return { ok: true };
}

function gasJsonOut(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function collectAllPsbSubmissions(ss, filterTa) {
  var cleanTa = filterTa ? String(filterTa).trim() : '';
  var sheets = ss.getSheets();
  var combinedData = [];

  for (var s = 0; s < sheets.length; s++) {
    var sheet = sheets[s];
    if (PSB_INTERNAL_SHEETS.indexOf(sheet.getName()) !== -1) continue;
    var rows = sheet.getDataRange().getValues();
    if (rows.length < 2) continue;
    var headers = rows[0];

    for (var i = 1; i < rows.length; i++) {
      var row = rows[i];
      var record = {};
      for (var j = 0; j < headers.length; j++) {
        var val = row[j];
        if (val instanceof Date) {
          val = val.toISOString();
        } else if (typeof val === 'string' && val.charAt(0) === "'") {
          val = val.substring(1);
        }
        record[headers[j]] = val;
      }

      if (record.rawJson && typeof record.rawJson === 'string') {
        try {
          var parsedRaw = JSON.parse(record.rawJson);
          for (var rk in parsedRaw) {
            if (record[rk] === undefined || record[rk] === '') record[rk] = parsedRaw[rk];
          }
          delete record.rawJson;
        } catch (parseErr) {}
      }

      if (!record.sheetName) record.sheetName = sheet.getName();
      if (cleanTa && record.tahunAjaranAktif && String(record.tahunAjaranAktif).trim() !== cleanTa) continue;
      combinedData.push(record);
    }
  }
  return combinedData;
}

var PSB_MAX_POST_BYTES = 22 * 1024 * 1024;
var PSB_MAX_FILE_BYTES = 5 * 1024 * 1024;
var PSB_ALLOWED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];

function normalizeAllowedMimeType(mime) {
  var m = String(mime || '').trim().toLowerCase().split(';')[0];
  if (m === 'image/jpg') m = 'image/jpeg';
  return m;
}

function verifyFileMagicBytes(bytes, expectedMime) {
  if (!bytes || bytes.length < 4) return false;
  var b0 = bytes[0] & 0xFF;
  var b1 = bytes[1] & 0xFF;
  var b2 = bytes[2] & 0xFF;
  var b3 = bytes[3] & 0xFF;
  if (expectedMime === 'application/pdf') {
    return b0 === 0x25 && b1 === 0x50 && b2 === 0x44 && b3 === 0x46;
  }
  if (expectedMime === 'image/jpeg') {
    return b0 === 0xFF && b1 === 0xD8 && b2 === 0xFF;
  }
  if (expectedMime === 'image/png') {
    return b0 === 0x89 && b1 === 0x50 && b2 === 0x4E && b3 === 0x47;
  }
  if (expectedMime === 'image/webp') {
    if (bytes.length < 12) return false;
    var b8 = bytes[8] & 0xFF;
    var b9 = bytes[9] & 0xFF;
    var b10 = bytes[10] & 0xFF;
    var b11 = bytes[11] & 0xFF;
    return (
      b0 === 0x52 && b1 === 0x49 && b2 === 0x46 && b3 === 0x46 &&
      b8 === 0x57 && b9 === 0x45 && b10 === 0x42 && b11 === 0x50
    );
  }
  return false;
}

function decodeAndValidateUploadedFile(fileObj) {
  var mime = normalizeAllowedMimeType(fileObj && fileObj.mime);
  if (PSB_ALLOWED_MIME_TYPES.indexOf(mime) === -1) {
    throw new Error('Tipe berkas tidak diizinkan (' + (mime || 'tidak diketahui') + '). Hanya PDF, JPEG, PNG, dan WebP yang diperbolehkan.');
  }
  var rawData = String((fileObj && fileObj.data) || '');
  if (!rawData) {
    throw new Error('Isi berkas unggahan kosong.');
  }
  var cleanB64 = rawData.indexOf(',') !== -1 ? rawData.split(',')[1] : rawData;
  cleanB64 = cleanB64.replace(/\\s+/g, '');
  if (cleanB64.length > 7400000) {
    throw new Error('Ukuran berkas unggahan melebihi batas maksimum 5 MB.');
  }
  var bytes = Utilities.base64Decode(cleanB64);
  if (!bytes || bytes.length === 0) {
    throw new Error('Data berkas unggahan tidak valid atau kosong.');
  }
  if (bytes.length > PSB_MAX_FILE_BYTES) {
    throw new Error('Ukuran berkas melebihi batas maksimum 5 MB.');
  }
  if (!verifyFileMagicBytes(bytes, mime)) {
    throw new Error('Konten berkas tidak sesuai dengan tipe MIME ' + mime + ' (magic-bytes gagal).');
  }
  return { bytes: bytes, mime: mime };
}

function extractAndValidateDriveFileId(rawInput) {
  var s = String(rawInput || '').trim();
  if (!s) {
    throw new Error('ID atau URL berkas Google Drive wajib diisi.');
  }
  var idMatch = s.match(/\\/d\\/([a-zA-Z0-9_-]{15,80})/i);
  if (idMatch && idMatch[1]) return idMatch[1];
  var qMatch = s.match(/[?&]id=([a-zA-Z0-9_-]{15,80})/i);
  if (qMatch && qMatch[1]) return qMatch[1];
  var clean = s.split('?')[0].split('#')[0].replace(/\\/+$/, '');
  if (/^[a-zA-Z0-9_-]{15,80}$/.test(clean)) return clean;
  throw new Error('Format ID atau URL berkas Google Drive tidak valid.');
}

function folderHasPsbPrefixOrTargetAncestor(folder, targetFolderId, depth, visited) {
  if (!folder || depth > 6) return false;
  if (folder.isTrashed && folder.isTrashed()) return false;
  var fid = folder.getId();
  if (visited[fid]) return false;
  visited[fid] = true;
  if (targetFolderId && fid === targetFolderId) return true;
  var fname = String(folder.getName() || '').toLowerCase();
  if (depth <= 3 && fname.indexOf('berkas-psb-') === 0) return true;
  var ups = folder.getParents();
  while (ups.hasNext()) {
    if (folderHasPsbPrefixOrTargetAncestor(ups.next(), targetFolderId, depth + 1, visited)) {
      return true;
    }
  }
  return false;
}

function isFileInPsbDestinationFolder(file) {
  var targetFolderId = resolveConfiguredDriveFolderId();
  var parents = file.getParents();
  var visited = {};
  while (parents.hasNext()) {
    var parent = parents.next();
    if (folderHasPsbPrefixOrTargetAncestor(parent, targetFolderId, 1, visited)) {
      return true;
    }
  }
  return false;
}

function describeFileParentFolders(file) {
  var names = [];
  var parents = file.getParents();
  while (parents.hasNext()) {
    var p = parents.next();
    names.push(String(p.getName() || 'Drive'));
  }
  return names.length > 0 ? names.join(', ') : 'Root / Tanpa Folder';
}

function digestBytesToHex(digestBytes) {
  var hex = '';
  for (var i = 0; i < digestBytes.length; i++) {
    var b = digestBytes[i] & 0xFF;
    var h = b.toString(16);
    if (h.length === 1) h = '0' + h;
    hex += h;
  }
  return hex;
}

function handleGetFilePost(rawData) {
  var auth = diagnoseAdminKey(rawData.adminKey);
  if (!auth.ok) {
    return {
      result: 'error',
      success: false,
      errorCode: auth.errorCode,
      message: auth.message
    };
  }
  var fileId = extractAndValidateDriveFileId(rawData.fileId || rawData.fileUrl || rawData.url);
  var file;
  try {
    file = DriveApp.getFileById(fileId);
  } catch (err) {
    throw new Error('Berkas tidak ditemukan atau tidak dapat diakses di Google Drive.');
  }
  if (!file || file.isTrashed()) {
    throw new Error('Berkas tidak ditemukan atau sudah berada di tempat sampah Drive.');
  }
  if (!isFileInPsbDestinationFolder(file)) {
    throw new Error('Akses ditolak: berkas berada di luar folder tujuan PSB yang dikonfigurasi (folder berkas saat ini: ' + describeFileParentFolders(file) + '). Pindahkan berkas ke dalam folder "berkas-psb-..." atau folder tujuan PSB di Google Drive.');
  }
  var fileSize = Number(file.getSize() || 0);
  if (fileSize > PSB_MAX_FILE_BYTES) {
    throw new Error('Ukuran berkas melebihi batas maksimum 5 MB.');
  }
  var mime = normalizeAllowedMimeType(file.getMimeType());
  if (PSB_ALLOWED_MIME_TYPES.indexOf(mime) === -1) {
    throw new Error('Tipe berkas tidak diizinkan (' + (mime || 'tidak diketahui') + '). Hanya PDF, JPEG, PNG, dan WebP yang diperbolehkan.');
  }
  var blob = file.getBlob();
  var bytes = blob.getBytes();
  if (bytes.length > PSB_MAX_FILE_BYTES) {
    throw new Error('Ukuran berkas hasil baca melebihi batas maksimum 5 MB.');
  }
  var sha256 = digestBytesToHex(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, bytes));
  return {
    result: 'success',
    success: true,
    name: file.getName(),
    mime: mime,
    size: bytes.length,
    sha256: sha256,
    data: Utilities.base64Encode(bytes)
  };
}

function handleDeleteFilePost(rawData) {
  var auth = diagnoseAdminKey(rawData.adminKey);
  if (!auth.ok) {
    return {
      result: 'error',
      success: false,
      errorCode: auth.errorCode,
      message: auth.message
    };
  }
  var fileId = extractAndValidateDriveFileId(rawData.fileId || rawData.fileUrl || rawData.url);
  var file;
  try {
    file = DriveApp.getFileById(fileId);
  } catch (err) {
    throw new Error('Berkas tidak ditemukan atau tidak dapat diakses di Google Drive.');
  }
  if (!file) {
    throw new Error('Berkas tidak ditemukan di Google Drive.');
  }
  if (!isFileInPsbDestinationFolder(file)) {
    throw new Error('Akses ditolak: berkas berada di luar folder tujuan PSB yang dikonfigurasi (folder berkas saat ini: ' + describeFileParentFolders(file) + '). Pindahkan berkas ke dalam folder "berkas-psb-..." atau folder tujuan PSB di Google Drive.');
  }
  if (!file.isTrashed()) {
    file.setTrashed(true);
  }
  return {
    result: 'success',
    success: true,
    trashed: true,
    fileId: fileId
  };
}

function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) ? String(e.parameter.action).trim() : '';
  if (action === 'version') {
    return gasJsonOut({
      result: 'success',
      success: true,
      scriptVersion: SCRIPT_VERSION,
      service: 'esantri-psb-gas'
    });
  }
  return gasJsonOut({
    result: 'error',
    success: false,
    message: 'Akses GET dinonaktifkan demi keamanan. Gunakan POST action "list" dengan ADMIN_KEY.'
  });
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(30000);
  try {
    var rawData;

    if (e.postData && (e.postData.type === "application/json" || e.postData.type === "text/plain" || e.postData.contents)) {
      var rawContents = String(e.postData.contents || '');
      if (rawContents.length > PSB_MAX_POST_BYTES) {
        return gasJsonOut({
          result: 'error',
          success: false,
          message: 'Ukuran payload melebihi batas maksimum yang diizinkan (22 MB).'
        });
      }
      rawData = JSON.parse(rawContents);
    } else {
      rawData = e.parameter || {};
    }

    var action = String(rawData.action || '').trim();
    if (action === 'diagnose') {
      var diagAuth = diagnoseAdminKey(rawData.adminKey);
      if (!diagAuth.ok) {
        return gasJsonOut({
          result: 'error',
          success: false,
          errorCode: diagAuth.errorCode,
          message: diagAuth.message
        });
      }
      return gasJsonOut({
        result: 'success',
        success: true,
        scriptVersion: SCRIPT_VERSION,
        service: 'esantri-psb-gas',
        diagnostics: buildAuthenticatedAdminDiagnostics()
      });
    }
    if (action === 'list' || action === 'getPsbSubmissions') {
      var listAuth = diagnoseAdminKey(rawData.adminKey);
      if (!listAuth.ok) {
        return gasJsonOut({
          result: 'error',
          success: false,
          errorCode: listAuth.errorCode,
          message: listAuth.message
        });
      }
      var listSs = SpreadsheetApp.getActiveSpreadsheet();
      if (!listSs) {
        return gasJsonOut({
          result: 'error',
          success: false,
          message: 'Spreadsheet aktif tidak ditemukan. Pastikan project Apps Script dibuat dari Google Sheets (Ekstensi > Apps Script), bukan script standalone.'
        });
      }
      var records = collectAllPsbSubmissions(listSs, rawData.tahunAjaran);
      var listRes = {
        result: 'success',
        success: true,
        scriptVersion: SCRIPT_VERSION,
        records: records
      };
      if (rawData.includeDiagnostics) {
        listRes.diagnostics = buildAuthenticatedAdminDiagnostics();
      }
      return gasJsonOut(listRes);
    }
    if (action === 'getFile') {
      return gasJsonOut(handleGetFilePost(rawData));
    }
    if (action === 'deleteFile') {
      return gasJsonOut(handleDeleteFilePost(rawData));
    }

    var pubCheck = verifyPublicSubmitKey(rawData.publicKey);
    if (!pubCheck.ok) {
      return gasJsonOut({
        result: 'error',
        success: false,
        message: pubCheck.message
      });
    }

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) {
      return gasJsonOut({
        result: 'error',
        success: false,
        message: 'Spreadsheet aktif tidak ditemukan. Pastikan project Apps Script dibuat dari Google Sheets (Ekstensi > Apps Script), bukan script standalone.'
      });
    }

    var data = {};
    if (rawData.fields && typeof rawData.fields === 'object') {
      for (var fk in rawData.fields) data[fk] = rawData.fields[fk];
    }
    var skipTransportKeys = ['action', 'portalId', 'apiKey', 'publicKey', 'adminKey', 'fields', 'submittedAt', 'submissionSource', 'sheetName', 'driveFolderId', 'folderId', 'targetJenjangNama', 'namaJenjang'];
    for (var bk in rawData) {
      if (skipTransportKeys.indexOf(bk) === -1) data[bk] = rawData[bk];
    }
    if (!data.nomorRegistrasi || !String(data.nomorRegistrasi).trim()) {
      data.nomorRegistrasi = 'PSB-' + new Date().getFullYear() + '-REG-' + makeGasRandomCode(6);
    }

    var sheetName = String(rawData.sheetName || data.sheetName || "Pendaftar Baru").trim().slice(0, 95);
    var sheet = ss.getSheetByName(sheetName);

    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      var initialHeaders = [
        "Timestamp", "tahunAjaranAktif", "jenjangId", "nomorRegistrasi", "namaLengkap", "nisn", "nik", "jenisKelamin",
        "tempatLahir", "tanggalLahir", "alamat",
        "namaAyah", "nikAyah", "statusAyah", "pekerjaanAyah", "pendidikanAyah", "penghasilanAyah", "teleponAyah",
        "namaIbu", "nikIbu", "statusIbu", "pekerjaanIbu", "pendidikanIbu", "penghasilanIbu", "teleponIbu",
        "namaWali", "nikWali", "statusWali", "hubunganWali", "pekerjaanWali", "pendidikanWali", "penghasilanWali", "nomorHpWali",
        "asalSekolah", "jalurPendaftaran", "catatan", "status"
      ];
      for (var key in data) {
        if (initialHeaders.indexOf(key) === -1) initialHeaders.push(key);
      }
      sheet.appendRow(initialHeaders);
      sheet.setFrozenRows(1);
    }

    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var newRow = new Array(headers.length).fill("");
    var nextRow = sheet.getLastRow() + 1;

    function sanitizePhone(rawPhone) {
      if (!rawPhone) return "";
      var digits = String(rawPhone).replace(/[^0-9]/g, "");
      if (!digits) return "";
      if (digits.indexOf("62") === 0) return "0" + digits.substring(2);
      if (digits.indexOf("8") === 0) return "0" + digits;
      return digits;
    }

    function makeGasRandomCode(len) {
      var chars = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
      var digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, Utilities.getUuid() + ':' + Date.now() + ':' + Math.random());
      var out = '';
      for (var i = 0; i < len; i++) {
        var idx = (digest[i % digest.length] & 0xFF) & 31;
        out += chars.charAt(idx);
      }
      return out;
    }

    function makeInitialsForFile(rawNama) {
      var s = String(rawNama || '').trim();
      if (!s || s.toUpperCase() === '[TERENKRIPSI E2EE]') return 'X';
      var cleaned = s.normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').replace(/[^a-zA-Z0-9\\s]/g, ' ').trim();
      if (!cleaned) return 'X';
      var tokens = cleaned.split(/\\s+/).filter(Boolean);
      var out = '';
      for (var i = 0; i < tokens.length && i < 3; i++) {
        out += tokens[i].charAt(0).toUpperCase();
      }
      return out || 'X';
    }

    function detectDocPrefix(fieldKey, originalName, fieldLabel) {
      var source = (String(fieldKey || '') + ' ' + String(originalName || '') + ' ' + String(fieldLabel || '')).toLowerCase();
      if (source.indexOf('kartu keluarga') !== -1 || source.indexOf(' kk') !== -1 || source.indexOf('kk ') !== -1 || source === 'kk') return 'kk';
      if (source.indexOf('akta') !== -1) return 'akta';
      if (source.indexOf('ijazah') !== -1) return 'ijazah';
      if (source.indexOf('rapor') !== -1 || source.indexOf('raport') !== -1) return 'rapor';
      if (source.indexOf('pasfoto') !== -1 || source.indexOf('foto') !== -1) return 'foto';
      if (source.indexOf('kip') !== -1) return 'kip';
      if (source.indexOf('ktp') !== -1) return 'ktp';
      return 'dokumen';
    }

    function extractExtension(fileName, mimeType) {
      var original = String(fileName || '');
      var dotIndex = original.lastIndexOf('.');
      if (dotIndex > -1 && dotIndex < original.length - 1) {
        var ext = original.substring(dotIndex + 1).toLowerCase().replace(/[^a-z0-9]/g, '');
        if (ext) return ext === 'jpeg' ? 'jpg' : ext;
      }
      if (mimeType === 'application/pdf') return 'pdf';
      if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') return 'jpg';
      if (mimeType === 'image/png') return 'png';
      if (mimeType === 'image/webp') return 'webp';
      return '';
    }

    function buildStandardFileName(fieldKey, fileData, payload, verifiedMime) {
      var santriName = payload.namaLengkap || payload.namaSantri || payload.nama || '';
      var regNo = String(payload.nomorRegistrasi || ('PSB-' + new Date().getFullYear() + '-REG-' + makeGasRandomCode(6))).trim();
      var inisial = makeInitialsForFile(santriName);
      var prefix = detectDocPrefix(fieldKey, fileData.name, fileData.fieldLabel);
      var ext = extractExtension(fileData.name, verifiedMime || fileData.mime);
      var base = regNo + '_' + inisial + '_' + prefix + '-' + makeGasRandomCode(4);
      return ext ? (base + '.' + ext) : base;
    }

    function buildYearFolderName(taValue) {
      var raw = String(taValue || '').trim();
      var slug = raw.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      if (!slug) slug = String(new Date().getFullYear());
      return 'berkas-psb-' + slug;
    }

    function getOrCreateFolderIn(parentContainer, folderName) {
      var it = parentContainer.getFoldersByName(folderName);
      while (it.hasNext()) {
        var existing = it.next();
        if (!existing.isTrashed()) return existing;
      }
      return parentContainer.createFolder(folderName);
    }

    var yearFolderName = buildYearFolderName(data.tahunAjaranAktif || rawData.tahunAjaranAktif);
    var targetFolderId = resolveConfiguredDriveFolderId();
    var destinationFolder = null;
    var folderWarning = "";

    function resolveDestinationFolder() {
      if (destinationFolder) return destinationFolder;
      if (targetFolderId) {
        try {
          var baseFolder = DriveApp.getFolderById(targetFolderId);
          // Cegah folder bersarang ganda jika user sudah menempelkan ID folder berkas-psb-<tahun>
          if (baseFolder.getName().toLowerCase() === yearFolderName.toLowerCase()) {
            destinationFolder = baseFolder;
          } else {
            destinationFolder = getOrCreateFolderIn(baseFolder, yearFolderName);
          }
          return destinationFolder;
        } catch (folderErr) {
          folderWarning = "Folder induk (" + targetFolderId + ") tidak dapat diakses; dibuat otomatis di My Drive/" + yearFolderName + ".";
        }
      }
      destinationFolder = getOrCreateFolderIn(DriveApp, yearFolderName);
      return destinationFolder;
    }

    var phoneKeys = ['telepon', 'noHp', 'teleponAyah', 'teleponIbu', 'nomorHpWali', 'teleponWali'];
    var textNumberKeys = ['nik', 'nisn', 'nikAyah', 'nikIbu', 'nikWali', 'kodePos', 'nomorIjazahSebelumnya'];
    for (var pk = 0; pk < phoneKeys.length; pk++) {
      var pKey = phoneKeys[pk];
      if (data[pKey]) data[pKey] = sanitizePhone(data[pKey]);
    }

    // Upload lampiran ke Google Drive (otomatis ke folder berkas-psb-<tahunAjaran>); berkas mewarisi izin folder tujuan (privat)
    for (var key in data) {
      if (typeof data[key] === 'object' && data[key] !== null && data[key].isFile) {
        var fileData = data[key];
        var validated = decodeAndValidateUploadedFile(fileData);
        var smartName = buildStandardFileName(key, fileData, data, validated.mime);
        var blob = Utilities.newBlob(validated.bytes, validated.mime, smartName);
        var destFolder = resolveDestinationFolder();
        var file = destFolder.createFile(blob);
        data[key] = file.getUrl();
      }
    }

    data.Timestamp = new Date();
    if (!data.status) data.status = "Baru";

    function formatCellForSheet(colKey, rawVal) {
      if (rawVal === undefined || rawVal === null) return "";
      if (Array.isArray(rawVal)) return rawVal.join(", ");
      if (rawVal instanceof Date) return rawVal;
      var strVal = String(rawVal);
      // Cegah angka 0 di depan terpotong atau NIK 16 digit berubah menjadi notasi ilmiah (3.51E+15)
      if (
        /^0[0-9]+$/.test(strVal) ||
        /^[0-9]{10,}$/.test(strVal) ||
        phoneKeys.indexOf(colKey) !== -1 ||
        textNumberKeys.indexOf(colKey) !== -1
      ) {
        return "'" + strVal;
      }
      return rawVal;
    }

    for (var i = 0; i < headers.length; i++) {
      newRow[i] = formatCellForSheet(headers[i], data[headers[i]]);
    }

    for (var key in data) {
      if (headers.indexOf(key) === -1) {
        var newCol = headers.length + 1;
        sheet.getRange(1, newCol).setValue(key);
        newRow[newCol - 1] = formatCellForSheet(key, data[key]);
        headers.push(key);
      }
    }

    sheet.getRange(nextRow, 1, 1, newRow.length).setValues([newRow]);
    return ContentService.createTextOutput(JSON.stringify({
      result: "success",
      success: true,
      row: nextRow,
      nomorRegistrasi: data.nomorRegistrasi,
      sheetName: sheetName,
      folderUsed: destinationFolder ? destinationFolder.getId() : "none",
      folderName: destinationFolder ? destinationFolder.getName() : yearFolderName,
      folderWarning: folderWarning || undefined
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      result: "error",
      success: false,
      message: err.toString(),
      error: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

function makeExistingFilesPrivateInFolder(folder, counters) {
  var files = folder.getFiles();
  while (files.hasNext()) {
    var file = files.next();
    if (file.isTrashed && file.isTrashed()) continue;
    try {
      file.setSharing(DriveApp.Access.PRIVATE, DriveApp.Permission.NONE);
      counters.updated++;
    } catch (err) {
      counters.failed++;
    }
  }
  var children = folder.getFolders();
  while (children.hasNext()) {
    var child = children.next();
    if (child.isTrashed && child.isTrashed()) continue;
    makeExistingFilesPrivateInFolder(child, counters);
  }
}

/**
 * Jalankan secara MANUAL dari editor Google Apps Script (Run > makeExistingFilesPrivate)
 * untuk mengubah izin berkas PSB lama yang sempat dibagikan publik menjadi PRIVATE.
 */
function makeExistingFilesPrivate() {
  var counters = { updated: 0, failed: 0 };
  var targetFolderId = resolveConfiguredDriveFolderId();
  if (targetFolderId) {
    var rootFolder = DriveApp.getFolderById(targetFolderId);
    makeExistingFilesPrivateInFolder(rootFolder, counters);
  } else {
    var folders = DriveApp.getFolders();
    while (folders.hasNext()) {
      var f = folders.next();
      if (f.isTrashed && f.isTrashed()) continue;
      var name = String(f.getName() || '').toLowerCase();
      if (name.indexOf('berkas-psb-') === 0) {
        makeExistingFilesPrivateInFolder(f, counters);
      }
    }
  }
  Logger.log('makeExistingFilesPrivate selesai. Diubah ke privat: ' + counters.updated + ', gagal/dilewati: ' + counters.failed);
  return counters;
}`;
};

/* ============================================================================
 * 2. CLOUDFLARE WORKER: D1 SQLITE + R2 ATTACHMENT STORAGE
 * ============================================================================ */
export const PSB_CLOUDFLARE_D1_WORKER_SCRIPT = `/* ============================================================================
 * CLOUDFLARE WORKER + D1 SQLITE + R2 STORAGE UNTUK PSB eSANTRI
 * Langkah Setup:
 * 1) Buat D1 Database (misal: db_psb) & jalankan SQL berikut di D1 Console:
 *
 * CREATE TABLE IF NOT EXISTS psb_submissions (
 *   id TEXT PRIMARY KEY,
 *   tahun_ajaran TEXT DEFAULT '',
 *   jenjang_id TEXT DEFAULT '',
 *   sheet_name TEXT DEFAULT 'PSB D1',
 *   nama_lengkap TEXT DEFAULT '',
 *   data_json TEXT NOT NULL DEFAULT '{}',
 *   created_at TEXT NOT NULL
 * );
 * CREATE INDEX IF NOT EXISTS idx_psb_ta ON psb_submissions(tahun_ajaran, created_at);
 *
 * 2) Buat R2 Bucket (misal: psb-berkas) untuk menampung file upload KK/Akta/Foto.
 * 3) Buat Worker baru, tempel kode ini, lalu di Settings > Bindings:
 *    - D1 database binding bernama: DB -> pilih db_psb
 *    - R2 bucket binding bernama: R2_BUCKET -> pilih psb-berkas
 *    - (Opsional) Variable/Secret bernama: API_KEY = token-rahasia-anda
 * ============================================================================ */

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-API-Key, Authorization"
};

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...CORS_HEADERS }
  });
}

function checkAuth(request, env) {
  if (!env.API_KEY) return true;
  const headerKey = request.headers.get("X-API-Key") || "";
  const auth = request.headers.get("Authorization") || "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  return headerKey === env.API_KEY || bearer === env.API_KEY;
}

function slugify(val) {
  return String(val || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "santri";
}

function detectPrefix(fieldKey, fileName, fieldLabel) {
  const s = (String(fieldKey || "") + " " + String(fileName || "") + " " + String(fieldLabel || "")).toLowerCase();
  if (s.includes("kartu keluarga") || s.includes("kk")) return "kk";
  if (s.includes("akta")) return "akta";
  if (s.includes("ijazah")) return "ijazah";
  if (s.includes("rapor")) return "rapor";
  if (s.includes("foto")) return "foto";
  if (s.includes("kip")) return "kip";
  if (s.includes("ktp")) return "ktp";
  return "dokumen";
}

function getExt(name, mime) {
  const m = String(name || "").match(/\\.[a-zA-Z0-9]+$/);
  if (m) return m[0].toLowerCase();
  if (mime === "application/pdf") return ".pdf";
  if (mime === "image/jpeg") return ".jpg";
  if (mime === "image/png") return ".png";
  return "";
}

function base64ToBytes(dataUrlOrB64) {
  const clean = String(dataUrlOrB64 || "").includes(",") ? String(dataUrlOrB64).split(",")[1] : String(dataUrlOrB64 || "");
  const bin = atob(clean);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    const url = new URL(request.url);
    const action = (url.searchParams.get("action") || "").trim();

    // Tampilkan / unduh lampiran berkas dari R2 secara langsung (untuk preview di PendaftarModal & Arsip ZIP)
    if (request.method === "GET" && action === "file") {
      const key = url.searchParams.get("key") || "";
      if (!key || !env.R2_BUCKET) return new Response("Berkas tidak ditemukan", { status: 404, headers: CORS_HEADERS });
      const obj = await env.R2_BUCKET.get(key);
      if (!obj) return new Response("Berkas tidak ditemukan", { status: 404, headers: CORS_HEADERS });
      const headers = new Headers(CORS_HEADERS);
      obj.writeHttpMetadata(headers);
      headers.set("Content-Disposition", "inline");
      headers.set("Cache-Control", "public, max-age=86400");
      return new Response(obj.body, { status: 200, headers });
    }

    if (!checkAuth(request, env)) {
      return jsonResponse({ result: "error", error: "Unauthorized: API Key tidak valid" }, 401);
    }

    if (request.method === "GET") {
      const ta = (url.searchParams.get("tahunAjaran") || "").trim();
      const sql = ta
        ? "SELECT * FROM psb_submissions WHERE tahun_ajaran = ? ORDER BY created_at ASC"
        : "SELECT * FROM psb_submissions ORDER BY created_at ASC";
      const stmt = ta ? env.DB.prepare(sql).bind(ta) : env.DB.prepare(sql);
      const { results } = await stmt.all();

      const rows = (results || []).map((r) => {
        let parsed = {};
        try { parsed = JSON.parse(r.data_json || "{}"); } catch {}
        return {
          ...parsed,
          Timestamp: parsed.tanggalDaftar || r.created_at,
          tahunAjaranAktif: parsed.tahunAjaranAktif || r.tahun_ajaran || "",
          jenjangId: parsed.jenjangId || r.jenjang_id || "",
          sheetName: parsed.sheetName || r.sheet_name || "Cloudflare D1",
          namaLengkap: parsed.namaLengkap || r.nama_lengkap || ""
        };
      });
      return jsonResponse(rows);
    }

    if (request.method === "POST") {
      try {
        const body = await request.json();
        const data = { ...(body || {}) };
        const nowIso = data.tanggalDaftar || new Date().toISOString();
        const ta = String(data.tahunAjaranAktif || "");
        const jenjangId = String(data.jenjangId || "");
        const sheetName = String(data.sheetName || "Cloudflare D1");
        const namaLengkap = String(data.namaLengkap || data.namaSantri || "santri");
        const yearSlug = slugify(ta || String(new Date().getFullYear()));

        for (const [k, v] of Object.entries(data)) {
          if (v && typeof v === "object" && v.isFile) {
            if (!env.R2_BUCKET) {
              return jsonResponse({
                result: "error",
                error: "Binding R2_BUCKET belum dipasang pada Worker D1 ini sehingga file lampiran tidak dapat disimpan."
              }, 400);
            }
            const prefix = detectPrefix(k, v.name, v.fieldLabel);
            const ext = getExt(v.name, v.mime);
            const stamp = Date.now() + "-" + Math.random().toString(36).slice(2, 6);
            const fileKey = "berkas/" + yearSlug + "/" + prefix + "-" + slugify(namaLengkap) + "-" + stamp + ext;
            const bytes = base64ToBytes(v.data);
            await env.R2_BUCKET.put(fileKey, bytes, {
              httpMetadata: { contentType: v.mime || "application/octet-stream" }
            });
            data[k] = url.origin + "?action=file&key=" + encodeURIComponent(fileKey);
          }
        }

        const id = "psb_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8);
        await env.DB.prepare(
          "INSERT INTO psb_submissions (id, tahun_ajaran, jenjang_id, sheet_name, nama_lengkap, data_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
        ).bind(id, ta, jenjangId, sheetName, namaLengkap, JSON.stringify(data), nowIso).run();

        return jsonResponse({ result: "success", success: true, id });
      } catch (err) {
        return jsonResponse({ result: "error", success: false, error: err.message }, 500);
      }
    }

    return jsonResponse({ result: "error", error: "Method not allowed" }, 405);
  }
};`;

/* ============================================================================
 * 3. CLOUDFLARE WORKER: R2 ONLY (DATA JSON + LAMPIRAN DI 1 BUCKET R2)
 * ============================================================================ */
export const PSB_CLOUDFLARE_R2_WORKER_SCRIPT = `/* ============================================================================
 * CLOUDFLARE WORKER + R2 OBJECT STORAGE UNTUK PSB eSANTRI (TANPA SQL)
 * Langkah Setup:
 * 1) Buat R2 Bucket (misal: psb-bucket) di Cloudflare Dashboard.
 * 2) Buat Worker baru, tempel kode ini, lalu di Settings > Bindings:
 *    - R2 bucket binding bernama: R2_BUCKET -> pilih psb-bucket
 *    - (Opsional) Variable/Secret bernama: API_KEY = token-rahasia-anda
 * ============================================================================ */

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-API-Key, Authorization"
};

const INDEX_KEY = "psb_submissions_index.json";

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...CORS_HEADERS }
  });
}

function checkAuth(request, env) {
  if (!env.API_KEY) return true;
  const headerKey = request.headers.get("X-API-Key") || "";
  const auth = request.headers.get("Authorization") || "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  return headerKey === env.API_KEY || bearer === env.API_KEY;
}

function slugify(val) {
  return String(val || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "santri";
}

function detectPrefix(fieldKey, fileName, fieldLabel) {
  const s = (String(fieldKey || "") + " " + String(fileName || "") + " " + String(fieldLabel || "")).toLowerCase();
  if (s.includes("kartu keluarga") || s.includes("kk")) return "kk";
  if (s.includes("akta")) return "akta";
  if (s.includes("ijazah")) return "ijazah";
  if (s.includes("rapor")) return "rapor";
  if (s.includes("foto")) return "foto";
  if (s.includes("kip")) return "kip";
  if (s.includes("ktp")) return "ktp";
  return "dokumen";
}

function getExt(name, mime) {
  const m = String(name || "").match(/\\.[a-zA-Z0-9]+$/);
  if (m) return m[0].toLowerCase();
  if (mime === "application/pdf") return ".pdf";
  if (mime === "image/jpeg") return ".jpg";
  if (mime === "image/png") return ".png";
  return "";
}

function base64ToBytes(dataUrlOrB64) {
  const clean = String(dataUrlOrB64 || "").includes(",") ? String(dataUrlOrB64).split(",")[1] : String(dataUrlOrB64 || "");
  const bin = atob(clean);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function readIndex(env) {
  const obj = await env.R2_BUCKET.get(INDEX_KEY);
  if (!obj) return [];
  try {
    const arr = await obj.json();
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    const url = new URL(request.url);
    const action = (url.searchParams.get("action") || "").trim();

    if (request.method === "GET" && action === "file") {
      const key = url.searchParams.get("key") || "";
      if (!key) return new Response("Berkas tidak ditemukan", { status: 404, headers: CORS_HEADERS });
      const obj = await env.R2_BUCKET.get(key);
      if (!obj) return new Response("Berkas tidak ditemukan", { status: 404, headers: CORS_HEADERS });
      const headers = new Headers(CORS_HEADERS);
      obj.writeHttpMetadata(headers);
      headers.set("Content-Disposition", "inline");
      headers.set("Cache-Control", "public, max-age=86400");
      return new Response(obj.body, { status: 200, headers });
    }

    if (!checkAuth(request, env)) {
      return jsonResponse({ result: "error", error: "Unauthorized: API Key tidak valid" }, 401);
    }

    if (request.method === "GET") {
      const ta = (url.searchParams.get("tahunAjaran") || "").trim();
      const list = await readIndex(env);
      const filtered = ta ? list.filter((item) => String(item.tahunAjaranAktif || "") === ta) : list;
      return jsonResponse(filtered);
    }

    if (request.method === "POST") {
      try {
        const body = await request.json();
        const data = { ...(body || {}) };
        const nowIso = data.tanggalDaftar || new Date().toISOString();
        const namaLengkap = String(data.namaLengkap || data.namaSantri || "santri");
        const yearSlug = slugify(data.tahunAjaranAktif || String(new Date().getFullYear()));

        for (const [k, v] of Object.entries(data)) {
          if (v && typeof v === "object" && v.isFile) {
            const prefix = detectPrefix(k, v.name, v.fieldLabel);
            const ext = getExt(v.name, v.mime);
            const stamp = Date.now() + "-" + Math.random().toString(36).slice(2, 6);
            const fileKey = "berkas/" + yearSlug + "/" + prefix + "-" + slugify(namaLengkap) + "-" + stamp + ext;
            const bytes = base64ToBytes(v.data);
            await env.R2_BUCKET.put(fileKey, bytes, {
              httpMetadata: { contentType: v.mime || "application/octet-stream" }
            });
            data[k] = url.origin + "?action=file&key=" + encodeURIComponent(fileKey);
          }
        }

        const record = {
          ...data,
          Timestamp: nowIso,
          status: data.status || "Baru"
        };

        const list = await readIndex(env);
        list.push(record);
        await env.R2_BUCKET.put(INDEX_KEY, JSON.stringify(list), {
          httpMetadata: { contentType: "application/json; charset=utf-8" }
        });

        return jsonResponse({ result: "success", success: true, total: list.length });
      } catch (err) {
        return jsonResponse({ result: "error", success: false, error: err.message }, 500);
      }
    }

    return jsonResponse({ result: "error", error: "Method not allowed" }, 405);
  }
};`;

/* ============================================================================
 * 4. SUPABASE POSTGRESQL + SUPABASE STORAGE BUCKET SQL SETUP
 * ============================================================================ */
export const PSB_SUPABASE_SQL_SETUP = `-- ============================================================================
-- SETUP SUPABASE POSTGRESQL + STORAGE BUCKET UNTUK PSB eSANTRI
-- Jalankan 1x di Supabase Dashboard > SQL Editor > New Query > Run
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.psb_submissions (
  id TEXT PRIMARY KEY,
  tahun_ajaran TEXT DEFAULT '',
  jenjang_id TEXT DEFAULT '',
  sheet_name TEXT DEFAULT 'PSB Supabase',
  nama_lengkap TEXT DEFAULT '',
  data_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_psb_submissions_ta
  ON public.psb_submissions (tahun_ajaran, created_at);

ALTER TABLE public.psb_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "psb_submissions_public_all" ON public.psb_submissions;
CREATE POLICY "psb_submissions_public_all"
  ON public.psb_submissions
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Buat Storage Bucket publik bernama 'psb-berkas' untuk menampung lampiran upload (KK/Akta/Foto)
INSERT INTO storage.buckets (id, name, public)
VALUES ('psb-berkas', 'psb-berkas', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "psb_berkas_public_select" ON storage.objects;
CREATE POLICY "psb_berkas_public_select"
  ON storage.objects
  FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'psb-berkas');

DROP POLICY IF EXISTS "psb_berkas_public_insert" ON storage.objects;
CREATE POLICY "psb_berkas_public_insert"
  ON storage.objects
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (bucket_id = 'psb-berkas');

DROP POLICY IF EXISTS "psb_berkas_public_update" ON storage.objects;
CREATE POLICY "psb_berkas_public_update"
  ON storage.objects
  FOR UPDATE
  TO anon, authenticated
  USING (bucket_id = 'psb-berkas')
  WITH CHECK (bucket_id = 'psb-berkas');
`;
